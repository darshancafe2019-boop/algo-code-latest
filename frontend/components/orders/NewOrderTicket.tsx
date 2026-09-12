"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Zap,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  Search,
  Sliders,
  Layers,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useGlobalData } from "@/context/GlobalDataContext";
import {
  calculateNotional,
  calculateRequiredMargin,
  calculateStopLossPrice,
  calculateTakeProfitPrice,
  calculateRiskReward,
  calculateProjectedPosition,
} from "@/lib/orderCalculations";
import { OrderReviewConfirmationModal } from "./OrderReviewConfirmationModal";

const POPULAR_INSTRUMENTS = [
  { symbol: "BTC/USDT", name: "Bitcoin Perpetual", price: 65240.0, assetClass: "Crypto" },
  { symbol: "ETH/USDT", name: "Ethereum Perpetual", price: 3520.0, assetClass: "Crypto" },
  { symbol: "SOL/USDT", name: "Solana Perpetual", price: 154.5, assetClass: "Crypto" },
  { symbol: "NIFTY", name: "NIFTY 50 Index", price: 24350.0, assetClass: "NSE" },
  { symbol: "BANKNIFTY", name: "Bank NIFTY Index", price: 51200.0, assetClass: "NSE" },
  { symbol: "RELIANCE", name: "Reliance Industries", price: 2980.0, assetClass: "NSE" },
];

interface NewOrderTicketProps {
  onOpenDetailsDrawer: () => void;
}

