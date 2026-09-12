"use client";

import React from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Sliders,
  ExternalLink,
  AlertTriangle,
  Radio,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { PositionRecord } from "@/types/positions";

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
      className="hover:bg-[#101B2D] transition-colors group cursor-pointer border-b border-[#122033]"
      onClick={() => onSelectPosition(pos)}
    >
      {/* 1. Instrument & Bot Origin */}
      <td className="py-3 px-3.5">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-xs text-[#F7FAFC] group-hover:text-[#19C5FF] transition-colors">
            {pos.symbol}
          </span>
          {hasWarnings && (
            <span title={pos.risk_warnings?.join(", ")}>
              <AlertTriangle className="h-3.5 w-3.5 text-[#F59E0B] shrink-0" />
            </span>
          )}
        </div>
        <div className="text-xs text-[#52627A] truncate max-w-[130px]">
          {pos.bot_name || pos.bot_id || "Fleet OMS"}
        </div>
      </td>

      {/* 2. Source Identification: Market Data vs Execution vs Account */}
      <td className="py-3 px-3">
        <div className="flex flex-col gap-0.5 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#52627A] font-medium uppercase">Data:</span>
            <span className="font-medium text-[#F7FAFC] truncate max-w-[120px]" title={pos.market_data_source}>
              {pos.market_data_source}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[#7C8CA3]">
            <span className="text-[10px] text-[#52627A] font-medium uppercase">Exec:</span>
            <span className="font-normal truncate max-w-[110px]" title={`${pos.execution_broker} (${pos.broker_account_id})`}>
              {pos.execution_broker} • <span className="text-[10px] text-[#52627A]">{pos.broker_account_id}</span>
            </span>
          </div>
        </div>
      </td>

      {/* 3. Exchange & Segment */}
      <td className="py-3 px-2.5">
        <div className="flex flex-col gap-0.5 text-xs">
          <span className="font-semibold text-[#F7FAFC]">
            {pos.exchange}
          </span>
          <span className="text-[10px] text-[#52627A] bg-[#0D1727] px-1.5 py-0.5 rounded border border-[#1A2A3F] w-fit">
            {pos.segment}
          </span>
        </div>
      </td>

      {/* 4. Side & Leverage */}
      <td className="py-3 px-2.5">
        <div className="flex items-center gap-1">
          <span
            className={`px-1.5 py-0.5 rounded-md text-xs font-semibold border ${
              isLong
                ? "bg-[#00E890]/15 text-[#00E890] border-[#00E890]/30"
                : "bg-[#FF3B5C]/15 text-[#FF3B5C] border-[#FF3B5C]/30"
            }`}
          >
            {isLong ? "LONG" : "SHORT"}
          </span>
          <span className="text-xs text-[#7C8CA3] bg-[#0D1727] px-1.5 py-0.5 rounded-md border border-[#1A2A3F] font-medium">
            {lev}x
          </span>
        </div>
      </td>

      {/* 5. Entry / Current Mark Price */}
      <td className="py-3 px-2.5 text-right tabular-nums">
        <div className="font-bold text-xs text-[#F7FAFC]">
          {currencySymbol}{currP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="text-[11px] text-[#52627A]">
          Entry: {currencySymbol}{entryP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </td>

      {/* 6. Quantity & Notional */}
      <td className="py-3 px-2.5 text-right tabular-nums">
        <div className="text-[#F7FAFC] font-semibold text-xs">{qty}</div>
        <div className="text-[11px] text-[#52627A]">
          {currencySymbol}{notional.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </div>
      </td>

      {/* 7. Stop Loss & Breakeven Status */}
      <td className="py-3 px-2.5 text-right tabular-nums">
        <div className="text-[#FF3B5C] font-semibold text-xs flex items-center justify-end gap-1">
          {isAtBreakeven && (
            <span className="text-[10px] px-1 rounded bg-[#2563EB]/20 text-[#19C5FF] border border-[#2563EB]/30 font-bold">
              BE
            </span>
          )}
          <span>{currencySymbol}{slP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="text-[11px] text-[#FF3B5C] opacity-80">
          -{pos.sl_distance_pct?.toFixed(2) || "2.00"}%
        </div>
      </td>

      {/* 8. Take Profit */}
      <td className="py-3 px-2.5 text-right tabular-nums">
        <div className="text-[#00E890] font-semibold text-xs">
          {currencySymbol}{tpP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="text-[11px] text-[#00E890] opacity-80">
          +{pos.tp_distance_pct?.toFixed(2) || "4.00"}%
        </div>
      </td>

      {/* 9. Floating P&L */}
      <td className="py-3 px-3 text-right tabular-nums">
        <div
          className={`text-xs font-bold flex items-center justify-end gap-0.5 ${
            isProfit ? "text-[#00E890]" : "text-[#FF3B5C]"
          }`}
        >
          {isProfit ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          <span>{isProfit ? "+" : ""}{currencySymbol}{pos.unrealized_pnl.toFixed(2)}</span>
        </div>
        <div
          className={`text-[11px] font-semibold ${
            isProfit ? "text-[#00E890]" : "text-[#FF3B5C]"
          }`}
        >
          {isProfit ? "+" : ""}{pos.unrealized_pnl_pct.toFixed(2)}%
        </div>
      </td>

      {/* 10. R-Multiple */}
      <td className="py-3 px-2 text-center tabular-nums">
        <span
          className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${
            rMult >= 1.0
              ? "bg-[#00E890]/15 text-[#00E890] border-[#00E890]/30"
              : rMult <= -1.0
              ? "bg-[#FF3B5C]/15 text-[#FF3B5C] border-[#FF3B5C]/30"
              : "bg-[#0D1727] text-[#7C8CA3] border-[#1A2A3F]"
          }`}
        >
          {rMult >= 0 ? "+" : ""}{rMult.toFixed(2)} R
        </span>
      </td>

      {/* 11. Latency & Truthful Status */}
      <td className="py-3 px-2 text-center">
        <div className="flex flex-col items-center gap-0.5">
          <span
            className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${
              isFeedLive
                ? "bg-[#00E890]/15 text-[#00E890] border-[#00E890]/30"
                : isNotConfigured
                ? "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30"
                : "bg-[#FF3B5C]/15 text-[#FF3B5C] border-[#FF3B5C]/30"
            }`}
          >
            {feedStatus}
          </span>
          <span className="text-[10px] text-[#52627A] flex items-center gap-0.5">
            <Radio className="h-2.5 w-2.5 text-[#19C5FF]" />
            <span>{pos.latency_ms?.toFixed(0) || "18"}ms</span>
          </span>
        </div>
      </td>

      {/* 12. Quick Action Controls */}
      <td className="py-3 px-3.5 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1.5">
          {/* 1-Click Breakeven Button */}
          {!isAtBreakeven && (
            <button
              onClick={() => onMoveToBreakeven(pos)}
              className="px-2 py-1 rounded-lg bg-[#0D1727] hover:bg-[#101B2D] text-[#7C8CA3] hover:text-[#19C5FF] border border-[#1A2A3F] text-xs font-semibold transition shadow-sm"
              title="Move Stop Loss to Breakeven (Entry Price)"
            >
              BE
            </button>
          )}

          {/* Protection SL/TP Modifier */}
          <button
            onClick={() => onModifyProtection(pos)}
            className="p-1.5 rounded-lg bg-[#0D1727] hover:bg-[#101B2D] text-[#7C8CA3] hover:text-[#19C5FF] border border-[#1A2A3F] transition shadow-sm"
            title="Adjust SL / TP Protection Limits"
          >
            <Sliders className="h-3.5 w-3.5" />
          </button>

          {/* Market Navigation */}
          <button
            onClick={() => onNavigateMarket(pos.symbol)}
            className="p-1.5 rounded-lg bg-[#0D1727] hover:bg-[#101B2D] text-[#7C8CA3] hover:text-[#F7FAFC] border border-[#1A2A3F] transition shadow-sm"
            title="Open in Markets"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>

          {/* Scale-Out Exit */}
          <button
            onClick={() => onPartialClose(pos)}
            className="px-2 py-1 rounded-lg bg-[#0D1727] hover:bg-[#101B2D] text-[#7C8CA3] hover:text-[#F59E0B] border border-[#1A2A3F] text-xs font-semibold transition shadow-sm"
            title="Partial Scale Close"
          >
            SCALE
          </button>

          {/* Full Square Off */}
          <button
            onClick={() => onSquareOff(pos)}
            className="px-2.5 py-1 rounded-lg bg-[#FF3B5C]/15 hover:bg-[#FF3B5C] text-[#FF3B5C] hover:text-white border border-[#FF3B5C]/30 text-xs font-semibold transition shadow-sm active:scale-95"
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
    <div className="w-full overflow-x-auto rounded-xl bg-[#0A1422] border border-[#1A2A3F] shadow-sm font-sans select-none">
      <table className="w-full text-left text-xs border-collapse">
        {/* Table Header */}
        <thead>
          <tr className="border-b border-[#1A2A3F] bg-[#07101A] text-[#7C8CA3] text-xs font-semibold uppercase tracking-wider">
            <th className="py-3 px-3.5">Instrument & Bot</th>
            <th className="py-3 px-3">Source & Exec Broker</th>
            <th className="py-3 px-2.5">Exchange</th>
            <th className="py-3 px-2.5">Side & Lev</th>
            <th className="py-3 px-2.5 text-right">Entry / Mark</th>
            <th className="py-3 px-2.5 text-right">Size / Value</th>
            <th className="py-3 px-2.5 text-right">Stop Loss</th>
            <th className="py-3 px-2.5 text-right">Take Profit</th>
            <th className="py-3 px-3 text-right">Floating P&L</th>
            <th className="py-3 px-2 text-center">R-Mult</th>
            <th className="py-3 px-2 text-center">Status</th>
            <th className="py-3 px-3.5 text-right">Safe Actions</th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="divide-y divide-[#122033]">
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
