// performance/load-test.mjs
import { MongoClient, ObjectId } from 'mongodb'
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

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shyoski_v2'
const PROFILE_NAME = process.env.LOAD_TEST_PROFILE || 'mini'

const profiles = {
  mini: {
    orgs: 5,
    students: 10,
    batches: 5,
    enrollments: 20,
    submissions: 30,
    notifications: 50,
    auditLogs: 100,
    jobs: 5,
    jobApplications: 20,
    certificates: 10
  },
  medium: {
    orgs: 100,
    students: 5000,
    batches: 200,
    enrollments: 10000,
    submissions: 25000,
    notifications: 50000,
    auditLogs: 100000,
    jobs: 100,
    jobApplications: 10000,
    certificates: 1000
  },
  large: {
    orgs: 100,
    students: 10000,
    batches: 500,
    enrollments: 25000,
    submissions: 100000,
    notifications: 250000,
    auditLogs: 500000,
    jobs: 200,
    jobApplications: 50000,
    certificates: 5000
  }
}

const config = profiles[PROFILE_NAME] || profiles.mini
console.log(`🚀 Starting Load Test with Profile: ${PROFILE_NAME.toUpperCase()}`)
console.log(JSON.stringify(config, null, 2))

async function run() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db = client.db('shyoski_v2')

  const seededIds = {
    organizations: [],
    batches: [],
    users: [],
    jobs: [],
    certificates: []
  }

  try {
    // --- SEED STAGE ---
    console.log('\n📦 Seeding mock database collections...')

    // 1. Seed Orgs
    const orgDocs = []
    for (let i = 0; i < config.orgs; i++) {
      orgDocs.push({
        name: `LoadTest Org ${i}`,
        slug: `load-test-org-${i}-${Date.now()}`,
        organizationCode: `LTO${i}`.substring(0, 5).toUpperCase(),
        status: 'active',
        plan: 'free',
        subscriptionStatus: 'active',
        isLoadTest: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }
    const orgResult = await db.collection('organizations').insertMany(orgDocs)
    seededIds.organizations = Object.values(orgResult.insertedIds)
    console.log(`✅ Seeded ${seededIds.organizations.length} organizations`)

    // Generate Student Uids
    const studentUids = []
    for (let i = 0; i < config.students; i++) {
      studentUids.push(`mock_student_${i}_${Date.now()}`)
    }
    seededIds.users = studentUids

    // 2. Seed Batches
    const batchDocs = []
    for (let i = 0; i < config.batches; i++) {
      const orgId = seededIds.organizations[i % seededIds.organizations.length]
      batchDocs.push({
        organizationId: orgId,
        batchName: `LoadTest Batch ${i}`,
        batchCode: `LTB${i}-${Date.now()}`.substring(0, 15),
        status: 'active',
        isLoadTest: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }
    const batchResult = await db.collection('batches').insertMany(batchDocs)
    seededIds.batches = Object.values(batchResult.insertedIds)
    console.log(`✅ Seeded ${seededIds.batches.length} batches`)

    // Helper for bulk batch operations
    const bulkInsertInChunks = async (collectionName, totalCount, generatorFunc) => {
      const chunkSize = 5000
      let inserted = 0
      for (let i = 0; i < totalCount; i += chunkSize) {
        const chunk = []
        const count = Math.min(chunkSize, totalCount - i)
        for (let j = 0; j < count; j++) {
          chunk.push(generatorFunc(i + j))
        }
        await db.collection(collectionName).insertMany(chunk)
        inserted += chunk.length
        if (totalCount > 10000) {
          console.log(`   - ${collectionName}: ${inserted}/${totalCount} inserted...`)
        }
      }
      console.log(`✅ Seeded ${inserted} ${collectionName}`)
    }

    // 3. Seed Enrollments
    const enrollmentPairs = []
    outerEnrollment: for (const batchId of seededIds.batches) {
      for (const uid of seededIds.users) {
        enrollmentPairs.push({ batchId, uid })
        if (enrollmentPairs.length >= config.enrollments) break outerEnrollment
      }
    }
    await bulkInsertInChunks('batch_enrollments', config.enrollments, (index) => {
      const pair = enrollmentPairs[index % enrollmentPairs.length]
      const orgId = seededIds.organizations[index % seededIds.organizations.length]
      return {
        organizationId: orgId,
        batchId: pair.batchId,
        uid: pair.uid,
        status: 'active',
        hasPaid: true,
        isLoadTest: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    // 4. Seed Submissions
    await bulkInsertInChunks('submissions', config.submissions, (index) => {
      const orgId = seededIds.organizations[index % seededIds.organizations.length]
      const batchId = seededIds.batches[index % seededIds.batches.length]
      const uid = seededIds.users[index % seededIds.users.length]
      return {
        organizationId: orgId,
        batchId: batchId,
        uid: uid,
        assignmentId: new ObjectId(),
        status: index % 3 === 0 ? 'reviewed' : 'submitted',
        attemptNumber: 1,
        isLoadTest: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    // 5. Seed Notifications
    await bulkInsertInChunks('notifications', config.notifications, (index) => {
      const orgId = seededIds.organizations[index % seededIds.organizations.length]
      const uid = seededIds.users[index % seededIds.users.length]
      return {
        organizationId: orgId,
        uid: uid,
        title: 'LoadTest Notification',
        message: `Notification number ${index}`,
        isRead: index % 2 === 0,
        isLoadTest: true,
        createdAt: new Date()
      }
    })

    // 6. Seed Audit Logs
    const auditActions = ['JOB_CREATED', 'JOB_APPLIED', 'APPLICATION_STATUS_CHANGED', 'CREATE_ORGANIZATION', 'ENROLL_STUDENT']
    await bulkInsertInChunks('audit_logs', config.auditLogs, (index) => {
      const orgId = seededIds.organizations[index % seededIds.organizations.length]
      const uid = seededIds.users[index % seededIds.users.length]
      const action = auditActions[index % auditActions.length]
      return {
        actorUid: uid,
        organizationId: orgId,
        action,
        resourceType: 'load_test',
        resourceId: new ObjectId().toString(),
        category: 'SYSTEM',
        severity: 'info',
        isLoadTest: true,
        createdAt: new Date()
      }
    })

    // 7. Seed Jobs
    const jobDocs = []
    for (let i = 0; i < config.jobs; i++) {
      const orgId = seededIds.organizations[i % seededIds.organizations.length]
      jobDocs.push({
        organizationId: orgId,
        title: `LoadTest Job ${i}`,
        description: `Job description ${i}`,
        status: 'published',
        isLoadTest: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }
    const jobResult = await db.collection('jobs').insertMany(jobDocs)
    seededIds.jobs = Object.values(jobResult.insertedIds)
    console.log(`✅ Seeded ${seededIds.jobs.length} jobs`)

    // 8. Seed Job Applications
    const jobAppPairs = []
    outerJobApp: for (const jobId of seededIds.jobs) {
      for (const uid of seededIds.users) {
        jobAppPairs.push({ jobId, uid })
        if (jobAppPairs.length >= config.jobApplications) break outerJobApp
      }
    }
    await bulkInsertInChunks('job_applications', config.jobApplications, (index) => {
      const pair = jobAppPairs[index % jobAppPairs.length]
      const orgId = seededIds.organizations[index % seededIds.organizations.length]
      return {
        organizationId: orgId,
        jobId: pair.jobId,
        uid: pair.uid,
        status: 'applied',
        isLoadTest: true,
        appliedAt: new Date(),
        createdAt: new Date()
      }
    })

    // 9. Seed Certificates
    const certDocs = []
    for (let i = 0; i < config.certificates; i++) {
      const orgId = seededIds.organizations[i % seededIds.organizations.length]
      const batchId = seededIds.batches[i % seededIds.batches.length]
      const uid = seededIds.users[i % seededIds.users.length]
      const certNum = `LTC-${Date.now()}-${i}`
      certDocs.push({
        organizationId: orgId,
        batchId: batchId,
        uid: uid,
        certificateNumber: certNum,
        status: 'active',
        snapshot: {
          studentName: `Student ${i}`,
          organizationName: `LoadTest Org ${i % config.orgs}`,
          batchName: `Batch ${i % config.batches}`,
          completionDate: new Date(),
          issuedAt: new Date()
        },
        verificationUrl: `http://localhost:8788/verify/${certNum}`,
        isLoadTest: true,
        createdAt: new Date()
      })
    }
    const certResult = await db.collection('certificates').insertMany(certDocs)
    seededIds.certificates = Object.values(certResult.insertedIds)
    console.log(`✅ Seeded ${seededIds.certificates.length} certificates`)

    // --- MEASUREMENT STAGE ---
    console.log('\n⚡ Running Concurrent Fetch Latency Measurements...')
    const latencies = []
    const baseUrl = 'http://127.0.0.1:8788'
    let isServerUp = false

    try {
      const ping = await fetch(`${baseUrl}/`)
      if (ping.ok) {
        isServerUp = true
        console.log('🔗 Connected to local running Wrangler API server.')
      }
    } catch (e) {
      console.log('⚠️ Local running API server not detected. Measuring query latency directly against the MongoDB driver.')
    }

    const testRuns = 20
    const runFetchTask = async (taskName, runFn) => {
      const start = Date.now()
      await runFn()
      const duration = Date.now() - start
      latencies.push({ taskName, durationMs: duration })
    }

    // Run parallel fetch tasks
    const tasks = []
    for (let i = 0; i < testRuns; i++) {
      const orgId = seededIds.organizations[i % seededIds.organizations.length].toString()
      const certNum = certDocs[i % certDocs.length]?.certificateNumber

      if (isServerUp) {
        // HTTP Requests
        tasks.push(runFetchTask('API_dashboard_super', () =>
          fetch(`${baseUrl}/api/v2/dashboard/super-admin`, {
            headers: { 'Authorization': 'Bearer super_admin_token' }
          })
        ))
        tasks.push(runFetchTask('API_dashboard_org', () =>
          fetch(`${baseUrl}/api/v2/organizations/${orgId}/dashboard`, {
            headers: { 'Authorization': 'Bearer super_admin_token' }
          })
        ))
        if (certNum) {
          tasks.push(runFetchTask('API_certificate_verify', () =>
            fetch(`${baseUrl}/api/v2/certificates/verify/${certNum}`)
          ))
        }
        tasks.push(runFetchTask('API_audit_logs_actions', () =>
          fetch(`${baseUrl}/api/v2/audit-logs/actions`, {
            headers: { 'Authorization': 'Bearer super_admin_token' }
          })
        ))
      } else {
        // Direct DB queries as fallback
        tasks.push(runFetchTask('DB_dashboard_aggregation', async () => {
          // Emulate Dashboard aggregation queries
          await db.collection('batch_enrollments').aggregate([
            { $match: { organizationId: new ObjectId(orgId) } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ]).toArray()
        }))
        if (certNum) {
          tasks.push(runFetchTask('DB_certificate_find', async () => {
            await db.collection('certificates').findOne({ certificateNumber: certNum })
          }))
        }
        tasks.push(runFetchTask('DB_audit_log_query', async () => {
          await db.collection('audit_logs').find({ organizationId: new ObjectId(orgId) }).sort({ createdAt: -1 }).limit(10).toArray()
        }))
      }
    }

    await Promise.all(tasks)

    // Compute stats
    const stats = {}
    for (const lat of latencies) {
      if (!stats[lat.taskName]) {
        stats[lat.taskName] = []
      }
      stats[lat.taskName].push(lat.durationMs)
    }

    const report = {
      profile: PROFILE_NAME,
      timestamp: new Date().toISOString(),
      serverTested: isServerUp ? 'API' : 'MongoDB_Direct',
      volumes: config,
      results: Object.entries(stats).map(([taskName, durations]) => {
        const sum = durations.reduce((a, b) => a + b, 0)
        const avg = sum / durations.length
        const max = Math.max(...durations)
        const min = Math.min(...durations)
        return {
          metric: taskName,
          samples: durations.length,
          avgLatencyMs: parseFloat(avg.toFixed(2)),
          maxLatencyMs: max,
          minLatencyMs: min
        }
      })
    }

    console.log('\n📊 Performance Summary:')
    console.table(report.results)

    // Export report
    const reportDir = path.resolve('performance')
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir)
    }
    const reportPath = path.join(reportDir, 'load-test-report.json')
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8')
    console.log(`\n💾 Report exported to ${reportPath}`)

  } finally {
    // --- CLEANUP STAGE ---
    console.log('\n🧹 Cleaning up seeded test documents...')
    const collectionsToClean = ['organizations', 'batches', 'batch_enrollments', 'submissions', 'notifications', 'audit_logs', 'jobs', 'job_applications', 'certificates']
    for (const col of collectionsToClean) {
      const res = await db.collection(col).deleteMany({ isLoadTest: true })
      console.log(`   - Cleaned ${res.deletedCount} from ${col}`)
    }
    await client.close()
    console.log('🏁 Load test runner completed successfully.')
  }
}

run().catch(console.error)
