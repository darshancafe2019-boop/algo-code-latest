"use client";

import React, { useState } from "react";
import {
  Zap,
  Lock,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Radio,
  SlidersHorizontal,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { DrawerContentType } from "./useSharedTradingState";
import { cn } from "@/lib/utils";

interface ExecutionCardProps {
  tradingMode: "PAPER" | "LIVE";
  liveTradingEnabled: boolean;
  onExecutePaper: () => void;
  onOpenLiveModal: () => void;
  onOpenDrawer: (type: DrawerContentType, title: string, data?: any) => void;
  isLoading: boolean;
}

export const ExecutionCard: React.FC<ExecutionCardProps> = ({
  tradingMode,
  liveTradingEnabled,
  onExecutePaper,
  onOpenLiveModal,
  onOpenDrawer,
  isLoading,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [orderType, setOrderType] = useState("MARKET");
  const [timeInForce, setTimeInForce] = useState("DAY");
  const [slippage, setSlippage] = useState("0.05%");
  const [routing, setRouting] = useState("SMART_PRIMARY_DHAN");
  const [policy, setPolicy] = useState("FAILOVER_ON_TIMEOUT");

  return (
    <div className="w-full bg-[#050e1d]/90 border border-[#12365a] rounded-xl p-4 shadow-lg select-none backdrop-blur flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#0d2847]">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            ORDER EXECUTION LAYER
          </h3>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-bold">
            {tradingMode} MODE
          </span>
          <span className="px-2 py-0.5 rounded bg-[#07192f] border border-[#143e69] text-emerald-400 font-bold">
            BROKER: DHAN
          </span>
        </div>
      </div>

      {/* Main Execution Trigger */}
      <div className="py-3 space-y-3">
        <button
          onClick={onExecutePaper}
          disabled={isLoading}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Zap className="h-4 w-4" />
          EXECUTE PAPER TRADE
        </button>

        {/* Advanced Toggle */}
        <div className="pt-1">
          <button
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="flex items-center justify-between w-full text-[11px] font-mono text-slate-400 hover:text-slate-200 transition-colors py-1 cursor-pointer"
          >
            <span className="flex items-center gap-1">
              <SlidersHorizontal className="h-3 w-3 text-[#00D4FF]" />
              Advanced Execution Parameters
            </span>
            {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {showAdvanced && (
            <div className="mt-2 p-2.5 rounded-lg bg-[#040f1f] border border-[#0d2847] space-y-2 text-[11px] font-mono">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-500 text-[10px] block">ORDER TYPE</label>
                  <select
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value)}
                    className="w-full bg-[#07192f] border border-[#143e69] rounded px-1.5 py-1 text-slate-200 mt-0.5"
                  >
                    <option value="MARKET">MARKET</option>
                    <option value="LIMIT">LIMIT</option>
                    <option value="SL_M">SL-M</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-500 text-[10px] block">TIME IN FORCE</label>
                  <select
                    value={timeInForce}
                    onChange={(e) => setTimeInForce(e.target.value)}
                    className="w-full bg-[#07192f] border border-[#143e69] rounded px-1.5 py-1 text-slate-200 mt-0.5"
                  >
                    <option value="DAY">DAY</option>
                    <option value="IOC">IOC</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-500 text-[10px] block">SLIPPAGE GUARD</label>
                  <input
                    type="text"
                    value={slippage}
                    onChange={(e) => setSlippage(e.target.value)}
                    className="w-full bg-[#07192f] border border-[#143e69] rounded px-1.5 py-1 text-slate-200 mt-0.5"
                  />
                </div>

                <div>
                  <label className="text-slate-500 text-[10px] block">BROKER ROUTING</label>
                  <select
                    value={routing}
                    onChange={(e) => setRouting(e.target.value)}
                    className="w-full bg-[#07192f] border border-[#143e69] rounded px-1.5 py-1 text-slate-200 mt-0.5"
                  >
                    <option value="SMART_PRIMARY_DHAN">Dhan Primary</option>
                    <option value="SMART_UPSTOX">Upstox Primary</option>
                    <option value="SMART_FYERS">FYERS Primary</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Trading Lock Section */}
      <div className="pt-2.5 border-t border-[#0d2847] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          <Lock className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-slate-300 font-semibold">LIVE TRADING:</span>
          <span className="text-amber-400 font-bold">LOCKED</span>
        </div>

        <button
          onClick={onOpenLiveModal}
          className="px-2.5 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 text-rose-300 hover:text-white text-[11px] font-mono font-bold transition-all cursor-pointer"
        >
          ENABLE LIVE TRADING
        </button>
      </div>
    </div>
  );
};
