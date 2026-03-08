import prisma from '../lib/prisma.js';
import { logEvent } from '../utils/logger.js';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const PUBLISH_CONVERSION_CACHE_TTL_MS = 30 * 60 * 1000;
const publishConversionCache = new Map();

const sourceKeyFromUrl = (url = '') => {
  try {
    const u = new URL(url);
    if (u.hostname.includes('news.google.com')) {
      const q = (u.searchParams.get('q') || '').toLowerCase();
      const m = q.match(/site:([^\s+]+)/);
      if (m?.[1]) return m[1];
      return 'news.google.com';
    }
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return String(url || 'unknown').toLowerCase();
  }
};

export const getSourceKey = sourceKeyFromUrl;

export const recordIngestDiagnostic = async ({
  service,
  reasonCode,
  sourceKey = null,
  sourceUrl = null,
  rawNewsId = null,
  cleanedNewsId = null,
  details = null,
}) => {
  try {
    await prisma.ingestDiagnostic.create({
      data: {
        service,
        reasonCode,
        sourceKey,
        sourceUrl,
        rawNewsId,
        cleanedNewsId,
        details: details || {},
      },
    });
  } catch (error) {
    logEvent('diagnostics', 'ingest_diagnostic_write_failed', { reasonCode, error: error.message }, 'WARN');
  }
};

const getPublishConversion = async (sourceKey) => {
  const cached = publishConversionCache.get(sourceKey);
  if (cached && Date.now() - cached.ts < PUBLISH_CONVERSION_CACHE_TTL_MS) {
    return cached.value;
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  try {
    const [cleanedCount, publishedCount] = await Promise.all([
      prisma.cleanedNews.count({
        where: { sourceUrl: { contains: sourceKey }, createdAt: { gte: since } },
      }),
      prisma.generatedArticle.count({
        where: {
          status: 'PUBLISHED',
          createdAt: { gte: since },
          originalNews: { sourceUrl: { contains: sourceKey } },
        },
      }),
    ]);

    if (!cleanedCount) return 0;
    const value = clamp(publishedCount / cleanedCount, 0, 1);
    publishConversionCache.set(sourceKey, { ts: Date.now(), value });
    return value;
  } catch {
    return 0;
  }
};

export const updateSourceReliability = async ({ sourceUrl, stats }) => {
  const sourceKey = sourceKeyFromUrl(sourceUrl);

  const fetchRunsInc = 1;
  const fetchSuccessInc = stats.fetchError ? 0 : 1;
  const scrapeAttemptsInc = Number(stats.scrapeAttempts || 0);
  const scrapeSuccessInc = Math.max(
    0,
    scrapeAttemptsInc - Number(stats.scrapeBlocked || 0)
  );
  const savedInc = Number(stats.saved || 0);
  const blockedInc = Number(stats.scrapeBlocked || 0);
  const currentAvgLen = Number(stats.avgContentLength || 0);

  try {
    const existing = await prisma.sourceReliability.findUnique({ where: { sourceKey } });

    const fetchRuns = (existing?.fetchRuns || 0) + fetchRunsInc;
    const fetchSuccessRuns = (existing?.fetchSuccessRuns || 0) + fetchSuccessInc;
    const scrapeAttempts = (existing?.scrapeAttempts || 0) + scrapeAttemptsInc;
    const scrapeSuccesses = (existing?.scrapeSuccesses || 0) + scrapeSuccessInc;
    const savedItems = (existing?.savedItems || 0) + savedInc;
    const blockedItems = (existing?.blockedItems || 0) + blockedInc;

    const historicalSaved = existing?.savedItems || 0;
    const avgContentLength =
      savedItems > 0
        ? ((existing?.avgContentLength || 0) * historicalSaved + currentAvgLen * savedInc) /
          Math.max(savedItems, 1)
        : 0;

    const fetchRate = fetchSuccessRuns / Math.max(fetchRuns, 1);
    const scrapeRate = scrapeSuccesses / Math.max(scrapeAttempts, 1);
    const lengthScore = clamp(avgContentLength / 1400, 0, 1);
    const shouldRefreshPublishConversion = !existing || fetchRuns % 6 === 0;
    const publishConversion = shouldRefreshPublishConversion
      ? await getPublishConversion(sourceKey)
      : Number(existing?.publishConversion || 0);

    const reliabilityScore = clamp(
      (0.3 * fetchRate + 0.25 * scrapeRate + 0.25 * publishConversion + 0.2 * lengthScore) * 100,
      0,
      100
    );

    await prisma.sourceReliability.upsert({
      where: { sourceKey },
      update: {
        fetchRuns,
        fetchSuccessRuns,
        scrapeAttempts,
        scrapeSuccesses,
        savedItems,
        blockedItems,
        avgContentLength,
        publishConversion,
        reliabilityScore,
        lastRunAt: new Date(),
      },
      create: {
        sourceKey,
        fetchRuns,
        fetchSuccessRuns,
        scrapeAttempts,
        scrapeSuccesses,
        savedItems,
        blockedItems,
        avgContentLength,
        publishConversion,
        reliabilityScore,
        lastRunAt: new Date(),
      },
    });
  } catch (error) {
    logEvent('source_reliability', 'update_failed', { sourceKey, error: error.message }, 'WARN');
  }
};

export const getSourceScoreMap = async (sourceUrls = []) => {
  try {
    const keys = sourceUrls.map(sourceKeyFromUrl);
    const rows = await prisma.sourceReliability.findMany({
      where: { sourceKey: { in: keys } },
      select: { sourceKey: true, reliabilityScore: true },
    });
    const map = new Map(rows.map((r) => [r.sourceKey, Number(r.reliabilityScore || 50)]));
    return sourceUrls.reduce((acc, url) => {
      const key = sourceKeyFromUrl(url);
      acc[url] = map.has(key) ? map.get(key) : 50;
      return acc;
    }, {});
  } catch {
    return sourceUrls.reduce((acc, url) => {
      acc[url] = 50;
      return acc;
    }, {});
  }
};
