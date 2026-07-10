"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // The offline engine (lib/offline) is the source of truth when
            // there's no connection — don't let TanStack Query retry-storm
            // against a dead network.
            retry: (failureCount, error) => {
              if (typeof navigator !== "undefined" && !navigator.onLine) return false;
              return failureCount < 2 && !(error instanceof Error && error.message.includes("PGRST"));
            },
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
