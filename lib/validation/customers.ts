import { z } from "zod";

export const customerSegments = ["Enterprise", "Mid-market", "SME", "Multi-site"] as const;

export const customerSchema = z.object({
  company_name: z.string().min(2, "Enter a company name"),
  industry: z.string().optional(),
  suburb: z.string().optional(),
  address: z.string().optional(),
  segment: z.string().optional(),
  account_owner_id: z.string().optional(),
  monthly_value_usd: z.number().min(0, "Monthly value can't be negative"),
  status: z.enum(["active", "at_risk", "inactive"]),
});

export type CustomerInput = z.infer<typeof customerSchema>;

export const contactSchema = z.object({
  full_name: z.string().min(2, "Enter a name"),
  role_title: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Enter a valid email address").optional().or(z.literal("")),
  is_primary: z.boolean(),
});

export type ContactInput = z.infer<typeof contactSchema>;
