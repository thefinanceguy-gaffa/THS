"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MaterialIcon } from "@/components/ui/material-icon";
import { useMoney } from "@/stores/ui-store";
import { formatMoney, formatDate } from "@/lib/utils/format";
import { createContract } from "@/app/actions/finance";
import type { Tables } from "@/lib/supabase/database.types";

type Contract = Tables<"contracts"> & { clientName: string };

export function ContractsClient({ contracts, customers, canManage }: { contracts: Contract[]; customers: { id: string; company_name: string }[]; canManage: boolean }) {
  const { currency, fxRate } = useMoney();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [customerId, setCustomerId] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [monthly, setMonthly] = useState(0);
  const [term, setTerm] = useState(12);
  const [startsOn, setStartsOn] = useState("");
  const [autoRenew, setAutoRenew] = useState(true);

  function onSubmit() {
    if (!customerId || serviceType.trim().length < 2 || !startsOn) {
      toast.error("Fill in customer, service type, and start date.");
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.set("customer_id", customerId);
      formData.set("service_type", serviceType);
      formData.set("monthly_usd", String(monthly));
      formData.set("term_months", String(term));
      formData.set("starts_on", startsOn);
      if (autoRenew) formData.set("auto_renew", "on");

      const result = await createContract({ error: null }, formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Contract created.");
        setOpen(false);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Contracts</h1>
          <p className="text-sm text-muted-foreground">Recurring service agreements and renewal dates.</p>
        </div>
        {canManage && <Button size="lg" onClick={() => setOpen(true)}><MaterialIcon name="add" className="text-[18px]" />New Contract</Button>}
      </div>

      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contract #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Service</TableHead>
              <TableHead className="text-right">Monthly</TableHead>
              <TableHead>Renews</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No contracts yet.</TableCell></TableRow>}
            {contracts.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono font-medium">{c.number}</TableCell>
                <TableCell>{c.clientName}</TableCell>
                <TableCell className="text-muted-foreground">{c.service_type}</TableCell>
                <TableCell className="text-right">{formatMoney(c.monthly_usd ?? 0, currency, fxRate)}</TableCell>
                <TableCell className="text-muted-foreground">{c.renews_on ? formatDate(c.renews_on) : "—"}</TableCell>
                <TableCell><Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">{c.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Contract</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Customer *</Label>
              <Select value={customerId || undefined} onValueChange={(v) => setCustomerId(v ?? "")}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Service type *</Label>
              <Input value={serviceType} onChange={(e) => setServiceType(e.target.value)} placeholder="e.g. Weekly office cleaning" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Monthly value (USD)</Label>
                <Input type="number" min="0" value={monthly} onChange={(e) => setMonthly(e.target.valueAsNumber || 0)} />
              </div>
              <div className="space-y-1.5">
                <Label>Term (months)</Label>
                <Input type="number" min="1" value={term} onChange={(e) => setTerm(e.target.valueAsNumber || 12)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Start date *</Label>
              <Input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={autoRenew} onCheckedChange={(c) => setAutoRenew(c === true)} />
              Auto-renew
            </label>
          </div>
          <DialogFooter>
            <Button onClick={onSubmit} disabled={isPending}>{isPending ? "Creating…" : "Create contract"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
