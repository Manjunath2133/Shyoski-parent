// src/lib/cache.js

const cacheStore = new Map()

/**
 * Retrieve an item from the cache. Returns null if expired or missing.
 * @param {string} key 
 */
export function cacheGet(key) {
  const item = cacheStore.get(key)
  if (!item) return null

  if (Date.now() > item.expiry) {
    cacheStore.delete(key)
    return null
  }

  // Return a copy to prevent in-memory mutation
  return JSON.parse(JSON.stringify(item.value))
}

/**
 * Store an item in the cache.
 * @param {string} key 
 * @param {any} value 
 * @param {number} ttlSeconds 
 */
export function cacheSet(key, value, ttlSeconds) {
  cacheStore.set(key, {
    value,
    expiry: Date.now() + (ttlSeconds * 1000)
  })
}

/**
 * Delete a specific cache key.
 * @param {string} key 
 */
export function cacheDelete(key) {
  cacheStore.delete(key)
}

/**
 * Clear the entire cache store.
 */
export function cacheClear() {
  cacheStore.clear()
}

/**
 * Clear only dashboard-related cache keys.
 */
export function cacheClearDashboards() {
  for (const key of cacheStore.keys()) {
    if (key.startsWith('dashboard_')) {
      cacheStore.delete(key)
    }
  }
}
