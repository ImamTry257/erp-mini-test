# Mini ERP Invoicing System

## API Implementation Plan

---

# Overview

This document is the technical implementation guide for the Mini ERP
Invoicing System **backend**. It describes the technology stack, project
structure, cross-cutting infrastructure (config, Prisma, middleware, filters,
interceptors), module design, derived-field logic, pagination helper, and
the file implementation order for each layer.

Source of truth for feature scope: `../planning/project-planning.md`
Source of truth for API contract: `../planning/api-planning.md`
Source of truth for data layer: `../planning/database-planning.md`

This file focuses purely on **how** to build the NestJS + Prisma backend.

---

# Technology Stack

| Concern            | Choice                                |
|--------------------|---------------------------------------|
| Runtime            | Node.js 20+                           |
| Framework          | NestJS 10+                            |
| Language           | TypeScript (strict)                   |
| ORM                | Prisma 5+                             |
| Database           | PostgreSQL 16+                        |
| Auth               | @nestjs/jwt + @nestjs/passport, passport-jwt, bcrypt |
| Validation         | class-validator + class-transformer   |
| Config             | @nestjs/config (dotenv)               |
| API Documentation  | Postman Collection      |
| Containerization   | Docker + Docker Compose               |
| Package manager    | pnpm                                  |

---

# Project Structure

```
backend/
├── src/
│   ├── main.ts                      # Bootstrap, global prefix, pipes
│   ├── app.module.ts                # Root module
│   ├── common/
│   │   ├── dto/
│   │   │   ├── pagination.dto.ts
│   │   │   └── api-response.dto.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── interceptors/
│   │   │   └── transform.interceptor.ts
│   │   ├── decorators/
│   │   │   └── current-user.decorator.ts
│   │   └── guards/
│   │       └── jwt-auth.guard.ts
│   ├── config/
│   │   ├── configuration.ts
│   │   └── prisma.service.ts        # Prisma client + soft-delete middleware
│   ├── database/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts        # (re-export / wrap)
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── dto/
│   │   │   └── login.dto.ts
│   │   └── strategies/
│   │       └── jwt.strategy.ts
│   ├── users/                       # (future RBAC support)
│   ├── customers/
│   │   ├── customers.module.ts
│   │   ├── customers.controller.ts
│   │   ├── customers.service.ts
│   │   ├── dto/
│   │   │   ├── create-customer.dto.ts
│   │   │   ├── update-customer.dto.ts
│   │   │   └── query-customer.dto.ts
│   │   └── entities/
│   │       └── customer.entity.ts
│   ├── invoices/
│   │   ├── invoices.module.ts
│   │   ├── invoices.controller.ts
│   │   ├── invoices.service.ts
│   │   ├── invoice-items.controller.ts
│   │   ├── dto/
│   │   │   ├── create-invoice.dto.ts
│   │   │   ├── update-invoice.dto.ts
│   │   │   ├── update-invoice-status.dto.ts
│   │   │   ├── create-invoice-item.dto.ts
│   │   │   ├── update-invoice-item.dto.ts
│   │   │   └── query-invoice.dto.ts
│   │   └── entities/
│   │       └── invoice.entity.ts
│   └── dashboard/
│       ├── dashboard.module.ts
│       ├── dashboard.controller.ts
│       └── dashboard.service.ts
├── prisma/
│   └── schema.prisma                # (symlink or copy of src/prisma/schema.prisma)
├── .env.example
├── .env
├── docker-compose.yml
├── Dockerfile
├── package.json
├── tsconfig.json
└── README.md
```

---

# Environment

