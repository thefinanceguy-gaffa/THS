"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthActionState {
  error: string | null;
}

const MAX_LOGIN_ATTEMPTS = 5;

export async function login(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();

  // Account lockout check happens before attempting auth at all — TECH_SPEC.md's
  // security checklist calls for "account lockout after N failed logins".
  const { data: lookup } = await supabase.rpc("profile_id_for_email", { p_email: email });
  const existing = lookup?.[0];
  if (existing?.is_suspended) {
    return { error: "This account has been suspended after too many failed attempts. Contact your administrator." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await supabase.rpc("record_failed_login", { p_email: email, p_max_attempts: MAX_LOGIN_ATTEMPTS });
    return { error: error.message };
  }

  await supabase.rpc("record_successful_login");
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/confirm?next=/reset-password`,
  });

  // Always report success regardless of whether the email exists — a
  // different message here would let anyone probe which emails have
  // accounts (Supabase's own resetPasswordForEmail already behaves this way).
  if (error) {
    return { error: error.message };
  }

  redirect("/login?message=If that email has an account, a password reset link is on its way.");
}

export async function resetPassword(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}
