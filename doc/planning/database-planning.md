# Mini ERP Invoicing System

## Database Planning

---

# Overview

This document describes the database design for the Mini ERP Invoicing System.
It is the source of truth for the Prisma schema, indexes, enums, seed data,
and migration strategy.

Source of truth for feature scope: `project-planning.md`
Source of truth for API contract: `api-planning.md`

This file focuses purely on the **PostgreSQL data layer** as modeled through
Prisma ORM.

---

# Database

- **Engine:** PostgreSQL 16+
- **ORM:** Prisma
- **Naming in DB:** snake_case (Prisma default)
- **Naming at API boundary:** camelCase (mapped at the service/DTO layer)
- **Soft delete column:** `deleted_at` (DateTime, nullable) on every table
- **Primary keys:** `uuid` (string, `@default(uuid())`)
- **Timestamps:** `created_at` and `updated_at` on every table, `@updatedAt`

---

# Entity Relationship Diagram

```
+-------------+       +-----------------+       +------------------+
|   users     |       |   customers     |       |    invoices      |
+-------------+       +-----------------+       +------------------+
| id (PK)     |       | id (PK)         |       | id (PK)          |
| name        |       | name            |       | invoice_number U |
| email  (U)  |       | email  (U)      |       | status           |
| password    |       | phone           |       | due_date         |
| role        |       | address         |       | paid_date        |
| created_at  |       | created_at      |       | subtotal_amount  |
| updated_at  |       | updated_at      |       | tax_amount       |
| deleted_at  |       | deleted_at      |       | discount_amount  |
+------+------+       +--------+--------+       | total_amount     |
       |                       | 1              | notes            |
       |                       |                | created_by_id FK |
       |                       |                | created_at       |
       |                       |                | updated_at       |
       | 1                     |                | deleted_at       |
       +-----------+           |         +------+---------+
                   |           |         |                |
                   |           +---------+                |
                   | 1..*                | 1              | 1..*
                   |                     |                |
                   |            +--------+--------+       |
                   |            |  invoice_items  |       |
                   |            +-----------------+       |
                   |            | id (PK)         |       |
                   |            | invoice_id  FK -+-------+
                   |            | item_name       |
                   |            | description     |
                   |            | quantity_amount |
                   |            | unit_price      |
                   |            | line_total      |
                   |            | created_at      |
                   |            | updated_at      |
                   |            | deleted_at      |
                   |            +-----------------+
                   |
                   +-----------------------------+
                   | invoices.created_by_id -> users.id
                   +-----------------------------+
```

Relationships:
- `users 1 <-> N invoices` (via `created_by_id`)
- `customers 1 <-> N invoices` (via `customer_id`)
- `invoices 1 <-> N invoice_items` (via `invoice_id`)

---

# Prisma Schema

## Enum

```prisma
enum Role {
  ADMIN
  USER
}

enum InvoiceStatus {
  DRAFT
  PENDING
  PAID
  OVERDUE
}
```

## Models

