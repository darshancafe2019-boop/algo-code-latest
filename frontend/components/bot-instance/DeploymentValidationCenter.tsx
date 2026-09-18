"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  Layers,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Radio,
  Zap,
  Lock,
  ArrowRight,
  Info,
  Server,
  RefreshCw,
  Scale,
  Eye,
  Sliders,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatMoney } from "@/lib/formatters";

export interface StrategyLeg {
  legId?: string;
  canonicalInstrumentId: string;
  underlyingSymbol: string;
  expiry: string;
  strike: number;
  optionType: string;
  side: "BUY" | "SELL";
  quantity: number;
  lots: number;
  lotSize: number;
  orderType: string;
  limitPrice?: number;
  marketDataProvider: string;
  quote?: {
    ltp?: number;
    bid?: number;
    ask?: number;
    feedAgeMs?: number;
  };
}

export interface DeploymentValidationCenterProps {
  botSpec: {
    botId: string;
    botName: string;
    environment: "PAPER" | "LIVE";
    strategyType: string;
    underlyingSymbol: string;
    underlyingCanonicalId: string;
    expiry: string;
    legs: StrategyLeg[];
    marketDataProvider: string;
    fallbackMarketDataProvider?: string;
    executionBroker: string;
    executionAccountId: string;
    currency: string;
    capitalAllocation: number;
    stopLossPct: number;
    takeProfitPct: number;
    trailingStopPct: number;
    maxSlippagePct: number;
  };
  onActivate: (environment: "PAPER" | "LIVE") => Promise<void>;
  isSubmitting?: boolean;
}

interface PreflightGate {
  gateId: string;
  name: string;
  category: string;
  status: "PASS" | "FAIL" | "WARNING" | "NOT_REQUIRED";
  expected: string;
  actual: string;
  source: string;
  correction: string;
}

interface PreflightReport {
  isDeployable: boolean;
  totalGates: number;
  passedGates: number;
  failedGates: number;
  warningGates: number;
  gates: PreflightGate[];
  blockingReasons: string[];
  definedRiskMetrics?: {
    netPremium: number;
    maxProfit: number;
    maxLoss: number;
    breakevenPoints: number[];
    requiredMargin: number;
    rewardToRiskRatio: number;
    estimatedFees: number;
    estimatedSlippageBps: number;
    formulaNotes: string;
  };
}

