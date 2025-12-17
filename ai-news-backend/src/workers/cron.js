import 'dotenv/config';
import cron from 'node-cron';
import { fetchRSS, fetchCoinNess } from '../services/fetcher.service.js';

// 🚀 UPGRADED SOURCE LIST (Cleaned & Optimized)
const SOURCES = [
    // --- TIER 1: MAINSTREAM & BRIDGE FEEDS (High Trust / No Blocks) --- 
    "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=15839069", // CNBC Crypto (Direct is usually safe)
    
    // ✅ GOOGLE NEWS BRIDGE (Replaces blocked direct feeds)
    // These fetch verifiable content via Google to bypass Cloudflare/403 blocks on the main sites.
    "https://news.google.com/rss/search?q=site:coindesk.com+when:1d&hl=en-US&gl=US&ceid=US:en",
    "https://news.google.com/rss/search?q=site:cointelegraph.com+when:1d&hl=en-US&gl=US&ceid=US:en",
    "https://news.google.com/rss/search?q=site:theblock.co+when:1d&hl=en-US&gl=US&ceid=US:en",
    "https://news.google.com/rss/search?q=site:reuters.com+cryptocurrency+when:1d&hl=en-US&gl=US&ceid=US:en",

    // --- TIER 3: GOV/OFFICIAL (Primary Source) ---
    "https://www.sec.gov/news/pressreleases.rss", // SEC Press Releases
];

console.log("⏰ Cron Scheduler Started...");

// Run every 2 minutes
cron.schedule('*/2 * * * *', async () => {
    console.log(`\n⏰ [${new Date().toISOString()}] Cron Triggered`);
    
    // 1. Fetch CoinNess (The Speed Layer)
    await fetchCoinNess();

    // 2. Fetch RSS Feeds (The Authority Layer)
    // Randomize order to vary access patterns
    const shuffledSources = SOURCES.sort(() => Math.random() - 0.5);
    
    for (const url of shuffledSources) {
        try {
            await fetchRSS(url);
            // Gentle delay (3s) to prevent rate limiting
            await new Promise(r => setTimeout(r, 3000)); 
        } catch (e) {
            console.error(`⚠️ Failed to fetch ${url}: ${e.message}`);
        }
    }
});