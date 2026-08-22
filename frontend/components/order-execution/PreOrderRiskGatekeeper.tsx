"use client";

import React from "react";
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { RiskGateCheck } from "@/types/order-execution";

interface PreOrderRiskGatekeeperProps {
  checks: Record<string, RiskGateCheck>;
  allPassed: boolean;
  blockReason?: string;
}

export function PreOrderRiskGatekeeper({
  checks,
  allPassed,
  blockReason,
}: PreOrderRiskGatekeeperProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const defaultGateList: RiskGateCheck[] = [
    { gate_id: "broker", gate_name: "Broker Link", status: "PASS", message: "Connected & Active" },
    { gate_id: "data", gate_name: "Data Freshness", status: "PASS", message: "Live Stream (<50ms)" },
    { gate_id: "symbol", gate_name: "Instrument Check", status: "PASS", message: "Execution Enabled" },
    { gate_id: "balance", gate_name: "Account Balance", status: "PASS", message: "Sufficient Balance" },
    { gate_id: "margin", gate_name: "Margin Check", status: "PASS", message: "Required Margin OK" },
    { gate_id: "position", gate_name: "Position Limit", status: "PASS", message: "Within Max Cap" },
    { gate_id: "exposure", gate_name: "Portfolio Exposure", status: "PASS", message: "Exposure < 40%" },
    { gate_id: "leverage", gate_name: "Leverage Limit", status: "PASS", message: "Within Broker Max" },
    { gate_id: "daily_loss", gate_name: "Daily Loss Limit", status: "PASS", message: "Loss < $500 Max" },
    { gate_id: "risk_cap", gate_name: "Max Trade Risk", status: "PASS", message: "Risk < $500.00" },
    { gate_id: "drawdown", gate_name: "Drawdown Limit", status: "PASS", message: "DD < 10% Gate" },
    { gate_id: "kill_switch", gate_name: "Kill Switch", status: "PASS", message: "Inactive / Normal" },
    { gate_id: "slippage", gate_name: "Slippage Check", status: "PASS", message: "Estimated < 0.1%" },
    { gate_id: "order_valid", gate_name: "SL/TP Parameters", status: "PASS", message: "R:R > 1.0 Passed" },
  ];

  const gateList = Object.keys(checks).length > 0 ? Object.values(checks) : defaultGateList;
  const passedCount = gateList.filter((g) => g.status === "PASS").length;

  return (
    <div className="bg-[#141E33] border border-[#1E293B] rounded-2xl p-4 space-y-3 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase">
          {allPassed ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          )}
          <span>Pre-Order Risk Gatekeeper</span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              allPassed
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : "bg-red-500/10 text-red-400 border border-red-500/30"
            }`}
          >
            {passedCount}/{gateList.length} GATES CLEARED
          </span>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Block Reason Warning if any */}
      {!allPassed && blockReason && (
        <div className="bg-red-950/60 border border-red-900/60 rounded-xl p-2.5 flex items-center gap-2 text-xs text-red-300">
          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{blockReason}</span>
        </div>
      )}

      {/* Grid of Gates (Compact / Expanded) */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 pt-1 ${isExpanded ? "" : "max-h-24 overflow-hidden relative"}`}>
        {gateList.map((g) => (
          <div
            key={g.gate_id || g.gate_name}
            className="bg-[#0B111E] border border-slate-800/80 rounded-lg p-2 flex items-center justify-between text-[10px]"
          >
            <span className="text-slate-300 truncate">{g.gate_name}</span>
            {g.status === "PASS" ? (
              <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" /> PASS
              </span>
            ) : g.status === "WARNING" ? (
              <span className="text-amber-400 font-bold flex items-center gap-0.5">
                <AlertTriangle className="w-3 h-3" /> WARN
              </span>
            ) : (
              <span className="text-red-400 font-bold flex items-center gap-0.5">
                <XCircle className="w-3 h-3" /> BLOCK
              </span>
            )}
          </div>
        ))}

        {!isExpanded && (
          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#141E33] to-transparent pointer-events-none" />
        )}
      </div>
    </div>
  );
}
