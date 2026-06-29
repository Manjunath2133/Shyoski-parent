// src/services/dashboard.js
import { ObjectId } from 'mongodb'
import { EnrollmentService } from './enrollment.js'

export class DashboardService {
  /**
   * Helper utility to safely resolve user display names to prevent PII leakage.
   * @param {import('mongodb').Db} db
   * @param {string[]} uids
   */
  static async resolveUserNames(db, uids) {
    if (!uids || uids.length === 0) return {}
    try {
      const users = await db.collection('users').find({ uid: { $in: uids } }).toArray()
      const map = {}
      for (const u of users) {
        map[u.uid] = u.displayName || 'Anonymous User'
      }
      return map
    } catch (err) {
      console.error('⚠️ Failed to resolve user display names:', err)
      return {}
    }
  }

  /**
   * Super Admin Dashboard Platform-Wide Analytics
   * @param {import('mongodb').Db} db
   */
  static async getSuperAdminDashboard(db) {
    const totalOrganizations = await db.collection('organizations').countDocuments()
    const activeOrganizations = await db.collection('organizations').countDocuments({ status: 'active' })
    const suspendedOrganizations = await db.collection('organizations').countDocuments({ status: 'suspended' })
    const totalUsers = await db.collection('users').countDocuments()

    const totalStudents = await db.collection('organization_memberships').countDocuments({ role: 'student' })
    const totalMentors = await db.collection('organization_memberships').countDocuments({ role: 'mentor' })
    const totalEvaluators = await db.collection('organization_memberships').countDocuments({ role: 'evaluator' })

    const totalBatches = await db.collection('batches').countDocuments()
    const activeBatches = await db.collection('batches').countDocuments({ status: 'active' })

    const totalCertificates = await db.collection('certificates').countDocuments()
    const activeCertificates = await db.collection('certificates').countDocuments({ status: 'active' })

    const totalPaymentsCaptured = await db.collection('payments').countDocuments({ status: 'captured' })

    // Recent items
    const recentOrgs = await db.collection('organizations').find().sort({ createdAt: -1 }).limit(5).toArray()
    const recentCerts = await db.collection('certificates').find().sort({ createdAt: -1 }).limit(5).toArray()
    const recentPayments = await db.collection('payments').find().sort({ createdAt: -1 }).limit(5).toArray()

    // Resolve user display names for certs and payments
    const uids = Array.from(new Set([
      ...recentCerts.map(c => c.uid),
      ...recentPayments.map(p => p.uid)
    ]))
    const userNamesMap = await DashboardService.resolveUserNames(db, uids)

    // Format lists cleanly (PII-free)
    const formattedOrgs = recentOrgs.map(org => ({
      _id: org._id.toString(),
      name: org.name,
      slug: org.slug,
      status: org.status,
      createdAt: org.createdAt
    }))

    const formattedCerts = recentCerts.map(cert => ({
      _id: cert._id.toString(),
      certificateNumber: cert.certificateNumber,
      uid: cert.uid,
      displayName: userNamesMap[cert.uid] || 'Unknown User',
      status: cert.status,
      createdAt: cert.createdAt
    }))

    const formattedPayments = recentPayments.map(pay => ({
      _id: pay._id.toString(),
      orderId: pay.orderId,
      paymentId: pay.paymentId,
      amount: pay.amount,
      status: pay.status,
      uid: pay.uid,
      displayName: userNamesMap[pay.uid] || 'Unknown User',
      createdAt: pay.createdAt
    }))

    // Construct merged/sorted activity stream
    const recentActivity = [
      ...formattedOrgs.map(org => ({
        type: 'organization_created',
        title: `Organization Created: ${org.name}`,
        timestamp: org.createdAt,
        metadata: { orgId: org._id, slug: org.slug }
      })),
      ...formattedCerts.map(cert => ({
        type: 'certificate_issued',
        title: `Certificate Issued: ${cert.certificateNumber}`,
        timestamp: cert.createdAt,
        metadata: { certificateNumber: cert.certificateNumber, uid: cert.uid, displayName: cert.displayName }
      })),
      ...formattedPayments.map(pay => ({
        type: 'payment_captured',
        title: `Payment ${pay.status.toUpperCase()}: ${pay.orderId}`,
        timestamp: pay.createdAt,
        metadata: { orderId: pay.orderId, amount: pay.amount, uid: pay.uid, displayName: pay.displayName }
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10)

    return {
      summary: {
        totalOrganizations,
        activeOrganizations,
        suspendedOrganizations,
        totalUsers,
        totalStudents,
        totalMentors,
        totalEvaluators,
        totalBatches,
        activeBatches,
        totalCertificates,
        activeCertificates,
        totalPaymentsCaptured
      },
      recentOrganizations: formattedOrgs,
      recentCertificates: formattedCerts,
      recentPayments: formattedPayments,
      recentActivity: recentActivity || [],
      dashboardVersion: 'v1',
      generatedAt: new Date().toISOString()
    }
  }

  /**
   * Organization Admin Dashboard Analytics
   * @param {import('mongodb').Db} db
   * @param {string} orgId
   */
  static async getOrganizationDashboard(db, orgId) {
    const orgObjectId = new ObjectId(orgId)
    const org = await db.collection('organizations').findOne({ _id: orgObjectId })
    if (!org) {
      throw new Error('Organization not found')
    }

    const orgSummary = {
      name: org.name,
      slug: org.slug,
      status: org.status,
      organizationCode: org.organizationCode,
      logoUrl: org.logoUrl || ''
    }

    // 1. Consolidated active memberships count and role aggregation
    const memberCounts = await db.collection('organization_memberships').aggregate([
      { $match: { organizationId: orgObjectId, status: 'active' } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]).toArray()

    let activeMemberships = 0
    let activeStudents = 0
    let activeMentors = 0
    let activeEvaluators = 0

    for (const item of memberCounts) {
      activeMemberships += item.count
      if (item._id === 'student') activeStudents = item.count
      else if (item._id === 'mentor') activeMentors = item.count
      else if (item._id === 'evaluator') activeEvaluators = item.count
    }

    // 2. Consolidated batch status aggregation
    const batchCounts = await db.collection('batches').aggregate([
      { $match: { organizationId: orgObjectId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray()

    let activeBatches = 0
    let draftBatches = 0
    let inactiveBatches = 0
    let archivedBatches = 0

    for (const item of batchCounts) {
      if (item._id === 'active') activeBatches = item.count
      else if (item._id === 'draft') draftBatches = item.count
      else if (item._id === 'inactive') inactiveBatches = item.count
      else if (item._id === 'archived') archivedBatches = item.count
    }

    // 3. Consolidated submissions status aggregation
    const submissionCounts = await db.collection('submissions').aggregate([
      { $match: { organizationId: orgObjectId, status: { $in: ['pending', 'approved'] } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray()

    let submissionsPendingReview = 0
    let approvedSubmissions = 0

    for (const item of submissionCounts) {
      if (item._id === 'pending') submissionsPendingReview = item.count
      else if (item._id === 'approved') approvedSubmissions = item.count
    }

    const capturedPayments = await db.collection('payments').countDocuments({ organizationId: orgObjectId, status: 'captured' })
    const issuedCertificates = await db.collection('certificates').countDocuments({ organizationId: orgObjectId })
    const activeCertificates = await db.collection('certificates').countDocuments({ organizationId: orgObjectId, status: 'active' })

    // Job Metrics (Phase 12)
    const publishedJobs = await db.collection('jobs').countDocuments({ organizationId: orgObjectId, status: 'published' })
    const activeApplications = await db.collection('job_applications').countDocuments({
      organizationId: orgObjectId,
      status: { $nin: ['rejected', 'withdrawn', 'selected'] }
    })
    const selectedCandidates = await db.collection('job_applications').countDocuments({ organizationId: orgObjectId, status: 'selected' })

    // Completion metrics
    const activeEnrollments = await db.collection('batch_enrollments').countDocuments({ organizationId: orgObjectId, status: 'active' })
    const completedEnrollments = await db.collection('batch_enrollments').countDocuments({ organizationId: orgObjectId, status: 'completed' })
    const completionRate = activeEnrollments > 0 ? parseFloat(((completedEnrollments / activeEnrollments) * 100).toFixed(2)) : 0.0

    // Recent items
    const recentEnrollments = await db.collection('batch_enrollments').find({ organizationId: orgObjectId }).sort({ createdAt: -1 }).limit(5).toArray()
    const recentSubmissions = await db.collection('submissions').find({ organizationId: orgObjectId }).sort({ createdAt: -1 }).limit(5).toArray()
    const recentCertificates = await db.collection('certificates').find({ organizationId: orgObjectId }).sort({ createdAt: -1 }).limit(5).toArray()

    // Resolve user display names
    const uids = Array.from(new Set([
      ...recentEnrollments.map(e => e.uid),
      ...recentSubmissions.map(s => s.uid),
      ...recentCertificates.map(c => c.uid)
    ]))
    const userNamesMap = await DashboardService.resolveUserNames(db, uids)

    // Format lists
    const formattedEnrollments = recentEnrollments.map(en => ({
      _id: en._id.toString(),
      batchId: en.batchId.toString(),
      uid: en.uid,
      displayName: userNamesMap[en.uid] || 'Unknown User',
      status: en.status,
      createdAt: en.createdAt
    }))

    const formattedSubmissions = recentSubmissions.map(sub => ({
      _id: sub._id.toString(),
      batchId: sub.batchId.toString(),
      assignmentId: sub.assignmentId.toString(),
      uid: sub.uid,
      displayName: userNamesMap[sub.uid] || 'Unknown User',
      status: sub.status,
      createdAt: sub.createdAt
    }))

    const formattedCertificates = recentCertificates.map(cert => ({
      _id: cert._id.toString(),
      certificateNumber: cert.certificateNumber,
      uid: cert.uid,
      displayName: userNamesMap[cert.uid] || 'Unknown User',
      status: cert.status,
      createdAt: cert.createdAt
    }))

    // Construct merged/sorted activity stream
    const recentActivity = [
      ...formattedEnrollments.map(en => ({
        type: 'student_enrolled',
        title: `Student Enrolled in Batch`,
        timestamp: en.createdAt,
        metadata: { batchId: en.batchId, uid: en.uid, displayName: en.displayName }
      })),
      ...formattedSubmissions.map(sub => ({
        type: 'submission_created',
        title: `Submitted Coursework: ${sub.status}`,
        timestamp: sub.createdAt,
        metadata: { submissionId: sub._id, batchId: sub.batchId, uid: sub.uid, displayName: sub.displayName }
      })),
      ...formattedCertificates.map(cert => ({
        type: 'certificate_issued',
        title: `Certificate Claimed: ${cert.certificateNumber}`,
        timestamp: cert.createdAt,
        metadata: { certificateNumber: cert.certificateNumber, uid: cert.uid, displayName: cert.displayName }
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10)

    return {
      summary: {
        organization: orgSummary,
        activeMemberships,
        activeStudents,
        students: activeStudents, // alias
        activeMentors,
        mentors: activeMentors, // alias
        activeEvaluators,
        evaluators: activeEvaluators, // alias
        activeBatches,
        draftBatches,
        inactiveBatches,
        archivedBatches,
        submissionsPendingReview,
        approvedSubmissions,
        capturedPayments,
        issuedCertificates,
        activeCertificates,
        certificates: issuedCertificates, // alias
        completionMetrics: {
          activeEnrollments,
          completedEnrollments,
          completionRate
        },
        jobMetrics: {
          publishedJobs,
          activeApplications,
          selectedCandidates
        }
      },
      completionMetrics: {
        activeEnrollments,
        completedEnrollments,
        completionRate
      },
      recentEnrollments: formattedEnrollments,
      recentSubmissions: formattedSubmissions,
      recentCertificates: formattedCertificates,
      recentActivity: recentActivity || [],
      dashboardVersion: 'v1',
      generatedAt: new Date().toISOString()
    }
  }

  /**
   * Evaluator Dashboard Analytics
   * @param {import('mongodb').Db} db
   * @param {string} orgId
   * @param {string} uid
   */
  static async getEvaluatorDashboard(db, orgId, uid) {
    const orgObjectId = new ObjectId(orgId)

    // Get active assignments
    const assignments = await db.collection('batch_assignments').find({
      uid,
      role: 'evaluator',
      status: 'active'
    }).toArray()
    const assignedBatchIds = assignments.map(a => a.batchId)

    // Resolve non-archived batches belonging to this organization
    const batches = await db.collection('batches').find({
      _id: { $in: assignedBatchIds },
      organizationId: orgObjectId,
      status: { $ne: 'archived' }
    }).toArray()
    const batchIds = batches.map(b => b._id)

    const assignedBatchesCount = batches.length

    // Submissions metrics in these batches
    let pendingReviewQueueCount = 0
    let approvedSubmissionsCount = 0
    let changesRequestedCount = 0

    if (batchIds.length > 0) {
      const counts = await db.collection('submissions').aggregate([
        { $match: { batchId: { $in: batchIds }, status: { $in: ['pending', 'approved', 'changes_requested'] } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]).toArray()

      for (const item of counts) {
        if (item._id === 'pending') pendingReviewQueueCount = item.count
        else if (item._id === 'changes_requested') changesRequestedCount = item.count
      }
    }

    // Get evaluator membership for clear history timestamp
    const membership = await db.collection('organization_memberships').findOne({
      organizationId: orgObjectId,
      uid
    })
    const clearedAt = membership?.evaluationHistoryClearedAt || null

    // Find submissions reviewed by this evaluator in this org
    const reviewedQuery = {
      'review.reviewedBy': uid,
      organizationId: orgObjectId
    }
    if (clearedAt) {
      reviewedQuery['review.reviewedAt'] = { $gt: clearedAt }
    }
    const reviewedSubmissions = await db.collection('submissions').find(reviewedQuery).toArray()

    // Calculate approved count specifically for this evaluator's active list
    approvedSubmissionsCount = reviewedSubmissions.filter(s => s.status === 'approved').length

    let averageReviewTurnaroundHours = 0.0
    const validReviewed = reviewedSubmissions.filter(s => s.review?.reviewedAt && s.createdAt)
    if (validReviewed.length > 0) {
      const totalHours = validReviewed.reduce((sum, s) => {
        const hours = (new Date(s.review.reviewedAt) - new Date(s.createdAt)) / (1000 * 60 * 60)
        return sum + hours
      }, 0)
      averageReviewTurnaroundHours = parseFloat((totalHours / validReviewed.length).toFixed(1))
    }

    // Batch Performance Summaries
    const batchPerformanceSummaries = []
    for (const batch of batches) {
      const total = await db.collection('submissions').countDocuments({ batchId: batch._id })
      const pending = await db.collection('submissions').countDocuments({ batchId: batch._id, status: 'pending' })
      const approved = await db.collection('submissions').countDocuments({ batchId: batch._id, status: 'approved' })
      const changesReq = await db.collection('submissions').countDocuments({ batchId: batch._id, status: 'changes_requested' })
      batchPerformanceSummaries.push({
        batchId: batch._id.toString(),
        batchName: batch.name,
        batchCode: batch.batchCode,
        metrics: {
          total,
          pending,
          approved,
          changesRequested: changesReq
        }
      })
    }

    // Recent reviews by this evaluator
    const recentReviews = reviewedSubmissions
      .sort((a, b) => new Date(b.review.reviewedAt) - new Date(a.review.reviewedAt))
      .slice(0, 5)

    const uids = Array.from(new Set(recentReviews.map(r => r.uid || r.submittedBy).filter(Boolean)))
    const groupIds = Array.from(new Set(recentReviews.map(r => r.groupId).filter(Boolean)))
    
    const userNamesMap = await DashboardService.resolveUserNames(db, uids)

    const groupsList = groupIds.length > 0 ? await db.collection('groups').find({ groupId: { $in: groupIds } }).toArray() : []
    const groupNamesMap = {}
    for (const g of groupsList) {
      groupNamesMap[g.groupId] = g.name
    }

    const formattedReviews = recentReviews.map(rev => {
      let displayName = 'Unknown User'
      if (rev.groupId) {
        const groupName = groupNamesMap[rev.groupId] || rev.groupId
        const submitterName = userNamesMap[rev.submittedBy] || 'Unknown Student'
        displayName = `Group: ${groupName} (${submitterName})`
      } else {
        displayName = userNamesMap[rev.uid] || 'Unknown User'
      }

      return {
        _id: rev._id.toString(),
        batchId: rev.batchId.toString(),
        assignmentId: rev.assignmentId.toString(),
        uid: rev.uid || rev.submittedBy,
        displayName,
        status: rev.status,
        grade: rev.review?.grade || '',
        reviewedAt: rev.review?.reviewedAt
      }
    })

    const recentActivity = formattedReviews.map(rev => ({
      type: 'submission_reviewed',
      title: `Reviewed Submission for Assignment`,
      timestamp: rev.reviewedAt,
      metadata: {
        submissionId: rev._id,
        batchId: rev.batchId,
        uid: rev.uid,
        displayName: rev.displayName,
        status: rev.status,
        grade: rev.grade
      }
    }))

    return {
      summary: {
        assignedBatchesCount,
        pendingReviewQueueCount,
        approvedSubmissionsCount,
        changesRequestedCount,
        averageReviewTurnaroundHours
      },
      assignedBatches: batches.map(b => ({ _id: b._id.toString(), name: b.name, batchCode: b.batchCode })),
      batchPerformanceSummaries,
      recentReviews: formattedReviews,
      recentActivity: recentActivity || [],
      dashboardVersion: 'v1',
      generatedAt: new Date().toISOString()
    }
  }

  /**
   * Mentor Dashboard Analytics
   * @param {import('mongodb').Db} db
   * @param {string} orgId
   * @param {string} uid
   */
  static async getMentorDashboard(db, orgId, uid) {
    const orgObjectId = new ObjectId(orgId)

    // Get active assignments
    const assignments = await db.collection('batch_assignments').find({
      uid,
      role: 'mentor',
      status: 'active'
    }).toArray()
    const assignedBatchIds = assignments.map(a => a.batchId)

    // Resolve non-archived batches belonging to this organization
    const batches = await db.collection('batches').find({
      _id: { $in: assignedBatchIds },
      organizationId: orgObjectId,
      status: { $ne: 'archived' }
    }).toArray()
    const batchIds = batches.map(b => b._id)

    const assignedBatchesCount = batches.length

    // Active student counts
    const activeStudentCounts = batchIds.length > 0 ? await db.collection('batch_enrollments').countDocuments({ batchId: { $in: batchIds }, status: 'active' }) : 0
    const groupCounts = batchIds.length > 0 ? await db.collection('groups').countDocuments({ batchId: { $in: batchIds }, status: { $ne: 'archived' } }) : 0

    // Submission activity in these batches
    let pendingCount = 0
    let approvedCount = 0
    let changesCount = 0

    if (batchIds.length > 0) {
      const counts = await db.collection('submissions').aggregate([
        { $match: { batchId: { $in: batchIds }, status: { $in: ['pending', 'approved', 'changes_requested'] } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]).toArray()

      for (const item of counts) {
        if (item._id === 'pending') pendingCount = item.count
        else if (item._id === 'approved') approvedCount = item.count
        else if (item._id === 'changes_requested') changesCount = item.count
      }
    }

    // At Risk Students (active enrollment, and >= 2 pending assignments)
    let atRiskStudents = 0
    if (batchIds.length > 0) {
      const activeEnrollmentsList = await db.collection('batch_enrollments').find({
        batchId: { $in: batchIds },
        status: 'active'
      }).toArray()

      // Group enrollments by batch for efficient lookup
      const batchEnrollmentMap = {}
      for (const en of activeEnrollmentsList) {
        const bStr = en.batchId.toString()
        if (!batchEnrollmentMap[bStr]) {
          batchEnrollmentMap[bStr] = []
        }
        batchEnrollmentMap[bStr].push(en.uid)
      }

      for (const bId of Object.keys(batchEnrollmentMap)) {
        const bObjId = new ObjectId(bId)
        const studentUids = batchEnrollmentMap[bId]
        if (studentUids.length === 0) continue

        const batch = batches.find(b => b._id.toString() === bId)
        const totalAssignments = batch?.weeklyAssignments?.length || 0
        if (totalAssignments === 0) continue

        // Fetch all approved submissions for this batch to avoid N+1 queries
        const approvedSubmissions = await db.collection('submissions').find({
          batchId: bObjId,
          status: 'approved'
        }, {
          projection: { uid: 1, memberSnapshot: 1, assignmentId: 1 }
        }).toArray()

        // Map studentUid -> Set of approved assignmentId strings
        const approvedMap = {}
        for (const sub of approvedSubmissions) {
          const uids = new Set()
          if (sub.uid) uids.add(sub.uid)
          if (Array.isArray(sub.memberSnapshot)) {
            sub.memberSnapshot.forEach(id => uids.add(id))
          } else if (sub.memberSnapshot) {
            uids.add(sub.memberSnapshot)
          }

          const assignmentIdStr = sub.assignmentId.toString()
          for (const sUid of uids) {
            if (!approvedMap[sUid]) {
              approvedMap[sUid] = new Set()
            }
            approvedMap[sUid].add(assignmentIdStr)
          }
        }

        // Count students who have >= 2 pending assignments
        for (const sUid of studentUids) {
          const approvedCount = approvedMap[sUid] ? approvedMap[sUid].size : 0
          const pendingAssignments = totalAssignments - approvedCount
          if (pendingAssignments >= 2) {
            atRiskStudents++
          }
        }
      }
    }

    // Batch Progress Summaries
    const batchProgressSummaries = []
    for (const batch of batches) {
      const activeStudents = await db.collection('batch_enrollments').countDocuments({ batchId: batch._id, status: 'active' })
      const completedStudents = await db.collection('batch_enrollments').countDocuments({ batchId: batch._id, status: 'completed' })
      const groups = await db.collection('groups').countDocuments({ batchId: batch._id, status: { $ne: 'archived' } })
      const totalSubmissions = await db.collection('submissions').countDocuments({ batchId: batch._id })
      batchProgressSummaries.push({
        batchId: batch._id.toString(),
        batchName: batch.name,
        batchCode: batch.batchCode,
        metrics: {
          activeStudents,
          completedStudents,
          groupsCount: groups,
          totalSubmissions
        }
      })
    }

    // Recent Student Actions (submissions & enrollments)
    const recentEnrollments = batchIds.length > 0 ? await db.collection('batch_enrollments').find({ batchId: { $in: batchIds } }).sort({ createdAt: -1 }).limit(5).toArray() : []
    const recentSubmissions = batchIds.length > 0 ? await db.collection('submissions').find({ batchId: { $in: batchIds } }).sort({ createdAt: -1 }).limit(5).toArray() : []

    const uids = Array.from(new Set([
      ...recentEnrollments.map(e => e.uid),
      ...recentSubmissions.map(s => s.uid)
    ]))
    const userNamesMap = await DashboardService.resolveUserNames(db, uids)

    const formattedEnrollments = recentEnrollments.map(en => ({
      _id: en._id.toString(),
      batchId: en.batchId.toString(),
      uid: en.uid,
      displayName: userNamesMap[en.uid] || 'Unknown User',
      status: en.status,
      createdAt: en.createdAt
    }))

    const formattedSubmissions = recentSubmissions.map(sub => ({
      _id: sub._id.toString(),
      batchId: sub.batchId.toString(),
      assignmentId: sub.assignmentId.toString(),
      uid: sub.uid,
      displayName: userNamesMap[sub.uid] || 'Unknown User',
      status: sub.status,
      createdAt: sub.createdAt
    }))

    const recentActivity = [
      ...formattedEnrollments.map(en => ({
        type: 'student_enrolled',
        title: `Student Enrolled in Batch`,
        timestamp: en.createdAt,
        metadata: { batchId: en.batchId, uid: en.uid, displayName: en.displayName }
      })),
      ...formattedSubmissions.map(sub => ({
        type: 'submission_created',
        title: `Student Submitted Coursework`,
        timestamp: sub.createdAt,
        metadata: { submissionId: sub._id, batchId: sub.batchId, uid: sub.uid, displayName: sub.displayName }
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10)

    return {
      summary: {
        assignedBatchesCount,
        activeStudentCounts,
        groupCounts,
        submissionActivity: {
          pending: pendingCount,
          approved: approvedCount,
          changesRequested: changesCount
        },
        atRiskStudents
      },
      assignedBatches: batches.map(b => ({ _id: b._id.toString(), name: b.name, batchCode: b.batchCode })),
      batchProgressSummaries,
      recentStudentActions: [
        ...formattedEnrollments,
        ...formattedSubmissions
      ],
      recentActivity: recentActivity || [],
      dashboardVersion: 'v1',
      generatedAt: new Date().toISOString()
    }
  }

  /**
   * Student Dashboard Analytics Scoped to Organization
   * @param {import('mongodb').Db} db
   * @param {string} orgId
   * @param {string} uid
   * @param {string} [selectedBatchId]
   */
  static async getStudentDashboardAnalytics(db, orgId, uid, selectedBatchId = null) {
    const orgObjectId = new ObjectId(orgId)

    // Fetch batch enrollments for this student under the org
    const enrollments = await db.collection('batch_enrollments').find({
      uid,
      organizationId: orgObjectId
    }).toArray()
    const batchIds = enrollments.map(e => e.batchId)

    // Fetch batch details
    const batchDocs = batchIds.length > 0 ? await db.collection('batches').find({
      _id: { $in: batchIds }
    }).toArray() : []
    const enrolledBatches = batchDocs.map(b => ({
      _id: b._id.toString(),
      batchCode: b.batchCode,
      name: b.name || b.title,
      status: b.status || 'draft'
    }))

    // Determine primary batch
    let primary = null
    if (selectedBatchId) {
      primary = enrollments.find(e => e.batchId.toString() === selectedBatchId)
    }
    if (!primary && enrollments.length > 0) {
      const sorted = [...enrollments].sort((a, b) => {
        if (a.status === 'completed' && b.status !== 'completed') return -1
        if (a.status !== 'completed' && b.status === 'completed') return 1
        return new Date(b.createdAt) - new Date(a.createdAt)
      })
      primary = sorted[0]
    }
    const primaryBatchId = primary ? primary.batchId : null

    const activeEnrollments = enrollments.filter(e => e.status === 'active').length
    const completedEnrollments = enrollments.filter(e => e.status === 'completed').length

    const primaryBatchDoc = primaryBatchId ? batchDocs.find(b => b._id.toString() === primaryBatchId.toString()) : null
    const totalAssignments = primaryBatchDoc?.weeklyAssignments?.length || 0
    const approvedSubmissions = primaryBatchId ? await db.collection('submissions').find({
      batchId: primaryBatchId,
      status: 'approved',
      $or: [
        { uid },
        { memberSnapshot: uid }
      ]
    }).toArray() : []

    const approvedAssignmentIds = new Set(approvedSubmissions.map(s => s.assignmentId.toString()))
    const approvedAssignments = approvedAssignmentIds.size
    const pendingAssignments = Math.max(0, totalAssignments - approvedAssignments)

    // Group memberships
    const groupMemberships = primaryBatchId ? await db.collection('groups').countDocuments({
      members: uid,
      batchId: primaryBatchId,
      status: { $ne: 'archived' }
    }) : 0

    // Certificate counts
    const certificateCounts = await db.collection('certificates').countDocuments({ uid, organizationId: orgObjectId })

    // Payment Statuses (captured, refunded, pending, totalPaid)
    const payments = await db.collection('payments').find({ uid, organizationId: orgObjectId }).toArray()
    const capturedCount = payments.filter(p => p.status === 'captured').length
    const refundedCount = payments.filter(p => p.status === 'refunded').length
    const pendingCount = payments.filter(p => p.status === 'created').length
    const totalPaid = payments
      .filter(p => p.status === 'captured')
      .reduce((sum, p) => sum + (p.amount || 0), 0)

    // Job Metrics (Phase 12) - Aggregate in a single pipeline
    const jobCounts = await db.collection('job_applications').aggregate([
      { $match: { uid, organizationId: orgObjectId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray()

    let totalJobApps = 0
    let shortlistedJobApps = 0
    let interviewJobApps = 0
    let selectedJobApps = 0

    for (const item of jobCounts) {
      totalJobApps += item.count
      if (item._id === 'shortlisted') shortlistedJobApps = item.count
      else if (item._id === 'interview_scheduled') interviewJobApps = item.count
      else if (item._id === 'selected') selectedJobApps = item.count
    }

    // Certificate Eligibility for primary enrollment
    let certificateEligibility = { eligible: false, reason: 'NO_ENROLLMENTS' }
    if (primary) {
      const eligibilityResult = await EnrollmentService.checkCertificateEligibility(
        db,
        orgId,
        primary.batchId.toString(),
        uid
      )
      certificateEligibility = {
        ...eligibilityResult,
        batchId: primary.batchId.toString()
      }
    }

    // Recent items
    const recentSubmissions = await db.collection('submissions').find({ uid, organizationId: orgObjectId }).sort({ createdAt: -1 }).limit(5).toArray()
    const recentCertificates = await db.collection('certificates').find({ uid, organizationId: orgObjectId }).sort({ createdAt: -1 }).limit(5).toArray()

    // Resolve name
    const users = await db.collection('users').find({ uid }).toArray()
    const displayName = users[0]?.displayName || 'Anonymous Student'

    const formattedSubmissions = recentSubmissions.map(sub => ({
      _id: sub._id.toString(),
      batchId: sub.batchId.toString(),
      assignmentId: sub.assignmentId.toString(),
      uid: sub.uid,
      displayName,
      status: sub.status,
      createdAt: sub.createdAt
    }))

    const formattedCertificates = recentCertificates.map(cert => ({
      _id: cert._id.toString(),
      certificateNumber: cert.certificateNumber,
      uid: cert.uid,
      displayName,
      status: cert.status,
      createdAt: cert.createdAt
    }))

    const recentActivity = [
      ...formattedSubmissions.map(sub => ({
        type: 'submission_created',
        title: `Submitted Coursework: ${sub.status}`,
        timestamp: sub.createdAt,
        metadata: { submissionId: sub._id, batchId: sub.batchId, uid: sub.uid, displayName: sub.displayName }
      })),
      ...formattedCertificates.map(cert => ({
        type: 'certificate_issued',
        title: `Certificate Claimed: ${cert.certificateNumber}`,
        timestamp: cert.createdAt,
        metadata: { certificateNumber: cert.certificateNumber, uid: cert.uid, displayName: cert.displayName }
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10)

    return {
      summary: {
        activeEnrollments,
        completedEnrollments,
        pendingAssignments,
        approvedAssignments,
        groupMemberships,
        certificateCount: certificateCounts, // normalized property name
        certificateCounts, // keep legacy alias
        paymentStatus: {
          capturedCount,
          refundedCount,
          pendingCount,
          totalPaid
        },
        certificateEligibility,
        jobMetrics: {
          applications: totalJobApps,
          shortlisted: shortlistedJobApps,
          interviews: interviewJobApps,
          selected: selectedJobApps
        }
      },
      enrolledBatches,
      recentSubmissions: formattedSubmissions,
      recentCertificates: formattedCertificates,
      recentActivity: recentActivity || [],
      dashboardVersion: 'v1',
      generatedAt: new Date().toISOString()
    }
  }
}
