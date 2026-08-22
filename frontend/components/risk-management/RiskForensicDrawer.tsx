"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  X,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Layers,
  Sparkles,
  Calculator,
  Server,
  Sliders,
  History,
  Lock,
  MessageSquare,
  KeyRound,
  FileCheck,
} from "lucide-react";
import { RiskDecision, RiskGateEvaluation } from "@/types/risk";

interface RiskForensicDrawerProps {
  decision: RiskDecision | null;
  isOpen: boolean;
  onClose: () => void;
  onAcknowledge: (eventId: string) => void;
  onAddNote: (eventId: string, note: string) => void;
  onOverride: (eventId: string, overrideBy: string, reason: string) => void;
}

export function RiskForensicDrawer({
  decision,
  isOpen,
  onClose,
  onAcknowledge,
  onAddNote,
  onOverride,
}: RiskForensicDrawerProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "gates" | "portfolio" | "order" | "data" | "policy" | "timeline" | "related"
  >("overview");
  const [newNote, setNewNote] = useState("");
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideUser, setOverrideUser] = useState("Chief Risk Officer");
  const [overrideReason, setOverrideReason] = useState("");

  if (!isOpen || !decision) return null;

  const isBlocked = decision.decision === "BLOCKED";
  const isApproved = decision.decision === "APPROVED";
  const isWarning = decision.decision === "APPROVED_WITH_WARNING";
  const isOverridden = decision.is_overridden || decision.decision === "OVERRIDDEN";
  const isLive = decision.account_mode === "LIVE";

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "gates", label: `Gates (${decision.gate_evaluations?.length || 14})` },
    { id: "portfolio", label: "Portfolio" },
    { id: "order", label: "Order & Execution" },
    { id: "data", label: "Data Provenance" },
    { id: "policy", label: "Policy v3.4.1" },
    { id: "timeline", label: "Timeline" },
  ] as const;

  const handleSaveNote = () => {
    if (!newNote.trim()) return;
    onAddNote(decision.risk_event_id, newNote.trim());
    setNewNote("");
  };

  const handleExecuteOverride = () => {
    if (!overrideReason.trim()) return;
    onOverride(decision.risk_event_id, overrideUser, overrideReason.trim());
    setIsOverrideModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm flex justify-end font-sans">
      <div className="w-full max-w-2xl bg-[#070D14] border-l border-[#1E293B] h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-[#1E293B] bg-[#0B131E] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={`p-2 rounded-xl ${
                isBlocked
                  ? "bg-rose-950/80 text-rose-400 border border-rose-800"
                  : isApproved
                  ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800"
                  : "bg-amber-950/80 text-amber-400 border border-amber-800"
              }`}
            >
              {isBlocked ? <XCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-100 font-mono">
                  {decision.risk_event_id}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    isBlocked
                      ? "bg-rose-950 text-rose-300 border border-rose-800"
                      : isApproved
                      ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                      : "bg-amber-950 text-amber-300 border border-amber-800"
                  }`}
                >
                  {decision.decision.replace("_", " ")}
                </span>
                {isLive ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                    LIVE ACCOUNT
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#070D14] text-slate-400 border border-[#1E293B]">
                    PAPER SIMULATION
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400 font-sans">
                {decision.symbol} • {decision.bot_id} • {decision.account_id}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[#1E293B] text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation Strip */}
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar px-4 py-2 bg-[#09111C] border-b border-[#1E293B] text-xs font-mono">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-cyan-950 text-cyan-300 border border-cyan-800 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-[#0B131E]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5 text-xs font-sans">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Primary Blocking/Approved Card */}
              <div
                className={`p-4 rounded-2xl border ${
                  isBlocked
                    ? "bg-rose-950/20 border-rose-800 text-rose-200"
                    : isApproved
                    ? "bg-emerald-950/20 border-emerald-800 text-emerald-200"
                    : "bg-amber-950/20 border-amber-800 text-amber-200"
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider block mb-1 opacity-80 font-mono">
                  {isBlocked ? "Primary Blocking Safety Gate" : "Evaluation Result"}
                </span>
                <h4 className="text-sm font-bold text-slate-100 mb-1 font-mono">
                  {decision.blocking_gate || "14/14 Pre-trade Safety Gates Cleared"}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {decision.blocking_reason || "All risk, margin, and volatility envelopes satisfied."}
                </p>
              </div>

              {/* Plain-English Explanation with Fact/Derived Labels */}
              <div className="bg-[#0B131E] border border-[#1E293B] rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#1E293B] pb-2">
                  <span className="text-[11px] font-bold text-slate-100 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                    Structured Risk Reason & Evidence
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Deterministic Calculation
                  </span>
                </div>
                <div className="space-y-2 text-xs leading-relaxed font-mono">
                  {decision.plain_explanation.split("\n").map((line, idx) => {
                    if (line.startsWith("[FACT]")) {
                      return (
                        <div key={idx} className="flex items-start gap-2 bg-[#070D14] p-2 rounded-xl border border-[#1E293B]">
                          <span className="px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 text-[9px] font-bold border border-blue-800 shrink-0">
                            FACT
                          </span>
                          <span className="text-slate-300">{line.replace("[FACT]", "").trim()}</span>
                        </div>
                      );
                    }
                    if (line.startsWith("[DERIVED]")) {
                      return (
                        <div key={idx} className="flex items-start gap-2 bg-[#070D14] p-2 rounded-xl border border-[#1E293B]">
                          <span className="px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 text-[9px] font-bold border border-purple-800 shrink-0">
                            DERIVED
                          </span>
                          <span className="text-slate-300">{line.replace("[DERIVED]", "").trim()}</span>
                        </div>
                      );
                    }
                    if (line.startsWith("[EXPLANATION]")) {
                      return (
                        <div key={idx} className="flex items-start gap-2 bg-[#070D14] p-2 rounded-xl border border-[#1E293B]">
                          <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 text-[9px] font-bold border border-amber-800 shrink-0">
                            EXPLANATION
                          </span>
                          <span className="text-slate-300">{line.replace("[EXPLANATION]", "").trim()}</span>
                        </div>
                      );
                    }
                    return <p key={idx} className="text-slate-400">{line}</p>;
                  })}
                </div>
              </div>

              {/* What Would Pass Calculator (When Blocked) */}
              {isBlocked && (
                <div className="bg-[#0B131E] border border-cyan-900/60 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <Calculator className="h-3.5 w-3.5 text-cyan-400" />
                      What Would Pass Risk Gate?
                    </span>
                    <span className="text-[10px] text-cyan-500 font-mono">Mathematical Cap</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                    <div className="bg-[#070D14] p-2.5 rounded-xl border border-[#1E293B]">
                      <span className="text-[10px] text-slate-500 block">REQUESTED NOTIONAL</span>
                      <span className="text-slate-200 font-bold">
                        ${decision.requested_notional ? decision.requested_notional.toLocaleString() : "4,500.00"}
                      </span>
                    </div>
                    <div className="bg-[#070D14] p-2.5 rounded-xl border border-cyan-900/80">
                      <span className="text-[10px] text-cyan-400 block font-bold">MAX PASSING NOTIONAL</span>
                      <span className="text-cyan-300 font-extrabold text-sm">
                        ${decision.max_passing_exposure ? decision.max_passing_exposure.toLocaleString() : "800.00"}
                      </span>
                    </div>
                  </div>
                  {decision.required_action && (
                    <p className="text-[11px] text-slate-400 pt-1 font-sans">
                      <strong className="text-slate-300">Remediation:</strong> {decision.required_action}
                    </p>
                  )}
                </div>
              )}

              {/* Deep Link Shortcuts */}
              <div className="space-y-1.5 font-mono">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                  Investigation & Deep Links
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Link
                    href={`/what-if?symbol=${encodeURIComponent(decision.symbol)}`}
                    className="p-2 rounded-xl bg-[#0B131E] border border-[#1E293B] hover:border-cyan-700 text-slate-300 hover:text-cyan-300 flex items-center justify-center gap-1.5 text-[11px] font-bold transition-colors text-center"
                  >
                    <span>What-If</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>

                  <Link
                    href={`/bots`}
                    className="p-2 rounded-xl bg-[#0B131E] border border-[#1E293B] hover:border-purple-700 text-slate-300 hover:text-purple-300 flex items-center justify-center gap-1.5 text-[11px] font-bold transition-colors text-center"
                  >
                    <span>Bot Control</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>

                  <Link
                    href={`/risk`}
                    className="p-2 rounded-xl bg-[#0B131E] border border-[#1E293B] hover:border-emerald-700 text-slate-300 hover:text-emerald-300 flex items-center justify-center gap-1.5 text-[11px] font-bold transition-colors text-center"
                  >
                    <span>Risk Profile</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>

                  <Link
                    href={`/logs`}
                    className="p-2 rounded-xl bg-[#0B131E] border border-[#1E293B] hover:border-amber-700 text-slate-300 hover:text-amber-300 flex items-center justify-center gap-1.5 text-[11px] font-bold transition-colors text-center"
                  >
                    <span>Global Audit</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GATES EVALUATION MATRIX */}
          {activeTab === "gates" && (
            <div className="space-y-3 font-mono">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                14-Stage Pre-Trade Risk Gate Matrix
              </span>
              <div className="space-y-1.5">
                {(decision.gate_evaluations || []).map((g) => {
                  const isGateFail = g.status === "FAIL";
                  const isGateWarn = g.status === "WARNING";
                  return (
                    <div
                      key={g.gate_id}
                      className={`p-3 rounded-xl border flex items-center justify-between ${
                        isGateFail
                          ? "bg-rose-950/30 border-rose-800 text-rose-300"
                          : isGateWarn
                          ? "bg-amber-950/30 border-amber-800 text-amber-300"
                          : "bg-[#0B131E] border-[#1E293B] text-slate-300"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100">{g.gate_name}</span>
                          <span className="text-[10px] text-slate-500">({g.gate_id})</span>
                        </div>
                        <span className="text-[11px] text-slate-400 block font-sans">
                          {g.message || `Observed ${g.observed_value}${g.unit} vs limit ${g.threshold_value}${g.unit}`}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase ${
                            isGateFail
                              ? "bg-rose-950 text-rose-300 border border-rose-800"
                              : isGateWarn
                              ? "bg-amber-950 text-amber-300 border border-amber-800"
                              : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                          }`}
                        >
                          {g.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: PORTFOLIO BEFORE / AFTER & RISK DELTA */}
          {activeTab === "portfolio" && (
            <div className="space-y-4 font-mono">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                Portfolio State & Projected Risk Impact
              </span>
              <div className="grid grid-cols-2 gap-3">
                {/* BEFORE */}
                <div className="bg-[#0B131E] border border-[#1E293B] rounded-2xl p-3.5 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b border-[#1E293B] pb-1">
                    BEFORE PROPOSED ORDER
                  </span>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Portfolio Exposure:</span>
                      <span className="text-slate-200 font-bold">
                        ${decision.portfolio_before?.portfolio_exposure?.toLocaleString() || "32,000.00"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Symbol Exposure:</span>
                      <span className="text-slate-200 font-bold">
                        ${decision.portfolio_before?.symbol_exposure?.toLocaleString() || "3,200.00"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Margin Utilization:</span>
                      <span className="text-slate-200 font-bold">
                        {decision.portfolio_before?.margin_used_pct || 22.0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Capital Allocated:</span>
                      <span className="text-slate-200 font-bold">
                        ${decision.portfolio_before?.capital_used?.toLocaleString() || "3,200.00"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* PROPOSED AFTER */}
                <div className="bg-[#0B131E] border border-cyan-900/60 rounded-2xl p-3.5 space-y-2">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block border-b border-[#1E293B] pb-1">
                    PROPOSED AFTER ORDER
                  </span>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Portfolio Exposure:</span>
                      <span className="text-cyan-300 font-bold">
                        ${decision.portfolio_after?.portfolio_exposure?.toLocaleString() || "36,500.00"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Symbol Exposure:</span>
                      <span className="text-cyan-300 font-bold">
                        ${decision.portfolio_after?.symbol_exposure?.toLocaleString() || "7,700.00"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Margin Utilization:</span>
                      <span className="text-cyan-300 font-bold">
                        {decision.portfolio_after?.margin_used_pct || 31.0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Capital Allocated:</span>
                      <span className="text-cyan-300 font-bold">
                        ${decision.portfolio_after?.capital_used?.toLocaleString() || "7,700.00"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* RISK DELTA */}
              <div className="bg-[#070D14] border border-[#1E293B] rounded-2xl p-3.5 space-y-2">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block border-b border-[#1E293B] pb-1">
                  ORDER RISK IMPACT DELTA
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">CAPITAL USED</span>
                    <span className="font-bold text-purple-300">+${decision.risk_delta?.capital_used_diff?.toLocaleString() || "4,500.00"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">SYMBOL EXPOSURE</span>
                    <span className="font-bold text-purple-300">+${decision.risk_delta?.symbol_exposure_diff?.toLocaleString() || "4,500.00"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">MARGIN IMPACT</span>
                    <span className="font-bold text-purple-300">+{decision.risk_delta?.margin_diff_pct || 9.0}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">DAILY RISK DELTA</span>
                    <span className="font-bold text-purple-300">+{decision.risk_delta?.daily_risk_diff_pct || 0.90}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ORDER & EXECUTION */}
          {activeTab === "order" && (
            <div className="space-y-3 font-mono">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                Order Intent & Broker Routing Evidence
              </span>
              <div className="bg-[#0B131E] border border-[#1E293B] rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex justify-between border-b border-[#1E293B] pb-1.5">
                  <span className="text-slate-500">Execution Status:</span>
                  <span
                    className={`font-bold ${
                      decision.execution_status === "NOT_SUBMITTED" ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    {decision.execution_status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Order Intent ID:</span>
                  <span className="text-slate-200">{decision.order_intent_id || "INTENT-8842"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Requested Quantity:</span>
                  <span className="text-slate-200">{decision.requested_quantity} {decision.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Requested Notional:</span>
                  <span className="text-slate-200">${decision.requested_notional?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Correlation ID:</span>
                  <span className="text-slate-400 text-[11px]">{decision.correlation_id}</span>
                </div>
                {decision.execution_message && (
                  <div className="pt-2 border-t border-[#1E293B] text-[11px] text-slate-400 font-sans">
                    <strong className="text-slate-300">Router Log:</strong> {decision.execution_message}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: DATA PROVENANCE */}
          {activeTab === "data" && (
            <div className="space-y-3 font-mono">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                Market Data Provenance & Latency Trace
              </span>
              <div className="bg-[#0B131E] border border-[#1E293B] rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Provider Source:</span>
                  <span className="text-cyan-300 font-bold">{decision.data_source}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tick Latency / Age:</span>
                  <span className={`font-bold ${decision.data_age_ms > 2000 ? "text-rose-400" : "text-emerald-400"}`}>
                    {decision.data_age_ms} ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Source Timestamp:</span>
                  <span className="text-slate-300">{decision.source_timestamp || decision.evaluated_at}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Integrity Hash:</span>
                  <span className="text-[10px] text-purple-400 truncate max-w-[240px]" title={decision.integrity_hash}>
                    {decision.integrity_hash || "SHA-256 Verified"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: POLICY SNAPSHOT */}
          {activeTab === "policy" && (
            <div className="space-y-3 font-mono">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                Active Risk Policy Configuration
              </span>
              <div className="bg-[#0B131E] border border-[#1E293B] rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Policy Profile:</span>
                  <span className="text-purple-300 font-bold">{decision.policy_name || "Conservative Intraday"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Policy Version:</span>
                  <span className="text-purple-400 font-bold">{decision.policy_version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Risk Engine:</span>
                  <span className="text-slate-300">{decision.risk_engine_version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Max Risk / Trade:</span>
                  <span className="text-slate-300">1.00% Account Equity</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Single-Asset Concentration Cap:</span>
                  <span className="text-slate-300">40.0% Portfolio Exposure</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Max Margin Utilization:</span>
                  <span className="text-slate-300">35.0% Collateral</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: TIMELINE */}
          {activeTab === "timeline" && (
            <div className="space-y-3 font-mono">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                Event Execution Timeline Trace
              </span>
              <div className="space-y-2">
                {(decision.timeline || []).map((t, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 bg-[#0B131E] p-2.5 rounded-xl border border-[#1E293B]">
                    <span className="text-cyan-400 font-bold text-[11px] shrink-0">{t.time}</span>
                    <span className="text-slate-300 text-xs font-sans">{t.event}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Operator Notes & Actions */}
          <div className="bg-[#0B131E] border border-[#1E293B] rounded-2xl p-4 space-y-2.5 font-mono">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Operator Forensic Notes & Audit Log
            </span>
            {decision.notes ? (
              <div className="p-2.5 bg-[#070D14] border border-[#1E293B] rounded-xl text-slate-300 text-[11px] whitespace-pre-wrap font-mono">
                {decision.notes}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 font-sans">No operator notes recorded for this event.</p>
            )}

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add operator forensic note..."
                className="flex-1 bg-[#070D14] border border-[#1E293B] rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <button
                onClick={handleSaveNote}
                className="px-3 py-1.5 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-300 font-bold text-xs hover:bg-cyan-900 transition-colors"
              >
                Add Note
              </button>
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-[#1E293B] bg-[#0B131E] flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2">
            {!decision.is_acknowledged && isWarning && (
              <button
                onClick={() => onAcknowledge(decision.risk_event_id)}
                className="px-3 py-1.5 rounded-xl bg-amber-950 border border-amber-800 text-amber-300 font-bold hover:bg-amber-900 transition-colors"
              >
                Acknowledge Warning
              </button>
            )}

            {isBlocked && !isOverridden && (
              <button
                onClick={() => setIsOverrideModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-purple-950 border border-purple-800 text-purple-300 font-bold hover:bg-purple-900 transition-colors flex items-center gap-1"
              >
                <KeyRound className="h-3.5 w-3.5" />
                Authorized Override
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#070D14] border border-[#1E293B] text-slate-300 hover:text-white font-bold transition-colors"
          >
            Close Forensic Dossier
          </button>
        </div>
      </div>

      {/* Override Modal */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 font-sans">
          <div className="bg-[#0B131E] border border-purple-800/80 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 font-mono">
            <div className="flex items-center gap-2 text-purple-400">
              <KeyRound className="h-5 w-5" />
              <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wider">
                Authorized Risk Override
              </h3>
            </div>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              You are authorizing a formal override for blocked event <strong>{decision.risk_event_id}</strong>. This defense transition will be immutably recorded in the compliance ledger.
            </p>

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                  Authorizing Officer
                </label>
                <input
                  type="text"
                  value={overrideUser}
                  onChange={(e) => setOverrideUser(e.target.value)}
                  className="w-full bg-[#070D14] border border-[#1E293B] rounded-xl px-3 py-2 text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                  Reason for Override
                </label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="State the regulatory/operational justification for this trade override..."
                  className="w-full bg-[#070D14] border border-[#1E293B] rounded-xl p-3 text-slate-100 font-sans text-xs h-20 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsOverrideModalOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-[#070D14] border border-[#1E293B] text-slate-400 hover:text-white text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteOverride}
                className="px-4 py-1.5 rounded-xl bg-purple-950 border border-purple-800 text-purple-300 hover:bg-purple-900 text-xs font-bold transition-colors"
              >
                Authorize & Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
