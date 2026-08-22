"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shield,
  Zap,
  RefreshCw,
  Search,
  Sliders,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import { PreOrderRiskCheckResult } from "@/types/risk";

export function SafetyGatesPanel() {
  const [symbol, setSymbol] = useState("BTC/USDT");
  const [side, setSide] = useState<"LONG" | "SHORT">("LONG");
  const [quantity, setQuantity] = useState<number>(0.05);
  const [entryPrice, setEntryPrice] = useState<number>(65420.0);
  const [stopLoss, setStopLoss] = useState<number>(64200.0);
  const [takeProfit, setTakeProfit] = useState<number>(67800.0);
  const [leverage, setLeverage] = useState<number>(1.0);

  const [previewResult, setPreviewResult] = useState<PreOrderRiskCheckResult | null>(null);

  // 14 Standard Pre-Order Gates
  const gateStages = [
    { id: "1_auth", label: "1. Authentication & API Signature", desc: "Verifies broker credentials & permission scope" },
    { id: "2_instrument", label: "2. Instrument Specification", desc: "Validates canonical symbol format & tick size" },
    { id: "3_market_status", label: "3. Market Trading Hours", desc: "Confirms trading session is active and liquid" },
    { id: "4_data_freshness", label: "4. Data Freshness (< 60s)", desc: "Rejects stale ticks beyond max allowable age" },
    { id: "5_price_sanity", label: "5. Price Sanity & Positivity", desc: "Asserts non-zero, non-NaN positive quotes" },
    { id: "6_spread_liquidity", label: "6. Bid/Ask Spread Cap", desc: "Prevents execution in abnormal slippage illiquidity" },
    { id: "7_position_size", label: "7. Position Size Risk Cap", desc: "Enforces max allowable risk % per single trade" },
    { id: "8_margin", label: "8. Collateral & Margin Check", desc: "Ensures margin is available after reserve cash" },
    { id: "9_leverage", label: "9. Leverage Bound Guard", desc: "Caps maximum multiplier within asset limits" },
    { id: "10_correlated_exposure", label: "10. Asset Concentration (30%)", desc: "Guards against excessive single-asset risk" },
    { id: "11_daily_loss", label: "11. Daily Loss Lockout", desc: "Hard halt if day's losses hit safety threshold" },
    { id: "12_portfolio_drawdown", label: "12. Peak-to-Trough Drawdown", desc: "Protects overall account equity high-water mark" },
    { id: "13_loss_streak", label: "13. Consecutive Loss Cooldown", desc: "Enforces cooling-off after consecutive stop-outs" },
    { id: "14_duplicate_order", label: "14. Duplicate In-Flight Guard", desc: "Blocks accidental double-dispatch collisions" },
  ];

  // Pre-Order Evaluation Mutation
  const precheckMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        trade: {
          symbol,
          direction: side,
          quantity,
          entry_price: entryPrice,
          stop_loss: stopLoss,
          take_profit: takeProfit,
          leverage,
          asset_class: "crypto",
          data_age_seconds: 4.2,
          spread_pct: 0.04,
        },
        account_state: {
          balance: 10000.0,
          available_capital: 6800.0,
          daily_pnl: 286.10,
        },
      };

      const res = await fetch("/api/risk/precheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res.json();
    },
    onSuccess: (data: PreOrderRiskCheckResult) => {
      setPreviewResult(data);
    },
  });

  return (
    <div className="space-y-4 font-sans select-none">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            14-Stage Pre-Order Risk Gate & Live Order Preview
          </h3>
          <p className="text-[11px] text-[#A8BDB0]">
            Every order must clear all 14 mandatory validation gates before reaching OMS order routing.
          </p>
        </div>
        <span className="text-[10px] px-2.5 py-0.5 rounded font-mono font-bold uppercase bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40">
          14 / 14 Mandatory Gates
        </span>
      </div>

      {/* Grid: 14 Stage Checklist + Interactive Simulator Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs font-mono">
        {/* Left: 14-Stage Checklist (7 cols) */}
        <div className="lg:col-span-7 bg-[#0D1914] border border-[#1B3328] rounded-2xl p-4 space-y-2.5">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#1B3328] pb-2 flex items-center justify-between">
            <span>Pre-Trade Defense Checklist</span>
            <span className="text-[#55C98A] text-[10px]">ALL ACTIVE</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            {gateStages.map((gate) => {
              const stageKey = gate.id;
              const resultStatus = previewResult?.stage_results?.[stageKey];
              const isFailed = resultStatus === "FAILED";
              return (
                <div
                  key={gate.id}
                  className={`p-2.5 rounded-xl border transition-colors ${
                    isFailed
                      ? "bg-red-950/60 border-red-800 text-red-300"
                      : "bg-[#07110D] border-[#1B3328] text-slate-300 hover:border-[#2E7D5B]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-[11px] truncate">{gate.label}</span>
                    {isFailed ? (
                      <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-[#55C98A] shrink-0" />
                    )}
                  </div>
                  <p className="text-[10px] text-[#70877A] font-sans pt-0.5 line-clamp-1">
                    {gate.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Interactive Order Risk Preview Box (5 cols) */}
        <div className="lg:col-span-5 bg-[#0D1914] border border-[#1B3328] rounded-2xl p-4 space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#1B3328] pb-2 flex items-center justify-between">
              <span>Order Risk Preview Simulator</span>
              <span className="text-[10px] text-cyan-300">Server Evaluated</span>
            </h4>

            {/* Input Form */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-[#70877A] font-bold block">Symbol</label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  className="w-full bg-[#07110D] border border-[#1B3328] rounded-lg px-2.5 py-1.5 text-white font-bold focus:outline-none focus:border-[#55C98A]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#70877A] font-bold block">Side</label>
                <select
                  value={side}
                  onChange={(e) => setSide(e.target.value as any)}
                  className="w-full bg-[#07110D] border border-[#1B3328] rounded-lg px-2.5 py-1.5 text-white font-bold focus:outline-none focus:border-[#55C98A]"
                >
                  <option value="LONG">LONG (Buy)</option>
                  <option value="SHORT">SHORT (Sell)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[#70877A] font-bold block">Quantity</label>
                <input
                  type="number"
                  step={0.01}
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#07110D] border border-[#1B3328] rounded-lg px-2.5 py-1.5 text-white font-bold focus:outline-none focus:border-[#55C98A]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#70877A] font-bold block">Entry Price ($)</label>
                <input
                  type="number"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#07110D] border border-[#1B3328] rounded-lg px-2.5 py-1.5 text-white font-bold focus:outline-none focus:border-[#55C98A]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#70877A] font-bold block">Stop Loss ($)</label>
                <input
                  type="number"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#07110D] border border-[#1B3328] rounded-lg px-2.5 py-1.5 text-red-400 font-bold focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#70877A] font-bold block">Take Profit ($)</label>
                <input
                  type="number"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#07110D] border border-[#1B3328] rounded-lg px-2.5 py-1.5 text-[#55C98A] font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              onClick={() => precheckMutation.mutate()}
              disabled={precheckMutation.isPending}
              className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
            >
              {precheckMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
              <span>Test Pre-Order Risk Gate</span>
            </button>
          </div>

          {/* Result Card */}
          {previewResult && (
            <div
              className={`p-3.5 rounded-xl border space-y-2 animate-fadeIn text-xs ${
                previewResult.is_approved
                  ? "bg-emerald-950/40 border-emerald-800 text-emerald-300"
                  : "bg-red-950/60 border-red-800 text-red-300"
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5">
                  {previewResult.is_approved ? (
                    <CheckCircle2 className="h-4 w-4 text-[#55C98A]" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  <span>{previewResult.is_approved ? "RISK APPROVED" : "RISK BLOCKED"}</span>
                </span>
                <span>Score: {previewResult.risk_score}/100</span>
              </div>

              {!previewResult.is_approved && previewResult.rejection_reasons?.length > 0 && (
                <div className="space-y-1 text-[11px] text-red-200">
                  <span className="font-bold block">Rejection Reasons:</span>
                  {previewResult.rejection_reasons.map((r, i) => (
                    <p key={i} className="font-sans leading-tight">• {r}</p>
                  ))}
                </div>
              )}

              {previewResult.is_approved && (
                <p className="text-[11px] text-emerald-200 font-sans">
                  Order clears all 14 quantitative gates. Notional exposure: ${(quantity * entryPrice).toLocaleString()}.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
