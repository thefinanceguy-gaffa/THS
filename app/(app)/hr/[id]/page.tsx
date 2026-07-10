import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppSession } from "@/lib/session/get-app-session";
import { EmployeeDetailClient } from "./employee-detail-client";

export const metadata: Metadata = { title: "Employee" };

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAppSession();
  if (!session) return null;

  const supabase = await createClient();
  const [{ data: profile }, { data: records }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).single(),
    supabase.from("employee_records").select("*").eq("profile_id", id).is("deleted_at", null).order("effective_on", { ascending: false }),
  ]);

  if (!profile) notFound();

  return <EmployeeDetailClient profile={profile} records={records ?? []} canManage={session.profile.role === "owner" || session.profile.role === "hr"} />;
}
