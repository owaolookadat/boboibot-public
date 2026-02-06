// Redis-based cache manager for Google Sheets data
// Dramatically improves performance by caching sheet data

const redis = require('redis');

// Cache configuration
const CACHE_TTL = 600; // 10 minutes in seconds
const CACHE_PREFIX = 'boboi:sheet:';

// Redis client
let redisClient = null;
let isRedisConnected = false;

// Fallback in-memory cache if Redis is unavailable
const memoryCache = new Map();

/**
 * Initialize Redis connection
 */
async function initRedis() {
    try {
        redisClient = redis.createClient({
            host: 'localhost',
            port: 6379,
            retry_strategy: (options) => {
                if (options.error && options.error.code === 'ECONNREFUSED') {
                    console.log('⚠️  Redis connection refused, using in-memory cache');
                    return undefined; // Stop retrying
                }
                if (options.total_retry_time > 1000 * 60) {
                    console.log('⚠️  Redis retry timeout, using in-memory cache');
                    return undefined;
                }
                if (options.attempt > 3) {
                    return undefined;
                }
                return Math.min(options.attempt * 100, 3000);
            }
        });

        redisClient.on('connect', () => {
            console.log('✅ Redis connected');
            isRedisConnected = true;
        });

        redisClient.on('error', (err) => {
            console.log('⚠️  Redis error, falling back to memory cache:', err.message);
            isRedisConnected = false;
        });

        redisClient.on('end', () => {
            isRedisConnected = false;
        });

        return true;
    } catch (error) {
        console.log('⚠️  Redis initialization failed, using memory cache:', error.message);
        isRedisConnected = false;
        return false;
    }
}

/**
 * Get data from cache
 * @param {string} key - Cache key (e.g., 'all_sheets', 'Invoice Detail Listing')
 * @returns {Promise<any|null>} - Cached data or null if not found
 */
async function getCached(key) {
    const cacheKey = CACHE_PREFIX + key;

    // Try Redis first
    if (isRedisConnected && redisClient) {
        return new Promise((resolve) => {
            redisClient.get(cacheKey, (err, data) => {
                if (err || !data) {
                    resolve(null);
                } else {
                    try {
                        const parsed = JSON.parse(data);
                        console.log(`📦 Cache HIT (Redis): ${key}`);
                        resolve(parsed);
                    } catch (e) {
                        resolve(null);
                    }
                }
            });
        });
    }

    // Fallback to memory cache
    if (memoryCache.has(cacheKey)) {
        const cached = memoryCache.get(cacheKey);
        const age = Date.now() - cached.timestamp;

        if (age < CACHE_TTL * 1000) {
            console.log(`📦 Cache HIT (Memory): ${key} (age: ${Math.floor(age/1000)}s)`);
            return cached.data;
        } else {
            memoryCache.delete(cacheKey);
        }
    }

    console.log(`❌ Cache MISS: ${key}`);
    return null;
}

/**
 * Set data in cache
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - Time to live in seconds (optional, defaults to CACHE_TTL)
 */
async function setCached(key, data, ttl = CACHE_TTL) {
    const cacheKey = CACHE_PREFIX + key;

    // Try Redis first
    if (isRedisConnected && redisClient) {
        return new Promise((resolve) => {
            redisClient.setex(cacheKey, ttl, JSON.stringify(data), (err) => {
                if (!err) {
                    console.log(`💾 Cached (Redis): ${key} (TTL: ${ttl}s)`);
                }
                resolve(!err);
            });
        });
    }

    // Fallback to memory cache
    memoryCache.set(cacheKey, {
        data,
        timestamp: Date.now()
    });
    console.log(`💾 Cached (Memory): ${key} (TTL: ${ttl}s)`);
    return true;
}

/**
 * Invalidate cache for a specific key
 * @param {string} key - Cache key to invalidate
 */
async function invalidateCache(key) {
    const cacheKey = CACHE_PREFIX + key;

    // Clear from Redis
    if (isRedisConnected && redisClient) {
        return new Promise((resolve) => {
            redisClient.del(cacheKey, (err) => {
                if (!err) {
                    console.log(`🗑️  Invalidated cache (Redis): ${key}`);
                }
                resolve(!err);
            });
        });
    }

    // Clear from memory
    if (memoryCache.has(cacheKey)) {
        memoryCache.delete(cacheKey);
        console.log(`🗑️  Invalidated cache (Memory): ${key}`);
    }

    return true;
}

/**
 * Clear all cached data
 */
async function clearAllCache() {
    // Clear Redis
    if (isRedisConnected && redisClient) {
        return new Promise((resolve) => {
            redisClient.keys(CACHE_PREFIX + '*', (err, keys) => {
                if (!err && keys.length > 0) {
                    redisClient.del(...keys, (delErr) => {
                        if (!delErr) {
                            console.log(`🗑️  Cleared ${keys.length} cache entries (Redis)`);
                        }
                        resolve(!delErr);
                    });
                } else {
                    resolve(true);
                }
            });
        });
    }

    // Clear memory
    const count = memoryCache.size;
    memoryCache.clear();
    console.log(`🗑️  Cleared ${count} cache entries (Memory)`);
    return true;
}

/**
 * Get cache statistics
 */
async function getCacheStats() {
    const stats = {
        enabled: true,
        backend: isRedisConnected ? 'Redis' : 'Memory',
        ttl: CACHE_TTL,
        entries: 0
    };

    if (isRedisConnected && redisClient) {
        await new Promise((resolve) => {
            redisClient.keys(CACHE_PREFIX + '*', (err, keys) => {
                if (!err) {
                    stats.entries = keys.length;
                }
                resolve();
            });
        });
    } else {
        stats.entries = memoryCache.size;
    }

    return stats;
}

/**
 * Close Redis connection gracefully
 */
async function closeRedis() {
    if (redisClient) {
        return new Promise((resolve) => {
            redisClient.quit(() => {
                console.log('👋 Redis connection closed');
                resolve();
            });
        });
    }
}

module.exports = {
    initRedis,
    getCached,
    setCached,
    invalidateCache,
    clearAllCache,
    getCacheStats,
    closeRedis,
    CACHE_TTL
};
