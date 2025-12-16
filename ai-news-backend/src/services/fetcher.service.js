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

// Helper: Sleep to avoid rate limits (politeness)
const randomSleep = () => {
    const ms = Math.floor(Math.random() * 4000) + 3000; 
    return new Promise(resolve => setTimeout(resolve, ms));
};

// 1. COINNESS FETCHER (Kept mostly the same, works well for APIs)
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
                // ✅ SAFE INSERT
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
                if (dbError.code !== 'P2002') { // Ignore unique constraint violations
                    console.error(`   ⚠️ DB Error: ${dbError.message}`);
                }
            }
            // Always mark as seen
            await redis.set(uniqueId, '1', 'EX', 86400);
        }
        if (newCount > 0) console.log(`✅ CoinNess: ${newCount} new items.`);

    } catch (err) {
        console.error(`❌ CoinNess Error: ${err.message}`);
    }
};

// 2. RSS FETCHER (IMPROVED for Google News & Redirects)
export const fetchRSS = async (url) => {
    console.log(`\n🔍 Fetching RSS: ${url}`);
    const channel = await connectRabbit();
    
    try {
        const feed = await parser.parseURL(url);
        let newCount = 0;

        for (const item of feed.items) {
            // 1. REDIS CHECK: Fast check on the Feed Link (e.g. google redirect link)
            const cacheKey = `news:${item.link || item.guid}`;
            const isCached = await redis.get(cacheKey);
            if (isCached) { process.stdout.write("."); continue; }

            // 2. SCRAPE & RESOLVE
            // We behave as if the content is always short/missing (common in Google News)
            // This forces a scrape to get the REAL URL and FULL Content.
            await randomSleep(); 
            
            let bestContent = "";
            let finalUrl = item.link; // Default to RSS link

            try {
                const scrapedData = await scrapeArticle(item.link);
                
                // Handle new Scraper return format ({ content, url }) AND old format (string)
                if (scrapedData) {
                    if (typeof scrapedData === 'object' && scrapedData.content) {
                        bestContent = scrapedData.content;
                        if (scrapedData.url) finalUrl = scrapedData.url; // Capture the real Resolved URL
                    } else if (typeof scrapedData === 'string') {
                        bestContent = scrapedData;
                    }
                    console.log(`   📝 Scraped ${bestContent.length} chars from ${finalUrl.substring(0,30)}...`);
                }
            } catch (scrapeErr) {
                console.warn(`   ⚠️ Scraping failed for ${item.link}, falling back to RSS feed data.`);
            }

            // Fallback: If scraping failed or returned nothing, use RSS data
            if (!bestContent || bestContent.length < 200) {
                bestContent = item.fullContent || item.normalContent || item.contentSnippet || "";
            }

            // Quality Control: If we still don't have enough text, skip it.
            if (bestContent.length < 200) {
                // Mark as seen so we don't retry immediately
                await redis.set(cacheKey, '1', 'EX', 3600); 
                continue; 
            }

            // 3. DB CHECK (Smart): Check if the FINAL Resolved URL exists
            // This prevents adding the same Decrypt article twice if it came from different RSS feeds
            if (finalUrl !== item.link) {
                const existingReal = await prisma.rawNews.findUnique({ where: { sourceUrl: finalUrl } });
                if (existingReal) {
                    await redis.set(cacheKey, '1', 'EX', 86400); // Cache the redirect link too
                    continue;
                }
            }

            const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();

            try {
                // ✅ SAFE INSERT
                const raw = await prisma.rawNews.create({
                    data: {
                        sourceUrl: finalUrl, // Save the REAL URL, not the Google Redirect
                        title: item.title,
                        rawBody: bestContent, 
                        publishedAt: pubDate,   
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
            // Always update Redis
            await redis.set(cacheKey, '1', 'EX', 86400);
        }
        console.log(`\n✅ Saved ${newCount} NEW articles.`);
        return newCount;

    } catch (err) {
        console.error(`❌ Error fetching RSS: ${err.message}`);
        return 0;
    }
};