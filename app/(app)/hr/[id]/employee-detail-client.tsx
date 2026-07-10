"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MaterialIcon } from "@/components/ui/material-icon";
import { initials, formatDate } from "@/lib/utils/format";
import { employeeRecordTypes } from "@/lib/validation/supply-chain";
import { createEmployeeRecord } from "@/app/actions/supply-chain";
import type { Tables } from "@/lib/supabase/database.types";

const TYPE_LABELS: Record<string, string> = { leave: "Leave", attendance: "Attendance", training: "Training", review: "Review", disciplinary: "Disciplinary", contract: "Contract", ppe: "PPE", uniform: "Uniform" };
const TYPE_ICON: Record<string, string> = { leave: "beach_access", attendance: "event_available", training: "school", review: "rate_review", disciplinary: "gavel", contract: "description", ppe: "shield", uniform: "checkroom" };

export function EmployeeDetailClient({ profile, records, canManage }: { profile: Tables<"profiles">; records: Tables<"employee_records">[]; canManage: boolean }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<string>("training");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [effectiveOn, setEffectiveOn] = useState(new Date().toISOString().slice(0, 10));

  function onSubmit() {
    if (title.trim().length < 1) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("type", type);
      formData.set("title", title);
      if (detail) formData.set("detail", detail);
      formData.set("effective_on", effectiveOn);

      const result = await createEmployeeRecord(profile.id, { error: null }, formData);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Record added.");
        setTitle("");
        setDetail("");
        setOpen(false);
      }
    });
  }

  const ppeRecords = records.filter((r) => r.type === "ppe" || r.type === "uniform");
  const timeline = records.filter((r) => r.type !== "ppe" && r.type !== "uniform");

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Avatar className="size-12"><AvatarFallback className="text-base">{initials(profile.full_name)}</AvatarFallback></Avatar>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{profile.full_name}</h1>
          <p className="text-sm text-muted-foreground">{profile.job_title ?? profile.role} {profile.department ? `· ${profile.department}` : ""}</p>
        </div>
        {canManage && <Button onClick={() => setOpen(true)}><MaterialIcon name="add" className="text-[18px]" />Add record</Button>}
      </div>

      {ppeRecords.length > 0 && (
        <Card>
          <CardContent className="space-y-2">
            <p className="text-sm font-medium">PPE &amp; uniform register</p>
            {ppeRecords.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span>{r.title}</span>
                <span className="text-xs text-muted-foreground">{r.effective_on ? formatDate(r.effective_on) : "—"}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-3">
          <p className="text-sm font-medium">Employment record</p>
          {timeline.length === 0 && <p className="text-sm text-muted-foreground">No records yet.</p>}
          {timeline.map((r) => (
            <div key={r.id} className="flex gap-3 border-l-2 border-border pl-3">
              <MaterialIcon name={TYPE_ICON[r.type] ?? "event"} className="mt-0.5 text-[16px] text-muted-foreground" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{r.title}</span>
                  <Badge variant="outline" className="border-border text-[10px]">{TYPE_LABELS[r.type] ?? r.type}</Badge>
                </div>
                {r.detail && <p className="text-sm text-muted-foreground">{r.detail}</p>}
                <p className="text-xs text-muted-foreground">{r.effective_on ? formatDate(r.effective_on) : "—"}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add Record</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => v && setType(v)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{employeeRecordTypes.map((t) => <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Detail</Label><Textarea rows={2} value={detail} onChange={(e) => setDetail(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Effective date</Label><Input type="date" value={effectiveOn} onChange={(e) => setEffectiveOn(e.target.value)} /></div>
          </div>
          <DialogFooter><Button onClick={onSubmit} disabled={isPending}>{isPending ? "Saving…" : "Add record"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
