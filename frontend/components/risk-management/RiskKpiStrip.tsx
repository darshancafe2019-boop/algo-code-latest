"use client";

import React from "react";
import { ShieldAlert, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Zap, Sliders } from "lucide-react";
import { RiskAnalytics } from "@/types/risk";

interface RiskKpiStripProps {
  analytics?: RiskAnalytics;
}

export function RiskKpiStrip({ analytics }: RiskKpiStripProps) {
  const items = [
    {
      label: "TOTAL RISK CHECKS",
      value: analytics?.total_events !== undefined ? analytics.total_events : "—",
      color: "text-slate-100",
      subtext: "Evaluations today",
    },
    {
      label: "APPROVED TRADES",
      value: analytics?.approved_count !== undefined ? analytics.approved_count : "—",
      color: "text-emerald-400",
      subtext: `${analytics?.approval_rate_pct || 100}% approval rate`,
    },
    {
      label: "BLOCKED ORDERS",
      value: analytics?.blocked_count !== undefined ? analytics.blocked_count : "—",
      color: "text-rose-400",
      subtext: "Safety defense actions",
    },
    {
      label: "MARGIN & EXPOSURE WARNINGS",
      value: analytics?.warnings_count !== undefined ? analytics.warnings_count : "—",
      color: "text-amber-400",
      subtext: "Caution zones triggered",
    },
    {
      label: "CRITICAL INCIDENTS",
      value: analytics?.critical_count !== undefined ? analytics.critical_count : "—",
      color: "text-red-400",
      subtext: "Immediate risk interventions",
    },
    {
      label: "AUTHORIZED OVERRIDES",
      value: analytics?.overrides_count !== undefined ? analytics.overrides_count : "0",
      color: "text-purple-400",
      subtext: "Operator overrides logged",
    },
    {
      label: "LIVE REAL CAPITAL EVENTS",
      value: analytics?.live_events_count !== undefined ? analytics.live_events_count : "—",
      color: "text-cyan-400",
      subtext: "Live account executions",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 font-mono select-none">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="bg-[#0B131E] border border-[#1E293B] hover:border-slate-700 rounded-2xl p-3 shadow-lg transition-colors flex flex-col justify-between"
        >
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">
            {item.label}
          </span>
          <div className="my-1">
            <span className={`text-xl font-extrabold tracking-tight ${item.color}`}>
              {item.value}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 truncate font-sans">
            {item.subtext}
          </span>
        </div>
      ))}
    </div>
  );
}
