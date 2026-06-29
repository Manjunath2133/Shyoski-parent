// src/services/health.js
import { areIndexesInitialized } from '../lib/db.js'
import { startTime } from '../middleware/performance.js'
import { AuditService } from './audit.js'

// In-memory tracker for health status to avoid audit log flooding
let lastHealthStatus = null
let lastDbCheckTime = 0
let lastDbStatus = 'DOWN'

/**
 * Checks MongoDB connectivity.
 * @param {import('mongodb').Db} db
 */
export async function checkDatabase(db) {
  if (!db) return 'DOWN'
  const now = Date.now()
  if (now - lastDbCheckTime < 10000) {
    return lastDbStatus
  }
  try {
    // Replaced db.command({ ping: 1 }) with a standard query to prevent topology check hangs in workerd
    await db.collection('organizations').findOne({}, { projection: { _id: 1 } })
    lastDbStatus = 'UP'
    lastDbCheckTime = now
    return 'UP'
  } catch (err) {
    console.error('💥 checkDatabase failed:', err)
    lastDbStatus = 'DOWN'
    lastDbCheckTime = now
    return 'DOWN'
  }
}

/**
 * Validates the environment configuration state.
 * @param {object} env
 */
export function checkEnvironment(env) {
  const required = [
    'MONGODB_URI',
    'MONGODB_DB',
    'FIREBASE_PROJECT_ID',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'RAZORPAY_WEBHOOK_SECRET'
  ]
  for (const key of required) {
    if (!env || !env[key]) {
      return 'INVALID'
    }
  }
  return 'VALID'
}

/**
 * Checks if background database index creation has completed.
 */
export function checkIndexes() {
  return areIndexesInitialized() ? 'READY' : 'NOT_READY'
}

/**
 * Generates the unified health check status report.
 * Emits audit events only on failures or state transitions.
 * @param {object} env
 * @param {import('mongodb').Db} db
 */
export async function getHealthStatus(env, db) {
  console.log('🔍 getHealthStatus: starting checks...')
  console.log('🔍 getHealthStatus: checking database...')
  const dbStatus = await checkDatabase(db)
  console.log('🔍 getHealthStatus: database status resolved:', dbStatus)

  console.log('🔍 getHealthStatus: checking environment...')
  const envStatus = checkEnvironment(env)
  console.log('🔍 getHealthStatus: checking indexes...')
  const indexStatus = checkIndexes()

  const isHealthy = dbStatus === 'UP' && envStatus === 'VALID' && indexStatus === 'READY'
  const currentStatus = isHealthy ? 'HEALTHY' : 'UNHEALTHY'
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000)

  // Standardized response object
  const report = {
    status: currentStatus,
    database: dbStatus,
    indexes: indexStatus,
    environment: envStatus,
    version: (env && env.APP_VERSION) || '2.0.0',
    buildTimestamp: (env && env.BUILD_TIMESTAMP) || '2026-06-19T18:45:59.000Z',
    uptimeSeconds
  }

  // Determine transition or failure to audit
  const isFailed = !isHealthy
  const isTransition = lastHealthStatus !== null && lastHealthStatus !== currentStatus

  if (db && (isFailed || isTransition)) {
    try {
      await AuditService.createLog(db, {
        actorUid: 'system',
        action: 'SYSTEM_HEALTH_CHECK',
        resourceType: 'system',
        metadata: {
          status: currentStatus,
          database: dbStatus,
          indexes: indexStatus,
          environment: envStatus,
          isTransition,
          isFailed
        }
      })
    } catch (e) {
      console.error('Failed to write health check audit log:', e.message)
    }
  }

  lastHealthStatus = currentStatus
  return report
}
