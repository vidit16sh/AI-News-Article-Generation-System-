import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function reset() {
    console.log("🧨 WIPING NEWS DATA...");

    // 1. Clear Database
    await prisma.generatedArticle.deleteMany({});
    await prisma.cleanedNews.deleteMany({});
    await prisma.rawNews.deleteMany({});

    // 2. Clear Redis Cache (The "Seen" links)
    const keys = await redis.keys('news:*');
    if (keys.length > 0) {
        await redis.del(keys);
    }

    console.log("✅ Memory wiped. Next fetch will grab EVERYTHING.");
}

reset()
    .catch(console.error)
    .finally(() => {
        prisma.$disconnect();
        redis.disconnect();
    });