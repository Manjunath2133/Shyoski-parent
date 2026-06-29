# SHYOSKI PHASE 7 IMPLEMENTATION REVIEW

## 1. Phase 7 Overview
Phase 7 introduces the Group System Refactor. It implements organization-safe and batch-safe collaboration groups, student membership and switching lock rules, group ownership controls, repository registration constraints, and isolated group chat capabilities.

---

## 2. Architectural Decisions

### A. Scoped Group Membership
* **Decision**: Group memberships are stored inside the `groups.members` arrays, and user associations are resolved dynamically within a batch.
* **Details**: Replaces the legacy global `user.groupId` field. This enables students to belong to different groups in different cohorts/batches simultaneously.

### B. Group Ownership & Promotion
* **Decision**: Added `ownerUid` to the group schema. 
* **Details**: Standardizes admin capabilities (renaming, repository registration). If the owner leaves the group before group work starts, ownership is promoted to the oldest remaining member (the first element of the `members` array). If the group becomes empty, it is marked as `'archived'` (soft delete).

### C. Locked Member Snapshotting
* **Decision**: Once group work starts (repository URL is registered or the first assignment submission is created), the group is locked. We capture and freeze `memberSnapshot` and `lockedAt` fields.
* **Details**: Provides a historical truth trail. Certificate generation and future eligibility checkers verify `memberSnapshot` rather than live, volatile rosters.

### D. Repository Mutation Locks
* **Decision**: `repoUrl` can be mutated by members before submission, but once any assignment submission has been registered, the repository URL is frozen forever.
* **Details**: Eliminates audit trail issues if repos are swapped between submission attempts.

---

## 3. Security & Permission Review

### A. Isolated Chat Permissions
* **Vulnerability Guard**: Evaluators tampering with active discussion/collaboration logs, or non-members reading/writing peer group discussions.
* **Solution**: Mounted Hono middleware `RequireGroupMemberOrStaff` restricting group chats. We split read and write privileges:
  * **Read Access**: Members, Mentors, Evaluators, Admins.
  * **Write Access**: Members, Mentors, Admins. (Evaluators are write-restricted to maintain role segregation).

### B. Ownership Verification
* **Vulnerability Guard**: Non-members updating group repository URLs or reading chat histories.
* **Solution**: `RequireGroupMemberOrStaff(true)` locks repository changes and message postings to group members or batch mentors.

### C. Switch/Join Lockout
* **Vulnerability Guard**: Students jumping groups to copy projects after work has started.
* **Solution**: Creation and joining endpoints verify if the involved groups are locked (checked via `isGroupLocked` checking `repoUrl` presence and `submissions` presence), rejecting operations with `400 Bad Request`.

---

## 4. Known Limitations
* **Archived Group Re-activation**: Once a group is empty and marked as `'archived'`, it cannot be rejoined. Students must create a new group.
