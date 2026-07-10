# Roadmap

This is the honest accounting of what's built vs. stubbed vs. not
started, and enough design detail to pick up any remaining gap directly.
Every module in the design handoff's README.md has a real, working route
in this repository — nothing is a static mockup — but not every module
is built to the same depth. This doc says which is which.

## What's fully built

| Module | Status |
|---|---|
| Core Platform (auth, RBAC, branches, audit log, notifications) | ✅ Full — fixed `user_role` enum, RLS-enforced everywhere, immutable audit log via a generic trigger |
| CRM & Lead Management | ✅ Full — pipeline + list views, BANT scoring, dedupe on email/phone, communication log, WhatsApp deep-link, lead → customer conversion |
| Quotations & Site Assessments | ✅ Full — versioned quotes, tiered approval workflow (Ops Manager / Owner by amount + discount%), site assessment → quote handoff |
| Operations & Scheduling | ✅ Full — job board, team/vehicle assignment, status state machine, offline-capable field capture with idempotent sync |
| Finance | ✅ Full — contracts (auto-renewal), invoicing, payments/receipts with part-paid tracking, debtors, expenses |
| Supply Chain (Inventory/Procurement/Suppliers/Vehicles) | ✅ Full — stock movements with approval gating by role, PO → approval → delivery flow |
| HR | ✅ Full — employee records (leave/attendance/training/review/disciplinary/PPE), notifications |
| Client Portal | ✅ Full — own layout, quote accept/reject, invoice view, service requests, complaints, satisfaction rating |
| Reports | ✅ Full — all eleven reports from the design spec (see below for what's *not* included) |
| AI Insights | 🟡 Rule-based engine covering the spec's example insights (no LLM) — see below |
| Marketing | 🟡 Campaign CRUD with real lead-attribution metrics — no automation/import (see below) |
| Recycle Bin | ✅ Full — twelve soft-deletable record types, role-gated restore matching each table's RLS policy |
| Administration | ✅ Users/roles, audit log, recycle bin, settings, profile |

## Why the remaining gaps were deferred

The full design spec describes an OpenAI-backed AI assistant, scheduled
report delivery, real photo/document storage, and data import — each is a
genuine third-party integration (an LLM provider, an email/SMTP relay, a
Supabase Storage bucket, a file-parsing pipeline) that needs credentials
and a live environment this repository doesn't have access to while being
built. Rather than fake those integrations behind a UI that looks
finished, each gap below is either a real, swappable stub (rule-based AI
Insights) or explicitly labeled as not implemented in the UI itself
(field-capture photo notes) so a demo never claims capability the code
doesn't have.

## AI Insights — what exists, what's next

**Built**: `lib/ai-insights/rules.ts` — pure, unit-tested functions
(`computeChurnRisks`, `computeUpsellOpportunities`,
`forecastNextMonthRevenue`) run against real Supabase data on every page
load. "Ask your business anything" (`app/actions/ai-insights.ts`) answers
five question patterns from the design spec's own examples by running a
real, RLS-scoped query each time — every number in every answer is real,
not generated.

**Not built**: the OpenAI-backed Edge Function the design spec describes,
which would handle arbitrary natural-language questions instead of five
fixed patterns, and could draft quote/email copy. Swapping it in later
means replacing what's inside `askBusinessQuestion()` — the calling
component (`ai-insights-client.tsx`) and its suggested-question chips
don't need to change, and the same is true of the rule functions in
`rules.ts` if a hosted model ever replaces the linear-regression forecast
or the risk thresholds.

## Reports — what exists, what's next

**Built**: `/reports` with all eleven reports the design spec's Sprint 8
lists by name (Daily Lead, Pipeline, Conversion, Jobs Completed,
Satisfaction, Productivity, Inventory Valuation, Debtors Aging, Monthly
Profitability, Branch Performance, Executive Summary), each backed by a
real query in `lib/reports/registry.ts`, role-gated, with CSV export.

**Not built**: scheduled email delivery and PDF/Excel export formats.
CSV export needed no new dependency; PDF/Excel would (a PDF renderer, a
`.xlsx` writer) and scheduled delivery needs a mail relay and either a
cron-capable Postgres extension or an external scheduler — worth adding
once there's a real SMTP/transactional-email account to send from.

## Marketing — what exists, what's next

**Built**: `campaigns` table (migration `0019`) + `/marketing` CRUD —
name, channel, budget, status, date range. `leads.campaign_id` links a
lead back to the campaign that generated it, so leads-generated, win
count, and cost-per-lead on the campaign list are computed from real
attributed leads, not a manually-typed counter.

**Not built**: marketing automation (drip sequences, scheduled sends) and
bulk import from Excel/CSV/Google Sheets. Import specifically needs a
file-parsing + column-mapping UI and a batch-insert path with the same
dedupe rules `leads` already enforces (`leads_email_uniq`/`leads_phone_uniq`
in migration `0003`) — the dedupe logic exists and could be reused
directly; only the upload/parse/preview UI is missing.

## Operations — known scoping gap

The design handoff's `DATABASE_SCHEMA.sql` has no crew-roster join table
between `profiles` and `jobs` — a job has a single `supervisor_id`, not a
crew list. That means "my jobs" in the Supervisor App (`/operations/field`)
only scopes precisely for the Supervisor role (`supervisor_id = auth.uid()`);
Cleaner, Owner, and Ops Manager see all of today's active jobs instead of
a per-person assignment. Fixing this needs a `job_crew` table
(`job_id`, `profile_id`, unique together) and an RLS policy on `jobs`
joining through it — additive, no existing table changes.

## Operations — known integration gap

Photo capture in the Supervisor App is UI-only: a file input triggers a
capture event with a note in `job_events`, not a real file upload,
because no Supabase Storage bucket is configured in this environment.
This is explicitly labeled in the UI rather than silently discarding the
photo. Wiring it up for real means creating a `job-photos` Storage bucket
with an RLS policy mirroring `jobs`' own (supervisor/ops_manager/owner
write, customer-portal read where the job belongs to their account), and
swapping the file input's handler to `supabase.storage.from(...).upload()`
before calling `record_job_event()` with the resulting path instead of a
placeholder note.

## Future-ready items explicitly called out in the design spec

- **Claude/OpenAI integration for AI Insights**: see above —
  `askBusinessQuestion()` and the functions in `rules.ts` are the two
  swap points.
- **Scheduled report delivery**: needs a transactional-email account; the
  report `load()` functions in `lib/reports/registry.ts` already produce
  the exact `{columns, rows}` shape an email template would consume.
- **Phone/OTP login**: `profiles.phone` already exists; Supabase Auth
  supports phone/OTP — enabling it is a Supabase dashboard config change
  plus a phone-based login form mirroring `app/(auth)/login/`.
- **Supabase Storage for photos/documents**: see the Operations
  integration gap above — the same pattern (bucket + RLS + swap the
  upload call) applies to any future document-attachment feature
  (signed contracts, supplier invoices, etc.).