```prisma
model User {
  id         String    @id @default(uuid())
  name       String
  email      String    @unique
  password   String
  role       Role      @default(USER)
  createdAt  DateTime  @default(now()) @map("created_at")
  updatedAt  DateTime  @updatedAt @map("updated_at")
  deletedAt  DateTime? @map("deleted_at")

  invoices   Invoice[] @relation("InvoiceCreatedBy")

  @@index([deletedAt])
  @@map("users")
}

model Customer {
  id        String    @id @default(uuid())
  name      String
  email     String    @unique
  phone     String?
  address   String?
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  invoices  Invoice[]

  @@index([deletedAt])
  @@index([name])
  @@map("customers")
}

model Invoice {
  id              String        @id @default(uuid())
  invoiceNumber   String        @unique @map("invoice_number")
  status          InvoiceStatus @default(DRAFT)
  dueDate         DateTime      @map("due_date")
  paidDate        DateTime?     @map("paid_date")
  subtotalAmount  Int           @default(0) @map("subtotal_amount")
  taxAmount       Int           @default(0) @map("tax_amount")
  discountAmount  Int           @default(0) @map("discount_amount")
  totalAmount     Int           @default(0) @map("total_amount")
  notes           String?
  customerId      String        @map("customer_id")
  createdById     String        @map("created_by_id")
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")
  deletedAt       DateTime?     @map("deleted_at")

  customer        Customer      @relation(fields: [customerId], references: [id])
  createdBy       User          @relation("InvoiceCreatedBy", fields: [createdById], references: [id])
  items           InvoiceItem[]

  @@index([deletedAt])
  @@index([status])
  @@index([customerId])
  @@index([createdById])
  @@index([dueDate])
  @@index([createdAt])
  @@map("invoices")
}

model InvoiceItem {
  id             String    @id @default(uuid())
  invoiceId      String    @map("invoice_id")
  itemName       String    @map("item_name")
  description    String?
  quantityAmount Int       @map("quantity_amount")
  unitPrice      Int       @map("unit_price")
  lineTotal      Int       @map("line_total")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")
  deletedAt      DateTime? @map("deleted_at")

  invoice        Invoice   @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  @@index([deletedAt])
  @@index([invoiceId])
  @@map("invoice_items")
}
```

---

# Field Reference

## users -> API mapping

| DB column    | API field    | Type    | Notes                              |
|--------------|--------------|---------|------------------------------------|
| id           | id           | uuid    |                                    |
| name         | name         | string  |                                    |
| email        | email        | string  | unique                             |
| password     | (never)      | string  | hashed with bcrypt; never exposed  |
| role         | role         | enum    | ADMIN / USER                       |
| created_at   | createdAt    | ISO dt  |                                    |
| updated_at   | updatedAt    | ISO dt  |                                    |
| deleted_at   | deletedAt    | ISO dt? |                                    |

## customers -> API mapping

| DB column    | API field    | Type    | Notes                              |
|--------------|--------------|---------|------------------------------------|
| id           | id           | uuid    |                                    |
| name         | name         | string  |                                    |
| email        | email        | string  | unique                             |
| phone        | phone        | string? |                                    |
| address      | address      | string? |                                    |
| created_at   | createdAt    | ISO dt  |                                    |
| updated_at   | updatedAt    | ISO dt  |                                    |
| deleted_at   | deletedAt    | ISO dt? |                                    |

## invoices -> API mapping

| DB column       | API field       | Type    | Notes                              |
|-----------------|-----------------|---------|------------------------------------|
| id              | id              | uuid    |                                    |
| invoice_number  | invoiceNumber   | string  | unique; `INV-YYYY-NNNN`            |
| status          | status          | enum    | DRAFT/PENDING/PAID/OVERDUE         |
| due_date        | dueDate         | date    | stored UTC midnight                |
| paid_date       | paidDate        | date?   |                                    |
| subtotal_amount | subtotalAmount  | int     | derived; Σ line_total              |
| tax_amount      | taxAmount       | int     |                                    |
| discount_amount | discountAmount  | int     |                                    |
| total_amount    | totalAmount     | int     | derived; subtotal+tax-discount     |
| notes           | notes           | string? |                                    |
| customer_id     | customerId      | uuid    | FK -> customers.id                 |
| created_by_id   | createdById     | uuid    | FK -> users.id                     |
| created_at      | createdAt       | ISO dt  |                                    |
| updated_at      | updatedAt       | ISO dt  |                                    |
| deleted_at      | deletedAt       | ISO dt? |                                    |

## invoice_items -> API mapping

| DB column       | API field       | Type    | Notes                              |
|-----------------|-----------------|---------|------------------------------------|
| id              | id              | uuid    |                                    |
| invoice_id      | invoiceId       | uuid    | FK -> invoices.id (cascade)        |
| item_name       | itemName        | string  |                                    |
| description     | description     | string? |                                    |
| quantity_amount | quantityAmount  | int     | >= 1                               |
| unit_price      | unitPrice       | int     | >= 0                               |
| line_total      | lineTotal       | int     | derived; quantity * unit_price     |
| created_at      | createdAt       | ISO dt  |                                    |
| updated_at      | updatedAt       | ISO dt  |                                    |
| deleted_at      | deletedAt       | ISO dt? |                                    |

