"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, X, Globe, ExternalLink, Filter } from "lucide-react";
import { GlobalMarketSession } from "@/types/market-universe";
import { apiClient } from "@/lib/apiClient";

interface SimpleMarketClockProps {
  onSelectMarket?: (market: string) => void;
  selectedMarket?: string;
}

const DEFAULT_SESSIONS: GlobalMarketSession[] = [
  { market_id: "nse_india", exchange: "NSE", name: "NSE India", country: "India", timezone: "IST", local_time: "09:15 - 15:30", status: "CLOSED", status_label: "CLOSED", hours: "09:15 - 15:30 IST", badge_color: "slate" },
  { market_id: "bse_india", exchange: "BSE", name: "BSE India", country: "India", timezone: "IST", local_time: "09:15 - 15:30", status: "CLOSED", status_label: "CLOSED", hours: "09:15 - 15:30 IST", badge_color: "slate" },
  { market_id: "mcx_india", exchange: "MCX", name: "MCX India", country: "India", timezone: "IST", local_time: "09:00 - 23:30", status: "CLOSED", status_label: "CLOSED", hours: "09:00 - 23:30 IST", badge_color: "slate" },
  { market_id: "crypto_247", exchange: "CRYPTO", name: "Crypto 24/7", country: "Global", timezone: "UTC", local_time: "Live UTC", status: "OPEN", status_label: "OPEN 24/7", hours: "24/7", badge_color: "emerald" },
  { market_id: "us_nyse_nasdaq", exchange: "US", name: "US Markets", country: "US", timezone: "EDT", local_time: "09:30 - 16:00", status: "CLOSED", status_label: "CLOSED", hours: "09:30 - 16:00 EDT", badge_color: "slate" },
  { market_id: "forex_global", exchange: "FOREX", name: "Forex Global", country: "Global", timezone: "UTC", local_time: "24/5", status: "CLOSED", status_label: "CLOSED", hours: "24/5 UTC", badge_color: "slate" },
];

export function SimpleMarketClock({ onSelectMarket, selectedMarket }: SimpleMarketClockProps) {
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

  const sessions = (sessionData?.sessions && sessionData.sessions.length > 0) ? sessionData.sessions : DEFAULT_SESSIONS;

  return (
    <>
      {/* 1-Line Compact Market Clock Strip */}
      <div className="bg-[#0B1224] border border-slate-800/80 rounded-xl px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 font-mono text-xs select-none shadow-md">
        <div className="flex items-center gap-2.5 overflow-x-auto custom-scrollbar py-0.5">
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-sans shrink-0">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>SESSIONS</span>
          </div>

          <div className="h-3.5 w-[1px] bg-slate-800 shrink-0" />

          {sessions.map((s, idx) => {
            const rawStatus = (s.status || "CLOSED").toUpperCase();
            const isOpen = rawStatus === "OPEN";
            const isPrePost = rawStatus === "PRE_MARKET" || rawStatus === "POST_MARKET" || rawStatus === "PRE-OPEN";
            const label = s.exchange || s.name || "MKT";
            const isSelected = selectedMarket === label;
            const badgeLabel = s.status_label || (isOpen ? (s.hours?.includes("24/7") ? "OPEN" : "OPEN") : isPrePost ? "PRE-OPEN" : "CLOSED");

            return (
              <button
                key={s.market_id || s.exchange || `${label}-${idx}`}
                type="button"
                onClick={() => onSelectMarket?.(label)}
                className={`flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-lg text-xs transition border ${
                  isSelected
                    ? "bg-cyan-500/20 border-cyan-500/60 text-white shadow-[0_0_8px_rgba(6,182,212,0.3)]"
                    : "bg-[#080E20] hover:bg-slate-800 text-slate-300 border-slate-800/80 hover:border-slate-700"
                }`}
                title={`Click to filter by ${label} (${s.hours || "Trading Session"})`}
              >
                <span className="font-bold">{label}</span>
                <span
                  className={`px-1 py-0.2 rounded text-[9px] font-black uppercase ${
                    isOpen
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : isPrePost
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  {badgeLabel}
                </span>
              </button>
            );
          })}
        </div>

        {/* View Sessions Modal Trigger */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 font-sans flex items-center gap-1 transition-colors shrink-0"
        >
          <span>View Sessions</span>
        </button>
      </div>

      {/* Detailed Sessions Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B132B] border border-slate-700/90 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 font-sans">
            <div className="p-4 border-b border-slate-800 bg-[#080E20] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">
                  Global Market Trading Sessions &amp; Calendars
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-900 border border-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
              {sessions.map((s, idx) => {
                const rawStatus = (s.status || "CLOSED").toUpperCase();
                const isOpen = rawStatus === "OPEN";
                return (
                  <div
                    key={s.market_id || idx}
                    className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl flex items-center justify-between gap-3 text-xs font-mono"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{s.exchange || s.name}</span>
                        <span className="text-slate-400 text-[11px] font-sans">({s.country || "Global"})</span>
                      </div>
                      <p className="text-slate-500 text-[10px] mt-0.5">
                        Hours: {s.hours || s.local_time || "Standard"} • Timezone: {s.timezone || "UTC"}
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-black uppercase border ${
                        isOpen
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {s.status_label || s.status}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="p-3 border-t border-slate-800 bg-[#080E20] flex justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
