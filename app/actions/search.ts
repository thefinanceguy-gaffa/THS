"use server";

import { createClient } from "@/lib/supabase/server";

export interface SearchResult {
  type: "customer" | "lead" | "supplier";
  id: string;
  label: string;
  sublabel?: string;
}

/**
 * Global fuzzy search (README.md: "search customers, leads, ... suppliers,
 * ..."). Uses the pg_trgm indexes from the CRM/supply-chain migrations via
 * ilike — RLS narrows results to whatever the caller's role can already
 * see, same as every other query in the app.
 */
export async function globalSearch(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const supabase = await createClient();
  const like = `%${q}%`;

  const [{ data: customers }, { data: leads }, { data: suppliers }] = await Promise.all([
    supabase.from("customers").select("id, company_name, suburb").ilike("company_name", like).is("deleted_at", null).limit(5),
    supabase.from("leads").select("id, company_name, contact_name").ilike("company_name", like).is("deleted_at", null).limit(5),
    supabase.from("suppliers").select("id, name, category").ilike("name", like).is("deleted_at", null).limit(5),
  ]);

  return [
    ...(customers ?? []).map((c): SearchResult => ({ type: "customer", id: c.id, label: c.company_name, sublabel: c.suburb ?? undefined })),
    ...(leads ?? []).map((l): SearchResult => ({ type: "lead", id: l.id, label: l.company_name, sublabel: l.contact_name ?? undefined })),
    ...(suppliers ?? []).map((s): SearchResult => ({ type: "supplier", id: s.id, label: s.name, sublabel: s.category ?? undefined })),
  ];
}
