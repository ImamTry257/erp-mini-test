import { z } from "zod";

export const InvoiceItemSchema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  description: z.string().optional().or(z.literal("")),
  quantityAmount: z.number().int().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().int().min(0, "Unit price cannot be negative"),
});

export type InvoiceItemFormData = z.infer<typeof InvoiceItemSchema>;

export const CreateInvoiceSchema = z.object({
  invoiceNumber: z.string().optional().or(z.literal("")),
  customerId: z.string().uuid("Select a customer"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  taxAmount: z.number().int().min(0).optional().default(0),
  discountAmount: z.number().int().min(0).optional().default(0),
  notes: z.string().optional().or(z.literal("")),
  items: z.array(InvoiceItemSchema).min(1, "At least one item is required"),
});

export type CreateInvoiceFormData = z.infer<typeof CreateInvoiceSchema>;

export const UpdateInvoiceStatusSchema = z.object({
  status: z.enum(["DRAFT", "PENDING", "PAID", "OVERDUE"]),
  paidDate: z.string().optional(),
});

export type UpdateInvoiceStatusFormData = z.infer<typeof UpdateInvoiceStatusSchema>;
