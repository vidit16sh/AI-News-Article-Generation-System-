import Parser from 'rss-parser';
import axios from 'axios';
import redis from '../config/redis.js';
import prisma from '../lib/prisma.js';
import { connectRabbit } from '../config/rabbit.js';
import { scrapeArticle } from './scraper.service.js';

const parser = new Parser({
    customFields: {
        item: [['content:encoded', 'fullContent'], ['content', 'normalContent']],
    }
});

// Helper: Random sleep to prevent 429 Blocking
const randomSleep = () => {
    const ms = Math.floor(Math.random() * 4000) + 3000; 
    return new Promise(resolve => setTimeout(resolve, ms));
};

// 1. COINNESS FETCHER (Restored)
export const fetchCoinNess = async () => {
    const apiUrl = process.env.COINNESS_API_URL || "https://api.coinness.com/feed/v1/breaking-news?languageCode=en";
    
    console.log(`\n🔍 Fetching CoinNess...`);
    const channel = await connectRabbit();

    try {
        const config = {};
        if (process.env.COINNESS_API_KEY) {
            config.headers = { 'Authorization': `Bearer ${process.env.COINNESS_API_KEY}` };
        }

        const response = await axios.get(apiUrl, config);
        const items = response.data.list || response.data || []; 

        let newCount = 0;

        for (const item of items) {
            const uniqueId = `coinness:${item.id}`;
            
            // 1. Redis Check
            const isCached = await redis.get(uniqueId);
            if (isCached) continue;

            // 2. Database Check (CRITICAL FIX)
            const sourceUrl = item.shareUrl || `https://coinness.com/news/${item.id}`;
            const existing = await prisma.rawNews.findUnique({
                where: { sourceUrl: sourceUrl }
            });

            if (existing) {
                await redis.set(uniqueId, '1', 'EX', 86400);
                continue;
            }

            // 3. Save
            const content = item.content || item.title; 
            const raw = await prisma.rawNews.create({
                data: {
                    sourceUrl: sourceUrl,
                    title: item.title || content.substring(0, 50),
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
        
        if(newCount > 0) console.log(`   ✅ CoinNess: ${newCount} new items.`);

    } catch (err) {
        console.error(`   ❌ CoinNess Error: ${err.message}`);
    }
};

// 2. RSS FETCHER (Fixed)
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

            // 2. Database Check (CRITICAL FIX FOR CRASH)
            const existingRaw = await prisma.rawNews.findUnique({
                where: { sourceUrl: link }
            });

            if (existingRaw) {
                // It exists in DB but not Redis. Update Redis and skip.
                await redis.set(`news:${link}`, '1', 'EX', 86400);
                process.stdout.write("s"); // 's' for skipped
                continue;
            }

            // 3. Intelligent Parsing
            let bestContent = item.fullContent || item.normalContent || item.contentSnippet || "";
            
            // Scraper Trigger (With Delay)
            if (bestContent.length < 200) {
                await randomSleep(); 
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
        
        console.log(`\n✅ Saved ${newCount} NEW articles.`);
        return newCount;

    } catch (err) {
        console.error(`   ❌ Error fetching RSS: ${err.message}`);
        return 0;
    }
};