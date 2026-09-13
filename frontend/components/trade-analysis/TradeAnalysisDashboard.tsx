"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Shield,
  Clock,
  Layers,
  Zap,
  TrendingUp,
  TrendingDown,
  Scale,
  RefreshCw,
  Sliders,
  CheckCircle2,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  Sparkles,
  Radio,
  X,
} from "lucide-react";
import {
  TradeAnalysisInstrument,
  UnderlyingMarketData,
  FuturesMarketData,
  OptionChainMacroStats,
  CallPutComparisonData,
  ActiveIndicator,
  TradeSetupAnalysis,
  ConfirmationMatrixItem,
  OrderPreviewData,
  ExecutionStatusRecord,
} from "./TradeAnalysisTypes";
import { TradeAnalysisUnderlyingFuturesPanel } from "./TradeAnalysisUnderlyingFuturesPanel";
import { TradeAnalysisIndicatorBuilder } from "./TradeAnalysisIndicatorBuilder";
import { TradeAnalysisConfirmationMatrix } from "./TradeAnalysisConfirmationMatrix";
import { TradeAnalysisRiskReward } from "./TradeAnalysisRiskReward";
import { TradeAnalysisOrderExecutor } from "./TradeAnalysisOrderExecutor";
import { useGlobalData } from "@/context/GlobalDataContext";
import { cn } from "@/lib/utils";

interface TradeAnalysisDashboardProps {
  initialInstrument?: Partial<TradeAnalysisInstrument>;
  onClose?: () => void;
}

const DEFAULT_ACTIVE_INDICATORS: ActiveIndicator[] = [
  { id: "ema_fast", name: "Fast EMA (9 Period)", category: "Trend", seriesTarget: "OPTION_PREMIUM", enabled: true, timeframe: "5m", params: { length: 9, source: "close" }, color: "#22D3EE" },
  { id: "ema_slow", name: "Slow EMA (21 Period)", category: "Trend", seriesTarget: "OPTION_PREMIUM", enabled: true, timeframe: "5m", params: { length: 21, source: "close" }, color: "#38BDF8" },
  { id: "ema_und_200", name: "Underlying Trend Baseline (EMA 200)", category: "Trend", seriesTarget: "UNDERLYING", enabled: true, timeframe: "1H", params: { length: 200, source: "close" }, color: "#F59E0B" },
  { id: "vwap", name: "VWAP (Volume Weighted Avg Price)", category: "Trend", seriesTarget: "OPTION_PREMIUM", enabled: true, timeframe: "5m", params: { session: "daily" }, color: "#EAB308" },
  { id: "rsi_prem", name: "Option Premium RSI (14)", category: "Momentum", seriesTarget: "OPTION_PREMIUM", enabled: true, timeframe: "5m", params: { period: 14, overbought: 70, oversold: 30 }, color: "#F43F5E" },
  { id: "rsi_und", name: "Underlying Spot RSI (14)", category: "Momentum", seriesTarget: "UNDERLYING", enabled: true, timeframe: "15m", params: { period: 14, overbought: 70, oversold: 30 }, color: "#FB7185" },
];

const finiteNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const positiveNumber = (value: unknown): number | undefined => {
  const parsed = finiteNumber(value);
  return parsed !== undefined && parsed > 0 ? parsed : undefined;
};

const formatMaybe = (value: unknown, digits = 2): string => {
  const parsed = finiteNumber(value);
  return parsed === undefined ? "—" : parsed.toFixed(digits);
};

const formatPositive = (value: unknown, digits = 2): string => {
  const parsed = positiveNumber(value);
  return parsed === undefined ? "—" : parsed.toFixed(digits);
};

