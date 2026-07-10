import type { InvoiceStatus } from "@/lib/supabase/database.types";

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  part_paid: "Partially Paid",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

export const INVOICE_STATUS_BADGE: Record<InvoiceStatus, string> = {
  draft: "border-border bg-muted text-muted-foreground",
  sent: "border-blue-300 bg-blue-50 text-blue-800",
  part_paid: "border-amber-300 bg-amber-50 text-amber-800",
  paid: "border-emerald-300 bg-emerald-50 text-emerald-800",
  overdue: "border-red-300 bg-red-50 text-red-800",
  cancelled: "border-border bg-muted text-muted-foreground",
};
