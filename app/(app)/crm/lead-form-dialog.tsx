"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { leadSchema, leadSources, leadScores, type LeadInput } from "@/lib/validation/leads";
import { SOURCE_LABELS, SCORE_LABELS } from "@/lib/crm/pipeline";
import { createLead, updateLead } from "@/app/actions/leads";
import type { Tables } from "@/lib/supabase/database.types";

const emptyValues: LeadInput = {
  company_name: "",
  contact_name: "",
  contact_role: "",
  phone: "",
  email: "",
  industry: "",
  suburb: "",
  company_size: "",
  service_required: "",
  source: "website",
  score: "warm",
  est_value_usd: 0,
  win_probability: 20,
  owner_id: "",
  next_followup_at: "",
};

function toDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

function leadToFormValues(lead: Tables<"leads"> | null): LeadInput {
  if (!lead) return emptyValues;
  return {
    company_name: lead.company_name,
    contact_name: lead.contact_name ?? "",
    contact_role: lead.contact_role ?? "",
    phone: lead.phone ?? "",
    email: lead.email ?? "",
    industry: lead.industry ?? "",
    suburb: lead.suburb ?? "",
    company_size: lead.company_size ?? "",
    service_required: lead.service_required ?? "",
    source: lead.source,
    score: lead.score as LeadInput["score"],
    est_value_usd: lead.est_value_usd,
    win_probability: lead.win_probability,
    owner_id: lead.owner_id ?? "",
    next_followup_at: toDateInput(lead.next_followup_at),
  };
}

export function LeadFormDialog({
  members,
  editing,
  open,
  onOpenChange,
}: {
  members: { id: string; name: string }[];
  editing: Tables<"leads"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<LeadInput>({ resolver: zodResolver(leadSchema), defaultValues: leadToFormValues(editing) });

  useEffect(() => {
    if (open) form.reset(leadToFormValues(editing));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  function onSubmit(values: LeadInput) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("company_name", values.company_name);
      if (values.contact_name) formData.set("contact_name", values.contact_name);
      if (values.contact_role) formData.set("contact_role", values.contact_role);
      if (values.phone) formData.set("phone", values.phone);
      if (values.email) formData.set("email", values.email);
      if (values.industry) formData.set("industry", values.industry);
      if (values.suburb) formData.set("suburb", values.suburb);
      if (values.company_size) formData.set("company_size", values.company_size);
      if (values.service_required) formData.set("service_required", values.service_required);
      formData.set("source", values.source);
      formData.set("score", values.score);
      formData.set("est_value_usd", String(values.est_value_usd ?? 0));
      formData.set("win_probability", String(values.win_probability ?? 0));
      if (values.owner_id) formData.set("owner_id", values.owner_id);
      if (values.next_followup_at) formData.set("next_followup_at", values.next_followup_at);

      const result = editing ? await updateLead(editing.id, { error: null }, formData) : await createLead({ error: null }, formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(editing ? "Lead updated." : "Lead created.");
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Lead" : "New Lead"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="company_name" render={({ field }) => (
                <FormItem><FormLabel>Company name *</FormLabel><FormControl><Input placeholder="e.g. Meikles Hotel" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="contact_name" render={({ field }) => (
                <FormItem><FormLabel>Contact person</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="contact_role" render={({ field }) => (
                <FormItem><FormLabel>Designation</FormLabel><FormControl><Input placeholder="e.g. Facilities Manager" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="source" render={({ field }) => (
                <FormItem>
                  <FormLabel>Lead source *</FormLabel>
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                    <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{leadSources.map((s) => <SelectItem key={s} value={s}>{SOURCE_LABELS[s]}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField control={form.control} name="industry" render={({ field }) => (
                <FormItem><FormLabel>Industry</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="suburb" render={({ field }) => (
                <FormItem><FormLabel>Suburb</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="company_size" render={({ field }) => (
                <FormItem><FormLabel>Company size</FormLabel><FormControl><Input placeholder="e.g. 51-200 staff" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="service_required" render={({ field }) => (
              <FormItem><FormLabel>Service required</FormLabel><FormControl><Textarea rows={2} {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="est_value_usd" render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated value (USD)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" value={field.value} onBlur={field.onBlur} name={field.name} ref={field.ref}
                      onChange={(e) => field.onChange(e.target.valueAsNumber || 0)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="win_probability" render={({ field }) => (
                <FormItem>
                  <FormLabel>Win probability (%)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" max="100" value={field.value} onBlur={field.onBlur} name={field.name} ref={field.ref}
                      onChange={(e) => field.onChange(e.target.valueAsNumber || 0)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField control={form.control} name="owner_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Lead owner</FormLabel>
                  <Select value={field.value || undefined} onValueChange={(v) => field.onChange(v ?? "")}>
                    <FormControl><SelectTrigger className="w-full"><SelectValue placeholder="You" /></SelectTrigger></FormControl>
                    <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="score" render={({ field }) => (
                <FormItem>
                  <FormLabel>Score</FormLabel>
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                    <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{leadScores.map((s) => <SelectItem key={s} value={s}>{SCORE_LABELS[s]}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="next_followup_at" render={({ field }) => (
                <FormItem><FormLabel>Next follow-up</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : editing ? "Save changes" : "Create lead"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
