"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { MaterialIcon } from "@/components/ui/material-icon";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { useMoney } from "@/stores/ui-store";
import { formatMoney, formatDateTime, formatDate } from "@/lib/utils/format";
import {
  STAGE_LABELS,
  ALL_STAGES,
  SOURCE_LABELS,
  SCORE_LABELS,
  SCORE_DOT_COLORS,
  BANT_LABELS,
  CHANNEL_LABELS,
  followUpUrgency,
  FOLLOW_UP_BADGE_CLASSES,
} from "@/lib/crm/pipeline";
import { communicationSchema, communicationChannels, type CommunicationInput } from "@/lib/validation/leads";
import { moveLeadStage, logLeadCommunication, updateLeadBant, convertLeadToCustomer } from "@/app/actions/leads";
import { createClient } from "@/lib/supabase/client";
import type { Tables, LeadStage } from "@/lib/supabase/database.types";

const BANT_ROWS: { field: "bant_budget" | "bant_authority" | "bant_need" | "bant_timeline"; label: string }[] = [
  { field: "bant_budget", label: "Budget" },
  { field: "bant_authority", label: "Authority" },
  { field: "bant_need", label: "Need" },
  { field: "bant_timeline", label: "Timeline" },
];

export function LeadDetailDrawer({
  lead,
  members,
  canManage,
  onOpenChange,
  onEdit,
}: {
  lead: Tables<"leads"> | null;
  members: { id: string; name: string }[];
  canManage: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (lead: Tables<"leads">) => void;
}) {
  const { currency, fxRate } = useMoney();
  const [isPending, startTransition] = useTransition();
  const [comms, setComms] = useState<Tables<"communications">[]>([]);
  const [loadingComms, setLoadingComms] = useState(false);
  const [displayLead, setDisplayLead] = useState<Tables<"leads"> | null>(lead);
  const [form, setForm] = useState<CommunicationInput>({ channel: "call", direction: "outbound", title: "", note: "", client_response: "", next_followup_at: "" });
  const leadId = lead?.id;

  useEffect(() => {
    if (lead) setDisplayLead(lead);
  }, [lead]);

  useEffect(() => {
    if (!leadId) {
      setComms([]);
      return;
    }
    let cancelled = false;
    setLoadingComms(true);
    createClient()
      .from("communications")
      .select("*")
      .eq("lead_id", leadId)
      .order("occurred_at", { ascending: false })
      .then(({ data }) => {
        if (!cancelled) {
          setComms(data ?? []);
          setLoadingComms(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  function refetchComms() {
    if (!leadId) return;
    createClient()
      .from("communications")
      .select("*")
      .eq("lead_id", leadId)
      .order("occurred_at", { ascending: false })
      .then(({ data }) => setComms(data ?? []));
  }

  if (!displayLead) return null;
  const current = displayLead;

  const owner = members.find((m) => m.id === current.owner_id);
  const urgency = followUpUrgency(current.next_followup_at);
  const daysOpen = Math.max(0, Math.round((Date.now() - new Date(current.created_at).getTime()) / 86_400_000));

  function onStageChange(stage: string) {
    startTransition(async () => {
      const result = await moveLeadStage(current.id, stage as LeadStage);
      if (result?.error) toast.error(result.error);
      else toast.success(`Moved to ${STAGE_LABELS[stage as LeadStage]}.`);
    });
  }

  function onBantChange(field: (typeof BANT_ROWS)[number]["field"], value: "yes" | "no" | "unknown") {
    startTransition(async () => {
      const result = await updateLeadBant(current.id, field, value);
      if (result?.error) toast.error(result.error);
    });
  }

  function onConvert() {
    startTransition(async () => {
      const result = await convertLeadToCustomer(current.id);
      if (result?.error) toast.error(result.error);
      else toast.success("Converted to Active Client — see Customers.");
    });
  }

  function onLogCommunication() {
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
      if (parsed.data.next_followup_at) formData.set("next_followup_at", parsed.data.next_followup_at);

      const result = await logLeadCommunication(current.id, { error: null }, formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Communication logged.");
        setForm({ channel: "call", direction: "outbound", title: "", note: "", client_response: "", next_followup_at: "" });
        refetchComms();
      }
    });
  }

  return (
    <Sheet open={!!lead} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto bg-[#0d1b34] p-0 text-white sm:max-w-lg">
        <SheetHeader className="border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-white/20 text-white">{STAGE_LABELS[current.stage]}</Badge>
            <Badge variant="outline" className="gap-1 border-white/20 text-white">
              <span className={`size-1.5 rounded-full ${SCORE_DOT_COLORS[current.score] ?? "bg-white/40"}`} />
              {SCORE_LABELS[current.score] ?? current.score}
            </Badge>
          </div>
          <SheetTitle className="text-white">{current.company_name}</SheetTitle>
          <SheetDescription className="text-white/60">
            {current.industry ?? "—"} · {current.suburb ?? "—"}
          </SheetDescription>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-white/[0.06] p-2">
              <div className="text-sm font-semibold">{formatMoney(current.est_value_usd, currency, fxRate)}</div>
              <div className="text-[11px] text-white/50">Est. value</div>
            </div>
            <div className="rounded-lg bg-white/[0.06] p-2">
              <div className="text-sm font-semibold">{current.win_probability}%</div>
              <div className="text-[11px] text-white/50">Win prob.</div>
            </div>
            <div className="rounded-lg bg-white/[0.06] p-2">
              <div className="text-sm font-semibold">{daysOpen}</div>
              <div className="text-[11px] text-white/50">Days open</div>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5 bg-background p-4 text-foreground">
          <div className="flex flex-wrap gap-2">
            {canManage && (
              <Button variant="outline" size="sm" render={<Link href={`/quotations/new?leadId=${current.id}`} />}>
                <MaterialIcon name="request_quote" className="text-[16px]" />
                Generate Quote
              </Button>
            )}
            <WhatsAppButton phone={current.phone} message={`Hi ${current.contact_name ?? ""}, this is The Hygiene Squad.`} />
            {canManage && current.stage === "won" && !current.customer_id && (
              <Button size="sm" disabled={isPending} onClick={onConvert}>
                Convert to Client
              </Button>
            )}
            {current.customer_id && (
              <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
                Converted to client
              </Badge>
            )}
            {canManage && (
              <Button variant="ghost" size="sm" onClick={() => onEdit(current)}>
                <MaterialIcon name="edit" className="text-[16px]" />
                Edit
              </Button>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground">Pipeline stage</div>
            {canManage ? (
              <Select value={current.stage} onValueChange={(v) => v && onStageChange(v)}>
                <SelectTrigger className="w-full" disabled={isPending}><SelectValue /></SelectTrigger>
                <SelectContent>{ALL_STAGES.map((s) => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}</SelectContent>
              </Select>
            ) : (
              <Badge variant="outline" className="border-border">{STAGE_LABELS[current.stage]}</Badge>
            )}
          </div>

          <div className="space-y-1.5 rounded-lg border border-border p-3 text-sm">
            <div className="font-medium">Contact details</div>
            <div className="grid grid-cols-2 gap-1 text-muted-foreground">
              <span>{current.contact_name ?? "—"}{current.contact_role ? ` · ${current.contact_role}` : ""}</span>
              <span>Source: {SOURCE_LABELS[current.source]}</span>
              <span>Phone: {current.phone ?? "—"}</span>
              <span>Email: {current.email ?? "—"}</span>
            </div>
            {current.service_required && <div className="text-muted-foreground">Service required: {current.service_required}</div>}
          </div>

          <div className="space-y-1.5 rounded-lg border border-border p-3 text-sm">
            <div className="font-medium">Follow-up cadence</div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last contacted</span>
              <span>{current.last_contacted_at ? formatDateTime(current.last_contacted_at) : "Never"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Next follow-up</span>
              <Badge variant="outline" className={FOLLOW_UP_BADGE_CLASSES[urgency]}>
                {current.next_followup_at ? formatDate(current.next_followup_at) : "Not scheduled"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Owner</span>
              <span>{owner?.name ?? "Unassigned"}</span>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
            <div className="font-medium">BANT qualification</div>
            {BANT_ROWS.map(({ field, label }) => (
              <div key={field} className="flex items-center justify-between">
                <span className="text-muted-foreground">{label}</span>
                <div className="flex gap-1">
                  {(["yes", "unknown", "no"] as const).map((v) => (
                    <Button key={v} type="button" size="sm" variant={current[field] === v ? "secondary" : "ghost"} disabled={isPending || !canManage} onClick={() => onBantChange(field, v)}>
                      {BANT_LABELS[v]}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {canManage && (
            <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
              <div className="font-medium">Log activity</div>
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
              <div className="flex items-center gap-2">
                <Input type="date" className="flex-1" value={form.next_followup_at} onChange={(e) => setForm((f) => ({ ...f, next_followup_at: e.target.value }))} />
                <Button size="sm" disabled={isPending} onClick={onLogCommunication}>Log</Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-sm font-medium">Communication log</div>
            {loadingComms && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!loadingComms && comms.length === 0 && <p className="text-sm text-muted-foreground">No activity logged yet.</p>}
            <div className="space-y-2">
              {comms.map((c) => (
                <div key={c.id} className="rounded-lg border border-border p-2.5 text-sm">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {CHANNEL_LABELS[c.channel] ?? c.channel} · {c.direction}
                      {c.title ? ` · ${c.title}` : ""}
                    </span>
                    <span>{formatDateTime(c.occurred_at)}</span>
                  </div>
                  {c.note && <p className="mt-1">{c.note}</p>}
                  {c.client_response && <p className="mt-1 border-l-2 border-emerald-400 pl-2 text-muted-foreground italic">&ldquo;{c.client_response}&rdquo;</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
