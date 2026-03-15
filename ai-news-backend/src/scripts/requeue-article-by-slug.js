import 'dotenv/config';
import prisma from '../lib/prisma.js';
import { connectRabbit } from '../config/rabbit.js';

const ARTICLE_SLUG = process.env.ARTICLE_SLUG;

const main = async () => {
  if (!ARTICLE_SLUG) {
    throw new Error('Missing ARTICLE_SLUG env var.');
  }

  const article = await prisma.generatedArticle.findUnique({
    where: { slug: ARTICLE_SLUG },
    select: {
      id: true,
      slug: true,
      originalNewsId: true,
      priorityScore: true,
      tags: true,
      status: true,
    },
  });

  if (!article) {
    throw new Error(`Article not found for slug: ${ARTICLE_SLUG}`);
  }

  await prisma.generatedArticle.delete({ where: { id: article.id } });
  console.log(`Deleted existing generated article: ${article.slug} [${article.status}]`);

  const channel = await connectRabbit();
  await channel.assertQueue('generation_queue', { durable: true });

  const payload = {
    newsId: article.originalNewsId,
    priorityScore: Number(article.priorityScore || 50),
    categoryTag: Array.isArray(article.tags) && article.tags.length ? article.tags[0] : undefined,
    retryCount: 0,
  };

  channel.sendToQueue('generation_queue', Buffer.from(JSON.stringify(payload)), { persistent: true });
  console.log(`Requeued generation job for newsId=${article.originalNewsId}`);

  await channel.close();
};

main()
  .catch((err) => {
    console.error('requeue-article-by-slug failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

