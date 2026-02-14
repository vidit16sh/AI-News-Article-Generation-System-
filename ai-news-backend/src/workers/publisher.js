import 'dotenv/config';
import cron from 'node-cron';
import prisma from '../lib/prisma.js';

const CONFIG = {
  DRIP_INTERVAL_MINS: 15,
  MIN_SCORE: 45,
};

const triggerRevalidation = async () => {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    await fetch(`${apiUrl}/api/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': process.env.API_SECRET_KEY,
      },
      body: JSON.stringify({
        tag: 'articles',
        paths: ['/', '/archive', '/sitemap.xml', '/main-sitemap.xml', '/news-sitemap.xml', '/rss.xml'],
      }),
    });
    console.log('Frontend cache revalidated.');
  } catch (error) {
    console.error('Revalidate failed:', error.message);
  }
};

const publishArticle = async (article, reason) => {
  console.log(`Publishing: "${article.headline}"`);
  console.log(`Reason: ${reason} (score: ${article.priorityScore})`);

  await prisma.generatedArticle.update({
    where: { id: article.id },
    data: {
      status: 'PUBLISHED',
      publishAt: new Date(),
    },
  });

  await triggerRevalidation();
};

console.log('15-minute drip publisher started...');
let isPublisherRunning = false;

cron.schedule('* * * * *', async () => {
  if (isPublisherRunning) return;
  isPublisherRunning = true;

  try {
    const lastArticle = await prisma.generatedArticle.findFirst({
      where: { status: 'PUBLISHED' },
      orderBy: { publishAt: 'desc' },
    });

    const now = new Date();
    const lastPublishTime = lastArticle ? new Date(lastArticle.publishAt) : new Date(0);
    const minsSinceLast = Math.floor((now - lastPublishTime) / 60000);

    if (minsSinceLast < CONFIG.DRIP_INTERVAL_MINS) {
      const remaining = CONFIG.DRIP_INTERVAL_MINS - minsSinceLast;
      process.stdout.write(`\rDrip cycle active. Next possible post in: ${remaining} mins.`);
      return;
    }

    const nextInQueue = await prisma.generatedArticle.findFirst({
      where: {
        status: 'QUEUED',
        priorityScore: { gte: CONFIG.MIN_SCORE },
      },
      orderBy: { priorityScore: 'desc' },
    });

    if (nextInQueue) {
      await publishArticle(nextInQueue, 'staggered drip release');
    } else {
      process.stdout.write('\rQueue empty. Waiting for new scraper data...');
    }
  } catch (error) {
    console.error('Publisher error:', error.message);
  } finally {
    isPublisherRunning = false;
  }
});
