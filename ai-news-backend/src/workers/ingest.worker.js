import 'dotenv/config'; 
import Bottleneck from 'bottleneck';
import { connectRabbit } from '../config/rabbit.js'; 
import prisma from '../lib/prisma.js';
import { cleanText } from '../services/cleaner.service.js';
import { classifyNews, getOrCreateCategory } from '../services/classifier.service.js'; 

// 🛑 RATE LIMITER for Classification
const limiter = new Bottleneck({
    minTime: 4000, // 1 request every 4 seconds
    maxConcurrent: 1 
});

/**
 * 🔗 URL RESOLVER: Extracts the real news link from Google redirects.
 * Essential for Google News trust and avoiding "consent.google.com" links.
 */
const resolveRealUrl = (url) => {
    try {
        const urlObj = new URL(url);
        // Extract actual URL from Google News redirect parameters
        if (urlObj.hostname.includes('google.com')) {
            const realUrl = urlObj.searchParams.get('q') || urlObj.searchParams.get('url');
            return realUrl || url;
        }
        // Basic cleanup: remove tracking parameters
        return urlObj.origin + urlObj.pathname;
    } catch (e) {
        return url;
    }
};

const processJob = async (msg, channel) => {
    const content = JSON.parse(msg.content.toString());
    const { rawNewsId, retryCount = 0 } = content;

    try {
        const rawNews = await prisma.rawNews.findUnique({ where: { id: rawNewsId } });
        
        if (!rawNews || rawNews.processed) {
            channel.ack(msg);
            return;
        }
        
        // 🛡️ 1. URL GUARD: Reject Junk/Redirect sources before processing
        const junkPatterns = ['consent.google.com', 'news.google.com/url', 'google.com/url'];
        if (junkPatterns.some(pattern => rawNews.sourceUrl.includes(pattern))) {
            console.log(`   🛑 Skipping Junk Source: ${rawNews.sourceUrl}`);
            await prisma.rawNews.update({ where: { id: rawNewsId }, data: { processed: true } });
            channel.ack(msg);
            return;
        }
        
        const cleanedBody = cleanText(rawNews.rawBody);

        // 🧠 2. CLASSIFY & SLUG MAPPING
        const classification = await limiter.schedule(() => 
            classifyNews(cleanedBody, rawNews.title)
        ); 

        // SYNC: Map backend 'altcoins' slug to your frontend 'crypto' link
        let categorySlug = classification.category_slug || "crypto";
        if (categorySlug === 'altcoins') categorySlug = 'crypto';
        
        const priorityScore = classification.priority_score || 0; 
        const category = await getOrCreateCategory(categorySlug);

        // 🔗 3. ADVANCED URL CLEANING (Google Redirect Fix)
        const cleanUrl = resolveRealUrl(rawNews.sourceUrl);
        
        // 💾 4. UPSERT CleanedNews
        const finalNews = await prisma.cleanedNews.upsert({
            where: { sourceUrl: cleanUrl },
            update: { title: rawNews.title },
            create: {
                title: rawNews.title,
                summary: cleanedBody.substring(0, 150) + "...",
                content: cleanedBody,
                sourceUrl: cleanUrl,
                publishedAt: rawNews.publishedAt, 
                categoryId: category.id,
            }
        });

        await prisma.rawNews.update({
            where: { id: rawNewsId },
            data: { processed: true }
        });

        // 💎 5. VIP FILTER & HANDOVER
        if (priorityScore >= 45) {
            console.log(`   🚀 APPROVED (${priorityScore}/100) -> [${categorySlug}]: "${rawNews.title.substring(0, 40)}..."`);
            
            const payload = { 
                newsId: finalNews.id,
                priorityScore: priorityScore,
                // ✅ PASS THE TAG FORWARD so the Generator can save it to GeneratedArticle
                categoryTag: categorySlug 
            };
            channel.sendToQueue('generation_queue', Buffer.from(JSON.stringify(payload)));
        } else {
            console.log(`   🗑️  REJECTED (${priorityScore}/100): "${rawNews.title.substring(0, 40)}..."`);
        }

        channel.ack(msg);

    } catch (err) {
        console.error(`   ❌ Ingest Error: ${err.message}`);
        if (err.message.includes('429') && retryCount < 3) {
             console.log(`   ⏳ Rate Limit Hit - Retrying in 30s...`);
             await new Promise(resolve => setTimeout(resolve, 30000));
             channel.sendToQueue('ingest_queue', Buffer.from(JSON.stringify({ ...content, retryCount: retryCount + 1 })));
        }
        channel.ack(msg);
    }
};

const startWorker = async () => {
    try {
        const channel = await connectRabbit();
        await channel.assertQueue('generation_queue', { durable: true });
        channel.prefetch(1); 
        console.log("👀 Ingest Worker (Redirect-Fix Mode) Started...");
        channel.consume('ingest_queue', (msg) => {
            if (msg) processJob(msg, channel);
        });
    } catch (error) {
        console.error("❌ Failed to start Ingest Worker:", error.message);
    }
};

startWorker();