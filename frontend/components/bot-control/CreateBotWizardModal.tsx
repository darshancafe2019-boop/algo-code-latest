"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Bot,
  Layers,
  Shield,
  Zap,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Sliders,
  DollarSign,
  Send,
} from "lucide-react";
import { MarketAssetClass, BotExecutionMode } from "@/types/bot-control";

interface CreateBotWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (botName: string) => void;
}

export function CreateBotWizardModal({ isOpen, onClose, onSuccess }: CreateBotWizardModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<number>(1);

  // Form State
  const [name, setName] = useState("Alpha Trend Bot");
  const [description, setDescription] = useState("Automated multi-timeframe quantitative trend follower");
  const [groupName, setGroupName] = useState("Crypto Scalping Bots");
  const [marketType, setMarketType] = useState<MarketAssetClass>("crypto");
  const [symbol, setSymbol] = useState("BTC/USDT");
  const [exchange, setExchange] = useState("ccxt_binance");
  const [strategy, setStrategy] = useState("Multi-Timeframe Trend Confluence Strategy");
  const [timeframe, setTimeframe] = useState("15m");
  const [capital, setCapital] = useState<number>(10000.0);
  const [riskPct, setRiskPct] = useState<number>(1.0);
  const [leverage, setLeverage] = useState<number>(1.0);
  const [stopLossVal, setStopLossVal] = useState<number>(1.5);
  const [takeProfitVal, setTakeProfitVal] = useState<number>(2.0);
  const [executionMode, setExecutionMode] = useState<BotExecutionMode>("PAPER");
  const [liveConfirmed, setLiveConfirmed] = useState(false);
  const [enableTelegram, setEnableTelegram] = useState(true);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Create Bot Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        description,
        symbol: symbol.toUpperCase(),
        strategy,
        timeframe,
        asset_class: marketType,
        exchange,
        execution_mode: executionMode,
        allocated_capital: capital,
        required_confidence: 75.0,
        group_name: groupName,
        config: {
          risk: {
            risk_per_trade_pct: riskPct,
            stop_loss_value: stopLossVal,
            take_profit_value: takeProfitVal,
            leverage,
          },
          telegram_alerts: enableTelegram,
        },
      };

      const res = await fetch("/api/bots/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.status === "error") {
        throw new Error(data.message || "Failed to create bot instance");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["botsList"] });
      queryClient.invalidateQueries({ queryKey: ["botsSummary"] });
      onSuccess(name);
      onClose();
    },
    onError: (err: any) => {
      setErrorMessage(err.message || "Failed to create bot");
    },
  });

  if (!isOpen) return null;

  const handleNext = () => {
    setErrorMessage(null);
    if (step < 6) setStep(step + 1);
  };

  const handleBack = () => {
    setErrorMessage(null);
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn select-none font-sans">
      <div className="bg-[#0D1914] border border-[#294238] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#1B3328] bg-[#0A130F] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40 shadow-md">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#E8F3EC] uppercase tracking-wider">
                Create Bot Instance Wizard
              </h2>
              <p className="text-xs text-[#A8BDB0]">
                Step {step} of 6: {step === 1 ? "Bot Identity" : step === 2 ? "Market & Symbol" : step === 3 ? "Strategy" : step === 4 ? "Capital & Risk" : step === 5 ? "Execution Mode" : "Final Review"}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-[#A8BDB0] hover:text-white p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="w-full bg-[#07110D] h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-[#123C2A] via-[#2E7D5B] to-[#55C98A] h-full transition-all duration-300"
            style={{ width: `${(step / 6) * 100}%` }}
          />
        </div>

        {/* Wizard Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 custom-scrollbar text-xs">
          {/* STEP 1: IDENTITY */}
          {step === 1 && (
            <div className="space-y-3.5 animate-fadeIn">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Step 1: Bot Identity & Tagging</h3>

              <div className="space-y-1">
                <label className="text-[11px] text-[#A8BDB0] font-medium">Bot Instance Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#07110D] border border-[#1B3328] rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-[#55C98A]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#A8BDB0] font-medium">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#07110D] border border-[#1B3328] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#55C98A] resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#A8BDB0] font-medium">Fleet Group / Cluster</label>
                <select
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full bg-[#07110D] border border-[#1B3328] rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-[#55C98A]"
                >
                  <option value="Crypto Scalping Bots">Crypto Scalping Bots</option>
                  <option value="NSE Index Options Bots">NSE Index Options Bots</option>
                  <option value="Macro Trend Bots">Macro Trend Bots</option>
                  <option value="Arbitrage & Mean Reversion">Arbitrage & Mean Reversion</option>
                </select>
              </div>
            </div>
          )}

          {/* STEP 2: MARKET */}
          {step === 2 && (
            <div className="space-y-3.5 animate-fadeIn">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Step 2: Market & Instrument</h3>

              <div className="space-y-1">
                <label className="text-[11px] text-[#A8BDB0] font-medium">Market Asset Class</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["crypto", "equity", "futures", "options", "forex", "commodity"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMarketType(m)}
                      className={`py-2 rounded-xl text-xs font-bold uppercase font-mono transition-all ${
                        marketType === m
                          ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/60 shadow-md"
                          : "bg-[#07110D] text-[#A8BDB0] hover:text-white border border-[#1B3328]"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#A8BDB0] font-medium">Symbol</label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  className="w-full bg-[#07110D] border border-[#1B3328] rounded-xl px-3 py-2 text-xs font-mono font-bold text-cyan-400 focus:outline-none focus:border-[#55C98A]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#A8BDB0] font-medium">Exchange / Broker Adapter</label>
                <select
                  value={exchange}
                  onChange={(e) => setExchange(e.target.value)}
                  className="w-full bg-[#07110D] border border-[#1B3328] rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-[#55C98A]"
                >
                  <option value="ccxt_binance">CCXT Binance (Spot / Perp)</option>
                  <option value="dhan_india">Dhan HQ (NSE Equities / F&O)</option>
                  <option value="zerodha_kite">Zerodha Kite Connect</option>
                  <option value="oanda_forex">OANDA Forex Adapter</option>
                  <option value="mock_paper">Mock Paper Engine</option>
                </select>
              </div>
            </div>
          )}

          {/* STEP 3: STRATEGY */}
          {step === 3 && (
            <div className="space-y-3.5 animate-fadeIn">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Step 3: Algorithmic Strategy</h3>

              <div className="space-y-1">
                <label className="text-[11px] text-[#A8BDB0] font-medium">Select Strategy Template</label>
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  className="w-full bg-[#07110D] border border-[#1B3328] rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-[#55C98A]"
                >
                  <option value="Multi-Timeframe Trend Confluence Strategy">Multi-Timeframe Trend Confluence Strategy</option>
                  <option value="EMA 9/21 Dynamic Crossover">EMA 9/21 Dynamic Crossover</option>
                  <option value="Bollinger Band Mean Reversion">Bollinger Band Mean Reversion</option>
                  <option value="Iron Condor Range Options">Iron Condor Range Options</option>
                  <option value="High Volatility Breakout">High Volatility Breakout</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#A8BDB0] font-medium">Base Timeframe</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {["1m", "5m", "15m", "1h", "1d"].map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => setTimeframe(tf)}
                      className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                        timeframe === tf
                          ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/60"
                          : "bg-[#07110D] text-[#A8BDB0] border border-[#1B3328]"
                      }`}
                    >
                      {tf.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: RISK */}
          {step === 4 && (
            <div className="space-y-3.5 animate-fadeIn">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Step 4: Capital Allocation & Risk</h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A8BDB0] font-medium">Allocated Capital ($)</label>
                  <input
                    type="number"
                    value={capital}
                    onChange={(e) => setCapital(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#07110D] border border-[#1B3328] rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-[#55C98A]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#A8BDB0] font-medium">Risk Per Trade (%)</label>
                  <input
                    type="number"
                    step={0.1}
                    value={riskPct}
                    onChange={(e) => setRiskPct(parseFloat(e.target.value) || 1)}
                    className="w-full bg-[#07110D] border border-[#1B3328] rounded-xl px-3 py-2 text-xs text-cyan-400 font-mono font-bold focus:outline-none focus:border-[#55C98A]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#A8BDB0] font-medium">Stop Loss (ATR Multiple)</label>
                  <input
                    type="number"
                    step={0.1}
                    value={stopLossVal}
                    onChange={(e) => setStopLossVal(parseFloat(e.target.value) || 1.5)}
                    className="w-full bg-[#07110D] border border-[#1B3328] rounded-xl px-3 py-2 text-xs text-red-400 font-mono font-bold focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#A8BDB0] font-medium">Take Profit (R:R Multiple)</label>
                  <input
                    type="number"
                    step={0.1}
                    value={takeProfitVal}
                    onChange={(e) => setTakeProfitVal(parseFloat(e.target.value) || 2.0)}
                    className="w-full bg-[#07110D] border border-[#1B3328] rounded-xl px-3 py-2 text-xs text-[#55C98A] font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: EXECUTION */}
          {step === 5 && (
            <div className="space-y-3.5 animate-fadeIn">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Step 5: Execution Mode & Alerts</h3>

              <div className="space-y-2">
                <label className="text-[11px] text-[#A8BDB0] font-medium block">Execution Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setExecutionMode("PAPER");
                      setLiveConfirmed(false);
                    }}
                    className={`py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                      executionMode === "PAPER"
                        ? "bg-cyan-600 text-white shadow-md"
                        : "bg-[#07110D] text-[#A8BDB0] hover:text-white border border-[#1B3328]"
                    }`}
                  >
                    PAPER TRADING (Simulated)
                  </button>

                  <button
                    type="button"
                    onClick={() => setExecutionMode("LIVE")}
                    className={`py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                      executionMode === "LIVE"
                        ? "bg-red-600 text-white shadow-md"
                        : "bg-[#07110D] text-[#A8BDB0] hover:text-white border border-[#1B3328]"
                    }`}
                  >
                    LIVE TRADING (Real Capital)
                  </button>
                </div>
              </div>

              {executionMode === "LIVE" && (
                <div className="p-3 bg-red-950/40 border border-red-800 rounded-xl space-y-2 text-xs text-red-300">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span>Live Trading Safety Gate</span>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-white font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={liveConfirmed}
                      onChange={(e) => setLiveConfirmed(e.target.checked)}
                      className="accent-red-500 rounded h-4 w-4"
                    />
                    <span>I confirm live deployment under 20-stage risk precheck gates.</span>
                  </label>
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-[#07110D] border border-[#1B3328] rounded-xl">
                <span className="text-white font-semibold">Enable Telegram Notifications</span>
                <input
                  type="checkbox"
                  checked={enableTelegram}
                  onChange={(e) => setEnableTelegram(e.target.checked)}
                  className="accent-[#55C98A] rounded h-4 w-4 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* STEP 6: REVIEW */}
          {step === 6 && (
            <div className="space-y-3.5 animate-fadeIn">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Step 6: Review & Spawn Instance</h3>

              <div className="bg-[#07110D] border border-[#1B3328] rounded-xl p-4 space-y-2 text-[11px] font-mono">
                <div className="flex justify-between">
                  <span className="text-[#70877A]">Bot Name:</span>
                  <span className="text-white font-bold">{name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#70877A]">Instrument:</span>
                  <span className="text-cyan-400 font-bold">{symbol} ({timeframe})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#70877A]">Strategy:</span>
                  <span className="text-white font-bold">{strategy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#70877A]">Allocated Capital:</span>
                  <span className="text-[#55C98A] font-bold">${capital.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#70877A]">Mode:</span>
                  <span
                    className={`font-bold ${
                      executionMode === "LIVE" ? "text-red-400" : "text-cyan-400"
                    }`}
                  >
                    {executionMode}
                  </span>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-950/80 text-red-300 border border-red-800 text-xs">
                  {errorMessage}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation Toolbar */}
        <div className="p-4 border-t border-[#1B3328] bg-[#0A130F] flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1 || createMutation.isPending}
            className="px-4 py-2 rounded-xl bg-[#07110D] hover:bg-[#123C2A] text-[#A8BDB0] hover:text-white text-xs font-bold transition-colors disabled:opacity-30 flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>

          {step < 6 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <span>Continue</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || (executionMode === "LIVE" && !liveConfirmed)}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-md disabled:opacity-50 flex items-center gap-1.5"
            >
              {createMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
              <span>{createMutation.isPending ? "Spawning..." : "Spawn Bot Worker"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
