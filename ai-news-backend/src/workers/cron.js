import 'dotenv/config';
import cron from 'node-cron';
import { fetchRSS, fetchCoinNess } from '../services/fetcher.service.js';
import { logEvent } from '../utils/logger.js';

const SOURCES = [
  'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=15839069',
  'https://news.google.com/rss/search?q=site:coindesk.com+when:1d&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:cointelegraph.com+when:1d&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:theblock.co+when:1d&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:reuters.com+cryptocurrency+when:1d&hl=en-US&gl=US&ceid=US:en',
  'https://www.sec.gov/news/pressreleases.rss',
];

const SOURCE_COOLDOWN_AFTER_WEAK_RUNS = Number(process.env.SOURCE_COOLDOWN_AFTER_WEAK_RUNS || 4);
const SOURCE_COOLDOWN_MINUTES = Number(process.env.SOURCE_COOLDOWN_MINUTES || 45);
const SOURCE_RETIRE_AFTER_RUNS = Number(process.env.SOURCE_RETIRE_AFTER_RUNS || 12);
const SOURCE_RETIRE_MAX_SAVED = Number(process.env.SOURCE_RETIRE_MAX_SAVED || 1);

const sourceHealth = new Map();

const getState = (sourceUrl) => {
  if (!sourceHealth.has(sourceUrl)) {
    sourceHealth.set(sourceUrl, {
      weakStreak: 0,
      cooldownUntil: 0,
      totalRuns: 0,
      totalSaved: 0,
      retired: false,
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

    const shuffledSources = [...SOURCES].sort(() => Math.random() - 0.5);
    for (const url of shuffledSources) {
      const state = getState(url);
      const now = Date.now();

      if (state.retired) {
        logEvent('cron', 'source_retired_skip', { url });
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
