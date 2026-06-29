# API Reference Specification (V2.6)

This document provides the reference specifications for all API endpoints exposed by the Shyoski V2 backend platform.

---

## 1. Health and Operational Status

These endpoints are public and do not require user authentication. They are designed for integration with load balancers, Kubernetes ingress controller probes, or uptime monitors.

### `GET /live`
Verifies that the server runtime is running and the event loop is responsive.
* **Response Status**: `200 OK`
* **Response Payload**:
```json
{
  "status": "UP"
}
```

### `GET /ready`
Verifies environment variables correctness, database connectivity, and backend schema index completion.
* **Response Status**: `200 OK` (Healthy) or `503 Service Unavailable` (Degraded/Offline)
* **Response Payload**:
```json
{
  "status": "READY"
}
```

### `GET /health`
Provides a detailed configuration check report, runtime version, and process uptime.
* **Response Status**: `200 OK` (Healthy) or `503 Service Unavailable` (Degraded)
* **Response Payload**:
```json
{
  "status": "HEALTHY",
  "database": "UP",
  "indexes": "READY",
  "environment": "VALID",
  "version": "2.0.0",
  "buildTimestamp": "2026-06-19T18:45:59.000Z",
  "uptimeSeconds": 3600
}
```

---

## 2. Multi-Tenant Organization Management

All tenant endpoints require a valid Firebase authentication header: `Authorization: Bearer <JWT_TOKEN>`.

### `POST /api/v2/organizations`
Creates a new tenant profile. Restricted to platform `super_admin`.
* **Request Payload**:
```json
{
  "name": "Acme Internships",
  "slug": "acme-internships",
  "email": "contact@acme.com",
  "logoUrl": "https://cdn.acme.com/logo.png",
  "adminEmail": "admin@acme.com",
  "organizationCode": "ACM01"
}
```
* **Response Status**: `201 Created`

### `GET /api/v2/organizations/:id`
Retrieves tenant details. Accessible by tenant members and super admins.
* **Response Status**: `200 OK`

### `PUT /api/v2/organizations/:id/settings`
Updates tenant branding primary colors, assets, logo, phone, website, or contact email. Restricted to `org_admin`.
* **Request Payload**:
```json
{
  "branding": {
    "logo": "https://cdn.acme.com/new-logo.png",
    "primaryColor": "#ff5500"
  },
  "contact": {
    "website": "https://acme.com",
    "phone": "+15550199",
    "email": "support@acme.com"
  }
}
```
* **Response Status**: `200 OK`

---

## 3. Academic Cohorts & Batch Management

### `POST /api/v2/organizations/:orgId/batches`
Creates an academic cohort. Defaults to `draft` state. Restricted to `org_admin`.
* **Request Payload**:
```json
{
  "name": "Full Stack Cohort 2026",
  "batchCode": "FS-2026",
  "status": "draft"
}
```
* **Response Status**: `201 Created`

### `POST /api/v2/organizations/:orgId/batches/:batchId/enrollments`
Enrolls an onboarded student into a cohort. Restricted to `org_admin`.
* **Request Payload**:
```json
{
  "uid": "firebase_student_uid"
}
```
* **Response Status**: `201 Created`

---

## 4. Coursework Submissions & Evaluation

### `POST /api/v2/organizations/:orgId/batches/:batchId/assignments/:assignmentId/submissions`
Submits student assignments. Attempt numbers are generated automatically and unique per assignment attempt.
* **Request Payload**:
```json
{
  "submissionUrl": "https://github.com/acme/project-a"
}
```
* **Response Status**: `201 Created`

### `POST /api/v2/organizations/:orgId/submissions/:submissionId/reviews`
Evaluates a student's submission. Restricted to cohort `evaluator` or `org_admin`.
* **Request Payload**:
```json
{
  "status": "approved",
  "grade": {
    "score": 95,
    "label": "A"
  },
  "feedback": "Excellent work!"
}
```
* **Response Status**: `201 Created`

---

## 5. Certification Claims & Verification

### `POST /api/v2/organizations/:orgId/batches/:batchId/certificates/claim`
Student claims certificate upon fulfilling all completion conditions.
* **Response Status**: `201 Created`

### `GET /api/v2/certificates/verify/:certNumber`
Public verification URL returning a minimized, anonymized snapshot of the student certificate. Does not leak private emails, user IDs, or system identifiers.
* **Response Status**: `200 OK`
