import 'dotenv/config';
import cron from 'node-cron';
import { fetchRSS, fetchCoinNess } from '../services/fetcher.service.js';

const SOURCES = [
    "https://watcher.guru/news/feed",
    "https://decrypt.co/feed",
    "https://www.coindesk.com/arc/outboundfeeds/rss/"
];

console.log("⏰ Cron Scheduler Started...");

cron.schedule('* * * * *', async () => {
    console.log(`\n⏰ [${new Date().toISOString()}] Cron Triggered`);
    
    // 1. Fetch CoinNess (Fastest)
    await fetchCoinNess();

    // 2. Fetch Standard RSS
    for (const url of SOURCES) {
        await fetchRSS(url);
    }
});