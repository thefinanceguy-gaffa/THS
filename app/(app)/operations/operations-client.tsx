"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { MaterialIcon } from "@/components/ui/material-icon";
import { formatDateTime } from "@/lib/utils/format";
import { JOB_BOARD_COLUMNS, JOB_STATUS_LABELS, JOB_STATUS_BADGE, PRIORITY_BADGE } from "@/lib/operations/presentation";
import { jobPriorities, jobSchema, type JobInput } from "@/lib/validation/jobs";
import { createJob, updateJobStatus, createTeam } from "@/app/actions/jobs";
import type { Tables, JobStatus } from "@/lib/supabase/database.types";

type Job = Tables<"jobs"> & { clientName: string };

const emptyJob: JobInput = { customer_id: "", contract_id: "", site_address: "", suburb: "", service_type: "", team_id: "", supervisor_id: "", priority: "normal", scheduled_start: "", scheduled_end: "" };

function WeekTimeline({ jobs }: { jobs: Job[] }) {
  const days = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const count = jobs.filter((j) => j.scheduled_start && new Date(j.scheduled_start).toDateString() === d.toDateString()).length;
      return { date: d, count };
    });
  }, [jobs]);
  const max = Math.max(1, ...days.map((d) => d.count));
  const today = new Date().toDateString();

  return (
    <div className="flex items-end gap-2 rounded-xl border border-border bg-card p-4">
      {days.map((d) => (
        <div key={d.date.toISOString()} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-xs font-medium">{d.count}</span>
          <div className="flex h-20 w-full items-end">
            <div className={`w-full rounded-t ${d.date.toDateString() === today ? "bg-primary" : "bg-muted"}`} style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? "8px" : "2px" }} />
          </div>
          <span className="text-[10px] text-muted-foreground">{d.date.toLocaleDateString("en-US", { weekday: "short" })}</span>
        </div>
      ))}
    </div>
  );
}

