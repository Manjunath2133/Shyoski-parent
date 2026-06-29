# SHYOSKI PHASE 5 IMPLEMENTATION REVIEW

## 1. Phase 5 Overview
Phase 5 implements multi-organization student memberships, cross-tenant switcher controls, a status-filtered student membership dashboard, active-only batch enrollments, strict enrollment status transitions, and query performance indexes.

---

## 2. Architectural Decisions

### A. Denormalized Tenant Context in Enrollments
* **Decision**: Stored `organizationId` directly in `batch_enrollments` documents.
* **Details**: Reduces batch collection joins when generating a student's cross-tenant dashboard ("My Programs") or validating access in student middleware checks.

### B. Active-Only Batch Enrollment Eligibility
* **Decision**: Restricts new student enrollments to active status batches (`batch.status === 'active'`).
* **Details**: Aligns batch lifecycle constraints. Draft, inactive, and archived batches are locked from receiving new student enrollments.

### C. Strict Enrollment Status Transitions
* **Decision**: Enforced unidirectional state changes for student enrollments:
  * `active` ➔ `completed` / `suspended` / `dropped`
  * `suspended` ➔ `active` / `dropped`
  * `completed` & `dropped` are terminal states (no outgoing transitions).
* **Details**: Prevents coursework manipulation (e.g. reactivating a completed program or a dropped student without a new batch enrollment setup).

### D. Multi-Tenant Student Switcher ("My Programs")
* **Decision**: Built a global switcher `GET /api/v2/student/organizations` and `GET /api/v2/me/enrollments`.
* **Details**: Aggregates memberships and active programs across all tenant organizations, permitting student profiles to span multiple organizations concurrently.

---

## 3. Security Review

### A. Membership & Organization Lockout Cascades
* **Vulnerability Fixed**: Suspended students or members of suspended organizations continuing to access coursework.
* **Solution**: `RequireEnrollmentStatus` middleware verifies that the student holds an `active` membership in the organization, and that the organization status is not `'suspended'` before allowing access.

### B. Dashboard Privilege Isolation
* **Vulnerability Fixed**: Students attempting to inspect other students' dashboards via query spoofing.
* **Solution**: Evaluates target UIDs in `/student/dashboard`. Students are blocked with `403 Forbidden` if requesting a dashboard for any UID other than their own.

### C. Compound Uniqueness Enforcer
* **Vulnerability Fixed**: Creating duplicate enrollments for a student in the same batch.
* **Solution**: Enforces `{ batchId: 1, uid: 1 }` UNIQUE index at database level and uses `findOneAndUpdate` upserts to maintain a single source of truth.

---

## 4. Known Limitations
* **Historical View in Dashboard**: When loading the student dashboard, records in `'dropped'` or `'suspended'` status are filtered out by default. The client must explicitly send `includeHistory=true` query parameter to list history.
