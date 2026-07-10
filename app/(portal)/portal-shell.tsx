"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MaterialIcon } from "@/components/ui/material-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logout } from "@/app/actions/auth";

const TABS = [
  { href: "/portal", label: "Home", icon: "home" },
  { href: "/portal/invoices", label: "Invoices", icon: "receipt_long" },
  { href: "/portal/reports", label: "Reports", icon: "summarize" },
];

export function PortalShell({ fullName, children }: { fullName: string; children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
      <header className="flex h-14 items-center justify-between bg-[#0d1b34] px-4 text-white">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-[8px] bg-gradient-to-br from-[#2f6bff] to-[#1b56d6]">
            <MaterialIcon name="cleaning_services" className="text-[16px] text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-xs text-white/60">Welcome,</p>
            <p className="text-sm font-medium">{fullName}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" className="text-white hover:bg-white/10" onClick={() => void logout()}>
          <MaterialIcon name="logout" className="text-[18px]" />
        </Button>
      </header>

      <main className="flex-1 space-y-4 p-4 pb-20">{children}</main>

      <nav className="fixed bottom-0 left-1/2 flex w-full max-w-md -translate-x-1/2 items-center justify-around border-t border-border bg-card py-2">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link key={tab.href} href={tab.href} className={cn("flex flex-col items-center gap-0.5 px-3 py-1 text-xs", active ? "text-primary" : "text-muted-foreground")}>
              <MaterialIcon name={tab.icon} filled={active} className="text-[20px]" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
