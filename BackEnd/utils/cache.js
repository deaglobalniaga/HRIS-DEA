const { createClient } = require('redis');

let redisClient = null;
const memoryCache = new Map();

(async () => {
    if (process.env.REDIS_URL) {
        try {
            redisClient = createClient({ url: process.env.REDIS_URL });
            redisClient.on('error', (err) => console.log('Redis Client Error', err));
            await redisClient.connect();
            console.log('⚡ Redis Cache Connected Successfully.');
        } catch (e) {
            console.warn('Redis connection failed. Using high-speed In-Memory Cache fallback.');
            redisClient = null;
        }
    } else {
        console.log('⚡ In-Memory High-Speed Cache Active (Redis standalone mode).');
    }
})();

const getOrSetCache = async (key, ttl, fetchCallback) => {
    // 1. Try Redis if connected
    if (redisClient) {
        try {
            const cachedData = await redisClient.get(key);
            if (cachedData) return JSON.parse(cachedData);
            
            const freshData = await fetchCallback();
            await redisClient.setEx(key, ttl, JSON.stringify(freshData));
            return freshData;
        } catch (err) {
            console.error('Redis Error, falling back:', err);
        }
    }

    // 2. High-speed In-Memory Cache Fallback
    const now = Date.now();
    const entry = memoryCache.get(key);
    if (entry && entry.expiresAt > now) {
        return entry.data;
    }

    const freshData = await fetchCallback();
    memoryCache.set(key, {
        data: freshData,
        expiresAt: now + (ttl * 1000)
    });
    return freshData;
};

const invalidateCache = async (pattern) => {
    // Clear Redis
    if (redisClient) {
        try {
            if (pattern.includes('*')) {
                const keys = await redisClient.keys(pattern);
                if (keys.length > 0) await redisClient.del(keys);
            } else {
                await redisClient.del(pattern);
            }
        } catch (err) {
            console.error('Redis Invalidation Error:', err);
        }
    }

    // Clear In-Memory Cache
    if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        for (const k of memoryCache.keys()) {
            if (regex.test(k)) memoryCache.delete(k);
        }
    } else {
        memoryCache.delete(pattern);
    }
};

module.exports = {
    redisClient,
    getOrSetCache,
    invalidateCache
};
