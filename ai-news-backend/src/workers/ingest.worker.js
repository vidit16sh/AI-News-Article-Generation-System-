import 'dotenv/config';
import Bottleneck from 'bottleneck';
import axios from 'axios';
import { connectRabbit } from '../config/rabbit.js';
import prisma from '../lib/prisma.js';
import { cleanText } from '../services/cleaner.service.js';
import { classifyNews, getOrCreateCategory } from '../services/classifier.service.js';
import { logEvent } from '../utils/logger.js';

const INGEST_MIN_PRIORITY_SCORE = Number(process.env.INGEST_MIN_PRIORITY_SCORE || 35);

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

const processJob = async (msg, channel) => {
  const content = JSON.parse(msg.content.toString());
  const { rawNewsId } = content;

  try {
    const rawNews = await prisma.rawNews.findUnique({ where: { id: rawNewsId } });

    if (!rawNews || rawNews.processed) {
      channel.ack(msg);
      return;
    }

    const cleanUrl = await getFinalCanonicalUrl(rawNews.sourceUrl);
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

    if (priorityScore >= INGEST_MIN_PRIORITY_SCORE) {
      logEvent('ingest', 'article_approved_for_generation', {
        rawNewsId,
        score: priorityScore,
        category: categorySlug,
        minScore: INGEST_MIN_PRIORITY_SCORE,
        title: rawNews.title.substring(0, 80),
      });

      const payload = {
        newsId: finalNews.id,
        priorityScore,
        categoryTag: categorySlug,
      };
      channel.sendToQueue('generation_queue', Buffer.from(JSON.stringify(payload)));
    } else {
      logEvent(
        'ingest',
        'article_rejected_low_priority',
        {
          rawNewsId,
          score: priorityScore,
          category: categorySlug,
          minScore: INGEST_MIN_PRIORITY_SCORE,
          title: rawNews.title.substring(0, 80),
        },
        'WARN'
      );
    }

    channel.ack(msg);
  } catch (err) {
    logEvent('ingest', 'job_error', { rawNewsId, error: err.message }, 'ERROR');
    channel.ack(msg);
  }
};

const startWorker = async () => {
  try {
    const channel = await connectRabbit();
    await channel.assertQueue('generation_queue', { durable: true });
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
