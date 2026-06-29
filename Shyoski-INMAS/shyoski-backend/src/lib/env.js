// src/lib/env.js

/**
 * Validates the presence of required environment variables.
 * Refuses startup if any required environment variable is missing.
 * @param {object} env The environment bindings object
 */
export async function validateEnvironment(env, writeReport = false) {
  const required = [
    'MONGODB_URI',
    'MONGODB_DB',
    'FIREBASE_PROJECT_ID',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'RAZORPAY_WEBHOOK_SECRET'
  ]

  const missing = []
  for (const key of required) {
    if (!env || !env[key]) {
      missing.push(key)
    }
  }

  const optional = [
    'SENTRY_DSN',
    'APP_VERSION',
    'BUILD_TIMESTAMP',
    'ZAMMAD_URL',
    'ZAMMAD_API_TOKEN',
    'ZAMMAD_DEFAULT_GROUP',
    'ZAMMAD_WEBHOOK_SECRET'
  ]
  const presentOptional = {}
  for (const key of optional) {
    presentOptional[key] = (env && env[key]) ? 'PRESENT' : 'MISSING'
  }

  const report = {
    timestamp: new Date().toISOString(),
    valid: missing.length === 0,
    required,
    missing,
    optional: presentOptional,
    environment: env?.ENVIRONMENT || 'production'
  }

  // Attempt to write the report file locally if requested
  if (writeReport) {
    try {
      const fs = await import('node:fs')
      const path = await import('node:path')
      fs.writeFileSync(path.resolve('environment-validation-report.json'), JSON.stringify(report, null, 2), 'utf8')
    } catch (e) {
      // Ignore in non-Node environments (like production Cloudflare Workers)
    }
  }

  if (missing.length > 0) {
    const err = new Error(`${missing[0]} is required`)
    err.code = 'MISSING_ENVIRONMENT_VARIABLE'
    err.status = 500
    throw err
  }

  return report
}
