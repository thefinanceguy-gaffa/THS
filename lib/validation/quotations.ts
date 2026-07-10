import { z } from "zod";

export const quotationLineSchema = z.object({
  description: z.string().min(1, "Enter a description"),
  quantity: z.number().min(0.01, "Quantity must be positive"),
  unit: z.string().optional(),
  rate_usd: z.number().min(0, "Rate can't be negative"),
});

export const quotationSchema = z.object({
  customer_id: z.string().optional(),
  lead_id: z.string().optional(),
  service_summary: z.string().optional(),
  discount_percent: z.number().min(0).max(100),
  valid_until: z.string().optional(),
  lines: z.array(quotationLineSchema).min(1, "Add at least one line item"),
});

export type QuotationInput = z.infer<typeof quotationSchema>;
export type QuotationLineInput = z.infer<typeof quotationLineSchema>;
