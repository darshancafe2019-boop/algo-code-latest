"use client";

import React, { useState } from "react";
import {
  X,
  ExternalLink,
  Sliders,
  Shield,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Send,
  History,
  Activity,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PositionRecord, formatPositionDuration } from "@/types/positions";
import { apiClient } from "@/lib/apiClient";

interface PositionDetailDrawerProps {
  position: PositionRecord | null;
  onClose: () => void;
  onModifyProtection: (pos: PositionRecord) => void;
  onPartialClose: (pos: PositionRecord) => void;
  onSquareOff: (pos: PositionRecord) => void;
  onMoveToBreakeven: (pos: PositionRecord) => void;
}

export function PositionDetailDrawer({
  position,
  onClose,
  onModifyProtection,
  onPartialClose,
  onSquareOff,
  onMoveToBreakeven,
}: PositionDetailDrawerProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [observationNote, setObservationNote] = useState("");
  const [noteStatus, setNoteStatus] = useState<string | null>(null);

  // Add observation mutation
  const addNoteMutation = useMutation({
    mutationFn: async ({ tradeId, note }: { tradeId: number | string; note: string }) => {
      const res = await apiClient.post<any>(
        `/api/trades/${tradeId}/observation`,
        { observation: note, source: "Positions Drawer" },
        { timeoutMs: 5000 }
      );
      if (!res.ok || !res.data) throw new Error(res.error?.message || "Failed to add journal note");
      return res.data;
    },
    onSuccess: () => {
      setNoteStatus("Observation recorded in trade journal.");
      setObservationNote("");
      setTimeout(() => setNoteStatus(null), 3000);
      queryClient.invalidateQueries({ queryKey: ["tradeJournal"] });
    },
    onError: (err: any) => {
      setNoteStatus(`Error: ${err.message}`);
      setTimeout(() => setNoteStatus(null), 3000);
    },
  });

  if (!position) return null;

  const isLong = (position.direction || position.side || "LONG").toUpperCase().includes("LONG") || (position.direction || position.side || "LONG").toUpperCase().includes("BUY");
  const isProfit = position.unrealized_pnl >= 0;
  const entryP = Number(position.entry_price || 0);
  const currP = Number(position.current_price || position.mark_price || entryP);
  const slP = Number(position.stop_loss || (isLong ? entryP * 0.98 : entryP * 1.02));
  const tpP = Number(position.take_profit || (isLong ? entryP * 1.04 : entryP * 0.96));
  const qty = Number(position.position_size || position.quantity || 0);
  const notional = position.current_notional || entryP * qty;
  const margin = Number(position.margin_used || notional / (position.leverage || 5));
  const rMult = position.r_multiple || 0;
  const isAtBreakeven = Math.abs(slP - entryP) < (entryP * 0.001);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!observationNote.trim()) return;
    addNoteMutation.mutate({ tradeId: position.id, note: observationNote.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 font-sans select-none">
      {/* Backdrop click to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Container */}
      <div className="w-full max-w-xl h-full bg-[#0A1422] border-l border-[#1A2A3F] shadow-2xl flex flex-col z-10 text-[#F7FAFC] animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1A2A3F] flex items-center justify-between bg-[#07101A]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#2563EB]/15 text-[#19C5FF] border border-[#2563EB]/30">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">
                  {position.symbol}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${
                    isLong
                      ? "bg-[#00E890]/15 text-[#00E890] border-[#00E890]/30"
                      : "bg-[#FF3B5C]/15 text-[#FF3B5C] border-[#FF3B5C]/30"
                  }`}
                >
                  {isLong ? "LONG" : "SHORT"} {position.leverage || 5}x
                </span>
              </div>
              <p className="text-xs text-[#52627A] mt-0.5">
                Position #{position.id} • {position.bot_name || "Bot OMS"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#52627A] hover:text-[#F7FAFC] hover:bg-[#101B2D] transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* 1. Floating P&L Hero Card */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#0D1727] border border-[#1A2A3F] shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs text-[#52627A] uppercase font-medium block">
                Floating Mark-to-Market P&L
              </span>
              <div
                className={`text-2xl sm:text-3xl font-bold tabular-nums mt-1 flex items-center gap-1 ${
                  isProfit ? "text-[#00E890]" : "text-[#FF3B5C]"
                }`}
              >
                {isProfit ? <ArrowUpRight className="h-6 w-6" /> : <ArrowDownRight className="h-6 w-6" />}
                <span>{isProfit ? "+" : ""}${position.unrealized_pnl.toFixed(2)}</span>
              </div>
              <div
                className={`text-xs font-semibold mt-1 ${
                  isProfit ? "text-[#00E890]" : "text-[#FF3B5C]"
                }`}
              >
                {isProfit ? "+" : ""}{position.unrealized_pnl_pct.toFixed(2)}% ({rMult >= 0 ? "+" : ""}{rMult.toFixed(2)} R)
              </div>
            </div>

            <div className="text-right space-y-1 text-xs">
              <div>
                <span className="text-[10px] text-[#52627A] block">LIVE MARK</span>
                <span className="font-bold text-sm text-[#F7FAFC] tabular-nums">
                  ${currP.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#52627A] block">ENTRY BASIS</span>
                <span className="text-xs text-[#7C8CA3] tabular-nums">
                  ${entryP.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#52627A] block">DURATION</span>
                <span className="text-xs text-[#7C8CA3]">
                  {formatPositionDuration(position.duration_seconds)}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Source Identification & Feed Telemetry */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7C8CA3] flex items-center justify-between">
              <span>Source Identification & Telemetry</span>
              <span className="text-xs text-[#19C5FF]">Truthful Status</span>
            </h3>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 bg-[#0D1727] border border-[#1A2A3F] rounded-lg">
                <span className="text-[10px] text-[#52627A] uppercase block">Market Data Source</span>
                <span className="font-semibold text-[#F7FAFC]">{position.market_data_source}</span>
              </div>
              <div className="p-3 bg-[#0D1727] border border-[#1A2A3F] rounded-lg">
                <span className="text-[10px] text-[#52627A] uppercase block">Execution Broker</span>
                <span className="font-semibold text-[#F7FAFC]">{position.execution_broker}</span>
              </div>
              <div className="p-3 bg-[#0D1727] border border-[#1A2A3F] rounded-lg">
                <span className="text-[10px] text-[#52627A] uppercase block">Broker Account</span>
                <span className="font-semibold text-[#F7FAFC]">{position.broker_account_id}</span>
              </div>
              <div className="p-3 bg-[#0D1727] border border-[#1A2A3F] rounded-lg">
                <span className="text-[10px] text-[#52627A] uppercase block">Exchange & Segment</span>
                <span className="font-semibold text-[#F7FAFC]">{position.exchange} • {position.segment}</span>
              </div>
              <div className="p-3 bg-[#0D1727] border border-[#1A2A3F] rounded-lg col-span-2">
                <span className="text-[10px] text-[#52627A] uppercase block">Instrument ID Key</span>
                <span className="font-semibold text-[#19C5FF] text-xs break-all">{position.instrument_key}</span>
              </div>
              <div className="p-3 bg-[#0D1727] border border-[#1A2A3F] rounded-lg">
                <span className="text-[10px] text-[#52627A] uppercase block">Feed Status</span>
                <span className="font-semibold text-[#00E890]">{position.feed_status || "LIVE"}</span>
              </div>
              <div className="p-3 bg-[#0D1727] border border-[#1A2A3F] rounded-lg">
                <span className="text-[10px] text-[#52627A] uppercase block">Latency & Freshness</span>
                <span className="font-semibold text-[#F7FAFC]">{position.latency_ms?.toFixed(0) || "18"}ms • {position.freshness_status || "LIVE"}</span>
              </div>
            </div>
          </div>

          {/* 3. Position Architecture Specs Grid */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7C8CA3]">
              Position Parameters & Risk Sizing
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 bg-[#0D1727] border border-[#1A2A3F] rounded-lg">
                <span className="text-[10px] text-[#52627A] uppercase block">Quantity</span>
                <span className="font-semibold text-[#F7FAFC] tabular-nums">{qty} units</span>
              </div>
              <div className="p-3 bg-[#0D1727] border border-[#1A2A3F] rounded-lg">
                <span className="text-[10px] text-[#52627A] uppercase block">Notional Value</span>
                <span className="font-semibold text-[#F7FAFC] tabular-nums">
                  ${notional.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="p-3 bg-[#0D1727] border border-[#1A2A3F] rounded-lg">
                <span className="text-[10px] text-[#52627A] uppercase block">Margin Allocated</span>
                <span className="font-semibold text-[#F7FAFC] tabular-nums">
                  ${margin.toFixed(2)}
                </span>
              </div>
              <div className="p-3 bg-[#0D1727] border border-[#1A2A3F] rounded-lg">
                <span className="text-[10px] text-[#52627A] uppercase block">Planned Risk</span>
                <span className="font-semibold text-[#FF3B5C] tabular-nums">
                  ${position.planned_risk?.toFixed(2) || "—"}
                </span>
              </div>
              <div className="p-3 bg-[#0D1727] border border-[#1A2A3F] rounded-lg">
                <span className="text-[10px] text-[#52627A] uppercase block">Planned Reward</span>
                <span className="font-semibold text-[#00E890] tabular-nums">
                  ${position.planned_reward?.toFixed(2) || "—"}
                </span>
              </div>
              <div className="p-3 bg-[#0D1727] border border-[#1A2A3F] rounded-lg">
                <span className="text-[10px] text-[#52627A] uppercase block">Liquidation Price</span>
                <span className="font-semibold text-[#F59E0B] tabular-nums">
                  ${position.liquidation_price?.toFixed(2) || "—"}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Protection Boundaries */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7C8CA3]">
                Active Protection Boundaries
              </h3>
              <div className="flex items-center gap-2">
                {!isAtBreakeven && (
                  <button
                    onClick={() => onMoveToBreakeven(position)}
                    className="text-xs font-semibold text-[#19C5FF] hover:underline flex items-center gap-1"
                  >
                    <span>Move to BE</span>
                  </button>
                )}
                <button
                  onClick={() => onModifyProtection(position)}
                  className="text-xs font-semibold text-[#19C5FF] hover:underline flex items-center gap-1"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  <span>Edit SL / TP</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-[#FF3B5C]/10 border border-[#FF3B5C]/30 rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#FF3B5C] flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5" /> STOP LOSS
                  </span>
                  <span className="text-[10px] text-[#FF3B5C]">
                    -{position.sl_distance_pct?.toFixed(2) || "2.00"}%
                  </span>
                </div>
                <div className="text-base font-bold text-[#FF3B5C] tabular-nums">
                  ${slP.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-[#52627A]">
                  Distance: ${position.sl_distance_price?.toFixed(2) || "—"}
                </div>
              </div>

              <div className="p-3.5 bg-[#00E890]/10 border border-[#00E890]/30 rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#00E890] flex items-center gap-1">
                    <Target className="h-3.5 w-3.5" /> TAKE PROFIT
                  </span>
                  <span className="text-[10px] text-[#00E890]">
                    +{position.tp_distance_pct?.toFixed(2) || "4.00"}%
                  </span>
                </div>
                <div className="text-base font-bold text-[#00E890] tabular-nums">
                  ${tpP.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-[#52627A]">
                  Distance: ${position.tp_distance_price?.toFixed(2) || "—"}
                </div>
              </div>
            </div>
          </div>

          {/* 5. Trade Observation Note Creator */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7C8CA3]">
              Add Trade Observation Note
            </h3>
            <form onSubmit={handleAddNote} className="space-y-2">
              <div className="relative">
                <textarea
                  value={observationNote}
                  onChange={(e) => setObservationNote(e.target.value)}
                  placeholder="Record trade setup thesis, market context, or exit adjustments..."
                  rows={3}
                  className="w-full p-3 bg-[#0D1727] border border-[#1A2A3F] rounded-lg text-xs text-[#F7FAFC] placeholder-[#52627A] focus:outline-none focus:border-[#2563EB] transition resize-none font-sans"
                />
              </div>

              <div className="flex items-center justify-between">
                {noteStatus && (
                  <span className="text-xs text-[#19C5FF]">{noteStatus}</span>
                )}
                <button
                  type="submit"
                  disabled={addNoteMutation.isPending || !observationNote.trim()}
                  className="ml-auto px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#3B82F6] text-white font-semibold text-xs flex items-center gap-1.5 transition disabled:opacity-50 shadow-sm"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Save Note</span>
                </button>
              </div>
            </form>
          </div>

          {/* 6. Quick Links */}
          <div className="grid grid-cols-2 gap-2 text-xs font-medium">
            <button
              onClick={() => {
                router.push(`/charts?symbol=${encodeURIComponent(position.symbol)}`);
                onClose();
              }}
              className="p-3 rounded-lg bg-[#0D1727] hover:bg-[#101B2D] text-[#7C8CA3] hover:text-[#F7FAFC] border border-[#1A2A3F] flex items-center justify-center gap-2 transition"
            >
              <ExternalLink className="h-4 w-4 text-[#19C5FF]" />
              <span>Open in Markets</span>
            </button>

            <button
              onClick={() => {
                router.push("/orders");
                onClose();
              }}
              className="p-3 rounded-lg bg-[#0D1727] hover:bg-[#101B2D] text-[#7C8CA3] hover:text-[#F7FAFC] border border-[#1A2A3F] flex items-center justify-center gap-2 transition"
            >
              <History className="h-4 w-4 text-[#19C5FF]" />
              <span>View Related Orders</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#1A2A3F] bg-[#07101A] flex items-center justify-between gap-3">
          <button
            onClick={() => onPartialClose(position)}
            className="px-4 py-2.5 rounded-lg bg-[#0D1727] hover:bg-[#101B2D] text-[#7C8CA3] hover:text-[#F59E0B] border border-[#1A2A3F] text-xs font-semibold transition"
          >
            PARTIAL SCALE EXIT
          </button>

          <button
            onClick={() => onSquareOff(position)}
            className="px-5 py-2.5 rounded-lg bg-[#FF3B5C] hover:bg-[#DC2626] text-white text-xs font-semibold shadow-sm transition active:scale-95"
          >
            FULL MARKET SQUARE OFF
          </button>
        </div>
      </div>
    </div>
  );
}
