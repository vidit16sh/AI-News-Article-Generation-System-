// src/workers/publisher.js
import 'dotenv/config';
import cron from 'node-cron';
import prisma from '../lib/prisma.js';

// ✅ Logic: 15-minute drip feed for articles scored 45-74
const CONFIG = {
    DRIP_INTERVAL_MINS: 15,    // Standard wait time between posts
    MIN_SCORE: 45              // Minimum score to publish
};

// Helper: Trigger Next.js ISR Revalidation
const triggerRevalidation = async () => {
    try {
        const apiUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        await fetch(`${apiUrl}/api/revalidate`, {
            method: 'POST',
            headers: { 'x-admin-key': process.env.API_SECRET_KEY },
            body: JSON.stringify({ tag: 'articles' })
        });
        console.log("   ✨ Frontend Cache Revalidated");
    } catch (e) { 
        console.error("   ⚠️ Revalidate failed (Is Next.js running?)"); 
    }
};

const publishArticle = async (article, reason) => {
    console.log(`   🚀 PUBLISHING: "${article.headline}"`);
    console.log(`      Reason: ${reason} (Score: ${article.priorityScore})`);

    await prisma.generatedArticle.update({
        where: { id: article.id },
        data: { 
            status: 'PUBLISHED',
            publishAt: new Date() // Set to NOW so it resets the 15-min timer
        }
    });

    await triggerRevalidation();
};

console.log("💧 15-Minute Drip Publisher Started...");

// Check every minute if it is time to release the next article from the queue
cron.schedule('* * * * *', async () => {
    try {
        // 1. Find the most recently published article (regardless of score)
        const lastArticle = await prisma.generatedArticle.findFirst({
            where: { status: 'PUBLISHED' },
            orderBy: { publishAt: 'desc' }
        });

        const now = new Date();
        const lastPublishTime = lastArticle ? new Date(lastArticle.publishAt) : new Date(0);
        const minsSinceLast = Math.floor((now - lastPublishTime) / 60000);

        // 2. Check if we have waited long enough (15 mins)
        if (minsSinceLast >= CONFIG.DRIP_INTERVAL_MINS) {
            // Find the best quality article waiting in the queue
            const nextInQueue = await prisma.generatedArticle.findFirst({
                where: { 
                    status: 'QUEUED',
                    priorityScore: { gte: CONFIG.MIN_SCORE }
                },
                orderBy: { priorityScore: 'desc' } // Best story goes next
            });

            if (nextInQueue) {
                console.log(`\n⏰ Drip Timer Triggered (${minsSinceLast}m passed).`);
                await publishArticle(nextInQueue, "Staggered Drip Release");
            } else {
                process.stdout.write(`\r💤 Queue Empty. Waiting for new scraper data...`);
            }
        } else {
            // Keep the user informed in the PM2 logs
            const remaining = CONFIG.DRIP_INTERVAL_MINS - minsSinceLast;
            process.stdout.write(`\r⏱️  Drip cycle active. Next possible post in: ${remaining} mins.`);
        }

    } catch (err) {
        console.error("❌ Publisher Error:", err);
    }
});