import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const authors = [
  {
    name: "James Carter",
    slug: "james-carter",
    role: "Senior Crypto Analyst",
    bio: "James is a veteran financial journalist with over a decade of experience covering cryptocurrency markets, DeFi protocols, and regulatory shifts. Formerly at Bloomberg and CoinDesk.",
    // Professional Male Avatar
    imageUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80",
    twitter: "@james_crypto_news"
  },
  {
    name: "Sarah Jenkins",
    slug: "sarah-jenkins",
    role: "AI & Tech Reporter",
    bio: "Sarah specializes in the intersection of Artificial Intelligence and Blockchain. She breaks down complex LLM and neural network developments into readable insights for investors.",
    // Professional Female Avatar
    imageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80",
    twitter: "@sarah_tech_ai"
  },
  {
    name: "Michael Chen",
    slug: "michael-chen",
    role: "Global Markets Editor",
    bio: "Michael covers macro-economic trends, Fed policies, and Asian markets. His analysis focuses on how global liquidity flows impact Bitcoin and Ethereum price action.",
    // Professional Male Avatar
    imageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80",
    twitter: "@chen_macro_markets"
  },
  {
    name: "Elena Rodriguez",
    slug: "elena-rodriguez",
    role: "Web3 & NFT Specialist",
    bio: "Elena explores the cultural side of crypto, covering NFTs, Gaming, and the Metaverse. She brings a creative perspective to the technical world of Web3.",
    // Professional Female Avatar
    imageUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80",
    twitter: "@elena_web3"
  }
];

async function main() {
  console.log("🌱 Seeding Editorial Team...");

  for (const author of authors) {
    const result = await prisma.author.upsert({
      where: { slug: author.slug },
      update: {
        role: author.role,
        bio: author.bio,
        imageUrl: author.imageUrl
      },
      create: author,
    });
    console.log(`   ✅ Upserted: ${result.name}`);
  }

  console.log("🚀 Seed Complete! Your newsroom is ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });ni