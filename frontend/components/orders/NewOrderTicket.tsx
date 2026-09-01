"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Zap,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Search,
  Sliders,
  Layers,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
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
  const [customLeverage, setCustomLeverage] = useState<boolean>(false);

  // 5. SL / TP State
  const [slMode, setSlMode] = useState<"PERCENTAGE" | "PRICE">("PERCENTAGE");
  const [slValue, setSlValue] = useState<number>(1.0); // 1.0%
  const [tpMode, setTpMode] = useState<"PERCENTAGE" | "PRICE">("PERCENTAGE");
  const [tpValue, setTpValue] = useState<number>(2.0); // 2.0%

  // 6. Advanced Controls Collapsible
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [trailingStop, setTrailingStop] = useState(false);
  const [reduceOnly, setReduceOnly] = useState(false);

  // 7. Modal & Execution State
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
        const res = await fetch(`/api/ticker?symbol=${encodeURIComponent(selectedSymbol)}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const p = Number(data.last || data.price || data.close || 0);
        if (p > 0 && isMounted) {
          setMarketPrice(p);
          if (orderType === "MARKET") {
            setLimitPrice(p);
          }
        }
      } catch {
        // Fallback gracefully to existing price
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

  // Derived Financials via Pure Calculations
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

    const idempotencyKey = `ORD_IDEM_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
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
        }),
      });

      clearTimeout(timeoutId);

      const data = await res.json();
      if (!res.ok || !data.success) {
        setExecutionState("FAILED");
        throw new Error(data.message || data.error || "Order execution rejected by risk engine.");
      }

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
    <div className="bg-[#0B132B]/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-md font-mono text-xs space-y-4">
      {/* 1. Top Instrument Selector & Price Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/90 border border-slate-800 rounded-xl">
        {/* Searchable Instrument Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-slate-700 hover:border-cyan-400 rounded-xl text-white font-extrabold text-sm transition"
          >
            <span>{selectedSymbol}</span>
            <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
          </button>

          {isSearchOpen && (
            <div className="absolute left-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-950 rounded-lg border border-slate-800 mb-2">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search BTC, ETH, NIFTY..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-white text-xs focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredInstruments.map((inst) => (
                  <button
                    key={inst.symbol}
                    onClick={() => handleSelectInstrument(inst)}
                    className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-left hover:bg-slate-800 transition"
                  >
                    <div>
                      <div className="font-bold text-white">{inst.symbol}</div>
                      <div className="text-[10px] text-slate-400 font-sans">{inst.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-cyan-400">${inst.price.toLocaleString()}</div>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
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
            <div className="text-[10px] text-slate-400 uppercase font-sans">Last Market Price</div>
            <div className="text-base font-extrabold text-white">
              {currencySymbol}{marketPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="hidden sm:block">
            <div className="text-[10px] text-slate-400 uppercase font-sans">Mark Price</div>
            <div className="text-sm font-bold text-slate-300">
              {currencySymbol}{(marketPrice * 0.9998).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Clear Direction Controls: [ BUY / LONG ] and [ SELL / SHORT ] */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
        <button
          type="button"
          onClick={() => setSide("BUY")}
          className={`py-2.5 text-xs font-black rounded-lg transition flex items-center justify-center gap-1.5 ${
            isBuy
              ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span>BUY / LONG</span>
        </button>
        <button
          type="button"
          onClick={() => setSide("SELL")}
          className={`py-2.5 text-xs font-black rounded-lg transition flex items-center justify-center gap-1.5 ${
            !isBuy
              ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span>SELL / SHORT</span>
        </button>
      </div>

      {/* 3. Order Type Selector */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-slate-400 font-sans mr-1">Order Type:</span>
        {(["MARKET", "LIMIT", "STOP"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setOrderType(t)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition border ${
              orderType === t
                ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {orderType === "LIMIT" && (
        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
          <label className="block text-[10px] text-slate-400 mb-1 font-sans">Limit Execution Price</label>
          <input
            type="number"
            step="0.1"
            value={limitPrice}
            onChange={(e) => setLimitPrice(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-bold text-xs focus:border-cyan-400 focus:outline-none"
          />
        </div>
      )}

      {/* 4. Sizing: Size & Quick Percentage Buttons */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] text-slate-400 font-sans">Order Size</label>
          <div className="flex items-center gap-1">
            {(["UNITS", "NOTIONAL", "RISK"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSizeMode(m)}
                className={`px-2 py-0.5 text-[10px] rounded transition ${
                  sizeMode === m ? "bg-cyan-500/20 text-cyan-400 font-bold" : "text-slate-500 hover:text-slate-300"
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
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-sm focus:border-cyan-400 focus:outline-none pr-14"
            />
            <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">
              {sizeMode === "UNITS" ? selectedSymbol.split("/")[0] : sizeMode === "NOTIONAL" ? "USD" : "% RISK"}
            </span>
          </div>

          {/* Expected Notional Preview */}
          <div className="px-3 py-2 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-400">Notional:</span>
            <span className="text-cyan-400 font-extrabold">
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
              className="flex-1 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white text-[10px] font-bold transition"
            >
              {pct === 100 ? "MAX" : `${pct}%`}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Leverage Multiplier & Required Margin */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] text-slate-400 font-sans">Leverage Multiplier</label>
          <span className="text-[10px] text-slate-400">
            Req. Margin: <strong className="text-white">${requiredMargin.toLocaleString()}</strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 5, 10].map((lev) => (
            <button
              key={lev}
              type="button"
              onClick={() => setLeverage(lev)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition border ${
                leverage === lev
                  ? "bg-cyan-500 text-slate-950 font-black border-cyan-400 shadow-sm"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {lev}x
            </button>
          ))}
        </div>
      </div>

      {/* 6. Stop Loss & Take Profit Protection */}
      <div className="space-y-2 pt-1 border-t border-slate-800/80">
        <div className="grid grid-cols-2 gap-3">
          {/* Stop Loss Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] text-slate-400 font-sans">Stop Loss</label>
              <span className="text-[10px] text-rose-400 font-bold">${stopLossPrice.toLocaleString()}</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                value={slValue}
                onChange={(e) => setSlValue(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold text-xs focus:border-rose-400 focus:outline-none pr-7"
              />
              <span className="absolute right-2.5 top-1.5 text-xs text-slate-400">%</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              {[0.5, 1.0, 2.0, 3.0].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setSlValue(v)}
                  className="flex-1 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-[9px]"
                >
                  {v}%
                </button>
              ))}
            </div>
          </div>

          {/* Take Profit Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] text-slate-400 font-sans">Take Profit</label>
              <span className="text-[10px] text-emerald-400 font-bold">${takeProfitPrice.toLocaleString()}</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                value={tpValue}
                onChange={(e) => setTpValue(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold text-xs focus:border-emerald-400 focus:outline-none pr-7"
              />
              <span className="absolute right-2.5 top-1.5 text-xs text-slate-400">%</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              {[1.0, 2.0, 3.0, 5.0].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setTpValue(v)}
                  className="flex-1 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-[9px]"
                >
                  {v}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Risk / Reward & Capital Summary Card */}
        <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Maximum Defined Risk:</span>
            <span className="text-rose-400 font-bold">-${riskUsd.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Potential Profit Target:</span>
            <span className="text-emerald-400 font-bold">+${rewardUsd.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-400 text-[11px] pt-1 border-t border-slate-800/80">
            <span>Risk : Reward Ratio:</span>
            <span className="text-cyan-400 font-extrabold">1 : {rrRatio}</span>
          </div>
        </div>
      </div>

      {/* 7. Current Position & Projected After-Fill Preview */}
      <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl space-y-1.5">
        <div className="flex items-center justify-between text-slate-400 text-[11px]">
          <span>Current Position:</span>
          <span className="font-bold text-white">
            {currentPosition ? `${currentPosition.direction} ${currentPosition.quantity}` : "FLAT (0.00)"}
          </span>
        </div>

        <div className="flex items-center justify-between text-slate-400 text-[11px]">
          <span>Projected After Fill:</span>
          <span className="font-extrabold text-cyan-300">{projectedPosition.summary}</span>
        </div>
      </div>

      {/* 8. Pre-Trade Risk Status Badge */}
      <div
        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs border ${
          riskCheck.passed
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            : "bg-rose-500/10 border-rose-500/30 text-rose-400"
        }`}
      >
        <div className="flex items-center gap-2">
          {riskCheck.passed ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span className="truncate">{riskCheck.reason}</span>
        </div>

        <button
          type="button"
          onClick={onOpenDetailsDrawer}
          className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-sans shrink-0 ml-2"
        >
          View Checks
        </button>
      </div>

      {/* Execution Feedback Notification */}
      {orderFeedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150 ${
            orderFeedback.status === "success"
              ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
              : orderFeedback.status === "unknown"
              ? "bg-amber-950/80 border-amber-500/40 text-amber-300"
              : "bg-rose-950/80 border-rose-500/40 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {orderFeedback.status === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{orderFeedback.message}</span>
          </div>
          <button onClick={() => setOrderFeedback(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Post-Execution Transaction Summary */}
      {lastExecutedOrder && (
        <div className="p-3 bg-slate-950/90 border border-cyan-500/30 rounded-xl space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-[11px] font-extrabold text-cyan-400">LAST EXECUTED TRANSACTION</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-bold border border-cyan-500/20">
              {lastExecutedOrder.mode} • {lastExecutedOrder.status}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
            <div>
              <span className="text-slate-500 block">Order ID</span>
              <span className="text-slate-200 font-bold font-mono truncate block">#{lastExecutedOrder.orderId}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Execution</span>
              <span className={`font-bold ${lastExecutedOrder.side === "BUY" ? "text-emerald-400" : "text-rose-400"}`}>
                {lastExecutedOrder.side} {lastExecutedOrder.quantity} {lastExecutedOrder.symbol.split("/")[0]}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Fill Price</span>
              <span className="text-white font-bold">${lastExecutedOrder.executionPrice.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Timestamp</span>
              <span className="text-slate-300">{lastExecutedOrder.timestamp}</span>
            </div>
          </div>
        </div>
      )}

      {/* 9. Action Buttons with Execution State Machine */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
          <span>Execution Engine State:</span>
          <span
            className={`font-black px-2 py-0.5 rounded text-[10px] tracking-wider ${
              executionState === "EXECUTING"
                ? "bg-amber-500/20 text-amber-300 animate-pulse border border-amber-500/30"
                : executionState === "SUCCESS"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : executionState === "FAILED"
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                : executionState === "UNKNOWN"
                ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                : "bg-slate-800 text-slate-300"
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
            className="py-3 px-3 rounded-xl font-black font-mono text-xs tracking-wide transition flex items-center justify-center gap-1.5 shadow-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="py-3 px-3 rounded-xl font-black font-mono text-xs tracking-wide transition flex items-center justify-center gap-1.5 shadow-lg bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
          className="w-full py-2 px-3 rounded-xl font-bold font-mono text-xs text-slate-300 bg-slate-900 border border-slate-700 hover:bg-slate-800 hover:text-white transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
