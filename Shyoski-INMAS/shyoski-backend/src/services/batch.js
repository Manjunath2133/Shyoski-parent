// src/services/batch.js
import { ObjectId } from 'mongodb'
import { paginateCollection } from '../lib/pagination.js'

export class BatchService {
  /**
   * Creates a new batch.
   * @param {import('mongodb').Db} db
   * @param {string} organizationId
   * @param {object} batchData
   * @param {string} batchData.name
   * @param {string} batchData.batchCode
   * @param {string} [batchData.description]
   * @param {string} [batchData.status]
   * @param {object} [actor] Current actor context for super_admin validation bypass
   */
  static async createBatch(db, organizationId, batchData, actor = null) {
    if (!organizationId) {
      throw new Error('Organization ID is required')
    }
    if (!batchData.name || !batchData.batchCode) {
      throw new Error('Missing required fields for batch creation')
    }

    const codeUpper = batchData.batchCode.toUpperCase().trim()
    if (!/^[A-Z0-9-]{3,30}$/.test(codeUpper)) {
      const err = new Error('Invalid batch code format (3-30 uppercase alphanumeric characters or dashes)')
      err.status = 400
      throw err
    }

    // 1. Validate Organization Status
    const org = await db.collection('organizations').findOne({ _id: new ObjectId(organizationId) })
    if (!org) {
      const err = new Error('Organization not found')
      err.status = 404
      throw err
    }

    // Enforce Active Organization Constraints
    if (org.status === 'suspended' || org.status === 'archived') {
      const isSuperAdmin = actor && actor.globalRole === 'super_admin'
      if (!isSuperAdmin) {
        const err = new Error(`Cannot create batch inside ${org.status} organization`)
        err.status = 403
        throw err
      }
    }

    // 2. Check for duplicate batch code under this organization
    const existing = await db.collection('batches').findOne({
      organizationId: new ObjectId(organizationId),
      batchCode: codeUpper
    })
    if (existing) {
      const err = new Error('Conflict: Batch code is already in use under this organization')
      err.status = 409
      throw err
    }

    const batchDoc = {
      organizationId: new ObjectId(organizationId),
      batchCode: codeUpper,
      name: batchData.name,
      description: batchData.description || '',
      status: batchData.status || 'draft',
      domain: batchData.domain || '',
      startDate: batchData.startDate ? new Date(batchData.startDate) : null,
      certificateFee: batchData.certificateFee !== undefined ? batchData.certificateFee : 0,
      googleFormLink: batchData.googleFormLink || '',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await db.collection('batches').insertOne(batchDoc)

    return {
      _id: result.insertedId.toString(),
      ...batchDoc,
      organizationId: organizationId.toString()
    }
  }

  /**
   * Retrieves a single batch.
   * @param {import('mongodb').Db} db
   * @param {string} orgId
   * @param {string} batchId
   */
  static async getBatch(db, orgId, batchId) {
    if (!batchId || !orgId) {
      throw new Error('Batch ID and Organization ID are required')
    }

    const batch = await db.collection('batches').findOne({ _id: new ObjectId(batchId) })
    if (!batch || batch.organizationId.toString() !== orgId) {
      return null
    }

    return {
      ...batch,
      _id: batch._id.toString(),
      organizationId: batch.organizationId.toString()
    }
  }

  /**
   * Updates batch details.
   * @param {import('mongodb').Db} db
   * @param {string} orgId
   * @param {string} batchId
   * @param {object} updateData
   * @param {object} [actor]
   */
  static async updateBatch(db, orgId, batchId, updateData, actor = null) {
    if (!batchId || !orgId) {
      throw new Error('Batch ID and Organization ID are required')
    }

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

    const setFields = {
      updatedAt: new Date()
    }

    if (updateData.name !== undefined) {
      setFields.name = updateData.name
    }
    if (updateData.description !== undefined) {
      setFields.description = updateData.description
    }
    if (updateData.domain !== undefined) {
      setFields.domain = updateData.domain
    }
    if (updateData.startDate !== undefined) {
      setFields.startDate = updateData.startDate ? new Date(updateData.startDate) : null
    }
    if (updateData.certificateFee !== undefined) {
      setFields.certificateFee = updateData.certificateFee
    }
    if (updateData.googleFormLink !== undefined) {
      setFields.googleFormLink = updateData.googleFormLink
    }

    if (updateData.batchCode !== undefined) {
      const codeUpper = updateData.batchCode.toUpperCase().trim()
      if (!/^[A-Z0-9-]{3,30}$/.test(codeUpper)) {
        const err = new Error('Invalid batch code format (3-30 uppercase alphanumeric characters or dashes)')
        err.status = 400
        throw err
      }

      // Check duplicate
      const existing = await db.collection('batches').findOne({
        organizationId: new ObjectId(orgId),
        batchCode: codeUpper,
        _id: { $ne: new ObjectId(batchId) }
      })
      if (existing) {
        const err = new Error('Conflict: Batch code is already in use under this organization')
        err.status = 409
        throw err
      }
      setFields.batchCode = codeUpper
    }

    if (updateData.status !== undefined && updateData.status !== batch.status) {
      const allowedTransitions = {
        draft: ['active', 'archived'],
        active: ['inactive', 'archived'],
        inactive: ['active', 'archived'],
        archived: []
      }
      const currentStatus = batch.status || 'draft'
      const nextStatus = updateData.status
      
      const allowed = allowedTransitions[currentStatus] || []
      if (!allowed.includes(nextStatus)) {
        const err = new Error(`Invalid batch status transition from ${currentStatus} to ${nextStatus}`)
        err.status = 400
        throw err
      }
      setFields.status = nextStatus
    }

    await db.collection('batches').updateOne(
      { _id: new ObjectId(batchId) },
      { $set: setFields }
    )

    const updated = await db.collection('batches').findOne({ _id: new ObjectId(batchId) })
    return {
      ...updated,
      _id: updated._id.toString(),
      organizationId: updated.organizationId.toString()
    }
  }

  /**
   * Lists batches in an organization.
   * @param {import('mongodb').Db} db
   * @param {string} orgId
   * @param {object} options
   * @param {number} [options.page]
   * @param {number} [options.limit]
   * @param {string} [options.status]
   */
  static async listBatches(db, orgId, { page = 1, limit = 20, status, cursor = null } = {}) {
    if (!orgId) {
      throw new Error('Organization ID is required')
    }

    const query = { organizationId: new ObjectId(orgId) }
    if (status) {
      query.status = status
    }

    const res = await paginateCollection(db.collection('batches'), query, {
      page,
      limit,
      sort: { createdAt: -1 },
      cursor
    })

    const formatted = res.data.map(item => ({
      ...item,
      _id: item._id.toString(),
      organizationId: item.organizationId.toString()
    }))

    return {
      data: formatted,
      items: formatted, // backward compatibility
      pagination: res.pagination
    }
  }
}
