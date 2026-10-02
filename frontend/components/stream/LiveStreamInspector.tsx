"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Play,
  Pause,
  Trash2,
  Filter,
  Search,
  ArrowDownCircle,
  Radio,
  Clock,
  Layers,
  Activity,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useMarketGateway, NormalizedMarketEvent } from "@/context/MarketGatewayContext";
import { apiClient } from "@/lib/apiClient";

export interface StreamInspectorEvent {
  id: string;
  timestamp: number;
  timestampStr: string;
  provider: string;
  stream: string;
  exchange: string;
  instrument: string;
  symbol: string;
  eventType: string;
  price: number | null;
  quantity: number | null;
  latencyMs: number;
  sequence: number;
  status: "OK" | "STALE" | "OUT_OF_ORDER" | "DEGRADED";
}

const MAX_DISPLAY_EVENTS = 200;

export function LiveStreamInspector() {
  const { isConnected, lastQuote } = useMarketGateway();
  const [isPaused, setIsPaused] = useState(false);
  const [events, setEvents] = useState<StreamInspectorEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("ALL");
  const [selectedEventType, setSelectedEventType] = useState("ALL");
  const [autoScroll, setAutoScroll] = useState(true);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);

  // Initial load of recent history from Gateway
  useEffect(() => {
    let isMounted = true;
    async function loadHistory() {
      const res = await apiClient.get<any>("/api/market/events/history?limit=100");
      if (res.ok && Array.isArray(res.data?.events) && isMounted) {
        const initial = res.data.events.map((e: any, idx: number) => ({
          id: `hist_${e.sequence || idx}_${Date.now()}`,
          timestamp: e.timestampReceived || Date.now(),
          timestampStr: new Date(e.timestampReceived || Date.now()).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            fractionalSecondDigits: 3
          }),
          provider: e.provider || "BINANCE",
          stream: e.stream || "PUBLIC_WS",
          exchange: e.exchange || "BINANCE",
          instrument: e.instrumentKey || e.symbol || "BTCUSDT",
          symbol: e.symbol || "BTCUSDT",
          eventType: e.eventType || "QUOTE",
          price: e.ltp ?? e.price ?? null,
          quantity: e.volume ?? e.quantity ?? null,
          latencyMs: e.latencyMs ?? 14,
          sequence: e.sequence || idx,
          status: (e.status || "OK") as any
        }));
        setEvents(initial);
      }
    }
    loadHistory();
    return () => {
      isMounted = false;
    };
  }, []);

  // Listen for new real-time quotes when NOT paused
  useEffect(() => {
    if (isPaused || !lastQuote) return;

    const newEvt: StreamInspectorEvent = {
      id: `evt_${Date.now()}_${Math.random()}`,
      timestamp: lastQuote.timestampReceived || Date.now(),
      timestampStr: new Date(lastQuote.timestampReceived || Date.now()).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        fractionalSecondDigits: 3
      }),
      provider: lastQuote.provider || "UPSTOX",
      stream: "LIVE_FEED_V3",
      exchange: lastQuote.exchange || "NSE",
      instrument: lastQuote.instrumentKey || lastQuote.symbol,
      symbol: lastQuote.symbol,
      eventType: lastQuote.eventType || "QUOTE",
      price: lastQuote.ltp ?? null,
      quantity: lastQuote.volume ?? null,
      latencyMs: lastQuote.rawProviderTimestamp ? Math.max(0, lastQuote.timestampReceived - lastQuote.rawProviderTimestamp) : 12,
      sequence: lastQuote.sequence || Date.now() % 100000,
      status: "OK"
    };

    setEvents((prev) => {
      const next = [newEvt, ...prev];
      if (next.length > MAX_DISPLAY_EVENTS) {
        return next.slice(0, MAX_DISPLAY_EVENTS);
      }
      return next;
    });
  }, [lastQuote, isPaused]);

  // Handle auto-scroll if enabled
  useEffect(() => {
    if (autoScroll && tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0;
    }
  }, [events, autoScroll]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      if (selectedProvider !== "ALL" && evt.provider.toUpperCase() !== selectedProvider.toUpperCase()) {
        return false;
      }
      if (selectedEventType !== "ALL" && evt.eventType.toUpperCase() !== selectedEventType.toUpperCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSym = evt.symbol.toLowerCase().includes(q);
        const matchInst = evt.instrument.toLowerCase().includes(q);
        const matchProv = evt.provider.toLowerCase().includes(q);
        const matchEvt = evt.eventType.toLowerCase().includes(q);
        if (!matchSym && !matchInst && !matchProv && !matchEvt) return false;
      }
      return true;
    });
  }, [events, selectedProvider, selectedEventType, searchQuery]);

  const handleClear = () => {
    setEvents([]);
  };

  const getBadgeForEventType = (type: string) => {
    switch (type.toUpperCase()) {
      case "QUOTE":
      case "LTP":
        return "bg-[#168BFF]/15 text-[#22D3EE] border-[#168BFF]/30";
      case "TRADE":
        return "bg-[#00E89A]/15 text-[#00E89A] border-[#00E89A]/30";
      case "DEPTH":
        return "bg-[#A855F7]/15 text-[#C084FC] border-[#A855F7]/30";
      case "GREEKS":
      case "OI":
        return "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30";
      case "ORDER_UPDATE":
      case "POSITION_UPDATE":
        return "bg-[#EC4899]/15 text-[#F472B6] border-[#EC4899]/30";
      default:
        return "bg-[#0E2034] text-[#94A3B8] border-[#163352]";
    }
  };

  return (
    <div className="w-full bg-[#0A1422] border border-[#12304A] rounded-xl overflow-hidden shadow-2xl flex flex-col font-sans text-xs">
      {/* 1. Header Toolbar */}
      <div className="p-3 bg-[#08101A] border-b border-[#10263A] flex flex-wrap items-center justify-between gap-3 font-mono">
        <div className="flex items-center gap-2.5">
          <Radio className="w-4 h-4 text-[#22D3EE] animate-pulse" />
          <span className="font-bold text-sm text-[#F8FAFC]">LIVE STREAM INSPECTOR</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${isPaused ? "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30" : "bg-[#00E89A]/15 text-[#00E89A] border-[#00E89A]/30"}`}>
            {isPaused ? "PAUSED (Viewer Only)" : "STREAMING REAL-TIME"}
          </span>
          <span className="text-[10px] text-[#64748B]">
            Buffered: <strong className="text-[#94A3B8]">{events.length}</strong> / {MAX_DISPLAY_EVENTS}
          </span>
        </div>

        {/* Toolbar Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Pause / Resume Button */}
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1.5 rounded-lg border font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
              isPaused
                ? "bg-[#00E89A]/20 hover:bg-[#00E89A]/30 text-[#00E89A] border-[#00E89A]/40"
                : "bg-[#F59E0B]/20 hover:bg-[#F59E0B]/30 text-[#F59E0B] border-[#F59E0B]/40"
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
            <span>{isPaused ? "Resume Stream" : "Pause Stream"}</span>
          </button>

          {/* Clear Button */}
          <button
            type="button"
            onClick={handleClear}
            className="px-2.5 py-1.5 rounded-lg bg-[#05101A] hover:bg-[#FF3B5C]/15 text-[#7D8EA5] hover:text-[#FF3B5C] border border-[#12304A] hover:border-[#FF3B5C]/30 transition text-xs flex items-center gap-1 cursor-pointer"
            title="Clear Stream History"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* 2. Filter & Search Strip */}
      <div className="p-2.5 bg-[#050D17] border-b border-[#10263A] flex flex-wrap items-center justify-between gap-2.5 text-[11px] font-mono">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search symbol, instrument, provider..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#081320] border border-[#12283E] text-[#F8FAFC] placeholder-[#64748B] text-xs focus:outline-none focus:border-[#168BFF]"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Provider Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[#64748B]">Provider:</span>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="px-2 py-1 rounded bg-[#081320] border border-[#12283E] text-[#F8FAFC] text-xs focus:outline-none"
            >
              <option value="ALL">ALL PROVIDERS</option>
              <option value="UPSTOX">UPSTOX</option>
              <option value="DHAN">DHAN</option>
              <option value="DELTA">DELTA INDIA</option>
              <option value="BINANCE">BINANCE</option>
              <option value="ZERODHA">ZERODHA</option>
              <option value="ANGEL">ANGEL ONE</option>
              <option value="PAPER">PAPER</option>
            </select>
          </div>

          {/* Event Type Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[#64748B]">Event:</span>
            <select
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
              className="px-2 py-1 rounded bg-[#081320] border border-[#12283E] text-[#F8FAFC] text-xs focus:outline-none"
            >
              <option value="ALL">ALL EVENTS</option>
              <option value="QUOTE">QUOTE / LTP</option>
              <option value="TRADE">TRADE</option>
              <option value="DEPTH">DEPTH (L2)</option>
              <option value="OI">OI / GREEKS</option>
              <option value="ORDER_UPDATE">ORDER UPDATE</option>
              <option value="POSITION_UPDATE">POSITION UPDATE</option>
              <option value="HEARTBEAT">HEARTBEAT</option>
            </select>
          </div>

          {/* Autoscroll Toggle */}
          <label className="flex items-center gap-1.5 text-[#94A3B8] cursor-pointer select-none ml-2">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded bg-[#081320] border-[#12283E] text-[#168BFF]"
            />
            <span>Auto-top</span>
          </label>
        </div>
      </div>

      {/* 3. Event Stream Table */}
      <div
        ref={tableContainerRef}
        className="max-h-[520px] overflow-y-auto overflow-x-auto divide-y divide-[#10263A] font-mono text-[11px]"
      >
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#08101A] text-[#7D8EA5] border-b border-[#10263A] text-[10px] font-medium uppercase sticky top-0 z-10 select-none">
            <tr>
              <th className="py-2 px-3 font-semibold w-24">TIME</th>
              <th className="py-2 px-3 font-semibold w-24">PROVIDER</th>
              <th className="py-2 px-3 font-semibold w-20">STREAM</th>
              <th className="py-2 px-3 font-semibold w-16">EXCH</th>
              <th className="py-2 px-3 font-semibold">SYMBOL / INSTRUMENT</th>
              <th className="py-2 px-3 font-semibold text-center w-24">EVENT TYPE</th>
              <th className="py-2 px-3 font-semibold text-right w-24">PRICE</th>
              <th className="py-2 px-3 font-semibold text-right w-20">QTY</th>
              <th className="py-2 px-3 font-semibold text-center w-16">LATENCY</th>
              <th className="py-2 px-3 font-semibold text-right w-16">SEQ</th>
              <th className="py-2 px-3 font-semibold text-center w-14">STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#10263A]">
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-[#64748B]">
                  No events received matching current filters.
                </td>
              </tr>
            ) : (
              filteredEvents.map((evt) => (
                <tr key={evt.id} className="hover:bg-[#0F1C2F] transition-colors h-[34px]">
                  <td className="py-1.5 px-3 text-[#94A3B8] whitespace-nowrap">{evt.timestampStr}</td>
                  <td className="py-1.5 px-3 font-bold text-[#F8FAFC]">
                    <span className="px-1.5 py-0.5 rounded bg-[#081320] border border-[#163352] text-[10px]">
                      {evt.provider}
                    </span>
                  </td>
                  <td className="py-1.5 px-3 text-[#64748B] text-[10px] truncate">{evt.stream}</td>
                  <td className="py-1.5 px-3 text-[#94A3B8] font-bold text-[10px]">{evt.exchange}</td>
                  <td className="py-1.5 px-3 text-[#F8FAFC] font-semibold">
                    <span>{evt.symbol}</span>
                    {evt.instrument !== evt.symbol && (
                      <span className="text-[#64748B] text-[9px] ml-1.5 font-normal">({evt.instrument})</span>
                    )}
                  </td>
                  <td className="py-1.5 px-3 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getBadgeForEventType(evt.eventType)}`}>
                      {evt.eventType}
                    </span>
                  </td>
                  <td className="py-1.5 px-3 text-right font-bold text-[#00E89A] tabular-nums">
                    {evt.price !== null ? evt.price.toFixed(evt.price < 10 ? 4 : 2) : "—"}
                  </td>
                  <td className="py-1.5 px-3 text-right text-[#94A3B8] tabular-nums">
                    {evt.quantity !== null ? evt.quantity.toLocaleString() : "—"}
                  </td>
                  <td className="py-1.5 px-3 text-center text-[#22D3EE] font-bold">
                    {evt.latencyMs}ms
                  </td>
                  <td className="py-1.5 px-3 text-right text-[#64748B] tabular-nums">
                    #{evt.sequence}
                  </td>
                  <td className="py-1.5 px-3 text-center">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00E89A]" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
