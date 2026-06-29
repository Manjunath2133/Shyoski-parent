// src/lib/db.js
import { MongoClient, ServerApiVersion } from 'mongodb'
import { AsyncLocalStorage } from 'node:async_hooks'

export const dbStorage = new AsyncLocalStorage()

// Module-level cache for connection reuse across serverless isolates
let cachedClient = null
let cachedDb = null
let indexesInitialized = false

/**
 * Initializes and establishes indexes on the required collections exactly once per runtime life.
 * @param {import('mongodb').Db} db 
 */
export async function initializeIndexes(db) {
  if (indexesInitialized) return
  indexesInitialized = true
  
  console.log('🔄 Initializing database indexes...')

  const createIdx = async (collectionName, spec, options = {}) => {
    try {
      await db.collection(collectionName).createIndex(spec, options)
    } catch (error) {
      console.error(`⚠️ Failed to create index on ${collectionName}:`, error.message)
    }
  }

  try {
    // 1. organizations indexes
    await createIdx('organizations', { slug: 1 }, { unique: true })
    await createIdx('organizations', { organizationCode: 1 }, { unique: true, sparse: true })
    await createIdx('organizations', { status: 1 })

    // 2. organization_memberships indexes
    await createIdx('organization_memberships', { organizationId: 1 })
    await createIdx('organization_memberships', { uid: 1 })
    await createIdx('organization_memberships', { organizationId: 1, uid: 1 }, { unique: true })
    await createIdx('organization_memberships', { organizationId: 1, role: 1, status: 1 })

    // 3. organization_invitations indexes
    await createIdx('organization_invitations', { token: 1 }, { unique: true })
    await createIdx('organization_invitations', { email: 1 })
    await createIdx('organization_invitations', { organizationId: 1 })

    // 4. audit_logs indexes
    await createIdx('audit_logs', { organizationId: 1 })
    await createIdx('audit_logs', { actorUid: 1 })
    await createIdx('audit_logs', { actorUid: 1, createdAt: -1 })
    await createIdx('audit_logs', { organizationId: 1, createdAt: -1 })
    await createIdx('audit_logs', { action: 1, createdAt: -1 })
    await createIdx('audit_logs', { category: 1, createdAt: -1 })
    await createIdx('audit_logs', { severity: 1, createdAt: -1 })
    await createIdx('audit_logs', { organizationId: 1, category: 1, createdAt: -1 })
    
    // 5. groups indexes
    await createIdx('groups', { groupCode: 1 }, { unique: true, sparse: true })
    await createIdx('groups', { batchId: 1, members: 1 })
    await createIdx('groups', { batchId: 1, status: 1 })

    // 6. certificates indexes
    await createIdx('certificates', { certificateNumber: 1 }, { unique: true, sparse: true })
    await createIdx('certificates', { organizationId: 1, status: 1, createdAt: -1 })
    await createIdx('certificates', { batchId: 1, uid: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'active' } })

    // 7. batch_enrollments indexes
    await createIdx('batch_enrollments', { batchId: 1, uid: 1 }, { unique: true })
    await createIdx('batch_enrollments', { uid: 1, status: 1 })
    await createIdx('batch_enrollments', { uid: 1, organizationId: 1 })
    await createIdx('batch_enrollments', { organizationId: 1, batchId: 1 })
    await createIdx('batch_enrollments', { organizationId: 1, status: 1 })

    // 8. batch_assignments indexes
    await createIdx('batch_assignments', { batchId: 1, uid: 1, role: 1, status: 1 })

    // 9. batches indexes
    await createIdx('batches', { organizationId: 1, batchCode: 1 }, { unique: true })
    await createIdx('batches', { organizationId: 1, createdAt: -1 })
    await createIdx('batches', { organizationId: 1, status: 1 })

    // 10. submissions indexes
    await createIdx('submissions', { organizationId: 1, batchId: 1, assignmentId: 1 })
    await createIdx('submissions', { uid: 1, batchId: 1 })
    await createIdx('submissions', { organizationId: 1, status: 1 })
    await createIdx('submissions', { uid: 1, createdAt: -1 })
    await createIdx('submissions', { uid: 1, assignmentId: 1, attemptNumber: 1 }, { unique: true })
    
    try {
      await db.collection('submissions').dropIndex('groupId_1_assignmentId_1_attemptNumber_1')
    } catch (e) {
      // ignore if not found
    }
    await createIdx('submissions', { groupId: 1, assignmentId: 1, attemptNumber: 1 }, {
      unique: true,
      partialFilterExpression: { groupId: { $exists: true, $type: 'string' } }
    })

    // 11. payments indexes
    await createIdx('payments', { orderId: 1 }, { unique: true })
    await createIdx('payments', { paymentId: 1 }, { unique: true, sparse: true })
    await createIdx('payments', { organizationId: 1, batchId: 1, uid: 1 })
    await createIdx('payments', { uid: 1, status: 1, createdAt: -1 })
    await createIdx('payments', { batchId: 1, uid: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'captured' } })
    await createIdx('payments', { organizationId: 1, status: 1 })

    // 12. webhook_events indexes
    await createIdx('webhook_events', { eventId: 1 }, { unique: true })

    // 13. notifications indexes
    await createIdx('notifications', { uid: 1, isRead: 1, createdAt: -1 })
    await createIdx('notifications', { organizationId: 1, createdAt: -1 })
    await createIdx('notifications', { uid: 1, createdAt: -1 })
    await createIdx('notifications', { uid: 1, eventKey: 1 }, { unique: true, partialFilterExpression: { eventKey: { $type: 'string' } } })

    // 14. jobs indexes
    await createIdx('jobs', { organizationId: 1, status: 1 })
    await createIdx('jobs', { organizationId: 1, createdAt: -1 })
    await createIdx('jobs', { status: 1, applicationDeadline: 1 })
    await createIdx('jobs', { organizationId: 1, applicationDeadline: 1, status: 1 })

    // 15. job_applications indexes
    await createIdx('job_applications', { jobId: 1, uid: 1 }, { unique: true })
    await createIdx('job_applications', { organizationId: 1, status: 1 })
    await createIdx('job_applications', { uid: 1, appliedAt: -1 })
    await createIdx('job_applications', { jobId: 1, status: 1 })

    console.log('✅ Database indexes initialization pass completed')
  } catch (error) {
    console.error('⚠️ Critical error in index initialization sequence:', error)
  }
}

