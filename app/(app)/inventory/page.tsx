import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { InventoryClient } from "./inventory-client";

export const metadata: Metadata = { title: "Inventory" };

export default async function InventoryPage() {
  const supabase = await createClient();
  const [{ data: items }, { data: movements }] = await Promise.all([
    supabase.from("inventory_items").select("*").is("deleted_at", null).order("name"),
    supabase.from("stock_movements").select("item_id, quantity"),
  ]);

  const onHand = new Map<string, number>();
  for (const m of movements ?? []) {
    onHand.set(m.item_id ?? "", (onHand.get(m.item_id ?? "") ?? 0) + m.quantity);
  }

  return <InventoryClient items={(items ?? []).map((i) => ({ ...i, onHand: onHand.get(i.id) ?? 0 }))} />;
}
