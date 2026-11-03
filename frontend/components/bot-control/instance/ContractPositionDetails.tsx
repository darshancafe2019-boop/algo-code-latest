"use client";

import React, { useState } from "react";
import {
  Layers,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Sliders,
  DollarSign,
  ArrowRightLeft,
  XCircle,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber, formatSignedMoney, formatDateTime } from "@/lib/formatters";

export interface PositionDetailItem {
  id: string;
  contractName: string;
  instrumentId: string;
  direction: "LONG" | "SHORT";
  quantity: number;
  averageEntryPrice: number;
  currentMarketPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  entryTime: string;
  currentExposure: number;
  initialMargin: number;
  maintenanceMargin: number;
  liquidationPrice: number | null;
  stopLossPrice: number;
  targetPrice: number;
  trailingStopActive: boolean;
  fees: number;
}

interface ContractPositionDetailsProps {
  position: PositionDetailItem | null;
  onModifySlTp: (posId: string, sl: number, tp: number) => Promise<void>;
  onClosePosition: (posId: string, qty: number) => Promise<void>;
  onReversePosition: (posId: string) => Promise<void>;
  onToggleTrailingStop: (posId: string, active: boolean) => Promise<void>;
  currencySymbol?: string;
}

export function ContractPositionDetails({
  position,
  onModifySlTp,
  onClosePosition,
  onReversePosition,
  onToggleTrailingStop,
  currencySymbol = "₹",
}: ContractPositionDetailsProps) {
  const [modalAction, setModalAction] = useState<"EXIT_FULL" | "EXIT_PARTIAL" | "MODIFY_SLTP" | "REVERSE" | null>(null);
  const [newSl, setNewSl] = useState<number>(position?.stopLossPrice || 0);
  const [newTp, setNewTp] = useState<number>(position?.targetPrice || 0);
  const [partialQty, setPartialQty] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!position) {
    return (
      <div className="rounded-[8px] bg-[#091426] border border-[#1A2B43] p-8 text-center text-[#91A7C1] font-mono text-xs select-none">
        <Layers className="h-8 w-8 text-[#91A7C1]/50 mx-auto mb-2" />
        <h4 className="font-bold text-[#EAF3FF] text-sm">No Active Position</h4>
        <p className="text-[11px] mt-1">This trading bot does not currently hold an open contract position.</p>
      </div>
    );
  }

  const isLong = position.direction === "LONG";
  const pnlPercent = position.averageEntryPrice > 0
    ? ((position.currentMarketPrice - position.averageEntryPrice) / position.averageEntryPrice) * (isLong ? 100 : -100)
    : 0;

  const handleConfirmAction = async () => {
    setIsSubmitting(true);
    try {
      if (modalAction === "EXIT_FULL") {
        await onClosePosition(position.id, position.quantity);
      } else if (modalAction === "EXIT_PARTIAL") {
        await onClosePosition(position.id, partialQty);
      } else if (modalAction === "MODIFY_SLTP") {
        await onModifySlTp(position.id, newSl, newTp);
      } else if (modalAction === "REVERSE") {
        await onReversePosition(position.id);
      }
      setModalAction(null);
    } catch (err: any) {
      alert(`Action failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="rounded-[8px] bg-[#091426] border border-[#1A2B43] p-4 space-y-4 font-sans select-none shadow-md">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#1A2B43]/70">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#00C9E8]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono">
              Live Contract &amp; Position Details
            </h3>
            <span
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-mono font-bold border",
                isLong
                  ? "bg-[#00D6A0]/15 text-[#00D6A0] border-[#00D6A0]/40"
                  : "bg-[#FF5268]/15 text-[#FF5268] border-[#FF5268]/40"
              )}
            >
              {position.direction} • {position.quantity} Lots
            </span>
          </div>

          <span className="text-[10px] font-mono text-[#91A7C1]">
            Entry: {formatDateTime(position.entryTime)}
          </span>
        </div>

        {/* Primary Position Metrics Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
          <div className="p-3 rounded bg-[#050B16] border border-[#1A2B43]">
            <span className="text-[10px] text-[#91A7C1] uppercase font-bold block">Avg Entry Price</span>
            <span className="text-xl font-bold text-[#EAF3FF] tabular-nums">
              {currencySymbol}{formatNumber(position.averageEntryPrice, 2)}
            </span>
            <span className="text-[10px] text-[#91A7C1] block mt-0.5">Instrument: {position.instrumentId}</span>
          </div>

          <div className="p-3 rounded bg-[#050B16] border border-[#1A2B43]">
            <span className="text-[10px] text-[#91A7C1] uppercase font-bold block">Mark / Current Price</span>
            <span className="text-xl font-bold text-[#00C9E8] tabular-nums">
              {currencySymbol}{formatNumber(position.currentMarketPrice, 2)}
            </span>
            <span className="text-[10px] text-[#91A7C1] block mt-0.5">Mark: {currencySymbol}{formatNumber(position.markPrice, 2)}</span>
          </div>

          <div className="p-3 rounded bg-[#050B16] border border-[#1A2B43]">
            <span className="text-[10px] text-[#91A7C1] uppercase font-bold block">Unrealized P&amp;L</span>
            <span className={cn("text-xl font-bold tabular-nums", position.unrealizedPnl >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]")}>
              {formatSignedMoney(position.unrealizedPnl, currencySymbol)}
            </span>
            <span className={cn("text-[10px] font-bold block mt-0.5", pnlPercent >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]")}>
              {pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}% ROI
            </span>
          </div>

          <div className="p-3 rounded bg-[#050B16] border border-[#1A2B43]">
            <span className="text-[10px] text-[#91A7C1] uppercase font-bold block">Current Exposure</span>
            <span className="text-xl font-bold text-[#EAF3FF] tabular-nums">
              {currencySymbol}{formatNumber(position.currentExposure, 2)}
            </span>
            <span className="text-[10px] text-[#91A7C1] block mt-0.5">Margin: {currencySymbol}{formatNumber(position.initialMargin, 2)}</span>
          </div>
        </div>

        {/* Protection Limits & Liquidation Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs font-mono">
          <div className="p-2 rounded bg-[#050B16] border border-[#1A2B43]/60">
            <span className="text-[10px] text-[#91A7C1] block">Stop-Loss Price</span>
            <span className="font-bold text-[#FF5268] tabular-nums">
              {currencySymbol}{formatNumber(position.stopLossPrice, 2)}
            </span>
          </div>
          <div className="p-2 rounded bg-[#050B16] border border-[#1A2B43]/60">
            <span className="text-[10px] text-[#91A7C1] block">Take-Profit Price</span>
            <span className="font-bold text-[#00D6A0] tabular-nums">
              {currencySymbol}{formatNumber(position.targetPrice, 2)}
            </span>
          </div>
          <div className="p-2 rounded bg-[#050B16] border border-[#1A2B43]/60">
            <span className="text-[10px] text-[#91A7C1] block">Maintenance Margin</span>
            <span className="font-bold text-[#EAF3FF] tabular-nums">
              {currencySymbol}{formatNumber(position.maintenanceMargin, 2)}
            </span>
          </div>
          <div className="p-2 rounded bg-[#050B16] border border-[#1A2B43]/60">
            <span className="text-[10px] text-[#91A7C1] block">Liquidation Price</span>
            <span className="font-bold text-[#FFB020] tabular-nums">
              {position.liquidationPrice ? `${currencySymbol}${formatNumber(position.liquidationPrice, 2)}` : "Isolated / Safe"}
            </span>
          </div>
          <div className="p-2 rounded bg-[#050B16] border border-[#1A2B43]/60">
            <span className="text-[10px] text-[#91A7C1] block">Trailing Stop</span>
            <span className={cn("font-bold", position.trailingStopActive ? "text-[#00D6A0]" : "text-[#91A7C1]")}>
              {position.trailingStopActive ? "ACTIVE" : "INACTIVE"}
            </span>
          </div>
          <div className="p-2 rounded bg-[#050B16] border border-[#1A2B43]/60">
            <span className="text-[10px] text-[#91A7C1] block">Position Fees</span>
            <span className="font-bold text-[#FFB020] tabular-nums">
              {currencySymbol}{formatNumber(position.fees, 2)}
            </span>
          </div>
        </div>

        {/* SECTION F: ADVANCED POSITION MANAGEMENT ACTIONS */}
        <div className="pt-2 border-t border-[#1A2B43]/70 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold font-mono text-[#00C9E8] uppercase tracking-wider">
              Advanced Position Management Workspace
            </span>
            <span className="text-[10px] font-mono text-[#91A7C1]">Requires Explicit Authorization</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Modify SL / TP */}
            <button
              type="button"
              onClick={() => {
                setNewSl(position.stopLossPrice);
                setNewTp(position.targetPrice);
                setModalAction("MODIFY_SLTP");
              }}
              className="px-3 py-1.5 rounded-[6px] bg-[#050B16] border border-[#1A2B43] hover:border-[#00C9E8]/40 text-xs font-mono font-bold text-[#00C9E8] transition-colors cursor-pointer"
            >
              Modify SL / TP
            </button>

            {/* Toggle Trailing Stop */}
            <button
              type="button"
              onClick={() => onToggleTrailingStop(position.id, !position.trailingStopActive)}
              className={cn(
                "px-3 py-1.5 rounded-[6px] border text-xs font-mono font-bold transition-colors cursor-pointer",
                position.trailingStopActive
                  ? "bg-[#00D6A0]/15 border-[#00D6A0]/40 text-[#00D6A0]"
                  : "bg-[#050B16] border-[#1A2B43] text-[#91A7C1] hover:text-[#EAF3FF]"
              )}
            >
              {position.trailingStopActive ? "Disable Trailing Stop" : "Enable Trailing Stop"}
            </button>

            {/* Partial Exit */}
            <button
              type="button"
              onClick={() => {
                setPartialQty(Math.max(1, Math.floor(position.quantity / 2)));
                setModalAction("EXIT_PARTIAL");
              }}
              className="px-3 py-1.5 rounded-[6px] bg-[#050B16] border border-[#1A2B43] hover:border-[#FFB020]/40 text-xs font-mono font-bold text-[#FFB020] transition-colors cursor-pointer"
            >
              Partial Exit
            </button>

            {/* Full Exit */}
            <button
              type="button"
              onClick={() => setModalAction("EXIT_FULL")}
              className="px-3 py-1.5 rounded-[6px] bg-[#FF5268]/15 hover:bg-[#FF5268]/25 border border-[#FF5268]/40 text-xs font-mono font-bold text-[#FF5268] transition-colors cursor-pointer"
            >
              Full Market Exit
            </button>

            {/* Reverse Position */}
            <button
              type="button"
              onClick={() => setModalAction("REVERSE")}
              className="px-3 py-1.5 rounded-[6px] bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/25 border border-[#8B5CF6]/40 text-xs font-mono font-bold text-[#A78BFA] transition-colors cursor-pointer"
            >
              Reverse Position
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialogs for Order-Changing Actions */}
      {modalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-[8px] border border-[#1A2B43] bg-[#091426] p-5 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-[6px] bg-[#0878FF]/20 border border-[#0878FF]/40 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-[#00C9E8]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#EAF3FF]">
                  {modalAction === "EXIT_FULL" && "Confirm Full Position Exit"}
                  {modalAction === "EXIT_PARTIAL" && "Confirm Partial Position Reduction"}
                  {modalAction === "MODIFY_SLTP" && "Update Protective Guardrails"}
                  {modalAction === "REVERSE" && "Reverse Position Direction"}
                </h3>
                <span className="text-[10px] text-[#91A7C1]">Contract: {position.contractName}</span>
              </div>
            </div>

            {/* Modal Body */}
            {modalAction === "EXIT_FULL" && (
              <p className="text-[#91A7C1] leading-relaxed">
                Submitting a market order to close all <strong className="text-[#EAF3FF]">{position.quantity} lots</strong>.
                Unrealized P&amp;L of <strong className={position.unrealizedPnl >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]"}>{formatSignedMoney(position.unrealizedPnl, currencySymbol)}</strong> will be booked.
              </p>
            )}

            {modalAction === "EXIT_PARTIAL" && (
              <div className="space-y-2">
                <label className="text-[#91A7C1] block">Lots to close (Max {position.quantity}):</label>
                <input
                  type="number"
                  min={1}
                  max={position.quantity}
                  value={partialQty}
                  onChange={(e) => setPartialQty(Math.min(position.quantity, Math.max(1, Number(e.target.value))))}
                  className="w-full bg-[#050B16] border border-[#1A2B43] rounded px-3 py-2 text-[#EAF3FF] font-bold"
                />
              </div>
            )}

            {modalAction === "MODIFY_SLTP" && (
              <div className="space-y-3">
                <div>
                  <label className="text-[#91A7C1] block mb-1">New Stop-Loss Price ({currencySymbol}):</label>
                  <input
                    type="number"
                    step="0.05"
                    value={newSl}
                    onChange={(e) => setNewSl(Number(e.target.value))}
                    className="w-full bg-[#050B16] border border-[#1A2B43] rounded px-3 py-2 text-[#FF5268] font-bold"
                  />
                </div>
                <div>
                  <label className="text-[#91A7C1] block mb-1">New Take-Profit Price ({currencySymbol}):</label>
                  <input
                    type="number"
                    step="0.05"
                    value={newTp}
                    onChange={(e) => setNewTp(Number(e.target.value))}
                    className="w-full bg-[#050B16] border border-[#1A2B43] rounded px-3 py-2 text-[#00D6A0] font-bold"
                  />
                </div>
              </div>
            )}

            {modalAction === "REVERSE" && (
              <div className="text-[#91A7C1] leading-relaxed space-y-2">
                <p>
                  This operation will submit orders to close the current <strong className="text-[#EAF3FF]">{position.direction}</strong> position ({position.quantity} lots) and open a corresponding <strong className="text-[#00C9E8]">{isLong ? "SHORT" : "LONG"}</strong> position.
                </p>
                <div className="p-2.5 rounded bg-[#FFB020]/10 border border-[#FFB020]/30 text-[#FFB020] text-[11px]">
                  Requires passing pre-trade risk gates, available margin validation, and spread checks.
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#1A2B43]">
              <button
                type="button"
                onClick={() => setModalAction(null)}
                disabled={isSubmitting}
                className="px-3 py-1.5 rounded-[4px] border border-[#1A2B43] bg-[#050B16] text-[#91A7C1] hover:text-[#EAF3FF] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-[4px] bg-[#00C9E8] hover:bg-[#00B4D0] font-bold text-[#050B16] transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                {isSubmitting ? "Executing..." : "Confirm Action"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

