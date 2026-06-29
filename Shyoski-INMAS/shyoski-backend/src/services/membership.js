// src/services/membership.js
import { ObjectId } from 'mongodb'
import { NotificationService } from './notification.js'

export class MembershipService {
  /**
   * Assigns a user to an organization with a specific role.
   * @param {import('mongodb').Db} db
   * @param {object} params
   * @param {string|ObjectId} params.organizationId
   * @param {string} params.uid The Firebase UID
   * @param {string} params.role The organization role (e.g. org_admin, student)
   */
  static async createMembership(db, { organizationId, uid, role }) {
    if (!organizationId || !uid || !role) {
      throw new Error('Missing required fields for organization membership')
    }

    const orgObjectId = new ObjectId(organizationId.toString())

    // Enforce uniqueness constraint via upsert to prevent duplicates
    const membershipDoc = {
      organizationId: orgObjectId,
      uid,
      role,
      status: 'active',
      joinedAt: new Date()
    }

    // Attempt insert. Uniqueness index `{ organizationId: 1, uid: 1 }` will block duplicates
    await db.collection('organization_memberships').updateOne(
      { organizationId: orgObjectId, uid },
      { $setOnInsert: membershipDoc },
      { upsert: true }
    )

    const result = await db.collection('organization_memberships').findOne({ organizationId: orgObjectId, uid })
    if (result) {
      result._id = result._id.toString()
      result.organizationId = result.organizationId.toString()
    }
    return result
  }

  /**
   * Retrieves a user membership within a specific organization.
   * @param {import('mongodb').Db} db
   * @param {string} organizationId
   * @param {string} uid
   */
  static async getMembership(db, organizationId, uid) {
    if (!organizationId || !uid) return null
    const membership = await db.collection('organization_memberships').findOne({
      organizationId: new ObjectId(organizationId),
      uid
    })
    if (membership) {
      membership._id = membership._id.toString()
      membership.organizationId = membership.organizationId.toString()
    }
    return membership
  }

  /**
   * Lists all members of a specific organization with pagination constraints.
   * @param {import('mongodb').Db} db
   * @param {string} organizationId
   * @param {object} params
   * @param {number} [params.page=1]
   * @param {number} [params.limit=20]
   */
  static async listMembers(db, organizationId, { page = 1, limit = 20, cursor = null } = {}) {
    if (!organizationId) throw new Error('Organization ID is required')

    const validatedPage = Math.max(1, parseInt(page))
    const validatedLimit = Math.min(Math.max(1, parseInt(limit || 20)), 100)

    const query = { organizationId: new ObjectId(organizationId) }
    const matchQuery = { ...query }

    if (cursor) {
      try {
        matchQuery._id = { $lt: new ObjectId(cursor) }
      } catch (e) {}
    }

    const pipeline = [
      { $match: matchQuery },
      { $sort: cursor ? { _id: -1 } : { joinedAt: -1 } }
    ]

    if (!cursor) {
      const skip = (validatedPage - 1) * validatedLimit
      pipeline.push({ $skip: skip })
    }

    pipeline.push(
      { $limit: validatedLimit },
      {
        $lookup: {
          from: 'users',
          localField: 'uid',
          foreignField: 'uid',
          as: 'userDetails'
        }
      },
      {
        $project: {
          _id: 1,
          organizationId: 1,
          uid: 1,
          role: 1,
          status: 1,
          joinedAt: 1,
          user: { $arrayElemAt: ['$userDetails', 0] }
        }
      }
    )

    const items = await db.collection('organization_memberships').aggregate(pipeline).toArray()
    const total = await db.collection('organization_memberships').countDocuments(query)

    const formatted = items.map(m => ({
      ...m,
      _id: m._id.toString(),
      organizationId: m.organizationId.toString(),
      displayName: m.user?.displayName || 'Invited User',
      email: m.user?.email || null
    }))

    const pages = Math.ceil(total / validatedLimit)
    let nextCursor = null
    if (formatted.length === validatedLimit) {
      nextCursor = formatted[formatted.length - 1]._id
    }

    return {
      data: formatted,
      members: formatted, // backward compatibility
      pagination: {
        page: cursor ? null : validatedPage,
        limit: validatedLimit,
        total,
        pages: cursor ? null : pages,
        nextCursor
      }
    }
  }

