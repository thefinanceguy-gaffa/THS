import { z } from "zod";

export const campaignChannels = ["WhatsApp", "Facebook", "Google Ads", "Referral", "Flyers", "Email", "Other"] as const;
export const campaignStatuses = ["planned", "active", "paused", "completed"] as const;

export const campaignSchema = z.object({
  name: z.string().min(2, "Enter a campaign name"),
  channel: z.enum(campaignChannels),
  status: z.enum(campaignStatuses).optional(),
  budget_usd: z.number().min(0).optional(),
  starts_on: z.string().optional(),
  ends_on: z.string().optional(),
  notes: z.string().optional(),
});
export type CampaignInput = z.infer<typeof campaignSchema>;
