"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getAppSession } from "@/lib/session/get-app-session";
import { createUserSchema, updateUserSchema } from "@/lib/validation/users";
import type { UpdateTables } from "@/lib/supabase/database.types";

export interface ActionState {
  error: string | null;
}

// ----------------------------------------------------------------------------
// createUser: uses the service-role client to call supabase.auth.admin.
// createUser() — only trusted server code may do this; RLS provides no
// protection here, so the permission check below is load-bearing, exactly
// like semillaPOS's createPinStaffUser().
// ----------------------------------------------------------------------------
export async function createUser(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await getAppSession();
  if (!session) return { error: "You must be signed in." };
  if (session.permissions["users.manage"] !== "allowed") {
    return { error: "You don't have permission to add users." };
  }

  const parsed = createUserSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    branchId: formData.get("branchId") || undefined,
    jobTitle: formData.get("jobTitle") || undefined,
    department: formData.get("department") || undefined,
    reportingManagerId: formData.get("reportingManagerId") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form for errors." };
  }
  const v = parsed.data;

  const admin = createServiceRoleClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: v.email,
    password: v.password,
    email_confirm: true,
    user_metadata: { full_name: v.fullName, role: v.role },
  });

  if (createError) {
    if (createError.message.toLowerCase().includes("already")) {
      return { error: "That email is already registered." };
    }
    return { error: createError.message };
  }

  const userId = created.user.id;

  // on_auth_user_created already inserted a bare profile row (id, email,
  // full_name, role) — fill in the rest.
  const { error: profileError } = await admin
    .from("profiles")
    .update({
      branch_id: v.branchId || null,
      job_title: v.jobTitle || null,
      department: v.department || null,
      reporting_manager_id: v.reportingManagerId || null,
    })
    .eq("id", userId);

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    return { error: profileError.message };
  }

  revalidatePath("/administration/users");
  return { error: null };
}

export async function updateUser(userId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await getAppSession();
  if (!session) return { error: "You must be signed in." };
  if (session.permissions["users.manage"] !== "allowed") {
    return { error: "You don't have permission to edit users." };
  }

  const parsed = updateUserSchema.safeParse({
    fullName: formData.get("fullName"),
    role: formData.get("role"),
    branchId: formData.get("branchId") || undefined,
    jobTitle: formData.get("jobTitle") || undefined,
    department: formData.get("department") || undefined,
    reportingManagerId: formData.get("reportingManagerId") || undefined,
    approvalLimitUsd: Number(formData.get("approvalLimitUsd") || 0),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form for errors." };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const payload: UpdateTables<"profiles"> = {
    full_name: v.fullName,
    role: v.role,
    branch_id: v.branchId || null,
    job_title: v.jobTitle || null,
    department: v.department || null,
    reporting_manager_id: v.reportingManagerId || null,
    approval_limit_usd: v.approvalLimitUsd,
  };
  const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
  if (error) return { error: error.message };

  revalidatePath("/administration/users");
  return { error: null };
}

export async function setUserSuspended(userId: string, suspended: boolean): Promise<ActionState> {
  const session = await getAppSession();
  if (!session) return { error: "You must be signed in." };
  if (session.permissions["users.manage"] !== "allowed") {
    return { error: "You don't have permission to suspend users." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ is_suspended: suspended, failed_login_count: 0 }).eq("id", userId);
  if (error) return { error: error.message };

  revalidatePath("/administration/users");
  return { error: null };
}

export async function setPermissionOverride(profileId: string, permissionKey: string, allowed: boolean | null): Promise<ActionState> {
  const session = await getAppSession();
  if (!session) return { error: "You must be signed in." };
  if (session.permissions["users.manage"] !== "allowed") {
    return { error: "You don't have permission to set permission overrides." };
  }

  const supabase = await createClient();
  if (allowed === null) {
    const { error } = await supabase.from("permission_overrides").delete().eq("profile_id", profileId).eq("permission_key", permissionKey);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("permission_overrides")
      .upsert({ profile_id: profileId, permission_key: permissionKey, allowed }, { onConflict: "profile_id,permission_key" });
    if (error) return { error: error.message };
  }

  revalidatePath("/administration/users");
  return { error: null };
}
