import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ExpensesClient } from "./expenses-client";

export const metadata: Metadata = { title: "Expenses" };

export default async function ExpensesPage() {
  const supabase = await createClient();
  const { data: expenses } = await supabase.from("expenses").select("*").is("deleted_at", null).order("incurred_on", { ascending: false });

  return <ExpensesClient expenses={expenses ?? []} />;
}
