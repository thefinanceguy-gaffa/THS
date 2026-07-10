"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MaterialIcon } from "@/components/ui/material-icon";
import { formatMoney, formatDate } from "@/lib/utils/format";
import { expenseCategories } from "@/lib/validation/finance";
import { createExpense } from "@/app/actions/finance";
import type { Tables } from "@/lib/supabase/database.types";

export function ExpensesClient({ expenses }: { expenses: Tables<"expenses">[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [category, setCategory] = useState<string>("Fuel");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [incurredOn, setIncurredOn] = useState(new Date().toISOString().slice(0, 10));

  const monthTotal = useMemo(() => {
    const now = new Date();
    return expenses.filter((e) => new Date(e.incurred_on).getMonth() === now.getMonth() && new Date(e.incurred_on).getFullYear() === now.getFullYear()).reduce((s, e) => s + e.amount_usd, 0);
  }, [expenses]);

  function onSubmit() {
    if (amount <= 0) {
      toast.error("Enter an amount.");
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.set("category", category);
      if (description) formData.set("description", description);
      formData.set("amount_usd", String(amount));
      formData.set("incurred_on", incurredOn);

      const result = await createExpense({ error: null }, formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Expense recorded.");
        setDescription("");
        setAmount(0);
        setOpen(false);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Expenses</h1>
          <p className="text-sm text-muted-foreground">Operating costs captured against the business.</p>
        </div>
        <Button size="lg" onClick={() => setOpen(true)}><MaterialIcon name="add" className="text-[18px]" />New Expense</Button>
      </div>

      <Card><CardContent><p className="text-xl font-bold">{formatMoney(monthTotal)}</p><p className="text-xs text-muted-foreground">This month</p></CardContent></Card>

      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
          <TableBody>
            {expenses.length === 0 && <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No expenses recorded yet.</TableCell></TableRow>}
            {expenses.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-muted-foreground">{formatDate(e.incurred_on)}</TableCell>
                <TableCell>{e.category}</TableCell>
                <TableCell className="text-muted-foreground">{e.description ?? "—"}</TableCell>
                <TableCell className="text-right">{formatMoney(e.amount_usd)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>New Expense</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{expenseCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Amount (USD)</Label><Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.valueAsNumber || 0)} /></div>
            <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={incurredOn} onChange={(e) => setIncurredOn(e.target.value)} /></div>
          </div>
          <DialogFooter><Button onClick={onSubmit} disabled={isPending}>{isPending ? "Saving…" : "Save expense"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
