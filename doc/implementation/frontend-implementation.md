# Mini ERP Invoicing System

## Frontend Implementation Plan

---

# Overview

This document is the technical implementation guide for the Mini ERP
Invoicing System **frontend**. It covers the concrete technology choices,
project scaffolding, Next.js configuration, middleware, API client, auth flow,
route handlers, service layer, component implementations, form patterns, and
the step-by-step file implementation order.

Source of truth for feature scope: `../planning/project-planning.md`
Source of truth for API contract: `../planning/api-planning.md`
Source of truth for frontend design: `../planning/frontend-planning.md`

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
| HTTP client        | Typed `fetch` wrapper (`lib/api.ts`)  |
| Package manager    | pnpm                                  |

No Tanstack Query, no SWR, no Zustand, no Ant Design.

---

# Project Structure

```
frontend/
├── app/
│   ├── layout.tsx                       # Root layout (providers, <html>)
│   ├── page.tsx                         # Redirect to /dashboard
│   ├── loading.tsx                      # Global loading skeleton
│   ├── login/
│   │   └── page.tsx                     # Client component login form
│   ├── (protected)/                     # Route group with AppShell
│   │   ├── layout.tsx                   # Sidebar + Topbar wrapper
│   │   ├── dashboard/
│   │   │   ├── page.tsx                 # Server Component
│   │   │   └── loading.tsx              # Skeleton
│   │   ├── customers/
│   │   │   ├── page.tsx                 # List (Server Component)
│   │   │   ├── loading.tsx              # Skeleton
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx             # Detail (Server Component)
│   │   │   └── new/
│   │   │       └── page.tsx             # Create form (Client Component)
│   │   ├── invoices/
│   │   │   ├── page.tsx                 # List (Server Component)
│   │   │   ├── loading.tsx              # Skeleton
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx             # Detail (Server Component)
│   │   │   │   └── edit/
│   │   │   │       └── page.tsx         # Edit form (Client Component)
│   │   │   └── new/
│   │   │       └── page.tsx             # Create form (Client Component)
│   │   └── history/
│   │       ├── page.tsx                 # Read-only paid invoices
│   │       └── loading.tsx              # Skeleton
│   └── api/                             # Route Handlers (internal)
│       └── internal/
│           ├── set-token/
│           │   └── route.ts             # Set httpOnly cookie
│           └── clear-token/
│               └── route.ts             # Clear cookie on logout
├── components/
│   ├── ui/                              # shadcn/ui generated
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   ├── dialog.tsx
│   │   ├── alert-dialog.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   ├── skeleton.tsx
│   │   ├── separator.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── popover.tsx
│   │   ├── calendar.tsx
│   │   ├── form.tsx                     # React Hook Form bridge
│   │   └── toast.tsx
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── topbar.tsx
│   │   └── app-shell.tsx
│   ├── shared/
│   │   ├── status-badge.tsx
│   │   ├── currency.tsx
│   │   ├── date-text.tsx
│   │   ├── confirm-dialog.tsx
│   │   ├── pagination.tsx
│   │   ├── search-input.tsx
│   │   ├── sort-header.tsx
│   │   ├── page-header.tsx
│   │   ├── stat-card.tsx
│   │   ├── empty-state.tsx
│   │   └── loading-table.tsx
│   ├── customers/
│   │   ├── customer-form.tsx
│   │   └── customer-table.tsx
│   └── invoices/
│       ├── invoice-form.tsx
│       ├── invoice-table.tsx
│       ├── invoice-items-editor.tsx
│       └── status-change-dialog.tsx
├── hooks/
│   ├── use-debounce.ts
│   └── use-toast.ts
├── contexts/
│   ├── auth-context.tsx
│   └── toast-context.tsx
├── services/
│   ├── auth.service.ts
│   ├── customers.service.ts
│   ├── invoices.service.ts
│   └── dashboard.service.ts
├── lib/
│   ├── api.ts
│   └── utils.ts
├── types/
│   └── index.ts
├── schemas/
│   ├── auth.schema.ts
│   ├── customer.schema.ts
│   └── invoice.schema.ts
├── middleware.ts
├── .env.example
├── .env.local
├── tailwind.config.ts
├── next.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

# Environment

`.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_APP_NAME=Mini ERP
```

`NEXT_PUBLIC_API_BASE_URL` points to the backend NestJS API. During
development, Next.js runs on port 3001 and the backend on port 3000.

---

# Next.js Configuration

`next.config.ts`:

```ts
const nextConfig = {
  images: { remotePatterns: [] },
  experimental: {},
};
export default nextConfig;
```

Tailwind is configured via `tailwind.config.ts` with shadcn/ui compatible
preset and the `cn()` utility from `lib/utils.ts` (clsx + tailwind-merge).

---

# Middleware (`middleware.ts`)

Runs on every request. Protects routes under `(protected)/` group.

```ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedPaths = ['/dashboard', '/customers', '/invoices', '/history'];

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;

  const isProtected = protectedPaths.some((p) => request.nextUrl.pathname.startsWith(p));

  if (isProtected && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (request.nextUrl.pathname === '/login' && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = { matcher: ['/dashboard/:path*', '/customers/:path*', '/invoices/:path*', '/history/:path*', '/login'] };
```

Key points:
- Token stored in **httpOnly cookie** (not localStorage) for security.
- Unauthenticated users hitting protected routes get redirected to `/login`.
- Authenticated users hitting `/login` get redirected to `/dashboard`.

---

# API Client (`lib/api.ts`)

Single source of truth for all HTTP calls.

```ts
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export class ApiError extends Error {
  statusCode: number;
  errors?: { field: string; message: string }[];
  constructor(statusCode: number, message: string, errors?: { field: string; message: string }[]) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export async function api<T>(
  path: string,
  options: RequestInit & { params?: Record<string, unknown> } = {}
): Promise<T> {
  const { params, ...fetchOptions } = fetchOptions;

  let url = `${BASE_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') searchParams.set(k, String(v));
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((fetchOptions.headers as Record<string, string>) || {}),
  };

  const res = await fetch(url, { credentials: 'include', headers, ...fetchOptions });
  const json = await res.json();

  if (!res.ok || json.success === false) {
    throw new ApiError(
      json.statusCode ?? res.status,
      json.string ?? json.message ?? 'Request failed',
      json.errors
    );
  }

  return (json.data ?? json) as T;
}
```

Key points:
- Always sends `credentials: 'include'` so httpOnly cookie travels with request.
- Parses error envelope and throws `ApiError` with `.statusCode`, `.message`,
  `.errors[]`.
- Returns typed `data` payload only (unwrapped from envelope).

---

# Route Handlers (Internal)

These handle cookie management between the client and server. The frontend
calls these; they forward to the backend API and set/clear the httpOnly cookie.

## `app/api/internal/set-token/route.ts`

Called after successful login. Receives the accessToken, stores it as an
httpOnly cookie, and returns the user object.

```ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { accessToken, user } = await request.json();

  const res = NextResponse.json({ success: true, data: { user } });
  res.cookies.set('auth_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 1 day
  });

  return res;
}
```

## `app/api/internal/clear-token/route.ts`

Called on logout. Clears the cookie.

```ts
import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set('auth_token', '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
```

---

# Auth Flow

## Login Sequence

1. User fills `email` + `password` on `/login` page (Client Component).
2. Client calls `services/auth.service.login({ email, password })`.
3. `auth.service` calls `api<LoginResponse>('/auth/login', { method: 'POST', body })`.
4. On success, the response contains `{ accessToken, user }`.
5. Client calls `POST /api/internal/set-token` with `{ accessToken, user }`.
   This sets the httpOnly cookie.
6. Client calls `AuthContext.dispatch({ type: 'LOGIN', payload: { user } })`.
7. Client navigates to `/dashboard`.

## Logout Sequence

1. User clicks logout in Topbar.
2. Client calls `POST /api/internal/clear-token`. This clears the cookie.
3. Client calls `AuthContext.dispatch({ type: 'LOGOUT' })`.
4. Client navigates to `/login`.

## Session Bootstrap

`AuthProvider` (wraps root layout) reads from `localStorage` on mount:
- If `user` exists in localStorage, set status to `authenticated`.
- If not, set status to `unauthenticated`.
- Optionally verify with `GET /auth/me` if token exists (nice-to-have).

> For the assessment scope, localStorage is used for client-side user state.
> The httpOnly cookie is used by middleware to protect routes.

---

# State Management

## AuthContext (`contexts/auth-context.tsx`)

```ts
type AuthState = {
  user: User | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
};

type AuthAction =
  | { type: 'HYDRATE'; payload: { user: User } }
  | { type: 'LOGIN'; payload: { user: User } }
  | { type: 'LOGOUT' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'HYDRATE': return { ...state, user: action.payload.user, status: 'authenticated' };
    case 'LOGIN':   return { ...state, user: action.payload.user, status: 'authenticated' };
    case 'LOGOUT':  return { ...state, user: null, status: 'unauthenticated' };
    default:        return state;
  }
}
```

Exposes via `useAuth()` hook:
- `user` — current user object or `null`
- `status` — `loading | authenticated | unauthenticated`
- `login(user)` — dispatch LOGIN, persist to localStorage
- `logout()` — dispatch LOGOUT, clear localStorage, call `/api/internal/clear-token`

## ToastContext (`contexts/toast-context.tsx`)

Simple queue-based toast:

```ts
type ToastState = { toasts: Toast[] };
type ToastAction = { type: 'ADD'; payload: Toast } | { type: 'DISMISS'; payload: string };
```

Exposes via `useToast()` hook:
- `toast({ title, description, variant })` — adds to queue
- `dismiss(id)` — removes from queue

Renders `<Toaster />` component from shadcn in root layout.

---

# Service Layer (`services/*.ts`)

Each service module wraps typed API calls. Example:

```ts
// services/auth.service.ts
import { api } from '@/lib/api';
import type { LoginInput, LoginResponse, User } from '@/types';

export const authService = {
  login: (data: LoginInput) => api<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => api<{ user: User }>('/auth/me'),
};

// services/customers.service.ts
import { api } from '@/lib/api';
import type { Customer, CreateCustomerInput, UpdateCustomerInput, ListCustomerQuery, PaginatedResponse } from '@/types';

export const customersService = {
  list: (q: ListCustomerQuery) => api<PaginatedResponse<Customer>>('/customers', { params: q }),
  get: (id: string) => api<Customer>(`/customers/${id}`),
  create: (data: CreateCustomerInput) => api<Customer>('/customers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: UpdateCustomerInput) => api<Customer>(`/customers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => api<{ id: string; deletedAt: string }>(`/customers/${id}`, { method: 'DELETE' }),
};

// services/invoices.service.ts
export const invoicesService = {
  list: (q: ListInvoiceQuery) => api<PaginatedResponse<InvoiceSummary>>('/invoices', { params: q }),
  get: (id: string) => api<InvoiceDetail>(`/invoices/${id}`),
  create: (data: CreateInvoiceInput) => api<InvoiceDetail>('/invoices', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: UpdateInvoiceInput) => api<InvoiceDetail>(`/invoices/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateStatus: (id: string, data: UpdateInvoiceStatusInput) => api<InvoiceDetail>(`/invoices/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => api<{ id: string; deletedAt: string }>(`/invoices/${id}`, { method: 'DELETE' }),
  addItem: (invoiceId: string, data: CreateInvoiceItemInput) => api<InvoiceItem>(`/invoices/${invoiceId}/items`, { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (invoiceId: string, itemId: string, data: UpdateInvoiceItemInput) => api<InvoiceItem>(`/invoices/${invoiceId}/items/${itemId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  removeItem: (invoiceId: string, itemId: string) => api<{ id: string }>(`/invoices/${invoiceId}/items/${itemId}`, { method: 'DELETE' }),
};

// services/dashboard.service.ts
export const dashboardService = {
  getSummary: (q?: DashboardQuery) => api<DashboardData>('/dashboard', { params: q }),
};
```

All input/response types match `types/index.ts` which mirrors `api-planning.md`.

---

# Shared Component Specs

## StatusBadge (`components/shared/status-badge.tsx`)

- Input: `status: InvoiceStatus`
- Renders colored badge:
  - `DRAFT` → gray
  - `PENDING` → blue
  - `PAID` → green
  - `OVERDUE` → red
- Uses shadcn `Badge` + Tailwind classes.

## Currency (`components/shared/currency.tsx`)

- Input: `amount: number`
- Renders formatted IDR string: `IDR 1.110.000`
- Uses `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })`.

## DateText (`components/shared/date-text.tsx`)

- Input: `date: string | Date`
- Renders human-readable: `29 Jun 2026`
- Uses `Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })`.

## ConfirmDialog (`components/shared/confirm-dialog.tsx`)

- Input: `title`, `description`, `onConfirm`, `trigger` (ReactNode)
- Uses shadcn `AlertDialog`.
- Shows destructive action confirmation.
- Returns promise from `onConfirm` to handle async deletion.

## Pagination (`components/shared/pagination.tsx`)

- Input: `meta: PaginationMeta`
- Uses `useRouter` + `useSearchParams` to navigate pages.
- Renders: Previous | page numbers | Next.
- Disables buttons at boundaries.

## SearchInput (`components/shared/search-input.tsx`)

- Input: `placeholder`, `defaultValue`
- Uses `useDebounce` hook (300ms).
- On debounced change, pushes `search` param to URL.

## SortHeader (`components/shared/sort-header.tsx`)

- Input: `column: string`, `label: string`, `currentSortBy`, `currentOrder`
- Toggles `sortBy` and `order` in URL params.
- Shows arrow indicator for current sort.

## StatCard (`components/shared/stat-card.tsx`)

- Input: `title`, `value`, `icon?`, `trend?`
- Renders a Card with metric display.
- Used on Dashboard for summary tiles.

## EmptyState (`components/shared/empty-state.tsx`)

- Input: `title`, `description`, `actionLabel?`, `onAction?`
- Shows centered placeholder when list is empty.

## LoadingTable (`components/shared/loading-table.tsx`)

- Input: `columns: number`, `rows?: number`
- Renders skeleton rows matching table layout.

---

# Form Patterns

## React Hook Form + Zod Pattern

Every form follows this pattern:

```tsx
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CustomerSchema } from '@/schemas/customer.schema';
import type { CreateCustomerInput } from '@/types';

export function CustomerForm({ onSubmit, defaultValues, isLoading }) {
  const form = useForm<CreateCustomerInput>({
    resolver: zodResolver(CustomerSchema),
    defaultValues,
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await onSubmit(data);
    } catch (error) {
      if (error instanceof ApiError && error.errors) {
        error.errors.forEach(({ field, message }) => {
          form.setError(field as keyof CreateCustomerInput, { message });
        });
      }
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* shadcn FormField components */}
        <Button type="submit" disabled={isLoading}>Save</Button>
      </form>
    </Form>
  );
}
```

## Zod Schemas (`schemas/*.ts`)

Synchronized with `api-planning.md` validation rules:

```ts
// schemas/auth.schema.ts
import { z } from 'zod';
export const LoginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// schemas/customer.schema.ts
export const CustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email'),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
});

// schemas/invoice.schema.ts
export const InvoiceItemSchema = z.object({
  itemName: z.string().min(1, 'Item name is required'),
  description: z.string().optional().or(z.literal('')),
  quantityAmount: z.number().int().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().int().min(0, 'Unit price cannot be negative'),
});

export const CreateInvoiceSchema = z.object({
  invoiceNumber: z.string().optional().or(z.literal('')),
  customerId: z.string().uuid('Select a customer'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  taxAmount: z.number().int().min(0).optional().default(0),
  discountAmount: z.number().int().min(0).optional().default(0),
  notes: z.string().optional().or(z.literal('')),
  items: z.array(InvoiceItemSchema).min(1, 'At least one item is required'),
});

export const UpdateInvoiceStatusSchema = z.object({
  status: z.enum(['DRAFT', 'PENDING', 'PAID', 'OVERDUE']),
  paidDate: z.string().optional(),
});
```

---

# Server Component Patterns

## List Page Pattern (e.g. `/customers/page.tsx`)

```tsx
import { customersService } from '@/services/customers.service';
import { CustomerTable } from '@/components/customers/customer-table';
import { Pagination } from '@/components/shared/pagination';
import { SearchInput } from '@/components/shared/search-input';
import { PageHeader } from '@/components/shared/page-header';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function CustomerListPage({ searchParams }) {
  const { page = 1, limit = 10, search = '', sortBy = 'createdAt', order = 'desc' } = searchParams;

  const result = await customersService.list({ page: Number(page), limit: Number(limit), search, sortBy, order });

  return (
    <div>
      <PageHeader title="Customers">
        <Link href="/customers/new"><Button>Add Customer</Button></Link>
      </PageHeader>
      <SearchInput placeholder="Search customers..." defaultValue={search} />
      <CustomerTable data={result.data} />
      <Pagination meta={result.meta} />
    </div>
  );
}
```

## Detail Page Pattern (e.g. `/customers/[id]/page.tsx`)

```tsx
import { customersService } from '@/services/customers.service';
import { notFound } from 'next/navigation';

export default async function CustomerDetailPage({ params }) {
  const customer = await customersService.get(params.id).catch(() => null);
  if (!customer) notFound();

  return (
    <div>
      <PageHeader title={customer.name} />
      {/* render customer fields */}
    </div>
  );
}
```

---

# Types (`types/index.ts`)

All types mirror `api-planning.md` response/request shapes exactly:

```ts
export interface ApiResponse<T> { success: boolean; string: string; data: T; meta?: PaginationMeta | null; }
export interface ApiErrorData { success: false; string: string; errors?: FieldError[]; statusCode: number; }
export interface FieldError { field: string; message: string; }
export interface PaginationMeta { page: number; limit: number; totalItems: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean; }

export type PaginatedResponse<T> = ApiResponse<T[]> & { meta: PaginationMeta };

export type Role = 'ADMIN' | 'USER';
export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE';

export interface User { id: string; email: string; name: string; role: Role; createdAt: string; updatedAt: string; }
export interface LoginInput { email: string; password: string; }
export interface LoginResponse { accessToken: string; user: User; }

export interface Customer { id: string; name: string; email: string; phone?: string; address?: string; createdAt: string; updatedAt: string; deletedAt?: string; }
export interface CreateCustomerInput { name: string; email: string; phone?: string; address?: string; }
export interface UpdateCustomerInput { name?: string; email?: string; phone?: string; address?: string; }

export interface InvoiceItem { id: string; invoiceId: string; itemName: string; description?: string; quantityAmount: number; unitPrice: number; lineTotal: number; createdAt: string; updatedAt: string; deletedAt?: string; }
export interface InvoiceSummary { id: string; invoiceNumber: string; status: InvoiceStatus; dueDate?: string; paidDate?: string; subtotalAmount: number; taxAmount: number; discountAmount: number; totalAmount: number; notes?: string; createdAt: string; updatedAt: string; customerId: string; customerName: string; createdById: string; }
export interface InvoiceDetail extends InvoiceSummary { customer: Customer; items: InvoiceItem[]; }

export interface CreateInvoiceItemInput { itemName: string; description?: string; quantityAmount: number; unitPrice: number; }
export interface CreateInvoiceInput { invoiceNumber?: string; customerId: string; dueDate: string; taxAmount?: number; discountAmount?: number; notes?: string; items: CreateInvoiceItemInput[]; }
export interface UpdateInvoiceInput { invoiceNumber?: string; customerId?: string; dueDate?: string; taxAmount?: number; discountAmount?: number; notes?: string; }
export interface UpdateInvoiceStatusInput { status: InvoiceStatus; paidDate?: string; }
export interface UpdateInvoiceItemInput { itemName?: string; description?: string; quantityAmount?: number; unitPrice?: number; }

export interface RevenueSummary { paidAmount: number; pendingAmount: number; overdueAmount: number; totalAmount: number; }
export interface DashboardData { totalCustomers: number; totalInvoices: number; paidInvoices: number; pendingInvoices: number; overdueInvoices: number; draftInvoices: number; revenueSummary: RevenueSummary; recentInvoices: InvoiceSummary[]; }

export interface ListQuery { page?: number; limit?: number; search?: string; sortBy?: string; order?: 'asc' | 'desc'; startDate?: string; endDate?: string; }
export interface ListCustomerQuery extends ListQuery {}
export interface ListInvoiceQuery extends ListQuery { status?: InvoiceStatus; customerId?: string; }
export interface DashboardQuery { startDate?: string; endDate?: string; }
```

---

# Layout Architecture

## Root Layout (`app/layout.tsx`)

Wraps the entire app with providers:

```tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ToastProvider>
            {children}
            <Toaster />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

## Protected Layout (`app/(protected)/layout.tsx`)

Wraps all authenticated pages with the app shell:

```tsx
import { AppShell } from '@/components/layout/app-shell';

export default function ProtectedLayout({ children }) {
  return <AppShell>{children}</AppShell>;
}
```

`AppShell` renders Sidebar + Topbar + main content area.

---

# shadcn/ui Setup

Install and configure:

```bash
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button input label select table dialog alert-dialog badge card skeleton separator dropdown-menu popover calendar form sonner
```

Configure `components.json` paths to match project structure:
- `components`: `@/components/ui`
- `utils`: `@/lib/utils`

---

# Implementation Order

## Phase 1: Foundation
1. `pnpm create next-app@latest frontend --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"`
2. Install: `pnpm add react-hook-form zod @hookform/resolvers lucide-react`
3. Initialize shadcn/ui
4. `.env.local`, `next.config.ts`
5. `lib/api.ts`, `lib/utils.ts`
6. `types/index.ts`
7. `schemas/*.ts`
8. `contexts/auth-context.tsx`, `contexts/toast-context.tsx`
9. Root layout with providers

## Phase 2: Layout & Shared Components
10. `components/layout/sidebar.tsx`
11. `components/layout/topbar.tsx`
12. `components/layout/app-shell.tsx`
13. `components/shared/status-badge.tsx`
14. `components/shared/currency.tsx`
15. `components/shared/date-text.tsx`
16. `components/shared/confirm-dialog.tsx`
17. `components/shared/pagination.tsx`
18. `components/shared/search-input.tsx`
19. `components/shared/sort-header.tsx`
20. `components/shared/page-header.tsx`
21. `components/shared/stat-card.tsx`
22. `components/shared/empty-state.tsx`
23. `components/shared/loading-table.tsx`
24. `hooks/use-debounce.ts`, `hooks/use-toast.ts`

## Phase 3: Auth
25. `middleware.ts`
26. `app/api/internal/set-token/route.ts`
27. `app/api/internal/clear-token/route.ts`
28. `services/auth.service.ts`
29. `app/login/page.tsx`

## Phase 4: Dashboard
30. `services/dashboard.service.ts`
31. `app/(protected)/dashboard/page.tsx`
32. `app/(protected)/dashboard/loading.tsx`

## Phase 5: Customers
33. `services/customers.service.ts`
34. `components/customers/customer-form.tsx`
35. `components/customers/customer-table.tsx`
36. `app/(protected)/customers/page.tsx`
37. `app/(protected)/customers/loading.tsx`
38. `app/(protected)/customers/[id]/page.tsx`
39. `app/(protected)/customers/new/page.tsx`

## Phase 6: Invoices
40. `services/invoices.service.ts`
41. `components/invoices/invoice-items-editor.tsx`
42. `components/invoices/invoice-form.tsx`
43. `components/invoices/invoice-table.tsx`
44. `components/invoices/status-change-dialog.tsx`
45. `app/(protected)/invoices/page.tsx`
46. `app/(protected)/invoices/loading.tsx`
47. `app/(protected)/invoices/[id]/page.tsx`
48. `app/(protected)/invoices/[id]/edit/page.tsx`
49. `app/(protected)/invoices/new/page.tsx`

## Phase 7: History
50. `app/(protected)/history/page.tsx`
51. `app/(protected)/history/loading.tsx`

## Phase 8: Polish & Export
52. Responsive testing (mobile sidebar drawer)
53. Loading states, empty states, error states
54. Toaster integration
55. Postman Collection export
56. `.env.example` finalization
57. `README.md`

---

# Verification

- `pnpm dev` starts frontend on `:3001`.
- `/login` renders form; submit calls backend; sets cookie; redirects to `/dashboard`.
- `/dashboard` shows summary cards and recent invoices.
- `/customers` shows paginated list with search and sort.
- `/customers/new` validates form, creates customer, redirects to list.
- `/customers/:id` shows detail, delete with confirm dialog.
- `/invoices` shows filtered list with status badges.
- `/invoices/new` shows form with items editor, creates invoice.
- `/invoices/:id` shows detail with status change dialog.
- `/history` shows paid invoices.
- Middleware redirects unauthenticated users to `/login`.
- Logout clears cookie and redirects.
- All field names are camelCase (no snake_case leaks).
- IDR currency formatting is correct.
