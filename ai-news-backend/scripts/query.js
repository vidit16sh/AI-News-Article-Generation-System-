import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function queryArticles() {
  console.log("🔍 Querying Generated Articles...\n");

  try {
    // Fetch articles with ALL fields (removed specific 'select' to get everything)
    const articles = await prisma.generatedArticle.findMany({
      take: 10, // Limit to the last 10 articles
      orderBy: { createdAt: 'desc' },
      // 'include' fetches the relation, while removing 'select' fetches all scalar fields by default
      include: {
        originalNews: true
      }
    });

    if (articles.length === 0) {
      console.log("❌ No generated articles found in the database.");
      return;
    }

    console.log(`✅ Found ${articles.length} recent articles:\n`);

    // Display all fields using console.dir to show the full object structure
    articles.forEach((article, index) => {
      console.log(`--- Article [${index + 1}] ---`);
      // console.dir displays the full object depth and colors
      console.dir(article, { depth: null, colors: true });
      console.log("\n");
    });

    // Optional: Summary stats
    const totalCount = await prisma.generatedArticle.count();
    const publishedCount = await prisma.generatedArticle.count({ where: { status: 'PUBLISHED' } });
    const queuedCount = await prisma.generatedArticle.count({ where: { status: 'QUEUED' } });

    console.log("📊 SUMMARY:");
    console.log(`   Total Articles: ${totalCount}`);
    console.log(`   Published:      ${publishedCount}`);
    console.log(`   Queued:         ${queuedCount}`);

  } catch (error) {
    console.error("❌ Database Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

queryArticles();