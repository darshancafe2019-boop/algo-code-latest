"use client";

import React, { useState, useMemo } from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { useGlobalData } from "@/context/GlobalDataContext";
import { useNseOptionChain, useNseBotSignals } from "@/hooks/useNseData";
import { OptionLegGreekData } from "@/types/nse";

import { SimpleOptionChainTable, OptionalColumn } from "@/components/options/SimpleOptionChainTable";
import { SimpleOptionOrderTicket } from "@/components/options/SimpleOptionOrderTicket";
import { OptionsPositionsOrdersDock } from "@/components/options/OptionsPositionsOrdersDock";
import { OptionsAdvancedDrawers } from "@/components/options/OptionsAdvancedDrawers";
import { OptionsControlCenter } from "@/components/options/OptionsControlCenter";
import { MultiLegStrategyBuilder } from "@/components/options/MultiLegStrategyBuilder";

import { MultiMarketOptionsWorkstation } from "@/components/options/MultiMarketOptionsWorkstation";

import {
  RefreshCw,
  Info,
  ShieldCheck,
  ShieldAlert,
  BarChart2,
  Activity,
  Zap,
  Sliders,
  Compass,
  Layers,
  Cpu,
} from "lucide-react";

const SUPPORTED_UNDERLYINGS = [
  { symbol: "NIFTY", label: "NIFTY" },
  { symbol: "BANKNIFTY", label: "BANKNIFTY" },
  { symbol: "FINNIFTY", label: "FINNIFTY" },
  { symbol: "SENSEX", label: "SENSEX" },
  { symbol: "RELIANCE", label: "RELIANCE" },
  { symbol: "TCS", label: "TCS" },
];

