"use client";

import React from "react";
import { useOptionsMarketContext, WorkstationPrimarySection } from "@/context/OptionsMarketContext";
import { OptionsMarketHeader } from "./OptionsMarketHeader";
import { StateAwareCommandBar } from "./StateAwareCommandBar";
import { BuildSection } from "./sections/BuildSection";
import { AnalyzeSection } from "./sections/AnalyzeSection";
import { MonitorSection } from "./sections/MonitorSection";
import { BacktestSection } from "./sections/BacktestSection";
import {
  Layers,
  Activity,
  Zap,
  Sliders,
  Shield,
  BarChart2,
  Server,
  FileText,
  Compass,
} from "lucide-react";

export function MultiMarketOptionsWorkstation() {
  const {
    activeSection,
    setActiveSection,
    statusNotification,
    dismissNotification,
    activeStrategies,
    openPositions,
  } = useOptionsMarketContext();

  return (
    <div className="w-full space-y-4">
      {/* 1. Global Sticky Market Header */}
      <OptionsMarketHeader />

      {/* 2. Notification Toast Banner */}
      {statusNotification && (
        <div
          className={`p-3 rounded-2xl font-mono text-xs font-bold border transition flex items-center justify-between shadow-lg ${
            statusNotification.type === "success"
              ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300 shadow-emerald-950/30"
              : statusNotification.type === "warn"
              ? "bg-rose-950/80 border-rose-500/40 text-rose-300 shadow-rose-950/30"
              : "bg-cyan-950/80 border-cyan-500/40 text-cyan-300 shadow-cyan-950/30"
          }`}
        >
          <span>{statusNotification.text}</span>
          <button
            onClick={dismissNotification}
            className="text-slate-400 hover:text-white ml-3 font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3. Streamlined Primary Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-[#080E1E] border border-slate-800 rounded-2xl font-mono text-xs overflow-x-auto shadow-xl">
        {[
          { id: "build", label: "Build", desc: "4-Step Strategy Builder", icon: Layers },
          { id: "analyze", label: "Analyze", desc: "Chain, Payoff & Pairs", icon: BarChart2 },
          {
            id: "monitor",
            label: "Monitor",
            desc: "Active & Risk",
            icon: Activity,
            badge: activeStrategies.length > 0 ? `${activeStrategies.length}` : undefined,
          },
          { id: "backtest", label: "Backtest", desc: "Walk-Forward OOS", icon: Compass },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as WorkstationPrimarySection)}
              className={`flex-1 min-w-[150px] flex items-center justify-between p-2 rounded-xl transition ${
                isActive
                  ? "bg-gradient-to-r from-cyan-500 to-indigo-500 text-slate-950 shadow-md font-extrabold"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <div className="text-left">
                  <div className="font-extrabold text-xs leading-none">{tab.label}</div>
                  <div className={`text-[10px] mt-0.5 ${isActive ? "text-slate-900 font-bold" : "text-slate-500"}`}>
                    {tab.desc}
                  </div>
                </div>
              </div>

              {tab.badge && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                    isActive ? "bg-slate-950 text-cyan-400" : "bg-cyan-950 text-cyan-300 border border-cyan-500/30"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. Active Section Content Rendering */}
      <main className="w-full">
        {activeSection === "build" && <BuildSection />}
        {activeSection === "analyze" && <AnalyzeSection />}
        {activeSection === "monitor" && <MonitorSection />}
        {activeSection === "backtest" && <BacktestSection />}
      </main>

      {/* 5. Sticky State-Aware Command Bar */}
      <StateAwareCommandBar />
    </div>
  );
}

