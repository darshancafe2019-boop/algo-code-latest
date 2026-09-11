"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Layers,
  RefreshCw,
  BarChart2,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { OptionTerminalSnapshot } from "@/types/option-terminal";
import { OptionFlowTable } from "@/components/options/terminal/OptionFlowTable";
import { OptionAnalyticsPanel } from "@/components/options/terminal/OptionAnalyticsPanel";
import { formatIndianCurrency, formatIndianQuantity } from "@/lib/options/options-analytics-engine";

export function OptionsFlowView() {
  const [underlying, setUnderlying] = useState("NIFTY");
  const [source, setSource] = useState("DHAN");
  const [subView, setSubView] = useState<"FLOW" | "ANALYTICS">("FLOW");

  const { data: snapshotData, isLoading, isFetching, refetch } = useQuery<{ success: boolean; data: OptionTerminalSnapshot }>({
    queryKey: ["optionsFlowSnapshot", underlying, source],
    queryFn: async () => {
      const params = new URLSearchParams({
        underlying,
        provider: source,
        strike_count: "25",
      });
      const res = await apiClient.get<any>(`/api/options/flow?${params.toString()}`);
      if (!res.ok || !res.data) throw new Error("Failed to load options flow analytics");
      return res.data;
    },
    staleTime: 4000,
    refetchInterval: 5000,
  });

  const snapshot = snapshotData?.data || null;
  const isCrypto = ["BTC", "ETH", "SOL", "XRP"].includes(underlying) || source === "DELTA_INDIA" || source === "BINANCE";
  const currency = isCrypto ? "$" : "₹";

  const pcr = snapshot?.pcr;
  const flow = snapshot?.flowSummary;

  return (
    <div className="space-y-4 text-slate-100 font-sans">
      {/* Top Header Controls Bar */}
      <div className="p-3.5 rounded-2xl bg-[#090E17] border border-slate-800/90 flex flex-wrap items-center justify-between gap-3 font-mono">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              REAL-TIME OPTIONS ORDER FLOW & DERIVATIVES INTELLIGENCE
            </h1>
            <p className="text-[11px] text-slate-400">
              Live trade-by-trade flow classification, sentiment scoring, and open interest distribution
            </p>
          </div>
        </div>

        {/* Filters & Sub-view toggle */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Sub-view switcher */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setSubView("FLOW")}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 ${
                subView === "FLOW" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Order Flow Stream</span>
            </button>
            <button
              type="button"
              onClick={() => setSubView("ANALYTICS")}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 ${
                subView === "ANALYTICS" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Derivatives Analytics</span>
            </button>
          </div>

          <select
            value={underlying}
            onChange={(e) => {
              const val = e.target.value;
              setUnderlying(val);
              if (["BTC", "ETH", "SOL"].includes(val)) {
                setSource("DELTA_INDIA");
              } else {
                setSource("DHAN");
              }
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-cyan-300 outline-none cursor-pointer"
          >
            <option value="NIFTY">NIFTY 50 (NSE)</option>
            <option value="BANKNIFTY">BANKNIFTY (NSE)</option>
            <option value="FINNIFTY">FINNIFTY (NSE)</option>
            <option value="MIDCPNIFTY">MIDCPNIFTY (NSE)</option>
            <option value="SENSEX">SENSEX (BSE)</option>
            <option value="RELIANCE">RELIANCE (NSE)</option>
            <option value="BTC">BTC (Crypto)</option>
            <option value="ETH">ETH (Crypto)</option>
            <option value="SOL">SOL (Crypto)</option>
          </select>

          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-purple-300 outline-none cursor-pointer"
          >
            {["BTC", "ETH", "SOL"].includes(underlying) ? (
              <>
                <option value="DELTA_INDIA">Delta Exchange India (LIVE)</option>
                <option value="BINANCE">Binance European Options (LIVE)</option>
              </>
            ) : (
              <>
                <option value="DHAN">Dhan HQ API v2</option>
                <option value="UPSTOX">Upstox API v3</option>
              </>
            )}
          </select>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh Flow Data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* 4 Flow Telemetry Metrics */}
      {snapshot && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3 rounded-xl bg-[#090E17] border border-slate-800/90">
            <span className="text-[10px] text-slate-400 uppercase block">PUT / CALL RATIO (PCR)</span>
            <div className={`text-lg font-bold mt-0.5 ${pcr?.pcrOI && pcr.pcrOI >= 1.0 ? "text-emerald-400" : "text-amber-400"}`}>
              {pcr?.pcrOI !== null && pcr?.pcrOI !== undefined ? pcr.pcrOI.toFixed(2) : "N/A"}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              {pcr?.pcrOI ? (pcr.pcrOI >= 1.2 ? "Bullish Sentiment" : pcr.pcrOI <= 0.8 ? "Bearish Sentiment" : "Neutral Positioning") : "Awaiting Data"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#090E17] border border-slate-800/90">
            <span className="text-[10px] text-slate-400 uppercase block">HIGHEST CALL OI (RESISTANCE)</span>
            <div className="text-lg font-bold text-rose-400 mt-0.5">
              {snapshot.resistanceZone?.strike ? snapshot.resistanceZone.strike.toLocaleString("en-IN") : "—"}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Call OI: {formatIndianQuantity(snapshot.resistanceZone?.oi)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#090E17] border border-slate-800/90">
            <span className="text-[10px] text-slate-400 uppercase block">HIGHEST PUT OI (SUPPORT)</span>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">
              {snapshot.supportZone?.strike ? snapshot.supportZone.strike.toLocaleString("en-IN") : "—"}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Put OI: {formatIndianQuantity(snapshot.supportZone?.oi)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#090E17] border border-slate-800/90">
            <span className="text-[10px] text-slate-400 uppercase block">MAX PAIN ANCHOR</span>
            <div className="text-lg font-bold text-cyan-400 mt-0.5">
              {snapshot.maxPain !== null && snapshot.maxPain !== undefined ? snapshot.maxPain.toLocaleString("en-IN") : "—"}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Spot: {formatIndianCurrency(snapshot.spotPrice, currency)}
            </span>
          </div>
        </div>
      )}

      {/* Main View Display */}
      {subView === "FLOW" ? (
        <OptionFlowTable flowTrades={snapshot?.flowTrades || []} currency={currency} />
      ) : (
        snapshot && <OptionAnalyticsPanel snapshot={snapshot} currency={currency} />
      )}
    </div>
  );
}
