import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAppSession } from "@/lib/session/get-app-session";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatDate } from "@/lib/utils/format";
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_BADGE } from "@/lib/finance/presentation";

export const metadata: Metadata = { title: "Invoices" };

export default async function PortalInvoicesPage() {
  const session = await getAppSession();
  if (!session || !session.profile.customer_id) return null;

  const supabase = await createClient();
  const { data: invoices } = await supabase.from("invoices").select("*").eq("customer_id", session.profile.customer_id).order("issued_on", { ascending: false });

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">Invoices</h1>
      {(invoices ?? []).length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No invoices yet.</p>}
      {(invoices ?? []).map((inv) => (
        <Card key={inv.id}>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="font-mono text-sm font-medium">{inv.number}</p>
              <p className="text-xs text-muted-foreground">{inv.due_on ? `Due ${formatDate(inv.due_on)}` : ""}</p>
            </div>
            <div className="text-right">
              <p className="font-bold">{formatMoney(inv.total_usd)}</p>
              <Badge variant="outline" className={INVOICE_STATUS_BADGE[inv.status]}>{INVOICE_STATUS_LABELS[inv.status]}</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
