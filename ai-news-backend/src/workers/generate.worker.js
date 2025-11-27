import 'dotenv/config';
import Bottleneck from 'bottleneck';
import stringSimilarity from 'string-similarity'; // Ensure npm install string-similarity
import { connectRabbit } from '../config/rabbit.js';
import prisma from '../config/db.js';
import { generateArticle } from '../services/generator.service.js';

const limiter = new Bottleneck({
    minTime: 30000, // 10s for safety (Free tier)
    maxConcurrent: 1 
});

// Helper: Generate Image
const generateImage = async (headline) => {
    try {
        const prompt = encodeURIComponent(headline.replace(/[^a-zA-Z0-9 ]/g, ""));
        return `https://image.pollinations.ai/prompt/${prompt}?width=1024&height=576&nologo=true`;
    } catch (e) {
        return null;
    }
};

// Helper: Check Originality
const calculateOriginality = (aiText, sourceText) => {
    if (!sourceText || sourceText.length < 50) return 1.0;
    const similarity = stringSimilarity.compareTwoStrings(aiText, sourceText);
    return Math.round((1.0 - similarity) * 100) / 100; // Inverse of similarity
};

// Helper: Revalidate Cache
const triggerRevalidation = async (tag) => {
    try {
        const apiUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        // Fire and forget - don't await response to speed up worker
        fetch(`${apiUrl}/api/revalidate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': process.env.API_SECRET_KEY
            },
            body: JSON.stringify({ tag })
        }).catch(() => {}); 
    } catch (error) {
        // Ignore
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

        // Idempotency Check
        const existing = await prisma.generatedArticle.findUnique({
            where: { originalNewsId: newsId }
        });
        if (existing) {
            channel.ack(msg);
            return;
        }

        // 1. Generate Text
        console.log(`   🧠 Writing: "${cleanNews.title.substring(0, 30)}..."`);
        const aiOutput = await limiter.schedule(() => generateArticle(cleanNews));

        // 2. Generate Image
        const imageUrl = await generateImage(aiOutput.headline);

        // 3. Score Originality
        const realOriginalityScore = calculateOriginality(aiOutput.article_html, cleanNews.content);

        // 4. Determine Status
        let status = "DRAFT";
        if (aiOutput.confidence >= 0.85 && realOriginalityScore >= 0.20) {
            status = "PUBLISHED";
        }

        // 5. Save
        await prisma.generatedArticle.create({
            data: {
                headline: aiOutput.headline,
                slug: aiOutput.slug,
                metaDescription: aiOutput.meta_description,
                articleHtml: aiOutput.article_html,
                tags: aiOutput.tags || [],
                imageUrl: imageUrl,
                rssEntry: aiOutput.rss_entry,
                sitemapEntry: aiOutput.sitemap_entry,
                newsJsonLd: aiOutput.news_jsonld,
                originalityScore: realOriginalityScore,
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
        console.error(`   ❌ Worker Error: ${err.message}`);
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
    console.log("🚀 Gen Worker Started...");
    channel.consume('generation_queue', (msg) => {
        if (msg) processGenerationJob(msg, channel);
    });
};

startGenWorker();