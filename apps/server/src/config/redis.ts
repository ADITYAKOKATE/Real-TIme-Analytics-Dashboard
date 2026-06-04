import Redis from 'ioredis';

let redisClient: Redis;

export async function connectRedis(): Promise<Redis> {
  redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  await redisClient.connect();
  console.log('✅ Redis connected');

  redisClient.on('error', (err) => {
    console.error('Redis error:', err);
  });

  return redisClient;
}

export function getRedisClient(): Redis {
  if (!redisClient) throw new Error('Redis not initialized. Call connectRedis() first.');
  return redisClient;
}
