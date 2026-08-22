"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { GlobalMarketSession } from "@/types/market-universe";
import { apiClient } from "@/lib/apiClient";

export function GlobalMarketClock() {
  const { data: sessionData } = useQuery<{ status: string; sessions: GlobalMarketSession[] }>({
    queryKey: ["globalMarketSessions"],
    queryFn: async () => {
      const res = await apiClient.get<{ status: string; sessions: GlobalMarketSession[] }>("/api/universe/sessions", {
        timeoutMs: 6000,
      });
      if (!res.ok) throw new Error(res.error?.message || "Failed to fetch market sessions");
      return res.data as { status: string; sessions: GlobalMarketSession[] };
    },
    staleTime: 10000,
    refetchInterval: 20000,
    placeholderData: (prev) => prev,
  });

  const sessions = sessionData?.sessions || [
    { market_id: "crypto_247", name: "Global Crypto", country: "Global", timezone: "UTC", local_time: "Live UTC", status: "OPEN", status_label: "24/7 Trading", hours: "24/7", badge_color: "emerald" },
    { market_id: "nse_india", name: "NSE / BSE India", country: "India", timezone: "IST (UTC+5:30)", local_time: "09:15 - 15:30", status: "OPEN", status_label: "Regular Trading", hours: "09:15 - 15:30 IST", badge_color: "emerald" },
    { market_id: "us_nyse_nasdaq", name: "NYSE / NASDAQ", country: "US", timezone: "EDT (UTC-4)", local_time: "09:30 - 16:00", status: "PRE_MARKET", status_label: "Pre-Market Session", hours: "09:30 - 16:00 EDT", badge_color: "amber" },
    { market_id: "lse_london", name: "London (LSE)", country: "UK", timezone: "BST (UTC+1)", local_time: "08:00 - 16:30", status: "OPEN", status_label: "Regular Trading", hours: "08:00 - 16:30 BST", badge_color: "emerald" },
    { market_id: "tse_tokyo", name: "Tokyo (TSE)", country: "Japan", timezone: "JST (UTC+9)", local_time: "09:00 - 15:30", status: "CLOSED", status_label: "Market Closed", hours: "09:00 - 15:30 JST", badge_color: "slate" },
  ];

  return (
    <div className="bg-[#0B131E] border border-[#1E293B] rounded-xl p-3 flex flex-wrap items-center justify-between gap-2.5 font-mono text-xs select-none shadow-md">
      <div className="flex items-center gap-2 text-slate-400">
        <Clock className="h-4 w-4 text-cyan-400" />
        <span className="text-[11px] uppercase tracking-wider font-bold text-slate-300">
          Global Market Clock
        </span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
        {sessions.map((s) => {
          const isOpen = s.status === "OPEN";
          const isPrePost = s.status === "PRE_MARKET" || s.status === "POST_MARKET";

          const badgeClasses = isOpen
            ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
            : isPrePost
            ? "bg-amber-950/60 border-amber-800 text-amber-300"
            : "bg-slate-900 border-slate-800 text-slate-400";

          const dotColor = isOpen
            ? "bg-emerald-400 animate-pulse"
            : isPrePost
            ? "bg-amber-400"
            : "bg-slate-600";

          return (
            <div
              key={s.market_id}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border ${badgeClasses} text-[10px] whitespace-nowrap`}
              title={`${s.name} (${s.country}) - ${s.hours}`}
            >
              <div className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
              <span className="font-bold">{s.name}</span>
              <span className="opacity-80">({s.status_label})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