`.env.example`:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mini_erp?schema=public"
JWT_SECRET="change-me-in-production"
JWT_EXPIRES_IN="1d"
PORT=3000
```

---

# Bootstrap (`main.ts`)

```ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? true, credentials: true });
  await app.listen(process.env.PORT ?? 3000);
}
```

- `whitelist: true` strips non-decorated properties (security).
- `transform: true` auto-converts payloads to DTO instances.
- `forbidNonWhitelisted: true` returns 422 on unknown fields (optional; can be relaxed).

---

# Cross-Cutting Infrastructure

## Prisma Service (`config/prisma.service.ts`)

Extends `PrismaClient`, registers soft-delete middleware, implements
`OnModuleInit` / `OnModuleDestroy`.

```ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    this.$use(async (params, next) => {
      const softDeletable = ['User', 'Customer', 'Invoice', 'InvoiceItem'];
      if (params.model && softDeletable.includes(params.model)) {
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
  }
  async onModuleDestroy() { await this.$disconnect(); }
}
```

Caveat: middleware cannot rewrite `count`/`aggregate`/`groupBy`. Dashboard
aggregations must apply `deletedAt: null` explicitly.

## Transform Interceptor (`common/interceptors/transform.interceptor.ts`)

Wraps every successful handler response into the standard envelope:

```ts
intercept(context, next) {
  return next.handle().pipe(
    map((data) => {
      // Already-enveloped responses pass through
      if (data && typeof data === 'object' && 'success' in data) return data;
      return { success: true, string: 'Success', data, meta: null };
    }),
  );
}
```

For paginated responses, the handler returns `{ data, meta }` and the
interceptor maps to `{ success: true, string: 'Success', data, meta }`.

## Exception Filter (`common/filters/http-exception.filter.ts`)

Catches all exceptions and returns the standard error envelope:

```ts
catch(exception, host) {
  const res = host.switchToHttp().getResponse<Response>();
  const status = exception instanceof HttpException ? exception.getStatus() : 500;
  const message = exception instanceof HttpException ? exception.message : 'Internal server error';
  const errorRes = exception instanceof HttpException ? exception.getResponse() : null;
  const errors = (errorRes as any)?.message && Array.isArray((errorRes as any).message)
    ? (errorRes as any).message.map((m) => parseClassValidatorMessage(m))
    : undefined;
  res.status(status).json({ success: false, string: message, errors, statusCode: status });
}
```

ValidationPipe produces `message: string[]` of class-validator errors; the
filter normalizes them to `{ field, message }` pairs.

## JWT Guard (`common/guards/jwt-auth.guard.ts`)

Extends `AuthGuard('jwt')`. Applied globally or per-controller. Unauthenticated
requests receive 401.

## Current User Decorator (`common/decorators/current-user.decorator.ts`)

```ts
export const CurrentUser = createParamDecorator((data, ctx) => {
  const req = ctx.switchToHttp().getRequest();
  return req.user; // { id, email, role }
});
```

---

# Pagination Helper

`common/dto/pagination.dto.ts`:

```ts
export class PaginationDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => value ?? 1)
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Transform(({ value }) => value ?? 10)
  limit?: number = 10;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsEnum(['asc', 'desc'])
  @IsOptional()
  order?: 'asc' | 'desc' = 'desc';

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
```

Service helper to build Prisma `findMany` + `count` and return `{ data, meta }`:

```ts
export function buildPagination<T>(items: T[], total: number, page: number, limit: number) {
  return {
    data: items,
    meta: {
      page, limit, totalItems: total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
  };
}
```

sortBy whitelist is enforced per-endpoint; unknown columns throw 422.

---

# Module Design

## Auth Module

### `auth/dto/login.dto.ts`

```ts
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
```

### `auth/auth.service.ts`

```ts
async login(dto: LoginDto) {
  const user = await this.prisma.user.findFirst({ where: { email: dto.email, deletedAt: null } });
  if (!user) throw new UnauthorizedException('Invalid email or password');
  const ok = await bcrypt.compare(dto.password, user.password);
  if (!ok) throw new UnauthorizedException('Invalid email or password');
  const accessToken = await this.jwtService.signAsync({ sub: user.id, email: user.email, role: user.role });
  return { accessToken, user: this.stripPassword(user) };
}
```

### `auth/auth.controller.ts`

```ts
@Controller('auth')
export class AuthController {
  @Post('login')
  @HttpCode(201)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtUser) {
    return { user };
  }
}
```

### `auth/strategies/jwt.strategy.ts`

Extracts bearer token, verifies with `JWT_SECRET`, returns `{ id, email, role }`.

---

## Customers Module

### DTOs

- `CreateCustomerDto`: `name` (1..100), `email` (unique, email), `phone?`, `address?`.
- `UpdateCustomerDto`: same fields, all optional, at least one (custom validator).
- `QueryCustomerDto extends PaginationDto`: adds nothing extra; search scope
  `name | email | phone`; sortBy whitelist `[name, email, phone, createdAt, updatedAt]`.

### `customers.service.ts`

- `list(q)`: build Prisma `where` with `deletedAt: null`, search OR, date range
  on `createdAt`, sort, paginate. Return `buildPagination(items, total, page, limit)`.
- `findById(id)`: `findFirst({ where: { id, deletedAt: null } })` or 404.
- `create(dto)`: check email uniqueness (409 on conflict), create.
- `update(id, dto)`: 404 if missing/deleted; 409 on email conflict.
- `remove(id)`: 404 if missing; 409 if customer has existing invoices
  (`invoices.some(x => !x.deletedAt)`); else set `deletedAt = new Date()`.

---

## Invoices Module

### DTOs

- `CreateInvoiceDto`: `invoiceNumber?`, `customerId` (uuid), `dueDate` (ISO date,
  >= today), `taxAmount?` (int >= 0), `discountAmount?` (int >= 0), `notes?`,
  `items` (array min 1 of `CreateInvoiceItemDto`).
- `UpdateInvoiceDto`: header fields only (no items, no status).
- `UpdateInvoiceStatusDto`: `status` + optional `paidDate` (validated by
  discriminated rules).
- `CreateInvoiceItemDto` / `UpdateInvoiceItemDto`: `itemName`, `description?`,
  `quantityAmount` (int >= 1), `unitPrice` (int >= 0).
- `QueryInvoiceDto extends PaginationDto`: adds `status?`, `customerId?`,
  date range on `dueDate`, sortBy whitelist `[invoiceNumber, dueDate, paidDate,
  status, totalAmount, createdAt]`.

### `invoices.service.ts`

#### Derived field computation

```ts
function computeLineTotal(item: { quantityAmount: number; unitPrice: number }) {
  return item.quantityAmount * item.unitPrice;
}
function computeInvoiceAmounts(items: { lineTotal: number }[], tax: number, discount: number) {
  const subtotalAmount = items.reduce((s, i) => s + i.lineTotal, 0);
  const totalAmount = subtotalAmount + tax - discount;
  return { subtotalAmount, totalAmount };
}
```

#### `create(dto, userId)`

Wrap in `prisma.$transaction`:
1. Validate customer exists & is live (404 otherwise).
2. Resolve `invoiceNumber`: if provided, check uniqueness (409); else generate
   `INV-YYYY-NNNN` (max sequence for year + 1, zero-padded to 4 digits).
3. Compute lineTotal per item, subtotalAmount, totalAmount.
4. Create invoice with nested `items.create` and `createdById = userId`,
   `status = DRAFT`.
5. Return full detail (with customer + items).

#### `list(q)`

- Build `where`: `deletedAt: null`, status filter, customerId filter, dueDate
  range, search on `invoiceNumber` OR `customer.name`.
- Overdue detection on read: after fetch, map items where
  `status === PENDING && dueDate < startOfToday()` to `OVERDUE` for the
  response (do not persist by default; optional `markOverdue` utility).
- Include `customer: { select: { id, name } }` to populate `customerName`.
- Return paginated summary (no items array).

#### `findById(id)`

- `findFirst({ where: { id, deletedAt: null }, include: { customer: true, items: { where: { deletedAt: null } } } })`.
- Apply overdue mapping on the status for the response.
- 404 if missing/deleted.

#### `update(id, dto)`

- 404 if missing/deleted.
- If `invoiceNumber` changed, check uniqueness (409).
- If `customerId` changed, validate customer (404).
- Recompute `totalAmount` if `taxAmount`/`discountAmount` changed (using
  current live items).
- Save.

#### `updateStatus(id, dto)`

- Load invoice (404 if missing/deleted).
- Validate transition per state machine (409 on invalid).
- On `PAID`: set `paidDate = dto.paidDate ?? startOfToday()`.
- On `OVERDUE`: ensure `paidDate = null`.
- Save.

#### `remove(id)`

- 404 if missing; set `deletedAt = new Date()`.

### `invoice-items.controller.ts`

Routes under `/invoices/:invoiceId/items`. All operations require parent
invoice to be in `DRAFT` status (409 otherwise).

- `POST /invoices/:invoiceId/items`: validate parent DRAFT, create item,
  recompute parent amounts in transaction.
- `PATCH /invoices/:invoiceId/items/:itemId`: update item, recompute parent.
- `DELETE /invoices/:invoiceId/items/:itemId`: soft-delete item, recompute parent.

Recomputation helper:

```ts
async function recomputeAndSave(prisma, invoiceId) {
  const items = await prisma.invoiceItem.findMany({ where: { invoiceId, deletedAt: null } });
  const subtotalAmount = items.reduce((s, i) => s + i.lineTotal, 0);
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, deletedAt: null } });
  const totalAmount = subtotalAmount + invoice.taxAmount - invoice.discountAmount;
  await prisma.invoice.update({ where: { id: invoiceId }, data: { subtotalAmount, totalAmount } });
}
```

---

## Dashboard Module

### `dashboard.service.ts`

`getSummary(startDate?, endDate?)`:

- Default range: last 30 days by `createdAt`.
- Use raw SQL or Prisma `groupBy`/`count` with `deletedAt: null` and date
  filters applied explicitly (middleware does not cover aggregates).
- Aggregations:
  - `totalCustomers`: count customers live.
  - `totalInvoices`: count invoices live in range.
  - `paidInvoices`, `pendingInvoices`, `overdueInvoices`, `draftInvoices`:
    counts grouped by status (overdue computed as PENDING + dueDate < today).
  - `revenueSummary.paidAmount`: SUM(totalAmount) WHERE status = PAID.
  - `revenueSummary.pendingAmount`: SUM(totalAmount) WHERE status = PENDING.
  - `revenueSummary.overdueAmount`: SUM(totalAmount) WHERE status = OVERDUE
    (or PENDING + overdue detection).
  - `revenueSummary.totalAmount`: SUM(totalAmount) WHERE status IN (PAID, PENDING, OVERDUE).
  - `recentInvoices`: latest 5 invoices (summary shape).

Raw SQL example (PostgreSQL):

```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'PAID') AS paid_invoices,
  COUNT(*) FILTER (WHERE status = 'PENDING') AS pending_invoices,
  COUNT(*) FILTER (WHERE status = 'OVERDUE') AS overdue_invoices,
  COUNT(*) FILTER (WHERE status = 'DRAFT') AS draft_invoices,
  COALESCE(SUM(total_amount) FILTER (WHERE status = 'PAID'), 0) AS paid_amount,
  COALESCE(SUM(total_amount) FILTER (WHERE status = 'PENDING'), 0) AS pending_amount,
  COALESCE(SUM(total_amount) FILTER (WHERE status = 'OVERDUE'), 0) AS overdue_amount,
  COALESCE(SUM(total_amount) FILTER (WHERE status IN ('PAID','PENDING','OVERDUE')), 0) AS total_amount
