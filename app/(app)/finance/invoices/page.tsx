import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAppSession } from "@/lib/session/get-app-session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MaterialIcon } from "@/components/ui/material-icon";
import { formatDate } from "@/lib/utils/format";
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_BADGE } from "@/lib/finance/presentation";

export const metadata: Metadata = { title: "Invoicing" };

export default async function InvoicesPage() {
  const session = await getAppSession();
  if (!session) return null;

  const supabase = await createClient();
  const { data: invoices } = await supabase.from("invoices").select("*, customers(company_name)").is("deleted_at", null).order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Invoicing</h1>
          <p className="text-sm text-muted-foreground">Bill customers and track what&apos;s outstanding.</p>
        </div>
        <Button size="lg" render={<Link href="/finance/invoices/new" />}><MaterialIcon name="add" className="text-[18px]" />New Invoice</Button>
      </div>
      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(invoices ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No invoices yet.</TableCell></TableRow>}
            {(invoices ?? []).map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-mono font-medium"><Link href={`/finance/invoices/${inv.id}`} className="hover:underline">{inv.number}</Link></TableCell>
                <TableCell>{inv.customers?.company_name ?? "—"}</TableCell>
                <TableCell className="text-right">${inv.total_usd.toFixed(2)}</TableCell>
                <TableCell className="text-muted-foreground">{inv.due_on ? formatDate(inv.due_on) : "—"}</TableCell>
                <TableCell><Badge variant="outline" className={INVOICE_STATUS_BADGE[inv.status]}>{INVOICE_STATUS_LABELS[inv.status]}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
