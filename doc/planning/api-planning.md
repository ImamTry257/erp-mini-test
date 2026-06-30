# Mini ERP Invoicing System

## API Planning

---

# Overview

This document details the API contract for the Mini ERP Invoicing System backend.
It extends `project-planning.md` with endpoint specifications, request/response
schemas, field conventions, and validation rules so the backend can be
implemented consistently before coding begins.

Source of truth for feature scope: `project-planning.md`.
This file focuses purely on the **REST API contract**.

---

# Conventions

## Field Naming

All request parameters, query strings, request bodies, and response fields use
**camelCase**. This includes:

`accessToken`, `createdAt`, `updatedAt`, `deletedAt`
`userId`, `customerId`, `invoiceId`, `invoiceItemId`
`createdById`, `customerName`, `invoiceNumber`, `dueDate`
`paidDate`, `totalAmount`, `subtotalAmount`, `taxAmount`, `discountAmount`
`itemName`, `unitPrice`, `quantityAmount`, `startDate`, `endDate`

Prisma stores columns conventionally (snake_case). The API layer MUST map these
to camelCase at the boundary (DTO/Interceptor/Serializer), so snake_case never
leaks to clients.

## Response Envelope

Every endpoint returns a consistent JSON envelope.

Success

```json
{
  "success": true,
  "string": "Human-friendly message",
  "data": { ... } || [ ... ] || null,
  "meta": { ... }
}
```

`meta` is required for paginated list endpoints (see Pagination) and optional
everywhere else.

Error

```json
{
  "success": false,
  "string": "Short, user-friendly error title",
  "errors": [
    { "field": "email", "message": "email must be an email" }
  ],
  "statusCode": 400
}
```

Validation errors (HTTP 422/400) populate `errors[]` with per-field messages.
Other errors (401, 403, 404, 409, 500) use `string` only.

Standard HTTP status usage:
- 200 GET/PATCH success
- 201 POST created
- 204 soft-delete / no content responses (when `data` is null)
- 400 bad request
- 401 unauthenticated
- 403 forbidden
- 404 not found
- 409 conflict (unique constraint, invalid state transition)
- 422 validation error
- 500 server error

## Authentication

Bearer JWT scheme. After login, the client sends:

```
Authorization: Bearer <accessToken>
```

Protected endpoints reject missing/invalid tokens with 401.
Role checks (future RBAC) return 403.

## Soft Delete Policy

All resources support SOFT DELETE.

Mechanism: a `deletedAt` timestamp column (DateTime, nullable).
- Live rows: `deletedAt = null`
- Deleted rows: `deletedAt = ISO timestamp`

Rules:
- `DELETE /resources/:id` sets `deletedAt` and HTTP 200/204.
- Every GET list/detail query MUST filter `deletedAt = null`.
- Detail returns 404 `Resource not found` when row is soft-deleted (client should
  not distinguish soft vs hard delete).
- Seed creates only live rows (`deletedAt = null`).

## Invoice Status Model

Statuses: `DRAFT`, `PENDING`, `PAID`, `OVERDUE`

State transitions:
- `DRAFT` → `PENDING` (issue) allowed
- `PENDING` → `PAID` (pay) allowed
- `PENDING` → `OVERDUE` (auto) — backend marks overdue when `dueDate < today`
  and status still `PENDING` (computed on read + explicit transition)
- `PAID` → terminal, no further transitions (except unpay back to PENDING if
  business allows — default: disallowed)
- `OVERDUE` → `PAID` allowed
- Any other transition → 409 with message `Invalid status transition`

The status field is also filterable in list endpoints.

---

# Pagination & Filtering

Offset pagination for `GET /customers` and `GET /invoices` (and any future list).

Query parameters (camelCase):

| Param    | Type    | Default | Description                          |
|----------|---------|---------|--------------------------------------|
| page     | integer | 1       | Page number, >= 1                    |
| limit    | integer | 10      | Page size, 1..100                    |
| search   | string  | ''      | Search term (see per-endpoint scope) |
| sortBy   | string  | createdAt | Sort column (camelCase), validated per whitelist |
| order    | asc/desc| desc    | Sort direction                       |
| startDate| date    |         | Filter lower bound (inclusive)       |
| endDate  | date    |         | Filter upper bound (inclusive)       |

