import prisma from '../src/lib/prisma.js';

async function cleanup() {
  console.log("🧹 Starting cleanup of old Pollinations articles...");

  try {
    const result = await prisma.generatedArticle.deleteMany({
      where: {
        imageUrl: {
          contains: 'pollinations', // Targets the low-quality images
        },
      },
    });

    console.log(`✅ Successfully deleted ${result.count} old articles.`);
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();