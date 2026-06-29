// src/services/submission.js
import { ObjectId } from 'mongodb'
import { NotificationService } from './notification.js'
import { paginateCollection } from '../lib/pagination.js'

function parseAssignmentId(id) {
  try {
    if (!id) return id
    return new ObjectId(id)
  } catch {
    return id
  }
}

export class SubmissionService {
  /**
   * Creates a new submission for an assignment.
   * @param {import('mongodb').Db} db
   * @param {string} orgId
   * @param {string} batchId
   * @param {string} assignmentId
   * @param {string} studentUid
   * @param {object} payload
   * @param {string} payload.fileUrl
   * @param {string} [payload.comments]
   */
  static async createSubmission(db, orgId, batchId, assignmentId, studentUid, payload) {
    if (!orgId || !batchId || !assignmentId || !studentUid || !payload.fileUrl) {
      throw new Error('Missing required fields for submission creation')
    }

    // 2. Verify existence & scope of batch (Issue 6)
    const batch = await db.collection('batches').findOne({ _id: new ObjectId(batchId) })
    if (!batch) {
      const err = new Error('Batch not found')
      err.status = 404
      throw err
    }
    if (batch.organizationId.toString() !== orgId) {
      const err = new Error('Bad Request: Batch organization mismatch')
      err.status = 400
      throw err
    }

    // 1. Verify existence & scope of assignment (from weekly curriculum checklist)
    const assignment = batch.weeklyAssignments?.find(a => a._id === assignmentId)
    if (!assignment) {
      const err = new Error('Assignment not found')
      err.status = 404
      throw err
    }

    // 3. Verify student active membership & active enrollment status (Issue 7)
    const membership = await db.collection('organization_memberships').findOne({
      organizationId: new ObjectId(orgId),
      uid: studentUid
    })
    if (!membership || membership.status !== 'active') {
      const err = new Error('Forbidden: Active organization membership is required')
      err.status = 403
      throw err
    }

    const enrollment = await db.collection('batch_enrollments').findOne({
      batchId: new ObjectId(batchId),
      uid: studentUid
    })
    if (!enrollment || enrollment.status !== 'active') {
      const statusText = enrollment ? enrollment.status : 'none'
      const err = new Error(`Forbidden: Active enrollment required to submit coursework (current status: '${statusText}')`)
      err.status = 403
      throw err
    }

    // 4. Submission attempt versioning & Group Check
    let attemptNumber = 1
    let submissionDoc = {
      organizationId: new ObjectId(orgId),
      batchId: new ObjectId(batchId),
      assignmentId: parseAssignmentId(assignmentId),
      fileUrl: payload.fileUrl,
      comments: payload.comments || '',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    if (assignment.submissionType === 'group') {
      const group = await db.collection('groups').findOne({
        batchId: new ObjectId(batchId),
        members: studentUid,
        status: 'active'
      })
      if (!group) {
        const err = new Error('Student is not assigned to any group in this batch')
        err.status = 400
        throw err
      }

      const latest = await db.collection('submissions').findOne(
        { groupId: group.groupId, assignmentId: parseAssignmentId(assignmentId) },
        { sort: { attemptNumber: -1 } }
      )

      if (latest) {
        if (latest.status === 'pending') {
          const err = new Error('Cannot submit: A submission is currently pending review')
          err.status = 400
          throw err
        }
        if (latest.status === 'approved' || latest.status === 'rejected') {
          const err = new Error(`Cannot submit: Assignment is already finalized with status '${latest.status}'`)
          err.status = 400
          throw err
        }
        if (latest.status === 'changes_requested') {
          attemptNumber = latest.attemptNumber + 1
        }
      }

      // Snapshot group members on first lock if not already snapshotted
      if (!group.memberSnapshot) {
        await db.collection('groups').updateOne(
          { _id: group._id },
          {
            $set: {
              memberSnapshot: group.members,
              lockedAt: new Date(),
              updatedAt: new Date()
            }
          }
        )
        group.memberSnapshot = group.members
      }

      submissionDoc.groupId = group.groupId
      submissionDoc.submittedBy = studentUid
      submissionDoc.memberSnapshot = group.memberSnapshot
      submissionDoc.attemptNumber = attemptNumber
    } else {
      const latest = await db.collection('submissions').findOne(
        { uid: studentUid, assignmentId: parseAssignmentId(assignmentId) },
        { sort: { attemptNumber: -1 } }
      )

      if (latest) {
        if (latest.status === 'pending') {
          const err = new Error('Cannot submit: A submission is currently pending review')
          err.status = 400
          throw err
        }
        if (latest.status === 'approved' || latest.status === 'rejected') {
          const err = new Error(`Cannot submit: Assignment is already finalized with status '${latest.status}'`)
          err.status = 400
          throw err
        }
        if (latest.status === 'changes_requested') {
          attemptNumber = latest.attemptNumber + 1
        }
      }

      submissionDoc.uid = studentUid
      submissionDoc.attemptNumber = attemptNumber
    }

    try {
      const result = await db.collection('submissions').insertOne(submissionDoc)
      const insertedId = result.insertedId.toString()

      // Update student progress in users collection (for all group members if it's a group assignment)
      const uidsToUpdate = assignment.submissionType === 'group' ? (group?.members || [studentUid]) : [studentUid]
      await db.collection('users').updateMany(
        { uid: { $in: uidsToUpdate } },
        {
          $set: {
            [`progress.week${assignment.week}.status`]: 'submitted',
            [`progress.week${assignment.week}.submission`]: payload.fileUrl,
            [`progress.week${assignment.week}.updatedAt`]: new Date()
          }
        }
      )

      // Notify the student (or group members) about the submission received
      const notifyUids = assignment.submissionType === 'group' ? submissionDoc.memberSnapshot : [studentUid]
      for (const targetUid of notifyUids) {
        await NotificationService.createNotification(db, {
          organizationId: new ObjectId(orgId),
          uid: targetUid,
          type: 'SUBMISSION_RECEIVED',
          title: 'Submission Received',
          message: `Your attempt ${attemptNumber} for assignment "${assignment.title}" has been received.`,
          entityType: 'submission',
          entityId: insertedId,
          eventKey: `SUBMISSION_RECEIVED:${assignmentId}:${attemptNumber}:${targetUid}`
        }).catch(err => console.error('Failed to emit submission received notification:', err))
      }

      return {
        _id: insertedId,
        ...submissionDoc,
        organizationId: orgId,
        batchId: batchId,
        assignmentId: assignmentId
      }
    } catch (err) {
      if (err.code === 11000) {
        const error = new Error(`Submission already exists for attempt ${attemptNumber}`)
        error.status = 409
        throw error
      }
      throw err
    }
  }

  /**
   * Retrieves a single submission.
   * @param {import('mongodb').Db} db
   * @param {string} orgId
   * @param {string} submissionId
   */
  static async getSubmission(db, orgId, submissionId) {
    if (!submissionId || !orgId) {
      throw new Error('Submission ID and Organization ID are required')
    }

    const submission = await db.collection('submissions').findOne({ _id: new ObjectId(submissionId) })
    if (!submission || submission.organizationId.toString() !== orgId) {
      return null
    }

    return {
      ...submission,
      _id: submission._id.toString(),
      organizationId: submission.organizationId.toString(),
      batchId: submission.batchId.toString(),
      assignmentId: submission.assignmentId.toString()
    }
  }

  /**
   * Lists submissions for a specific batch/assignment.
   * @param {import('mongodb').Db} db
   * @param {string} orgId
   * @param {object} filters
   */
  static async listSubmissions(db, orgId, { batchId, assignmentId, status, page = 1, limit = 20, cursor = null } = {}) {
    if (!orgId) {
      throw new Error('Organization ID is required')
    }

    const query = { organizationId: new ObjectId(orgId) }
    if (batchId) {
      query.batchId = new ObjectId(batchId)
    }
    if (assignmentId) {
      query.assignmentId = parseAssignmentId(assignmentId)
    }
    if (status) {
      query.status = status
    }

    const res = await paginateCollection(db.collection('submissions'), query, {
      page,
      limit,
      sort: { createdAt: -1 },
      cursor
    })

    const formatted = res.data.map(item => ({
      ...item,
      _id: item._id.toString(),
      organizationId: item.organizationId.toString(),
      batchId: item.batchId.toString(),
      assignmentId: item.assignmentId.toString()
    }))

    return {
      data: formatted,
      items: formatted, // backward compatibility
      pagination: res.pagination
    }
  }

  /**
   * Submits review feedback/grading.
   * @param {import('mongodb').Db} db
   * @param {string} orgId
   * @param {string} submissionId
   * @param {string} reviewerUid
   * @param {object} reviewPayload
   * @param {string} reviewPayload.status
   * @param {any} [reviewPayload.grade]
   * @param {string} [reviewPayload.feedback]
   * @param {string} [reviewerRole]
   */
  static async submitReview(db, orgId, submissionId, reviewerUid, reviewPayload, reviewerRole = '') {
    if (!orgId || !submissionId || !reviewerUid || !reviewPayload.status) {
      throw new Error('Missing required fields for review submission')
    }

    const submission = await db.collection('submissions').findOne({ _id: new ObjectId(submissionId) })
    if (!submission) {
      const err = new Error('Submission not found')
      err.status = 404
      throw err
    }

    if (submission.organizationId.toString() !== orgId) {
      const err = new Error('Bad Request: Submission organization mismatch')
      err.status = 400
      throw err
    }

    // ENFORCE Issue 4: Review Terminal Protection
    if (submission.status === 'approved' || submission.status === 'rejected') {
      const err = new Error(`Cannot review: Submission is already finalized with status '${submission.status}'`)
      err.status = 400
      throw err
    }

    const nextStatus = reviewPayload.status
    const validStatuses = ['approved', 'rejected', 'changes_requested']
    if (!validStatuses.includes(nextStatus)) {
      const err = new Error('Invalid review status')
      err.status = 400
      throw err
    }

    const reviewObj = {
      grade: reviewPayload.grade || '',
      feedback: reviewPayload.feedback || '',
      reviewedBy: reviewerUid,
      reviewerRole: reviewerRole,
      reviewedAt: new Date()
    }

    await db.collection('submissions').updateOne(
      { _id: submission._id },
      {
        $set: {
          status: nextStatus,
          review: reviewObj,
          updatedAt: new Date()
        }
      }
    )

    // Update student progress in users collection
    try {
      const batch = await db.collection('batches').findOne({ _id: submission.batchId })
      const assignment = batch?.weeklyAssignments?.find(a => a._id === submission.assignmentId.toString())
      const week = assignment?.week
      if (week) {
        const uidsToUpdate = submission.groupId ? (submission.memberSnapshot || [submission.uid]) : [submission.uid]
        
        for (const targetUid of uidsToUpdate) {
          const updates = {
            [`progress.week${week}.status`]: nextStatus,
            [`progress.week${week}.feedback`]: reviewObj.feedback || '',
            [`progress.week${week}.grade`]: reviewObj.grade || '',
            [`progress.week${week}.updatedAt`]: new Date()
          }

          // If approved, check if all other weeks in weeklyAssignments are approved
          if (nextStatus === 'approved') {
            const user = await db.collection('users').findOne({ uid: targetUid })
            const progress = user?.progress || {}
            const allApproved = batch.weeklyAssignments.every(a => {
              if (a.week === week) return true
              return progress[`week${a.week}`]?.status === 'approved'
            })
            if (allApproved) {
              updates['progress.isCertified'] = true
            }

            const nextWeekNumber = week + 1
            const hasNextWeek = batch.weeklyAssignments?.some(a => a.week === nextWeekNumber)
            if (hasNextWeek) {
              updates[`progress.week${nextWeekNumber}.status`] = 'pending'
            }
          } else {
            updates['progress.isCertified'] = false
          }

          await db.collection('users').updateOne({ uid: targetUid }, { $set: updates })
        }
      }
    } catch (err) {
      console.error('Failed to update student user progress in review:', err)
    }

    const updated = await db.collection('submissions').findOne({ _id: submission._id })

    // Trigger review notification
    try {
      const batch = await db.collection('batches').findOne({ _id: submission.batchId })
      const assignment = batch?.weeklyAssignments?.find(a => a._id === submission.assignmentId.toString())
      const notifyUids = submission.groupId ? (submission.memberSnapshot || []) : [submission.uid]
      const statusTypeMap = {
        approved: 'SUBMISSION_APPROVED',
        changes_requested: 'SUBMISSION_CHANGES_REQUESTED',
        rejected: 'SUBMISSION_REJECTED'
      }
      const type = statusTypeMap[nextStatus]
      const titleMap = {
        approved: 'Submission Approved',
        changes_requested: 'Changes Requested',
        rejected: 'Submission Rejected'
      }
      const title = titleMap[nextStatus]
      const msgMap = {
        approved: `Your submission for assignment "${assignment?.title || 'Coursework'}" has been approved.`,
        changes_requested: `Changes have been requested for your submission of "${assignment?.title || 'Coursework'}".`,
        rejected: `Your submission for assignment "${assignment?.title || 'Coursework'}" was rejected.`
      }
      const message = msgMap[nextStatus]

      for (const targetUid of notifyUids) {
        await NotificationService.createNotification(db, {
          organizationId: submission.organizationId,
          uid: targetUid,
          type,
          title,
          message,
          entityType: 'submission',
          entityId: submission._id.toString(),
          eventKey: `SUBMISSION_REVIEWED:${submission._id.toString()}:${nextStatus}:${targetUid}`
        })
      }
    } catch (err) {
      console.error('Failed to emit review notification:', err)
    }

    return {
      ...updated,
      _id: updated._id.toString(),
      organizationId: updated.organizationId.toString(),
      batchId: updated.batchId.toString(),
      assignmentId: updated.assignmentId.toString()
    }
  }
}
