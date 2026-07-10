# Developer Guide

Architecture, conventions, and the gotchas you'll hit extending this
codebase.

## Architecture: deviation from the design spec

The original design handoff's `TECH_SPEC.md` proposes a four-layer Clean
Architecture (Domain → Application → Infrastructure → Presentation, with
repository interfaces so Supabase could be swapped later) under
`src/{domain,application,infrastructure}/` alongside `app/`.

This codebase deliberately does **not** implement that. It follows the
same pattern as the team's other Supabase/Next.js product: **Server
Component + Server Action, with Postgres Row Level Security as the actual
security boundary** — no repository interfaces, no application-service
layer, no dependency-injected gateways. A page is a Server Component that
queries Supabase directly; a mutation is a `"use server"` function in
`app/actions/<domain>.ts` that calls Supabase directly (or a
`SECURITY DEFINER` RPC for anything transactional/multi-table); RLS
policies — not application code — are what actually stop a `cleaner` from
reading `finance` data, even if every layer above them has a bug.

This was a conscious tradeoff, not an oversight: building the four-layer
version for a platform this wide (twelve-plus modules) would have spent
most of the available effort on ports/adapters/DI wiring instead of
shipped functionality. The repository-swap flexibility the spec's
architecture buys you is real but speculative — nothing in this build
plan calls for swapping Postgres out. If that changes, the Server Action
files are already the seam: each one is a small, single-purpose function
that could be reimplemented against a different backend without touching
any calling code (no route, component, or other action imports Supabase
directly except through these files and the Server Components' own
initial queries).

## Folder structure

```
app/
  (auth)/            Public routes: /login, /forgot-password, /reset-password
  (app)/             Everything behind auth for staff roles — dashboard,
                     crm, quotations, assessments, operations, finance/,
                     hr, inventory, procurement, suppliers, vehicles,
                     marketing, reports/[slug], ai-insights,
                     administration/{users,audit-log,recycle-bin,settings,profile,notifications}
                     app/(app)/layout.tsx resolves the AppSession
                     server-side and redirects `client`-role users to /portal.
  (portal)/          Client-role-only area (own layout, mobile-first,
                     bottom tab bar) — redirects non-client roles to /dashboard.
  actions/           Server Actions ("use server"), one file per domain,
                     always returning { error: string | null } and calling
                     revalidatePath() on success.
components/
  ui/                shadcn/ui primitives on @base-ui/react — generated,
                     don't hand-edit unless extending a component's variants
  layout/            App shell: sidebar, topbar, AI panel, currency toggle
lib/
  supabase/          client.ts (browser), server.ts (Server Components/Actions),
                     middleware.ts (session refresh), database.types.ts
                     (hand-written — see "Database types" below)
  session/           getAppSession() (server) + SessionProvider/useAppSession (client)
  rbac/               permissions.ts — the UX-level permission matrix
                     (mirrors RBAC_MATRIX.md); RLS is the real boundary, this
                     just drives what the UI shows/hides
  offline/           Dexie schema + sync engine — see "Offline architecture" below
  validation/        Zod schemas, one file per domain
  reports/           registry.ts — {title, roles, load(supabase)} per report,
                     rendered through one dynamic route (see "Reports" below)
  recycle-bin/       registry.ts — same registry pattern for soft-delete/restore
  ai-insights/       rules.ts — the rule-based "AI Insights" engine (no LLM)
stores/              Zustand stores — client-only UI state (currency unit,
                     FX rate, AI panel open) that should survive a reload
supabase/
  migrations/        Numbered, plain SQL. This is the schema's source of truth.
scripts/seed.ts       Demo data generator (not part of migrations)
types/                Shared TypeScript types not tied to a single feature
```

## Conventions

- **Server Components fetch, Client Components mutate.** List/detail pages
  are Server Components with an initial Supabase query; interactive pieces
  (forms, dialogs, status dropdowns) are Client Components calling a
  Server Action via `useTransition`.
- **Mutations go through Server Actions** in `app/actions/<domain>.ts`.
  Anything that touches more than one table, or needs authorization logic
  beyond "can this role write this table," goes through a
  `SECURITY DEFINER` RPC instead (see `supabase/migrations/0011` onward —
  `create_quotation`, `submit_quotation`, `record_job_event`,
  `convert_lead_to_customer`, etc.) so the atomicity and the authorization
  check live in one place, checked server-side regardless of caller.
