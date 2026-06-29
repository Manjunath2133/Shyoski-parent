# SHYOSKI PHASE 9 IMPLEMENTATION REVIEW

## 1. Phase 9 Overview
Phase 9 introduces **Certificate System V2** for the multi-tenant platform. It provides secure certificate claims, anonymous allowlist-only public verification, admin-only reissue workflows with typo corrections, co-branding audit logs, and cryptographic asset hashing.

---

## 2. Architectural Decisions

### A. Unique Active Enrollment Index
* **Decision**: Configured a unique partial database index on the `certificates` collection.
* **Details**: Matches `{ batchId: 1, uid: 1, status: 1 }` with partial filter expression `{ status: 'active' }`. This provides a database-level constraint guaranteeing that a student has at most one active certificate for a batch enrollment, preventing race conditions or double clicks on claims.

### B. Co-Branding Asset Cryptographic Hashing
* **Decision**: Calculated and stored SHA-256 digests of branding assets on certificate snapshots.
* **Details**: Standardizes cryptographic integrity audits by hashing the organization logo, founder signature URL, and platform signature URL. The snapshot records the logo and signature hashes at the exact time of the certificate claim.

### C. Atomic Sequence Serial Numbers
* **Decision**: Utilized batch-level atomic sequence counters for certificate numbering.
* **Details**: Batches store a `certificateSequence` number. When claiming, the system uses MongoDB `findOneAndUpdate` to atomically increment (`$inc: 1`) and retrieve the next sequence number. This prevents serial number race conditions and duplicate certificate number generation under concurrency. The format matches `SHY-YYYY-ORGCODE-BATCHCODE-SERIAL` (6-digit zero-padded).

### D. Safe Admin Reissue Cascade
* **Decision**: Configured the reissue endpoint to update the old certificate's status to `revoked` (reason: `REPLACED`) *before* inserting the new replacement certificate.
* **Details**: This sequence is necessary to prevent a unique index violation on active certificate records. To ensure consistency, a database update rollback is executed to restore the old certificate status if the subsequent insertion of the new certificate fails.

---

## 3. Security Review

### A. Anonymous Verification Privacy Guard
* **Vulnerability Guarded**: Public endpoints leaking student email addresses, UIDs, and database document IDs.
* **Solution**: The public anonymous `/api/v2/certificates/verify/:certNumber` endpoint enforces a strict allowlist. It returns only `certificateNumber`, `status`, `studentName`, `organizationName`, `batchName`, `completionDate`, `issuedAt`, `verificationUrl`, `revocationReason`, and `replacedBy`. Internal identifiers (`_id`, `organizationId`, `batchId`, `uid`) and private details (`studentEmail`) are completely filtered out.

### B. Reissue Tenant Boundary Validation
* **Vulnerability Guarded**: Admin users trying to reissue certificates belonging to other organizations.
* **Solution**: The `/reissue` endpoint validates that the target certificate's `organizationId` matches the request `orgId` parameter. The auth system also enforces role constraints ensuring only authorized `org_admin` or `super_admin` accounts can execute reissues.

---

## 4. Known Limitations
* **Sequence Gap Acceptance**: Serials are monotonic but gaps are allowed. If the database insert fails after the atomic counter is incremented, that serial number is skipped and never recycled. This is documented and accepted behaviour to prevent reuse/duplication.
