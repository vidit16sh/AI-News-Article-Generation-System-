import 'dotenv/config';
import cron from 'node-cron';
import { fetchRSS } from '../services/fetcher.service.js';

// Define your sources here
const SOURCES = [
    "https://www.coindesk.com/arc/outboundfeeds/rss/", // CoinDesk
    "https://watcher.guru/news/feed",                  // Watcher Guru
    "https://decrypt.co/feed", 
    
];

console.log("⏰ Cron Scheduler Started...");

// Schedule: Run every minute (* * * * *)
// Check https://crontab.guru to customize
cron.schedule('* * * * *', async () => {
    console.log(`\n⏰ [${new Date().toISOString()}] Cron Triggered`);
    
    for (const url of SOURCES) {
        try {
            await fetchRSS(url);
        } catch (err) {
            console.error(`   ❌ Failed to fetch ${url}`);
        }
    }
});