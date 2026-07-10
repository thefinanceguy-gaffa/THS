import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Debtors" };

interface Row {
  customer: string;
  current: number;
  d30: number;
  d60: number;
  d90: number;
  total: number;
}

export default async function DebtorsPage() {
  const supabase = await createClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("total_usd, due_on, customer_id, customers(company_name), payments(amount_usd)")
    .in("status", ["sent", "part_paid", "overdue"])
    .is("deleted_at", null);

  const now = new Date();
  const byCustomer = new Map<string, Row>();

  for (const inv of invoices ?? []) {
    const paid = (inv.payments ?? []).reduce((s, p) => s + (p.amount_usd ?? 0), 0);
    const balance = inv.total_usd - paid;
    if (balance <= 0) continue;

    const name = inv.customers?.company_name ?? "—";
    const days = inv.due_on ? Math.floor((now.getTime() - new Date(inv.due_on).getTime()) / 86_400_000) : 0;

    const row = byCustomer.get(name) ?? { customer: name, current: 0, d30: 0, d60: 0, d90: 0, total: 0 };
    if (days <= 0) row.current += balance;
    else if (days <= 30) row.d30 += balance;
    else if (days <= 60) row.d60 += balance;
    else row.d90 += balance;
    row.total += balance;
    byCustomer.set(name, row);
  }

  const rows = Array.from(byCustomer.values()).sort((a, b) => b.total - a.total);
  const totals = rows.reduce(
    (acc, r) => ({ current: acc.current + r.current, d30: acc.d30 + r.d30, d60: acc.d60 + r.d60, d90: acc.d90 + r.d90, total: acc.total + r.total }),
    { current: 0, d30: 0, d60: 0, d90: 0, total: 0 }
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Debtors</h1>
        <p className="text-sm text-muted-foreground">Outstanding balances by customer, aged from due date.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card><CardContent><p className="text-lg font-bold">{formatMoney(totals.current)}</p><p className="text-xs text-muted-foreground">Current</p></CardContent></Card>
        <Card><CardContent><p className="text-lg font-bold">{formatMoney(totals.d30)}</p><p className="text-xs text-muted-foreground">1-30 days</p></CardContent></Card>
        <Card><CardContent><p className="text-lg font-bold">{formatMoney(totals.d60)}</p><p className="text-xs text-muted-foreground">31-60 days</p></CardContent></Card>
        <Card><CardContent><p className="text-lg font-bold text-red-700">{formatMoney(totals.d90)}</p><p className="text-xs text-muted-foreground">60+ days</p></CardContent></Card>
      </div>

      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Current</TableHead>
              <TableHead className="text-right">1-30</TableHead>
              <TableHead className="text-right">31-60</TableHead>
              <TableHead className="text-right">60+</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No outstanding balances.</TableCell></TableRow>}
            {rows.map((r) => (
              <TableRow key={r.customer}>
                <TableCell className="font-medium">{r.customer}</TableCell>
                <TableCell className="text-right">{formatMoney(r.current)}</TableCell>
                <TableCell className="text-right">{formatMoney(r.d30)}</TableCell>
                <TableCell className="text-right">{formatMoney(r.d60)}</TableCell>
                <TableCell className="text-right text-red-700">{formatMoney(r.d90)}</TableCell>
                <TableCell className="text-right font-bold">{formatMoney(r.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
