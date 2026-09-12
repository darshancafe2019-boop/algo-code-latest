"use client";

import React, { useState } from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { useGlobalData } from "@/context/GlobalDataContext";
import { NewOrderTicket } from "@/components/orders/NewOrderTicket";
import { OrdersLedgerDock } from "@/components/orders/OrdersLedgerDock";
import { OrderSystemDetailsDrawer } from "@/components/orders/OrderSystemDetailsDrawer";
import { ShieldCheck, ShieldAlert, Cpu, Activity, RefreshCw } from "lucide-react";

export default function OrdersPage() {
  const { tradingMode, riskSummary, portfolioSnapshot, refreshAll, isLoading } = useGlobalData();
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);

  const isRiskSafe = riskSummary ? !riskSummary.globalKillSwitchActive : true;
  const availableCapital = portfolioSnapshot?.availableCapital ?? 50000.0;

  return (
    <DirectPageLayout activeTab="orders">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-[1400px] mx-auto min-w-0 font-sans">
        {/* ========================================================================= */}
        {/* 1. MASTER TOP HEADER & COMPACT HEALTH STATUS                              */}
        {/* ========================================================================= */}
        <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Title & Subtitle */}
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg md:text-xl font-bold text-[#F7FAFC] tracking-tight">
                  ORDER & EXECUTION COMMAND CENTER
                </h1>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#101B2D] border border-[#1A2A3F] text-[#7C8CA3] font-medium">
                  Quant.OS Execution
                </span>
              </div>
              <p className="text-xs text-[#7C8CA3] mt-0.5">
                Server-authoritative execution with central pre-trade risk validation
              </p>
            </div>

            {/* Compact Health Strip */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-3 py-1.5 bg-[#07101A] rounded-lg border border-[#1A2A3F] text-xs text-[#7C8CA3]">
              <div className="flex items-center gap-1.5">
                <span className="text-[#52627A]">Broker</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E890]" />
                <span className="text-[#00E890] font-medium">CONNECTED</span>
              </div>
              <span className="text-[#1A2A3F] hidden sm:inline">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[#52627A]">Market Data</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE] animate-pulse" />
                <span className="text-[#22D3EE] font-medium font-mono tabular-nums">LIVE 28ms</span>
              </div>
              <span className="text-[#1A2A3F] hidden sm:inline">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[#52627A]">Risk Engine</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E890]" />
                <span className="text-[#00E890] font-medium">READY</span>
              </div>
              <span className="text-[#1A2A3F] hidden sm:inline">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[#52627A]">OMS</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E890]" />
                <span className="text-[#00E890] font-medium">READY</span>
              </div>
            </div>

            {/* Header Right Status Badges & Controls */}
            <div className="flex items-center gap-2 text-xs">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-semibold ${
                  isRiskSafe
                    ? "bg-[#00E890]/10 border-[#00E890]/30 text-[#00E890]"
                    : "bg-[#FF3B5C]/10 border-[#FF3B5C]/30 text-[#FF3B5C]"
                }`}
              >
                {isRiskSafe ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                <span>{isRiskSafe ? "RISK SAFE" : "RISK BLOCKED"}</span>
              </div>

              <div className="px-2.5 py-1 rounded-md bg-[#19C5FF]/10 border border-[#19C5FF]/30 text-[#19C5FF] font-bold">
                {tradingMode}
              </div>

              <button
                onClick={() => setIsDetailsDrawerOpen(true)}
                className="px-3 py-1 rounded-lg bg-[#0D1727] border border-[#1A2A3F] hover:border-[#29415F] text-[#7C8CA3] hover:text-[#F7FAFC] transition font-medium text-xs"
              >
                System Health
              </button>

              <button
                onClick={() => refreshAll()}
                className="p-1.5 rounded-lg bg-[#0D1727] border border-[#1A2A3F] hover:border-[#29415F] text-[#7C8CA3] hover:text-[#F7FAFC] transition"
                title="Refresh Global Portfolio"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. MAIN ORDER TICKET                                                      */}
        {/* ========================================================================= */}
        <div className="w-full">
          <NewOrderTicket onOpenDetailsDrawer={() => setIsDetailsDrawerOpen(false)} />
        </div>

        {/* ========================================================================= */}
        {/* 3. ORDER LEDGER & HISTORY DOCK                                            */}
        {/* ========================================================================= */}
        <OrdersLedgerDock />

        {/* ========================================================================= */}
        {/* 4. ON-DEMAND SYSTEM HEALTH & 14 RISK GATES DRAWER                         */}
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

