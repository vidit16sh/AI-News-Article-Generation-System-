// src/services/fetcher.service.js
import Parser from 'rss-parser';
import axios from 'axios';
import redis from '../config/redis.js';
import prisma from '../lib/prisma.js';
import { connectRabbit } from '../config/rabbit.js';
import { scrapeArticle } from './scraper.service.js';
import { logEvent } from '../utils/logger.js';
import {
  getSourceKey,
  recordIngestDiagnostic,
  updateSourceReliability,
} from './ingestion-observability.service.js';

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

const normalizeTitle = (title = '') =>
  String(title || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenizeForHash = (text = '') =>
  String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2)
    .slice(0, 400);

const fnv1a64 = (input = '') => {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= BigInt(input.charCodeAt(i));
    hash = (hash * prime) & 0xffffffffffffffffn;
  }
  return hash;
};

const simhash64 = (text = '') => {
  const tokens = tokenizeForHash(text);
  if (!tokens.length) return 0n;
  const bits = new Array(64).fill(0);
  for (const token of tokens) {
    const h = fnv1a64(token);
    for (let i = 0; i < 64; i += 1) {
      const bit = (h >> BigInt(i)) & 1n;
      bits[i] += bit === 1n ? 1 : -1;
    }
  }
  let out = 0n;
  for (let i = 0; i < 64; i += 1) {
    if (bits[i] > 0) out |= 1n << BigInt(i);
  }
  return out;
};

const hamming64 = (a, b) => {
  let x = a ^ b;
  let dist = 0;
  while (x) {
    dist += Number(x & 1n);
    x >>= 1n;
  }
  return dist;
};

const buildNearDuplicateChecker = async (publishedAt = new Date()) => {
  const since = new Date((publishedAt || new Date()).getTime() - 48 * 60 * 60 * 1000);
  const normalizedTitles = new Set();
  const fingerprints = [];

  try {
    const recent = await prisma.rawNews.findMany({
      where: { publishedAt: { gte: since } },
      select: { title: true, rawBody: true },
      orderBy: { publishedAt: 'desc' },
      take: 220,
    });

    for (const row of recent) {
      const rowNorm = normalizeTitle(row.title);
      if (rowNorm) normalizedTitles.add(rowNorm);
      fingerprints.push(simhash64(`${row.title || ''} ${row.rawBody || ''}`));
    }
  } catch {}

  const check = ({ title, content }) => {
    const normalized = normalizeTitle(title);
    const fingerprint = simhash64(`${title || ''} ${content || ''}`);

    if (normalized && normalizedTitles.has(normalized)) {
      return { duplicate: true, reason: 'normalized_title' };
    }

    for (const rowHash of fingerprints) {
      if (hamming64(fingerprint, rowHash) <= 5) {
        return { duplicate: true, reason: 'simhash_near_duplicate' };
      }
    }

    return { duplicate: false, reason: null };
  };

  const add = ({ title, content }) => {
    const normalized = normalizeTitle(title);
    if (normalized) normalizedTitles.add(normalized);
    fingerprints.push(simhash64(`${title || ''} ${content || ''}`));
  };

  return { check, add };
};

const stripHtml = (value = '') =>
  String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

