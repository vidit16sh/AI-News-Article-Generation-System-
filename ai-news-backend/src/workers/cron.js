import 'dotenv/config';
import cron from 'node-cron';
import { fetchRSS, fetchCoinNess } from '../services/fetcher.service.js';

// 🚀 UPGRADED SOURCE LIST (The "Google News Approved" Mix)
const SOURCES = [
    // --- TIER 1: MAINSTREAM FINANCE (High Trust / High E-E-A-T) ---
    // Google trusts these implicitly. Citing them boosts your "Factuality" score.
    "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=15839069", // CNBC Crypto
    "https://feeds.reuters.com/reuters/technologyNews", // Reuters Tech (often covers big crypto moves)
    "https://www.investing.com/rss/news_285.rss", // Investing.com Crypto (Market Data focused)

    // --- TIER 2: CRYPTO NATIVE AUTHORITIES (Industry Standard) ---
    "https://www.coindesk.com/arc/outboundfeeds/rss/",
    "https://cointelegraph.com/rss", 
    "https://decrypt.co/feed",

    // --- TIER 3: GOV/OFFICIAL (Primary Source) ---
    // If SEC posts, you want to be the FIRST to analyze it.
    "https://www.sec.gov/news/pressreleases.rss", // SEC Press Releases (The ultimate primary source)
];

console.log("⏰ Cron Scheduler Started...");

// Run every 2 minutes to respect rate limits of bigger sites
cron.schedule('*/2 * * * *', async () => {
    console.log(`\n⏰ [${new Date().toISOString()}] Cron Triggered`);
    
    // 1. Fetch CoinNess (The Speed Layer)
    await fetchCoinNess();

    // 2. Fetch RSS Feeds (The Authority Layer)
    // We shuffle to avoid hitting the same server pattern perfectly every time
    const shuffledSources = SOURCES.sort(() => Math.random() - 0.5);
    
    for (const url of shuffledSources) {
        try {
            await fetchRSS(url);
            // Gentle delay to prevent your IP from getting flagged as a bot
            await new Promise(r => setTimeout(r, 2000)); 
        } catch (e) {
            console.error(`⚠️ Failed to fetch ${url}: ${e.message}`);
        }
    }
});