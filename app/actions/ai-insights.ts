"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * "Ask your business anything" — README.md's example questions, answered by
 * pattern-matching the question against a fixed set of real, RLS-scoped
 * queries. Not a live LLM (see lib/ai-insights/rules.ts header) — every
 * answer here is a real number from the database, not a generated guess.
 */
export async function askBusinessQuestion(question: string): Promise<string> {
  const q = question.toLowerCase();
  const supabase = await createClient();

  if (q.includes("quote") && (q.includes("close") || q.includes("win"))) {
    const { data } = await supabase.from("quotations").select("number, total_usd, customers(company_name)").in("status", ["sent", "negotiation", "awaiting_client"]).order("total_usd", { ascending: false }).limit(5);
    if (!data || data.length === 0) return "No quotations are currently awaiting a client decision.";
    return `Quotations most likely to close soon:\n${data.map((q) => `• ${q.number} — ${q.customers?.company_name ?? "—"} ($${q.total_usd.toFixed(2)})`).join("\n")}`;
  }

  if (q.includes("haven't ordered") || q.includes("hasn't ordered") || (q.includes("6 month") && q.includes("order"))) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const { data: recentInvoiceCustomerIds } = await supabase.from("invoices").select("customer_id").gte("issued_on", sixMonthsAgo.toISOString().slice(0, 10));
    const recentIds = new Set((recentInvoiceCustomerIds ?? []).map((r) => r.customer_id));
    const { data: customers } = await supabase.from("customers").select("company_name, id").eq("status", "active").is("deleted_at", null);
    const stale = (customers ?? []).filter((c) => !recentIds.has(c.id));
    if (stale.length === 0) return "Every active customer has been invoiced in the last 6 months.";
    return `Customers with no invoice in the last 6 months:\n${stale.map((c) => `• ${c.company_name}`).join("\n")}`;
  }

  if (q.includes("owe") || q.includes("debtor")) {
    const { data } = await supabase.from("invoices").select("total_usd, customers(company_name), payments(amount_usd)").in("status", ["sent", "part_paid", "overdue"]);
    const byCustomer = new Map<string, number>();
    for (const inv of data ?? []) {
      const paid = (inv.payments ?? []).reduce((s, p) => s + (p.amount_usd ?? 0), 0);
      const balance = inv.total_usd - paid;
      if (balance <= 0) continue;
      const name = inv.customers?.company_name ?? "—";
      byCustomer.set(name, (byCustomer.get(name) ?? 0) + balance);
    }
    const sorted = Array.from(byCustomer.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (sorted.length === 0) return "No outstanding balances — every customer is paid up.";
    return `Customers who owe money:\n${sorted.map(([name, amount]) => `• ${name} — $${amount.toFixed(2)}`).join("\n")}`;
  }

  if (q.includes("running low") || q.includes("stock") || q.includes("reorder")) {
    const { data: items } = await supabase.from("inventory_items").select("id, name, reorder_level, unit").is("deleted_at", null);
    const { data: movements } = await supabase.from("stock_movements").select("item_id, quantity");
    const onHand = new Map<string, number>();
    for (const m of movements ?? []) onHand.set(m.item_id ?? "", (onHand.get(m.item_id ?? "") ?? 0) + m.quantity);
    const low = (items ?? []).filter((i) => (i.reorder_level ?? 0) > 0 && (onHand.get(i.id) ?? 0) <= (i.reorder_level ?? 0));
    if (low.length === 0) return "Nothing is currently at or below its reorder level.";
    return `Running low:\n${low.map((i) => `• ${i.name} (${onHand.get(i.id) ?? 0} ${i.unit ?? ""} on hand)`).join("\n")}`;
  }

  if (q.includes("most jobs") || q.includes("completed most")) {
    const { data } = await supabase.from("jobs").select("supervisor_id, profiles(full_name)").eq("status", "completed");
    const counts = new Map<string, { name: string; count: number }>();
    for (const j of data ?? []) {
      if (!j.supervisor_id) continue;
      const name = j.profiles?.full_name ?? "—";
      const entry = counts.get(j.supervisor_id) ?? { name, count: 0 };
      entry.count += 1;
      counts.set(j.supervisor_id, entry);
    }
    const sorted = Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 5);
    if (sorted.length === 0) return "No completed jobs recorded yet.";
    return `Most jobs completed:\n${sorted.map((s) => `• ${s.name} — ${s.count} jobs`).join("\n")}`;
  }

  return "I can answer: which quotes will close, who hasn't ordered in 6 months, who owes money, what's running low, and who completed the most jobs. Try one of the suggested questions above.";
}
