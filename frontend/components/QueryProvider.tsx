"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60000, // 60 seconds instant data freshness
            gcTime: 60 * 60 * 1000, // 60 minutes in-memory retention
            placeholderData: (prev: any) => prev, // Instant rendering from memory without layout shift
            refetchIntervalInBackground: false, // Do not spam requests in background tabs
            refetchOnMount: false, // If data is fresh, render immediately without network request
            retry: (failureCount, error: any) => {
              if (failureCount >= 1) return false;
              const msg = (error?.message || "").toLowerCase();
              if (msg.includes("404") || msg.includes("401") || msg.includes("403") || msg.includes("circuit breaker")) {
                return false;
              }
              return true;
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 4000),
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  // Background Eager Tab Data Preloader: warms up all tab endpoints during idle time
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const prefetchKeyEndpoints = async () => {
      try {
        const warmupEndpoints = [
          "/api/dashboard/snapshot?mode=PAPER",
          "/api/universe/instruments?limit=500",
          "/api/bots",
          "/api/risk/summary?mode=PAPER",
          "/api/brokers/health",
          "/api/futures/universe",
          "/api/pnl/accounting",
          "/api/v2/portfolio?environment=PAPER",
          "/api/v2/positions?environment=PAPER",
          "/api/v2/orders?environment=PAPER&limit=50",
          "/api/v2/providers",
          "/api/options/chain?underlying=NIFTY",
          "/api/status",
        ];

        for (const ep of warmupEndpoints) {
          fetch(ep, { cache: "default" }).catch(() => {});
        }
      } catch {}
    };

    if ("requestIdleCallback" in window) {
      const id = (window as any).requestIdleCallback(prefetchKeyEndpoints, { timeout: 800 });
      return () => (window as any).cancelIdleCallback(id);
    } else {
      const id = setTimeout(prefetchKeyEndpoints, 400);
      return () => clearTimeout(id);
    }
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
