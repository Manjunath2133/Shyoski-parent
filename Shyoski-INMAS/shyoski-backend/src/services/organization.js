// src/services/organization.js
import { ObjectId } from 'mongodb'
import { paginateCollection } from '../lib/pagination.js'

export class OrganizationService {
  /**
   * Creates a new organization in the database.
   * @param {import('mongodb').Db} db
   * @param {object} orgDetails
   * @param {string} orgDetails.name
   * @param {string} orgDetails.slug
   * @param {string} [orgDetails.logoUrl]
   * @param {string} [orgDetails.website]
   * @param {string} orgDetails.email
   */
  static async createOrganization(db, { name, slug, logoUrl = '', website = '', email, organizationCode }) {
    if (!name || !slug || !email || !organizationCode) {
      throw new Error('Missing required fields for organization creation')
    }

    const codeUpper = organizationCode.toUpperCase().trim()
    const codeRegex = /^[A-Z0-9]{3,5}$/
    if (!codeRegex.test(codeUpper)) {
      throw new Error('Invalid organizationCode format (3-5 uppercase alphanumeric characters)')
    }

    // Check for duplicate organization code
    const existingCode = await db.collection('organizations').findOne({ organizationCode: codeUpper })
    if (existingCode) {
      const error = new Error('Conflict: Organization code is already in use')
      error.status = 409
      throw error
    }

    const orgDoc = {
      name,
      slug: slug.toLowerCase().trim(),
      organizationCode: codeUpper,
      logoUrl,
      website,
      contactEmail: email,
      status: 'active',
      plan: 'free',
      subscriptionStatus: 'active',
      settings: {
        branding: {
          logoUrl: logoUrl,
          primaryColor: '#000000',
          website: website
        },
        contact: {
          email: email,
          phone: ''
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await db.collection('organizations').insertOne(orgDoc)
    return {
      _id: result.insertedId.toString(),
      ...orgDoc
    }
  }

  /**
   * Retrieves an organization details by its ID.
   * @param {import('mongodb').Db} db
   * @param {string} orgId
   */
  static async getOrganization(db, orgId) {
    if (!orgId) throw new Error('Organization ID is required')
    const org = await db.collection('organizations').findOne({ _id: new ObjectId(orgId) })
    if (org) {
      org._id = org._id.toString()
    }
    return org
  }

  /**
   * Updates organization settings.
   * @param {import('mongodb').Db} db
   * @param {string} orgId
   * @param {object} updateData
   */
  static async updateOrganization(db, orgId, updateData) {
    if (!orgId) throw new Error('Organization ID is required')
    
    const fields = ['name', 'logoUrl', 'website', 'contactEmail', 'status', 'plan', 'subscriptionStatus']
    const setFields = {}
    
    for (const key of fields) {
      if (updateData[key] !== undefined) {
        setFields[key] = updateData[key]
      }
    }
    
    if (updateData.slug) {
      setFields.slug = updateData.slug.toLowerCase().trim()
    }
    
    setFields.updatedAt = new Date()

    const result = await db.collection('organizations').findOneAndUpdate(
      { _id: new ObjectId(orgId) },
      { $set: setFields },
      { returnDocument: 'after' }
    )

    if (result && result._id) {
      result._id = result._id.toString()
    }
    return result
  }

  /**
   * Lists all organizations with enforced pagination boundaries.
   * @param {import('mongodb').Db} db
   * @param {object} params
   * @param {number} [params.page=1]
   * @param {number} [params.limit=20]
   */
  static async listOrganizations(db, { page = 1, limit = 20, cursor = null } = {}) {
    const res = await paginateCollection(db.collection('organizations'), {}, {
      page,
      limit,
      sort: { createdAt: -1 },
      cursor
    })

    const formatted = res.data.map(org => ({ ...org, _id: org._id.toString() }))

    return {
      data: formatted,
      organizations: formatted, // backward compatibility
      pagination: res.pagination
    }
  }

  /**
   * Updates an organization's status enforcing strict state transitions.
   * @param {import('mongodb').Db} db
   * @param {string} orgId
   * @param {string} targetStatus 'active', 'suspended', or 'archived'
   */
  static async updateOrganizationStatus(db, orgId, targetStatus) {
    if (!orgId) throw new Error('Organization ID is required')
    if (!['active', 'suspended', 'archived'].includes(targetStatus)) {
      throw new Error('Invalid organization status')
    }

    const org = await db.collection('organizations').findOne({ _id: new ObjectId(orgId) })
    if (!org) {
      const error = new Error('Organization not found')
      error.status = 404
      throw error
    }

    const currentStatus = org.status || 'active'
    if (currentStatus === targetStatus) {
      return org
    }

    // Lifecycle state transition checks:
    // - Transition to 'archived' is only allowed if current status is 'suspended'.
    if (targetStatus === 'archived' && currentStatus !== 'suspended') {
      const error = new Error('Invalid transition: Organizations must be suspended before they can be archived')
      error.status = 400
      throw error
    }

    // - Transition to 'active' is only allowed if current status is 'suspended'.
    if (targetStatus === 'active' && currentStatus !== 'suspended') {
      const error = new Error('Invalid transition: Archived organizations cannot be reactivated directly')
      error.status = 400
      throw error
    }

    const result = await db.collection('organizations').findOneAndUpdate(
      { _id: new ObjectId(orgId) },
      { $set: { status: targetStatus, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    if (result && result._id) {
      result._id = result._id.toString()
    }
    return result
  }

  /**
   * Updates structured organization settings.
   * @param {import('mongodb').Db} db
   * @param {string} orgId
   * @param {object} settingsData
   */
  static async updateOrganizationSettings(db, orgId, settingsData) {
    if (!orgId) throw new Error('Organization ID is required')

    // Deep merge settings to avoid overwriting existing properties if not specified
    const org = await db.collection('organizations').findOne({ _id: new ObjectId(orgId) })
    if (!org) {
      const error = new Error('Organization not found')
      error.status = 404
      throw error
    }

    const currentSettings = org.settings || { branding: {}, contact: {} }
    const updatedSettings = {
      branding: {
        logoUrl: settingsData.branding?.logoUrl !== undefined ? settingsData.branding.logoUrl : (currentSettings.branding?.logoUrl || ''),
        primaryColor: settingsData.branding?.primaryColor !== undefined ? settingsData.branding.primaryColor : (currentSettings.branding?.primaryColor || '#000000'),
        website: settingsData.branding?.website !== undefined ? settingsData.branding.website : (currentSettings.branding?.website || '')
      },
      contact: {
        email: settingsData.contact?.email !== undefined ? settingsData.contact.email : (currentSettings.contact?.email || ''),
        phone: settingsData.contact?.phone !== undefined ? settingsData.contact.phone : (currentSettings.contact?.phone || '')
      }
    }

    const result = await db.collection('organizations').findOneAndUpdate(
      { _id: new ObjectId(orgId) },
      { $set: { settings: updatedSettings, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    if (result && result._id) {
      result._id = result._id.toString()
    }
    return result
  }
}
