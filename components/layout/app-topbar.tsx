"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MaterialIcon } from "@/components/ui/material-icon";
import { GlobalSearch } from "./global-search";
import { CurrencyToggle } from "./currency-toggle";
import { useAppSession } from "@/lib/session/session-context";
import { useUiStore } from "@/stores/ui-store";
import { initials } from "@/lib/utils/format";
import { logout } from "@/app/actions/auth";

const ROLE_LABEL: Record<string, string> = {
  owner: "Super Administrator",
  admin: "Administrator",
  bus_dev: "Business Development Executive",
  ops_manager: "Operations Manager",
  supervisor: "Supervisor",
  cleaner: "Cleaner",
  finance: "Finance Officer",
  procurement: "Procurement Officer",
  hr: "HR Officer",
  client: "Client",
};

export function AppTopbar() {
  const session = useAppSession();
  const toggleAiPanel = useUiStore((s) => s.toggleAiPanel);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);

  return (
    <header className="sticky top-0 z-30 flex h-[60px] items-center gap-3 bg-[#0d1b34] px-4 text-white">
      <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 md:hidden" onClick={() => setMobileNavOpen(true)}>
        <MaterialIcon name="menu" />
      </Button>

      <div className="flex-1">
        <GlobalSearch />
      </div>

      <CurrencyToggle />

      <Link href="/administration/notifications" className="relative flex size-9 items-center justify-center rounded-full hover:bg-white/10">
        <MaterialIcon name="notifications" />
        {session.unreadNotificationCount > 0 && <span className="absolute top-2 right-2 size-2 rounded-full bg-[#d23b3b]" />}
      </Link>

      <Button variant="ghost" size="sm" className="gap-1.5 text-white hover:bg-white/10" onClick={toggleAiPanel}>
        <MaterialIcon name="auto_awesome" />
        Squad AI
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger render={<button type="button" className="flex items-center gap-2 rounded-full pl-1 pr-2.5 hover:bg-white/10" />}>
          <Avatar className="size-7">
            <AvatarFallback className="bg-[#3a7bff] text-[11px] text-white">{initials(session.profile.full_name)}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{session.profile.full_name}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span>{session.profile.full_name}</span>
              <span className="text-xs font-normal text-muted-foreground">{ROLE_LABEL[session.profile.role]}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/administration/profile" />}>
            <MaterialIcon name="account_circle" className="text-[18px]" />
            My profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              void logout();
            }}
          >
            <MaterialIcon name="logout" className="text-[18px]" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
