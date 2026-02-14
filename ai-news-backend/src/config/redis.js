import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
  retryStrategy: (times) => Math.min(times * 200, 5000),
});

redis.on('connect', () => console.log('Connected to Redis'));
redis.on('error', (error) => console.error('Redis error:', error.message));

for (const signal of ['SIGINT', 'SIGTERM', 'beforeExit']) {
  process.on(signal, async () => {
    try {
      await redis.quit();
    } catch {}
  });
}

export default redis;
