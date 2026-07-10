"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAppSession } from "@/lib/session/get-app-session";
import { getEntity } from "@/lib/recycle-bin/registry";

export interface ActionState {
  error: string | null;
}

export async function restoreRecord(table: string, recordId: string): Promise<ActionState> {
  const entity = getEntity(table);
  if (!entity) return { error: "Unknown record type." };

  const session = await getAppSession();
  if (!session || !entity.roles.includes(session.profile.role)) return { error: "You don't have permission to restore this record." };

  const supabase = await createClient();
  const { error } = await entity.restore(supabase, recordId);
  if (error) return { error };

  revalidatePath("/administration/recycle-bin");
  return { error: null };
}
