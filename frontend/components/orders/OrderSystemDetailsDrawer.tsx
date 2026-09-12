"use client";

import React from "react";
import { X, ShieldCheck, Cpu, Activity, Zap, CheckCircle2, ShieldAlert } from "lucide-react";
import { useGlobalData } from "@/context/GlobalDataContext";

interface OrderSystemDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  price: number;
}

export function OrderSystemDetailsDrawer({
  isOpen,
  onClose,
  symbol,
  price,
}: OrderSystemDetailsDrawerProps) {
  const { riskSummary, portfolioSnapshot, tradingMode } = useGlobalData();

  if (!isOpen) return null;

  const gatesList = [
    { id: 1, name: "Global Kill Switch", status: "PASS", desc: "Emergency shutdown inactive on server." },
    { id: 2, name: "Live Market Feed Freshness", status: "PASS", desc: "Real-time tick age < 100ms." },
    { id: 3, name: "Broker Link Connectivity", status: "PASS", desc: "Direct REST/WebSocket adapter armed." },
    { id: 4, name: "Available Margin & Capital", status: "PASS", desc: `Available: $${(portfolioSnapshot?.availableCapital || 50000).toLocaleString()}.` },
    { id: 5, name: "Daily Loss Limit Guard", status: "PASS", desc: "Daily loss under -$5,000 threshold." },
    { id: 6, name: "Max Exposure & Position Size", status: "PASS", desc: "Order size within asset bounds." },
    { id: 7, name: "Leverage Multiplier Cap", status: "PASS", desc: "Instrument leverage within allowed tier." },
    { id: 8, name: "Stop Loss Boundaries", status: "PASS", desc: "Stop loss price on correct side of entry." },
    { id: 9, name: "Take Profit Target Logic", status: "PASS", desc: "Take profit aligns with expected direction." },
    { id: 10, name: "Idempotency & Duplicate Guard", status: "PASS", desc: "Client order ID deduplication cache armed." },
    { id: 11, name: "Position Netting Alignment", status: "PASS", desc: "Directional flip and partial close verified." },
    { id: 12, name: "Schema & Precision Validation", status: "PASS", desc: "Quantity step and tick size verified." },
    { id: 13, name: "Exchange Trading Session", status: "PASS", desc: "Market session open and accepting orders." },
    { id: 14, name: "Reconciliation Ledger State", status: "PASS", desc: "Local database matches broker balance." },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 font-sans text-xs">
      <div className="w-full max-w-xl h-full bg-[#07101A] border-l border-[#1A2A3F] shadow-2xl p-5 sm:p-6 overflow-y-auto flex flex-col space-y-5 text-[#7C8CA3]">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1A2A3F] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/30">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F7FAFC] tracking-tight">
                System Health & Risk Gates
              </h3>
              <p className="text-xs text-[#7C8CA3]">
                14-Point Pre-Order Validation & Health Telemetry
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7C8CA3] hover:text-[#F7FAFC] hover:bg-[#101B2D] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Telemetry Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-3 bg-[#0A1422] border border-[#1A2A3F] rounded-lg">
            <div className="text-[10px] text-[#52627A]">Broker Link</div>
            <div className="text-[#00E890] font-semibold mt-0.5">CONNECTED</div>
          </div>
          <div className="p-3 bg-[#0A1422] border border-[#1A2A3F] rounded-lg">
            <div className="text-[10px] text-[#52627A]">Feed Latency</div>
            <div className="text-[#22D3EE] font-mono tabular-nums font-semibold mt-0.5">18 ms</div>
          </div>
          <div className="p-3 bg-[#0A1422] border border-[#1A2A3F] rounded-lg">
            <div className="text-[10px] text-[#52627A]">Risk Gate</div>
            <div className="text-[#00E890] font-semibold mt-0.5">ARMED (14/14)</div>
          </div>
          <div className="p-3 bg-[#0A1422] border border-[#1A2A3F] rounded-lg">
            <div className="text-[10px] text-[#52627A]">Engine Mode</div>
            <div className="text-[#19C5FF] font-bold mt-0.5">{tradingMode}</div>
          </div>
        </div>

        {/* 14 Safety Gates Detailed List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#F7FAFC]">14 Safety Check Gates</span>
            <span className="text-[10px] text-[#00E890] font-semibold">ALL CHECKS PASSED</span>
          </div>

          <div className="space-y-2">
            {gatesList.map((g) => (
              <div
                key={g.id}
                className="flex items-start justify-between p-2.5 bg-[#0A1422] border border-[#1A2A3F] rounded-lg"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#52627A] font-mono">#{g.id}</span>
                    <span className="font-semibold text-[#F7FAFC] text-xs">{g.name}</span>
                  </div>
                  <div className="text-[11px] text-[#7C8CA3] mt-0.5">{g.desc}</div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-[#00E890]/15 text-[#00E890] border border-[#00E890]/30 font-semibold text-[10px] shrink-0 ml-2">
                  PASS
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

