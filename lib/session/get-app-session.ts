import "server-only";
import { createClient } from "@/lib/supabase/server";
import { grantFor, type PermissionKey } from "@/lib/rbac/permissions";
import type { AppSession } from "@/types/session";

const ALL_PERMISSION_KEYS: PermissionKey[] = [
  "leads.manage",
  "quotations.create",
  "discounts.approve",
  "pipeline.view",
  "customers.delete",
  "jobs.assign",
  "jobs.capture",
  "jobs.close",
  "jobs.edit",
  "invoices.manage",
  "finance.view_confidential",
  "financial_records.delete",
  "quotations.edit_after_approval",
  "hr.manage",
  "po.raise",
  "suppliers.manage",
  "inventory.adjust",
  "users.manage",
  "audit.view",
  "records.purge",
  "workflows.configure",
];

/**
 * The single place that resolves "who is this request, and what can they
 * see" — auth user, profile (with its fixed role), branch, and the
 * effective permission grant per key (role default from RBAC_MATRIX.md,
 * overridden per-user where `permission_overrides` has a row). RLS is
 * still the real security boundary (this can't leak data across roles even
 * if a bug slips through here) — this just saves every page from
 * re-deriving the same joins and override lookups.
 */
export async function getAppSession(): Promise<AppSession | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, { data: overrideRows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("permission_overrides").select("permission_key, allowed").eq("profile_id", user.id),
  ]);

  if (!profile) return null;

  const overrides = new Map((overrideRows ?? []).map((o) => [o.permission_key, o.allowed]));

  const permissions = Object.fromEntries(
    ALL_PERMISSION_KEYS.map((key) => {
      const override = overrides.get(key);
      if (override === true) return [key, "allowed"];
      if (override === false) return [key, "denied"];
      return [key, grantFor(profile.role, key)];
    })
  ) as AppSession["permissions"];

  const [{ data: branch }, { count: unreadNotificationCount }] = await Promise.all([
    profile.branch_id ? supabase.from("branches").select("*").eq("id", profile.branch_id).single() : Promise.resolve({ data: null }),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("profile_id", user.id).eq("is_read", false),
  ]);

  return {
    userId: user.id,
    profile,
    branch: branch ?? null,
    permissions,
    unreadNotificationCount: unreadNotificationCount ?? 0,
  };
}
