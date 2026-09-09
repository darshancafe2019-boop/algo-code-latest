"use client";

import React, { useState, useMemo } from "react";
import {
  ListFilter,
  Zap,
  Layers,
  Send,
  Search,
  ChevronRight,
  ChevronLeft,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Shield,
  ShieldAlert,
  X,
  RefreshCw,
  Star,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { formatPrice, formatPercent, formatNumber } from "@/lib/formatters";

export type RightPanelTabType = "watchlist" | "trade" | "positions" | "orders";

export interface WatchlistItem {
  symbol: string;
  exchange: string;
  price: number;
  change: number;
  changePct: number;
  volume: number;
  isFavorite?: boolean;
}

export interface PositionItem {
  id: string;
  symbol: string;
  side: "LONG" | "SHORT";
  size: number;
  entryPrice: number;
  markPrice: number;
  pnl: number;
  pnlPct: number;
}

export interface OrderItem {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT" | "STOP";
  price: number;
  quantity: number;
  status: "OPEN" | "FILLED" | "CANCELLED";
  timestamp: string;
}

interface TerminalRightPanelProps {
  activeTab: RightPanelTabType;
  onChangeTab: (tab: RightPanelTabType) => void;
  activeSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  livePrice: number;
  executionMode: "PAPER" | "SHADOW" | "LIVE";
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  watchlistItems?: WatchlistItem[];
  positions?: PositionItem[];
  orders?: OrderItem[];
  onPlaceOrder?: (order: {
    symbol: string;
    side: "BUY" | "SELL";
    type: "MARKET" | "LIMIT" | "STOP";
    quantity: number;
    price: number;
    stopLoss?: number;
    takeProfit?: number;
    leverage?: number;
  }) => Promise<void>;
  onClosePosition?: (positionId: string) => void;
  onCancelOrder?: (orderId: string) => void;
}

export function TerminalRightPanel({
  activeTab,
  onChangeTab,
  activeSymbol,
  onSelectSymbol,
  livePrice,
  executionMode,
  isCollapsed,
  onToggleCollapse,
  watchlistItems = [],
  positions = [],
  orders = [],
  onPlaceOrder,
  onClosePosition,
  onCancelOrder,
}: TerminalRightPanelProps) {
  // Watchlist Local State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "CRYPTO" | "NSE">("ALL");

  // Trade Ticket Local State
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "STOP">("MARKET");
  const [quantity, setQuantity] = useState<string>("1");
  const [limitPrice, setLimitPrice] = useState<string>(livePrice ? livePrice.toString() : "");
  const [stopLoss, setStopLoss] = useState<string>(
    livePrice ? (side === "BUY" ? (livePrice * 0.985).toFixed(2) : (livePrice * 1.015).toFixed(2)) : ""
  );
  const [takeProfit, setTakeProfit] = useState<string>(
    livePrice ? (side === "BUY" ? (livePrice * 1.03).toFixed(2) : (livePrice * 0.97).toFixed(2)) : ""
  );
  const [leverage, setLeverage] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderMessage, setOrderMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Update prices when livePrice changes and order is MARKET
  React.useEffect(() => {
    if (orderType === "MARKET" && livePrice) {
      setLimitPrice(livePrice.toString());
    }
  }, [livePrice, orderType]);

  // Risk:Reward calculation
  const riskRewardRatio = useMemo(() => {
    const entry = parseFloat(limitPrice) || livePrice || 0;
    const sl = parseFloat(stopLoss) || 0;
    const tp = parseFloat(takeProfit) || 0;

    if (!entry || !sl || !tp) return null;

    if (side === "BUY") {
      const risk = entry - sl;
      const reward = tp - entry;
      if (risk <= 0 || reward <= 0) return null;
      return (reward / risk).toFixed(2);
    } else {
      const risk = sl - entry;
      const reward = entry - tp;
      if (risk <= 0 || reward <= 0) return null;
      return (reward / risk).toFixed(2);
    }
  }, [limitPrice, livePrice, stopLoss, takeProfit, side]);

  // Filtered Watchlist
  const filteredWatchlist = useMemo(() => {
    return watchlistItems.filter((item) => {
      const matchesSearch =
        item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.exchange.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (filterType === "CRYPTO") return item.exchange === "DELTA" || item.symbol.includes("USDT");
      if (filterType === "NSE") return item.exchange === "NSE";
      return true;
    });
  }, [watchlistItems, searchQuery, filterType]);

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onPlaceOrder) return;

    setIsSubmitting(true);
    setOrderMessage(null);

    try {
      await onPlaceOrder({
        symbol: activeSymbol,
        side,
        type: orderType,
        quantity: parseFloat(quantity) || 1,
        price: orderType === "MARKET" ? livePrice : parseFloat(limitPrice) || livePrice,
        stopLoss: parseFloat(stopLoss) || undefined,
        takeProfit: parseFloat(takeProfit) || undefined,
        leverage,
      });

      setOrderMessage({
        type: "success",
        text: `${side} ${quantity} ${activeSymbol} placed successfully (${executionMode})`,
      });
      setTimeout(() => setOrderMessage(null), 4000);
    } catch (err: any) {
      setOrderMessage({
        type: "error",
        text: err?.message || "Order execution rejected by safety gate",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCollapsed) {
    return (
      <div className="w-9 bg-[#131722] border-l border-[#2A2E39] flex flex-col items-center py-2 z-20 shrink-0 select-none font-sans">
        <button
          onClick={onToggleCollapse}
          className="w-7 h-7 rounded flex items-center justify-center text-[#787B86] hover:text-[#D1D4DC] hover:bg-[#1E222D] transition"
          title="Expand Right Panel"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center gap-4 mt-6">
          <button
            onClick={() => {
              onChangeTab("watchlist");
              onToggleCollapse();
            }}
            className="text-[#787B86] hover:text-[#D1D4DC] transition"
            title="Watchlist"
          >
            <ListFilter className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              onChangeTab("trade");
              onToggleCollapse();
            }}
            className="text-[#787B86] hover:text-[#26A69A] transition"
            title="Trade Ticket"
          >
            <Zap className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              onChangeTab("positions");
              onToggleCollapse();
            }}
            className="text-[#787B86] hover:text-[#2962FF] transition"
            title="Positions"
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              onChangeTab("orders");
              onToggleCollapse();
            }}
            className="text-[#787B86] hover:text-[#D1D4DC] transition"
            title="Orders"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 md:w-88 bg-[#131722] border-l border-[#2A2E39] flex flex-col h-full z-20 shrink-0 select-none font-sans">
      {/* 1. Panel Header & Tabs */}
      <div className="h-10 bg-[#131722] border-b border-[#2A2E39] px-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1 font-mono text-xs">
          {[
            { id: "watchlist", label: "WATCHLIST", icon: ListFilter },
            { id: "trade", label: "TRADE", icon: Zap },
            { id: "positions", label: `POSITIONS (${positions.length})`, icon: Layers },
            { id: "orders", label: `ORDERS (${orders.length})`, icon: Send },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => onChangeTab(t.id as RightPanelTabType)}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                activeTab === t.id
                  ? "bg-[#2962FF] text-white shadow-sm"
                  : "text-[#787B86] hover:text-[#D1D4DC] hover:bg-[#1E222D]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Collapse Button */}
        <button
          onClick={onToggleCollapse}
          className="w-6 h-6 rounded flex items-center justify-center text-[#787B86] hover:text-[#D1D4DC] hover:bg-[#1E222D] transition"
          title="Collapse Panel"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 2. TAB CONTENT 1: WATCHLIST */}
      {activeTab === "watchlist" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search & Filter bar */}
          <div className="p-2 border-b border-[#2A2E39] space-y-1.5 shrink-0">
            <div className="flex items-center gap-2 bg-[#0F1116] px-2 py-1 rounded border border-[#2A2E39]">
              <Search className="w-3.5 h-3.5 text-[#787B86]" />
              <input
                type="text"
                placeholder="Search symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-[#D1D4DC] placeholder-[#787B86] outline-none"
              />
            </div>

            <div className="flex items-center gap-1 text-[10px] font-mono font-semibold">
              {(["ALL", "NSE", "CRYPTO"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  className={`px-2 py-0.5 rounded transition ${
                    filterType === f
                      ? "bg-[#2A2E39] text-[#D1D4DC]"
                      : "text-[#787B86] hover:text-[#D1D4DC]"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Watchlist Table */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="sticky top-0 bg-[#131722] text-[10px] font-bold text-[#787B86] uppercase border-b border-[#2A2E39]">
                <tr>
                  <th className="py-1.5 px-2.5">Symbol</th>
                  <th className="py-1.5 px-2 text-right">LTP</th>
                  <th className="py-1.5 px-2.5 text-right">Chg %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E222D]">
                {filteredWatchlist.map((item) => {
                  const isSelected = activeSymbol === item.symbol;
                  const isBull = item.changePct >= 0;

                  return (
                    <tr
                      key={item.symbol}
                      onClick={() => onSelectSymbol(item.symbol)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? "bg-[#2962FF]/15 border-l-2 border-[#2962FF]" : "hover:bg-[#1E222D]"
                      }`}
                    >
                      <td className="py-2 px-2.5">
                        <div className="font-bold text-[#D1D4DC] flex items-center gap-1">
                          <span>{item.symbol}</span>
                          <span className="text-[9px] text-[#787B86] font-normal font-sans">
                            {item.exchange}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-[#D1D4DC] tabular-nums">
                        {item.price > 0 ? (item.price >= 1000 ? item.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : item.price.toFixed(2)) : "—"}
                      </td>
                      <td
                        className={`py-2 px-2.5 text-right font-bold tabular-nums ${
                          isBull ? "text-[#26A69A]" : "text-[#EF5350]"
                        }`}
                      >
                        {isBull ? "+" : ""}
                        {item.changePct.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. TAB CONTENT 2: TRADE TICKET */}
      {activeTab === "trade" && (
        <div className="flex-1 flex flex-col p-3 overflow-y-auto space-y-3">
          {/* Active Symbol & LTP Banner */}
          <div className="bg-[#0F1116] p-2.5 rounded border border-[#2A2E39] flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold font-mono text-[#787B86]">INSTRUMENT</div>
              <div className="text-sm font-extrabold font-mono text-[#D1D4DC]">{activeSymbol}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-bold font-mono text-[#787B86]">MARK PRICE</div>
              <div className="text-sm font-extrabold font-mono text-[#26A69A] tabular-nums">
                {livePrice > 0 ? livePrice.toFixed(2) : "—"}
              </div>
            </div>
          </div>

          {/* BUY / SELL Switcher */}
          <div className="grid grid-cols-2 gap-1 bg-[#0F1116] p-1 rounded border border-[#2A2E39]">
            <button
              type="button"
              onClick={() => setSide("BUY")}
              className={`py-2 rounded text-xs font-extrabold font-mono transition-all ${
                side === "BUY" ? "bg-[#26A69A] text-white shadow-md" : "text-[#787B86] hover:text-[#D1D4DC]"
              }`}
            >
              BUY / LONG
            </button>
            <button
              type="button"
              onClick={() => setSide("SELL")}
              className={`py-2 rounded text-xs font-extrabold font-mono transition-all ${
                side === "SELL" ? "bg-[#EF5350] text-white shadow-md" : "text-[#787B86] hover:text-[#D1D4DC]"
              }`}
            >
              SELL / SHORT
            </button>
          </div>

          {/* Order Type Tabs */}
          <div className="flex items-center gap-1 text-[11px] font-mono">
            {(["MARKET", "LIMIT", "STOP"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setOrderType(t)}
                className={`flex-1 py-1 rounded transition text-center font-bold ${
                  orderType === t ? "bg-[#2A2E39] text-[#D1D4DC]" : "text-[#787B86] hover:text-[#D1D4DC]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Inputs Form */}
          <form onSubmit={handleOrderSubmit} className="space-y-2.5 text-xs font-mono">
            {/* Quantity */}
            <div>
              <div className="flex justify-between text-[#787B86] text-[11px] mb-1">
                <span>Quantity / Size</span>
                <span>Contracts</span>
              </div>
              <input
                type="number"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-[#0F1116] border border-[#2A2E39] rounded px-2.5 py-1.5 text-[#D1D4DC] font-mono outline-none focus:border-[#2962FF]"
                required
              />
            </div>

            {/* Limit Price (if LIMIT or STOP) */}
            {orderType !== "MARKET" && (
              <div>
                <div className="flex justify-between text-[#787B86] text-[11px] mb-1">
                  <span>Price</span>
                  <span>USDT / INR</span>
                </div>
                <input
                  type="number"
                  step="any"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  className="w-full bg-[#0F1116] border border-[#2A2E39] rounded px-2.5 py-1.5 text-[#D1D4DC] font-mono outline-none focus:border-[#2962FF]"
                  required
                />
              </div>
            )}

            {/* Stop Loss & Take Profit */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-[#EF5350] font-bold block mb-1">STOP LOSS</span>
                <input
                  type="number"
                  step="any"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="w-full bg-[#0F1116] border border-[#2A2E39] rounded px-2 py-1 text-[#D1D4DC] font-mono outline-none focus:border-[#EF5350]"
                />
              </div>
              <div>
                <span className="text-[10px] text-[#26A69A] font-bold block mb-1">TAKE PROFIT</span>
                <input
                  type="number"
                  step="any"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  className="w-full bg-[#0F1116] border border-[#2A2E39] rounded px-2 py-1 text-[#D1D4DC] font-mono outline-none focus:border-[#26A69A]"
                />
              </div>
            </div>

            {/* Risk:Reward & Margin Telemetry */}
            <div className="bg-[#0F1116] p-2 rounded border border-[#2A2E39] text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-[#787B86]">Estimated R:R Ratio:</span>
                <span className="font-bold text-[#2962FF]">
                  {riskRewardRatio ? `1 : ${riskRewardRatio}` : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#787B86]">Execution Mode:</span>
                <span className={`font-bold ${executionMode === "LIVE" ? "text-[#EF5350]" : "text-[#2962FF]"}`}>
                  {executionMode}
                </span>
              </div>
            </div>

            {/* Order Feedback Alert */}
            {orderMessage && (
              <div
                className={`p-2 rounded text-[11px] flex items-center gap-1.5 ${
                  orderMessage.type === "success"
                    ? "bg-[#26A69A]/15 text-[#26A69A] border border-[#26A69A]/30"
                    : "bg-[#EF5350]/15 text-[#EF5350] border border-[#EF5350]/30"
                }`}
              >
                {orderMessage.type === "success" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{orderMessage.text}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-2.5 rounded font-extrabold text-white text-xs font-mono transition shadow-lg ${
                side === "BUY"
                  ? "bg-[#26A69A] hover:bg-[#26A69A]/90 shadow-[#26A69A]/20"
                  : "bg-[#EF5350] hover:bg-[#EF5350]/90 shadow-[#EF5350]/20"
              }`}
            >
              {isSubmitting
                ? "Submitting Order..."
                : `${side} ${quantity} ${activeSymbol} (${orderType})`}
            </button>
          </form>
        </div>
      )}

      {/* 4. TAB CONTENT 3: POSITIONS */}
      {activeTab === "positions" && (
        <div className="flex-1 overflow-y-auto p-2">
          {positions.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-[#787B86] text-xs font-mono">
              <Layers className="w-6 h-6 mb-1 opacity-40" />
              <span>No Active Positions</span>
            </div>
          ) : (
            <div className="space-y-2">
              {positions.map((pos) => {
                const isProfit = pos.pnl >= 0;
                return (
                  <div
                    key={pos.id}
                    className="bg-[#0F1116] p-2.5 rounded border border-[#2A2E39] space-y-1.5 font-mono text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                            pos.side === "LONG"
                              ? "bg-[#26A69A]/20 text-[#26A69A]"
                              : "bg-[#EF5350]/20 text-[#EF5350]"
                          }`}
                        >
                          {pos.side}
                        </span>
                        <span className="font-bold text-[#D1D4DC]">{pos.symbol}</span>
                      </div>
                      <button
                        onClick={() => onClosePosition && onClosePosition(pos.id)}
                        className="text-[10px] px-2 py-0.5 rounded bg-[#EF5350]/15 hover:bg-[#EF5350]/25 text-[#EF5350] border border-[#EF5350]/30 transition"
                      >
                        CLOSE
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[11px] text-[#787B86] pt-1">
                      <div>
                        Size: <span className="text-[#D1D4DC]">{pos.size}</span>
                      </div>
                      <div className="text-right">
                        Entry: <span className="text-[#D1D4DC]">{pos.entryPrice.toFixed(2)}</span>
                      </div>
                      <div>
                        Mark: <span className="text-[#D1D4DC]">{pos.markPrice.toFixed(2)}</span>
                      </div>
                      <div className={`text-right font-bold ${isProfit ? "text-[#26A69A]" : "text-[#EF5350]"}`}>
                        PnL: {isProfit ? "+" : ""}${pos.pnl.toFixed(2)} ({isProfit ? "+" : ""}
                        {pos.pnlPct.toFixed(2)}%)
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB CONTENT 4: ORDERS */}
      {activeTab === "orders" && (
        <div className="flex-1 overflow-y-auto p-2">
          {orders.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-[#787B86] text-xs font-mono">
              <Send className="w-6 h-6 mb-1 opacity-40" />
              <span>No Active Working Orders</span>
            </div>
          ) : (
            <div className="space-y-2">
              {orders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-[#0F1116] p-2.5 rounded border border-[#2A2E39] space-y-1 font-mono text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#D1D4DC]">{ord.symbol}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                        ord.status === "OPEN"
                          ? "bg-[#2962FF]/20 text-[#2962FF]"
                          : ord.status === "FILLED"
                          ? "bg-[#26A69A]/20 text-[#26A69A]"
                          : "bg-[#787B86]/20 text-[#787B86]"
                      }`}
                    >
                      {ord.status}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-[#787B86]">
                    <span>
                      {ord.side} {ord.quantity} @ {ord.price.toFixed(2)}
                    </span>
                    {ord.status === "OPEN" && onCancelOrder && (
                      <button
                        onClick={() => onCancelOrder(ord.id)}
                        className="text-[#EF5350] hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
