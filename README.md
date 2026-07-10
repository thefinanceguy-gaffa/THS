# THS OS

THS OS is a cloud-based business operating system for **The Hygiene
Squad**, a professional cleaning & facilities-hygiene company in Harare,
Zimbabwe — Sales/CRM, Quotations, Site Assessments, Operations/Scheduling,
a field mobile app, a client portal, Finance, HR, Inventory, Procurement,
Marketing, Reporting, rule-based AI Insights, and Administration (RBAC,
audit, recycle bin, settings).

This is an independent product and repository — it does not depend on or
share a database with any other project.

Read [`docs/DEVELOPER.md`](./docs/DEVELOPER.md) before making changes — it
covers the architecture, conventions, and the deliberate deviation from
the original design spec's proposed layering.

See [`docs/ROADMAP.md`](./docs/ROADMAP.md) for an honest accounting of
what's fully built vs. stubbed vs. not started, and the suggested
approach for each remaining gap.

## Tech stack

Next.js 15 (App Router) + React 19 + TypeScript + Tailwind v4 +
shadcn/ui (on `@base-ui/react`, not Radix) · Supabase (Postgres + Auth +
Row Level Security) · Zustand for client UI state · Dexie (IndexedDB) for
offline · Vitest for unit tests.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in your Supabase project URL + anon key
```

Apply the schema — every migration in `supabase/migrations/` is plain,
numbered SQL, meant to be run in order against a Postgres database with
the `pgcrypto` and `pg_trgm` extensions available (any Supabase project
already has these):

```bash
# via the Supabase CLI, against a linked project or `supabase start`:
supabase db push

# or by hand, in order, against any Postgres instance:
for f in supabase/migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done
```

Regenerate `lib/supabase/database.types.ts` from a real project once one
is linked (see `docs/DEVELOPER.md` — it's hand-written today):

```bash
npm run db:types
```

Seed demo data (an Owner login, a branch, sample customers/leads/a
contract):

```bash
npm run seed
```

Run it:

```bash
npm run dev
```

Before considering any change done: `npm run typecheck`, `npm run lint`,
`npm test`, and `npm run build` must all pass. If you touch
`supabase/migrations/`, actually run the new/changed SQL against a local
Postgres instance — don't just read it for syntax (see
`docs/DEVELOPER.md`'s "Testing migrations locally" section for the exact
mock-auth-schema setup used to develop this repo).

## Demo login

After seeding: `owner@thehygienesquad.co.zw` / `ThsOsDemo123!`.
