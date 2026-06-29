# SHYOSKI PHASE 8 IMPLEMENTATION REVIEW

## 1. Phase 8 Overview
Phase 8 implements a resilient, multi-tenant billing system integrated with Razorpay. The system enforces webhook-driven capture, idempotency, duplicate order prevention, refund certificate revocation, and strict certificate eligibility criteria.

---

## 2. Architectural Decisions

### A. Webhook-Driven State Mutations (Source of Truth)
* **Decision**: Enforced webhook-only payment state transitions.
* **Details**: 
  * The verification endpoint `/verify` is strictly client-facing and only validates the HMAC signature, returning success/failure without mutating database records.
  * Real database changes (`status = 'captured'`, enrollment updates, audit logging) are processed asynchronously inside the `/payments/webhook` handler. This eliminates race conditions, network failures, or browser window closures from blocking payment tracking.

### B. Duplicate Order Prevention
* **Decision**: Cached active `created` orders in the `payments` collection.
* **Details**: Before requesting a new order from Razorpay's API, the system queries the `payments` collection for any order in the `'created'` status for the target student and cohort. If one exists, its details are returned immediately. This prevents a student from creating multiple active orders for a single fee.

### C. Webhook Idempotency Check
* **Decision**: Utilized a dedicated `webhook_events` collection with a unique index.
* **Details**: A unique index on `webhook_events.eventId` handles webhook duplicate delivery. If Razorpay retries webhook deliveries, the database inserts fail with a unique constraint error (code `11000`), and the system returns a `200 OK` response without executing duplicate status changes.

### D. Cascade Refund Revocation
* **Decision**: Automatically revoke existing certificates on refund events.
* **Details**: When a refund is processed via the `refund.processed` webhook event (or admin API), a cascade process runs:
  1. Updates the `payments` record status to `'refunded'`.
  2. Sets `hasPaid: false` on the student's `batch_enrollments` record.
  3. Checks the `certificates` collection and updates active certificates to `status = 'revoked'` with `revocationReason = 'REFUND'`.
  4. Generates audit logs for the refund and certificate revocation.

### E. Awaited Serverless Audit Logs
* **Decision**: Await database writes in `AuditService.createLog` while preserving error safety.
* **Details**: Pre-existing `createLog` implementations did not await `insertOne` to optimize request latency, which caused writes to get terminated prematurely when Hono request handlers returned responses in serverless contexts. Prepending `await` to `db.collection('audit_logs').insertOne(...)` resolves log truncation while catch-blocks prevent system disruptions on database failures.

---

## 3. Security Review

### A. Webhook Payload Signature Checks
* **Security Guard**: Razorpay webhook requests are validated by reconstructing the HMAC-SHA256 signature using the raw request body and the local `RAZORPAY_WEBHOOK_SECRET` environment variable. Invalid signatures are rejected with `400 Bad Request`.

### B. Student Fee Security Check
* **Security Guard**: Certificate eligibility validation checks do not rely on client-provided flags or the mutable enrollment `hasPaid` field directly. Instead, they explicitly query the `payments` collection for a document with status `'captured'` linked to the specific student-cohort.

### C. Certificate Duplication Prevention
* **Security Guard**: A partial unique index on the `payments` collection:
  `{ batchId: 1, uid: 1, status: 1 }` with filter `{ status: 'captured' }`
  guarantees that a student can only ever have a single captured payment for any given batch.

---

## 4. Known Limitations
* **Razorpay Webhook Delay**: Webhook updates can take anywhere from a few milliseconds to several seconds to propagate from Razorpay to the Hono backend. During this delay, the student's enrollment status will remain unpaid.
* **Partial Payments**: Currently, the system assumes a full one-time fee payment for batch certificates. Multi-installment or custom dynamic partial fee pricing structures are not supported and would require collection schemas modifications.
