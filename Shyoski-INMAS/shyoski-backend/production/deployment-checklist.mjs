// production/deployment-checklist.mjs
import fs from 'node:fs'
import path from 'node:path'

async function runChecklistGenerator() {
  console.log('📋 Compiling Production Deployment Checklist...\n')

  const checklist = {
    environmentConfigured: false,
    databaseConnected: false,
    indexesInitialized: false,
    securityMiddlewareEnabled: false,
    healthChecksEnabled: false,
    backupValidated: false,
    monitoringEnabled: false
  }

  // 1. Check environment config report
  try {
    const envReportPath = path.resolve('environment-validation-report.json')
    if (fs.existsSync(envReportPath)) {
      const data = JSON.parse(fs.readFileSync(envReportPath, 'utf8'))
      checklist.environmentConfigured = data.valid === true
    }
  } catch (e) {
    console.error('Failed to parse environment validation report:', e.message)
  }

  // 2. Check backup validation report
  try {
    const backupReportPath = path.resolve('backup/backup-validation-report.json')
    if (fs.existsSync(backupReportPath)) {
      const data = JSON.parse(fs.readFileSync(backupReportPath, 'utf8'))
      checklist.backupValidated = data.success === true
    }
  } catch (e) {
    console.error('Failed to parse backup validation report:', e.message)
  }

  // 3. Check readiness report for database, indexes, headers, sanitization and health checks
  try {
    const readinessReportPath = path.resolve('production/production-readiness-report.json')
    if (fs.existsSync(readinessReportPath)) {
      const data = JSON.parse(fs.readFileSync(readinessReportPath, 'utf8'))
      const details = data.details || {}
      
      checklist.databaseConnected = details.mongodbConnection?.status === 'passed'
      checklist.indexesInitialized = details.mongodbIndexes?.status === 'passed'
      
      checklist.securityMiddlewareEnabled = 
        details.securityHeaders?.status === 'passed' &&
        details.inputSanitization?.status === 'passed'
        
      checklist.healthChecksEnabled = details.healthEndpoints?.status === 'passed'
      checklist.monitoringEnabled = checklist.healthChecksEnabled
    }
  } catch (e) {
    console.error('Failed to parse readiness auditor report:', e.message)
  }

  console.log('Result Checklist:')
  console.log(JSON.stringify(checklist, null, 2))

  // Write deployment-checklist.json
  try {
    const checklistPath = path.resolve('production/deployment-checklist.json')
    fs.writeFileSync(checklistPath, JSON.stringify(checklist, null, 2), 'utf8')
    console.log(`\n💾 Deployment checklist successfully exported to ${checklistPath}`)
  } catch (fsErr) {
    console.error('Failed to write deployment checklist JSON:', fsErr.message)
  }
}

runChecklistGenerator()
