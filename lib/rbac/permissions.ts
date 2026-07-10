import type { UserRole } from "@/lib/supabase/database.types";

/**
 * UX-level permission matrix mirroring RBAC_MATRIX.md's tables exactly
 * (role × permission → allowed / needs_approval / denied). This is NOT the
 * security boundary — every table's RLS policy is (see
 * supabase/migrations/*.sql); this only drives what the UI shows/hides so a
 * user isn't offered a button that RLS will then reject. "needs_approval"
 * permissions are still shown, but the action routes through the
 * `approvals` table instead of writing directly — see
 * app/actions/*.ts for which ones actually implement that path yet.
 */
export type PermissionGrant = "allowed" | "needs_approval" | "denied";

export type PermissionKey =
  // CRM & Sales
  | "leads.manage"
  | "quotations.create"
  | "discounts.approve"
  | "pipeline.view"
  | "customers.delete"
  // Operations
  | "jobs.assign"
  | "jobs.capture"
  | "jobs.close"
  | "jobs.edit"
  // Finance
  | "invoices.manage"
  | "finance.view_confidential"
  | "financial_records.delete"
  | "quotations.edit_after_approval"
  // People & Supply
  | "hr.manage"
  | "po.raise"
  | "suppliers.manage"
  | "inventory.adjust"
  // System
  | "users.manage"
  | "audit.view"
  | "records.purge"
  | "workflows.configure";

type Matrix = Record<PermissionKey, Partial<Record<UserRole, PermissionGrant>>>;

const ALWAYS_DENIED: PermissionGrant = "denied";

// RBAC_MATRIX.md, transcribed table by table. Any role not listed for a key
// defaults to "denied" (see grantFor below) — 'client' is never listed here
// since the client portal is scoped entirely by RLS on customer_id instead.
const MATRIX: Matrix = {
  "leads.manage": { owner: "allowed", admin: "allowed", bus_dev: "allowed", ops_manager: "allowed" },
  "quotations.create": { owner: "allowed", admin: "allowed", bus_dev: "allowed", ops_manager: "allowed" },
  "discounts.approve": { owner: "allowed", admin: "needs_approval" },
  "pipeline.view": { owner: "allowed", admin: "allowed", bus_dev: "allowed", ops_manager: "allowed" },
  "customers.delete": { owner: "allowed" },

  "jobs.assign": { owner: "allowed", admin: "allowed", ops_manager: "allowed" },
  "jobs.capture": { owner: "allowed", ops_manager: "allowed", supervisor: "allowed", cleaner: "allowed" },
  "jobs.close": { owner: "allowed", admin: "allowed", ops_manager: "allowed", supervisor: "allowed" },
  "jobs.edit": { owner: "allowed", admin: "allowed", ops_manager: "allowed" },

  "invoices.manage": { owner: "allowed", finance: "allowed" },
  "finance.view_confidential": { owner: "allowed", finance: "allowed" },
  "financial_records.delete": { owner: "allowed" },
  "quotations.edit_after_approval": { owner: "allowed" },

  "hr.manage": { owner: "allowed", hr: "allowed" },
  "po.raise": { owner: "allowed", admin: "allowed", procurement: "allowed" },
  "suppliers.manage": { owner: "allowed", finance: "needs_approval", procurement: "allowed" },
  "inventory.adjust": { owner: "allowed", admin: "allowed", ops_manager: "needs_approval", supervisor: "needs_approval", procurement: "allowed" },

  "users.manage": { owner: "allowed" },
  "audit.view": { owner: "allowed", admin: "allowed" },
  "records.purge": { owner: "allowed" },
  "workflows.configure": { owner: "allowed" },
};

export function grantFor(role: UserRole | null | undefined, key: PermissionKey): PermissionGrant {
  if (!role) return ALWAYS_DENIED;
  return MATRIX[key]?.[role] ?? ALWAYS_DENIED;
}

/** Approval-threshold table (RBAC_MATRIX.md "Approval workflows"). */
export const APPROVAL_THRESHOLDS = {
  quotationOpsManagerUsd: 1000, // > this needs Ops Manager sign-off
  quotationOwnerUsd: 5000, // > this needs Owner sign-off
  discountOwnerPercent: 15, // > this needs Owner sign-off
} as const;
