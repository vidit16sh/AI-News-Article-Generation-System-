import 'dotenv/config';
import cron from 'node-cron';
import { fetchRSS, fetchCoinNess } from '../services/fetcher.service.js';
import { logEvent } from '../utils/logger.js';
import { getSourceScoreMap, getSourceKey } from '../services/ingestion-observability.service.js';

const SOURCES = [
  'https://news.google.com/rss/search?q=site:coindesk.com+when:1d&hl=en-US&gl=US&ceid=US:en',
];
const DIRECT_SOURCES = [
  'https://www.coindesk.com/arc/outboundfeeds/rss/',
  'https://cointelegraph.com/rss',
];
const ENABLE_DIRECT_RSS = (process.env.ENABLE_DIRECT_RSS || 'true') === 'true';

const SOURCE_COOLDOWN_AFTER_WEAK_RUNS = Number(process.env.SOURCE_COOLDOWN_AFTER_WEAK_RUNS || 6);
const SOURCE_COOLDOWN_MINUTES = Number(process.env.SOURCE_COOLDOWN_MINUTES || 45);
const SOURCE_RETIRE_AFTER_RUNS = Number(process.env.SOURCE_RETIRE_AFTER_RUNS || 0);
const SOURCE_RETIRE_MAX_SAVED = Number(process.env.SOURCE_RETIRE_MAX_SAVED || 1);
const SOURCE_MIN_RELIABILITY_SCORE = Number(process.env.SOURCE_MIN_RELIABILITY_SCORE || 25);
const COINNESS_ONLY_MODE = (process.env.COINNESS_ONLY_MODE || 'false') === 'true';

const sourceHealth = new Map();

const getState = (sourceUrl) => {
  if (!sourceHealth.has(sourceUrl)) {
    sourceHealth.set(sourceUrl, {
      weakStreak: 0,
      cooldownUntil: 0,
      totalRuns: 0,
      totalSaved: 0,
      retired: false,
      reliabilityScore: 50,
      lastSaved: 0,
      lastBlocked: 0,
      lastError: false,
    });
  }
  return sourceHealth.get(sourceUrl);
};

const isWeakRun = (stats) => {
  if (!stats) return true;
  if (stats.fetchError) return true;

  const blockRatio = stats.scrapeAttempts > 0 ? stats.scrapeBlocked / stats.scrapeAttempts : 0;
  const repeatedlyBlocked = stats.scrapeAttempts >= 2 && stats.saved === 0 && blockRatio >= 0.7;
  const emptyFeed = stats.feedItems === 0;

  return repeatedlyBlocked || emptyFeed;
};

logEvent('cron', 'scheduler_started', { schedule: '*/2 * * * *' });
let isCronRunning = false;

cron.schedule('*/2 * * * *', async () => {
  if (isCronRunning) {
    logEvent('cron', 'tick_skipped_already_running', {});
    return;
  }

  isCronRunning = true;
  logEvent('cron', 'tick_start', {});

  try {
    await fetchCoinNess();

    if (COINNESS_ONLY_MODE) {
      logEvent('cron', 'coinness_only_mode_active', {});
      return;
    }

    const activeSources = ENABLE_DIRECT_RSS ? [...SOURCES, ...DIRECT_SOURCES] : [...SOURCES];
    const scoreMap = await getSourceScoreMap(activeSources);
    const rankedSources = activeSources.sort(
      (a, b) => (scoreMap[b] || 50) - (scoreMap[a] || 50) + (Math.random() * 4 - 2)
    );

    for (const url of rankedSources) {
      const state = getState(url);
      const now = Date.now();
      state.reliabilityScore = Number(scoreMap[url] || 50);

      if (state.retired) {
        logEvent('cron', 'source_retired_skip', { url });
        continue;
      }

      if (state.reliabilityScore < SOURCE_MIN_RELIABILITY_SCORE) {
        logEvent('cron', 'source_downrank_skip', {
          url,
          sourceKey: getSourceKey(url),
          reliabilityScore: state.reliabilityScore,
          minScore: SOURCE_MIN_RELIABILITY_SCORE,
        });
        continue;
      }

      if (state.cooldownUntil > now) {
        const mins = Math.ceil((state.cooldownUntil - now) / 60000);
        logEvent('cron', 'source_cooldown_skip', { url, minsLeft: mins });
        continue;
      }

      try {
        const stats = await fetchRSS(url);

        state.totalRuns += 1;
        state.totalSaved += stats.saved;
        state.lastSaved = stats.saved;
        state.lastBlocked = stats.scrapeBlocked;
        state.lastError = stats.fetchError;

        if (isWeakRun(stats)) {
          state.weakStreak += 1;
          if (state.weakStreak >= SOURCE_COOLDOWN_AFTER_WEAK_RUNS) {
            state.cooldownUntil = Date.now() + SOURCE_COOLDOWN_MINUTES * 60 * 1000;
            state.weakStreak = 0;
            logEvent(
              'cron',
              'source_cooldown_started',
              { source: stats.source, url, cooldownMinutes: SOURCE_COOLDOWN_MINUTES },
              'WARN'
            );
          }
        } else {
          state.weakStreak = 0;
          state.cooldownUntil = 0;
        }

        if (
          SOURCE_RETIRE_AFTER_RUNS > 0 &&
          state.totalRuns >= SOURCE_RETIRE_AFTER_RUNS &&
          state.totalSaved <= SOURCE_RETIRE_MAX_SAVED &&
          state.lastSaved === 0 &&
          (state.lastBlocked > 0 || state.lastError)
        ) {
          state.retired = true;
          logEvent(
            'cron',
            'source_retired_low_yield',
            {
              source: stats.source,
              url,
              totalRuns: state.totalRuns,
              totalSaved: state.totalSaved,
              reliabilityScore: state.reliabilityScore,
            },
            'WARN'
          );
        }
      } catch (error) {
        state.weakStreak += 1;
        logEvent('cron', 'source_fetch_failed', { url, error: error.message }, 'ERROR');
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  } finally {
    isCronRunning = false;
    logEvent('cron', 'tick_end', {});
  }
});
