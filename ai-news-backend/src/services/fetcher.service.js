import Parser from 'rss-parser';
import redis from '../config/redis.js';
import prisma from '../config/db.js';
import { connectRabbit } from '../config/rabbit.js';
import { scrapeArticle } from './scraper.service.js';

const parser = new Parser({
    customFields: {
        item: [
            ['content:encoded', 'fullContent'], 
            ['content', 'normalContent']
        ],
    }
});

export const fetchRSS = async (url) => {
    console.log(`\n🔍 Fetching RSS: ${url}`);
    const channel = await connectRabbit();
    
    try {
        const feed = await parser.parseURL(url);
        let newCount = 0;

        for (const item of feed.items) {
            const link = item.link;

            const isCached = await redis.get(`news:${link}`);
            if (isCached) {
                process.stdout.write(".");
                continue;
            }

            // Intelligent Parsing
            let bestContent = item.fullContent || item.normalContent || item.contentSnippet || "";
            
            // Trigger Scraper if thin
            if (bestContent.length < 200) {
                const scrapedText = await scrapeArticle(link);
                if (scrapedText) {
                    bestContent = scrapedText;
                    console.log(`   📝 Scraped ${bestContent.length} chars.`);
                }
            }

            // Fix Date
            const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();

            // Save Raw
            const raw = await prisma.rawNews.create({
                data: {
                    sourceUrl: link,
                    title: item.title,
                    rawBody: bestContent, 
                    publishedAt: pubDate,   
                    processed: false 
                }
            });

            await redis.set(`news:${link}`, '1', 'EX', 86400);

            const payload = { rawNewsId: raw.id };
            channel.sendToQueue('ingest_queue', Buffer.from(JSON.stringify(payload)));
            console.log(`   ➡️  Queued: ${raw.title.substring(0, 30)}...`);
            
            newCount++;
        }
        console.log(`\n✅ Saved ${newCount} NEW articles.`);
        return newCount;

    } catch (err) {
        console.error(`❌ Error fetching RSS: ${err.message}`);
        return 0;
    }
};