"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MaterialIcon } from "@/components/ui/material-icon";
import { portalLogRequest } from "@/app/actions/portal";

export default function PortalRequestPage() {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function onSubmit() {
    startTransition(async () => {
      const result = await portalLogRequest("clean_request", note || "Requesting a cleaning visit");
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Request sent — we'll be in touch to confirm.");
        router.push("/portal");
      }
    });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Request a Clean</h1>
      <Card>
        <CardContent className="space-y-3">
          <MaterialIcon name="cleaning_services" className="text-[28px] text-primary" />
          <p className="text-sm text-muted-foreground">Tell us what you need and our Business Development team will follow up to confirm a time.</p>
          <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Extra deep clean needed for the boardroom before Friday" />
          <Button className="w-full" disabled={isPending} onClick={onSubmit}>{isPending ? "Sending…" : "Send request"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
