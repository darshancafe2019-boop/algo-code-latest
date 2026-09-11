"use client";

import React, { useState, useMemo, useRef, useEffect, memo } from "react";
import {
  Star,
  LineChart,
  Activity,
  Layers,
  Zap,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Settings,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { InstrumentMasterRecord, MarketTick } from "@/lib/market-data/types";
import { useSelectiveTick } from "@/lib/market-data";
import { marketState } from "@/lib/market-data/market-state";

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  minWidth: number;
}

export const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: "fav", label: "★", visible: true, minWidth: 40 },
  { id: "symbol", label: "Instrument", visible: true, minWidth: 150 },
  { id: "asset", label: "Asset", visible: true, minWidth: 80 },
  { id: "ltp", label: "LTP", visible: true, minWidth: 100 },
  { id: "changePct", label: "24h / Chg %", visible: true, minWidth: 95 },
  { id: "volume", label: "Volume", visible: true, minWidth: 95 },
  { id: "oi", label: "Open Interest", visible: true, minWidth: 100 },
  { id: "oiChange", label: "OI Chg", visible: false, minWidth: 85 },
  { id: "bid", label: "Bid", visible: true, minWidth: 85 },
  { id: "ask", label: "Ask", visible: true, minWidth: 85 },
  { id: "spread", label: "Spread", visible: false, minWidth: 75 },
  { id: "vwap", label: "VWAP", visible: false, minWidth: 85 },
  { id: "status", label: "Status", visible: true, minWidth: 80 },
  { id: "actions", label: "Quick Actions", visible: true, minWidth: 130 },
];

interface VirtualizedMarketTableProps {
  instruments: InstrumentMasterRecord[];
  selectedSymbol: string | null;
  onSelectInstrument: (inst: InstrumentMasterRecord) => void;
  watchlistSymbols: Set<string>;
  onToggleWatchlist: (symbol: string) => void;
  onOpenChart: (symbol: string) => void;
  onOpenAnalysis: (symbol: string) => void;
  onOpenOptions: (symbol: string) => void;
  onOpenTrade: (symbol: string) => void;
}

const ROW_HEIGHT = 42;
const OVERSCAN = 10;

/**
 * Highly optimized, memoized single row component.
 * Uses selective tick subscriptions to prevent parent table re-renders on every price change.
 */
