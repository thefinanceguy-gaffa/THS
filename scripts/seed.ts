/**
 * Bootstraps THS OS with the first Owner account, a Main Branch, and a
 * handful of Harare-localized sample CRM records (per BUILD_ROADMAP.md's
 * note to use "the Harare-localized sample data from THS OS.dc.html" for
 * dev seeding) — enough to log in and see a populated Dashboard/CRM.
 *
 * Uses the Supabase service-role key to bypass RLS entirely (trusted,
 * server-only script — not idempotent, don't run against real data).
 *
 * Usage:
 *   npm run seed
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/supabase/database.types";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in your environment (.env.local).");
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const OWNER_EMAIL = "owner@thehygienesquad.co.zw";
const OWNER_PASSWORD = "ThsOsDemo123!";

async function main() {
  console.log("Creating Main Branch…");
  const { data: branch, error: branchError } = await supabase
    .from("branches")
    .insert({ name: "Main Branch", city: "Harare", is_main: true })
    .select()
    .single();
  if (branchError) throw branchError;

  console.log(`Creating Owner account (${OWNER_EMAIL} / ${OWNER_PASSWORD})…`);
  const { data: created, error: userError } = await supabase.auth.admin.createUser({
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Tafadzwa Moyo", role: "owner" },
  });
  if (userError) throw userError;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ branch_id: branch.id, job_title: "Managing Director", department: "Executive" })
    .eq("id", created.user.id);
  if (profileError) throw profileError;

  console.log("Seeding sample customers…");
  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .insert([
      { company_name: "Old Mutual Zimbabwe", industry: "Insurance", suburb: "Borrowdale", segment: "Enterprise", monthly_value_usd: 4500, satisfaction: 4.6, account_owner_id: created.user.id, branch_id: branch.id },
      { company_name: "CBZ Bank", industry: "Banking", suburb: "CBD", segment: "Enterprise", monthly_value_usd: 6200, satisfaction: 4.8, account_owner_id: created.user.id, branch_id: branch.id },
      { company_name: "Simbisa Brands", industry: "Food & Beverage", suburb: "Msasa", segment: "Multi-site", monthly_value_usd: 3100, satisfaction: 4.2, account_owner_id: created.user.id, branch_id: branch.id },
    ])
    .select();
  if (customersError) throw customersError;

  console.log("Seeding sample leads…");
  const { error: leadsError } = await supabase.from("leads").insert([
    { company_name: "Meikles Hotel", contact_name: "Grace Chikafu", contact_role: "Facilities Manager", source: "referral", stage: "quotation", score: "hot", est_value_usd: 5200, owner_id: created.user.id, industry: "Hospitality", suburb: "CBD" },
    { company_name: "University of Zimbabwe", contact_name: "Tendai Mutasa", contact_role: "Estates Officer", source: "website", stage: "qualified", score: "warm", est_value_usd: 8800, owner_id: created.user.id, industry: "Education", suburb: "Mount Pleasant" },
    { company_name: "Cimas Health", contact_name: "Rutendo Gumbo", contact_role: "Office Manager", source: "google_business", stage: "new", score: "warm", est_value_usd: 2400, owner_id: created.user.id, industry: "Healthcare", suburb: "Milton Park" },
  ]);
  if (leadsError) throw leadsError;

  console.log("Seeding a contract + invoice for Old Mutual…");
  const oldMutual = customers.find((c) => c.company_name === "Old Mutual Zimbabwe")!;
  const { error: contractError } = await supabase.from("contracts").insert({
    customer_id: oldMutual.id,
    service_type: "Weekly office cleaning",
    monthly_usd: 4500,
    term_months: 12,
    starts_on: new Date().toISOString().slice(0, 10),
    status: "active",
  });
  if (contractError) throw contractError;

  console.log("\nDone. Log in with:");
  console.log(`  Email:    ${OWNER_EMAIL}`);
  console.log(`  Password: ${OWNER_PASSWORD}`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
