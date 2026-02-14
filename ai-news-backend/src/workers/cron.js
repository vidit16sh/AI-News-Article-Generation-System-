import 'dotenv/config';
import cron from 'node-cron';
import { fetchRSS, fetchCoinNess } from '../services/fetcher.service.js';

const SOURCES = [
  'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=15839069',
  'https://news.google.com/rss/search?q=site:coindesk.com+when:1d&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:cointelegraph.com+when:1d&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:theblock.co+when:1d&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:reuters.com+cryptocurrency+when:1d&hl=en-US&gl=US&ceid=US:en',
  'https://www.sec.gov/news/pressreleases.rss',
];

console.log('Cron Scheduler Started...');
let isCronRunning = false;

cron.schedule('*/2 * * * *', async () => {
  if (isCronRunning) {
    console.log('Cron still running, skipping this tick.');
    return;
  }

  isCronRunning = true;
  console.log(`\n[${new Date().toISOString()}] Cron triggered`);

  try {
    await fetchCoinNess();

    const shuffledSources = [...SOURCES].sort(() => Math.random() - 0.5);
    for (const url of shuffledSources) {
      try {
        await fetchRSS(url);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } catch (error) {
        console.error(`Failed to fetch ${url}: ${error.message}`);
      }
    }
  } finally {
    isCronRunning = false;
  }
});
