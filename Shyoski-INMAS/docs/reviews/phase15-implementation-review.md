# Phase 15 Implementation Review: Security Hardening

This document reviews the enterprise-grade security controls and hardening policies implemented in Phase 15 of the Shyoski V2 backend platform.

---

## 1. Request Filtering & Input Sanitization

To protect the platform against injection and prototype pollution, we implemented a global input validation middleware in `src/middleware/security.js`.

### Key Mitigations:
1. **NoSQL Injection Filter**:
   * Recursively scans incoming HTTP request query parameters and body payloads for keys starting with the `$` prefix (e.g. `$gt`, `$where`), which are MongoDB operators.
   * Blocks requests matching these patterns by returning a `400 Bad Request` with a standardized error code `SUSPICIOUS_REQUEST` and logging a `SUSPICIOUS_REQUEST` audit event.
2. **Prototype Pollution Guard**:
   * Recursively scans request payloads for dangerous prototype keys: `__proto__`, `constructor`, and `prototype`.
   * Rejects suspicious requests immediately before they reach standard routes or JSON parser hooks.
3. **Request Size Limiting**:
   * Enforces a strict 1MB size limit on request bodies globally. If an incoming payload exceeds this boundary, the middleware interrupts processing and returns a `413 Payload Too Large` with the standardized error format.

---

## 2. API Hardening & Security Headers

To establish a secure HTTP response posture, we configured a set of industry-standard security headers globally:

* **`X-Content-Type-Options: nosniff`**: Prevents MIME-type sniffing.
* **`X-Frame-Options: DENY`**: Mitigates clickjacking attacks.
* **`Referrer-Policy: strict-origin-when-cross-origin`**: Controls referrer data leaks.
* **`Permissions-Policy`**: Restricts browser features (camera, microphone, geolocation).
* **`Cache-Control`**: Configured custom cache lifetimes on public routes (e.g., public certificate verification endpoints are allowlisted for 300s cache lifespan).

---

## 3. Token Bucket Rate Limiting

We implemented an in-memory token bucket rate limiter to protect endpoints from abuse, credential stuffing, and spam:

| Category | Limit / Window | Scope | Example Routes |
| :--- | :--- | :--- | :--- |
| `AUTH` | 10 req / minute | Client IP | `/api/v2/organizations/invitations/accept` |
| `PUBLIC` | 60 req / minute | Client IP | Public APIs / Landing Pages |
| `CERTIFICATE_CLAIM` | 10 req / minute | Authenticated User UID | `/api/v2/organizations/:orgId/batches/:batchId/certificates/claim` |
| `AUTHENTICATED` | 300 req / minute | Client IP | Standard User APIs |

### Key Mechanics:
* Exceeding limits returns a `429 Rate Limit Exceeded` response.
* An audit event with the action `RATE_LIMIT_EXCEEDED` is recorded for tracking security metrics.
* **Prioritization**: Sensitive rate limiters (like `CERTIFICATE_CLAIM`) execute immediately after authentication (`RequireAuth`) to protect downstream database operations from query overload.

---

## 4. Webhook Hardening & Replay Protection

Razorpay billing webhook endpoints were hardened against signature spoofing and replay attacks:

* **Constant-Time Verification**: Replaced loose comparisons with `crypto.timingSafeEqual` to eliminate timing side-channel attacks on API signatures.
* **Freshness Check (Replay Protection)**: Ensures that the event's `created_at` timestamp is within a 300-second freshness window relative to the server time. If the payload is older, it is rejected with a `400 Bad Request` (`WEBHOOK_SIGNATURE_FAILED`) and audited under `WEBHOOK_SIGNATURE_FAILED`.

---

## 5. Security Metrics & Audits

We added system-wide security observability and automated testing:

1. **Security Health Metrics Endpoint** (`GET /api/v2/system/security`):
   * Exposes aggregated numbers of security events: `rateLimitViolations`, `permissionDeniedEvents`, `failedWebhookSignatures`, `suspiciousRequests`, `authFailures`, and the timestamp of the last security violation.
2. **Automated Auditor** (`security/security-review.mjs`):
   * An integration script verifying authorization boundaries, cross-tenant isolation, resource ownership controls, membership suspension lockouts, and archived tenant write-blocks.
   * Produces a clean JSON summary at `security/authorization-review.json`.