---

# Indexes

Purpose of each index:

- `deletedAt` on every table: supports the universal soft-delete filter
  `WHERE deleted_at IS NULL`.
- `Customer.name`: supports `search` filter and `sortBy=name`.
- `Invoice.status`: supports status filter and dashboard aggregations.
- `Invoice.customerId`: supports `customerId` filter and FK joins.
- `Invoice.createdById`: supports FK joins and future per-user filters.
- `Invoice.dueDate`: supports date-range filter and overdue detection.
- `Invoice.createdAt`: supports `createdAt` sort and dashboard date ranges.
- `InvoiceItem.invoiceId`: supports item lookups by invoice and cascade.
- Unique indexes: `User.email`, `Customer.email`, `Invoice.invoiceNumber`
  (Prisma `@unique` creates these automatically).

---

# Soft Delete Rules

- Every table has `deleted_at DateTime?`.
- Live rows: `deleted_at IS NULL`.
- Deleted rows: `deleted_at = <ISO timestamp>`.
- All application queries MUST include `deleted_at IS NULL` (enforced via
  Prisma middleware or explicit `where` clauses in services).
- Soft-deleted rows are excluded from list, detail, dashboard, and seed
  reference checks.
- `InvoiceItem` uses `onDelete: Cascade` on the FK for hard-delete cleanup, but
  application-level deletes are soft (set `deleted_at`).
- Unique constraints (`email`, `invoice_number`) apply to ALL rows including
  soft-deleted ones. To allow reuse of a soft-deleted email/invoice number,
  either:
  - (a) append a unique suffix on soft-delete, or
  - (b) use a partial unique index (PostgreSQL) that excludes soft-deleted rows.
  Recommended for assessment scope: **(b)** partial unique index via raw SQL in
  a migration, OR keep it simple with **(a)** and document the tradeoff.

---

# Derived Fields

These are computed server-side and persisted on the row, not supplied by the
API client.

- `InvoiceItem.lineTotal = quantityAmount * unitPrice`
- `Invoice.subtotalAmount = Σ InvoiceItem.lineTotal` (live items only)
- `Invoice.totalAmount = subtotalAmount + taxAmount - discountAmount`

Recomputation triggers:
- After any create/update/delete of an `InvoiceItem`, recompute the parent
  `Invoice.subtotalAmount` and `totalAmount` in the same transaction.
- `Invoice.taxAmount` and `Invoice.discountAmount` are user-supplied; changing
  them on `PATCH /invoices/:id` also triggers recomputation.

---

# Invoice Number Generation

Format: `INV-YYYY-NNNN` (e.g. `INV-2026-0001`).

Strategy:
- Server-generated by default.
- Query the max sequence for the current year:
  `WHERE invoice_number LIKE 'INV-2026-%'`.
- Next number = max + 1, zero-padded to 4 digits.
- Optional client override: if `invoiceNumber` is supplied in the request,
  validate uniqueness and use it; otherwise generate automatically.
- Wrap generation in a transaction to avoid duplicates under concurrency.

---

# Overdue Detection

For assessment scope, overdue is computed **on read**, not by a background job.

Logic (applied in list/detail/dashboard queries):
- If `status = PENDING` AND `dueDate < startOfToday()` → treat as `OVERDUE`
  for response and aggregation purposes.
- Optionally persist the transition: a periodic job or a service method can
  flip `status` to `OVERDUE` so it sticks. Recommended: persist on read via a
  lightweight update, or expose a `POST /invoices/mark-overdue` utility
  endpoint (nice-to-have).

---

# Seed Data

Seed runs after migration. Idempotent (safe to re-run).

## Users

| email                | name       | password (plaintext in seed) | role  |
|----------------------|------------|------------------------------|-------|
| admin@example.com    | Admin      | admin123                     | ADMIN |
| user@example.com     | Staff One  | user123                      | USER  |

Passwords are hashed with bcrypt (cost factor 10) before insert.

## Customers (5 rows)

