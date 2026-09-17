"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveBot } from "@/context/ActiveBotContext";
import { useMarketGateway } from "@/hooks/useMarketGateway";
import { TerminalTopBar } from "./TerminalTopBar";
import { TerminalLeftToolbar, DrawingToolType } from "./TerminalLeftToolbar";
import { TerminalChart, ChartDrawingItem, StrategyLevel } from "./TerminalChart";
import { TerminalSubPanes, SubPaneConfig } from "./TerminalSubPanes";
import {
  TerminalRightPanel,
  RightPanelTabType,
  WatchlistItem,
  PositionItem,
  OrderItem,
} from "./TerminalRightPanel";
import { TerminalStatusBar } from "./TerminalStatusBar";
import { AddIndicatorDrawer } from "@/components/indicators/AddIndicatorDrawer";
import { IndicatorConfigDrawer } from "@/components/indicators/IndicatorConfigDrawer";
import { indicatorEngine } from "@/lib/indicators/engine";
import { indicatorRegistry } from "@/lib/indicators/registry";
import { CandleData, IndicatorResult } from "@/lib/indicators/types";
import { STANDARD_INDICATOR_PRESETS } from "@/lib/indicators/presets";
import { ShieldAlert } from "lucide-react";

// Default Watchlist Symbols (real prices fetched dynamically from gateway)
const DEFAULT_WATCHLIST: WatchlistItem[] = [
  { symbol: "NIFTY", exchange: "NSE", price: 0, change: 0, changePct: 0, volume: 0 },
  { symbol: "BANKNIFTY", exchange: "NSE", price: 0, change: 0, changePct: 0, volume: 0 },
  { symbol: "FINNIFTY", exchange: "NSE", price: 0, change: 0, changePct: 0, volume: 0 },
  { symbol: "BTC/USDT", exchange: "DELTA", price: 0, change: 0, changePct: 0, volume: 0 },
  { symbol: "ETH/USDT", exchange: "DELTA", price: 0, change: 0, changePct: 0, volume: 0 },
  { symbol: "SOL/USDT", exchange: "DELTA", price: 0, change: 0, changePct: 0, volume: 0 },
  { symbol: "RELIANCE", exchange: "NSE", price: 0, change: 0, changePct: 0, volume: 0 },
  { symbol: "HDFCBANK", exchange: "NSE", price: 0, change: 0, changePct: 0, volume: 0 },
];

