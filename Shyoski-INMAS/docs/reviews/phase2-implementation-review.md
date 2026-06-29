# SHYOSKI PHASE 2 IMPLEMENTATION REVIEW

## 1. Phase 2 Overview
Phase 2 implements the authorization infrastructure for Hono routes to manage resource resolutions and enforce role-based access control (RBAC), tenant isolation, and resource ownership checks.

---

## 2. Architectural Decisions

### A. Decoupled Resolvers
* **Decision**: Created type-safe document resolvers (`src/middleware/resolve.js`) to load resources (Submissions, Groups, Certificates, Batches) and cache them in Hono context (`c.set('submission', doc)`, etc.).
* **Details**: Decoupled fetching/loading resources from security policies. Downstream middlewares can read these documents directly from context without redundant database queries.

### B. Single-Purpose Guards
* **Decision**: Modularized guards to maintain Single Responsibility Principle (SRP).
* **Details**:
  * `RequireOwnership` enforces Level 5 Resource Ownership, ensuring only the owner `uid` matching the authenticated token can read/write the resource (bypassed only by global `super_admin`).
  * `RequireEnrollmentStatus` verifies student participation status in batches, allowing custom access configurations (e.g., active, completed).
  * `RequireStaffAssignment` checks active evaluator and mentor batch assignments.

---

## 3. Security Review

### A. Priority Context Resolution
* **Vulnerability Fixed**: Path parameter naming collisions where `c.req.param('id')` referred to a submission ID, causing `RequireTenantRole` to treat it as an organization ID.
* **Solution**: `RequireTenantRole` prioritized context-cached `organizationId` (`c.get('organizationId')`) populated by data resolvers, ensuring tenant isolation checks hit the exact target organization database reference.

### B. Level 5 Student Resource Ownership
* **Vulnerability Fixed**: Students reading other students' assignments or certificate requests by guessing MongoDB ObjectIds.
* **Solution**: `RequireOwnership` strictly compares `resource.uid === currentUser.uid`. Any access mismatch yields `403 Forbidden`.

### C. Batch Enrollment & Assignment Lockouts
* **Vulnerability Fixed**: Graduated or dropped students accessing batch resources, and deactivated instructors grading work.
* **Solution**: `RequireEnrollmentStatus` and `RequireStaffAssignment` check status states (`enrollmentStatus` in `['active', 'completed']` and staff `status: 'active'`) before allowing entrance.

---

## 4. Known Limitations
* **Pre-requisite Route Resolver Chains**: Downstream guards like `RequireOwnership` depend on the resolver middleware runs. Mounting guards without corresponding resolvers triggers `500 Internal Server Error` safeguards.
