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

const randomSleep = () => {
    const ms = Math.floor(Math.random() * 4000) + 3000; 
    return new Promise(resolve => setTimeout(resolve, ms));
};

// 1. COINNESS FETCHER (Unchanged - Works Great)
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
            const isCached = await redis.get(uniqueId);
            if (isCached) continue;

            const content = item.content || item.title; 
            const sourceUrl = item.shareUrl || `https://coinness.com/news/${item.id}`;

            try {
                const raw = await prisma.rawNews.create({
                    data: {
                        sourceUrl,
                        title: item.title || content.substring(0, 50),
                        rawBody: content,
                        publishedAt: new Date(),
                        processed: false
                    }
                });

                const payload = { rawNewsId: raw.id };
                channel.sendToQueue('ingest_queue', Buffer.from(JSON.stringify(payload)));
                console.log(`   ⚡ CoinNess: ${item.title.substring(0, 30)}...`);
                newCount++;
            } catch (dbError) {
                if (dbError.code !== 'P2002') console.error(`   ⚠️ DB Error: ${dbError.message}`);
            }
            await redis.set(uniqueId, '1', 'EX', 86400);
        }
        if (newCount > 0) console.log(`✅ CoinNess: ${newCount} new items.`);
    } catch (err) {
        console.error(`❌ CoinNess Error: ${err.message}`);
    }
};

// 2. RSS FETCHER (UPDATED: Handles Google News Redirects)
export const fetchRSS = async (url) => {
    console.log(`\n🔍 Fetching RSS: ${url}`);
    const channel = await connectRabbit();
    
    try {
        // Fallback: If parser fails (403), we just log and skip (Cron handles the bridge)
        const feed = await parser.parseURL(url);
        let newCount = 0;

        for (const item of feed.items) {
            // Check Redis First (Fastest)
            // Use item.guid if available, else link
            const cacheKey = `news:${item.guid || item.link}`;
            const isCached = await redis.get(cacheKey);
            if (isCached) { process.stdout.write("."); continue; }

            // 1. Resolve & Scrape
            // We behave as if we need to scrape everything (especially for Google News links)
            await randomSleep(); 
            
            let bestContent = "";
            let finalUrl = item.link; // Start with RSS link

            try {
                // If this is a Google News link, scrapeArticle (using Puppeteer) 
                // will follow the redirect and give us the REAL url.
                const scrapedData = await scrapeArticle(item.link);
                
                if (scrapedData) {
                    // Handle object return { content, url }
                    if (typeof scrapedData === 'object' && scrapedData.content) {
                        bestContent = scrapedData.content;
                        if (scrapedData.url) finalUrl = scrapedData.url; // ✅ CAPTURE REAL URL
                    } 
                    // Handle string return (old scraper compatibility)
                    else if (typeof scrapedData === 'string') {
                        bestContent = scrapedData;
                    }
                    console.log(`   📝 Scraped ${bestContent.length} chars | Real URL: ${finalUrl.substring(0,25)}...`);
                }
            } catch (scrapeErr) {
                console.warn(`   ⚠️ Scraping failed for ${item.link.substring(0,30)}...`);
            }

            // Fallback content
            if (!bestContent || bestContent.length < 200) {
                bestContent = item.fullContent || item.normalContent || item.contentSnippet || "";
            }

            // Quality Gate
            if (bestContent.length < 100) {
                // Too short, skip but cache briefly so we don't hammer it
                await redis.set(cacheKey, '1', 'EX', 3600);
                continue;
            }

            // 2. DB Check (Smart)
            // Check if the RESOLVED URL already exists (prevents duplicates from different feeds)
            if (finalUrl !== item.link) {
                const existingReal = await prisma.rawNews.findUnique({ where: { sourceUrl: finalUrl } });
                if (existingReal) {
                    await redis.set(cacheKey, '1', 'EX', 86400); 
                    continue;
                }
            }

            try {
                const raw = await prisma.rawNews.create({
                    data: {
                        sourceUrl: finalUrl, // ✅ Save the Real URL (e.g., theblock.co)
                        title: item.title,
                        rawBody: bestContent, 
                        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
                        processed: false 
                    }
                });

                const payload = { rawNewsId: raw.id };
                channel.sendToQueue('ingest_queue', Buffer.from(JSON.stringify(payload)));
                console.log(`   ➡️  Queued: ${raw.title.substring(0, 30)}...`);
                newCount++;

            } catch (dbError) {
                if (dbError.code === 'P2002') {
                    process.stdout.write("s"); 
                } else {
                    console.error(`   ⚠️ DB Insert Error: ${dbError.message}`);
                }
            }
            await redis.set(cacheKey, '1', 'EX', 86400);
        }
        console.log(`\n✅ Saved ${newCount} NEW articles.`);
        return newCount;

    } catch (err) {
        console.error(`❌ Error fetching RSS: ${err.message}`);
        return 0;
    }
};