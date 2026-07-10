import { z } from "zod";

export const contractSchema = z.object({
  customer_id: z.string().min(1, "Select a customer"),
  service_type: z.string().min(2, "Enter a service type"),
  monthly_usd: z.number().min(0, "Monthly value can't be negative"),
  term_months: z.number().min(1, "Term must be at least 1 month"),
  starts_on: z.string().min(1, "Set a start date"),
  auto_renew: z.boolean(),
});
export type ContractInput = z.infer<typeof contractSchema>;

export const invoiceLineSchema = z.object({
  description: z.string().min(1, "Enter a description"),
  quantity: z.number().min(0.01),
  unit: z.string().optional(),
  rate_usd: z.number().min(0),
});

export const invoiceSchema = z.object({
  customer_id: z.string().min(1, "Select a customer"),
  contract_id: z.string().optional(),
  issued_on: z.string().optional(),
  due_on: z.string().optional(),
  lines: z.array(invoiceLineSchema).min(1, "Add at least one line item"),
});
export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type InvoiceLineInput = z.infer<typeof invoiceLineSchema>;

export const paymentMethods = ["EFT", "EcoCash", "Bank", "Cash"] as const;

export const paymentSchema = z.object({
  invoice_id: z.string().optional(),
  customer_id: z.string().min(1, "Select a customer"),
  amount_usd: z.number().min(0.01, "Amount must be positive"),
  method: z.enum(paymentMethods),
});
export type PaymentInput = z.infer<typeof paymentSchema>;

export const expenseCategories = ["Fuel", "Chemicals", "Payroll", "Rent", "Utilities", "Equipment", "Other"] as const;

export const expenseSchema = z.object({
  category: z.enum(expenseCategories),
  description: z.string().optional(),
  amount_usd: z.number().min(0.01, "Amount must be positive"),
  incurred_on: z.string().min(1, "Set a date"),
});
export type ExpenseInput = z.infer<typeof expenseSchema>;