FROM invoices
WHERE deleted_at IS NULL AND created_at BETWEEN $1 AND $2;
```

---

# Invoice Number Generation

```ts
async function generateInvoiceNumber(prisma: PrismaService, year = new Date().getFullYear()) {
  const prefix = `INV-${year}-`;
  const last = await prisma.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
  });
  const seq = last ? Number(last.invoiceNumber.slice(-4)) + 1 : 1;
  return `${prefix}${seq.toString().padStart(4, '0')}`;
}
```

Wrap in transaction with the create to avoid duplicates under concurrency.

---

# Overdue Detection

Computed on read (no background job for assessment scope).

```ts
const startOfToday = new Date(); startOfToday.setHours(0,0,0,0);
function mapOverdue<T extends { status: InvoiceStatus; dueDate: Date }>(inv: T): T {
  if (inv.status === 'PENDING' && inv.dueDate < startOfToday) return { ...inv, status: 'OVERDUE' };
  return inv;
}
```

Applied in `list`, `findById`, and `dashboard` queries. Optionally expose
`POST /invoices/mark-overdue` to persist the transition (nice-to-have).

---

# Seed Data

`prisma/seed.ts` (idempotent):

- Hash passwords with bcrypt (cost 10).
- Upsert users by email (`admin@example.com`, `user@example.com`).
- Upsert 5 customers by email.
- Upsert 5 invoices by invoiceNumber with nested items.
- All rows created with `deletedAt: null`.

Register in `package.json`:

```json
"prisma": { "seed": "ts-node prisma/seed.ts" }
```

---

# Docker

`docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: mini_erp
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
  api:
    build: .
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/mini_erp?schema=public
      JWT_SECRET: change-me-in-production
      JWT_EXPIRES_IN: 1d
      PORT: 3000
    ports: ["3000:3000"]
    depends_on: [db]
    command: sh -c "npx prisma migrate deploy && npx prisma db seed && node dist/main"
