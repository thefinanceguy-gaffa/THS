"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/**
 * A phone connected to a flaky mobile hotspot often reports as "online"
 * (the WiFi radio is associated) while requests to the internet just hang
 * — no DNS failure, no connection-refused, nothing fetch() itself would
 * ever reject on. Left unbounded, one such request keeps the offline
 * sync engine's "syncing" flag stuck true forever: flush() bails
 * immediately if it's already syncing, so every subsequent retry —
 * including the 30s watchdog interval and the browser's own 'online'
 * event — silently no-ops too. The queued sale/shift/etc. then just sits
 * there ("N pending") with the badge stuck on "Syncing…" until the tab is
 * reloaded. A hard timeout on every request this client makes bounds that
 * stall and lets the sync engine's normal retry loop recover on its own.
 */
const REQUEST_TIMEOUT_MS = 20_000;

function timeoutFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
}

/**
 * Browser-side Supabase client. Safe to call repeatedly — each call returns
 * a fresh client bound to cookie-based storage, which is what @supabase/ssr
 * expects (it manages its own singleton internally per the docs).
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: timeoutFetch } }
  );
}
