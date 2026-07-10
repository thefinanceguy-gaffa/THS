"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MaterialIcon } from "@/components/ui/material-icon";
import { cn } from "@/lib/utils";

const CHANNELS = [
  { label: "WhatsApp Business", icon: "chat" },
  { label: "Website Form", icon: "language" },
  { label: "Facebook Lead Ads", icon: "thumb_up" },
  { label: "Instagram", icon: "photo_camera" },
  { label: "LinkedIn", icon: "work" },
  { label: "Google Business", icon: "storefront" },
];

/**
 * README.md's omni-channel capture strip. None of these are wired to real
 * webhooks yet (BUILD_ROADMAP.md Sprint 2a — needs Meta/Google credentials
 * this environment doesn't have) — shown honestly as "Not connected" rather
 * than faking a live status, with manual lead entry as the real capture
 * path today.
 */
export function ChannelStrip() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-2">
      <button type="button" onClick={() => setExpanded((e) => !e)} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <MaterialIcon name={expanded ? "expand_less" : "expand_more"} className="text-[16px]" />
        Omni-channel capture ({CHANNELS.length} channels, none connected yet)
      </button>
      {expanded && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {CHANNELS.map((c) => (
            <Card key={c.label} size="sm">
              <CardContent className="flex items-center gap-2">
                <MaterialIcon name={c.icon} className="text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{c.label}</p>
                  <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className={cn("size-1.5 rounded-full bg-muted-foreground/40")} />
                    Not connected
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