- **RLS is the real security boundary**, enforced through a handful of SQL
  helper functions (`current_user_role()`, `has_role(role[])`, `is_owner()`,
  `is_self_or_manager_of(profile_id)` for org-hierarchy visibility) used in
  every table's policy. `lib/rbac/permissions.ts`'s `grantFor()` is UX
  sugar for hiding buttons a user's RLS would reject anyway — never the
  only check on a new mutation.
- **Soft deletes only.** Every business table has `deleted_at`; mutate it
  via `.update({ deleted_at: new Date().toISOString() })` (or the generic
  restore path in `lib/recycle-bin/registry.ts`), never `.delete()`. Reads
  filter `.is('deleted_at', null)`.
- **`@base-ui/react`, not Radix.** Composing a custom element into a
  Trigger/Item uses the `render` prop — `asChild` doesn't exist:
  ```tsx
  // Wrong (Radix pattern):
  <DialogTrigger asChild><Button>Open</Button></DialogTrigger>
  // Right:
  <DialogTrigger render={<Button>Open</Button>} />
  ```
  This also means `Table.tsx`'s `TableRow` is a plain `<tr>`
  (`React.ComponentProps<"tr">`) with no `render` prop — for a clickable
  row use `useRouter()` + `onClick`, not `render={<Link .../>}`.
  `Select`/`onValueChange` callbacks receive `string | null` — handle
  `null` explicitly.
- **Material Symbols Rounded is the only content-icon set**
  (`components/ui/material-icon.tsx`, via `font-variation-settings`).
  `lucide-react` stays only for shadcn/ui's own structural icons
  (chevrons, close buttons) — don't reach for it for a feature icon.
- **Document numbers** come from the single `next_document_number(counter_type, prefix)`
  RPC + `document_counters` table — never hand-roll a sequence per module.
- **Approval workflows** are a generic `approvals` table
  (`entity_type`/`entity_id`/`status`) plus threshold logic inside the
  relevant RPC (quotations: >15% discount or >$5,000 → Owner, >$1,000 →
  Ops Manager, in `submit_quotation()`; purchase orders: routed against the
  raiser's own `profiles.approval_limit_usd`; inventory adjustments:
  Ops Manager/Supervisor writes are flagged pending in `adjust_stock()`).
  `lib/rbac/permissions.ts`'s `APPROVAL_THRESHOLDS` is the UI's mirror of
  the same numbers — keep them in sync if you change one.

## Offline architecture (field capture)

Three pieces, in `lib/offline/`:

- **`db.ts`** — a Dexie (IndexedDB) database: a job-event outbox
  (`JobEventOutboxRow`, keyed by a client-generated UUID) queued whenever
  the Supervisor App captures a status change, photo note, or signature
  offline.
- **`sync-engine.ts`** — `syncEngine.enqueue()` writes to the outbox and
  tries to flush immediately if online; `flush()` replays each row against
  `record_job_event()` (the RPC, not a direct table write), deleting the
  row on success. A `window.addEventListener("online", ...)` plus a 30s
  interval cover reconnection.
- **`public/sw.js`** — hand-rolled (not `next-pwa`/Workbox) service
  worker: cache-first for the app shell/static assets, network-first with
  a timeout fallback for navigations; it never intercepts Supabase
  requests, so failures propagate to the sync engine.

**Idempotency**: `record_job_event(p_client_generated_id, ...)` looks up
the client-generated id first and returns the existing row if found, so a
retried sync after a dropped response never double-applies. This is the
only idempotent write path in the app — offline capture was the one
feature that specifically needed it (everything else is either
non-offline or naturally idempotent, like `UPDATE ... SET status = X`).

## Reports (`lib/reports/registry.ts`)

Each of the eleven reports is one entry: `{ slug, title, description,
icon, roles, load(supabase) }`. `load()` runs real queries and returns
`{ columns, rows, summary? }` — a flat, already-formatted shape the
generic `app/(app)/reports/[slug]/page.tsx` + `report-view.tsx` render
identically for all eleven, with a client-side CSV export (no library —
a hand-built `Blob` download, same approach as the sibling product's
`lib/reports/csv.ts`). Adding a twelfth report is one new registry entry,
no new route.

## Recycle Bin (`lib/recycle-bin/registry.ts`)

