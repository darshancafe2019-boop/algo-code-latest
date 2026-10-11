"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  Pause,
  Square,
  ShieldCheck,
  ShieldAlert,
  Zap,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertCircle,
  Clock,
  Layers,
  ListOrdered,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/bot-api";
import { BotSnapshot, BotStatus } from "@/types/bot";
import { wsClient } from "@/lib/websocket";

export interface BotControlCenterVNextProps {
  botId?: string;
}

export function BotControlCenterVNext({ botId: propBotId }: BotControlCenterVNextProps) {
  const params = useParams();
  const router = useRouter();
  const botId = propBotId || (params?.id as string) || (params?.botId as string) || "";

  const [snapshot, setSnapshot] = useState<BotSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [orderQty, setOrderQty] = useState<number>(1.0);

  const fetchSnapshot = useCallback(async () => {
    if (!botId) return;
    try {
      const data = await api.getBot(botId);
      setSnapshot(data);
      if (data.bot?.risk?.quantity) {
        setOrderQty(data.bot.risk.quantity);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load bot snapshot");
    } finally {
      setLoading(false);
    }
  }, [botId]);

  useEffect(() => {
    fetchSnapshot();

    // Subscribe to WS updates for this bot
    wsClient.subscribeBot(botId);
    const unsubscribe = wsClient.subscribe((msg) => {
      if (msg.bot_id === botId || (msg.data && msg.data.bot_id === botId)) {
        fetchSnapshot();
      }
    });

    const interval = setInterval(fetchSnapshot, 4000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [botId, fetchSnapshot]);

  const handleAction = async (action: string) => {
    setActionLoading(action);
    setError(null);
    try {
      if (action === "VALIDATE") {
        await api.validateBot(botId);
      } else if (action === "START") {
        await api.startBot(botId);
      } else if (action === "PAUSE") {
        await api.pauseBot(botId);
      } else if (action === "RESUME") {
        await api.resumeBot(botId);
      } else if (action === "STOP") {
        await api.stopBot(botId);
      } else if (action === "EMERGENCY_STOP") {
        await api.triggerKillSwitch("BOT", botId, "Emergency Stop triggered from bot details");
        try {
          await api.stopBot(botId);
        } catch (_) {}
      }
      await fetchSnapshot();
    } catch (err: any) {
      setError(err.message || `Action ${action} failed`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleOrder = async (side: "BUY" | "SELL") => {
    setActionLoading(side);
    setError(null);
    try {
      await api.placeBotOrder(botId, side, orderQty);
      await fetchSnapshot();
    } catch (err: any) {
      setError(err.message || `Order placement failed`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && !snapshot) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 font-mono text-sm text-slate-400">
          <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
          Loading Bot {botId} Snapshot...
        </div>
      </div>
    );
  }

  const bot = snapshot?.bot;
  const status = (bot?.status || "READY") as BotStatus;
  const market = snapshot?.market;
  const pnl = snapshot?.pnl;
  const isRunning = status === "RUNNING";
  const isPaused = status === "PAUSED";
  const isReady = status === "READY";
  const canStart = isReady || status === "STOPPED";
  const canPause = isRunning;
  const canResume = isPaused;
  const canStop = isRunning || isPaused;
  const canValidate = status === "DRAFT" || status === "STOPPED" || status === "ERROR";

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4 pb-12 space-y-6 animate-fadeIn">
      {/* Top Breadcrumb & Control Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Link
            href="/bots"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Fleet
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Current Mode:</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                bot?.execution?.mode === "LIVE"
                  ? "bg-red-950 text-red-400 border border-red-500/40"
                  : "bg-blue-950 text-blue-400 border border-blue-500/40"
              }`}
            >
              {bot?.execution?.mode || "PAPER"}
            </span>
          </div>
        </div>

        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/80 p-5 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10 border border-blue-500/20 font-mono font-bold text-blue-400 shadow-inner">
              BOT
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-white tracking-tight">{bot?.name}</h1>
                <span className="font-mono text-xs text-blue-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {botId}
                </span>
                <span
                  className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    isRunning
                      ? "bg-emerald-950/60 text-emerald-400 border-emerald-500/40"
                      : isPaused
                      ? "bg-amber-950/60 text-amber-400 border-amber-500/40"
                      : "bg-slate-900 text-slate-400 border-slate-800"
                  }`}
                >
                  {status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                {bot?.market?.symbol} • Exchange: {bot?.market?.exchange} • Data: {bot?.data_provider?.provider} • Execution: {bot?.execution?.provider}
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleAction("VALIDATE")}
              disabled={!canValidate || actionLoading !== null}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-mono font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
              VALIDATE
            </button>

            {canStart && (
              <button
                onClick={() => handleAction("START")}
                disabled={actionLoading !== null}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-mono font-bold text-white hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-emerald-950/50 transition-colors"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                START
              </button>
            )}

            {canPause && (
              <button
                onClick={() => handleAction("PAUSE")}
                disabled={actionLoading !== null}
                className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-1.5 text-xs font-mono font-semibold text-amber-400 hover:bg-amber-900/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Pause className="h-3.5 w-3.5" />
                PAUSE
              </button>
            )}

            {canResume && (
              <button
                onClick={() => handleAction("RESUME")}
                disabled={actionLoading !== null}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-1.5 text-xs font-mono font-semibold text-emerald-400 hover:bg-emerald-900/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Play className="h-3.5 w-3.5" />
                RESUME
              </button>
            )}

            {canStop && (
              <button
                onClick={() => handleAction("STOP")}
                disabled={actionLoading !== null}
                className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-1.5 text-xs font-mono font-semibold text-red-400 hover:bg-red-900/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                STOP
              </button>
            )}

            <button
              onClick={() => handleAction("EMERGENCY_STOP")}
              disabled={actionLoading !== null}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-mono font-bold text-white hover:bg-red-500 shadow-md shadow-red-950/50 transition-colors"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              EMERGENCY
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/20 p-4 text-xs font-mono text-red-400 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid: Live Market & Execution Quick Action */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Market Data Quote Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-mono text-slate-400 uppercase">Live Market Quote</span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
              {market?.source || "LIVE FEED"}
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <div className="text-3xl font-mono font-black text-white">
                ${market?.last ? market.last.toFixed(2) : "---"}
              </div>
              <div className="text-xs font-mono text-slate-400 mt-1">
                {bot?.market?.symbol} Last Traded Price
              </div>
            </div>
            <div className="text-right font-mono text-xs space-y-1">
              <div className="text-emerald-400">Bid: ${market?.bid ? market.bid.toFixed(2) : "---"}</div>
              <div className="text-red-400">Ask: ${market?.ask ? market.ask.toFixed(2) : "---"}</div>
            </div>
          </div>
        </div>

        {/* P&L Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-mono text-slate-400 uppercase">Authoritative P&L</span>
            <span className="text-[10px] font-mono text-slate-400">USD</span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <div
                className={`text-3xl font-mono font-black ${
                  (pnl?.net_pnl || 0) >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {(pnl?.net_pnl || 0) >= 0 ? "+" : ""}${pnl?.net_pnl?.toFixed(2) || "0.00"}
              </div>
              <div className="text-xs font-mono text-slate-400 mt-1">Net Realized + Unrealized</div>
            </div>
            <div className="text-right font-mono text-xs space-y-1">
              <div className="text-slate-300">Realized: ${pnl?.realized_pnl?.toFixed(2) || "0.00"}</div>
              <div className="text-slate-300">Unrealized: ${pnl?.unrealized_pnl?.toFixed(2) || "0.00"}</div>
              <div className="text-slate-400">Fees: ${pnl?.fees?.toFixed(2) || "0.00"}</div>
            </div>
          </div>
        </div>

        {/* Manual Trading Execution Panel */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 shadow-lg backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-mono text-slate-400 uppercase">Manual Order Panel</span>
            <span className="text-[10px] font-mono text-blue-400">RISK PROTECTED</span>
          </div>

          <div className="my-3 flex items-center gap-3">
            <label className="text-xs font-mono text-slate-300">Qty:</label>
            <input
              type="number"
              step="0.1"
              min="0.001"
              value={orderQty}
              onChange={(e) => setOrderQty(parseFloat(e.target.value) || 0)}
              className="w-24 rounded border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
            />
            <span className="text-xs font-mono text-slate-400">{bot?.market?.symbol}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleOrder("BUY")}
              disabled={!isRunning || actionLoading !== null}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-xs font-mono font-bold text-white hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed shadow-md transition-colors"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              BUY (MKT)
            </button>
            <button
              onClick={() => handleOrder("SELL")}
              disabled={!isRunning || actionLoading !== null}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-red-600 py-2 text-xs font-mono font-bold text-white hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed shadow-md transition-colors"
            >
              <TrendingDown className="h-3.5 w-3.5" />
              SELL (MKT)
            </button>
          </div>
        </div>
      </div>

      {/* Positions Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-lg backdrop-blur-md">
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold uppercase text-slate-300 flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-400" /> Active Positions
          </h3>
          <span className="text-xs font-mono text-slate-400">
            {snapshot?.positions?.length || 0} Open
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-slate-800 bg-slate-900/30 text-slate-400 text-[11px] uppercase">
              <tr>
                <th className="px-5 py-2.5">Symbol</th>
                <th className="px-5 py-2.5">Direction</th>
                <th className="px-5 py-2.5">Quantity</th>
                <th className="px-5 py-2.5">Avg Entry</th>
                <th className="px-5 py-2.5">Current Price</th>
                <th className="px-5 py-2.5">Unrealized P&L</th>
                <th className="px-5 py-2.5">Realized P&L</th>
                <th className="px-5 py-2.5">Total P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {!snapshot?.positions || snapshot.positions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-6 text-center text-slate-500">
                    No active positions for this bot
                  </td>
                </tr>
              ) : (
                snapshot.positions.map((pos) => (
                  <tr key={pos.id} className="hover:bg-slate-900/40">
                    <td className="px-5 py-3 font-bold text-white">{pos.symbol}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          pos.direction === "LONG"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                            : pos.direction === "SHORT"
                            ? "bg-red-950 text-red-400 border border-red-500/30"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {pos.direction}
                      </span>
                    </td>
                    <td className="px-5 py-3">{pos.quantity}</td>
                    <td className="px-5 py-3">${pos.average_entry_price?.toFixed(2)}</td>
                    <td className="px-5 py-3">${pos.current_price?.toFixed(2)}</td>
                    <td className={`px-5 py-3 font-bold ${pos.unrealized_pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      ${pos.unrealized_pnl?.toFixed(2)}
                    </td>
                    <td className="px-5 py-3">${pos.realized_pnl?.toFixed(2)}</td>
                    <td className={`px-5 py-3 font-bold ${pos.total_pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      ${pos.total_pnl?.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Orders & Events Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders Table */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-lg backdrop-blur-md">
          <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold uppercase text-slate-300 flex items-center gap-2">
              <ListOrdered className="h-4 w-4 text-blue-400" /> Recent Orders
            </h3>
            <span className="text-xs font-mono text-slate-400">
              {snapshot?.orders?.length || 0} Total
            </span>
          </div>
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-slate-800 bg-slate-900/30 text-slate-400 text-[11px] uppercase sticky top-0">
                <tr>
                  <th className="px-4 py-2">Order ID</th>
                  <th className="px-4 py-2">Side</th>
                  <th className="px-4 py-2">Qty</th>
                  <th className="px-4 py-2">Fill Price</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {!snapshot?.orders || snapshot.orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                      No orders placed yet
                    </td>
                  </tr>
                ) : (
                  snapshot.orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-900/40">
                      <td className="px-4 py-2.5 text-blue-400">{ord.id}</td>
                      <td className="px-4 py-2.5">
                        <span className={ord.side === "BUY" ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                          {ord.side}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">{ord.quantity}</td>
                      <td className="px-4 py-2.5">
                        {ord.average_fill_price ? `$${ord.average_fill_price.toFixed(2)}` : "---"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] border border-slate-800">
                          {ord.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Latest Events Stream */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-lg backdrop-blur-md">
          <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold uppercase text-slate-300 flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-400" /> Event Stream
            </h3>
            <span className="text-xs font-mono text-slate-400">Real-time</span>
          </div>
          <div className="max-h-72 overflow-y-auto p-4 space-y-2.5 font-mono text-xs">
            {!snapshot?.latest_events || snapshot.latest_events.length === 0 ? (
              <div className="text-center py-6 text-slate-500">No events logged yet</div>
            ) : (
              snapshot.latest_events.map((evt) => (
                <div
                  key={evt.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 flex items-start gap-2.5"
                >
                  <span
                    className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                      evt.severity === "ERROR"
                        ? "bg-red-500"
                        : evt.severity === "WARNING"
                        ? "bg-amber-500"
                        : "bg-blue-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-bold text-slate-300">{evt.event_type}</span>
                      <span>{evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : ""}</span>
                    </div>
                    <p className="text-slate-200 mt-0.5 text-[11px] truncate">{evt.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
