# Production Operations Runbook

This runbook describes operational guidelines, alert metrics, system failure diagnoses, and logging patterns for maintaining the Shyoski V2 backend platform.

---

## 1. Monitoring & Operational Alerts

Platform operators must set up alerts on Cloudflare Workers and MongoDB Atlas metrics:

### Core Alert Thresholds:
* **Worker Execution Duration**: Trigger warning if average duration exceeds **150ms** (indicates slow database queries or index fragmentation).
* **Uncaught Exceptions (5xx Errors)**: Trigger alert if error count exceeds **1% of requests** in a 5-minute window.
* **Rate Limiting Violations (429 Status)**: Monitor for spikes in 429 errors (indicates active brute force, scrapers, or credential abuse).
* **Webhook Signature Failures**: Trigger alert if signature verification fails more than **5 times within 10 minutes** (possible webhook endpoint scanning or credential rot).

---

## 2. Troubleshooting & Log Analysis

When troubleshooting a production error, leverage the Hono correlation engine.

### Error Correlation Flow:
1. **Uncaught Error response**: When a 500 error occurs, the server responds with a masked JSON payload containing a `correlationId`:
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "correlationId": "872c88ce-11e4-6c06-b33a-982dc6b190ff"
  }
}
```
2. **Retrieve Log Files**: Open your centralized logging console (e.g. Sentry, Datadog, or Cloudflare logs) and search for the `correlationId`:
```text
Filter: correlationId="872c88ce-11e4-6c06-b33a-982dc6b190ff"
```
3. **Audit Log Lookup**: The correlation ID is also written directly to the database under the `audit_logs` collection:
```javascript
db.audit_logs.findOne({ "metadata.correlationId": "872c88ce-11e4-6c06-b33a-982dc6b190ff" })
```

---

## 3. Standard Resolutions for Common Issues

### Issue 1: `MISSING_ENVIRONMENT_VARIABLE` Startup Block
* **Symptom**: Root endpoints or API requests fail with status 500 and code `MISSING_ENVIRONMENT_VARIABLE`.
* **Diagnosis**: Required bindings (e.g., `RAZORPAY_WEBHOOK_SECRET`) were not uploaded to Cloudflare.
* **Resolution**: Run `wrangler secret put <VARIABLE_NAME>` or add the variable in the Cloudflare Workers Dashboard under Settings ➔ Variables.

### Issue 2: `WEBHOOK_SIGNATURE_FAILED` on Payment Callback
* **Symptom**: Webhook events fail with status 400.
* **Diagnosis**: Webhook signature verification fails either due to:
  * Incorrect `RAZORPAY_WEBHOOK_SECRET` binding.
  * Replay attacks (event `created_at` timestamp is older than 300s).
* **Resolution**: Verify that the secret in Razorpay's Webhook configuration matches `RAZORPAY_WEBHOOK_SECRET` secret in Cloudflare. Check for event delivery delays in Razorpay's dashboard.

### Issue 3: Degraded `/ready` Endpoint
* **Symptom**: `/ready` returns status 503 and reports `indexes: NOT_READY`.
* **Diagnosis**: MongoDB index creation is still running asynchronously in the background.
* **Resolution**: Wait up to 60 seconds for cold-start index creation to finish. If it persists, inspect MongoDB logs using `db.currentOp()` to check for blocked background index builds.