export function TradeAnalysisDashboard({
  initialInstrument,
  onClose,
}: TradeAnalysisDashboardProps) {
  const { positions: globalPositions, orders: globalOrders, refreshAll } = useGlobalData();

  // ── 1. Selected Instrument State ─────────────────────────────────
  const [instrument, setInstrument] = useState<TradeAnalysisInstrument>({
    underlying: initialInstrument?.underlying || "",
    symbol: initialInstrument?.symbol || "",
    securityId: initialInstrument?.securityId,
    exchangeSegment: initialInstrument?.exchangeSegment,
    assetClass: initialInstrument?.assetClass || "OPTION",
    expiry: initialInstrument?.expiry,
    strike: initialInstrument?.strike,
    optionType: initialInstrument?.optionType,
    side: initialInstrument?.side || "BUY",
    ltp: initialInstrument?.ltp ?? 0,
    dataAvailable: initialInstrument?.dataAvailable === true,
    source: initialInstrument?.source,
    bid: initialInstrument?.bid,
    ask: initialInstrument?.ask,
    spread: initialInstrument?.spread,
    volume: initialInstrument?.volume,
    openInterest: initialInstrument?.openInterest,
    oiChangePct: initialInstrument?.oiChangePct,
    iv: initialInstrument?.iv,
    lotSize: initialInstrument?.lotSize,
    tickSize: initialInstrument?.tickSize,
    greeks: initialInstrument?.greeks,
  });

  // ── 2. Live Market Query (single selected-provider connection) ─────
  const [lastPacketTime, setLastPacketTime] = useState<Date | null>(null);

  const { data: liveQuoteData } = useQuery<{
    underlying?: any;
    instrument?: any;
    futures?: any;
    chain?: any;
    call_put?: any;
    source?: string;
  } | null>({
    queryKey: ["tradeAnalysisQuote", instrument.symbol, instrument.underlying, instrument.exchangeSegment],
    queryFn: async () => {
      if (!instrument.underlying || !instrument.symbol) return null;

      const segment = (instrument.exchangeSegment || "").toUpperCase();
      if (!segment || (!segment.includes("NSE") && !segment.includes("BSE"))) {
        return null;
      }

      const symbols = Array.from(new Set([instrument.underlying, instrument.symbol].filter(Boolean)));
      try {
        const res = await fetch(
          "/api/market-data/dhan/quotes?symbols=" + encodeURIComponent(symbols.join(",")),
          {
            cache: "no-store",
            signal: AbortSignal.timeout(5000),
          }
        );
        if (!res.ok) {
          throw new Error("Quote provider returned HTTP " + res.status);
        }

        const json = await res.json();
        const quotes = json?.quotes && typeof json.quotes === "object" ? json.quotes : {};
        const findQuote = (key: string) =>
          quotes[key] || quotes[key.toUpperCase()] || quotes[key.toLowerCase()];
        const underlyingQuote = findQuote(instrument.underlying);
        const instrumentQuote =
          findQuote(instrument.symbol) ||
          (instrument.securityId ? findQuote(instrument.securityId) : undefined);

        if (!underlyingQuote && !instrumentQuote) return null;

        const receivedAt = Date.now();
        setLastPacketTime(new Date(receivedAt));
        return {
          underlying: underlyingQuote,
          instrument: instrumentQuote,
          source: json?.source || json?.provider || instrument.source,
        };
      } catch (error) {
        console.error("[TradeAnalysis] Quote request failed:", error);
        return null;
      }
    },
    enabled: Boolean(instrument.underlying && instrument.symbol),
    refetchInterval: 3000,
    staleTime: 1500,
  });

  const exactPremiumLtp = positiveNumber(
    liveQuoteData?.instrument?.last_price ??
      liveQuoteData?.instrument?.ltp ??
      liveQuoteData?.instrument?.price
  );
  const snapshotPremiumLtp =
    instrument.dataAvailable === true ? positiveNumber(instrument.ltp) : undefined;
  const livePrice = exactPremiumLtp ?? snapshotPremiumLtp ?? 0;
  const underlyingQuote = liveQuoteData?.underlying;
  const underlyingLtp = positiveNumber(
    underlyingQuote?.last_price ?? underlyingQuote?.ltp ?? underlyingQuote?.price
  );
  const hasUnderlyingQuote = underlyingLtp !== undefined;
  const hasPremiumQuote = livePrice > 0;
  const authoritativePremium = liveQuoteData?.instrument || (
    instrument.dataAvailable === true ? instrument : undefined
  );
  const premiumBid = positiveNumber(authoritativePremium?.bid ?? authoritativePremium?.bid_price);
  const premiumAsk = positiveNumber(authoritativePremium?.ask ?? authoritativePremium?.ask_price);
  const premiumSpread = positiveNumber(
    authoritativePremium?.spread ??
      (premiumBid !== undefined && premiumAsk !== undefined ? premiumAsk - premiumBid : undefined)
  );
  const premiumVolume = positiveNumber(authoritativePremium?.volume);
  const premiumOpenInterest = positiveNumber(
    authoritativePremium?.open_interest ?? authoritativePremium?.openInterest
  );
  const premiumOiChange = finiteNumber(
    authoritativePremium?.oi_change_pct ??
      authoritativePremium?.oiChangePct ??
      authoritativePremium?.oi_change
  );
  const premiumIv = positiveNumber(authoritativePremium?.iv);
  const premiumGreeks = authoritativePremium?.greeks;
  const dataAgeSeconds =
    lastPacketTime === null
      ? null
      : Math.max(0, Math.floor((Date.now() - lastPacketTime.getTime()) / 1000));
  const isDataFresh =
    lastPacketTime !== null &&
    hasUnderlyingQuote &&
    hasPremiumQuote &&
    dataAgeSeconds !== null &&
    dataAgeSeconds < 6;
  const dataStatus: "CONNECTED" | "STALE" | "DISCONNECTED" =
    isDataFresh
      ? "CONNECTED"
      : lastPacketTime !== null && dataAgeSeconds !== null && dataAgeSeconds < 20
      ? "STALE"
      : "DISCONNECTED";

  // ── 3. Multi-Asset Context Derivations ───────────────────────────
  const spotPrice = underlyingLtp ?? 0;

  const underlyingData: UnderlyingMarketData = useMemo(() => {
    const dayHigh = positiveNumber(underlyingQuote?.high);
    const dayLow = positiveNumber(underlyingQuote?.low);
    const prevClose = positiveNumber(underlyingQuote?.prev_close ?? underlyingQuote?.previous_close);
    const ready =
      isDataFresh &&
      spotPrice > 0 &&
      dayHigh !== undefined &&
      dayLow !== undefined &&
      prevClose !== undefined;

    return {
      symbol: instrument.underlying,
      spotPrice,
      changePct: finiteNumber(underlyingQuote?.change_24h_pct ?? underlyingQuote?.change_pct) ?? 0,
      dayHigh: dayHigh ?? 0,
      dayLow: dayLow ?? 0,
      prevClose: prevClose ?? 0,
      volume: positiveNumber(underlyingQuote?.volume),
      vwap: positiveNumber(underlyingQuote?.vwap),
      status: isDataFresh ? "LIVE" : lastPacketTime ? "STALE" : "DISCONNECTED",
      lastUpdate: lastPacketTime ? lastPacketTime.toLocaleTimeString() : "—",
      dataAvailable: ready,
    };
  }, [instrument.underlying, underlyingQuote, spotPrice, isDataFresh, lastPacketTime]);

  const futuresData: FuturesMarketData = useMemo(() => {
    const raw = liveQuoteData?.futures;
    const futLtp = positiveNumber(raw?.last_price ?? raw?.ltp ?? raw?.price);
    const basis = finiteNumber(raw?.basis);
    const volume = positiveNumber(raw?.volume);
    const openInterest = positiveNumber(raw?.open_interest ?? raw?.openInterest);
    const oiChangePct = finiteNumber(raw?.oi_change_pct ?? raw?.oiChangePct);
    const ready =
      futLtp !== undefined &&
      basis !== undefined &&
      volume !== undefined &&
      openInterest !== undefined &&
      oiChangePct !== undefined;

    return {
      symbol: instrument.underlying + "-FUT",
      ltp: futLtp ?? 0,
      changePct: finiteNumber(raw?.change_pct ?? raw?.changePct) ?? 0,
      volume: volume ?? 0,
      openInterest: openInterest ?? 0,
      oiChangePct: oiChangePct ?? 0,
      basis: basis ?? 0,
      regime: basis === undefined ? "PARITY" : basis > 0 ? "CONTANGO" : basis < 0 ? "BACKWARDATION" : "PARITY",
      isConfirmed: ready && isDataFresh,
      dataAvailable: ready && isDataFresh,
    };
  }, [instrument.underlying, liveQuoteData, isDataFresh]);

  const chainStats: OptionChainMacroStats = useMemo(() => {
    const raw = liveQuoteData?.chain;
    const strike = instrument.strike ?? 0;
    const chainReady =
      raw &&
      positiveNumber(raw.total_call_oi) !== undefined &&
      positiveNumber(raw.total_put_oi) !== undefined &&
      positiveNumber(raw.total_call_volume) !== undefined &&
      positiveNumber(raw.total_put_volume) !== undefined &&
      positiveNumber(raw.highest_call_oi_strike) !== undefined &&
      positiveNumber(raw.highest_put_oi_strike) !== undefined &&
      positiveNumber(raw.max_pain_strike) !== undefined &&
      positiveNumber(raw.atm_strike) !== undefined;

    const moneyness: "ITM" | "ATM" | "OTM" | "UNKNOWN" =
      !chainReady || strike <= 0 || spotPrice <= 0
        ? "UNKNOWN"
        : Math.abs(spotPrice - strike) < 25
        ? "ATM"
        : instrument.optionType === "CE"
        ? spotPrice > strike
          ? "ITM"
          : "OTM"
        : spotPrice < strike
        ? "ITM"
        : "OTM";

    return {
      totalCallOI: positiveNumber(raw?.total_call_oi) ?? 0,
      totalPutOI: positiveNumber(raw?.total_put_oi) ?? 0,
      totalCallVolume: positiveNumber(raw?.total_call_volume) ?? 0,
      totalPutVolume: positiveNumber(raw?.total_put_volume) ?? 0,
      pcr: positiveNumber(raw?.pcr) ?? 0,
      highestCallOIStrike: positiveNumber(raw?.highest_call_oi_strike) ?? 0,
      highestPutOIStrike: positiveNumber(raw?.highest_put_oi_strike) ?? 0,
      maxPainStrike: positiveNumber(raw?.max_pain_strike) ?? 0,
      atmStrike: positiveNumber(raw?.atm_strike) ?? 0,
      moneyness,
      oiBuildup: raw?.oi_buildup || {
        type: "NEUTRAL",
        label: "DATA UNAVAILABLE",
        description: "Option-chain buildup requires a validated chain payload.",
        color: "bg-slate-900 text-slate-400 border-slate-800",
      },
      dataAvailable: Boolean(chainReady && isDataFresh),
    };
  }, [liveQuoteData, instrument.optionType, instrument.strike, spotPrice, isDataFresh]);

  const callPutComparison: CallPutComparisonData = useMemo(() => {
    const raw = liveQuoteData?.call_put;
    const makeLeg = (leg: any) => ({
      symbol: typeof leg?.symbol === "string" ? leg.symbol : "",
      ltp: positiveNumber(leg?.ltp ?? leg?.last_price) ?? 0,
      changePct: finiteNumber(leg?.change_pct) ?? 0,
      oi: positiveNumber(leg?.oi ?? leg?.open_interest) ?? 0,
      oiChangePct: finiteNumber(leg?.oi_change_pct) ?? 0,
      volume: positiveNumber(leg?.volume) ?? 0,
      iv: positiveNumber(leg?.iv) ?? 0,
      delta: finiteNumber(leg?.delta) ?? 0,
      gamma: finiteNumber(leg?.gamma) ?? 0,
      theta: finiteNumber(leg?.theta) ?? 0,
      vega: finiteNumber(leg?.vega) ?? 0,
    });
    const call = makeLeg(raw?.call);
    const put = makeLeg(raw?.put);
    const ready =
      call.symbol.length > 0 &&
      put.symbol.length > 0 &&
      call.ltp > 0 &&
      put.ltp > 0 &&
      call.oi > 0 &&
      put.oi > 0;

    return {
      strike: instrument.strike ?? 0,
      dataAvailable: Boolean(ready && isDataFresh),
      call,
      put,
    };
  }, [liveQuoteData, instrument.underlying, instrument.strike, isDataFresh]);

  // ── 4. Indicators & 9-Factor Confirmation Matrix ────────────────
  const [activeIndicators, setActiveIndicators] = useState<ActiveIndicator[]>(DEFAULT_ACTIVE_INDICATORS);

  const setupAnalysis: TradeSetupAnalysis = useMemo(() => {
    const specifications: Array<{
      id: string;
      title: string;
      targetSeries: ConfirmationMatrixItem["targetSeries"];
    }> = [
      { id: "und_trend", title: "1. Underlying Spot Trend", targetSeries: "UNDERLYING" },
      { id: "prem_trend", title: "2. Option Premium Trend", targetSeries: "OPTION_PREMIUM" },
      { id: "vwap_align", title: "3. VWAP Benchmark Alignment", targetSeries: "OPTION_PREMIUM" },
      { id: "rsi_mom", title: "4. RSI Momentum Filter", targetSeries: "OPTION_PREMIUM" },
      { id: "macd_mom", title: "5. MACD Momentum Histogram", targetSeries: "OPTION_PREMIUM" },
      { id: "vol_surge", title: "6. Volume Expansion", targetSeries: "OPTION_PREMIUM" },
      { id: "oi_buildup", title: "7. Open Interest Buildup", targetSeries: "CHAIN" },
      { id: "iv_regime", title: "8. Implied Volatility (IV)", targetSeries: "OPTION_PREMIUM" },
      { id: "fut_conf", title: "9. Futures Basis Confirmation", targetSeries: "FUTURES" },
    ];
    const confirmations: ConfirmationMatrixItem[] = specifications.map((item) => ({
      ...item,
      passed: false,
      valueDisplay: "DATA REQUIRED",
      interpretation: "NEUTRAL",
      description: "This factor is not evaluated without a validated provider series.",
      evidence: "No authoritative historical or chain evidence is available.",
    }));

    return {
      state: "INSUFFICIENT_DATA",
      score: 0,
      totalCriteria: confirmations.length,
      confidencePct: 0,
      confirmations,
      summary: "Trade setup is unavailable: validated historical series are required.",
      underlyingSummary: "Underlying historical series unavailable.",
      premiumSummary: "Option-premium historical series unavailable.",
      futuresSummary: "Futures and chain confirmation unavailable.",
    };
  }, []);

  // ── 5. Order Config & Risk State ─────────────────────────────────
  const [lots, setLots] = useState<number>(1);
  const [product, setProduct] = useState<"MIS" | "NRML" | "CNC">("MIS");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "SL" | "SL-M">("LIMIT");
  const [entryPrice, setEntryPrice] = useState<number>(0);
  const [stopLoss, setStopLoss] = useState<number>(0);
  const [targetPrice, setTargetPrice] = useState<number>(0);

  // Merge a newly selected instrument without retaining removed demo values.
  useEffect(() => {
    if (!initialInstrument) return;
    setInstrument((prev) => {
      const next = { ...prev, ...initialInstrument };
      return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
    });
  }, [initialInstrument]);

  useEffect(() => {
    if (entryPrice === 0 && livePrice > 0) {
      setEntryPrice(livePrice);
    }
  }, [livePrice, entryPrice]);

  // ── 6. Order Preview Derived State ─────────────────────────────────
  const orderPreview: OrderPreviewData = useMemo(() => {
    const lotSize = positiveNumber(instrument.lotSize) ?? 0;
    const totalQuantity = lots > 0 && lotSize > 0 ? lots * lotSize : 0;
    const effPrice = orderType === "MARKET" ? livePrice : entryPrice;
    const safePrice = positiveNumber(effPrice) ?? 0;
    const riskPerUnit = safePrice > 0 ? Math.abs(safePrice - stopLoss) : 0;
    const rewardPerUnit = safePrice > 0 ? Math.abs(targetPrice - safePrice) : 0;
    const maxRiskAmount = totalQuantity * riskPerUnit;
    const potentialRewardAmount = totalQuantity * rewardPerUnit;

    return {
      symbol: instrument.symbol,
      underlying: instrument.underlying,
      side: instrument.side,
      product,
      orderType,
      quantity: totalQuantity,
      lots,
      lotSize,
      price: safePrice,
      stopLoss,
      target: targetPrice,
      estimatedValue: totalQuantity * safePrice,
      maxRiskAmount,
      potentialRewardAmount,
      riskRewardRatio:
        riskPerUnit > 0 ? Number((rewardPerUnit / riskPerUnit).toFixed(2)) : 0,
      executionMode: "PAPER",
    };
  }, [instrument, lots, product, orderType, livePrice, entryPrice, stopLoss, targetPrice]);

  const executionReady =
    dataStatus === "CONNECTED" &&
    instrument.symbol.length > 0 &&
    livePrice > 0 &&
    positiveNumber(instrument.lotSize) !== undefined &&
    positiveNumber(instrument.tickSize) !== undefined &&
    orderPreview.quantity > 0 &&
    orderPreview.price > 0 &&
    orderPreview.stopLoss !== undefined &&
    orderPreview.stopLoss > 0 &&
    orderPreview.target !== undefined &&
    orderPreview.target > 0 &&
    setupAnalysis.state !== "INSUFFICIENT_DATA";

  return (
    <div className="space-y-3.5 font-sans text-slate-200 text-xs select-none max-w-7xl mx-auto pb-16">
      {/* ── 1. Header Bar with Real-Time Telemetry & Safe Mode Badge ── */}
      <div className="p-4 bg-[#0A1422] border border-[#12304A] rounded-2xl shadow-2xl flex flex-wrap items-center justify-between gap-3 font-mono">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600/20 to-cyan-500/30 border border-cyan-500/40 text-cyan-300 flex items-center justify-center font-bold text-sm shadow">
            {instrument.optionType || "OPT"}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-base text-white tracking-tight">{instrument.symbol}</h3>
              <span
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-extrabold border",
                  instrument.side === "BUY"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                )}
              >
                {instrument.side} INTENT
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                {chainStats.moneyness}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Expiry: <strong className="text-slate-200">{instrument.expiry}</strong> • Strike:{" "}
              <strong className="text-cyan-300">₹{instrument.strike}</strong> • Lot Size:{" "}
              <strong className="text-slate-200">{instrument.lotSize}</strong>
            </p>
          </div>
        </div>

        {/* Live Data & Freshness Strip */}
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#06101B] border border-[#12304A] flex items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  dataStatus === "CONNECTED"
                    ? "bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400"
                    : dataStatus === "STALE"
                    ? "bg-amber-400 animate-pulse"
                    : "bg-rose-400"
                )}
              />
              <span
                className={cn(
                  "font-bold",
                  dataStatus === "CONNECTED"
                    ? "text-emerald-400"
                    : dataStatus === "STALE"
                    ? "text-amber-400"
                    : "text-rose-400"
                )}
              >
                {dataStatus === "CONNECTED"
                  ? "● LIVE DATA"
                  : dataStatus === "STALE"
                  ? "DATA STALE"
                  : "DATA UNAVAILABLE"}
              </span>
            </div>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">
              Age: <strong className="text-white">{dataAgeSeconds === null ? "—" : dataAgeSeconds + "s"}</strong>
            </span>
          </div>

          <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-bold flex items-center gap-1 text-[11px]">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>PAPER MODE</span>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-[#12304A] transition"
              title="Close Workspace"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Option Premium Telemetry & Greeks Strip ── */}
      <div className="p-4 bg-[#0A1422] border border-[#12304A] rounded-2xl shadow-xl space-y-3 font-mono">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            OPTION PREMIUM TELEMETRY
          </span>
          <span className="text-[10px] text-slate-400">
            Source: <strong className="text-slate-200">{liveQuoteData?.source || instrument.source || "UNAVAILABLE"}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-[10px]">
          <div className="p-2.5 rounded-xl bg-[#06101B] border border-[#12304A]">
            <span className="text-slate-500 uppercase block text-[9px]">Premium LTP</span>
            <strong className="text-white text-sm block mt-0.5">₹{formatPositive(livePrice)}</strong>
          </div>
          <div className="p-2.5 rounded-xl bg-[#06101B] border border-[#12304A]">
            <span className="text-slate-500 uppercase block text-[9px]">Bid / Ask</span>
            <strong className="text-slate-200 text-xs block mt-0.5">
              ₹{formatPositive(premiumBid, 1)} / ₹{formatPositive(premiumAsk, 1)}
            </strong>
          </div>
          <div className="p-2.5 rounded-xl bg-[#06101B] border border-[#12304A]">
            <span className="text-slate-500 uppercase block text-[9px]">Spread</span>
            <strong className="text-cyan-300 text-xs block mt-0.5">
              ₹{formatPositive(premiumSpread)}
            </strong>
          </div>
          <div className="p-2.5 rounded-xl bg-[#06101B] border border-[#12304A]">
            <span className="text-slate-500 uppercase block text-[9px]">Volume</span>
            <strong className="text-slate-200 text-xs block mt-0.5">
              {premiumVolume !== undefined ? (premiumVolume / 1000).toFixed(1) + "k" : "—"}
            </strong>
          </div>
          <div className="p-2.5 rounded-xl bg-[#06101B] border border-[#12304A]">
            <span className="text-slate-500 uppercase block text-[9px]">Open Interest</span>
            <strong className="text-slate-200 text-xs block mt-0.5">
              {premiumOpenInterest !== undefined ? (premiumOpenInterest / 100000).toFixed(2) + "L" : "—"}
            </strong>
          </div>
          <div className="p-2.5 rounded-xl bg-[#06101B] border border-[#12304A]">
            <span className="text-slate-500 uppercase block text-[9px]">OI Change</span>
            <strong className="text-emerald-400 text-xs block mt-0.5">
              {premiumOiChange !== undefined ? (premiumOiChange >= 0 ? "+" : "") + premiumOiChange + "%" : "—"}
            </strong>
          </div>
          <div className="p-2.5 rounded-xl bg-[#06101B] border border-[#12304A]">
            <span className="text-slate-500 uppercase block text-[9px]">Implied Vol (IV)</span>
            <strong className="text-purple-300 text-xs block mt-0.5">
              {premiumIv !== undefined ? (premiumIv * 100).toFixed(1) + "%" : "—"}
            </strong>
          </div>
        </div>

        {/* Analytical Greeks Grid */}
        <div className="p-2.5 bg-[#06101B] rounded-xl border border-[#12304A] grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
          <div>
            <span className="text-slate-500 block">Delta (Δ)</span>
            <strong className="text-cyan-300">{formatMaybe(premiumGreeks?.delta, 2)}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">Gamma (Γ)</span>
            <strong className="text-slate-300">{formatMaybe(premiumGreeks?.gamma, 4)}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">Theta (Θ decay/day)</span>
            <strong className="text-rose-400">{formatMaybe(premiumGreeks?.theta, 1)}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">Vega (ν per 1% IV)</span>
            <strong className="text-purple-300">{formatMaybe(premiumGreeks?.vega, 1)}</strong>
          </div>
        </div>
      </div>

      {/* ── 3. Multi-Asset Context: Underlying Spot, Futures Basis, Chain PCR, and Call/Put Comparison ── */}
      <TradeAnalysisUnderlyingFuturesPanel
        instrument={instrument}
        underlyingData={underlyingData}
        futuresData={futuresData}
        chainStats={chainStats}
        callPutComparison={callPutComparison}
      />

      {/* ── 4. Dual-Series Indicator Engine (Underlying vs Option Premium) ── */}
      <TradeAnalysisIndicatorBuilder
        currentLtp={livePrice}
        underlyingLtp={spotPrice}
        activeIndicators={activeIndicators}
        hasHistoricalData={false}
        onUpdateIndicators={setActiveIndicators}
      />

      {/* ── 5. Institutional 9-Factor Trade Confirmation Matrix ── */}
      <TradeAnalysisConfirmationMatrix
        instrument={instrument}
        setupAnalysis={setupAnalysis}
      />

      {/* ── 6. Option Risk / Reward Engine ── */}
      <TradeAnalysisRiskReward
        side={instrument.side}
        currentLtp={livePrice}
        lotSize={instrument.lotSize ?? 0}
        lots={lots}
        entryPrice={entryPrice}
        stopLoss={stopLoss}
        targetPrice={targetPrice}
        onChangeEntry={setEntryPrice}
        onChangeStopLoss={setStopLoss}
        onChangeTarget={setTargetPrice}
        isLiveMarketFresh={isDataFresh && hasUnderlyingQuote && hasPremiumQuote}
      />

      {/* ── 7. Order Preview & Paper Order Execution ── */}
      <TradeAnalysisOrderExecutor
        orderPreview={orderPreview}
        riskRewardRatio={orderPreview.riskRewardRatio}
        totalMaxRisk={orderPreview.maxRiskAmount}
        totalPotentialProfit={orderPreview.potentialRewardAmount}
        isReadyForReview={executionReady}
        onOrderExecuted={() => {
          if (refreshAll) refreshAll();
        }}
      />
    </div>
  );
}
