// src/services/enrollment.js
import { ObjectId } from 'mongodb'
import { NotificationService } from './notification.js'
import { paginateCollection } from '../lib/pagination.js'

export class EnrollmentService {
  /**
   * Enrolls a student in a batch.
   * @param {import('mongodb').Db} db
   * @param {string} orgId
   * @param {string} batchId
   * @param {object} params
   * @param {string} params.uid
   * @param {string} [params.status]
   */
  static async enrollStudent(db, orgId, batchId, { uid, status = 'active' }) {
    if (!orgId || !batchId || !uid) {
      throw new Error('Organization ID, Batch ID, and Student UID are required')
    }

    // 1. Fetch batch and verify scope/status
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

    // ENFORCE Change 1: Can enroll only in ACTIVE batch
    if (batch.status !== 'active') {
      const err = new Error(`Cannot enroll student: Batch status is '${batch.status}' (must be 'active')`)
      err.status = 400
      throw err
    }

    // 2. Fetch membership and verify active status
    let membership = await db.collection('organization_memberships').findOne({
      organizationId: new ObjectId(orgId),
      uid: uid
    })
    if (!membership) {
      // Auto-create active membership for this user if they exist globally in users
      const user = await db.collection('users').findOne({ uid })
      if (user) {
        const newMembership = {
          organizationId: new ObjectId(orgId),
          uid: uid,
          role: 'student',
          status: 'active',
          joinedAt: new Date()
        }
        await db.collection('organization_memberships').insertOne(newMembership)
        membership = newMembership
      } else {
        const err = new Error('Forbidden: Target user is not a member of this organization')
        err.status = 403
        throw err
      }
    }
    if (membership.status !== 'active') {
      const err = new Error(`Forbidden: Target user membership is currently '${membership.status}' (must be 'active')`)
      err.status = 403
      throw err
    }

    // 3. Upsert enrollment record (Change 4: Enrollment Uniqueness)
    const filter = { batchId: new ObjectId(batchId), uid }
    const update = {
      $set: {
        organizationId: new ObjectId(orgId),
        status,
        updatedAt: new Date()
      },
      $setOnInsert: {
        createdAt: new Date()
      }
    }

    const result = await db.collection('batch_enrollments').findOneAndUpdate(
      filter,
      update,
      { upsert: true, returnDocument: 'after' }
    )

    // Trigger ENROLLMENT_CREATED notification
    await NotificationService.createNotification(db, {
      organizationId: new ObjectId(orgId),
      uid,
      type: 'ENROLLMENT_CREATED',
      title: 'Enrolled in Batch',
      message: `You have been enrolled in the cohort "${batch.name}".`,
      entityType: 'batch_enrollment',
      entityId: result._id.toString(),
      eventKey: `ENROLLMENT_CREATED:${batchId}:${uid}`
    }).catch(err => console.error('Failed to emit enrollment notification:', err))

    return {
      ...result,
      _id: result._id.toString(),
      batchId: result.batchId.toString(),
      organizationId: result.organizationId.toString()
    }
  }

