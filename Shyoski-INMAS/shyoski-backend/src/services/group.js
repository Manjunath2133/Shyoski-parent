// src/services/group.js
import { ObjectId } from 'mongodb'
import { NotificationService } from './notification.js'
import { AuditService } from './audit.js'

export class GroupService {
  /**
   * Helper to determine if a group has started work (locked)
   */
  static async isGroupLocked(db, groupId) {
    if (!groupId) return false
    const submission = await db.collection('submissions').findOne({
      groupId,
      status: { $in: ['approved', 'pending', 'changes_requested'] }
    })
    if (submission) {
      return true
    }
    return false
  }

  /**
   * Helper to handle group membership exit & ownership transfer
   */
  static async transferGroupOwnershipOrArchive(db, group, studentUid, actorDisplayName) {
    const updatedMembers = group.members.filter(m => m !== studentUid)
    
    if (updatedMembers.length === 0) {
      await db.collection('groups').updateOne(
        { _id: new ObjectId(group._id) },
        {
          $set: {
            members: [],
            ownerUid: '',
            status: 'active',
            updatedAt: new Date()
          }
        }
      )
    } else {
      // If studentUid was the owner, promote the next oldest member (first in members array)
      const newOwnerUid = group.ownerUid === studentUid ? updatedMembers[0] : group.ownerUid
      await db.collection('groups').updateOne(
        { _id: new ObjectId(group._id) },
        {
          $set: {
            members: updatedMembers,
            ownerUid: newOwnerUid,
            updatedAt: new Date()
          }
        }
      )

      // Notify remaining members
      for (const memberUid of updatedMembers) {
        await NotificationService.createNotification(db, {
          organizationId: group.organizationId,
          uid: memberUid,
          type: 'GROUP_JOINED',
          title: 'Member Left Group',
          message: `${actorDisplayName || 'A member'} has left the group.`,
          entityType: 'group',
          entityId: group.groupId
        })
      }

      // Notify the new owner if promoted
      if (group.ownerUid === studentUid) {
        await NotificationService.createNotification(db, {
          organizationId: group.organizationId,
          uid: newOwnerUid,
          type: 'SYSTEM',
          title: 'Group Ownership Promoted',
          message: `You have been promoted to the owner of group "${group.name}".`,
          entityType: 'group',
          entityId: group.groupId,
          eventKey: `GROUP_PROMOTION:${group.groupId}:${newOwnerUid}`
        })
      }
    }
  }

