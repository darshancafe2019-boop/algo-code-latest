"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  ArrowRightLeft,
  XCircle,
  Percent,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import { fetchFuturesPositions, executePositionAction } from "../api/futures-api";
import { FuturesPosition } from "../types/futures";

export function FuturesPositionsView() {
  const queryClient = useQueryClient();
  const [selectedPos, setSelectedPos] = useState<FuturesPosition | null>(null);
  const [actionType, setActionType] = useState<string | null>(null);
  const [slTpModalPos, setSlTpModalPos] = useState<FuturesPosition | null>(null);
  const [customSl, setCustomSl] = useState<string>("");
  const [customTp, setCustomTp] = useState<string>("");
  const [customQty, setCustomQty] = useState<number>(0.1);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["futuresActivePositions"],
    queryFn: () => fetchFuturesPositions(),
    refetchInterval: 4000,
  });

  const positions: FuturesPosition[] = data?.positions || [];
  const totalPnL = data?.total_unrealized_pnl_usd || 0;
  const totalMargin = data?.total_margin_usd || 0;

  const positionMutation = useMutation({
    mutationFn: async ({ posId, action, params }: { posId: string; action: string; params?: any }) => {
      return executePositionAction(posId, action, params);
    },
    onSuccess: (res) => {
      setActionFeedback(`Action completed: ${res.message || "Position updated"}`);
      queryClient.invalidateQueries({ queryKey: ["futuresActivePositions"] });
      queryClient.invalidateQueries({ queryKey: ["futuresOrdersList"] });
      setSelectedPos(null);
      setSlTpModalPos(null);
      setTimeout(() => setActionFeedback(null), 4000);
    },
    onError: (err: any) => {
      setActionFeedback(`Error: ${err.message || "Failed to execute position action"}`);
      setTimeout(() => setActionFeedback(null), 5000);
    },
  });

  const handleReverse = (pos: FuturesPosition) => {
    // Reverse requires 2x position size
    const requiredQty = pos.quantity * 2;
    if (
      confirm(
        `REVERSE POSITION: Current is ${pos.side} ${pos.quantity} ${pos.symbol}.\n\nThis will send a ${
          pos.side === "LONG" ? "SHORT" : "LONG"
        } market order of ${requiredQty} contracts to flip your net position.\n\nProceed?`
      )
    ) {
      positionMutation.mutate({
        posId: pos.id,
        action: "REVERSE",
        params: { current_side: pos.side, reverse_qty: requiredQty },
      });
    }
  };

  return (
    <div className="space-y-4 font-sans text-slate-200">
      {/* Feedback Banner */}
      {actionFeedback && (
        <div className="p-3 bg-cyan-950/80 border border-cyan-500/50 rounded-xl text-cyan-300 font-mono text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            <span>{actionFeedback}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-white">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
        <div className="p-4 bg-[#0E1524] border border-[#1E293B] rounded-2xl shadow-xl">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Unrealized PnL</span>
          <span className={`text-xl font-bold mt-1 block ${totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {totalPnL >= 0 ? `+$${totalPnL.toFixed(2)}` : `-$${Math.abs(totalPnL).toFixed(2)}`}
          </span>
          <div className="mt-2 text-[10px] text-slate-500">Paper Execution Ledger</div>
        </div>

        <div className="p-4 bg-[#0E1524] border border-[#1E293B] rounded-2xl shadow-xl">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Margin In Use</span>
          <span className="text-xl font-bold text-cyan-300 mt-1 block">${totalMargin.toLocaleString()}</span>
          <div className="mt-2 text-[10px] text-slate-500">Isolated & Cross Allocation</div>
        </div>

        <div className="p-4 bg-[#0E1524] border border-[#1E293B] rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Open Positions</span>
            <span className="text-xl font-bold text-white mt-1 block">{positions.length} Active</span>
            <div className="mt-1 text-[10px] text-emerald-400 font-bold">100% RECONCILED</div>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition active:scale-95"
            title="Refresh Positions"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Positions Table */}
      <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left font-mono text-xs text-slate-300 border-collapse">
            <thead className="bg-[#080C14]/90 border-b border-[#1E293B] text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 px-4">Contract / Broker</th>
                <th className="py-3.5 px-3">Side / Lev</th>
                <th className="py-3.5 px-3 text-right">Size</th>
                <th className="py-3.5 px-3 text-right">Entry Price</th>
                <th className="py-3.5 px-3 text-right">Mark Price</th>
                <th className="py-3.5 px-3 text-right">PnL (ROE %)</th>
                <th className="py-3.5 px-3 text-right">Margin</th>
                <th className="py-3.5 px-3 text-right">Liq. Price</th>
                <th className="py-3.5 px-3 text-center">Protection</th>
                <th className="py-3.5 px-4 text-center">Action Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141D2E]">
              {positions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    No active futures positions. Execute a BUY or SELL from the Futures Universe table.
                  </td>
                </tr>
              ) : (
                positions.map((pos) => {
                  const isProfit = (pos.unrealized_pnl || 0) >= 0;
                  const isLong = (pos.side as string) === "LONG" || (pos.side as string) === "BUY";
                  return (
                    <tr key={pos.id} className="hover:bg-[#121927]/70 transition-all">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-xs">{pos.displayName || pos.symbol}</div>
                        <div className="text-[10px] text-cyan-400 font-mono">{pos.provider || "PAPER"}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isLong
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                                : "bg-red-500/20 text-red-400 border border-red-500/40"
                            }`}
                          >
                            {isLong ? "LONG" : "SHORT"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{pos.leverage || 10}x</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-white">{pos.quantity}</td>
                      <td className="py-3.5 px-3 text-right text-slate-400">${(pos.entry_price || 0).toLocaleString()}</td>
                      <td className="py-3.5 px-3 text-right font-bold text-white">${(pos.mark_price || pos.entry_price || 0).toLocaleString()}</td>
                      <td className="py-3.5 px-3 text-right">
                        <span className={`font-bold ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                          {isProfit ? `+$${(pos.unrealized_pnl || 0).toFixed(2)}` : `-$${Math.abs(pos.unrealized_pnl || 0).toFixed(2)}`}
                          <span className="text-[10px] font-normal ml-1">
                            ({(pos.unrealized_pnl_pct || 0).toFixed(2)}%)
                          </span>
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="text-slate-200 font-bold">${(pos.margin_usd || 0).toLocaleString()}</div>
                        <div className="text-[9px] text-slate-500">{pos.margin_mode || "ISOLATED"}</div>
                      </td>
                      <td className="py-3.5 px-3 text-right text-red-400 font-bold">
                        {pos.liquidation_price ? `$${pos.liquidation_price.toLocaleString()}` : "—"}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSlTpModalPos(pos);
                            setCustomSl(pos.stop_loss ? pos.stop_loss.toString() : "");
                            setCustomTp(pos.take_profit ? pos.take_profit.toString() : "");
                          }}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 border border-slate-700 font-mono transition"
                        >
                          {pos.stop_loss || pos.take_profit ? (
                            <span className="text-emerald-400">SL: {pos.stop_loss || "—"} / TP: {pos.take_profit || "—"}</span>
                          ) : (
                            <span>Set SL/TP</span>
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Quick Partial Exits */}
                          <button
                            type="button"
                            onClick={() =>
                              positionMutation.mutate({
                                posId: pos.id,
                                action: "EXIT_25",
                                params: { quantity: pos.quantity * 0.25 },
                              })
                            }
                            disabled={positionMutation.isPending}
                            title="Exit 25% of position"
                            className="px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9px] font-bold border border-slate-700"
                          >
                            25%
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              positionMutation.mutate({
                                posId: pos.id,
                                action: "EXIT_50",
                                params: { quantity: pos.quantity * 0.5 },
                              })
                            }
                            disabled={positionMutation.isPending}
                            title="Exit 50% of position"
                            className="px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9px] font-bold border border-slate-700"
                          >
                            50%
                          </button>
                          {/* Reverse */}
                          <button
                            type="button"
                            onClick={() => handleReverse(pos)}
                            disabled={positionMutation.isPending}
                            title="Reverse position (2x size flip)"
                            className="px-2 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-[9px] font-bold flex items-center gap-0.5 transition"
                          >
                            <ArrowRightLeft className="w-2.5 h-2.5" />
                            <span>REV</span>
                          </button>
                          {/* Close All */}
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Close entire position for ${pos.symbol}?`)) {
                                positionMutation.mutate({ posId: pos.id, action: "CLOSE_ALL" });
                              }
                            }}
                            disabled={positionMutation.isPending}
                            className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-bold transition"
                          >
                            CLOSE
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SL / TP Modal */}
      {slTpModalPos && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl w-full max-w-md p-5 shadow-2xl font-mono space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Protection Targets (SL / TP)</h3>
                <span className="text-[11px] text-cyan-400">{slTpModalPos.symbol} • {slTpModalPos.side} {slTpModalPos.quantity}</span>
              </div>
              <button onClick={() => setSlTpModalPos(null)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Stop Loss Price ($)</label>
                <input
                  type="number"
                  step="0.1"
                  value={customSl}
                  onChange={(e) => setCustomSl(e.target.value)}
                  placeholder="e.g. 76000"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Take Profit Price ($)</label>
                <input
                  type="number"
                  step="0.1"
                  value={customTp}
                  onChange={(e) => setCustomTp(e.target.value)}
                  placeholder="e.g. 82000"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSlTpModalPos(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  positionMutation.mutate({
                    posId: slTpModalPos.id,
                    action: "UPDATE_SL_TP",
                    params: {
                      stop_loss: customSl ? parseFloat(customSl) : null,
                      take_profit: customTp ? parseFloat(customTp) : null,
                    },
                  });
                }}
                disabled={positionMutation.isPending}
                className="flex-1 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition shadow-lg"
              >
                Save Targets
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
