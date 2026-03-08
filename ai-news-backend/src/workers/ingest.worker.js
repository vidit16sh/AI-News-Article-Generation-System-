import 'dotenv/config';
import Bottleneck from 'bottleneck';
import axios from 'axios';
import { connectRabbit } from '../config/rabbit.js';
import prisma from '../lib/prisma.js';
import { cleanText } from '../services/cleaner.service.js';
import { classifyNews, getOrCreateCategory } from '../services/classifier.service.js';
import { logEvent } from '../utils/logger.js';
import { getSourceKey, recordIngestDiagnostic } from '../services/ingestion-observability.service.js';

const INGEST_MIN_PRIORITY_SCORE = Number(process.env.INGEST_MIN_PRIORITY_SCORE || 35);
const INGEST_TRUSTED_SOURCE_MIN_PRIORITY = Number(process.env.INGEST_TRUSTED_SOURCE_MIN_PRIORITY || 22);
const MAX_INGEST_RETRIES = Number(process.env.MAX_INGEST_RETRIES || 2);
const TRUSTED_SOURCE_HOSTS = [
  'coindesk.com',
  'cointelegraph.com',
  'theblock.co',
  'reuters.com',
  'cnbc.com',
  'sec.gov',
];

const limiter = new Bottleneck({
  minTime: 4000,
  maxConcurrent: 1,
});

const getFinalCanonicalUrl = async (url) => {
  const sourceUrl = String(url || '').toLowerCase();
  if (!sourceUrl.includes('google.com')) return url;

  try {
    const response = await axios.get(url, {
      maxRedirects: 8,
      timeout: 7000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      },
      responseType: 'stream',
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const finalUrl = response.request.res.responseUrl || url;
    if (response?.data?.destroy) {
      response.data.destroy();
    }

    if (finalUrl.includes('consent.google.com')) {
      const u = new URL(url);
      return u.searchParams.get('q') || u.searchParams.get('url') || url;
    }

    return finalUrl;
  } catch {
    try {
      const u = new URL(url);
      return u.searchParams.get('q') || u.searchParams.get('url') || url;
    } catch {
      return url;
    }
  }
};

const isTrustedSourceUrl = (url) => {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    return TRUSTED_SOURCE_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
};

const processJob = async (msg, channel) => {
  const content = JSON.parse(msg.content.toString());
  const { rawNewsId, retryCount = 0 } = content;

  try {
    const rawNews = await prisma.rawNews.findUnique({ where: { id: rawNewsId } });

    if (!rawNews || rawNews.processed) {
      channel.ack(msg);
      return;
    }

    const cleanUrl = await getFinalCanonicalUrl(rawNews.sourceUrl);
    const sourceKey = getSourceKey(cleanUrl);
    const cleanedBody = cleanText(rawNews.rawBody);

    const classification = await limiter.schedule(() => classifyNews(cleanedBody, rawNews.title));

    let categorySlug = classification.category_slug || 'crypto';
    if (categorySlug === 'altcoins') categorySlug = 'crypto';

    const priorityScore = classification.priority_score || 0;
    const category = await getOrCreateCategory(categorySlug);

    const finalNews = await prisma.cleanedNews.upsert({
      where: { sourceUrl: cleanUrl },
      update: { title: rawNews.title },
      create: {
        title: rawNews.title,
        summary: `${cleanedBody.substring(0, 150)}...`,
        content: cleanedBody,
        sourceUrl: cleanUrl,
        publishedAt: rawNews.publishedAt,
        categoryId: category.id,
      },
    });

    await prisma.rawNews.update({
      where: { id: rawNewsId },
      data: { processed: true },
    });

    const trustedSource = isTrustedSourceUrl(cleanUrl);
    const minScore = trustedSource ? INGEST_TRUSTED_SOURCE_MIN_PRIORITY : INGEST_MIN_PRIORITY_SCORE;

    if (priorityScore >= minScore) {
      logEvent('ingest', 'article_approved_for_generation', {
        rawNewsId,
        score: priorityScore,
        category: categorySlug,
        minScore,
        trustedSource,
        title: rawNews.title.substring(0, 80),
      });

      const payload = {
        newsId: finalNews.id,
        priorityScore,
        categoryTag: categorySlug,
      };
      channel.sendToQueue('generation_queue', Buffer.from(JSON.stringify(payload)));
    } else {
      await recordIngestDiagnostic({
        service: 'ingest',
        reasonCode: 'low_priority',
        sourceKey,
        sourceUrl: cleanUrl,
        rawNewsId: rawNews.id,
        cleanedNewsId: finalNews.id,
        details: { score: priorityScore, minScore, categorySlug, trustedSource },
      });
      logEvent(
        'ingest',
        'article_rejected_low_priority',
        {
          rawNewsId,
          score: priorityScore,
          category: categorySlug,
          minScore,
          trustedSource,
          title: rawNews.title.substring(0, 80),
        },
        'WARN'
      );
    }

    channel.ack(msg);
  } catch (err) {
    if (retryCount < MAX_INGEST_RETRIES) {
      const nextPayload = { ...content, retryCount: retryCount + 1, lastError: err.message };
      channel.sendToQueue('ingest_queue', Buffer.from(JSON.stringify(nextPayload)));
      logEvent(
        'ingest',
        'job_retry_scheduled',
        { rawNewsId, retryCount: retryCount + 1, maxRetries: MAX_INGEST_RETRIES, error: err.message },
        'WARN'
      );
    } else {
      const dlqPayload = { ...content, failedAt: new Date().toISOString(), lastError: err.message };
      channel.sendToQueue('ingest_dlq', Buffer.from(JSON.stringify(dlqPayload)));
      logEvent(
        'ingest',
        'job_sent_to_dlq',
        { rawNewsId, retries: retryCount, error: err.message, dlq: 'ingest_dlq' },
        'ERROR'
      );
    }
    channel.ack(msg);
  }
};

const startWorker = async () => {
  try {
    const channel = await connectRabbit();
    await channel.assertQueue('generation_queue', { durable: true });
    await channel.assertQueue('ingest_dlq', { durable: true });
    channel.prefetch(1);

    logEvent('ingest', 'worker_started', { minPriorityScore: INGEST_MIN_PRIORITY_SCORE });
    channel.consume('ingest_queue', (msg) => {
      if (msg) processJob(msg, channel);
    });
  } catch (error) {
    logEvent('ingest', 'worker_start_failed', { error: error.message }, 'ERROR');
  }
};

startWorker();
