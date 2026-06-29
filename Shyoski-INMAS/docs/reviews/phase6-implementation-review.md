# SHYOSKI PHASE 6 IMPLEMENTATION REVIEW

## 1. Phase 6 Overview
Phase 6 implements assignment-aware coursework submissions, attempt count version control, student ownership guards, assigned evaluator batch constraints, resubmission loop workflows, and review status terminal locks.

---

## 2. Architectural Decisions

### A. Strict Assignment ObjectId References
* **Decision**: Configured `assignmentId` as an `ObjectId` referencing the `assignments` collection.
* **Details**: Guarantees database integrity and prevents future migration headaches compared to loose string or slug identifiers.

### B. Multiple Resubmission Attempts
* **Decision**: Implemented attempt version control using a chronological `attemptNumber` tracking index.
* **Details**: Re-submission creates a **new** submission document (preserving review audits and progress tracking) instead of overwriting the existing attempt.

### C. Assigned Evaluator Constraints
* **Decision**: Restricted grading permissions to active evaluators assigned to the batch (`RequireStaffAssignment`).
* **Details**: Separates roles: mentors provide guidance only, while evaluators and organization admins hold grading privileges.

### D. Terminal Status Lockouts
* **Decision**: Blocked reviews on finalized status codes (`approved` or `rejected`).
* **Details**: Ensures work cannot be altered or overwritten once graded. Resubmission requires a new attempt document.

---

## 3. Security Review

### A. Ownership Protection
* **Vulnerability Fixed**: Students reading or tampering with other students' coursework.
* **Solution**: `GET /submissions/:submissionId` validates student ownership, returning `403 Forbidden` if the `uid` does not match the caller's ID.

### B. Hierarchy Cross-Validation
* **Vulnerability Fixed**: Submitting to an assignment belonging to Batch B under Batch A route contexts (cross-batch spoofing).
* **Solution**: Submission creation validates that the assignment belongs to the batch, and the batch belongs to the organization, blocking mismatch requests.

### C. Resubmission Lockout
* **Vulnerability Fixed**: Student submitting new code attempts while a previous one is currently pending review.
* **Solution**: Creation service throws `400 Bad Request` if the student has a previous attempt in `'pending'` status.

### D. Review Role Separation
* **Vulnerability Fixed**: Mentors attempting to grade or approve coursework.
* **Solution**: The POST review route explicitly requires the `evaluator` staff role or `org_admin` role, throwing `403` for mentors.

---

## 4. Known Limitations
* **Attempt Indexing**: Students and evaluators list submissions sorted newest first. The client must aggregate attempt documents to render a student's full coursework timeline.

---

## 5. Phase 6 Refinements

### A. Database-Level Unique Attempt Constraints
* **Refinement**: Enforced a compound unique index on `{ uid: 1, assignmentId: 1, attemptNumber: 1 }`.
* **Resilience**: Handled MongoDB duplicate key errors (code `11000`) within `createSubmission` to map them to `409 Conflict`.
* **Index Resiliency Helper**: Refactored database index initialization in `src/lib/db.js` using helper-wrapped executions to isolate failures. Marked `organizationCode` as sparse to avoid legacy conflicts.

### B. Evaluator Role Snapshots
* **Refinement**: Snapshotted the active reviewer's role (e.g. `'evaluator'`, `'org_admin'`) inside `review.reviewerRole` during submission evaluation.

### C. Flexible Grade Structure
* **Refinement**: Updated `reviewSubmissionSchema` to accept string grades or structured grade objects (`{ score: 92, label: "A" }`), keeping the system backward compatible.
