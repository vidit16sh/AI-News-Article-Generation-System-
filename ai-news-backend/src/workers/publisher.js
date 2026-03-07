import 'dotenv/config';
import cron from 'node-cron';
import prisma from '../lib/prisma.js';
import { logEvent } from '../utils/logger.js';

const CONFIG = {
  DRIP_INTERVAL_MINS: 15,
  MIN_SCORE: Number(process.env.PUBLISHER_MIN_SCORE || 35),
};

const triggerRevalidation = async () => {
  try {
    const apiUrl =
      process.env.INTERNAL_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://127.0.0.1:3000';
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
    logEvent('publisher', 'revalidate_success', {});
  } catch (error) {
    logEvent('publisher', 'revalidate_failed', { error: error.message }, 'ERROR');
  }
};

const publishArticle = async (article, reason) => {
  logEvent('publisher', 'publish_start', {
    articleId: article.id,
    slug: article.slug,
    headline: article.headline,
    reason,
    score: article.priorityScore,
  });

  await prisma.generatedArticle.update({
    where: { id: article.id },
    data: {
      status: 'PUBLISHED',
      publishAt: new Date(),
    },
  });

  await triggerRevalidation();
};

logEvent('publisher', 'scheduler_started', { schedule: '* * * * *', dripIntervalMins: CONFIG.DRIP_INTERVAL_MINS });
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
      logEvent('publisher', 'drip_wait', { minsRemaining: remaining });
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
      logEvent('publisher', 'queue_empty', { minScore: CONFIG.MIN_SCORE });
    }
  } catch (error) {
    logEvent('publisher', 'tick_error', { error: error.message }, 'ERROR');
  } finally {
    isPublisherRunning = false;
  }
});
