import 'dotenv/config';
import cron from 'node-cron';
import prisma from '../lib/prisma.js';

// Configuration
const CONFIG = {
    URGENT_THRESHOLD: 80,      // Score needed to skip the queue
    DRIP_INTERVAL_MINS: 15,    // Standard wait time between posts
    DRAFT_SALVAGE_MINS: 60,    // If silent for 60m, post a Draft
    MIN_DRAFT_SCORE: 45        // Minimum quality to salvage a draft
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
        console.log("   ✨ Cache Revalidated");
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
            publishAt: new Date() // Set to NOW so it appears at the top
        }
    });

    await triggerRevalidation();
};

console.log("💧 Smart Publisher Service Started (Check every 1 min)...");

// Run every minute to check for urgent items
cron.schedule('* * * * *', async () => {
    try {
        // 1. Get the timestamps of the last published article
        const lastArticle = await prisma.generatedArticle.findFirst({
            where: { status: 'PUBLISHED' },
            orderBy: { publishAt: 'desc' }
        });

        const now = new Date();
        const lastPublishTime = lastArticle ? new Date(lastArticle.publishAt) : new Date(0);
        const minsSinceLast = Math.floor((now - lastPublishTime) / 60000);

        console.log(`\n⏱️  Last publish: ${minsSinceLast} mins ago`);

        // ============================================================
        // 🚨 LEVEL 1: URGENT PRIORITY (Skip the Timer)
        // ============================================================
        // Condition: Article is QUEUED and Score is very high (>80)
        const urgentArticle = await prisma.generatedArticle.findFirst({
            where: { 
                status: 'QUEUED', 
                priorityScore: { gte: CONFIG.URGENT_THRESHOLD } 
            },
            orderBy: { priorityScore: 'desc' }
        });

        if (urgentArticle) {
            await publishArticle(urgentArticle, "⚡ URGENT BREAKING NEWS");
            return; // Done for this cycle
        }

        // ============================================================
        // 💧 LEVEL 2: STANDARD DRIP FEED (Respect the Timer)
        // ============================================================
        // Condition: It has been > 15 mins since last post
        if (minsSinceLast >= CONFIG.DRIP_INTERVAL_MINS) {
            const standardArticle = await prisma.generatedArticle.findFirst({
                where: { status: 'QUEUED' },
                orderBy: { priorityScore: 'desc' } // Best remaining stories first
            });

            if (standardArticle) {
                await publishArticle(standardArticle, "💧 Standard Drip Feed");
                return;
            }
        }

        // ============================================================
        // ♻️ LEVEL 3: DRAFT SALVAGE (Prevent "Dead Air")
        // ============================================================
        // Condition: It has been > 60 mins (Site looks dead) AND we have decent drafts
        if (minsSinceLast >= CONFIG.DRAFT_SALVAGE_MINS) {
            const salvageArticle = await prisma.generatedArticle.findFirst({
                where: { 
                    status: 'DRAFT', 
                    priorityScore: { gte: CONFIG.MIN_DRAFT_SCORE } 
                },
                orderBy: { createdAt: 'desc' } // Newest drafts first
            });

            if (salvageArticle) {
                await publishArticle(salvageArticle, "♻️ Salvaging Draft (Keep Alive)");
                return;
            }
        }

        console.log("   zzz No actions needed.");

    } catch (err) {
        console.error("❌ Publisher Logic Error:", err);
    }
});