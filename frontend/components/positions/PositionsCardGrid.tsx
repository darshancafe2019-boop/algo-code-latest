"use client";

import React from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Target,
  Sliders,
  ExternalLink,
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

  return (
    <div
      onClick={() => onSelectPosition(pos)}
      className="p-4 sm:p-5 rounded-xl bg-[#0A1422] border border-[#1A2A3F] hover:border-[#29415F] transition-all shadow-sm flex flex-col justify-between space-y-4 cursor-pointer group"
    >
      {/* Top Source Identification Strip */}
      <div className="flex items-center justify-between text-xs border-b border-[#122033] pb-2 flex-wrap gap-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[#52627A] uppercase text-[10px] font-medium">Data:</span>
          <span className="font-medium text-[#F7FAFC]">{pos.market_data_source}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[#52627A] uppercase text-[10px] font-medium">Exec:</span>
          <span className="text-[#7C8CA3]">{pos.execution_broker} • {pos.broker_account_id}</span>
        </div>
      </div>

      {/* Symbol, Side, Exchange & Floating P&L */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-[#F7FAFC] group-hover:text-[#19C5FF] transition-colors">
              {pos.symbol}
            </span>
            <span
              className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${
                isLong
                  ? "bg-[#00E890]/15 text-[#00E890] border-[#00E890]/30"
                  : "bg-[#FF3B5C]/15 text-[#FF3B5C] border-[#FF3B5C]/30"
              }`}
            >
              {isLong ? "LONG" : "SHORT"} {lev}x
            </span>
            <span className="text-[10px] text-[#52627A] bg-[#0D1727] px-1.5 py-0.5 rounded-md border border-[#1A2A3F] font-medium">
              {pos.exchange} • {pos.segment}
            </span>
          </div>
          <div className="text-xs text-[#52627A] mt-0.5">
            {pos.bot_name || pos.bot_id || "Fleet Bot"} • {pos.strategy || "Strategy Engine"}
          </div>
        </div>

        <div className="text-right tabular-nums">
          <div
            className={`text-lg font-bold flex items-center justify-end gap-0.5 ${
              isProfit ? "text-[#00E890]" : "text-[#FF3B5C]"
            }`}
          >
            {isProfit ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
            <span>{isProfit ? "+" : ""}{currencySymbol}{pos.unrealized_pnl.toFixed(2)}</span>
          </div>
          <div
            className={`text-xs font-semibold ${
              isProfit ? "text-[#00E890]" : "text-[#FF3B5C]"
            }`}
          >
            {isProfit ? "+" : ""}{pos.unrealized_pnl_pct.toFixed(2)}% ({rMult >= 0 ? "+" : ""}{rMult.toFixed(2)}R)
          </div>
        </div>
      </div>

      {/* Price Ladder Linear Track Visualizer */}
      <div className="p-3.5 bg-[#0D1727] border border-[#1A2A3F] rounded-xl space-y-2.5 text-xs shadow-inner">
        {/* Relative Track Bar */}
        <div className="relative h-2 w-full bg-[#07101A] rounded-full my-3.5 border border-[#1A2A3F]">
          {/* Stop Loss Level Marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 left-0 w-3 h-3 bg-[#FF3B5C] rounded-full ring-2 ring-[#0A1422] shadow-sm"
            title={`Stop Loss: $${slP.toLocaleString()}`}
          />

          {/* Entry Price Marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-[#52627A] rounded-full ring-2 ring-[#0A1422] shadow-sm"
            style={{ left: `${entryPct}%` }}
            title={`Entry: $${entryP.toLocaleString()}`}
          />

          {/* Current Price Pulsing Indicator */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full ring-2 ring-[#0A1422] transition-all duration-300 ${
              isProfit
                ? "bg-[#00E890] shadow-lg shadow-[#00E890]/40"
                : "bg-[#FF3B5C] shadow-lg shadow-[#FF3B5C]/40"
            }`}
            style={{ left: `calc(${currentPct}% - 7px)` }}
            title={`Current Mark: $${currP.toLocaleString()}`}
          />

          {/* Take Profit Target Marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 right-0 w-3 h-3 bg-[#00E890] rounded-full ring-2 ring-[#0A1422] shadow-sm"
            title={`Take Profit: $${tpP.toLocaleString()}`}
          />
        </div>

        {/* Price Numbers Row */}
        <div className="grid grid-cols-4 gap-1 text-[11px] pt-1">
          <div>
            <span className="text-[#FF3B5C] uppercase flex items-center gap-0.5 font-medium">
              <Shield className="h-3 w-3" /> SL
            </span>
            <span className="text-[#F7FAFC] font-semibold block tabular-nums">
              ${slP.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
          </div>

          <div>
            <span className="text-[#52627A] uppercase font-medium">Entry</span>
            <span className="text-[#F7FAFC] font-semibold block tabular-nums">
              ${entryP.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
          </div>

          <div>
            <span className="text-[#19C5FF] uppercase font-medium">Mark</span>
            <span
              className={`font-semibold block tabular-nums ${
                isProfit ? "text-[#00E890]" : "text-[#FF3B5C]"
              }`}
            >
              ${currP.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[#00E890] uppercase flex items-center justify-end gap-0.5 font-medium">
              <Target className="h-3 w-3" /> TP
            </span>
            <span className="text-[#F7FAFC] font-semibold block tabular-nums">
              ${tpP.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
          </div>
        </div>
      </div>

      {/* Position Metrics Row */}
      <div className="grid grid-cols-3 gap-2 text-xs border-t border-[#122033] pt-3">
        <div>
          <span className="text-[11px] text-[#52627A] block">Position Size</span>
          <span className="font-semibold text-[#F7FAFC] tabular-nums">{qty} units</span>
        </div>
        <div>
          <span className="text-[11px] text-[#52627A] block">Margin Allocated</span>
          <span className="font-semibold text-[#F7FAFC] tabular-nums">
            ${pos.margin_used?.toFixed(2) || "0.00"}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-[#52627A] block">Liquidation Price</span>
          <span className="font-semibold text-[#F59E0B] tabular-nums">
            ${pos.liquidation_price?.toFixed(1) || "—"}
          </span>
        </div>
      </div>

      {/* Bottom Action Controls */}
      <div
        className="flex items-center justify-between gap-2 border-t border-[#122033] pt-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5">
          {!isAtBreakeven && (
            <button
              onClick={() => onMoveToBreakeven(pos)}
              className="px-2.5 py-1.5 rounded-lg bg-[#0D1727] hover:bg-[#101B2D] text-[#7C8CA3] hover:text-[#19C5FF] border border-[#1A2A3F] text-xs font-semibold transition"
              title="Move Stop Loss to Breakeven"
            >
              BE
            </button>
          )}

          <button
            onClick={() => onModifyProtection(pos)}
            className="px-2.5 py-1.5 rounded-lg bg-[#0D1727] hover:bg-[#101B2D] text-[#7C8CA3] hover:text-[#19C5FF] border border-[#1A2A3F] text-xs font-medium flex items-center gap-1.5 transition"
            title="Adjust SL/TP Protection"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Protection</span>
          </button>

          <button
            onClick={() => onNavigateMarket(pos.symbol)}
            className="p-1.5 rounded-lg bg-[#0D1727] hover:bg-[#101B2D] text-[#7C8CA3] hover:text-[#F7FAFC] border border-[#1A2A3F] transition"
            title="Open in Markets"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPartialClose(pos)}
            className="px-2.5 py-1.5 rounded-lg bg-[#0D1727] hover:bg-[#101B2D] text-[#7C8CA3] hover:text-[#F59E0B] border border-[#1A2A3F] text-xs font-semibold transition"
            title="Partial Scale Close"
          >
            SCALE
          </button>

          <button
            onClick={() => onSquareOff(pos)}
            className="px-3 py-1.5 rounded-lg bg-[#FF3B5C]/15 hover:bg-[#FF3B5C] text-[#FF3B5C] hover:text-white border border-[#FF3B5C]/30 text-xs font-semibold transition shadow-sm active:scale-95"
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
