import 'dotenv/config';
import cron from 'node-cron';
import { fetchRSS, fetchCoinNess } from '../services/fetcher.service.js';

// 🚀 UPGRADED SOURCE LIST (Cleaned & Verified)
const SOURCES = [
    // --- TIER 1: MAINSTREAM FINANCE (High Trust / High E-E-A-T) ---
    "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=15839069", // CNBC Crypto
    
    // ✅ REPLACEMENT: Google News Bridge for Reuters (Since direct Reuters RSS is dead)
    // This fetches verifiable Reuters Tech/Crypto news via Google
    "https://news.google.com/rss/search?q=site:reuters.com+cryptocurrency+when:1d&hl=en-US&gl=US&ceid=US:en",

    // --- TIER 2: CRYPTO NATIVE AUTHORITIES (Industry Standard) ---
    "https://www.coindesk.com/arc/outboundfeeds/rss/",
    "https://cointelegraph.com/rss", 
    "https://decrypt.co/feed",
    "https://bitcoinmagazine.com/.rss/full/", 
    "https://www.theblock.co/rss.xml",

    // --- TIER 3: GOV/OFFICIAL (Primary Source) ---
    // If SEC posts, you want to be the FIRST to analyze it.
    "https://www.sec.gov/news/pressreleases.rss", // SEC Press Releases
];

console.log("⏰ Cron Scheduler Started...");

// Run every 2 minutes to keep data fresh but respect rate limits
cron.schedule('*/2 * * * *', async () => {
    console.log(`\n⏰ [${new Date().toISOString()}] Cron Triggered`);
    
    // 1. Fetch CoinNess (The Speed Layer - Instant Updates)
    await fetchCoinNess();

    // 2. Fetch RSS Feeds (The Authority Layer - Deep Analysis)
    // Randomize order so we don't hammer the same site first every time
    const shuffledSources = SOURCES.sort(() => Math.random() - 0.5);
    
    for (const url of shuffledSources) {
        try {
            await fetchRSS(url);
            // Gentle delay (3s) between requests to prevent 429 Rate Limits
            await new Promise(r => setTimeout(r, 3000)); 
        } catch (e) {
            console.error(`⚠️ Failed to fetch ${url}: ${e.message}`);
        }
    }
});