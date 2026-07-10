"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { MaterialIcon } from "@/components/ui/material-icon";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { useMoney } from "@/stores/ui-store";
import { formatMoney, formatDateTime } from "@/lib/utils/format";
import { CHANNEL_LABELS } from "@/lib/crm/pipeline";
import { contactSchema, type ContactInput } from "@/lib/validation/customers";
import { communicationSchema, communicationChannels, type CommunicationInput } from "@/lib/validation/leads";
import { createContact, logCustomerCommunication } from "@/app/actions/customers";
import type { Tables } from "@/lib/supabase/database.types";

const STATUS_BADGE: Record<string, string> = {
  active: "border-emerald-300 bg-emerald-50 text-emerald-800",
  at_risk: "border-amber-300 bg-amber-50 text-amber-800",
  inactive: "border-border bg-muted text-muted-foreground",
};

function AddContactDialog({ customerId, open, onOpenChange }: { customerId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<ContactInput>({ resolver: zodResolver(contactSchema), defaultValues: { full_name: "", role_title: "", phone: "", email: "", is_primary: false } });

  function onSubmit(values: ContactInput) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("full_name", values.full_name);
      if (values.role_title) formData.set("role_title", values.role_title);
      if (values.phone) formData.set("phone", values.phone);
      if (values.email) formData.set("email", values.email);
      if (values.is_primary) formData.set("is_primary", "on");

      const result = await createContact(customerId, { error: null }, formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Contact added.");
        form.reset({ full_name: "", role_title: "", phone: "", email: "", is_primary: false });
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="full_name" render={({ field }) => (
              <FormItem><FormLabel>Full name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="role_title" render={({ field }) => (
              <FormItem><FormLabel>Role</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="is_primary" render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-2">
                <FormControl><Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} /></FormControl>
                <FormLabel className="font-normal">Primary contact</FormLabel>
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="submit" disabled={isPending}>{isPending ? "Adding…" : "Add contact"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function CustomerDetailClient({
  customer,
  contacts,
  communications,
  canManage,
}: {
  customer: Tables<"customers">;
  contacts: Tables<"contacts">[];
  communications: Tables<"communications">[];
  canManage: boolean;
}) {
  const { currency, fxRate } = useMoney();
  const [isPending, startTransition] = useTransition();
  const [contactOpen, setContactOpen] = useState(false);
  const [form, setForm] = useState<CommunicationInput>({ channel: "call", direction: "outbound", title: "", note: "", client_response: "", next_followup_at: "" });

  function onLog() {
    const parsed = communicationSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.set("channel", parsed.data.channel);
      formData.set("direction", parsed.data.direction);
      if (parsed.data.title) formData.set("title", parsed.data.title);
      if (parsed.data.note) formData.set("note", parsed.data.note);
      if (parsed.data.client_response) formData.set("client_response", parsed.data.client_response);

      const result = await logCustomerCommunication(customer.id, { error: null }, formData);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Logged.");
        setForm({ channel: "call", direction: "outbound", title: "", note: "", client_response: "", next_followup_at: "" });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{customer.company_name}</h1>
            <Badge variant="outline" className={STATUS_BADGE[customer.status] ?? "border-border"}>{customer.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{customer.industry ?? "—"} · {customer.suburb ?? "—"} {customer.segment ? `· ${customer.segment}` : ""}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{formatMoney(customer.monthly_value_usd, currency, fxRate)}</p>
          <p className="text-xs text-muted-foreground">Monthly value</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Contacts</CardTitle>
            {canManage && <Button variant="ghost" size="icon-sm" onClick={() => setContactOpen(true)}><MaterialIcon name="person_add" className="text-[16px]" /></Button>}
          </CardHeader>
          <CardContent className="space-y-2">
            {contacts.length === 0 && <p className="text-sm text-muted-foreground">No contacts yet.</p>}
            {contacts.map((c) => (
              <div key={c.id} className="rounded-lg border border-border p-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{c.full_name}</span>
                  {c.is_primary && <Badge variant="outline" className="border-border text-[10px]">Primary</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{c.role_title ?? "—"}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{c.phone ?? "—"}</span>
                  <WhatsAppButton phone={c.phone} message={`Hi ${c.full_name}, this is The Hygiene Squad.`} label="" size="icon-xs" variant="ghost" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Communication log</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {canManage && (
              <div className="space-y-2 rounded-lg border border-border p-3">
                <div className="grid grid-cols-2 gap-2">
                  <Select value={form.channel} onValueChange={(v) => v && setForm((f) => ({ ...f, channel: v as CommunicationInput["channel"] }))}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{communicationChannels.map((c) => <SelectItem key={c} value={c}>{CHANNEL_LABELS[c]}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={form.direction} onValueChange={(v) => v && setForm((f) => ({ ...f, direction: v as "inbound" | "outbound" }))}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outbound">Outbound</SelectItem>
                      <SelectItem value="inbound">Inbound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea placeholder="What happened…" rows={2} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
                <Textarea placeholder="Client's response (optional)" rows={2} value={form.client_response} onChange={(e) => setForm((f) => ({ ...f, client_response: e.target.value }))} />
                <div className="flex justify-end">
                  <Button size="sm" disabled={isPending} onClick={onLog}>Log</Button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              {communications.length === 0 && <p className="text-sm text-muted-foreground">No activity logged yet.</p>}
              {communications.map((c) => (
                <div key={c.id} className="rounded-lg border border-border p-2.5 text-sm">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{CHANNEL_LABELS[c.channel] ?? c.channel} · {c.direction}{c.title ? ` · ${c.title}` : ""}</span>
                    <span>{formatDateTime(c.occurred_at)}</span>
                  </div>
                  {c.note && <p className="mt-1">{c.note}</p>}
                  {c.client_response && <p className="mt-1 border-l-2 border-emerald-400 pl-2 text-muted-foreground italic">&ldquo;{c.client_response}&rdquo;</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <AddContactDialog customerId={customer.id} open={contactOpen} onOpenChange={setContactOpen} />
    </div>
  );
}
