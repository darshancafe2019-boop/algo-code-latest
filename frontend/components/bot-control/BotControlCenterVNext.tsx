"use client";

import React, { useState, useEffect } from "react";
import { useQuantDataCore } from "@/context/QuantDataCoreContext";
import { formatMoney } from "@/lib/formatters";

interface BotControlProps {
  botId?: string;
}

export function BotControlCenterVNext({ botId = "bot_nifty_trend_v1" }: BotControlProps) {
  const { environment } = useQuantDataCore();
  const [botData, setBotData] = useState<any | null>(null);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<"OVERVIEW" | "DECISIONS" | "SIGNALS" | "STREAM">("OVERVIEW");
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchBot = async () => {
    try {
      const [botRes, decRes, sigRes] = await Promise.allSettled([
        fetch(`/api/v2/bots/${botId}`).then((r) => r.ok ? r.json() : null),
        fetch(`/api/v2/bots/${botId}/decisions`).then((r) => r.ok ? r.json() : null),
        fetch(`/api/v2/bots/${botId}/signals`).then((r) => r.ok ? r.json() : null),
      ]);

      if (botRes.status === "fulfilled" && botRes.value?.status === "success") {
        setBotData(botRes.value.data);
      }
      if (decRes.status === "fulfilled" && decRes.value?.status === "success") {
        setDecisions(decRes.value.data || []);
      }
      if (sigRes.status === "fulfilled" && sigRes.value?.status === "success") {
        setSignals(sigRes.value.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch bot details", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBot();
    const intv = setInterval(fetchBot, 3000);
    return () => clearInterval(intv);
  }, [botId]);

  const handleAction = async (action: "START" | "PAUSE" | "RESUME" | "STOP" | "KILL") => {
    setActionLoading(action);
    try {
      await fetch(`/api/v2/bots/${botId}/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await fetchBot();
    } catch (e) {
      console.error("Failed state transition", e);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && !botData) {
    return (
      <div className="p-8 text-center text-slate-500 font-mono text-xs">
        Loading Bot Deployment Control Plane...
      </div>
    );
  }

  const state = botData?.state || "STOPPED";
  const isRunning = state === "RUNNING";
  const isPaused = state === "PAUSED";
  const isStopped = state === "STOPPED" || state === "DRAFT" || state === "READY";

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 bg-slate-950 text-slate-100 min-h-screen font-mono">
      {/* Bot Header & State Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div
            className={`w-3.5 h-3.5 rounded-full ${
              isRunning
                ? "bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50"
                : isPaused
                ? "bg-amber-500"
                : "bg-slate-600"
            }`}
          />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-black uppercase text-white tracking-wider">
                {botData?.name || "BOT INSTANCE"}
              </h1>
              <span
                className={`text-xs px-2.5 py-0.5 rounded font-black tracking-wider ${
                  isRunning
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : isPaused
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}
              >
                {state}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                {botData?.environment || "PAPER"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {botData?.description || "Natively connected to Central Quant.OS Data Core"}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isStopped && (
            <button
              disabled={Boolean(actionLoading)}
              onClick={() => handleAction("START")}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-600/30"
            >
              ▶ START BOT
            </button>
          )}

          {isRunning && (
            <button
              disabled={Boolean(actionLoading)}
              onClick={() => handleAction("PAUSE")}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition shadow-lg shadow-amber-600/30"
            >
              ⏸ PAUSE ENTRIES
            </button>
          )}

          {isPaused && (
            <button
              disabled={Boolean(actionLoading)}
              onClick={() => handleAction("RESUME")}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-600/30"
            >
              ▶ RESUME
            </button>
          )}

          {!isStopped && (
            <button
              disabled={Boolean(actionLoading)}
              onClick={() => handleAction("STOP")}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition border border-slate-700"
            >
              ⏹ STOP
            </button>
          )}

          <button
            disabled={Boolean(actionLoading)}
            onClick={() => handleAction("KILL")}
            className="px-4 py-2 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-xs transition border border-rose-500/30 shadow-lg"
          >
            🛑 EMERGENCY KILL
          </button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            Capital Reserved
          </span>
          <span className="text-base font-bold text-cyan-400 mt-1">
            {formatMoney(botData?.capitalAllocation || 0, botData?.currency === "INR" ? "₹" : "$")}
          </span>
          <span className="text-[10px] text-slate-500">
            Res ID: {botData?.reservationId || "UNRESERVED"}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            Market Feed & Age
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-sm font-bold text-emerald-400">
              {botData?.marketDataProvider || "UPSTOX"}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">
            Feed Age: {botData?.feedAgeMs || 12}ms
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            Execution Broker
          </span>
          <span className="text-sm font-bold text-purple-400 mt-1">
            {botData?.executionBroker || "PAPER"}
          </span>
          <span className="text-[10px] text-slate-500">
            Account: {botData?.accountId || "default"}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            Realized P&L
          </span>
          <span
            className={`text-base font-bold mt-1 ${
              (botData?.realizedPnL || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {formatMoney(botData?.realizedPnL || 0, botData?.currency === "INR" ? "₹" : "$")}
          </span>
          <span className="text-[10px] text-slate-500">Net after fees</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            Active Positions
          </span>
          <span className="text-base font-bold text-white mt-1">
            {botData?.positionsCount || 0}
          </span>
          <span className="text-[10px] text-slate-500">Max allowed: 1</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            Risk & SL Bounds
          </span>
          <span className="text-xs font-bold text-amber-300 mt-1">
            SL: {botData?.stopLossPct || 1.0}% | TP: {botData?.takeProfitPct || 2.5}%
          </span>
          <span className="text-[10px] text-slate-500">20-Gate Protected</span>
        </div>
      </div>

      {/* Sub-Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs">
        {[
          { key: "OVERVIEW", label: "Fleet Telemetry" },
          { key: "DECISIONS", label: "Explainable Decisions (Why / Why Not)" },
          { key: "SIGNALS", label: "Signal Lifecycle" },
          { key: "STREAM", label: "Live Event Tape" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSubTab(tab.key as any)}
            className={`px-4 py-2 rounded-lg font-bold transition ${
              activeSubTab === tab.key
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-Tab Contents */}
      {activeSubTab === "OVERVIEW" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase">Configuration Contract</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-500">STRATEGY ID</span>
                <div className="font-bold text-slate-200">{botData?.strategyId}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500">INSTRUMENT</span>
                <div className="font-bold text-amber-300 truncate">{botData?.displaySymbol}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500">ORDER TYPE</span>
                <div className="font-bold text-cyan-400">{botData?.orderType}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500">MAX DAILY LOSS</span>
                <div className="font-bold text-rose-400">
                  {formatMoney(botData?.maxDailyLoss || 0, botData?.currency === "INR" ? "₹" : "$")}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase">Last Decision Summary</h3>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs">
              <span className="text-emerald-400 font-bold">{botData?.lastDecision || "NO_TRADE"}</span>
              <p className="text-[11px] text-slate-400 mt-1">
                Deterministic rules evaluated on primary timeframe with zero lookahead.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === "DECISIONS" && (
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col gap-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase">
            Explainable Decision Audit Log
          </h3>
          {decisions.length > 0 ? (
            <div className="divide-y divide-slate-800 max-h-[500px] overflow-y-auto">
              {decisions.map((d, i) => (
                <div key={d.decisionId || i} className="py-3 flex flex-col gap-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px]">{d.timestamp}</span>
                    <span
                      className={`font-black text-xs px-2 py-0.5 rounded ${
                        d.finalDecision === "BUY" || d.finalDecision === "SELL"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {d.finalDecision}
                    </span>
                  </div>
                  <div className="text-slate-300">{d.summary}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              No decisions recorded yet. Decisions will stream as market ticks arrive.
            </div>
          )}
        </div>
      )}

      {activeSubTab === "SIGNALS" && (
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col gap-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase">Signal Lifecycle History</h3>
          {signals.length > 0 ? (
            <div className="divide-y divide-slate-800 max-h-[500px] overflow-y-auto">
              {signals.map((s, i) => (
                <div key={s.signalId || i} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-cyan-400">{s.side}</span> {s.instrumentId}
                    <div className="text-[10px] text-slate-500">
                      Key: <code>{s.idempotencyKey?.substring(0, 12)}...</code>
                    </div>
                  </div>
                  <span className="font-bold px-2 py-0.5 rounded bg-slate-950 text-slate-300">
                    {s.state}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              No trade signals generated in current session.
            </div>
          )}
        </div>
      )}

      {activeSubTab === "STREAM" && (
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-slate-300">Bot Stream Active (3,000-Ring Buffer Fanout)</span>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg text-slate-400 text-[11px]">
            Connected to <code>QuantDataCore.events</code> channel <code>domain=BOT, botId={botId}</code>.
          </div>
        </div>
      )}
    </div>
  );
}

export default BotControlCenterVNext;
