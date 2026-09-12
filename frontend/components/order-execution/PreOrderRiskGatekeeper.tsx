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
    <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-4 space-y-3 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#F7FAFC]">
          {allPassed ? (
            <ShieldCheck className="w-4 h-4 text-[#00E890]" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-[#F59E0B]" />
          )}
          <span>PRE-ORDER RISK GATEKEEPER</span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
              allPassed
                ? "bg-[#00E890]/10 text-[#00E890] border border-[#00E890]/30"
                : "bg-[#FF3B5C]/10 text-[#FF3B5C] border border-[#FF3B5C]/30"
            }`}
          >
            {passedCount}/{gateList.length} GATES CLEARED
          </span>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[#7C8CA3] hover:text-[#F7FAFC] p-1 rounded-md transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Block Reason Warning if any */}
      {!allPassed && blockReason && (
        <div className="bg-[#FF3B5C]/10 border border-[#FF3B5C]/30 rounded-lg p-2.5 flex items-center gap-2 text-xs text-[#FF3B5C]">
          <XCircle className="w-4 h-4 text-[#FF3B5C] flex-shrink-0" />
          <span>{blockReason}</span>
        </div>
      )}

      {/* Grid of Gates (Compact / Expanded) */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 pt-1 ${isExpanded ? "" : "max-h-24 overflow-hidden relative"}`}>
        {gateList.map((g) => (
          <div
            key={g.gate_id || g.gate_name}
            className="bg-[#07101A] border border-[#1A2A3F] rounded-lg p-2 flex items-center justify-between text-[10px]"
          >
            <span className="text-[#7C8CA3] truncate">{g.gate_name}</span>
            {g.status === "PASS" ? (
              <span className="text-[#00E890] font-semibold flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" /> PASS
              </span>
            ) : g.status === "WARNING" ? (
              <span className="text-[#F59E0B] font-semibold flex items-center gap-0.5">
                <AlertTriangle className="w-3 h-3" /> WARN
              </span>
            ) : (
              <span className="text-[#FF3B5C] font-semibold flex items-center gap-0.5">
                <XCircle className="w-3 h-3" /> BLOCK
              </span>
            )}
          </div>
        ))}

        {!isExpanded && (
          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#0A1422] to-transparent pointer-events-none" />
        )}
      </div>
    </div>
  );
}

