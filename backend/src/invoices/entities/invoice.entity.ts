export interface InvoiceEntity {
  id: string;
  invoiceNumber: string;
  status: string;
  dueDate: Date;
  paidDate: Date | null;
  subtotalAmount: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes: string | null;
  customerId: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}