Same registry shape, one entry per soft-deletable table: `{ table,
entityLabel, roles, labelColumn, load(supabase), restore(supabase, id) }`.
`roles` must match that table's actual `UPDATE` RLS policy (see the
comment at the top of the registry) — the restore button being visible
doesn't guarantee it will succeed if this drifts from the policy, since
RLS is still checked server-side regardless.

**Why `restore()` is a hand-written switch, not one generic
`.from(table).update(...)` call**: supabase-js's typed client does not
narrow the `Update` parameter type correctly when `table` is a *type
parameter* constrained to a union of table names (as opposed to a literal
string at the call site) — every union member's shape gets combined into
something that only accepts `never`. Once you hit this, the fix is to
give TypeScript a literal at each call site, not to reach for `as any`;
`restoreByTable()`'s `switch` does exactly that.

## Database types

`lib/supabase/database.types.ts` is **hand-written**, not generated —
there's no live Supabase project linked in this development environment.
Once you have one:

```bash
npm run db:types   # supabase gen types typescript --local > lib/supabase/database.types.ts
```

If you edit this file by hand in the meantime, every table needs a
`Relationships: [...]` array listing its foreign keys — supabase-js's
nested `.select("table(columns)")` joins silently break
(`SelectQueryError`) without it. See any table in that file for the
pattern, and note that an *embedded* select needs an unambiguous FK path;
where a table has more than one FK to the same target (none currently do)
you'd need the `column:table!constraint_name(...)` hint form, used
defensively in a few report queries even though it isn't strictly
required today.

## Testing migrations locally

There's no `supabase start` (Docker) available in this environment, so
migrations are verified against a plain local Postgres install instead,
with a minimal mock of the two Supabase-specific things RLS policies and
triggers depend on:

```bash
sudo -u postgres psql -c "CREATE DATABASE ths_os_test;"
sudo -u postgres psql -d ths_os_test -c "CREATE SCHEMA IF NOT EXISTS auth;"
sudo -u postgres psql -d ths_os_test -c \
  "CREATE TABLE auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb);"
sudo -u postgres psql -d ths_os_test -c \
  "CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS \$\$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid \$\$;"
sudo -u postgres psql -d ths_os_test -c \
  "GRANT USAGE ON SCHEMA public TO anon, authenticated; GRANT USAGE ON SCHEMA auth TO anon, authenticated;"
# real Supabase projects grant table-level privileges to anon/authenticated
# automatically outside of migrations — mirror that here, once, per test DB:
sudo -u postgres psql -d ths_os_test -c \
  "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
   GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;"

for f in supabase/migrations/*.sql; do
  sudo -u postgres psql -d ths_os_test -v ON_ERROR_STOP=1 -f "$f" || break
done
```

Then verify RLS/RPC behavior with real data by switching role and JWT
claim per statement:

```sql
set role authenticated;
set request.jwt.claim.sub = '<profile-uuid>';
-- ... insert/select/update as that user ...
reset role;
```

This catches real bugs a syntax-only read cannot — e.g. a table missing
its number-generating trigger, or a policy that's more (or less)
permissive than intended — and every migration in this repo has been run
this way at least once before being committed. It does **not** exercise
PostgREST's embedded-resource `.select("table(columns)")` syntax (that's
a PostgREST feature, not plain SQL) — those queries are verified by
`npm run typecheck`/`npm run build` at the type level and by matching the
FK-relationship convention already used elsewhere in the codebase, not by
executing them against a running PostgREST instance.

## Adding a new module or feature

1. Add any new tables as a new numbered migration, following the pattern
   in existing files: `id`/`created_at`/`updated_at`/`deleted_at` (+
   `created_by` where relevant), RLS enabled, policies scoped through
   `has_role([...])`/`is_owner()`/`is_self_or_manager_of()`.
2. If the mutation is multi-table or needs its own authorization check,
   add a `SECURITY DEFINER` RPC (revoked from `public`/`anon`, granted to
   `authenticated`) rather than doing the write directly in a Server
   Action.
3. Add the table(s)/RPC(s) to `lib/supabase/database.types.ts` by hand.
4. Build routes under `app/(app)/<module>/`, following the Server
   Component list + Client Component form pattern above. Add the nav
   entry (with its `roles` array) to `lib/nav/config.ts`.
5. If a role needs a new UX-level gate, add the key to
   `lib/rbac/permissions.ts`'s `PermissionKey` union and `MATRIX` —
   but the RLS policy from step 1 is what actually enforces it.