export default function OptionsPage() {
  const { tradingMode, riskSummary, isLive } = useGlobalData();

  // Primary Options View Tab: "workstation" | "control-center" | "chain-ladder" | "multi-leg-builder"
  const [activeViewTab, setActiveViewTab] = useState<"workstation" | "control-center" | "chain-ladder" | "multi-leg-builder">("workstation");

  // 1. Primary Underlyings & Expiry State
  const [selectedUnderlying, setSelectedUnderlying] = useState("NIFTY");
  const [selectedExpiry, setSelectedExpiry] = useState("");
  const [strikeCount, setStrikeCount] = useState(20);

  // 2. Selected Contract for Order Ticket
  const [selectedStrike, setSelectedStrike] = useState<number | null>(null);
  const [selectedOptionType, setSelectedOptionType] = useState<"CE" | "PE">("CE");
  const [selectedPremium, setSelectedPremium] = useState<number>(0);
  const [selectedDetails, setSelectedDetails] = useState<OptionLegGreekData | null>(null);

  // 3. Columns Visibility State
  const [visibleColumns, setVisibleColumns] = useState<Record<OptionalColumn, boolean>>({
    iv: false,
    delta: false,
    theta: false,
    gamma: false,
    vega: false,
    volume: false,
    oi_change: false,
    bid_ask: false,
  });

  const toggleColumn = (col: OptionalColumn) => {
    setVisibleColumns((prev) => ({ ...prev, [col]: !prev[col] }));
  };

  // 4. Secondary Advanced Drawers State
  const [activeDrawer, setActiveDrawer] = useState<"none" | "details" | "chart" | "matrix" | "strategies" | "explore">("none");

  // 5. Fetch Canonical Option Chain Data
  const {
    data: chainData,
    isLoading: isChainLoading,
    refetch: refetchChain,
    isFetching: isChainFetching,
  } = useNseOptionChain(selectedUnderlying, selectedExpiry, strikeCount);

  // 6. Fetch Deterministic Setup Score
  const { data: botSignals } = useNseBotSignals(selectedUnderlying);

  const spotPrice = chainData?.spot_price || 24350.0;
  const maxPain = chainData?.max_pain_strike || spotPrice;
  const pcr = chainData?.pcr_oi || 1.12;
  const availableExpiries = chainData?.available_expiries || [];
  const currentExpiry = selectedExpiry || availableExpiries[0] || "27 Aug 2026";
  const strikes = useMemo(() => chainData?.strikes || [], [chainData?.strikes]);

  // Automatically select nearest ATM strike on initial load if none selected
  React.useEffect(() => {
    if (strikes.length > 0 && selectedStrike === null) {
      let closest = strikes[0].strike;
      let minDiff = Math.abs(strikes[0].strike - spotPrice);
      for (const s of strikes) {
        const diff = Math.abs(s.strike - spotPrice);
        if (diff < minDiff) {
          minDiff = diff;
          closest = s.strike;
        }
      }
      setSelectedStrike(closest);
      const atmRow = strikes.find((r) => r.strike === closest);
      if (atmRow) {
        setSelectedPremium(atmRow.ce?.ltp || 100);
        setSelectedDetails(atmRow.ce);
      }
    }
  }, [strikes, spotPrice, selectedStrike]);

  // Handle Strike Selection from Option Chain Table
  const handleSelectOption = (
    strike: number,
    type: "CE" | "PE",
    ltp: number,
    details: OptionLegGreekData
  ) => {
    setSelectedStrike(strike);
    setSelectedOptionType(type);
    setSelectedPremium(ltp);
    setSelectedDetails(details);
  };

  const isRiskSafe = riskSummary ? !riskSummary.globalKillSwitchActive : true;

  return (
    <DirectPageLayout activeTab="options">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-[1700px] mx-auto min-w-0 font-sans">
        {/* ========================================================================= */}
        {/* 1. SIMPLE TOP HEADER                                                     */}
        {/* ========================================================================= */}
        <div className="bg-[#0B132B]/90 border border-slate-800 rounded-2xl p-4 md:p-5 backdrop-blur-md shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Title & Dynamic Subtitle */}
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl md:text-2xl font-black font-mono text-white tracking-wide">OPTIONS</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                  {selectedUnderlying} • NSE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {selectedUnderlying} • NSE • {currentExpiry}
              </p>
            </div>

            {/* Essential Header Metrics */}
            <div className="flex flex-wrap items-center gap-3 md:gap-6 font-mono">
              {/* Spot Price */}
              <div className="px-3 py-1.5 bg-slate-900/80 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Spot Price</div>
                <div className="text-sm md:text-base font-extrabold text-white">
                  ₹{spotPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Expiry Selector */}
              <div className="px-3 py-1.5 bg-slate-900/80 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Expiry</div>
                <select
                  value={selectedExpiry || availableExpiries[0] || ""}
                  onChange={(e) => setSelectedExpiry(e.target.value)}
                  className="bg-transparent text-sm font-bold text-cyan-400 focus:outline-none cursor-pointer"
                >
                  {availableExpiries.map((exp) => (
                    <option key={exp} value={exp} className="bg-slate-900 text-white">
                      {exp}
                    </option>
                  ))}
                </select>
              </div>

              {/* PCR (with tooltip) */}
              <div
                className="px-3 py-1.5 bg-slate-900/80 rounded-xl border border-slate-800 cursor-help"
                title="Put Open Interest / Call Open Interest"
              >
                <div className="text-[10px] text-slate-400 uppercase flex items-center gap-1">
                  <span>PCR</span>
                  <Info className="w-2.5 h-2.5 opacity-60" />
                </div>
                <div className="text-sm md:text-base font-extrabold text-amber-400">{pcr.toFixed(2)}</div>
              </div>

              {/* Max Pain */}
              <div className="px-3 py-1.5 bg-slate-900/80 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Max Pain</div>
                <div className="text-sm md:text-base font-extrabold text-slate-200">
                  {maxPain.toLocaleString()}
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>LIVE</span>
                </div>

                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold font-mono border ${
                    isRiskSafe
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                  }`}
                >
                  {isRiskSafe ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                  <span>{isRiskSafe ? "RISK SAFE" : "RISK BLOCKED"}</span>
                </div>

                <div className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold font-mono">
                  {tradingMode}
                </div>
              </div>
            </div>

            {/* Header Action Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => refetchChain()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition font-mono text-xs"
                title="Refresh Market Snapshot"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChainFetching ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                onClick={() => setActiveDrawer("details")}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition font-mono text-xs"
              >
                Details
              </button>

              <button
                onClick={() => setActiveDrawer("chart")}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition font-mono text-xs"
              >
                <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Chart</span>
              </button>

              <button
                onClick={() => setActiveDrawer("matrix")}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition font-mono text-xs"
              >
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Matrix</span>
              </button>

              <button
                onClick={() => setActiveDrawer("strategies")}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition font-mono text-xs"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Strategies</span>
              </button>
            </div>
          </div>

          {/* Underlying Selector Bar */}
          <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-3 border-t border-slate-800/80 font-mono text-xs">
            <span className="text-slate-400 mr-2 text-[11px]">Underlying:</span>
            {SUPPORTED_UNDERLYINGS.map((item) => (
              <button
                key={item.symbol}
                onClick={() => {
                  setSelectedUnderlying(item.symbol);
                  setSelectedExpiry("");
                  setSelectedStrike(null);
                }}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  selectedUnderlying === item.symbol
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-extrabold"
                    : "bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}

            <button
              onClick={() => setActiveDrawer("explore")}
              className="px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white transition flex items-center gap-1 text-[11px] ml-auto"
            >
              <Compass className="w-3 h-3" />
              <span>More Underlyings ▾</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW NAVIGATION TABS: WORKSTATION | CONTROL CENTER | CHAIN | BUILDER      */}
        {/* ========================================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-[#0B132B] border border-slate-800 rounded-2xl">
          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              onClick={() => setActiveViewTab("workstation")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition ${
                activeViewTab === "workstation"
                  ? "bg-gradient-to-r from-cyan-500 to-indigo-500 text-slate-950 shadow-lg shadow-cyan-500/20 font-extrabold"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Multi-Market Options Workstation (24 Strategies)</span>
            </button>

            <button
              onClick={() => setActiveViewTab("control-center")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition ${
                activeViewTab === "control-center"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/20 font-extrabold"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>Autonomous Engine</span>
            </button>

            <button
              onClick={() => setActiveViewTab("chain-ladder")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition ${
                activeViewTab === "chain-ladder"
                  ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 font-extrabold"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              <span>Option Chain Ladder</span>
            </button>

            <button
              onClick={() => setActiveViewTab("multi-leg-builder")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition ${
                activeViewTab === "multi-leg-builder"
                  ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 font-extrabold"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Custom Leg Builder</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 0: MULTI-MARKET OPTIONS WORKSTATION (24 PDF STRATEGIES)              */}
        {/* ========================================================================= */}
        {activeViewTab === "workstation" && (
          <MultiMarketOptionsWorkstation />
        )}

        {/* ========================================================================= */}
        {/* VIEW 1: OPTIONS CONTROL CENTER (AUTONOMOUS STRATEGY ENGINE)               */}
        {/* ========================================================================= */}
        {activeViewTab === "control-center" && (
          <OptionsControlCenter
            underlying={selectedUnderlying}
            spotPrice={spotPrice}
            pcr={pcr}
            maxPain={maxPain}
            availableExpiries={availableExpiries}
            chainData={chainData}
          />
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: OPTION CHAIN TABLE + ORDER TICKET                                 */}
        {/* ========================================================================= */}
        {activeViewTab === "chain-ladder" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <div className="lg:col-span-8 h-full">
              <SimpleOptionChainTable
                strikes={strikes}
                spotPrice={spotPrice}
                selectedStrike={selectedStrike}
                selectedOptionType={selectedOptionType}
                onSelectOption={handleSelectOption}
                visibleColumns={visibleColumns}
                onToggleColumn={toggleColumn}
                currencySymbol="₹"
                isLoading={isChainLoading}
              />
            </div>
            <div className="lg:col-span-4 h-full">
              <SimpleOptionOrderTicket
                underlying={selectedUnderlying}
                expiry={currentExpiry}
                strike={selectedStrike}
                optionType={selectedOptionType}
                premium={selectedPremium}
                details={selectedDetails}
                currencySymbol="₹"
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: MULTI-LEG STRATEGY BUILDER                                        */}
        {/* ========================================================================= */}
        {activeViewTab === "multi-leg-builder" && (
          <MultiLegStrategyBuilder
            spotPrice={spotPrice}
            atmStrike={Math.round(spotPrice / 100) * 100}
            selectedExpiry={currentExpiry}
            currency="₹"
          />
        )}

        {/* ========================================================================= */}
        {/* 4. ADVANCED DRAWERS (ON DEMAND)                                          */}
        {/* ========================================================================= */}
        <OptionsAdvancedDrawers
          activeDrawer={activeDrawer}
          onClose={() => setActiveDrawer("none")}
          underlying={selectedUnderlying}
          spotPrice={spotPrice}
          pcr={pcr}
          maxPain={maxPain}
          setupData={botSignals}
        />
      </div>
    </DirectPageLayout>
  );
}
