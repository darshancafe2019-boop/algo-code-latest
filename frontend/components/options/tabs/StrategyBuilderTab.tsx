import { formatMoney } from "@/lib/formatters";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { dispatchBotCreation } from "@/lib/store/useBotCreationIntentStore";
import {
  StrategyEvaluationResult,
  OptionLeg,
  StrategyMetadata
} from "@/types/options-workstation";
import { StrategyPayoffChart } from "../StrategyPayoffChart";
import { ScenarioAnalysisTable } from "../ScenarioAnalysisTable";
import {
  Plus,
  Trash2,
  Sliders,
  Layers,
  Activity,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Zap,
  Info,
  Bot,
  Play,
  ArrowRight
} from "lucide-react";

export interface StrategyBuilderTabProps {
  underlying: string;
  spotPrice: number;
  currencySymbol: string;
  onExecutePaperTrade?: (payload: any) => void;
  onRunValidation?: (legs: OptionLeg[]) => void;
}

const STRATEGY_PRESETS = [
  { id: "long-call", name: "Long Call", category: "Single Leg", outlook: "BULLISH" },
  { id: "long-put", name: "Long Put", category: "Single Leg", outlook: "BEARISH" },
  { id: "short-call", name: "Short Call", category: "Single Leg", outlook: "BEARISH" },
  { id: "short-put", name: "Short Put", category: "Single Leg", outlook: "BULLISH" },
  { id: "cash-secured-put", name: "Cash-Secured Put", category: "Single Leg", outlook: "BULLISH" },
  { id: "bull-call-spread", name: "Bull Call Spread", category: "Vertical Spreads", outlook: "BULLISH" },
  { id: "bear-put-spread", name: "Bear Put Spread", category: "Vertical Spreads", outlook: "BEARISH" },
  { id: "bull-put-spread", name: "Bull Put Spread", category: "Vertical Spreads", outlook: "BULLISH" },
  { id: "bear-call-spread", name: "Bear Call Spread", category: "Vertical Spreads", outlook: "BEARISH" },
  { id: "short-iron-condor", name: "Short Iron Condor", category: "Iron Condors & Butterflies", outlook: "NEUTRAL" },
  { id: "ratio-front-spread", name: "Ratio Front Spread", category: "Ratio Spreads", outlook: "NEUTRAL" },
  { id: "call-backspread", name: "Call Backspread", category: "Ratio Spreads", outlook: "VOLATILE" },
  { id: "long-straddle", name: "Long Straddle", category: "Volatility", outlook: "VOLATILE" },
  { id: "long-strangle", name: "Long Strangle", category: "Volatility", outlook: "VOLATILE" },
  { id: "short-straddle", name: "Short Straddle", category: "Volatility", outlook: "NEUTRAL" },
  { id: "short-strangle", name: "Short Strangle", category: "Volatility", outlook: "NEUTRAL" },
  { id: "long-butterfly", name: "Long Butterfly", category: "Iron Condors & Butterflies", outlook: "NEUTRAL" },
  { id: "long-condor", name: "Long Condor", category: "Iron Condors & Butterflies", outlook: "NEUTRAL" },
  { id: "long-calendar-spread", name: "Long Calendar Spread", category: "Time Spreads", outlook: "NEUTRAL" },
  { id: "diagonal-spread", name: "Diagonal Spread", category: "Time Spreads", outlook: "BULLISH" },
  { id: "covered-call", name: "Covered Call", category: "Underlying Combinations", outlook: "BULLISH" },
  { id: "long-combination", name: "Long Combination", category: "Underlying Combinations", outlook: "BULLISH" },
  { id: "collar", name: "Collar", category: "Underlying Combinations", outlook: "BULLISH" },
  { id: "covered-combination", name: "Covered Combination", category: "Underlying Combinations", outlook: "NEUTRAL" },
];

