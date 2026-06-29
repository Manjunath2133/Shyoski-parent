# SHYOSKI PHASE 12 IMPLEMENTATION REVIEW

## 1. Phase 12 Overview
Phase 12 introduces the multi-tenant, organization-aware **Job Portal V2** to the Shyoski V2 backend platform. It enables organizations to create, publish, close, and archive job postings, allows students to securely view and apply for opportunities within organizations where they hold active student memberships, manages student application withdrawal and hiring pipeline lifecycles, and aggregates portal activities dynamically into dashboards.

---

## 2. Architectural Decisions

### A. Database Indexes and Strict Constraints
* **Decision**: Configured dedicated indexing specifications on both `jobs` and `job_applications` collections inside `src/lib/db.js`.
* **Details**:
  * Compound index `{ organizationId: 1, applicationDeadline: 1, status: 1 }` on `jobs` provides optimized filtering for dashboard aggregates, scheduled background cleaners, and expiring job postings.
  * Unique index `{ jobId: 1, uid: 1 }` on `job_applications` prevents duplicate applications from a student to the same job posting at the database layer.

### B. Co-Branded Snapshot Protection
* **Decision**: Captures a frozen snapshot of key job details inside the application document on submission.
* **Details**: Stores `jobTitle`, `organizationName`, `location`, and `jobType` at the time of application. This protects historical application records from future edits to the job posting.

### C. Service-Layer Notification and Audit Log Hooks
* **Decision**: Centralized event emissions (`NotificationService` and `AuditService`) inside the `JobService` logic.
* **Details**:
  * Emits notifications on key lifecycle events: `JOB_PUBLISHED` (notifies students in organization), `JOB_APPLIED` (notifies student), `NEW_JOB_APPLICATION` (notifies org admins), `APPLICATION_WITHDRAWN` (notifies student & admins), and `APPLICATION_STATUS_CHANGED` (status transitions).
  * Automatically records structured audit logs matching all milestone operations (`JOB_CREATED`, `JOB_UPDATED`, `JOB_PUBLISHED`, `JOB_CLOSED`, `JOB_ARCHIVED`, `JOB_APPLIED`, `APPLICATION_STATUS_CHANGED`).

---

## 3. Security Review

### A. Multi-Tenant Visibility Isolation
* **Vulnerability Guarded**: Students reading or applying to jobs in organizations where they do not belong.
* **Solution**: Strict boundaries are enforced at both the endpoint and service levels:
  * In `GET /api/v2/student/jobs`, queries are constrained using `{ organizationId: { $in: orgIds } }`, where `orgIds` lists only organizations with active student memberships for the caller.
  * In `GET /api/v2/jobs/:jobId` and `POST /api/v2/jobs/:jobId/apply`, memberships are verified: `db.collection('organization_memberships').findOne({ organizationId: job.organizationId, uid, role: 'student', status: 'active' })`. Any access mismatch returns `403 Forbidden` or `404 Not Found`.

### B. Pipeline State Machine Validation
* **Vulnerability Guarded**: Bypassing states or transitioning applications out of terminal states (e.g. altering a selected/rejected application status).
* **Solution**: Enforced strict state transitions inside `updateApplicationStatus`:
  * Valid path: `applied` ➔ `under_review` ➔ `shortlisted` ➔ `interview_scheduled` ➔ `selected`.
  * Blocked: Outgoing transitions from terminal states `selected`, `rejected`, and `withdrawn` are rejected with `400 Bad Request`.

### C. Secure Student Withdrawal Rules
* **Vulnerability Guarded**: Students withdrawing selected or rejected applications to bypass records, or withdrawing other students' applications.
* **Solution**:
  * Ownership verification: `db.collection('job_applications').findOne({ _id: new ObjectId(applicationId), uid })` ensures students can only withdraw their own applications.
  * State verification: Withdrawal is blocked if the current status is `selected`, `rejected`, or `withdrawn`.

---

## 4. Known Limitations
* **Static Snapshot Dependency**: If an organization changes its name, existing job applications will keep the old organization name in their frozen snapshots. This is intentional to preserve historical co-branding, but dashboard listings might show outdated names for old applications if they read exclusively from the snapshot.
