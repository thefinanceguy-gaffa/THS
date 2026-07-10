"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MaterialIcon } from "@/components/ui/material-icon";
import { formatMoney } from "@/lib/utils/format";
import { createInventoryItem, adjustStock } from "@/app/actions/supply-chain";
import type { Tables } from "@/lib/supabase/database.types";

type Item = Tables<"inventory_items"> & { onHand: number };

function AdjustDialog({ item, onOpenChange }: { item: Item | null; onOpenChange: (o: boolean) => void }) {
  const [isPending, startTransition] = useTransition();
  const [qty, setQty] = useState(0);
  const [reference, setReference] = useState("");

  function onSubmit() {
    if (!item || qty === 0) return;
    startTransition(async () => {
      const result = await adjustStock(item.id, qty, reference || "Manual adjustment");
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Stock adjusted.");
        setQty(0);
        setReference("");
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Adjust — {item?.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Quantity (negative to remove)</Label><Input type="number" value={qty} onChange={(e) => setQty(e.target.valueAsNumber || 0)} /></div>
          <div className="space-y-1.5"><Label>Reference / reason</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. Stock take variance" /></div>
        </div>
        <DialogFooter><Button onClick={onSubmit} disabled={isPending || qty === 0}>{isPending ? "Saving…" : "Adjust"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddItemDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("");
  const [reorderLevel, setReorderLevel] = useState(0);

  function onSubmit() {
    if (name.trim().length < 2) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", name);
      if (category) formData.set("category", category);
      if (unit) formData.set("unit", unit);
      formData.set("reorder_level", String(reorderLevel));

      const result = await createInventoryItem({ error: null }, formData);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Item added.");
        setName("");
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>New Inventory Item</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Category</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Chemicals / Consumables / Equipment / PPE" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Unit</Label><Input value={unit} onChange={(e) => setUnit(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Reorder level</Label><Input type="number" min="0" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.valueAsNumber || 0)} /></div>
          </div>
        </div>
        <DialogFooter><Button onClick={onSubmit} disabled={isPending}>{isPending ? "Adding…" : "Add item"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function InventoryClient({ items }: { items: Item[] }) {
  const [addOpen, setAddOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<Item | null>(null);
  const lowStock = items.filter((i) => (i.reorder_level ?? 0) > 0 && i.onHand <= (i.reorder_level ?? 0));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Inventory</h1>
          <p className="text-sm text-muted-foreground">Chemicals, consumables, equipment and PPE.</p>
        </div>
        <Button size="lg" onClick={() => setAddOpen(true)}><MaterialIcon name="add" className="text-[18px]" />New Item</Button>
      </div>

      {lowStock.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex items-center gap-2 text-sm text-amber-800">
            <MaterialIcon name="warning" className="text-[18px]" />
            {lowStock.length} item{lowStock.length > 1 ? "s" : ""} at or below reorder level: {lowStock.map((i) => i.name).join(", ")}
          </CardContent>
        </Card>
      )}

      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Category</TableHead><TableHead className="text-right">On hand</TableHead><TableHead className="text-right">Reorder level</TableHead><TableHead className="text-right">Unit cost</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
          <TableBody>
            {items.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No inventory items yet.</TableCell></TableRow>}
            {items.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.name}</TableCell>
                <TableCell className="text-muted-foreground">{i.category ?? "—"}</TableCell>
                <TableCell className="text-right">
                  {i.onHand} {i.unit}
                  {(i.reorder_level ?? 0) > 0 && i.onHand <= (i.reorder_level ?? 0) && <Badge variant="outline" className="ml-2 border-amber-300 bg-amber-50 text-amber-800">Low</Badge>}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">{i.reorder_level ?? "—"}</TableCell>
                <TableCell className="text-right text-muted-foreground">{i.unit_cost_usd ? formatMoney(i.unit_cost_usd) : "—"}</TableCell>
                <TableCell><Button variant="ghost" size="icon-sm" onClick={() => setAdjustItem(i)}><MaterialIcon name="tune" className="text-[16px]" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AddItemDialog open={addOpen} onOpenChange={setAddOpen} />
      <AdjustDialog item={adjustItem} onOpenChange={(o) => !o && setAdjustItem(null)} />
    </div>
  );
}
