"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MaterialIcon } from "@/components/ui/material-icon";
import { formatMoney } from "@/lib/utils/format";
import { VAT_RATE } from "@/lib/quotations/presentation";
import { createQuotation } from "@/app/actions/quotations";
import type { QuotationLineInput } from "@/lib/validation/quotations";

export function QuoteBuilder({
  customers,
  leads,
  defaultCustomerId,
  defaultLeadId,
  prefillServiceSummary,
}: {
  customers: { id: string; company_name: string }[];
  leads: { id: string; company_name: string }[];
  defaultCustomerId?: string;
  defaultLeadId?: string;
  prefillServiceSummary?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? "");
  const [leadId, setLeadId] = useState(defaultLeadId ?? "");
  const [serviceSummary, setServiceSummary] = useState(prefillServiceSummary ?? "");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [validUntil, setValidUntil] = useState("");
  const [lines, setLines] = useState<QuotationLineInput[]>([{ description: "", quantity: 1, unit: "visit", rate_usd: 0 }]);

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.rate_usd, 0);
    const discounted = subtotal - (subtotal * discountPercent) / 100;
    const vat = discounted * VAT_RATE;
    return { subtotal, vat, total: discounted + vat };
  }, [lines, discountPercent]);

  function updateLine(index: number, patch: Partial<QuotationLineInput>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, { description: "", quantity: 1, unit: "visit", rate_usd: 0 }]);
  }
  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function onSubmit() {
    if (!customerId && !leadId) {
      toast.error("Select a customer or a lead.");
      return;
    }
    if (lines.some((l) => !l.description.trim())) {
      toast.error("Every line needs a description.");
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      if (customerId) formData.set("customer_id", customerId);
      if (leadId) formData.set("lead_id", leadId);
      if (serviceSummary) formData.set("service_summary", serviceSummary);
      formData.set("discount_percent", String(discountPercent));
      if (validUntil) formData.set("valid_until", validUntil);
      formData.set("lines", JSON.stringify(lines));

      const result = await createQuotation({ error: null }, formData);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">New Quotation</h1>
        <p className="text-sm text-muted-foreground">Auto-approved under US$1,000; Operations Manager sign-off above that; Owner above US$5,000 or discounts over 15%.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Client</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <Select value={customerId || undefined} onValueChange={(v) => setCustomerId(v ?? "")}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select a customer" /></SelectTrigger>
              <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Or lead</Label>
            <Select value={leadId || undefined} onValueChange={(v) => setLeadId(v ?? "")}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select a lead" /></SelectTrigger>
              <SelectContent>{leads.map((l) => <SelectItem key={l.id} value={l.id}>{l.company_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Service summary</Label>
            <Textarea rows={2} value={serviceSummary} onChange={(e) => setServiceSummary(e.target.value)} placeholder="e.g. Weekly office cleaning, 3 floors" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Discount (%)</Label>
              <Input type="number" min="0" max="100" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.valueAsNumber || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label>Valid until</Label>
              <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line items</CardTitle>
          <Button variant="outline" size="sm" onClick={addLine}><MaterialIcon name="add" className="text-[16px]" />Add line</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="w-20">Qty</TableHead>
                <TableHead className="w-24">Unit</TableHead>
                <TableHead className="w-28 text-right">Rate (USD)</TableHead>
                <TableHead className="w-28 text-right">Amount</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line, i) => (
                <TableRow key={i}>
                  <TableCell><Input value={line.description} onChange={(e) => updateLine(i, { description: e.target.value })} placeholder="Weekly office cleaning" /></TableCell>
                  <TableCell><Input type="number" min="0" step="0.5" value={line.quantity} onChange={(e) => updateLine(i, { quantity: e.target.valueAsNumber || 0 })} /></TableCell>
                  <TableCell><Input value={line.unit ?? ""} onChange={(e) => updateLine(i, { unit: e.target.value })} /></TableCell>
                  <TableCell><Input type="number" min="0" step="0.01" value={line.rate_usd} onChange={(e) => updateLine(i, { rate_usd: e.target.valueAsNumber || 0 })} className="text-right" /></TableCell>
                  <TableCell className="text-right font-mono">{formatMoney(line.quantity * line.rate_usd)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" disabled={lines.length === 1} onClick={() => removeLine(i)}>
                      <MaterialIcon name="delete" className="text-[16px]" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="ml-auto mt-4 max-w-xs space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoney(totals.subtotal)}</span></div>
            {discountPercent > 0 && <div className="flex justify-between text-muted-foreground"><span>Discount ({discountPercent}%)</span><span>-{formatMoney((totals.subtotal * discountPercent) / 100)}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">VAT (15%)</span><span>{formatMoney(totals.vat)}</span></div>
            <div className="flex justify-between border-t border-border pt-1 text-base font-bold"><span>Total</span><span>{formatMoney(totals.total)}</span></div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" disabled={isPending} onClick={onSubmit}>{isPending ? "Creating…" : "Create quotation"}</Button>
      </div>
    </div>
  );
}
