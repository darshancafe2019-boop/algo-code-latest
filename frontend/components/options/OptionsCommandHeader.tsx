import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import {
  Layers,
  Calendar,
  Radio,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Table,
  Flame,
  LineChart,
  ShieldCheck,
  Compass,
  Sliders,
  Activity,
  CheckCircle2,
  AlertCircle,
  Cpu,
} from "lucide-react";
import { RawExpiryItem, OptionSource, FreshnessStatus } from "@/types/option-chain";
import { normalizeExpiriesList } from "@/lib/expiry-utils";

interface OptionsCommandHeaderProps {
  underlying: string;
  onChangeUnderlying: (u: string) => void;
  selectedSource: OptionSource;
  onChangeSource: (src: OptionSource) => void;
  environment?: "PAPER" | "LIVE";
  onChangeEnvironment?: (env: "PAPER" | "LIVE") => void;
  selectedExpiry: string;
  onChangeExpiry: (exp: string) => void;
  availableExpiries: RawExpiryItem[];
  spotPrice: number;
  spotChange24h?: number;
  strikeRange: number;
  onChangeStrikeRange: (r: number) => void;
  viewMode: "table" | "heatmap" | "skew" | "strategy" | "scanner";
  onChangeViewMode: (mode: "table" | "heatmap" | "skew" | "strategy" | "scanner") => void;
  moneynessFilter?: "ALL" | "ITM" | "ATM" | "OTM";
  onChangeMoneynessFilter?: (m: "ALL" | "ITM" | "ATM" | "OTM") => void;
  freshOnly?: boolean;
  onChangeFreshOnly?: (fresh: boolean) => void;
  activeOnly?: boolean;
  onChangeActiveOnly?: (active: boolean) => void;
  dataStatus?: FreshnessStatus | string;
  latencyMs?: number;
  dataAgeMs?: number;
  isFetching?: boolean;
  onRefresh?: () => void;
  onToggleDiagnostics?: () => void;
}

const INDIAN_UNDERLYINGS = [
  { id: "NIFTY", name: "NIFTY 50", category: "Indian Index", currency: "₹" },
  { id: "BANKNIFTY", name: "BANK NIFTY", category: "Indian Index", currency: "₹" },
  { id: "FINNIFTY", name: "FINNIFTY", category: "Indian Index", currency: "₹" },
  { id: "SENSEX", name: "SENSEX", category: "Indian Index", currency: "₹" },
  { id: "RELIANCE", name: "RELIANCE", category: "Indian Stock", currency: "₹" },
  { id: "HDFCBANK", name: "HDFC BANK", category: "Indian Stock", currency: "₹" },
  { id: "TCS", name: "TCS", category: "Indian Stock", currency: "₹" },
  { id: "INFY", name: "INFOSYS", category: "Indian Stock", currency: "₹" },
  { id: "ICICIBANK", name: "ICICI BANK", category: "Indian Stock", currency: "₹" },
  { id: "SBIN", name: "SBI", category: "Indian Stock", currency: "₹" },
  { id: "TATAMOTORS", name: "TATA MOTORS", category: "Indian Stock", currency: "₹" },
];

const CRYPTO_UNDERLYINGS = [
  { id: "BTC", name: "BTC / USD", category: "Crypto", currency: "$" },
  { id: "ETH", name: "ETH / USD", category: "Crypto", currency: "$" },
  { id: "SOL", name: "SOL / USD", category: "Crypto", currency: "$" },
  { id: "XAUT", name: "XAUT / USD", category: "Crypto", currency: "$" },
];

