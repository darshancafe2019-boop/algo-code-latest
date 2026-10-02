"use client";

import { formatMoney } from "@/lib/formatters";
import React from "react";
import {
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";

export interface DecisionRecord {
  decision_id: string;
  run_id: string;
  checkpoint_id: string;
  timestamp: string;
  symbol: string;
  exchange: string;
  provider: string;
  action: string;
  strategy: string;
  entry_price: number;
  quantity: number;
  stop_loss: number;
  take_profit: number;
  time_in_force: string;
  confidence: number;
  reason: string;
  market_regime: string;
  risk_status: string;
  risk_score: number;
  risk_reasons: string[];
  approval_status: string;
  approved_by: string;
  execution_mode: string;
  execution_status: string;
}

interface AiDecisionPanelProps {
  decisions: DecisionRecord[];
  onApprove: (decisionId: string) => void;
  onReject: (decisionId: string) => void;
  isLoading: boolean;
}

export const AiDecisionPanel: React.FC<AiDecisionPanelProps> = ({
  decisions,
  onApprove,
  onReject,
  isLoading,
}) => {
  return (
    <div className="bg-[#0B0E17]/95 border border-[#1A2A3F] rounded-xl p-4 shadow-lg mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            AI Strategy Agent — Trade Proposals & Decisions
          </h2>
        </div>
        <div className="text-[11px] font-mono text-amber-400/90 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded">
          ⚠️ Confidence is informational only. AI does NOT call broker APIs directly.
        </div>
      </div>

      {decisions.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs font-mono">
          No AI trade proposals recorded yet. Trigger a checkpoint to analyze markets.
        </div>
      ) : (
        <div className="space-y-3">
          {decisions.slice(0, 10).map((dec) => {
            const isBuy = dec.action === "BUY";
            const isApproved = dec.risk_status === "APPROVED";
            const isPendingApproval = dec.approval_status === "PENDING";
            const isExecuted = dec.execution_status === "FILLED";

            return (
              <div
                key={dec.decision_id}
                className={`bg-slate-900/60 border rounded-xl p-4 transition-all ${
                  isApproved ? "border-slate-800 hover:border-cyan-500/40" : "border-rose-900/30"
                }`}
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 mb-2">
                  {/* Symbol & Action */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`flex items-center gap-1 font-bold text-xs px-2.5 py-1 rounded border ${
                        isBuy
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                      }`}
                    >
                      {isBuy ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                      {dec.action} {dec.symbol}
                    </span>

                    <span className="text-xs font-mono text-slate-400 font-semibold">
                      {dec.exchange}
                    </span>

                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {dec.strategy}
                    </span>

                    <span className="text-[11px] font-mono text-slate-400">
                      Checkpoint: <strong className="text-slate-300">{dec.checkpoint_id}</strong>
                    </span>
                  </div>

                  {/* Risk Gate Verdict */}
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span
                      className={`flex items-center gap-1 font-bold px-2 py-0.5 rounded border ${
                        isApproved
                          ? "bg-emerald-950/80 border-emerald-800 text-emerald-400"
                          : "bg-rose-950/80 border-rose-800 text-rose-400"
                      }`}
                    >
                      {isApproved ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                      RISK {dec.risk_status}
                    </span>

                    <span className="text-[11px] text-cyan-400 font-semibold px-2 py-0.5 bg-cyan-950/60 border border-cyan-800 rounded">
                      Confidence: {(dec.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Price, SL, TP, Quantity Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 text-xs font-mono">
                  <div>
                    <span className="text-slate-400 text-[10px] block">ENTRY</span>
                    <span className="text-white font-bold">{formatMoney(dec.entry_price, "₹")}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">STOP LOSS</span>
                    <span className="text-rose-400 font-bold">{formatMoney(dec.stop_loss, "₹")}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">TARGET (TP)</span>
                    <span className="text-emerald-400 font-bold">{formatMoney(dec.take_profit, "₹")}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">QUANTITY</span>
                    <span className="text-cyan-400 font-bold">{dec.quantity}</span>
                  </div>
                </div>

                {/* Rationale & Reasons */}
                <div className="text-xs text-slate-300 my-2 leading-relaxed bg-slate-900/30 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 font-semibold text-[11px]">AI Rationale: </span>
                  {dec.reason}
                </div>

                {/* If Risk Blocked, show reasons */}
                {!isApproved && dec.risk_reasons && dec.risk_reasons.length > 0 && (
                  <div className="text-xs text-rose-400 bg-rose-950/40 p-2 rounded border border-rose-900/50 my-1 font-mono">
                    <strong>Blocking Gates: </strong>
                    {dec.risk_reasons.join(", ")}
                  </div>
                )}

                {/* Human Approval Gate Actions */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800 text-xs">
                  <span className="font-mono text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(dec.timestamp).toLocaleTimeString()} · Mode:{" "}
                    <strong className="text-amber-400">{dec.execution_mode}</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    {isExecuted ? (
                      <span className="text-emerald-400 font-bold font-mono text-[11px] flex items-center gap-1 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        FILLED ({dec.execution_mode})
                      </span>
                    ) : isPendingApproval && isApproved ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onReject(dec.decision_id)}
                          disabled={isLoading}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold text-[11px] transition-all"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => onApprove(dec.decision_id)}
                          disabled={isLoading}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-[11px] transition-all shadow-md shadow-emerald-600/20"
                        >
                          Approve & Execute
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px] font-mono">
                        Status: {dec.approval_status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
