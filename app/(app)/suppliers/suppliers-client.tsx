"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MaterialIcon } from "@/components/ui/material-icon";
import { createSupplier } from "@/app/actions/supply-chain";
import type { Tables } from "@/lib/supabase/database.types";

export function SuppliersClient({ suppliers }: { suppliers: Tables<"suppliers">[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [suburb, setSuburb] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");

  function onSubmit() {
    if (name.trim().length < 2) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", name);
      if (category) formData.set("category", category);
      if (suburb) formData.set("suburb", suburb);
      if (paymentTerms) formData.set("payment_terms", paymentTerms);

      const result = await createSupplier({ error: null }, formData);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Supplier added.");
        setName("");
        setOpen(false);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-semibold">Suppliers</h1><p className="text-sm text-muted-foreground">Vendors that supply chemicals, equipment and consumables.</p></div>
        <Button size="lg" onClick={() => setOpen(true)}><MaterialIcon name="add" className="text-[18px]" />New Supplier</Button>
      </div>

      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Suburb</TableHead><TableHead>Terms</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {suppliers.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No suppliers yet.</TableCell></TableRow>}
            {suppliers.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="text-muted-foreground">{s.category ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{s.suburb ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{s.payment_terms ?? "—"}</TableCell>
                <TableCell><Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">{s.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>New Supplier</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Category</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Suburb</Label><Input value={suburb} onChange={(e) => setSuburb(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Payment terms</Label><Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="e.g. 30 days" /></div>
          </div>
          <DialogFooter><Button onClick={onSubmit} disabled={isPending}>{isPending ? "Adding…" : "Add supplier"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
