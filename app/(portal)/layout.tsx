import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/session/get-app-session";
import { PortalShell } from "./portal-shell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getAppSession();
  if (!session) redirect("/login");
  if (session.profile.role !== "client") redirect("/dashboard");

  return <PortalShell fullName={session.profile.full_name}>{children}</PortalShell>;
}