  /**
   * Creates a new group.
   */
  static async createGroup(db, orgId, batchId, name, ownerUid) {
    const groupName = name?.trim()
    if (!groupName) {
      throw { status: 400, message: 'Group name is required' }
    }

    // Check group name uniqueness under this batch
    const nameExists = await db.collection('groups').findOne({
      batchId: new ObjectId(batchId),
      name: { $regex: new RegExp(`^${groupName}$`, 'i') },
      status: 'active'
    })
    if (nameExists) {
      throw { status: 409, message: 'A group with this name already exists in the batch' }
    }

    // Check if user is currently in another active group in this batch
    const currentGroup = await db.collection('groups').findOne({
      batchId: new ObjectId(batchId),
      members: ownerUid,
      status: 'active'
    })

    if (currentGroup) {
      const isLocked = await GroupService.isGroupLocked(db, currentGroup.groupId)
      if (isLocked) {
        throw { status: 400, message: 'Cannot switch groups: Group work has already started for your current group' }
      }
      
      const ownerUser = await db.collection('users').findOne({ uid: ownerUid })
      const ownerName = ownerUser?.displayName || ownerUser?.email || 'Anonymous'
      await GroupService.transferGroupOwnershipOrArchive(db, currentGroup, ownerUid, ownerName)
    }

    const generatedGroupId = `GRP-${Math.floor(1000 + Math.random() * 9000)}`
    const newGroup = {
      organizationId: new ObjectId(orgId),
      batchId: new ObjectId(batchId),
      name: groupName,
      groupCode: generatedGroupId,
      groupId: generatedGroupId,
      ownerUid: ownerUid,
      members: [ownerUid],
      repoUrl: null,
      memberSnapshot: null,
      lockedAt: null,
      status: 'pending_approval',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await db.collection('groups').insertOne(newGroup)
    await db.collection('users').updateOne({ uid: ownerUid }, { $set: { groupId: generatedGroupId } })

    await AuditService.createLog(db, {
      action: 'GROUP_CREATED',
      actorUid: ownerUid,
      organizationId: orgId,
      resourceType: 'group',
      resourceId: newGroup._id.toString(),
      metadata: {
        groupCode: newGroup.groupCode,
        batchId: batchId.toString()
      }
    })

    return newGroup
  }

  /**
   * Joins an active group.
   */
  static async joinGroup(db, orgId, batchId, group, actorUid) {
    if (group.status !== 'active') {
      throw { status: 400, message: 'Group is not active' }
    }

    if (group.members.length >= (group.maxMembers || 4)) {
      throw { status: 400, message: 'Group is full' }
    }

    if (group.members.includes(actorUid)) {
      throw { status: 400, message: 'Already in group' }
    }

    // Check target group lock
    const targetLocked = await GroupService.isGroupLocked(db, group.groupId)
    if (targetLocked) {
      throw { status: 400, message: 'Cannot join group: Group work has already started for this group' }
    }

    // Check current group switching (active, pending, or rejected)
    const currentGroup = await db.collection('groups').findOne({
      batchId: new ObjectId(batchId),
      members: actorUid,
      status: { $in: ['active', 'pending_approval', 'rejected'] }
    })

    const joiningUser = await db.collection('users').findOne({ uid: actorUid })
    const actorDisplayName = joiningUser?.displayName || joiningUser?.email || 'Anonymous'

    if (currentGroup) {
      if (currentGroup.status === 'active') {
        const isLocked = await GroupService.isGroupLocked(db, currentGroup.groupId)
        if (isLocked) {
          throw { status: 400, message: 'Cannot switch groups: Group work has already started for your current group' }
        }
      }
      await GroupService.transferGroupOwnershipOrArchive(db, currentGroup, actorUid, actorDisplayName)
    }

    await db.collection('groups').updateOne(
      { _id: new ObjectId(group._id) },
      {
        $push: { members: actorUid },
        $set: { updatedAt: new Date() }
      }
    )
    
    await db.collection('users').updateOne({ uid: actorUid }, { $set: { groupId: group.groupId } })

    // Notify all members including the joining user
    const updatedGroupMembers = [...group.members, actorUid]
    for (const memberUid of updatedGroupMembers) {
      await NotificationService.createNotification(db, {
        organizationId: group.organizationId,
        uid: memberUid,
        type: 'GROUP_JOINED',
        title: 'Group Joined',
        message: `${actorDisplayName} has joined your group "${group.name}".`,
        entityType: 'group',
        entityId: group.groupId,
        eventKey: `GROUP_JOINED:${group.groupId}:${actorUid}:${memberUid}`
      })
    }

    return group.name
  }

  /**
   * Leaves a group.
   */
  static async leaveGroup(db, orgId, batchId, group, actorUid) {
    if (!group.members.includes(actorUid)) {
      throw { status: 400, message: 'You are not a member of this group' }
    }

    if (group.status === 'active') {
      const locked = await GroupService.isGroupLocked(db, group.groupId)
      if (locked) {
        throw { status: 400, message: 'Cannot leave group: Group work has already started for your current group' }
      }
    }

    const leavingUser = await db.collection('users').findOne({ uid: actorUid })
    const actorDisplayName = leavingUser?.displayName || leavingUser?.email || 'Anonymous'

    await GroupService.transferGroupOwnershipOrArchive(db, group, actorUid, actorDisplayName)
    await db.collection('users').updateOne({ uid: actorUid }, { $set: { groupId: null } })

    return true
  }

  /**
   * Registers a group repository URL.
   */
  static async registerRepository(db, orgId, batchId, group, repoUrl, actorUid) {
    const cleanRepoUrl = repoUrl?.trim()
    if (!cleanRepoUrl) {
      throw { status: 400, message: 'repoUrl is required' }
    }

    if (!cleanRepoUrl.startsWith('http://') && !cleanRepoUrl.startsWith('https://')) {
      throw { status: 400, message: 'Invalid URL format' }
    }

    // Rule: cannot change repository URL after first submission
    const submissionExists = await db.collection('submissions').findOne({ groupId: group.groupId })
    if (submissionExists) {
      throw { status: 400, message: 'Repository is locked after submission' }
    }

    // Register repoUrl and trigger lock snapshot
    await db.collection('groups').updateOne(
      { _id: new ObjectId(group._id) },
      {
        $set: {
          repoUrl: cleanRepoUrl,
          memberSnapshot: group.members,
          lockedAt: new Date(),
          updatedAt: new Date()
        }
      }
    )

    // Notify all members of the group
    for (const memberUid of group.members) {
      await NotificationService.createNotification(db, {
        organizationId: group.organizationId,
        uid: memberUid,
        type: 'GROUP_LOCKED',
        title: 'Group Project Locked',
        message: `Project repository URL registered: ${cleanRepoUrl}. Group members snapshot frozen.`,
        entityType: 'group',
        entityId: group.groupId,
        eventKey: `GROUP_LOCKED:${group.groupId}:${memberUid}`
      })
    }

    await AuditService.createLog(db, {
      action: 'GROUP_LOCKED',
      actorUid,
      organizationId: orgId,
      resourceType: 'group',
      resourceId: group._id.toString(),
      metadata: {
        repoUrl: cleanRepoUrl,
        lockedAt: new Date()
      }
    })

    // Automatically submit the group assignment if it exists in the batch
    const batch = await db.collection('batches').findOne({ _id: new ObjectId(batchId) })
    const groupAssignment = batch?.weeklyAssignments?.find(a => a.submissionType === 'group')
    if (groupAssignment) {
      const parseAssignmentId = (id) => {
        try { return new ObjectId(id) } catch (e) { return id }
      }
      const existing = await db.collection('submissions').findOne({
        groupId: group.groupId,
        assignmentId: parseAssignmentId(groupAssignment._id)
      })
      if (!existing) {
        const submissionDoc = {
          organizationId: new ObjectId(orgId),
          batchId: new ObjectId(batchId),
          assignmentId: parseAssignmentId(groupAssignment._id),
          fileUrl: cleanRepoUrl,
          comments: 'Auto-submitted via Repository Registration',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
          groupId: group.groupId,
          submittedBy: actorUid,
          memberSnapshot: group.members,
          attemptNumber: 1
        }
        await db.collection('submissions').insertOne(submissionDoc)

        // Update progress of all group members to 'submitted'
        await db.collection('users').updateMany(
          { uid: { $in: group.members } },
          {
            $set: {
              [`progress.week${groupAssignment.week}.status`]: 'submitted',
              [`progress.week${groupAssignment.week}.submission`]: cleanRepoUrl,
              [`progress.week${groupAssignment.week}.updatedAt`]: new Date()
            }
          }
        )
      }
    }

    const updated = await db.collection('groups').findOne({ _id: new ObjectId(group._id) })
    return updated
  }
}