export function OptionsCommandHeader({
  underlying,
  onChangeUnderlying,
  selectedSource = "DHAN",
  onChangeSource,
  environment = "PAPER",
  onChangeEnvironment,
  selectedExpiry,
  onChangeExpiry,
  availableExpiries,
  spotPrice,
  spotChange24h = 1.85,
  strikeRange,
  onChangeStrikeRange,
  viewMode,
  onChangeViewMode,
  moneynessFilter = "ALL",
  onChangeMoneynessFilter,
  freshOnly = false,
  onChangeFreshOnly,
  activeOnly = false,
  onChangeActiveOnly,
  dataStatus = "LIVE",
  latencyMs = 24,
  dataAgeMs = 0,
  isFetching,
  onRefresh,
  onToggleDiagnostics,
}: OptionsCommandHeaderProps) {
  // Query live provider health
  const { data: healthData } = useQuery({
    queryKey: ["providersHealthStatus"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/market/providers/health", { timeoutMs: 4000 });
      return res.ok && res.data ? res.data.providers || res.data : null;
    },
    staleTime: 10000,
    refetchInterval: 15000,
  });

  const underlyingsList = React.useMemo(() => {
    return selectedSource === "DHAN" || selectedSource === "UPSTOX"
      ? INDIAN_UNDERLYINGS
      : selectedSource === "DELTA_INDIA" || selectedSource === "DELTA" || selectedSource === "BINANCE"
      ? CRYPTO_UNDERLYINGS
      : [...INDIAN_UNDERLYINGS, ...CRYPTO_UNDERLYINGS];
  }, [selectedSource]);

  const getProviderStatus = (provKey: string) => {
    if (!healthData) return "READY";
    const p = healthData[provKey.toLowerCase()] || healthData[provKey] || {};
    return p.status || p.websocket || p.rest || "READY";
  };

  const sourcesList: { id: OptionSource; label: string; department: string; badge: string; color: string; healthStatus?: string }[] = [
    { id: "ALL", label: "Smart / All View", department: "Universal Multi-Broker Comparison", badge: "ALL", color: "border-sky-500/50 bg-sky-950/40 text-sky-300" },
    { id: "DHAN", label: "Dhan Options", department: "Department 1: Indian Equities & Indices", badge: "DHAN HQ v2", color: "border-cyan-500/50 bg-cyan-950/40 text-cyan-300", healthStatus: getProviderStatus("dhan") },
    { id: "UPSTOX", label: "Upstox Options", department: "Department 2: NSE F&O Derivatives", badge: "UPSTOX v3", color: "border-teal-500/50 bg-teal-950/40 text-teal-300", healthStatus: getProviderStatus("upstox") },
    { id: "DELTA_INDIA", label: "Delta Crypto Options", department: "Department 3: Crypto Derivatives", badge: "DELTA INDIA", color: "border-amber-500/50 bg-amber-950/40 text-amber-300", healthStatus: getProviderStatus("delta") },
    { id: "BINANCE", label: "Binance Options", department: "Department 4: European Options", badge: "BINANCE E-OPT", color: "border-yellow-500/50 bg-yellow-950/40 text-yellow-300", healthStatus: getProviderStatus("binance") },
    { id: "PAPER_SIMULATOR", label: "Paper Simulator", department: "Department 5: Simulation Engine", badge: "BLACK-SCHOLES", color: "border-purple-500/50 bg-purple-950/40 text-purple-300" },
  ];

  const currentObj = underlyingsList.find((u) => u.id === underlying) || underlyingsList[0];
  const isPositive = spotChange24h >= 0;

  // Auto-switch underlying if not in current source's list
  React.useEffect(() => {
    if (!underlyingsList.some((u) => u.id === underlying)) {
      if (selectedSource === "DHAN") onChangeUnderlying("NIFTY");
      else if (selectedSource === "DELTA_INDIA") onChangeUnderlying("BTC");
    }
  }, [selectedSource, underlying, underlyingsList, onChangeUnderlying]);

  // Normalized Expiries Presentation Options
  const normalizedExpiries = React.useMemo(() => {
    return normalizeExpiriesList(availableExpiries, underlying);
  }, [availableExpiries, underlying]);

  const activeExpiryOpt = normalizedExpiries.find(
    (e) => e.value === selectedExpiry || e.dateString === selectedExpiry
  );

  let daysToExpiry = typeof activeExpiryOpt?.daysToExpiry === "number" ? Math.round(activeExpiryOpt.daysToExpiry) : 0;
  if (daysToExpiry === 0 && selectedExpiry) {
    try {
      const expDate = new Date(selectedExpiry);
      const now = new Date();
      daysToExpiry = Math.max(0, Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    } catch {
      daysToExpiry = 0;
    }
  }

  const isStale = dataStatus === "STALE" || dataAgeMs > 8000;

  return (
    <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
      {/* Top Bar: Title, Environment Mode, Live Spot Quote & Diagnostics */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Title & Environment Badge */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shadow-md">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-bold text-white tracking-tight">
                  MULTI-BROKER OPTIONS CHAIN & DERIVATIVES GATEWAY
                </h1>
                {/* Safe Environment Badge */}
                <span
                  className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border ${
                    environment === "LIVE"
                      ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                      : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                  }`}
                  title={environment === "LIVE" ? "Live Broker Trading Mode" : "Safe Paper Simulation Default"}
                >
                  {environment === "LIVE" ? "🔴 LIVE EXECUTION" : "🛡️ PAPER SIMULATOR (SAFE)"}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  STRICT BROKER ISOLATION
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Institutional strike-centered ladder with official Dhan, Upstox, Delta Exchange India, and Paper Simulator segregation
              </p>
            </div>
          </div>
        </div>

        {/* Live Spot Quote & Telemetry Bar */}
        <div className="flex items-center gap-4 bg-[#141E33] border border-[#1E293B] rounded-xl p-2.5 px-4 text-xs font-mono">
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Underlying Spot</div>
            <div className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
              <span>{currentObj.currency}{spotPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className={`text-xs font-semibold flex items-center ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isPositive ? "+" : ""}{spotChange24h}%
              </span>
            </div>
          </div>

          <div className="border-l border-slate-700 pl-3 hidden sm:block">
            <div className="text-[10px] text-slate-400 uppercase">Feed Telemetry</div>
            <div className={`font-bold flex items-center gap-1 ${isStale ? "text-amber-400" : "text-cyan-400"}`}>
              <Radio className={`w-3 h-3 ${isStale ? "text-amber-400 animate-pulse" : "text-cyan-400"}`} />
              <span>{dataStatus} ({latencyMs}ms{dataAgeMs > 0 ? ` · ${Math.round(dataAgeMs/1000)}s age` : ""})</span>
            </div>
          </div>

          {/* Diagnostics Button */}
          {onToggleDiagnostics && (
            <button
              onClick={onToggleDiagnostics}
              className="p-1.5 rounded-lg bg-[#0B111E] hover:bg-slate-800 text-slate-300 transition-all border border-slate-700"
              title="View Deduplication & Stream Diagnostics"
            >
              <Activity className="w-4 h-4 text-cyan-400" />
            </button>
          )}

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isFetching}
            className="p-1.5 rounded-lg bg-[#0B111E] hover:bg-slate-800 text-slate-300 transition-all disabled:opacity-50"
            title="Refresh option chain"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Mandatory Source Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-slate-800/80">
        <span className="text-[10px] font-mono text-slate-400 uppercase font-bold pr-1">Source:</span>
        {sourcesList.map((s) => {
          const isSelected = selectedSource === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onChangeSource(s.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                isSelected
                  ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-lg shadow-cyan-950/40"
                  : `bg-[#141E33] text-slate-300 hover:bg-[#1A2640] ${s.color}`
              }`}
            >
              <span>{s.label}</span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-normal ${
                  isSelected ? "bg-slate-950/30 text-slate-950 font-bold" : "bg-slate-800/80 text-slate-300"
                }`}
              >
                {s.badge}
              </span>
              {s.healthStatus && s.healthStatus !== "READY" && (
                <span
                  className={`text-[8px] px-1 py-0.2 rounded font-bold uppercase ${
                    s.healthStatus === "LIVE" || s.healthStatus === "CONNECTED"
                      ? isSelected ? "bg-emerald-950 text-emerald-300" : "bg-emerald-950/80 text-emerald-400 border border-emerald-500/30"
                      : s.healthStatus.includes("EXPIRED") || s.healthStatus.includes("AUTH")
                      ? isSelected ? "bg-rose-950 text-rose-300" : "bg-rose-950/80 text-rose-400 border border-rose-500/30"
                      : "bg-amber-950/80 text-amber-400 border border-amber-500/30"
                  }`}
                >
                  {s.healthStatus}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Underlying Selector Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-b border-slate-800/80 pt-2">
        {underlyingsList.map((u) => {
          const isSelected = underlying === u.id;
          return (
            <button
              key={u.id}
              onClick={() => onChangeUnderlying(u.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isSelected
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/40"
                  : "bg-[#141E33] text-slate-400 hover:text-slate-200 hover:bg-[#1A2640]"
              }`}
            >
              <span>{u.name}</span>
              <span className={`text-[9px] px-1 py-0.2 rounded font-normal ${
                isSelected ? "bg-slate-950/30 text-slate-950" : "bg-slate-800 text-slate-400"
              }`}>
                {u.category}
              </span>
            </button>
          );
        })}
      </div>

      {/* Expiry Selector, Filters, Strike Range, and View Modes */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pt-1 text-xs font-mono flex-wrap">
        {/* Expiry Dropdown & DTE */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-slate-400 flex items-center gap-1 uppercase text-[10px]">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            Expiry:
          </label>
          <select
            value={selectedExpiry}
            onChange={(e) => onChangeExpiry(e.target.value)}
            className="bg-[#141E33] border border-slate-700 text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-bold"
          >
            {normalizedExpiries && normalizedExpiries.length > 0 ? (
              normalizedExpiries.map((opt) => (
                <option key={opt.key} value={opt.value}>
                  {opt.label}
                </option>
              ))
            ) : (
              <option value="">Syncing Expiries...</option>
            )}
          </select>
          {daysToExpiry > 0 && (
            <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 font-semibold text-[10px]">
              {daysToExpiry} DTE
            </span>
          )}

          {/* Moneyness Filter */}
          {onChangeMoneynessFilter && (
            <div className="flex items-center bg-[#141E33] border border-slate-700 rounded-lg p-0.5 text-[10px]">
              {(["ALL", "ITM", "ATM", "OTM"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => onChangeMoneynessFilter(m)}
                  className={`px-2 py-1 rounded font-bold transition-all ${
                    moneynessFilter === m ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}

          {/* Fresh Only Filter */}
          {onChangeFreshOnly && (
            <button
              onClick={() => onChangeFreshOnly(!freshOnly)}
              className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${
                freshOnly
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-[#141E33] text-slate-400 border-slate-700 hover:text-white"
              }`}
            >
              Fresh Only
            </button>
          )}
        </div>

        {/* Strike Range & View Mode Switcher */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Strike Range */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 uppercase">Strikes:</span>
            {[10, 20, 50, 100].map((num) => (
              <button
                key={num}
                onClick={() => onChangeStrikeRange(num)}
                className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                  strikeRange === num
                    ? "bg-cyan-500 text-slate-950"
                    : "bg-[#141E33] text-slate-400 hover:text-white"
                }`}
              >
                ±{num / 2}
              </button>
            ))}
          </div>

          {/* View Modes */}
          <div className="flex items-center bg-[#141E33] border border-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => onChangeViewMode("table")}
              className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-all ${
                viewMode === "table" ? "bg-cyan-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
              }`}
              title="Strike-centered ladder table"
            >
              <Table className="w-3 h-3" />
              Ladder
            </button>

            <button
              onClick={() => onChangeViewMode("heatmap")}
              className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-all ${
                viewMode === "heatmap" ? "bg-cyan-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
              }`}
              title="Open interest heatmap"
            >
              <Flame className="w-3 h-3" />
              OI Heatmap
            </button>

            <button
              onClick={() => onChangeViewMode("skew")}
              className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-all ${
                viewMode === "skew" ? "bg-cyan-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
              }`}
              title="Implied volatility smile and skew"
            >
              <LineChart className="w-3 h-3" />
              IV Skew
            </button>

            <button
              onClick={() => onChangeViewMode("strategy")}
              className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-all ${
                viewMode === "strategy" ? "bg-cyan-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
              }`}
              title="Multi-leg strategy builder & payoff analyzer"
            >
              <Compass className="w-3 h-3" />
              Strategy Lab
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
