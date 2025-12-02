import 'dotenv/config';
import cron from 'node-cron';
import prisma from '../lib/prisma.js';

// Helper to trigger frontend update
const triggerRevalidation = async () => {
    try {
        const apiUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        await fetch(`${apiUrl}/api/revalidate`, {
            method: 'POST',
            headers: { 'x-admin-key': process.env.API_SECRET_KEY },
            body: JSON.stringify({ tag: 'articles' })
        });
    } catch (e) { console.error("Revalidate failed"); }
};

console.log("💧 Drip Publisher Service Started...");

// Run every 10 minutes
cron.schedule('*/10 * * * *', async () => {
    console.log(`\n💧 [${new Date().toISOString()}] Checking Queue...`);

    try {
        // 1. Find the oldest QUEUED article with good score
        const nextArticle = await prisma.generatedArticle.findFirst({
            where: { status: 'QUEUED' },
            orderBy: { priorityScore: 'desc' } // Publish highest value first
        });

        if (nextArticle) {
            // 2. Publish it
            await prisma.generatedArticle.update({
                where: { id: nextArticle.id },
                data: { 
                    status: 'PUBLISHED',
                    publishAt: new Date() // Update time to "Now" so it appears fresh
                }
            });

            console.log(`   🚀 Released: "${nextArticle.headline}"`);
            await triggerRevalidation();
        } else {
            console.log("   zzZ Queue is empty.");
        }
    } catch (err) {
        console.error("Publisher Error:", err);
    }
});