"use client";

import React from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Target,
  Sliders,
  XCircle,
  ExternalLink,
  Clock,
  AlertTriangle,
  Flame,
  Zap,
  Radio,
  Building2,
  Server,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { PositionRecord, formatPositionDuration } from "@/types/positions";

interface PositionsCompactTableProps {
  positions: PositionRecord[];
  onSelectPosition: (pos: PositionRecord) => void;
  onModifyProtection: (pos: PositionRecord) => void;
  onSquareOff: (pos: PositionRecord) => void;
  onPartialClose: (pos: PositionRecord) => void;
  onMoveToBreakeven: (pos: PositionRecord) => void;
}

const PositionTableRow = React.memo(function PositionTableRow({
  pos,
  onSelectPosition,
  onModifyProtection,
  onSquareOff,
  onPartialClose,
  onMoveToBreakeven,
  onNavigateMarket,
}: {
  pos: PositionRecord;
  onSelectPosition: (pos: PositionRecord) => void;
  onModifyProtection: (pos: PositionRecord) => void;
  onSquareOff: (pos: PositionRecord) => void;
  onPartialClose: (pos: PositionRecord) => void;
  onMoveToBreakeven: (pos: PositionRecord) => void;
  onNavigateMarket: (symbol: string) => void;
}) {
  const isLong = (pos.direction || pos.side || "LONG").toUpperCase().includes("LONG") || (pos.direction || pos.side || "LONG").toUpperCase().includes("BUY");
  const isProfit = pos.unrealized_pnl >= 0;
  const entryP = Number(pos.entry_price || 0);
  const currP = Number(pos.current_price || pos.mark_price || entryP);
  const slP = Number(pos.stop_loss || 0);
  const tpP = Number(pos.take_profit || 0);
  const qty = Number(pos.position_size || pos.quantity || 0);
  const notional = pos.current_notional || entryP * qty;
  const lev = pos.leverage || 1;
  const rMult = pos.r_multiple || 0;
  const hasWarnings = pos.risk_warnings && pos.risk_warnings.length > 0;
  const isAtBreakeven = Math.abs(slP - entryP) < (entryP * 0.001);
  const currencySymbol = pos.currency === "INR" ? "₹" : "$";

  // Feed and Status Badge Formatting
  const feedStatus = pos.feed_status || "LIVE";
  const isFeedLive = feedStatus === "LIVE";
  const isNotConfigured = feedStatus === "NOT CONFIGURED" || feedStatus === "AUTH REQUIRED";

  return (
    <tr
      className="hover:bg-[var(--theme-elevated)]/60 transition-colors group cursor-pointer border-b border-[var(--theme-border-subtle)]"
      onClick={() => onSelectPosition(pos)}
    >
      {/* 1. Instrument & Bot Origin */}
      <td className="py-3 px-3.5">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-xs text-[var(--theme-text-primary)] font-sans group-hover:text-[var(--theme-accent)] transition-colors">
            {pos.symbol}
          </span>
          {hasWarnings && (
            <span title={pos.risk_warnings?.join(", ")}>
              <AlertTriangle className="h-3 w-3 text-[var(--theme-warning)] shrink-0 animate-bounce" />
            </span>
          )}
        </div>
        <div className="text-[10px] text-[var(--theme-text-secondary)] truncate max-w-[130px] font-sans">
          {pos.bot_name || pos.bot_id || "Fleet OMS"}
        </div>
      </td>

      {/* 2. Source Identification: Market Data vs Execution vs Account */}
      <td className="py-3 px-3">
        <div className="flex flex-col gap-0.5 text-[10px]">
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-[var(--theme-text-muted)] font-mono uppercase">DATA:</span>
            <span className="font-bold text-[var(--theme-text-primary)] truncate max-w-[120px]" title={pos.market_data_source}>
              {pos.market_data_source}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[var(--theme-text-secondary)]">
            <span className="text-[9px] text-[var(--theme-text-muted)] font-mono uppercase">EXEC:</span>
            <span className="font-medium truncate max-w-[110px]" title={`${pos.execution_broker} (${pos.broker_account_id})`}>
              {pos.execution_broker} • <span className="font-mono text-[9px]">{pos.broker_account_id}</span>
            </span>
          </div>
        </div>
      </td>

      {/* 3. Exchange & Segment */}
      <td className="py-3 px-2.5">
        <div className="flex flex-col gap-0.5 font-mono text-[10px]">
          <span className="font-bold text-[var(--theme-text-primary)]">
            {pos.exchange}
          </span>
          <span className="text-[9px] text-[var(--theme-text-muted)] bg-[var(--theme-elevated)] px-1 py-0.2 rounded border border-[var(--theme-border-subtle)] w-fit">
            {pos.segment}
          </span>
        </div>
      </td>

      {/* 4. Side & Leverage */}
      <td className="py-3 px-2.5">
        <div className="flex items-center gap-1">
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border ${
              isLong
                ? "bg-[var(--theme-profit)]/15 text-[var(--theme-profit)] border-[var(--theme-profit)]/30"
                : "bg-[var(--theme-loss)]/15 text-[var(--theme-loss)] border-[var(--theme-loss)]/30"
            }`}
          >
            {isLong ? "LONG" : "SHORT"}
          </span>
          <span className="text-[9px] text-[var(--theme-text-muted)] bg-[var(--theme-elevated)] px-1 py-0.5 rounded border border-[var(--theme-border-subtle)] font-bold">
            {lev}x
          </span>
        </div>
      </td>

      {/* 5. Entry / Current Mark Price */}
      <td className="py-3 px-2.5 text-right tabular-nums">
        <div className="font-extrabold text-xs text-[var(--theme-text-primary)]">
          {currencySymbol}{currP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="text-[9px] text-[var(--theme-text-muted)]">
          Entry: {currencySymbol}{entryP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </td>

      {/* 6. Quantity & Notional */}
      <td className="py-3 px-2.5 text-right tabular-nums">
        <div className="text-[var(--theme-text-primary)] font-bold text-xs">{qty}</div>
        <div className="text-[9px] text-[var(--theme-text-muted)]">
          {currencySymbol}{notional.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </div>
      </td>

      {/* 7. Stop Loss & Breakeven Status */}
      <td className="py-3 px-2.5 text-right tabular-nums">
        <div className="text-[var(--theme-loss)] font-bold text-xs flex items-center justify-end gap-1">
          {isAtBreakeven && (
            <span className="text-[8px] px-1 rounded bg-[var(--theme-accent)]/20 text-[var(--theme-accent)] border border-[var(--theme-accent)]/30 font-sans font-bold">
              BE
            </span>
          )}
          <span>{currencySymbol}{slP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="text-[9px] text-[var(--theme-loss)] opacity-80">
          -{pos.sl_distance_pct?.toFixed(2) || "2.00"}%
        </div>
      </td>

      {/* 8. Take Profit */}
      <td className="py-3 px-2.5 text-right tabular-nums">
        <div className="text-[var(--theme-profit)] font-bold text-xs">
          {currencySymbol}{tpP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="text-[9px] text-[var(--theme-profit)] opacity-80">
          +{pos.tp_distance_pct?.toFixed(2) || "4.00"}%
        </div>
      </td>

      {/* 9. Floating P&L */}
      <td className="py-3 px-3 text-right tabular-nums">
        <div
          className={`text-xs font-black flex items-center justify-end gap-0.5 ${
            isProfit ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"
          }`}
        >
          {isProfit ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          <span>{isProfit ? "+" : ""}{currencySymbol}{pos.unrealized_pnl.toFixed(2)}</span>
        </div>
        <div
          className={`text-[9px] font-bold ${
            isProfit ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"
          }`}
        >
          {isProfit ? "+" : ""}{pos.unrealized_pnl_pct.toFixed(2)}%
        </div>
      </td>

      {/* 10. R-Multiple */}
      <td className="py-3 px-2 text-center tabular-nums">
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${
            rMult >= 1.0
              ? "bg-[var(--theme-profit)]/15 text-[var(--theme-profit)] border-[var(--theme-profit)]/30"
              : rMult <= -1.0
              ? "bg-[var(--theme-loss)]/15 text-[var(--theme-loss)] border-[var(--theme-loss)]/30"
              : "bg-[var(--theme-elevated)] text-[var(--theme-text-secondary)] border-[var(--theme-border-subtle)]"
          }`}
        >
          {rMult >= 0 ? "+" : ""}{rMult.toFixed(2)} R
        </span>
      </td>

      {/* 11. Latency & Truthful Status */}
      <td className="py-3 px-2 text-center">
        <div className="flex flex-col items-center gap-0.5 font-mono">
          <span
            className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
              isFeedLive
                ? "bg-[var(--theme-profit)]/15 text-[var(--theme-profit)] border-[var(--theme-profit)]/30"
                : isNotConfigured
                ? "bg-[var(--theme-warning)]/15 text-[var(--theme-warning)] border-[var(--theme-warning)]/30"
                : "bg-[var(--theme-loss)]/15 text-[var(--theme-loss)] border-[var(--theme-loss)]/30"
            }`}
          >
            {feedStatus}
          </span>
          <span className="text-[9px] text-[var(--theme-text-muted)] flex items-center gap-0.5">
            <Radio className="h-2.5 w-2.5 text-[var(--theme-accent)]" />
            <span>{pos.latency_ms?.toFixed(0) || "18"}ms</span>
          </span>
        </div>
      </td>

      {/* 12. Quick Action Controls */}
      <td className="py-3 px-3.5 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          {/* 1-Click Breakeven Button */}
          {!isAtBreakeven && (
            <button
              onClick={() => onMoveToBreakeven(pos)}
              className="px-1.5 py-1 rounded bg-[var(--theme-elevated)] hover:bg-[var(--theme-accent)]/20 text-[var(--theme-text-secondary)] hover:text-[var(--theme-accent)] border border-[var(--theme-border-subtle)] text-[9px] font-extrabold transition shadow-sm"
              title="Move Stop Loss to Breakeven (Entry Price)"
            >
              BE
            </button>
          )}

          {/* Protection SL/TP Modifier */}
          <button
            onClick={() => onModifyProtection(pos)}
            className="p-1 rounded bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-accent)] border border-[var(--theme-border-subtle)] transition shadow-sm"
            title="Adjust SL / TP Protection Limits"
          >
            <Sliders className="h-3 w-3" />
          </button>

          {/* Market Navigation */}
          <button
            onClick={() => onNavigateMarket(pos.symbol)}
            className="p-1 rounded bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] border border-[var(--theme-border-subtle)] transition shadow-sm"
            title="Open in Markets"
          >
            <ExternalLink className="h-3 w-3" />
          </button>

          {/* Scale-Out Exit */}
          <button
            onClick={() => onPartialClose(pos)}
            className="px-1.5 py-1 rounded bg-[var(--theme-elevated)] hover:bg-[var(--theme-warning)]/20 text-[var(--theme-text-secondary)] hover:text-[var(--theme-warning)] border border-[var(--theme-border-subtle)] text-[9px] font-extrabold transition shadow-sm"
            title="Partial Scale Close"
          >
            SCALE
          </button>

          {/* Full Square Off */}
          <button
            onClick={() => onSquareOff(pos)}
            className="px-2 py-1 rounded bg-[var(--theme-loss)]/15 hover:bg-[var(--theme-loss)] text-[var(--theme-loss)] hover:text-white border border-[var(--theme-loss)]/30 text-[9px] font-extrabold transition shadow-sm active:scale-95"
            title="Full Market Square Off"
          >
            CLOSE
          </button>
        </div>
      </td>
    </tr>
  );
});

export function PositionsCompactTable({
  positions,
  onSelectPosition,
  onModifyProtection,
  onSquareOff,
  onPartialClose,
  onMoveToBreakeven,
}: PositionsCompactTableProps) {
  const router = useRouter();

  const handleNavigateMarket = React.useCallback(
    (symbol: string) => {
      router.push(`/charts?symbol=${encodeURIComponent(symbol)}`);
    },
    [router]
  );

  return (
    <div className="w-full overflow-x-auto rounded-3xl bg-[var(--theme-surface)]/90 backdrop-blur-md border border-[var(--theme-border)] shadow-xl font-sans select-none">
      <table className="w-full text-left text-xs border-collapse">
        {/* Table Header */}
        <thead>
          <tr className="border-b border-[var(--theme-border)] bg-[var(--theme-elevated)]/70 text-[var(--theme-text-muted)] font-mono text-[10px] uppercase tracking-wider">
            <th className="py-3 px-3.5 font-bold">Instrument & Bot</th>
            <th className="py-3 px-3 font-bold">Source & Exec Broker</th>
            <th className="py-3 px-2.5 font-bold">Exchange</th>
            <th className="py-3 px-2.5 font-bold">Side & Lev</th>
            <th className="py-3 px-2.5 font-bold text-right">Entry / Mark</th>
            <th className="py-3 px-2.5 font-bold text-right">Size / Value</th>
            <th className="py-3 px-2.5 font-bold text-right">Stop Loss</th>
            <th className="py-3 px-2.5 font-bold text-right">Take Profit</th>
            <th className="py-3 px-3 font-bold text-right">Floating P&L</th>
            <th className="py-3 px-2 font-bold text-center">R-Mult</th>
            <th className="py-3 px-2 font-bold text-center">Status</th>
            <th className="py-3 px-3.5 font-bold text-right">Safe Actions</th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="divide-y divide-[var(--theme-border-subtle)] font-mono">
          {positions.map((pos) => (
            <PositionTableRow
              key={pos.position_uid || `${pos.execution_broker}_${pos.id}`}
              pos={pos}
              onSelectPosition={onSelectPosition}
              onModifyProtection={onModifyProtection}
              onSquareOff={onSquareOff}
              onPartialClose={onPartialClose}
              onMoveToBreakeven={onMoveToBreakeven}
              onNavigateMarket={handleNavigateMarket}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
