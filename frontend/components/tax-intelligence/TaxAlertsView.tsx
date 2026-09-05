"use client";

import React from "react";
import {
  Bell,
  AlertTriangle,
  Clock,
  PiggyBank,
  ShieldAlert,
  Info,
  CheckCircle2,
} from "lucide-react";
import { TaxAlertItem } from "@/types/tax";

interface TaxAlertsViewProps {
  alerts: TaxAlertItem[];
  currency: string;
}

export function TaxAlertsView({ alerts, currency }: TaxAlertsViewProps) {
  const formatCurrency = (val: number) => {
    const prefix = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "GBP" ? "£" : currency === "EUR" ? "€" : `${currency} `;
    return `${prefix}${val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getSeverityIcon = (severity: string, type: string) => {
    if (severity === "CRITICAL") return <ShieldAlert className="w-5 h-5 text-rose-400" />;
    if (severity === "HIGH") return <AlertTriangle className="w-5 h-5 text-amber-400" />;
    if (type === "TAX_LOSS_HARVEST_REVIEW") return <PiggyBank className="w-5 h-5 text-emerald-400" />;
    if (type === "HOLDING_PERIOD_THRESHOLD") return <Clock className="w-5 h-5 text-cyan-400" />;
    return <Info className="w-5 h-5 text-indigo-400" />;
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">CRITICAL</span>;
      case "HIGH":
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">HIGH PRIORITY</span>;
      case "MEDIUM":
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">MEDIUM</span>;
      default:
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20">{severity}</span>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 font-sans tracking-wide">
              ACTIONABLE TAX INTELLIGENCE ALERTS
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Decision-support alerts for holding periods, loss harvesting, and anti-avoidance restrictions
            </p>
          </div>
        </div>

        <span className="text-xs text-slate-400 font-mono">
          {alerts.length} Active Tax Signals
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all duration-200 backdrop-blur-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    {getSeverityIcon(alert.severity, alert.alert_type)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100 font-sans">
                      {alert.title}
                    </h4>
                    {alert.symbol && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-indigo-300">
                        {alert.symbol}
                      </span>
                    )}
                  </div>
                </div>
                {getSeverityBadge(alert.severity)}
              </div>

              <p className="text-xs text-slate-300 font-sans leading-relaxed my-2">
                {alert.message}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800/80 mt-2 flex items-center justify-between text-xs font-mono">
              <div>
                {alert.potential_tax_saving > 0 && (
                  <span className="text-emerald-400 font-bold">
                    Potential Benefit: {formatCurrency(alert.potential_tax_saving)}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 uppercase">
                {alert.alert_type.replace(/_/g, " ")}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
