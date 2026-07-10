"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MaterialIcon } from "@/components/ui/material-icon";
import { useMoney } from "@/stores/ui-store";
import { formatMoney, formatDate } from "@/lib/utils/format";
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_BADGE } from "@/lib/quotations/presentation";
import type { Tables } from "@/lib/supabase/database.types";

type Quotation = Tables<"quotations"> & { clientName: string };

function KpiCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-bold">{value}</p>
        </div>
        <div className="flex size-9 items-center justify-center rounded-[9px] bg-accent text-accent-foreground">
          <MaterialIcon name={icon} className="text-[18px]" />
        </div>
      </CardContent>
    </Card>
  );
}

export function QuotationsClient({ quotations }: { quotations: Quotation[] }) {
  const router = useRouter();
  const { currency, fxRate } = useMoney();

  const kpis = useMemo(() => {
    const openStatuses = ["draft", "pending_review", "pending_owner", "sent", "negotiation", "awaiting_client"];
    const openValue = quotations.filter((q) => openStatuses.includes(q.status)).reduce((sum, q) => sum + q.total_usd, 0);

    const now = new Date();
    const mtd = quotations.filter((q) => q.status === "accepted" && new Date(q.updated_at).getMonth() === now.getMonth() && new Date(q.updated_at).getFullYear() === now.getFullYear());
    const acceptedMtd = mtd.reduce((sum, q) => sum + q.total_usd, 0);

    const decided = quotations.filter((q) => q.status === "accepted" || q.status === "rejected");
    const conversion = decided.length > 0 ? (quotations.filter((q) => q.status === "accepted").length / decided.length) * 100 : 0;

    return { openValue, acceptedMtd, conversion };
  }, [quotations]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Open value" value={formatMoney(kpis.openValue, currency, fxRate)} icon="request_quote" />
        <KpiCard label="Accepted MTD" value={formatMoney(kpis.acceptedMtd, currency, fxRate)} icon="task_alt" />
        <KpiCard label="Conversion" value={`${kpis.conversion.toFixed(0)}%`} icon="trending_up" />
      </div>

      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quote #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Valid till</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotations.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No quotations yet.</TableCell></TableRow>}
            {quotations.map((q) => (
              <TableRow key={q.id} className="cursor-pointer" onClick={() => router.push(`/quotations/${q.id}`)}>
                <TableCell className="font-mono font-medium">{q.number}</TableCell>
                <TableCell>{q.clientName}</TableCell>
                <TableCell className="text-right">{formatMoney(q.total_usd, currency, fxRate)}</TableCell>
                <TableCell className="text-muted-foreground">{q.valid_until ? formatDate(q.valid_until) : "—"}</TableCell>
                <TableCell><Badge variant="outline" className={QUOTE_STATUS_BADGE[q.status]}>{QUOTE_STATUS_LABELS[q.status]}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
