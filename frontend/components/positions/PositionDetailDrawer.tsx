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
  Clock,
  DollarSign,
  Send,
  CheckCircle2,
  AlertTriangle,
  History,
  Activity,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PositionRecord, formatPositionDuration } from "@/types/positions";

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
      const res = await fetch(`/api/trades/${tradeId}/observation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observation: note, source: "Positions Drawer" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add journal note");
      return data;
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
      <div className="w-full max-w-xl h-full bg-[var(--theme-surface)] border-l border-[var(--theme-border)] shadow-2xl flex flex-col z-10 text-[var(--theme-text-primary)] animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--theme-border)] flex items-center justify-between bg-[var(--theme-elevated)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] border border-[var(--theme-accent)]/30">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">
                  {position.symbol}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold border ${
                    isLong
                      ? "bg-[var(--theme-profit)]/15 text-[var(--theme-profit)] border-[var(--theme-profit)]/30"
                      : "bg-[var(--theme-loss)]/15 text-[var(--theme-loss)] border-[var(--theme-loss)]/30"
                  }`}
                >
                  {isLong ? "LONG" : "SHORT"} {position.leverage || 5}x
                </span>
              </div>
              <p className="text-xs text-[var(--theme-text-secondary)] mt-0.5 font-mono">
                Position #{position.id} • {position.bot_name || "Bot OMS"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface)] transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* 1. Floating P&L Hero Card */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[var(--theme-elevated)] border border-[var(--theme-border)] shadow-md flex items-center justify-between">
            <div>
              <span className="text-[11px] text-[var(--theme-text-muted)] uppercase tracking-wider font-mono block">
                Floating Mark-to-Market P&L
              </span>
              <div
                className={`text-2xl sm:text-3xl font-black font-mono tabular-nums mt-1 flex items-center gap-1 ${
                  isProfit ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"
                }`}
              >
                {isProfit ? <ArrowUpRight className="h-6 w-6" /> : <ArrowDownRight className="h-6 w-6" />}
                <span>{isProfit ? "+" : ""}${position.unrealized_pnl.toFixed(2)}</span>
              </div>
              <div
                className={`text-xs font-mono font-bold mt-1 ${
                  isProfit ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"
                }`}
              >
                {isProfit ? "+" : ""}{position.unrealized_pnl_pct.toFixed(2)}% ({rMult >= 0 ? "+" : ""}{rMult.toFixed(2)} R)
              </div>
            </div>

            <div className="text-right font-mono space-y-1 text-xs">
              <div>
                <span className="text-[10px] text-[var(--theme-text-muted)] block">LIVE MARK</span>
                <span className="font-bold text-sm text-[var(--theme-text-primary)] tabular-nums">
                  ${currP.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--theme-text-muted)] block">ENTRY BASIS</span>
                <span className="text-xs text-[var(--theme-text-secondary)] tabular-nums">
                  ${entryP.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--theme-text-muted)] block">DURATION</span>
                <span className="text-xs text-[var(--theme-text-secondary)]">
                  {formatPositionDuration(position.duration_seconds)}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Position Architecture Specs Grid */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text-secondary)] font-mono">
              Position Parameters & Risk Sizing
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-mono text-xs">
              <div className="p-3 bg-[var(--theme-elevated)]/70 border border-[var(--theme-border-subtle)] rounded-2xl">
                <span className="text-[10px] text-[var(--theme-text-muted)] uppercase block">Quantity</span>
                <span className="font-bold text-[var(--theme-text-primary)] tabular-nums">{qty} units</span>
              </div>
              <div className="p-3 bg-[var(--theme-elevated)]/70 border border-[var(--theme-border-subtle)] rounded-2xl">
                <span className="text-[10px] text-[var(--theme-text-muted)] uppercase block">Notional Value</span>
                <span className="font-bold text-[var(--theme-text-primary)] tabular-nums">
                  ${notional.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="p-3 bg-[var(--theme-elevated)]/70 border border-[var(--theme-border-subtle)] rounded-2xl">
                <span className="text-[10px] text-[var(--theme-text-muted)] uppercase block">Margin Allocated</span>
                <span className="font-bold text-[var(--theme-text-primary)] tabular-nums">
                  ${margin.toFixed(2)}
                </span>
              </div>
              <div className="p-3 bg-[var(--theme-elevated)]/70 border border-[var(--theme-border-subtle)] rounded-2xl">
                <span className="text-[10px] text-[var(--theme-text-muted)] uppercase block">Planned Risk</span>
                <span className="font-bold text-[var(--theme-loss)] tabular-nums">
                  ${position.planned_risk?.toFixed(2) || "—"}
                </span>
              </div>
              <div className="p-3 bg-[var(--theme-elevated)]/70 border border-[var(--theme-border-subtle)] rounded-2xl">
                <span className="text-[10px] text-[var(--theme-text-muted)] uppercase block">Planned Reward</span>
                <span className="font-bold text-[var(--theme-profit)] tabular-nums">
                  ${position.planned_reward?.toFixed(2) || "—"}
                </span>
              </div>
              <div className="p-3 bg-[var(--theme-elevated)]/70 border border-[var(--theme-border-subtle)] rounded-2xl">
                <span className="text-[10px] text-[var(--theme-text-muted)] uppercase block">Liquidation Price</span>
                <span className="font-bold text-[var(--theme-warning)] tabular-nums">
                  ${position.liquidation_price?.toFixed(2) || "—"}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Protection Boundaries */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text-secondary)] font-mono">
                Active Protection Boundaries
              </h3>
              <div className="flex items-center gap-2">
                {!isAtBreakeven && (
                  <button
                    onClick={() => onMoveToBreakeven(position)}
                    className="text-xs font-bold text-[var(--theme-accent)] hover:underline flex items-center gap-1 font-mono"
                  >
                    <span>Move to BE</span>
                  </button>
                )}
                <button
                  onClick={() => onModifyProtection(position)}
                  className="text-xs font-bold text-[var(--theme-accent)] hover:underline flex items-center gap-1"
                >
                  <Sliders className="h-3 w-3" />
                  <span>Edit SL / TP</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-3.5 bg-[var(--theme-loss)]/10 border border-[var(--theme-loss)]/30 rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[var(--theme-loss)] flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5" /> STOP LOSS
                  </span>
                  <span className="text-[10px] text-[var(--theme-loss)]">
                    -{position.sl_distance_pct?.toFixed(2) || "2.00"}%
                  </span>
                </div>
                <div className="text-base font-black text-[var(--theme-loss)] tabular-nums">
                  ${slP.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-[var(--theme-text-muted)]">
                  Distance: ${position.sl_distance_price?.toFixed(2) || "—"}
                </div>
              </div>

              <div className="p-3.5 bg-[var(--theme-profit)]/10 border border-[var(--theme-profit)]/30 rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[var(--theme-profit)] flex items-center gap-1">
                    <Target className="h-3.5 w-3.5" /> TAKE PROFIT
                  </span>
                  <span className="text-[10px] text-[var(--theme-profit)]">
                    +{position.tp_distance_pct?.toFixed(2) || "4.00"}%
                  </span>
                </div>
                <div className="text-base font-black text-[var(--theme-profit)] tabular-nums">
                  ${tpP.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-[var(--theme-text-muted)]">
                  Distance: ${position.tp_distance_price?.toFixed(2) || "—"}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Trade Observation Note Creator */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text-secondary)] font-mono">
              Add Trade Observation Note
            </h3>
            <form onSubmit={handleAddNote} className="space-y-2">
              <div className="relative">
                <textarea
                  value={observationNote}
                  onChange={(e) => setObservationNote(e.target.value)}
                  placeholder="Record trade setup thesis, market context, or exit adjustments..."
                  rows={3}
                  className="w-full p-3 bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] rounded-2xl text-xs text-[var(--theme-text-primary)] placeholder-[var(--theme-text-muted)] focus:outline-none focus:border-[var(--theme-accent)] transition resize-none font-sans"
                />
              </div>

              <div className="flex items-center justify-between">
                {noteStatus && (
                  <span className="text-xs text-[var(--theme-accent)] font-mono">{noteStatus}</span>
                )}
                <button
                  type="submit"
                  disabled={addNoteMutation.isPending || !observationNote.trim()}
                  className="ml-auto px-4 py-2 rounded-xl bg-[var(--theme-accent)] text-[var(--theme-bg)] font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50 shadow-sm"
                >
                  <Send className="h-3 w-3" />
                  <span>Save Note</span>
                </button>
              </div>
            </form>
          </div>

          {/* 5. Quick Links */}
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
            <button
              onClick={() => {
                router.push(`/charts?symbol=${encodeURIComponent(position.symbol)}`);
                onClose();
              }}
              className="p-3 rounded-2xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] border border-[var(--theme-border-subtle)] flex items-center justify-center gap-2 transition"
            >
              <ExternalLink className="h-4 w-4 text-[var(--theme-accent)]" />
              <span>Open in Markets</span>
            </button>

            <button
              onClick={() => {
                router.push("/orders");
                onClose();
              }}
              className="p-3 rounded-2xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] border border-[var(--theme-border-subtle)] flex items-center justify-center gap-2 transition"
            >
              <History className="h-4 w-4 text-[var(--theme-accent)]" />
              <span>View Related Orders</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[var(--theme-border)] bg-[var(--theme-elevated)] flex items-center justify-between gap-3">
          <button
            onClick={() => onPartialClose(position)}
            className="px-4 py-2.5 rounded-2xl bg-[var(--theme-surface)] hover:bg-[var(--theme-warning)]/20 text-[var(--theme-text-secondary)] hover:text-[var(--theme-warning)] border border-[var(--theme-border)] text-xs font-bold font-mono transition"
          >
            PARTIAL SCALE EXIT
          </button>

          <button
            onClick={() => onSquareOff(position)}
            className="px-5 py-2.5 rounded-2xl bg-[var(--theme-loss)] hover:opacity-90 text-white text-xs font-bold font-mono shadow-md shadow-[var(--theme-loss)]/25 transition active:scale-95"
          >
            FULL MARKET SQUARE OFF
          </button>
        </div>
      </div>
    </div>
  );
}
