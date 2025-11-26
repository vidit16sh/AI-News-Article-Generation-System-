const Parser = require('rss-parser');
const redis = require('../config/redis');
const prisma = require('../config/db');
const { connectRabbit } = require('../config/rabbit');
const { scrapeArticle } = require('./scraper.service'); 

// Configure parser to look for full content tags
const parser = new Parser({
    customFields: {
        item: [
            ['content:encoded', 'fullContent'], 
            ['content', 'normalContent']
        ],
    }
});

const fetchRSS = async (url) => {
    console.log(`\n🔍 Fetching RSS: ${url}`);
    const channel = await connectRabbit();
    
    try {
        const feed = await parser.parseURL(url);
        let newCount = 0;

        for (const item of feed.items) {
            const link = item.link;

            // 1. Deduplication (Redis)
            const isCached = await redis.get(`news:${link}`);
            if (isCached) {
                process.stdout.write(".");
                continue;
            }

            // 2. INTELLIGENT PARSING
            // Try to find the longest content available
            let bestContent = item.fullContent || item.normalContent || item.contentSnippet || "";
            
            if (bestContent.length < 200) {
                const scrapedText = await scrapeArticle(link);
                if (scrapedText) {
                    bestContent = scrapedText;
                    console.log(`   📝 Scraped ${bestContent.length} chars of real content.`);
                }
            }
            // Fix Date: Use the real pubDate, fallback to now only if missing
            const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();

            // 3. Save Raw to DB
            const raw = await prisma.rawNews.create({
                 // ... same as before
                 data: {
                    sourceUrl: link,
                    title: item.title,
                    rawBody: bestContent, // <--- NOW THIS HAS REAL TEXT
                    publishedAt: pubDate,
                    processed: false 
                }
            });

            // 4. Cache & Queue
            await redis.set(`news:${link}`, '1', 'EX', 86400);

            const payload = { rawNewsId: raw.id };
            channel.sendToQueue('ingest_queue', Buffer.from(JSON.stringify(payload)));
            console.log(`   ➡️  Queued: ${raw.title.substring(0, 30)}...`);
            
            newCount++;
        }

        console.log(`\n✅ Saved & Queued ${newCount} NEW articles.`);
        return newCount;

    } catch (err) {
        console.error(`❌ Error fetching RSS: ${err.message}`);
        return 0;
    }
};

module.exports = { fetchRSS };