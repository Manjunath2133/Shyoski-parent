# SHYOSKI PHASE 1 IMPLEMENTATION REVIEW

## 1. Phase 1 Overview
Phase 1 introduces the core structural foundation for multi-tenancy in Shyoski V2. The system now supports dynamic organization creation, membership role allocation, onboarding invitations, and cryptographically verified auth routing.

---

## 2. Architectural Decisions

### A. Lazy Indexing and Singleton Client
* **Decision**: Refactored `src/lib/db.js` into a lazily-initialized singleton connection.
* **Details**: Connection is cached in module scope (`cachedClient`/`cachedDb`). When `getDb(env)` is called, it checks a global `indexesInitialized` flag. If false, it creates required index constraints for Organizations, Memberships, Invitations, and Audit Logs before resolving the database object. This avoids per-request sockets and ensures indexes exist automatically without manual setup steps.

### B. Decoupled Service Layers
* **Decision**: Separated HTTP handling from business logic.
* **Details**: Expressed logic inside Service layers:
  * `OrganizationService` (CRUD, slugs, pagination limit checks)
  * `MembershipService` (Mapping users to organizations with lookup details)
  * `InvitationService` (Invite creation, accept workflows)
  * `AuditService` (Central fire-and-forget log pipeline)

### C. Zod-Based Route Validation
* **Decision**: Adopted `zod` and `@hono/zod-validator` for API route parameters and body sanitization.
* **Details**: Rejects invalid payloads before hitting controller handlers, preserving type safety.

---

## 3. Security Review

### A. Cryptographic Firebase Token Verification
* **Vulnerability Fixed**: Originally, authorization tokens were parsed without signature verification.
* **Solution**: `RequireAuth` fetches Google's public JWK certificates and performs cryptographic signature checks (`RS256`) using Web Crypto API. Expiry and project boundaries are validated. A developer bypass is permitted only when `ENVIRONMENT === 'development'`.

### B. Invitation Acceptance Race Conditions
* **Vulnerability Fixed**: Double-accepting or accepting expired invitation tokens.
* **Solution**: `acceptInvitation` executes an atomic `findOneAndUpdate` state-change verifying `status: 'pending'` and `expiresAt: { $gt: now }` in a single write. A rollback try-catch loop resets invitation state to `pending` if subsequent membership inserts fail.

### C. Admin De-registration Protection
* **Vulnerability Fixed**: An organization removing its last admin and becoming orphaned.
* **Solution**: Member deletion checks the target role. If it is `org_admin`, it counts active administrators for the organization. If the count is $\le 1$, deletion is rejected with `409 Conflict`.

---

## 4. Known Limitations
* **JWK Fetch Overhead on Cold Starts**: The first request hitting a cold isolate executes an external HTTP call to fetch Google's JWKs, adding ~80–150ms of network latency. (Mitigation: Google allows HTTP caching. Public certificates are cached locally in worker memory with TTL).
* **Environment-Scoped Mocking**: Mocking headers for local CLI testing is allowed in `development`. If environment configuration is corrupted in production, this could expose bypass vulnerabilities. Production environment setup must configure `ENVIRONMENT="production"` strictly.
