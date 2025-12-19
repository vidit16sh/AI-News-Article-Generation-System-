// src/services/fetcher.service.js - PRODUCTION GRADE
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

/**
 * Normalizes URLs by removing tracking parameters and fragments.
 * This is the #1 way to prevent duplicate articles.
 */
const normalizeUrl = (url) => {
    try {
        const u = new URL(url);
        // Remove tracking params and specific junk folders
        u.search = ""; 
        u.hash = "";
        return u.toString().toLowerCase().replace(/\/$/, ""); // Remove trailing slash
    } catch (e) {
        return url.toLowerCase();
    }
};

const randomSleep = (min = 2000, max = 5000) => {
    return new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min)) + min));
};

// 1. COINNESS FETCHER
export const fetchCoinNess = async () => {
    const apiUrl = process.env.COINNESS_API_URL || "https://api.coinness.com/feed/v1/breaking-news?languageCode=en";
    console.log(`\n🔍 [Fetcher] Checking CoinNess...`);
    const channel = await connectRabbit();

    try {
        const config = process.env.COINNESS_API_KEY ? { headers: { 'Authorization': `Bearer ${process.env.COINNESS_API_KEY}` } } : {};
        const response = await axios.get(apiUrl, config);
        const items = response.data.list || response.data || [];

        let newCount = 0;
        for (const item of items) {
            const rawUrl = item.shareUrl || `https://coinness.com/news/${item.id}`;
            const cleanUrl = normalizeUrl(rawUrl);
            const cacheKey = `news:coinness:${cleanUrl}`;

            // Check Cache & DB
            if (await redis.get(cacheKey)) continue;
            const existing = await prisma.rawNews.findUnique({ where: { sourceUrl: cleanUrl } });
            if (existing) {
                await redis.set(cacheKey, '1', 'EX', 86400);
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
                await redis.set(cacheKey, '1', 'EX', 86400);
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

// 2. RSS FETCHER (Optimized for variety and accuracy)
export const fetchRSS = async (url) => {
    console.log(`\n🔍 [Fetcher] Checking RSS: ${url}`);
    const channel = await connectRabbit();
    
    try {
        const feed = await parser.parseURL(url);
        let newCount = 0;

        for (const item of feed.items) {
            // STEP 1: Normalize initial link
            const initialUrl = normalizeUrl(item.link);
            const cacheKey = `news:rss:${initialUrl}`;

            // STEP 2: Pre-check DB to avoid wasting Scraper time/proxy credits
            if (await redis.get(cacheKey)) { process.stdout.write("."); continue; }
            const exists = await prisma.rawNews.findUnique({ where: { sourceUrl: initialUrl } });
            if (exists) {
                await redis.set(cacheKey, '1', 'EX', 86400);
                continue;
            }

            // STEP 3: Scrape (Handles Google Redirects)
            await randomSleep(3000, 6000); 
            console.log(`\n   🕷️ Scraping: ${item.title.substring(0, 40)}...`);
            
            const scrapedData = await scrapeArticle(item.link);
            if (!scrapedData || !scrapedData.content || scrapedData.content.length < 400) {
                console.log(`     ⚠️  Skipping: Content too thin or blocked.`);
                await redis.set(cacheKey, '1', 'EX', 3600); // Block for 1 hour to retry later
                continue;
            }

            // STEP 4: Secondary URL Validation (Post-Redirect)
            const finalUrl = normalizeUrl(scrapedData.url);
            
            // CRITICAL JUNK FILTER: Skip price converters or non-article pages
            const junkPatterns = ['/price-converter/', '/tag/', '/author/', '/category/', '/login', '/signup'];
            if (junkPatterns.some(pattern => finalUrl.includes(pattern))) {
                console.log(`     🗑️  Junk page detected: ${finalUrl}`);
                await redis.set(cacheKey, '1', 'EX', 86400);
                continue;
            }

            // Check if another RSS feed already saved this specific final URL
            const finalExists = await prisma.rawNews.findUnique({ where: { sourceUrl: finalUrl } });
            if (finalExists) {
                await redis.set(cacheKey, '1', 'EX', 86400);
                continue;
            }

            // STEP 5: Save & Queue
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
                console.log(`     🚀 Queued: ${finalUrl.substring(0, 50)}...`);
                newCount++;
            } catch (dbError) {
                if (dbError.code === 'P2002') await redis.set(cacheKey, '1', 'EX', 86400);
            }
            
            await redis.set(cacheKey, '1', 'EX', 86400);
        }
        
        if (newCount > 0) console.log(`\n✅ Saved ${newCount} new articles from this source.`);
        return newCount;

    } catch (err) {
        console.error(`❌ Error fetching RSS: ${err.message}`);
        return 0;
    }
};