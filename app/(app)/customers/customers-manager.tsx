"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { MaterialIcon } from "@/components/ui/material-icon";
import { useMoney } from "@/stores/ui-store";
import { formatMoney } from "@/lib/utils/format";
import { customerSchema, customerSegments, type CustomerInput } from "@/lib/validation/customers";
import { createCustomer } from "@/app/actions/customers";
import type { Tables } from "@/lib/supabase/database.types";

const emptyValues: CustomerInput = { company_name: "", industry: "", suburb: "", address: "", segment: "", account_owner_id: "", monthly_value_usd: 0, status: "active" };

const STATUS_BADGE: Record<string, string> = {
  active: "border-emerald-300 bg-emerald-50 text-emerald-800",
  at_risk: "border-amber-300 bg-amber-50 text-amber-800",
  inactive: "border-border bg-muted text-muted-foreground",
};

export function CustomersManager({ customers, members, canManage }: { customers: Tables<"customers">[]; members: { id: string; name: string }[]; canManage: boolean }) {
  const router = useRouter();
  const { currency, fxRate } = useMoney();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const form = useForm<CustomerInput>({ resolver: zodResolver(customerSchema), defaultValues: emptyValues });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => c.company_name.toLowerCase().includes(q) || c.industry?.toLowerCase().includes(q) || c.suburb?.toLowerCase().includes(q));
  }, [customers, query]);

  function onSubmit(values: CustomerInput) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("company_name", values.company_name);
      if (values.industry) formData.set("industry", values.industry);
      if (values.suburb) formData.set("suburb", values.suburb);
      if (values.address) formData.set("address", values.address);
      if (values.segment) formData.set("segment", values.segment);
      if (values.account_owner_id) formData.set("account_owner_id", values.account_owner_id);
      formData.set("monthly_value_usd", String(values.monthly_value_usd ?? 0));
      formData.set("status", values.status);

      const result = await createCustomer({ error: null }, formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Customer created.");
        form.reset(emptyValues);
        setOpen(false);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-muted-foreground" />
          <Input placeholder="Search customers…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
        {canManage && (
          <Button size="lg" onClick={() => setOpen(true)}>
            <MaterialIcon name="add" className="text-[18px]" />
            New Customer
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Industry / Suburb</TableHead>
              <TableHead>Segment</TableHead>
              <TableHead className="text-right">Monthly Value</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">{customers.length === 0 ? "No customers yet." : "No matches."}</TableCell></TableRow>}
            {filtered.map((c) => (
              <TableRow key={c.id} className="cursor-pointer" onClick={() => router.push(`/customers/${c.id}`)}>
                <TableCell className="font-medium">{c.company_name}</TableCell>
                <TableCell className="text-muted-foreground">{c.industry ?? "—"} · {c.suburb ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{c.segment ?? "—"}</TableCell>
                <TableCell className="text-right">{formatMoney(c.monthly_value_usd, currency, fxRate)}</TableCell>
                <TableCell><Badge variant="outline" className={STATUS_BADGE[c.status] ?? "border-border"}>{c.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>New Customer</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="company_name" render={({ field }) => (
                <FormItem><FormLabel>Company name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="industry" render={({ field }) => (
                  <FormItem><FormLabel>Industry</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="suburb" render={({ field }) => (
                  <FormItem><FormLabel>Suburb</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="segment" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Segment</FormLabel>
                    <Select value={field.value || undefined} onValueChange={(v) => field.onChange(v ?? "")}>
                      <FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                      <SelectContent>{customerSegments.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="monthly_value_usd" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly value (USD)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" value={field.value} onBlur={field.onBlur} name={field.name} ref={field.ref}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="account_owner_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Account owner</FormLabel>
                  <Select value={field.value || undefined} onValueChange={(v) => field.onChange(v ?? "")}>
                    <FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Unassigned" /></SelectTrigger></FormControl>
                    <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="submit" disabled={isPending}>{isPending ? "Creating…" : "Create customer"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
