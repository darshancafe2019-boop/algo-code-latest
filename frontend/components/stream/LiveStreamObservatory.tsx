"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { NormalizedEvent } from "@/types/data-core";
import {
  Activity,
  Filter,
  Pause,
  Play,
  RefreshCw,
  Search,
  Trash2,
  X,
  Code,
  CheckCircle2,
  Clock,
  Layers,
} from "lucide-react";

export function LiveStreamObservatory() {
  const [isPaused, setIsPaused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomain, setSelectedDomain] = useState<string>("ALL");
  const [selectedProvider, setSelectedProvider] = useState<string>("ALL");
  const [selectedEvent, setSelectedEvent] = useState<NormalizedEvent | null>(null);
  const [events, setEvents] = useState<NormalizedEvent[]>([]);

  // Poll recent events from global event bus buffer
  const { data: streamData, refetch } = useQuery({
    queryKey: ["v2_stream_recent"],
    queryFn: async () => {
      const res = await apiClient.get<{ status: string; data: NormalizedEvent[]; metrics: any }>(
        "/api/v2/stream/recent?limit=200"
      );
      return res.data;
    },
    refetchInterval: isPaused ? false : 1500,
    staleTime: 1000,
  });

  useEffect(() => {
    if (streamData?.data && !isPaused) {
      setEvents(streamData.data);
    }
  }, [streamData, isPaused]);

  // Filter events
  const filteredEvents = events.filter((ev) => {
    if (selectedDomain !== "ALL" && ev.domain !== selectedDomain) return false;
    if (selectedProvider !== "ALL" && ev.provider !== selectedProvider) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchType = ev.eventType.toLowerCase().includes(q);
      const matchProv = ev.provider.toLowerCase().includes(q);
      const matchInst = (ev.instrumentId || "").toLowerCase().includes(q);
      const matchId = ev.eventId.toLowerCase().includes(q);
      if (!matchType && !matchProv && !matchInst && !matchId) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-card/40 border border-border rounded-xl overflow-hidden shadow-xl">
      {/* Header Controls */}
      <div className="p-4 border-b border-border bg-card/60 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">Global Live Stream Observatory</h2>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded border bg-sky-500/10 border-sky-500/30 text-sky-400">
                Authoritative Event Bus
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Real-time audit log of normalized market, order, fill, and capital events across all providers
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
              isPaused
                ? "bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
                : "bg-background border-border text-foreground hover:bg-muted"
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
            {isPaused ? "Resume Stream" : "Pause Stream"}
          </button>

          <button
            onClick={() => setEvents([])}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Buffer
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="px-4 py-2.5 border-b border-border/50 bg-background/50 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search events, instruments, IDs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-md bg-card border border-border text-foreground text-xs focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Domain Filter */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          {["ALL", "MARKET_DATA", "ACCOUNT", "POSITION", "ORDER", "FILL", "CAPITAL", "SYSTEM"].map((dom) => (
            <button
              key={dom}
              onClick={() => setSelectedDomain(dom)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-colors ${
                selectedDomain === dom
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
              }`}
            >
              {dom}
            </button>
          ))}
        </div>

        {/* Provider Filter */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          {["ALL", "DHAN", "UPSTOX", "DELTA", "BINANCE_USDM", "BINANCE_COINM", "PAPER"].map((prov) => (
            <button
              key={prov}
              onClick={() => setSelectedProvider(prov)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                selectedProvider === prov
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold"
                  : "text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              {prov}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area (Split View: Table on Left, Inspector on Right) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Events Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[#0c1017] border-b border-border text-muted-foreground uppercase text-[10px] font-mono tracking-wider z-10">
              <tr>
                <th className="px-3 py-2">Seq</th>
                <th className="px-3 py-2">Received Time</th>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Domain</th>
                <th className="px-3 py-2">Event Type</th>
                <th className="px-3 py-2">Instrument</th>
                <th className="px-3 py-2">Latency</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-mono">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    No matching events in the current buffer.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev) => {
                  const isSelected = selectedEvent?.eventId === ev.eventId;
                  const isMarket = ev.domain === "MARKET_DATA";
                  const isOrder = ev.domain === "ORDER" || ev.domain === "FILL";
                  const isCapital = ev.domain === "CAPITAL";

                  return (
                    <tr
                      key={ev.eventId}
                      onClick={() => setSelectedEvent(ev)}
                      className={`cursor-pointer transition-colors hover:bg-muted/40 ${
                        isSelected ? "bg-sky-500/10 border-l-2 border-sky-400" : ""
                      }`}
                    >
                      <td className="px-3 py-2 text-muted-foreground text-[11px]">{ev.sequence}</td>
                      <td className="px-3 py-2 text-foreground font-sans text-xs">
                        {new Date(ev.receivedTimestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-3 py-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-card border border-border text-foreground font-semibold">
                          {ev.provider}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            isMarket
                              ? "text-cyan-400 bg-cyan-500/10"
                              : isOrder
                              ? "text-emerald-400 bg-emerald-500/10"
                              : isCapital
                              ? "text-amber-400 bg-amber-500/10"
                              : "text-muted-foreground bg-muted"
                          }`}
                        >
                          {ev.domain}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-semibold text-foreground">{ev.eventType}</td>
                      <td className="px-3 py-2 text-sky-400 font-medium">{ev.instrumentId || ev.canonicalInstrumentId || "--"}</td>
                      <td className="px-3 py-2 text-muted-foreground text-[11px]">
                        {ev.latencyMs > 0 ? `${ev.latencyMs} ms` : "< 1 ms"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(ev);
                          }}
                          className="px-2 py-0.5 rounded border border-border hover:bg-muted text-[10px] text-muted-foreground hover:text-foreground"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Event Inspector Drawer / Sidebar */}
        {selectedEvent && (
          <div className="w-96 border-l border-border bg-[#0a0e14] flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="p-3 border-b border-border flex items-center justify-between bg-card/40">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-semibold text-foreground font-mono">Event Inspector</h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs font-mono">
              <div>
                <div className="text-[10px] text-muted-foreground uppercase">Event ID</div>
                <div className="text-foreground text-[11px] break-all select-all font-mono mt-0.5">
                  {selectedEvent.eventId}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase">Provider</div>
                  <div className="text-foreground font-semibold mt-0.5">{selectedEvent.provider}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase">Environment</div>
                  <div className="text-foreground font-semibold mt-0.5">{selectedEvent.environment}</div>
                </div>
              </div>

              <div>
                <div className="text-[10px] text-muted-foreground uppercase">Event Type</div>
                <div className="text-sky-400 font-semibold mt-0.5">{selectedEvent.eventType}</div>
              </div>

              <div>
                <div className="text-[10px] text-muted-foreground uppercase">Received Timestamp</div>
                <div className="text-muted-foreground text-[11px] mt-0.5">{selectedEvent.receivedTimestamp}</div>
              </div>

              <div>
                <div className="text-[10px] text-muted-foreground uppercase mb-1">Normalized Payload</div>
                <pre className="p-3 rounded-lg bg-black/60 border border-border/80 text-[11px] text-emerald-400 overflow-x-auto leading-relaxed">
                  {JSON.stringify(selectedEvent.payload, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
