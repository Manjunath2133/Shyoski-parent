# Phase 14 Implementation Review: Performance Optimization & Scalability

This document reviews the optimizations and architectural adjustments implemented in Phase 14 of the Shyoski V2 backend platform. The changes focus purely on query latency, database indexing, caching strategies, and performance observability without modifying business rules or security policies.

---

## 1. Index Audit & Explain-Plan Results

Instead of dropping prefix indexes blindly (which could cause index lookup degradation depending on MongoDB query sorting and filter criteria), we performed an explain-plan audit using `.explain("executionStats")` on candidate redundant indexes.

### Key Index Validations:
1. **Audit Logs Indexing**:
   * We verified that queries filtering by `organizationId` and sorting by `createdAt` utilize the compound index `{ organizationId: 1, createdAt: -1 }` (IXSCAN).
   * Redundant prefix indexes are kept or pruned safely based on optimizer execution stats.
2. **Organization Memberships Indexing**:
   * We verified that membership checks filtering by `organizationId` and `status` or `uid` utilize the `{ organizationId: 1, uid: 1 }` and `{ organizationId: 1, role: 1, status: 1 }` compound indexes (IXSCAN).

---

## 2. Standardized Pagination Utility

We consolidated and standardized pagination behavior across the platform into `src/lib/pagination.js`. It returns a unified payload format:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10,
    "nextCursor": "ObjectIdString"
  }
}
```

### Key Architectural Choices:
* **Cursor-Based Pagination**: Accepts an optional `cursor` (representing the `_id` of the last fetched document). If present, it runs a range filter (`_id: { $lt: ObjectId(cursor) }` for descending order) and fetches the `limit` directly. This enables $O(1)$ query lookups and avoids expensive `skip()` offsets on massive collections (like notifications and audit logs).
* **Backwards Compatibility**: Seamlessly supports traditional `page`/`limit` parameter queries when cursor pagination is not requested.

---

## 3. Specialized Caching & Invalidation

We implemented an in-memory TTL caching layer in `src/lib/cache.js` to speed up repetitive read queries and shield the database from spikes.

### Cache Catalog:
1. **Dashboard Summaries** (Super Admin, Organization, Evaluator, Mentor, Student):
   * **TTL**: 60 seconds.
   * **Invalidation**: A global Hono middleware clears all dashboard caches on any mutating HTTP requests (`POST`, `PUT`, `PATCH`, `DELETE`). This prevents users from seeing stale metrics after changes.
2. **Certificate Verification** (Public):
   * **TTL**: 300 seconds.
   * **Invalidation**: Scoped invalidation of specific keys `cert_verify:${certNumber}` on certificate reissues or payment refunds (which trigger cascade revocation).
3. **Audit Action Catalog**:
   * **TTL**: 3600 seconds.
   * **Cache Key**: `audit_actions`. Used for the static catalog returned to Super Admins.

---

## 4. API Performance Observability

We introduced a global tracking middleware in `src/middleware/performance.js` that measures request durations in milliseconds and collects system metrics.

* **Endpoints List**: Exposes `GET /api/v2/system/performance` (restricted to `super_admin`).
* **Uptime Tracking**: Calculates process uptime seconds.
* **Latency Computations**: Computes running average response times.
* **Slowest Endpoints**: Tracks the top 5 slowest endpoints by their maximum observed latency.
* **Slow Query Tracking**: Logs details of any request taking $\ge 500\text{ ms}$ into a rolling in-memory buffer containing the last 50 slow queries.
