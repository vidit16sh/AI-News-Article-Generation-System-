import 'dotenv/config';
import cron from 'node-cron';
import prisma from '../lib/prisma.js';
import { connectRabbit } from '../config/rabbit.js';
import { logEvent } from '../utils/logger.js';

const RETRY_BATCH_SIZE = Number(process.env.RETRY_QUEUE_BATCH_SIZE || 80);
const RETRY_LOOKBACK_HOURS = Number(process.env.RETRY_QUEUE_LOOKBACK_HOURS || 48);

let channel = null;
let isRunning = false;
const recentEnqueued = new Map();

const markEnqueued = (id) => {
  recentEnqueued.set(id, Date.now());
};

const alreadyEnqueuedRecently = (id) => {
  const ts = recentEnqueued.get(id);
  if (!ts) return false;
  if (Date.now() - ts > 10 * 60 * 1000) {
    recentEnqueued.delete(id);
    return false;
  }
  return true;
};

const getChannel = async () => {
  if (channel) return channel;
  channel = await connectRabbit();
  return channel;
};

const retryTick = async () => {
  if (isRunning) return;
  isRunning = true;
  try {
    const ch = await getChannel();
    const since = new Date(Date.now() - RETRY_LOOKBACK_HOURS * 60 * 60 * 1000);
    const rows = await prisma.rawNews.findMany({
      where: { processed: false, publishedAt: { gte: since } },
      select: { id: true, publishedAt: true },
      orderBy: { publishedAt: 'desc' },
      take: RETRY_BATCH_SIZE,
    });

    let queued = 0;
    for (const row of rows) {
      if (alreadyEnqueuedRecently(row.id)) continue;
      ch.sendToQueue('ingest_queue', Buffer.from(JSON.stringify({ rawNewsId: row.id })));
      markEnqueued(row.id);
      queued += 1;
    }

    logEvent('retry_queue_worker', 'retry_tick', {
      scanned: rows.length,
      enqueued: queued,
      lookbackHours: RETRY_LOOKBACK_HOURS,
    });
  } catch (error) {
    channel = null;
    logEvent('retry_queue_worker', 'retry_tick_failed', { error: error.message }, 'ERROR');
  } finally {
    isRunning = false;
  }
};

logEvent('retry_queue_worker', 'started', { schedule: '*/2 * * * *' });
cron.schedule('*/2 * * * *', retryTick);
