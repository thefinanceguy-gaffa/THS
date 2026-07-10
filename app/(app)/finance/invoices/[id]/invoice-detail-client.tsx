"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MaterialIcon } from "@/components/ui/material-icon";
import { formatMoney, formatDate, formatDateTime } from "@/lib/utils/format";
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_BADGE } from "@/lib/finance/presentation";
import { paymentMethods } from "@/lib/validation/finance";
import { recordPayment } from "@/app/actions/finance";
import type { Tables } from "@/lib/supabase/database.types";

type Invoice = Tables<"invoices"> & { customers: { company_name: string; address: string | null; suburb: string | null } | null };

export function InvoiceDetailClient({ invoice, lines, payments, clientName, clientAddress }: { invoice: Invoice; lines: Tables<"invoice_lines">[]; payments: Tables<"payments">[]; clientName: string; clientAddress?: string }) {
  const [payOpen, setPayOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState(invoice.total_usd - payments.reduce((s, p) => s + (p.amount_usd ?? 0), 0));
  const [method, setMethod] = useState<string>("EFT");
  const balance = invoice.total_usd - payments.reduce((s, p) => s + (p.amount_usd ?? 0), 0);

  function onRecordPayment() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("invoice_id", invoice.id);
      formData.set("customer_id", invoice.customer_id ?? "");
      formData.set("amount_usd", String(amount));
      formData.set("method", method);
      const result = await recordPayment({ error: null }, formData);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Payment recorded.");
        setPayOpen(false);
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" render={<Link href="/finance/invoices" />}><MaterialIcon name="arrow_back" className="text-[16px]" />Invoices</Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}><MaterialIcon name="picture_as_pdf" className="text-[16px]" />Print / PDF</Button>
          {balance > 0 && <Button size="sm" onClick={() => setPayOpen(true)}>Record payment</Button>}
        </div>
      </div>

      <Card>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="font-mono text-lg font-bold">{invoice.number}</p>
            <Badge variant="outline" className={INVOICE_STATUS_BADGE[invoice.status]}>{INVOICE_STATUS_LABELS[invoice.status]}</Badge>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold">{formatMoney(balance)}</p>
            <p className="text-xs text-muted-foreground">Balance owing</p>
          </div>
        </CardContent>
      </Card>

      <Card className="print:shadow-none">
        <CardContent className="space-y-6 p-8">
          <div className="flex items-start justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-10 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#2f6bff] to-[#1b56d6]"><MaterialIcon name="cleaning_services" className="text-white" /></div>
              <div><p className="font-bold">The Hygiene Squad</p><p className="text-xs text-muted-foreground">Harare, Zimbabwe</p></div>
            </div>
            <div className="text-right"><p className="text-lg font-bold">INVOICE</p><p className="font-mono text-sm text-muted-foreground">{invoice.number}</p></div>
          </div>
          <div className="flex justify-between text-sm">
            <div><p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Bill to</p><p className="font-medium">{clientName}</p>{clientAddress && <p className="text-muted-foreground">{clientAddress}</p>}</div>
            <div className="text-right"><p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Due</p><p>{invoice.due_on ? formatDate(invoice.due_on) : "—"}</p></div>
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Description</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>{line.description}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{line.quantity} {line.unit}</TableCell>
                  <TableCell className="text-right">{formatMoney(line.rate_usd ?? 0)}</TableCell>
                  <TableCell className="text-right">{formatMoney((line.quantity ?? 0) * (line.rate_usd ?? 0))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow><TableCell colSpan={3} className="text-right text-muted-foreground">Subtotal</TableCell><TableCell className="text-right">{formatMoney(invoice.subtotal_usd)}</TableCell></TableRow>
              <TableRow><TableCell colSpan={3} className="text-right text-muted-foreground">VAT (15%)</TableCell><TableCell className="text-right">{formatMoney(invoice.vat_usd)}</TableCell></TableRow>
              <TableRow><TableCell colSpan={3} className="text-right text-base font-bold">Total</TableCell><TableCell className="text-right text-base font-bold">{formatMoney(invoice.total_usd)}</TableCell></TableRow>
            </TableFooter>
          </Table>
          <p className="border-t border-border pt-4 text-xs text-muted-foreground">Bank: CBZ Bank, Acc 1234567890 · EcoCash: *151*2*1# Merchant Code 12345. Payment due by the date above.</p>
        </CardContent>
      </Card>

      {payments.length > 0 && (
        <Card>
          <CardContent className="space-y-2">
            <p className="text-sm font-medium">Payments</p>
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="font-mono text-muted-foreground">{p.receipt_number}</span>
                <span>{p.method}</span>
                <span className="font-medium">{formatMoney(p.amount_usd ?? 0)}</span>
                <span className="text-xs text-muted-foreground">{formatDateTime(p.paid_at)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Amount (USD)</Label><Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.valueAsNumber || 0)} /></div>
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select value={method} onValueChange={(v) => v && setMethod(v)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{paymentMethods.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={onRecordPayment} disabled={isPending}>{isPending ? "Recording…" : "Record payment"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
