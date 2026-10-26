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

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
