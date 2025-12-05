import 'dotenv/config'; 
import Bottleneck from 'bottleneck';
import { connectRabbit } from '../config/rabbit.js'; 
import prisma from '../lib/prisma.js';
import { cleanText } from '../services/cleaner.service.js';
import { classifyNews, getOrCreateCategory } from '../services/classifier.service.js';

// 🛑 RATE LIMITER: 1 req every 5 seconds (Slower = Safer)
const limiter = new Bottleneck({
    minTime: 20000, 
    maxConcurrent: 1 
});

const processJob = async (msg, channel) => {
    const content = JSON.parse(msg.content.toString());
    const { rawNewsId, retryCount = 0 } = content; // Track retries

    console.log(`\n⚙️  [Ingest-Worker] Picked up: ${rawNewsId} (Retry: ${retryCount})`);

    try {
        const rawNews = await prisma.rawNews.findUnique({ where: { id: rawNewsId } });

        if (!rawNews || rawNews.processed) {
            console.log("   ⚠️  Skipping (Missing or Processed)");
            channel.ack(msg);
            return;
        }

        const cleanedBody = cleanText(rawNews.rawBody);

        // ⏳ AI Call
        const classification = await limiter.schedule(() => 
            classifyNews(cleanedBody, rawNews.title)
        ); 

        const categoryName = classification.category || "General";
        const priorityScore = classification.priority_score || 50; 

        console.log(`   🧠 Classified: ${categoryName} (Score: ${priorityScore})`);
        
        const category = await getOrCreateCategory(categoryName);

        // 1. Save Cleaned Data
        const finalNews = await prisma.cleanedNews.create({
            data: {
                title: rawNews.title,
                summary: cleanedBody.substring(0, 150) + "...",
                content: cleanedBody,
                sourceUrl: rawNews.sourceUrl,
                publishedAt: rawNews.publishedAt, 
                categoryId: category.id
            }
        });

        // 2. Mark Raw as Processed
        await prisma.rawNews.update({
            where: { id: rawNewsId },
            data: { processed: true }
        });

        console.log(`   ✅ Done! Classified as: ${categoryName}`);

        // 3. TRIGGER MODEL 2
        const payload = { 
            newsId: finalNews.id,
            priorityScore: priorityScore
        };
        channel.sendToQueue('generation_queue', Buffer.from(JSON.stringify(payload)));
        console.log(`   ➡️  Triggered Model 2`);

        channel.ack(msg);

    } catch (err) {
        console.error(`   ❌ Error: ${err.message}`);
        
        // 🚨 SMART RETRY LOGIC for 429s
        if (err.message && err.message.includes('429')) {
             // Exponential Backoff: 10s, 20s, 40s...
             const delay = Math.min(10000 * Math.pow(2, retryCount), 60000); // Max 1 min
             
             console.log(`   ⏳ Rate Limit Hit - Requeuing in ${delay/1000}s...`);
             
             setTimeout(() => {
                 // Re-queue with incremented retry count
                 const newContent = { ...content, retryCount: retryCount + 1 };
                 channel.sendToQueue('ingest_queue', Buffer.from(JSON.stringify(newContent)));
                 channel.ack(msg); // Ack original to remove it
             }, delay);

        } else {
             channel.ack(msg); // Ack permanent errors
        }
    }
};

const startWorker = async () => {
    const channel = await connectRabbit();
    await channel.assertQueue('generation_queue', { durable: true });
    channel.prefetch(1); 
    
    console.log("👀 Ingest Worker waiting... (Rate Limit: 1 req/5s)");

    channel.consume('ingest_queue', (msg) => {
        if (msg) processJob(msg, channel);
    });
};

startWorker();