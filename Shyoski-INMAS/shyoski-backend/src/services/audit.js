// src/services/audit.js
import { ObjectId } from 'mongodb'

export const AUDIT_ACTIONS_CATALOG = {
  // SYSTEM
  CREATE_ORGANIZATION: { category: 'SYSTEM', severity: 'info' },
  UPDATE_ORGANIZATION: { category: 'SYSTEM', severity: 'info' },
  SUSPEND_ORGANIZATION: { category: 'SYSTEM', severity: 'warning' },
  UNSUSPEND_ORGANIZATION: { category: 'SYSTEM', severity: 'info' },
  ARCHIVE_ORGANIZATION: { category: 'SYSTEM', severity: 'warning' },
  UNARCHIVE_ORGANIZATION: { category: 'SYSTEM', severity: 'info' },
  UPDATE_ORGANIZATION_SETTINGS: { category: 'SYSTEM', severity: 'info' },
  INVITE_MEMBER: { category: 'SYSTEM', severity: 'info' },
  ACCEPT_INVITATION: { category: 'SYSTEM', severity: 'info' },
  REMOVE_MEMBER: { category: 'SYSTEM', severity: 'warning' },
  UPDATE_MEMBER: { category: 'SYSTEM', severity: 'info' },
  SECURITY_VIOLATION: { category: 'SYSTEM', severity: 'error' },
  ACCESS_DENIED: { category: 'SYSTEM', severity: 'error' },

  // ACADEMIC
  CREATE_BATCH: { category: 'ACADEMIC', severity: 'info' },
  UPDATE_BATCH: { category: 'ACADEMIC', severity: 'info' },
  ENROLL_STUDENT: { category: 'ACADEMIC', severity: 'info' },
  UPDATE_ENROLLMENT: { category: 'ACADEMIC', severity: 'info' },
  CREATE_SUBMISSION: { category: 'ACADEMIC', severity: 'info' },
  REVIEW_SUBMISSION: { category: 'ACADEMIC', severity: 'success' },
  GROUP_CREATED: { category: 'ACADEMIC', severity: 'info' },
  GROUP_LOCKED: { category: 'ACADEMIC', severity: 'warning' },

  // FINANCIAL
  PAYMENT_CAPTURE: { category: 'FINANCIAL', severity: 'success' },
  PAYMENT_REFUND: { category: 'FINANCIAL', severity: 'warning' },

  // CERTIFICATION
  CERTIFICATE_CLAIM: { category: 'CERTIFICATION', severity: 'success' },
  CERTIFICATE_REVOKE: { category: 'CERTIFICATION', severity: 'warning' },
  CERTIFICATE_REISSUE: { category: 'CERTIFICATION', severity: 'success' },

  // RECRUITMENT
  JOB_CREATED: { category: 'RECRUITMENT', severity: 'info' },
  JOB_UPDATED: { category: 'RECRUITMENT', severity: 'info' },
  JOB_PUBLISHED: { category: 'RECRUITMENT', severity: 'info' },
  JOB_CLOSED: { category: 'RECRUITMENT', severity: 'info' },
  JOB_ARCHIVED: { category: 'RECRUITMENT', severity: 'info' },
  JOB_APPLIED: { category: 'RECRUITMENT', severity: 'info' },
  APPLICATION_STATUS_CHANGED: { category: 'RECRUITMENT', severity: 'success' },

  // SECURITY
  AUTH_FAILURE: { category: 'SYSTEM', severity: 'warning' },
  RATE_LIMIT_EXCEEDED: { category: 'SYSTEM', severity: 'warning' },
  PERMISSION_DENIED: { category: 'SYSTEM', severity: 'error' },
  WEBHOOK_SIGNATURE_FAILED: { category: 'SYSTEM', severity: 'error' },
  SUSPICIOUS_REQUEST: { category: 'SYSTEM', severity: 'error' },

  // PRODUCTION READY (PHASE 16)
  SYSTEM_ERROR: { category: 'SYSTEM', severity: 'error' },
  SYSTEM_HEALTH_CHECK: { category: 'SYSTEM', severity: 'info' },
  BACKUP_VALIDATION: { category: 'SYSTEM', severity: 'info' },
  PRODUCTION_READINESS_CHECK: { category: 'SYSTEM', severity: 'info' }
}

export class AuditService {
  /**
   * Logs a critical action to the database asynchronously.
   * This is fire-and-forget: failure to log will NOT throw errors or disrupt the main transaction.
   * @param {import('mongodb').Db} db
   * @param {object} logData
   * @param {string} logData.actorUid The uid of the user executing the action
   * @param {string|ObjectId} [logData.organizationId] The target organization identifier
   * @param {string} logData.action The name of the action (e.g. CREATE_ORGANIZATION)
   * @param {string} logData.resourceType The affected collection or model (e.g. organization)
   * @param {string|ObjectId} [logData.resourceId] The target document identifier
   * @param {object} [logData.metadata] Additional key-value details for logging
   */
  static async createLog(db, { actorUid, organizationId, action, resourceType, resourceId, metadata = {} }) {
    try {
      // Derive category and severity strictly from the catalog to prevent client-side spoofing
      const mapping = AUDIT_ACTIONS_CATALOG[action] || { category: 'SYSTEM', severity: 'info' }
      const category = mapping.category
      const severity = mapping.severity

      const logDoc = {
        actorUid,
        organizationId: organizationId ? new ObjectId(organizationId.toString()) : null,
        action,
        resourceType,
        resourceId: resourceId ? resourceId.toString() : null,
        metadata,
        category,
        severity,
        createdAt: new Date()
      }

      // Perform insertion with await to ensure it is written in serverless/worker contexts,
      // but catch errors internally so it does not disrupt the main transaction.
      await db.collection('audit_logs').insertOne(logDoc).catch(err => {
        console.error('⚠️ Async Audit Log creation failed:', err)
      })
    } catch (error) {
      console.error('⚠️ Audit Log parsing failed:', error)
    }
  }
}
