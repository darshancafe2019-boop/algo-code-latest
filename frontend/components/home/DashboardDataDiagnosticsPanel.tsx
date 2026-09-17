"use client";

import React, { useState } from "react";
import { useMarketGatewayContext } from "@/context/MarketGatewayContext";
import { formatCurrency, formatPercent, formatDecimal } from "@/lib/formatters";
import { Radio, X, CheckCircle2, AlertTriangle, Activity } from "lucide-react";

interface DashboardDataDiagnosticsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  indicesList: Array<{
    symbol: string;
    ltp: number;
    change: number;
    pct: number;
    isUp: boolean;
    source: string;
    status: string;
    lastTick?: string;
  }>;
}

export function DashboardDataDiagnosticsPanel({
  isOpen,
  onClose,
  indicesList = [],
}: DashboardDataDiagnosticsPanelProps) {
  const { quotes, connectionStatus, providerHealth, getQuote } = useMarketGatewayContext();
  const [selectedSymbol, setSelectedSymbol] = useState<string>("NIFTY 50");

  if (!isOpen) return null;

  const sym = selectedSymbol;
  const lookupKeys = [
    sym,
    sym.toUpperCase(),
    sym.replace(" 50", ""),
    `NSE:${sym.replace(" 50", "")}`,
    `BSE:${sym.replace(" 50", "")}`,
  ];

  let activeQuote: any = null;
  for (const k of lookupKeys) {
    const q = getQuote(k);
    if (q) {
      activeQuote = q;
      break;
    }
  }

  const fallbackEntry = indicesList.find((i) => i.symbol === sym);
  const ltp = activeQuote?.last_price ?? fallbackEntry?.ltp ?? 0;
  const prevClose = activeQuote?.close ?? (activeQuote?.open ? activeQuote.open : (fallbackEntry ? fallbackEntry.ltp - fallbackEntry.change : 0));
  const change = activeQuote?.open ? ltp - activeQuote.open : (fallbackEntry?.change ?? 0);
  const changePct = activeQuote?.change_pct ?? fallbackEntry?.pct ?? 0;
  const isLive = activeQuote != null && activeQuote.last_price > 0 && (activeQuote.age_seconds ?? 0) < 30;
  const provider = activeQuote?.provider?.toUpperCase() || fallbackEntry?.source || "DHAN / GATEWAY";
  const dataAgeMs = activeQuote?.age_seconds != null ? Math.round(activeQuote.age_seconds * 1000) : null;
  const latencyMs = activeQuote?.feed_latency_ms != null ? Math.round(activeQuote.feed_latency_ms) : null;

  const securityIdMap: Record<string, string> = {
    "NIFTY 50": "13 (NSE_INDEX)",
    "NIFTY": "13 (NSE_INDEX)",
    "BANKNIFTY": "25 (NSE_INDEX)",
    "FINNIFTY": "27 (NSE_INDEX)",
    "SENSEX": "51 (BSE_INDEX)",
    "MIDCPNIFTY": "28 (NSE_INDEX)",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 font-mono text-xs">
      <div className="w-full max-w-2xl bg-[#080E20] border border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-950/40 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900/90 border-b border-cyan-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Radio className={`w-4 h-4 ${connectionStatus === "LIVE" ? "text-emerald-400 animate-pulse" : "text-amber-400"}`} />
            <span className="font-bold text-sm text-cyan-300 tracking-wider uppercase">
              DASHBOARD LIVE FEED DIAGNOSTICS (DEV)
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar text-slate-200">
          {/* Symbol Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase">
              Select Audited Index / Benchmark
            </label>
            <div className="flex flex-wrap gap-2">
              {["NIFTY 50", "BANKNIFTY", "FINNIFTY", "SENSEX", "MIDCPNIFTY"].map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSymbol(s)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition border ${
                    selectedSymbol === s
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-sm"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Metric Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Provider &amp; Security ID</span>
              <div className="text-sm font-bold text-cyan-300">{provider}</div>
              <div className="text-[10px] text-slate-400">Security ID: {securityIdMap[sym] || "13 (NSE)"}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Live Feed State</span>
              <div className="flex items-center gap-1.5">
                {isLive ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> LIVE STREAMING
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5" /> LAST TRADED / SESSION CLOSED
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400">Gateway Socket: {connectionStatus}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Live Price (LTP)</span>
              <div className="text-base font-bold text-white tracking-tight">
                {formatCurrency(ltp, "₹", 2)}
              </div>
              <div className="text-[10px] text-slate-400">
                Prev Close / Open: {formatCurrency(prevClose, "₹", 2)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Latency &amp; Freshness</span>
              <div className="text-sm font-bold text-white">
                Age: {dataAgeMs != null ? `${dataAgeMs}ms` : "—"} • Latency: {latencyMs != null ? `${latencyMs}ms` : "—"}
              </div>
              <div className="text-[10px] text-slate-400">Mode: {activeQuote?.data_mode || "SNAPSHOT/CACHED"}</div>
            </div>
          </div>

          {/* Detailed Timestamps */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 font-mono text-[11px]">
            <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wide">Timestamp Audit</div>
            <div className="grid grid-cols-2 gap-2 text-slate-300">
              <div><span className="text-slate-500">Provider Timestamp:</span> {activeQuote?.event_timestamp || "—"}</div>
              <div><span className="text-slate-500">Gateway Received:</span> {activeQuote?.received_timestamp || fallbackEntry?.lastTick || "—"}</div>
              <div><span className="text-slate-500">Calculated Change:</span> {change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2)} ({formatPercent(changePct, 2, "—", false, true)})</div>
              <div><span className="text-slate-500">Source Channel:</span> {activeQuote?.provider ? `${activeQuote.provider} WebSocket` : "Gateway Snapshot / DB Baseline"}</div>
            </div>
          </div>

          {/* Provider Health Summary */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Provider Connectivity Matrix</div>
            <div className="grid grid-cols-3 gap-2">
              {providerHealth.map((p) => (
                <div key={p.provider_id} className="p-2 rounded bg-slate-950/70 border border-slate-800 text-[10.5px]">
                  <div className="font-bold text-white truncate">{p.provider_id}</div>
                  <div className={`text-[10px] font-bold ${["LIVE", "UP", "ACTIVE", "READY"].includes((p.status || "").toUpperCase()) ? "text-emerald-400" : "text-slate-500"}`}>
                    {p.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-slate-400 text-[11px]">
          <span>Quant.OS Dashboard Telemetry v2.4</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold border border-cyan-500/40 transition"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
}
