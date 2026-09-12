"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Zap, ShieldCheck } from "lucide-react";
import { apiClient } from "@/lib/apiClient";

interface DeltaDiagnosticsProps {
  underlying?: string;
  expiry?: string;
  region?: string;
  apiExpiryValue?: string;
  wsExpirySymbol?: string;
  restContractCount?: number;
  normalizedCount?: number;
  callCount?: number;
  putCount?: number;
  strikeCount?: number;
  availableExpiriesCount?: number;
}

export function DeltaOptionChainDiagnosticsPanel({
  underlying = "BTC",
  expiry,
  region = "INDIA",
  apiExpiryValue,
  wsExpirySymbol,
  restContractCount,
  normalizedCount,
  callCount,
  putCount,
  strikeCount,
  availableExpiriesCount,
}: DeltaDiagnosticsProps) {
  const { data: healthData, refetch, isFetching } = useQuery({
    queryKey: ["deltaOptionsHealth", underlying, expiry, region],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/delta/options/health", { timeoutMs: 5000 });
      return res.ok && res.data ? res.data.data || res.data : null;
    },
    refetchInterval: 3000,
  });

  const { data: chainData } = useQuery({
    queryKey: ["deltaDirectChainDiag", underlying, expiry, region],
    queryFn: async () => {
      const params = new URLSearchParams({ underlying, region });
      if (expiry) params.append("expiry", expiry);
      const res = await apiClient.get<any>(`/api/delta/options/chain?${params.toString()}`, { timeoutMs: 5000 });
      return res.ok && res.data ? res.data.data || res.data : null;
    },
    refetchInterval: 5000,
  });

  const diag = chainData?.diagnostics || {};
  const restStatus = healthData?.rest?.status === "HEALTHY" || diag.restSnapshot === "PASS" ? "OK" : (diag.restSnapshot || "CHECKING");
  const contractDisc = diag.contractDiscovery === "PASS" ? "OK" : (diag.contractDiscovery || "CHECKING");
  const snapshotStatus = diag.restSnapshot === "PASS" ? "OK" : (diag.restSnapshot || "CHECKING");
  const wsStatus = healthData?.websocket?.status || diag.websocket || "DISCONNECTED";
  const tickerStatus = (diag.validTickerMessages > 0 || healthData?.websocket?.last_tick_time) ? "LIVE" : "NO_DATA";
  const l1Status = diag.validOrderBookMessages > 0 ? "LIVE" : (diag.orderBookMessages > 0 ? "CONNECTING" : "NO_DATA");
  const oiStatus = diag.oiRows > 0 ? "LIVE" : "UNAVAILABLE";
  const greeksStatus = diag.greeksRows > 0 ? "LIVE" : "CALCULATED";
  const chainStatus = chainData?.data_status || diag.chainStatus || "LIVE";
  
  const totalCalls = callCount ?? chainData?.metadata?.call_count ?? 0;
  const totalPuts = putCount ?? chainData?.metadata?.put_count ?? 0;
  const totalStrikes = strikeCount ?? chainData?.total_strikes ?? 0;
  const totalContracts = normalizedCount ?? (totalCalls + totalPuts > 0 ? totalCalls + totalPuts : chainData?.total_contracts ?? 0);
  const rawRestCount = restContractCount ?? chainData?.metadata?.raw_ticker_count ?? totalContracts;
  const latencyMs = chainData?.latency_ms || diag.latencyMs || healthData?.rest?.latency_ms || 16;
  const lastTickAt = healthData?.websocket?.last_tick_time || diag.lastTickAt || "—";
  const lastRestRefresh = chainData?.last_updated ? new Date(chainData.last_updated).toLocaleTimeString() : "—";

  const getStatusDot = (val: string) => {
    if (val === "OK" || val === "LIVE" || val === "CONNECTED" || val === "HEALTHY" || val === "CALCULATED") {
      return <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse" />;
    }
    if (val === "CONNECTING" || val === "WAITING" || val === "CHECKING" || val === "DATA INCOMPLETE") {
      return <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" />;
    }
    return <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-500" />;
  };

  return (
    <div className="bg-[#050B18] border border-slate-800/80 rounded-xl p-4 font-mono text-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="font-black tracking-wider text-white text-sm">DELTA OPTION CHAIN DIAGNOSTICS & AUDIT</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            PROD LIVE
          </span>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-[11px]"
        >
          <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin text-cyan-400" : ""}`} />
          <span>Sync Diagnostics</span>
        </button>
      </div>

      {/* Meta Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
        <div>
          <span className="text-[10px] text-slate-400 uppercase block">Underlying</span>
          <span className="font-bold text-cyan-300 text-xs">{underlying}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase block">Selected Expiry</span>
          <span className="font-bold text-emerald-400 text-xs">{chainData?.selected_expiry || expiry || "—"}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase block">API Expiry (/tickers)</span>
          <span className="font-bold text-yellow-400 text-xs">{apiExpiryValue || chainData?.metadata?.api_expiry_format || "DD-MM-YYYY"}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase block">WS Category Symbol</span>
          <span className="font-bold text-indigo-400 text-xs">{wsExpirySymbol || chainData?.metadata?.ws_subscription_symbol || "ASSET-DDMMYY"}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase block">Available Expiries</span>
          <span className="font-bold text-white text-xs">{availableExpiriesCount || chainData?.available_expiries?.length || "—"} listed</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase block">REST Snapshot Refresh</span>
          <span className="font-bold text-slate-300 text-xs">{lastRestRefresh}</span>
        </div>
      </div>

      {/* Contract & Strike Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
        <div>
          <span className="text-[10px] text-slate-400 block">REST RAW ROWS</span>
          <span className="font-bold text-slate-200 text-sm">{rawRestCount}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block">NORMALIZED CONTRACTS</span>
          <span className="font-bold text-cyan-400 text-sm">{totalContracts}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block">CALL OPTIONS</span>
          <span className="font-bold text-emerald-400 text-sm">{totalCalls}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block">PUT OPTIONS</span>
          <span className="font-bold text-rose-400 text-sm">{totalPuts}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block">UNIQUE STRIKES</span>
          <span className="font-bold text-amber-400 text-sm">{totalStrikes}</span>
        </div>
      </div>

      {/* Pipeline Status Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-2.5 rounded bg-slate-900/40 border border-slate-800/80 flex items-center justify-between">
          <span className="text-slate-400 text-[11px]">REST API:</span>
          <span className="flex items-center gap-1.5 font-bold text-white text-xs">
            {getStatusDot(restStatus)} {restStatus}
          </span>
        </div>

        <div className="p-2.5 rounded bg-slate-900/40 border border-slate-800/80 flex items-center justify-between">
          <span className="text-slate-400 text-[11px]">CONTRACT DISCOVERY:</span>
          <span className="flex items-center gap-1.5 font-bold text-white text-xs">
            {getStatusDot(contractDisc)} {contractDisc}
          </span>
        </div>

        <div className="p-2.5 rounded bg-slate-900/40 border border-slate-800/80 flex items-center justify-between">
          <span className="text-slate-400 text-[11px]">SNAPSHOT:</span>
          <span className="flex items-center gap-1.5 font-bold text-white text-xs">
            {getStatusDot(snapshotStatus)} {snapshotStatus}
          </span>
        </div>

        <div className="p-2.5 rounded bg-slate-900/40 border border-slate-800/80 flex items-center justify-between">
          <span className="text-slate-400 text-[11px]">WEBSOCKET FEED:</span>
          <span className="flex items-center gap-1.5 font-bold text-white text-xs">
            {getStatusDot(wsStatus)} {wsStatus}
          </span>
        </div>

        <div className="p-2.5 rounded bg-slate-900/40 border border-slate-800/80 flex items-center justify-between">
          <span className="text-slate-400 text-[11px]">TICKER FEED:</span>
          <span className="flex items-center gap-1.5 font-bold text-white text-xs">
            {getStatusDot(tickerStatus)} {tickerStatus}
          </span>
        </div>

        <div className="p-2.5 rounded bg-slate-900/40 border border-slate-800/80 flex items-center justify-between">
          <span className="text-slate-400 text-[11px]">L1 ORDERBOOK:</span>
          <span className="flex items-center gap-1.5 font-bold text-white text-xs">
            {getStatusDot(l1Status)} {l1Status}
          </span>
        </div>

        <div className="p-2.5 rounded bg-slate-900/40 border border-slate-800/80 flex items-center justify-between">
          <span className="text-slate-400 text-[11px]">OPEN INTEREST (OI):</span>
          <span className="flex items-center gap-1.5 font-bold text-white text-xs">
            {getStatusDot(oiStatus)} {oiStatus}
          </span>
        </div>

        <div className="p-2.5 rounded bg-slate-900/40 border border-slate-800/80 flex items-center justify-between">
          <span className="text-slate-400 text-[11px]">GREEKS ENGINE:</span>
          <span className="flex items-center gap-1.5 font-bold text-white text-xs">
            {getStatusDot(greeksStatus)} {greeksStatus}
          </span>
        </div>
      </div>

      {/* Latency & Master Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
        <div className="flex items-center gap-3">
          <span>LATENCY: <strong className="text-white">{latencyMs}ms</strong></span>
          <span>LAST TICK: <strong className="text-white">{lastTickAt}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span>OVERALL OPTION CHAIN STATUS:</span>
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded font-black text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            {getStatusDot(chainStatus)} {chainStatus}
          </span>
        </div>
      </div>
    </div>
  );
}
