// src/middleware/tenant.js
import { ObjectId } from 'mongodb'
import { getDb } from '../lib/db'
import { MembershipService } from '../services/membership'
import { AuditService } from '../services/audit.js'

/**
 * Middleware to restrict endpoints based on organization membership and roles.
 * @param {string[]} allowedRoles Array of roles (org_admin, mentor, evaluator, student)
 */
export function RequireTenantRole(allowedRoles = []) {
  return async (c, next) => {
    const user = c.get('user')
    if (!user) {
      return c.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Unauthorized: User authentication required'
        }
      }, 401)
    }

    // 1. Super Admin bypasses all tenant constraints
    if (user.globalRole === 'super_admin') {
      c.set('membership', {
        organizationId: null,
        uid: user.uid,
        role: 'super_admin',
        status: 'active'
      })
      return await next()
    }

    // 2. Resolve orgId from context or route parameters
    const orgId = c.get('organizationId') || c.req.param('orgId') || c.req.param('id')
    if (!orgId) {
      return c.json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Bad Request: Missing organization identifier context'
        }
      }, 400)
    }

    let orgObjectId
    try {
      orgObjectId = new ObjectId(orgId)
    } catch (err) {
      return c.json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Bad Request: Invalid organization identifier format'
        }
      }, 400)
    }

    const db = await getDb(c.env)
    
    // 3. Retrieve membership details (Membership Check)
    const membership = await MembershipService.getMembership(db, orgObjectId.toString(), user.uid)
    if (!membership) {
      try {
        await AuditService.createLog(db, {
          actorUid: user.uid,
          organizationId: orgObjectId.toString(),
          action: 'PERMISSION_DENIED',
          resourceType: 'organization',
          resourceId: orgObjectId.toString(),
          metadata: { reason: 'not_a_member', path: c.req.path }
        })
      } catch (e) {
        console.error('Audit log failed during RequireTenantRole (membership check):', e.message)
      }

      return c.json({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Forbidden: You are not a member of this organization'
        }
      }, 403)
    }

    // 4. Retrieve organization details (Organization Status Check)
    const org = await db.collection('organizations').findOne({ _id: orgObjectId })
    if (!org) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Not Found: Organization does not exist'
        }
      }, 404)
    }

    if (org.status === 'suspended') {
      try {
        await AuditService.createLog(db, {
          actorUid: user.uid,
          organizationId: orgObjectId.toString(),
          action: 'PERMISSION_DENIED',
          resourceType: 'organization',
          resourceId: orgObjectId.toString(),
          metadata: { reason: 'organization_suspended', path: c.req.path }
        })
      } catch (e) {
        console.error('Audit log failed during RequireTenantRole (org suspended):', e.message)
      }

      return c.json({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Forbidden: Organization is suspended'
        }
      }, 403)
    }

    if (org.status === 'archived') {
      const isWrite = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(c.req.method)
      if (isWrite) {
        try {
          await AuditService.createLog(db, {
            actorUid: user.uid,
            organizationId: orgObjectId.toString(),
            action: 'PERMISSION_DENIED',
            resourceType: 'organization',
            resourceId: orgObjectId.toString(),
            metadata: { reason: 'organization_archived_read_only', path: c.req.path }
          })
        } catch (e) {
          console.error('Audit log failed during RequireTenantRole (org archived):', e.message)
        }

        return c.json({
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'Forbidden: Organization is archived and read-only'
          }
        }, 403)
      }
    }

    // 5. Validate role (Role Check)
    if (allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
      try {
        await AuditService.createLog(db, {
          actorUid: user.uid,
          organizationId: orgObjectId.toString(),
          action: 'PERMISSION_DENIED',
          resourceType: 'organization',
          resourceId: orgObjectId.toString(),
          metadata: { reason: 'insufficient_tenant_role', allowedRoles, actualRole: membership.role, path: c.req.path }
        })
      } catch (e) {
        console.error('Audit log failed during RequireTenantRole (role check):', e.message)
      }

      return c.json({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Forbidden: Insufficient organization privileges'
        }
      }, 403)
    }

    // Cache membership context
    c.set('membership', membership)
    c.set('organizationId', orgObjectId.toString())

    await next()
  }
}

/**
 * Middleware that strictly enforces active membership status.
 */
export function RequireMembershipActive() {
  return async (c, next) => {
    const user = c.get('user')
    if (user && user.globalRole === 'super_admin') {
      return await next()
    }

    const membership = c.get('membership')
    if (!membership) {
      return c.json({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Forbidden: Membership context missing'
        }
      }, 403)
    }

    if (membership.status !== 'active') {
      try {
        const db = await getDb(c.env)
        await AuditService.createLog(db, {
          actorUid: user?.uid || 'anonymous',
          organizationId: membership.organizationId?.toString(),
          action: 'PERMISSION_DENIED',
          resourceType: 'organization',
          metadata: { reason: 'membership_not_active', status: membership.status, path: c.req.path }
        })
      } catch (e) {
        console.error('Audit log failed during RequireMembershipActive check:', e.message)
      }

      return c.json({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: `Forbidden: Your membership is currently ${membership.status}`
        }
      }, 403)
    }

    await next()
  }
}

