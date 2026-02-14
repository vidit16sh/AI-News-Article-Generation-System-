import 'dotenv/config'; 
import Bottleneck from 'bottleneck';
import axios from 'axios'; 
import { connectRabbit } from '../config/rabbit.js'; 
import prisma from '../lib/prisma.js';
import { cleanText } from '../services/cleaner.service.js';
import { classifyNews, getOrCreateCategory } from '../services/classifier.service.js'; 

// 🛑 RATE LIMITER: Prevents DeepSeek API 429 errors
const limiter = new Bottleneck({
    minTime: 4000, 
    maxConcurrent: 1 
});

/**
 * 🔗 CANONICAL RESOLVER (Production Grade)
 * Resolves Google News/Consent redirects to the final primary source.
 * Includes timeouts and error handling to ensure it NEVER breaks the worker.
 */
const getFinalCanonicalUrl = async (url) => {
    const sourceUrl = url.toLowerCase();
    
    // Skip resolution for non-Google links to save time
    if (!sourceUrl.includes('google.com')) return url;

    try {
        const response = await axios.get(url, {
            maxRedirects: 8,
            timeout: 7000, // 7-second cap to prevent worker hanging
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
            },
            // We only care about the URL, not the body content
            responseType: 'stream', 
            validateStatus: (status) => status >= 200 && status < 400
        });

        const finalUrl = response.request.res.responseUrl || url;
        if (response?.data?.destroy) {
            response.data.destroy();
        }
        
        // Final check: If still stuck on consent page, try manual param extraction
        if (finalUrl.includes('consent.google.com')) {
            const u = new URL(url);
            return u.searchParams.get('q') || u.searchParams.get('url') || url;
        }

        return finalUrl;
    } catch (e) {
        // Fallback: If request fails, extract from params manually
        try {
            const u = new URL(url);
            return u.searchParams.get('q') || u.searchParams.get('url') || url;
        } catch {
            return url;
        }
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
        
        // 🛡️ 1. Resolve REAL URL (100-Mark Feature)
        // This makes sure your "Source Note" links to the actual news site.
        const cleanUrl = await getFinalCanonicalUrl(rawNews.sourceUrl);
        
        const cleanedBody = cleanText(rawNews.rawBody);

        // 🧠 2. CLASSIFY (With DeepSeek JSON Fix)
        const classification = await limiter.schedule(() => 
            classifyNews(cleanedBody, rawNews.title)
        ); 

        let categorySlug = classification.category_slug || "crypto";
        if (categorySlug === 'altcoins') categorySlug = 'crypto';
        
        const priorityScore = classification.priority_score || 0; 
        const category = await getOrCreateCategory(categorySlug);

        // 💾 3. UPSERT CleanedNews
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

        // 💎 4. VIP FILTER (45+ Score)
        if (priorityScore >= 45) {
            console.log(`   🚀 APPROVED (${priorityScore}/100) -> [${categorySlug}]: "${rawNews.title.substring(0, 40)}..."`);
            
            const payload = { 
                newsId: finalNews.id,
                priorityScore: priorityScore,
                categoryTag: categorySlug 
            };
            channel.sendToQueue('generation_queue', Buffer.from(JSON.stringify(payload)));
        }

        channel.ack(msg);

    } catch (err) {
        console.error(`   ❌ Ingest Error: ${err.message}`);
        // Log the error but ack the message to prevent infinite loops in the queue
        channel.ack(msg);
    }
};

const startWorker = async () => {
    try {
        const channel = await connectRabbit();
        await channel.assertQueue('generation_queue', { durable: true });
        channel.prefetch(1); 
        console.log("👀 Ingest Worker (Production v100) Started...");
        channel.consume('ingest_queue', (msg) => {
            if (msg) processJob(msg, channel);
        });
    } catch (error) {
        console.error("❌ Failed to start Ingest Worker:", error.message);
    }
};

startWorker();
