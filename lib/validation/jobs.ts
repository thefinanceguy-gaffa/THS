import { z } from "zod";

export const jobPriorities = ["low", "normal", "high", "urgent"] as const;

export const jobSchema = z.object({
  customer_id: z.string().min(1, "Select a customer"),
  contract_id: z.string().optional(),
  site_address: z.string().min(2, "Enter a site address"),
  suburb: z.string().optional(),
  service_type: z.string().optional(),
  team_id: z.string().optional(),
  supervisor_id: z.string().optional(),
  priority: z.enum(jobPriorities),
  scheduled_start: z.string().min(1, "Set a start time"),
  scheduled_end: z.string().optional(),
});

export type JobInput = z.infer<typeof jobSchema>;
