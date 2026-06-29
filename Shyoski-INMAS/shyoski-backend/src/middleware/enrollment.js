// src/middleware/enrollment.js
import { ObjectId } from 'mongodb'
import { getDb } from '../lib/db'

/**
 * Middleware that validates if the student has a valid enrollment in the target batch.
 * Level 3 Batch Participation guard.
 * @param {string[]} [allowedStatuses=['active']] Array of statuses (active, completed, dropped, suspended)
 */
export function RequireEnrollmentStatus(allowedStatuses = ['active']) {
  return async (c, next) => {
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'Unauthorized: Authentication context missing' }, 401)
    }

    // 1. Super Admin bypasses enrollment validation
    if (user.globalRole === 'super_admin') {
      return await next()
    }

    // 2. Resolve batchId from route parameter, query, payload, or resolved contexts
    let batchId = c.req.param('batchId')
    
    if (!batchId) {
      // Look up cached contexts (e.g. from ResolveSubmission)
      const submission = c.get('submission')
      const group = c.get('group')
      const certificate = c.get('certificate')
      
      batchId = submission?.batchId || group?.batchId || certificate?.batchId
    }

    if (!batchId) {
      // Attempt to inspect request body if parsing is safe (e.g., POST submission)
      try {
        const body = await c.req.raw.clone().json()
        batchId = body.batchId
      } catch (err) {
        // Body reading failed, proceed to validation failure
      }
    }

    if (!batchId) {
      return c.json({ error: 'Bad Request: Missing batch identifier context' }, 400)
    }

    let batchObjectId
    try {
      batchObjectId = new ObjectId(batchId)
    } catch (err) {
      return c.json({ error: 'Bad Request: Invalid batch identifier format' }, 400)
    }

    const db = await getDb(c.env)

    // 3. Retrieve student's enrollment record
    const enrollment = await db.collection('batch_enrollments').findOne({
      batchId: batchObjectId,
      uid: user.uid
    })

    if (!enrollment) {
      return c.json({ error: 'Forbidden: You are not enrolled in this batch' }, 403)
    }

    const currentEnrollmentStatus = enrollment.status || enrollment.enrollmentStatus
    if (!allowedStatuses.includes(currentEnrollmentStatus)) {
      return c.json({ error: `Forbidden: Your enrollment status is currently '${currentEnrollmentStatus}'` }, 403)
    }

    // 4. Validate active membership and organization suspension status
    let orgId = enrollment.organizationId?.toString()
    if (!orgId) {
      const batch = await db.collection('batches').findOne({ _id: batchObjectId })
      if (batch) {
        orgId = batch.organizationId.toString()
      }
    }

    if (orgId) {
      // Validate Membership
      const membership = await db.collection('organization_memberships').findOne({
        organizationId: new ObjectId(orgId),
        uid: user.uid
      })
      if (!membership) {
        return c.json({ error: 'Forbidden: You are not a member of this organization' }, 403)
      }
      if (membership.status !== 'active') {
        return c.json({ error: `Forbidden: Your membership is currently ${membership.status}` }, 403)
      }

      // Validate Organization Status
      const org = await db.collection('organizations').findOne({ _id: new ObjectId(orgId) })
      if (!org) {
        return c.json({ error: 'Not Found: Organization does not exist' }, 404)
      }
      if (org.status === 'suspended') {
        return c.json({ error: 'Forbidden: Organization is suspended' }, 403)
      }
    }

    // Cache enrollment context
    c.set('enrollment', {
      ...enrollment,
      _id: enrollment._id.toString(),
      batchId: enrollment.batchId.toString(),
      organizationId: enrollment.organizationId?.toString()
    })

    await next()
  }
}
