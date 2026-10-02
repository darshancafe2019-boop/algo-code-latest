"use client";

import React from "react";
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Layers,
} from "lucide-react";
import { RiskRuleCheck, DrawerContentType } from "./useSharedTradingState";
import { cn } from "@/lib/utils";

interface RiskSummaryCardProps {
  rules: RiskRuleCheck[];
  overallStatus: "APPROVED" | "BLOCKED";
  onOpenDrawer: (type: DrawerContentType, title: string, data?: any) => void;
}

export const RiskSummaryCard: React.FC<RiskSummaryCardProps> = ({
  rules,
  overallStatus,
  onOpenDrawer,
}) => {
  const isApproved = overallStatus === "APPROVED";
  const essentialRules = rules.slice(0, 6);

  return (
    <div
      className={cn(
        "w-full bg-[#050e1d]/90 border rounded-xl p-4 shadow-lg select-none backdrop-blur flex flex-col justify-between transition-all",
        isApproved ? "border-[#12365a]" : "border-rose-600/80 shadow-rose-950/40"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#0d2847]">
        <div className="flex items-center gap-2">
          {isApproved ? (
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          ) : (
            <ShieldAlert className="h-4 w-4 text-rose-400 animate-pulse" />
          )}
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            RISK SUPERVISOR
          </h3>
        </div>

        <span
          className={cn(
            "px-2 py-0.5 rounded text-[11px] font-mono font-bold border flex items-center gap-1",
            isApproved
              ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
              : "bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse"
          )}
        >
          ● {overallStatus}
        </span>
      </div>

      {/* 6 Essential Checks Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-3 text-xs">
        {essentialRules.map((rule) => {
          const isPass = rule.status === "PASS";
          return (
            <div
              key={rule.id}
              className="bg-[#07192f] border border-[#103456] rounded-lg p-2 flex items-center justify-between gap-1"
            >
              <span className="text-[11px] text-slate-300 truncate">{rule.name}</span>
              <span
                className={cn(
                  "text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border",
                  isPass
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-rose-500/20 border-rose-500 text-rose-400"
                )}
              >
                {rule.status}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer / Trigger Details */}
      <div className="flex items-center justify-between pt-2 border-t border-[#0d2847] gap-2">
        <span className="text-[11px] font-mono text-slate-400">
          Overall Gate:{" "}
          <strong className={isApproved ? "text-emerald-400" : "text-rose-400"}>
            {isApproved ? "SAFE TO EXECUTE" : "EXECUTION RESTRICTED"}
          </strong>
        </span>

        <button
          onClick={() => onOpenDrawer("risk_checks", "Risk Engine — Full 12 Check Compliance Matrix", rules)}
          className="flex items-center gap-1 text-[11px] font-bold text-[#00D4FF] hover:text-white px-2.5 py-1.5 rounded-lg bg-[#07192f] hover:bg-[#0c284a] border border-[#143e69] transition-all cursor-pointer"
        >
          <Layers className="h-3 w-3" />
          VIEW 12 CHECKS
        </button>
      </div>
    </div>
  );
};
