// ============================================================
// API Response Envelope
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  string: string;
  data: T;
  meta?: PaginationMeta | null;
}

export interface ApiErrorData {
  success: false;
  string: string;
  errors?: FieldError[];
  statusCode: number;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export type PaginatedResponse<T> = ApiResponse<T[]> & { meta: PaginationMeta };

// ============================================================
// Enums
// ============================================================

export type Role = "ADMIN" | "USER";
export type InvoiceStatus = "DRAFT" | "PENDING" | "PAID" | "OVERDUE";

// ============================================================
// Auth
// ============================================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

// ============================================================
// Customers
// ============================================================

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateCustomerInput {
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

export interface UpdateCustomerInput {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
}

// ============================================================
// Invoices
// ============================================================

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  itemName: string;
  description?: string;
  quantityAmount: number;
  unitPrice: number;
  lineTotal: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  dueDate?: string;
  paidDate?: string;
  subtotalAmount: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  customerId: string;
  customerName: string;
  createdById: string;
}

export interface InvoiceDetail extends InvoiceSummary {
  customer: Customer;
  items: InvoiceItem[];
}

export interface CreateInvoiceItemInput {
  itemName: string;
  description?: string;
  quantityAmount: number;
  unitPrice: number;
}

export interface CreateInvoiceInput {
  invoiceNumber?: string;
  customerId: string;
  dueDate: string;
  taxAmount?: number;
  discountAmount?: number;
  notes?: string;
  items: CreateInvoiceItemInput[];
}

export interface UpdateInvoiceInput {
  invoiceNumber?: string;
  customerId?: string;
  dueDate?: string;
  taxAmount?: number;
  discountAmount?: number;
  notes?: string;
}

export interface UpdateInvoiceStatusInput {
  status: InvoiceStatus;
  paidDate?: string;
}

export interface UpdateInvoiceItemInput {
  itemName?: string;
  description?: string;
  quantityAmount?: number;
  unitPrice?: number;
}

// ============================================================
// Dashboard
// ============================================================

export interface RevenueSummary {
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  totalAmount: number;
}

export interface DashboardData {
  totalCustomers: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  draftInvoices: number;
  revenueSummary: RevenueSummary;
  recentInvoices: InvoiceSummary[];
}

// ============================================================
// Query Params
// ============================================================

export interface ListQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  order?: "asc" | "desc";
  startDate?: string;
  endDate?: string;
}

export interface ListCustomerQuery extends ListQuery {}

export interface ListInvoiceQuery extends ListQuery {
  status?: InvoiceStatus;
  customerId?: string;
}

export interface DashboardQuery {
  startDate?: string;
  endDate?: string;
}
