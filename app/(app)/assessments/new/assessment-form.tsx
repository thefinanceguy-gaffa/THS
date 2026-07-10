"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MaterialIcon } from "@/components/ui/material-icon";
import { createAssessment } from "@/app/actions/assessments";
import type { AssessmentAreaInput } from "@/lib/validation/assessments";

export function AssessmentForm({
  customers,
  leads,
  members,
  defaultCustomerId,
  defaultLeadId,
}: {
  customers: { id: string; company_name: string }[];
  leads: { id: string; company_name: string; suburb: string | null }[];
  members: { id: string; name: string }[];
  defaultCustomerId?: string;
  defaultLeadId?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? "");
  const [leadId, setLeadId] = useState(defaultLeadId ?? "");
  const [siteName, setSiteName] = useState("");
  const [suburb, setSuburb] = useState(leads.find((l) => l.id === defaultLeadId)?.suburb ?? "");
  const [assessorId, setAssessorId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [recommendedCrew, setRecommendedCrew] = useState("");
  const [serviceWindow, setServiceWindow] = useState("");
  const [estMonthly, setEstMonthly] = useState(0);
  const [risks, setRisks] = useState("");
  const [areas, setAreas] = useState<AssessmentAreaInput[]>([{ area_name: "", size_m2: 0, surface: "", frequency: "", effort: "" }]);

  const totalArea = useMemo(() => areas.reduce((sum, a) => sum + a.size_m2, 0), [areas]);

  function updateArea(i: number, patch: Partial<AssessmentAreaInput>) {
    setAreas((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  }

  function onSubmit() {
    if (!customerId && !leadId) {
      toast.error("Select a customer or a lead.");
      return;
    }
    if (siteName.trim().length < 2) {
      toast.error("Enter a site name.");
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      if (customerId) formData.set("customer_id", customerId);
      if (leadId) formData.set("lead_id", leadId);
      formData.set("site_name", siteName);
      if (suburb) formData.set("suburb", suburb);
      if (assessorId) formData.set("assessor_id", assessorId);
      if (scheduledAt) formData.set("scheduled_at", scheduledAt);
      if (recommendedCrew) formData.set("recommended_crew", recommendedCrew);
      if (serviceWindow) formData.set("service_window", serviceWindow);
      formData.set("est_monthly_usd", String(estMonthly));
      if (risks) formData.set("risks", risks);
      formData.set("areas", JSON.stringify(areas));

      const result = await createAssessment({ error: null }, formData);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">New Site Assessment</h1>

      <Card>
        <CardHeader><CardTitle>Site</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <Select value={customerId || undefined} onValueChange={(v) => setCustomerId(v ?? "")}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Or lead</Label>
            <Select value={leadId || undefined} onValueChange={(v) => setLeadId(v ?? "")}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{leads.map((l) => <SelectItem key={l.id} value={l.id}>{l.company_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Site name *</Label>
            <Input value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="e.g. Old Mutual HQ" />
          </div>
          <div className="space-y-1.5">
            <Label>Suburb</Label>
            <Input value={suburb} onChange={(e) => setSuburb(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Assessor</Label>
            <Select value={assessorId || undefined} onValueChange={(v) => setAssessorId(v ?? "")}>
              <SelectTrigger className="w-full"><SelectValue placeholder="You" /></SelectTrigger>
              <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Scheduled date</Label>
            <Input type="date" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Areas surveyed</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setAreas((prev) => [...prev, { area_name: "", size_m2: 0, surface: "", frequency: "", effort: "" }])}>
            <MaterialIcon name="add" className="text-[16px]" />
            Add area
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Area</TableHead>
                <TableHead className="w-24">Size (m²)</TableHead>
                <TableHead>Surface</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Effort</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {areas.map((a, i) => (
                <TableRow key={i}>
                  <TableCell><Input value={a.area_name} onChange={(e) => updateArea(i, { area_name: e.target.value })} placeholder="Lobby" /></TableCell>
                  <TableCell><Input type="number" min="0" value={a.size_m2} onChange={(e) => updateArea(i, { size_m2: e.target.valueAsNumber || 0 })} /></TableCell>
                  <TableCell><Input value={a.surface ?? ""} onChange={(e) => updateArea(i, { surface: e.target.value })} placeholder="Tile" /></TableCell>
                  <TableCell><Input value={a.frequency ?? ""} onChange={(e) => updateArea(i, { frequency: e.target.value })} placeholder="Daily" /></TableCell>
                  <TableCell><Input value={a.effort ?? ""} onChange={(e) => updateArea(i, { effort: e.target.value })} placeholder="Medium" /></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" disabled={areas.length === 1} onClick={() => setAreas((prev) => prev.filter((_, idx) => idx !== i))}>
                      <MaterialIcon name="delete" className="text-[16px]" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-2 text-right text-sm text-muted-foreground">Total area: {totalArea.toLocaleString()} m²</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recommendation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Recommended crew</Label>
              <Input value={recommendedCrew} onChange={(e) => setRecommendedCrew(e.target.value)} placeholder="e.g. 4-person team" />
            </div>
            <div className="space-y-1.5">
              <Label>Service window</Label>
              <Input value={serviceWindow} onChange={(e) => setServiceWindow(e.target.value)} placeholder="e.g. Mon/Wed/Fri, 06:00-09:00" />
            </div>
            <div className="space-y-1.5">
              <Label>Est. monthly cost (USD)</Label>
              <Input type="number" min="0" value={estMonthly} onChange={(e) => setEstMonthly(e.target.valueAsNumber || 0)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Risks &amp; special requirements</Label>
            <Textarea rows={2} value={risks} onChange={(e) => setRisks(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" disabled={isPending} onClick={onSubmit}>{isPending ? "Saving…" : "Save assessment"}</Button>
      </div>
    </div>
  );
}
