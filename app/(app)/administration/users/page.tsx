import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAppSession } from "@/lib/session/get-app-session";
import { UsersManager } from "./users-manager";

export const metadata: Metadata = { title: "Users & Roles" };

export default async function UsersPage() {
  const session = await getAppSession();
  if (!session) return null;

  if (session.permissions["users.manage"] !== "allowed") {
    return (
      <div className="mx-auto max-w-4xl">
        <p className="text-sm text-muted-foreground">Only the Owner can manage users and roles.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: users }, { data: branches }] = await Promise.all([
    supabase.from("profiles").select("*").is("deleted_at", null).order("full_name"),
    supabase.from("branches").select("*").is("deleted_at", null).order("name"),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Users &amp; Roles</h1>
        <p className="text-sm text-muted-foreground">Create staff accounts and assign role, branch, reporting manager and approval limit.</p>
      </div>
      <UsersManager users={users ?? []} branches={branches ?? []} />
    </div>
  );
}
