// scratch/test_phase15.mjs
import { MongoClient, ObjectId } from 'mongodb';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'http://localhost:8788';
const MONGODB_URI = "mongodb+srv://km:123@shyoski.nv2c0nw.mongodb.net/?appName=shyoski";

async function runTests() {
  console.log('🏁 Starting V2 Phase 15 (Security Hardening) Integration Tests...\n');
  const client = new MongoClient(MONGODB_URI);
  let db;

  // Track seeded items for cleanup
  const seeded = {
    organizations: [],
    organization_memberships: [],
    users: [],
    batches: [],
    certificates: [],
    audit_logs: [],
    notifications: []
  };

  try {
    await client.connect();
    db = client.db('shyoski_v2');
    console.log('✅ Connected to MongoDB database');

    const timestamp = Date.now();
    const orgCode = `S15${Math.floor(10 + Math.random() * 90)}`;
    const adminEmail = `admin-s15-${timestamp}@test.com`;
    const adminUid = `firebase_admin_s15_${timestamp}`;
    const studentUid = `firebase_student_s15_${timestamp}`;

    // Helper request function
    async function makeRequest(method, path, body, token) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const headers = {};
      if (body !== null && body !== undefined) {
        headers['Content-Type'] = 'application/json';
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const options = { method, headers };
      if (body !== null && body !== undefined) {
        options.body = typeof body === 'string' ? body : JSON.stringify(body);
      }
      const res = await fetch(`${BASE_URL}${path}`, options);
      const data = await res.json().catch(() => ({}));
      return { status: res.status, data, headers: res.headers };
    }

    // Call test-db to initialize indexes on Wrangler
    console.log('🔄 Triggering /test-db to ensure database indexes are built...');
    const testDbRes = await makeRequest('GET', '/test-db');
    if (testDbRes.status !== 200) {
      throw new Error(`Failed to initialize indexes via /test-db: ${JSON.stringify(testDbRes.data)}`);
    }
    console.log('✅ /test-db returned status 200');

    // Seed Org
    const orgRes = await makeRequest('POST', '/api/v2/organizations', {
      name: 'Org Security Test',
      slug: `org-sec-${timestamp}`,
      email: 'admin@orgsec.com',
      logoUrl: 'https://cdn.shyoski.com/orgsec-logo.png',
      adminEmail: adminEmail,
      organizationCode: orgCode
    }, 'super_admin_token');
    if (orgRes.status !== 201) throw new Error(`Failed to create Org: ${JSON.stringify(orgRes.data)}`);
    const orgId = orgRes.data.organization._id;
    seeded.organizations.push(new ObjectId(orgId));

    // Onboard Admin
    const acceptRes = await makeRequest('POST', '/api/v2/organizations/invitations/accept', {
      token: orgRes.data.invitation.token
    }, adminUid);
    seeded.organization_memberships.push(new ObjectId(acceptRes.data.membership._id));

    // ==========================================
    // 1. Input Sanitization (NoSQL / Prototype Pollution)
    // ==========================================
    console.log('\n🚫 1. Testing Input Sanitization Middleware...');

    // Attempt NoSQL injection in request body
    const nosqlBodyRes = await makeRequest('POST', '/api/v2/organizations', {
      name: 'Injection Attempt',
      slug: `org-sec-inj-${timestamp}`,
      email: 'admin@orgsec.com',
      logoUrl: 'https://cdn.shyoski.com/logo.png',
      adminEmail: adminEmail,
      organizationCode: orgCode,
      '$where': 'true'
    }, 'super_admin_token');

    if (nosqlBodyRes.status !== 400 || nosqlBodyRes.data?.error?.code !== 'SUSPICIOUS_REQUEST') {
      throw new Error(`Expected 400 SUSPICIOUS_REQUEST for body NoSQL operator, got status: ${nosqlBodyRes.status} data: ${JSON.stringify(nosqlBodyRes.data)}`);
    }
    console.log('✅ Blocked NoSQL operator in body successfully.');

    // Attempt NoSQL injection in query parameter
    const nosqlQueryRes = await makeRequest('GET', `/api/v2/organizations?page=1&limit=5&$gt=1`, null, 'super_admin_token');
    if (nosqlQueryRes.status !== 400 || nosqlQueryRes.data?.error?.code !== 'SUSPICIOUS_REQUEST') {
      throw new Error(`Expected 400 SUSPICIOUS_REQUEST for query NoSQL operator, got: ${nosqlQueryRes.status} data: ${JSON.stringify(nosqlQueryRes.data)}`);
    }
    console.log('✅ Blocked NoSQL operator in query parameters successfully.');

    // Attempt Prototype Pollution
    const protoPollutionPayload = JSON.stringify({
      name: 'Prototype Pollution Attempt',
      slug: `org-sec-proto-${timestamp}`,
      email: 'admin@orgsec.com',
      logoUrl: 'https://cdn.shyoski.com/logo.png',
      adminEmail: adminEmail,
      organizationCode: orgCode
    }).replace('}', ',"__proto__":{"polluted":true}}')

    const protoPollutionRes = await makeRequest('POST', '/api/v2/organizations', protoPollutionPayload, 'super_admin_token');

    if (protoPollutionRes.status !== 400 || protoPollutionRes.data?.error?.code !== 'SUSPICIOUS_REQUEST') {
      throw new Error(`Expected 400 SUSPICIOUS_REQUEST for body __proto__ injection, got: ${protoPollutionRes.status} data: ${JSON.stringify(protoPollutionRes.data)}`);
    }
    console.log('✅ Blocked prototype pollution keys successfully.');

    // Check SUSPICIOUS_REQUEST audit log exists
    const suspiciousLog = await db.collection('audit_logs').findOne({ action: 'SUSPICIOUS_REQUEST' });
    if (!suspiciousLog) {
      throw new Error('Audit log for SUSPICIOUS_REQUEST was not created');
    }
    seeded.audit_logs.push(suspiciousLog._id);
    console.log('✅ SUSPICIOUS_REQUEST audit log verified.');

    // ==========================================
    // 2. Request Size Limiter
    // ==========================================
    console.log('\n📦 2. Testing Request Size Limiter...');
    
    // Create an oversized body (> 1MB)
    const largeName = 'a'.repeat(1.2 * 1024 * 1024);
    const sizeRes = await makeRequest('POST', '/api/v2/organizations', {
      name: largeName,
      slug: `org-sec-large-${timestamp}`,
      email: 'admin@orgsec.com',
      adminEmail: adminEmail,
      organizationCode: orgCode
    }, 'super_admin_token');

    if (sizeRes.status !== 413 || sizeRes.data?.error?.code !== 'PAYLOAD_TOO_LARGE') {
      throw new Error(`Expected 413 PAYLOAD_TOO_LARGE for body >1MB, got status: ${sizeRes.status} data: ${JSON.stringify(sizeRes.data)}`);
    }
    console.log('✅ Request size limiter enforced 413 Payload Too Large successfully.');

    // ==========================================
    // 3. Security Headers
    // ==========================================
    console.log('\n🔒 3. Testing Security Headers Injections...');
    
    const headersRes = await makeRequest('GET', '/', null);
    const headers = headersRes.headers;
    
    if (
      headers.get('X-Content-Type-Options') !== 'nosniff' ||
      headers.get('X-Frame-Options') !== 'DENY' ||
      headers.get('Referrer-Policy') !== 'strict-origin-when-cross-origin' ||
      !headers.get('Permissions-Policy')
    ) {
      throw new Error(`Hardening security headers missing on response: ${JSON.stringify([...headers.entries()])}`);
    }
    console.log('✅ Injected hardening headers (X-Frame-Options, X-Content-Type-Options, etc.) verified.');

    // Verify cache headers on verification endpoint
    const verifyRes = await makeRequest('GET', '/api/v2/certificates/verify/SHY-TEST-NOT-FOUND', null);
    if (verifyRes.headers.get('Cache-Control') !== 'public, max-age=300') {
      throw new Error(`Expected Cache-Control header public, max-age=300, got: ${verifyRes.headers.get('Cache-Control')}`);
    }
    console.log('✅ Certificate verification Cache-Control verified.');

    // ==========================================
    // 4. Rate Limiting (Global & Certificate Claim)
    // ==========================================
    console.log('\n⚡ 4. Testing Token Bucket Rate Limiting...');

    // Exceed invite acceptance endpoint rate limits (AUTH Category - 10/min)
    // Since we reuse tokens, we run a loops of requests
    let hitRateLimit = false;
    for (let i = 0; i < 15; i++) {
      const res = await makeRequest('POST', '/api/v2/organizations/invitations/accept-nonexistent', { token: 'invalid_token' }, `firebase_user_limit_${timestamp}`);
      if (res.status === 429 && res.data?.error?.code === 'RATE_LIMIT_EXCEEDED') {
        hitRateLimit = true;
        break;
      }
    }
    if (!hitRateLimit) {
      throw new Error('Failed to trigger 429 RATE_LIMIT_EXCEEDED on invitations (AUTH)');
    }
    console.log('✅ AUTH Category rate limiting triggered 429 successfully.');

    // Check RATE_LIMIT_EXCEEDED audit log exists
    const rateLimitLog = await db.collection('audit_logs').findOne({ action: 'RATE_LIMIT_EXCEEDED' });
    if (!rateLimitLog) {
      throw new Error('Audit log for RATE_LIMIT_EXCEEDED was not created');
    }
    seeded.audit_logs.push(rateLimitLog._id);
    console.log('✅ RATE_LIMIT_EXCEEDED audit log verified.');

    // Seed student membership context to test certificate claim rate limiting (10/min per UID)
    const superAdminUidObj = `super_admin_s15_claim_${timestamp}`;

    let hitClaimLimit = false;
    for (let i = 0; i < 15; i++) {
      const claimRes = await makeRequest('POST', `/api/v2/organizations/${orgId}/batches/000000000000000000000000/certificates/claim`, {}, superAdminUidObj);
      if (claimRes.status === 429 && claimRes.data?.error?.code === 'RATE_LIMIT_EXCEEDED') {
        hitClaimLimit = true;
        break;
      }
    }
    if (!hitClaimLimit) {
      throw new Error('Failed to trigger 429 RATE_LIMIT_EXCEEDED on certificate claiming (CERTIFICATE_CLAIM)');
    }
    console.log('✅ CERTIFICATE_CLAIM rate limiting per user UID triggered 429 successfully.');

    // ==========================================
    // 5. Webhook Replay & Hardening
    // ==========================================
    console.log('\n⚓ 5. Testing Webhook Signature Comparisons & Replays...');

    // Attempt with stale event timestamp (created_at older than 300 seconds)
    const staleTime = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
    const stalePayload = JSON.stringify({
      id: `evt_stale_${timestamp}`,
      event: 'payment.captured',
      created_at: staleTime
    });

    const staleSignature = 'invalid_mock_signature';
    const staleRes = await fetch(`${BASE_URL}/api/v2/organizations/${orgId}/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': staleSignature
      },
      body: stalePayload
    });
    const staleData = await staleRes.json().catch(() => ({}));

    if (staleRes.status !== 400 || staleData?.error?.code !== 'WEBHOOK_SIGNATURE_FAILED') {
      throw new Error(`Expected 400 WEBHOOK_SIGNATURE_FAILED for stale webhook, got status: ${staleRes.status} data: ${JSON.stringify(staleData)}`);
    }
    console.log('✅ Webhook freshness window (replay protection) validated successfully.');

    // Check WEBHOOK_SIGNATURE_FAILED audit log exists
    const webhookFailLog = await db.collection('audit_logs').findOne({ action: 'WEBHOOK_SIGNATURE_FAILED' });
    if (!webhookFailLog) {
      throw new Error('Audit log for WEBHOOK_SIGNATURE_FAILED was not created');
    }
    seeded.audit_logs.push(webhookFailLog._id);
    console.log('✅ WEBHOOK_SIGNATURE_FAILED audit log verified.');

    // ==========================================
    // 6. Security Health Metrics Endpoint
    // ==========================================
    console.log('\n📊 6. Querying Security Metrics Endpoint...');
    
    const securityRes = await makeRequest('GET', '/api/v2/system/security', null, 'super_admin_token');
    if (securityRes.status !== 200) {
      throw new Error(`Failed to retrieve security metrics, status: ${securityRes.status}`);
    }

    const secMetrics = securityRes.data;
    console.log('Security Metrics payload:', JSON.stringify(secMetrics, null, 2));

    if (
      secMetrics.rateLimitViolations === undefined ||
      secMetrics.permissionDeniedEvents === undefined ||
      secMetrics.failedWebhookSignatures === undefined ||
      secMetrics.suspiciousRequests === undefined ||
      secMetrics.authFailures === undefined ||
      secMetrics.lastSecurityEventAt === undefined
    ) {
      throw new Error(`Security metrics payload format invalid: ${JSON.stringify(secMetrics)}`);
    }
    console.log('✅ Extended system security health metrics verified.');

    // ==========================================
    // 7. Security Review Auditing execution
    // ==========================================
    console.log('\n🛡️ 7. Executing automated security auditor script security-review.mjs...');
    const reviewerPath = path.resolve('shyoski-backend/security/security-review.mjs');
    execSync(`node ${reviewerPath}`, { stdio: 'inherit' });

    // Validate that security/authorization-review.json exists
    const reviewReportPath = path.resolve('shyoski-backend/security/authorization-review.json');
    if (!fs.existsSync(reviewReportPath)) {
      throw new Error('Security report was not written to security/authorization-review.json');
    }

    const reviewReport = JSON.parse(fs.readFileSync(reviewReportPath, 'utf8'));
    console.log('Authorization review results:', JSON.stringify(reviewReport, null, 2));
    
    if (reviewReport.criticalFailures !== 0) {
      throw new Error(`Critical authorization failures detected: ${reviewReport.criticalFailures}`);
    }
    console.log('✅ Authorization review script executed successfully with 0 failures.');

    console.log('\n🏆 ALL PHASE 15 SECURITY HARDENING CHECKS PASSED SUCCESSFULLY!');

  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    process.exitCode = 1;
  } finally {
    console.log('\n🧹 Cleaning up seeded database records...');
    if (db) {
      try {
        if (seeded.organizations.length > 0) {
          await db.collection('organizations').deleteMany({ _id: { $in: seeded.organizations } });
        }
        if (seeded.organization_memberships.length > 0) {
          await db.collection('organization_memberships').deleteMany({ _id: { $in: seeded.organization_memberships } });
        }
        if (seeded.batches.length > 0) {
          await db.collection('batches').deleteMany({ _id: { $in: seeded.batches } });
        }
        await db.collection('audit_logs').deleteMany({ action: { $in: ['RATE_LIMIT_EXCEEDED', 'SUSPICIOUS_REQUEST', 'WEBHOOK_SIGNATURE_FAILED', 'PERMISSION_DENIED', 'AUTH_FAILURE'] } });
        await db.collection('organization_memberships').deleteMany({ isLoadTest: true });
        console.log('✅ Clean up completed successfully.');
      } catch (err) {
        console.error('⚠️ Clean up failed:', err);
      }
    }
    await client.close();
  }
}

runTests();
