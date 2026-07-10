"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MaterialIcon } from "@/components/ui/material-icon";
import { formatDateTime } from "@/lib/utils/format";
import { restoreRecord } from "@/app/actions/recycle-bin";
import type { DeletedRecord } from "@/lib/recycle-bin/registry";

interface Group {
  table: string;
  entityLabel: string;
  canRestore: boolean;
  records: DeletedRecord[];
}

export function RecycleBinClient({ groups }: { groups: Group[] }) {
  const [isPending, startTransition] = useTransition();

  function onRestore(table: string, id: string, label: string) {
    startTransition(async () => {
      const result = await restoreRecord(table, id);
      if (result?.error) toast.error(result.error);
      else toast.success(`Restored "${label}".`);
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Recycle Bin</h1>
        <p className="text-sm text-muted-foreground">Soft-deleted records, restorable within your permissions. Most recent 100 per record type.</p>
      </div>

      {groups.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">Nothing has been deleted.</CardContent>
        </Card>
      )}

      {groups.map((group) => (
        <Card key={group.table}>
          <CardHeader>
            <CardTitle>
              {group.entityLabel} ({group.records.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Record</TableHead>
                  <TableHead>Deleted</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.label}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(r.deletedAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" disabled={!group.canRestore || isPending} onClick={() => onRestore(group.table, r.id, r.label)}>
                        <MaterialIcon name="restore" className="text-[16px]" />
                        Restore
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
