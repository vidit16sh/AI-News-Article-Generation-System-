// src/services/fetcher.service.js
import Parser from 'rss-parser';
import axios from 'axios';
import redis from '../config/redis.js';
import prisma from '../lib/prisma.js';
import { connectRabbit } from '../config/rabbit.js';
import { scrapeArticle } from './scraper.service.js';

const parser = new Parser({
    customFields: {
        item: [['content:encoded', 'fullContent'], ['content', 'normalContent']],
    },
    timeout: 15000,
});

const normalizeUrl = (url) => {
    try {
        const u = new URL(url);
        u.search = ""; 
        u.hash = "";
        return u.toString().toLowerCase().replace(/\/$/, "");
    } catch (e) { return url.toLowerCase(); }
};

const randomSleep = (min = 2000, max = 5000) => 
    new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min)) + min));

// 🛠️ HELPER: Soft-Cache Wrapper
const safeRedisSet = async (key, val, mode, ttl) => {
    try {
        await redis.set(key, val, mode, ttl);
    } catch (err) {
        console.warn(`   ⚠️ Redis Cache Write Failed: ${err.message}`);
    }
};

const safeRedisGet = async (key) => {
    try {
        return await redis.get(key);
    } catch (err) {
        console.warn(`   ⚠️ Redis Cache Read Failed: ${err.message}`);
        return null;
    }
};

export const fetchCoinNess = async () => {
    const apiUrl = process.env.COINNESS_API_URL || "https://api.coinness.com/feed/v1/breaking-news?languageCode=en";
    console.log(`\n🔍 [Fetcher] Checking CoinNess...`);
    
    try {
        const channel = await connectRabbit();
        const config = process.env.COINNESS_API_KEY ? { headers: { 'Authorization': `Bearer ${process.env.COINNESS_API_KEY}` } } : {};
        const response = await axios.get(apiUrl, config);
        const items = response.data.list || response.data || [];

        let newCount = 0;
        for (const item of items) {
            const rawUrl = item.shareUrl || `https://coinness.com/news/${item.id}`;
            const cleanUrl = normalizeUrl(rawUrl);
            const cacheKey = `news:coinness:${cleanUrl}`;

            // ✅ SAFE READ
            if (await safeRedisGet(cacheKey)) continue;

            const existing = await prisma.rawNews.findUnique({ where: { sourceUrl: cleanUrl } });
            if (existing) {
                await safeRedisSet(cacheKey, '1', 'EX', 86400); // ✅ SAFE WRITE
                continue;
            }

            try {
                const raw = await prisma.rawNews.create({
                    data: {
                        sourceUrl: cleanUrl,
                        title: item.title || (item.content ? item.content.substring(0, 100) : "Untitled"),
                        rawBody: item.content || item.title,
                        publishedAt: new Date(),
                        processed: false
                    }
                });

                channel.sendToQueue('ingest_queue', Buffer.from(JSON.stringify({ rawNewsId: raw.id })));
                await safeRedisSet(cacheKey, '1', 'EX', 86400); // ✅ SAFE WRITE
                newCount++;
            } catch (e) {
                if (e.code !== 'P2002') console.error(`   ⚠️ CoinNess DB Error: ${e.message}`);
            }
        }
        if (newCount > 0) console.log(`   ✅ CoinNess: Added ${newCount} items.`);
    } catch (err) {
        console.error(`❌ CoinNess Error: ${err.message}`);
    }
};

export const fetchRSS = async (url) => {
    console.log(`\n🔍 [Fetcher] Checking RSS: ${url}`);
    
    try {
        const channel = await connectRabbit();
        const feed = await parser.parseURL(url);
        let newCount = 0;

        for (const item of feed.items) {
            const initialUrl = normalizeUrl(item.link);
            const cacheKey = `news:rss:${initialUrl}`;

            // ✅ SAFE READ
            if (await safeRedisGet(cacheKey)) { process.stdout.write("."); continue; }

            const exists = await prisma.rawNews.findUnique({ where: { sourceUrl: initialUrl } });
            if (exists) {
                await safeRedisSet(cacheKey, '1', 'EX', 86400); // ✅ SAFE WRITE
                continue;
            }

            await randomSleep(3000, 6000); 
            console.log(`\n   🕷️ Scraping: ${item.title.substring(0, 40)}...`);
            
            const scrapedData = await scrapeArticle(item.link);
            if (!scrapedData || !scrapedData.content || scrapedData.content.length < 400) {
                console.log(`     ⚠️  Skipping: Content thin or blocked.`);
                await safeRedisSet(cacheKey, '1', 'EX', 3600); 
                continue;
            }

            const finalUrl = normalizeUrl(scrapedData.url);
            
            const junkPatterns = ['/price-converter/', '/tag/', '/author/', '/category/', '/login', '/signup'];
            if (junkPatterns.some(pattern => finalUrl.includes(pattern))) {
                await safeRedisSet(cacheKey, '1', 'EX', 86400);
                continue;
            }

            const finalExists = await prisma.rawNews.findUnique({ where: { sourceUrl: finalUrl } });
            if (finalExists) {
                await safeRedisSet(cacheKey, '1', 'EX', 86400);
                continue;
            }

            try {
                const raw = await prisma.rawNews.create({
                    data: {
                        sourceUrl: finalUrl,
                        title: item.title,
                        rawBody: scrapedData.content, 
                        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
                        processed: false 
                    }
                });

                channel.sendToQueue('ingest_queue', Buffer.from(JSON.stringify({ rawNewsId: raw.id })));
                newCount++;
            } catch (dbError) {
                if (dbError.code === 'P2002') await safeRedisSet(cacheKey, '1', 'EX', 86400);
            }
            
            await safeRedisSet(cacheKey, '1', 'EX', 86400);
        }
        
        if (newCount > 0) console.log(`\n✅ Saved ${newCount} new articles.`);
        return newCount;

    } catch (err) {
        console.error(`❌ Error fetching RSS: ${err.message}`);
        return 0;
    }
};