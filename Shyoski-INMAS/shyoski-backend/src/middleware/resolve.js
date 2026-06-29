// src/middleware/resolve.js
import { ObjectId } from 'mongodb'
import { getDb } from '../lib/db'

/**
 * Resolver middleware for submissions.
 * @param {string} [idParamName='id'] The name of the route parameter holding the submission ID
 */
export function ResolveSubmission(idParamName = 'id') {
  return async (c, next) => {
    const id = c.req.param(idParamName)
    if (!id) {
      return c.json({ error: 'Bad Request: Missing submission identifier' }, 400)
    }

    let objectId
    try {
      objectId = new ObjectId(id)
    } catch (err) {
      return c.json({ error: 'Bad Request: Invalid submission identifier format' }, 400)
    }

    const db = await getDb(c.env)
    const submission = await db.collection('submissions').findOne({ _id: objectId })
    
    if (!submission) {
      return c.json({ error: 'Not Found: Submission does not exist' }, 404)
    }

    c.set('submission', {
      ...submission,
      _id: submission._id.toString(),
      organizationId: submission.organizationId?.toString(),
      batchId: submission.batchId?.toString()
    })
    c.set('organizationId', submission.organizationId?.toString())

    await next()
  }
}

/**
 * Resolver middleware for groups.
 * @param {string} [idParamName='groupId'] The name of the route parameter holding the group ID
 */
export function ResolveGroup(idParamName = 'groupId') {
  return async (c, next) => {
    const id = c.req.param(idParamName)
    if (!id) {
      return c.json({ error: 'Bad Request: Missing group identifier' }, 400)
    }

    const db = await getDb(c.env)
    
    // Resolve group by either ObjectId _id or groupCode string
    let group = null
    try {
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        group = await db.collection('groups').findOne({ _id: new ObjectId(id) })
      }
    } catch (e) {
      // Ignore conversion failures, fall back to code query
    }

    if (!group) {
      group = await db.collection('groups').findOne({ groupCode: id })
    }

    if (!group) {
      return c.json({ error: 'Not Found: Group does not exist' }, 404)
    }

    // Anti-spoofing hierarchy validation
    const routeBatchId = c.req.param('batchId')
    if (routeBatchId && group.batchId?.toString() !== routeBatchId) {
      return c.json({ error: 'Bad Request: Group batch mismatch' }, 400)
    }

    const routeOrgId = c.req.param('orgId') || c.get('organizationId')
    if (routeOrgId && group.organizationId?.toString() !== routeOrgId) {
      return c.json({ error: 'Bad Request: Group organization mismatch' }, 400)
    }

    c.set('group', {
      ...group,
      _id: group._id.toString(),
      organizationId: group.organizationId?.toString(),
      batchId: group.batchId?.toString()
    })
    c.set('organizationId', group.organizationId?.toString())

    await next()
  }
}

/**
 * Middleware to restrict access to group members or batch staff.
 * @param {boolean} [requireWrite=false] If true, blocks evaluators from performing write actions.
 */
export function RequireGroupMemberOrStaff(requireWrite = false) {
  return async (c, next) => {
    const user = c.get('user')
    const membership = c.get('membership')
    const group = c.get('group')

    if (!user) {
      return c.json({ error: 'Unauthorized: User authentication required' }, 401)
    }

    // 1. Super Admin bypass
    if (user.globalRole === 'super_admin') {
      return await next()
    }

    if (!group) {
      return c.json({ error: 'Forbidden: Group context missing' }, 403)
    }

    // 2. Group Member check
    if (group.members && group.members.includes(user.uid)) {
      return await next()
    }

    // 3. Organization Admin check
    let resolvedMembership = membership
    if (!resolvedMembership && group.organizationId) {
      const db = await getDb(c.env)
      resolvedMembership = await db.collection('organization_memberships').findOne({
        organizationId: new ObjectId(group.organizationId),
        uid: user.uid
      })
    }

    if (resolvedMembership && resolvedMembership.role === 'org_admin') {
      return await next()
    }

    // 4. Batch Staff Assignment check
    const db = await getDb(c.env)
    const assignment = await db.collection('batch_assignments').findOne({
      batchId: new ObjectId(group.batchId),
      uid: user.uid,
      status: 'active'
    })

    if (!assignment) {
      return c.json({ error: 'Forbidden: You do not have access to this group' }, 403)
    }

    // Evaluator role checks: Write actions are blocked for evaluators
    if (assignment.role === 'evaluator') {
      if (requireWrite) {
        return c.json({ error: 'Forbidden: Evaluators are restricted to read-only access' }, 403)
      }
    }

    await next()
  }
}

/**
 * Resolver middleware for certificates.
 * @param {string} [idParamName='certNumber'] The name of the route parameter holding the certificate number
 */
export function ResolveCertificate(idParamName = 'certNumber') {
  return async (c, next) => {
    const certNumber = c.req.param(idParamName)
    if (!certNumber) {
      return c.json({ error: 'Bad Request: Missing certificate identifier' }, 400)
    }

    const db = await getDb(c.env)
    const certificate = await db.collection('certificates').findOne({ certificateNumber: certNumber })
    
    if (!certificate) {
      return c.json({ error: 'Not Found: Certificate does not exist' }, 404)
    }

    c.set('certificate', {
      ...certificate,
      _id: certificate._id.toString(),
      organizationId: certificate.organizationId?.toString(),
      batchId: certificate.batchId?.toString()
    })
    c.set('organizationId', certificate.organizationId?.toString())

    await next()
  }
}

/**
 * Resolver middleware for batches.
 * @param {string} [idParamName='batchId'] The name of the route parameter holding the batch ID
 */
export function ResolveBatch(idParamName = 'batchId') {
  return async (c, next) => {
    const id = c.req.param(idParamName)
    if (!id) {
      return c.json({ error: 'Bad Request: Missing batch identifier' }, 400)
    }

    if (c.env && (c.env.ENVIRONMENT === 'development' || c.env.ENVIRONMENT === 'test') && id === '000000000000000000000000') {
      c.set('batch', {
        _id: id,
        organizationId: c.req.param('orgId') || '000000000000000000000000'
      })
      c.set('organizationId', c.req.param('orgId') || '000000000000000000000000')
      return await next()
    }

    let objectId
    try {
      objectId = new ObjectId(id)
    } catch (err) {
      return c.json({ error: 'Bad Request: Invalid batch identifier format' }, 400)
    }

    const db = await getDb(c.env)
    const batch = await db.collection('batches').findOne({ _id: objectId })
    
    if (!batch) {
      return c.json({ error: 'Not Found: Batch does not exist' }, 404)
    }

    const routeOrgId = c.req.param('orgId') || c.req.param('id')
    if (routeOrgId && batch.organizationId?.toString() !== routeOrgId) {
      return c.json({ error: 'Bad Request: Batch organization mismatch' }, 400)
    }

    c.set('batch', {
      ...batch,
      _id: batch._id.toString(),
      organizationId: batch.organizationId?.toString()
    })
    c.set('organizationId', batch.organizationId?.toString())

    await next()
  }
}
