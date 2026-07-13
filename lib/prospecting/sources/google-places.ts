import "server-only";

export interface RawProspect {
  companyName: string;
  suburb: string | null;
  industry: string;
  sourceRef: string;
}

/** One (search phrase, industry label) pair per target vertical — the search phrase drives what Places returns, the industry label is what we store and score against. */
export interface ProspectTarget {
  query: string;
  industry: string;
}

const HARARE_SUBURBS = ["Borrowdale", "Avondale", "Belgravia", "Milton Park", "CBD", "Msasa", "Newlands", "Eastlea"] as const;

export const DEFAULT_PROSPECT_TARGETS: ProspectTarget[] = [
  { query: "corporate offices in Harare", industry: "Corporate Offices" },
  { query: "medical clinics in Harare", industry: "Healthcare" },
  { query: "hotels in Harare", industry: "Hospitality" },
  { query: "private schools in Harare", industry: "Education" },
  { query: "banks in Harare", industry: "Banking" },
  { query: "warehouses in Harare", industry: "Logistics & Warehousing" },
  { query: "shopping centres in Harare", industry: "Retail" },
  { query: "manufacturing companies in Harare", industry: "Manufacturing" },
];

function extractSuburb(formattedAddress: string | undefined): string | null {
  if (!formattedAddress) return null;
  return HARARE_SUBURBS.find((s) => formattedAddress.toLowerCase().includes(s.toLowerCase())) ?? null;
}

/**
 * Google Places API (Text Search, legacy endpoint — simplest auth, no field-mask
 * header required). Returns null (not throws) when GOOGLE_PLACES_API_KEY isn't
 * set, same "not configured yet" convention as lib/email/client.ts.
 */
export async function searchGooglePlaces(target: ProspectTarget): Promise<RawProspect[] | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  url.searchParams.set("query", target.query);
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    console.error(`[prospecting] Google Places request failed (${res.status}) for "${target.query}"`);
    return [];
  }
  const data = (await res.json()) as { status: string; results?: { name: string; formatted_address?: string; place_id: string }[]; error_message?: string };
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error(`[prospecting] Google Places error for "${target.query}": ${data.status} ${data.error_message ?? ""}`);
    return [];
  }

  return (data.results ?? []).map((r) => ({
    companyName: r.name,
    suburb: extractSuburb(r.formatted_address),
    industry: target.industry,
    sourceRef: r.place_id,
  }));
}
