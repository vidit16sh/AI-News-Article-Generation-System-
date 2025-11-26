require('dotenv').config(); // Load environment variables
const { fetchRSS } = require('./src/services/fetcher.service');
const prisma = require('./src/config/db');
const redis = require('./src/config/redis');

async function test() {
    console.log("🚀 Starting Ingestion Test...");

    // 1. Fetch real crypto news from CoinTelegraph
    const url = "https://cointelegraph.com/rss";
    await fetchRSS(url);

    // 2. Check the Database to prove it worked
    const count = await prisma.rawNews.count();
    const sample = await prisma.rawNews.findFirst({
        orderBy: { fetchedAt: 'desc' }
    });

    console.log("\n--- DATABASE RESULT ---");
    console.log(`Total Articles in DB: ${count}`);
    if (sample) {
        console.log(`Latest Article: "${sample.title}"`);
    }

    // 3. Close connections
    await prisma.$disconnect();
    redis.disconnect();
}

test();