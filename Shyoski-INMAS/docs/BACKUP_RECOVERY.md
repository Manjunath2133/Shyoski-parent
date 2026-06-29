# Database Backup & Disaster Recovery Runbook

This document details the database backup procedures, replication structure, and the automated backup validation framework for the Shyoski V2 platform.

---

## 1. Automated Backup Verification Framework

To guarantee backup consistency and recovery readiness, we implement a backup validation pipeline in `backup/backup-validation.mjs`. 

### The Sandbox Validation Pipeline:
1. **Schema Validation**: Connects to the primary MongoDB instance and verifies the presence of the 12 core system collections:
   * `organizations`, `organization_memberships`, `batches`, `batch_enrollments`, `submissions`, `groups`, `payments`, `certificates`, `notifications`, `jobs`, `job_applications`, `audit_logs`.
2. **Snapshot Sampling**: Extracts a sample set of records from each active table.
3. **Sandbox Recovery**: Recreates and restores the sample set in a temporary test namespace inside MongoDB (`sandbox_val_<collection_name>`).
4. **Verification**: Asserts record counts and restores consistency.
5. **Auditing**: Deletes validation sandbox records and logs a `BACKUP_VALIDATION` audit log with details.

### How to Run Validation Manually:
```bash
node backup/backup-validation.mjs
```
The script outputs results to `backup/backup-validation-report.json`.

---

## 2. Replication & MongoDB Atlas Configuration

Shyoski V2 uses MongoDB Atlas replica sets for automated failover and data redundancy.

* **Replication Factor**: Minimum 3 nodes (1 Primary, 2 Secondary).
* **Automated Backups**: Continuous backup schedules are set in MongoDB Atlas:
  * Hourly snapshots retained for 2 days.
  * Daily snapshots retained for 7 days.
  * Weekly snapshots retained for 4 weeks.
  * Monthly snapshots retained for 1 year.
  * Quarterly snapshots retained for 3 years (long-term compliance and certificate durability).
* **Point-in-Time Recovery (PITR)**: Enabled in Atlas with a 24-hour lookback window, allowing database recovery to any specific second.

---

## 3. Disaster Recovery Execution Plan

If a database corruption or data loss occurs, follow these steps to restore service:

### Step 1: Suspend Tenant Traffic (Read-Only Mode)
If a specific tenant data is corrupted, suspend the organization using the administrator endpoint to block incoming mutating traffic:
```http
POST /api/v2/organizations/:id/suspend
```

### Step 2: Retrieve Snapshot
1. Access the MongoDB Atlas Dashboard.
2. Select your Cluster ➔ **Backup** tab.
3. Locate the snapshot before the target incident timestamp.
4. Choose **Restore** ➔ **Restore to a New Cluster** (recommended) or **Restore in Place** (caution: overwrites existing tables).

### Step 3: Run the Verification Suite
Before routing production traffic back to the restored database, run the readiness auditor and deployment checklist generator:
```bash
node production/readiness-check.mjs
node production/deployment-checklist.mjs
```
Confirm `deployment-checklist.json` shows:
```json
{
  "databaseConnected": true,
  "indexesInitialized": true,
  "healthChecksEnabled": true
}
```

### Step 4: Reactivate Tenant
Once verified, restore organization status back to `active`:
```http
POST /api/v2/organizations/:id/unsuspend
```