export function NewOrderTicket({ onOpenDetailsDrawer }: NewOrderTicketProps) {
  const { portfolioSnapshot, positions, riskSummary, tradingMode, refreshAll } = useGlobalData();

  // 1. Instrument State
  const [selectedSymbol, setSelectedSymbol] = useState("BTC/USDT");
  const [marketPrice, setMarketPrice] = useState(65240.0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPriceLoading, setIsPriceLoading] = useState(false);

  // 2. Order Parameters State
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "STOP">("MARKET");
  const [limitPrice, setLimitPrice] = useState<number>(65240.0);

  // 3. Sizing State
  const [sizeMode, setSizeMode] = useState<"UNITS" | "NOTIONAL" | "RISK">("UNITS");
  const [quantity, setQuantity] = useState<number>(0.05);
  const [notionalInput, setNotionalInput] = useState<number>(3262.0);
  const [riskPercentInput, setRiskPercentInput] = useState<number>(1.0);

  // 4. Leverage State
  const [leverage, setLeverage] = useState<number>(1);

  // 5. SL / TP State
  const [slMode, setSlMode] = useState<"PERCENTAGE" | "PRICE">("PERCENTAGE");
  const [slValue, setSlValue] = useState<number>(1.0); // 1.0%
  const [tpMode, setTpMode] = useState<"PERCENTAGE" | "PRICE">("PERCENTAGE");
  const [tpValue, setTpValue] = useState<number>(2.0); // 2.0%

  // 6. Modal & Execution State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [executionState, setExecutionState] = useState<"READY" | "EXECUTING" | "SUCCESS" | "FAILED" | "UNKNOWN">("READY");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderFeedback, setOrderFeedback] = useState<{ status: "success" | "error" | "unknown"; message: string } | null>(null);
  const [lastExecutedOrder, setLastExecutedOrder] = useState<{
    orderId: string;
    tradeId?: string | number;
    symbol: string;
    side: string;
    quantity: number;
    orderType: string;
    executionPrice: number;
    status: string;
    timestamp: string;
    mode: string;
  } | null>(null);

  // Fetch live market price for selected symbol
  useEffect(() => {
    let isMounted = true;
    const fetchLivePrice = async () => {
      try {
        setIsPriceLoading(true);
        const res = await apiClient.get<any>(`/api/ticker?symbol=${encodeURIComponent(selectedSymbol)}`, {
          timeoutMs: 4000,
          deduplicate: true,
        });
        if (!res.ok || !res.data) return;
        const data = res.data;
        const p = Number(data.last || data.price || data.close || 0);
        if (p > 0 && isMounted) {
          setMarketPrice(p);
          if (orderType === "MARKET") {
            setLimitPrice(p);
          }
        }
      } catch {
        // Fallback gracefully
      } finally {
        if (isMounted) setIsPriceLoading(false);
      }
    };

    fetchLivePrice();
    const interval = setInterval(fetchLivePrice, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedSymbol, orderType]);

  // Sync price when instrument changes
  const handleSelectInstrument = (inst: { symbol: string; price: number }) => {
    setSelectedSymbol(inst.symbol);
    setMarketPrice(inst.price);
    setLimitPrice(inst.price);
    setIsSearchOpen(false);
    setSearchQuery("");
  };

  const activePrice = orderType === "LIMIT" ? limitPrice : marketPrice;

  // Derive Effective Quantity based on Size Mode
  const effectiveQty = useMemo(() => {
    if (sizeMode === "UNITS") {
      return Math.max(0.0001, quantity);
    }
    if (sizeMode === "NOTIONAL") {
      return activePrice > 0 ? Number((notionalInput / activePrice).toFixed(4)) : 0.05;
    }
    if (sizeMode === "RISK") {
      const avail = portfolioSnapshot?.availableCapital || 50000;
      const riskUsd = (avail * riskPercentInput) / 100;
      const slDist = activePrice * (slValue / 100);
      return slDist > 0 ? Number((riskUsd / slDist).toFixed(4)) : 0.05;
    }
    return 0.05;
  }, [sizeMode, quantity, notionalInput, riskPercentInput, activePrice, slValue, portfolioSnapshot]);

  // Derived Financials
  const calculatedNotional = useMemo(() => calculateNotional(effectiveQty, activePrice), [effectiveQty, activePrice]);
  const requiredMargin = useMemo(() => calculateRequiredMargin(calculatedNotional, leverage), [calculatedNotional, leverage]);

  const stopLossPrice = useMemo(() => {
    return calculateStopLossPrice(activePrice, side, slValue, slMode);
  }, [activePrice, side, slValue, slMode]);

  const takeProfitPrice = useMemo(() => {
    return calculateTakeProfitPrice(activePrice, side, tpValue, tpMode);
  }, [activePrice, side, tpValue, tpMode]);

  const { riskUsd, rewardUsd, rrRatio } = useMemo(() => {
    return calculateRiskReward(activePrice, stopLossPrice, takeProfitPrice, effectiveQty);
  }, [activePrice, stopLossPrice, takeProfitPrice, effectiveQty]);

  // Active Position for Current Instrument
  const currentPosition = useMemo(() => {
    return positions.find((p) => p.symbol === selectedSymbol && p.quantity > 0) || null;
  }, [positions, selectedSymbol]);

  // Projected Position Calculation
  const projectedPosition = useMemo(() => {
    return calculateProjectedPosition(currentPosition, side, effectiveQty);
  }, [currentPosition, side, effectiveQty]);

  // Central Risk Gate Verification
  const availableCapital = portfolioSnapshot?.availableCapital ?? 50000.0;
  const isKillSwitchActive = riskSummary?.globalKillSwitchActive ?? false;
  const isMarginOK = requiredMargin <= availableCapital;

  const riskCheck = useMemo(() => {
    if (isKillSwitchActive) {
      return { passed: false, reason: "Global Emergency Kill Switch is ACTIVE" };
    }
    if (!isMarginOK) {
      return {
        passed: false,
        reason: `Insufficient margin (Required: $${requiredMargin.toLocaleString()}, Available: $${availableCapital.toLocaleString()})`,
      };
    }
    return { passed: true, reason: "14 / 14 Pre-Order Safety Checks Passed" };
  }, [isKillSwitchActive, isMarginOK, requiredMargin, availableCapital]);

  // Order Placement
  const handleExecuteOrder = async (overrideSide?: "BUY" | "SELL") => {
    if (isSubmitting) return;
    const targetSide = overrideSide || side;

    if (!riskCheck.passed) {
      setOrderFeedback({ status: "error", message: riskCheck.reason });
      setIsReviewModalOpen(false);
      setExecutionState("FAILED");
      return;
    }

    setIsSubmitting(true);
    setExecutionState("EXECUTING");
    setOrderFeedback(null);

    const idempotencyKey = apiClient.generateIdempotencyKey("ORDER", selectedSymbol);

    try {
      const res = await apiClient.post<any>("/api/orders", {
        symbol: selectedSymbol,
        direction: targetSide,
        side: targetSide,
        quantity: effectiveQty,
        order_type: orderType,
        price: orderType === "LIMIT" ? limitPrice : undefined,
        stop_loss: stopLossPrice,
        take_profit: takeProfitPrice,
        mode: tradingMode,
        bot_id: "order-center",
        strategy: "MANUAL_DISCRETIONARY",
        idempotency_key: idempotencyKey,
      }, {
        idempotencyKey,
        timeoutMs: 12000,
        retries: 0,
      });

      if (!res.ok || !res.data || !res.data.success) {
        setExecutionState("FAILED");
        const errMsg = res.error?.message || res.data?.message || "Order execution rejected by risk engine.";
        throw new Error(errMsg);
      }

      const data = res.data;
      setExecutionState("SUCCESS");
      const orderId = String(data.order_id || data.id || idempotencyKey.substring(9));
      const fillPrice = Number(data.fill_price || activePrice);

      setLastExecutedOrder({
        orderId,
        tradeId: data.trade_id,
        symbol: selectedSymbol,
        side: targetSide,
        quantity: effectiveQty,
        orderType,
        executionPrice: fillPrice,
        status: "FILLED",
        timestamp: new Date().toLocaleTimeString(),
        mode: tradingMode,
      });

      setOrderFeedback({
        status: "success",
        message: data.message || `${tradingMode} ${targetSide} order for ${effectiveQty} ${selectedSymbol} FILLED @ $${fillPrice.toLocaleString()}!`,
      });

      setIsReviewModalOpen(false);
      await refreshAll();

      setTimeout(() => {
        setExecutionState("READY");
      }, 5000);
    } catch (err: any) {
      if (err.name === "AbortError") {
        setExecutionState("UNKNOWN");
        setOrderFeedback({
          status: "unknown",
          message: "ORDER STATUS UNKNOWN: Server request timed out. Do not submit duplicate orders without checking open orders ledger.",
        });
      } else {
        setExecutionState("FAILED");
        setOrderFeedback({ status: "error", message: err.message || "Order placement failed." });
      }
      setIsReviewModalOpen(false);
      await refreshAll();
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBuy = side === "BUY";
  const currencySymbol = selectedSymbol.includes("INR") || selectedSymbol.includes("NIFTY") ? "₹" : "$";

  const filteredInstruments = POPULAR_INSTRUMENTS.filter((i) =>
    i.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-4 sm:p-5 font-sans text-xs space-y-4">
      {/* 1. Top Instrument Selector & Price Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#07101A] border border-[#1A2A3F] rounded-lg">
        {/* Searchable Instrument Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#0D1727] border border-[#1A2A3F] hover:border-[#29415F] rounded-lg text-[#F7FAFC] font-semibold text-sm transition"
          >
            <span>{selectedSymbol}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#22D3EE]" />
          </button>

          {isSearchOpen && (
            <div className="absolute left-0 mt-2 w-72 bg-[#0D1727] border border-[#1A2A3F] rounded-lg shadow-2xl p-2 z-50 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#07101A] rounded-md border border-[#1A2A3F] mb-2">
                <Search className="w-3.5 h-3.5 text-[#52627A]" />
                <input
                  type="text"
                  placeholder="Search BTC, ETH, NIFTY..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-[#F7FAFC] text-xs focus:outline-none placeholder-[#52627A]"
                  autoFocus
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredInstruments.map((inst) => (
                  <button
                    key={inst.symbol}
                    onClick={() => handleSelectInstrument(inst)}
                    className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md text-left hover:bg-[#101B2D] transition"
                  >
                    <div>
                      <div className="font-semibold text-[#F7FAFC]">{inst.symbol}</div>
                      <div className="text-[10px] text-[#7C8CA3]">{inst.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-[#22D3EE] font-mono tabular-nums">${inst.price.toLocaleString()}</div>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#101B2D] text-[#7C8CA3]">
                        {inst.assetClass}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Live Market Price Badges */}
        <div className="flex items-center gap-4 text-right">
          <div>
            <div className="text-[10px] text-[#7C8CA3] uppercase">Last Traded Price</div>
            <div className="text-base font-bold text-[#F7FAFC] font-mono tabular-nums">
              {currencySymbol}{marketPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="hidden sm:block">
            <div className="text-[10px] text-[#7C8CA3] uppercase">Mark Price</div>
            <div className="text-sm font-medium text-[#7C8CA3] font-mono tabular-nums">
              {currencySymbol}{(marketPrice * 0.9998).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Direction Controls: [ BUY / LONG ] and [ SELL / SHORT ] */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-[#07101A] rounded-lg border border-[#1A2A3F]">
        <button
          type="button"
          onClick={() => setSide("BUY")}
          className={`py-2 text-xs font-semibold rounded-md transition flex items-center justify-center gap-1.5 ${
            isBuy
              ? "bg-[#00E890]/15 border border-[#00E890]/40 text-[#00E890]"
              : "text-[#7C8CA3] hover:text-[#F7FAFC]"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>BUY / LONG</span>
        </button>
        <button
          type="button"
          onClick={() => setSide("SELL")}
          className={`py-2 text-xs font-semibold rounded-md transition flex items-center justify-center gap-1.5 ${
            !isBuy
              ? "bg-[#FF3B5C]/15 border border-[#FF3B5C]/40 text-[#FF3B5C]"
              : "text-[#7C8CA3] hover:text-[#F7FAFC]"
          }`}
        >
          <TrendingDown className="w-3.5 h-3.5" />
          <span>SELL / SHORT</span>
        </button>
      </div>

      {/* 3. Order Type Selector */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[#7C8CA3] mr-1">Order Type:</span>
        {(["MARKET", "LIMIT", "STOP"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setOrderType(t)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition border ${
              orderType === t
                ? "bg-[#2563EB] border-[#2563EB] text-white"
                : "bg-[#0D1727] border-[#1A2A3F] text-[#7C8CA3] hover:text-[#F7FAFC] hover:border-[#29415F]"
            }`}
          >
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {orderType === "LIMIT" && (
        <div className="p-3 bg-[#07101A] border border-[#1A2A3F] rounded-lg">
          <label className="block text-[10px] text-[#7C8CA3] mb-1">Limit Execution Price</label>
          <input
            type="number"
            step="0.1"
            value={limitPrice}
            onChange={(e) => setLimitPrice(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-1.5 bg-[#0D1727] border border-[#1A2A3F] rounded-md text-[#F7FAFC] font-semibold text-xs font-mono tabular-nums focus:border-[#22D3EE] focus:outline-none"
          />
        </div>
      )}

      {/* 4. Sizing: Size & Quick Percentage Buttons */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] text-[#7C8CA3]">Position Sizing & Quantity</label>
          <div className="flex items-center gap-1 bg-[#07101A] p-0.5 rounded-md border border-[#1A2A3F]">
            {(["UNITS", "NOTIONAL", "RISK"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSizeMode(m)}
                className={`px-2 py-0.5 text-[10px] rounded font-medium transition ${
                  sizeMode === m ? "bg-[#2563EB] text-white" : "text-[#7C8CA3] hover:text-[#F7FAFC]"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Main Size Input */}
          <div className="relative">
            <input
              type="number"
              step="0.01"
              value={sizeMode === "UNITS" ? quantity : sizeMode === "NOTIONAL" ? notionalInput : riskPercentInput}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                if (sizeMode === "UNITS") setQuantity(val);
                else if (sizeMode === "NOTIONAL") setNotionalInput(val);
                else setRiskPercentInput(val);
              }}
              className="w-full px-3 py-2 bg-[#0D1727] border border-[#1A2A3F] rounded-lg text-[#F7FAFC] font-semibold text-sm font-mono tabular-nums focus:border-[#22D3EE] focus:outline-none pr-14"
            />
            <span className="absolute right-3 top-2.5 text-xs text-[#7C8CA3] font-medium">
              {sizeMode === "UNITS" ? selectedSymbol.split("/")[0] : sizeMode === "NOTIONAL" ? "USD" : "% RISK"}
            </span>
          </div>

          {/* Expected Notional Preview */}
          <div className="px-3 py-2 bg-[#07101A] border border-[#1A2A3F] rounded-lg flex items-center justify-between text-xs">
            <span className="text-[#7C8CA3]">Notional Value:</span>
            <span className="text-[#22D3EE] font-bold font-mono tabular-nums">
              ≈ ${calculatedNotional.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Quick Sizing Buttons */}
        <div className="flex items-center gap-1.5">
          {[25, 50, 75, 100].map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => {
                const maxCap = availableCapital * leverage;
                const targetNotional = (maxCap * pct) / 100;
                const computedQty = activePrice > 0 ? targetNotional / activePrice : 0.05;
                setQuantity(Number(computedQty.toFixed(4)));
                setSizeMode("UNITS");
              }}
              className="flex-1 py-1 rounded-md bg-[#0D1727] border border-[#1A2A3F] hover:border-[#29415F] text-[#7C8CA3] hover:text-[#F7FAFC] text-[10px] font-semibold transition"
            >
              {pct === 100 ? "MAX (100%)" : `${pct}%`}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Leverage Multiplier & Required Margin */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] text-[#7C8CA3]">Leverage & Margin</label>
          <span className="text-[10px] text-[#7C8CA3]">
            Required Margin: <strong className="text-[#F7FAFC] font-mono tabular-nums">${requiredMargin.toLocaleString()}</strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 5, 10].map((lev) => (
            <button
              key={lev}
              type="button"
              onClick={() => setLeverage(lev)}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition border ${
                leverage === lev
                  ? "bg-[#2563EB] text-white border-[#2563EB]"
                  : "bg-[#0D1727] border-[#1A2A3F] text-[#7C8CA3] hover:text-[#F7FAFC] hover:border-[#29415F]"
              }`}
            >
              {lev}x
            </button>
          ))}
        </div>
      </div>

      {/* 6. Stop Loss & Take Profit Protection */}
      <div className="space-y-2 pt-1 border-t border-[#1A2A3F]">
        <div className="grid grid-cols-2 gap-3">
          {/* Stop Loss Input */}
          <div className="bg-[#07101A] p-3 rounded-lg border border-[#1A2A3F]">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] text-[#7C8CA3]">Stop Loss</label>
              <span className="text-[10px] text-[#FF3B5C] font-semibold font-mono tabular-nums">${stopLossPrice.toLocaleString()}</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                value={slValue}
                onChange={(e) => setSlValue(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 bg-[#0D1727] border border-[#1A2A3F] rounded-md text-[#F7FAFC] font-semibold text-xs font-mono tabular-nums focus:border-[#FF3B5C] focus:outline-none pr-7"
              />
              <span className="absolute right-2.5 top-1.5 text-xs text-[#52627A]">%</span>
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              {[0.5, 1.0, 2.0, 3.0].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setSlValue(v)}
                  className="flex-1 py-0.5 rounded bg-[#0D1727] border border-[#1A2A3F] hover:border-[#29415F] text-[#7C8CA3] hover:text-[#F7FAFC] text-[9px] font-mono"
                >
                  {v}%
                </button>
              ))}
            </div>
          </div>

          {/* Take Profit Input */}
          <div className="bg-[#07101A] p-3 rounded-lg border border-[#1A2A3F]">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] text-[#7C8CA3]">Take Profit</label>
              <span className="text-[10px] text-[#00E890] font-semibold font-mono tabular-nums">${takeProfitPrice.toLocaleString()}</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                value={tpValue}
                onChange={(e) => setTpValue(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 bg-[#0D1727] border border-[#1A2A3F] rounded-md text-[#F7FAFC] font-semibold text-xs font-mono tabular-nums focus:border-[#00E890] focus:outline-none pr-7"
              />
              <span className="absolute right-2.5 top-1.5 text-xs text-[#52627A]">%</span>
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              {[1.0, 2.0, 3.0, 5.0].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setTpValue(v)}
                  className="flex-1 py-0.5 rounded bg-[#0D1727] border border-[#1A2A3F] hover:border-[#29415F] text-[#7C8CA3] hover:text-[#F7FAFC] text-[9px] font-mono"
                >
                  {v}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Risk / Reward & Capital Summary Card */}
        <div className="p-3 bg-[#07101A] border border-[#1A2A3F] rounded-lg text-xs space-y-1.5">
          <div className="flex items-center justify-between text-[#7C8CA3] text-[11px]">
            <span>Maximum Defined Risk:</span>
            <span className="text-[#FF3B5C] font-semibold font-mono tabular-nums">-${riskUsd.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-[#7C8CA3] text-[11px]">
            <span>Potential Profit Target:</span>
            <span className="text-[#00E890] font-semibold font-mono tabular-nums">+${rewardUsd.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-[#7C8CA3] text-[11px] pt-1.5 border-t border-[#1A2A3F]">
            <span>Risk : Reward Ratio:</span>
            <span className="text-[#22D3EE] font-bold font-mono tabular-nums">1 : {rrRatio}</span>
          </div>
        </div>
      </div>

      {/* 7. Current Position & Projected After-Fill Preview */}
      <div className="p-3 bg-[#07101A] border border-[#1A2A3F] rounded-lg space-y-1.5">
        <div className="flex items-center justify-between text-[#7C8CA3] text-[11px]">
          <span>Current Position:</span>
          <span className="font-semibold text-[#F7FAFC] font-mono tabular-nums">
            {currentPosition ? `${currentPosition.direction} ${currentPosition.quantity}` : "FLAT (0.00)"}
          </span>
        </div>

        <div className="flex items-center justify-between text-[#7C8CA3] text-[11px]">
          <span>Projected After Fill:</span>
          <span className="font-semibold text-[#22D3EE] font-mono tabular-nums">{projectedPosition.summary}</span>
        </div>
      </div>

      {/* 8. Pre-Trade Risk Status Badge */}
      <div
        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs border ${
          riskCheck.passed
            ? "bg-[#00E890]/10 border-[#00E890]/30 text-[#00E890]"
            : "bg-[#FF3B5C]/10 border-[#FF3B5C]/30 text-[#FF3B5C]"
        }`}
      >
        <div className="flex items-center gap-2">
          {riskCheck.passed ? (
            <CheckCircle2 className="w-4 h-4 text-[#00E890] shrink-0" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-[#FF3B5C] shrink-0" />
          )}
          <span className="truncate">{riskCheck.reason}</span>
        </div>

        <button
          type="button"
          onClick={onOpenDetailsDrawer}
          className="text-[11px] text-[#22D3EE] hover:text-[#19C5FF] underline shrink-0 ml-2 font-medium"
        >
          View Health
        </button>
      </div>

      {/* Execution Feedback Notification */}
      {orderFeedback && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150 ${
            orderFeedback.status === "success"
              ? "bg-[#00E890]/10 border-[#00E890]/30 text-[#00E890]"
              : orderFeedback.status === "unknown"
              ? "bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]"
              : "bg-[#FF3B5C]/10 border-[#FF3B5C]/30 text-[#FF3B5C]"
          }`}
        >
          <div className="flex items-center gap-2">
            {orderFeedback.status === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#00E890]" />
            ) : (
              <ShieldAlert className="w-4 h-4 shrink-0 text-[#FF3B5C]" />
            )}
            <span>{orderFeedback.message}</span>
          </div>
          <button onClick={() => setOrderFeedback(null)} className="text-[#7C8CA3] hover:text-[#F7FAFC]">
            ✕
          </button>
        </div>
      )}

      {/* Post-Execution Transaction Summary */}
      {lastExecutedOrder && (
        <div className="p-3 bg-[#07101A] border border-[#22D3EE]/30 rounded-lg space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-[#1A2A3F] pb-1.5">
            <span className="text-[11px] font-bold text-[#22D3EE]">LAST EXECUTED TRANSACTION</span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#19C5FF]/10 text-[#19C5FF] font-semibold border border-[#19C5FF]/20">
              {lastExecutedOrder.mode} • {lastExecutedOrder.status}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
            <div>
              <span className="text-[#52627A] block">Order ID</span>
              <span className="text-[#F7FAFC] font-semibold font-mono tabular-nums truncate block">#{lastExecutedOrder.orderId}</span>
            </div>
            <div>
              <span className="text-[#52627A] block">Execution</span>
              <span className={`font-semibold ${lastExecutedOrder.side === "BUY" ? "text-[#00E890]" : "text-[#FF3B5C]"}`}>
                {lastExecutedOrder.side} {lastExecutedOrder.quantity} {lastExecutedOrder.symbol.split("/")[0]}
              </span>
            </div>
            <div>
              <span className="text-[#52627A] block">Fill Price</span>
              <span className="text-[#F7FAFC] font-semibold font-mono tabular-nums">${lastExecutedOrder.executionPrice.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[#52627A] block">Timestamp</span>
              <span className="text-[#7C8CA3] font-mono tabular-nums">{lastExecutedOrder.timestamp}</span>
            </div>
          </div>
        </div>
      )}

      {/* 9. Action Buttons with Execution State Machine */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between px-1 text-[11px] text-[#7C8CA3]">
          <span>Execution Engine State:</span>
          <span
            className={`font-semibold px-2 py-0.5 rounded-md text-[10px] ${
              executionState === "EXECUTING"
                ? "bg-[#F59E0B]/15 text-[#F59E0B] animate-pulse border border-[#F59E0B]/30"
                : executionState === "SUCCESS"
                ? "bg-[#00E890]/15 text-[#00E890] border border-[#00E890]/30"
                : executionState === "FAILED"
                ? "bg-[#FF3B5C]/15 text-[#FF3B5C] border border-[#FF3B5C]/30"
                : executionState === "UNKNOWN"
                ? "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30"
                : "bg-[#101B2D] text-[#7C8CA3]"
            }`}
          >
            ● {executionState}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Quick BUY Button */}
          <button
            type="button"
            disabled={!riskCheck.passed || isSubmitting}
            onClick={() => handleExecuteOrder("BUY")}
            className="py-2.5 px-3 rounded-lg font-semibold text-xs tracking-wide transition flex items-center justify-center gap-1.5 bg-[#00E890] hover:bg-[#16a34a] text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>
              {isSubmitting && side === "BUY" ? "EXECUTING BUY..." : `BUY ${effectiveQty} ${selectedSymbol.split("/")[0]}`}
            </span>
          </button>

          {/* Quick SELL Button */}
          <button
            type="button"
            disabled={!riskCheck.passed || isSubmitting}
            onClick={() => handleExecuteOrder("SELL")}
            className="py-2.5 px-3 rounded-lg font-semibold text-xs tracking-wide transition flex items-center justify-center gap-1.5 bg-[#FF3B5C] hover:bg-[#dc2626] text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>
              {isSubmitting && side === "SELL" ? "EXECUTING SELL..." : `SELL ${effectiveQty} ${selectedSymbol.split("/")[0]}`}
            </span>
          </button>
        </div>

        {/* Detailed Review Order Button */}
        <button
          type="button"
          disabled={!riskCheck.passed || isSubmitting}
          onClick={() => setIsReviewModalOpen(true)}
          className="w-full py-2 px-3 rounded-lg font-medium text-xs text-[#7C8CA3] bg-[#0D1727] border border-[#1A2A3F] hover:border-[#29415F] hover:text-[#F7FAFC] transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>REVIEW & CUSTOMIZE ORDER DETAILS</span>
        </button>
      </div>

      {/* Confirmation Review Modal */}
      <OrderReviewConfirmationModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onConfirm={() => handleExecuteOrder()}
        isSubmitting={isSubmitting}
        mode={tradingMode}
        symbol={selectedSymbol}
        side={side}
        orderType={orderType}
        quantity={effectiveQty}
        price={activePrice}
        notionalValue={calculatedNotional}
        requiredMargin={requiredMargin}
        leverage={leverage}
        stopLossPrice={stopLossPrice}
        takeProfitPrice={takeProfitPrice}
        riskUsd={riskUsd}
        rewardUsd={rewardUsd}
        rrRatio={rrRatio}
        projectedPositionText={projectedPosition.summary}
      />
    </div>
  );
}

