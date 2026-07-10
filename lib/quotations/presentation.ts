import type { QuoteStatus } from "@/lib/supabase/database.types";

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Draft",
  pending_review: "Pending Ops Mgr Review",
  pending_owner: "Pending Owner Approval",
  sent: "Sent",
  negotiation: "Negotiation",
  awaiting_client: "Awaiting Client",
  accepted: "Accepted",
  rejected: "Rejected",
  expired: "Expired",
};

export const QUOTE_STATUS_BADGE: Record<QuoteStatus, string> = {
  draft: "border-border bg-muted text-muted-foreground",
  pending_review: "border-purple-300 bg-purple-50 text-purple-800",
  pending_owner: "border-purple-300 bg-purple-50 text-purple-800",
  sent: "border-blue-300 bg-blue-50 text-blue-800",
  negotiation: "border-amber-300 bg-amber-50 text-amber-800",
  awaiting_client: "border-amber-300 bg-amber-50 text-amber-800",
  accepted: "border-emerald-300 bg-emerald-50 text-emerald-800",
  rejected: "border-red-300 bg-red-50 text-red-800",
  expired: "border-border bg-muted text-muted-foreground",
};

export const VAT_RATE = 0.15;
