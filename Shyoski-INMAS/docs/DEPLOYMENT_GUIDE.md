# Production Deployment Guide

This document describes the steps required to deploy the Shyoski V2 backend application to production environments.

---

## 1. Prerequisites

Before starting the deployment, ensure you have configured:
* A Cloudflare account with a Workers Paid Subscription (recommended for CPU and request size headroom).
* A MongoDB Atlas Cluster (M10 tier or higher recommended for production index performance).
* A Firebase Console project with email/password authentication enabled.
* A Razorpay merchant account for capturing cohort registration fees.

---

## 2. Configuration Setup

Shyoski V2 validates environment configurations on startup. You must provision the following variables:

| Variable Name | Type | Description |
| :--- | :--- | :--- |
| `MONGODB_URI` | Secret | MongoDB Atlas connection string (e.g. `mongodb+srv://...`). |
| `MONGODB_DB` | Variable | The target database name (e.g., `shyoski_v2`). |
| `FIREBASE_PROJECT_ID` | Variable | The Firebase project ID for validating user auth tokens. |
| `RAZORPAY_KEY_ID` | Variable | The API Key ID retrieved from Razorpay console. |
| `RAZORPAY_KEY_SECRET` | Secret | The API Key Secret retrieved from Razorpay console. |
| `RAZORPAY_WEBHOOK_SECRET` | Secret | The Webhook Signature secret configured on Razorpay events callbacks. |
| `ENVIRONMENT` | Variable | Must be set to `production`. |

### Cloudflare Worker Config (`wrangler.jsonc`)
For Cloudflare deployment settings, the bindings are defined inside `wrangler.jsonc`:
```json
{
  "name": "shyoski-backend",
  "main": "src/index.js",
  "compatibility_date": "2026-06-19",
  "vars": {
    "MONGODB_DB": "shyoski_v2",
    "ENVIRONMENT": "production"
  }
}
```

To configure secrets locally or in CI/CD pipelines, execute:
```bash
npx wrangler secret put MONGODB_URI
npx wrangler secret put RAZORPAY_KEY_SECRET
npx wrangler secret put RAZORPAY_WEBHOOK_SECRET
```

---

## 3. Deploying to Cloudflare Workers

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Run Production Readiness checks locally
Verify your settings against a live staging server:
```bash
node production/readiness-check.mjs
node production/deployment-checklist.mjs
```
Review the generated `production/deployment-checklist.json` to ensure all fields are set to `true`.

### Step 3: Deploy the application
Run the Wrangler deployment pipeline command:
```bash
npm run deploy
```
This registers the routing gateways and starts the worker global isolates on Cloudflare Edge nodes.

---

## 4. Verification Check
After a successful deployment, verify the live status of the endpoints:
```bash
curl -f https://shyoski-backend.yourdomain.workers.dev/live
curl -f https://shyoski-backend.yourdomain.workers.dev/ready
curl -f https://shyoski-backend.yourdomain.workers.dev/health
```
If `/health` returns status `HEALTHY` and version `2.0.0`, the deployment is certified.
