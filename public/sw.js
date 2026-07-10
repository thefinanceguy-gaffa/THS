/**
 * THS OS — Service Worker
 *
 * Hand-rolled rather than a generated Workbox bundle: exact control over
 * which routes are cacheable (field capture in Operations must always be
 * available offline; Supabase API calls must never be served stale from a
 * cache), and it keeps the dependency tree free of the unmaintained
 * next-pwa/workbox-build toolchain (which currently ships an RCE advisory
 * in its build-time dependencies).
 *
 * Strategy:
 *  - Static assets: cache first, revalidating in the background, so the app
 *    boots instantly and works with zero connectivity. Safe to cache
 *    forever-ish because Next.js content-hashes these filenames — a changed
 *    file is a new URL, never a stale one served under an old name.
 *  - Navigations: network first with a short timeout, falling back to
 *    cache — a cached PAGE isn't content-hashed like the assets it
 *    references, so right after a deploy a stale RUNTIME_CACHE page could
 *    point at JS chunk filenames the new deployment no longer serves.
 *    Racing the network with a timeout (NAV_TIMEOUT_MS) gets freshness on
 *    any connection that isn't actually struggling, while still falling
 *    back to the instant cached copy the moment the network is slow/absent.
 *  - /offline is the fallback for a navigation with no cached copy at all
 *    (e.g. the very first launch, before ever loading anything online) and
 *    for a genuinely uncached page while offline.
 *  - Supabase/API requests: never intercepted — they hit the network
 *    directly so failures propagate to the app's own offline queue, which
 *    is the actual source of truth for "what happens when a write fails
 *    offline" (see lib/offline/ once the field-capture outbox lands).
 */

const NAV_TIMEOUT_MS = 2500;
const CACHE_VERSION = "ths-os-v1";
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
// Deliberately NOT versioned, unlike APP_SHELL_CACHE — see semillaPOS's
// sibling comment for why: this is where every page a user has actually
// opened lives, and tying its name to CACHE_VERSION would wipe it on every
// deploy via the activate() cleanup below, locking out anyone offline.
const RUNTIME_CACHE = "ths-os-runtime";

// start_url ("/dashboard") can't be precached here — it's an authenticated,
// per-user page that doesn't exist yet at install time — but /login is
// static and unauthenticated, so precaching it means even a brand new
// install that's never been online successfully still has something real
// to show instantly instead of falling all the way to /offline.
const APP_SHELL_URLS = [
  "/offline",
  "/login",
  "/manifest.webmanifest",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== RUNTIME_CACHE && !key.startsWith(CACHE_VERSION)).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isSupabaseRequest(url) {
  return url.hostname.endsWith(".supabase.co") || url.pathname.startsWith("/rest/") || url.pathname.startsWith("/auth/");
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== "GET" || url.origin !== self.location.origin) {
    return; // Never intercept writes or cross-origin (Supabase) calls.
  }
  if (isSupabaseRequest(url)) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cached = await caches.match(event.request);

        const network = fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => null);

        const timeout = new Promise((resolve) => setTimeout(() => resolve(null), NAV_TIMEOUT_MS));

        const fresh = await Promise.race([network, timeout]);
        if (fresh) return fresh;

        return cached || (await network) || caches.match("/offline");
      })()
    );
    return;
  }

  // Static assets: cache-first, revalidate in the background.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
