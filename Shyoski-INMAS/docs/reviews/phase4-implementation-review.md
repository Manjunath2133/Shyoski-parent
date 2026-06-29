# SHYOSKI PHASE 4 IMPLEMENTATION REVIEW

## 1. Phase 4 Overview
Phase 4 implements organization-aware batches with compound unique batch code constraints, strict status lifecycle state transitions, soft archival instead of physical deletion, tenant validation, sorting/listing optimization, and parameter anti-spoofing checks in the resolver.

---

## 2. Architectural Decisions

### A. Compound Unique Tenant-Scoped Batch Codes
* **Decision**: Configured unique compound index `{ organizationId: 1, batchCode: 1 }` on the `batches` collection.
* **Details**: Guarantees that batch codes (e.g. `FS-01`) are unique within a single organization, but allows different organizations to reuse the same batch code without conflicts.

### B. No Physical Deletions (Soft Archival)
* **Decision**: Replaced all physical deletion logic (`DELETE` route) with status archival.
* **Details**: Removing DELETE route prevents database orphans when enrollments, submissions, certificates, and payments reference batches in later phases. Retiring batches is handled via status transition to `archived`.

### C. Active Tenant Validation during Batch Creation
* **Decision**: Validated organization status prior to creating a batch inside `BatchService.createBatch`.
* **Details**: Blocks normal administrators (`org_admin`) from creating batches inside suspended or archived organizations, returning `403 Forbidden`. The platform-wide `super_admin` can override this lockout to allow data entry/maintenance.

### D. Parameter Consistency Check (Anti-Spoofing)
* **Decision**: Enforced strict route-to-resource matching inside `ResolveBatch`.
* **Details**: Compares route parameters (`orgId` or `id` in path) against the batch's `organizationId`. Mismatches cause immediate request termination with `400 Bad Request` before checking RBAC roles.

---

## 3. Security Review

### A. Route Spoofing Prevention
* **Vulnerability Fixed**: A member of Organization A attempts to fetch or modify a batch belonging to Organization B by calling `/api/v2/organizations/Org_A/batches/Batch_B`.
* **Solution**: `ResolveBatch` validates parameter consistency and fails fast, returning `400 Bad Request` when there is a mismatch.

### B. Suspended & Archived Organization Safety
* **Vulnerability Fixed**: Modifying batch metadata or creating new batches inside locked, archived, or suspended tenants.
* **Solution**: Organization status is checked before write operations, failing with `403 Forbidden` if active constraints are violated.

### C. Member Lockout Enforcement
* **Vulnerability Fixed**: Suspended members continuing to list or view batches.
* **Solution**: Mounted `RequireMembershipActive()` downstream on all authenticated batch endpoints, blocking access with `403 Forbidden` if membership status !== `'active'`.

### D. Strict Batch Status Transitions
* **Vulnerability Fixed**: Unarchiving retired batches or placing drafts into invalid statuses.
* **Solution**: Enforced state transition validation on updates:
  * `draft` ➔ `active` or `archived`
  * `active` ➔ `inactive` or `archived`
  * `inactive` ➔ `active` or `archived`
  * `archived` ➔ terminal state (cannot transition out of `archived`)

---

## 4. Known Limitations
* **Public Listing Status Limitation**: The public batch listing route (`GET /api/v2/public/organizations/:orgId/batches`) strictly exposes only batches with `status: 'active'`. Other states like `draft`, `inactive`, and `archived` are hidden by design.
