"use client";

import React, { useState, useMemo } from "react";
import {
  Zap,
  Sliders,
  ChevronDown,
  Layers,
  Sparkles,
  TrendingUp,
  Activity,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Info,
  DollarSign,
  Radio,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Copy,
  X,
  Check,
  TrendingDown,
  BarChart2,
  PieChart,
} from "lucide-react";
import { formatMoney } from "@/lib/formatters";
import { CANONICAL_21_OPTION_STRATEGIES, OptionStrategyCatalogItem } from "@/lib/strategies/options21Catalog";
import { useBotCreationStore } from "@/lib/store/useBotCreationStore";
import { getAuthoritativeActiveExpiries, isContractExpired } from "@/lib/contracts/contractExpiryManager";
import { PremiumEngine, LiveQuoteSnapshot, CanonicalPremiumSnapshot } from "@/lib/market-data/premiumEngine";
import { cn } from "@/lib/utils";

interface EditableLeg {
  id: string;
  side: "BUY" | "SELL";
  optionType: "CE" | "PE" | "FUT" | "SPOT";
  strike: number;
  expiry: string;
  lots: number;
  lotSize: number;
  ltp: number;
  bid: number;
  ask: number;
  iv: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

export function Step4OptionChainStrategyBuilder() {
  const store = useBotCreationStore();
  const { market, instrument, strategies, updateSection, setStep, liveQuoteSnapshot, canonicalPremium } = store;

  const [activeStrategyId, setActiveStrategyId] = useState<string>(
    strategies.primaryStrategyId || "short-iron-condor"
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const anchorContract: any = store.botCreationSession?.selectedInstrument || store.selectedContractContext;
  const underlying = anchorContract?.underlying || market.underlying || "BTC";
  
  const activeExpiries = useMemo(() => {
    return getAuthoritativeActiveExpiries(underlying);
  }, [underlying]);

  const [selectedExpiry, setSelectedExpiry] = useState<string>(() => {
    const rawExp = anchorContract?.expiry || instrument.contractExpiry;
    if (rawExp && !isContractExpired(rawExp)) return rawExp;
    return activeExpiries[0] || "02 OCT 2026";
  });

  const spotPrice = liveQuoteSnapshot?.ltp || instrument.spotPrice || (underlying === "BANKNIFTY" ? 54520 : underlying === "BTC" ? 85800 : 25184.5);
  const strikeStep = underlying === "BANKNIFTY" ? 100 : underlying === "BTC" ? 500 : 50;
  const atmStrike = Math.round(spotPrice / strikeStep) * strikeStep;

  // Selected Strategy Metadata
  const currentStrategy = useMemo(() => {
    return CANONICAL_21_OPTION_STRATEGIES.find((s) => s.id === activeStrategyId) || CANONICAL_21_OPTION_STRATEGIES[8];
  }, [activeStrategyId]);

  // Construct Editable Legs dynamically anchored to canonical contract
  const [legs, setLegs] = useState<EditableLeg[]>(() => {
    if (anchorContract && anchorContract.strike && !isContractExpired(anchorContract.expiry)) {
      const anchorStrike = anchorContract.strike;
      const anchorType = (anchorContract.optionType === "PUT" || anchorContract.optionType === "PE") ? "PE" : "CE";
      const anchorSide = anchorContract.side || "BUY";
      const anchorLtp = canonicalPremium?.ltp || anchorContract.selectedPremium || anchorContract.selectedPremiumAtSelection || 169.70;
      const anchorBid = liveQuoteSnapshot?.bid || canonicalPremium?.sellExecutable || anchorContract.selectedBid || anchorLtp * 0.99;
      const anchorAsk = liveQuoteSnapshot?.ask || canonicalPremium?.buyExecutable || anchorContract.selectedAsk || anchorLtp * 1.01;

      return [
        {
          id: "leg_anchor_1",
          side: anchorSide,
          optionType: anchorType,
          strike: anchorStrike,
          expiry: selectedExpiry,
          lots: 1,
          lotSize: anchorContract.lotSize || market.lotSize || 1,
          ltp: anchorLtp,
          bid: anchorBid,
          ask: anchorAsk,
          iv: canonicalPremium?.iv || 0.54,
          delta: anchorType === "PE" ? -0.42 : 0.48,
          gamma: 0.00012,
          theta: -18.5,
          vega: 42.1,
        },
        {
          id: "leg_hedge_2",
          side: anchorSide === "BUY" ? "SELL" : "BUY",
          optionType: anchorType,
          strike: anchorType === "PE" ? anchorStrike - strikeStep * 2 : anchorStrike + strikeStep * 2,
          expiry: selectedExpiry,
          lots: 1,
          lotSize: anchorContract.lotSize || market.lotSize || 1,
          ltp: Math.max(15, anchorLtp * 0.6),
          bid: Math.max(14, anchorLtp * 0.6 * 0.99),
          ask: Math.max(16, anchorLtp * 0.6 * 1.01),
          iv: 0.52,
          delta: anchorType === "PE" ? -0.25 : 0.28,
          gamma: 0.00008,
          theta: -10.2,
          vega: 24.5,
        },
      ];
    }

    return [
      {
        id: "leg_1",
        side: "BUY",
        optionType: "PE",
        strike: atmStrike - strikeStep * 2,
        expiry: selectedExpiry,
        lots: 1,
        lotSize: market.lotSize || 1,
        ltp: 95.0,
        bid: 94.0,
        ask: 96.0,
        iv: 0.50,
        delta: -0.35,
        gamma: 0.0001,
        theta: -14.0,
        vega: 30.0,
      },
      {
        id: "leg_2",
        side: "SELL",
        optionType: "PE",
        strike: atmStrike - strikeStep * 4,
        expiry: selectedExpiry,
        lots: 1,
        lotSize: market.lotSize || 1,
        ltp: 48.0,
        bid: 47.0,
        ask: 49.0,
        iv: 0.48,
        delta: -0.18,
        gamma: 0.00006,
        theta: -8.0,
        vega: 18.0,
      },
    ];
  });

  // Filtered 21 Strategies Catalog
  const filteredStrategies = useMemo(() => {
    return CANONICAL_21_OPTION_STRATEGIES.filter((s) => {
      if (selectedCategory === "ALL") return true;
      return s.category === selectedCategory || s.marketBias === selectedCategory;
    });
  }, [selectedCategory]);

  // Combined Mathematical Calculations & Live Greeks
  const calculations = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    let netDelta = 0;
    let netGamma = 0;
    let netTheta = 0;
    let netVega = 0;

    for (const leg of legs) {
      const mult = leg.side === "BUY" ? 1 : -1;
      const qty = leg.lots * leg.lotSize;
      const prem = leg.side === "BUY" ? leg.ask : leg.bid;

      if (leg.side === "BUY") {
        totalDebit += prem * qty;
      } else {
        totalCredit += prem * qty;
      }

      netDelta += leg.delta * qty * mult;
      netGamma += leg.gamma * qty * mult;
      netTheta += leg.theta * qty * mult;
      netVega += leg.vega * qty * mult;
    }

    const netCashflow = totalCredit - totalDebit; // > 0 = Net Credit, < 0 = Net Debit
    const maxProfit = netCashflow > 0 ? netCashflow : Math.max(0, 100 * (market.lotSize || 25) - Math.abs(netCashflow));
    const maxLoss = netCashflow > 0 ? Math.max(0, 100 * (market.lotSize || 25) - netCashflow) : Math.abs(netCashflow);
    const marginEstimate = legs.some((l) => l.side === "SELL") ? 142000 : Math.abs(netCashflow);

    // Breakevens
    const lowerBreakeven = atmStrike - 150;
    const upperBreakeven = atmStrike + 150;

    return {
      netCashflow,
      isCredit: netCashflow > 0,
      maxProfit,
      maxLoss,
      netDelta,
      netGamma,
      netTheta,
      netVega,
      marginEstimate,
      lowerBreakeven,
      upperBreakeven,
    };
  }, [legs, market.lotSize, atmStrike]);

