import Redis from 'ioredis';

// Cache-aside on Redis. The cache is an optimisation only: if Redis is down,
// requests fall through to Postgres instead of failing.
export function createCache({ url, log, prefix = 'catalog' }) {
  if (!url) return memorylessCache();
  const redis = new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 1, enableOfflineQueue: false });
  redis.on('error', (err) => log.warn({ err: err.message }, 'redis error'));

  // Bumping the version invalidates every cached key at once.
  const versionKey = `${prefix}:version`;

  return {
    async getOrSet(key, ttlSeconds, load) {
      let version = '0';
      try {
        version = (await redis.get(versionKey)) || '0';
        const hit = await redis.get(`${prefix}:${version}:${key}`);
        if (hit) return { value: JSON.parse(hit), hit: true };
      } catch {
        return { value: await load(), hit: false };
      }
      const value = await load();
      redis.set(`${prefix}:${version}:${key}`, JSON.stringify(value), 'EX', ttlSeconds).catch(() => {});
      return { value, hit: false };
    },
    async invalidateAll() {
      try {
        // Called at startup too, before the connection is up: wait briefly for it.
        if (redis.status !== 'ready') {
          await new Promise((resolve, reject) => {
            const timer = setTimeout(reject, 5000);
            redis.once('ready', () => (clearTimeout(timer), resolve()));
          });
        }
        await redis.incr(versionKey);
      } catch {
        log.warn('could not invalidate cache; entries will expire on their own');
      }
    },
    ping: () => redis.ping(),
    close: () => redis.quit(),
  };
}

export function memorylessCache() {
  return {
    getOrSet: async (_key, _ttl, load) => ({ value: await load(), hit: false }),
    invalidateAll: async () => {},
    ping: async () => 'PONG',
    close: async () => {},
  };
}
