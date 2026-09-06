"use client";

import React from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Target,
  Sliders,
  ExternalLink,
  Flame,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { PositionRecord } from "@/types/positions";

interface PositionsCardGridProps {
  positions: PositionRecord[];
  onSelectPosition: (pos: PositionRecord) => void;
  onModifyProtection: (pos: PositionRecord) => void;
  onSquareOff: (pos: PositionRecord) => void;
  onPartialClose: (pos: PositionRecord) => void;
  onMoveToBreakeven: (pos: PositionRecord) => void;
}

const PositionCardItem = React.memo(function PositionCardItem({
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
  const slP = Number(pos.stop_loss || (isLong ? entryP * 0.98 : entryP * 1.02));
  const tpP = Number(pos.take_profit || (isLong ? entryP * 1.04 : entryP * 0.96));
  const qty = Number(pos.position_size || pos.quantity || 0);
  const lev = pos.leverage || 5;
  const rMult = pos.r_multiple || 0;
  const isAtBreakeven = Math.abs(slP - entryP) < (entryP * 0.001);

  // Linear relative track calculation
  const minP = Math.min(slP, entryP, currP, tpP);
  const maxP = Math.max(slP, entryP, currP, tpP);
  const range = maxP - minP || 1;
  const entryPct = Math.min(100, Math.max(0, ((entryP - minP) / range) * 100));
  const currentPct = Math.min(100, Math.max(0, ((currP - minP) / range) * 100));
  const currencySymbol = pos.currency === "INR" ? "₹" : "$";
  const feedStatus = pos.feed_status || "LIVE";
  const isFeedLive = feedStatus === "LIVE";

  return (
    <div
      onClick={() => onSelectPosition(pos)}
      className="p-4 sm:p-5 rounded-3xl bg-[var(--theme-surface)]/90 backdrop-blur-md border border-[var(--theme-border)] hover:border-[var(--theme-accent)]/50 transition-all shadow-xl flex flex-col justify-between space-y-4 cursor-pointer group"
    >
      {/* Top Source Identification Strip */}
      <div className="flex items-center justify-between text-[10px] font-mono border-b border-[var(--theme-border-subtle)] pb-2 flex-wrap gap-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--theme-text-muted)] uppercase text-[9px]">DATA:</span>
          <span className="font-bold text-[var(--theme-text-primary)]">{pos.market_data_source}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--theme-text-muted)] uppercase text-[9px]">EXEC:</span>
          <span className="text-[var(--theme-text-secondary)]">{pos.execution_broker} • {pos.broker_account_id}</span>
        </div>
      </div>

      {/* Symbol, Side, Exchange & Floating P&L */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold text-[var(--theme-text-primary)] group-hover:text-[var(--theme-accent)] transition-colors font-sans">
              {pos.symbol}
            </span>
            <span
              className={`px-2 py-0.5 rounded-lg text-xs font-mono font-extrabold border ${
                isLong
                  ? "bg-[var(--theme-profit)]/15 text-[var(--theme-profit)] border-[var(--theme-profit)]/30"
                  : "bg-[var(--theme-loss)]/15 text-[var(--theme-loss)] border-[var(--theme-loss)]/30"
              }`}
            >
              {isLong ? "LONG" : "SHORT"} {lev}x
            </span>
            <span className="text-[9px] font-mono text-[var(--theme-text-muted)] bg-[var(--theme-elevated)] px-1.5 py-0.5 rounded border border-[var(--theme-border-subtle)]">
              {pos.exchange} • {pos.segment}
            </span>
          </div>
          <div className="text-xs text-[var(--theme-text-secondary)] mt-0.5 font-sans">
            {pos.bot_name || pos.bot_id || "Fleet Bot"} • {pos.strategy || "Strategy Engine"}
          </div>
        </div>

        <div className="text-right font-mono tabular-nums">
          <div
            className={`text-lg font-black flex items-center justify-end gap-0.5 ${
              isProfit ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"
            }`}
          >
            {isProfit ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
            <span>{isProfit ? "+" : ""}{currencySymbol}{pos.unrealized_pnl.toFixed(2)}</span>
          </div>
          <div
            className={`text-xs font-bold ${
              isProfit ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"
            }`}
          >
            {isProfit ? "+" : ""}{pos.unrealized_pnl_pct.toFixed(2)}% ({rMult >= 0 ? "+" : ""}{rMult.toFixed(2)}R)
          </div>
        </div>
      </div>

      {/* Price Ladder Linear Track Visualizer */}
      <div className="p-3.5 bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] rounded-2xl space-y-2.5 font-mono text-xs shadow-inner">
        {/* Relative Track Bar */}
        <div className="relative h-2 w-full bg-[var(--theme-surface)] rounded-full my-3.5 border border-[var(--theme-border-subtle)]">
          {/* Stop Loss Level Marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 left-0 w-3 h-3 bg-[var(--theme-loss)] rounded-full ring-2 ring-[var(--theme-surface)] shadow-sm"
            title={`Stop Loss: $${slP.toLocaleString()}`}
          />

          {/* Entry Price Marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-[var(--theme-text-muted)] rounded-full ring-2 ring-[var(--theme-surface)] shadow-sm"
            style={{ left: `${entryPct}%` }}
            title={`Entry: $${entryP.toLocaleString()}`}
          />

          {/* Current Price Pulsing Indicator */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full ring-2 ring-[var(--theme-surface)] transition-all duration-300 ${
              isProfit
                ? "bg-[var(--theme-profit)] shadow-lg shadow-[var(--theme-profit)]/60 animate-pulse"
                : "bg-[var(--theme-loss)] shadow-lg shadow-[var(--theme-loss)]/60 animate-pulse"
            }`}
            style={{ left: `calc(${currentPct}% - 8px)` }}
            title={`Current Mark: $${currP.toLocaleString()}`}
          />

          {/* Take Profit Target Marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 right-0 w-3 h-3 bg-[var(--theme-profit)] rounded-full ring-2 ring-[var(--theme-surface)] shadow-sm"
            title={`Take Profit: $${tpP.toLocaleString()}`}
          />
        </div>

        {/* Price Numbers Row */}
        <div className="grid grid-cols-4 gap-1 text-[10px] pt-1">
          <div>
            <span className="text-[var(--theme-loss)] uppercase flex items-center gap-0.5 font-bold">
              <Shield className="h-2.5 w-2.5" /> SL
            </span>
            <span className="text-[var(--theme-text-primary)] font-bold block tabular-nums">
              ${slP.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
          </div>

          <div>
            <span className="text-[var(--theme-text-muted)] uppercase font-semibold">ENTRY</span>
            <span className="text-[var(--theme-text-primary)] font-bold block tabular-nums">
              ${entryP.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
          </div>

          <div>
            <span className="text-[var(--theme-accent)] uppercase font-bold">MARK</span>
            <span
              className={`font-black block tabular-nums ${
                isProfit ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"
              }`}
            >
              ${currP.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[var(--theme-profit)] uppercase flex items-center justify-end gap-0.5 font-bold">
              <Target className="h-2.5 w-2.5" /> TP
            </span>
            <span className="text-[var(--theme-text-primary)] font-bold block tabular-nums">
              ${tpP.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
          </div>
        </div>
      </div>

      {/* Position Metrics Row */}
      <div className="grid grid-cols-3 gap-2 text-xs font-mono border-t border-[var(--theme-border-subtle)] pt-3">
        <div>
          <span className="text-[10px] text-[var(--theme-text-muted)] block">Position Size</span>
          <span className="font-bold text-[var(--theme-text-primary)] tabular-nums">{qty} units</span>
        </div>
        <div>
          <span className="text-[10px] text-[var(--theme-text-muted)] block">Margin Allocated</span>
          <span className="font-bold text-[var(--theme-text-primary)] tabular-nums">
            ${pos.margin_used?.toFixed(2) || "0.00"}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-[var(--theme-text-muted)] block">Liquidation Price</span>
          <span className="font-bold text-[var(--theme-warning)] tabular-nums">
            ${pos.liquidation_price?.toFixed(1) || "—"}
          </span>
        </div>
      </div>

      {/* Bottom Action Controls */}
      <div
        className="flex items-center justify-between gap-2 border-t border-[var(--theme-border-subtle)] pt-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5">
          {!isAtBreakeven && (
            <button
              onClick={() => onMoveToBreakeven(pos)}
              className="px-2.5 py-1.5 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-accent)]/20 text-[var(--theme-text-secondary)] hover:text-[var(--theme-accent)] border border-[var(--theme-border-subtle)] text-xs font-extrabold transition"
              title="Move Stop Loss to Breakeven"
            >
              BE
            </button>
          )}

          <button
            onClick={() => onModifyProtection(pos)}
            className="px-2.5 py-1.5 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-accent)] border border-[var(--theme-border-subtle)] text-xs font-bold flex items-center gap-1.5 transition"
            title="Adjust SL/TP Protection"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>PROTECTION</span>
          </button>

          <button
            onClick={() => onNavigateMarket(pos.symbol)}
            className="p-1.5 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] border border-[var(--theme-border-subtle)] transition"
            title="Open in Markets"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPartialClose(pos)}
            className="px-2.5 py-1.5 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-warning)]/20 text-[var(--theme-text-secondary)] hover:text-[var(--theme-warning)] border border-[var(--theme-border-subtle)] text-xs font-extrabold transition"
            title="Partial Scale Close"
          >
            SCALE
          </button>

          <button
            onClick={() => onSquareOff(pos)}
            className="px-3 py-1.5 rounded-xl bg-[var(--theme-loss)]/15 hover:bg-[var(--theme-loss)] text-[var(--theme-loss)] hover:text-white border border-[var(--theme-loss)]/30 text-xs font-extrabold font-mono transition shadow-sm active:scale-95"
            title="Full Market Square Off"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
});

export function PositionsCardGrid({
  positions,
  onSelectPosition,
  onModifyProtection,
  onSquareOff,
  onPartialClose,
  onMoveToBreakeven,
}: PositionsCardGridProps) {
  const router = useRouter();

  const handleNavigateMarket = React.useCallback(
    (symbol: string) => {
      router.push(`/charts?symbol=${encodeURIComponent(symbol)}`);
    },
    [router]
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans select-none">
      {positions.map((pos) => (
        <PositionCardItem
          key={pos.id}
          pos={pos}
          onSelectPosition={onSelectPosition}
          onModifyProtection={onModifyProtection}
          onSquareOff={onSquareOff}
          onPartialClose={onPartialClose}
          onMoveToBreakeven={onMoveToBreakeven}
          onNavigateMarket={handleNavigateMarket}
        />
      ))}
    </div>
  );
}
