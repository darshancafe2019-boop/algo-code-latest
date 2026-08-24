"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5000,
            gcTime: 10 * 60 * 1000, // 10 minutes cache retention
            retry: (failureCount, error: any) => {
              // Never retry if already failed twice
              if (failureCount >= 1) return false;
              const msg = (error?.message || "").toLowerCase();
              if (msg.includes("404") || msg.includes("401") || msg.includes("403") || msg.includes("circuit breaker")) {
                return false;
              }
              return true;
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 6000),
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
          },
          mutations: {
            retry: 0, // State-changing actions must never retry automatically
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
