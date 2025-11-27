// test-db.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Create a test category
  const cat = await prisma.category.create({
    data: { name: 'Test-Category' },
  });
  console.log('Successfully created category:', cat);

  const allCats = await prisma.category.findMany();
  console.log('All Categories:', allCats);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());