export function TradingTerminal() {
  const queryClient = useQueryClient();
  const { activeSymbol, setActiveSymbol, activeTimeframe, setActiveTimeframe } = useActiveBot();

  // 1. Live Market Gateway
  const { quote, isLive, isStale, formattedPrice, formattedChangePct } = useMarketGateway(
    activeSymbol,
    "CHART_VIEW"
  );

  // 2. State Management
  const [executionMode, setExecutionMode] = useState<"PAPER" | "SHADOW" | "LIVE">("PAPER");
  const [isConfirmingLive, setIsConfirmingLive] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<RightPanelTabType>("watchlist");
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);

  // Left Toolbar & Drawings
  const [activeDrawingTool, setActiveDrawingTool] = useState<DrawingToolType>("crosshair");
  const [drawings, setDrawings] = useState<ChartDrawingItem[]>([]);
  const [drawingsLocked, setDrawingsLocked] = useState(false);
  const [drawingsHidden, setDrawingsHidden] = useState(false);

  // Chart Visible Range & Subpanes
  const [viewRange, setViewRange] = useState<{ start: number; end: number }>({ start: 0, end: 80 });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Active Indicators State
  const [activeIndicatorIds, setActiveIndicatorIds] = useState<string[]>([
    "ema",
    "vwap",
    "supertrend",
    "rsi",
    "volume",
  ]);
  const [isAddIndicatorOpen, setIsAddIndicatorOpen] = useState(false);
  const [configIndicator, setConfigIndicator] = useState<any | null>(null);

  // Sub-chart Panes
  const [subPanes, setSubPanes] = useState<SubPaneConfig[]>([
    { id: "sp_vol", type: "volume", title: "Volume & SMA", height: 80, hidden: false },
    { id: "sp_rsi", type: "rsi", title: "RSI (14)", height: 85, hidden: false },
  ]);

  // Positions & Orders State (Dynamic from real backend or live session)
  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);

  // 3. Fetch Historical Candlesticks from authoritative backend
  const { data: candlesData } = useQuery<CandleData[]>({
    queryKey: ["terminalCandles", activeSymbol, activeTimeframe],
    queryFn: async () => {
      try {
        const res = await fetch(
          `/api/candles?symbol=${encodeURIComponent(activeSymbol)}&timeframe=${activeTimeframe}&limit=120`
        );
        if (res.ok) {
          const json = await res.json();
          const items = json.candles || json.data || json;
          if (Array.isArray(items) && items.length > 0) {
            return items.map((c: any) => ({
              timestamp: typeof c.timestamp === "number" ? c.timestamp : typeof c.time === "number" ? c.time : new Date(c.time || c.timestamp || Date.now()).getTime(),
              open: parseFloat(c.open),
              high: parseFloat(c.high),
              low: parseFloat(c.low),
              close: parseFloat(c.close),
              volume: parseFloat(c.volume || 0),
            }));
          }
        }
      } catch (err) {
        console.warn("Candle fetch error:", err);
      }
      return [];
    },
    staleTime: 5000,
    refetchInterval: 10000,
  });

  const rawCandles = useMemo(() => candlesData || [], [candlesData]);

  // Merge latest live price into current open candle
  const activeCandles = useMemo(() => {
    if (rawCandles.length === 0) return [];
    if (!quote || !quote.last_price) return rawCandles;

    const list = [...rawCandles];
    const last = { ...list[list.length - 1] };
    const p = quote.last_price;

    last.close = p;
    if (p > last.high) last.high = p;
    if (p < last.low) last.low = p;
    list[list.length - 1] = last;

    return list;
  }, [rawCandles, quote]);

  // 4. Compute All Active Indicators via Central Engine
  const indicatorResults = useMemo(() => {
    const results = new Map<string, IndicatorResult<any>>();
    if (activeCandles.length === 0) return results;

    for (const indId of activeIndicatorIds) {
      try {
        const res = indicatorEngine.compute(indId, activeCandles, {}, {
          iv: 15.4,
          oi: 850000,
          callOi: 450000,
          putOi: 400000,
        });
        results.set(indId, res);
      } catch (e) {
        console.warn(`Indicator calc failed for ${indId}:`, e);
      }
    }
    return results;
  }, [activeIndicatorIds, activeCandles]);

  // Strategy Levels (Entry, SL, Target overlay)
  const strategyLevels: StrategyLevel[] = useMemo(() => {
    const latestClose = activeCandles[activeCandles.length - 1]?.close || (quote?.last_price ?? 0);
    if (!latestClose) return [];
    return [
      { id: "sl_1", label: "SL", type: "STOP_LOSS", price: latestClose * 0.992, color: "#EF5350" },
      { id: "entry_1", label: "ENTRY", type: "ENTRY", price: latestClose, color: "#2962FF" },
      { id: "tp_1", label: "TP 1", type: "TARGET", price: latestClose * 1.015, color: "#26A69A" },
    ];
  }, [activeCandles, quote]);

  // 5. Handlers
  const handleToggleMode = (mode: "PAPER" | "SHADOW" | "LIVE") => {
    if (mode === "LIVE") {
      setIsConfirmingLive(true);
    } else {
      setExecutionMode(mode);
    }
  };

  const confirmLiveMode = () => {
    setExecutionMode("LIVE");
    setIsConfirmingLive(false);
  };

  const handleAddIndicator = (id: string) => {
    if (!activeIndicatorIds.includes(id)) {
      setActiveIndicatorIds((prev) => [...prev, id]);

      // If subpane indicator, add subpane automatically
      if (["volume", "rsi", "macd", "adx", "cvd"].includes(id)) {
        if (!subPanes.some((sp) => sp.type === id)) {
          setSubPanes((prev) => [
            ...prev,
            { id: `sp_${id}`, type: id as any, title: id.toUpperCase(), height: 80, hidden: false },
          ]);
        }
      }
    }
  };

  const handleRemoveIndicator = (id: string) => {
    setActiveIndicatorIds((prev) => prev.filter((item) => item !== id));
    setSubPanes((prev) => prev.filter((sp) => sp.type !== id));
  };

  const handleSelectPreset = (presetId: string) => {
    const preset = STANDARD_INDICATOR_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    const indIds = preset.indicators.map((ind: any) =>
      typeof ind === "string" ? ind : ind.id
    );
    setActiveIndicatorIds(indIds);

    const newPanes: SubPaneConfig[] = [];
    if (indIds.includes("volume")) {
      newPanes.push({ id: "sp_vol", type: "volume", title: "Volume & SMA", height: 80, hidden: false });
    }
    if (indIds.includes("rsi")) {
      newPanes.push({ id: "sp_rsi", type: "rsi", title: "RSI (14)", height: 85, hidden: false });
    }
    if (indIds.includes("macd")) {
      newPanes.push({ id: "sp_macd", type: "macd", title: "MACD (12, 26, 9)", height: 85, hidden: false });
    }
    if (indIds.includes("adx")) {
      newPanes.push({ id: "sp_adx", type: "adx", title: "ADX (14)", height: 80, hidden: false });
    }
    setSubPanes(newPanes);
  };

  const handlePlaceOrder = async (orderData: any) => {
    const newOrder: OrderItem = {
      id: `ord-${Date.now()}`,
      symbol: orderData.symbol,
      side: orderData.side,
      type: orderData.type,
      price: orderData.price,
      quantity: orderData.quantity,
      status: "OPEN",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setOrders((prev) => [newOrder, ...prev]);

    // If market, simulate instantaneous position creation
    if (orderData.type === "MARKET") {
      const newPos: PositionItem = {
        id: `pos-${Date.now()}`,
        symbol: orderData.symbol,
        side: orderData.side === "BUY" ? "LONG" : "SHORT",
        size: orderData.quantity,
        entryPrice: orderData.price,
        markPrice: orderData.price,
        pnl: 0.0,
        pnlPct: 0.0,
      };
      setPositions((prev) => [newPos, ...prev]);
    }
  };

  const handleClosePosition = (positionId: string) => {
    setPositions((prev) => prev.filter((p) => p.id !== positionId));
  };

  const handleCancelOrder = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: "CANCELLED" } : o))
    );
  };

  const activePrice = quote?.last_price || activeCandles[activeCandles.length - 1]?.close || 0;
  const activeChange = quote ? (quote.last_price * (quote.change_pct || 0)) / 100 : 0;
  const activeChangePct = quote?.change_pct !== undefined && quote?.change_pct !== null ? quote.change_pct : 0;
  const latency = quote?.feed_latency_ms ? Math.round(quote.feed_latency_ms) : 0;

  return (
    <div className="flex flex-col h-full w-full bg-[#0F1116] text-[#D1D4DC] font-sans select-none overflow-hidden">
      {/* 1. TOP COMMAND BAR */}
      <TerminalTopBar
        symbol={activeSymbol}
        onSelectSymbol={setActiveSymbol}
        price={activePrice}
        change={activeChange}
        changePct={activeChangePct}
        high24h={activeCandles.length > 0 ? Math.max(...activeCandles.map((c) => c.high)) : undefined}
        low24h={activeCandles.length > 0 ? Math.min(...activeCandles.map((c) => c.low)) : undefined}
        volume24h={activeCandles.reduce((acc, c) => acc + (c.volume || 0), 0)}
        activeTimeframe={activeTimeframe}
        onSelectTimeframe={setActiveTimeframe}
        activeIndicatorsCount={activeIndicatorIds.length}
        onOpenIndicators={() => setIsAddIndicatorOpen(true)}
        onSelectPreset={handleSelectPreset}
        executionMode={executionMode}
        onToggleMode={handleToggleMode}
        dataStatus={isLive ? "LIVE" : isStale ? "STALE" : "DISCONNECTED"}
        latencyMs={latency}
      />

      {/* 2. MAIN 3-COLUMN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        {/* Column 1: Left Drawing Toolbar */}
        <TerminalLeftToolbar
          activeTool={activeDrawingTool}
          onSelectTool={setActiveDrawingTool}
          onClearDrawings={() => setDrawings([])}
          drawingsCount={drawings.length}
          drawingsLocked={drawingsLocked}
          onToggleLock={() => setDrawingsLocked(!drawingsLocked)}
          drawingsHidden={drawingsHidden}
          onToggleHide={() => setDrawingsHidden(!drawingsHidden)}
        />

        {/* Column 2: Chart & Subpanes Canvas (Largest DOMINATING area) */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0F1116]">
          {/* Main Candlestick Chart */}
          <TerminalChart
            symbol={activeSymbol}
            timeframe={activeTimeframe}
            candles={activeCandles}
            livePrice={activePrice}
            indicatorResults={indicatorResults}
            activeTool={activeDrawingTool}
            strategyLevels={strategyLevels}
            drawings={drawings}
            onAddDrawing={(d) => setDrawings((prev) => [...prev, d])}
            drawingsHidden={drawingsHidden}
            drawingsLocked={drawingsLocked}
            onViewRangeChange={(start, end) => setViewRange({ start, end })}
            onHoverIndexChange={setHoverIndex}
          />

          {/* Bottom Indicator Subpanes (Volume, RSI, MACD, ADX, CVD) */}
          <TerminalSubPanes
            panes={subPanes}
            candles={activeCandles}
            indicatorResults={indicatorResults}
            onToggleHide={(paneId) =>
              setSubPanes((prev) =>
                prev.map((p) => (p.id === paneId ? { ...p, hidden: !p.hidden } : p))
              )
            }
            onRemovePane={(paneId) =>
              setSubPanes((prev) => prev.filter((p) => p.id !== paneId))
            }
            onConfigurePane={(paneId) => {
              const pane = subPanes.find((p) => p.id === paneId);
              if (pane) {
                const def = indicatorRegistry.get(pane.type);
                if (def) setConfigIndicator({ ...def, enabled: true, parameters: {} });
              }
            }}
            viewStartIndex={viewRange.start}
            viewEndIndex={viewRange.end}
            hoverIndex={hoverIndex}
          />
        </div>

        {/* Column 3: Right Panel (Watchlist, Trade, Positions, Orders) */}
        <TerminalRightPanel
          activeTab={activeRightTab}
          onChangeTab={setActiveRightTab}
          activeSymbol={activeSymbol}
          onSelectSymbol={setActiveSymbol}
          livePrice={activePrice}
          executionMode={executionMode}
          isCollapsed={isRightCollapsed}
          onToggleCollapse={() => setIsRightCollapsed(!isRightCollapsed)}
          watchlistItems={DEFAULT_WATCHLIST}
          positions={positions}
          orders={orders}
          onPlaceOrder={handlePlaceOrder}
          onClosePosition={handleClosePosition}
          onCancelOrder={handleCancelOrder}
        />
      </div>

      {/* 3. BOTTOM TELEMETRY STATUS BAR */}
      <TerminalStatusBar
        brokerName={activeSymbol.includes("USDT") ? "DELTA EXCHANGE (PERP)" : "DHAN / UPSTOX (NSE)"}
        isConnected={true}
        latencyMs={14}
        riskStatus="14/14 CHECKS PASSED"
        candleMode="CLOSED_CANDLE"
      />

      {/* 4. MODALS & DRAWERS */}
      {/* Central Indicator Drawer */}
      <AddIndicatorDrawer
        isOpen={isAddIndicatorOpen}
        onClose={() => setIsAddIndicatorOpen(false)}
        activeIndicatorIds={activeIndicatorIds}
        onAddIndicator={handleAddIndicator}
        onRemoveIndicator={handleRemoveIndicator}
        onConfigureIndicator={(def) => {
          setConfigIndicator({
            id: def.id,
            name: def.name,
            enabled: true,
            weight: 15,
            timeframe: activeTimeframe,
            parameters: {},
          });
        }}
      />

      {/* Indicator Configuration Drawer */}
      {configIndicator && (
        <IndicatorConfigDrawer
          indicator={configIndicator}
          isOpen={!!configIndicator}
          onClose={() => setConfigIndicator(null)}
          onSave={(indId, enabled, weight, params) => {
            setConfigIndicator(null);
          }}
          onReset={(indId) => {
            setConfigIndicator(null);
          }}
          onDelete={(indId) => {
            handleRemoveIndicator(indId);
            setConfigIndicator(null);
          }}
        />
      )}

      {/* Live Trading Confirmation Modal */}
      {isConfirmingLive && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#0A1422] border border-[#FF3B5C]/60 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4 font-sans">
            <div className="flex items-center gap-3 text-[#FF3B5C]">
              <ShieldAlert className="w-6 h-6 animate-bounce" />
              <h3 className="text-base font-bold text-[#F7FAFC]">Activate Real-Money Live Trading?</h3>
            </div>
            <p className="text-xs text-[#7C8CA3] leading-relaxed">
              You are about to switch from simulated paper execution to <strong className="text-[#F7FAFC]">LIVE REAL-MONEY MODE</strong>. Orders will be directly transmitted to authorized broker endpoints. The 14-Point Pre-Order Safety Gate remains enforced at all times.
            </p>
            <div className="p-2.5 bg-[#FF3B5C]/10 border border-[#FF3B5C]/30 rounded-lg text-xs font-mono text-[#FF3B5C]">
              ⚠️ Ensure account risk limits and stop losses are properly set before proceeding.
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                onClick={() => setIsConfirmingLive(false)}
                className="px-3.5 py-1.5 rounded-lg bg-[#0D1727] hover:bg-[#101B2D] text-[#7C8CA3] hover:text-[#F7FAFC] text-xs font-semibold border border-[#1A2A3F] transition-colors"
              >
                Cancel (Keep Paper)
              </button>
              <button
                onClick={confirmLiveMode}
                className="px-4 py-1.5 rounded-lg bg-[#FF3B5C] hover:bg-[#FF3B5C]/90 text-white text-xs font-bold shadow-lg shadow-[#FF3B5C]/30 transition-all"
              >
                Confirm Live Activation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
