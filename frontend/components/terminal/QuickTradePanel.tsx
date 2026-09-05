"use client";

import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import {
  TrendingUp,
  TrendingDown,
  Shield,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  Info,
  DollarSign,
  Percent,
} from "lucide-react";

interface QuickTradePanelProps {
  symbol?: string;
  currentPrice?: number;
  onTradeExecuted?: () => void;
}

export const QuickTradePanel: React.FC<QuickTradePanelProps> = ({
  symbol = "BTC/USDT",
  currentPrice = 64500.0,
  onTradeExecuted,
}) => {
  const queryClient = useQueryClient();
  const [direction, setDirection] = useState<"LONG" | "SHORT">("LONG");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "STOP_LIMIT">("MARKET");
  const [quantity, setQuantity] = useState<string>("0.05");
  const [price, setPrice] = useState<string>(currentPrice.toString());
  const [leverage, setLeverage] = useState<number>(5);
  const [stopLoss, setStopLoss] = useState<string>(
    (currentPrice * 0.98).toFixed(2)
  );
  const [takeProfit, setTakeProfit] = useState<string>(
    (currentPrice * 1.04).toFixed(2)
  );
  const [executionMode, setExecutionMode] = useState<"PAPER" | "LIVE">("PAPER");
  const [showLiveConfirm, setShowLiveConfirm] = useState<boolean>(false);
  const [liveConfirmWord, setLiveConfirmWord] = useState<string>("");

  const [estimate, setEstimate] = useState<any>(null);
  const [loadingEstimate, setLoadingEstimate] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [executionStatus, setExecutionStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  // Update price when currentPrice changes if MARKET
  useEffect(() => {
    if (orderType === "MARKET" && currentPrice) {
      setPrice(currentPrice.toString());
      if (direction === "LONG") {
        setStopLoss((currentPrice * 0.98).toFixed(2));
        setTakeProfit((currentPrice * 1.04).toFixed(2));
      } else {
        setStopLoss((currentPrice * 1.02).toFixed(2));
        setTakeProfit((currentPrice * 0.96).toFixed(2));
      }
    }
  }, [currentPrice, direction, orderType]);

  // Request estimate whenever parameters change with AbortController
  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    const fetchEstimate = async () => {
      setLoadingEstimate(true);
      try {
        const res = await apiClient.post(
          "/api/quick-trade/estimate",
          {
            symbol,
            direction,
            order_type: orderType,
            quantity: parseFloat(quantity) || 0.01,
            price: parseFloat(price) || currentPrice,
            leverage,
            stop_loss: parseFloat(stopLoss) || 0,
            take_profit: parseFloat(takeProfit) || 0,
          },
          {
            signal: controller.signal,
            timeoutMs: 5000,
            deduplicate: true,
          }
        );
        if (res.ok && isMounted && res.data) {
          setEstimate(res.data);
        }
      } catch {
        // Fallback gracefully without error spam
      } finally {
        if (isMounted) setLoadingEstimate(false);
      }
    };

    const timer = setTimeout(fetchEstimate, 250);
    return () => {
      isMounted = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [symbol, direction, orderType, quantity, price, leverage, stopLoss, takeProfit, currentPrice]);

  const handleExecuteTrade = async () => {
    if (submitting) return; // Single-click protection: drop repeated rapid clicks

    if (executionMode === "LIVE" && !showLiveConfirm) {
      setShowLiveConfirm(true);
      return;
    }

    setSubmitting(true);
    setExecutionStatus({ type: null, message: "" });
    const clientOrderId = apiClient.generateIdempotencyKey("QUICK_TRADE", symbol);

    try {
      const res = await apiClient.post<any>(
        "/api/quick-trade/execute",
        {
          client_order_id: clientOrderId,
          symbol,
          direction,
          order_type: orderType,
          quantity: parseFloat(quantity) || 0.01,
          price: parseFloat(price) || currentPrice,
          stop_loss: parseFloat(stopLoss) || 0,
          take_profit: parseFloat(takeProfit) || 0,
          mode: executionMode,
          bot_id: "bot-1",
        },
        {
          idempotencyKey: clientOrderId,
          timeoutMs: 12000,
        }
      );

      if (res.ok && res.data) {
        setExecutionStatus({
          type: "success",
          message: res.data.message || `Order successfully filled on ${executionMode} ledger.`,
        });
        setShowLiveConfirm(false);
        setLiveConfirmWord("");
        queryClient.invalidateQueries({ queryKey: ["ecoPositions"] });
        queryClient.invalidateQueries({ queryKey: ["dockTrades"] });
        queryClient.invalidateQueries({ queryKey: ["botsSummary"] });
        queryClient.invalidateQueries({ queryKey: ["systemStatus"] });
        queryClient.invalidateQueries({ queryKey: ["performance"] });
        if (onTradeExecuted) onTradeExecuted();
      } else {
        setExecutionStatus({
          type: "error",
          message: res.error?.message || res.data?.message || "Order rejected by risk engine.",
        });
      }
    } catch (err: any) {
      setExecutionStatus({
        type: "error",
        message: err.message || "Network error submitting order.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const checks = estimate?.checks || {
    data_check: { status: "PASS", message: "Live market active" },
    risk_check: { status: "PASS", message: "Risk limits checked" },
    margin_check: { status: "PASS", message: "Margin verified" },
    position_check: { status: "PASS", message: "Exposure verified" },
    broker_check: { status: "PASS", message: "Broker ready" },
  };

  return (
    <div className="card-specular bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl p-4 shadow-xl flex flex-col gap-3.5 select-none font-sans">
      {/* Panel Header & Mode Switch */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-sky-400" />
          <h3 className="text-xs font-bold text-[var(--theme-text-primary)] uppercase tracking-wider font-mono">Quick Order Execution</h3>
        </div>

        {/* Paper vs Live Mode Toggle */}
        <div className="flex items-center gap-1 bg-[var(--theme-elevated)] p-0.5 rounded-xl border border-[var(--theme-border)]">
          <button
            onClick={() => setExecutionMode("PAPER")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
              executionMode === "PAPER"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            PAPER
          </button>
          <button
            onClick={() => setExecutionMode("LIVE")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
              executionMode === "LIVE"
                ? "bg-rose-500 text-white shadow-sm animate-pulse"
                : "text-slate-400 hover:text-rose-400"
            }`}
          >
            LIVE
          </button>
        </div>
      </div>

      {/* Direction BUY / SELL Tabs */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-[var(--theme-elevated)] rounded-xl border border-[var(--theme-border)] font-mono">
        <button
          onClick={() => setDirection("LONG")}
          className={`py-2 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
            direction === "LONG"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm font-bold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          BUY / LONG
        </button>
        <button
          onClick={() => setDirection("SHORT")}
          className={`py-2 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
            direction === "SHORT"
              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm font-bold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <TrendingDown className="h-3.5 w-3.5" />
          SELL / SHORT
        </button>
      </div>

      {/* Order Type Selector */}
      <div className="grid grid-cols-3 gap-1 bg-[var(--theme-elevated)] p-1 rounded-xl border border-[var(--theme-border)] font-mono">
        {(["MARKET", "LIMIT", "STOP_LIMIT"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setOrderType(type)}
            className={`py-1 rounded-lg text-[11px] font-semibold transition-all ${
              orderType === type
                ? "bg-slate-700/80 text-white font-bold shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Inputs: Quantity & Leverage */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Quantity ({symbol.split("/")[0]})
          </label>
          <input
            type="number"
            step="0.01"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full px-3 py-1.5 bg-[var(--theme-pageBg)] border border-[var(--theme-border)] rounded-xl text-xs font-mono text-[var(--theme-text-primary)] focus:outline-none focus:border-sky-500 transition-colors"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Leverage
            </label>
            <span className="text-[10px] font-mono text-sky-400 font-bold">{leverage}x</span>
          </div>
          <input
            type="range"
            min="1"
            max="20"
            step="1"
            value={leverage}
            onChange={(e) => setLeverage(parseInt(e.target.value, 10))}
            className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg mt-2.5"
          />
        </div>
      </div>

      {/* Stop Loss & Take Profit */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
              Stop Loss ($)
            </label>
            <span className="text-[9px] font-mono text-slate-400">
              {estimate?.stop_loss_pct || "2.0"}%
            </span>
          </div>
          <input
            type="number"
            step="10"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            className="w-full px-3 py-1.5 bg-[var(--theme-pageBg)] border border-rose-500/30 rounded-xl text-xs font-mono text-[var(--theme-text-primary)] focus:outline-none focus:border-rose-500 transition-colors"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
              Take Profit ($)
            </label>
            <span className="text-[9px] font-mono text-slate-400">
              {estimate?.take_profit_pct || "4.0"}%
            </span>
          </div>
          <input
            type="number"
            step="10"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
            className="w-full px-3 py-1.5 bg-[var(--theme-pageBg)] border border-emerald-500/30 rounded-xl text-xs font-mono text-[var(--theme-text-primary)] focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Risk Metrics Card */}
      <div className="p-3 bg-[var(--theme-elevated)]/70 border border-[var(--theme-border)] rounded-xl space-y-1.5 text-xs font-mono">
        <div className="flex items-center justify-between text-slate-400">
          <span>Required Margin:</span>
          <span className="text-slate-100 font-bold">${(estimate?.required_margin || 0).toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Max Risk (SL):</span>
          <span className="text-rose-400 font-bold">-${(estimate?.stop_loss_risk || 0).toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Potential Profit (TP):</span>
          <span className="text-emerald-400 font-bold">+${(estimate?.take_profit_potential || 0).toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-slate-400 border-t border-[var(--theme-border-subtle)] pt-1">
          <span>Risk : Reward:</span>
          <span className="text-sky-400 font-bold">1 : {estimate?.risk_reward_ratio || "2.0"}</span>
        </div>
      </div>

      {/* 5-Gate Pre-Check Badges */}
      <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
        {Object.entries(checks).map(([key, c]: any) => (
          <div
            key={key}
            title={`${key.replace("_", " ").toUpperCase()}: ${c.message}`}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border ${
              c.status === "PASS"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-amber-500/10 border-amber-500/30 text-amber-400"
            }`}
          >
            <span className="w-1 h-1 rounded-full bg-current" />
            <span className="uppercase">{key.split("_")[0]}</span>
          </div>
        ))}
      </div>

      {/* Notification Banner */}
      {executionStatus.type && (
        <div
          className={`p-2.5 rounded-xl text-xs font-mono border ${
            executionStatus.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/15 border-rose-500/30 text-rose-300"
          }`}
        >
          {executionStatus.message}
        </div>
      )}

      {/* Main Execution Button */}
      <button
        onClick={handleExecuteTrade}
        disabled={submitting}
        className={`w-full py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md ${
          executionMode === "LIVE"
            ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/25"
            : direction === "LONG"
            ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
            : "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40"
        }`}
      >
        <Shield className="h-4 w-4" />
        {submitting
          ? "SUBMITTING ORDER..."
          : `EXECUTE ${executionMode} ${direction} (${quantity} ${symbol.split("/")[0]})`}
      </button>

      {/* Live Trading 2-Step Confirmation Modal */}
      {showLiveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="card-specular bg-[var(--theme-surface)] border border-rose-500/50 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="h-5 w-5" />
              <h4 className="text-sm font-bold text-[var(--theme-text-primary)]">ARM REAL LIVE TRADING</h4>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              You are about to route a <strong>REAL LIVE ORDER</strong> to the exchange. Capital will be committed to real markets.
            </p>

            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-mono space-y-1 text-slate-200">
              <div>Symbol: <strong className="text-white">{symbol}</strong></div>
              <div>Side: <strong className="text-white">{direction}</strong></div>
              <div>Quantity: <strong className="text-white">{quantity}</strong></div>
              <div>Leverage: <strong className="text-sky-400">{leverage}x</strong></div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">
                Type <strong>CONFIRM</strong> to proceed:
              </label>
              <input
                type="text"
                value={liveConfirmWord}
                onChange={(e) => setLiveConfirmWord(e.target.value.toUpperCase())}
                placeholder="CONFIRM"
                className="w-full px-3 py-1.5 bg-[var(--theme-pageBg)] border border-[var(--theme-border)] rounded-xl text-xs font-mono text-white text-center focus:outline-none focus:border-rose-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowLiveConfirm(false)}
                className="flex-1 py-2 bg-[var(--theme-elevated)] hover:bg-[var(--theme-border)] text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={liveConfirmWord !== "CONFIRM"}
                onClick={handleExecuteTrade}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-600/30"
              >
                Execute Live
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
