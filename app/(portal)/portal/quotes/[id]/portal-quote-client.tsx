"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/utils/format";
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_BADGE } from "@/lib/quotations/presentation";
import { portalRespondToQuotation } from "@/app/actions/portal";
import type { Tables } from "@/lib/supabase/database.types";

export function PortalQuoteClient({ quotation, lines }: { quotation: Tables<"quotations">; lines: Tables<"quotation_lines">[] }) {
  const [isPending, startTransition] = useTransition();
  const canDecide = ["sent", "negotiation", "awaiting_client"].includes(quotation.status);

  function respond(accept: boolean) {
    startTransition(async () => {
      const result = await portalRespondToQuotation(quotation.id, accept);
      if (result?.error) toast.error(result.error);
      else toast.success(accept ? "Quote accepted — thank you!" : "Quote declined.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-lg font-bold">{quotation.number}</p>
        <Badge variant="outline" className={QUOTE_STATUS_BADGE[quotation.status]}>{QUOTE_STATUS_LABELS[quotation.status]}</Badge>
      </div>

      {quotation.service_summary && <p className="text-sm text-muted-foreground">{quotation.service_summary}</p>}

      <Card>
        <CardContent className="p-4">
          <Table>
            <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
            <TableBody>
              {lines.map((l) => (
                <TableRow key={l.id}><TableCell>{l.description}</TableCell><TableCell className="text-right">{formatMoney((l.quantity ?? 0) * (l.rate_usd ?? 0))}</TableCell></TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow><TableCell className="text-right text-base font-bold">Total</TableCell><TableCell className="text-right text-base font-bold">{formatMoney(quotation.total_usd)}</TableCell></TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      {canDecide && (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="border-red-300 text-red-700" disabled={isPending} onClick={() => respond(false)}>Decline</Button>
          <Button disabled={isPending} onClick={() => respond(true)}>Accept quote</Button>
        </div>
      )}
    </div>
  );
}