| name              | email                   | phone        | address                             |
|-------------------|-------------------------|--------------|-------------------------------------|
| PT Maju Jaya      | contact@majujaya.id     | 0211234567   | Jl. Bisnis No. 1, Jakarta           |
| CV Sentosa        | hello@sentosa.id        | 0219876543   | Jl. Melati No. 8, Bandung           |
| PT Abadi Solusi   | info@abadisolusi.id     | 0315551234   | Jl. Sudirman No. 50, Surabaya       |
| UD Berkah         | berkah@ud.id            | 02747654321  | Jl. Malioboro No. 12, Yogyakarta    |
| PT Global Nusantara | admin@globalnusantara.id | 0215557890 | Jl. Gatot Subroto No. 21, Jakarta   |

## Invoices (5 rows)

Mix of statuses to make the dashboard meaningful:

| invoice_number  | status   | customer             | due_date   | paid_date  | items summary                                   | created_by      |
|-----------------|----------|----------------------|------------|------------|-------------------------------------------------|-----------------|
| INV-2026-0001   | PAID     | PT Maju Jaya         | 2026-06-15 | 2026-06-14 | 1 item @ 1,000,000; tax 11%                    | admin@example.com |
| INV-2026-0002   | PENDING  | CV Sentosa           | 2026-07-29 | -          | 2 items total 2,500,000; tax 11%               | admin@example.com |
| INV-2026-0003   | OVERDUE  | PT Abadi Solusi      | 2026-05-31 | -          | 1 item @ 5,000,000; tax 11%                    | user@example.com  |
| INV-2026-0004   | DRAFT    | UD Berkah            | 2026-08-15 | -          | 1 item @ 750,000; no tax                       | user@example.com  |
| INV-2026-0005   | PENDING  | PT Global Nusantara  | 2026-07-30 | -          | 3 items total 8,200,000; tax 11%; disc 200,000 | admin@example.com |

Each invoice has 1–3 `invoice_items` rows. Monetary amounts are integers in
IDR major unit.

---

# Migration Strategy

1. `prisma migrate dev --name init` — creates initial schema from the Prisma
   model above.
2. Optional follow-up migration for partial unique indexes (to allow reuse of
   soft-deleted emails/invoice numbers):
   ```sql
   CREATE UNIQUE INDEX idx_customers_email_live
     ON customers (email) WHERE deleted_at IS NULL;

   CREATE UNIQUE INDEX idx_invoices_invoice_number_live
     ON invoices (invoice_number) WHERE deleted_at IS NULL;
   ```
   After creating partial indexes, remove the plain `@unique` constraints on
   those columns (or keep them and accept that soft-deleted values block
   reuse — document the choice).
3. Seed db seed` runs `prisma/seed.ts`.

---

# Prisma Middleware for Soft Delete

To guarantee `deleted_at IS NULL` is always applied, use Prisma middleware:

```ts
// prisma/prisma.service.ts (middleware registration)
prisma.$use(async (params, next) => {
  const softDeletable = ['User', 'Customer', 'Invoice', 'InvoiceItem'];
  if (softDeletable.includes(params.model)) {
    // Rewrite find queries to include deleted_at IS NULL
    if (params.action === 'findUnique' || params.action === 'findFirst') {
      params.action = 'findFirst';
      params.where = { ...params.where, deletedAt: null };
    }
    if (params.action === 'findMany') {
      params.where = { ...params.where, deletedAt: null };
    }
  }
  return next(params);
});
```

Caveat: Prisma middleware cannot rewrite aggregate/count queries. For
`dashboard` aggregations, apply `deleted_at IS NULL` explicitly in raw/SQL
queries or in the Prisma `count`/`aggregate` calls.

---

# Environment

`.env` (see `.env.example`):

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mini_erp?schema=public"
JWT_SECRET="change-me-in-production"
JWT_EXPIRES_IN="1d"
PORT=3000
```

---

# Backup & Recovery Notes (Nice to Have)

- Use `pg_dump` for ad-hoc backups.
- For production, enable WAL archiving / managed DB automated backups.
- Out of scope for the 7-day assessment, but documented for future work.
