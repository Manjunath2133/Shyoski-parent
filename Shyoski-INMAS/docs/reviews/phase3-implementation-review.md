# SHYOSKI PHASE 3 IMPLEMENTATION REVIEW

## 1. Phase 3 Overview
Phase 3 implements the organization lifecycle, suspension/archival controls, structured setting updates, future-proofing code tracking, and organization member moderation/access management.

---

## 2. Architectural Decisions

### A. Non-Overlapping Organization Status State Machine
* **Decision**: Implemented `updateOrganizationStatus` with strict validation.
* **Details**: Enforces a unidirectional/reversible lifecycle: `active` ⇄ `suspended` ⇄ `archived`. Transitioning from `active` straight to `archived` or direct unarchival to `active` is forbidden, securing structural workflows.

### B. Priority Context-Aware Middleware Routing
* **Decision**: Checked member presence in `RequireTenantRole` before inspecting the organization lifecycle state.
* **Details**: Keeps query execution minimal. If a user is not a member, the system returns `403 Forbidden` instantly without loading the organization document.

### C. Separate Active Membership Guard
* **Decision**: Separated `RequireMembershipActive()` from roles validation.
* **Details**: Allows developers to easily reuse active membership verification on groups, submissions, and payments without coupling to role lists.

### D. Explicit settings JSON Schemas
* **Decision**: Defined `updateSettingsSchema` and deep merge in `updateOrganizationSettings`.
* **Details**: Rejects arbitrary keys, safeguarding logo, contact email, primary color, website, and phone configurations.

---

## 3. Security Review

### A. Archived Read-Only Mode
* **Vulnerability Fixed**: Modifying organization settings after termination.
* **Solution**: Non-idempotent HTTP methods (POST, PUT, DELETE, PATCH) are rejected inside `RequireTenantRole` with `403 Forbidden` when status is `archived`. GET requests are permitted to maintain student history.

### B. Suspended Organization Lockout
* **Vulnerability Fixed**: Suspended organizations continuing to serve data.
* **Solution**: Suspended organizations yield `403 Forbidden` on all routes.

### C. Member Suspension Lockout
* **Vulnerability Fixed**: Suspended members modifying resources or bypassing controls.
* **Solution**: `RequireMembershipActive` instantly locks out any membership status !== `'active'` (yielding `403 Forbidden`).

### D. Admin Demotion / Suspension Protection
* **Vulnerability Fixed**: An admin demoting themselves, or leaving the organization with 0 active admins.
* **Solution**: Blocks self-demotions, self-suspensions, and demotions/suspensions of the last active administrator of the organization.

---

## 4. Known Limitations
* **Index Creation Dup Keys on Nulls**: Added unique index on `organizationCode`. However, existing databases with legacy null/empty codes will trigger duplicate errors on build. (Mitigation: Set `indexesInitialized = true` immediately at run-start in `src/lib/db.js` to prevent retry latency locks).
