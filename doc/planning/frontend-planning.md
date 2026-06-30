# Mini ERP Invoicing System

## Frontend Planning

---

# Overview

This document describes the frontend architecture for the Mini ERP Invoicing
System. It covers the technology stack, project structure, route map, page
specifications, API client design, state management, shared components, types,
validation schemas, and the implementation order.

Source of truth for feature scope: `project-planning.md`
Source of truth for API contract: `api-planning.md`
Source of truth for data layer: `database-planning.md`

This file focuses purely on the **Next.js App Router frontend**.

---

# Technology Stack

| Concern            | Choice                                |
|--------------------|---------------------------------------|
| Framework          | Next.js 14+ (App Router)              |
| Language           | TypeScript (strict)                   |
| Styling            | TailwindCSS                           |
| UI Components      | shadcn/ui (Radix primitives)          |
| Forms              | React Hook Form + Zod                 |
| Icons              | Lucide React                          |
| Data fetching      | Native Server Components + `fetch`    |
| Global state       | Context API + `useReducer`            |
| HTTP client (client-side) | Typed `fetch` wrapper in `lib/api.tsDeliberately **not** used (per project decision):
- No Tanstack Query / SWR (caching via built-in `fetch` + `revalidateTag`).
- No Zustand / Jotai / Recoil.
- No heavy component library like Ant Design / Mantine.
- No Swagger UI — API documentation delivered via Postman Collection.

---

# Project Structure

```
frontend/
├── app/                       # Next.js App Router pages & route handlers
│   ├── layout.tsx             # Root layout (providers, shell)
│   ├── login/
│   │   └── page.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   ├── customers/
│   │   ├── page.tsx
│   │   ├── [id]/page.tsx
│   │   └── new/page.tsx
│   ├── invoices/
│   │   ├── page.tsx
│   │   ├── [id]/page.tsx
│   │   ├── [id]/edit/page.tsx
│   │   └── new/page.tsx
│   ├── history/
│   │   └── page.tsx
│   └── (auth)/                # Group for protected shell layout w/ sidebar
├── components/
│   ├── ui/                    # shadcn/ui generated components
│   ├── layout/                # Sidebar, Topbar, PageHeader
│   ├── shared/                # StatusBadge, Currency, ConfirmDialog, etc.
│   ├── customers/             # CustomerForm, CustomerTable
│   └── invoices/              # InvoiceForm, InvoiceTable, ItemsEditor
├── hooks/
│   ├── useDebounce.ts
│   └── useToast.ts
├── contexts/
│   ├── AuthContext.tsx
│   └── ToastContext.tsx
├── services/
│   ├── auth.service.ts
│   ├── customers.service.ts
│   ├── invoices.service.ts
│   └── dashboard.service.ts
├── lib/
│   ├── api.ts                 # Generic fetch wrapper
│   └── utils.ts               # cn(), format helpers
├── types/
│   └── index.ts
├── schemas/
│   ├── auth.schema.ts
│   ├── customer.schema.ts
│   └── invoice.schema.ts
├── middleware.ts              # Auth protection
├── .env.example
└── package.json
```

---

# Route Map

| Path                       | Page                          | Auth | Data strategy                       |
|----------------------------|-------------------------------|------|-------------------------------------|
| `/login`                   | LoginPage                     | No   | Client form                         |
| `/dashboard`               | DashboardPage                 | Yes  | Server Component fetch `/dashboard` |
| `/customers`               | CustomerListPage              | Yes  | Server Component fetch `/customers` (params from searchParams) |
| `/customers/[id]`          | CustomerDetailPage            | Yes  | Server Component fetch `/customers/:id` |
| `/customers/new`           | CreateCustomerPage            | Yes  | Client form                         |
| `/invoices`                | InvoiceListPage               | Yes  | Server Component fetch `/invoices`  |
| `/invoices/[id]`           | InvoiceDetailPage             | Yes  | Server Component fetch `/invoices/:id` |
| `/invoices/[id]/edit`      | EditInvoicePage               | Yes  | Client form (prefilled via server)  |
| `/invoices/new`            | CreateInvoicePage             | Yes  | Client form                         |
| `/history`                 | InvoiceHistoryPage            | Yes  | Server Component fetch `/invoices?status=PAID` |

All protected routes behind `middleware.ts` that redirects unauthenticated
users to `/login`.

---

# Page Specifications

For every page, field names in both payload and response are **camelCase**.

## LoginPage (`/login`)

- Client component (`"use client"`).
- Form: `email` + `password` with Zod `LoginSchema`.
- On submit: `POST /auth/login`.
  - Success → store `{ accessToken, user }` in `AuthContext` + `localStorage`,
    redirect to `/dashboard`.
  - Error → map `string` / `errors` to React Hook Form field errors, show toast.
- Link: none (only one login screen).

## DashboardPage (`/dashboard`)

- Server Component.
- Fetches `GET /dashboard?startDate=&endDate=`.
- Renders summary cards:
  - Total Customers, Total Invoices, Paid, Pending, Overdue.
  - Revenue cards: paid / pending / overdue / total amounts.
- Renders Recent Invoices table (last 5) with status badge.
- Loading state via `loading.tsx` skeleton.

## CustomerListPage (`/customers`)

- Server Component reading `searchParams`: `page, limit, search, sortBy, order`.
- Fetches `GET /customers?...`.
- Renders `CustomerTable` with pagination + search bar + sort headers.
- Search: debounced, pushes new URL params (shallow navigation).
- Empty state when no customers.
- Row actions: view (`/customers/[id]`), edit (future stretch), delete →
  `ConfirmDialog` -> `DELETE /customers/:id` via route handler (client island).

## CustomerDetailPage (`/customers/[id]`)

- Server Component.
- Fetches `GET /customers/:id`.
- Shows customer fields + related invoices list.
- Edit / Delete buttons (client islands).

## CreateCustomerPage (`/customers/new`)

- Client component.
- `CustomerForm` (React Hook Form + Zod `CustomerSchema`).
- Submit -> `POST /customers`. Success: toast + redirect to `/customers`.
- Validation errors mapped to fields.

## InvoiceListPage (`/invoices`)

- Server Component reading `searchParams`:
  `page, limit, search, status, customerId, sortBy, order, startDate, endDate`
- Filters: status dropdown, date range, customer picker (async select),
  search bar, sort headers.
- Renders `InvoiceTable` + pagination.
- Status badge per row, IDR currency for amounts.
- Actions: view, edit (`/invoices/[id]/edit`), delete.

## InvoiceDetailPage (`/invoices/[id]`)

- Server Component.
- Fetches `GET /invoices/:id` (with items + customer).
- Shows header fields, customer block, items table, amounts.
- Actions: edit, change status dropdown (DRAFT->PENDING, PENDING->PAID,
  etc. — validated against backend transition rules), delete.

## CreateInvoicePage (`/invoices/new`)/EditInvoicePage

- Client components.
- `InvoiceForm`:
  - Fields: `invoiceNumber?`, `customerId` (async select), `dueDate`,
    `taxAmount`, `discountAmount`, `notes`.
  - `ItemsEditor` sub-form (list/add/remove/edit) validating each item
    (`itemName`, `description?`, `quantityAmount`, `unitPrice`).
  - Submit:
    - create -> `POST /invoices` (server computes subtotal/total/lineTotal);
    - edit -> `PATCH /invoices/:id` (status changed elsewhere).
  - Success -> redirect + toast.

## InvoiceHistoryPage (`/history`)

- Server Component.
- Fetches `GET /invoices?status=PAID&sort_by=paid_date&order=desc`.
- Read-only table of paid invoices (paidDate not null).
- Reuses `InvoiceTable` with different columns.

---

# API Client Design

Single source of truth in `lib/api.ts`:

```ts
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL; // http://localhost:3000/api/v1

