"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiState {
  currency: "USD" | "ZIG";
  fxRateZigPerUsd: number;
  aiPanelOpen: boolean;
  mobileNavOpen: boolean;
  setCurrency: (currency: "USD" | "ZIG") => void;
  toggleAiPanel: () => void;
  setMobileNavOpen: (open: boolean) => void;
}

/**
 * Global UI-only state (currency toggle, AI panel open/closed, mobile nav
 * drawer) — deliberately separate from server-fetched data. Currency is
 * persisted so a user's USD/ZiG choice survives a reload, matching
 * README.md: "every money value recomputes and re-renders" when toggled.
 */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      currency: "USD",
      fxRateZigPerUsd: 13.85,
      aiPanelOpen: false,
      mobileNavOpen: false,
      setCurrency: (currency) => set({ currency }),
      toggleAiPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
    }),
    { name: "ths-os-ui", partialize: (s) => ({ currency: s.currency }) }
  )
);

export function useMoney() {
  const currency = useUiStore((s) => s.currency);
  const fxRate = useUiStore((s) => s.fxRateZigPerUsd);
  return { currency, fxRate };
}
