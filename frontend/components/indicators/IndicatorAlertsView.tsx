"use client";

import React, { useState } from "react";
import { Bell, Plus, CheckCircle2, AlertTriangle, Trash2, Send, ToggleLeft, ToggleRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertRule {
  id: string;
  indicator: string;
  condition: string;
  threshold: string;
  channel: "IN_APP" | "TELEGRAM" | "WEBHOOK" | "ALL";
  status: "ACTIVE" | "MUTED";
  lastFired?: string;
}

const DEFAULT_ALERTS: AlertRule[] = [
  { id: "alt-1", indicator: "RSI (14)", condition: "Crosses Above", threshold: "70.0 (Overbought)", channel: "ALL", status: "ACTIVE", lastFired: "14:20 IST" },
  { id: "alt-2", indicator: "Supertrend (10, 3)", condition: "Direction Flip", threshold: "Flip to BUY", channel: "TELEGRAM", status: "ACTIVE", lastFired: "12:45 IST" },
  { id: "alt-3", indicator: "MACD Signal Line", condition: "Bearish Cross", threshold: "MACD < Signal", channel: "IN_APP", status: "ACTIVE", lastFired: "11:10 IST" },
  { id: "alt-4", indicator: "Volume SMA (20)", condition: "Volume Spike", threshold: "> 2.0x 20-period SMA", channel: "ALL", status: "MUTED" },
];

export function IndicatorAlertsView() {
  const [alerts, setAlerts] = useState<AlertRule[]>(DEFAULT_ALERTS);

  const toggleStatus = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: a.status === "ACTIVE" ? "MUTED" : "ACTIVE" } : a))
    );
  };

  const removeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-[#F59E0B]" />
          <h2 className="text-xs font-bold text-[#F8FAFC] tracking-wider uppercase">INDICATOR ALERTS & CONDITIONS</h2>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#00E89A]/10 text-[#00E89A] border border-[#00E89A]/30">
            Real-Time Watcher
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-[#7D8EA5]">Telegram Webhook: <span className="text-[#00E89A] font-semibold">CONNECTED</span></span>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] overflow-x-auto">
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr className="h-[32px] bg-[#06101B] border-b border-[#122A42] text-[10px] uppercase font-semibold text-[#7D8EA5]">
              <th className="px-3 py-1">Indicator</th>
              <th className="px-3 py-1">Trigger Condition</th>
              <th className="px-3 py-1">Threshold / Boundary</th>
              <th className="px-2 py-1 text-center">Delivery Channel</th>
              <th className="px-3 py-1 text-center">Last Fired</th>
              <th className="px-2 py-1 text-center">Status</th>
              <th className="px-3 py-1 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#10263A]/60">
            {alerts.map((alt) => {
              const isActive = alt.status === "ACTIVE";
              return (
                <tr key={alt.id} className="h-[36px] hover:bg-[#0E1E34] transition-colors">
                  <td className="px-3 py-1 font-semibold text-[#F8FAFC]">{alt.indicator}</td>
                  <td className="px-3 py-1 text-[#22D3EE] font-mono">{alt.condition}</td>
                  <td className="px-3 py-1 text-[#F8FAFC] font-mono">{alt.threshold}</td>
                  <td className="px-2 py-1 text-center">
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#06101B] text-[#7D8EA5] border border-[#10263A]">
                      {alt.channel}
                    </span>
                  </td>
                  <td className="px-3 py-1 text-center font-mono text-[10px] text-[#7D8EA5]">
                    {alt.lastFired || "Never"}
                  </td>
                  <td className="px-2 py-1 text-center">
                    <span className={cn(
                      "px-1.5 py-0.2 rounded text-[9px] font-mono font-bold",
                      isActive ? "bg-[#00E89A]/15 text-[#00E89A] border border-[#00E89A]/30" : "bg-slate-500/15 text-slate-400"
                    )}>
                      {alt.status}
                    </span>
                  </td>
                  <td className="px-3 py-1 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleStatus(alt.id)}
                        className="text-[#7D8EA5] hover:text-[#F8FAFC] transition-colors"
                        title={isActive ? "Mute Alert" : "Activate Alert"}
                      >
                        {isActive ? <ToggleRight className="h-4 w-4 text-[#00E89A]" /> : <ToggleLeft className="h-4 w-4 text-slate-500" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAlert(alt.id)}
                        className="text-[#7D8EA5] hover:text-[#FF3B5C] transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

