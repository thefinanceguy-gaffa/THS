import { z } from "zod";

export const leadSources = [
  "whatsapp",
  "website",
  "facebook",
  "instagram",
  "linkedin",
  "google_business",
  "referral",
  "walk_in",
  "qr_code",
  "phone",
  "email",
  "google_form",
  "tender",
  "cold_call",
  "networking_event",
  "ai_prospecting",
] as const;

export const leadScores = ["hot", "warm", "cold"] as const;
export const bantStatuses = ["yes", "no", "unknown"] as const;
export const communicationChannels = ["call", "whatsapp", "email", "meeting", "social", "sms"] as const;

export const leadSchema = z.object({
  company_name: z.string().min(2, "Enter a company name"),
  contact_name: z.string().optional(),
  contact_role: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Enter a valid email address").optional().or(z.literal("")),
  industry: z.string().optional(),
  suburb: z.string().optional(),
  company_size: z.string().optional(),
  service_required: z.string().optional(),
  source: z.enum(leadSources),
  score: z.enum(leadScores),
  est_value_usd: z.number().min(0, "Estimated value can't be negative"),
  win_probability: z.number().min(0).max(100),
  owner_id: z.string().optional(),
  next_followup_at: z.string().optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;

export const communicationSchema = z.object({
  channel: z.enum(communicationChannels),
  direction: z.enum(["inbound", "outbound"]),
  title: z.string().optional(),
  note: z.string().optional(),
  client_response: z.string().optional(),
  next_followup_at: z.string().optional(),
});

export type CommunicationInput = z.infer<typeof communicationSchema>;
