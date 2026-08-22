"use client";

import React from "react";
import { 
  AlertOctagon, 
  AlertTriangle, 
  AlertCircle, 
  Bell, 
  Bot, 
  CheckCircle2, 
  Layers
} from "lucide-react";
import { IncidentMetricsSummary } from "@/types/alerts";

interface AlertsKpiStripProps {
  metrics?: IncidentMetricsSummary;
  selectedSeverity: string;
  onSelectSeverity: (sev: string) => void;
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
}

export function AlertsKpiStrip({
  metrics,
  selectedSeverity,
  onSelectSeverity,
  selectedStatus,
  onSelectStatus
}: AlertsKpiStripProps) {
  const activeTotal = metrics?.active_incidents || 0;
  const critical = metrics?.critical || 0;
  const error = metrics?.error || 0;
  const warning = metrics?.warning || 0;
  const unack = metrics?.unacknowledged || 0;
  const affectedBots = metrics?.affected_bots_count || 0;
  const resolvedToday = metrics?.resolved_today || 0;

  const kpis = [
    {
      id: "active",
      label: "ACTIVE INCIDENTS",
      value: activeTotal,
      icon: <Layers className="w-4 h-4 text-cyan-400" />,
      badgeBg: "bg-cyan-950/40 border-cyan-500/30 text-cyan-400",
      activeStyle: "ring-2 ring-cyan-500 bg-cyan-950/30",
      onClick: () => onSelectStatus("ACTIVE")
    },
    {
      id: "critical",
      label: "CRITICAL RISK",
      value: critical,
      icon: <AlertOctagon className={`w-4 h-4 ${critical > 0 ? "text-rose-400 animate-pulse" : "text-slate-400"}`} />,
      badgeBg: critical > 0 ? "bg-rose-950/60 border-rose-500/50 text-rose-300" : "bg-slate-900 border-slate-800 text-slate-400",
      activeStyle: "ring-2 ring-rose-500 bg-rose-950/30",
      highlight: critical > 0,
      onClick: () => onSelectSeverity("CRITICAL")
    },
    {
      id: "error",
      label: "ERRORS",
      value: error,
      icon: <AlertTriangle className={`w-4 h-4 ${error > 0 ? "text-amber-400" : "text-slate-400"}`} />,
      badgeBg: error > 0 ? "bg-amber-950/60 border-amber-500/50 text-amber-300" : "bg-slate-900 border-slate-800 text-slate-400",
      activeStyle: "ring-2 ring-amber-500 bg-amber-950/30",
      onClick: () => onSelectSeverity("ERROR")
    },
    {
      id: "warning",
      label: "WARNINGS",
      value: warning,
      icon: <AlertCircle className={`w-4 h-4 ${warning > 0 ? "text-yellow-400" : "text-slate-400"}`} />,
      badgeBg: warning > 0 ? "bg-yellow-950/50 border-yellow-500/40 text-yellow-300" : "bg-slate-900 border-slate-800 text-slate-400",
      activeStyle: "ring-2 ring-yellow-500 bg-yellow-950/30",
      onClick: () => onSelectSeverity("WARNING")
    },
    {
      id: "unack",
      label: "UNACKNOWLEDGED",
      value: unack,
      icon: <Bell className={`w-4 h-4 ${unack > 0 ? "text-indigo-400" : "text-slate-400"}`} />,
      badgeBg: unack > 0 ? "bg-indigo-950/60 border-indigo-500/50 text-indigo-300" : "bg-slate-900 border-slate-800 text-slate-400",
      activeStyle: "ring-2 ring-indigo-500 bg-indigo-950/30",
      onClick: () => onSelectStatus("NEW")
    },
    {
      id: "bots",
      label: "AFFECTED BOTS",
      value: affectedBots,
      icon: <Bot className="w-4 h-4 text-purple-400" />,
      badgeBg: "bg-purple-950/40 border-purple-500/30 text-purple-300",
      activeStyle: "ring-2 ring-purple-500 bg-purple-950/30",
      onClick: () => {}
    },
    {
      id: "resolved",
      label: "RESOLVED TODAY",
      value: resolvedToday,
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
      badgeBg: "bg-emerald-950/40 border-emerald-500/30 text-emerald-300",
      activeStyle: "ring-2 ring-emerald-500 bg-emerald-950/30",
      onClick: () => onSelectStatus("RESOLVED")
    }
  ];

  return (
    <section aria-label="Incident Overview KPIs" className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
      {kpis.map((kpi) => {
        const isSelected = 
          (kpi.id === "critical" && selectedSeverity === "CRITICAL") ||
          (kpi.id === "error" && selectedSeverity === "ERROR") ||
          (kpi.id === "warning" && selectedSeverity === "WARNING") ||
          (kpi.id === "active" && selectedStatus === "ACTIVE") ||
          (kpi.id === "unack" && selectedStatus === "NEW") ||
          (kpi.id === "resolved" && selectedStatus === "RESOLVED");

        return (
          <button
            key={kpi.id}
            type="button"
            onClick={kpi.onClick}
            className={`p-3 rounded-xl border bg-[#0B0F17]/90 text-left transition-all duration-150 relative overflow-hidden group hover:border-slate-700 ${
              kpi.highlight ? "border-rose-500/40 shadow-rose-950/30 shadow-lg" : "border-slate-800/80"
            } ${isSelected ? kpi.activeStyle : ""}`}
          >
            {/* Top Row: Label & Icon */}
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 group-hover:text-slate-300 transition-colors">
                {kpi.label}
              </span>
              <div className="p-1 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                {kpi.icon}
              </div>
            </div>

            {/* Value */}
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-mono font-black tracking-tight text-white">
                {kpi.value}
              </span>
              {kpi.highlight && (
                <span className="text-[10px] font-mono font-bold text-rose-400 animate-pulse">
                  ACTION REQ
                </span>
              )}
            </div>
          </button>
        );
      })}
    </section>
  );
}
