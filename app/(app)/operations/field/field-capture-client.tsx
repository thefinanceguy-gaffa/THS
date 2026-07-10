"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { MaterialIcon } from "@/components/ui/material-icon";
import { formatDateTime } from "@/lib/utils/format";
import { JOB_STATUS_LABELS } from "@/lib/operations/presentation";
import { updateJobStatus } from "@/app/actions/jobs";
import { enqueueJobEvent, pendingCount, onOutboxChange, flush } from "@/lib/offline/sync-engine";
import { SignaturePad } from "./signature-pad";
import type { Tables, Json } from "@/lib/supabase/database.types";

type Job = Tables<"jobs"> & { clientName: string };

const CHECKLIST_ITEMS = ["Vacuum/sweep floors", "Mop hard surfaces", "Empty bins", "Clean restrooms", "Wipe surfaces & desks", "Restock consumables"];

function OfflineBadge() {
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const refresh = () => void pendingCount().then(setPending);
    refresh();
    const unsub = onOutboxChange(refresh);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      unsub();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (pending === 0 && online) return null;

  return (
    <div className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
      <span className="flex items-center gap-1.5">
        <MaterialIcon name={online ? "cloud_sync" : "cloud_off"} className="text-[16px]" />
        {online ? `Syncing… ${pending} queued` : `Offline — ${pending} queued, will sync when back online`}
      </span>
      {online && pending > 0 && <Button size="sm" variant="ghost" onClick={() => void flush()}>Sync now</Button>}
    </div>
  );
}

function JobCard({ job }: { job: Job }) {
  const [checkedIn, setCheckedIn] = useState(false);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [chemical, setChemical] = useState("");
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  async function capture(type: string, payload: Json | null) {
    await enqueueJobEvent({
      jobId: job.id,
      type,
      payload,
      gpsLat: gps?.lat ?? null,
      gpsLng: gps?.lng ?? null,
      clientGeneratedId: `${job.id}-${type}-${Date.now()}`,
      createdAt: new Date().toISOString(),
    });
    toast.success(navigator.onLine ? "Captured." : "Saved offline — will sync.");
  }

  async function onCheckIn() {
    setCheckedIn(true);
    await capture("check_in", { at: new Date().toISOString() });
  }

  async function onSubmitChecklist() {
    await capture("checklist", { items: checklist });
  }

  async function onLogChemical() {
    if (!chemical.trim()) return;
    await capture("chemical", { name: chemical });
    setChemical("");
  }

  async function onComplete() {
    await capture("check_out", { at: new Date().toISOString() });
    const result = await updateJobStatus(job.id, "completed");
    if (result?.error) toast.error(result.error);
    else toast.success("Job completed & submitted.");
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-mono">{job.number}</CardTitle>
          <Badge variant="outline" className="border-border">{JOB_STATUS_LABELS[job.status]}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{job.clientName} · {job.site_address}</p>
        {gps && (
          <p className="flex items-center gap-1 text-xs text-emerald-700">
            <MaterialIcon name="verified" className="text-[14px]" />
            GPS verified · {gps.lat.toFixed(4)}, {gps.lng.toFixed(4)}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Button variant={checkedIn ? "secondary" : "default"} disabled={checkedIn} onClick={onCheckIn}>
            <MaterialIcon name="login" className="text-[16px]" />
            Check-In
          </Button>
          <Button variant="outline" disabled={!checkedIn} onClick={onComplete}>
            <MaterialIcon name="task_alt" className="text-[16px]" />
            Complete &amp; Submit
          </Button>
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-medium">Cleaning checklist</p>
          {CHECKLIST_ITEMS.map((item) => (
            <label key={item} className="flex items-center gap-2 text-sm">
              <Checkbox checked={!!checklist[item]} onCheckedChange={(c) => setChecklist((prev) => ({ ...prev, [item]: c === true }))} />
              <span className={checklist[item] ? "text-muted-foreground line-through" : ""}>{item}</span>
            </label>
          ))}
          <Button size="sm" variant="outline" onClick={onSubmitChecklist}>Save checklist</Button>
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-medium">Before / after photos</p>
          <p className="text-xs text-muted-foreground">Photo capture UI only — uploading to Supabase Storage needs a bucket configured (see docs/DEVELOPER.md).</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex h-16 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
              <MaterialIcon name="add_a_photo" className="mr-1 text-[16px]" /> Before
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={() => capture("photo_before", { note: "captured on device" })} />
            </label>
            <label className="flex h-16 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
              <MaterialIcon name="add_a_photo" className="mr-1 text-[16px]" /> After
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={() => capture("photo_after", { note: "captured on device" })} />
            </label>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-medium">Chemicals used</p>
          <div className="flex gap-2">
            <Input value={chemical} onChange={(e) => setChemical(e.target.value)} placeholder="e.g. Multi-surface cleaner, 500ml" />
            <Button size="sm" onClick={onLogChemical}>Log</Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-medium">Customer signature</p>
          <SignaturePad onCapture={(dataUrl) => capture("signature", { dataUrl })} />
        </div>
      </CardContent>
    </Card>
  );
}

export function FieldCaptureClient({ jobs }: { jobs: Job[] }) {
  return (
    <div className="mx-auto max-w-md space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Supervisor App</h1>
        <p className="text-sm text-muted-foreground">Field check-in, evidence and sign-off — works offline.</p>
      </div>
      <OfflineBadge />
      {jobs.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No jobs scheduled for you today.</p>}
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
      <p className="text-center text-xs text-muted-foreground">{jobs.length > 0 && `Last updated ${formatDateTime(new Date())}`}</p>
    </div>
  );
}
