"use client";

import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

export function CurrencyToggle() {
  const currency = useUiStore((s) => s.currency);
  const setCurrency = useUiStore((s) => s.setCurrency);

  return (
    <div className="flex h-[30px] items-center rounded-full bg-white/[0.08] p-0.5 font-mono text-[11px] font-semibold">
      {(["USD", "ZIG"] as const).map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => setCurrency(c)}
          className={cn(
            "rounded-full px-3 py-1 text-white/60 transition-colors",
            currency === c && "bg-white text-[#0d1b34]"
          )}
        >
          {c === "ZIG" ? "ZiG" : "USD"}
        </button>
      ))}
    </div>
  );
}
