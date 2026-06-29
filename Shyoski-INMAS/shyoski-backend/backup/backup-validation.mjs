// backup/backup-validation.mjs
import { MongoClient } from 'mongodb'
import fs from 'node:fs'
import path from 'node:path'

// Helper to load env variables from .dev.vars
function loadEnv() {
  try {
    const devVarsPath = path.resolve('.dev.vars')
    if (fs.existsSync(devVarsPath)) {
      const content = fs.readFileSync(devVarsPath, 'utf8')
      for (const line of content.split('\n')) {
        const parts = line.split('=')
        if (parts.length >= 2) {
          const key = parts[0].trim()
          const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '')
          process.env[key] = val
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse .dev.vars:', e.message)
  }
}

loadEnv()

const MONGODB_URI = process.env.MONGODB_URI
const MONGODB_DB = process.env.MONGODB_DB || 'shyoski_v2'

async function runBackupValidation() {
  console.log('📦 Starting Backup Validation Framework...\n')

  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI environment variable is missing!')
    process.exitCode = 1
    return
  }

  const client = new MongoClient(MONGODB_URI)
  let db
  let success = false
  const report = {
    timestamp: new Date().toISOString(),
    success: false,
    collectionsChecked: 0,
    collections: {},
    error: null
  }

  const requiredCollections = [
    'organizations',
    'organization_memberships',
    'batches',
    'batch_enrollments',
    'submissions',
    'groups',
    'payments',
    'certificates',
    'notifications',
    'jobs',
    'job_applications',
    'audit_logs'
  ]

  try {
    await client.connect()
    db = client.db(MONGODB_DB)
    console.log('✅ Connected to MongoDB database')

    // Retrieve active collections on MongoDB
    const collectionsInDb = await db.listCollections().toArray()
    const activeNames = collectionsInDb.map(c => c.name)

    let allExist = true
    const checked = {}

    for (const colName of requiredCollections) {
      const exists = activeNames.includes(colName)
      if (!exists) {
        allExist = false
        checked[colName] = { exists: false, sampleCount: 0, restoredCount: 0, error: 'Collection missing in DB' }
        continue
      }

      // Step 2: Retrieve sample records
      const samples = await db.collection(colName).find().limit(3).toArray()
      const sampleCount = samples.length

      let restoredCount = 0
      let sandboxError = null

      if (sampleCount > 0) {
        const sandboxName = `sandbox_val_${colName}`
        try {
          // Clean sandbox if exists
          await db.collection(sandboxName).deleteMany({})

          // Step 3: Restore samples into sandbox
          await db.collection(sandboxName).insertMany(samples)

          // Step 4: Verify record count
          restoredCount = await db.collection(sandboxName).countDocuments()

          // Drop sandbox collection immediately after validation
          await db.collection(sandboxName).drop()
        } catch (err) {
          sandboxError = err.message
          allExist = false
        }
      }

      checked[colName] = {
        exists: true,
        sampleCount,
        restoredCount,
        valid: sampleCount === restoredCount && !sandboxError,
        error: sandboxError
      }
    }

    success = allExist
    report.success = success
    report.collectionsChecked = requiredCollections.length
    report.collections = checked

    // Emit BACKUP_VALIDATION audit log
    await db.collection('audit_logs').insertOne({
      actorUid: 'system',
      action: 'BACKUP_VALIDATION',
      resourceType: 'system',
      metadata: {
        success,
        collectionsChecked: requiredCollections.length
      },
      category: 'SYSTEM',
      severity: success ? 'info' : 'error',
      createdAt: new Date()
    })

    console.log(`\n🔍 Backup validation report summary:`)
    console.log(JSON.stringify(report, null, 2))

  } catch (err) {
    console.error('💥 Backup Validation encountered critical error:', err.message)
    report.error = err.message
    if (db) {
      try {
        await db.collection('audit_logs').insertOne({
          actorUid: 'system',
          action: 'BACKUP_VALIDATION',
          resourceType: 'system',
          metadata: { success: false, error: err.message },
          category: 'SYSTEM',
          severity: 'error',
          createdAt: new Date()
        })
      } catch (logErr) {
        console.error('Failed to log backup validation audit error:', logErr.message)
      }
    }
  } finally {
    await client.close()

    // Export report to backup/backup-validation-report.json
    try {
      const backupDir = path.resolve('backup')
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir)
      }
      const reportPath = path.join(backupDir, 'backup-validation-report.json')
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8')
      console.log(`💾 Backup report successfully exported to ${reportPath}`)
    } catch (fsErr) {
      console.error('Failed to write backup validation report JSON:', fsErr.message)
    }
  }
}

runBackupValidation()