volumes:
  pgdata:
```

`Dockerfile` (multi-stage): build NestJS, run with `node dist/main`.

---

# Implementation Order

1. **Project scaffold**
   - `pnpm init`, install NestJS, Prisma, JWT, bcrypt, class-validator,
     class-transformer, @nestjs/config.
   - `nest new backend` or manual setup.
   - `prisma init`, configure `schema.prisma` per `database-planning.md`.
2. **Config & Prisma**
   - `config/configuration.ts`, `config/prisma.service.ts` with middleware.
   - `prisma migrate dev --name init`.
3. **Cross-cutting**
   - `TransformInterceptor`, `HttpExceptionFilter`, `JwtAuthGuard`,
     `CurrentUser` decorator, `PaginationDto`, `buildPagination`.
4. **Auth module**
   - DTO, service, controller, JWT strategy, guard wiring.
5. **Customers module**
   - DTOs, service, controller.
6. **Invoices module**
   - DTOs, service, controller, invoice-items controller.
7. **Dashboard module**
   - Service with raw SQL aggregations, controller.
8. **Seed**
   - `prisma/seed.ts` with users, customers, invoices, items.
9. **Docker**
   - `Dockerfile`, `docker-compose.yml`, `.env.example`.
10. **Postman Collection**
    - Export collection covering all endpoints.
11. **README**
    - Setup, run, env vars, endpoints summary.

---

# Verification

- `pnpm dev` starts the API on `:3000/api/v1`.
- `curl localhost:3000/api/v1/auth/login` returns the standard envelope.
- `GET /api/v1/customers` returns paginated envelope with `meta`.
- `POST /api/v1/invoices` with items returns computed amounts.
- `PATCH /api/v1/invoices/:id/status` rejects invalid transitions with 409.
- `GET /api/v1/dashboard` returns aggregated summary.
- `DELETE /api/v1/customers/:id` sets `deletedAt`; subsequent GET returns 404.
- Re-running seed is idempotent.

---

# Notes

- All request/response fields are **camelCase**. Prisma returns camelCase
  already (Prisma maps `@map` columns to camelCase JS properties), so no
  extra mapping is needed at the controller layer. Only raw SQL results need
  explicit aliasing.
- All monetary amounts are integers in IDR major unit.
- All timestamps are ISO-8601 UTC strings.
- `createdById` is always taken from the JWT; never trust client input.
- No Swagger UI; API documentation is the Postman Collection.