async function api<T>(
  path: string,
  options: RequestInit & { params?: Record<string, unknown> } = {}
): Promise<ApiResponse<T>>
```

Behavior:
- Prepend `/api/v1`.
- Inject `Authorization: Bearer ${accessToken}` for every **client-side**
  request token is read from `localStorage`.
- On non-2xx, parse error envelope `{ success:false, string, errors?, statusCode }`
  and throw `ApiError` with `.string`, `.errors`, `.statusCode`.
- On success, return the `data` typed to `T`.
- Serialize `params` into URL string (camelCase keys preserved).
- Set `Content-Type: application/json` whenever body exists.

Convenience service modules (`services/*.ts`) call `api<T>()` with typed DTO
shapes and return the typed result. Example:

```ts
// invoices.service.ts
export const invoicesService = {
  list: (q: ListInvoiceQuery) => api<Paginated<InvoiceSummary>>("/invoices", { params: q }),
  get: (id: string) => api<Invoice>(`/invoices/${id}`),
  create: (body: CreateInvoiceInput) => api<Invoice>("/invoices", { method:"POST", body: JSON.stringify(body) }),
  update: (id, body) => api<Invoice>(`/invoices/${id}`, { method:"PATCH", body: JSON.stringify(body) }),
  updateStatus: (id, body) => api<Invoice>(`/invoices/${id}/status`, { method:"PATCH", body: JSON.stringify(body) }),
  remove: (id) => api<{id:string,deletedAt:string}>(`/invoices/${id}`, { method:"DELETE" }),
  addItem: (invoiceId, body) => api<InvoiceItem>(`/invoices/${invoiceId}/items`, { method:"POST", body: JSON.stringify(body) }),
  updateItem: (invoiceId, itemId, body) => api<InvoiceItem>(`/invoices/${invoiceId}/items/${itemId}`, { method:"PATCH", body: JSON.stringify(body) }),
  removeItem: (invoiceId, itemId) => api<{id:string}>(`/invoices/${invoiceId}/items/${itemId}`, { method:"DELETE" }),
};
```

---

# Authentication Flow

### Login
- Client form -> `services/auth.service.login({ email, password })` ->
  `POST /auth/login`.
- Store `{ accessToken, user }` in `AuthContext` state and
  `localStorage.setItem("auth", JSON.stringify(...))`.

### Session bootstrap
- On app load, `AuthContextProvider` reads `localStorage` and optionally
  verifies with `GET /auth/me`. If verification fails, clear storage and stay
  logged out.

### Token injection
- `lib/api.ts` reads `localStorage.auth.accessToken` per request in Client
  Components / Route Handlers. Server Components receiving the token use the
  request cookies or forward the Authorization header from client navigator
  (prefer passing auth via Route Handler calls that read the cookie).

### Middleware (`middleware.ts`)
- Runs on `/dashboard`, `/customers/**`, `/invoices/**`, `/history`.
- Reads `auth` cookie/localStorage (storage not in middleware; cookie is set on
  login as httpOnly on a Route Handler) and redirects to `/login` if missing.
- Keep it simple for assessment: store accessToken in an **httpOnly cookie**
  via POST `/internal/set-token` Route Handler on login; middleware reads it.

### Logout
- Clear `localStorage`, clear cookie via Route Handler, redirect to `/login`.

---

# State Management

### AuthContext (`contexts/AuthContext.tsx`)

State:
```ts
type AuthState = { user: User | null; accessToken: string | null; status: "loading"|"authenticated"|"unauthenticated" }
```

Reducer actions: `HYDRATE`, `LOGIN`, `LOGOUT`.
- `useAuth()` hook returns `{ user, accessToken, status, login, logout }`.
- `AuthProvider` wraps the application.

### ToastContext (`contexts/ToastContext.tsq`)

State: array of `{ id, title, description, variant }`.
- `useToast()` exposes `toast(opts)` and `dismiss(id)`.
- Renders `<Toaster />` via shadcn in root layout.

Forms keep **local** React Hook Form state; only notifications and auth share
the global store. List/pagination/filter state lives in URL `searchParams`
(Next.js `useSearchParams`).

---

# Shared Components

shadcn/ui used components: `Table`, `Dialog`, `AlertDialog`, `Button`,
`Input`, `Label`, `Select`, `Badge`, `Skeleton`, `Toast/Toaster`, `Separator`,
`Card`, `DropdownMenu`, `Popover`, `Calendar`, `Form` (RHF bridge).

Custom shared components under `components/shared/`:

| Component          | Purpose                                                              |
|--------------------|----------------------------------------------------------------------|
| `StatusBadge`      | Color-coded `InvoiceStatus` (DRAFT/PENDING/PAID/OVERDUE)             |
| `Currency`         | IDR formatter (e.g. `IDR 1.110.000`)                                 |
| `DateText`         | Human date (e.g. `29 Jun 2026`)                                      |
| `ConfirmDialog`    | Generic `AlertDialog` for destructive actions (delete)               |
| `Pagination`       | Page prev/next + page numbers wired to URL `searchParams`            |
| `SearchInput`      | Debounced search bar (pushes `search` param)                         |
| `SortHeader`       | Clickable column label toggling `sortBy` / `order`                   |
| `PageHeader`       | Title + optional action button area                                  |
| `StatCard`         | Dashboard metric tile                                                |
| `EmptyState`       | Placeholder when list is empty with call-to-action                   |
| `LoadingTable`     | Skeleton placeholder rows                                            |

`components/layout/`:

| Component    | Purpose                                                   |
|--------------|-----------------------------------------------------------|
| `Sidebar`    | Navigation links (Dashboard, Customers, Invoices, History) |
| `Topbar`     | Branding, user chip, logout                               |
| `AppShell`   | Wraps protected routes with Sidebar + Topbar              |

---

# Types

`types/index.ts` re-exports all shared TypeScript types, mirroring the API
response shapes in `api-planning.md`:

```ts
export interface ApiResponse<T> { success: boolean; string: string; data: T; meta?: PaginationMeta | null; }
export interface ApiErrorShape { success:false; string:string; errors?: FieldError[]; statusCode:number; }
export interface FieldError { field:string; message:string; }
export interface PaginationMeta { page:number; limit:number; totalItems:number; totalPages:number; hasNextPage:boolean; hasPreviousPage:boolean; }
export type Paginated<T> = { items:T[] } & PaginationMeta-compatible;

export type Role = "ADMIN" | "USER";
export type InvoiceStatus = "DRAFT" | "PENDING" | "PAID" | "OVERDUE";

export interface User { id; email; name; role; createdAt; updatedAt; deletedAt? }
export interface Customer { id; name; email; phone?; address?; createdAt; updatedAt; deletedAt? }

export interface InvoiceItem { id; invoiceId; itemName; description?; quantityAmount; unitPrice; lineTotal; createdAt; updatedAt; deletedAt? }
export interface CustomerMini { id; name; email; phone?; address? }
export interface InvoiceSummary { id; invoiceNumber; status; dueDate?:string; paidDate?:string; subtotalAmount; taxAmount; discountAmount; totalAmount; notes?; createdAt; updatedAt; customerId; customerName; createdById; }
export interface Invoice extends InvoiceSummary { customer:CustomerMini; items:InvoiceItem[] }
export interface RevenueSummary { paidAmount; pendingAmount; overdueAmount; totalAmount; }
export interface DashboardData { totalCustomers; totalInvoices; paidInvoices; pendingInvoices; overdueInvoices; draftInvoices; revenueSummary:RevenueSummary; recentInvoices:InvoiceSummary[]; }

// Inputs
export interface LoginInput { email:string; password:string; }
export interface CreateCustomerInput { name; email; phone?; address?; }
export interface UpdateCustomerInput { name?; email?; phone?; address?; }
export interface CreateInvoiceItemInput { itemName; description?; quantityAmount; unitPrice; }
export interface CreateInvoiceInput { invoiceNumber?; customerId; dueDate:string; taxAmount?:number; discountAmount?:number; notes?; items:CreateInvoiceItemInput[]; }
export interface UpdateInvoiceInput { invoiceNumber?; customerId?; dueDate?:string; taxAmount?:number; discountAmount?:number; notes?:string; }
export interface UpdateInvoiceStatusInput { status:InvoiceStatus; paidDate?:string; }
export interface UpdateInvoiceItemInput { itemName?; description?; quantityAmount?; unitPrice?; }

// Query
export interface ListQuery { page?:number; limit?:number; search?:string; sortBy?:string; order?:"asc"|"desc"; startDate?:string; endDate?:string; }
export interface ListCustomerQuery extends ListQuery {}
export interface ListInvoiceQuery extends ListQuery { status?:InvoiceStatus; customerId?:string; }
export interface DashboardQuery { startDate?:string; endDate?:string; }
```

All money values are `number` in IDR major unit.

---

# Validation Schemas (Zod)

Synchronize with `api-planning.md` backend rules.

```ts
// schemas/auth.schema.ts
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// schemas/customer.schema.ts
export const CustomerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

// schemas/invoice.schema.ts
export const InvoiceItemSchema = z.object({
  itemName: z.string().min(1),
  description: z.string().optional(),
  quantityAmount: z.number().int().min(1),
  unitPrice: z.number().int().min(0),
});
export const InvoiceSchema = z.object({
  invoiceNumber: z.string().min(1).optional(),
  customerId: z.string().uuid(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  taxAmount: z.number().int().min(0).optional().default(0),
  discountAmount: z.number().int().min(0).optional().default(0),
  notes: z.string().optional(),
  items: z.array(InvoiceItemSchema).min(1),
});
export const UpdateInvoiceStatusSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("PAID"), paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }),
  z.object({ status: z.literal("OVERDUE"), paidDate: z.null() }),
  z.object({ status: z.enum(["DRAFT","PENDING"]) }),
]);
```

---

# Environment Configuration

`.env.example`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_APP_NAME=Mini ERP
```

For backend URL, the user can override at deployment time.

---

# Form UX Conventions

- All text inputs show inline helper/error text bound to field errors.
- Inputs use shadcn `Field`-style wrapper.
- Select pickup shadcn `Select` (or `Combobox` for async customer/status).
- Items editor uses a table-like layout with add/remove per row.
- Submit button disabled state + spinner during request.
- On error: non-field error toast + field-level messages.
- On success: brief success toast + navigation back.

---

# Responsive & Accessibility

- Tailwind responsive breakpoints (`sm`, `md`, `lg`) for sidebar (collapsible
  drawer on mobile) and table (card view on mobile).
- shadcn already provides keyboard/focus management for dialogs & selects.
- Color + text for `StatusBadge` (not color alone); DRAFT=gray, PENDING=blue,
  PAID=green, OVERDUE=red.

---

# Implementation Order (Suggested)

1. **Foundation**
   - `pnpm create next-app` w/ App Router + TS + Tailwind + ESLint.
   - Set up shadcn/ui, lucide-react.
   - `.env.example`, root layout, providers (`AuthProvider`, `ToastProvider`).
2. **API layer**
   - `lib/api.ts` wrapper + error handling.
   - `services/*.ts` stubs with typed functions.
3. **Types & schemas**
   - `types/index.ts`, `schemas/*.ts`.
4. **Layout & shared components**
   - Sidebar, Topbar, AppShell, StatusBadge, Currency, Pagination, SearchInput,
     SortHeader, ConfirmDialog, EmptyState, LoadingTable, PageHeader.
5. **Auth**
   - `contexts/AuthContext.tsx`, `AuthContextProvider`, `middleware.ts`,
     login Route Handler for setting httpOnly cookie, `/login` page.
6. **Dashboard** — Server Component + StatCard + recent table.
7. **Customers** — list (Server Component) + detail + form (create/edit) +
   ConfirmDialog for delete.
8. **Invoices** — list + detail + form with ItemsEditor + status dialog.
9. **History** — read-only paid invoices table.
10. **Polish**
    - Loading states / skeletons, Toaster, empty/loading states, responsive
      tweaks, error states, snackbars for delete confirm, testing with backend.
11. **Export Postman Collection** (parallel with backend).

---

# Notes

- Request and response field names stay **camelCase**. No snake_case leaks to
  the UI. Backend sanitizes `api-planning.md` envelope already.
- No Swagger UI in frontend; the API contract is the Postman Collection.
- Overdue computed on backend read time; UI just renders status color.
- For currency formatting always use `IDR` formatting helper; never scientific
  notation on large magnitudes.
