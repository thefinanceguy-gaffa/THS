"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MaterialIcon } from "@/components/ui/material-icon";
import { useAppSession } from "@/lib/session/session-context";
import { useUiStore } from "@/stores/ui-store";
import { visibleNavGroups } from "@/lib/nav/config";
import { cn } from "@/lib/utils";

function SidebarLink({ href, label, icon, onNavigate }: { href: string; label: string; icon: string; onNavigate: () => void }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2.5 rounded-lg border-l-[3px] border-transparent px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white",
        active && "border-l-[#3a7bff] bg-white/[0.09] text-white"
      )}
    >
      <MaterialIcon name={icon} filled={active} className="text-[19px]" />
      {label}
    </Link>
  );
}

function SidebarContent({ onNavigate }: { onNavigate: () => void }) {
  const session = useAppSession();
  const groups = visibleNavGroups(session.profile.role);

  return (
    <div className="flex h-full flex-col bg-[#0d1b34] text-white">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#2f6bff] to-[#1b56d6]">
          <MaterialIcon name="cleaning_services" className="text-white" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-bold">The Hygiene Squad</span>
          <span className="font-mono text-[9px] tracking-[1.5px] text-[#7d8db0]">THS OPERATING SYSTEM</span>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-2">
        {groups.map((group) => (
          <div key={group.label} className="space-y-1">
            <div className="px-3 font-mono text-[10px] tracking-[1.2px] text-[#7d8db0]">{group.label}</div>
            {group.items.map((item) => (
              <SidebarLink key={item.href} href={item.href} label={item.label} icon={item.icon} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-4 py-3">
        <p className="font-mono text-[10px] leading-relaxed text-[#7d8db0]">
          {session.branch?.city ?? "Harare"} · {session.branch?.name ?? "Main Branch"} · v0.1
        </p>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);

  return (
    <>
      <aside className="hidden w-[236px] shrink-0 md:block">
        <div className="fixed top-0 bottom-0 w-[236px]">
          <SidebarContent onNavigate={() => {}} />
        </div>
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[236px]">
            <SidebarContent onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
