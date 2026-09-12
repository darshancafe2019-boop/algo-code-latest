"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Layers,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  ShieldCheck,
  Percent,
  Sparkles,
  Sliders,
  Flame,
  Info,
  Calendar,
  ChevronDown,
  Radio,
  Search,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { DeltaExpiryItem, DeltaOptionContract } from "@/types/delta-options";
import { deltaWebSocket } from "@/lib/brokers/delta/websocket";
import { formatDeltaExpiryLabel, toDeltaApiExpiry, toDeltaWsChainSymbol } from "@/lib/brokers/delta/delta-date-utils";
import { DeltaOptionChainDiagnosticsPanel } from "@/components/options/DeltaOptionChainDiagnosticsPanel";

interface Props {
  initialUnderlying?: string;
}

export function CryptoOptionChainTerminal({ initialUnderlying = "BTC" }: Props) {
  const [underlying, setUnderlying] = useState<string>(initialUnderlying);
  const [selectedExpiry, setSelectedExpiry] = useState<string>("");
  const [sideFilter, setSideFilter] = useState<"BOTH" | "CALL" | "PUT">("BOTH");
  const [moneynessFilter, setMoneynessFilter] = useState<"ALL" | "ITM" | "ATM" | "OTM">("ALL");
  const [strikeLimit, setStrikeLimit] = useState<number | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"standard" | "greeks">("standard");
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  // Live WebSocket Tick State & Merged Chain Store
  const [liveTicksCount, setLiveTicksCount] = useState<number>(0);
  const [lastTickTime, setLastTickTime] = useState<string>("—");
  const [wsFeedStatus, setWsFeedStatus] = useState<"LIVE" | "CONNECTING" | "DISCONNECTED">("CONNECTING");

  // Local live overrides map: symbol -> partial update
  const [liveOverrides, setLiveOverrides] = useState<Record<string, Partial<DeltaOptionContract>>>({});

  // 1. Discover all Delta option expiries & supported underlyings dynamically
  const { data: expiriesData, isLoading: isLoadingExpiries, refetch: refetchExpiries } = useQuery<{
    status: string;
    underlying: string;
    count: number;
    nearest_expiry: string;
    expiries: DeltaExpiryItem[];
    all_underlyings: string[];
    last_updated: number;
  }>({
    queryKey: ["deltaExpiriesRegistry", underlying],
    queryFn: async () => {
      const res = await apiClient.get<any>(`/api/delta/options/expiries?underlying=${underlying}`, { timeoutMs: 8000 });
      if (!res.ok || !res.data) {
        return { status: "success", underlying, count: 0, nearest_expiry: "", expiries: [], all_underlyings: ["BTC", "ETH", "XAUT", "SOL"], last_updated: Date.now() };
      }
      return res.data;
    },
    staleTime: 60000,
    retry: 2,
  });

  const availableExpiries: DeltaExpiryItem[] = useMemo(() => {
    return Array.isArray(expiriesData?.expiries) ? expiriesData.expiries : [];
  }, [expiriesData?.expiries]);

  const underlyingsList = useMemo(() => {
    const list = Array.isArray(expiriesData?.all_underlyings) && expiriesData.all_underlyings.length > 0
      ? expiriesData.all_underlyings
      : ["BTC", "ETH", "XAUT", "SOL"];
    if (!list.includes(underlying)) {
      return [underlying, ...list];
    }
    return list;
  }, [expiriesData?.all_underlyings, underlying]);

  // Synchronize default selected expiry when expiries load or underlying changes
  useEffect(() => {
    if (availableExpiries.length > 0) {
      const exists = availableExpiries.some(
        (e) => e.expiryApiFormat === selectedExpiry || e.expiryIso === selectedExpiry
      );
      if (!selectedExpiry || !exists) {
        setSelectedExpiry(availableExpiries[0].expiryApiFormat);
      }
    }
  }, [availableExpiries, selectedExpiry]);

  // 2. Fetch Full Option Chain Snapshot from Delta
  const { data: chainData, isLoading: isLoadingChain, error: chainError, refetch: refetchChain, isFetching: isFetchingChain } = useQuery({
    queryKey: ["deltaOptionChainSnapshot", underlying, selectedExpiry],
    queryFn: async () => {
      if (!selectedExpiry && availableExpiries.length === 0) return null;
      const targetExp = selectedExpiry || (availableExpiries.length > 0 ? availableExpiries[0].expiryApiFormat : "");
      const res = await apiClient.get<any>(`/api/delta/options/chain?underlying=${underlying}&expiry=${targetExp}`, { timeoutMs: 10000 });
      if (!res.ok || !res.data) throw new Error(res.error?.message || "Failed to load Delta option chain snapshot");
      return res.data;
    },
    enabled: Boolean(selectedExpiry || availableExpiries.length > 0),
    staleTime: 5000,
    retry: 2,
  });

  // Reset live overrides when underlying or expiry changes
  useEffect(() => {
    setLiveOverrides({});
  }, [underlying, selectedExpiry]);

  // 3. Connect Live Delta WebSocket for current expiry
  const currentWsSymbol = useMemo(() => {
    if (!selectedExpiry) return "";
    return toDeltaWsChainSymbol(underlying, selectedExpiry);
  }, [underlying, selectedExpiry]);

  useEffect(() => {
    if (!currentWsSymbol) return;

    deltaWebSocket.connect();
    setWsFeedStatus(deltaWebSocket.getStatus());

    const unsubscribe = deltaWebSocket.subscribeOptionChain(currentWsSymbol, (tick) => {
      setLiveTicksCount((prev) => prev + 1);
      setLastTickTime(new Date().toLocaleTimeString());
      setWsFeedStatus("LIVE");

      if (tick.symbol) {
        setLiveOverrides((prev) => ({
          ...prev,
          [tick.symbol]: {
            ltp: tick.ltp ?? prev[tick.symbol]?.ltp,
            markPrice: tick.markPrice ?? prev[tick.symbol]?.markPrice,
            bid: tick.bid ?? prev[tick.symbol]?.bid,
            ask: tick.ask ?? prev[tick.symbol]?.ask,
            bidSize: tick.bidSize ?? prev[tick.symbol]?.bidSize,
            askSize: tick.askSize ?? prev[tick.symbol]?.askSize,
            iv: tick.iv ?? prev[tick.symbol]?.iv,
            delta: tick.delta ?? prev[tick.symbol]?.delta,
            gamma: tick.gamma ?? prev[tick.symbol]?.gamma,
            theta: tick.theta ?? prev[tick.symbol]?.theta,
            vega: tick.vega ?? prev[tick.symbol]?.vega,
            rho: tick.rho ?? prev[tick.symbol]?.rho,
            openInterest: tick.openInterest ?? prev[tick.symbol]?.openInterest,
            volume: tick.volume ?? prev[tick.symbol]?.volume,
            receivedAt: Date.now(),
            status: "LIVE",
          },
        }));
      }
    });

    const statusInterval = setInterval(() => {
      setWsFeedStatus(deltaWebSocket.getStatus());
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(statusInterval);
    };
  }, [currentWsSymbol]);

  // Check whether the chain is currently fetching or stale for the selected expiry
  const isChainLoading = isLoadingChain || isFetchingChain || Boolean(
    chainData &&
    selectedExpiry &&
    chainData.selected_expiry &&
    chainData.selected_expiry !== selectedExpiry &&
    chainData.selectedExpiry !== selectedExpiry
  );

  // Merge REST snapshot with live incremental updates
  const baseRows = (!isChainLoading && Array.isArray(chainData?.rows)) ? chainData.rows : [];
  const spotPrice = chainData?.spot ?? chainData?.spot_price ?? 0;
  const atmStrike = chainData?.atmStrike ?? chainData?.atm_strike ?? 0;

  const mergedRows = useMemo(() => {
    return baseRows.map((r: any) => {
      const strike = r.strike;
      let callContract = r.call ? { ...r.call } : null;
      let putContract = r.put ? { ...r.put } : null;

      if (callContract && liveOverrides[callContract.symbol]) {
        callContract = { ...callContract, ...liveOverrides[callContract.symbol] };
      }
      if (putContract && liveOverrides[putContract.symbol]) {
        putContract = { ...putContract, ...liveOverrides[putContract.symbol] };
      }

      return {
        strike,
        isAtm: r.isAtm || strike === atmStrike,
        call: callContract,
        put: putContract,
      };
    });
  }, [baseRows, liveOverrides, atmStrike]);

  // Apply filters against the full dataset (without refetching or destroying full chain)
  const filteredRows = useMemo(() => {
    let list = mergedRows;

    // Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim();
      list = list.filter((r) => r.strike.toString().includes(q));
    }

    // Moneyness Filter
    if (moneynessFilter !== "ALL" && spotPrice > 0) {
      list = list.filter((r) => {
        if (moneynessFilter === "ATM") return r.isAtm;
        if (moneynessFilter === "ITM") {
          return (r.call && r.strike < spotPrice) || (r.put && r.strike > spotPrice);
        }
        if (moneynessFilter === "OTM") {
          return (r.call && r.strike > spotPrice) || (r.put && r.strike < spotPrice);
        }
        return true;
      });
    }

    // Strike Range Filter (Centered around ATM)
    if (typeof strikeLimit === "number" && strikeLimit > 0 && strikeLimit < list.length) {
      const atmIndex = list.findIndex((r) => r.isAtm);
      const center = atmIndex >= 0 ? atmIndex : Math.floor(list.length / 2);
      const half = Math.floor(strikeLimit / 2);
      const start = Math.max(0, center - half);
      const end = Math.min(list.length, start + strikeLimit);
      list = list.slice(start, end);
    }

    return list;
  }, [mergedRows, searchQuery, moneynessFilter, strikeLimit, spotPrice]);

  // Summary Metrics calculations (Zero fake values)
  const totalCallsCount = chainData?.calls ?? baseRows.filter((r: any) => r.call).length;
  const totalPutsCount = chainData?.puts ?? baseRows.filter((r: any) => r.put).length;
  const totalContractsCount = chainData?.contracts ?? (totalCallsCount + totalPutsCount);

  const totalCallOi = useMemo(() => {
    return mergedRows.reduce((acc, r) => acc + (r.call?.openInterest || 0), 0);
  }, [mergedRows]);

  const totalPutOi = useMemo(() => {
    return mergedRows.reduce((acc, r) => acc + (r.put?.openInterest || 0), 0);
  }, [mergedRows]);

  const pcr = totalCallOi > 0 ? (totalPutOi / totalCallOi).toFixed(2) : "—";

  return (
    <div className="flex flex-col gap-4 text-slate-100 font-sans pb-12">
      {/* Top Header & Navigation Bar */}
      <div className="bg-[#0B1220] border border-slate-800 rounded-xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Layers className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-wide">
                Delta Exchange Option Chain
              </h1>
              <span className="text-[11px] px-2 py-0.5 rounded font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                DATA SOURCE: DELTA EXCHANGE
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                INDIA REST v2 + WS
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live CALL | STRIKE | PUT Matrix • Exhaustive Expiry Discovery • Full Strike Range • Real-time Greeks
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition ${
              showDiagnostics
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                : "bg-slate-900 text-slate-400 hover:text-white border-slate-800"
            }`}
          >
            <Activity className="w-3.5 h-3.5 inline mr-1" />
            Diagnostics Panel
          </button>

          <button
            type="button"
            onClick={() => {
              refetchExpiries();
              refetchChain();
            }}
            disabled={isFetchingChain}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono font-semibold transition"
            title="Refresh Expiries & Option Chain"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetchingChain ? "animate-spin text-emerald-400" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Interactive Control & Filter Bar */}
      <div className="bg-[#0e1626] border border-slate-800/90 rounded-xl p-3.5 shadow-lg flex flex-wrap items-center justify-between gap-3">
        {/* Underlying Selector */}
        <div className="flex items-center gap-1.5 bg-[#080E1A] p-1 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-400 px-2 font-mono uppercase font-bold">Underlying:</span>
          {underlyingsList.map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => {
                setUnderlying(u);
                setSelectedExpiry("");
              }}
              className={`px-3 py-1 text-xs font-mono font-bold rounded-md transition ${
                underlying === u
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {u}
            </button>
          ))}
        </div>

        {/* Expiry Selector (Dynamic from Delta Products) */}
        <div className="flex items-center gap-2 bg-[#080E1A] px-3 py-1.5 rounded-lg border border-slate-800">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span className="text-[11px] text-slate-400 font-mono">Expiry:</span>
          <select
            value={selectedExpiry}
            onChange={(e) => setSelectedExpiry(e.target.value)}
            className="bg-transparent text-xs font-mono font-bold text-white focus:outline-none cursor-pointer"
          >
            {availableExpiries.length > 0 ? (
              availableExpiries.map((opt) => (
                <option key={opt.expiryIso} value={opt.expiryApiFormat} className="bg-[#0e1626] text-white">
                  {formatDeltaExpiryLabel(opt.expiryApiFormat)} ({opt.contractCount} contracts)
                </option>
              ))
            ) : (
              <option value="" className="bg-[#0e1626] text-slate-400">
                {isLoadingExpiries ? "Discovering Delta Expiries..." : "No Expiries Available"}
              </option>
            )}
          </select>
        </div>

        {/* View Side Filter: BOTH / CALL / PUT */}
        <div className="flex items-center bg-[#080E1A] p-1 rounded-lg border border-slate-800 text-xs">
          {(["BOTH", "CALL", "PUT"] as const).map((side) => (
            <button
              key={side}
              type="button"
              onClick={() => setSideFilter(side)}
              className={`px-2.5 py-1 rounded font-mono font-bold transition ${
                sideFilter === side
                  ? "bg-cyan-500 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {side}
            </button>
          ))}
        </div>

        {/* Moneyness Filter */}
        <div className="flex items-center bg-[#080E1A] p-1 rounded-lg border border-slate-800 text-xs">
          {(["ALL", "ITM", "ATM", "OTM"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMoneynessFilter(m)}
              className={`px-2.5 py-1 rounded font-mono font-bold transition ${
                moneynessFilter === m
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Strike Range / Limit */}
        <div className="flex items-center gap-1 bg-[#080E1A] p-1 rounded-lg border border-slate-800 text-xs">
          <span className="text-slate-400 px-1.5 font-mono text-[11px]">Strikes:</span>
          {([10, 20, 40, "ALL"] as const).map((limit) => (
            <button
              key={String(limit)}
              type="button"
              onClick={() => setStrikeLimit(limit)}
              className={`px-2 py-0.5 rounded font-mono font-medium ${
                strikeLimit === limit ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {limit}
            </button>
          ))}
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center bg-[#080E1A] p-1 rounded-lg border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setViewMode("standard")}
            className={`px-2.5 py-1 rounded font-mono font-bold transition ${
              viewMode === "standard" ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            Standard
          </button>
          <button
            type="button"
            onClick={() => setViewMode("greeks")}
            className={`px-2.5 py-1 rounded font-mono font-bold transition ${
              viewMode === "greeks" ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            Greeks
          </button>
        </div>

        {/* Strike Search Box */}
        <div className="flex items-center gap-1.5 bg-[#080E1A] px-2.5 py-1 rounded-lg border border-slate-800">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter Strike..."
            className="w-24 bg-transparent text-xs font-mono text-white placeholder-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Analytics Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#0B1220] border border-slate-800 rounded-xl p-3 shadow-md">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Spot Price</span>
          <span className="text-base font-bold font-mono text-white">
            {spotPrice > 0 ? `$${spotPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—"}
          </span>
          <span className="text-[10px] text-emerald-400 font-mono block">Delta Index Price</span>
        </div>

        <div className="bg-[#0B1220] border border-slate-800 rounded-xl p-3 shadow-md">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">ATM Strike</span>
          <span className="text-base font-bold font-mono text-amber-300">
            {atmStrike > 0 ? `$${atmStrike.toLocaleString()}` : "—"}
          </span>
          <span className="text-[10px] text-slate-400 font-mono block">Center Node</span>
        </div>

        <div className="bg-[#0B1220] border border-slate-800 rounded-xl p-3 shadow-md">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Discovered Expiries</span>
          <span className="text-base font-bold font-mono text-cyan-300">
            {availableExpiries.length} Active
          </span>
          <span className="text-[10px] text-slate-400 font-mono block">Catalogue Expiries</span>
        </div>

        <div className="bg-[#0B1220] border border-slate-800 rounded-xl p-3 shadow-md">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Listed Contracts</span>
          <span className="text-base font-bold font-mono text-white">
            {totalContractsCount} ({totalCallsCount}C / {totalPutsCount}P)
          </span>
          <span className="text-[10px] text-slate-400 font-mono block">{mergedRows.length} Unique Strikes</span>
        </div>

        <div className="bg-[#0B1220] border border-slate-800 rounded-xl p-3 shadow-md">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Put-Call Ratio (PCR)</span>
          <span className="text-base font-bold font-mono text-emerald-400">
            {pcr}
          </span>
          <span className="text-[10px] text-slate-400 font-mono block">
            {totalCallOi > 0 ? `${totalCallOi.toFixed(0)}C / ${totalPutOi.toFixed(0)}P OI` : "OI Unavailable"}
          </span>
        </div>

        <div className="bg-[#0B1220] border border-slate-800 rounded-xl p-3 shadow-md">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Live Feed Status</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`w-2 h-2 rounded-full ${
                wsFeedStatus === "LIVE" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
              }`}
            />
            <span className="text-xs font-bold font-mono text-white">{wsFeedStatus}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono block truncate">
            WS: {currentWsSymbol || "—"} ({liveTicksCount} ticks)
          </span>
        </div>
      </div>

      {/* Diagnostics Panel (Collapsible) */}
      {showDiagnostics && (
        <DeltaOptionChainDiagnosticsPanel
          underlying={underlying}
          expiry={selectedExpiry}
          apiExpiryValue={selectedExpiry}
          wsExpirySymbol={currentWsSymbol}
          restContractCount={chainData?.total_contracts || totalContractsCount}
          normalizedCount={totalContractsCount}
          callCount={totalCallsCount}
          putCount={totalPutsCount}
          strikeCount={mergedRows.length}
          availableExpiriesCount={availableExpiries.length}
        />
      )}

      {/* Main Dual-Sided Option Chain Matrix */}
      <div className="bg-[#0B1220] border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        {isChainLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
            <div className="text-center font-mono">
              <span className="text-sm font-bold text-white block">LOADING DELTA OPTION CHAIN</span>
              <span className="text-xs text-slate-400">
                Underlying: {underlying} • Expiry: {selectedExpiry || "Nearest Expiry"}
              </span>
            </div>
          </div>
        ) : chainError ? (
          <div className="py-16 text-center text-rose-400 text-xs font-mono space-y-2">
            <div>DELTA DATA UNAVAILABLE</div>
            <div className="text-slate-400 text-[11px]">
              {(chainError as Error).message || "Failed to load contracts from Delta Exchange."}
            </div>
            <button
              type="button"
              onClick={() => refetchChain()}
              className="mt-2 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white"
            >
              Retry Snapshot
            </button>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs font-mono">
            No option contracts match the selected filters for {underlying} ({selectedExpiry}).
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                {/* Master Header */}
                <tr className="border-b border-slate-800 text-xs font-bold tracking-wider uppercase text-center bg-[#060B14]">
                  {sideFilter !== "PUT" && (
                    <th
                      colSpan={viewMode === "standard" ? 6 : 7}
                      className="py-2.5 text-cyan-400 bg-cyan-500/10 border-r border-slate-800"
                    >
                      CALLS (CE)
                    </th>
                  )}
                  <th colSpan={2} className="py-2.5 text-amber-300 bg-amber-500/10 border-r border-slate-800">
                    STRIKE
                  </th>
                  {sideFilter !== "CALL" && (
                    <th
                      colSpan={viewMode === "standard" ? 6 : 7}
                      className="py-2.5 text-rose-400 bg-rose-500/10"
                    >
                      PUTS (PE)
                    </th>
                  )}
                </tr>

                {/* Sub-Column Header */}
                <tr className="border-b border-slate-800 text-slate-400 font-semibold text-[11px] bg-[#0A101C]">
                  {/* CALL HEADERS */}
                  {sideFilter !== "PUT" && (
                    <>
                      {viewMode === "standard" ? (
                        <>
                          <th className="py-2 px-2.5 text-right font-mono">OI</th>
                          <th className="py-2 px-2.5 text-right font-mono">Volume</th>
                          <th className="py-2 px-2.5 text-right font-mono">IV (%)</th>
                          <th className="py-2 px-2.5 text-right font-mono">Bid</th>
                          <th className="py-2 px-2.5 text-right font-mono">Ask</th>
                          <th className="py-2 px-2.5 text-right text-cyan-300 font-mono border-r border-slate-800">LTP ($)</th>
                        </>
                      ) : (
                        <>
                          <th className="py-2 px-2 text-right font-mono">Delta</th>
                          <th className="py-2 px-2 text-right font-mono">Gamma</th>
                          <th className="py-2 px-2 text-right font-mono">Theta</th>
                          <th className="py-2 px-2 text-right font-mono">Vega</th>
                          <th className="py-2 px-2 text-right font-mono">Rho</th>
                          <th className="py-2 px-2 text-right font-mono">IV (%)</th>
                          <th className="py-2 px-2.5 text-right text-cyan-300 font-mono border-r border-slate-800">LTP ($)</th>
                        </>
                      )}
                    </>
                  )}

                  {/* STRIKE HEADERS */}
                  <th className="py-2 px-3 text-center text-white font-bold bg-[#0F172A]">Strike</th>
                  <th className="py-2 px-2 text-center text-slate-400 border-r border-slate-800 bg-[#0F172A]">Moneyness</th>

                  {/* PUT HEADERS */}
                  {sideFilter !== "CALL" && (
                    <>
                      {viewMode === "standard" ? (
                        <>
                          <th className="py-2 px-2.5 text-left text-rose-300 font-mono">LTP ($)</th>
                          <th className="py-2 px-2.5 text-left font-mono">Bid</th>
                          <th className="py-2 px-2.5 text-left font-mono">Ask</th>
                          <th className="py-2 px-2.5 text-left font-mono">IV (%)</th>
                          <th className="py-2 px-2.5 text-left font-mono">Volume</th>
                          <th className="py-2 px-2.5 text-left font-mono">OI</th>
                        </>
                      ) : (
                        <>
                          <th className="py-2 px-2.5 text-left text-rose-300 font-mono">LTP ($)</th>
                          <th className="py-2 px-2 text-left font-mono">IV (%)</th>
                          <th className="py-2 px-2 text-left font-mono">Delta</th>
                          <th className="py-2 px-2 text-left font-mono">Gamma</th>
                          <th className="py-2 px-2 text-left font-mono">Theta</th>
                          <th className="py-2 px-2 text-left font-mono">Vega</th>
                          <th className="py-2 px-2 text-left font-mono">Rho</th>
                        </>
                      )}
                    </>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {filteredRows.map((row) => {
                  const isAtm = row.isAtm;
                  const c = row.call;
                  const p = row.put;

                  return (
                    <tr
                      key={row.strike}
                      className={`transition-colors ${
                        isAtm ? "bg-amber-500/10 font-semibold" : "hover:bg-slate-850/40"
                      }`}
                    >
                      {/* CALL SIDE */}
                      {sideFilter !== "PUT" && (
                        <>
                          {viewMode === "standard" ? (
                            <>
                              <td className="py-2 px-2.5 text-right text-slate-300">
                                {c?.openInterest !== null && c?.openInterest !== undefined ? c.openInterest.toLocaleString() : "—"}
                              </td>
                              <td className="py-2 px-2.5 text-right text-slate-400">
                                {c?.volume !== null && c?.volume !== undefined ? c.volume.toLocaleString() : "—"}
                              </td>
                              <td className="py-2 px-2.5 text-right text-purple-300">
                                {c?.iv !== null && c?.iv !== undefined ? `${c.iv.toFixed(1)}%` : "—"}
                              </td>
                              <td className="py-2 px-2.5 text-right text-slate-300">
                                {c?.bid !== null && c?.bid !== undefined ? `$${c.bid.toFixed(2)}` : "—"}
                              </td>
                              <td className="py-2 px-2.5 text-right text-slate-300">
                                {c?.ask !== null && c?.ask !== undefined ? `$${c.ask.toFixed(2)}` : "—"}
                              </td>
                              <td className="py-2 px-2.5 text-right font-bold text-cyan-400 border-r border-slate-800">
                                {c?.ltp !== null && c?.ltp !== undefined ? `$${c.ltp.toFixed(2)}` : "—"}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-2 px-2 text-right text-emerald-400">
                                {c?.delta !== null && c?.delta !== undefined ? c.delta.toFixed(4) : "—"}
                              </td>
                              <td className="py-2 px-2 text-right text-slate-300">
                                {c?.gamma !== null && c?.gamma !== undefined ? c.gamma.toFixed(6) : "—"}
                              </td>
                              <td className="py-2 px-2 text-right text-rose-400">
                                {c?.theta !== null && c?.theta !== undefined ? c.theta.toFixed(2) : "—"}
                              </td>
                              <td className="py-2 px-2 text-right text-blue-300">
                                {c?.vega !== null && c?.vega !== undefined ? c.vega.toFixed(2) : "—"}
                              </td>
                              <td className="py-2 px-2 text-right text-slate-400">
                                {c?.rho !== null && c?.rho !== undefined ? c.rho.toFixed(4) : "—"}
                              </td>
                              <td className="py-2 px-2 text-right text-purple-300">
                                {c?.iv !== null && c?.iv !== undefined ? `${c.iv.toFixed(1)}%` : "—"}
                              </td>
                              <td className="py-2 px-2.5 text-right font-bold text-cyan-400 border-r border-slate-800">
                                {c?.ltp !== null && c?.ltp !== undefined ? `$${c.ltp.toFixed(2)}` : "—"}
                              </td>
                            </>
                          )}
                        </>
                      )}

                      {/* STRIKE CENTER */}
                      <td
                        className={`py-2 px-3 text-center font-bold ${
                          isAtm ? "text-amber-300 bg-amber-500/20" : "text-white bg-[#0e1626]"
                        }`}
                      >
                        ${row.strike.toLocaleString()}
                      </td>
                      <td
                        className={`py-2 px-2 text-center text-[10px] font-sans border-r border-slate-800 ${
                          isAtm
                            ? "text-amber-300 bg-amber-500/20 font-bold"
                            : "text-slate-400 bg-[#0e1626]"
                        }`}
                      >
                        {isAtm ? "ATM" : spotPrice > 0 ? (row.strike < spotPrice ? "ITM / OTM" : "OTM / ITM") : "—"}
                      </td>

                      {/* PUT SIDE */}
                      {sideFilter !== "CALL" && (
                        <>
                          {viewMode === "standard" ? (
                            <>
                              <td className="py-2 px-2.5 text-left font-bold text-rose-400">
                                {p?.ltp !== null && p?.ltp !== undefined ? `$${p.ltp.toFixed(2)}` : "—"}
                              </td>
                              <td className="py-2 px-2.5 text-left text-slate-300">
                                {p?.bid !== null && p?.bid !== undefined ? `$${p.bid.toFixed(2)}` : "—"}
                              </td>
                              <td className="py-2 px-2.5 text-left text-slate-300">
                                {p?.ask !== null && p?.ask !== undefined ? `$${p.ask.toFixed(2)}` : "—"}
                              </td>
                              <td className="py-2 px-2.5 text-left text-purple-300">
                                {p?.iv !== null && p?.iv !== undefined ? `${p.iv.toFixed(1)}%` : "—"}
                              </td>
                              <td className="py-2 px-2.5 text-left text-slate-400">
                                {p?.volume !== null && p?.volume !== undefined ? p.volume.toLocaleString() : "—"}
                              </td>
                              <td className="py-2 px-2.5 text-left text-slate-300">
                                {p?.openInterest !== null && p?.openInterest !== undefined ? p.openInterest.toLocaleString() : "—"}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-2 px-2.5 text-left font-bold text-rose-400">
                                {p?.ltp !== null && p?.ltp !== undefined ? `$${p.ltp.toFixed(2)}` : "—"}
                              </td>
                              <td className="py-2 px-2 text-left text-purple-300">
                                {p?.iv !== null && p?.iv !== undefined ? `${p.iv.toFixed(1)}%` : "—"}
                              </td>
                              <td className="py-2 px-2 text-left text-emerald-400">
                                {p?.delta !== null && p?.delta !== undefined ? p.delta.toFixed(4) : "—"}
                              </td>
                              <td className="py-2 px-2 text-left text-slate-300">
                                {p?.gamma !== null && p?.gamma !== undefined ? p.gamma.toFixed(6) : "—"}
                              </td>
                              <td className="py-2 px-2 text-left text-rose-400">
                                {p?.theta !== null && p?.theta !== undefined ? p.theta.toFixed(2) : "—"}
                              </td>
                              <td className="py-2 px-2 text-left text-blue-300">
                                {p?.vega !== null && p?.vega !== undefined ? p.vega.toFixed(2) : "—"}
                              </td>
                              <td className="py-2 px-2 text-left text-slate-400">
                                {p?.rho !== null && p?.rho !== undefined ? p.rho.toFixed(4) : "—"}
                              </td>
                            </>
                          )}
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
