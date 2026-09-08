require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { createClient } = require('redis');

let upstashClient = null;
let redisClient = null;
const memoryCache = new Map();

// 1. Initialize Upstash Serverless Redis if configured (Ideal for Vercel & Production)
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
        const { Redis } = require('@upstash/redis');
        upstashClient = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN
        });
        console.log('⚡ Upstash Cloud Redis Active (Serverless HTTPS REST).');
    } catch (uErr) {
        console.warn('Upstash setup warning:', uErr.message);
        upstashClient = null;
    }
}

// 2. Initialize TCP Redis (Local Development) if REDIS_URL configured and Upstash not active
if (!upstashClient && process.env.REDIS_URL) {
    (async () => {
        try {
            redisClient = createClient({
                url: process.env.REDIS_URL,
                socket: {
                    connectTimeout: 3000,
                    reconnectStrategy: (retries) => (retries > 2 ? false : Math.min(retries * 500, 1500))
                }
            });
            redisClient.on('error', (err) => console.log('Redis Client Error (fallback active):', err.message));
            await redisClient.connect();
            console.log('⚡ Local Redis Cache Connected Successfully.');
        } catch (e) {
            console.warn('Redis connection failed. Using high-speed In-Memory Cache fallback.');
            redisClient = null;
        }
    })();
} else if (!upstashClient && !process.env.REDIS_URL) {
    console.log('⚡ In-Memory High-Speed Cache Active (Standalone mode).');
}

const getOrSetCache = async (key, ttl, fetchCallback) => {
    // A. Upstash Cloud Redis (Serverless)
    if (upstashClient) {
        try {
            const cachedData = await upstashClient.get(key);
            if (cachedData !== null && cachedData !== undefined) {
                return typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
            }

            const freshData = await fetchCallback();
            try {
                await upstashClient.set(key, typeof freshData === 'object' ? JSON.stringify(freshData) : freshData, { ex: ttl });
            } catch (setErr) {
                // If quota limit exceeded or write fails, log warning but return fresh data normally
                console.warn(`Upstash set cache warning (${key}):`, setErr.message);
            }
            return freshData;
        } catch (err) {
            console.warn('Upstash Redis error/quota reached, falling back gracefully:', err.message);
            // Fall through to memory / database
        }
    }

    // B. Local TCP Redis
    if (redisClient) {
        try {
            const cachedData = await redisClient.get(key);
            if (cachedData) return JSON.parse(cachedData);

            const freshData = await fetchCallback();
            await redisClient.setEx(key, ttl, JSON.stringify(freshData));
            return freshData;
        } catch (err) {
            console.error('Redis TCP Error, falling back:', err.message);
        }
    }

    // C. High-speed In-Memory Cache Fallback
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
    // Clear Upstash
    if (upstashClient) {
        try {
            if (pattern.includes('*')) {
                const keys = await upstashClient.keys(pattern);
                if (keys && keys.length > 0) await upstashClient.del(...keys);
            } else {
                await upstashClient.del(pattern);
            }
        } catch (err) {
            console.warn('Upstash Invalidation Error:', err.message);
        }
    }

    // Clear Local Redis
    if (redisClient) {
        try {
            if (pattern.includes('*')) {
                const keys = await redisClient.keys(pattern);
                if (keys.length > 0) await redisClient.del(keys);
            } else {
                await redisClient.del(pattern);
            }
        } catch (err) {
            console.error('Redis Invalidation Error:', err.message);
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
    upstashClient,
    redisClient,
    getOrSetCache,
    invalidateCache
};
