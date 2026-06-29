// src/services/job.js
import { ObjectId } from 'mongodb'
import { AuditService } from './audit.js'
import { NotificationService } from './notification.js'
import { paginateCollection } from '../lib/pagination.js'

export class JobService {
  /**
   * Creates a draft job posting.
   */
  static async createJob(db, orgId, payload, actorUid) {
    const org = await db.collection('organizations').findOne({ _id: new ObjectId(orgId) })
    if (!org) {
      const err = new Error('Organization not found')
      err.status = 404
      throw err
    }
    if (org.status !== 'active') {
      const err = new Error('Organization is not active')
      err.status = 400
      throw err
    }

    const jobDoc = {
      organizationId: new ObjectId(orgId),
      title: payload.title,
      description: payload.description,
      location: payload.location,
      jobType: payload.jobType, // internship, full_time, part_time, contract
      domain: payload.domain,
      skills: payload.skills || [],
      stipend: payload.stipend ? parseInt(payload.stipend) : null,
      salary: payload.salary ? parseInt(payload.salary) : null,
      openings: payload.openings ? parseInt(payload.openings) : 1,
      applicationDeadline: new Date(payload.applicationDeadline),
      status: 'draft',
      createdBy: actorUid,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await db.collection('jobs').insertOne(jobDoc)
    const insertedId = result.insertedId.toString()

    await AuditService.createLog(db, {
      actorUid,
      organizationId: orgId,
      action: 'JOB_CREATED',
      resourceType: 'job',
      resourceId: insertedId,
      metadata: { title: payload.title }
    })

    return { ...jobDoc, _id: insertedId }
  }

  /**
   * Updates an existing job's details (except status).
   */
  static async updateJob(db, orgId, jobId, payload, actorUid) {
    const result = await db.collection('jobs').findOneAndUpdate(
      { _id: new ObjectId(jobId), organizationId: new ObjectId(orgId) },
      {
        $set: {
          title: payload.title,
          description: payload.description,
          location: payload.location,
          jobType: payload.jobType,
          domain: payload.domain,
          skills: payload.skills || [],
          stipend: payload.stipend !== undefined ? (payload.stipend ? parseInt(payload.stipend) : null) : undefined,
          salary: payload.salary !== undefined ? (payload.salary ? parseInt(payload.salary) : null) : undefined,
          openings: payload.openings !== undefined ? parseInt(payload.openings) : undefined,
          applicationDeadline: payload.applicationDeadline ? new Date(payload.applicationDeadline) : undefined,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    )

    if (!result) {
      const err = new Error('Job not found')
      err.status = 404
      throw err
    }

    await AuditService.createLog(db, {
      actorUid,
      organizationId: orgId,
      action: 'JOB_UPDATED',
      resourceType: 'job',
      resourceId: jobId,
      metadata: { title: payload.title }
    })

    return result
  }

  /**
   * Transition job status to published.
   */
  static async publishJob(db, orgId, jobId, actorUid) {
    const job = await db.collection('jobs').findOne({ _id: new ObjectId(jobId), organizationId: new ObjectId(orgId) })
    if (!job) {
      const err = new Error('Job not found')
      err.status = 404
      throw err
    }
    if (job.status !== 'draft') {
      const err = new Error(`Invalid transition from ${job.status} to published`)
      err.status = 400
      throw err
    }

    await db.collection('jobs').updateOne(
      { _id: job._id },
      { $set: { status: 'published', updatedAt: new Date() } }
    )

    // Notify all active student members of the organization
    const activeStudents = await db.collection('organization_memberships')
      .find({ organizationId: new ObjectId(orgId), role: 'student', status: 'active' })
      .toArray()

    for (const stud of activeStudents) {
      await NotificationService.createNotification(db, {
        organizationId: orgId,
        uid: stud.uid,
        type: 'JOB_PUBLISHED',
        title: 'New Job Opportunity',
        message: `A new opportunity "${job.title}" has been published.`,
        entityType: 'job',
        entityId: job._id.toString(),
        eventKey: `JOB_PUBLISHED:${job._id.toString()}:${stud.uid}`
      }).catch(err => console.error(`Failed to notify student ${stud.uid} of job publish:`, err))
    }

    await AuditService.createLog(db, {
      actorUid,
      organizationId: orgId,
      action: 'JOB_PUBLISHED',
      resourceType: 'job',
      resourceId: jobId
    })

    return true
  }

  /**
   * Transition job status to closed.
   */
  static async closeJob(db, orgId, jobId, actorUid) {
    const job = await db.collection('jobs').findOne({ _id: new ObjectId(jobId), organizationId: new ObjectId(orgId) })
    if (!job) {
      const err = new Error('Job not found')
      err.status = 404
      throw err
    }
    if (job.status !== 'published') {
      const err = new Error(`Invalid transition from ${job.status} to closed`)
      err.status = 400
      throw err
    }

    await db.collection('jobs').updateOne(
      { _id: job._id },
      { $set: { status: 'closed', updatedAt: new Date() } }
    )

    await AuditService.createLog(db, {
      actorUid,
      organizationId: orgId,
      action: 'JOB_CLOSED',
      resourceType: 'job',
      resourceId: jobId
    })

    return true
  }

  /**
   * Transition job status to archived.
   */
  static async archiveJob(db, orgId, jobId, actorUid) {
    const job = await db.collection('jobs').findOne({ _id: new ObjectId(jobId), organizationId: new ObjectId(orgId) })
    if (!job) {
      const err = new Error('Job not found')
      err.status = 404
      throw err
    }
    if (job.status !== 'closed') {
      const err = new Error(`Invalid transition from ${job.status} to archived`)
      err.status = 400
      throw err
    }

    await db.collection('jobs').updateOne(
      { _id: job._id },
      { $set: { status: 'archived', updatedAt: new Date() } }
    )

    await AuditService.createLog(db, {
      actorUid,
      organizationId: orgId,
      action: 'JOB_ARCHIVED',
      resourceType: 'job',
      resourceId: jobId
    })

    return true
  }

  /**
   * Student applies to a job.
   */
  static async applyToJob(db, jobId, uid) {
    const job = await db.collection('jobs').findOne({ _id: new ObjectId(jobId) })
    if (!job) {
      const err = new Error('Job not found')
      err.status = 404
      throw err
    }
    if (job.status !== 'published') {
      const err = new Error('Job is not accepting applications')
      err.status = 400
      throw err
    }
    if (new Date() > new Date(job.applicationDeadline)) {
      const err = new Error('Application deadline has expired')
      err.status = 400
      throw err
    }

    // Verify student has active membership in the owning organization
    const membership = await db.collection('organization_memberships').findOne({
      organizationId: job.organizationId,
      uid,
      role: 'student',
      status: 'active'
    })
    if (!membership) {
      const err = new Error('Access denied: Active student membership required')
      err.status = 403
      throw err
    }

    // Fetch org name for application snapshot
    const org = await db.collection('organizations').findOne({ _id: job.organizationId })
    const organizationName = org ? org.name : 'Unknown Organization'

    const snapshot = {
      jobTitle: job.title,
      organizationName,
      location: job.location,
      jobType: job.jobType
    }

    // Check duplicate application
    const existing = await db.collection('job_applications').findOne({ jobId: job._id, uid })
    if (existing) {
      const err = new Error('You have already applied to this job')
      err.status = 409
      throw err
    }

    const appDoc = {
      organizationId: job.organizationId,
      jobId: job._id,
      uid,
      status: 'applied',
      appliedAt: new Date(),
      updatedAt: new Date(),
      snapshot,
      notes: null
    }

    try {
      await db.collection('job_applications').insertOne(appDoc)
    } catch (err) {
      if (err.code === 11000) {
        const dErr = new Error('You have already applied to this job')
        dErr.status = 409
        throw dErr
      }
      throw err
    }

    // Emit student notification
    await NotificationService.createNotification(db, {
      organizationId: job.organizationId.toString(),
      uid,
      type: 'JOB_APPLIED',
      title: 'Job Applied Successfully',
      message: `You successfully applied for "${job.title}".`,
      entityType: 'job_application',
      entityId: appDoc._id.toString(),
      eventKey: `JOB_APPLIED:${appDoc._id.toString()}`
    }).catch(err => console.error('Failed to notify student of application:', err))

    // Emit org admins notification
    const activeAdmins = await db.collection('organization_memberships')
      .find({ organizationId: job.organizationId, role: 'org_admin', status: 'active' })
      .toArray()

    for (const admin of activeAdmins) {
      await NotificationService.createNotification(db, {
        organizationId: job.organizationId.toString(),
        uid: admin.uid,
        type: 'NEW_JOB_APPLICATION',
        title: 'New Job Application Received',
        message: `A new application has been submitted for "${job.title}".`,
        entityType: 'job_application',
        entityId: appDoc._id.toString(),
        eventKey: `NEW_JOB_APPLICATION:${appDoc._id.toString()}:${admin.uid}`
      }).catch(err => console.error(`Failed to notify admin ${admin.uid} of application:`, err))
    }

    await AuditService.createLog(db, {
      actorUid: uid,
      organizationId: job.organizationId,
      action: 'JOB_APPLIED',
      resourceType: 'job_application',
      resourceId: appDoc._id.toString(),
      metadata: { jobId: jobId.toString() }
    })

    return { ...appDoc, _id: appDoc._id.toString() }
  }

  /**
   * Updates job application status (hiring pipeline).
   */
  static async updateApplicationStatus(db, orgId, jobId, applicationId, nextStatus, actorUid) {
    const app = await db.collection('job_applications').findOne({
      _id: new ObjectId(applicationId),
      jobId: new ObjectId(jobId),
      organizationId: new ObjectId(orgId)
    })
    if (!app) {
      const err = new Error('Application not found')
      err.status = 404
      throw err
    }

    const terminalStates = ['rejected', 'selected', 'withdrawn']
    if (terminalStates.includes(app.status)) {
      const err = new Error(`Cannot transition from terminal status "${app.status}"`)
      err.status = 400
      throw err
    }

    const allowedStatuses = ['applied', 'under_review', 'shortlisted', 'interview_scheduled', 'selected', 'rejected']
    if (!allowedStatuses.includes(nextStatus)) {
      const err = new Error(`Invalid status option: ${nextStatus}`)
      err.status = 400
      throw err
    }

    await db.collection('job_applications').updateOne(
      { _id: app._id },
      { $set: { status: nextStatus, updatedAt: new Date() } }
    )

    // Emit student notification mapping
    const notificationTypeMap = {
      under_review: 'APPLICATION_UNDER_REVIEW',
      shortlisted: 'APPLICATION_SHORTLISTED',
      interview_scheduled: 'APPLICATION_INTERVIEW',
      selected: 'APPLICATION_SELECTED',
      rejected: 'APPLICATION_REJECTED'
    }

    const titleMap = {
      under_review: 'Application Under Review',
      shortlisted: 'Shortlisted for Next Round',
      interview_scheduled: 'Interview Scheduled',
      selected: 'Offer Extended / Selected',
      rejected: 'Application Unsuccessful'
    }

    const messageMap = {
      under_review: `Your application for "${app.snapshot.jobTitle}" is now under review.`,
      shortlisted: `Congratulations! You have been shortlisted for "${app.snapshot.jobTitle}".`,
      interview_scheduled: `An interview has been scheduled for your application to "${app.snapshot.jobTitle}".`,
      selected: `Great news! You have been selected for the position of "${app.snapshot.jobTitle}".`,
      rejected: `Thank you for applying. Unfortunately, you were not selected for "${app.snapshot.jobTitle}".`
    }

    const notifyType = notificationTypeMap[nextStatus]
    if (notifyType) {
      await NotificationService.createNotification(db, {
        organizationId: orgId,
        uid: app.uid,
        type: notifyType,
        title: titleMap[nextStatus],
        message: messageMap[nextStatus],
        entityType: 'job_application',
        entityId: app._id.toString(),
        eventKey: `APPLICATION_STATUS_UPDATE:${app._id.toString()}:${nextStatus}`
      }).catch(err => console.error('Failed to notify student of status update:', err))
    }

    await AuditService.createLog(db, {
      actorUid,
      organizationId: orgId,
      action: 'APPLICATION_STATUS_CHANGED',
      resourceType: 'job_application',
      resourceId: app._id.toString(),
      metadata: {
        jobId,
        previousStatus: app.status,
        newStatus: nextStatus
      }
    })

    return true
  }

  /**
   * Withdraw application (Student only).
   */
  static async withdrawApplication(db, applicationId, uid) {
    const app = await db.collection('job_applications').findOne({
      _id: new ObjectId(applicationId),
      uid
    })
    if (!app) {
      const err = new Error('Application not found')
      err.status = 404
      throw err
    }

    const terminalStates = ['rejected', 'selected', 'withdrawn']
    if (terminalStates.includes(app.status)) {
      const err = new Error(`Cannot withdraw application in terminal status "${app.status}"`)
      err.status = 400
      throw err
    }

    const previousStatus = app.status

    await db.collection('job_applications').updateOne(
      { _id: app._id },
      { $set: { status: 'withdrawn', updatedAt: new Date() } }
    )

    // Notify student confirmation
    await NotificationService.createNotification(db, {
      organizationId: app.organizationId.toString(),
      uid,
      type: 'APPLICATION_WITHDRAWN',
      title: 'Application Withdrawn',
      message: `You withdrew your application for "${app.snapshot.jobTitle}".`,
      entityType: 'job_application',
      entityId: app._id.toString(),
      eventKey: `APPLICATION_WITHDRAWN:${app._id.toString()}`
    }).catch(err => console.error('Failed to notify student of withdrawal:', err))

    // Notify org admins
    const activeAdmins = await db.collection('organization_memberships')
      .find({ organizationId: app.organizationId, role: 'org_admin', status: 'active' })
      .toArray()

    for (const admin of activeAdmins) {
      await NotificationService.createNotification(db, {
        organizationId: app.organizationId.toString(),
        uid: admin.uid,
        type: 'APPLICATION_WITHDRAWN',
        title: 'Job Application Withdrawn',
        message: `An application for "${app.snapshot.jobTitle}" was withdrawn by the applicant.`,
        entityType: 'job_application',
        entityId: app._id.toString(),
        eventKey: `APPLICATION_WITHDRAWN_ADMIN:${app._id.toString()}:${admin.uid}`
      }).catch(err => console.error(`Failed to notify admin ${admin.uid} of withdrawal:`, err))
    }

    await AuditService.createLog(db, {
      actorUid: uid,
      organizationId: app.organizationId,
      action: 'APPLICATION_STATUS_CHANGED',
      resourceType: 'job_application',
      resourceId: app._id.toString(),
      metadata: {
        jobId: app.jobId.toString(),
        previousStatus,
        newStatus: 'withdrawn'
      }
    })

    return true
  }

  /**
   * Paginated listing of applications for a specific job.
   */
  static async listApplications(db, jobId, options = {}) {
    const query = { jobId: new ObjectId(jobId) }
    if (options.status) {
      query.status = options.status
    }

    const res = await paginateCollection(db.collection('job_applications'), query, {
      page: options.page,
      limit: options.limit,
      sort: { appliedAt: -1 },
      cursor: options.cursor
    })

    return {
      data: res.data,
      applications: res.data, // backward compatibility
      pagination: res.pagination
    }
  }
}
