// src/middleware/staff.js
import { ObjectId } from 'mongodb'
import { getDb } from '../lib/db'

/**
 * Middleware that validates if the mentor/evaluator has an active assignment for the target batch.
 * Level 3 Batch Staffing guard.
 * @param {string[]} [allowedRoles=['mentor', 'evaluator']] Array of roles
 */
export function RequireStaffAssignment(allowedRoles = ['mentor', 'evaluator']) {
  return async (c, next) => {
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'Unauthorized: Authentication context missing' }, 401)
    }

    // 1. Super Admin bypasses staffing validation
    if (user.globalRole === 'super_admin') {
      return await next()
    }

    // 1b. Org Admin bypasses staffing validation
    const membership = c.get('membership')
    if (membership && membership.role === 'org_admin') {
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
      // Attempt to inspect request body if parsing is safe (e.g. PUT review)
      try {
        const body = await c.req.raw.clone().json()
        batchId = body.batchId
      } catch (err) {
        // Body reading failed
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

    // 3. Retrieve staff assignment record (must have status: 'active')
    const assignment = await db.collection('batch_assignments').findOne({
      batchId: batchObjectId,
      uid: user.uid,
      role: { $in: allowedRoles },
      status: 'active'
    })

    if (!assignment) {
      return c.json({ error: 'Forbidden: You are not assigned to this batch or assignment is inactive' }, 403)
    }

    // Cache staff assignment context
    c.set('staff_assignment', {
      ...assignment,
      _id: assignment._id.toString(),
      batchId: assignment.batchId.toString(),
      organizationId: assignment.organizationId?.toString()
    })

    await next()
  }
}
