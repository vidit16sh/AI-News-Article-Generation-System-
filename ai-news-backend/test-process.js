require('dotenv').config();
const prisma = require('./src/config/db');
const { cleanText } = require('./src/services/cleaner.service');
const { classifyNews, getOrCreateCategory } = require('./src/services/classifier.service');

async function test() {
    // 1. Get a raw item
    const rawNews = await prisma.rawNews.findFirst({
        where: { processed: false }
    });

    if (!rawNews) {
        console.log("No raw news found! Run 'node test-fetch.js' first.");
        return;
    }

    console.log(`\n--- PROCESSING: ${rawNews.title} ---`);

    // 2. Clean
    const cleanedBody = cleanText(rawNews.rawBody);
    console.log(`🧹 Cleaned: ${cleanedBody.substring(0, 50)}...`);

    // 3. Classify
    const categoryName = await classifyNews(cleanedBody, rawNews.title);
    console.log(`🏷️  Category: ${categoryName}`);

    // 4. Save to CleanedNews Table
    const category = await getOrCreateCategory(categoryName);
    
    await prisma.cleanedNews.create({
        data: {
            title: rawNews.title,
            summary: cleanedBody.substring(0, 100) + "...",
            content: cleanedBody,
            sourceUrl: rawNews.sourceUrl,
            publishedAt: new Date(),
            categoryId: category.id
        }
    });

    // 5. Mark as processed
    await prisma.rawNews.update({
        where: { id: rawNews.id },
        data: { processed: true }
    });

    console.log(`✅ Success! Data moved from Raw -> Cleaned.`);
}

test()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());