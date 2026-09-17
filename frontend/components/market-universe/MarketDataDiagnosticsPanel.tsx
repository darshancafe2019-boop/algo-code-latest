"use client";

import React, { useState } from "react";
import { useMarketGatewayContext } from "@/context/MarketGatewayContext";
import { useSymbolQuote } from "@/lib/market-data/market-feed-store";
import { MarketInstrument } from "@/types/market-universe";
import { formatPrice } from "@/lib/formatters";
import { resolveInstrumentProvider } from "@/lib/market-data/row-status";
import { Activity, X, RefreshCw, Radio, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";

interface MarketDataDiagnosticsPanelProps {
  instruments: MarketInstrument[];
  isOpen: boolean;
  onClose: () => void;
}

export function MarketDataDiagnosticsPanel({
  instruments,
  isOpen,
  onClose,
}: MarketDataDiagnosticsPanelProps) {
  const { connectionStatus, providerHealth, getQuote } = useMarketGatewayContext();
  const [selectedSymbol, setSelectedSymbol] = useState<string>(
    instruments[0]?.canonical_symbol || instruments[0]?.symbol || "BTC/USDT"
  );

  const currentInstrument =
    instruments.find(
      (i) =>
        i.canonical_symbol === selectedSymbol ||
        i.symbol === selectedSymbol ||
        i.instrument_id === selectedSymbol
    ) || instruments[0];

  const sym = currentInstrument?.canonical_symbol || currentInstrument?.symbol || selectedSymbol;

  // Real-time reactive quote subscription for selected instrument
  const liveTick = useSymbolQuote(sym);

  if (!isOpen) return null;

  const activeQuote = liveTick ? {
    symbol: liveTick.symbol,
    exchange: liveTick.exchange,
    provider: liveTick.provider,
    last_price: liveTick.lastPrice,
    bid: liveTick.bid,
    ask: liveTick.ask,
    volume: liveTick.volume,
    high: liveTick.high,
    low: liveTick.low,
    open: liveTick.open,
    close: liveTick.close,
    change_pct: liveTick.changePercent,
    is_stale: liveTick.isStale,
    age_seconds: (liveTick.ageMs || 0) / 1000,
    feed_latency_ms: liveTick.feedLatencyMs,
    event_timestamp: liveTick.eventTimestamp,
    received_timestamp: liveTick.receivedTimestamp,
    data_mode: liveTick.dataMode,
    status: liveTick.status,
  } : getQuote(sym) || (currentInstrument?.canonical_symbol ? getQuote(currentInstrument.canonical_symbol) : null);

  const healthyProvidersSet = new Set<string>();
  providerHealth.forEach((p) => {
    const s = (p.status || "").toUpperCase();
    if (["LIVE", "UP", "ACTIVE", "READY", "AUTHENTICATED"].includes(s)) {
      healthyProvidersSet.add(p.provider_id.toUpperCase());
    }
  });

  const { provider, providerLabel } = resolveInstrumentProvider(
    currentInstrument || {},
    healthyProvidersSet,
    activeQuote
  );

  const ltp = activeQuote?.last_price ?? currentInstrument?.last_price ?? 0;
  const providerTime = activeQuote?.event_timestamp || "—";
  const receivedTime = activeQuote?.received_timestamp || "—";
  const dataAgeMs = activeQuote?.age_seconds != null ? Math.round(activeQuote.age_seconds * 1000) : null;
  const latencyMs = activeQuote?.feed_latency_ms != null ? Math.round(activeQuote.feed_latency_ms) : null;
  const sourceName = activeQuote?.provider
    ? `${activeQuote.provider.toUpperCase()} (${activeQuote.exchange || "FEED"})`
    : currentInstrument?.exchange
    ? `${currentInstrument.exchange.toUpperCase()} (Static / Baseline)`
    : "Unassigned";

  const isLive = activeQuote != null && activeQuote.last_price > 0 && (activeQuote.age_seconds ?? 0) < 30;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[#080E20] border border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-950/40 overflow-hidden flex flex-col font-mono text-xs">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900/90 border-b border-cyan-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Radio className={`w-4 h-4 ${connectionStatus === "LIVE" ? "text-emerald-400 animate-pulse" : "text-amber-400"}`} />
            <span className="font-bold text-sm text-cyan-300 tracking-wider uppercase">
              MARKET DATA FEED DIAGNOSTICS (DEV)
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
              Select Audited Instrument
            </label>
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-cyan-400"
            >
              {instruments.slice(0, 40).map((inst) => {
                const s = inst.canonical_symbol || inst.symbol || inst.instrument_id;
                return (
                  <option key={s} value={s}>
                    {s} ({inst.exchange || "GLOBAL"} • {inst.asset_class || "ASSET"})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Diagnostic Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Authoritative Provider</span>
              <div className="text-sm font-bold text-cyan-300">
                {providerLabel || provider?.toUpperCase() || "NONE"}
              </div>
              <div className="text-[10px] text-slate-400">Exchange: {currentInstrument?.exchange || "—"}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Feed State</span>
              <div className="flex items-center gap-1.5">
                {isLive ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> LIVE STREAMING
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5" /> LAST TRADED / STALE
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400">WS Gateway: {connectionStatus}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Live Last Price (LTP)</span>
              <div className="text-base font-bold text-white tracking-tight">
                {formatPrice(ltp, currentInstrument?.currency === "INR" ? "₹" : "$")}
              </div>
              <div className="text-[10px] text-slate-400">
                Bid: {formatPrice(activeQuote?.bid ?? currentInstrument?.bid, "$")} / Ask: {formatPrice(activeQuote?.ask ?? currentInstrument?.ask, "$")}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Latency & Freshness</span>
              <div className="text-sm font-bold text-white">
                Age: {dataAgeMs != null ? `${dataAgeMs}ms` : "—"} • Latency: {latencyMs != null ? `${latencyMs}ms` : "—"}
              </div>
              <div className="text-[10px] text-slate-400">Mode: {activeQuote?.data_mode || "STATIC/CACHED"}</div>
            </div>
          </div>

          {/* Detailed Timestamps & Raw Trace */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 font-mono text-[11px]">
            <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wide">End-to-End Pipeline Trace</div>
            <div className="grid grid-cols-2 gap-2 text-slate-300">
              <div><span className="text-slate-500">Provider Timestamp:</span> {providerTime}</div>
              <div><span className="text-slate-500">Gateway Received:</span> {receivedTime}</div>
              <div><span className="text-slate-500">Canonical Symbol:</span> {sym}</div>
              <div><span className="text-slate-500">Source Adapter:</span> {sourceName}</div>
            </div>
          </div>

          {/* Active Provider Matrix Summary */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Registered Gateway Adapters</div>
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
          <span>Quant.OS Market Data Auditor v2.4</span>
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
