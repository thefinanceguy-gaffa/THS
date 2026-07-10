"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MaterialIcon } from "@/components/ui/material-icon";
import { formatMoney } from "@/lib/utils/format";
import { createPurchaseOrder, decidePurchaseOrder, markPoDelivered } from "@/app/actions/supply-chain";
import type { Tables } from "@/lib/supabase/database.types";

type PO = Tables<"purchase_orders"> & { supplierName: string };

const STATUS_BADGE: Record<string, string> = {
  draft: "border-border bg-muted text-muted-foreground",
  pending_approval: "border-purple-300 bg-purple-50 text-purple-800",
  approved: "border-blue-300 bg-blue-50 text-blue-800",
  delivered: "border-emerald-300 bg-emerald-50 text-emerald-800",
};

export function ProcurementClient({ purchaseOrders, suppliers, isOwner }: { purchaseOrders: PO[]; suppliers: { id: string; name: string }[]; isOwner: boolean }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [supplierId, setSupplierId] = useState("");
  const [amount, setAmount] = useState(0);

  function onCreate() {
    if (!supplierId || amount <= 0) {
      toast.error("Select a supplier and enter an amount.");
      return;
    }
    startTransition(async () => {
      const result = await createPurchaseOrder(supplierId, amount);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Purchase order raised.");
        setAmount(0);
        setOpen(false);
      }
    });
  }

  function onDecide(poId: string, approve: boolean) {
    startTransition(async () => {
      const result = await decidePurchaseOrder(poId, approve);
      if (result?.error) toast.error(result.error);
    });
  }

  function onDeliver(poId: string) {
    startTransition(async () => {
      const result = await markPoDelivered(poId);
      if (result?.error) toast.error(result.error);
      else toast.success("Marked delivered.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-semibold">Procurement</h1><p className="text-sm text-muted-foreground">Purchase orders and approvals.</p></div>
        <Button size="lg" onClick={() => setOpen(true)}><MaterialIcon name="add" className="text-[18px]" />New Purchase Order</Button>
      </div>

      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader><TableRow><TableHead>PO #</TableHead><TableHead>Supplier</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {purchaseOrders.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No purchase orders yet.</TableCell></TableRow>}
            {purchaseOrders.map((po) => (
              <TableRow key={po.id}>
                <TableCell className="font-mono font-medium">{po.number}</TableCell>
                <TableCell>{po.supplierName}</TableCell>
                <TableCell className="text-right">{formatMoney(po.amount_usd ?? 0)}</TableCell>
                <TableCell><Badge variant="outline" className={STATUS_BADGE[po.status] ?? "border-border"}>{po.status.replace("_", " ")}</Badge></TableCell>
                <TableCell className="text-right">
                  {isOwner && po.status === "pending_approval" && (
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" className="border-red-300 text-red-700" disabled={isPending} onClick={() => onDecide(po.id, false)}>Reject</Button>
                      <Button size="sm" disabled={isPending} onClick={() => onDecide(po.id, true)}>Approve</Button>
                    </div>
                  )}
                  {po.status === "approved" && <Button size="sm" variant="outline" disabled={isPending} onClick={() => onDeliver(po.id)}>Mark delivered</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Supplier *</Label>
              <Select value={supplierId || undefined} onValueChange={(v) => setSupplierId(v ?? "")}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Amount (USD) *</Label><Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.valueAsNumber || 0)} /></div>
          </div>
          <DialogFooter><Button onClick={onCreate} disabled={isPending}>{isPending ? "Raising…" : "Raise PO"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
