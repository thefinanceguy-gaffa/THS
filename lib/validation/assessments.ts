import { z } from "zod";

export const assessmentAreaSchema = z.object({
  area_name: z.string().min(1, "Enter an area name"),
  size_m2: z.number().min(0, "Size can't be negative"),
  surface: z.string().optional(),
  frequency: z.string().optional(),
  effort: z.string().optional(),
});

export const assessmentSchema = z.object({
  customer_id: z.string().optional(),
  lead_id: z.string().optional(),
  site_name: z.string().min(2, "Enter a site name"),
  suburb: z.string().optional(),
  assessor_id: z.string().optional(),
  scheduled_at: z.string().optional(),
  recommended_crew: z.string().optional(),
  service_window: z.string().optional(),
  est_monthly_usd: z.number().min(0).optional(),
  risks: z.string().optional(),
  areas: z.array(assessmentAreaSchema).min(1, "Add at least one area"),
});

export type AssessmentInput = z.infer<typeof assessmentSchema>;
export type AssessmentAreaInput = z.infer<typeof assessmentAreaSchema>;
