import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/session/get-app-session";
import { SessionProvider } from "@/lib/session/session-context";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getAppSession();
  if (!session) redirect("/login");

  return (
    <SessionProvider session={session}>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
