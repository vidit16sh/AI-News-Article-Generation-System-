import 'dotenv/config'; 
import Bottleneck from 'bottleneck';
import { connectRabbit } from '../config/rabbit.js'; 
import prisma from '../lib/prisma.js';
import { cleanText } from '../services/cleaner.service.js';
import { classifyNews, getOrCreateCategory } from '../services/classifier.service.js';

// 🛑 RATE LIMITER for Classification (Flash is fast, but let's be safe)
const limiter = new Bottleneck({
    minTime: 20000, // 1 request every 2 seconds
    maxConcurrent: 1 
});

const processJob = async (msg, channel) => {
    const content = JSON.parse(msg.content.toString());
    const { rawNewsId, retryCount = 0 } = content;

    try {
        const rawNews = await prisma.rawNews.findUnique({ where: { id: rawNewsId } });

        if (!rawNews || rawNews.processed) {
            channel.ack(msg);
            return;
        }

        const cleanedBody = cleanText(rawNews.rawBody);

        // 🧠 1. CLASSIFY with Gemini Flash (Cheap/Free)
        const classification = await limiter.schedule(() => 
            classifyNews(cleanedBody, rawNews.title)
        ); 

        const categoryName = classification.category || "General";
        const priorityScore = classification.priority_score || 0; 

        // 2. Database: Save the clean version (but don't generate yet)
        const category = await getOrCreateCategory(categoryName);
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

        await prisma.rawNews.update({
            where: { id: rawNewsId },
            data: { processed: true }
        });

        // 💎 3. THE VIP FILTER (Quality Control)
        // Only send to Generator if Score is >= 85 (Breaking/Major News)
        // This reduces volume from ~100/day to ~5-10/day.
        if (priorityScore >= 85) {
            console.log(`   🚀 APPROVED (${priorityScore}/100): "${rawNews.title.substring(0, 40)}..."`);
            console.log(`      Reason: ${classification.reasoning}`);
            
            const payload = { 
                newsId: finalNews.id,
                priorityScore: priorityScore
            };
            channel.sendToQueue('generation_queue', Buffer.from(JSON.stringify(payload)));
        } else {
            console.log(`   🗑️  REJECTED (${priorityScore}/100): "${rawNews.title.substring(0, 40)}..."`);
        }

        channel.ack(msg);

    } catch (err) {
        console.error(`   ❌ Ingest Error: ${err.message}`);
        // Simple retry logic for rate limits
        if (err.message.includes('429') && retryCount < 3) {
             setTimeout(() => {
                 const newContent = { ...content, retryCount: retryCount + 1 };
                 channel.sendToQueue('ingest_queue', Buffer.from(JSON.stringify(newContent)));
                 channel.ack(msg);
             }, 30000); // Wait 30s before retry
        } else {
             channel.ack(msg);
        }
    }
};

const startWorker = async () => {
    const channel = await connectRabbit();
    await channel.assertQueue('generation_queue', { durable: true });
    channel.prefetch(1); 
    console.log("👀 Ingest Worker (VIP Filter Mode) Started...");
    channel.consume('ingest_queue', (msg) => {
        if (msg) processJob(msg, channel);
    });
};

startWorker();