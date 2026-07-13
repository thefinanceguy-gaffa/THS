import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { searchGooglePlaces, DEFAULT_PROSPECT_TARGETS, type ProspectTarget } from "./sources/google-places";
import { isDuplicateCompany } from "./dedupe";
import { buildWonCustomerProfile, scoreFit } from "./scoring";

export interface CollectionSummary {
  configured: boolean;
  targetsRun: number;
  inserted: number;
  skippedDuplicate: number;
  skippedSuppressed: number;
}

/**
 * Batch job, not per-request — run from the Vercel Cron route or a manual
 * "Run collection now" button, never on a page load (README.md's AI
 * Prospecting section is explicit about this). Uses the service-role
 * client since prospect_candidates has no INSERT policy for regular users
 * — this is a trusted background job, not a client write path.
 */
export async function runProspectCollection(targets: ProspectTarget[] = DEFAULT_PROSPECT_TARGETS): Promise<CollectionSummary> {
  const supabase = createServiceRoleClient();

  const probe = await searchGooglePlaces(targets[0]);
  if (probe === null) {
    return { configured: false, targetsRun: 0, inserted: 0, skippedDuplicate: 0, skippedSuppressed: 0 };
  }

  const [{ data: leads }, { data: customers }, { data: prospects }, { data: suppressed }, { data: wonCustomers }] = await Promise.all([
    supabase.from("leads").select("company_name").is("deleted_at", null),
    supabase.from("customers").select("company_name").is("deleted_at", null),
    supabase.from("prospect_candidates").select("company_name, source_ref"),
    supabase.from("suppression_list").select("company_name"),
    supabase.from("customers").select("industry, suburb, monthly_value_usd").eq("status", "active"),
  ]);

  const existingNames = [...(leads ?? []).map((l) => l.company_name), ...(customers ?? []).map((c) => c.company_name), ...(prospects ?? []).map((p) => p.company_name)];
  const suppressedNames = (suppressed ?? []).map((s) => s.company_name).filter((n): n is string => Boolean(n));
  const knownSourceRefs = new Set((prospects ?? []).map((p) => p.source_ref).filter(Boolean));
  const profile = buildWonCustomerProfile(wonCustomers ?? []);

  let inserted = 0;
  let skippedDuplicate = 0;
  let skippedSuppressed = 0;

  for (const target of targets) {
    const results = await searchGooglePlaces(target);
    if (!results) continue;

    for (const raw of results) {
      if (knownSourceRefs.has(raw.sourceRef)) continue;
      if (isDuplicateCompany(raw.companyName, suppressedNames)) {
        skippedSuppressed += 1;
        continue;
      }
      if (isDuplicateCompany(raw.companyName, existingNames)) {
        skippedDuplicate += 1;
        continue;
      }

      const fit = scoreFit({ industry: raw.industry, suburb: raw.suburb, estimatedValueUsd: null }, profile);
      const { error } = await supabase.from("prospect_candidates").insert({
        company_name: raw.companyName,
        suburb: raw.suburb,
        industry: raw.industry,
        source: "google_maps",
        source_ref: raw.sourceRef,
        fit_score: fit.score,
        fit_reason: fit.reason,
      });
      if (!error) {
        inserted += 1;
        existingNames.push(raw.companyName);
        knownSourceRefs.add(raw.sourceRef);
      }
    }
  }

  await supabase.from("audit_logs").insert({
    actor_name: "System — AI Prospecting",
    action: "collect",
    module: "crm",
    entity_type: "prospect_candidates",
    reason: `AI Prospecting run: ${targets.length} targets, ${inserted} inserted, ${skippedDuplicate} deduped, ${skippedSuppressed} suppressed`,
  });

  return { configured: true, targetsRun: targets.length, inserted, skippedDuplicate, skippedSuppressed };
}
