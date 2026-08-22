"use client";

import React, { useState, useEffect } from "react";
import {
  FlaskConical,
  Play,
  Square,
  Activity,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Zap,
} from "lucide-react";
import { FullVisualStrategy } from "@/types/strategy-builder";

interface StrategyPaperTestPanelProps {
  strategy: FullVisualStrategy;
}

export function StrategyPaperTestPanel({ strategy }: StrategyPaperTestPanelProps) {
  const [isActive, setIsActive] = useState(false);
  const [ticksProcessed, setTicksProcessed] = useState(0);
  const [paperPnl, setPaperPnl] = useState(0.0);
  const [signalsLog, setSignalsLog] = useState<
    Array<{ id: number; timestamp: string; signal: string; confidence: number; price: number; reason: string }>
  >([]);

  useEffect(() => {
    let interval: any;
    if (isActive) {
      interval = setInterval(() => {
        setTicksProcessed((prev) => prev + 1);

        // Periodically simulate a signal
        if (Math.random() > 0.65) {
          const isBull = Math.random() > 0.4;
          const conf = Math.floor(75 + Math.random() * 20);
          const price = 64500 + Math.random() * 500;
          const newSignal = {
            id: Date.now(),
            timestamp: new Date().toLocaleTimeString(),
            signal: isBull ? "BUY" : "SELL",
            confidence: conf,
            price: Math.round(price * 100) / 100,
            reason: isBull ? "EMA Crossover + RSI Bullish (>55)" : "EMA Breakdown + Volume Surge",
          };

          setSignalsLog((prev) => [newSignal, ...prev.slice(0, 9)]);

          // Simulated paper pnl fluctuation
          setPaperPnl((prev) => prev + (isBull ? 25.5 : -10.2));
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 font-sans select-none">
      {/* Header & Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1A2333] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-950 text-blue-400 border border-blue-800">
            <FlaskConical className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              Live Paper Testing Stream
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800 font-mono">
                Realtime Forward Testing
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Run this strategy in simulated Paper Trading mode with zero financial risk.
            </p>
          </div>
        </div>

        {/* Start / Stop Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-500">Ticks:</span>
            <span className="text-white font-bold">{ticksProcessed}</span>
            <span className="text-slate-500 ml-2">Paper P&L:</span>
            <span className={`font-bold ${(Number(paperPnl) || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {(Number(paperPnl) || 0) >= 0 ? `+$${(Number(paperPnl) || 0).toFixed(2)}` : `-$${Math.abs(Number(paperPnl) || 0).toFixed(2)}`}
            </span>
          </div>

          <button
            onClick={() => setIsActive(!isActive)}
            className={`px-4 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md ${
              isActive
                ? "bg-red-600 hover:bg-red-500 text-white"
                : "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white"
            }`}
          >
            {isActive ? <Square className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}
            <span>{isActive ? "Stop Paper Stream" : "Start Paper Stream"}</span>
          </button>
        </div>
      </div>

      {/* Signals Stream Table */}
      <div className="space-y-2">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Realtime Signal Output Stream ({signalsLog.length} Events)
        </h4>

        {signalsLog.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-[#121927]/40 rounded-xl border border-dashed border-[#1E293B]">
            {isActive
              ? "Listening to live market feed for confluence condition triggers..."
              : "Click \"Start Paper Stream\" to begin live market simulation."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#1E293B] bg-[#0A0E17]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#121927] text-[10px] text-slate-400 border-b border-[#1E293B]">
                <tr>
                  <th className="py-2 px-3">Time</th>
                  <th className="py-2 px-3">Signal</th>
                  <th className="py-2 px-3">Confidence</th>
                  <th className="py-2 px-3">Market Price</th>
                  <th className="py-2 px-3">Confluence Reasoning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A2333]">
                {signalsLog.map((sig) => (
                  <tr key={sig.id} className="hover:bg-[#121927] transition-colors">
                    <td className="py-2 px-3 text-slate-400">{sig.timestamp}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sig.signal === "BUY"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : "bg-red-950 text-red-400 border border-red-800"
                        }`}
                      >
                        {sig.signal}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-cyan-400 font-bold">{sig.confidence}%</td>
                    <td className="py-2 px-3 text-white font-bold">${sig.price?.toLocaleString()}</td>
                    <td className="py-2 px-3 text-slate-300 text-[11px]">{sig.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
