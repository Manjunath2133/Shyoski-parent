// src/services/audit-reporting.js
import { ObjectId } from 'mongodb'
import { AUDIT_ACTIONS_CATALOG } from './audit.js'
import { paginateCollection } from '../lib/pagination.js'

export class AuditReportingService {
  /**
   * Helper to construct query filters based on options.
   */
  static buildQuery(options) {
    const query = {}

    if (options.organizationId) {
      query.organizationId = new ObjectId(options.organizationId.toString())
    } else if (options.organizationId === null) {
      query.organizationId = null
    }

    if (options.actorUid) {
      query.actorUid = options.actorUid
    }

    if (options.action) {
      query.action = options.action
    }

    if (options.category) {
      query.category = options.category
    }

    if (options.severity) {
      query.severity = options.severity
    }

    if (options.resourceType) {
      query.resourceType = options.resourceType
    }

    if (options.resourceId) {
      query.resourceId = options.resourceId.toString()
    }

    if (options.startDate || options.endDate) {
      query.createdAt = {}
      if (options.startDate) {
        query.createdAt.$gte = new Date(options.startDate)
      }
      if (options.endDate) {
        query.createdAt.$lte = new Date(options.endDate)
      }
    }

    return query
  }

  /**
   * Helper to normalize historical logs in-memory.
   */
  static normalizeLogs(items) {
    return items.map(item => {
      const copy = { ...item, _id: item._id.toString() }
      if (copy.organizationId) {
        copy.organizationId = copy.organizationId.toString()
      }
      if (!copy.category || !copy.severity) {
        const meta = AUDIT_ACTIONS_CATALOG[copy.action] || { category: 'SYSTEM', severity: 'info' }
        copy.category = copy.category || meta.category
        copy.severity = copy.severity || meta.severity
      }
      return copy
    })
  }

  /**
   * Lists paginated audit logs newest-first.
   */
  static async listAuditLogs(db, options = {}) {
    const query = AuditReportingService.buildQuery(options)

    const res = await paginateCollection(db.collection('audit_logs'), query, {
      page: options.page,
      limit: options.limit,
      sort: { createdAt: -1 },
      cursor: options.cursor
    })

    const normalized = AuditReportingService.normalizeLogs(res.data)

    return {
      data: normalized,
      logs: normalized, // backward compatibility
      pagination: res.pagination
    }
  }

  /**
   * Aggregates aggregate compliance metrics.
   */
  static async getAuditSummary(db, orgId = null) {
    const match = {}
    if (orgId) {
      match.organizationId = new ObjectId(orgId.toString())
    }

    // Retrieve counts grouped by action (covers historical entries missing category)
    const actionCounts = await db.collection('audit_logs').aggregate([
      { $match: match },
      { $group: { _id: '$action', count: { $sum: 1 } } }
    ]).toArray()

    let totalEvents = 0
    let financialEvents = 0
    let academicEvents = 0
    let recruitmentEvents = 0
    let certificateEvents = 0
    let systemEvents = 0

    for (const item of actionCounts) {
      const action = item._id
      const count = item.count
      totalEvents += count

      const mapping = AUDIT_ACTIONS_CATALOG[action] || { category: 'SYSTEM' }
      const cat = mapping.category

      if (cat === 'FINANCIAL') {
        financialEvents += count
      } else if (cat === 'ACADEMIC') {
        academicEvents += count
      } else if (cat === 'RECRUITMENT') {
        recruitmentEvents += count
      } else if (cat === 'CERTIFICATION') {
        certificateEvents += count
      } else if (cat === 'SYSTEM') {
        systemEvents += count
      }
    }

    // Get lastActivityAt
    const latestLog = await db.collection('audit_logs')
      .find(match)
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray()
    const lastActivityAt = latestLog[0]?.createdAt ? latestLog[0].createdAt.toISOString() : null

    // Get unique actors count using aggregation compatible with Stable API Version 1
    const uniqueActorsResult = await db.collection('audit_logs').aggregate([
      { $match: match },
      { $group: { _id: '$actorUid' } },
      { $count: 'count' }
    ]).toArray()
    const uniqueActorsCount = uniqueActorsResult[0]?.count || 0

    return {
      totalEvents,
      financialEvents,
      academicEvents,
      recruitmentEvents,
      certificateEvents,
      systemEvents,
      lastActivityAt,
      uniqueActors: uniqueActorsCount
    }
  }

  /**
   * Retrieves activity history for a specific actor.
   */
  static async getActorAuditHistory(db, uid, options = {}) {
    return AuditReportingService.listAuditLogs(db, {
      ...options,
      actorUid: uid
    })
  }

  /**
   * Retrieves latest 10 compliance records scoped to a tenant.
   */
  static async getRecentActivity(db, orgId = null) {
    const query = {}
    if (orgId) {
      query.organizationId = new ObjectId(orgId.toString())
    }

    const items = await db.collection('audit_logs')
      .find(query)
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray()

    return AuditReportingService.normalizeLogs(items)
  }

  /**
   * Retrieves compliance-scoped full logs for exports (cap: 1000).
   */
  static async exportAuditLogs(db, filters = {}) {
    const query = AuditReportingService.buildQuery(filters)
    const items = await db.collection('audit_logs')
      .find(query)
      .sort({ createdAt: -1 })
      .limit(1000)
      .toArray()

    return {
      records: AuditReportingService.normalizeLogs(items)
    }
  }
}
