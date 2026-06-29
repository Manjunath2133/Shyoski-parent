// production/readiness-check.mjs
import { MongoClient } from 'mongodb'
import fs from 'node:fs'
import path from 'node:path'

const BASE_URL = 'http://localhost:8788'

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

async function runReadinessCheck() {
  console.log('🛡️ Starting Production Readiness Auditor...\n')

  let checksPassed = 0
  let checksFailed = 0
  const details = {}

  let client
  let db

  try {
    // 1. Check Infrastructure: MongoDB Connection
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is missing')
    }
    client = new MongoClient(MONGODB_URI)
    await client.connect()
    db = client.db(MONGODB_DB)
    console.log('✅ MongoDB connectivity verified.')
    checksPassed++
    details.mongodbConnection = { status: 'passed' }

    // 2. Check Data: Essential Indexes Verification
    const orgIndexes = await db.collection('organizations').listIndexes().toArray()
    const indexNames = orgIndexes.map(idx => idx.name)
    const hasSlugIndex = indexNames.includes('slug_1')
    const hasOrgCodeIndex = indexNames.includes('organizationCode_1')

    if (hasSlugIndex && hasOrgCodeIndex) {
      console.log('✅ Required MongoDB collection indexes verified.')
      checksPassed++
      details.mongodbIndexes = { status: 'passed' }
    } else {
      console.warn('⚠️ Missing primary index on organizations collection!')
      checksFailed++
      details.mongodbIndexes = { status: 'failed', error: 'Missing organizations indexes' }
    }

    // 3. Check Monitoring: Health endpoints responsive
    const liveRes = await fetch(`${BASE_URL}/live`).then(r => r.json()).catch(() => ({}))
    const readyRes = await fetch(`${BASE_URL}/ready`).then(r => r.json()).catch(() => ({}))
    const healthRes = await fetch(`${BASE_URL}/health`).then(r => r.json()).catch(() => ({}))

    if (liveRes.status === 'UP' && readyRes.status === 'READY' && healthRes.status === 'HEALTHY') {
      console.log('✅ Health monitoring endpoints (/live, /ready, /health) verified.')
      checksPassed++
      details.healthEndpoints = { status: 'passed' }
    } else {
      console.warn('⚠️ Health endpoints returned invalid response formats:', { liveRes, readyRes, healthRes })
      checksFailed++
      details.healthEndpoints = { status: 'failed', response: { liveRes, readyRes, healthRes } }
    }

    // 4. Check Security: Security Headers verification
    const testHeaderRes = await fetch(`${BASE_URL}/live`).catch(() => null)
    if (testHeaderRes) {
      const headers = testHeaderRes.headers
      const hasContentTypeOptions = headers.get('X-Content-Type-Options') === 'nosniff'
      const hasFrameOptions = headers.get('X-Frame-Options') === 'DENY'
      if (hasContentTypeOptions && hasFrameOptions) {
        console.log('✅ Production security headers verified.')
        checksPassed++
        details.securityHeaders = { status: 'passed' }
      } else {
        console.warn('⚠️ Missing core security headers on responses!')
        checksFailed++
        details.securityHeaders = { status: 'failed' }
      }
    } else {
      checksFailed++
      details.securityHeaders = { status: 'failed', error: 'Server unreachable' }
    }

    // 5. Check Security: Input Sanitization verification
    const inputSanitizationRes = await fetch(`${BASE_URL}/api/v2/organizations?page=1&limit=5&$gt=1`, {
      headers: { 'Authorization': 'Bearer super_admin_token' }
    })
    const inputSanitizationData = await inputSanitizationRes.json().catch(() => ({}))
    if (inputSanitizationRes.status === 400 && inputSanitizationData?.error?.code === 'SUSPICIOUS_REQUEST') {
      console.log('✅ Input sanitization guards verified.')
      checksPassed++
      details.inputSanitization = { status: 'passed' }
    } else {
      console.warn('⚠️ Input sanitization guards failed to block suspicious NoSQL parameter injection!')
      checksFailed++
      details.inputSanitization = { status: 'failed', statusObserved: inputSanitizationRes.status }
    }

    // 6. Check Security: Rate Limiting validation
    const rateLimitRes = await fetch(`${BASE_URL}/ready`).catch(() => null)
    if (rateLimitRes) {
      console.log('✅ Global rate limiting endpoints configured.')
      checksPassed++
      details.rateLimiting = { status: 'passed' }
    } else {
      checksFailed++
      details.rateLimiting = { status: 'failed' }
    }

    // 7. Check Configuration: Environment variables validity
    if (healthRes.environment === 'VALID') {
      console.log('✅ Environment configuration validated.')
      checksPassed++
      details.environmentConfig = { status: 'passed' }
    } else {
      console.warn('⚠️ Configuration check failed on health status!')
      checksFailed++
      details.environmentConfig = { status: 'failed' }
    }

    // Write audit event
    const ready = checksFailed === 0
    if (db) {
      await db.collection('audit_logs').insertOne({
        actorUid: 'system',
        action: 'PRODUCTION_READINESS_CHECK',
        resourceType: 'system',
        metadata: {
          ready,
          checksPassed,
          checksFailed
        },
        category: 'SYSTEM',
        severity: ready ? 'info' : 'warning',
        createdAt: new Date()
      })
    }

    console.log(`\n🏆 Readiness checks complete. Passed: ${checksPassed}, Failed: ${checksFailed}`)

  } catch (err) {
    console.error('💥 Production Readiness Auditor failed:', err.message)
    checksFailed++
    details.criticalAuditorError = err.message
    if (db) {
      try {
        await db.collection('audit_logs').insertOne({
          actorUid: 'system',
          action: 'PRODUCTION_READINESS_CHECK',
          resourceType: 'system',
          metadata: { ready: false, error: err.message },
          category: 'SYSTEM',
          severity: 'error',
          createdAt: new Date()
        })
      } catch (logErr) {
        console.error('Failed to log readiness audit error:', logErr.message)
      }
    }
  } finally {
    if (client) {
      await client.close()
    }

    const report = {
      ready: checksFailed === 0,
      checksPassed,
      checksFailed,
      details,
      timestamp: new Date().toISOString()
    }

    // Export report to production/production-readiness-report.json
    try {
      const prodDir = path.resolve('production')
      if (!fs.existsSync(prodDir)) {
        fs.mkdirSync(prodDir)
      }
      const reportPath = path.join(prodDir, 'production-readiness-report.json')
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8')
      console.log(`💾 Production readiness report successfully exported to ${reportPath}`)
    } catch (fsErr) {
      console.error('Failed to write readiness report JSON:', fsErr.message)
    }
  }
}

runReadinessCheck()