const MarketTableRow = memo(function MarketTableRow({
  instrument,
  isSelected,
  isFavorite,
  columns,
  onSelect,
  onToggleWatchlist,
  onOpenChart,
  onOpenAnalysis,
  onOpenOptions,
  onOpenTrade,
}: {
  instrument: InstrumentMasterRecord;
  isSelected: boolean;
  isFavorite: boolean;
  columns: ColumnConfig[];
  onSelect: () => void;
  onToggleWatchlist: () => void;
  onOpenChart: () => void;
  onOpenAnalysis: () => void;
  onOpenOptions: () => void;
  onOpenTrade: () => void;
}) {
  const liveTick = useSelectiveTick(instrument.symbol);
  const quote = useMemo(() => marketState.getQuote(instrument.symbol), [instrument.symbol]);

  const ltp = liveTick?.ltp ?? quote?.last_price ?? null;
  const changePct = liveTick?.changePct ?? quote?.change_pct ?? null;
  const volume = liveTick?.volume ?? quote?.volume ?? null;
  const oi = liveTick?.openInterest ?? quote?.open_interest ?? null;
  const oiChange = liveTick?.oiChange ?? null;
  const bid = liveTick?.bid ?? quote?.bid ?? null;
  const ask = liveTick?.ask ?? quote?.ask ?? null;
  const vwap = quote?.vwap ?? null;

  const spread = bid !== null && ask !== null && ask >= bid ? Number((ask - bid).toFixed(2)) : null;

  const isPositive = changePct !== null && changePct > 0;
  const isNegative = changePct !== null && changePct < 0;

  const formatPrice = (val: number | null) => {
    if (val === null || val === undefined) return "—";
    if (val === 0) return "—";
    return val >= 1000
      ? val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : val.toFixed(2);
  };

  const formatVolume = (val: number | null) => {
    if (val === null || val === undefined || val === 0) return "—";
    if (val >= 10_000_000) return `${(val / 10_000_000).toFixed(2)} Cr`;
    if (val >= 100_000) return `${(val / 100_000).toFixed(2)} L`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(1)} K`;
    return val.toString();
  };

  return (
    <div
      onClick={onSelect}
      className={`group flex items-center border-b border-slate-900/80 px-3 cursor-pointer select-none transition-colors font-mono text-xs ${
        isSelected
          ? "bg-emerald-950/20 border-l-2 border-l-emerald-400 bg-slate-900/60"
          : "hover:bg-slate-900/40"
      }`}
      style={{ height: `${ROW_HEIGHT}px` }}
    >
      {/* 1. Favorite Star */}
      <div className="w-8 flex items-center justify-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleWatchlist();
          }}
          className="text-slate-600 hover:text-amber-400 transition-colors p-1"
        >
          <Star
            className={`h-3.5 w-3.5 ${
              isFavorite ? "fill-amber-400 text-amber-400" : ""
            }`}
          />
        </button>
      </div>

      {/* 2. Instrument / Symbol */}
      <div className="w-[160px] min-w-[160px] flex flex-col justify-center pr-2">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-100 group-hover:text-emerald-300 truncate">
            {instrument.symbol}
          </span>
          <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
            {instrument.exchange}
          </span>
        </div>
        <div className="text-[10px] text-slate-500 truncate">
          {instrument.tradingSymbol || instrument.underlying || instrument.symbol}
        </div>
      </div>

      {/* 3. Asset Type */}
      <div className="w-[85px] text-slate-400 text-[11px] uppercase">
        {instrument.instrumentType}
      </div>

      {/* 4. LTP */}
      <div className="w-[110px] font-bold text-right pr-3 tabular-nums">
        <span
          className={
            isPositive
              ? "text-emerald-400"
              : isNegative
              ? "text-rose-400"
              : "text-slate-200"
          }
        >
          {ltp !== null && ltp > 0 ? `₹${formatPrice(ltp)}` : "—"}
        </span>
      </div>

      {/* 5. Change % */}
      <div className="w-[100px] text-right pr-3 tabular-nums font-semibold">
        {changePct !== null ? (
          <span
            className={`inline-flex items-center gap-0.5 ${
              isPositive
                ? "text-emerald-400"
                : isNegative
                ? "text-rose-400"
                : "text-slate-400"
            }`}
          >
            {isPositive ? "+" : ""}
            {changePct.toFixed(2)}%
          </span>
        ) : (
          <span className="text-slate-600">—</span>
        )}
      </div>

      {/* 6. Volume */}
      <div className="w-[100px] text-right pr-3 text-slate-300 tabular-nums">
        {formatVolume(volume)}
      </div>

      {/* 7. Open Interest */}
      <div className="w-[105px] text-right pr-3 text-slate-400 tabular-nums">
        {oi !== null && oi > 0 ? formatVolume(oi) : "—"}
      </div>

      {/* 8. Bid */}
      <div className="w-[90px] text-right pr-2 text-emerald-400/80 tabular-nums">
        {bid !== null && bid > 0 ? formatPrice(bid) : "—"}
      </div>

      {/* 9. Ask */}
      <div className="w-[90px] text-right pr-3 text-rose-400/80 tabular-nums">
        {ask !== null && ask > 0 ? formatPrice(ask) : "—"}
      </div>

      {/* 10. Status */}
      <div className="w-[85px] flex items-center justify-center">
        {ltp !== null && ltp > 0 ? (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            LIVE
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-500 border border-slate-800">
            IDLE
          </span>
        )}
      </div>

      {/* 11. Quick Row Action Buttons */}
      <div className="flex-1 flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenChart();
          }}
          className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40 transition-all"
          title="Open Chart"
        >
          <LineChart className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenAnalysis();
          }}
          className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-300 hover:border-amber-500/40 transition-all"
          title="Deep Technical Analysis"
        >
          <Activity className="h-3.5 w-3.5" />
        </button>
        {(instrument.instrumentType === "INDEX" || instrument.instrumentType === "EQUITY") && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenOptions();
            }}
            className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-indigo-300 hover:border-indigo-500/40 transition-all"
            title="Options Chain"
          >
            <Layers className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenTrade();
          }}
          className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 font-bold transition-all text-[11px]"
          title="One-Click Trade Ticket"
        >
          TRADE
        </button>
      </div>
    </div>
  );
});

export function VirtualizedMarketTable({
  instruments,
  selectedSymbol,
  onSelectInstrument,
  watchlistSymbols,
  onToggleWatchlist,
  onOpenChart,
  onOpenAnalysis,
  onOpenOptions,
  onOpenTrade,
}: VirtualizedMarketTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  const [sortField, setSortField] = useState<string>("symbol");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Track container height on resize
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // Sorting
  const sortedInstruments = useMemo(() => {
    return [...instruments].sort((a, b) => {
      if (sortField === "symbol") {
        return sortOrder === "asc"
          ? a.symbol.localeCompare(b.symbol)
          : b.symbol.localeCompare(a.symbol);
      }
      return 0;
    });
  }, [instruments, sortField, sortOrder]);

  const totalRows = sortedInstruments.length;
  const totalHeight = totalRows * ROW_HEIGHT;

  // Window calculation
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    totalRows - 1,
    Math.floor((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN
  );

  const visibleRows = useMemo(() => {
    const rows = [];
    for (let i = startIndex; i <= endIndex; i++) {
      if (sortedInstruments[i]) {
        rows.push({
          index: i,
          instrument: sortedInstruments[i],
          top: i * ROW_HEIGHT,
        });
      }
    }
    return rows;
  }, [startIndex, endIndex, sortedInstruments]);

  return (
    <div className="flex flex-col flex-1 h-full bg-slate-950 overflow-hidden select-none">
      {/* Table Header */}
      <div className="flex items-center bg-slate-900/90 border-b border-slate-800 px-3 py-2 text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400">
        <div className="w-8 flex items-center justify-center">★</div>
        <div className="w-[160px] min-w-[160px] flex items-center gap-1 cursor-pointer hover:text-slate-200">
          <span>Instrument</span>
        </div>
        <div className="w-[85px]">Asset</div>
        <div className="w-[110px] text-right pr-3">LTP</div>
        <div className="w-[100px] text-right pr-3">24h / Chg%</div>
        <div className="w-[100px] text-right pr-3">Volume</div>
        <div className="w-[105px] text-right pr-3">Open Interest</div>
        <div className="w-[90px] text-right pr-2 text-emerald-400">Bid</div>
        <div className="w-[90px] text-right pr-3 text-rose-400">Ask</div>
        <div className="w-[85px] text-center">Feed</div>
        <div className="flex-1 text-right">Actions</div>
      </div>

      {/* Virtual Scroll Viewport */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto relative divide-y divide-slate-900/50"
        style={{ willChange: "transform" }}
      >
        <div style={{ height: `${totalHeight}px`, position: "relative" }}>
          {visibleRows.map(({ index, instrument, top }) => (
            <div
              key={`${instrument.exchange}:${instrument.symbol}`}
              style={{
                position: "absolute",
                top: `${top}px`,
                left: 0,
                right: 0,
                height: `${ROW_HEIGHT}px`,
              }}
            >
              <MarketTableRow
                instrument={instrument}
                isSelected={selectedSymbol === instrument.symbol}
                isFavorite={watchlistSymbols.has(instrument.symbol)}
                columns={DEFAULT_COLUMNS}
                onSelect={() => onSelectInstrument(instrument)}
                onToggleWatchlist={() => onToggleWatchlist(instrument.symbol)}
                onOpenChart={() => onOpenChart(instrument.symbol)}
                onOpenAnalysis={() => onOpenAnalysis(instrument.symbol)}
                onOpenOptions={() => onOpenOptions(instrument.symbol)}
                onOpenTrade={() => onOpenTrade(instrument.symbol)}
              />
            </div>
          ))}
        </div>

        {instruments.length === 0 && (
          <div className="p-12 text-center text-slate-500 font-mono text-xs">
            No instruments found matching your criteria.
          </div>
        )}
      </div>

      {/* Footer / Summary Count */}
      <div className="flex items-center justify-between border-t border-slate-900 bg-slate-950 px-3 py-1.5 text-[11px] font-mono text-slate-500">
        <div>
          Universe: <span className="text-slate-300 font-bold">{instruments.length}</span> instruments
        </div>
        <div className="flex items-center gap-3">
          <span>Virtual Window: {visibleRows.length} active DOM nodes</span>
          <span className="text-emerald-400 font-semibold">Low CPU Mode</span>
        </div>
      </div>
    </div>
  );
}
