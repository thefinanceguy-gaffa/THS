import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAppSession } from "@/lib/session/get-app-session";
import { SettingsClient } from "./settings-client";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await getAppSession();
  if (!session) return null;

  const supabase = await createClient();
  const { data: branches } = await supabase.from("branches").select("*").is("deleted_at", null).order("is_main", { ascending: false });

  const canManage = session.profile.role === "owner" || session.profile.role === "admin";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Branches and business-wide configuration.</p>
      </div>
      <SettingsClient branches={branches ?? []} canManage={canManage} />
    </div>
  );
}
