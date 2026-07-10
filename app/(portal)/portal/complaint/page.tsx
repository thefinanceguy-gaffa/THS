"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MaterialIcon } from "@/components/ui/material-icon";
import { portalLogRequest } from "@/app/actions/portal";

export default function PortalComplaintPage() {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function onSubmit() {
    if (note.trim().length < 3) {
      toast.error("Please describe the issue.");
      return;
    }
    startTransition(async () => {
      const result = await portalLogRequest("complaint", note);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Complaint logged — our team will follow up.");
        router.push("/portal");
      }
    });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Log a Complaint</h1>
      <Card>
        <CardContent className="space-y-3">
          <MaterialIcon name="report_problem" className="text-[28px] text-destructive" />
          <p className="text-sm text-muted-foreground">We take every issue seriously — describe what happened and we&apos;ll respond promptly.</p>
          <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What went wrong?" />
          <Button className="w-full" disabled={isPending} onClick={onSubmit}>{isPending ? "Sending…" : "Submit complaint"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
