"use client";

import React, { useState, useEffect } from "react";
import { X, ShieldCheck, Zap, AlertCircle, CheckCircle2 } from "lucide-react";
import { useNseTradeExecution } from "@/hooks/useNseData";

interface NseQuickOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSymbol?: string;
  defaultStrike?: number;
  defaultOptionType?: "CE" | "PE";
  defaultPrice?: number;
  defaultSide?: "BUY" | "SELL";
}

export function NseQuickOrderModal({
  isOpen,
  onClose,
  defaultSymbol = "NIFTY",
  defaultStrike,
  defaultOptionType = "CE",
  defaultPrice = 100.0,
  defaultSide = "BUY",
}: NseQuickOrderModalProps) {
  const [side, setSide] = useState<"BUY" | "SELL">(defaultSide);
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [lots, setLots] = useState(1);
  const [price, setPrice] = useState(defaultPrice);
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [tradingMode, setTradingMode] = useState<"PAPER" | "LIVE">("PAPER");
  const [stopLoss, setStopLoss] = useState<number | undefined>(undefined);
  const [takeProfit, setTakeProfit] = useState<number | undefined>(undefined);

  const [feedback, setFeedback] = useState<{ status: "success" | "error"; message: string } | null>(null);

  const tradeMutation = useNseTradeExecution();

  useEffect(() => {
    setSide(defaultSide);
    if (defaultStrike) {
      setSymbol(`${defaultSymbol} ${defaultStrike} ${defaultOptionType}`);
    } else {
      setSymbol(defaultSymbol);
    }
    setPrice(defaultPrice);
  }, [defaultSymbol, defaultStrike, defaultOptionType, defaultPrice, defaultSide]);

  if (!isOpen) return null;

  // Auto Lot Size multiplier for Indian indices
  const lotMultiplier = symbol.includes("BANKNIFTY")
    ? 15
    : symbol.includes("FINNIFTY")
    ? 25
    : symbol.includes("MIDCPNIFTY")
    ? 75
    : symbol.includes("NIFTY")
    ? 50
    : 1;

  const totalQuantity = lots * lotMultiplier;
  const estimatedCapital = totalQuantity * price;

  const handleExecute = () => {
    setFeedback(null);
    tradeMutation.mutate(
      {
        symbol,
        direction: side,
        quantity: totalQuantity,
        price: orderType === "LIMIT" ? price : undefined,
        order_type: orderType,
        stop_loss: stopLoss,
        take_profit: takeProfit,
        mode: tradingMode,
        bot_id: "nse-algo-terminal",
        strategy: "NSE_OPTIONS_FLOW",
      },
      {
        onSuccess: (data) => {
          setFeedback({ status: "success", message: data.message });
          setTimeout(() => {
            onClose();
          }, 1500);
        },
        onError: (err: any) => {
          setFeedback({ status: "error", message: err.message || "Failed to execute order" });
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0B132B] border border-cyan-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl shadow-cyan-950/40 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white font-mono">NSE Institutional Order</h3>
            <p className="text-xs text-slate-400">Algorithmic Router & Greeks Safety Layer</p>
          </div>
        </div>

        {/* Buy / Sell Selector */}
        <div className="grid grid-cols-2 gap-2 mb-4 p-1 bg-slate-900/80 rounded-xl border border-slate-800">
          <button
            onClick={() => setSide("BUY")}
            className={`py-2 text-xs font-bold font-mono rounded-lg transition ${
              side === "BUY" ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20" : "text-slate-400 hover:text-white"
            }`}
          >
            BUY (LONG)
          </button>
          <button
            onClick={() => setSide("SELL")}
            className={`py-2 text-xs font-bold font-mono rounded-lg transition ${
              side === "SELL" ? "bg-rose-500 text-white shadow-md shadow-rose-500/20" : "text-slate-400 hover:text-white"
            }`}
          >
            SELL (SHORT)
          </button>
        </div>

        {/* Form Fields */}
        <div className="space-y-4 font-mono text-sm">
          {/* Symbol */}
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-sans">Instrument Symbol</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-white font-bold focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* Lots & Quantity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-sans">
                Lots ({lotMultiplier} qty/lot)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={lots}
                onChange={(e) => setLots(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-white font-bold focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-sans">Total Units</label>
              <div className="px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-cyan-300 font-bold">
                {totalQuantity} Qty
              </div>
            </div>
          </div>

          {/* Order Type & Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-sans">Order Type</label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-white font-bold focus:border-cyan-400 focus:outline-none"
              >
                <option value="MARKET">MARKET</option>
                <option value="LIMIT">LIMIT</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-sans">Price (₹)</label>
              <input
                type="number"
                step="0.05"
                value={price}
                disabled={orderType === "MARKET"}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-white font-bold disabled:opacity-60 focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Risk Limits (SL & TP) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-rose-400 mb-1 font-sans">Stop Loss (₹)</label>
              <input
                type="number"
                step="0.05"
                placeholder="Optional"
                value={stopLoss || ""}
                onChange={(e) => setStopLoss(e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full px-3 py-2 bg-slate-900/90 border border-rose-950 rounded-lg text-rose-300 font-bold focus:border-rose-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-emerald-400 mb-1 font-sans">Take Profit (₹)</label>
              <input
                type="number"
                step="0.05"
                placeholder="Optional"
                value={takeProfit || ""}
                onChange={(e) => setTakeProfit(e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full px-3 py-2 bg-slate-900/90 border border-emerald-950 rounded-lg text-emerald-300 font-bold focus:border-emerald-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Mode Selector */}
          <div className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 font-sans">Execution Mode:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setTradingMode("PAPER")}
                className={`px-2.5 py-1 text-xs font-bold rounded-md ${
                  tradingMode === "PAPER" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"
                }`}
              >
                PAPER
              </button>
              <button
                onClick={() => setTradingMode("LIVE")}
                className={`px-2.5 py-1 text-xs font-bold rounded-md ${
                  tradingMode === "LIVE" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
                }`}
              >
                LIVE
              </button>
            </div>
          </div>

          {/* Capital Requirement Estimate */}
          <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-400 font-sans">Estimated Turnover / Margin:</span>
            <span className="font-bold text-cyan-300">₹{estimatedCapital.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>

          {/* Feedback message */}
          {feedback && (
            <div
              className={`p-3 rounded-xl flex items-center gap-2 text-xs ${
                feedback.status === "success"
                  ? "bg-emerald-950/60 border border-emerald-500/40 text-emerald-300"
                  : "bg-rose-950/60 border border-rose-500/40 text-rose-300"
              }`}
            >
              {feedback.status === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleExecute}
            disabled={tradeMutation.isPending}
            className={`w-full py-3 rounded-xl font-bold text-sm tracking-wider font-mono transition flex items-center justify-center gap-2 ${
              side === "BUY"
                ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20"
                : "bg-rose-500 hover:bg-rose-400 text-white shadow-lg shadow-rose-500/20"
            }`}
          >
            {tradeMutation.isPending ? (
              <span className="animate-pulse">ROUTING ORDER...</span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                EXECUTE {side} {symbol} [{tradingMode}]
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
