"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, ExternalLink, X, Globe } from "lucide-react";
import { GlobalMarketSession } from "@/types/market-universe";
import { apiClient } from "@/lib/apiClient";

export function SimpleMarketClock() {
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    { market_id: "crypto_247", name: "Crypto", country: "Global", timezone: "UTC", local_time: "Live UTC", status: "OPEN", status_label: "OPEN 24/7", hours: "24/7", badge_color: "emerald" },
    { market_id: "nse_india", name: "India", country: "India", timezone: "IST", local_time: "09:15 - 15:30", status: "CLOSED", status_label: "CLOSED", hours: "09:15 - 15:30 IST", badge_color: "slate" },
    { market_id: "us_nyse_nasdaq", name: "US", country: "US", timezone: "EDT", local_time: "09:30 - 16:00", status: "OPEN", status_label: "OPEN", hours: "09:30 - 16:00 EDT", badge_color: "emerald" },
    { market_id: "lse_london", name: "London", country: "UK", timezone: "BST", local_time: "08:00 - 16:30", status: "CLOSED", status_label: "CLOSED", hours: "08:00 - 16:30 BST", badge_color: "slate" },
    { market_id: "tse_tokyo", name: "Tokyo", country: "Japan", timezone: "JST", local_time: "09:00 - 15:30", status: "CLOSED", status_label: "CLOSED", hours: "09:00 - 15:30 JST", badge_color: "slate" },
  ];

  return (
    <>
      {/* 1-Line Compact Market Clock Strip */}
      <div className="bg-[#0B111E] border border-[#1E293B] rounded-xl px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 font-mono text-xs select-none shadow-md">
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-none py-0.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-sans shrink-0">
            MARKETS
          </span>

          <div className="h-3.5 w-[1px] bg-slate-800 shrink-0" />

          {sessions.map((s) => {
            const isOpen = s.status === "OPEN";
            const isPrePost = s.status === "PRE_MARKET" || s.status === "POST_MARKET";
            const label = s.name.split(" ")[0]; // e.g. "Crypto", "India", "US", "London", "Tokyo"

            return (
              <div
                key={s.market_id}
                className="flex items-center gap-1.5 shrink-0 text-xs"
                title={`${s.name} (${s.country}): ${s.hours}`}
              >
                <span className="text-slate-300 font-semibold">{label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    isOpen
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : isPrePost
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      : "bg-slate-800/80 text-slate-400 border border-slate-700"
                  }`}
                >
                  {s.status === "OPEN" ? (s.hours === "24/7" ? "OPEN 24/7" : "OPEN") : isPrePost ? "PRE/POST" : "CLOSED"}
                </span>
              </div>
            );
          })}
        </div>

        {/* View Sessions Modal Trigger */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 font-sans flex items-center gap-1 transition-colors shrink-0"
        >
          <span>View Sessions</span>
        </button>
      </div>

      {/* Detailed Sessions Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B111E] border border-[#1E293B] w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 font-sans">
            <div className="p-4 border-b border-[#1E293B] bg-[#080D17] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">
                  Global Market Trading Sessions & Calendars
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg bg-[#141E33] hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-2.5 max-h-[65vh] overflow-y-auto">
              {sessions.map((s) => (
                <div
                  key={s.market_id}
                  className="p-3 rounded-xl bg-[#141E33] border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-bold text-white">{s.name} ({s.country})</div>
                    <div className="text-slate-400 font-mono text-[11px] mt-0.5">
                      Hours: {s.hours} • Timezone: {s.timezone}
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold ${
                      s.status === "OPEN"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                    }`}
                  >
                    {s.status_label || s.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