  /**
   * Updates batch enrollment status for a student.
   * @param {import('mongodb').Db} db
   * @param {string} orgId
   * @param {string} batchId
   * @param {string} targetUid
   * @param {object} updateData
   * @param {string} updateData.status
   */
  static async updateEnrollment(db, orgId, batchId, targetUid, updateData) {
    if (!orgId || !batchId || !targetUid) {
      throw new Error('Organization ID, Batch ID, and Student UID are required')
    }

    const enrollment = await db.collection('batch_enrollments').findOne({
      batchId: new ObjectId(batchId),
      uid: targetUid
    })
    if (!enrollment) {
      const err = new Error('Enrollment not found')
      err.status = 404
      throw err
    }

    if (enrollment.organizationId.toString() !== orgId) {
      const err = new Error('Bad Request: Enrollment organization mismatch')
      err.status = 400
      throw err
    }

    const current = enrollment.status || enrollment.enrollmentStatus || 'active'
    const next = updateData.status

    // ENFORCE Change 2: Strict Status Transitions
    if (next !== undefined && next !== current) {
      const allowedTransitions = {
        active: ['completed', 'suspended', 'dropped'],
        suspended: ['active', 'dropped'],
        completed: [],
        dropped: []
      }
      const allowed = allowedTransitions[current] || []
      if (!allowed.includes(next)) {
        const err = new Error(`Invalid enrollment status transition from ${current} to ${next}`)
        err.status = 400
        throw err
      }
    }

    const setFields = {
      updatedAt: new Date()
    }
    if (next !== undefined) {
      setFields.status = next
    }

    await db.collection('batch_enrollments').updateOne(
      { _id: enrollment._id },
      { $set: setFields }
    )

    const updated = await db.collection('batch_enrollments').findOne({ _id: enrollment._id })

    // Trigger ENROLLMENT_COMPLETED notification
    if (next === 'completed' && current !== 'completed') {
      const batch = await db.collection('batches').findOne({ _id: enrollment.batchId })
      await NotificationService.createNotification(db, {
        organizationId: new ObjectId(orgId),
        uid: targetUid,
        type: 'ENROLLMENT_COMPLETED',
        title: 'Batch Completed',
        message: `Congratulations! You have completed the cohort "${batch?.name || enrollment.batchId.toString()}".`,
        entityType: 'batch_enrollment',
        entityId: enrollment._id.toString(),
        eventKey: `ENROLLMENT_COMPLETED:${enrollment.batchId.toString()}:${targetUid}`
      }).catch(err => console.error('Failed to emit enrollment completed notification:', err))
    }

    return {
      ...updated,
      _id: updated._id.toString(),
      batchId: updated.batchId.toString(),
      organizationId: updated.organizationId.toString()
    }
  }

  /**
   * Lists student enrollments under a batch.
   * @param {import('mongodb').Db} db
   * @param {string} orgId
   * @param {string} batchId
   * @param {object} options
   */
  static async listBatchEnrollments(db, orgId, batchId, { page = 1, limit = 20, cursor = null } = {}) {
    const query = { batchId: new ObjectId(batchId), organizationId: new ObjectId(orgId) }
    const res = await paginateCollection(db.collection('batch_enrollments'), query, {
      page,
      limit,
      sort: { createdAt: -1 },
      cursor
    })

    const uids = res.data.map(item => item.uid).filter(Boolean)
    const users = await db.collection('users').find({ uid: { $in: uids } }).toArray()
    const userMap = new Map(users.map(u => [u.uid, u]))

    const formatted = res.data.map(item => {
      const user = userMap.get(item.uid)
      return {
        ...item,
        _id: item._id.toString(),
        batchId: item.batchId.toString(),
        organizationId: item.organizationId.toString(),
        displayName: user?.displayName || 'Enrolled Candidate',
        email: user?.email || null
      }
    })

    return {
      data: formatted,
      items: formatted, // backward compatibility
      pagination: res.pagination
    }
  }

  /**
   * Gets organization student dashboard details.
   * @param {import('mongodb').Db} db
   * @param {string} orgId
   * @param {string} uid
   * @param {boolean} [includeHistory]
   */
  static async getStudentDashboard(db, orgId, uid, includeHistory = false) {
    const query = {
      organizationId: new ObjectId(orgId),
      uid: uid
    }

    // ENFORCE Change 3: Dashboard status filtering
    if (!includeHistory) {
      query.status = { $in: ['active', 'completed'] }
    }

    const enrollments = await db.collection('batch_enrollments').find(query).toArray()

    // Resolve batch details
    const resolvedEnrollments = []
    for (const enrollment of enrollments) {
      const batch = await db.collection('batches').findOne({ _id: enrollment.batchId })
      resolvedEnrollments.push({
        ...enrollment,
        _id: enrollment._id.toString(),
        batchId: enrollment.batchId.toString(),
        organizationId: enrollment.organizationId.toString(),
        batch: batch ? {
          _id: batch._id.toString(),
          batchCode: batch.batchCode,
          name: batch.name,
          status: batch.status,
          description: batch.description || ''
        } : null
      })
    }

    const org = await db.collection('organizations').findOne({ _id: new ObjectId(orgId) })
    const membership = await db.collection('organization_memberships').findOne({
      organizationId: new ObjectId(orgId),
      uid: uid
    })

    return {
      organization: org ? {
        _id: org._id.toString(),
        name: org.name,
        slug: org.slug,
        organizationCode: org.organizationCode,
        logoUrl: org.logoUrl || '',
        status: org.status
      } : null,
      membership: membership ? {
        _id: membership._id.toString(),
        role: membership.role,
        status: membership.status,
        joinedAt: membership.joinedAt
      } : null,
      enrollments: resolvedEnrollments
    }
  }