/**
 * Returns a lazy-initialized MongoDB database singleton instance.
 * @param {object} env The Cloudflare Worker environment bindings containing MONGODB_URI
 */
export async function getDb(env) {
  const store = dbStorage.getStore()
  if (store && store.db) {
    return store.db
  }

  if (!env || !env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing in environment variables')
  }

  if (cachedDb) {
    return cachedDb
  }

  if (!cachedClient) {
    cachedClient = new MongoClient(env.MONGODB_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      maxPoolSize: 1,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 30000,
    })
    await cachedClient.connect()
  }

  const db = cachedClient.db('shyoski_v2')
  cachedDb = db

  // In production/staging environments, run index creation on first fetch per cold start
  if (env && env.ENVIRONMENT !== 'development' && env.ENVIRONMENT !== 'test') {
    await initializeIndexes(db).catch(err => {
      console.error('⚠️ Index initialization failed:', err)
    })
  }

  return cachedDb
}

/**
 * Closes the active MongoClient connection to free the event loop.
 */
export async function closeDb() {
  if (cachedClient) {
    try {
      await cachedClient.close(true)
    } catch (err) {
      console.error('⚠️ Failed to close MongoClient:', err.message)
    }
    cachedClient = null
    cachedDb = null
  }
}

export function areIndexesInitialized() {
  return indexesInitialized
}