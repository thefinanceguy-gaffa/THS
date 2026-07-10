import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, formatDateTime } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage() {
  const supabase = await createClient();
  const { data: payments } = await supabase
    .from("payments")
    .select("*, customers(company_name), invoices(number)")
    .order("paid_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Payments</h1>
        <p className="text-sm text-muted-foreground">Every payment received, with its receipt and allocation.</p>
      </div>
      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(payments ?? []).length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No payments recorded yet.</TableCell></TableRow>}
            {(payments ?? []).map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono">{p.receipt_number}</TableCell>
                <TableCell>{p.customers?.company_name ?? "—"}</TableCell>
                <TableCell className="font-mono text-muted-foreground">{p.invoices?.number ?? <Badge variant="outline" className="border-border">Unallocated</Badge>}</TableCell>
                <TableCell className="text-right">{formatMoney(p.amount_usd ?? 0)}</TableCell>
                <TableCell className="text-muted-foreground">{p.method}</TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(p.paid_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
