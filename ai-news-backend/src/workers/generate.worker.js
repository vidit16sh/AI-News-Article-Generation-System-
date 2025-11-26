import 'dotenv/config';
import Bottleneck from 'bottleneck';
import stringSimilarity from 'string-similarity';
import { connectRabbit } from '../config/rabbit.js';
import prisma from '../config/db.js';
import { generateArticle } from '../services/generator.service.js';

// Rate Limiter (Adjust based on your plan)
const limiter = new Bottleneck({
    minTime: 30000, 
    maxConcurrent: 1 
});

// 1. IMAGE GENERATOR HELPER
const generateImage = async (headline) => {
    try {
        const prompt = encodeURIComponent(headline.replace(/[^a-zA-Z0-9 ]/g, ""));
        return `https://image.pollinations.ai/prompt/${prompt}?width=1024&height=576&nologo=true`;
    } catch (e) {
        return null;
    }
};

// 2. ORIGINALITY SCORER HELPER
const calculateOriginality = (aiText, sourceText) => {
    if (!sourceText || sourceText.length < 50) return 1.0; // Assume original if source is empty
    
    // Compare similarity (0 to 1)
    const similarity = stringSimilarity.compareTwoStrings(aiText, sourceText);
    
    // Originality is the inverse of similarity
    // If similarity is 0.8 (80% same), Originality is 0.2 (20% new)
    let score = 1.0 - similarity;
    
    // Clamp to 2 decimal places
    return Math.round(score * 100) / 100;
};

// 3. REVALIDATION HELPER
const triggerRevalidation = async (tag) => {
    try {
        const apiUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        await fetch(`${apiUrl}/api/revalidate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': process.env.API_SECRET_KEY
            },
            body: JSON.stringify({ tag })
        });
    } catch (error) {
        // Ignore connection errors during dev
    }
};

const processGenerationJob = async (msg, channel) => {
    const content = JSON.parse(msg.content.toString());
    const { newsId } = content;

    console.log(`\n📝 [Gen-Worker] Processing Job: ${newsId}`);

    try {
        const cleanNews = await prisma.cleanedNews.findUnique({
            where: { id: newsId },
            include: { category: true }
        });

        if (!cleanNews) {
            channel.ack(msg);
            return;
        }

        const existing = await prisma.generatedArticle.findUnique({
            where: { originalNewsId: newsId }
        });

        if (existing) {
            channel.ack(msg);
            return;
        }

        // --- STEP A: GENERATE TEXT ---
        console.log(`   🧠 Gemini Writing: "${cleanNews.title.substring(0, 30)}..."`);
        const aiOutput = await limiter.schedule(() => generateArticle(cleanNews));

        // --- STEP B: GENERATE IMAGE ---
        console.log(`   🎨 Generating Image...`);
        const imageUrl = await generateImage(aiOutput.headline);

        // --- STEP C: CALCULATE ORIGINALITY ---
        // Compare the AI HTML vs the Source Content
        const realOriginalityScore = calculateOriginality(aiOutput.article_html, cleanNews.content);
        console.log(`   🔍 Originality Score: ${realOriginalityScore} (Confidence: ${aiOutput.confidence})`);

        // --- STEP D: PUBLISH LOGIC ---
        let status = "DRAFT";
        // Require high confidence AND reasonable originality (> 20% different)
        if (aiOutput.confidence >= 0.85 && realOriginalityScore >= 0.20) {
            status = "PUBLISHED";
        }

        // --- STEP E: SAVE ---
        await prisma.generatedArticle.create({
            data: {
                headline: aiOutput.headline,
                slug: aiOutput.slug,
                metaDescription: aiOutput.meta_description,
                articleHtml: aiOutput.article_html,
                tags: aiOutput.tags || [],
                
                imageUrl: imageUrl, // <--- Saved Image
                
                rssEntry: aiOutput.rss_entry || "",
                sitemapEntry: aiOutput.sitemap_entry || "",
                
                newsJsonLd: aiOutput.news_jsonld || {},
                originalityScore: realOriginalityScore, // <--- Saved Real Score
                confidenceScore: aiOutput.confidence || 0,

                status: status,
                originalNewsId: cleanNews.id
            }
        });

        console.log(`   ✨ Finished: ${aiOutput.slug} [${status}]`);

        if (status === 'PUBLISHED') {
            await triggerRevalidation('articles');
        }

        channel.ack(msg);

    } catch (err) {
        console.error(`   ❌ Error: ${err.message}`);
        if (err.message.includes('429')) {
            setTimeout(() => channel.nack(msg), 5000); 
        } else {
            channel.ack(msg); 
        }
    }
};

const startGenWorker = async () => {
    const channel = await connectRabbit();
    await channel.assertQueue('generation_queue', { durable: true });
    channel.prefetch(1); 
    console.log("🚀 Generation Worker Started...");
    channel.consume('generation_queue', (msg) => {
        if (msg) processGenerationJob(msg, channel);
    });
};

startGenWorker();