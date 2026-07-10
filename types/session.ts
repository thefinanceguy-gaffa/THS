import type { Tables } from "@/lib/supabase/database.types";
import type { PermissionGrant, PermissionKey } from "@/lib/rbac/permissions";

export interface AppSession {
  userId: string;
  profile: Tables<"profiles">;
  branch: Tables<"branches"> | null;
  /** Role default (RBAC_MATRIX.md) with any per-user override already applied. */
  permissions: Record<PermissionKey, PermissionGrant>;
  unreadNotificationCount: number;
}
