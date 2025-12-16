import 'dotenv/config';
import Bottleneck from 'bottleneck';
import stringSimilarity from 'string-similarity'; 
import { connectRabbit } from '../config/rabbit.js';
import prisma from '../lib/prisma.js';
import { generateArticle } from '../services/generator.service.js';
import { generateImage } from '../services/image.service.js'; 
import { downloadAndSaveImage } from '../services/storage.service.js';  
import { getAuthorForCategory } from '../config/authors.js';
// 1. Updated Import to include Chart Generation
import { getEnrichedMarketData, generateChartUrl } from '../services/marketData.service.js'; 

const limiter = new Bottleneck({
    minTime: 2000, 
    maxConcurrent: 1 
});

// Helper: Check Originality
const calculateOriginality = (aiText, sourceText) => {
    if (!sourceText || sourceText.length < 50) return 1.0;
    const similarity = stringSimilarity.compareTwoStrings(aiText, sourceText);
    return Math.round((1.0 - similarity) * 100) / 100; 
};

// Helper: Revalidate Cache
const triggerRevalidation = async (tag) => {
    try {
        const apiUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        fetch(`${apiUrl}/api/revalidate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': process.env.API_SECRET_KEY
            },
            body: JSON.stringify({ tag })
        }).catch(() => {}); 
    } catch (error) {}
}; 

// Helper: Assign Random Author
const assignAuthor = async () => {
    try {
        const count = await prisma.author.count();
        if (count === 0) return null;
        const skip = Math.floor(Math.random() * count);
        return await prisma.author.findFirst({ skip });
    } catch (e) {
        console.error("Error assigning author:", e);
        return null;
    }
};        

// JSON-LD Builder (with strict image fallback)
const createJsonLd = (article, url, authorObj) => {
    // Force a valid image URL for Google Schema compliance
    const validImage = article.imageUrl && article.imageUrl.length > 0 
        ? `${process.env.NEXT_PUBLIC_SITE_URL}${article.imageUrl}` // Ensure full URL
        : `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/default-news.jpg`;

    return {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "mainEntityOfPage": { "@type": "WebPage", "@id": url },
        "headline": article.headline,
        "description": article.meta_description || article.headline,
        "image": [validImage], 
        "datePublished": new Date().toISOString(),
        "dateModified": new Date().toISOString(),
        "author": { 
            "@type": "Person", 
            "name": authorObj ? authorObj.name : "Editorial Team",
            "url": authorObj ? `${process.env.NEXT_PUBLIC_SITE_URL}/authors/${authorObj.slug}` : undefined
        },
        "publisher": {
            "@type": "Organization",
            "name": "CoinMarketBuzz",
            "logo": { 
                "@type": "ImageObject", 
                "url": `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/logo.png` 
            }
        }
    };
};

// Helper: Get recent articles to create internal links
const getRecentArticlesForLinking = async (currentNewsId) => {
    try {
        const articles = await prisma.generatedArticle.findMany({
            where: { 
                status: 'PUBLISHED', 
                originalNewsId: { not: currentNewsId } 
            },
            take: 4, 
            orderBy: { publishAt: 'desc' },
            select: { headline: true, slug: true }
        });
        return articles;
    } catch (e) {
        console.error("   ⚠️ Error fetching recent articles:", e.message);
        return [];
    }
}; 

const processGenerationJob = async (msg, channel) => {
    const content = JSON.parse(msg.content.toString());
    const { newsId, priorityScore = 50 } = content;

    console.log(`\n📝 [Gen-Worker] Processing Job: ${newsId}`);

    try {
        const cleanNews = await prisma.cleanedNews.findUnique({
            where: { id: newsId },
            include: { category: true }
        });

        if (!cleanNews) { channel.ack(msg); return; }

        // Idempotency
        const existing = await prisma.generatedArticle.findUnique({ where: { originalNewsId: newsId } });
        if (existing) { channel.ack(msg); return; }

        // 1. Assign Author & Persona
        const assignedAuthorProfile = getAuthorForCategory(cleanNews.title, cleanNews.tags || []);
        const dbAuthor = await prisma.author.findFirst({
            where: { slug: assignedAuthorProfile.slug }
        }); 
        const authorName = dbAuthor ? dbAuthor.name : "Editorial Team"; 
        const selectedPersona = assignedAuthorProfile.personaKey;
        console.log(`   👤 Author: ${authorName} | 🎭 Persona: ${selectedPersona}`); 
        // 2. Data Injection (Market Data + Sentiment)
        console.log(`   📊 Checking for Market Data...`);
        const marketData = await getEnrichedMarketData(cleanNews.title + " " + cleanNews.summary); 

        if (marketData) {
            console.log(`   ✅ Live Data Found (Injecting...)`);
        } 

        // 3. Internal Linking Strategy
        const recentArticles = await getRecentArticlesForLinking(newsId);

        // 4. Generate Text (Pass Persona + Data + Links)
        console.log(`   🧠 Writing: "${cleanNews.title.substring(0, 30)}..."`);
        const aiOutput = await limiter.schedule(() => 
            generateArticle(cleanNews, marketData, recentArticles, selectedPersona)
        );
        // 🛑 FILTER 1: Discard WEAK generations
        if (aiOutput.status === 'WEAK') {
            console.warn(`   🗑️ Discarding WEAK article: "${aiOutput.headline}"`);
            channel.ack(msg); 
            return;
        } 
        
        // 🛑 FILTER 2: Determine Status based on Priority Score
        let finalStatus = "DRAFT"; 
        if (priorityScore > 80) finalStatus = "PUBLISHED";
        else if (priorityScore >= 60) finalStatus = "QUEUED";
        else if (priorityScore >= 45) finalStatus = "DRAFT";
        else {
            console.warn(`   🗑️ Discarding LOW SCORE: ${priorityScore}`);
            channel.ack(msg);
            return;
        }

        // 5. VISUAL STRATEGY: Chart vs. AI Image
        let finalImageUrl = null;
        const headlineLower = aiOutput.headline.toLowerCase();
        const tagsString = (aiOutput.tags || []).join(' ').toLowerCase(); 

        const isMarketStory = 
            headlineLower.includes("price") || 
            headlineLower.includes("prediction") || 
            headlineLower.includes("analysis") || 
            headlineLower.includes("chart") ||
            headlineLower.includes("market") ||
            tagsString.includes("market");

        // B. Is it SERIOUS/LEGAL? (Crime, Law, Regulation)
        const isSeriousStory = 
            headlineLower.includes("sec") || 
            headlineLower.includes("sue") || 
            headlineLower.includes("hack") || 
            headlineLower.includes("scam") || 
            headlineLower.includes("law") || 
            headlineLower.includes("regulation") ||
            headlineLower.includes("ban");

        // A. Try to generate a Real Chart first
        if (isMarketStory && !isSeriousStory) {
            // Priority: CHART
            console.log(`   ⚖️ Editorial Decision: MARKET STORY -> Generate Chart`);
            const textForDetection = `${aiOutput.headline} ${cleanNews.title}`; 
            const chartUrl = await generateChartUrl(textForDetection);
            if (chartUrl) {
                console.log(`      ✅ Chart Created.`);
                finalImageUrl = await downloadAndSaveImage(chartUrl, aiOutput.slug + "-chart");
            }
        }
        // B. Fallback to AI Art (If no chart or coin not found)
        if (!finalImageUrl) {
            let imageStyle = "POP"; // Default style
            
            if (isSeriousStory) {
                console.log(`   ⚖️ Editorial Decision: SERIOUS STORY -> Realism Style`);
                imageStyle = "REALISM";
            } else {
                console.log(`   ⚖️ Editorial Decision: CULTURE STORY -> Pop/3D Style`);
                imageStyle = "POP";
            }

            console.log(`      🎨 Generating AI Art [${imageStyle}]...`);
            let tempImageUrl = await generateImage(aiOutput.headline, imageStyle);
            
            if (tempImageUrl) {
                finalImageUrl = await downloadAndSaveImage(tempImageUrl, aiOutput.slug);
            }
        }

        // 6. Prepare Metadata & Save
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const fullUrl = `${baseUrl}/news/${aiOutput.slug}`;
        const newsJsonLd = createJsonLd({ ...aiOutput, imageUrl: finalImageUrl}, fullUrl, assignedAuthor);
        const realOriginalityScore = calculateOriginality(aiOutput.article_html, cleanNews.content);

        await prisma.generatedArticle.create({
            data: {
                headline: aiOutput.headline,
                slug: aiOutput.slug,
                metaDescription: aiOutput.meta_description,
                articleHtml: aiOutput.article_html,
                tags: aiOutput.tags || [],
                keywords: aiOutput.keywords || [],
                imageUrl: finalImageUrl, 
                newsJsonLd,
                originalityScore: realOriginalityScore,
                confidenceScore: aiOutput.confidence || 0,
                priorityScore: priorityScore,
                status: finalStatus,
                publishAt: new Date(),
                originalNewsId: cleanNews.id,
                authorId: assignedAuthor ? assignedAuthor.id : null 
            }
        });

        console.log(`   ✨ Finished: ${aiOutput.slug} [${finalStatus}]`);
        
        if (finalStatus === 'PUBLISHED') await triggerRevalidation('articles');
        channel.ack(msg);

    } catch (err) {
        console.error(`   ❌ Worker Error: ${err.message}`);
        channel.ack(msg); // Ack to flush bad jobs
    }
};

const startGenWorker = async () => {
    const channel = await connectRabbit();
    await channel.assertQueue('generation_queue', { durable: true });
    channel.prefetch(1); 
    console.log("🚀 Gen Worker Started...");
    channel.consume('generation_queue', (msg) => {
        if (msg) processGenerationJob(msg, channel);
    });
};

startGenWorker();