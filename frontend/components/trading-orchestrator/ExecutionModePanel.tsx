"use client";

import React from "react";
import { ShieldCheck, ShieldAlert, Cpu, Lock, CheckCircle2, AlertOctagon } from "lucide-react";

interface ExecutionModePanelProps {
  tradingMode: string;
  isLiveArmed: boolean;
}

export const ExecutionModePanel: React.FC<ExecutionModePanelProps> = ({
  tradingMode = "PAPER",
  isLiveArmed = false,
}) => {
  return (
    <div className="bg-[#0B0E17]/95 border border-[#1A2A3F] rounded-xl p-4 shadow-lg mb-6">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-cyan-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Execution Mode & Safety Guards
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Paper Trading Card */}
        <div className="bg-slate-900/50 border border-amber-500/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              PAPER TRADING (SIMULATION)
            </span>
            <span className="text-[10px] font-mono font-bold bg-amber-950/80 border border-amber-800 text-amber-400 px-2 py-0.5 rounded">
              DEFAULT ACTIVE
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            High-fidelity simulated fills with realistic slippage, Indian transaction charges (STT, GST, SEBI fee), and real-time position ledger updates.
          </p>
        </div>

        {/* Live Trading Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-slate-400" />
              LIVE BROKER ROUTING
            </span>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                isLiveArmed
                  ? "bg-emerald-950/80 border-emerald-800 text-emerald-400"
                  : "bg-slate-800 border-slate-700 text-slate-400"
              }`}
            >
              {isLiveArmed ? "ARMED" : "DISABLED BY DEFAULT"}
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Requires explicit operator approval for every trade proposal. Direct broker execution without human sign-off is strictly prohibited.
          </p>
        </div>
      </div>
    </div>
  );
};