const extractRssFallbackBody = (item = {}) => {
  const candidates = [
    item.fullContent,
    item.normalContent,
    item.content,
    item.contentSnippet,
    item.summary,
    item.description,
  ];

  for (const candidate of candidates) {
    const clean = stripHtml(candidate);
    if (clean.length >= 220) return clean;
  }
  return '';
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

const getChannelOptional = async () => {
  try {
    return await connectRabbit();
  } catch {
    return null;
  }
};

export const fetchCoinNess = async () => {
  const apiUrl =
    process.env.COINNESS_API_URL ||
    'https://api.coinness.com/feed/v1/breaking-news?languageCode=en';

  logEvent('fetcher', 'coinness_start', { apiUrl });

  try {
    const channel = await getChannelOptional();
    const config = process.env.COINNESS_API_KEY
      ? { headers: { Authorization: `Bearer ${process.env.COINNESS_API_KEY}` } }
      : {};
    const response = await axios.get(apiUrl, config);
    const items = response.data.list || response.data || [];

    let newCount = 0;
    const dedupe = await buildNearDuplicateChecker(new Date());
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
        const duplicate = dedupe.check({
          title: item.title,
          content: item.content || item.title,
        });
        if (duplicate.duplicate) {
          await recordIngestDiagnostic({
            service: 'fetcher',
            reasonCode: 'duplicate',
            sourceKey: 'coinness.com',
            sourceUrl: rawUrl,
            details: { method: duplicate.reason },
          });
          continue;
        }

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

        if (channel) {
          channel.sendToQueue('ingest_queue', Buffer.from(JSON.stringify({ rawNewsId: raw.id })));
        } else {
          await recordIngestDiagnostic({
            service: 'fetcher',
            reasonCode: 'queue_unavailable',
            sourceKey: 'coinness.com',
            sourceUrl: cleanUrl,
            rawNewsId: raw.id,
          });
        }
        dedupe.add({
          title: item.title || (item.content ? item.content.substring(0, 100) : 'Untitled'),
          content: item.content || item.title,
        });
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
  const sourceKey = getSourceKey(url);
  const stats = {
    source,
    url,
    feedItems: 0,
    cachedHits: 0,
    existingHits: 0,
    scrapeAttempts: 0,
    scrapeBlocked: 0,
    scrapeSuccess: 0,
    rssFallbackUsed: 0,
    junkSkipped: 0,
    dbDuplicates: 0,
    saved: 0,
    totalContentLength: 0,
    avgContentLength: 0,
    queueUnavailable: 0,
    fetchError: false,
  };

  logEvent('fetcher', 'rss_start', { source, url });

  try {
    const channel = await getChannelOptional();
    let feed;
    try {
      feed = await parser.parseURL(url);
    } catch {
      const rssRes = await axios.get(url, {
        timeout: 20000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
        },
      });
      feed = await parser.parseString(String(rssRes.data || ''));
    }
    stats.feedItems = Array.isArray(feed.items) ? feed.items.length : 0;
    const dedupe = await buildNearDuplicateChecker(new Date());

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
      let body = '';
      let finalUrl = initialUrl;
      if (scrapedData?.content && scrapedData.content.length >= 260) {
        body = scrapedData.content;
        finalUrl = normalizeUrl(scrapedData.url);
        stats.scrapeSuccess++;
      } else {
        stats.scrapeBlocked++;
        const rssFallback = extractRssFallbackBody(item);
        if (!rssFallback) {
          logEvent('fetcher', 'rss_item_skipped_blocked', { source });
          await recordIngestDiagnostic({
            service: 'fetcher',
            reasonCode: scrapedData?.content ? 'short_content' : 'blocked',
            sourceKey,
            sourceUrl: item.link,
            details: { title: item.title || null, length: scrapedData?.content?.length || 0 },
          });
          await safeRedisSet(cacheKey, '1', 'EX', 3600);
          continue;
        }
        body = rssFallback;
        stats.rssFallbackUsed++;
        logEvent('fetcher', 'rss_item_fallback_used', { source });
      }

      const junkPatterns = ['/price-converter/', '/tag/', '/author/', '/category/', '/login', '/signup'];
      if (junkPatterns.some((pattern) => finalUrl.includes(pattern))) {
        stats.junkSkipped++;
        await safeRedisSet(cacheKey, '1', 'EX', 86400);
        continue;
      }

      const finalExists = await prisma.rawNews.findUnique({ where: { sourceUrl: finalUrl } });
      if (finalExists) {
        stats.existingHits++;
        await recordIngestDiagnostic({
          service: 'fetcher',
          reasonCode: 'duplicate',
          sourceKey,
          sourceUrl: finalUrl,
          rawNewsId: finalExists.id,
          details: { method: 'url_unique' },
        });
        await safeRedisSet(cacheKey, '1', 'EX', 86400);
        continue;
      }

      try {
        const duplicate = dedupe.check({
          title: item.title,
          content: body,
        });
        if (duplicate.duplicate) {
          stats.dbDuplicates++;
          await recordIngestDiagnostic({
            service: 'fetcher',
            reasonCode: 'duplicate',
            sourceKey,
            sourceUrl: finalUrl,
            details: { method: duplicate.reason },
          });
          await safeRedisSet(cacheKey, '1', 'EX', 86400);
          continue;
        }

        const raw = await prisma.rawNews.create({
          data: {
            sourceUrl: finalUrl,
            title: item.title,
            rawBody: body,
            publishedAt: parsePublishedAt(item.isoDate, item.pubDate),
            processed: false,
          },
        });

        stats.totalContentLength += body.length;
        if (channel) {
          channel.sendToQueue('ingest_queue', Buffer.from(JSON.stringify({ rawNewsId: raw.id })));
        } else {
          stats.queueUnavailable += 1;
          await recordIngestDiagnostic({
            service: 'fetcher',
            reasonCode: 'queue_unavailable',
            sourceKey,
            sourceUrl: finalUrl,
            rawNewsId: raw.id,
          });
        }
        stats.saved++;
        dedupe.add({ title: item.title, content: body });
      } catch (dbError) {
        if (dbError.code === 'P2002') {
          stats.dbDuplicates++;
          await recordIngestDiagnostic({
            service: 'fetcher',
            reasonCode: 'duplicate',
            sourceKey,
            sourceUrl: finalUrl,
            details: { method: 'db_unique' },
          });
          await safeRedisSet(cacheKey, '1', 'EX', 86400);
        }
      }

      await safeRedisSet(cacheKey, '1', 'EX', 86400);
    }

    stats.avgContentLength = stats.saved > 0 ? Math.round(stats.totalContentLength / stats.saved) : 0;
    logEvent('fetcher', 'rss_summary', stats);
    await updateSourceReliability({ sourceUrl: url, stats });
    return stats;
  } catch (err) {
    stats.fetchError = true;
    await recordIngestDiagnostic({
      service: 'fetcher',
      reasonCode: 'fetch_error',
      sourceKey,
      sourceUrl: url,
      details: { error: err.message },
    });
    await updateSourceReliability({ sourceUrl: url, stats });
    logEvent('fetcher', 'rss_error', { source, url, error: err.message }, 'ERROR');
    return stats;
  }
};
