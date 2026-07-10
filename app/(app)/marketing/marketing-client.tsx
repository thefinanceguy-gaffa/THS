"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MaterialIcon } from "@/components/ui/material-icon";
import { formatMoney, formatDate } from "@/lib/utils/format";
import { campaignChannels, campaignStatuses } from "@/lib/validation/marketing";
import { createCampaign, updateCampaignStatus } from "@/app/actions/marketing";
import type { Tables } from "@/lib/supabase/database.types";

type Campaign = Tables<"campaigns"> & {
  leadsGenerated: number;
  leadsWon: number;
  pipelineValueUsd: number;
  costPerLead: number | null;
};

const STATUS_BADGE: Record<string, string> = {
  planned: "border-border bg-muted text-muted-foreground",
  active: "border-emerald-300 bg-emerald-50 text-emerald-800",
  paused: "border-amber-300 bg-amber-50 text-amber-800",
  completed: "border-blue-300 bg-blue-50 text-blue-800",
};

export function MarketingClient({ campaigns }: { campaigns: Campaign[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<string>(campaignChannels[0]);
  const [budget, setBudget] = useState(0);
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [notes, setNotes] = useState("");

  const activeBudget = useMemo(() => campaigns.filter((c) => c.status === "active").reduce((s, c) => s + c.budget_usd, 0), [campaigns]);
  const totalLeads = useMemo(() => campaigns.reduce((s, c) => s + c.leadsGenerated, 0), [campaigns]);

  function onSubmit() {
    if (name.trim().length < 2) {
      toast.error("Enter a campaign name.");
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("channel", channel);
      formData.set("budget_usd", String(budget));
      if (startsOn) formData.set("starts_on", startsOn);
      if (endsOn) formData.set("ends_on", endsOn);
      if (notes) formData.set("notes", notes);

      const result = await createCampaign({ error: null }, formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Campaign created.");
        setName("");
        setBudget(0);
        setStartsOn("");
        setEndsOn("");
        setNotes("");
        setOpen(false);
      }
    });
  }

  function onStatusChange(campaignId: string, status: string) {
    startTransition(async () => {
      const result = await updateCampaignStatus(campaignId, status);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Marketing</h1>
          <p className="text-sm text-muted-foreground">Campaigns and the leads they generate.</p>
        </div>
        <Button size="lg" onClick={() => setOpen(true)}>
          <MaterialIcon name="add" className="text-[18px]" />
          New Campaign
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Active campaigns</p>
            <p className="mt-1 text-2xl font-bold">{campaigns.filter((c) => c.status === "active").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Active budget</p>
            <p className="mt-1 text-2xl font-bold">{formatMoney(activeBudget)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Leads generated</p>
            <p className="mt-1 text-2xl font-bold">{totalLeads}</p>
          </CardContent>
        </Card>
      </div>

      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead className="text-right">Budget</TableHead>
              <TableHead className="text-right">Leads</TableHead>
              <TableHead className="text-right">Won</TableHead>
              <TableHead className="text-right">Cost / Lead</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No campaigns yet.
                </TableCell>
              </TableRow>
            )}
            {campaigns.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.starts_on ? formatDate(c.starts_on) : "—"} {c.ends_on ? `– ${formatDate(c.ends_on)}` : ""}
                  </p>
                </TableCell>
                <TableCell className="text-muted-foreground">{c.channel}</TableCell>
                <TableCell className="text-right">{formatMoney(c.budget_usd)}</TableCell>
                <TableCell className="text-right">{c.leadsGenerated}</TableCell>
                <TableCell className="text-right">{c.leadsWon}</TableCell>
                <TableCell className="text-right">{c.costPerLead !== null ? formatMoney(c.costPerLead) : "—"}</TableCell>
                <TableCell>
                  <Select value={c.status} onValueChange={(v) => v && onStatusChange(c.id, v)}>
                    <SelectTrigger className="h-7 w-[120px] text-xs" disabled={isPending}>
                      <SelectValue>
                        <Badge variant="outline" className={STATUS_BADGE[c.status] ?? "border-border"}>
                          {c.status}
                        </Badge>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {campaignStatuses.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Q3 WhatsApp Push" />
            </div>
            <div className="space-y-1.5">
              <Label>Channel</Label>
              <Select value={channel} onValueChange={(v) => v && setChannel(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {campaignChannels.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Budget (USD)</Label>
              <Input type="number" min="0" step="0.01" value={budget} onChange={(e) => setBudget(e.target.valueAsNumber || 0)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Starts</Label>
                <Input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Ends</Label>
                <Input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={onSubmit} disabled={isPending}>
              {isPending ? "Saving…" : "Create campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
