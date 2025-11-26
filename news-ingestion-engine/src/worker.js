require('dotenv').config();
const Bottleneck = require('bottleneck'); // <--- IMPORT THIS
const { connectRabbit } = require('./config/rabbit');
const prisma = require('./config/db');
const { cleanText } = require('./services/cleaner.service');
const { classifyNews, getOrCreateCategory } = require('./services/classifier.service');

// 🛑 RATE LIMITER CONFIGURATION
// safe limit: 1 request every 4000ms (4 seconds) = 15 per minute
const limiter = new Bottleneck({
    minTime: 4000, 
    maxConcurrent: 1 
});

const processJob = async (msg, channel) => {
    const content = JSON.parse(msg.content.toString());
    const { rawNewsId } = content;

    console.log(`\n⚙️  [Worker] Picked up: ${rawNewsId}`);

    try {
        const rawNews = await prisma.rawNews.findUnique({ where: { id: rawNewsId } });

        if (!rawNews || rawNews.processed) {
            console.log("   ⚠️  Skipping (Missing or Processed)");
            channel.ack(msg);
            return;
        }

        const cleanedBody = cleanText(rawNews.rawBody);

        // ⏳ WRAP THE AI CALL IN THE LIMITER
        // This line will PAUSE execution automatically if we are going too fast
        const categoryName = await limiter.schedule(() => 
            classifyNews(cleanedBody, rawNews.title)
        );

        const category = await getOrCreateCategory(categoryName);

await prisma.cleanedNews.create({
            data: {
                title: rawNews.title,
                summary: cleanedBody.substring(0, 150) + "...",
                content: cleanedBody,
                sourceUrl: rawNews.sourceUrl,
                
                // ✅ BUG FIX: Use the original date from RawNews
                publishedAt: rawNews.publishedAt, 
                
                categoryId: category.id
            }
        });

        await prisma.rawNews.update({
            where: { id: rawNewsId },
            data: { processed: true }
        });

        console.log(`   ✅ Done! Classified as: ${categoryName}`);
        channel.ack(msg);

    } catch (err) {
        console.error(`   ❌ Error: ${err.message}`);
        // If it's a 429 (Rate Limit) error from Google, we put it back in the queue
        if (err.message.includes('429')) {
             console.log("   ⏳ Rate Limit Hit - Requeuing...");
             channel.nack(msg); // Put back to retry later
        } else {
             channel.ack(msg); // Ack other errors to avoid infinite loops
        }
    }
};

const startWorker = async () => {
    const channel = await connectRabbit();
    
    // ⚠️ CRITICAL: Only take 1 job at a time
    channel.prefetch(1); 
    
    console.log("👀 Worker waiting... (Rate Limit: 1 req/4s)");

    channel.consume('ingest_queue', (msg) => {
        if (msg) processJob(msg, channel);
    });
};

startWorker();