import { PrismaClient } from '@prisma/client';
import { EDITORIAL_TEAM } from '../src/config/authors.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding authors...');

  for (const author of EDITORIAL_TEAM) {
    await prisma.author.upsert({
      where: { slug: author.slug },
      update: {
        name: author.name,
        role: author.role,
        bio: author.bio,
        expertise: author.expertise, 
        imageUrl: author.imageUrl,
        linkedin: author.linkedin || null, // Only LinkedIn as requested
      },
      create: {
        name: author.name,
        slug: author.slug,
        role: author.role,
        bio: author.bio,
        expertise: author.expertise || [],
        imageUrl: author.imageUrl,
        email: author.email || null,
        twitter: author.twitter || null,
        linkedin: author.linkedin || null,
      },
    });
    console.log(`   ✅ Upserted: ${author.name}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
