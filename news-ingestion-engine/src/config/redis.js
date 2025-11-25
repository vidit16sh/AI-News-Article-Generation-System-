const Redis = require('ioredis');

// Connect to the Redis container
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

redis.on('connect', () => console.log('✅ Connected to Redis'));
redis.on('error', (err) => console.error('❌ Redis Error:', err));

module.exports = redis;