// src/middleware/security.js
import { getDb } from '../lib/db.js'
import { AuditService } from '../services/audit.js'

const PROHIBITED_KEYS = new Set([
  '$where', '$regex', '$gt', '$gte', '$lt', '$lte', '$ne', '$expr',
  '__proto__', 'constructor', 'prototype'
])

function hasProhibitedKeys(val) {
  if (!val || typeof val !== 'object') {
    return false
  }

  if (Array.isArray(val)) {
    for (const item of val) {
      if (hasProhibitedKeys(item)) return true
    }
    return false
  }

  for (const key of Object.keys(val)) {
    if (PROHIBITED_KEYS.has(key)) {
      return true
    }
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return true
    }
    if (hasProhibitedKeys(val[key])) {
      return true
    }
  }
  return false
}

/**
 * Global middleware injecting hardening security headers.
 */
export async function SecurityHeaders(c, next) {
  await next()
  c.res.headers.set('X-Content-Type-Options', 'nosniff')
  c.res.headers.set('X-Frame-Options', 'DENY')
  c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  if (c.req.path.startsWith('/api/v2/certificates/verify/')) {
    c.res.headers.set('Cache-Control', 'public, max-age=300')
  }
}

/**
 * Middleware recursively sanitizing JSON input payloads and query parameters.
 */
export async function SanitizeInput(c, next) {
  // 1. Sanitize request query parameters
  const query = c.req.query()
  if (hasProhibitedKeys(query)) {
    try {
      const db = await getDb(c.env)
      const user = c.get('user')
      await AuditService.createLog(db, {
        actorUid: user?.uid || 'anonymous',
        action: 'SUSPICIOUS_REQUEST',
        resourceType: 'system',
        metadata: { reason: 'prohibited_keys_in_query', path: c.req.path }
      })
    } catch (e) {
      console.error('Audit log failed during query sanitization block:', e.message)
    }

    return c.json({
      success: false,
      error: {
        code: 'SUSPICIOUS_REQUEST',
        message: 'Bad Request: Prohibited input keys detected'
      }
    }, 400)
  }

  // 2. Sanitize request body if JSON (and not GET or HEAD request)
  const contentType = c.req.header('content-type') || ''
  const hasBody = !['GET', 'HEAD'].includes(c.req.method)
  if (hasBody && contentType.includes('application/json')) {
    try {
      const bodyText = await c.req.text()
      // Re-create raw request body stream so downstream consumers can still read it
      c.req.raw = new Request(c.req.raw.url, {
        method: c.req.raw.method,
        headers: c.req.raw.headers,
        body: bodyText
      })

      if (bodyText) {
        const body = JSON.parse(bodyText)
        if (hasProhibitedKeys(body)) {
          try {
            const db = await getDb(c.env)
            const user = c.get('user')
            await AuditService.createLog(db, {
              actorUid: user?.uid || 'anonymous',
              action: 'SUSPICIOUS_REQUEST',
              resourceType: 'system',
              metadata: { reason: 'prohibited_keys_in_body', path: c.req.path }
            })
          } catch (e) {
            console.error('Audit log failed during body sanitization block:', e.message)
          }

          return c.json({
            success: false,
            error: {
              code: 'SUSPICIOUS_REQUEST',
              message: 'Bad Request: Prohibited input keys detected'
            }
          }, 400)
        }
      }
    } catch (error) {
      return c.json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: `Bad Request: Invalid JSON payload: ${error.message}`
        }
      }, 400)
    }
  }

  await next()
}

/**
 * Middleware limiting the maximum allowed request body payload size.
 * @param {number} [maxSizeBytes=1048576] 1MB default size limit 
 */
export function RequestSizeLimiter(maxSizeBytes = 1024 * 1024) {
  return async (c, next) => {
    const contentLength = c.req.header('content-length')
    if (contentLength) {
      const size = parseInt(contentLength, 10)
      if (size > maxSizeBytes) {
        return c.json({
          success: false,
          error: {
            code: 'PAYLOAD_TOO_LARGE',
            message: `Payload Too Large: Request body exceeds size limit`
          }
        }, 413)
      }
    }
    await next()
  }
}
