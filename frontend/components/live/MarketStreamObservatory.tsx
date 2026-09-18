"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  Trash2,
  Search,
  Filter,
  Code,
  ArrowDown,
  Clock,
  Layers,
  Activity,
  Zap,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Eye,
  X,
} from "lucide-react";
import { useMarketFeedStore, StreamEvent } from "@/lib/market-data/market-feed-store";
import { formatPrice } from "@/lib/formatters";

interface MarketStreamObservatoryProps {
  initialProvider?: string;
  initialSymbol?: string;
}

export function MarketStreamObservatory({ initialProvider, initialSymbol }: MarketStreamObservatoryProps) {
  const streamEvents = useMarketFeedStore((state) => state.streamEvents);
  const isPaused = useMarketFeedStore((state) => state.isStreamPaused);
  const setStreamPaused = useMarketFeedStore((state) => state.setStreamPaused);
  const clearStreamEvents = useMarketFeedStore((state) => state.clearStreamEvents);

  const [providerFilter, setProviderFilter] = useState<string>(initialProvider || "ALL");
  const [symbolFilter, setSymbolFilter] = useState<string>(initialSymbol || "");
  const [eventFilter, setEventFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [selectedRawEvent, setSelectedRawEvent] = useState<StreamEvent | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when new events arrive if enabled
  useEffect(() => {
    if (autoScroll && !isPaused && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [streamEvents.length, autoScroll, isPaused]);

  // Filtered Events with memoization
  const filteredEvents = useMemo(() => {
    return streamEvents.filter((ev) => {
      if (providerFilter !== "ALL" && ev.provider.toUpperCase() !== providerFilter.toUpperCase()) {
        return false;
      }
      if (symbolFilter && !ev.symbol.toUpperCase().includes(symbolFilter.toUpperCase())) {
        return false;
      }
      if (eventFilter !== "ALL" && ev.eventType.toUpperCase() !== eventFilter.toUpperCase()) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toUpperCase();
        return (
          ev.symbol.toUpperCase().includes(q) ||
          ev.provider.toUpperCase().includes(q) ||
          ev.eventType.toUpperCase().includes(q)
        );
      }
      return true;
    });
  }, [streamEvents, providerFilter, symbolFilter, eventFilter, searchQuery]);

  return (
    <div className="flex flex-col h-[780px] bg-[#070D1E] border border-[#1A263D] rounded-2xl overflow-hidden shadow-2xl font-sans">
      {/* Top Header & Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#0A1227] border-b border-[#1A263D]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30">
            <Activity className="h-4 w-4 text-cyan-400 animate-pulse" />
            <span className="text-xs font-mono font-bold tracking-wider text-cyan-300">STREAM OBSERVATORY</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Ring Buffer: <strong className="text-slate-200">{streamEvents.length}</strong> / 3,000 events
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            Filtered: <strong className="text-cyan-300">{filteredEvents.length}</strong>
          </span>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Provider Filter */}
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-[#101C38] border border-[#22355A] rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Providers</option>
            <option value="DHAN">DhanHQ v2</option>
            <option value="UPSTOX">Upstox V3</option>
            <option value="DELTA">Delta Exchange</option>
            <option value="PAPER">Paper Simulation</option>
          </select>

          {/* Event Filter */}
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-[#101C38] border border-[#22355A] rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Event Types</option>
            <option value="TICK">Ticks</option>
            <option value="LIVE">Live Quotes</option>
            <option value="TRADE">Trades</option>
            <option value="DEPTH">Orderbook Depth</option>
            <option value="STALE">Stale Events</option>
          </select>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search symbol/provider..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-[#101C38] border border-[#22355A] rounded-xl text-xs font-mono text-slate-200 placeholder-slate-500 w-44 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Pause/Resume */}
          <button
            type="button"
            onClick={() => setStreamPaused(!isPaused)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
              isPaused
                ? "bg-amber-600/30 text-amber-300 border border-amber-500/40 hover:bg-amber-600/50"
                : "bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/50"
            }`}
          >
            {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            <span>{isPaused ? "RESUME" : "PAUSE"}</span>
          </button>

          {/* Auto Scroll Toggle */}
          <button
            type="button"
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono transition-all ${
              autoScroll
                ? "bg-cyan-950/40 text-cyan-300 border border-cyan-500/40"
                : "bg-[#101C38] text-slate-400 border border-[#22355A]"
            }`}
          >
            <ArrowDown className="h-3.5 w-3.5" />
            <span>Auto-scroll</span>
          </button>

          {/* Clear */}
          <button
            type="button"
            onClick={clearStreamEvents}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-950/30 text-red-400 border border-red-900/40 text-xs font-mono hover:bg-red-900/40 transition-all"
            title="Clear Stream Buffer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Stream Table */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-auto divide-y divide-[#152037]">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead className="sticky top-0 z-10 bg-[#0C152E] text-[11px] font-semibold tracking-wider text-slate-400 border-b border-[#1A263D]">
            <tr>
              <th className="py-2.5 px-3">RECEIVED (UTC)</th>
              <th className="py-2.5 px-3">EXCHANGE TIME</th>
              <th className="py-2.5 px-3">PROVIDER</th>
              <th className="py-2.5 px-3">SYMBOL</th>
              <th className="py-2.5 px-3">TYPE</th>
              <th className="py-2.5 px-3 text-right">LTP</th>
              <th className="py-2.5 px-3 text-right">BID / ASK</th>
              <th className="py-2.5 px-3 text-right">QTY / OI</th>
              <th className="py-2.5 px-3 text-right">LATENCY</th>
              <th className="py-2.5 px-3 text-center">PAYLOAD</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#131D33] text-slate-300">
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-16 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <Activity className="h-8 w-8 text-slate-600 animate-pulse" />
                    <span className="text-sm">Waiting for incoming normalized market events...</span>
                    <span className="text-[11px] text-slate-600">Events will stream here automatically when live feeds are active.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredEvents.map((ev) => {
                const isDhan = ev.provider.toUpperCase() === "DHAN";
                const isUpstox = ev.provider.toUpperCase() === "UPSTOX";
                const isDelta = ev.provider.toUpperCase() === "DELTA";

                const provBadgeClass = isDhan
                  ? "bg-blue-950/60 text-blue-300 border-blue-500/30"
                  : isUpstox
                  ? "bg-purple-950/60 text-purple-300 border-purple-500/30"
                  : isDelta
                  ? "bg-amber-950/60 text-amber-300 border-amber-500/30"
                  : "bg-emerald-950/60 text-emerald-300 border-emerald-500/30";

                const latencyBadge =
                  ev.latency < 50
                    ? "text-emerald-400"
                    : ev.latency < 250
                    ? "text-amber-400"
                    : "text-red-400";

                return (
                  <tr
                    key={ev.id}
                    className="hover:bg-[#0F1C38]/60 transition-colors group cursor-pointer"
                    onClick={() => setSelectedRawEvent(ev)}
                  >
                    <td className="py-2 px-3 text-slate-400 text-[11px]">
                      {ev.receivedTime ? new Date(ev.receivedTime).toISOString().slice(11, 23) : "--"}
                    </td>
                    <td className="py-2 px-3 text-slate-500 text-[11px]">
                      {ev.exchangeTime ? new Date(ev.exchangeTime).toISOString().slice(11, 23) : "--"}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${provBadgeClass}`}>
                        {ev.provider}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                      {ev.symbol}
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                        {ev.eventType}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-100">
                      {ev.ltp !== null && ev.ltp !== undefined ? formatPrice(ev.ltp) : "--"}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400 text-[11px]">
                      {ev.bid !== null ? formatPrice(ev.bid) : "--"} / {ev.ask !== null ? formatPrice(ev.ask) : "--"}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400 text-[11px]">
                      {ev.quantity !== null ? ev.quantity.toLocaleString() : "--"} / {ev.oi !== null ? ev.oi.toLocaleString() : "--"}
                    </td>
                    <td className={`py-2 px-3 text-right font-bold text-[11px] ${latencyBadge}`}>
                      {ev.latency.toFixed(1)}ms
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRawEvent(ev);
                        }}
                        className="p-1 rounded bg-[#16223E] hover:bg-cyan-900/50 text-slate-400 hover:text-cyan-300 transition-colors"
                        title="View Payload"
                      >
                        <Code className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Raw Payload Modal / Drawer */}
      {selectedRawEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0A1227] border border-[#213254] rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-[#1A263D] pb-3">
              <div className="flex items-center gap-2">
                <Code className="h-5 w-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">
                  Normalized Event Payload — {selectedRawEvent.symbol} ({selectedRawEvent.provider})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRawEvent(null)}
                className="p-1 rounded-lg bg-[#142038] text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-[#050A17] p-4 rounded-xl border border-[#16233B] max-h-96 overflow-y-auto text-xs text-emerald-400">
              <pre>{JSON.stringify(selectedRawEvent, null, 2)}</pre>
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
              <span>Security Note: Sensitive credentials or access tokens are strictly scrubbed.</span>
              <button
                type="button"
                onClick={() => setSelectedRawEvent(null)}
                className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
