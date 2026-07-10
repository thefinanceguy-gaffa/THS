import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAppSession } from "@/lib/session/get-app-session";
import { AuditLogTable } from "./audit-log-table";

export const metadata: Metadata = { title: "Audit Logs" };

const PAGE_SIZE = 30;

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await getAppSession();
  if (!session) return null;

  if (session.permissions["audit.view"] !== "allowed") {
    return (
      <div className="mx-auto max-w-4xl">
        <p className="text-sm text-muted-foreground">You don&apos;t have permission to view the audit log.</p>
      </div>
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();
  const { data: logs, count } = await supabase
    .from("audit_logs")
    .select("id, created_at, actor_name, actor_role, action, module, entity_type, entity_id, reason", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">An immutable record of every change made across THS OS.</p>
      </div>
      <AuditLogTable rows={logs ?? []} page={page} pageSize={PAGE_SIZE} totalCount={count ?? 0} />
    </div>
  );
}
