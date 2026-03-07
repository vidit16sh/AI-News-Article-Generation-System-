// src/services/fetcher.service.js
import Parser from 'rss-parser';
import axios from 'axios';
import redis from '../config/redis.js';
import prisma from '../lib/prisma.js';
import { connectRabbit } from '../config/rabbit.js';
import { scrapeArticle } from './scraper.service.js';
import { logEvent } from '../utils/logger.js';

const parser = new Parser({
  customFields: {
    item: [['content:encoded', 'fullContent'], ['content', 'normalContent']],
  },
  timeout: 15000,
});

const normalizeUrl = (url) => {
  try {
    const u = new URL(url);
    u.search = '';
    u.hash = '';
    return u.toString().toLowerCase().replace(/\/$/, '');
  } catch {
    return String(url || '').toLowerCase();
  }
};

const getSourceLabel = (inputUrl) => {
  try {
    const url = new URL(inputUrl);
    if (url.hostname.includes('news.google.com')) {
      const q = (url.searchParams.get('q') || '').toLowerCase();
      const siteMatch = q.match(/site:([^\s+]+)/);
      if (siteMatch?.[1]) return siteMatch[1];
    }
    return url.hostname.replace(/^www\./, '');
  } catch {
    return inputUrl;
  }
};

const randomSleep = (min = 2000, max = 5000) =>
  new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * (max - min)) + min));

const parsePublishedAt = (...candidates) => {
  for (const value of candidates) {
    if (!value) continue;
    const dt = new Date(value);
    if (!Number.isNaN(dt.getTime())) return dt;
  }
  return new Date();
};

const safeRedisSet = async (key, val, mode, ttl) => {
  try {
    await redis.set(key, val, mode, ttl);
  } catch (err) {
    logEvent('fetcher', 'redis_write_failed', { key, error: err.message }, 'WARN');
  }
};

const safeRedisGet = async (key) => {
  try {
    return await redis.get(key);
  } catch (err) {
    logEvent('fetcher', 'redis_read_failed', { key, error: err.message }, 'WARN');
    return null;
  }
};

export const fetchCoinNess = async () => {
  const apiUrl =
    process.env.COINNESS_API_URL ||
    'https://api.coinness.com/feed/v1/breaking-news?languageCode=en';

  logEvent('fetcher', 'coinness_start', { apiUrl });

  try {
    const channel = await connectRabbit();
    const config = process.env.COINNESS_API_KEY
      ? { headers: { Authorization: `Bearer ${process.env.COINNESS_API_KEY}` } }
      : {};
    const response = await axios.get(apiUrl, config);
    const items = response.data.list || response.data || [];

    let newCount = 0;
    for (const item of items) {
      const rawUrl = item.shareUrl || `https://coinness.com/news/${item.id}`;
      const cleanUrl = normalizeUrl(rawUrl);
      const cacheKey = `news:coinness:${cleanUrl}`;

      if (await safeRedisGet(cacheKey)) continue;

      const existing = await prisma.rawNews.findUnique({ where: { sourceUrl: cleanUrl } });
      if (existing) {
        await safeRedisSet(cacheKey, '1', 'EX', 86400);
        continue;
      }

      try {
        const raw = await prisma.rawNews.create({
          data: {
            sourceUrl: cleanUrl,
            title: item.title || (item.content ? item.content.substring(0, 100) : 'Untitled'),
            rawBody: item.content || item.title,
            publishedAt: parsePublishedAt(
              item.publishedAt,
              item.pubDate,
              item.createdAt,
              item.timestamp
            ),
            processed: false,
          },
        });

        channel.sendToQueue('ingest_queue', Buffer.from(JSON.stringify({ rawNewsId: raw.id })));
        await safeRedisSet(cacheKey, '1', 'EX', 86400);
        newCount++;
      } catch (e) {
        if (e.code !== 'P2002') {
          logEvent('fetcher', 'coinness_db_error', { error: e.message }, 'ERROR');
        }
      }
    }

    logEvent('fetcher', 'coinness_summary', { fetchedItems: items.length, saved: newCount });
  } catch (err) {
    logEvent('fetcher', 'coinness_error', { error: err.message }, 'ERROR');
  }
};

export const fetchRSS = async (url) => {
  const source = getSourceLabel(url);
  const stats = {
    source,
    url,
    feedItems: 0,
    cachedHits: 0,
    existingHits: 0,
    scrapeAttempts: 0,
    scrapeBlocked: 0,
    junkSkipped: 0,
    dbDuplicates: 0,
    saved: 0,
    fetchError: false,
  };

  logEvent('fetcher', 'rss_start', { source, url });

  try {
    const channel = await connectRabbit();
    const feed = await parser.parseURL(url);
    stats.feedItems = Array.isArray(feed.items) ? feed.items.length : 0;

    for (const item of feed.items || []) {
      const initialUrl = normalizeUrl(item.link);
      const cacheKey = `news:rss:${initialUrl}`;

      if (await safeRedisGet(cacheKey)) {
        stats.cachedHits++;
        continue;
      }

      const exists = await prisma.rawNews.findUnique({ where: { sourceUrl: initialUrl } });
      if (exists) {
        await safeRedisSet(cacheKey, '1', 'EX', 86400);
        stats.existingHits++;
        continue;
      }

      await randomSleep(3000, 6000);
      logEvent('fetcher', 'rss_scrape_attempt', {
        source,
        title: (item.title || 'Untitled').substring(0, 80),
      });

      stats.scrapeAttempts++;
      const scrapedData = await scrapeArticle(item.link);
      if (!scrapedData || !scrapedData.content || scrapedData.content.length < 400) {
        stats.scrapeBlocked++;
        logEvent('fetcher', 'rss_item_skipped_blocked', { source });
        await safeRedisSet(cacheKey, '1', 'EX', 3600);
        continue;
      }

      const finalUrl = normalizeUrl(scrapedData.url);
      const junkPatterns = ['/price-converter/', '/tag/', '/author/', '/category/', '/login', '/signup'];
      if (junkPatterns.some((pattern) => finalUrl.includes(pattern))) {
        stats.junkSkipped++;
        await safeRedisSet(cacheKey, '1', 'EX', 86400);
        continue;
      }

      const finalExists = await prisma.rawNews.findUnique({ where: { sourceUrl: finalUrl } });
      if (finalExists) {
        stats.existingHits++;
        await safeRedisSet(cacheKey, '1', 'EX', 86400);
        continue;
      }

      try {
        const raw = await prisma.rawNews.create({
          data: {
            sourceUrl: finalUrl,
            title: item.title,
            rawBody: scrapedData.content,
            publishedAt: parsePublishedAt(item.isoDate, item.pubDate),
            processed: false,
          },
        });

        channel.sendToQueue('ingest_queue', Buffer.from(JSON.stringify({ rawNewsId: raw.id })));
        stats.saved++;
      } catch (dbError) {
        if (dbError.code === 'P2002') {
          stats.dbDuplicates++;
          await safeRedisSet(cacheKey, '1', 'EX', 86400);
        }
      }

      await safeRedisSet(cacheKey, '1', 'EX', 86400);
    }

    logEvent('fetcher', 'rss_summary', stats);
    return stats;
  } catch (err) {
    stats.fetchError = true;
    logEvent('fetcher', 'rss_error', { source, url, error: err.message }, 'ERROR');
    return stats;
  }
};
