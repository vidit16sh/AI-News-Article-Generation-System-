// scripts/check-categories.js
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function auditDatabase() {
  console.log("🔍 Starting Database Category Audit...");

  try {
    const articles = await prisma.generatedArticle.findMany({
      select: {
        headline: true,
        tags: true,
        status: true,
      }
    });

    const stats = {
      bitcoin: 0,
      ethereum: 0,
      crypto: 0,
      defi: 0,
      finance: 0,
      regulation: 0,
      altcoins: 0, // ⚠️ Ghost tag
      empty: 0
    };

    articles.forEach(art => {
      if (!art.tags || art.tags.length === 0) {
        stats.empty++;
      } else {
        art.tags.forEach(tag => {
          if (stats[tag] !== undefined) stats[tag]++;
        });
      }
    });

    console.table({
      "Valid Tags (Should match Header)": {
        "bitcoin": stats.bitcoin,
        "ethereum": stats.ethereum,
        "crypto": stats.crypto,
        "defi": stats.defi,
        "finance": stats.finance,
        "regulation": stats.regulation,
      },
      "Fix Needed": {
        "altcoins (Change to crypto)": stats.altcoins,
        "Empty Tags (Invisible)": stats.empty
      }
    });

    if (stats.altcoins > 0) {
      console.log("\n⚠️ WARNING: Found articles with 'altcoins' tag. These are INVISIBLE to your 'Crypto News' page.");
    }
    if (stats.empty > 0) {
      console.log("\n⚠️ WARNING: Found articles with NO tags. These are INVISIBLE to all category pages.");
    }

  } catch (err) {
    console.error("❌ Audit Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

auditDatabase();