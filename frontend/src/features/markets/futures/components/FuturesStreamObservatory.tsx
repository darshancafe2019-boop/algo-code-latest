"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Radio,
  Play,
  Pause,
  Trash2,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  Lock,
  ChevronDown,
  X,
  Copy,
} from "lucide-react";
import { useMarketFeedStore, StreamEvent } from "@/lib/market-data/market-feed-store";
import { formatPrice } from "@/lib/formatters";

export function FuturesStreamObservatory() {
  const streamEvents = useMarketFeedStore((s) => s.streamEvents);
  const isPaused = useMarketFeedStore((s) => s.isStreamPaused);
  const setPaused = useMarketFeedStore((s) => s.setStreamPaused);
  const clearEvents = useMarketFeedStore((s) => s.clearStreamEvents);

  const [selectedProviderFilter, setSelectedProviderFilter] = useState<string>("ALL");
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<StreamEvent | null>(null);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const tableBottomRef = useRef<HTMLDivElement>(null);

  // Filter incoming stream
  const filteredEvents = useMemo(() => {
    return streamEvents.filter((ev) => {
      if (selectedProviderFilter !== "ALL") {
        if (!ev.provider.toUpperCase().includes(selectedProviderFilter)) return false;
      }
      if (selectedEventFilter !== "ALL") {
        if (ev.eventType.toUpperCase() !== selectedEventFilter) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toUpperCase();
        if (!ev.symbol.toUpperCase().includes(q) && !ev.provider.toUpperCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [streamEvents, selectedProviderFilter, selectedEventFilter, searchQuery]);

  // Auto-scroll when new events arrive and not paused
  useEffect(() => {
    if (autoScroll && !isPaused && tableBottomRef.current) {
      tableBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [filteredEvents.length, autoScroll, isPaused]);

  const handleCopyPayload = (ev: StreamEvent) => {
    // Redact sensitive credentials before copying
    const sanitized = { ...ev, rawPayload: sanitizePayload(ev.rawPayload) };
    navigator.clipboard.writeText(JSON.stringify(sanitized, null, 2));
    setCopiedId(ev.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sanitizePayload = (payload: any): any => {
    if (!payload || typeof payload !== "object") return payload;
    const clean = Array.isArray(payload) ? [...payload] : { ...payload };
    const SENSITIVE_KEYS = ["token", "secret", "password", "api_key", "key", "authorization", "auth"];
    for (const k in clean) {
      if (SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s))) {
        clean[k] = "[REDACTED_FOR_SECURITY]";
      } else if (typeof clean[k] === "object") {
        clean[k] = sanitizePayload(clean[k]);
      }
    }
    return clean;
  };

  return (
    <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl font-mono text-xs select-none space-y-3">
      {/* 1. Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <span>FUTURES REAL-TIME STREAM OBSERVATORY</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                {filteredEvents.length} Buffered (Max 3,000)
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Inspect normalized incoming futures ticks, mark prices, and depth</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setPaused(!isPaused)}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition border ${
              isPaused
                ? "bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm"
                : "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? "RESUME" : "PAUSE"}</span>
          </button>

          <button
            onClick={clearEvents}
            className="px-3 py-1.5 rounded-xl font-bold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5"
            title="Clear Event Tape"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>CLEAR</span>
          </button>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-3 py-1.5 rounded-xl font-bold transition border ${
              autoScroll
                ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                : "bg-slate-900 border-slate-800 text-slate-400"
            }`}
          >
            AUTO-SCROLL: {autoScroll ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {/* 2. Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
        {/* Provider Filters */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">PROVIDER:</span>
          {(["ALL", "BINANCE_USDM", "BINANCE_COINM", "DELTA", "DHAN", "UPSTOX"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setSelectedProviderFilter(p)}
              className={`px-2 py-1 rounded-lg text-[10.5px] font-bold transition ${
                selectedProviderFilter === p
                  ? "bg-cyan-500 text-slate-950 font-black shadow-sm"
                  : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Event Type Filters */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">EVENT:</span>
          {(["ALL", "TICK", "DEPTH", "MARK", "FUNDING", "TRADE", "OI"] as const).map((e) => (
            <button
              key={e}
              onClick={() => setSelectedEventFilter(e)}
              className={`px-2 py-1 rounded-lg text-[10.5px] font-bold transition ${
                selectedEventFilter === e
                  ? "bg-purple-500 text-white font-black shadow-sm"
                  : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {e}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative w-48">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter symbol..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1 text-xs text-white outline-none focus:border-cyan-500 font-mono"
          />
        </div>
      </div>

      {/* 3. Event Tape Table */}
      <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/40">
        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-[#0A1020] border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase">
              <tr>
                <th className="py-2.5 px-3">Received Time</th>
                <th className="py-2.5 px-3">Exchange Time</th>
                <th className="py-2.5 px-3">Provider</th>
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3 text-center">Event</th>
                <th className="py-2.5 px-3 text-right">LTP / Price</th>
                <th className="py-2.5 px-3 text-right">Bid / Ask</th>
                <th className="py-2.5 px-3 text-right">Volume</th>
                <th className="py-2.5 px-3 text-right">Latency</th>
                <th className="py-2.5 px-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-600 text-xs">
                    {isPaused
                      ? "Stream paused. Click RESUME to buffer real-time events."
                      : "Streaming active. Waiting for matching live packets..."}
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev) => {
                  const isTick = ev.eventType === "TICK";
                  const isTrade = ev.eventType === "TRADE";
                  return (
                    <tr key={ev.id} className="hover:bg-slate-900/60 transition text-xs font-mono">
                      <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                        {ev.receivedTime.split("T")[1]?.slice(0, 12) || ev.receivedTime}
                      </td>
                      <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                        {ev.exchangeTime.split("T")[1]?.slice(0, 12) || ev.exchangeTime}
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-slate-300 border border-slate-800">
                          {ev.provider}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-bold text-white whitespace-nowrap">{ev.symbol}</td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isTick
                              ? "bg-cyan-500/15 text-cyan-300"
                              : isTrade
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-purple-500/15 text-purple-300"
                          }`}
                        >
                          {ev.eventType}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-100">
                        {ev.ltp != null ? formatPrice(ev.ltp) : "—"}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-300">
                        {ev.bid != null && ev.ask != null ? `${formatPrice(ev.bid)} / ${formatPrice(ev.ask)}` : "—"}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-400">
                        {ev.quantity != null ? ev.quantity : "—"}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-400">
                        {ev.latency != null ? `${ev.latency}ms` : "—"}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => setSelectedEvent(ev)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold transition"
                        >
                          Raw
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          <div ref={tableBottomRef} />
        </div>
      </div>

      {/* 4. Raw Event Drawer / Inspector Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B111E] border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 space-y-0">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 bg-[#080D17] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Event Payload Inspector</h3>
                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  {selectedEvent.symbol} ({selectedEvent.eventType})
                </span>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Scrubbed JSON Payload */}
            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Provenance: {selectedEvent.provider} • Received: {selectedEvent.receivedTime}</span>
                <button
                  onClick={() => handleCopyPayload(selectedEvent)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{copiedId === selectedEvent.id ? "Copied!" : "Copy JSON"}</span>
                </button>
              </div>

              <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto">
                {JSON.stringify(
                  {
                    canonicalId: selectedEvent.symbol,
                    provider: selectedEvent.provider,
                    eventType: selectedEvent.eventType,
                    exchangeTimestamp: selectedEvent.exchangeTime,
                    receivedTimestamp: selectedEvent.receivedTime,
                    latencyMs: selectedEvent.latency,
                    price: selectedEvent.ltp,
                    bid: selectedEvent.bid,
                    ask: selectedEvent.ask,
                    quantity: selectedEvent.quantity,
                    sequence: selectedEvent.sequence,
                    rawPayload: sanitizePayload(selectedEvent.rawPayload),
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
