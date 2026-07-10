"use client";

import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";
import { AiPanel } from "./ai-panel";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const aiPanelOpen = useUiStore((s) => s.aiPanelOpen);

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className={cn("flex min-w-0 flex-1 flex-col transition-[margin] duration-200", aiPanelOpen && "md:mr-[340px]")}>
        <AppTopbar />
        <main className="flex-1 p-6">{children}</main>
      </div>
      <AiPanel />
    </div>
  );
}
