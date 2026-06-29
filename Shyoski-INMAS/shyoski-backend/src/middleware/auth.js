// src/middleware/auth.js
import { getDb } from '../lib/db.js'
import { AuditService } from '../services/audit.js'

// In-memory cache for Google Firebase public keys (JWK set)
let cachedJwks = null
let jwksCacheExpires = 0

/**
 * Fetches Google's public JWK certificates and caches them based on Cache-Control header.
 */
async function fetchGooglePublicKeys() {
  const now = Date.now()
  if (cachedJwks && now < jwksCacheExpires) {
    return cachedJwks
  }

  const response = await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
  if (!response.ok) {
    throw new Error('Failed to fetch Google public keys')
  }

  const cacheControl = response.headers.get('cache-control')
  let maxAge = 3600 // default 1 hour
  if (cacheControl) {
    const match = cacheControl.match(/max-age=(\d+)/)
    if (match) {
      maxAge = parseInt(match[1])
    }
  }

  cachedJwks = await response.json()
  jwksCacheExpires = now + (maxAge * 1000)
  return cachedJwks
}

/**
 * Helper to decode base64url strings.
 */
function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) {
    str += '='
  }
  return atob(str)
}

/**
 * Performs cryptographic RS256 signature and claim verification on the Firebase JWT.
 * @param {string} token Bearer JWT
 * @param {object} env Worker environment bindings
 */
async function verifyFirebaseJwt(token, env) {
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format')
  }

  const [headerB64, payloadB64, signatureB64] = parts

  // 1. Decode header and verify alg
  const header = JSON.parse(base64urlDecode(headerB64))
  if (header.alg !== 'RS256') {
    throw new Error('Unsupported signature algorithm (expected RS256)')
  }

  // 2. Retrieve the Google public JWK matching the JWT kid
  const jwkSet = await fetchGooglePublicKeys()
  const keyInfo = jwkSet.keys.find(k => k.kid === header.kid)
  if (!keyInfo) {
    throw new Error('No matching public key found for kid')
  }

  // 3. Import public JWK as CryptoKey
  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    keyInfo,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-256' }
    },
    false,
    ['verify']
  )

  // 4. Verify cryptographic signature
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  const signatureBytes = new Uint8Array(
    Array.from(base64urlDecode(signatureB64), c => c.charCodeAt(0))
  )

  const isValid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    signatureBytes,
    data
  )

  if (!isValid) {
    throw new Error('Invalid cryptographic signature')
  }

  // 5. Verify payload claims
  const payload = JSON.parse(base64urlDecode(payloadB64))
  const projectId = env.FIREBASE_PROJECT_ID

  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID is not configured')
  }

  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error('Invalid issuer claim')
  }

  if (payload.aud !== projectId) {
    throw new Error('Invalid audience claim')
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token is expired')
  }

  return payload
}

/**
 * Hono middleware to extract and verify Firebase JWT authentication context.
 */
export async function RequireAuth(c, next) {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Unauthorized: Missing or invalid token'
      }
    }, 401)
  }

  const token = authHeader.substring(7).trim()
  
  if (!token) {
    return c.json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Unauthorized: Empty token'
      }
    }, 401)
  }

  // Developer mock fallback - restricted ONLY to local development/test environments
  if ((c.env.ENVIRONMENT === 'development' || c.env.ENVIRONMENT === 'test') && (token === 'super_admin_token' || token.startsWith('super_admin_') || token.startsWith('firebase_') || token.startsWith('mock_'))) {
    let globalRole = 'user'
    if (token === 'super_admin_token' || token.startsWith('super_admin_')) {
      globalRole = 'super_admin'
    }
    c.set('user', {
      uid: token,
      email: `${token}@example.com`,
      globalRole
    })
    return await next()
  }

  try {
    const payload = await verifyFirebaseJwt(token, c.env)
    c.set('user', {
      uid: payload.sub,
      email: payload.email || null,
      globalRole: payload.globalRole || 'user'
    })
    await next()
  } catch (error) {
    try {
      const db = await getDb(c.env)
      await AuditService.createLog(db, {
        actorUid: 'anonymous',
        action: 'AUTH_FAILURE',
        resourceType: 'system',
        metadata: { reason: error.message, path: c.req.path }
      })
    } catch (e) {
      console.error('Audit log failed during AUTH_FAILURE block:', e.message)
    }

    return c.json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: `Unauthorized: ${error.message}`
      }
    }, 401)
  }
}

/**
 * Validates global super_admin authorization.
 */
export function RequireGlobalRole(requiredRole) {
  return async (c, next) => {
    const user = c.get('user')
    if (!user || user.globalRole !== requiredRole) {
      try {
        const db = await getDb(c.env)
        await AuditService.createLog(db, {
          actorUid: user?.uid || 'anonymous',
          action: 'PERMISSION_DENIED',
          resourceType: 'system',
          metadata: { reason: 'insufficient_global_role', requiredRole, path: c.req.path }
        })
      } catch (e) {
        console.error('Audit log failed during RequireGlobalRole block:', e.message)
      }

      return c.json({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Forbidden: Insufficient platform permissions'
        }
      }, 403)
    }
    await next()
  }
}
