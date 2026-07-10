import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on every route except static assets, the PWA service worker (must
     * be served with no auth interference so it can install/update even
     * when the session is expired offline), .well-known/ (Digital Asset
     * Links / TWA verification — Google's verifier hits this unauthenticated
     * and expects a 200 JSON response, not a redirect to /login), and api/
     * (route handlers there are called by external services with no
     * Supabase session cookie at all — e.g. Meta's WhatsApp webhook, which
     * authenticates its own requests via signature/verify-token — and do
     * their own auth via getAppSession()/service-role client as needed).
     */
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|.well-known/|api/|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)",
  ],
};