export function DeploymentValidationCenter({
  botSpec,
  onActivate,
  isSubmitting = false,
}: DeploymentValidationCenterProps) {
  const [report, setReport] = useState<PreflightReport | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(true);
  const [liveConfirmModalOpen, setLiveConfirmModalOpen] = useState<boolean>(false);
  const [selectedStreamFilter, setSelectedStreamFilter] = useState<string>("ALL");
  const [streamEvents, setStreamEvents] = useState<any[]>([]);
  const [orderbook, setOrderbook] = useState<any | null>(null);
  const [showFormulaDetails, setShowFormulaDetails] = useState<boolean>(false);

  // Trigger preflight validation against backend consistency engine
  const runValidation = async () => {
    try {
      setIsValidating(true);
      const res = await fetch("/api/v2/bots/validate-spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(botSpec),
      });
      if (res.ok) {
        const json = await res.json();
        setReport(json.data);
      }
    } catch (e) {
      console.error("Failed to run preflight validation:", e);
    } finally {
      setIsValidating(false);
    }
  };

  // Fetch live stream preview and orderbook telemetry
  const fetchTelemetry = async () => {
    try {
      const [streamRes, obRes] = await Promise.all([
        fetch(`/api/v2/bots/${botSpec.botId}/stream-preview`),
        fetch(`/api/v2/bots/${botSpec.botId}/orderbook`),
      ]);
      if (streamRes.ok) {
        const sJson = await streamRes.json();
        setStreamEvents(sJson.data || []);
      }
      if (obRes.ok) {
        const obJson = await obRes.json();
        setOrderbook(obJson.data || null);
      }
    } catch (e) {
      console.warn("Telemetry fetch error:", e);
    }
  };

  useEffect(() => {
    runValidation();
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(interval);
  }, [botSpec]);

  const isLive = botSpec.environment === "LIVE";
  const isDeployable = report?.isDeployable ?? false;
  const metrics = report?.definedRiskMetrics;

  const handleLaunchClick = () => {
    if (!isDeployable) return;
    if (isLive) {
      setLiveConfirmModalOpen(true);
    } else {
      onActivate("PAPER");
    }
  };

  const confirmLiveLaunch = () => {
    setLiveConfirmModalOpen(false);
    onActivate("LIVE");
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Overview & Explicit Provider Separation */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Step 10 — Deployment Validation & Launch Control Center
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Authoritative multi-gate readiness audit, defined-risk analytics, and live stream telemetry.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runValidation}
              disabled={isValidating}
              className="px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isValidating ? "animate-spin text-cyan-400" : ""}`} />
              Re-Audit Gates
            </button>
            <span
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase tracking-wider border ${
                isLive
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                  : "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
              }`}
            >
              ● {botSpec.environment} ENVIRONMENT
            </span>
          </div>
        </div>

        {/* 3-Pillar Provider & Context Matrix */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Strategy & Underlying</span>
            <span className="font-bold text-cyan-400 text-sm block mt-1">
              {botSpec.strategyType}
            </span>
            <span className="text-slate-300 text-[11px] block mt-0.5">
              {botSpec.underlyingSymbol} • {botSpec.expiry}
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Market Data Provider</span>
            <span className="font-bold text-white text-sm block mt-1">
              {botSpec.marketDataProvider}
            </span>
            <span className="text-slate-400 text-[11px] block mt-0.5">
              Fallback: {botSpec.fallbackMarketDataProvider || "None"}
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Execution Broker</span>
            <span className="font-bold text-white text-sm block mt-1">
              {botSpec.executionBroker}
            </span>
            <span className="text-slate-400 text-[11px] block mt-0.5">
              Account: {botSpec.executionAccountId}
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Capital Allocation</span>
            <span className="font-bold text-emerald-400 text-sm block mt-1">
              {formatMoney(botSpec.capitalAllocation, botSpec.currency === "INR" ? "₹" : "$")}
            </span>
            <span className="text-slate-400 text-[11px] block mt-0.5">
              Native Currency: {botSpec.currency}
            </span>
          </div>
        </div>

        {/* Strategy Legs Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono">
            <span>CONFIGURED STRATEGY LEGS ({botSpec.legs.length})</span>
            <span>RATIO: 1:1</span>
          </div>
          <div className="space-y-1.5">
            {botSpec.legs.map((leg, idx) => (
              <div
                key={leg.legId || idx}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      leg.side === "BUY"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    }`}
                  >
                    {leg.side}
                  </span>
                  <span className="font-bold text-white">{leg.canonicalInstrumentId || `${botSpec.underlyingSymbol} ${leg.strike} ${leg.optionType}`}</span>
                  <span className="text-slate-400 text-[11px]">
                    ({leg.lots} Lot • {leg.quantity} Units)
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 text-[11px]">Data: {leg.marketDataProvider}</span>
                  <span className="font-bold text-cyan-300">
                    LTP: ₹{leg.quote?.ltp?.toFixed(2) || "215.00"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. EXPLAIN FAILURE ALERT (Prominent when gates fail, e.g. BTC vs NIFTY) */}
      {report && report.failedGates > 0 && (
        <div className="bg-rose-950/40 border-2 border-rose-500/60 rounded-2xl p-5 shadow-2xl space-y-3 animate-pulse">
          <div className="flex items-center gap-2.5 text-rose-400 font-bold text-sm font-mono">
            <ShieldAlert className="h-5 w-5 text-rose-400" />
            DEPLOYMENT BLOCKED — {report.failedGates} CRITICAL PREFLIGHT GATE(S) FAILED
          </div>
          <p className="text-xs text-rose-200">
            Activation is strictly prohibited until all structural and provider integrity invariants pass.
          </p>

          <div className="space-y-2 pt-2">
            {report.gates
              .filter((g) => g.status === "FAIL")
              .map((g) => (
                <div
                  key={g.gateId}
                  className="bg-rose-900/30 border border-rose-500/40 rounded-xl p-3.5 text-xs font-mono space-y-1.5 text-rose-100"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-300">🔴 {g.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-200 border border-rose-500/30">
                      FAIL
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-rose-400 block">Expected:</span>
                      <span className="text-white">{g.expected}</span>
                    </div>
                    <div>
                      <span className="text-rose-400 block">Actual:</span>
                      <span className="text-rose-200">{g.actual}</span>
                    </div>
                  </div>
                  {g.correction && (
                    <div className="text-[11px] text-amber-300 pt-1 border-t border-rose-800/40">
                      💡 <strong>How to Fix:</strong> {g.correction}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 3. 16-Gate Objective Preflight Scorecard */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              16-Gate Preflight Readiness Scorecard
            </h3>
          </div>
          <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
            <span className="text-emerald-400 font-bold">{report?.passedGates || 0} Passed</span>
            <span>•</span>
            <span className="text-rose-400 font-bold">{report?.failedGates || 0} Failed</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 font-mono text-xs">
          {report?.gates.map((gate) => {
            const isPass = gate.status === "PASS" || gate.status === "NOT_REQUIRED";
            return (
              <div
                key={gate.gateId}
                className={`p-3 rounded-xl border transition-all ${
                  isPass
                    ? "bg-slate-950/60 border-slate-800/80 text-slate-300"
                    : "bg-rose-950/30 border-rose-500/50 text-rose-200"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold text-white truncate">{gate.name}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                      isPass
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-rose-500/20 text-rose-300"
                    }`}
                  >
                    {gate.status}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{gate.actual || gate.expected}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Central Defined-Risk Calculations & Payoff Metrics */}
      {metrics && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                Central Defined-Risk & Margin Solver
              </h3>
            </div>
            <button
              onClick={() => setShowFormulaDetails(!showFormulaDetails)}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <Info className="h-3.5 w-3.5" />
              {showFormulaDetails ? "Hide Formulas" : "Formula Details"}
              {showFormulaDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Net Premium Flow</span>
              <span
                className={`text-sm font-bold block mt-1 ${
                  metrics.netPremium < 0 ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {metrics.netPremium < 0 ? "Debit" : "Credit"}: ₹
                {Math.abs(metrics.netPremium).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Maximum Profit</span>
              <span className="text-sm font-bold text-emerald-400 block mt-1">
                {metrics.maxProfit === Infinity ? "Unlimited" : `₹${metrics.maxProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Maximum Loss</span>
              <span className="text-sm font-bold text-rose-400 block mt-1">
                ₹{metrics.maxLoss.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Required Margin</span>
              <span className="text-sm font-bold text-white block mt-1">
                ₹{metrics.requiredMargin.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono pt-1">
            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Breakeven Point(s):</span>
              <span className="font-bold text-cyan-400">
                {metrics.breakevenPoints.length > 0 ? metrics.breakevenPoints.map((b) => `₹${b}`).join(", ") : "N/A"}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Reward / Risk Ratio:</span>
              <span className="font-bold text-white">{metrics.rewardToRiskRatio}:1</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Est. Fees & Slippage:</span>
              <span className="font-bold text-slate-300">₹{metrics.estimatedFees} ({metrics.estimatedSlippageBps} bps)</span>
            </div>
          </div>

          {showFormulaDetails && (
            <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-xs font-mono text-cyan-300 space-y-1">
              <span className="font-bold text-cyan-200 block">Calculation Methodology:</span>
              <p>{metrics.formulaNotes}</p>
            </div>
          )}
        </div>
      )}

      {/* 5. Top Liquidity / Order Flow & Depth Imbalance Panel */}
      {orderbook && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                Top Liquidity & Order Flow Intelligence
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Feed Age: <strong className="text-emerald-400">{orderbook.feedAgeMs}ms</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Spread (L1)</span>
              <span className="text-sm font-bold text-white block mt-0.5">
                ₹{orderbook.spreadAbs} ({orderbook.spreadBps} bps)
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Depth Imbalance</span>
              <span
                className={`text-sm font-bold block mt-0.5 ${
                  orderbook.depthImbalancePct > 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {orderbook.depthImbalancePct > 0 ? "+" : ""}
                {orderbook.depthImbalancePct}% (Bids dominant)
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Bid Wall</span>
              <span className="text-sm font-bold text-emerald-400 block mt-0.5">
                ₹{orderbook.bidWall?.price} ({orderbook.bidWall?.quantity} Qty)
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Ask Wall</span>
              <span className="text-sm font-bold text-rose-400 block mt-0.5">
                ₹{orderbook.askWall?.price} ({orderbook.askWall?.quantity} Qty)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 6. Live Market Data Stream Preview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Live Normalized Stream Preview (Bounded Buffer)
            </h3>
          </div>
          <div className="flex gap-1 text-[11px] font-mono">
            {["ALL", "QUOTE", "TRADE", "DEPTH"].map((filt) => (
              <button
                key={filt}
                onClick={() => setSelectedStreamFilter(filt)}
                className={`px-2 py-0.5 rounded transition-all ${
                  selectedStreamFilter === filt
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {filt}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-950 rounded-xl border border-slate-800 p-3 max-h-48 overflow-y-auto font-mono text-[11px] space-y-1.5">
          {streamEvents.length === 0 ? (
            <div className="text-slate-500 text-center py-4">Awaiting incoming provider packets...</div>
          ) : (
            streamEvents
              .filter((e) => selectedStreamFilter === "ALL" || e.eventType === selectedStreamFilter)
              .map((evt, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-1.5 rounded hover:bg-slate-900/60 transition-colors border-b border-slate-900/40 last:border-0"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-slate-500 text-[10px]">{evt.receivedTime}</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300 text-[9px] font-bold">
                      {evt.provider}
                    </span>
                    <span className="text-white font-bold">{evt.instrument}</span>
                    <span className="text-slate-400">[{evt.eventType}]</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-bold">₹{evt.price}</span>
                    <span className="text-slate-400">{evt.quantity} Qty</span>
                    <span className="text-slate-500 text-[10px]">{evt.latency}ms</span>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* 7. Authoritative Launch Action Button */}
      <div className="pt-2">
        <button
          type="button"
          disabled={!isDeployable || isSubmitting}
          onClick={handleLaunchClick}
          className={`w-full py-4 rounded-xl font-bold font-mono text-sm tracking-wider uppercase shadow-2xl transition-all flex items-center justify-center gap-2 ${
            !isDeployable
              ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
              : isLive
              ? "bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white shadow-amber-500/20 border border-amber-400/40"
              : "bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-slate-950 font-black shadow-emerald-500/20 border border-emerald-400/40"
          }`}
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="h-5 w-5 animate-spin" />
              Activating Bot Instance...
            </>
          ) : isLive ? (
            <>
              <Lock className="h-5 w-5" />
              ACTIVATE LIVE BOT
            </>
          ) : (
            <>
              <Zap className="h-5 w-5" />
              ACTIVATE PAPER BOT
            </>
          )}
        </button>
        {!isDeployable && (
          <p className="text-center text-xs font-mono text-rose-400 mt-2">
            ⚠️ Deployment button disabled: resolve failed preflight gates above to enable activation.
          </p>
        )}
      </div>

      {/* 8. LIVE ACTIVATION SAFETY MODAL */}
      {liveConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border-2 border-amber-500/80 rounded-2xl p-6 shadow-2xl space-y-4 text-slate-100 font-sans">
            <div className="flex items-center gap-3 text-amber-400 font-bold font-mono">
              <ShieldAlert className="h-6 w-6" />
              LIVE ORDER EXECUTION CONFIRMATION
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              You are about to activate a <strong>LIVE</strong> algorithmic bot on{" "}
              <strong>{botSpec.executionBroker}</strong> with capital allocation{" "}
              <strong className="text-emerald-400 font-mono">
                {formatMoney(botSpec.capitalAllocation, botSpec.currency === "INR" ? "₹" : "$")}
              </strong>
              . Real capital will be committed to live exchange order books.
            </p>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs font-mono space-y-1">
              <div>Bot ID: <strong className="text-cyan-400">{botSpec.botId}</strong></div>
              <div>Strategy: <strong className="text-white">{botSpec.strategyType}</strong></div>
              <div>Underlying: <strong className="text-white">{botSpec.underlyingSymbol} ({botSpec.expiry})</strong></div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setLiveConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmLiveLaunch}
                className="px-5 py-2 rounded-xl text-xs font-mono font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg"
              >
                Confirm & Launch Live Bot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
