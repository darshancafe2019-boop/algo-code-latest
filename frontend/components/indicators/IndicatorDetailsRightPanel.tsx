"use client";

import React, { useState } from "react";
import {
  X,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Save,
  Bell,
  Clock,
  Code,
  Activity,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ActiveIndicatorItem } from "./ActiveIndicatorsGridTable";

interface IndicatorDetailsRightPanelProps {
  indicator: ActiveIndicatorItem | null;
  onClose: () => void;
  onSaveParameters: (id: string, newParams: Record<string, any>) => void;
  onToggleStatus: (id: string, currentStatus: string) => void;
}

export function IndicatorDetailsRightPanel({
  indicator,
  onClose,
  onSaveParameters,
  onToggleStatus,
}: IndicatorDetailsRightPanelProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "parameters" | "signals" | "alerts" | "logs">("overview");
  const [paramState, setParamState] = useState<Record<string, any>>({});

  // Sync parameters when indicator changes
  React.useEffect(() => {
    if (indicator) {
      setParamState({ ...indicator.parameters });
    }
  }, [indicator]);

  if (!indicator) {
    return (
      <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-4 text-center h-full flex flex-col items-center justify-center min-h-[350px]">
        <Sliders className="h-8 w-8 text-[#7D8EA5]/40 mb-2" />
        <p className="text-xs font-semibold text-[#7D8EA5]">No Indicator Selected</p>
        <p className="text-[10px] text-[#7D8EA5]/70 max-w-[200px] mt-1">
          Select an indicator from the table to inspect parameters, telemetry, and signal triggers.
        </p>
      </div>
    );
  }

  const isEnabled = indicator.status === "ENABLED";

  const handleParamChange = (key: string, value: any) => {
    setParamState((prev) => ({
      ...prev,
      [key]: !isNaN(Number(value)) && value !== "" ? Number(value) : value,
    }));
  };

  const handleSave = () => {
    onSaveParameters(indicator.id, paramState);
  };

  return (
    <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] flex flex-col h-full min-h-[460px]">
      {/* Panel Header */}
      <div className="p-3 border-b border-[#122A42] flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded bg-[#06101B] border border-[#10263A] text-[#00F0FF]">
            <Sliders className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-[#F8FAFC] truncate">{indicator.name}</h3>
            <span className="text-[9px] font-mono text-[#7D8EA5] block truncate">{indicator.id}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onToggleStatus(indicator.id, indicator.status)}
            className={cn(
              "px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors",
              isEnabled
                ? "bg-[#00E89A]/15 text-[#00E89A] border-[#00E89A]/30 hover:bg-[#00E89A]/25"
                : "bg-slate-500/15 text-slate-400 border-slate-500/30 hover:bg-slate-500/25"
            )}
          >
            {isEnabled ? "ACTIVE" : "PAUSED"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-[#06101B] text-[#7D8EA5] hover:text-[#F8FAFC] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Internal Tabs */}
      <div className="flex items-center gap-1 px-3 pt-2 border-b border-[#10263A] text-[10px] font-semibold">
        {(["overview", "parameters", "signals", "alerts", "logs"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-2 py-1 uppercase rounded-t tracking-wider transition-colors",
              activeTab === tab
                ? "bg-[#168BFF]/20 text-[#00F0FF] border-b-2 border-[#00F0FF] font-bold"
                : "text-[#7D8EA5] hover:text-[#F8FAFC]"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="p-3 flex-1 overflow-y-auto space-y-3 text-[11px]">
        {/* 1. OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="p-2 rounded bg-[#06101B] border border-[#10263A]">
                <span className="text-[#7D8EA5] block">Category</span>
                <span className="text-[#F8FAFC] font-mono font-bold">{indicator.category}</span>
              </div>
              <div className="p-2 rounded bg-[#06101B] border border-[#10263A]">
                <span className="text-[#7D8EA5] block">Timeframe</span>
                <span className="text-[#00F0FF] font-mono font-bold">{indicator.timeframe}</span>
              </div>
              <div className="p-2 rounded bg-[#06101B] border border-[#10263A]">
                <span className="text-[#7D8EA5] block">Latest Value</span>
                <span className="text-[#00E89A] font-mono font-bold">{String(indicator.latestValue)}</span>
              </div>
              <div className="p-2 rounded bg-[#06101B] border border-[#10263A]">
                <span className="text-[#7D8EA5] block">Current Signal</span>
                <span className={cn(
                  "font-mono font-bold",
                  indicator.signal === "BUY" ? "text-[#00E89A]" :
                  indicator.signal === "SELL" ? "text-[#FF3B5C]" : "text-[#F59E0B]"
                )}>
                  {indicator.signal}
                </span>
              </div>
            </div>

            {/* Telemetry Block */}
            <div className="p-2.5 rounded bg-[#06101B] border border-[#10263A] space-y-1.5 text-[10px]">
              <div className="flex items-center justify-between text-[#7D8EA5]">
                <span>Calculation Engine:</span>
                <span className="text-[#00E89A] font-mono font-semibold">C++ Vectorized Core</span>
              </div>
              <div className="flex items-center justify-between text-[#7D8EA5]">
                <span>Update Latency:</span>
                <span className="text-[#F8FAFC] font-mono">{indicator.latencyMs || 12}ms</span>
              </div>
              <div className="flex items-center justify-between text-[#7D8EA5]">
                <span>Buffer Window:</span>
                <span className="text-[#F8FAFC] font-mono">500 Bars Cached</span>
              </div>
              <div className="flex items-center justify-between text-[#7D8EA5]">
                <span>Confluence Weight:</span>
                <span className="text-[#00F0FF] font-mono">1.25x (High Priority)</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 border-t border-[#10263A] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab("parameters")}
                className="text-[10px] text-[#00F0FF] hover:underline flex items-center gap-1"
              >
                <span>Edit Parameters</span>
                <ChevronRight className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("alerts")}
                className="text-[10px] text-[#7D8EA5] hover:text-[#F8FAFC] flex items-center gap-1"
              >
                <span>Alert Triggers</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* 2. PARAMETERS TAB */}
        {activeTab === "parameters" && (
          <div className="space-y-3">
            <p className="text-[10px] text-[#7D8EA5]">
              Adjust algorithmic input parameters. Changes apply live to the quantitative signal evaluator.
            </p>

            <div className="space-y-2">
              {Object.entries(paramState).map(([key, val]) => (
                <div key={key} className="p-2 rounded bg-[#06101B] border border-[#10263A]">
                  <label className="block text-[10px] font-mono text-[#7D8EA5] uppercase mb-1">{key}</label>
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => handleParamChange(key, e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-mono bg-[#0A1422] border border-[#122A42] rounded text-[#F8FAFC] focus:outline-none focus:border-[#00F0FF]/50"
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="w-full py-1.5 rounded bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] hover:bg-[#00F0FF]/25 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Apply Parameters</span>
            </button>
          </div>
        )}

        {/* 3. SIGNALS TAB */}
        {activeTab === "signals" && (
          <div className="space-y-2">
            <div className="text-[10px] text-[#7D8EA5] flex items-center justify-between pb-1 border-b border-[#10263A]">
              <span>Recent Signal Events</span>
              <span className="font-mono text-[#00E89A]">Last 5 Triggers</span>
            </div>
            {[
              { time: "15:24:10", type: "BUY", val: "68,450.00", reason: "Bullish EMA Crossover" },
              { time: "15:15:02", type: "HOLD", val: "68,120.00", reason: "Range Bound" },
              { time: "14:55:18", type: "BUY", val: "67,980.00", reason: "RSI Oversold Bounce" },
              { time: "14:30:00", type: "SELL", val: "68,200.00", reason: "Upper Band Rejection" },
            ].map((sig, idx) => (
              <div key={idx} className="p-2 rounded bg-[#06101B] border border-[#10263A] flex items-center justify-between text-[10px]">
                <div>
                  <span className={cn(
                    "font-mono font-bold mr-1.5",
                    sig.type === "BUY" ? "text-[#00E89A]" : sig.type === "SELL" ? "text-[#FF3B5C]" : "text-[#F59E0B]"
                  )}>
                    [{sig.type}]
                  </span>
                  <span className="text-[#F8FAFC]">{sig.reason}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-[#7D8EA5] block text-[9px]">{sig.time} IST</span>
                  <span className="font-mono text-[#F8FAFC] text-[9px]">{sig.val}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 4. ALERTS TAB */}
        {activeTab === "alerts" && (
          <div className="space-y-2.5">
            <div className="p-2 rounded bg-[#06101B] border border-[#10263A]">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-[#F8FAFC] text-[10px]">Bullish Crossover Alert</span>
                <span className="text-[#00E89A] font-mono text-[9px]">ACTIVE</span>
              </div>
              <p className="text-[9px] text-[#7D8EA5]">Triggers in-app badge + Telegram notification on BUY condition.</p>
            </div>
            <div className="p-2 rounded bg-[#06101B] border border-[#10263A]">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-[#F8FAFC] text-[10px]">Extreme Divergence Alert</span>
                <span className="text-[#F59E0B] font-mono text-[9px]">STANDBY</span>
              </div>
              <p className="text-[9px] text-[#7D8EA5]">Alerts when spread exceeds 2.5 standard deviations.</p>
            </div>
          </div>
        )}

        {/* 5. LOGS TAB */}
        {activeTab === "logs" && (
          <div className="p-2 rounded bg-[#06101B] border border-[#10263A] font-mono text-[9px] space-y-1 max-h-[220px] overflow-y-auto text-[#7D8EA5]">
            <p className="text-[#00E89A]">[INIT] Indicator registered into execution tree.</p>
            <p>[FEED] Subscribed to WebSocket tick channel: 12ms latency.</p>
            <p>[CALC] Series bar computation complete. Checksum: OK.</p>
            <p>[EVAL] Confluence score updated: Bull 68% / Bear 32%.</p>
            <p>[HEARTBEAT] Buffer healthy. 0 dropped frames.</p>
          </div>
        )}
      </div>
    </div>
  );
}

