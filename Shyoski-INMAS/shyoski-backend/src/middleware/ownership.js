// src/middleware/ownership.js
import { getDb } from '../lib/db.js'
import { AuditService } from '../services/audit.js'

/**
 * Middleware that strictly checks if the authenticated user owns the resolved resource.
 * Single-purpose validation logic to enforce Level 5 Resource Ownership.
 * @param {string} contextKey The Hono context key where the resource is cached (e.g., 'submission', 'group')
 * @param {string} [ownerField='uid'] The owner field name within the resource document
 */
export function RequireOwnership(contextKey, ownerField = 'uid') {
  return async (c, next) => {
    const user = c.get('user')
    if (!user) {
      return c.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Unauthorized: Authentication context missing'
        }
      }, 401)
    }

    // 1. Super Admin is the only global bypass allowed in this middleware
    if (user.globalRole === 'super_admin') {
      return await next()
    }

    // 2. Fetch the cached resource loaded by the resolver
    const resource = c.get(contextKey)
    if (!resource) {
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: `Internal Server Error: Missing resource context '${contextKey}' for ownership validation`
        }
      }, 500)
    }

    // 3. Resolve the resource owner uid. Supports string arrays (e.g. members list) and flat strings
    const owner = resource[ownerField]
    
    if (Array.isArray(owner)) {
      if (!owner.includes(user.uid)) {
        try {
          const db = await getDb(c.env)
          await AuditService.createLog(db, {
            actorUid: user.uid,
            action: 'PERMISSION_DENIED',
            resourceType: contextKey,
            resourceId: resource._id?.toString(),
            metadata: { reason: 'not_in_owners_array', path: c.req.path }
          })
        } catch (e) {
          console.error('Audit log failed during RequireOwnership (array check):', e.message)
        }

        return c.json({
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'Forbidden: You are not a member or owner of this resource'
          }
        }, 403)
      }
    } else if (owner !== user.uid) {
      try {
        const db = await getDb(c.env)
        await AuditService.createLog(db, {
          actorUid: user.uid,
          action: 'PERMISSION_DENIED',
          resourceType: contextKey,
          resourceId: resource._id?.toString(),
          metadata: { reason: 'not_the_owner', path: c.req.path }
        })
      } catch (e) {
        console.error('Audit log failed during RequireOwnership (flat check):', e.message)
      }

      return c.json({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Forbidden: You do not own this resource'
        }
      }, 403)
    }

    await next()
  }
}

