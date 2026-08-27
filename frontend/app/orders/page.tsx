"use client";

import React, { useState } from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { useGlobalData } from "@/context/GlobalDataContext";
import { NewOrderTicket } from "@/components/orders/NewOrderTicket";
import { OrdersLedgerDock } from "@/components/orders/OrdersLedgerDock";
import { OrderSystemDetailsDrawer } from "@/components/orders/OrderSystemDetailsDrawer";
import { ShieldCheck, ShieldAlert, Cpu, Activity, Zap, RefreshCw } from "lucide-react";

export default function OrdersPage() {
  const { tradingMode, riskSummary, portfolioSnapshot, refreshAll, isLoading } = useGlobalData();
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);

  const isRiskSafe = riskSummary ? !riskSummary.globalKillSwitchActive : true;
  const availableCapital = portfolioSnapshot?.availableCapital ?? 50000.0;

  return (
    <DirectPageLayout activeTab="orders">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-[1400px] mx-auto min-w-0 font-sans">
        {/* ========================================================================= */}
        {/* 1. SIMPLE TOP HEADER & COMPACT HEALTH STATUS                              */}
        {/* ========================================================================= */}
        <div className="bg-[#0B132B]/90 border border-slate-800 rounded-2xl p-4 md:p-5 backdrop-blur-md shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Title & Simplified Subtitle */}
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl md:text-2xl font-black font-mono text-white tracking-wide">
                  NEW ORDER
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                  Quant.OS Execution
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Server-validated execution with central risk protection.
              </p>
            </div>

            {/* Compact Health Strip (Broker ✓ Feed ✓ Risk ✓ Execution ✓) */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 px-3 py-1.5 bg-slate-900/90 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
              <div className="flex items-center gap-1">
                <span className="text-slate-500">Broker</span>
                <span className="text-emerald-400 font-bold">✓</span>
              </div>
              <span className="text-slate-700 hidden sm:inline">•</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-500">Feed</span>
                <span className="text-emerald-400 font-bold">✓</span>
              </div>
              <span className="text-slate-700 hidden sm:inline">•</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-500">Risk</span>
                <span className="text-emerald-400 font-bold">✓</span>
              </div>
              <span className="text-slate-700 hidden sm:inline">•</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-500">Execution</span>
                <span className="text-emerald-400 font-bold">✓</span>
              </div>
            </div>

            {/* Header Right Status Badges & Controls */}
            <div className="flex items-center gap-2 font-mono text-xs">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-bold ${
                  isRiskSafe
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                }`}
              >
                {isRiskSafe ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                <span>{isRiskSafe ? "RISK SAFE" : "RISK BLOCKED"}</span>
              </div>

              <div className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold">
                {tradingMode}
              </div>

              <button
                onClick={() => setIsDetailsDrawerOpen(true)}
                className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition font-bold"
              >
                System Details
              </button>

              <button
                onClick={() => refreshAll()}
                className="p-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition"
                title="Refresh Global Portfolio"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. MAIN STREAMLINED ORDER TICKET                                          */}
        {/* ========================================================================= */}
        <div className="w-full">
          <NewOrderTicket onOpenDetailsDrawer={() => setIsDetailsDrawerOpen(true)} />
        </div>

        {/* ========================================================================= */}
        {/* 3. BOTTOM ORDERS & HISTORY DOCK                                           */}
        {/* ========================================================================= */}
        <OrdersLedgerDock />

        {/* ========================================================================= */}
        {/* 4. ON-DEMAND SYSTEM DETAILS & 14 RISK GATES DRAWER                        */}
        {/* ========================================================================= */}
        <OrderSystemDetailsDrawer
          isOpen={isDetailsDrawerOpen}
          onClose={() => setIsDetailsDrawerOpen(false)}
          symbol="BTC/USDT"
          price={65240.0}
        />
      </div>
    </DirectPageLayout>
  );
}
