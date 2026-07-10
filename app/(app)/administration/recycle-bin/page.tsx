import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAppSession } from "@/lib/session/get-app-session";
import { RECYCLE_BIN_ENTITIES } from "@/lib/recycle-bin/registry";
import { RecycleBinClient } from "./recycle-bin-client";

export const metadata: Metadata = { title: "Recycle Bin" };

export default async function RecycleBinPage() {
  const session = await getAppSession();
  if (!session) return null;

  if (session.permissions["audit.view"] !== "allowed") {
    return (
      <div className="mx-auto max-w-4xl">
        <p className="text-sm text-muted-foreground">You don&apos;t have permission to view the recycle bin.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const results = await Promise.all(
    RECYCLE_BIN_ENTITIES.map(async (entity) => ({
      table: entity.table,
      entityLabel: entity.entityLabel,
      canRestore: entity.roles.includes(session.profile.role),
      records: await entity.load(supabase),
    })),
  );

  const groups = results.filter((r) => r.records.length > 0);

  return <RecycleBinClient groups={groups} />;
}
