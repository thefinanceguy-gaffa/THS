import type { JobStatus } from "@/lib/supabase/database.types";

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  scheduled: "Scheduled",
  en_route: "En route",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const JOB_BOARD_COLUMNS: JobStatus[] = ["scheduled", "en_route", "in_progress", "completed"];

export const JOB_STATUS_BADGE: Record<JobStatus, string> = {
  scheduled: "border-blue-300 bg-blue-50 text-blue-800",
  en_route: "border-amber-300 bg-amber-50 text-amber-800",
  in_progress: "border-purple-300 bg-purple-50 text-purple-800",
  completed: "border-emerald-300 bg-emerald-50 text-emerald-800",
  cancelled: "border-border bg-muted text-muted-foreground",
};

export const PRIORITY_BADGE: Record<string, string> = {
  low: "border-border bg-muted text-muted-foreground",
  normal: "border-blue-300 bg-blue-50 text-blue-800",
  high: "border-amber-300 bg-amber-50 text-amber-800",
  urgent: "border-red-300 bg-red-50 text-red-800",
};
