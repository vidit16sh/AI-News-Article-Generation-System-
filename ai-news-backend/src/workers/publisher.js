import 'dotenv/config';
import cron from 'node-cron';
import prisma from '../lib/prisma.js';
import { logEvent } from '../utils/logger.js';

const CONFIG = {
  DRIP_INTERVAL_MINS: 15,
  MIN_SCORE: Number(process.env.PUBLISHER_MIN_SCORE || 35),
  MIN_CONFIDENCE: Number(process.env.PUBLISHER_MIN_CONFIDENCE || process.env.GEN_MIN_CONFIDENCE || 0.65),
  MIN_EDITORIAL: Number(process.env.PUBLISHER_MIN_EDITORIAL_SCORE || process.env.GEN_MIN_EDITORIAL_SCORE || 75),
  MIN_WORD_COUNT: Number(process.env.PUBLISHER_MIN_WORD_COUNT || process.env.GEN_MIN_WORD_COUNT || 450),
};

const countWordsFromHtml = (html = '') =>
  String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean).length;

const isFallbackLikeContent = (html = '') => {
  const plain = String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();

  const markers = [
    'developing story: details are still emerging',
    'coinmarketbuzz analysts are reviewing the details and will update this analysis shortly',
    'market update',
  ];

  return markers.filter((m) => plain.includes(m)).length >= 2;
};

const passesPublishQuality = (article) => {
  const confidence = Number(article?.confidenceScore || 0);
  const editorial = Number(article?.editorialScore || 0);
  const words = countWordsFromHtml(article?.articleHtml || '');
  const fallbackLike = isFallbackLikeContent(article?.articleHtml || '');

  return (
    confidence >= CONFIG.MIN_CONFIDENCE &&
    editorial >= CONFIG.MIN_EDITORIAL &&
    words >= CONFIG.MIN_WORD_COUNT &&
    !fallbackLike
  );
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

    const queueBatch = await prisma.generatedArticle.findMany({
      where: {
        status: 'QUEUED',
        priorityScore: { gte: CONFIG.MIN_SCORE },
      },
      orderBy: [{ priorityScore: 'desc' }, { createdAt: 'asc' }],
      take: 25,
    });

    const nextInQueue = queueBatch.find(passesPublishQuality);

    if (nextInQueue) {
      await publishArticle(nextInQueue, 'staggered drip release');
    } else {
      logEvent('publisher', 'queue_empty_or_failed_quality', {
        minScore: CONFIG.MIN_SCORE,
        candidatesChecked: queueBatch.length,
      });
    }
  } catch (error) {
    logEvent('publisher', 'tick_error', { error: error.message }, 'ERROR');
  } finally {
    isPublisherRunning = false;
  }
});
