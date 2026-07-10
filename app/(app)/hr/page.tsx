import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Human Resources" };

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  bus_dev: "Business Development",
  ops_manager: "Operations Manager",
  supervisor: "Supervisor",
  cleaner: "Cleaner",
  finance: "Finance Officer",
  procurement: "Procurement Officer",
  hr: "HR Officer",
  client: "Client",
};

export default async function HrPage() {
  const supabase = await createClient();
  const { data: staff } = await supabase.from("profiles").select("*").is("deleted_at", null).neq("role", "client").order("full_name");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Human Resources</h1>
        <p className="text-sm text-muted-foreground">Staff roster, leave, training and PPE register.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(staff ?? []).map((s) => (
          <Link key={s.id} href={`/hr/${s.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:ring-1 hover:ring-foreground/20">
            <Avatar><AvatarFallback>{initials(s.full_name)}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{s.full_name}</p>
              <p className="truncate text-xs text-muted-foreground">{s.job_title ?? ROLE_LABEL[s.role]}</p>
            </div>
            {s.is_suspended ? (
              <Badge variant="outline" className="border-red-300 bg-red-50 text-red-800">Suspended</Badge>
            ) : (
              <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">Active</Badge>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
