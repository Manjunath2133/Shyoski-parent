// src/lib/rate-limit.js

class TokenBucket {
  constructor(limit, windowSeconds) {
    this.limit = limit
    this.windowSeconds = windowSeconds
    this.tokens = limit
    this.lastRefilled = Date.now()
  }

  consume() {
    const now = Date.now()
    const elapsedSeconds = (now - this.lastRefilled) / 1000
    this.lastRefilled = now

    // Refill rate: limit / windowSeconds per second
    const refillRate = this.limit / this.windowSeconds
    this.tokens = Math.min(this.limit, this.tokens + elapsedSeconds * refillRate)

    if (this.tokens >= 1) {
      this.tokens -= 1
      return true
    }
    return false
  }
}

const buckets = new Map()

/**
 * Consumes a token for a given key. Returns true if allowed, false if rate limited.
 * @param {string} key 
 * @param {number} limit 
 * @param {number} windowSeconds 
 */
export function consumeToken(key, limit, windowSeconds) {
  let bucket = buckets.get(key)
  if (!bucket) {
    bucket = new TokenBucket(limit, windowSeconds)
    buckets.set(key, bucket)
  } else if (bucket.limit !== limit || bucket.windowSeconds !== windowSeconds) {
    bucket = new TokenBucket(limit, windowSeconds)
    buckets.set(key, bucket)
  }
  return bucket.consume()
}

/**
 * Clears the rate limiting map. Useful for automated tests.
 */
export function resetRateLimits() {
  buckets.clear()
}