function CreateJobDialog({
  open,
  onOpenChange,
  customers,
  teams,
  members,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  customers: { id: string; company_name: string }[];
  teams: Tables<"teams">[];
  members: { id: string; name: string; role: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<JobInput>(emptyJob);
  const supervisors = members.filter((m) => ["supervisor", "ops_manager", "owner"].includes(m.role));

  function onSubmit() {
    const parsed = jobSchema.safeParse(values);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.set("customer_id", parsed.data.customer_id);
      formData.set("site_address", parsed.data.site_address);
      if (parsed.data.suburb) formData.set("suburb", parsed.data.suburb);
      if (parsed.data.service_type) formData.set("service_type", parsed.data.service_type);
      if (parsed.data.team_id) formData.set("team_id", parsed.data.team_id);
      if (parsed.data.supervisor_id) formData.set("supervisor_id", parsed.data.supervisor_id);
      formData.set("priority", parsed.data.priority);
      formData.set("scheduled_start", parsed.data.scheduled_start);
      if (parsed.data.scheduled_end) formData.set("scheduled_end", parsed.data.scheduled_end);

      const result = await createJob({ error: null }, formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Job scheduled.");
        setValues(emptyJob);
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>New Job</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Customer *</Label>
            <Select value={values.customer_id || undefined} onValueChange={(v) => setValues((f) => ({ ...f, customer_id: v ?? "" }))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Site address *</Label>
            <Input value={values.site_address} onChange={(e) => setValues((f) => ({ ...f, site_address: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Suburb</Label>
              <Input value={values.suburb} onChange={(e) => setValues((f) => ({ ...f, suburb: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Service type</Label>
              <Input value={values.service_type} onChange={(e) => setValues((f) => ({ ...f, service_type: e.target.value }))} placeholder="e.g. Weekly cleaning" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Team</Label>
              <Select value={values.team_id || undefined} onValueChange={(v) => setValues((f) => ({ ...f, team_id: v ?? "" }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>{teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Supervisor</Label>
              <Select value={values.supervisor_id || undefined} onValueChange={(v) => setValues((f) => ({ ...f, supervisor_id: v ?? "" }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>{supervisors.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={values.priority} onValueChange={(v) => v && setValues((f) => ({ ...f, priority: v as JobInput["priority"] }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{jobPriorities.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Start *</Label>
              <Input type="datetime-local" value={values.scheduled_start} onChange={(e) => setValues((f) => ({ ...f, scheduled_start: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>End</Label>
              <Input type="datetime-local" value={values.scheduled_end} onChange={(e) => setValues((f) => ({ ...f, scheduled_end: e.target.value }))} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onSubmit} disabled={isPending}>{isPending ? "Scheduling…" : "Schedule job"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function JobDetailSheet({ job, onOpenChange, canManage }: { job: Job | null; onOpenChange: (o: boolean) => void; canManage: boolean }) {
  const [isPending, startTransition] = useTransition();

  function advance(status: JobStatus) {
    if (!job) return;
    startTransition(async () => {
      const result = await updateJobStatus(job.id, status);
      if (result?.error) toast.error(result.error);
    });
  }

  if (!job) return null;

  const nextStatus: Partial<Record<JobStatus, JobStatus>> = { scheduled: "en_route", en_route: "in_progress", in_progress: "completed" };

  return (
    <Sheet open={!!job} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto bg-[#0d1b34] p-0 text-white sm:max-w-md">
        <SheetHeader className="border-b border-white/10 pb-4">
          <Badge variant="outline" className={`w-fit ${JOB_STATUS_BADGE[job.status]}`}>{JOB_STATUS_LABELS[job.status]}</Badge>
          <SheetTitle className="font-mono text-white">{job.number}</SheetTitle>
          <SheetDescription className="text-white/60">{job.clientName} · {job.site_address}</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 bg-background p-4 text-foreground">
          <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${job.progress}%` }} /></div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">Service:</span> {job.service_type ?? "—"}</div>
            <div><span className="text-muted-foreground">Priority:</span> <Badge variant="outline" className={PRIORITY_BADGE[job.priority]}>{job.priority}</Badge></div>
            <div><span className="text-muted-foreground">Start:</span> {job.scheduled_start ? formatDateTime(job.scheduled_start) : "—"}</div>
            <div><span className="text-muted-foreground">End:</span> {job.scheduled_end ? formatDateTime(job.scheduled_end) : "—"}</div>
          </div>
          {canManage && job.status !== "completed" && job.status !== "cancelled" && (
            <div className="flex gap-2">
              {nextStatus[job.status] && (
                <Button size="sm" disabled={isPending} onClick={() => advance(nextStatus[job.status]!)}>
                  Move to {JOB_STATUS_LABELS[nextStatus[job.status]!]}
                </Button>
              )}
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => advance("cancelled")}>Cancel job</Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function OperationsClient({
  jobs,
  customers,
  teams,
  members,
  canManage,
}: {
  jobs: Job[];
  customers: { id: string; company_name: string }[];
  teams: Tables<"teams">[];
  members: { id: string; name: string; role: string }[];
  canManage: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [teamName, setTeamName] = useState("");
  const [isPending, startTransition] = useTransition();

  function onAddTeam() {
    if (teamName.trim().length < 2) return;
    startTransition(async () => {
      const result = await createTeam(teamName);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Team added.");
        setTeamName("");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Scheduling</h1>
          <p className="text-sm text-muted-foreground">Deploy teams and monitor jobs.</p>
        </div>
        {canManage && (
          <Button size="lg" onClick={() => setCreateOpen(true)}>
            <MaterialIcon name="add" className="text-[18px]" />
            New Job
          </Button>
        )}
      </div>

      <WeekTimeline jobs={jobs} />

      {canManage && teams.length === 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-border p-3 text-sm">
          <span className="text-muted-foreground">No teams yet —</span>
          <Input className="h-8 max-w-48" placeholder="Team name" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
          <Button size="sm" disabled={isPending} onClick={onAddTeam}>Add team</Button>
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-2">
        {JOB_BOARD_COLUMNS.map((status) => {
          const columnJobs = jobs.filter((j) => j.status === status);
          return (
            <div key={status} className="w-72 shrink-0 space-y-2 rounded-xl bg-muted/50 p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{JOB_STATUS_LABELS[status]}</span>
                <Badge variant="secondary" className="text-[10px]">{columnJobs.length}</Badge>
              </div>
              <div className="space-y-2">
                {columnJobs.map((job) => (
                  <button key={job.id} type="button" onClick={() => setSelectedJob(job)} className="w-full space-y-1 rounded-xl border border-border bg-card p-3 text-left text-sm shadow-sm hover:ring-1 hover:ring-foreground/20">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-medium">{job.number}</span>
                      <Badge variant="outline" className={`text-[10px] ${PRIORITY_BADGE[job.priority]}`}>{job.priority}</Badge>
                    </div>
                    <div className="font-medium">{job.clientName}</div>
                    <div className="text-xs text-muted-foreground">{job.site_address}</div>
                    <div className="text-xs text-muted-foreground">{job.scheduled_start ? formatDateTime(job.scheduled_start) : "—"}</div>
                  </button>
                ))}
                {columnJobs.length === 0 && <div className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">No jobs</div>}
              </div>
            </div>
          );
        })}
      </div>

      <CreateJobDialog open={createOpen} onOpenChange={setCreateOpen} customers={customers} teams={teams} members={members} />
      <JobDetailSheet job={selectedJob} onOpenChange={(o) => !o && setSelectedJob(null)} canManage={canManage} />
    </div>
  );
}
