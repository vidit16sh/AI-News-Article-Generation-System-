import 'dotenv/config';
import Bottleneck from 'bottleneck';
import stringSimilarity from 'string-similarity'; 
import { connectRabbit } from '../config/rabbit.js';
import prisma from '../lib/prisma.js';
import { generateArticle } from '../services/generator.service.js';
import { generateImage } from '../services/image.service.js'; 

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
        ? article.imageUrl 
        : `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/default-news.jpg`;

    return {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "mainEntityOfPage": { "@type": "WebPage", "@id": url },
        "headline": article.headline,
        "description": article.meta_description || article.headline,
        "image": [validImage], // ✅ Always returns valid array
        "datePublished": new Date().toISOString(),
        "dateModified": new Date().toISOString(),
        "author": { 
            "@type": "Person", 
            "name": authorObj ? authorObj.name : "Editorial Team",
            "url": authorObj ? `${process.env.NEXT_PUBLIC_SITE_URL}/authors/${authorObj.slug}` : undefined
        },
        "publisher": {
            "@type": "Organization",
            "name": "AI News Platform",
            "logo": { 
                "@type": "ImageObject", 
                "url": `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/logo.png` 
            }
        }
    };
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

        // 1. Assign Author
        const assignedAuthor = await assignAuthor();
        const authorName = assignedAuthor ? assignedAuthor.name : "Editorial Team";
        console.log(`   👤 Assigned Author: ${authorName}`);

        // 2. Generate Text
        console.log(`   🧠 Writing: "${cleanNews.title.substring(0, 30)}..."`);
        const aiOutput = await limiter.schedule(() => generateArticle(cleanNews));

        // 3. Generate Image
        console.log(`   🎨 Generating Image (Fal.ai)...`);
        let imageUrl = await generateImage(aiOutput.headline);
        
        // 🛡️ Fallback: If Fal.ai fails, use null (createJsonLd will handle the default)
        if (!imageUrl) {
            console.warn("   ⚠️ Image generation failed. Using default.");
            imageUrl = null; 
        }

        // 4. Prepare Metadata
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const fullUrl = `${baseUrl}/news/${aiOutput.slug}`;
        
        const newsJsonLd = createJsonLd({ ...aiOutput, imageUrl }, fullUrl, assignedAuthor);
        
        const realOriginalityScore = calculateOriginality(aiOutput.article_html, cleanNews.content);

        // 5. Determine Status
        let status = "DRAFT";
        const isHighQuality = aiOutput.confidence >= 0.85 && realOriginalityScore >= 0.20;
        
        if (isHighQuality) {
            if (priorityScore >= 80) status = "PUBLISHED";
            else if (priorityScore >= 50) status = "QUEUED";
        }

        // 6. Save to DB
        await prisma.generatedArticle.create({
            data: {
                headline: aiOutput.headline,
                slug: aiOutput.slug,
                metaDescription: aiOutput.meta_description,
                articleHtml: aiOutput.article_html,
                tags: aiOutput.tags || [],
                keywords: aiOutput.keywords || [],
                imageUrl: imageUrl, // Can be null, handled by frontend/schema logic
                newsJsonLd,
                originalityScore: realOriginalityScore,
                confidenceScore: aiOutput.confidence || 0,
                priorityScore: priorityScore,
                status: status,
                publishAt: new Date(),
                originalNewsId: cleanNews.id,
                authorId: assignedAuthor ? assignedAuthor.id : null 
            }
        });

        console.log(`   ✨ Finished: ${aiOutput.slug} [${status}] by ${authorName}`);
        
        if (status === 'PUBLISHED') await triggerRevalidation('articles');
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