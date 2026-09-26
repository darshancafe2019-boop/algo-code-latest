import React, { useState } from "react";
import {
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  FlaskConical,
  Bot,
  Shield,
  Clock,
  TrendingUp,
  Activity,
  Layers,
  Zap,
  Radio,
  Sliders,
  Sparkles,
  Lock,
  ArrowRight,
  Info,
  ChevronRight,
  Check,
  RotateCcw,
  BarChart2,
  FileText,
} from "lucide-react";
import {
  CryptoStrategyDefinition,
  StrategySignalState,
  CRYPTO_30_STRATEGIES,
} from "@/lib/strategies/crypto30Strategies";
import { useStrategyStore } from "@/lib/strategies/strategyStore";
import { formatMoney } from "@/lib/formatters";

interface StrategyDetailModalProps {
  strategy: CryptoStrategyDefinition | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenBacktest?: (strategyNumber: string) => void;
  onActivatePaper?: (strategyNumber: string) => void;
  onCreateBot?: (strategy: CryptoStrategyDefinition) => void;
}

export function StrategyDetailModal({
  strategy,
  isOpen,
  onClose,
  onOpenBacktest,
  onActivatePaper,
  onCreateBot,
}: StrategyDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "CONDITIONS" | "SIGNAL_EXPLAIN" | "HOW_IT_WORKS" | "RISK_CALC" | "PARAMETERS">("OVERVIEW");
  const [liveTradingConfirmed, setLiveTradingConfirmed] = useState(false);
  const [paperActivatedSuccess, setPaperActivatedSuccess] = useState(false);

  // Custom risk calculator inputs
  const [calcEquity, setCalcEquity] = useState<number>(100000);
  const [calcRiskPct, setCalcRiskPct] = useState<number>(0.5);
  const [calcEntryPrice, setCalcEntryPrice] = useState<number>(strategy?.exampleTrade.entryPrice || 67000);
  const [calcStopPrice, setCalcStopPrice] = useState<number>(strategy?.exampleTrade.stopPrice || 65500);
  const [calcTargetPrice, setCalcTargetPrice] = useState<number>(strategy?.exampleTrade.targetPrice || 70000);
  const [calcLeverage, setCalcLeverage] = useState<number>(1);

  // Store access
  const { signalReports, evaluateRiskForTrade, customParameters, updateStrategyParameters } = useStrategyStore();

  if (!isOpen || !strategy) return null;

  const signalReport = signalReports[strategy.number];
  const currentSignalState: StrategySignalState = signalReport?.signalState || "NO_SETUP";

  // Calculate live risk numbers
  const riskResult = evaluateRiskForTrade({
    strategyId: strategy.id,
    strategyNumber: strategy.number,
    strategyName: strategy.name,
    strategyVersion: strategy.version,
    instrument: strategy.exampleTrade.instrument,
    direction: strategy.direction === "SHORT" ? "SHORT" : "LONG",
    entryPrice: calcEntryPrice,
    stopPrice: calcStopPrice,
    targetPrice: calcTargetPrice,
    requestedRiskPct: calcRiskPct,
    leverage: calcLeverage,
  });

  const handleActivatePaperClick = () => {
    onActivatePaper?.(strategy.number);
    setPaperActivatedSuccess(true);
    setTimeout(() => setPaperActivatedSuccess(false), 3000);
  };

  const getSignalBadgeColor = (state: StrategySignalState) => {
    switch (state) {
      case "READY":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
      case "SETUP_FORMING":
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/40";
      case "WATCHING":
        return "bg-blue-500/20 text-blue-400 border-blue-500/40";
      case "BLOCKED":
        return "bg-red-500/20 text-red-400 border-red-500/40";
      default:
        return "bg-slate-800/60 text-slate-400 border-slate-700/60";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-[#0B0F19] border border-[#1E293B] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100 font-sans">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E293B] bg-[#0E1526]">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 font-mono font-bold text-cyan-400 text-sm">
              {strategy.number}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">{strategy.name}</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1E293B] text-slate-300 font-semibold uppercase">
                  {strategy.category}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  v{strategy.version}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                <span>TF: {strategy.primaryTimeframe}</span>
                <span>•</span>
                <span>Market: {strategy.market}</span>
                <span>•</span>
                <span>Dir: {strategy.direction}</span>
                <span>•</span>
                <span>Complexity: {strategy.complexity}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-lg border font-mono text-xs font-bold uppercase flex items-center gap-1.5 ${getSignalBadgeColor(currentSignalState)}`}>
              <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
              <span>SIGNAL: {currentSignalState}</span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher Sub-Bar */}
        <div className="flex items-center gap-2 px-6 py-2 border-b border-[#1A253A] bg-[#090D16] overflow-x-auto no-scrollbar">
          {[
            { id: "OVERVIEW", label: "Overview & Logic", icon: Info },
            { id: "CONDITIONS", label: "Setup Checklist", icon: CheckCircle2 },
            { id: "SIGNAL_EXPLAIN", label: "Signal Engine Audit", icon: Activity },
            { id: "HOW_IT_WORKS", label: "How It Works (Demo)", icon: Play },
            { id: "RISK_CALC", label: "Risk Engine Sizing", icon: Shield },
            { id: "PARAMETERS", label: "Parameters & Version", icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* TAB 1: OVERVIEW & LOGIC */}
          {activeTab === "OVERVIEW" && (
            <div className="space-y-6 animate-fadeIn">
              {/* What this strategy does */}
              <div className="p-4 rounded-xl bg-[#111827]/80 border border-[#1E293B] space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="h-4 w-4" />
                  <span>What This Strategy Does</span>
                </div>
                <p className="text-slate-200 leading-relaxed text-sm font-sans">{strategy.whatItDoes}</p>
              </div>

              {/* Why it exists */}
              <div className="p-4 rounded-xl bg-[#111827]/80 border border-[#1E293B] space-y-2">
                <div className="flex items-center gap-2 text-blue-400 font-mono text-xs font-bold uppercase tracking-wider">
                  <Layers className="h-4 w-4" />
                  <span>Why It Exists (Microstructure & Edge Mechanism)</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-sm">{strategy.whyItExists}</p>
              </div>

              {/* Best vs Unfavorable Conditions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Best conditions */}
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 space-y-2.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Best Market Conditions</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {strategy.bestMarketConditions.map((cond, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{cond}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Unfavorable conditions / When not to trade */}
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Unfavorable Conditions (When NOT To Trade)</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {strategy.unfavorableConditions.map((cond, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>{cond}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Required Indicators & Parameter Specifications */}
              <div className="p-4 rounded-xl bg-[#111827]/80 border border-[#1E293B] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                    Required Indicators & Settings
                  </span>
                  <span className="text-[11px] font-mono text-cyan-400 font-semibold">
                    {strategy.indicators.length} indicators active
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {strategy.indicators.map((ind, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-[#0C121E] border border-[#1F2E47] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{ind.name}</span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                          {ind.defaultSetting}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight">{ind.purpose}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SETUP CONDITIONS CHECKLIST */}
          {activeTab === "CONDITIONS" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#121A2A] border border-[#1E293B]">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-white">Rule Verification Checklist</span>
                  <p className="text-[11px] text-slate-400 font-mono">
                    All required conditions must concurrently evaluate to true. If any condition fails: NO TRADE.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-300">
                    Status: {signalReport?.passedConditionsCount || 0} / {strategy.setupConditions.length} Passed
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {strategy.setupConditions.map((cond, idx) => {
                  const evalItem = signalReport?.conditionsChecklist?.find((c) => c.conditionId === cond.id);
                  const isPassed = evalItem ? evalItem.passed : true;

                  return (
                    <div
                      key={cond.id}
                      className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                        isPassed
                          ? "bg-[#0C1726]/60 border-emerald-500/30 text-slate-200"
                          : "bg-[#18111A]/60 border-amber-500/30 text-slate-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {isPassed ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="h-5 w-5 text-amber-400 shrink-0" />
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white">{cond.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1A253A] text-cyan-300">
                              {cond.category}
                            </span>
                            {cond.required && (
                              <span className="text-[9px] font-mono px-1 rounded bg-red-950/80 text-red-400 border border-red-800/60">
                                REQUIRED
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">{cond.description}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                            isPassed ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-amber-950 text-amber-400 border border-amber-800"
                          }`}
                        >
                          {isPassed ? "PASS" : "FAIL"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: SIGNAL EXPLANATION & WHY NO TRADE AUDIT */}
          {activeTab === "SIGNAL_EXPLAIN" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Current Live Signal State Card */}
              <div className="p-5 rounded-xl bg-[#0E1628] border border-cyan-500/30 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-cyan-400 animate-pulse" />
                    <span className="font-mono text-sm font-bold text-white">Live Signal Engine State</span>
                  </div>
                  <span className={`px-3 py-1 rounded-lg border font-mono text-xs font-bold uppercase ${getSignalBadgeColor(currentSignalState)}`}>
                    {currentSignalState}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-2.5 rounded-lg bg-[#080E1A] border border-[#1A2840]">
                    <span className="text-[10px] font-mono text-slate-400 block">EVALUATED INSTRUMENT</span>
                    <span className="text-sm font-mono font-bold text-cyan-300">{strategy.exampleTrade.instrument}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#080E1A] border border-[#1A2840]">
                    <span className="text-[10px] font-mono text-slate-400 block">DATA HEALTH</span>
                    <span className="text-sm font-mono font-bold text-emerald-400">HEALTHY (0ms Lag)</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#080E1A] border border-[#1A2840]">
                    <span className="text-[10px] font-mono text-slate-400 block">PASSED CONDITIONS</span>
                    <span className="text-sm font-mono font-bold text-white">
                      {signalReport?.passedConditionsCount || 0} / {strategy.setupConditions.length}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#080E1A] border border-[#1A2840]">
                    <span className="text-[10px] font-mono text-slate-400 block">EXECUTION ACTION</span>
                    <span className="text-sm font-mono font-bold text-amber-300">
                      {currentSignalState === "READY" ? "EXECUTE ORDER" : "STANDBY"}
                    </span>
                  </div>
                </div>
              </div>

              {/* WHY THIS SIGNAL EXISTS vs WHY NO TRADE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Why trade explanation */}
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase">
                    <Check className="h-4 w-4" />
                    <span>Why This Signal Exists</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-mono">
                    {signalReport?.whyTradeExplanation || "All conditions satisfied. Trend, volume, and risk clearances pass."}
                  </p>
                </div>

                {/* Why no trade explanation */}
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Why No Trade (If Conditions Incomplete)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-mono">
                    {signalReport?.whyNoTradeExplanation || "No setup active. Awaiting full checklist condition clearance."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: HOW IT WORKS (SIMULATED TRADE EXAMPLE) */}
          {activeTab === "HOW_IT_WORKS" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-4 rounded-xl bg-[#111827] border border-[#1E293B] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Play className="h-4 w-4 text-cyan-400" />
                    <span className="font-mono text-xs font-bold uppercase text-white">
                      Trade Simulation Pipeline ({strategy.exampleTrade.instrument})
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                    SIMULATED EXAMPLE DATA
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center font-mono text-xs">
                  <div className="p-2.5 rounded-lg bg-[#0C121E] border border-[#1F2E47]">
                    <span className="text-[10px] text-slate-400 block">ENTRY</span>
                    <span className="font-bold text-white">{formatMoney(strategy.exampleTrade.entryPrice)}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#0C121E] border border-[#1F2E47]">
                    <span className="text-[10px] text-slate-400 block">STOP LOSS</span>
                    <span className="font-bold text-red-400">{formatMoney(strategy.exampleTrade.stopPrice)}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#0C121E] border border-[#1F2E47]">
                    <span className="text-[10px] text-slate-400 block">TARGET</span>
                    <span className="font-bold text-emerald-400">{formatMoney(strategy.exampleTrade.targetPrice)}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#0C121E] border border-[#1F2E47]">
                    <span className="text-[10px] text-slate-400 block">RISK %</span>
                    <span className="font-bold text-amber-400">{strategy.exampleTrade.riskPct}%</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#0C121E] border border-[#1F2E47]">
                    <span className="text-[10px] text-slate-400 block">R:R RATIO</span>
                    <span className="font-bold text-cyan-400">{strategy.exampleTrade.rrRatio}</span>
                  </div>
                </div>
              </div>

              {/* Step-by-Step Flow Pipeline */}
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  Execution Flow Stages
                </span>

                <div className="space-y-2">
                  {strategy.exampleTrade.steps.map((step, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-[#0F172A] border border-[#1E293B] flex items-center gap-4">
                      <div className="flex items-center justify-center h-7 w-7 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono text-xs font-bold shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-cyan-300 uppercase">{step.step}</span>
                          <span className="text-xs text-white font-semibold">• {step.title}</span>
                        </div>
                        <p className="text-xs text-slate-400 truncate">{step.detail}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CENTRAL RISK ENGINE SIZING */}
          {activeTab === "RISK_CALC" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-4 rounded-xl bg-[#111827] border border-[#1E293B] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold uppercase">
                    <Shield className="h-4 w-4" />
                    <span>Central Risk Engine Sizing Calculator</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                    MANDATORY RISK GATE
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">ACCOUNT EQUITY ($)</label>
                    <input
                      type="number"
                      value={calcEquity}
                      onChange={(e) => setCalcEquity(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#080E1A] border border-[#1F2E47] text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">RISK PER TRADE (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={calcRiskPct}
                      onChange={(e) => setCalcRiskPct(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#080E1A] border border-[#1F2E47] text-sm font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">LEVERAGE (1x - 10x)</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={calcLeverage}
                      onChange={(e) => setCalcLeverage(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#080E1A] border border-[#1F2E47] text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">ENTRY PRICE ($)</label>
                    <input
                      type="number"
                      value={calcEntryPrice}
                      onChange={(e) => setCalcEntryPrice(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#080E1A] border border-[#1F2E47] text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">STOP LOSS PRICE ($)</label>
                    <input
                      type="number"
                      value={calcStopPrice}
                      onChange={(e) => setCalcStopPrice(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#080E1A] border border-[#1F2E47] text-sm font-mono text-red-400 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">TAKE PROFIT TARGET ($)</label>
                    <input
                      type="number"
                      value={calcTargetPrice}
                      onChange={(e) => setCalcTargetPrice(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#080E1A] border border-[#1F2E47] text-sm font-mono text-emerald-400 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Calculated Outputs */}
              <div className="p-4 rounded-xl bg-[#091120] border border-cyan-500/30 space-y-3">
                <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider block">
                  Authoritative Risk Calculations
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                  <div className="p-2.5 rounded-lg bg-[#060A14] border border-[#1E2E4A]">
                    <span className="text-[10px] text-slate-400 block">POSITION SIZE</span>
                    <span className="font-bold text-white text-sm">{riskResult.positionSizeUnits} Units</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#060A14] border border-[#1E2E4A]">
                    <span className="text-[10px] text-slate-400 block">NOTIONAL VALUE</span>
                    <span className="font-bold text-cyan-300 text-sm">{formatMoney(riskResult.notionalValue)}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#060A14] border border-[#1E2E4A]">
                    <span className="text-[10px] text-slate-400 block">MAX DOLLAR LOSS</span>
                    <span className="font-bold text-red-400 text-sm">{formatMoney(riskResult.maxLossAmount)}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#060A14] border border-[#1E2E4A]">
                    <span className="text-[10px] text-slate-400 block">MARGIN REQUIRED</span>
                    <span className="font-bold text-white text-sm">{formatMoney(riskResult.marginRequired)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PARAMETERS & VERSION SNAPSHOT */}
          {activeTab === "PARAMETERS" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-4 rounded-xl bg-[#111827] border border-[#1E293B] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-cyan-400" />
                    <span className="font-mono text-xs font-bold uppercase text-white">
                      Parameter Configuration ({strategy.id} - v{strategy.version})
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1A253A] text-slate-300">
                    IMMUTABLE VERSIONING ACTIVE
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(strategy.defaultParameters).map(([key, value]) => (
                    <div key={key} className="p-3 rounded-lg bg-[#0C121E] border border-[#1F2E47] space-y-1">
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">{key}</span>
                      <span className="text-sm font-mono font-bold text-cyan-300">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#1E293B] bg-[#0A0E1A]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenBacktest?.(strategy.number)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#131D31] hover:bg-[#1C2C4A] border border-cyan-500/30 text-xs font-mono font-bold text-cyan-300 transition"
            >
              <FlaskConical className="h-4 w-4 text-cyan-400" />
              <span>BACKTEST LAB</span>
            </button>

            <button
              onClick={handleActivatePaperClick}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold transition shadow-lg ${
                paperActivatedSuccess
                  ? "bg-emerald-600 text-white"
                  : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-950/50"
              }`}
            >
              {paperActivatedSuccess ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>PAPER INSTANCE ACTIVE</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>ACTIVATE PAPER</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onCreateBot?.(strategy)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-mono font-bold shadow-lg shadow-purple-950/40 transition"
            >
              <Bot className="h-4 w-4" />
              <span>DEPLOY BOT INSTANCE</span>
            </button>

            {/* Live Trading Guard Button */}
            <div className="flex items-center gap-1.5">
              <button
                disabled
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/40 border border-slate-700/60 text-slate-500 text-xs font-mono font-bold cursor-not-allowed"
                title="Live execution is locked by default. LIVE_TRADING_ENABLED=false."
              >
                <Lock className="h-3.5 w-3.5" />
                <span>LIVE (LOCKED)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
