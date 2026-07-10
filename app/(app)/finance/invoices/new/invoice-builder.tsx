"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MaterialIcon } from "@/components/ui/material-icon";
import { formatMoney } from "@/lib/utils/format";
import { createInvoice } from "@/app/actions/finance";
import type { InvoiceLineInput } from "@/lib/validation/finance";

export function InvoiceBuilder({
  customers,
  contracts,
  defaultCustomerId,
}: {
  customers: { id: string; company_name: string }[];
  contracts: { id: string; number: string; customer_id: string | null; service_type: string | null; monthly_usd: number | null }[];
  defaultCustomerId?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? "");
  const [contractId, setContractId] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [lines, setLines] = useState<InvoiceLineInput[]>([{ description: "", quantity: 1, unit: "month", rate_usd: 0 }]);

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.rate_usd, 0);
    return { subtotal, vat: subtotal * 0.15, total: subtotal * 1.15 };
  }, [lines]);

  function updateLine(i: number, patch: Partial<InvoiceLineInput>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function applyContract(id: string) {
    setContractId(id);
    const contract = contracts.find((c) => c.id === id);
    if (contract) {
      setCustomerId(contract.customer_id ?? customerId);
      setLines([{ description: contract.service_type ?? "Monthly service fee", quantity: 1, unit: "month", rate_usd: contract.monthly_usd ?? 0 }]);
    }
  }

  function onSubmit() {
    if (!customerId) {
      toast.error("Select a customer.");
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.set("customer_id", customerId);
      if (contractId) formData.set("contract_id", contractId);
      if (dueOn) formData.set("due_on", dueOn);
      formData.set("lines", JSON.stringify(lines));

      const result = await createInvoice({ error: null }, formData);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">New Invoice</h1>
      <Card>
        <CardHeader><CardTitle>Bill to</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Customer *</Label>
            <Select value={customerId || undefined} onValueChange={(v) => setCustomerId(v ?? "")}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>From contract (optional)</Label>
            <Select value={contractId || undefined} onValueChange={(v) => applyContract(v ?? "")}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Ad-hoc" /></SelectTrigger>
              <SelectContent>{contracts.map((c) => <SelectItem key={c.id} value={c.id}>{c.number} — {c.service_type}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Due date</Label>
            <Input type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line items</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setLines((prev) => [...prev, { description: "", quantity: 1, unit: "", rate_usd: 0 }])}>
            <MaterialIcon name="add" className="text-[16px]" />Add line
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Description</TableHead><TableHead className="w-20">Qty</TableHead><TableHead className="w-24">Unit</TableHead><TableHead className="w-28 text-right">Rate</TableHead><TableHead className="w-10" /></TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line, i) => (
                <TableRow key={i}>
                  <TableCell><Input value={line.description} onChange={(e) => updateLine(i, { description: e.target.value })} /></TableCell>
                  <TableCell><Input type="number" min="0" value={line.quantity} onChange={(e) => updateLine(i, { quantity: e.target.valueAsNumber || 0 })} /></TableCell>
                  <TableCell><Input value={line.unit ?? ""} onChange={(e) => updateLine(i, { unit: e.target.value })} /></TableCell>
                  <TableCell><Input type="number" min="0" step="0.01" value={line.rate_usd} onChange={(e) => updateLine(i, { rate_usd: e.target.valueAsNumber || 0 })} className="text-right" /></TableCell>
                  <TableCell><Button variant="ghost" size="icon-sm" disabled={lines.length === 1} onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}><MaterialIcon name="delete" className="text-[16px]" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="ml-auto mt-4 max-w-xs space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoney(totals.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">VAT (15%)</span><span>{formatMoney(totals.vat)}</span></div>
            <div className="flex justify-between border-t border-border pt-1 text-base font-bold"><span>Total</span><span>{formatMoney(totals.total)}</span></div>
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button size="lg" disabled={isPending} onClick={onSubmit}>{isPending ? "Creating…" : "Create & send invoice"}</Button>
      </div>
    </div>
  );
}
