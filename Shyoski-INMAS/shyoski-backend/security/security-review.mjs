// security/security-review.mjs
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

const BASE_URL = 'http://localhost:8788'
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shyoski_v2'

async function runReview() {
  console.log('🛡️ Running Automated Authorization Review Security Auditor...\n')
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db = client.db('shyoski_v2')

  const seeded = {
    organizations: [],
    organization_memberships: [],
    batches: [],
    submissions: []
  }

  const checks = [
    { name: "cross_tenant_access", status: "failed", message: "Not validated" },
    { name: "ownership_bypass", status: "failed", message: "Not validated" },
    { name: "membership_suspension_bypass", status: "failed", message: "Not validated" },
    { name: "archived_org_mutation", status: "failed", message: "Not validated" }
  ]

  let criticalFailures = 0

  async function makeRequest(method, path, token) {
    const headers = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    const res = await fetch(`${BASE_URL}${path}`, { method, headers })
    const data = await res.json().catch(() => ({}))
    return { status: res.status, data }
  }

  try {
    const timestamp = Date.now()
    
    // 1. Seed two organizations (Org A and Org B)
    const orgA = { name: 'Audit Org A', slug: `audit-org-a-${timestamp}`, organizationCode: `AUDA${Math.floor(10+Math.random()*90)}`, status: 'active', isLoadTest: true, createdAt: new Date() }
    const orgB = { name: 'Audit Org B', slug: `audit-org-b-${timestamp}`, organizationCode: `AUDB${Math.floor(10+Math.random()*90)}`, status: 'active', isLoadTest: true, createdAt: new Date() }
    
    const orgRes = await db.collection('organizations').insertMany([orgA, orgB])
    const orgAId = orgRes.insertedIds[0].toString()
    const orgBId = orgRes.insertedIds[1].toString()
    seeded.organizations.push(new ObjectId(orgAId), new ObjectId(orgBId))

    // 2. Seed Users & Memberships
    const studentAUid = `firebase_stud_a_${timestamp}`
    const studentBUid = `firebase_stud_b_${timestamp}`
    
    const memStudentA = { organizationId: new ObjectId(orgAId), uid: studentAUid, role: 'student', status: 'active', isLoadTest: true }
    const memStudentB = { organizationId: new ObjectId(orgBId), uid: studentBUid, role: 'student', status: 'active', isLoadTest: true }
    
    const memRes = await db.collection('organization_memberships').insertMany([memStudentA, memStudentB])
    seeded.organization_memberships.push(...Object.values(memRes.insertedIds))

    // 3. Seed Batch and Submission in Org A
    const batchA = { organizationId: new ObjectId(orgAId), batchName: 'Audit Batch A', batchCode: `B-AUD-${timestamp}`, status: 'active', isLoadTest: true, createdAt: new Date() }
    const batchRes = await db.collection('batches').insertOne(batchA)
    const batchAId = batchRes.insertedId.toString()
    seeded.batches.push(new ObjectId(batchAId))

    const submissionA = { organizationId: new ObjectId(orgAId), batchId: new ObjectId(batchAId), uid: studentAUid, assignmentId: new ObjectId(), status: 'pending', attemptNumber: 1, isLoadTest: true, createdAt: new Date() }
    const subRes = await db.collection('submissions').insertOne(submissionA)
    const subAId = subRes.insertedId.toString()
    seeded.submissions.push(new ObjectId(subAId))

    console.log('🌱 Sandbox test environment seeded successfully. Initiating security boundary checks...')

    // --- CHECK 1: Cross-Tenant Access Check ---
    // Student B (Org B member) tries to fetch Org A submission details
    const crossTenantRes = await makeRequest('GET', `/api/v2/organizations/${orgAId}/submissions/${subAId}`, studentBUid)
    if (crossTenantRes.status === 403 && crossTenantRes.data?.error?.code === 'PERMISSION_DENIED') {
      checks[0].status = 'passed'
      checks[0].message = 'Cross-tenant access attempts successfully blocked with 403 PERMISSION_DENIED'
    } else {
      checks[0].status = 'failed'
      checks[0].message = `VULNERABILITY: Cross-tenant check returned status ${crossTenantRes.status} instead of 403 PERMISSION_DENIED (Payload: ${JSON.stringify(crossTenantRes.data)})`
      criticalFailures++
    }

    // --- CHECK 2: Resource Ownership Bypass Check ---
    // Student B tries to fetch Student A's submission details under Org A (if Student B was added to Org A but does not own submission)
    // Add Student B to Org A membership temporarily
    const tempMemberId = new ObjectId()
    await db.collection('organization_memberships').insertOne({
      _id: tempMemberId, organizationId: new ObjectId(orgAId), uid: studentBUid, role: 'student', status: 'active', isLoadTest: true
    })
    
    const ownershipRes = await makeRequest('GET', `/api/v2/organizations/${orgAId}/submissions/${subAId}`, studentBUid)
    // Remove temporary membership
    await db.collection('organization_memberships').deleteOne({ _id: tempMemberId })

    if (ownershipRes.status === 403 && ownershipRes.data?.error?.code === 'PERMISSION_DENIED') {
      checks[1].status = 'passed'
      checks[1].message = 'Ownership bypass attempts successfully blocked with 403 PERMISSION_DENIED'
    } else {
      checks[1].status = 'failed'
      checks[1].message = `VULNERABILITY: Ownership check returned status ${ownershipRes.status} instead of 403 (Payload: ${JSON.stringify(ownershipRes.data)})`
      criticalFailures++
    }

    // --- CHECK 3: Membership Suspension Bypass Check ---
    // Suspend Student A's membership in Org A
    await db.collection('organization_memberships').updateOne(
      { uid: studentAUid, organizationId: new ObjectId(orgAId) },
      { $set: { status: 'suspended' } }
    )

    const suspensionRes = await makeRequest('GET', `/api/v2/organizations/${orgAId}/batches`, studentAUid)
    if (suspensionRes.status === 403 && suspensionRes.data?.error?.code === 'PERMISSION_DENIED') {
      checks[2].status = 'passed'
      checks[2].message = 'Membership suspension bypass attempts successfully blocked with 403 PERMISSION_DENIED'
    } else {
      checks[2].status = 'failed'
      checks[2].message = `VULNERABILITY: Suspended member allowed access, status: ${suspensionRes.status} (Payload: ${JSON.stringify(suspensionRes.data)})`
      criticalFailures++
    }

    // Restore Student A
    await db.collection('organization_memberships').updateOne(
      { uid: studentAUid, organizationId: new ObjectId(orgAId) },
      { $set: { status: 'active' } }
    )

    // --- CHECK 4: Archived Tenant Write Mutation Check ---
    // Archive Org A
    await db.collection('organizations').updateOne(
      { _id: new ObjectId(orgAId) },
      { $set: { status: 'archived' } }
    )

    // Onboard Admin A to test write
    const adminAUid = `firebase_admin_a_${timestamp}`
    const memAdminId = new ObjectId()
    await db.collection('organization_memberships').insertOne({
      _id: memAdminId, organizationId: new ObjectId(orgAId), uid: adminAUid, role: 'org_admin', status: 'active', isLoadTest: true
    })

    // Try to create batch inside archived organization
    const archivedRes = await makeRequest('POST', `/api/v2/organizations/${orgAId}/batches`, adminAUid)
    
    // Clean up admin membership
    await db.collection('organization_memberships').deleteOne({ _id: memAdminId })

    if (archivedRes.status === 403 && archivedRes.data?.error?.code === 'PERMISSION_DENIED') {
      checks[3].status = 'passed'
      checks[3].message = 'Archived organization mutations successfully blocked with 403 PERMISSION_DENIED'
    } else {
      checks[3].status = 'failed'
      checks[3].message = `VULNERABILITY: Archived organization mutation allowed, status: ${archivedRes.status} (Payload: ${JSON.stringify(archivedRes.data)})`
      criticalFailures++
    }

    console.log(`🔍 Review finished. Critical failures: ${criticalFailures}`)

  } catch (err) {
    console.error('⚠️ Security Auditor check encountered a runtime error:', err.message)
    criticalFailures++
  } finally {
    // Clean up sandboxed records
    console.log('🧹 Purging sandboxed security auditor records...')
    if (seeded.organizations.length > 0) await db.collection('organizations').deleteMany({ _id: { $in: seeded.organizations } })
    if (seeded.organization_memberships.length > 0) await db.collection('organization_memberships').deleteMany({ _id: { $in: seeded.organization_memberships } })
    if (seeded.batches.length > 0) await db.collection('batches').deleteMany({ _id: { $in: seeded.batches } })
    if (seeded.submissions.length > 0) await db.collection('submissions').deleteMany({ _id: { $in: seeded.submissions } })
    await db.collection('organization_memberships').deleteMany({ isLoadTest: true })
    
    await client.close()

    // Export report.json
    const reportDir = path.resolve('security')
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir)
    }
    const reportPath = path.join(reportDir, 'authorization-review.json')
    const report = {
      timestamp: new Date().toISOString(),
      criticalFailures,
      checks
    }
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8')
    console.log(`💾 Security report exported to ${reportPath}`)
  }
}

runReview().catch(console.error)
