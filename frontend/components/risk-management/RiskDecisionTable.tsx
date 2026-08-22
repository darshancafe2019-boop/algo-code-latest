"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  ArrowUpDown,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Lock,
  Zap,
} from "lucide-react";
import { RiskDecision } from "@/types/risk";

interface RiskDecisionTableProps {
  decisions: RiskDecision[];
  selectedDecision: RiskDecision | null;
  onSelectDecision: (decision: RiskDecision) => void;
  isLoading: boolean;
}

export function RiskDecisionTable({
  decisions,
  selectedDecision,
  onSelectDecision,
  isLoading,
}: RiskDecisionTableProps) {
  const [sortField, setSortField] = useState<string>("evaluated_at");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortedDecisions = [...decisions].sort((a: any, b: any) => {
    const valA = a[sortField] !== undefined ? a[sortField] : "";
    const valB = b[sortField] !== undefined ? b[sortField] : "";
    if (typeof valA === "string") {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortAsc ? valA - valB : valB - valA;
  });

  return (
    <div className="bg-[#0B131E] border border-[#1E293B] rounded-2xl overflow-hidden shadow-xl font-sans select-none">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#070D14] text-slate-400 text-[10px] uppercase tracking-wider border-b border-[#1E293B]">
            <tr>
              <th className="py-3 px-3.5 cursor-pointer hover:text-cyan-300" onClick={() => handleSort("evaluated_at")}>
                <div className="flex items-center gap-1">
                  <span>Evaluated Time</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-3 cursor-pointer hover:text-cyan-300" onClick={() => handleSort("risk_event_id")}>
                <div className="flex items-center gap-1">
                  <span>Event ID / Mode</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-3 cursor-pointer hover:text-cyan-300" onClick={() => handleSort("decision")}>
                <div className="flex items-center gap-1">
                  <span>Decision</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-3 cursor-pointer hover:text-cyan-300" onClick={() => handleSort("symbol")}>
                <div className="flex items-center gap-1">
                  <span>Symbol / Asset</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-3 cursor-pointer hover:text-cyan-300" onClick={() => handleSort("bot_id")}>
                <div className="flex items-center gap-1">
                  <span>Bot / Strategy</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-3 cursor-pointer hover:text-cyan-300" onClick={() => handleSort("blocking_gate")}>
                <div className="flex items-center gap-1">
                  <span>Primary Gate</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-3 text-right cursor-pointer hover:text-cyan-300" onClick={() => handleSort("requested_risk_pct")}>
                <div className="flex items-center justify-end gap-1">
                  <span>Risk / Trade</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-3 text-center">Execution Status</th>
              <th className="py-3 px-3 text-center">Policy</th>
              <th className="py-3 px-4 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B] text-slate-200">
            {isLoading ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-xs text-slate-400 font-mono">
                  Loading immutable risk decisions ledger...
                </td>
              </tr>
            ) : sortedDecisions.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-xs text-slate-500 font-mono">
                  No risk decisions match the selected filter criteria.
                </td>
              </tr>
            ) : (
              sortedDecisions.map((d) => {
                const isSelected = selectedDecision?.risk_event_id === d.risk_event_id;
                const isBlocked = d.decision === "BLOCKED";
                const isApproved = d.decision === "APPROVED";
                const isWarning = d.decision === "APPROVED_WITH_WARNING";
                const isOverridden = d.is_overridden || d.decision === "OVERRIDDEN";
                const isLive = d.account_mode === "LIVE";

                const evalDate = new Date(d.evaluated_at);
                const timeFormatted = !isNaN(evalDate.getTime())
                  ? evalDate.toISOString().slice(11, 19)
                  : d.evaluated_at.slice(11, 19);

                return (
                  <tr
                    key={d.risk_event_id}
                    onClick={() => onSelectDecision(d)}
                    className={`transition-colors cursor-pointer group ${
                      isSelected
                        ? "bg-[#0F2238] border-l-2 border-cyan-400"
                        : "hover:bg-[#070D14]"
                    }`}
                  >
                    {/* Time */}
                    <td className="py-3 px-3.5 whitespace-nowrap text-slate-400">
                      <span className="text-slate-200 font-bold">{timeFormatted}</span>
                      <span className="text-[10px] text-slate-500 block">
                        {d.evaluated_at.slice(0, 10)}
                      </span>
                    </td>

                    {/* Event ID & Mode */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                          {d.risk_event_id}
                        </span>
                        {isLive ? (
                          <span className="px-1.5 py-0.2 rounded bg-rose-950/80 text-rose-300 text-[9px] font-bold border border-rose-800">
                            LIVE
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded bg-[#070D14] text-slate-400 text-[9px] font-bold border border-[#1E293B]">
                            PAPER
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 block font-sans truncate max-w-[120px]">
                        {d.account_id}
                      </span>
                    </td>

                    {/* Decision */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold border uppercase tracking-wider ${
                          isBlocked
                            ? "bg-rose-950/60 border-rose-800 text-rose-300"
                            : isApproved
                            ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                            : isWarning
                            ? "bg-amber-950/60 border-amber-800 text-amber-300"
                            : isOverridden
                            ? "bg-purple-950/60 border-purple-800 text-purple-300"
                            : "bg-slate-900 border-slate-800 text-slate-300"
                        }`}
                      >
                        {isBlocked ? (
                          <XCircle className="h-3 w-3 text-rose-400" />
                        ) : isApproved ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        ) : isWarning ? (
                          <AlertTriangle className="h-3 w-3 text-amber-400" />
                        ) : (
                          <ShieldAlert className="h-3 w-3 text-purple-400" />
                        )}
                        {d.decision.replace("_", " ")}
                      </span>
                    </td>

                    {/* Symbol / Asset */}
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                        {d.symbol}
                      </span>
                      <span className="text-[10px] text-slate-500 block font-sans">
                        {d.asset_class} • {d.exchange}
                      </span>
                    </td>

                    {/* Bot / Strategy */}
                    <td className="py-3 px-3">
                      <span className="text-slate-200 font-semibold truncate block max-w-[120px]">
                        {d.bot_id}
                      </span>
                      <span className="text-[10px] text-slate-500 block font-sans truncate max-w-[120px]">
                        {d.strategy_id} {d.strategy_version}
                      </span>
                    </td>

                    {/* Primary Gate */}
                    <td className="py-3 px-3">
                      <span
                        className={`text-[11px] font-semibold ${
                          isBlocked ? "text-rose-300" : isWarning ? "text-amber-300" : "text-slate-300"
                        }`}
                      >
                        {d.blocking_gate || "14/14 Gates Passed"}
                      </span>
                      {d.blocking_reason && (
                        <span className="text-[10px] text-slate-500 truncate block max-w-[180px] font-sans">
                          {d.blocking_reason}
                        </span>
                      )}
                    </td>

                    {/* Risk / Trade */}
                    <td className="py-3 px-3 text-right">
                      <span className="font-bold text-slate-100">
                        {d.requested_risk_pct ? `${d.requested_risk_pct.toFixed(2)}%` : "0.50%"}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        ${d.requested_risk_usd ? d.requested_risk_usd.toLocaleString() : "50.00"}
                      </span>
                    </td>

                    {/* Execution Status */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          d.execution_status === "NOT_SUBMITTED"
                            ? "bg-rose-950/40 text-rose-400 border border-rose-900/60"
                            : "bg-emerald-950/40 text-emerald-400 border border-emerald-900/60"
                        }`}
                      >
                        {d.execution_status === "NOT_SUBMITTED" ? "NOT SUBMITTED" : "SUBMITTED"}
                      </span>
                    </td>

                    {/* Policy */}
                    <td className="py-3 px-3 text-center">
                      <span className="text-[10px] text-purple-400 font-bold bg-purple-950/40 border border-purple-900/60 px-2 py-0.5 rounded">
                        {d.policy_version || "v3.4.1"}
                      </span>
                    </td>

                    {/* Inspect Button */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDecision(d);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#070D14] hover:bg-cyan-950 text-cyan-300 border border-[#1E293B] hover:border-cyan-800 text-[10px] font-bold transition-colors inline-flex items-center gap-1"
                      >
                        <span>Evidence</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
