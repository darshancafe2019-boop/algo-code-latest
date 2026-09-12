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
      <div className="w-9 bg-[#07101A] border-l border-[#1A2A3F] flex flex-col items-center py-2 z-20 shrink-0 select-none font-sans">
        <button
          onClick={onToggleCollapse}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#7C8CA3] hover:text-[#F7FAFC] hover:bg-[#101B2D] transition"
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
            className="text-[#7C8CA3] hover:text-[#F7FAFC] transition"
            title="Watchlist"
          >
            <ListFilter className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              onChangeTab("trade");
              onToggleCollapse();
            }}
            className="text-[#7C8CA3] hover:text-[#00E890] transition"
            title="Trade Ticket"
          >
            <Zap className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              onChangeTab("positions");
              onToggleCollapse();
            }}
            className="text-[#7C8CA3] hover:text-[#19C5FF] transition"
            title="Positions"
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              onChangeTab("orders");
              onToggleCollapse();
            }}
            className="text-[#7C8CA3] hover:text-[#F7FAFC] transition"
            title="Orders"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 md:w-88 bg-[#07101A] border-l border-[#1A2A3F] flex flex-col h-full z-20 shrink-0 select-none font-sans">
      {/* 1. Panel Header & Tabs */}
      <div className="h-10 bg-[#07101A] border-b border-[#1A2A3F] px-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1 text-xs">
          {[
            { id: "watchlist", label: "WATCHLIST", icon: ListFilter },
            { id: "trade", label: "TRADE", icon: Zap },
            { id: "positions", label: `POSITIONS (${positions.length})`, icon: Layers },
            { id: "orders", label: `ORDERS (${orders.length})`, icon: Send },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => onChangeTab(t.id as RightPanelTabType)}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                activeTab === t.id
                  ? "bg-[#2563EB] text-white shadow-sm"
                  : "text-[#7C8CA3] hover:text-[#F7FAFC] hover:bg-[#101B2D]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Collapse Button */}
        <button
          onClick={onToggleCollapse}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-[#7C8CA3] hover:text-[#F7FAFC] hover:bg-[#101B2D] transition"
          title="Collapse Panel"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 2. TAB CONTENT 1: WATCHLIST */}
      {activeTab === "watchlist" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search & Filter bar */}
          <div className="p-2 border-b border-[#1A2A3F] space-y-1.5 shrink-0 bg-[#0A1422]">
            <div className="flex items-center gap-2 bg-[#0D1727] px-2.5 py-1.5 rounded-lg border border-[#1A2A3F] focus-within:border-[#22D3EE]">
              <Search className="w-3.5 h-3.5 text-[#52627A]" />
              <input
                type="text"
                placeholder="Search symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-[#F7FAFC] placeholder-[#52627A] outline-none"
              />
            </div>

            <div className="flex items-center gap-1 text-[10px] font-semibold">
              {(["ALL", "NSE", "CRYPTO"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  className={`px-2 py-0.5 rounded-md transition ${
                    filterType === f
                      ? "bg-[#2563EB] text-white"
                      : "text-[#7C8CA3] hover:text-[#F7FAFC] bg-[#0D1727] border border-[#1A2A3F]"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Watchlist Table */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[#101B2D] text-[10px] font-semibold text-[#7C8CA3] uppercase border-b border-[#1A2A3F]">
                <tr>
                  <th className="py-1.5 px-2.5">Symbol</th>
                  <th className="py-1.5 px-2 text-right">LTP</th>
                  <th className="py-1.5 px-2.5 text-right">Chg %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A2A3F]">
                {filteredWatchlist.map((item) => {
                  const isSelected = activeSymbol === item.symbol;
                  const isBull = item.changePct >= 0;

                  return (
                    <tr
                      key={item.symbol}
                      onClick={() => onSelectSymbol(item.symbol)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? "bg-[#2563EB]/15 border-l-2 border-[#19C5FF]" : "hover:bg-[#101B2D]"
                      }`}
                    >
                      <td className="py-2 px-2.5">
                        <div className="font-bold text-[#F7FAFC] flex items-center gap-1 font-mono">
                          <span>{item.symbol}</span>
                          <span className="text-[9px] text-[#52627A] font-normal font-sans">
                            {item.exchange}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-[#F7FAFC] font-mono tabular-nums">
                        {item.price > 0 ? (item.price >= 1000 ? item.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : item.price.toFixed(2)) : "—"}
                      </td>
                      <td
                        className={`py-2 px-2.5 text-right font-bold font-mono tabular-nums ${
                          isBull ? "text-[#00E890]" : "text-[#FF3B5C]"
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
        <div className="flex-1 flex flex-col p-3 overflow-y-auto space-y-3 bg-[#0A1422]">
          {/* Active Symbol & LTP Banner */}
          <div className="bg-[#0D1727] p-2.5 rounded-lg border border-[#1A2A3F] flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold text-[#52627A]">INSTRUMENT</div>
              <div className="text-sm font-bold font-mono text-[#F7FAFC]">{activeSymbol}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-semibold text-[#52627A]">MARK PRICE</div>
              <div className="text-sm font-bold font-mono text-[#00E890] tabular-nums">
                {livePrice > 0 ? livePrice.toFixed(2) : "—"}
              </div>
            </div>
          </div>

          {/* BUY / SELL Switcher */}
          <div className="grid grid-cols-2 gap-1.5 bg-[#0D1727] p-1 rounded-lg border border-[#1A2A3F]">
            <button
              type="button"
              onClick={() => setSide("BUY")}
              className={`py-2 rounded-md text-xs font-bold transition-all ${
                side === "BUY" ? "bg-[#00E890] text-slate-950 shadow-md" : "text-[#7C8CA3] hover:text-[#F7FAFC]"
              }`}
            >
              BUY / LONG
            </button>
            <button
              type="button"
              onClick={() => setSide("SELL")}
              className={`py-2 rounded-md text-xs font-bold transition-all ${
                side === "SELL" ? "bg-[#FF3B5C] text-white shadow-md" : "text-[#7C8CA3] hover:text-[#F7FAFC]"
              }`}
            >
              SELL / SHORT
            </button>
          </div>

          {/* Order Type Tabs */}
          <div className="flex items-center gap-1 text-xs">
            {(["MARKET", "LIMIT", "STOP"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setOrderType(t)}
                className={`flex-1 py-1 rounded-md transition text-center font-semibold border ${
                  orderType === t
                    ? "bg-[#2563EB] text-white border-[#2563EB]"
                    : "text-[#7C8CA3] hover:text-[#F7FAFC] bg-[#0D1727] border-[#1A2A3F]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Inputs Form */}
          <form onSubmit={handleOrderSubmit} className="space-y-2.5 text-xs font-sans">
            {/* Quantity */}
            <div>
              <div className="flex justify-between text-[#7C8CA3] text-[11px] mb-1">
                <span>Quantity / Size</span>
                <span>Contracts</span>
              </div>
              <input
                type="number"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-[#0D1727] border border-[#1A2A3F] rounded-lg px-2.5 py-1.5 text-[#F7FAFC] font-mono outline-none focus:border-[#22D3EE]"
                required
              />
            </div>

            {/* Limit Price (if LIMIT or STOP) */}
            {orderType !== "MARKET" && (
              <div>
                <div className="flex justify-between text-[#7C8CA3] text-[11px] mb-1">
                  <span>Price</span>
                  <span>USDT / INR</span>
                </div>
                <input
                  type="number"
                  step="any"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  className="w-full bg-[#0D1727] border border-[#1A2A3F] rounded-lg px-2.5 py-1.5 text-[#F7FAFC] font-mono outline-none focus:border-[#22D3EE]"
                  required
                />
              </div>
            )}

            {/* Stop Loss & Take Profit */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-[#FF3B5C] font-bold block mb-1">STOP LOSS</span>
                <input
                  type="number"
                  step="any"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="w-full bg-[#0D1727] border border-[#1A2A3F] rounded-lg px-2 py-1 text-[#F7FAFC] font-mono outline-none focus:border-[#FF3B5C]"
                />
              </div>
              <div>
                <span className="text-[10px] text-[#00E890] font-bold block mb-1">TAKE PROFIT</span>
                <input
                  type="number"
                  step="any"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  className="w-full bg-[#0D1727] border border-[#1A2A3F] rounded-lg px-2 py-1 text-[#F7FAFC] font-mono outline-none focus:border-[#00E890]"
                />
              </div>
            </div>

            {/* Risk:Reward & Margin Telemetry */}
            <div className="bg-[#0D1727] p-2 rounded-lg border border-[#1A2A3F] text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-[#7C8CA3]">Estimated R:R Ratio:</span>
                <span className="font-bold text-[#19C5FF] font-mono">
                  {riskRewardRatio ? `1 : ${riskRewardRatio}` : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7C8CA3]">Execution Mode:</span>
                <span className={`font-bold ${executionMode === "LIVE" ? "text-[#FF3B5C]" : "text-[#19C5FF]"}`}>
                  {executionMode}
                </span>
              </div>
            </div>

            {/* Order Feedback Alert */}
            {orderMessage && (
              <div
                className={`p-2 rounded-lg text-[11px] flex items-center gap-1.5 ${
                  orderMessage.type === "success"
                    ? "bg-[#00E890]/15 text-[#00E890] border border-[#00E890]/30"
                    : "bg-[#FF3B5C]/15 text-[#FF3B5C] border border-[#FF3B5C]/30"
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
              className={`w-full py-2.5 rounded-lg font-bold text-xs transition shadow-lg ${
                side === "BUY"
                  ? "bg-[#00E890] hover:bg-[#00E890]/90 text-slate-950 shadow-[#00E890]/20"
                  : "bg-[#FF3B5C] hover:bg-[#FF3B5C]/90 text-white shadow-[#FF3B5C]/20"
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
        <div className="flex-1 overflow-y-auto p-2 bg-[#0A1422]">
          {positions.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-[#52627A] text-xs">
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
                    className="bg-[#0D1727] p-2.5 rounded-lg border border-[#1A2A3F] space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-mono">
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                            pos.side === "LONG"
                              ? "bg-[#00E890]/20 text-[#00E890]"
                              : "bg-[#FF3B5C]/20 text-[#FF3B5C]"
                          }`}
                        >
                          {pos.side}
                        </span>
                        <span className="font-bold text-[#F7FAFC]">{pos.symbol}</span>
                      </div>
                      <button
                        onClick={() => onClosePosition && onClosePosition(pos.id)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-[#FF3B5C]/15 hover:bg-[#FF3B5C]/25 text-[#FF3B5C] border border-[#FF3B5C]/30 transition font-semibold"
                      >
                        CLOSE
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[11px] text-[#7C8CA3] pt-1 font-mono tabular-nums">
                      <div>
                        Size: <span className="text-[#F7FAFC]">{pos.size}</span>
                      </div>
                      <div className="text-right">
                        Entry: <span className="text-[#F7FAFC]">{pos.entryPrice.toFixed(2)}</span>
                      </div>
                      <div>
                        Mark: <span className="text-[#F7FAFC]">{pos.markPrice.toFixed(2)}</span>
                      </div>
                      <div className={`text-right font-bold ${isProfit ? "text-[#00E890]" : "text-[#FF3B5C]"}`}>
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
        <div className="flex-1 overflow-y-auto p-2 bg-[#0A1422]">
          {orders.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-[#52627A] text-xs">
              <Send className="w-6 h-6 mb-1 opacity-40" />
              <span>No Active Working Orders</span>
            </div>
          ) : (
            <div className="space-y-2">
              {orders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-[#0D1727] p-2.5 rounded-lg border border-[#1A2A3F] space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#F7FAFC] font-mono">{ord.symbol}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold font-mono ${
                        ord.status === "OPEN"
                          ? "bg-[#2563EB]/20 text-[#19C5FF]"
                          : ord.status === "FILLED"
                          ? "bg-[#00E890]/20 text-[#00E890]"
                          : "bg-[#52627A]/20 text-[#7C8CA3]"
                      }`}
                    >
                      {ord.status}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-[#7C8CA3] font-mono tabular-nums">
                    <span>
                      {ord.side} {ord.quantity} @ {ord.price.toFixed(2)}
                    </span>
                    {ord.status === "OPEN" && onCancelOrder && (
                      <button
                        onClick={() => onCancelOrder(ord.id)}
                        className="text-[#FF3B5C] hover:underline font-semibold"
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
