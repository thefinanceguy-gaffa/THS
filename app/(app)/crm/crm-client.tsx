"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MaterialIcon } from "@/components/ui/material-icon";
import { useMoney } from "@/stores/ui-store";
import { formatMoney, formatDate } from "@/lib/utils/format";
import { STAGE_LABELS, STAGE_DOT_COLORS, PIPELINE_STAGE_ORDER, SOURCE_LABELS, SCORE_LABELS, SCORE_DOT_COLORS, followUpUrgency, FOLLOW_UP_BADGE_CLASSES } from "@/lib/crm/pipeline";
import { LeadFormDialog } from "./lead-form-dialog";
import { LeadDetailDrawer } from "./lead-detail-drawer";
import { ChannelStrip } from "./channel-strip";
import type { Tables, LeadStage } from "@/lib/supabase/database.types";

type Lead = Tables<"leads">;
const KANBAN_COLUMNS: LeadStage[] = [...PIPELINE_STAGE_ORDER, "lost"];

function LeadCard({ lead, owner, onClick }: { lead: Lead; owner?: string; onClick: () => void }) {
  const { currency, fxRate } = useMoney();
  const urgency = followUpUrgency(lead.next_followup_at);
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full space-y-1.5 rounded-xl border border-border bg-card p-3 text-left text-sm shadow-sm transition hover:ring-1 hover:ring-foreground/20"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{lead.company_name}</span>
        <span className={`size-2 shrink-0 rounded-full ${SCORE_DOT_COLORS[lead.score] ?? "bg-muted-foreground"}`} title={SCORE_LABELS[lead.score]} />
      </div>
      {lead.contact_name && <div className="text-xs text-muted-foreground">{lead.contact_name}</div>}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <Badge variant="outline" className="border-border text-[10px]">{SOURCE_LABELS[lead.source]}</Badge>
        <span className="font-medium text-foreground">{formatMoney(lead.est_value_usd, currency, fxRate)}</span>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{lead.suburb ?? "—"}</span>
        {lead.next_followup_at && (
          <Badge variant="outline" className={`text-[10px] ${FOLLOW_UP_BADGE_CLASSES[urgency]}`}>{formatDate(lead.next_followup_at)}</Badge>
        )}
      </div>
      {owner && <div className="truncate text-xs text-muted-foreground">Owner: {owner}</div>}
    </button>
  );
}

export function CrmClient({ leads, members, canManage }: { leads: Lead[]; members: { id: string; name: string }[]; canManage: boolean }) {
  const searchParams = useSearchParams();
  const { currency, fxRate } = useMoney();
  const [view, setView] = useState<"pipeline" | "list">("pipeline");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(searchParams.get("lead"));

  const selectedLead = leads.find((l) => l.id === selectedLeadId) ?? null;
  const ownerName = (id: string | null) => members.find((m) => m.id === id)?.name;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) => l.company_name.toLowerCase().includes(q) || l.contact_name?.toLowerCase().includes(q) || l.phone?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q));
  }, [leads, query]);

  function openCreate() {
    setEditingLead(null);
    setFormOpen(true);
  }
  function openEdit(lead: Lead) {
    setEditingLead(lead);
    setFormOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">CRM &amp; Leads</h1>
        <p className="text-sm text-muted-foreground">Capture, qualify and track every enquiry from first contact through to Won.</p>
      </div>

      <ChannelStrip />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-muted-foreground" />
            <Input placeholder="Search leads…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
          </div>
          <Tabs value={view} onValueChange={(v) => v && setView(v as "pipeline" | "list")}>
            <TabsList>
              <TabsTrigger value="pipeline"><MaterialIcon name="view_kanban" className="text-[16px]" />Pipeline</TabsTrigger>
              <TabsTrigger value="list"><MaterialIcon name="list" className="text-[16px]" />List</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {canManage && (
          <Button size="lg" onClick={openCreate}>
            <MaterialIcon name="add" className="text-[18px]" />
            New Lead
          </Button>
        )}
      </div>

      {view === "pipeline" ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {KANBAN_COLUMNS.map((stage) => {
            const stageLeads = filtered.filter((l) => l.stage === stage);
            const total = stageLeads.reduce((sum, l) => sum + l.est_value_usd, 0);
            return (
              <div key={stage} className="w-72 shrink-0 space-y-2 rounded-xl bg-muted/50 p-3">
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${STAGE_DOT_COLORS[stage]}`} />
                  <span className="text-sm font-medium">{STAGE_LABELS[stage]}</span>
                  <Badge variant="secondary" className="text-[10px]">{stageLeads.length}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{formatMoney(total, currency, fxRate)}</div>
                <div className="space-y-2">
                  {stageLeads.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} owner={ownerName(lead.owner_id)} onClick={() => setSelectedLeadId(lead.id)} />
                  ))}
                  {stageLeads.length === 0 && <div className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">No leads</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company / Contact</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Next Follow-up</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">{leads.length === 0 ? "No leads yet." : "No leads match your search."}</TableCell></TableRow>
              )}
              {filtered.map((lead) => {
                const urgency = followUpUrgency(lead.next_followup_at);
                return (
                  <TableRow key={lead.id} className="cursor-pointer" onClick={() => setSelectedLeadId(lead.id)}>
                    <TableCell>
                      <div className="font-medium">{lead.company_name}</div>
                      {lead.contact_name && <div className="text-xs text-muted-foreground">{lead.contact_name}</div>}
                    </TableCell>
                    <TableCell><Badge variant="outline" className="border-border">{STAGE_LABELS[lead.stage]}</Badge></TableCell>
                    <TableCell className="text-right">{formatMoney(lead.est_value_usd, currency, fxRate)}</TableCell>
                    <TableCell className="text-muted-foreground">{SOURCE_LABELS[lead.source]}</TableCell>
                    <TableCell className="text-muted-foreground">{ownerName(lead.owner_id) ?? "Unassigned"}</TableCell>
                    <TableCell>
                      {lead.next_followup_at ? <Badge variant="outline" className={FOLLOW_UP_BADGE_CLASSES[urgency]}>{formatDate(lead.next_followup_at)}</Badge> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {canManage && <LeadFormDialog members={members} editing={editingLead} open={formOpen} onOpenChange={setFormOpen} />}
      <LeadDetailDrawer
        lead={selectedLead}
        members={members}
        canManage={canManage}
        onOpenChange={(open) => !open && setSelectedLeadId(null)}
        onEdit={(lead) => {
          setSelectedLeadId(null);
          openEdit(lead);
        }}
      />
    </div>
  );
}
