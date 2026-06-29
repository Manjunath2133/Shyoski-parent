// scratch/test_phase16.mjs
import { MongoClient } from 'mongodb';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { validateEnvironment } from '../shyoski-backend/src/lib/env.js';

const BASE_URL = 'http://localhost:8788';
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to load env variables from .dev.vars
function loadEnv() {
  try {
    const devVarsPath = path.resolve('shyoski-backend/.dev.vars');
    if (fs.existsSync(devVarsPath)) {
      const content = fs.readFileSync(devVarsPath, 'utf8');
      for (const line of content.split('\n')) {
        const parts = line.split('=');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
          process.env[key] = val;
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse .dev.vars:', e.message);
  }
}

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'shyoski_v2';

async function runTests() {
  console.log('🏁 Starting V2 Phase 16 (Production Readiness) Integration Tests...\n');

  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in environment variables!');
    process.exitCode = 1;
    return;
  }

  const client = new MongoClient(MONGODB_URI);
  let db;

  try {
    await client.connect();
    db = client.db(MONGODB_DB);
    console.log('✅ Connected to MongoDB database');

    // Trigger test-db once to ensure indexing initialization has run
    console.log('🔄 Triggering /test-db...');
    const testDbRes = await fetch(`${BASE_URL}/test-db`).then(r => r.json());
    console.log('✅ Index check trigger completed.');

    // ==========================================
    // 1. Environment Startup Validation
    // ==========================================
    console.log('\n🔍 1. Testing Environment Validation...');
    
    // Assert missing variables throw error
    let threwCorrectly = false;
    try {
      await validateEnvironment({});
    } catch (err) {
      if (err.code === 'MISSING_ENVIRONMENT_VARIABLE') {
        threwCorrectly = true;
      }
    }
    if (!threwCorrectly) {
      throw new Error('Expected validateEnvironment to fail with MISSING_ENVIRONMENT_VARIABLE when keys are empty');
    }
    console.log('✅ validateEnvironment threw correctly for empty environment.');

    // Assert valid variables pass
    const sampleEnv = {
      MONGODB_URI: 'mongodb://localhost',
      MONGODB_DB: 'test',
      FIREBASE_PROJECT_ID: 'test',
      RAZORPAY_KEY_ID: 'test',
      RAZORPAY_KEY_SECRET: 'test',
      RAZORPAY_WEBHOOK_SECRET: 'test'
    };
    const envReport = await validateEnvironment(sampleEnv, true);
    if (!envReport.valid) {
      throw new Error('Expected environment validation report to be valid');
    }

    const envReportPath = path.resolve('environment-validation-report.json');
    if (!fs.existsSync(envReportPath)) {
      throw new Error('Expected environment-validation-report.json to be created locally');
    }
    console.log('✅ validateEnvironment verified environment successfully.');

    // ==========================================
    // 2. Health Monitoring Endpoints
    // ==========================================
    console.log('\n📊 2. Testing Health Monitoring Endpoints...');

    // Live endpoint
    await delay(500);
    const liveRes = await fetch(`${BASE_URL}/live`);
    const liveData = await liveRes.json();
    if (liveRes.status !== 200 || liveData.status !== 'UP') {
      throw new Error(`Expected /live to return status UP, got: ${JSON.stringify(liveData)}`);
    }
    console.log('✅ /live endpoint verified.');

    // Ready endpoint
    await delay(500);
    const readyRes = await fetch(`${BASE_URL}/ready`);
    const readyData = await readyRes.json();
    if (readyRes.status !== 200 || readyData.status !== 'READY') {
      throw new Error(`Expected /ready to return status READY, got: ${JSON.stringify(readyData)}`);
    }
    console.log('✅ /ready endpoint verified.');

    // Health endpoint
    await delay(500);
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    if (
      healthRes.status !== 200 ||
      healthData.status !== 'HEALTHY' ||
      healthData.database !== 'UP' ||
      healthData.indexes !== 'READY' ||
      healthData.environment !== 'VALID' ||
      healthData.version !== '2.0.0' ||
      !healthData.buildTimestamp ||
      typeof healthData.uptimeSeconds !== 'number'
    ) {
      throw new Error(`Expected /health detailed report format invalid: ${JSON.stringify(healthData)}`);
    }
    console.log('✅ /health detailed report verified.');

    // Verify health change transition log
    const healthAuditCount = await db.collection('audit_logs').countDocuments({ action: 'SYSTEM_HEALTH_CHECK' });
    console.log(`ℹ️ Health check audit logs found in DB: ${healthAuditCount} (Normal probes are throttled)`);

    // ==========================================
    // 3. Global Exception Handler & Sentry Monitoring
    // ==========================================
    console.log('\n💥 3. Testing Global Error Handler & Correlation...');

    await delay(500);
    const errRes = await fetch(`${BASE_URL}/test-error`);
    const errData = await errRes.json();

    if (errRes.status !== 500 || errData.success !== false || errData.error?.code !== 'INTERNAL_SERVER_ERROR' || !errData.error?.correlationId) {
      throw new Error(`Expected correlation error masking for 500 exception, got status: ${errRes.status} data: ${JSON.stringify(errData)}`);
    }
    console.log(`✅ Unhandled 500 exception correlation mask verified. Correlation ID: ${errData.error.correlationId}`);

    // Query audit log for SYSTEM_ERROR
    const systemErrorLog = await db.collection('audit_logs').findOne({
      action: 'SYSTEM_ERROR',
      'metadata.correlationId': errData.error.correlationId
    });
    if (!systemErrorLog) {
      throw new Error(`Expected SYSTEM_ERROR audit log to contain correlation ID ${errData.error.correlationId}`);
    }
    console.log('✅ SYSTEM_ERROR audit log recorded successfully.');

    // Verify Sentry payload interceptor
    console.log('🔄 Verifying Sentry async payload reporting...');
    await new Promise(resolve => setTimeout(resolve, 800)); // Wait for Hono waitUntil to resolve Sentry POST fetch
    const sentryPayloadRes = await fetch(`${BASE_URL}/test-sentry-payload`);
    const sentryPayload = await sentryPayloadRes.json();
    
    if (!sentryPayload || sentryPayload.message !== 'Intentional Test Exception') {
      throw new Error(`Expected Sentry message to be 'Intentional Test Exception', got: ${JSON.stringify(sentryPayload)}`);
    }
    if (sentryPayload.extra?.correlationId !== errData.error.correlationId) {
      throw new Error(`Expected Sentry payload correlationId ${errData.error.correlationId}, got: ${sentryPayload.extra?.correlationId}`);
    }
    if (sentryPayload.extra?.route !== '/test-error') {
      throw new Error(`Expected Sentry payload route '/test-error', got: ${sentryPayload.extra?.route}`);
    }
    if (sentryPayload.extra?.method !== 'GET') {
      throw new Error(`Expected Sentry payload method 'GET', got: ${sentryPayload.extra?.method}`);
    }
    console.log('✅ Sentry async reporting payload verified with 100% correct metadata context.');

    // ==========================================
    // 4. Backup Verification Script
    // ==========================================
    console.log('\n📦 4. Executing Backup Validation Script...');
    execSync('node backup/backup-validation.mjs', { stdio: 'inherit', cwd: 'shyoski-backend' });

    const backupReportPath = path.resolve('shyoski-backend/backup/backup-validation-report.json');
    if (!fs.existsSync(backupReportPath)) {
      throw new Error('Backup validation report was not written to file');
    }
    const backupReport = JSON.parse(fs.readFileSync(backupReportPath, 'utf8'));
    if (!backupReport.success) {
      throw new Error(`Backup validation report failed: ${JSON.stringify(backupReport)}`);
    }
    
    // Verify backup audit log
    const backupAudit = await db.collection('audit_logs').findOne({ action: 'BACKUP_VALIDATION' });
    if (!backupAudit || !backupAudit.metadata?.success) {
      throw new Error('BACKUP_VALIDATION audit log record not found or unsuccessful');
    }
    console.log('✅ Backup validation script and sandboxed count checks verified.');

    // ==========================================
    // 5. Production Readiness Script
    // ==========================================
    console.log('\n🛡️ 5. Executing Production Readiness Auditor Script...');
    execSync('node production/readiness-check.mjs', { stdio: 'inherit', cwd: 'shyoski-backend' });

    const readinessReportPath = path.resolve('shyoski-backend/production/production-readiness-report.json');
    if (!fs.existsSync(readinessReportPath)) {
      throw new Error('Production readiness report was not written to file');
    }
    const readinessReport = JSON.parse(fs.readFileSync(readinessReportPath, 'utf8'));
    if (!readinessReport.ready) {
      throw new Error(`Production readiness check reported failures: ${JSON.stringify(readinessReport)}`);
    }

    // Verify readiness check audit log
    const readinessAudit = await db.collection('audit_logs').findOne({ action: 'PRODUCTION_READINESS_CHECK' });
    if (!readinessAudit || !readinessAudit.metadata?.ready) {
      throw new Error('PRODUCTION_READINESS_CHECK audit log record not found or unsuccessful');
    }
    console.log('✅ Production readiness checks passed successfully.');

    // ==========================================
    // 6. Deployment Checklist Script
    // ==========================================
    console.log('\n📋 6. Executing Deployment Checklist Generator...');
    execSync('node production/deployment-checklist.mjs', { stdio: 'inherit', cwd: 'shyoski-backend' });

    const checklistPath = path.resolve('shyoski-backend/production/deployment-checklist.json');
    if (!fs.existsSync(checklistPath)) {
      throw new Error('Deployment checklist file was not created');
    }
    const checklist = JSON.parse(fs.readFileSync(checklistPath, 'utf8'));
    
    const requiredChecklistFields = [
      'environmentConfigured',
      'databaseConnected',
      'indexesInitialized',
      'securityMiddlewareEnabled',
      'healthChecksEnabled',
      'backupValidated',
      'monitoringEnabled'
    ];
    for (const field of requiredChecklistFields) {
      if (checklist[field] !== true) {
        throw new Error(`Expected checklist field ${field} to be true, got: ${checklist[field]}`);
      }
    }
    console.log('✅ Deployment checklist generated with 100% readiness checks passed.');

    console.log('\n🏆 ALL PHASE 16 PRODUCTION PREPARATION TESTS PASSED SUCCESSFULLY!');
    console.log('🚀 SHYOSKI V2 CERTIFIED PRODUCTION READY\n');

  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    process.exitCode = 1;
  } finally {
    console.log('🧹 Purging seeded test audit logs...');
    if (db) {
      try {
        await db.collection('audit_logs').deleteMany({
          action: { $in: ['SYSTEM_ERROR', 'SYSTEM_HEALTH_CHECK', 'BACKUP_VALIDATION', 'PRODUCTION_READINESS_CHECK'] }
        });
        console.log('✅ Clean up completed.');
      } catch (err) {
        console.error('⚠️ Clean up failed:', err.message);
      }
    }
    await client.close();
  }
}

runTests();
