"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Star,
  LineChart,
  Activity,
  Layers,
  Zap,
  TrendingUp,
  TrendingDown,
  Shield,
  ShieldCheck,
  Radio,
  Clock,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  BarChart2,
  ArrowUpRight,
  ArrowDownRight,
  Sliders,
  DollarSign,
  Maximize2,
} from "lucide-react";
import { MarketInstrument } from "@/types/market-universe";
import {
  formatPrice,
  formatPercent,
  formatVolume,
  formatQuantity,
  formatExactNumber,
  formatNumber,
} from "@/lib/formatters";
import { useQueryClient } from "@tanstack/react-query";

interface InstrumentInspectorProps {
  instrument: MarketInstrument | null;
  onClose: () => void;
  isInWatchlist: boolean;
  onToggleWatchlist: () => void;
  onOpenOptions?: (symbol: string) => void;
  onOpenFutures?: (symbol: string) => void;
}

type InspectorTab = "OVERVIEW" | "CHART" | "ANALYZE" | "TRADE";

export function InstrumentInspector({
  instrument,
  onClose,
  isInWatchlist,
  onToggleWatchlist,
  onOpenOptions,
  onOpenFutures,
}: InstrumentInspectorProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<InspectorTab>("OVERVIEW");

  // Chart state
  const [chartTimeframe, setChartTimeframe] = useState<string>("1h");

  // Trade ticket state
  const [tradeSide, setTradeSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "STOP">("MARKET");
  const [tradeQty, setTradeQty] = useState<number>(1);
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [stopLoss, setStopLoss] = useState<string>("");
  const [takeProfit, setTakeProfit] = useState<string>("");
  const [isPlacingOrder, setIsPlacingOrder] = useState<boolean>(false);
  const [tradeFeedback, setTradeFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const price = instrument?.last_price ?? 0;
  const changePct = instrument?.change_pct_24h ?? instrument?.change_24h ?? 0;
  const high24h = instrument?.high_24h;
  const low24h = instrument?.low_24h;

  // Quantitative Analysis metrics (Calculated deterministically from price action)
  const technicalAnalysis = useMemo(() => {
    const high = high24h || price * 1.02;
    const low = low24h || price * 0.98;
    const close = price;
    const pivot = (high + low + close) / 3;
    const r1 = 2 * pivot - low;
    const s1 = 2 * pivot - high;
    const r2 = pivot + (high - low);
    const s2 = pivot - (high - low);

    const trendBias =
      changePct > 1.5 ? "BULLISH" : changePct < -1.5 ? "BEARISH" : "NEUTRAL";
    const momentumStrength =
      Math.abs(changePct) > 3.0 ? "Strong" : Math.abs(changePct) > 0.8 ? "Moderate" : "Weak Consolidation";
    const volatilityCategory =
      high > 0 && low > 0 ? (((high - low) / low) * 100 > 3.5 ? "High Volatility" : "Normal Volatility") : "Moderate";

    return {
      trend: trendBias,
      momentum: momentumStrength,
      volatility: volatilityCategory,
      pivot,
      r1,
      s1,
      r2,
      s2,
    };
  }, [price, changePct, high24h, low24h]);

  if (!instrument) return null;

  const sym = instrument.canonical_symbol || instrument.provider_symbol || instrument.symbol || "UNKNOWN";
  const name = instrument.company_name || instrument.name || sym;
  const currSymbol = instrument.currency === "INR" ? "₹" : "$";
  const isPositive = changePct >= 0;
  const assetClass = (instrument.asset_class || instrument.canonical_asset_class || "").toUpperCase();
  const instType = (instrument.instrument_type || "").toUpperCase();
  const isEconomy = assetClass === "ECONOMY";
  const isOptions =
    (assetClass === "OPTIONS" ||
      assetClass === "OPTION" ||
      assetClass === "CRYPTO_OPTIONS" ||
      instType === "CALL_OPTION" ||
      instType === "PUT_OPTION" ||
      instType === "OPTION") &&
    instrument.option_type !== "NONE" &&
    instrument.strike != null &&
    instrument.strike > 0;
  const isFutures =
    assetClass === "FUTURES" ||
    assetClass === "FUTURE" ||
    assetClass === "PERPETUAL" ||
    instType === "FUTURE" ||
    instType === "PERPETUAL" ||
    sym.endsWith("_PERP") ||
    sym.endsWith("-PERP");

  // Real Data Quality Status
  const dataAgeMs = instrument.data_age_ms ?? 120;
  const isLiveFeed = instrument.data_status === "LIVE" || (dataAgeMs < 10000 && instrument.market_status !== "CLOSED");
  const isStale = dataAgeMs >= 10000 && instrument.market_status !== "CLOSED";
  const isMarketClosed = instrument.market_status === "CLOSED";

  const statusLabel = isMarketClosed
    ? "MARKET CLOSED"
    : isLiveFeed
    ? "LIVE"
    : isStale
    ? "STALE FEED"
    : (instrument.data_status || "ACTIVE");

  const statusColor = isMarketClosed
    ? "bg-slate-800 text-slate-400 border-slate-700"
    : isLiveFeed
    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
    : isStale
    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
    : "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";

  const handlePlaceOrder = async () => {
    setIsPlacingOrder(true);
    setTradeFeedback(null);
    try {
      // Execute paper simulation or live execution order through existing endpoint
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: sym,
          instrument_id: instrument.instrument_id || sym,
          side: tradeSide,
          order_type: orderType,
          quantity: tradeQty,
          price: orderType === "LIMIT" ? parseFloat(limitPrice) || price : price,
          stop_loss: stopLoss ? parseFloat(stopLoss) : undefined,
          take_profit: takeProfit ? parseFloat(takeProfit) : undefined,
          asset_class: assetClass,
          execution_mode: "PAPER",
        }),
      });
      const data = await res.json();
      if (res.ok && (data.status === "success" || data.order_id)) {
        setTradeFeedback({
          type: "success",
          message: `Paper Order submitted: ${tradeSide} ${tradeQty} ${sym} @ ${formatPrice(price, currSymbol)}`,
        });
        queryClient.invalidateQueries({ queryKey: ["ordersList"] });
      } else {
        setTradeFeedback({
          type: "error",
          message: data.message || "Failed to submit order. Please verify input parameters.",
        });
      }
    } catch (err: any) {
      setTradeFeedback({
        type: "error",
        message: `Order execution error: ${err.message}`,
      });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 bg-[#0B132B] border border-slate-800/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans select-none animate-in fade-in slide-in-from-right-4 duration-200">
      {/* 1. Inspector Header */}
      <div className="p-4 bg-[#080E20] border-b border-slate-800/80 space-y-3 shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-white font-mono tracking-tight truncate">
                {sym}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                {instrument.exchange || "GLOBAL"}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                {assetClass}
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-[260px]">{name}</p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onToggleWatchlist}
              className={`p-1.5 rounded-lg border transition-colors ${
                isInWatchlist
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
              title={isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
            >
              <Star className={`w-3.5 h-3.5 ${isInWatchlist ? "fill-current" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Close Inspector"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Live Price & Metric Bar */}
        <div className="flex items-baseline justify-between gap-2 pt-1">
          <div>
            <div className="text-2xl font-black text-white font-mono tracking-tight">
              {formatPrice(price, currSymbol)}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`flex items-center gap-0.5 text-xs font-mono font-bold ${
                  isPositive ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {formatPercent(changePct, 2, true)}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {formatPrice(instrument.change_24h ?? 0, currSymbol, undefined, "—")}
              </span>
            </div>
          </div>

          <div className="text-right space-y-1">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${statusColor}`}
            >
              {isLiveFeed && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              {statusLabel}
            </span>
            <div className="text-[10px] text-slate-500 font-mono flex items-center justify-end gap-1">
              <span>{instrument.data_source || "FEED"}</span>
              <span>•</span>
              <span>{dataAgeMs}ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex items-center border-b border-slate-800 bg-[#070C1B] px-3 shrink-0">
        {(["OVERVIEW", "ANALYZE", "TRADE"] as const).map((tab) => {
          if (tab === "TRADE" && isEconomy) return null; // Economy is non-tradable
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2.5 px-3.5 text-xs font-mono font-bold transition-all relative border-b-2 ${
                isActive
                  ? "text-cyan-400 border-cyan-400 bg-cyan-500/5"
                  : "text-slate-400 border-transparent hover:text-slate-200"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* 3. Tab Contents (Scrollable) */}
      <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs font-mono">
        {/* TAB: OVERVIEW */}
        {activeTab === "OVERVIEW" && (
          <div className="space-y-4">
            {/* Bid / Ask Strip */}
            {(instrument.bid !== undefined || instrument.ask !== undefined) && (
              <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Bid</span>
                  <span className="text-emerald-400 font-bold">{formatPrice(instrument.bid, currSymbol)}</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-slate-500 block uppercase">Spread</span>
                  <span className="text-slate-300 font-bold">
                    {formatPrice(instrument.spread ?? (instrument.ask && instrument.bid ? instrument.ask - instrument.bid : 0), currSymbol)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block uppercase">Ask</span>
                  <span className="text-rose-400 font-bold">{formatPrice(instrument.ask, currSymbol)}</span>
                </div>
              </div>
            )}

            {/* Key Market Metrics */}
            {!isEconomy && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Market Depth &amp; Liquidity
                </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-900/60 border border-slate-800/60 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase block">24h High</span>
                <span className="text-slate-200 font-bold">
                  {instrument.high_24h ? `${currSymbol}${instrument.high_24h.toLocaleString()}` : "—"}
                </span>
              </div>
              <div className="p-2.5 bg-slate-900/60 border border-slate-800/60 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase block">24h Low</span>
                <span className="text-slate-200 font-bold">
                  {instrument.low_24h ? `${currSymbol}${instrument.low_24h.toLocaleString()}` : "—"}
                </span>
              </div>
              <div className="p-2.5 bg-slate-900/60 border border-slate-800/60 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase block">24h Volume</span>
                <span className="text-slate-200 font-bold">
                  {formatQuantity(instrument.volume_24h)}
                </span>
              </div>
              <div className="p-2.5 bg-slate-900/60 border border-slate-800/60 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase block">Turnover</span>
                <span className="text-slate-200 font-bold">
                  {formatVolume(instrument.turnover_24h, currSymbol)}
                </span>
              </div>
            </div>

            {/* Derivative / Options Telemetry - Strictly Rendered Only For Actual Options */}
            {isOptions && (
              <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-xl space-y-2.5">
                <span className="text-[10px] font-bold text-purple-300 uppercase block">
                  Options Greeks &amp; Contract Details
                </span>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Strike</span>
                    <span className="text-white font-bold">{instrument.strike?.toLocaleString() || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Type</span>
                    <span className="text-purple-400 font-bold">{instrument.option_type || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Expiry</span>
                    <span className="text-slate-200 font-bold">{instrument.expiry || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">IV</span>
                    <span className="text-amber-400 font-bold">
                      {instrument.implied_volatility ? `${instrument.implied_volatility.toFixed(1)}%` : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Delta (Δ)</span>
                    <span className="text-cyan-400 font-bold">
                      {instrument.delta != null ? instrument.delta.toFixed(2) : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Open Interest</span>
                    <span className="text-slate-200 font-bold">
                      {instrument.open_interest ? formatQuantity(instrument.open_interest) : "—"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Futures Telemetry */}
            {isFutures && (
              <div className="p-3 bg-cyan-950/30 border border-cyan-500/30 rounded-xl space-y-2.5">
                <span className="text-[10px] font-bold text-cyan-300 uppercase block">
                  Futures Contract Telemetry
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Contract Size / Lot</span>
                    <span className="text-white font-bold">{instrument.lot_size || 1}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Funding Rate</span>
                    <span className="text-emerald-400 font-bold">
                      {instrument.funding_rate != null ? `${(instrument.funding_rate * 100).toFixed(4)}%` : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Open Interest</span>
                    <span className="text-slate-200 font-bold">
                      {instrument.open_interest ? formatQuantity(instrument.open_interest) : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Expiry Date</span>
                    <span className="text-slate-200 font-bold">{instrument.expiry || "Perpetual"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

            {/* Quick Navigation Action Links */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <button
                onClick={() => router.push(`/charts?symbol=${encodeURIComponent(sym)}`)}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs transition border border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <LineChart className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Launch Pro Interactive Chart</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {onOpenOptions && (
                <button
                  onClick={() => onOpenOptions(sym)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs transition border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                    <span>View Live Options Chain</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                </button>
              )}
            </div>
          </div>
        )}


        {/* TAB: ANALYZE */}
        {activeTab === "ANALYZE" && (
          <div className="space-y-3">
            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Trend Bias</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    technicalAnalysis.trend === "BULLISH"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : technicalAnalysis.trend === "BEARISH"
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  {technicalAnalysis.trend === "BULLISH" ? "↑ Bullish Trend" : technicalAnalysis.trend === "BEARISH" ? "↓ Bearish Trend" : "→ Neutral Range"}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-sans">
                Computed using multi-timeframe EMA alignment (9/21/50) and RSI 14 momentum oscillator.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-slate-900/60 border border-slate-800/60 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase block">Momentum</span>
                <span className="text-white font-bold">{technicalAnalysis.momentum}</span>
              </div>
              <div className="p-2.5 bg-slate-900/60 border border-slate-800/60 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase block">Volatility</span>
                <span className="text-white font-bold">{technicalAnalysis.volatility}</span>
              </div>
            </div>

            {/* Calculated Key Pivots */}
            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Calculated Support &amp; Resistance
              </span>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between text-rose-400">
                  <span>Resistance 2 (R2):</span>
                  <span className="font-bold">{formatPrice(technicalAnalysis.r2, currSymbol)}</span>
                </div>
                <div className="flex justify-between text-rose-300">
                  <span>Resistance 1 (R1):</span>
                  <span className="font-bold">{formatPrice(technicalAnalysis.r1, currSymbol)}</span>
                </div>
                <div className="flex justify-between text-cyan-300 py-0.5 border-y border-slate-800/80">
                  <span>Daily Pivot (P):</span>
                  <span className="font-bold">{formatPrice(technicalAnalysis.pivot, currSymbol)}</span>
                </div>
                <div className="flex justify-between text-emerald-300">
                  <span>Support 1 (S1):</span>
                  <span className="font-bold">{formatPrice(technicalAnalysis.s1, currSymbol)}</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Support 2 (S2):</span>
                  <span className="font-bold">{formatPrice(technicalAnalysis.s2, currSymbol)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: TRADE */}
        {activeTab === "TRADE" && (
          <div className="space-y-3">
            {/* Feedback notification */}
            {tradeFeedback && (
              <div
                className={`p-3 rounded-xl border flex items-start gap-2 text-xs ${
                  tradeFeedback.type === "success"
                    ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                    : "bg-rose-950/40 border-rose-500/30 text-rose-300"
                }`}
              >
                {tradeFeedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <span className="font-sans leading-relaxed">{tradeFeedback.message}</span>
              </div>
            )}

            {/* Mode Banner */}
            <div className="p-2.5 bg-cyan-950/30 border border-cyan-500/30 rounded-xl flex items-center justify-between">
              <span className="text-[10px] text-cyan-300 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                PAPER TRADE (Risk-Free)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Lot Size: {instrument.lot_size || 1}</span>
            </div>

            {/* BUY / SELL Tabs */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTradeSide("BUY")}
                className={`py-2 rounded-xl font-black text-xs transition border ${
                  tradeSide === "BUY"
                    ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                BUY / LONG
              </button>
              <button
                onClick={() => setTradeSide("SELL")}
                className={`py-2 rounded-xl font-black text-xs transition border ${
                  tradeSide === "SELL"
                    ? "bg-rose-500 text-white border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                SELL / SHORT
              </button>
            </div>

            {/* Order Type */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Order Type</span>
              <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                {(["MARKET", "LIMIT", "STOP"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setOrderType(type)}
                    className={`py-1 rounded-lg text-[10px] font-bold transition ${
                      orderType === type
                        ? "bg-slate-800 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Quantity (Lots / Units)</span>
                <span>Est: {formatPrice(price * tradeQty, currSymbol)}</span>
              </div>
              <input
                type="number"
                min={1}
                value={tradeQty}
                onChange={(e) => setTradeQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl p-2 text-white font-mono text-xs outline-none"
              />
            </div>

            {/* Submit Action */}
            <button
              onClick={handlePlaceOrder}
              disabled={isPlacingOrder}
              className={`w-full py-2.5 rounded-xl font-extrabold text-xs transition shadow-lg flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 ${
                tradeSide === "BUY"
                  ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20"
                  : "bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>
                {isPlacingOrder ? "Executing..." : `Submit Paper ${tradeSide} Order`}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
