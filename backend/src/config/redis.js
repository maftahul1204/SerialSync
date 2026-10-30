const Redis = require('ioredis');
const env = require('./env');

let client = null;
let memoryCounters = new Map();

function getRedis() {
  if (!env.redisUrl) return null;
  if (!client) {
    client = new Redis(env.redisUrl, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    client.on('error', () => {});
  }
  return client;
}

async function atomicIncr(key) {
  const redis = getRedis();
  if (redis) {
    try {
      if (redis.status !== 'ready') await redis.connect();
      return redis.incr(key);
    } catch {
      /* fall through to memory */
    }
  }
  const next = (memoryCounters.get(key) || 0) + 1;
  memoryCounters.set(key, next);
  return next;
}

async function atomicDecr(key) {
  const redis = getRedis();
  if (redis) {
    try {
      if (redis.status !== 'ready') await redis.connect();
      return redis.decr(key);
    } catch {
      /* fall through */
    }
  }
  const next = Math.max(0, (memoryCounters.get(key) || 0) - 1);
  memoryCounters.set(key, next);
  return next;
}

function resetMemoryCountersForTests() {
  memoryCounters = new Map();
}

module.exports = { getRedis, atomicIncr, atomicDecr, resetMemoryCountersForTests };
