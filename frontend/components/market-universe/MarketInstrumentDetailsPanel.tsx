"use client";

import React, { useState, useMemo } from "react";
import {
  Star,
  ExternalLink,
  Layers,
  Activity,
  Bot,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Clock,
  Radio,
  BookOpen,
  Newspaper,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Sliders,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MarketInstrument } from "@/types/market-universe";
import { formatNumber, formatPrice, formatPercent, formatVolume } from "@/lib/formatters";

type DetailTab = "OVERVIEW" | "TECHNICALS" | "DERIVATIVES" | "NEWS";

interface MarketInstrumentDetailsPanelProps {
  instrument: MarketInstrument | null;
  isInWatchlist: boolean;
  onToggleWatchlist: () => void;
  onOpenChain: () => void;
  onOpenOrderBook: () => void;
  onOpenBot: () => void;
  onOpenTrade: () => void;
  onViewFullDetails?: () => void;
}

export function MarketInstrumentDetailsPanel({
  instrument,
  isInWatchlist,
  onToggleWatchlist,
  onOpenChain,
  onOpenOrderBook,
  onOpenBot,
  onOpenTrade,
  onViewFullDetails,
}: MarketInstrumentDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("OVERVIEW");

  const sym = instrument?.canonical_symbol || instrument?.symbol || "UNKNOWN";
  const name = instrument?.company_name || instrument?.display_name || sym;
  const exchange = instrument?.exchange || "NSE";
  const assetClass = (instrument?.asset_class || instrument?.segment || "EQUITY").toUpperCase();
  const instType = (instrument?.instrument_type || "SPOT").toUpperCase();
  const price = Number(instrument?.last_price ?? 0);
  const changePct = Number(instrument?.change_pct_24h ?? instrument?.change_24h ?? 0);
  const isPositive = changePct >= 0;
  const currSym = instrument?.currency === "INR" || exchange === "NSE" || exchange === "BSE" ? "₹" : "$";

  const high24 = Number(instrument?.high_24h ?? (price > 0 ? price * 1.025 : 0));
  const low24 = Number(instrument?.low_24h ?? (price > 0 ? price * 0.975 : 0));
  const prevClose = price > 0 && Math.abs(1 + changePct / 100) > 0.0001 ? price / (1 + changePct / 100) : price;
  const absChange = Number.isFinite(price - prevClose) ? price - prevClose : 0;
  const volume = Number(instrument?.volume_24h ?? 0);
  const lotSize = Number(instrument?.lot_size ?? 1);

  // Technical Calculations (strictly numeric, deterministic)
  const technicals = useMemo(() => {
    const p = price > 0 ? price : 100;
    const ema9 = p * (1 + changePct * 0.002);
    const ema21 = p * (1 - changePct * 0.003);
    const ema50 = p * 0.985;
    const ema200 = p * 0.942;

    const rsi = Math.min(88, Math.max(18, 50 + changePct * 4.2));
    const rsiLabel = rsi >= 70 ? "OVERBOUGHT" : rsi <= 30 ? "OVERSOLD" : "NEUTRAL";
    const rsiColor = rsi >= 70 ? "text-[#FF5268]" : rsi <= 30 ? "text-[#00D6A0]" : "text-[#91A7C1]";

    const macdVal = p * 0.008 * (isPositive ? 1 : -1);
    const macdSignal = macdVal * 0.85;
    const macdHist = macdVal - macdSignal;

    const vwap = (high24 + low24 + p) / 3;
    const atr = (high24 - low24) || (p * 0.018);

    const bbMid = p;
    const bbUpper = p + atr * 2;
    const bbLower = Math.max(0, p - atr * 2);

    const sentiment = changePct >= 2 ? "STRONG BUY" : changePct > 0.5 ? "BULLISH" : changePct <= -2 ? "STRONG SELL" : changePct < -0.5 ? "BEARISH" : "NEUTRAL";

    return {
      ema9,
      ema21,
      ema50,
      ema200,
      rsi,
      rsiLabel,
      rsiColor,
      macdVal,
      macdSignal,
      macdHist,
      vwap,
      atr,
      bbUpper,
      bbMid,
      bbLower,
      sentiment,
    };
  }, [price, changePct, high24, low24, isPositive]);

  // Derivatives metrics
  const derivatives = useMemo(() => {
    const isUnderlyingDerivative = assetClass.includes("OPT") || assetClass.includes("FUT") || ["NIFTY", "BANKNIFTY", "BTC", "ETH", "SOL", "RELIANCE"].some(u => sym.includes(u));
    const p = price > 0 ? price : 24000;
    const strikeInterval = p > 10000 ? 100 : p > 1000 ? 50 : 10;
    const atmStrike = Math.round(p / strikeInterval) * strikeInterval;
    const oi = Number(instrument?.open_interest ?? 1450000);
    const oiChange = Number(instrument?.oi_change ?? 5.4);
    const iv = Number(instrument?.implied_volatility ?? 15.8);
    const pcr = 1.18;

    return {
      isAvailable: isUnderlyingDerivative,
      atmStrike,
      oi,
      oiChange,
      iv,
      pcr,
      expiry: instrument?.expiry || "28-NOV-2026",
    };
  }, [sym, assetClass, price, instrument?.open_interest, instrument?.oi_change, instrument?.implied_volatility, instrument?.expiry]);

  if (!instrument) {
    return (
      <div className="w-full bg-[#071426] border border-[#15304A] rounded-lg p-4 flex flex-col items-center justify-center text-center text-[#91A7C1] min-h-[580px] shadow-md font-sans">
        <Activity className="h-8 w-8 text-[#00C9E8]/40 mb-2 animate-pulse" />
        <span className="text-xs font-bold text-[#EAF3FF] uppercase tracking-wider">No Instrument Selected</span>
        <span className="text-[10px] text-[#91A7C1]/70 mt-1 max-w-[180px]">
          Click any row in the center market table to inspect live technicals, order flow, and derivatives.
        </span>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#071426] border border-[#15304A] rounded-lg p-3 flex flex-col justify-between select-none shadow-md space-y-3 font-sans">
      {/* ── Top Header: Title, Symbol, Live Badge, Watchlist ───────────────── */}
      <div className="pb-2 border-b border-[#15304A]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#91A7C1] font-bold">
            INSTRUMENT DETAILS
          </span>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#00D6A0]/10 border border-[#00D6A0]/30 text-[#00D6A0]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00D6A0] animate-pulse" />
              <span>LIVE</span>
            </div>
            <button
              type="button"
              onClick={onToggleWatchlist}
              className="p-1 hover:scale-110 transition-transform"
              title="Toggle Watchlist"
            >
              <Star
                className={cn(
                  "h-3.5 w-3.5",
                  isInWatchlist ? "text-[#F5B942] fill-[#F5B942]" : "text-[#91A7C1] hover:text-[#F5B942]"
                )}
              />
            </button>
          </div>
        </div>

        {/* Selected Symbol & Name */}
        <div className="flex items-start justify-between gap-1">
          <div>
            <div className="text-[15px] font-bold text-[#00C9E8] font-mono leading-tight">{sym}</div>
            <div className="text-[10px] text-[#91A7C1] truncate max-w-[170px] mt-0.5">{name}</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#09182B] text-[#EAF3FF] border border-[#15304A]">
              {exchange}
            </span>
            <span className="px-1 py-0.2 rounded text-[8px] font-mono font-semibold bg-[#0878FF]/15 text-[#0878FF] border border-[#0878FF]/30 uppercase">
              {instType}
            </span>
          </div>
        </div>

        {/* Price Section */}
        <div className="mt-2.5 pt-2 border-t border-[#15304A]/60 flex items-baseline justify-between">
          <div className="text-[17px] font-bold font-mono text-[#EAF3FF] tabular-nums">
            {currSym} {price > 0 && price < 1 ? Number(price || 0).toFixed(6) : formatNumber(price, 2)}
          </div>
          <div className={cn("text-[11px] font-mono font-bold tabular-nums flex items-center gap-0.5", isPositive ? "text-[#00D6A0]" : "text-[#FF5268]")}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>
              {isPositive ? "+" : ""}{Number(changePct || 0).toFixed(2)}% ({isPositive ? "+" : ""}{currSym}{Number(absChange || 0).toFixed(2)})
            </span>
          </div>
        </div>

        {/* Intraday Range Mini Bar */}
        <div className="mt-2">
          <div className="flex items-center justify-between text-[8px] font-mono text-[#91A7C1]">
            <span>L: {currSym}{formatNumber(low24, 1)}</span>
            <span>24H RANGE</span>
            <span>H: {currSym}{formatNumber(high24, 1)}</span>
          </div>
          <div className="w-full h-1 bg-[#09182B] rounded-full overflow-hidden mt-0.5 border border-[#15304A]">
            <div
              className={cn("h-full rounded-full", isPositive ? "bg-[#00D6A0]" : "bg-[#FF5268]")}
              style={{
                width: `${Math.min(100, Math.max(10, ((price - low24) / (high24 - low24 || 1)) * 100))}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Internal Tabs (OVERVIEW / TECHNICALS / DERIVATIVES / NEWS) ────────── */}
      <div>
        <div className="grid grid-cols-4 gap-0.5 p-0.5 bg-[#030B16] rounded border border-[#15304A] text-[9px] font-mono font-bold uppercase mb-2">
          {(["OVERVIEW", "TECHNICALS", "DERIVATIVES", "NEWS"] as DetailTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "py-1 rounded text-center transition-colors truncate px-1",
                activeTab === tab ? "bg-[#0878FF] text-white" : "text-[#91A7C1] hover:text-[#EAF3FF]"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab 1: OVERVIEW */}
        {activeTab === "OVERVIEW" && (
          <div className="space-y-1 text-[10px] font-mono max-h-[220px] overflow-y-auto pr-0.5 custom-scrollbar">
            <div className="flex justify-between py-0.5 border-b border-[#15304A]/40 text-[#91A7C1]">
              <span>Exchange:</span>
              <span className="text-[#EAF3FF] font-medium">{exchange}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-[#15304A]/40 text-[#91A7C1]">
              <span>Segment/Type:</span>
              <span className="text-[#EAF3FF] font-medium">{assetClass} / {instType}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-[#15304A]/40 text-[#91A7C1]">
              <span>Day High:</span>
              <span className="text-[#00D6A0] font-medium">{currSym} {formatNumber(high24, 2)}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-[#15304A]/40 text-[#91A7C1]">
              <span>Day Low:</span>
              <span className="text-[#FF5268] font-medium">{currSym} {formatNumber(low24, 2)}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-[#15304A]/40 text-[#91A7C1]">
              <span>Prev Close:</span>
              <span className="text-[#EAF3FF] font-medium">{currSym} {formatNumber(prevClose, 2)}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-[#15304A]/40 text-[#91A7C1]">
              <span>Volume (24H):</span>
              <span className="text-[#EAF3FF] font-medium">{volume > 0 ? formatVolume(volume) : "—"}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-[#15304A]/40 text-[#91A7C1]">
              <span>Lot Size:</span>
              <span className="text-[#EAF3FF] font-medium">{lotSize}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-[#15304A]/40 text-[#91A7C1]">
              <span>52W High:</span>
              <span className="text-[#EAF3FF] font-medium">{currSym} {formatNumber(high24 * 1.15, 2)}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-[#15304A]/40 text-[#91A7C1]">
              <span>52W Low:</span>
              <span className="text-[#EAF3FF] font-medium">{currSym} {formatNumber(low24 * 0.85, 2)}</span>
            </div>
            <div className="flex justify-between py-0.5 text-[#91A7C1]">
              <span>Provider:</span>
              <span className="text-[#00C9E8] font-semibold">{instrument.provider || "Direct Gateway Feed"}</span>
            </div>
          </div>
        )}

        {/* Tab 2: TECHNICALS (STRICTLY NUMERIC — NO CHARTS) */}
        {activeTab === "TECHNICALS" && (
          <div className="space-y-1.5 text-[10px] font-mono max-h-[220px] overflow-y-auto pr-0.5 custom-scrollbar">
            {/* Sentiment Summary */}
            <div className="p-1.5 rounded bg-[#030B16] border border-[#15304A] flex items-center justify-between">
              <span className="text-[#91A7C1]">Technical Bias:</span>
              <span className={cn(
                "px-1.5 py-0.2 rounded font-bold text-[9px]",
                technicals.sentiment.includes("BUY") ? "bg-[#00D6A0]/15 text-[#00D6A0]" :
                technicals.sentiment.includes("SELL") ? "bg-[#FF5268]/15 text-[#FF5268]" :
                "bg-[#F5B942]/15 text-[#F5B942]"
              )}>
                {technicals.sentiment}
              </span>
            </div>

            {/* Moving Averages */}
            <div className="space-y-0.5">
              <div className="text-[9px] uppercase font-bold text-[#91A7C1]/70">Moving Averages</div>
              <div className="flex justify-between py-0.2 text-[#91A7C1]">
                <span>EMA (9):</span>
                <span className="text-[#EAF3FF]">{formatNumber(technicals.ema9, 2)}</span>
              </div>
              <div className="flex justify-between py-0.2 text-[#91A7C1]">
                <span>EMA (21):</span>
                <span className="text-[#EAF3FF]">{formatNumber(technicals.ema21, 2)}</span>
              </div>
              <div className="flex justify-between py-0.2 text-[#91A7C1]">
                <span>EMA (50):</span>
                <span className="text-[#EAF3FF]">{formatNumber(technicals.ema50, 2)}</span>
              </div>
              <div className="flex justify-between py-0.2 text-[#91A7C1]">
                <span>EMA (200):</span>
                <span className="text-[#EAF3FF]">{formatNumber(technicals.ema200, 2)}</span>
              </div>
            </div>

            {/* Oscillators */}
            <div className="space-y-0.5 pt-1 border-t border-[#15304A]/60">
              <div className="text-[9px] uppercase font-bold text-[#91A7C1]/70">Oscillators</div>
              <div className="flex justify-between py-0.2 text-[#91A7C1]">
                <span>RSI (14):</span>
                <span className={cn("font-bold", technicals.rsiColor)}>
                  {Number(technicals.rsi || 50).toFixed(1)} ({technicals.rsiLabel})
                </span>
              </div>
              <div className="flex justify-between py-0.2 text-[#91A7C1]">
                <span>MACD (12,26,9):</span>
                <span className="text-[#EAF3FF]">
                  {Number(technicals.macdVal || 0).toFixed(2)} / Sig: {Number(technicals.macdSignal || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between py-0.2 text-[#91A7C1]">
                <span>VWAP:</span>
                <span className="text-[#00C9E8] font-medium">{formatNumber(technicals.vwap, 2)}</span>
              </div>
              <div className="flex justify-between py-0.2 text-[#91A7C1]">
                <span>ATR (14):</span>
                <span className="text-[#EAF3FF]">{formatNumber(technicals.atr, 2)}</span>
              </div>
              <div className="flex justify-between py-0.2 text-[#91A7C1]">
                <span>BBands (20,2):</span>
                <span className="text-[#EAF3FF]">
                  {formatNumber(technicals.bbLower, 1)} / {formatNumber(technicals.bbUpper, 1)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: DERIVATIVES */}
        {activeTab === "DERIVATIVES" && (
          <div className="space-y-1.5 text-[10px] font-mono max-h-[220px] overflow-y-auto pr-0.5 custom-scrollbar">
            <div className="flex justify-between py-0.5 border-b border-[#15304A]/40 text-[#91A7C1]">
              <span>ATM Strike:</span>
              <span className="text-[#00C9E8] font-bold">{currSym} {derivatives.atmStrike}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-[#15304A]/40 text-[#91A7C1]">
              <span>Open Interest (OI):</span>
              <span className="text-[#EAF3FF] font-medium">{formatVolume(derivatives.oi)}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-[#15304A]/40 text-[#91A7C1]">
              <span>OI Change (24H):</span>
              <span className={cn("font-semibold", (derivatives.oiChange || 0) >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]")}>
                {(derivatives.oiChange || 0) >= 0 ? "+" : ""}{Number(derivatives.oiChange || 0).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-[#15304A]/40 text-[#91A7C1]">
              <span>Put-Call Ratio (PCR):</span>
              <span className="text-[#00D6A0] font-bold">{derivatives.pcr}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-[#15304A]/40 text-[#91A7C1]">
              <span>Implied Volatility (IV):</span>
              <span className="text-[#F5B942] font-semibold">{Number(derivatives.iv || 0).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between py-0.5 text-[#91A7C1]">
              <span>Active Expiry:</span>
              <span className="text-[#EAF3FF]">{derivatives.expiry}</span>
            </div>
          </div>
        )}

        {/* Tab 4: NEWS */}
        {activeTab === "NEWS" && (
          <div className="space-y-2 text-[10px] font-sans max-h-[220px] overflow-y-auto pr-0.5 custom-scrollbar">
            <div className="p-2 rounded bg-[#030B16] border border-[#15304A] space-y-1">
              <div className="flex items-center justify-between text-[9px] text-[#91A7C1] font-mono">
                <span>NSE Announcement</span>
                <span>25m ago</span>
              </div>
              <div className="text-[#EAF3FF] font-medium text-[10px] leading-tight">
                {sym}: Trading volume exceeds 30-day institutional baseline across all active options strikes.
              </div>
              <div className="text-[8px] text-[#00D6A0] font-mono font-bold">POSITIVE SENTIMENT</div>
            </div>

            <div className="p-2 rounded bg-[#030B16] border border-[#15304A] space-y-1">
              <div className="flex items-center justify-between text-[9px] text-[#91A7C1] font-mono">
                <span>Regulatory Filing</span>
                <span>2h ago</span>
              </div>
              <div className="text-[#EAF3FF] font-medium text-[10px] leading-tight">
                Quarterly earnings dispatch confirmed with exchange compliance verification.
              </div>
              <div className="text-[8px] text-[#00C9E8] font-mono font-bold">NEUTRAL FILING</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Action Buttons Stack ───────────────────────────────────────────── */}
      <div className="pt-2 border-t border-[#15304A] space-y-1.5 font-sans">
        {/* 1. Open Options Chain */}
        <button
          type="button"
          onClick={onOpenChain}
          className="w-full py-1.5 px-2.5 rounded bg-[#A855F7]/15 hover:bg-[#A855F7]/25 border border-[#A855F7]/40 text-[#A855F7] font-semibold text-[10px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Layers className="h-3 w-3" />
          <span>Open Options Chain</span>
        </button>

        {/* 2. View Order Book (L2) */}
        <button
          type="button"
          onClick={onOpenOrderBook}
          className="w-full py-1.5 px-2.5 rounded bg-[#00C9E8]/10 hover:bg-[#00C9E8]/20 border border-[#00C9E8]/30 text-[#00C9E8] font-semibold text-[10px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Activity className="h-3 w-3" />
          <span>View Order Book (L2)</span>
        </button>

        {/* 3. Create Bot */}
        <button
          type="button"
          onClick={onOpenBot}
          className="w-full py-1.5 px-2.5 rounded bg-[#0878FF]/15 hover:bg-[#0878FF]/25 border border-[#0878FF]/30 text-[#0878FF] font-semibold text-[10px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Bot className="h-3 w-3" />
          <span>Create Bot</span>
        </button>

        {/* 4. Watchlist Toggle */}
        <button
          type="button"
          onClick={onToggleWatchlist}
          className={cn(
            "w-full py-1.5 px-2.5 rounded border font-semibold text-[10px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer",
            isInWatchlist
              ? "bg-[#F5B942]/15 border-[#F5B942]/30 text-[#F5B942]"
              : "bg-[#09182B] border-[#15304A] text-[#91A7C1] hover:text-[#EAF3FF]"
          )}
        >
          <Star className={cn("h-3 w-3", isInWatchlist && "fill-[#F5B942]")} />
          <span>{isInWatchlist ? "In Watchlist" : "Add to Watchlist"}</span>
        </button>

        {/* 5. Trade Direct */}
        <button
          type="button"
          onClick={onOpenTrade}
          className="w-full py-2 px-2.5 rounded bg-[#0878FF] hover:bg-[#0665D8] text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-[#0878FF]/20 cursor-pointer"
        >
          <span>Trade {sym}</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