  /**
   * Revokes membership context for a user.
   * @param {import('mongodb').Db} db
   * @param {string} organizationId
   * @param {string} uid
   */
  static async removeMembership(db, organizationId, uid) {
    if (!organizationId || !uid) throw new Error('Organization ID and UID are required')
    const result = await db.collection('organization_memberships').deleteOne({
      organizationId: new ObjectId(organizationId),
      uid
    })
    return result.deletedCount > 0
  }

  /**
   * Updates a user's membership within a specific organization.
   * Modifies role or membership status, enforcing protection policies.
   * @param {import('mongodb').Db} db
   * @param {string} organizationId
   * @param {string} targetUid
   * @param {object} updateData
   * @param {string} [updateData.role]
   * @param {string} [updateData.status]
   * @param {string} actorUid The UID of the admin making the change
   */
  static async updateMembership(db, organizationId, targetUid, { role, status }, actorUid) {
    if (!organizationId || !targetUid) {
      throw new Error('Organization ID and Target UID are required')
    }

    if (actorUid === targetUid) {
      const error = new Error('Conflict: Cannot modify your own membership role or status')
      error.status = 409
      throw error
    }

    const orgObjectId = new ObjectId(organizationId)

    // Load existing target membership
    const targetMembership = await db.collection('organization_memberships').findOne({
      organizationId: orgObjectId,
      uid: targetUid
    })

    if (!targetMembership) {
      const error = new Error('Membership not found')
      error.status = 404
      throw error
    }

    const setFields = {}
    if (role !== undefined) {
      if (!['org_admin', 'mentor', 'evaluator', 'student'].includes(role)) {
        throw new Error('Invalid organization membership role')
      }
      setFields.role = role
    }

    if (status !== undefined) {
      if (!['active', 'suspended'].includes(status)) {
        throw new Error('Invalid organization membership status')
      }
      setFields.status = status
    }

    if (Object.keys(setFields).length === 0) {
      return targetMembership
    }

    // Protection: If changing role FROM org_admin, or status to suspended when target was org_admin:
    if (targetMembership.role === 'org_admin' && (role === 'student' || role === 'mentor' || role === 'evaluator' || status === 'suspended')) {
      // Check if this is the last admin
      const allAdmins = await db.collection('organization_memberships').find({
        organizationId: orgObjectId,
        role: 'org_admin',
        status: 'active'
      }).toArray()
      console.log('DEBUG updateMembership allAdmins:', allAdmins.map(a => ({ uid: a.uid, status: a.status, role: a.role })))
      const adminCount = allAdmins.length
      if (adminCount <= 1) {
        const error = new Error('Conflict: Cannot demote or suspend the last administrator of the organization')
        error.status = 409
        throw error
      }
    }

    const result = await db.collection('organization_memberships').findOneAndUpdate(
      { organizationId: orgObjectId, uid: targetUid },
      { $set: setFields },
      { returnDocument: 'after' }
    )

    if (result) {
      result._id = result._id.toString()
      result.organizationId = result.organizationId.toString()

      // Trigger membership suspension / restoration notification
      if (status !== undefined && targetMembership.status !== status) {
        const type = status === 'suspended' ? 'MEMBERSHIP_SUSPENDED' : 'MEMBERSHIP_RESTORED'
        const title = status === 'suspended' ? 'Membership Suspended' : 'Membership Restored'
        const message = status === 'suspended'
          ? 'Your organization membership has been suspended by administration.'
          : 'Your organization membership has been restored.'
        
        await NotificationService.createNotification(db, {
          organizationId: orgObjectId,
          uid: targetUid,
          type,
          title,
          message,
          entityType: 'membership',
          entityId: targetMembership._id.toString()
        }).catch(err => console.error('Failed to create membership notification:', err))
      }
    }
    return result
  }
}
