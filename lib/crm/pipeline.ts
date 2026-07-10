import type { LeadStage } from "@/lib/supabase/database.types";

/** Active pipeline order (README.md's 7-column kanban) — Won/Lost/Onboarding/Active/Repeat are lifecycle states past the sales funnel. */
export const PIPELINE_STAGE_ORDER: LeadStage[] = ["new", "contacted", "qualified", "site_visit", "quotation", "negotiation", "won"];

export const ALL_STAGES: LeadStage[] = [...PIPELINE_STAGE_ORDER, "lost", "onboarding", "active", "repeat"];

export const STAGE_LABELS: Record<LeadStage, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  site_visit: "Site Visit",
  quotation: "Quotation",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
  onboarding: "Onboarding",
  active: "Active Client",
  repeat: "Repeat Business",
};

export const STAGE_DOT_COLORS: Record<LeadStage, string> = {
  new: "bg-slate-400",
  contacted: "bg-blue-400",
  qualified: "bg-indigo-500",
  site_visit: "bg-purple-500",
  quotation: "bg-amber-500",
  negotiation: "bg-orange-500",
  won: "bg-emerald-500",
  lost: "bg-red-400",
  onboarding: "bg-teal-500",
  active: "bg-emerald-600",
  repeat: "bg-emerald-700",
};

export type FollowUpUrgency = "overdue" | "today" | "soon" | "ok" | "none";

/** DESIGN_TOKENS.md: overdue=danger, today=warning, soon=blue, ok=success. */
export function followUpUrgency(nextFollowupAt: string | null): FollowUpUrgency {
  if (!nextFollowupAt) return "none";
  const due = new Date(nextFollowupAt);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.round((startOfDue.getTime() - startOfToday.getTime()) / 86_400_000);

  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "today";
  if (diffDays <= 3) return "soon";
  return "ok";
}

export const FOLLOW_UP_BADGE_CLASSES: Record<FollowUpUrgency, string> = {
  overdue: "border-red-300 bg-red-50 text-red-800",
  today: "border-amber-300 bg-amber-50 text-amber-800",
  soon: "border-blue-300 bg-blue-50 text-blue-800",
  ok: "border-emerald-300 bg-emerald-50 text-emerald-800",
  none: "border-border bg-muted text-muted-foreground",
};