  /**
   * Gets student enrollments across all organizations.
   * @param {import('mongodb').Db} db
   * @param {string} uid
   * @param {object} options
   */
  static async getMyEnrollments(db, uid, { status } = {}) {
    const query = { uid }
    if (status) {
      query.status = status
    } else {
      // Default to active only
      query.status = 'active'
    }

    const enrollments = await db.collection('batch_enrollments').find(query).toArray()
    const resolvedEnrollments = []

    for (const enrollment of enrollments) {
      const batch = await db.collection('batches').findOne({ _id: enrollment.batchId })
      const org = await db.collection('organizations').findOne({ _id: enrollment.organizationId })
      resolvedEnrollments.push({
        ...enrollment,
        _id: enrollment._id.toString(),
        batchId: enrollment.batchId.toString(),
        organizationId: enrollment.organizationId.toString(),
        batch: batch ? {
          _id: batch._id.toString(),
          batchCode: batch.batchCode,
          name: batch.name,
          status: batch.status
        } : null,
        organization: org ? {
          _id: org._id.toString(),
          name: org.name,
          slug: org.slug,
          logoUrl: org.logoUrl || ''
        } : null
      })
    }

    return resolvedEnrollments
  }

  /**
   * Checks the graduation and certificate eligibility of a student in a batch.
   * @param {import('mongodb').Db} db
   * @param {string} orgId
   * @param {string} batchId
   * @param {string} studentUid
   */
  static async checkCertificateEligibility(db, orgId, batchId, studentUid) {
    if (!orgId || !batchId || !studentUid) {
      throw new Error('Org ID, Batch ID, and Student UID are required')
    }

    // 1. Verify organization active status
    const org = await db.collection('organizations').findOne({ _id: new ObjectId(orgId) })
    if (!org || org.status !== 'active') {
      return { eligible: false, reason: 'ORGANIZATION_INACTIVE' }
    }

    // 2. Fetch enrollment and verify status === 'completed'
    const enrollment = await db.collection('batch_enrollments').findOne({
      batchId: new ObjectId(batchId),
      uid: studentUid
    })
    if (!enrollment) {
      return { eligible: false, reason: 'ENROLLMENT_NOT_FOUND' }
    }
    if (enrollment.status !== 'completed') {
      return { eligible: false, reason: 'ENROLLMENT_NOT_COMPLETED', currentStatus: enrollment.status }
    }

    // 3. Verify that a captured payment exists in payments collection
    const payment = await db.collection('payments').findOne({
      batchId: new ObjectId(batchId),
      uid: studentUid,
      status: 'captured'
    })
    if (!payment) {
      return { eligible: false, reason: 'PAYMENT_PENDING' }
    }

    // 4. Fetch all batch assignments
    const assignments = await db.collection('assignments')
      .find({ batchId: new ObjectId(batchId) })
      .toArray()

    if (assignments.length === 0) {
      return { eligible: false, reason: 'NO_ASSIGNMENTS_DEFINED' }
    }

    // 5. Verify that each assignment has an approved submission attempt
    // (individual or group snapshot)
    const approvedSubmissions = await db.collection('submissions')
      .find({
        batchId: new ObjectId(batchId),
        status: 'approved',
        $or: [
          { uid: studentUid },
          { memberSnapshot: studentUid }
        ]
      })
      .toArray()

    const approvedAssignmentIds = new Set(approvedSubmissions.map(s => s.assignmentId.toString()))
    const pendingAssignments = []
    for (const assignment of assignments) {
      if (!approvedAssignmentIds.has(assignment._id.toString())) {
        pendingAssignments.push(assignment.title)
      }
    }

    if (pendingAssignments.length > 0) {
      return {
        eligible: false,
        reason: 'INCOMPLETE_ASSIGNMENTS',
        pendingAssignments
      }
    }

    // 6. Assert no active certificate already exists
    const existingCert = await db.collection('certificates').findOne({
      batchId: new ObjectId(batchId),
      uid: studentUid,
      status: 'active'
    })
    if (existingCert) {
      return { eligible: false, reason: 'CERTIFICATE_ALREADY_EXISTS', certificateNumber: existingCert.certificateNumber }
    }

    return { eligible: true, paymentId: payment.paymentId }
  }
}
