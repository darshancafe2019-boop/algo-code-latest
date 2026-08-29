"use client";

import React, { useState } from "react";
import { useOptionsMarketContext } from "@/context/OptionsMarketContext";
import { ActiveStrategiesTab } from "../tabs/ActiveStrategiesTab";
import { OrdersPositionsTab } from "../tabs/OrdersPositionsTab";
import { RiskMonitorTab } from "../tabs/RiskMonitorTab";
import { Activity, Layers, Shield, RefreshCw } from "lucide-react";

export function MonitorSection() {
  const { selectedUnderlying, activeStrategies, openPositions, riskSummary } = useOptionsMarketContext();
  const [monitorSubTab, setMonitorSubTab] = useState<"active" | "orders" | "risk">("active");

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Sub-Navigation Bar for Monitor */}
      <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-2 shadow-xl flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 bg-slate-950 p-0.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setMonitorSubTab("active")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition ${
              monitorSubTab === "active"
                ? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Active Strategies ({activeStrategies.length})</span>
          </button>

          <button
            onClick={() => setMonitorSubTab("orders")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition ${
              monitorSubTab === "orders"
                ? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Orders &amp; Positions ({openPositions.length})</span>
          </button>

          <button
            onClick={() => setMonitorSubTab("risk")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition ${
              monitorSubTab === "risk"
                ? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>14-Point Risk Monitor</span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-[11px] px-2 text-slate-400">
          <div>
            Margin Utilized: <b className="text-white">{riskSummary?.margin_utilization_pct || 5.0}%</b>
          </div>
          <div>
            Open Positions: <b className="text-cyan-400">{openPositions.length}</b>
          </div>
        </div>
      </div>

      {/* SUB-VIEW 1: ACTIVE STRATEGIES */}
      {monitorSubTab === "active" && (
        <ActiveStrategiesTab currencySymbol={selectedUnderlying.currencySymbol} />
      )}

      {/* SUB-VIEW 2: ORDERS & POSITIONS */}
      {monitorSubTab === "orders" && (
        <OrdersPositionsTab currencySymbol={selectedUnderlying.currencySymbol} />
      )}

      {/* SUB-VIEW 3: RISK MONITOR */}
      {monitorSubTab === "risk" && (
        <RiskMonitorTab currencySymbol={selectedUnderlying.currencySymbol} />
      )}
    </div>
  );
}
