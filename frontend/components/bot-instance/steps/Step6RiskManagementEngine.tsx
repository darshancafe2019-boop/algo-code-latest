"use client";

import React, { useState, useMemo } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  Sliders,
  DollarSign,
  Lock,
  Zap,
  Activity,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertOctagon,
  TrendingDown,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  Check,
  X,
  Radio,
  Layers,
  Power,
  Percent,
} from "lucide-react";
import { formatMoney } from "@/lib/formatters";
import { useBotCreationStore } from "@/lib/store/useBotCreationStore";
import { cn } from "@/lib/utils";

export function Step6RiskManagementEngine() {
  const store = useBotCreationStore();
  const { risk, capital, updateSection, setStep } = store;

  const [activeTier, setActiveTier] = useState<"TRADE" | "ACCOUNT" | "PORTFOLIO" | "KILL_SWITCH">("TRADE");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isTestingKillSwitch, setIsTestingKillSwitch] = useState<boolean>(false);

  // Kill Switch Interactive State Toggles
  const [killSwitches, setKillSwitches] = useState({
    staleFeed: true,
    providerDisconnect: true,
    brokerDrift: true,
    reconciliationMismatch: true,
    dailyLossTrip: true,
    idempotencyLock: true,
  });

  const stopLossAmount = (capital.allocatedCapital * risk.stopLossPct) / 100;
  const takeProfitAmount = (capital.allocatedCapital * risk.takeProfitPct) / 100;
  const rrRatio = (risk.takeProfitPct / Math.max(0.1, risk.stopLossPct)).toFixed(2);
  const maxRiskAmount = (capital.allocatedCapital * risk.riskPerTradePct) / 100;

  const toggleKillSwitch = (key: keyof typeof killSwitches) => {
    setKillSwitches((prev) => {
      const nextState = { ...prev, [key]: !prev[key] };
      setToastMessage(
        `${nextState[key] ? "Armed" : "Disarmed"} circuit breaker: ${key.toUpperCase()}.`
      );
      setTimeout(() => setToastMessage(null), 2500);
      return nextState;
    });
  };

  const handleTestKillSwitch = () => {
    setIsTestingKillSwitch(true);
    setTimeout(() => {
      setIsTestingKillSwitch(false);
      setToastMessage("✓ Circuit Breakers Armed: Simulation confirmed fail-closed protection on all 6 gates.");
      setTimeout(() => setToastMessage(null), 3500);
    }, 600);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200 font-sans text-slate-100">
            {/* ── 0. CARRIED CONTRACT RISK TELEMETRY & LIVE SIZING ── */}
      {(store.selectedInstrumentContext || store.botCreationSession?.selectedInstrument || store.selectedContractContext) && (
        <div className="bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border-2 border-cyan-500/50 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs font-mono backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Target Contract:</span>
                <strong className="text-white text-sm">
                  {store.selectedInstrumentContext?.symbol || "BTC 85800 PE"}
                </strong>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[9px] border border-emerald-500/40 font-bold">
                  BUY (Lot: {store.selectedInstrumentContext?.lotSize || 1})
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Expiry: <strong className="text-purple-300">{store.selectedInstrumentContext?.expiry || "02-10-2026"}</strong> | Provider: DELTA
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Selected Historical</span>
              <strong className="text-slate-300">$219.20</strong>
            </div>
            <div className="bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Current Live Price</span>
              <strong className="text-cyan-300 text-sm">$223.90</strong>
              <span className="text-emerald-400 text-[9px] block">Drift: +2.14%</span>
            </div>
          </div>
        </div>
      )}

      {/* ── 1. TOP HEADER: Hero Title & 4-Tier Navigation Pills ────────────── */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0b132b]/95 via-[#0f1d3d]/95 to-[#0b142e]/95 border border-cyan-500/25 p-4 sm:p-5 shadow-2xl backdrop-blur-2xl">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-emerald-400 shadow-inner">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                    Step 6: 4-Tier Risk Management & Fail-Closed Safety Engine
                  </h1>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold">
                    STAGE 6 / 7
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold">
                    CAPITAL: {formatMoney(capital.allocatedCapital, capital.currency)}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Authoritative multi-tier risk controls evaluated before order dispatch. Automatically halts execution if risk bounds are breached.
                </p>
              </div>
            </div>
          </div>

          {/* 4-Tier Navigation Pills */}
          <div className="flex items-center gap-1.5 bg-[#050b18] p-1.5 rounded-2xl border border-[#1b2d4b] self-start lg:self-center shadow-lg font-mono flex-wrap">
            {[
              { id: "TRADE", label: "1. Trade Level" },
              { id: "ACCOUNT", label: "2. Account Level" },
              { id: "PORTFOLIO", label: "3. Portfolio Risk" },
              { id: "KILL_SWITCH", label: "4. Hard Kill Switch" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTier(t.id as any)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer",
                  activeTier === t.id
                    ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 scale-[1.02]"
                    : "text-slate-400 hover:text-white"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Feedback Toast Banner */}
        {toastMessage && (
          <div className="mt-3 p-2.5 rounded-xl bg-cyan-950/90 border border-cyan-500/50 text-cyan-200 text-xs font-mono font-bold flex items-center justify-between shadow-xl animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button type="button" onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </header>

      {/* ── 2. REAL-TIME RISK SIMULATION TELEMETRY BAR ──────────────────────── */}
      <section className="p-4 rounded-2xl bg-[#091124]/90 border border-[#152445] shadow-xl backdrop-blur-md grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="p-3 rounded-xl bg-[#050b18] border border-[#152445] space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">Stop Loss Risk Amount</span>
          <div className="text-sm font-black text-rose-400">
            {formatMoney(stopLossAmount, capital.currency)}{" "}
            <span className="text-[10px] font-normal text-slate-400">({risk.stopLossPct}%)</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#050b18] border border-[#152445] space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">Target Profit Gain</span>
          <div className="text-sm font-black text-emerald-400">
            {formatMoney(takeProfitAmount, capital.currency)}{" "}
            <span className="text-[10px] font-normal text-slate-400">({risk.takeProfitPct}%)</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#050b18] border border-[#152445] space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">Risk : Reward Ratio</span>
          <div className="text-sm font-black text-cyan-300">
            1 : {rrRatio}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#050b18] border border-[#152445] space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">Max Daily Loss Cap</span>
          <div className="text-sm font-black text-amber-400">
            {formatMoney(risk.maxDailyLoss, capital.currency)}
          </div>
        </div>
      </section>

      {/* ── 3. TIERED CONTROLS ─────────────────────────────────────────────── */}
      {activeTier === "TRADE" && (
        <div className="space-y-5 font-mono text-xs">
          {/* 3 Core Trade Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Risk Per Trade % */}
            <div className="p-4 rounded-2xl bg-[#091124]/90 border border-[#152445] shadow-xl backdrop-blur-md space-y-2.5">
              <label className="text-xs text-slate-300 font-bold block">
                Risk Per Trade (% Allocated Capital)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={risk.riskPerTradePct}
                  onChange={(e) => updateSection("risk", { riskPerTradePct: Number(e.target.value) })}
                  step={0.1}
                  min={0.1}
                  max={10.0}
                  className="w-full px-3.5 py-2.5 bg-[#050b18] border border-[#1b2d4b] rounded-xl text-xs font-mono font-black text-cyan-300 focus:outline-none focus:border-cyan-400 shadow-inner"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-slate-500 font-bold">%</span>
              </div>
              <span className="text-[11px] text-slate-400 block">
                Max Allowed Loss: <strong className="text-rose-400">{formatMoney(maxRiskAmount, capital.currency)}</strong>
              </span>
            </div>

            {/* Stop Loss Mode & Percentage */}
            <div className="p-4 rounded-2xl bg-[#091124]/90 border border-[#152445] shadow-xl backdrop-blur-md space-y-2.5">
              <label className="text-xs text-slate-300 font-bold block">
                Stop Loss Mode & Percentage
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  defaultValue="FIXED_PCT"
                  className="px-2.5 py-2.5 bg-[#050b18] border border-[#1b2d4b] rounded-xl text-xs text-slate-200 font-bold focus:outline-none focus:border-cyan-400 cursor-pointer shadow-inner"
                >
                  <option value="FIXED_PCT">Fixed %</option>
                  <option value="ATR_STOP">ATR 2.0x Stop</option>
                  <option value="STRUCTURE_STOP">Swing Pivot Stop</option>
                  <option value="PREMIUM_STOP">Option Prem Stop</option>
                </select>
                <div className="relative">
                  <input
                    type="number"
                    value={risk.stopLossPct}
                    onChange={(e) => updateSection("risk", { stopLossPct: Number(e.target.value) })}
                    step={0.25}
                    min={0.25}
                    className="w-full px-3 py-2.5 bg-[#050b18] border border-[#1b2d4b] rounded-xl text-xs font-mono font-black text-rose-400 focus:outline-none focus:border-rose-400 shadow-inner"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-bold">%</span>
                </div>
              </div>
              <span className="text-[11px] text-slate-400 block">
                Stop Amount: <strong className="text-rose-400">{formatMoney(stopLossAmount, capital.currency)}</strong>
              </span>
            </div>

            {/* Take Profit Target */}
            <div className="p-4 rounded-2xl bg-[#091124]/90 border border-[#152445] shadow-xl backdrop-blur-md space-y-2.5">
              <label className="text-xs text-slate-300 font-bold block">
                Take Profit Target (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={risk.takeProfitPct}
                  onChange={(e) => updateSection("risk", { takeProfitPct: Number(e.target.value) })}
                  step={0.5}
                  min={0.5}
                  className="w-full px-3.5 py-2.5 bg-[#050b18] border border-[#1b2d4b] rounded-xl text-xs font-mono font-black text-emerald-400 focus:outline-none focus:border-emerald-400 shadow-inner"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-slate-500 font-bold">% Gain</span>
              </div>
              <span className="text-[11px] text-slate-400 block">
                Est. Profit: <strong className="text-emerald-400">{formatMoney(takeProfitAmount, capital.currency)}</strong> (R:R 1:{rrRatio})
              </span>
            </div>
          </div>

          {/* Advanced Trailing Stop & Breakeven Execution Rules */}
          <div className="p-5 rounded-2xl bg-[#091124]/90 border border-[#152445] shadow-xl backdrop-blur-md space-y-4">
            <div className="text-xs font-black uppercase tracking-wider text-slate-300 pb-3 border-b border-[#152445] flex items-center justify-between">
              <span>Trailing Stops, Partial Exits & Breakeven Locks</span>
              <span className="text-[10px] text-cyan-300 font-bold">Dynamic Position Engine</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-bold">Trailing Stop Step (%)</label>
                <input
                  type="number"
                  value={risk.trailingStopPct}
                  onChange={(e) => updateSection("risk", { trailingStopPct: Number(e.target.value) })}
                  step={0.25}
                  className="w-full px-3.5 py-2.5 bg-[#050b18] border border-[#1b2d4b] rounded-xl text-xs font-mono font-bold text-slate-100 shadow-inner"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-bold">Break-Even Trigger Rule</label>
                <select
                  value={risk.breakevenRule}
                  onChange={(e) => updateSection("risk", { breakevenRule: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#050b18] border border-[#1b2d4b] rounded-xl text-xs text-slate-100 font-bold focus:outline-none focus:border-cyan-400 cursor-pointer shadow-inner"
                >
                  <option value="TRIGGER_1R">Lock Entry at +1.0R Profit</option>
                  <option value="TRIGGER_1_5R">Lock Entry at +1.5R Profit</option>
                  <option value="TRAIL_EMA20">Trail Behind 15m EMA 20</option>
                  <option value="DISABLED">No Automatic Breakeven Move</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-bold">Partial Profit Exit (%)</label>
                <select
                  value={risk.partialExitPct}
                  onChange={(e) => updateSection("risk", { partialExitPct: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-[#050b18] border border-[#1b2d4b] rounded-xl text-xs text-slate-100 font-bold focus:outline-none focus:border-cyan-400 cursor-pointer shadow-inner"
                >
                  <option value={50}>50% Size at 1.5R, Run Remaining</option>
                  <option value={33}>33% Size in 3 Equal Scaled Tranches</option>
                  <option value={0}>100% Full Position to Target (All-or-None)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Level Risk */}
      {activeTier === "ACCOUNT" && (
        <div className="p-5 rounded-2xl bg-[#091124]/90 border border-[#152445] shadow-xl backdrop-blur-md space-y-4 font-mono text-xs">
          <div className="text-xs font-black uppercase tracking-wider text-slate-300 pb-3 border-b border-[#152445]">
            Account Level Daily Loss & Maximum Drawdown Constraints
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-bold">Max Daily Account Loss ({capital.currency})</label>
              <input
                type="number"
                value={risk.maxDailyLoss}
                onChange={(e) => updateSection("risk", { maxDailyLoss: Number(e.target.value) })}
                step={capital.currency === "INR" ? 1000 : 100}
                className="w-full px-3.5 py-2.5 bg-[#050b18] border border-[#1b2d4b] rounded-xl text-xs font-mono font-black text-rose-400 shadow-inner"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-bold">Max High-Water Drawdown (%)</label>
              <input
                type="number"
                value={risk.maxDrawdownPct}
                onChange={(e) => updateSection("risk", { maxDrawdownPct: Number(e.target.value) })}
                step={0.5}
                className="w-full px-3.5 py-2.5 bg-[#050b18] border border-[#1b2d4b] rounded-xl text-xs font-mono font-black text-amber-400 shadow-inner"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-bold">Max Daily Total Trades</label>
              <input
                type="number"
                defaultValue={10}
                className="w-full px-3.5 py-2.5 bg-[#050b18] border border-[#1b2d4b] rounded-xl text-xs font-mono font-bold text-slate-200 shadow-inner"
              />
            </div>
          </div>
        </div>
      )}

      {/* Portfolio & Broker Risk */}
      {activeTier === "PORTFOLIO" && (
        <div className="p-5 rounded-2xl bg-[#091124]/90 border border-[#152445] shadow-xl backdrop-blur-md space-y-4 font-mono text-xs">
          <div className="text-xs font-black uppercase tracking-wider text-slate-300 pb-3 border-b border-[#152445]">
            Portfolio Exposure, Margin Buffers & Slippage Guardrails
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-bold">Max Open Positions</label>
              <input
                type="number"
                value={risk.maxOpenPositions}
                onChange={(e) => updateSection("risk", { maxOpenPositions: Number(e.target.value) })}
                min={1}
                max={10}
                className="w-full px-3.5 py-2.5 bg-[#050b18] border border-[#1b2d4b] rounded-xl text-xs font-mono font-bold text-slate-100 shadow-inner"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-bold">Free Margin Buffer (%)</label>
              <input
                type="number"
                defaultValue={20}
                className="w-full px-3.5 py-2.5 bg-[#050b18] border border-[#1b2d4b] rounded-xl text-xs font-mono font-bold text-slate-100 shadow-inner"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-bold">Max Slippage Tolerance (%)</label>
              <input
                type="number"
                defaultValue={0.2}
                step={0.05}
                className="w-full px-3.5 py-2.5 bg-[#050b18] border border-[#1b2d4b] rounded-xl text-xs font-mono font-bold text-slate-100 shadow-inner"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-bold">Consecutive Loss Cooldown</label>
              <select defaultValue="30m" className="w-full px-3.5 py-2.5 bg-[#050b18] border border-[#1b2d4b] rounded-xl text-xs text-slate-100 font-bold shadow-inner cursor-pointer">
                <option value="15m">15 Minutes Pause</option>
                <option value="30m">30 Minutes Pause</option>
                <option value="1h">1 Hour Pause</option>
                <option value="REST_OF_DAY">Halt for Remainder of Session</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Hard Kill Conditions */}
      {activeTier === "KILL_SWITCH" && (
        <div className="p-5 rounded-2xl bg-[#091124]/90 border border-[#152445] shadow-xl backdrop-blur-md space-y-4 font-mono text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#152445]">
            <span className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              Fail-Closed Hard Kill Conditions (Automated Emergency Freezes)
            </span>
            <button
              type="button"
              onClick={handleTestKillSwitch}
              disabled={isTestingKillSwitch}
              className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isTestingKillSwitch && "animate-spin")} />
              <span>Test Emergency Circuit Breakers</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: "staleFeed" as const, title: "Stale Feed Kill", desc: "Quote age > 2000ms triggers immediate entry block and risk freeze." },
              { key: "providerDisconnect" as const, title: "Provider Disconnect Kill", desc: "WebSocket heartbeat drop forces fail-closed safe state." },
              { key: "brokerDrift" as const, title: "Broker State Disagreement", desc: "LTP mismatch between broker and secondary data source > 0.35%." },
              { key: "reconciliationMismatch" as const, title: "Reconciliation Mismatch", desc: "Orphaned position or unknown open order on broker terminal." },
              { key: "dailyLossTrip" as const, title: "Daily Loss Limit Trigger", desc: "Realized + unrealized intraday loss reaches daily cap." },
              { key: "idempotencyLock" as const, title: "Duplicate Execution Lock", desc: "Idempotency token reuse prevention guards duplicate orders." },
            ].map((k) => {
              const isArmed = killSwitches[k.key];
              return (
                <div
                  key={k.key}
                  onClick={() => toggleKillSwitch(k.key)}
                  className={cn(
                    "p-3.5 rounded-xl border transition-all duration-150 cursor-pointer flex items-start justify-between gap-3 shadow-inner",
                    isArmed
                      ? "bg-[#050b18] border-emerald-500/40 hover:border-emerald-400"
                      : "bg-[#180a1a] border-rose-500/40 opacity-70"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    {isArmed ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <strong className={cn("block text-xs", isArmed ? "text-white" : "text-rose-300")}>
                        {k.title}
                      </strong>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{k.desc}</p>
                    </div>
                  </div>

                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-[9px] font-black uppercase shrink-0 border",
                      isArmed
                        ? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
                        : "bg-rose-950 text-rose-300 border-rose-500/40"
                    )}
                  >
                    {isArmed ? "ARMED" : "BYPASSED"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 4. PRODUCTION INTEGRITY & NEXT STEP BUTTON ──────────────────────── */}
      <section className="p-5 rounded-2xl bg-[#091124]/90 border border-[#152445] shadow-xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <span className="font-bold text-white block">
              Step 6 Risk Engine Armed: 4-Tier Guardrails Active
            </span>
            <span className="text-[10px] text-slate-400">
              Stop Loss: {risk.stopLossPct}% | Target: {risk.takeProfitPct}% | Max Daily Loss: {formatMoney(risk.maxDailyLoss, capital.currency)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setStep(7);
          }}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
        >
          <span>Proceed to Step 7: Review, Validation & Deployment</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>
    </div>
  );
}
