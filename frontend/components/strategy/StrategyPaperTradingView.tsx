"use client";

import React, { useState } from "react";
import {
  Play,
  Pause,
  Plus,
  Shield,
  Clock,
  TrendingUp,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Radio,
  ArrowUpRight,
  ArrowDownRight,
  Bot,
} from "lucide-react";
import { useStrategyStore } from "@/lib/strategies/strategyStore";
import { CRYPTO_30_STRATEGIES } from "@/lib/strategies/crypto30Strategies";
import { formatMoney } from "@/lib/formatters";

export function StrategyPaperTradingView() {
  const {
    paperInstances,
    journalRecords,
    pausePaperStrategy,
    activatePaperStrategy,
    closePaperTrade,
  } = useStrategyStore();

  const [selectedStratNum, setSelectedStratNum] = useState("01");
  const [selectedInstrument, setSelectedInstrument] = useState("BTCUSDT");
  const [selectedTimeframe, setSelectedTimeframe] = useState("4H");
  const [selectedRiskPct, setSelectedRiskPct] = useState(0.5);

  const paperTrades = journalRecords.filter((r) => r.executionEnvironment === "PAPER");
  const openPaperPositions = paperTrades.filter((r) => r.status === "OPEN");
  const closedPaperTrades = paperTrades.filter((r) => r.status === "CLOSED");

  const totalPaperPnl = paperTrades.reduce((acc, t) => acc + (t.netPnl || 0), 0);
  const winCount = closedPaperTrades.filter((t) => t.netPnl > 0).length;
  const paperWinRate = closedPaperTrades.length > 0 ? (winCount / closedPaperTrades.length) * 100 : 0;

  const handleCreatePaperInstance = () => {
    activatePaperStrategy(selectedStratNum, selectedInstrument, selectedTimeframe, selectedRiskPct);
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans text-slate-100">
      {/* Top Paper Trading Summary Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0B0F19] border border-[#1E293B]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-cyan-900/40">
            <Radio className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                Paper Trading Live Simulation Fleet
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                DATASET: PAPER TRADING ONLY
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Simulates real-time order execution, entry, stops, targets, slippage, and funding.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-[#0E1628] border border-[#1A2840]">
            <span className="text-[10px] text-slate-400 block">TOTAL PAPER P&L</span>
            <span className={`font-bold ${totalPaperPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {totalPaperPnl >= 0 ? "+" : ""}{formatMoney(totalPaperPnl)}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0E1628] border border-[#1A2840]">
            <span className="text-[10px] text-slate-400 block">WIN RATE</span>
            <span className="font-bold text-cyan-300">{paperWinRate.toFixed(1)}% ({winCount}W / {closedPaperTrades.length} Closed)</span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0E1628] border border-[#1A2840]">
            <span className="text-[10px] text-slate-400 block">ACTIVE FLEET</span>
            <span className="font-bold text-white">{paperInstances.length} Strategies Running</span>
          </div>
        </div>
      </div>

      {/* Deploy New Paper Instance Launcher Bar */}
      <div className="p-4 rounded-xl bg-[#090E1A] border border-[#1E293B] flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
          Launch New Paper Strategy Instance:
        </span>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <select
            value={selectedStratNum}
            onChange={(e) => setSelectedStratNum(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[#060A14] border border-[#1F2E47] text-white"
          >
            {CRYPTO_30_STRATEGIES.map((s) => (
              <option key={s.number} value={s.number}>
                #{s.number} {s.name}
              </option>
            ))}
          </select>

          <select
            value={selectedInstrument}
            onChange={(e) => setSelectedInstrument(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[#060A14] border border-[#1F2E47] text-white"
          >
            <option value="BTCUSDT">BTCUSDT</option>
            <option value="ETHUSDT">ETHUSDT</option>
            <option value="SOLUSDT">SOLUSDT</option>
            <option value="AVAXUSDT">AVAXUSDT</option>
          </select>

          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[#060A14] border border-[#1F2E47] text-white"
          >
            <option value="15m">15m</option>
            <option value="1H">1H</option>
            <option value="4H">4H</option>
            <option value="1D">1D</option>
          </select>

          <input
            type="number"
            step="0.1"
            value={selectedRiskPct}
            onChange={(e) => setSelectedRiskPct(Number(e.target.value))}
            className="w-20 px-2.5 py-1.5 rounded-lg bg-[#060A14] border border-[#1F2E47] text-cyan-300"
            placeholder="Risk %"
          />

          <button
            onClick={handleCreatePaperInstance}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition shadow-md"
          >
            <Play className="h-3.5 w-3.5" />
            <span>DEPLOY INSTANCE</span>
          </button>
        </div>
      </div>

      {/* Active Paper Strategy Fleet Cards */}
      <div className="space-y-3">
        <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">
          Active Paper Fleet Instances ({paperInstances.length})
        </span>

        {paperInstances.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-[#090E1A] border border-[#1E293B] text-slate-500 text-xs font-mono">
            No active paper instances running. Deploy an instance above or from the strategy library cards.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {paperInstances.map((inst) => (
              <div
                key={inst.instanceId}
                className="p-4 rounded-xl bg-[#0D1424] border border-[#1E2E4A] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 font-mono font-bold text-xs border border-cyan-800">
                      #{inst.strategyNumber}
                    </span>
                    <span className="text-xs font-bold text-white truncate max-w-[160px]">{inst.strategyName}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      inst.status === "ACTIVE"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        : "bg-amber-950 text-amber-400 border border-amber-800"
                    }`}
                  >
                    {inst.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-400 pt-1 border-t border-[#16233B]">
                  <div>
                    <span className="text-[9px] text-slate-500 block">PAIR</span>
                    <span className="text-white font-bold">{inst.instrument}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">TIMEFRAME</span>
                    <span className="text-white font-bold">{inst.timeframe}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">RISK</span>
                    <span className="text-cyan-300 font-bold">{inst.riskPct}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#16233B] text-xs">
                  <span className="text-[10px] font-mono text-slate-400">
                    Active Since: {inst.createdAt.substring(11, 16)} UTC
                  </span>

                  <button
                    onClick={() => pausePaperStrategy(inst.instanceId)}
                    className="px-2.5 py-1 rounded bg-[#16233B] hover:bg-[#203252] text-xs font-mono font-semibold text-slate-300 transition"
                  >
                    {inst.status === "ACTIVE" ? "Pause" : "Resume"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Open Paper Positions */}
      <div className="p-4 rounded-xl bg-[#090E1A] border border-[#1E293B] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-white uppercase">
            Active Open Paper Positions ({openPaperPositions.length})
          </span>
          <span className="text-[10px] font-mono text-cyan-400">Real-Time Forward Execution</span>
        </div>

        {openPaperPositions.length === 0 ? (
          <div className="p-6 text-center text-xs font-mono text-slate-500">
            No open forward paper positions currently active. Awaiting strategy signal trigger.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-[#1A2840] text-slate-400 text-[10px] uppercase">
                <tr>
                  <th className="py-2 px-3">Strategy</th>
                  <th className="py-2 px-3">Instrument</th>
                  <th className="py-2 px-3">Side</th>
                  <th className="py-2 px-3">Entry Price</th>
                  <th className="py-2 px-3">Stop Loss</th>
                  <th className="py-2 px-3">Take Profit</th>
                  <th className="py-2 px-3">Size (Units)</th>
                  <th className="py-2 px-3">Unrealized P&L</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#152033]">
                {openPaperPositions.map((pos) => (
                  <tr key={pos.journalId} className="hover:bg-[#0E172A] transition">
                    <td className="py-2.5 px-3 text-white font-bold">
                      #{pos.strategyNumber} {pos.strategyName}
                    </td>
                    <td className="py-2.5 px-3 text-cyan-300 font-bold">{pos.instrument}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          pos.direction === "LONG"
                            ? "bg-emerald-950 text-emerald-400"
                            : "bg-red-950 text-red-400"
                        }`}
                      >
                        {pos.direction}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">{formatMoney(pos.entryPrice)}</td>
                    <td className="py-2.5 px-3 text-red-400">{formatMoney(pos.stopPrice)}</td>
                    <td className="py-2.5 px-3 text-emerald-400">{formatMoney(pos.targetPrice)}</td>
                    <td className="py-2.5 px-3">{pos.positionSizeUnits}</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-400">
                      +{formatMoney(pos.netPnl)} (+{pos.rMultiple}R)
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => closePaperTrade(pos.journalId, pos.targetPrice, "MANUAL_EXIT")}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold"
                      >
                        Close Market
                      </button>
                    </td>
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
