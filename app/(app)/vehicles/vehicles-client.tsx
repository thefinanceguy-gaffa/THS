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
import { createVehicle } from "@/app/actions/supply-chain";
import type { Tables } from "@/lib/supabase/database.types";

type Vehicle = Tables<"vehicles"> & { teamName: string | null };

const STATUS_BADGE: Record<string, string> = {
  available: "border-emerald-300 bg-emerald-50 text-emerald-800",
  in_use: "border-blue-300 bg-blue-50 text-blue-800",
  maintenance: "border-amber-300 bg-amber-50 text-amber-800",
};

export function VehiclesClient({ vehicles }: { vehicles: Vehicle[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [registration, setRegistration] = useState("");
  const [kind, setKind] = useState("");
  const [year, setYear] = useState<number | "">("");

  function onSubmit() {
    if (name.trim().length < 1 || registration.trim().length < 2) {
      toast.error("Enter a name and registration.");
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("registration", registration);
      if (kind) formData.set("kind", kind);
      if (year) formData.set("year", String(year));

      const result = await createVehicle({ error: null }, formData);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Vehicle added.");
        setName("");
        setRegistration("");
        setOpen(false);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-semibold">Vehicles</h1><p className="text-sm text-muted-foreground">Fleet used to deliver cleaning services.</p></div>
        <Button size="lg" onClick={() => setOpen(true)}><MaterialIcon name="add" className="text-[18px]" />New Vehicle</Button>
      </div>

      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader><TableRow><TableHead>Vehicle</TableHead><TableHead>Registration</TableHead><TableHead>Team</TableHead><TableHead className="text-right">Mileage (km)</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {vehicles.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No vehicles yet.</TableCell></TableRow>}
            {vehicles.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.name} {v.kind ? `(${v.kind})` : ""}</TableCell>
                <TableCell className="font-mono text-muted-foreground">{v.registration}</TableCell>
                <TableCell className="text-muted-foreground">{v.teamName ?? "Unassigned"}</TableCell>
                <TableCell className="text-right">{v.mileage_km ?? "—"}</TableCell>
                <TableCell><Badge variant="outline" className={STATUS_BADGE[v.status] ?? "border-border"}>{v.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>New Vehicle</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Van 3" /></div>
            <div className="space-y-1.5"><Label>Registration *</Label><Input value={registration} onChange={(e) => setRegistration(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Kind</Label><Input value={kind} onChange={(e) => setKind(e.target.value)} placeholder="Van / Truck" /></div>
              <div className="space-y-1.5"><Label>Year</Label><Input type="number" value={year} onChange={(e) => setYear(e.target.valueAsNumber || "")} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={onSubmit} disabled={isPending}>{isPending ? "Adding…" : "Add vehicle"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
