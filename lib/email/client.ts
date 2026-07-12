import "server-only";
import { Resend } from "resend";

export const EMAIL_FROM = process.env.RESEND_FROM_EMAIL ?? "THS OS <noreply@thehygienesquad.co.zw>";

let client: Resend | null | undefined;

/** Returns null (not throws) when RESEND_API_KEY isn't set — callers treat that as "email not configured yet". */
export function getResendClient(): Resend | null {
  if (client !== undefined) return client;
  const apiKey = process.env.RESEND_API_KEY;
  client = apiKey ? new Resend(apiKey) : null;
  return client;
}
