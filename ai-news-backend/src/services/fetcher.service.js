import Parser from 'rss-parser';
import axios from 'axios';
import redis from '../config/redis.js';
import prisma from '../lib/prisma.js';
import { connectRabbit } from '../config/rabbit.js';
import { scrapeArticle } from './scraper.service.js';

const parser = new Parser({
    customFields: {
        item: [
            ['content:encoded', 'fullContent'], 
            ['content', 'normalContent']
        ],
    }
});

// 1. COINNESS FETCHER
export const fetchCoinNess = async () => {
    const apiUrl = process.env.COINNESS_API_URL;
    if (!apiUrl) return;

    console.log(`\n🔍 Fetching CoinNess...`);
    const channel = await connectRabbit();

    try {
        const response = await axios.get(apiUrl);
        // API structure might vary, usually response.data.list or response.data
        const items = response.data.list || response.data || [];

        let newCount = 0;
        for (const item of items) {
            const uniqueId = `coinness:${item.id}`;
            const isCached = await redis.get(uniqueId);
            if (isCached) continue;

            // CoinNess content is usually short but fast
            const content = item.content || item.title; 
            
            // Check DB for duplicates
            const existingRaw = await prisma.rawNews.findFirst({
                where: { title: item.title } // CoinNess might not have unique URLs
            });
            
            if (existingRaw) {
                 await redis.set(uniqueId, '1', 'EX', 86400);
                 continue;
            }

            const raw = await prisma.rawNews.create({
                data: {
                    sourceUrl: item.shareUrl || `coinness-${item.id}`,
                    title: item.title,
                    rawBody: content,
                    publishedAt: new Date(), 
                    processed: false
                }
            });

            await redis.set(uniqueId, '1', 'EX', 86400);
            
            const payload = { rawNewsId: raw.id };
            channel.sendToQueue('ingest_queue', Buffer.from(JSON.stringify(payload)));
            console.log(`   ⚡ CoinNess: ${item.title.substring(0, 30)}...`);
            
            newCount++;
        }
        if (newCount > 0) console.log(`✅ CoinNess: ${newCount} new items.`);

    } catch (err) {
        console.error(`❌ CoinNess Error: ${err.message}`);
    }
};

// Helper: Sleep to prevent 429 Rate Limits
const randomSleep = () => {
    const ms = Math.floor(Math.random() * 4000) + 3000; // 3000ms + (0-4000ms)
    return new Promise(resolve => setTimeout(resolve, ms));
}; 

// 2. RSS FETCHER (With Throttling)
export const fetchRSS = async (url) => {
    console.log(`\n🔍 Fetching RSS: ${url}`);
    const channel = await connectRabbit();
    
    try {
        const feed = await parser.parseURL(url);
        let newCount = 0;

        for (const item of feed.items) {
            const link = item.link;

            // 1. Redis Check
            const isCached = await redis.get(`news:${link}`);
            if (isCached) {
                process.stdout.write(".");
                continue;
            }

            // 2. DB Check
            const existingRaw = await prisma.rawNews.findUnique({
                where: { sourceUrl: link }
            });

            if (existingRaw) {
                await redis.set(`news:${link}`, '1', 'EX', 86400);
                continue;
            }

            // 3. Intelligent Parsing
            let bestContent = item.fullContent || item.normalContent || item.contentSnippet || "";
            
            // 🛑 STEALTH SCRAPING
            if (bestContent.length < 200) {
                await randomSleep(); // <--- Wait random time
                
                const scrapedText = await scrapeArticle(link);
                if (scrapedText) {
                    bestContent = scrapedText;
                    console.log(`   📝 Scraped ${bestContent.length} chars.`);
                }
            }

            const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();

            // 4. Save Raw
            const raw = await prisma.rawNews.create({
                data: {
                    sourceUrl: link,
                    title: item.title,
                    rawBody: bestContent, 
                    publishedAt: pubDate,   
                    processed: false 
                }
            });

            // 5. Cache & Queue
            await redis.set(`news:${link}`, '1', 'EX', 86400);

            const payload = { rawNewsId: raw.id };
            channel.sendToQueue('ingest_queue', Buffer.from(JSON.stringify(payload)));
            console.log(`   ➡️  Queued: ${raw.title.substring(0, 30)}...`);
            
            newCount++;
        }

        console.log(`\n✅ Saved & Queued ${newCount} NEW articles.`);
        return newCount;

    } catch (err) {
        console.error(`❌ Error fetching RSS: ${err.message}`);
        return 0;
    }
};