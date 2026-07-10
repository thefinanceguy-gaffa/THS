import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { formatDateTime } from "@/lib/utils/format";
import type { Tables } from "@/lib/supabase/database.types";

type Row = Pick<Tables<"audit_logs">, "id" | "created_at" | "actor_name" | "actor_role" | "action" | "module" | "entity_type" | "entity_id" | "reason">;

const ACTION_VARIANT: Record<string, string> = {
  insert: "border-emerald-300 bg-emerald-50 text-emerald-800",
  update: "border-blue-300 bg-blue-50 text-blue-800",
  delete: "border-red-300 bg-red-50 text-red-800",
  approve: "border-emerald-300 bg-emerald-50 text-emerald-800",
  reject: "border-red-300 bg-red-50 text-red-800",
};

export function AuditLogTable({ rows, page, pageSize, totalCount }: { rows: Row[]; page: number; pageSize: number; totalCount: number }) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No audit events yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(row.created_at)}</TableCell>
                <TableCell>
                  {row.actor_name ?? "System"}
                  {row.actor_role && <span className="ml-1 text-xs text-muted-foreground">({row.actor_role})</span>}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={ACTION_VARIANT[row.action] ?? "border-border"}>
                    {row.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.entity_type}
                  {row.entity_id && <span className="ml-1 font-mono text-xs">#{row.entity_id.slice(0, 8)}</span>}
                </TableCell>
                <TableCell className="text-muted-foreground">{row.reason ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href={`?page=${Math.max(1, page - 1)}`} />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
              .map((p) => (
                <PaginationItem key={p}>
                  <PaginationLink href={`?page=${p}`} isActive={p === page}>
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ))}
            <PaginationItem>
              <PaginationNext href={`?page=${Math.min(totalPages, page + 1)}`} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
