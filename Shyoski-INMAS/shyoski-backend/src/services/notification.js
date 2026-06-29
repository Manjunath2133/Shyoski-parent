// src/services/notification.js
import { ObjectId } from 'mongodb'
import { paginateCollection } from '../lib/pagination.js'

export class NotificationService {
  /**
   * Creates a notification document in the database.
   * Silently ignores duplicate keys (code 11000) for eventKey deduplication.
   * @param {import('mongodb').Db} db
   * @param {object} payload
   */
  static async createNotification(db, payload) {
    const {
      organizationId,
      uid,
      type,
      title,
      message,
      entityType = null,
      entityId = null,
      eventKey = null,
      metadata = {},
      severity
    } = payload

    const allowedTypes = [
      'ORG_INVITATION', 'MEMBERSHIP_SUSPENDED', 'MEMBERSHIP_RESTORED', 'BATCH_CREATED',
      'ENROLLMENT_CREATED', 'ENROLLMENT_COMPLETED', 'SUBMISSION_RECEIVED', 'SUBMISSION_APPROVED',
      'SUBMISSION_REJECTED', 'SUBMISSION_CHANGES_REQUESTED', 'GROUP_JOINED', 'GROUP_LOCKED',
      'PAYMENT_CAPTURED', 'PAYMENT_REFUNDED', 'CERTIFICATE_CLAIMED', 'CERTIFICATE_REISSUED', 'SYSTEM',
      'JOB_PUBLISHED', 'JOB_APPLIED', 'NEW_JOB_APPLICATION', 'APPLICATION_UNDER_REVIEW',
      'APPLICATION_SHORTLISTED', 'APPLICATION_INTERVIEW', 'APPLICATION_SELECTED', 'APPLICATION_REJECTED',
      'APPLICATION_WITHDRAWN'
    ]

    if (!allowedTypes.includes(type)) {
      throw new Error(`Invalid notification type: ${type}`)
    }

    if (!uid) {
      throw new Error('Notification uid is required')
    }

    // Resolve severity
    let resolvedSeverity = severity
    if (!resolvedSeverity) {
      if ([
        'ENROLLMENT_CREATED', 'SUBMISSION_RECEIVED', 'SUBMISSION_APPROVED',
        'GROUP_JOINED', 'CERTIFICATE_CLAIMED', 'JOB_APPLIED', 'APPLICATION_SHORTLISTED',
        'APPLICATION_SELECTED'
      ].includes(type)) {
        resolvedSeverity = 'success'
      } else if (['SUBMISSION_CHANGES_REQUESTED', 'PAYMENT_REFUNDED', 'APPLICATION_WITHDRAWN'].includes(type)) {
        resolvedSeverity = 'warning'
      } else if (['MEMBERSHIP_SUSPENDED', 'SUBMISSION_REJECTED', 'APPLICATION_REJECTED'].includes(type)) {
        resolvedSeverity = 'error'
      } else {
        resolvedSeverity = 'info'
      }
    }

    // Generate default eventKey if missing (Notification Abuse Protection)
    const resolvedEventKey = eventKey ? eventKey.toString() : `${type}:${uid}:${entityType || ''}:${entityId || ''}:${message.substring(0, 50)}`

    const doc = {
      organizationId: organizationId ? new ObjectId(organizationId) : null,
      uid,
      type,
      title,
      message,
      severity: resolvedSeverity,
      entityType: entityType ? entityType.toString() : null,
      entityId: entityId ? entityId.toString() : null,
      eventKey: resolvedEventKey,
      metadata,
      isRead: false,
      readAt: null,
      isArchived: false,
      archivedAt: null,
      createdAt: new Date()
    }

    try {
      await db.collection('notifications').insertOne(doc)
      return doc
    } catch (err) {
      // Ignore MongoDB duplicate key code 11000 for eventKey deduplication
      if (err.code === 11000) {
        console.log(`ℹ️ Duplicate notification ignored for eventKey: ${resolvedEventKey}`)
        return null
      }
      throw err
    }
  }

  /**
   * Marks a single notification as read for a specific user.
   * @param {import('mongodb').Db} db
   * @param {string} notificationId
   * @param {string} uid
   */
  static async markAsRead(db, notificationId, uid) {
    const result = await db.collection('notifications').updateOne(
      { _id: new ObjectId(notificationId), uid },
      { $set: { isRead: true, readAt: new Date() } }
    )
    if (result.matchedCount === 0) {
      throw new Error('Notification not found or unauthorized')
    }
    return true
  }

  /**
   * Marks all unread notifications of a user as read.
   * @param {import('mongodb').Db} db
   * @param {string} uid
   */
  static async markAllAsRead(db, uid) {
    await db.collection('notifications').updateMany(
      { uid, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    )
    return true
  }

  /**
   * Returns a paginated feed of notifications for a specific user.
   * @param {import('mongodb').Db} db
   * @param {string} uid
   * @param {object} options
   */
  static async listNotifications(db, uid, options = {}) {
    const query = { uid, isArchived: false }
    
    if (options.organizationId) {
      query.organizationId = new ObjectId(options.organizationId)
    }
    
    if (options.isRead !== undefined) {
      query.isRead = options.isRead === true || options.isRead === 'true'
    }

    const res = await paginateCollection(db.collection('notifications'), query, {
      page: options.page,
      limit: options.limit,
      sort: { createdAt: -1 },
      cursor: options.cursor
    })

    return {
      data: res.data,
      notifications: res.data, // backward compatibility
      pagination: res.pagination
    }
  }

  /**
   * Returns the count of unread notifications for a user.
   * @param {import('mongodb').Db} db
   * @param {string} uid
   */
  static async countUnread(db, uid) {
    const count = await db.collection('notifications').countDocuments({
      uid,
      isRead: false,
      isArchived: false
    })
    return count
  }
}
