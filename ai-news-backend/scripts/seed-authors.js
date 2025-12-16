import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// The Master List (Must match config/authors.js exactly)
const AUTHORS = [
  {
    name: "Mohit Kumar",
    role: "Founder & Editor-in-Chief",
    slug: "mohit-kumar",
    bio: "Mohit is the founder of CoinMarketBuzz, covering macro-financial trends and regulatory frameworks in the digital asset space. He bridges the gap between traditional finance and the crypto economy.",
    imageUrl: "/authors/mohit.jpg",
    linkedin: "https://www.linkedin.com/in/mohit-kumar-3b497758/",
    focus: ["Regulation", "Bitcoin"] // Prisma expects a string/JSON, not array? *See note below
  },
  {
    name: "Neelima Kumar",
    role: "Senior Quantitative Analyst",
    slug: "neelima-kumar",
    bio: "Neelima is a Senior Quantitative Analyst at Stockpil, specializing in algorithmic trading strategies and on-chain liquidity analysis. She tracks institutional capital flows to identify emerging trends.",
    imageUrl: "/authors/neelima.jpg",
    linkedin: "https://www.linkedin.com/in/neelima-kumar-335127383/",
    focus: ["DeFi", "Analysis"]
  },
  {
    name: "CoinMarketBuzz Desk",
    role: "Automated Data Insights",
    slug: "editorial-desk",
    bio: "Real-time market updates powered by the CoinMarketBuzz algorithmic data engine, monitoring 24/7 global trading activity.",
    imageUrl: "/logo.png",
    linkedin: null,
    focus: ["News"]
  }
];

async function main() {
  console.log("🔄 Syncing Authors...");

  for (const author of AUTHORS) {
    // Upsert: Create if not exists, Update if exists
    await prisma.author.upsert({
      where: { slug: author.slug },
      update: {
        name: author.name,
        role: author.role,
        bio: author.bio,
        imageUrl: author.imageUrl,
        linkedin: author.linkedin
        // Note: 'focus' is likely not in your DB Schema based on previous checks, 
        // if it is, uncomment: focus: author.focus
      },
      create: {
        name: author.name,
        role: author.role,
        slug: author.slug,
        bio: author.bio,
        imageUrl: author.imageUrl,
        linkedin: author.linkedin
      }
    });
    console.log(`   ✅ Synced: ${author.name}`);
  }

  console.log("🎉 Done! Database now matches Config.");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());