Per-endpoint filter extensions documented below.

Response `meta` envelope:

```json
{
  "success": true,
  "string": "Success",
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalItems": 42,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

sortBy whitelist per-endpoint is enforced; unknown columns return 422.

---

# API Endlines

Base URL: `/api/v1` (versioned; Nest global prefix)

> API documentation will be delivered as a Postman Collection, not Swagger UI.

---

## Auth

### POST /auth/login

Authenticate user, issue JWT.

Request body (camelCase):

```json
{
  "email": "admin@example.com",
  "password": "secret123"
}
```

Validation: `email` is email format, `password` required min 6 chars.

Response 201:

```json
{
  "success": true,
  "string": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOi...",
    "user": {
      "id": "uuid",
      "email": "admin@example.com",
      "name": "Admin",
      "role": "ADMIN",
      "createdAt": "2026-06-29T00:00:00.000Z",
      "updatedAt": "2026-06-29T00:00:00.000Z"
    }
  }
}
```

Errors:
- 401 `Invalid email or password` when credentials mismatch.

### GET /auth/me  (Nice to Have / utility)

Returns current authenticated user from token. Same `data.user` shape as
login.

Headers: `Authorization: Bearer <token>`

---

## Customers

### GET /customers

List customers (live only, soft-deleted excluded).

Filters:
- `q` searches `name` OR `email` OR `phone` (case-insensitive).
- `startDate` / `endDate` filter by `createdAt`.

Whitelist sortBy: `name`, `email`, `phone`, `createdAt`, `updatedAt`.

Response item:

```json
{
  "id": "uuid",
  "name": "PT Maju Jaya",
  "email": "contact@majujaya.id",
  "phone": "0211234567",
  "address": "Jl. Bisnis No. 1, Jakarta",
  "createdAt": "2026-06-29T00:00:00.000Z",
  "updatedAt": "2026-06-29T00:00:00.000Z"
}
```

### GET /customers/:id

Single customer (404 if not found or soft-deleted). Same object shape as above.

### POST /customers

Create customer.

Request body:

```json
{
  "name": "PT Maju Jaya",
  "email": "contact@majujaya.id",
  "phone": "0211234567",
  "address": "Jl. Bisnis No. 1, Jakarta"
}
```

Validation:
- `name` required string (1..100).
- `email` required, unique, valid email format.
- `phone` optional string.
- `address` optional string.

Response 201 with created object.

Errors:
- 409 when email already exists.

### PATCH /customers/:id

Partial update. Same fields as POST; all optional, at least one required.

Response 200 with updated object.
Errors: 404 if missing/deleted; 409 email conflict.

### DELETE /customers/:id

Soft delete. Sets `deletedAt`. Customer with existing invoices may be blocked
with 409 `Customer has existing invoices` or force-deleted — default: block.

Response 200:

```json
{
  "success": true,
  "string": "Customer deleted",
  "data": { "id": "uuid", "deletedAt": "2026-06-29T00:10:00.000Z" }
}
```

---

## Invoices

### GET /invoices

List invoices (live only).

Filters:
- `q` searches `invoiceNumber` OR `customer.name`.
- `status` enum filter: `DRAFT | PENDING | PAID | OVERDUE`.
- `customerId` exact match.
- `startDate` / `endDate` filter by `dueDate`.
- `sortBy` whitelist: `invoiceNumber`, `dueDate`, `paidDate`, `status`,
  `totalAmount`, `createdAt`.

Response item (summary — no full items array for performance):

```json
{
  "id": "uuid",
  "invoiceNumber": "INV-2026-0001",
  "status": "PENDING",
  "dueDate": "2026-07-29",
  "paidDate": null,
  "subtotalAmount": 1000000,
  "taxAmount": 110000,
  "discountAmount": 0,
  "totalAmount": 1110000,
  "notes": "Termin 1",
  "createdAt": "2026-06-29T00:00:00.000Z",
  "updatedAt": "2026-06-29T00:00:00.000Z",
  "customerId": "uuid",
  "customerName": "PT Maju Jaya",
  "createdById": "uuid"
}
```

### GET /invoices/:id

Invoice detail WITH items.

```json
{
  "id": "uuid",
  "invoiceNumber": "INV-2026-0001",
  "status": "PENDING",
  "dueDate": "2026-07-29",
  "paidDate": null,
  "subtotalAmount": 1000000,
  "taxAmount": 110000,
  "discountAmount": 0,
  "totalAmount": 1110000,
  "notes": "Termin 1",
  "createdAt": "2026-06-29T00:00:00.000Z",
  "updatedAt": "2026-06-29T00:00:00.000Z",
  "customerId": "uuid",
  "createdById": "uuid",
  "customer": {
    "id": "uuid",
    "name": "PT Maju Jaya",
    "email": "contact@majujaya.id",
    "phone": "0211234567",
    "address": "Jl. Bisnis No. 1, Jakarta"
  },
  "items": [
    {
      "id": "uuid",
      "itemName": "Jasa Development",
      "description": "Pembualan modul ERP",
      "quantityAmount": 1,
      "unitPrice": 1000000,
      "lineTotal": 1000000,
      "createdAt": "2026-06-29T00:00:00.000Z",
      "updatedAt": "2026-06-29T00:00:00.000Z"
    }
  ]
}
```

### POST /invoices

Create invoice (status always starts as `DRAFT`).

Request body:

```json
{
  "invoiceNumber": "INV-2026-0005",
  "customerId": "uuid",
  "dueDate": "2026-07-29",
  "taxAmount": 110000,
  "discountAmount": 0,
  "notes": "Termin 2",
  "items": [
    {
      "itemName": "Jasa Development",
      "description": "Modul Invoice",
      "quantityAmount": 1,
      "unitPrice": 2000000
    }
  ]
}
```

Validation:
- `invoiceNumber` required, unique (String), supplier-generated or sequential.
- `customerId` required, must reference live customer.
- `dueDate` required (ISO date, must be >= today).
- `taxAmount` optional integer >= 0 (default 0, in IDR minor unit? use integer major unit).
- `discountAmount` optional integer >= 0 (default 0).
- `items` required, min 1.
- each item: `itemName` required, `description` optional, `quantityAmount`
  integer >= 1, `unitPrice` integer >= 0.

Derived fields (computed server-side, ignored in request):
- `subtotalAmount` = Σ (lineTotal); lineTotal = quantityAmount × unitPrice
- `totalAmount` = subtotalAmount + taxAmount − discountAmount
- `status` = `DRAFT` on create
- `createdById` = taken from JWT (authenticated user), NOT request body.

Response 201 with full detail (same shape as GET :id, includes customer + items).

Errors:
- 422 validation
- 404 customer not found
- 409 invoiceNumber duplicate

### PATCH /invoices/:id

Partial update of header fields. Items are NOT mutated here — use the
Invoice Items endpoints for item changes.

Updatable fields: `invoiceNumber`, `customerId`, `dueDate`, `taxAmount`,
`discountAmount`, `notes`.

`status` is NOT updatable here — use `PATCH /invoices/:id/status`.

When items change elsewhere, `subtotalAmount` / `totalAmount` are recomputed.

Response 200 with full detail.

### PATCH /invoices/:id/status

Update status with transition validation.

Request body:

```json
{
  "status": "PAID",
  "paidDate": "2026-07-01"
}
```

Rules:
- `status` required, must be a valid next state (see Invoice Status Model).
- When transitioning to `PAID`, `paidDate` required (default to today if omitted
  — implementation choice; document the default).
- When transitioning to `OVERDUE`, `paidDate` must be null.

Response 200 with full detail.
Errors: 409 invalid transition; 404 not found.

### DELETE /invoices/:id

Soft delete. Same policy as customers.

Response 200 with `{ id, deletedAt }`.

---

## Invoice Items

These endpoints operate under an invoice. They are only valid when the parent
invoice is in `DRAFT` status — editing items of a non-draft invoice returns 409
`Cannot modify items of a non-draft invoice`.

### POST /invoices/:id/items

Add item to invoice.

Request body:

```json
{
  "itemName": "Jasa Konsultasi",
  "description": "Workshop internal",
  "quantityAmount": 2,
  "unitPrice": 500000
}
```

Response 201 with created item:

```json
{
  "id": "uuid",
  "invoiceId": "uuid",
  "itemName": "Jasa Konsultasi",
  "description": "Workshop internal",
  "quantityAmount": 2,
  "unitPrice": 500000,
  "lineTotal": 1000000,
  "createdAt": "2026-06-29T00:00:00.000Z",
  "updatedAt": "2026-06-29T00:00:00.000Z"
}
```

Side effect: parent invoice `subtotalAmount` and `totalAmount` recomputed.

### PATCH /invoices/:invoiceId/items/:itemId

Partial update of an item. Same fields as POST (all optional, >= 1 required).

Response 200 with updated item. Parent invoice recomputed.

### DELETE /invoices/:invoiceId/items/:itemId

Soft delete item. Parent invoice recomputed.

Response 200 with `{ id, deletedAt }`.

---

## Dashboard

### GET /dashboard

Aggregate summary for the overview page.

Query:
- `startDate` / `endDate` optional; default last 30 days if omitted.

Response:

```json
{
  "success": true,
  "string": "Success",
  "data": {
    "totalCustomers": 12,
    "totalInvoices": 45,
    "paidInvoices": 30,
    "pendingInvoices": 10,
    "overdueInvoices": 2,
    "draftInvoices": 3,
    "revenueSummary": {
      "paidAmount": 333000000,
      "pendingAmount": 111000000,
      "overdueAmount": 222000000,
      "totalAmount": 466200000
    },
    "recentInvoices": [
      { "...invoice summary..." }
    ]
  }
}
```

Notes:
- `totalCustomers` counts live customers only.
- `totalInvoices` counts live invoices within the date range (by `createdAt`).
- `revenueSummary.paidAmount` = Σ totalAmount of PAID invoices.
- `revenueSummary.pendingAmount` = Σ totalAmount of PENDING.
- `revenueSummary.overdueAmount` = Σ totalAmount of OVERDUE.
- `revenueSummary.totalAmount` = Σ totalAmount of PAID + PENDING + OVERDUE
  (excludes DRAFT).
- `recentInvoices` returns the latest 5 invoices (summary shape).

---

# Error Catalog

Common error shapes returned by the Global Exception Filter.

Validation (422)

```json
{
  "success": false,
  "string": "Validation Error",
  "errors": [
    { "field": "email", "message": "email must be an email" },
    { "field": "items", "message": "items must contain at least 1 element" }
  ],
  "statusCode": 422
}
```

Not Found (404)

```json
{
  "success": false,
  "string": "Customer not found",
  "statusCode": 404
}
```

Conflict (409)

```json
{
  "success": false,
  "string": "Invalid status transition",
  "statusCode": 409
}
```

Unauthorized (401)

```json
{
  "success": false,
  "string": "Unauthorized",
  "statusCode": 401
}
```

Forbidden (403)

```json
{
  "success": false,
  "string": "Forbidden",
  "statusCode": 403
}
```

---

# Notes for Implementation

- All timestamps are ISO-8601 strings in UTC (`2026-06-29T00:00:00.000Z`).
- All monetary amounts are integers in IDR major unit (no decimals).
- `invoiceNumber` generation: either client-supplied (validated unique) or
  server-generated sequence `INV-YYYY-NNNN`. Recommend server-generation with
  optional client override.
- `dueDate` and `paidDate` are date-only strings (`YYYY-MM-DD`); stored as
  DateTime in DB at UTC midnight.
- `createdById` is always derived from the JWT; never trust client input.
- Overdue detection: a background job or read-time computation marks PENDING
  invoices past `dueDate` as OVERDUE. For assessment scope, compute on read in
  the list/detail/dashboard queries.
