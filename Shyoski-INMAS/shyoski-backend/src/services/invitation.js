// src/services/invitation.js
import { ObjectId } from 'mongodb'
import crypto from 'node:crypto'
import { MembershipService } from './membership'
import { NotificationService } from './notification.js'

export class InvitationService {
  /**
   * Generates a unique token-based invitation to join an organization.
   * @param {import('mongodb').Db} db
   * @param {object} params
   * @param {string|ObjectId} params.organizationId
   * @param {string} params.email
   * @param {string} params.role (e.g. org_admin, student, mentor, evaluator)
   */
  static async createInvitation(db, { organizationId, email, role }) {
    if (!organizationId || !email || !role) {
      throw new Error('Missing fields for organization invitation')
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7-day TTL expiry

    const inviteDoc = {
      organizationId: new ObjectId(organizationId.toString()),
      email: email.toLowerCase().trim(),
      role,
      token,
      status: 'pending',
      expiresAt,
      createdAt: new Date()
    }

    await db.collection('organization_invitations').insertOne(inviteDoc)

    // Check if user already exists to target ORG_INVITATION
    const targetUser = await db.collection('users').findOne({ email: inviteDoc.email })
    if (targetUser) {
      await NotificationService.createNotification(db, {
        organizationId: inviteDoc.organizationId,
        uid: targetUser.uid,
        type: 'ORG_INVITATION',
        title: 'Organization Invitation',
        message: `You have been invited to join an organization as an ${role}.`,
        entityType: 'invitation',
        entityId: inviteDoc._id.toString(),
        eventKey: `ORG_INVITATION:${inviteDoc._id.toString()}`
      }).catch(err => console.error('Failed to emit invite notification:', err))
    }
    
    return {
      _id: inviteDoc._id.toString(),
      organizationId: inviteDoc.organizationId.toString(),
      email: inviteDoc.email,
      role: inviteDoc.role,
      token: inviteDoc.token,
      status: inviteDoc.status,
      expiresAt: inviteDoc.expiresAt
    }
  }

  /**
   * Accepts an invitation atomically, creates organization membership, and updates the token status.
   * Prevents parallel-request double-acceptance race conditions using findOneAndUpdate.
   * @param {import('mongodb').Db} db
   * @param {string} token Invitation token string
   * @param {string} uid The Firebase UID of the accepting user
   */
  static async acceptInvitation(db, token, uid) {
    if (!token || !uid) {
      throw new Error('Invitation token and user UID are required')
    }

    const now = new Date()

    // Perform an atomic check-and-update. If it matches, the invitation status shifts 
    // to 'accepted' instantly in a single transaction-like write.
    const result = await db.collection('organization_invitations').findOneAndUpdate(
      {
        token,
        status: 'pending',
        expiresAt: { $gt: now }
      },
      {
        $set: {
          status: 'accepted',
          acceptedAt: now
        }
      },
      {
        returnDocument: 'before' // return document before update to check metadata
      }
    )

    // Handle potential differences in MongoDB Node.js driver versions
    const invitation = result?.value !== undefined ? result.value : result

    // If result is null, it means no pending, unexpired token matches the criteria.
    if (!invitation) {
      const exists = await db.collection('organization_invitations').findOne({ token })
      if (!exists) {
        throw new Error('Invitation token is invalid or does not exist')
      }
      if (exists.status !== 'pending') {
        throw new Error(`Invitation is already ${exists.status}`)
      }
      if (now > new Date(exists.expiresAt)) {
        await db.collection('organization_invitations').updateOne(
          { _id: exists._id },
          { $set: { status: 'expired' } }
        )
        throw new Error('Invitation has expired')
      }
      throw new Error('Invitation is not available for acceptance')
    }

    try {
      // 1. Create membership record in database
      const membership = await MembershipService.createMembership(db, {
        organizationId: invitation.organizationId,
        uid,
        role: invitation.role
      })

      // Emit ORG_INVITATION notification for the newly onboarded user
      await NotificationService.createNotification(db, {
        organizationId: invitation.organizationId,
        uid,
        type: 'ORG_INVITATION',
        title: 'Organization Onboarded',
        message: `Welcome to the organization! Your membership role is "${invitation.role}".`,
        entityType: 'invitation',
        entityId: invitation._id.toString(),
        eventKey: `ORG_INVITATION_ACCEPTED:${invitation._id.toString()}:${uid}`
      }).catch(err => console.error('Failed to emit onboard notification:', err))

      return {
        success: true,
        membership
      }
    } catch (error) {
      // Rollback the atomic status update if membership creation fails
      await db.collection('organization_invitations').updateOne(
        { _id: invitation._id },
        { $set: { status: 'pending', acceptedAt: null } }
      )
      throw error
    }
  }
}
