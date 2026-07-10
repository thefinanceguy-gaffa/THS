import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { VehiclesClient } from "./vehicles-client";

export const metadata: Metadata = { title: "Vehicles" };

export default async function VehiclesPage() {
  const supabase = await createClient();
  const { data: vehicles } = await supabase.from("vehicles").select("*, teams(name)").is("deleted_at", null).order("name");

  return <VehiclesClient vehicles={(vehicles ?? []).map((v) => ({ ...v, teamName: v.teams?.name ?? null }))} />;
}
