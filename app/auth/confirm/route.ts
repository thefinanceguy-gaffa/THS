import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles the link Supabase's confirmation/magic-link/recovery emails point
 * at ({{ .ConfirmationURL }} in the email template resolves to
 * `{site_url}/auth/confirm?token_hash=...&type=...`). Exchanges the OTP
 * token for a real session, then hands off to the app.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      redirect(next);
    }
  }

  redirect("/login?error=Your confirmation link is invalid or has expired.");
}
