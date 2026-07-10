import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAppSession } from "@/lib/session/get-app-session";
import { ProcurementClient } from "./procurement-client";

export const metadata: Metadata = { title: "Procurement" };

export default async function ProcurementPage() {
  const session = await getAppSession();
  if (!session) return null;

  const supabase = await createClient();
  const [{ data: purchaseOrders }, { data: suppliers }] = await Promise.all([
    supabase.from("purchase_orders").select("*, suppliers(name)").is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("suppliers").select("id, name").is("deleted_at", null).order("name"),
  ]);

  return (
    <ProcurementClient
      purchaseOrders={(purchaseOrders ?? []).map((po) => ({ ...po, supplierName: po.suppliers?.name ?? "—" }))}
      suppliers={suppliers ?? []}
      isOwner={session.profile.role === "owner"}
    />
  );
}
