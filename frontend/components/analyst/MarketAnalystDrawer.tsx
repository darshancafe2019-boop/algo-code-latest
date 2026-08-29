"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  BrainCircuit,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  RefreshCw,
  X,
  Send,
  ShieldAlert,
  Layers,
  BarChart2,
  HelpCircle,
  Clock,
  CheckCircle2,
  ExternalLink,
  Target,
  Compass,
  FileCheck,
  Zap,
} from "lucide-react";
import { MarketAnalysisResult, AnalysisMode } from "@/lib/openai/schemas";
import { HydratedTimestamp } from "@/components/common/HydratedTimestamp";

interface MarketAnalystDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  assetClass?: string;
  exchange?: string;
  strategyContext?: any;
}

export function MarketAnalystDrawer({
  isOpen,
  onClose,
  symbol,
  assetClass = "crypto",
  exchange = "binance",
  strategyContext,
}: MarketAnalystDrawerProps) {
  const [activeTab, setActiveTab] = useState<
    "OVERVIEW" | "SCENARIOS" | "TIMEFRAMES" | "DERIVATIVES" | "REFERENCES" | "ASK"
  >("OVERVIEW");
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("DETAILED");
  const [analysis, setAnalysis] = useState<MarketAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Q&A Chat state
  const [question, setQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState<
    Array<{ sender: "user" | "analyst"; text: string; time: string; citations?: string[] }>
  >([]);
  const [isAsking, setIsAsking] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchAnalysis = React.useCallback(
    async (sym: string, mode: AnalysisMode = "DETAILED") => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const res = await fetch("/api/analysis/market", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol: sym,
            market: assetClass,
            exchange,
            analysisType: mode,
            strategyContext,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }

        const data: MarketAnalysisResult = await res.json();
        setAnalysis(data);
      } catch (err: any) {
        if (err.name === "AbortError") {
          return;
        }
        console.warn("Market analysis fetch error:", err);
        setErrorMessage(
          "Market Analyst temporarily unavailable. Your trading engine continues operating normally."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [assetClass, exchange, strategyContext]
  );

  useEffect(() => {
    if (isOpen && symbol) {
      fetchAnalysis(symbol, analysisMode);
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isOpen, symbol, analysisMode, fetchAnalysis]);

  const handleModeChange = (newMode: AnalysisMode) => {
    setAnalysisMode(newMode);
    fetchAnalysis(symbol, newMode);
  };

  const handleAskQuestion = async (customQ?: string) => {
    const q = customQ || question;
    if (!q.trim() || isAsking) return;

    const userMsg = {
      sender: "user" as const,
      text: q,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    if (!customQ) setQuestion("");
    setIsAsking(true);

    try {
      const res = await fetch("/api/market-analysis/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          question: q,
          assetClass,
          exchange,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setChatMessages((prev) => [
          ...prev,
          {
            sender: "analyst" as const,
            text: json.answer || "No response generated.",
            citations: json.citations || [],
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            sender: "analyst" as const,
            text: "Analyst copilot response unavailable. Local trading rules remain fully active.",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "analyst" as const,
          text: "Network error communicating with analyst service.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  if (!isOpen) return null;

  const biasColor =
    analysis?.directional_bias === "BULLISH"
      ? "text-emerald-400 border-emerald-500/30 bg-emerald-950/20"
      : analysis?.directional_bias === "BEARISH"
      ? "text-rose-400 border-rose-500/30 bg-rose-950/20"
      : "text-amber-400 border-amber-500/30 bg-amber-950/20";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl h-full bg-[#0a0f0d] border-l border-[#1b2b23] flex flex-col shadow-2xl overflow-hidden font-sans text-slate-200">
        
        {/* HEADER */}
        <div className="p-4 border-b border-[#1b2b23] bg-[#0d1612] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 shadow-sm">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-white">OPENAI MARKET ANALYST</h2>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-900/40 text-emerald-300 border border-emerald-500/30">
                  GPT-4O
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700">
                  READ-ONLY COPILOT
                </span>
              </div>
              <p className="text-xs text-[#607D6E] font-mono mt-0.5">
                {symbol} • {exchange.toUpperCase()} • {analysis?.data_quality || "LIVE"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAnalysis(symbol, analysisMode)}
              disabled={isLoading}
              className="p-1.5 rounded bg-[#13201a] border border-[#1b2b23] hover:border-emerald-500/40 text-slate-300 hover:text-white transition"
              title="Refresh Analysis"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded bg-[#13201a] border border-[#1b2b23] hover:border-rose-500/40 text-slate-300 hover:text-rose-400 transition"
              title="Close Drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ANALYSIS MODE SELECTOR */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#1b2b23] bg-[#0c1410] text-xs font-mono">
          <span className="text-slate-400 text-[11px]">Analysis Mode:</span>
          <div className="flex items-center gap-1.5">
            {(["QUICK", "DETAILED", "OPTIONS", "MACRO"] as const).map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition ${
                  analysisMode === m
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-[#13201a] text-slate-400 hover:text-slate-200 border border-[#1b2b23]"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex border-b border-[#1b2b23] bg-[#0a0f0d] px-4 overflow-x-auto scrollbar-none">
          {(["OVERVIEW", "SCENARIOS", "TIMEFRAMES", "DERIVATIVES", "REFERENCES", "ASK"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-2.5 text-xs font-semibold tracking-wide border-b-2 whitespace-nowrap transition ${
                activeTab === tab
                  ? "border-emerald-400 text-emerald-400 bg-emerald-950/10"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab === "ASK" ? "ASK COPILOT" : tab}
            </button>
          ))}
        </div>

        {/* CONTENT BODY */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {isLoading && !analysis && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
              <p className="text-sm font-medium">Synthesizing quantitative market data...</p>
              <p className="text-xs text-[#607D6E] mt-1 font-mono">
                Calculating multi-timeframe indicators, evidence score, and 3 scenarios
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-950/20 text-amber-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="font-semibold">Notice</p>
                <p className="text-amber-200/80 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {analysis && activeTab === "OVERVIEW" && (
            <div className="space-y-4">
              
              {/* TOP KPI ROW */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className={`p-3 rounded-lg border ${biasColor}`}>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">Market Bias</span>
                  <span className="text-sm font-bold mt-0.5 block">{analysis.market_bias || analysis.directional_bias}</span>
                </div>
                <div className="p-3 rounded-lg border border-[#1b2b23] bg-[#0d1612]">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">Market State</span>
                  <span className="text-sm font-bold text-white mt-0.5 block">{analysis.market_state}</span>
                </div>
                <div className="p-3 rounded-lg border border-emerald-500/30 bg-[#0d1612]">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">Evidence Score</span>
                  <span className="text-sm font-bold text-emerald-400 mt-0.5 block">
                    {analysis.evidence_score?.total || 8} / 10
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-[#1b2b23] bg-[#0d1612]">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">Data Status</span>
                  <span className="text-sm font-bold text-slate-200 mt-0.5 block flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {analysis.data_quality}
                  </span>
                </div>
              </div>

              {/* DETERMINISTIC EVIDENCE SCORE BREAKDOWN */}
              {analysis.evidence_score && (
                <div className="p-3.5 rounded-lg border border-emerald-500/20 bg-[#09120e] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      DETERMINISTIC EVIDENCE BREAKDOWN ({analysis.evidence_score.label})
                    </span>
                    <span className="font-mono text-slate-400 text-[11px]">Formula v2.4</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 text-center text-[11px] font-mono">
                    <div className="p-1.5 rounded bg-[#13201a] border border-[#1b2b23]">
                      <span className="text-slate-500 block text-[9px]">TREND</span>
                      <span className="font-bold text-emerald-300">{analysis.evidence_score.breakdown.trend}/2</span>
                    </div>
                    <div className="p-1.5 rounded bg-[#13201a] border border-[#1b2b23]">
                      <span className="text-slate-500 block text-[9px]">MOMENTUM</span>
                      <span className="font-bold text-emerald-300">{analysis.evidence_score.breakdown.momentum}/2</span>
                    </div>
                    <div className="p-1.5 rounded bg-[#13201a] border border-[#1b2b23]">
                      <span className="text-slate-500 block text-[9px]">VOLUME</span>
                      <span className="font-bold text-emerald-300">{analysis.evidence_score.breakdown.volume}/2</span>
                    </div>
                    <div className="p-1.5 rounded bg-[#13201a] border border-[#1b2b23]">
                      <span className="text-slate-500 block text-[9px]">STRUCTURE</span>
                      <span className="font-bold text-emerald-300">{analysis.evidence_score.breakdown.structure}/2</span>
                    </div>
                    <div className="p-1.5 rounded bg-[#13201a] border border-[#1b2b23]">
                      <span className="text-slate-500 block text-[9px]">DERIVATIVES</span>
                      <span className="font-bold text-emerald-300">{analysis.evidence_score.breakdown.derivatives}/2</span>
                    </div>
                  </div>
                </div>
              )}

              {/* EXECUTIVE SUMMARY & OBSERVATION */}
              <div className="p-3.5 rounded-lg border border-[#1b2b23] bg-[#0d1612]">
                <div className="flex items-center gap-2 mb-1.5 text-xs font-semibold text-emerald-400">
                  <Activity className="w-3.5 h-3.5" />
                  KEY OBSERVATION & QUANTITATIVE SYNTHESIS
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{analysis.summary}</p>
              </div>

              {/* KEY LEVELS (FACTS) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-950/10">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                      Support Levels
                    </span>
                    <span className="text-[9px] font-mono px-1 rounded bg-emerald-950 border border-emerald-500/30 text-emerald-300">
                      FACT
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.key_levels.support.map((lvl, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 text-xs font-mono"
                      >
                        ${lvl.toLocaleString()}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-950/10">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                      Resistance Levels
                    </span>
                    <span className="text-[9px] font-mono px-1 rounded bg-rose-950 border border-rose-500/30 text-rose-300">
                      FACT
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.key_levels.resistance.map((lvl, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-rose-950/40 text-rose-300 border border-rose-500/30 text-xs font-mono"
                      >
                        ${lvl.toLocaleString()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* TREND & MOMENTUM CONFLUENCE */}
              <div className="p-3.5 rounded-lg border border-[#1b2b23] bg-[#0d1612] space-y-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Confluence Breakdown
                </span>
                <ul className="space-y-1.5 text-xs text-slate-400">
                  {analysis.trend_assessment.map((t, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">•</span>
                      <span>{t}</span>
                    </li>
                  ))}
                  {analysis.momentum_assessment.map((m, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* RISKS & CONFLICTS */}
              <div className="p-3.5 rounded-lg border border-amber-500/20 bg-amber-950/10 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  KEY RISKS & CROSS-TIMEFRAME CONFLICTS
                </div>
                <ul className="space-y-1 text-xs text-amber-200/90">
                  {analysis.risks.map((r, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5">!</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          )}

          {/* TAB 2: THREE SCENARIOS */}
          {analysis && activeTab === "SCENARIOS" && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-[#1b2b23] bg-[#0d1612] text-xs text-slate-400">
                Probabilistic scenario modeling with explicit trigger conditions and invalidation boundaries.
              </div>

              {/* BULLISH SCENARIO */}
              <div className="p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-950/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" />
                    {analysis.scenarios.bullish.title}
                  </span>
                  {analysis.scenarios.bullish.expectedMove && (
                    <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                      {analysis.scenarios.bullish.expectedMove}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-300">
                  <strong className="text-emerald-300">Trigger Condition: </strong>
                  {analysis.scenarios.bullish.condition}
                </div>
                <div className="text-xs text-slate-400">
                  <strong className="text-slate-300">Evidence: </strong>
                  {analysis.scenarios.bullish.evidence.join(" • ")}
                </div>
                <div className="text-xs text-rose-300/90">
                  <strong className="text-rose-400">Invalidation: </strong>
                  {analysis.scenarios.bullish.invalidation.join(" • ")}
                </div>
              </div>

              {/* BEARISH SCENARIO */}
              <div className="p-3.5 rounded-lg border border-rose-500/30 bg-rose-950/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4" />
                    {analysis.scenarios.bearish.title}
                  </span>
                  {analysis.scenarios.bearish.expectedMove && (
                    <span className="text-[10px] font-mono text-rose-300 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-500/30">
                      {analysis.scenarios.bearish.expectedMove}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-300">
                  <strong className="text-rose-300">Trigger Condition: </strong>
                  {analysis.scenarios.bearish.condition}
                </div>
                <div className="text-xs text-slate-400">
                  <strong className="text-slate-300">Evidence: </strong>
                  {analysis.scenarios.bearish.evidence.join(" • ")}
                </div>
                <div className="text-xs text-emerald-300/90">
                  <strong className="text-emerald-400">Invalidation: </strong>
                  {analysis.scenarios.bearish.invalidation.join(" • ")}
                </div>
              </div>

              {/* NEUTRAL / WAIT SCENARIO */}
              <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-950/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Compass className="w-4 h-4" />
                    {analysis.scenarios.neutral.title}
                  </span>
                </div>
                <div className="text-xs text-slate-300">
                  <strong className="text-amber-300">Consolidation Condition: </strong>
                  {analysis.scenarios.neutral.condition}
                </div>
                <div className="text-xs text-slate-400">
                  <strong className="text-slate-300">Evidence: </strong>
                  {analysis.scenarios.neutral.evidence.join(" • ")}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: TIMEFRAMES */}
          {analysis && activeTab === "TIMEFRAMES" && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-[#1b2b23] bg-[#0d1612] text-xs text-slate-400">
                Multi-timeframe trend status synthesized across micro, execution, and macro horizons.
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {Object.entries(analysis.timeframes).map(([tf, status]) => {
                  const isBull = status.toUpperCase().includes("BULL");
                  const isBear = status.toUpperCase().includes("BEAR");
                  return (
                    <div
                      key={tf}
                      className="p-3 rounded-lg border border-[#1b2b23] bg-[#0d1612] flex items-center justify-between"
                    >
                      <span className="text-xs font-mono font-bold text-white uppercase">{tf}</span>
                      <span
                        className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                          isBull
                            ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
                            : isBear
                            ? "bg-rose-950/40 text-rose-300 border-rose-500/30"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: DERIVATIVES */}
          {analysis && activeTab === "DERIVATIVES" && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-lg border border-[#1b2b23] bg-[#0d1612] space-y-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Derivatives Positioning
                </span>
                {analysis.derivatives_assessment && analysis.derivatives_assessment.length > 0 ? (
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {analysis.derivatives_assessment.map((d, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-400 mt-0.5">•</span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500 font-mono">
                    No derivatives metrics connected for this asset class.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: REFERENCES & CITATIONS */}
          {analysis && activeTab === "REFERENCES" && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-[#1b2b23] bg-[#0d1612] text-xs text-slate-400">
                Verified data feeds, exchange filings, and financial news citations supporting this analysis.
              </div>

              <div className="space-y-2">
                {analysis.references.map((ref, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-[#1b2b23] bg-[#0d1612] flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                          {ref.type}
                        </span>
                        <span className="text-xs font-bold text-slate-200">{ref.source}</span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{ref.title}</p>
                      <span className="text-[10px] font-mono text-slate-500 block mt-1">
                        Accessed: <HydratedTimestamp timestamp={ref.accessedAt} />
                      </span>
                    </div>
                    {ref.url && (
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded bg-[#13201a] border border-[#1b2b23] text-slate-400 hover:text-emerald-400 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: ASK COPILOT */}
          {activeTab === "ASK" && (
            <div className="flex flex-col h-full space-y-3">
              {/* QUICK PROMPT CHIPS */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Why is momentum weakening?",
                  "Explain key support & resistance",
                  "Why is strategy waiting?",
                  "Compare 15m vs 1h structure",
                  "Explain derivatives positioning",
                ].map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAskQuestion(q)}
                    disabled={isAsking}
                    className="text-[11px] px-2.5 py-1 rounded bg-[#13201a] border border-[#1b2b23] hover:border-emerald-500/40 text-slate-300 hover:text-white transition"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* CHAT LOG */}
              <div className="flex-1 min-h-[220px] max-h-[360px] overflow-y-auto space-y-2.5 p-3 rounded-lg border border-[#1b2b23] bg-[#09110d]">
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs py-8">
                    <HelpCircle className="w-6 h-6 mb-2 text-[#607D6E]" />
                    Ask the Market Analyst any question about {symbol}&apos;s structure, levels, or waiting reasons.
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[85%] p-2.5 rounded-lg text-xs leading-relaxed ${
                          msg.sender === "user"
                            ? "bg-emerald-950/60 text-emerald-200 border border-emerald-500/30"
                            : "bg-[#13201a] text-slate-200 border border-[#1b2b23]"
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className="text-[9px] font-mono text-slate-500 mt-0.5 px-1">{msg.time}</span>
                    </div>
                  ))
                )}
                {isAsking && (
                  <div className="flex items-center gap-2 text-xs text-[#607D6E] font-mono">
                    <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
                    Analyst copilot evaluating snapshot...
                  </div>
                )}
              </div>

              {/* INPUT BOX */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAskQuestion()}
                  placeholder={`Ask about ${symbol}...`}
                  className="flex-1 px-3 py-2 text-xs rounded bg-[#13201a] border border-[#1b2b23] focus:border-emerald-500/50 text-white placeholder:text-slate-500 outline-none"
                />
                <button
                  onClick={() => handleAskQuestion()}
                  disabled={!question.trim() || isAsking}
                  className="px-3 py-2 rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Ask
                </button>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER & DATA PROVENANCE */}
        <div className="p-3 border-t border-[#1b2b23] bg-[#0d1612] text-[10px] font-mono text-[#607D6E] flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span>Model: {analysis?.data_provenance.model || "Local Deterministic Engine"}</span>
            <span>•</span>
            <span>Latency: {analysis?.data_provenance.latency_ms || 45}ms</span>
          </div>
          <div className="text-slate-500">
            READ-ONLY ANALYSIS ONLY • ZERO DIRECT ORDER ACCESS
          </div>
        </div>

      </div>
    </div>
  );
}