export function StrategyBuilderTab({
  underlying = "NIFTY",
  spotPrice = 24800,
  currencySymbol = "₹",
  onExecutePaperTrade,
  onRunValidation,
}: StrategyBuilderTabProps) {
  const router = useRouter();
  const [selectedStrategyId, setSelectedStrategyId] = useState("bull-call-spread");
  const [lots, setLots] = useState(1);
  const [legs, setLegs] = useState<OptionLeg[]>([]);
  const [evaluation, setEvaluation] = useState<StrategyEvaluationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [liveChain, setLiveChain] = useState<any>(null);
  const [isChainLoading, setIsChainLoading] = useState(false);
  const [selectedExpiryOverride, setSelectedExpiryOverride] = useState<string | null>(null);

  // Fetch Live Option Chain from Market Data Gateway / Upstox / Delta
  const fetchLiveOptionChain = React.useCallback(async () => {
    setIsChainLoading(true);
    try {
      const cleanUnderlying = underlying.split(" ")[0].replace(/-OPTIONS$/, "").toUpperCase();
      const res = await fetch(`/api/options/chain?underlying=${encodeURIComponent(cleanUnderlying)}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setLiveChain(data);
      }
    } catch (err) {
      console.warn("[StrategyBuilder] Live option chain fetch error:", err);
    } finally {
      setIsChainLoading(false);
    }
  }, [underlying]);

  useEffect(() => {
    fetchLiveOptionChain();
    const interval = setInterval(fetchLiveOptionChain, 10000);
    return () => clearInterval(interval);
  }, [fetchLiveOptionChain]);

  const liveSpotPrice = liveChain?.spot_price && liveChain.spot_price > 0 
    ? liveChain.spot_price 
    : (liveChain?.underlying_price || spotPrice || 24800);
    
  const availableExpiries: string[] = Array.isArray(liveChain?.expiries) && liveChain.expiries.length > 0
    ? liveChain.expiries
    : [liveChain?.expiry || "28-SEP-2026"];

  const activeExpiry = selectedExpiryOverride || liveChain?.expiry || availableExpiries[0] || "28-SEP-2026";
  const selectedPreset = STRATEGY_PRESETS.find((s) => s.id === selectedStrategyId);

  const handleCreateBot = () => {
    const primaryLeg = legs[0];
    const intent = {
      symbol: `${underlying} ${selectedPreset?.name || "Strategy"}`,
      underlying,
      market: "OPTIONS",
      marketDataSource: "UPSTOX",
      broker: "PAPER",
      strike: primaryLeg?.strike || liveSpotPrice,
      expiry: primaryLeg?.expiry || activeExpiry,
      optionType: primaryLeg?.option_type === "CALL" ? "CE" : primaryLeg?.option_type === "PUT" ? "PE" : "EQ",
      side: (primaryLeg?.action || "BUY") as "BUY" | "SELL",
      lotSize: 50,
      currentPrice: evaluation?.net_premium || liveSpotPrice * 0.02,
      origin: "OPTIONS_STRATEGY_BUILDER",
      strategyId: selectedStrategyId,
      strategyName: selectedPreset?.name || "Option Strategy",
      legs: legs.map((l) => ({
        side: l.action,
        optionType: l.option_type === "CALL" ? "CE" : l.option_type === "PUT" ? "PE" : "EQ",
        strike: l.strike,
        expiry: l.expiry,
        quantity: l.quantity,
        premium: l.premium,
        delta: l.delta,
      })),
    };

    dispatchBotCreation(router, intent as any);
  };

  const handlePaperTrade = () => {
    if (onExecutePaperTrade) {
      onExecutePaperTrade({
        strategy_id: selectedStrategyId,
        strategy_name: selectedPreset?.name || "Option Strategy",
        underlying,
        spotPrice: liveSpotPrice,
        legs,
        lots,
        evaluation,
      });
    }
    setActionSuccess(`Paper Strategy '${selectedPreset?.name}' deployed successfully!`);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  // Helper to find closest strike and quote from live option chain
  const getStrikeQuote = React.useCallback((targetStrike: number) => {
    const strikesList: any[] = liveChain?.strikes || [];
    if (!strikesList || strikesList.length === 0) return null;
    let closest = strikesList[0];
    let minDiff = Math.abs((closest.strike_price || closest.strike || 0) - targetStrike);
    for (const s of strikesList) {
      const sp = s.strike_price || s.strike || 0;
      const diff = Math.abs(sp - targetStrike);
      if (diff < minDiff) {
        minDiff = diff;
        closest = s;
      }
    }
    return closest;
  }, [liveChain]);

  // Load preset on strategy selection or live spot price / expiry update
  useEffect(() => {
    const step = liveSpotPrice > 10000 ? 50 : liveSpotPrice > 1000 ? 10 : 2.5;
    const atm = Math.round(liveSpotPrice / step) * step;

    const atmQuote = getStrikeQuote(atm);
    const otm1CallQuote = getStrikeQuote(atm + step * 2);
    const otm1PutQuote = getStrikeQuote(atm - step * 2);
    const otmWingPutQuote = getStrikeQuote(atm - step * 3);
    const otmWingCallQuote = getStrikeQuote(atm + step * 3);

    const getCallPremium = (quote: any, fallbackPct: number) => {
      const ltp = quote?.call?.ltp || quote?.call?.ask || quote?.call?.price;
      return ltp && ltp > 0 ? ltp : Math.round(liveSpotPrice * fallbackPct * 100) / 100;
    };

    const getPutPremium = (quote: any, fallbackPct: number) => {
      const ltp = quote?.put?.ltp || quote?.put?.ask || quote?.put?.price;
      return ltp && ltp > 0 ? ltp : Math.round(liveSpotPrice * fallbackPct * 100) / 100;
    };

    const getCallGreeks = (quote: any, fallbackDelta: number) => ({
      delta: quote?.call?.delta ?? fallbackDelta,
      gamma: quote?.call?.gamma ?? 0.001,
      theta: quote?.call?.theta ?? -10.0,
      vega: quote?.call?.vega ?? 20.0,
    });

    const getPutGreeks = (quote: any, fallbackDelta: number) => ({
      delta: quote?.put?.delta ?? fallbackDelta,
      gamma: quote?.put?.gamma ?? 0.001,
      theta: quote?.put?.theta ?? -10.0,
      vega: quote?.put?.vega ?? 20.0,
    });

    if (selectedStrategyId === "bull-call-spread") {
      setLegs([
        { action: "BUY", option_type: "CALL", strike: atm, expiry: activeExpiry, premium: getCallPremium(atmQuote, 0.022), quantity: 1, ...getCallGreeks(atmQuote, 0.52) },
        { action: "SELL", option_type: "CALL", strike: atm + step * 2, expiry: activeExpiry, premium: getCallPremium(otm1CallQuote, 0.010), quantity: 1, ...getCallGreeks(otm1CallQuote, -0.28) },
      ]);
    } else if (selectedStrategyId === "bear-put-spread") {
      setLegs([
        { action: "BUY", option_type: "PUT", strike: atm, expiry: activeExpiry, premium: getPutPremium(atmQuote, 0.022), quantity: 1, ...getPutGreeks(atmQuote, -0.50) },
        { action: "SELL", option_type: "PUT", strike: atm - step * 2, expiry: activeExpiry, premium: getPutPremium(otm1PutQuote, 0.010), quantity: 1, ...getPutGreeks(otm1PutQuote, 0.25) },
      ]);
    } else if (selectedStrategyId === "short-iron-condor") {
      setLegs([
        { action: "BUY", option_type: "PUT", strike: atm - step * 3, expiry: activeExpiry, premium: getPutPremium(otmWingPutQuote, 0.005), quantity: 1, ...getPutGreeks(otmWingPutQuote, -0.12) },
        { action: "SELL", option_type: "PUT", strike: atm - step, expiry: activeExpiry, premium: getPutPremium(otm1PutQuote, 0.016), quantity: 1, ...getPutGreeks(otm1PutQuote, 0.30) },
        { action: "SELL", option_type: "CALL", strike: atm + step, expiry: activeExpiry, premium: getCallPremium(otm1CallQuote, 0.016), quantity: 1, ...getCallGreeks(otm1CallQuote, -0.30) },
        { action: "BUY", option_type: "CALL", strike: atm + step * 3, expiry: activeExpiry, premium: getCallPremium(otmWingCallQuote, 0.005), quantity: 1, ...getCallGreeks(otmWingCallQuote, 0.12) },
      ]);
    } else if (selectedStrategyId === "long-straddle") {
      setLegs([
        { action: "BUY", option_type: "CALL", strike: atm, expiry: activeExpiry, premium: getCallPremium(atmQuote, 0.025), quantity: 1, ...getCallGreeks(atmQuote, 0.50) },
        { action: "BUY", option_type: "PUT", strike: atm, expiry: activeExpiry, premium: getPutPremium(atmQuote, 0.025), quantity: 1, ...getPutGreeks(atmQuote, -0.50) },
      ]);
    } else if (selectedStrategyId === "long-strangle") {
      setLegs([
        { action: "BUY", option_type: "CALL", strike: atm + step * 2, expiry: activeExpiry, premium: getCallPremium(otm1CallQuote, 0.012), quantity: 1, ...getCallGreeks(otm1CallQuote, 0.30) },
        { action: "BUY", option_type: "PUT", strike: atm - step * 2, expiry: activeExpiry, premium: getPutPremium(otm1PutQuote, 0.012), quantity: 1, ...getPutGreeks(otm1PutQuote, -0.30) },
      ]);
    } else if (selectedStrategyId === "covered-call") {
      setLegs([
        { action: "BUY", option_type: "STOCK", strike: liveSpotPrice, expiry: "SPOT", premium: liveSpotPrice, quantity: 1, delta: 1.0 },
        { action: "SELL", option_type: "CALL", strike: atm + step, expiry: activeExpiry, premium: getCallPremium(otm1CallQuote, 0.018), quantity: 1, ...getCallGreeks(otm1CallQuote, -0.35) },
      ]);
    } else if (selectedStrategyId === "long-put") {
      setLegs([
        { action: "BUY", option_type: "PUT", strike: atm, expiry: activeExpiry, premium: getPutPremium(atmQuote, 0.025), quantity: 1, ...getPutGreeks(atmQuote, -0.50) },
      ]);
    } else {
      // Default single leg Long Call
      setLegs([
        { action: "BUY", option_type: "CALL", strike: atm, expiry: activeExpiry, premium: getCallPremium(atmQuote, 0.025), quantity: 1, ...getCallGreeks(atmQuote, 0.50) },
      ]);
    }
  }, [selectedStrategyId, liveSpotPrice, activeExpiry, getStrikeQuote]);

  const evaluateCurrentStrategy = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/options/strategy/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategy_name: selectedStrategyId,
          underlying,
          spot_price: liveSpotPrice,
          legs,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setEvaluation(data);
      }
    } catch (err) {
      console.error("Evaluation error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [legs, selectedStrategyId, liveSpotPrice, underlying]);

  // Evaluate strategy payoff curve whenever legs change
  useEffect(() => {
    if (legs.length === 0) return;
    evaluateCurrentStrategy();
  }, [evaluateCurrentStrategy, legs.length]);

  const handleAddLeg = () => {
    const step = liveSpotPrice > 10000 ? 50 : 10;
    const atm = Math.round(liveSpotPrice / step) * step;
    const atmQuote = getStrikeQuote(atm);
    const prem = atmQuote?.call?.ltp || Math.round(liveSpotPrice * 0.02 * 100) / 100;
    setLegs([
      ...legs,
      {
        action: "BUY",
        option_type: "CALL",
        strike: atm,
        expiry: activeExpiry,
        premium: prem,
        quantity: 1,
        delta: atmQuote?.call?.delta ?? 0.5,
      },
    ]);
  };

  const handleRemoveLeg = (idx: number) => {
    setLegs(legs.filter((_, i) => i !== idx));
  };

  const handleUpdateLeg = (idx: number, field: keyof OptionLeg, val: any) => {
    const updated = [...legs];
    updated[idx] = { ...updated[idx], [field]: val };
    setLegs(updated);
  };

  return (
    <div className="space-y-4">
      {/* Live Market Bar & Expiry Ribbon */}
      <div className="bg-[#080E1E] border border-cyan-500/30 rounded-2xl p-3 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-mono">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-white font-extrabold text-sm">{underlying}</span>
          <span className="text-cyan-400 font-black text-sm tabular-nums">
            {currencySymbol}{Number(liveSpotPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold uppercase">
            {liveChain?.source || "LIVE FEED"}
          </span>
        </div>

        {/* Live Expiry Selector */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-slate-400 font-bold">Expiry:</span>
          <select
            value={activeExpiry}
            onChange={(e) => setSelectedExpiryOverride(e.target.value)}
            aria-label="Select Option Expiry"
            className="bg-slate-900 border border-slate-700 text-cyan-300 font-bold px-2.5 py-1 rounded-lg text-xs focus:outline-none focus:border-cyan-400"
          >
            {availableExpiries.map((exp) => (
              <option key={exp} value={exp}>
                {exp}
              </option>
            ))}
          </select>
          <button
            onClick={fetchLiveOptionChain}
            disabled={isChainLoading}
            title="Refresh Live Market Data"
            aria-label="Refresh Live Option Chain"
            className="p-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white transition"
          >
            <Activity className={`w-3.5 h-3.5 ${isChainLoading ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>
      {/* Strategy Preset Selector Ribbon */}
      <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-3 shadow-xl">
        <div className="flex items-center justify-between gap-2 mb-2 font-mono text-xs">
          <span className="text-slate-400 font-bold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            24 Visual Guide Strategy Templates:
          </span>
          <span className="text-cyan-400 font-extrabold text-[11px]">
            {STRATEGY_PRESETS.find((s) => s.id === selectedStrategyId)?.category || "All"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 max-h-28 overflow-y-auto pr-1">
          {STRATEGY_PRESETS.map((strat) => (
            <button
              key={strat.id}
              onClick={() => setSelectedStrategyId(strat.id)}
              className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold transition flex items-center gap-1 ${
                selectedStrategyId === strat.id
                  ? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
                  : "bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <span>{strat.name}</span>
              <span
                className={`text-[9px] px-1 py-0.2 rounded font-black ${
                  strat.outlook === "BULLISH"
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                    : strat.outlook === "BEARISH"
                    ? "bg-rose-950 text-rose-400 border border-rose-500/30"
                    : strat.outlook === "VOLATILE"
                    ? "bg-purple-950 text-purple-400 border border-purple-500/30"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {strat.outlook[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid: Legs Editor on Left, Payoff on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 5 Cols: Multi-Leg Editor */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <h3 className="font-mono text-xs font-bold text-slate-200 uppercase">
                  Configured Legs ({legs.length}/6)
                </h3>
              </div>
              <button
                onClick={handleAddLeg}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-900/40 text-xs font-mono font-bold transition"
              >
                <Plus className="w-3 h-3" />
                <span>Add Leg</span>
              </button>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {legs.map((leg, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 font-mono text-xs space-y-2 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <select
                        value={leg.action}
                        onChange={(e) => handleUpdateLeg(idx, "action", e.target.value)}
                        className={`px-2 py-0.5 rounded font-black text-xs border ${
                          leg.action === "BUY"
                            ? "bg-emerald-950 text-emerald-400 border-emerald-600"
                            : "bg-rose-950 text-rose-400 border-rose-600"
                        }`}
                      >
                        <option value="BUY">BUY</option>
                        <option value="SELL">SELL</option>
                      </select>

                      <select
                        value={leg.option_type}
                        onChange={(e) => handleUpdateLeg(idx, "option_type", e.target.value)}
                        className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-200 font-bold"
                      >
                        <option value="CALL">CE (Call)</option>
                        <option value="PUT">PE (Put)</option>
                        <option value="STOCK">Underlying</option>
                      </select>
                    </div>

                    <button
                      onClick={() => handleRemoveLeg(idx)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition"
                      title="Remove Leg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400">Strike</label>
                      <input
                        type="number"
                        value={leg.strike}
                        onChange={(e) => handleUpdateLeg(idx, "strike", parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-white font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Premium</label>
                      <input
                        type="number"
                        step="0.1"
                        value={leg.premium}
                        onChange={(e) => handleUpdateLeg(idx, "premium", parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-cyan-300 font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Qty (Ratio)</label>
                      <input
                        type="number"
                        min="1"
                        value={leg.quantity}
                        onChange={(e) => handleUpdateLeg(idx, "quantity", parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-white font-bold text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Strategy Summary Pills */}
            {evaluation && (
              <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 font-mono text-xs">
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Net Cost/Credit</div>
                  <div
                    className={`font-black text-sm ${
                      evaluation.nature === "NET DEBIT" ? "text-amber-400" : "text-emerald-400"
                    }`}
                  >
                    {evaluation.nature}: {formatMoney(evaluation.net_premium, currencySymbol)}
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Req. Margin</div>
                  <div className="font-black text-sm text-cyan-400">
                    {formatMoney(evaluation.required_margin, currencySymbol)}
                  </div>
                </div>
              </div>
            )}

            {/* Action Feedback Banner */}
            {actionSuccess && (
              <div className="mt-3 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-mono text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}

            {/* Execution & Algorithmic Bot Creation Action Bar */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col gap-2">
              <button
                type="button"
                onClick={handlePaperTrade}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>EXECUTE PAPER STRATEGY</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCreateBot}
                  className="flex-1 py-2 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-mono font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-[0.98]"
                  title="Create Algorithmic Bot from this Option Contract"
                >
                  <Bot className="w-3.5 h-3.5 text-cyan-400" />
                  <span>CREATE BOT</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const step = spotPrice > 10000 ? 50 : spotPrice > 1000 ? 10 : 2.5;
                    const atm = Math.round(spotPrice / step) * step;
                    setLegs([
                      { action: "BUY", option_type: "CALL", strike: atm, expiry: "28-SEP-2026", premium: spotPrice * 0.025, quantity: 1, delta: 0.52 },
                    ]);
                  }}
                  className="flex-1 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 text-xs font-mono font-bold transition-colors cursor-pointer text-center"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>

          {/* Aggregate Greeks Card */}
          {evaluation?.aggregate_greeks && (
            <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-3 shadow-xl font-mono text-xs">
              <div className="flex items-center gap-1.5 mb-2 text-slate-400 font-bold text-[11px]">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                Aggregate Strategy Greeks:
              </div>
              <div className="grid grid-cols-5 gap-1.5 text-center">
                <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">&Delta; Delta</div>
                  <div className="font-bold text-white text-xs">{evaluation.aggregate_greeks.delta.toFixed(2)}</div>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">&Gamma; Gamma</div>
                  <div className="font-bold text-white text-xs">{evaluation.aggregate_greeks.gamma.toFixed(4)}</div>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">&Theta; Theta</div>
                  <div className="font-bold text-rose-400 text-xs">{evaluation.aggregate_greeks.theta.toFixed(1)}</div>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">&Nu; Vega</div>
                  <div className="font-bold text-indigo-400 text-xs">{evaluation.aggregate_greeks.vega.toFixed(1)}</div>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">&Rho; Rho</div>
                  <div className="font-bold text-slate-300 text-xs">{evaluation.aggregate_greeks.rho.toFixed(2)}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 7 Cols: Interactive Payoff Chart & Scenario Table */}
        <div className="lg:col-span-7 space-y-4">
          {evaluation && (
            <StrategyPayoffChart
              payoffCurve={evaluation.payoff_curve}
              spotPrice={spotPrice}
              breakevens={evaluation.breakevens}
              maxProfit={evaluation.max_profit}
              maxLoss={evaluation.max_loss}
              currencySymbol={currencySymbol}
              underlyingName={underlying}
            />
          )}

          {evaluation && (
            <ScenarioAnalysisTable evaluation={evaluation} currencySymbol={currencySymbol} />
          )}
        </div>
      </div>
    </div>
  );
}
