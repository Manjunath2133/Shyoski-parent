# Security Architecture & Tenant Isolation Model

This document outlines the security architecture, data isolation boundaries, and request protections implemented across the Shyoski V2 platform.

---

## 1. Multi-Tenant Isolation (SaaS Boundaries)

Shyoski V2 enforces a strict logical multi-tenant database model. All records in MongoDB are annotated with an `organizationId` parameter. 

### Data Access Guards:
1. **Tenant Middleware Isolation (`RequireTenantRole`)**:
   * Evaluates the caller's Firebase context to retrieve active membership.
   * Resolves the requested tenant identifier (`orgId` or `id`) from route parameters or Hono context, preventing cross-tenant request parameter spoofing.
   * Restricts reads/writes unless the authenticated user is registered inside the organization's memberships list.
2. **Tenant Lifecycle Isolation**:
   * **Suspended Organizations**: Block all access (`403 Forbidden`). No reads or writes are processed.
   * **Archived Organizations**: Block mutating HTTP methods (`POST`, `PUT`, `DELETE`, `PATCH`). The organization becomes read-only.
3. **Suspended Members Lockout**:
   * Standardized guard `RequireMembershipActive()` immediately rejects requests from suspended members across all cohort, group, or billing scopes.

---

## 2. Capability Matrix & RBAC

Tenant roles map to permission arrays defined in `src/lib/rbac.js`:

| Role | Scopes & Capabilities | System Bypass |
| :--- | :--- | :--- |
| `org_admin` | Member management, batch settings, invitation approvals, payment actions. | Bypasses batch staff assignment checks. |
| `mentor` | Cohort chat posting, group detail reads. | Restricted to assigned batches. |
| `evaluator` | Grading coursework, reviewing student submissions. | Restricted to assigned batches (read-only on chats). |
| `student` | Submitting assignments, group chat writes, certificate claims. | Flat ownership check matches context UID. |
| `super_admin` | Platform setup, organization creation, system overrides. | Bypasses all tenant and ownership boundaries. |

---

## 3. API Protection & Rate Limiting

To prevent DoS, spam, and brute force requests, endpoints are rate-limited using an in-memory token bucket limiter (`src/lib/rate-limit.js`):

| Scope | Limit / Window | Category | Purpose |
| :--- | :--- | :--- | :--- |
| **IP Address** | 10 / minute | `AUTH` | Protects onboarding/invitation accept routes from credential stuffing. |
| **IP Address** | 60 / minute | `PUBLIC` | Protects anonymous endpoints and landing pages. |
| **IP Address** | 300 / minute | `AUTHENTICATED` | General API rate limiting for registered users. |
| **User UID** | 10 / minute | `CERTIFICATE_CLAIM` | Protects certificate generation and reissues from spam scripts. |

---

## 4. Input Sanitization & Anti-Injection

The platform implements a global recursive sanitizer middleware `SanitizeInput` in `src/middleware/security.js` that scans both incoming query strings and JSON payload bodies:

1. **NoSQL operator filtering**:
   * Rejects keys containing the `$` symbol (e.g. `$where`, `$gt`, `$ne`), preventing attackers from injecting custom MongoDB operators to bypass queries.
2. **Prototype Pollution checks**:
   * Scans and rejects keys matching `__proto__`, `constructor`, and `prototype` recursively to prevent pollution of JavaScript class prototypes.
3. **Audit Tracing**:
   * Rejections emit a `SUSPICIOUS_REQUEST` audit log entry containing the offending request method and route path.

---

## 5. Webhook Validation & Replay Controls

Razorpay callback endpoints implement strict timing-attack and replay protection:

* **Constant-Time Verification**: Uses Node's `crypto.timingSafeEqual` signature check to prevent attackers from analyzing microsecond verification offsets to reverse-engineer webhook secrets.
* **Freshness Check**: Extracts `created_at` timestamp from incoming webhook events. If the timestamp is older than 300 seconds, the request is rejected as a replay attempt (`WEBHOOK_SIGNATURE_FAILED`).
