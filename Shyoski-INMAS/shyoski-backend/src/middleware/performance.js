// src/middleware/performance.js

export const startTime = Date.now()
let totalRequests = 0
let totalResponseTime = 0
const slowestEndpointsMap = new Map() // route -> maxDuration
const slowQueries = [] // array of objects, max length 50

export function getPerformanceMetrics() {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000)
  const averageResponseTimeMs = totalRequests > 0 ? (totalResponseTime / totalRequests) : 0

  const slowestEndpoints = Array.from(slowestEndpointsMap.entries())
    .map(([route, maxLatency]) => ({ route, maxLatency }))
    .sort((a, b) => b.maxLatency - a.maxLatency)
    .slice(0, 5)

  return {
    uptimeSeconds,
    averageResponseTimeMs,
    slowestEndpoints,
    slowQueries
  }
}

export async function performanceMiddleware(c, next) {
  const start = Date.now()
  await next()
  const duration = Date.now() - start

  totalRequests++
  totalResponseTime += duration

  const method = c.req.method
  const route = c.req.routePath || c.req.path
  const routeKey = `${method} ${route}`

  // Update slowest endpoints
  const currentMax = slowestEndpointsMap.get(routeKey) || 0
  if (duration > currentMax) {
    slowestEndpointsMap.set(routeKey, duration)
  }

  // Log to slowQueries if >= 500ms
  if (duration >= 500) {
    const slowLog = {
      timestamp: new Date().toISOString(),
      method,
      path: c.req.path,
      durationMs: duration
    }
    slowQueries.push(slowLog)
    if (slowQueries.length > 50) {
      slowQueries.shift()
    }
  }
}
