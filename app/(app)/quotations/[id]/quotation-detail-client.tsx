"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MaterialIcon } from "@/components/ui/material-icon";
import { useMoney } from "@/stores/ui-store";
import { formatMoney, formatDate, formatDateTime } from "@/lib/utils/format";
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_BADGE } from "@/lib/quotations/presentation";
import { submitQuotation, decideQuotationApproval, setQuotationStatus } from "@/app/actions/quotations";
import type { Tables, QuoteStatus, UserRole } from "@/lib/supabase/database.types";

type Quotation = Tables<"quotations"> & { customers: { company_name: string; address: string | null; suburb: string | null } | null; leads: { company_name: string; suburb: string | null } | null };

const POST_SEND_STATUSES: QuoteStatus[] = ["sent", "negotiation", "awaiting_client", "accepted", "rejected", "expired"];

function TrackerStep({ label, state }: { label: string; state: "done" | "current" | "pending" | "skip" }) {
  if (state === "skip") return null;
  return (
    <div className="flex flex-1 items-center gap-2">
      <div className={
        "flex size-6 shrink-0 items-center justify-center rounded-full text-xs " +
        (state === "done" ? "bg-emerald-500 text-white" : state === "current" ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground")
      }>
        {state === "done" ? <MaterialIcon name="check" className="text-[14px]" /> : ""}
      </div>
      <span className={"text-xs " + (state === "pending" ? "text-muted-foreground" : "font-medium")}>{label}</span>
    </div>
  );
}

export function QuotationDetailClient({
  quotation,
  lines,
  approvals,
  clientName,
  clientAddress,
  role,
  canManage,
}: {
  quotation: Quotation;
  lines: Tables<"quotation_lines">[];
  approvals: Tables<"approvals">[];
  clientName: string;
  clientAddress?: string;
  role: UserRole;
  canManage: boolean;
}) {
  const { currency, fxRate } = useMoney();
  const [isPending, startTransition] = useTransition();
  const pendingApproval = approvals.find((a) => a.status === "pending");

  const needsOwner = quotation.discount_percent > 15 || quotation.total_usd > 5000;
  const needsApproval = needsOwner || quotation.total_usd > 1000;
  const tierLabel = needsOwner ? "Owner approval" : "Operations Manager review";

  const trackerState = (step: "drafted" | "review" | "decision"): "done" | "current" | "pending" | "skip" => {
    if (step === "drafted") return quotation.status === "draft" ? "current" : "done";
    if (step === "review") {
      if (!needsApproval) return "skip";
      if (quotation.status === "draft") return "pending";
      if (quotation.status === "pending_review" || quotation.status === "pending_owner") return "current";
      return "done";
    }
    if (["sent", "negotiation", "awaiting_client"].includes(quotation.status)) return "current";
    if (["accepted", "rejected"].includes(quotation.status)) return "done";
    return "pending";
  };

  function onSubmit() {
    startTransition(async () => {
      const result = await submitQuotation(quotation.id);
      if (result?.error) toast.error(result.error);
      else toast.success(needsApproval ? "Submitted for approval." : "Quotation sent.");
    });
  }

  function onDecide(approve: boolean) {
    startTransition(async () => {
      const result = await decideQuotationApproval(quotation.id, approve);
      if (result?.error) toast.error(result.error);
      else toast.success(approve ? "Approved and sent." : "Rejected.");
    });
  }

  function onStatusChange(status: string) {
    startTransition(async () => {
      const result = await setQuotationStatus(quotation.id, status as QuoteStatus);
      if (result?.error) toast.error(result.error);
      else toast.success("Status updated.");
    });
  }

  const canDecide = pendingApproval && (role === "owner" || (role === "ops_manager" && quotation.status === "pending_review"));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" render={<Link href="/quotations" />}>
          <MaterialIcon name="arrow_back" className="text-[16px]" />
          Quotations
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <MaterialIcon name="picture_as_pdf" className="text-[16px]" />
            Print / PDF
          </Button>
          {canManage && quotation.status === "draft" && (
            <Button size="sm" disabled={isPending} onClick={onSubmit}>
              {needsApproval ? "Submit for approval" : "Send to client"}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="font-mono text-lg font-bold">{quotation.number}</p>
            <Badge variant="outline" className={QUOTE_STATUS_BADGE[quotation.status]}>{QUOTE_STATUS_LABELS[quotation.status]}</Badge>
          </div>
          {canDecide && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="border-red-300 text-red-700" disabled={isPending} onClick={() => onDecide(false)}>Reject</Button>
              <Button size="sm" disabled={isPending} onClick={() => onDecide(true)}>Approve</Button>
            </div>
          )}
          {canManage && POST_SEND_STATUSES.includes(quotation.status) && quotation.status !== "accepted" && quotation.status !== "rejected" && (
            <Select value={quotation.status} onValueChange={(v) => v && onStatusChange(v)}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {POST_SEND_STATUSES.map((s) => <SelectItem key={s} value={s}>{QUOTE_STATUS_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-2">
          <TrackerStep label="Drafted" state={trackerState("drafted")} />
          <MaterialIcon name="chevron_right" className="text-muted-foreground" />
          <TrackerStep label={tierLabel} state={trackerState("review")} />
          <MaterialIcon name="chevron_right" className="text-muted-foreground" />
          <TrackerStep label="Client decision" state={trackerState("decision")} />
        </CardContent>
      </Card>

      {/* Branded quotation document — printable via the Print/PDF button above. */}
      <Card className="print:shadow-none">
        <CardContent className="space-y-6 p-8">
          <div className="flex items-start justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-10 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#2f6bff] to-[#1b56d6]">
                <MaterialIcon name="cleaning_services" className="text-white" />
              </div>
              <div>
                <p className="font-bold">The Hygiene Squad</p>
                <p className="text-xs text-muted-foreground">Harare, Zimbabwe</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">QUOTATION</p>
              <p className="font-mono text-sm text-muted-foreground">{quotation.number}</p>
            </div>
          </div>

          <div className="flex justify-between text-sm">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Prepared for</p>
              <p className="font-medium">{clientName}</p>
              {clientAddress && <p className="text-muted-foreground">{clientAddress}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Valid until</p>
              <p>{quotation.valid_until ? formatDate(quotation.valid_until) : "—"}</p>
            </div>
          </div>

          {quotation.service_summary && <p className="text-sm text-muted-foreground">{quotation.service_summary}</p>}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty / Unit</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>{line.description}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{line.quantity} {line.unit}</TableCell>
                  <TableCell className="text-right">{formatMoney(line.rate_usd ?? 0, currency, fxRate)}</TableCell>
                  <TableCell className="text-right">{formatMoney((line.quantity ?? 0) * (line.rate_usd ?? 0), currency, fxRate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3} className="text-right text-muted-foreground">Subtotal</TableCell>
                <TableCell className="text-right">{formatMoney(quotation.subtotal_usd, currency, fxRate)}</TableCell>
              </TableRow>
              {quotation.discount_percent > 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-right text-muted-foreground">Discount ({quotation.discount_percent}%)</TableCell>
                  <TableCell className="text-right">-{formatMoney((quotation.subtotal_usd * quotation.discount_percent) / 100, currency, fxRate)}</TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell colSpan={3} className="text-right text-muted-foreground">VAT (15%)</TableCell>
                <TableCell className="text-right">{formatMoney(quotation.vat_usd, currency, fxRate)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={3} className="text-right text-base font-bold">Total</TableCell>
                <TableCell className="text-right text-base font-bold">{formatMoney(quotation.total_usd, currency, fxRate)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>

          <p className="border-t border-border pt-4 text-xs text-muted-foreground">
            Prices in USD unless otherwise stated. Payment due within 30 days of invoice. This quotation is valid until the date shown above.
          </p>
        </CardContent>
      </Card>

      {approvals.length > 0 && (
        <Card>
          <CardContent className="space-y-2">
            <p className="text-sm font-medium">Approval history</p>
            {approvals.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{a.threshold_note} — {a.status}</span>
                <span>{a.decided_at ? formatDateTime(a.decided_at) : formatDateTime(a.created_at)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