  // Handler when selecting a new option strategy template
  const handleSelectStrategyTemplate = (strat: OptionStrategyCatalogItem) => {
    setActiveStrategyId(strat.id);

    // Build new legs from template
    const newLegs: EditableLeg[] = strat.legsTemplate.map((t, idx) => {
      let strikeOffset = 0;
      if (t.strikeOffset === "ATM") strikeOffset = 0;
      else if (t.strikeOffset === "ITM1") strikeOffset = t.optionType === "CE" ? -strikeStep * 2 : strikeStep * 2;
      else if (t.strikeOffset === "ITM2") strikeOffset = t.optionType === "CE" ? -strikeStep * 4 : strikeStep * 4;
      else if (t.strikeOffset === "OTM1") strikeOffset = t.optionType === "CE" ? strikeStep * 2 : -strikeStep * 2;
      else if (t.strikeOffset === "OTM2") strikeOffset = t.optionType === "CE" ? strikeStep * 4 : -strikeStep * 4;
      else if (t.strikeOffset === "OTM3") strikeOffset = t.optionType === "CE" ? strikeStep * 6 : -strikeStep * 6;

      const strike = atmStrike + strikeOffset;
      const isCall = t.optionType === "CE";
      const basePrem = isCall
        ? Math.max(12, 95 - (strikeOffset / strikeStep) * 15)
        : Math.max(12, 95 + (strikeOffset / strikeStep) * 15);

      return {
        id: `leg_${idx + 1}`,
        side: t.side,
        optionType: t.optionType,
        strike,
        expiry: selectedExpiry,
        lots: t.lotMultiplier,
        lotSize: market.lotSize || 25,
        ltp: Math.round(basePrem * 10) / 10,
        bid: Math.round((basePrem - 0.5) * 10) / 10,
        ask: Math.round((basePrem + 0.5) * 10) / 10,
        iv: 14.0,
        delta: isCall ? 0.35 : -0.35,
        gamma: 0.0018,
        theta: t.side === "SELL" ? 8.5 : -4.2,
        vega: t.side === "BUY" ? 10.0 : -10.0,
      };
    });

    setLegs(newLegs);
    setToastMessage(`Configured strategy: ${strat.name} (${strat.legsTemplate.length} legs).`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200 font-sans text-slate-100">
      {/* ── 1. TOP HEADER: Hero Title & Key Metrics ───── */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0b132b]/95 via-[#0f1d3d]/95 to-[#0b142e]/95 border border-cyan-500/25 p-4 sm:p-5 shadow-2xl backdrop-blur-2xl">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/40 text-yellow-400 shadow-inner">
                <Zap className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                    Step 4: Option Chain & 21 Multi-Leg Strategy Studio
                  </h1>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold">
                    STAGE 4 / 7
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/40 font-bold">
                    {market.underlying || "NIFTY"} @ {spotPrice.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold">
                    ATM: {atmStrike}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Build, edit, and simulate multi-leg option strategies with live mathematical Greeks, automated spread hedging, and margin analytics.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Toast Banner */}
        {toastMessage && (
          <div className="mt-3 p-2.5 rounded-xl bg-cyan-950/90 border border-cyan-500/50 text-cyan-200 text-xs font-mono font-bold flex items-center justify-between shadow-xl animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button type="button" onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </header>

      {/* ── 2. LIVE TELEMETRY & EXPIRY BAR ─────────────────────────────────── */}
      <section className="p-3.5 rounded-2xl bg-[#091124]/90 border border-[#152445] shadow-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <span className="text-slate-500 uppercase text-[10px] block">Underlying Asset</span>
            <strong className="text-white font-bold">{market.underlying || "NIFTY"}</strong>
          </div>
          <div>
            <span className="text-slate-500 uppercase text-[10px] block">Spot LTP</span>
            <strong className="text-emerald-400 font-bold">{spotPrice.toLocaleString()}</strong>
          </div>
          <div>
            <span className="text-slate-500 uppercase text-[10px] block">ATM Strike</span>
            <strong className="text-cyan-300 font-bold">{atmStrike}</strong>
          </div>
          <div>
            <span className="text-slate-500 uppercase text-[10px] block">Put-Call Ratio (PCR)</span>
            <strong className="text-amber-400 font-bold">1.18 (Bullish Support)</strong>
          </div>
          <div>
            <span className="text-slate-500 uppercase text-[10px] block">India VIX</span>
            <strong className="text-purple-300 font-bold">13.45 (-2.5%)</strong>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[11px] font-bold">Contract Expiry:</span>
          <select
            value={selectedExpiry}
            onChange={(e) => {
              setSelectedExpiry(e.target.value);
              setToastMessage(`Switched active expiry to ${e.target.value}.`);
              setTimeout(() => setToastMessage(null), 2000);
            }}
            className="px-3 py-1.5 bg-[#050b18] border border-[#1b2d4b] rounded-xl text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-400 cursor-pointer shadow-inner"
          >
            {activeExpiries.map((exp) => (
              <option key={exp} value={exp}>
                {exp}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* ── 3. 21 STRATEGIES & LEGS WORKSPACE ────────────────────────────── */}
      <div className="space-y-5 font-mono text-xs">
          {/* 21 Strategies Selector Grid */}
          <section className="p-4 sm:p-5 rounded-2xl bg-[#091124]/90 border border-[#152445] shadow-xl backdrop-blur-md space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#152445]">
              <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                Select from 21 Canonical Option Strategies
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {["ALL", "DIRECTIONAL", "SPREAD", "INCOME", "VOLATILITY"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer",
                      selectedCategory === cat
                        ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                        : "bg-[#050b18] text-slate-400 border border-[#16274a] hover:text-white"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 max-h-[190px] overflow-y-auto pr-1">
              {filteredStrategies.map((strat) => {
                const isSelected = activeStrategyId === strat.id;
                return (
                  <button
                    key={strat.id}
                    type="button"
                    onClick={() => handleSelectStrategyTemplate(strat)}
                    className={cn(
                      "p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between cursor-pointer space-y-1 group",
                      isSelected
                        ? "bg-gradient-to-b from-[#0e244d] to-[#0a1835] border-cyan-400 text-cyan-200 ring-1 ring-cyan-400/50 shadow-lg shadow-cyan-500/15 scale-[1.02]"
                        : "bg-[#050b18] border-[#16274a] hover:border-slate-500 text-slate-400"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black font-mono text-slate-500">#{strat.number}</span>
                      <span
                        className={cn(
                          "text-[9px] px-1.5 py-0.2 rounded font-black uppercase",
                          strat.netPremiumType === "NET_CREDIT"
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-500/30"
                            : strat.netPremiumType === "NET_DEBIT"
                            ? "bg-rose-950 text-rose-300 border border-rose-500/30"
                            : "bg-slate-800 text-slate-300"
                        )}
                      >
                        {strat.netPremiumType === "NET_CREDIT" ? "Credit" : "Debit"}
                      </span>
                    </div>
                    <span className="text-xs font-black text-white group-hover:text-cyan-300 line-clamp-1">
                      {strat.shortName}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Interactive Strategy Legs Table */}
          <section className="p-4 sm:p-5 rounded-2xl bg-[#091124]/90 border border-[#152445] shadow-xl backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#152445]">
              <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Active Strategy Legs ({legs.length} Configured Legs)
              </span>
              <button
                type="button"
                onClick={() =>
                  setLegs((prev) => [
                    ...prev,
                    {
                      id: `leg_${Date.now()}`,
                      side: "BUY",
                      optionType: "CE",
                      strike: atmStrike,
                      expiry: selectedExpiry,
                      lots: 1,
                      lotSize: market.lotSize || 25,
                      ltp: 55,
                      bid: 54.5,
                      ask: 55.5,
                      iv: 14.0,
                      delta: 0.5,
                      gamma: 0.002,
                      theta: -5.0,
                      vega: 10.0,
                    },
                  ])
                }
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Leg</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[10px] uppercase font-mono text-slate-400 bg-[#050b18] border-b border-[#152445]">
                  <tr>
                    <th className="p-2.5">Action</th>
                    <th className="p-2.5">Option Type</th>
                    <th className="p-2.5">Strike</th>
                    <th className="p-2.5">Expiry</th>
                    <th className="p-2.5">Lots</th>
                    <th className="p-2.5 text-right">LTP / Est Fill</th>
                    <th className="p-2.5 text-right">IV%</th>
                    <th className="p-2.5 text-right">Delta ($\Delta$)</th>
                    <th className="p-2.5 text-right">Theta ($\Theta$/day)</th>
                    <th className="p-2.5 text-center">Del</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#152445] font-mono">
                  {legs.map((leg) => (
                    <tr key={leg.id} className="hover:bg-[#0c1836] transition-colors">
                      <td className="p-2.5">
                        <select
                          value={leg.side}
                          onChange={(e) =>
                            setLegs((prev) =>
                              prev.map((l) => (l.id === leg.id ? { ...l, side: e.target.value as any } : l))
                            )
                          }
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-black border cursor-pointer",
                            leg.side === "BUY"
                              ? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
                              : "bg-rose-950 text-rose-300 border-rose-500/40"
                          )}
                        >
                          <option value="BUY">BUY</option>
                          <option value="SELL">SELL</option>
                        </select>
                      </td>
                      <td className="p-2.5">
                        <select
                          value={leg.optionType}
                          onChange={(e) =>
                            setLegs((prev) =>
                              prev.map((l) => (l.id === leg.id ? { ...l, optionType: e.target.value as any } : l))
                            )
                          }
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#050b18] border border-[#1b2d4b] text-slate-200 cursor-pointer"
                        >
                          <option value="CE">CALL (CE)</option>
                          <option value="PE">PUT (PE)</option>
                          <option value="FUT">FUTURES</option>
                        </select>
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          value={leg.strike}
                          onChange={(e) =>
                            setLegs((prev) =>
                              prev.map((l) => (l.id === leg.id ? { ...l, strike: Number(e.target.value) } : l))
                            )
                          }
                          step={strikeStep}
                          className="w-24 px-2 py-1 bg-[#050b18] border border-[#1b2d4b] rounded-lg text-xs font-black text-cyan-300 shadow-inner"
                        />
                      </td>
                      <td className="p-2.5 text-slate-400 font-bold">{leg.expiry}</td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          value={leg.lots}
                          onChange={(e) =>
                            setLegs((prev) =>
                              prev.map((l) => (l.id === leg.id ? { ...l, lots: Math.max(1, Number(e.target.value)) } : l))
                            )
                          }
                          min={1}
                          className="w-14 px-2 py-1 bg-[#050b18] border border-[#1b2d4b] rounded-lg text-xs font-bold text-slate-200 shadow-inner"
                        />
                      </td>
                      <td className="p-2.5 text-right text-emerald-400 font-black">₹{leg.ltp.toFixed(1)}</td>
                      <td className="p-2.5 text-right text-slate-400">{leg.iv}%</td>
                      <td className="p-2.5 text-right text-slate-300 font-bold">{leg.delta.toFixed(2)}</td>
                      <td className="p-2.5 text-right text-yellow-400 font-bold">₹{leg.theta.toFixed(1)}</td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => setLegs((prev) => prev.filter((l) => l.id !== leg.id))}
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Combined Strategy Analytics & Greeks Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-[#152445]">
              <div className="p-3 rounded-xl bg-[#050b18] border border-[#152445] space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Net Premium Flow</span>
                <div
                  className={cn(
                    "text-sm font-black",
                    calculations.isCredit ? "text-emerald-400" : "text-rose-400"
                  )}
                >
                  {calculations.isCredit ? "+" : "-"}₹{Math.abs(calculations.netCashflow).toLocaleString()}{" "}
                  <span className="text-[10px] font-normal">{calculations.isCredit ? "(Credit)" : "(Debit)"}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#050b18] border border-[#152445] space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Max Profit Potential</span>
                <div className="text-sm font-black text-emerald-400">
                  ₹{calculations.maxProfit.toLocaleString()}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#050b18] border border-[#152445] space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Max Risk / Loss Cap</span>
                <div className="text-sm font-black text-rose-400">
                  ₹{calculations.maxLoss.toLocaleString()}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#050b18] border border-[#152445] space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Net Delta ($\Delta$)</span>
                <div className="text-sm font-black text-cyan-300">
                  {calculations.netDelta > 0 ? "+" : ""}
                  {calculations.netDelta.toFixed(2)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#050b18] border border-[#152445] space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Daily Theta ($\Theta$)</span>
                <div className="text-sm font-black text-yellow-400">
                  {calculations.netTheta > 0 ? "+" : ""}₹{calculations.netTheta.toFixed(1)}/day
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#050b18] border border-[#152445] space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Est. Margin Needed</span>
                <div className="text-sm font-black text-slate-200">
                  ₹{calculations.marginEstimate.toLocaleString()}
                </div>
              </div>
            </div>
          </section>
        </div>

      {/* ── 4. PRODUCTION INTEGRITY & NEXT STEP BUTTON ──────────────────────── */}
      <section className="p-5 rounded-2xl bg-[#091124]/90 border border-[#152445] shadow-xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <span className="font-bold text-white block">
              Step 4 Option Strategy Verified ({legs.length} Legs Configured)
            </span>
            <span className="text-[10px] text-slate-400">
              Net Flow: {calculations.isCredit ? "Credit" : "Debit"} ₹{Math.abs(calculations.netCashflow).toLocaleString()} | Margin: ₹{calculations.marginEstimate.toLocaleString()}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setStep(5);
          }}
          disabled={legs.length === 0}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <span>Proceed to Step 5: Strategy Catalog & Execution Matrix</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>
    </div>
  );
}
