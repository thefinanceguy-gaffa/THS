"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/ui/material-icon";
import { formatDateTime } from "@/lib/utils/format";
import { markNotificationRead, markAllNotificationsRead } from "@/app/actions/notifications";
import { cn } from "@/lib/utils";
import type { Tables } from "@/lib/supabase/database.types";

export function NotificationsList({ notifications }: { notifications: Tables<"notifications">[] }) {
  const [isPending, startTransition] = useTransition();
  const hasUnread = notifications.some((n) => !n.is_read);

  return (
    <div className="space-y-3">
      {hasUnread && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" disabled={isPending} onClick={() => startTransition(() => markAllNotificationsRead())}>
            Mark all read
          </Button>
        </div>
      )}
      {notifications.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No notifications yet.</p>}
      {notifications.map((n) => (
        <button
          key={n.id}
          type="button"
          disabled={n.is_read || isPending}
          onClick={() => startTransition(() => markNotificationRead(n.id))}
          className={cn(
            "flex w-full items-start gap-3 rounded-xl border border-border p-3 text-left text-sm transition-colors",
            !n.is_read && "bg-accent/40"
          )}
        >
          <MaterialIcon name={n.is_read ? "notifications" : "notifications_active"} className={cn("mt-0.5 text-[18px]", !n.is_read && "text-primary")} />
          <div className="flex-1">
            <p className="font-medium">{n.title}</p>
            {n.body && <p className="text-muted-foreground">{n.body}</p>}
            <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.created_at)}</p>
          </div>
          {!n.is_read && <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />}
        </button>
      ))}
    </div>
  );
}
