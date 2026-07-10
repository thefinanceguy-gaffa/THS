import { createServerClient } from "@supabase/ssr";
import { createClient as createRawClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

/**
 * Server-side Supabase client for use in Server Components, Route Handlers,
 * and Server Actions. Must be created fresh per request (it reads the
 * request's cookies via next/headers).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component — middleware handles the actual
            // session refresh/cookie write in that case, so this is safe to ignore.
          }
        },
      },
    }
  );
}

/**
 * Service-role client for trusted server-only operations (e.g. Edge
 * Functions, scheduled jobs). Bypasses RLS — never expose to the client and
 * never use inside a request handler that echoes another tenant's data back.
 */
export function createServiceRoleClient() {
  return createRawClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
