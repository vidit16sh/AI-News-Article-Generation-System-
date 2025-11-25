const Parser = require('rss-parser');
const redis = require('../config/redis');
const prisma = require('../config/db');

const parser = new Parser();

const fetchRSS = async (url) => {
    console.log(`\n🔍 Fetching RSS: ${url}`);
    
    try {
        const feed = await parser.parseURL(url);
        console.log(`Found ${feed.items.length} items.`);

        let newCount = 0;

        for (const item of feed.items) {
            const link = item.link;

            // 1. DEDUPLICATION: Check Redis
            // If we have seen this link in the last 24 hours, skip it.
            const isCached = await redis.get(`news:${link}`);
            if (isCached) {
                process.stdout.write("."); // Visual feedback for skipped items
                continue;
            }

            // 2. SAVE: Insert into Postgres (RawNews table)
            await prisma.rawNews.create({
                data: {
                    sourceUrl: link,
                    title: item.title,
                    rawBody: item.content || item.contentSnippet || "",
                    processed: false 
                }
            });

            // 3. CACHE: Mark as seen in Redis
            // 'EX', 86400 means expire in 24 hours (86400 seconds)
            await redis.set(`news:${link}`, '1', 'EX', 86400);
            
            newCount++;
        }

        console.log(`\n✅ Saved ${newCount} NEW articles.`);
        return newCount;

    } catch (err) {
        console.error(`❌ Error fetching RSS: ${err.message}`);
        return 0;
    }
};

module.exports = { fetchRSS };