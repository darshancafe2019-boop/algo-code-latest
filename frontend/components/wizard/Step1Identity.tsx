"use client";

import React, { useEffect, useState } from "react";
import { BotWizardDraft, MarketType, ProviderType, ExecutionMode } from "./types";
import { api } from "../../lib/api";
import { Shield, Wallet, AlertTriangle, CheckCircle2, RefreshCw, Copy, Check, ExternalLink } from "lucide-react";

interface Step1Props {
  draft: BotWizardDraft;
  updateDraft: (updates: Partial<BotWizardDraft>) => void;
  onNext: () => void;
}

export const MARKET_TYPE_CONFIG: Record<
  MarketType,
  { label: string; brokers: ProviderType[]; defaultUnderlying: string; description: string }
> = {
  INDIA_OPTION: {
    label: "India Index & Stock Options (NSE)",
    brokers: ["UPSTOX", "DHAN", "FYERS", "ANGEL", "ZERODHA", "PAPER"],
    defaultUnderlying: "NIFTY",
    description: "Live NSE option chains, strikes, Greeks, and expiry contracts",
  },
  INDIA_FUTURE: {
    label: "India Index & Stock Futures (NSE/NFO)",
    brokers: ["UPSTOX", "DHAN", "FYERS", "ANGEL", "ZERODHA", "PAPER"],
    defaultUnderlying: "NIFTY",
    description: "Live NSE current & near-month futures contracts and OI",
  },
  INDIA_STOCK: {
    label: "India Cash Equities (NSE/BSE)",
    brokers: ["UPSTOX", "DHAN", "FYERS", "ANGEL", "ZERODHA", "PAPER"],
    defaultUnderlying: "RELIANCE",
    description: "Real-time equities with L2 bid/ask depth and live quotes",
  },
  MCX_FUTURE: {
    label: "MCX Commodities Futures (MCX)",
    brokers: ["UPSTOX", "DHAN", "ZERODHA", "PAPER"],
    defaultUnderlying: "CRUDEOIL",
    description: "Gold, Silver, Crude Oil, Natural Gas commodity contracts",
  },
  CRYPTO_OPTION: {
    label: "Crypto Options (Delta Exchange India)",
    brokers: ["DELTA", "PAPER"],
    defaultUnderlying: "BTC",
    description: "Daily, weekly, and monthly live crypto option chains with Greeks",
  },
  CRYPTO_FUTURE: {
    label: "Crypto Perpetual & Dated Futures",
    brokers: ["DELTA", "BINANCE", "PAPER"],
    defaultUnderlying: "BTCUSD",
    description: "Real-time perpetual swaps with funding rates and dated futures",
  },
  CRYPTO_SPOT: {
    label: "Crypto Spot Markets",
    brokers: ["DELTA", "BINANCE", "PAPER"],
    defaultUnderlying: "BTCUSDT",
    description: "Real-time spot orderbook and live volume feeds",
  },
  FOREX: {
    label: "Forex Currencies",
    brokers: ["PAPER"],
    defaultUnderlying: "EURUSD",
    description: "Major, minor, and exotic global currency pairs",
  },
  US_STOCK: {
    label: "US Equities & ETFs (Alpaca)",
    brokers: ["ALPACA", "PAPER"],
    defaultUnderlying: "AAPL",
    description: "NYSE & NASDAQ cash equities with real-time Alpaca quotes and buying power",
  },
};

export default function Step1Identity({ draft, updateDraft, onNext }: Step1Props) {
  const [loadingFunds, setLoadingFunds] = useState(false);
  const [copiedIp, setCopiedIp] = useState(false);

  // Extract IP if present in available_funds_reason
  const ipMatch = draft.available_funds_reason?.match(/([0-9a-fA-F:]{7,39}|\b\d{1,3}(?:\.\d{1,3}){3}\b)/);
  const detectedIp = ipMatch ? ipMatch[0] : null;

  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2000);
  };

  const fetchFunds = async (broker: ProviderType) => {
    setLoadingFunds(true);
    try {
      const res = await api.getBrokerFunds(broker);
      if (res && res.available_funds !== undefined) {
        updateDraft({
          available_funds: res.available_funds,
          available_funds_reason: undefined,
        });
      } else {
        updateDraft({
          available_funds: "UNAVAILABLE",
          available_funds_reason: res?.reason || `Provider ${broker} credentials not configured in .env`,
        });
      }
    } catch (err: any) {
      updateDraft({
        available_funds: "UNAVAILABLE",
        available_funds_reason: err.message || `Could not connect to ${broker}`,
      });
    } finally {
      setLoadingFunds(false);
    }
  };

  const [liveSpot, setLiveSpot] = useState<any>(null);
  const [loadingSpot, setLoadingSpot] = useState(false);

  const fetchLiveSpot = async () => {
    if (!draft.underlying) return;
    setLoadingSpot(true);
    try {
      const q = await api.getLiveQuote(draft.underlying, undefined, draft.market_type);
      setLiveSpot(q);
    } catch (_) {
      setLiveSpot(null);
    } finally {
      setLoadingSpot(false);
    }
  };

  useEffect(() => {
    fetchLiveSpot();
    const interval = setInterval(fetchLiveSpot, 4000);
    return () => clearInterval(interval);
  }, [draft.underlying, draft.market_type]);

  useEffect(() => {
    fetchFunds(draft.broker);
  }, [draft.broker]);

  const handleMarketTypeChange = (newMarket: MarketType) => {
    const cfg = MARKET_TYPE_CONFIG[newMarket];
    const compatibleBrokers = cfg.brokers;
    const newBroker = compatibleBrokers.includes(draft.broker) ? draft.broker : compatibleBrokers[0];

    updateDraft({
      market_type: newMarket,
      broker: newBroker,
      underlying: cfg.defaultUnderlying,
      contract: null, // Reset contract on market change to guarantee continuity
      option_strategy: null,
    });
  };

  const marketCfg = MARKET_TYPE_CONFIG[draft.market_type];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Info Banner */}
      <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-r from-[#0B1528] via-[#09101F] to-[#0D182E] p-6 shadow-xl flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0 shadow-sm">
          <Shield className="h-6 w-6" />
        </div>
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-base sm:text-lg font-black text-white font-mono uppercase tracking-wide">
              Step 1 — Identity & Risk Capital Allocation
            </h3>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              FOUNDATIONAL SETUP
            </span>
          </div>
          <p className="text-sm sm:text-[15px] text-slate-300 mt-1.5 leading-relaxed font-sans">
            Configure target market asset class, live streaming underlying quote, bot instance name, execution timeframe, and isolated risk boundaries.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Market & Identity Card */}
        <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-b from-[#0D182E] to-[#080E1B] p-6 sm:p-7 shadow-xl space-y-6">
          <div className="border-b border-slate-800/80 pb-3.5 flex items-center justify-between">
            <h4 className="text-sm sm:text-base font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
              Market Identity
            </h4>
            <span className="text-xs sm:text-sm font-mono text-slate-400 font-semibold">1 of 2</span>
          </div>

          <div>
            <label className="block text-sm sm:text-base font-mono font-bold text-slate-200 mb-2 uppercase tracking-wider">
              Market / Asset Type <span className="text-cyan-400">*</span>
            </label>
            <select
              value={draft.market_type}
              onChange={(e) => handleMarketTypeChange(e.target.value as MarketType)}
              className="w-full rounded-xl border border-slate-800 bg-[#070D1A] px-4 py-3 text-sm sm:text-base text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono font-semibold transition-colors shadow-inner"
            >
              {Object.entries(MARKET_TYPE_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.label}
                </option>
              ))}
            </select>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 font-sans leading-relaxed">{marketCfg.description}</p>
          </div>

          <div>
            <label className="block text-sm sm:text-base font-mono font-bold text-slate-200 mb-2 uppercase tracking-wider">
              Underlying Target Symbol <span className="text-cyan-400">*</span>
            </label>
            <input
              type="text"
              required
              value={draft.underlying}
              onChange={(e) =>
                updateDraft({
                  underlying: e.target.value.toUpperCase(),
                  contract: null,
                })
              }
              placeholder="e.g. NIFTY, BANKNIFTY, BTC, ETH, RELIANCE"
              className="w-full rounded-xl border border-slate-800 bg-[#070D1A] px-4 py-3 text-sm sm:text-base text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono font-bold tracking-wider shadow-inner"
            />
            <div className="flex flex-wrap gap-2 mt-2.5">
              {(draft.market_type.includes("INDIA")
                ? ["NIFTY", "BANKNIFTY", "FINNIFTY", "RELIANCE", "TCS"]
                : ["BTC", "ETH", "SOL", "BTCUSD", "ETHUSD"]
              ).map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => updateDraft({ underlying: sym, contract: null })}
                  className={`text-xs sm:text-sm font-mono px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer font-bold ${
                    draft.underlying === sym
                      ? "border-cyan-500/60 bg-blue-600/20 text-cyan-300 shadow-sm"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-white"
                  }`}
                >
                  {sym}
                </button>
              ))}
            </div>

            {/* Real-Time Live Feed Card */}
            <div className="mt-5 p-4 rounded-xl border border-slate-800/90 bg-[#070D1A] flex items-center justify-between font-mono shadow-inner">
              <div className="flex items-center gap-3.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-white font-bold text-sm sm:text-base">{draft.underlying} Spot:</span>
                    {liveSpot?.last ? (
                      <span className="text-emerald-400 font-black text-base sm:text-xl tracking-tight">
                        {draft.market_type.includes("INDIA") ? "₹" : "$"}
                        {Number(liveSpot.last).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    ) : loadingSpot ? (
                      <span className="text-cyan-400 text-xs sm:text-sm animate-pulse">Streaming quote...</span>
                    ) : (
                      <span className="text-slate-500 text-xs sm:text-sm">Connecting...</span>
                    )}
                  </div>
                  {liveSpot && (
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-1 font-semibold">
                      <span>Bid: {liveSpot.bid || "-"}</span>
                      <span>•</span>
                      <span>Ask: {liveSpot.ask || "-"}</span>
                      <span>•</span>
                      <span className="text-cyan-400">{liveSpot.provider || draft.broker}</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-bold">LIVE</span>
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={fetchLiveSpot}
                disabled={loadingSpot}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
                title="Refresh Live Quote"
              >
                <RefreshCw className={`h-4 w-4 ${loadingSpot ? "animate-spin text-cyan-400" : ""}`} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm sm:text-base font-mono font-bold text-slate-200 mb-2 uppercase tracking-wider">
              Bot Instance Name <span className="text-cyan-400">*</span>
            </label>
            <input
              type="text"
              required
              value={draft.bot_name}
              onChange={(e) => updateDraft({ bot_name: e.target.value })}
              placeholder="e.g. Delta BTC Alpha Sniper"
              className="w-full rounded-xl border border-slate-800 bg-[#070D1A] px-4 py-3 text-sm sm:text-base text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono font-semibold shadow-inner"
            />
          </div>

          <div>
            <label className="block text-sm sm:text-base font-mono font-bold text-slate-200 mb-2 uppercase tracking-wider">
              Execution Timeframe
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {["1m", "3m", "5m", "15m", "30m", "1H", "4H", "1D"].map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => updateDraft({ timeframe: tf })}
                  className={`py-2.5 text-xs sm:text-sm font-mono font-bold rounded-xl border transition-all cursor-pointer ${
                    draft.timeframe === tf
                      ? "border-cyan-500/60 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-white"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Provider & Capital Card */}
        <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-b from-[#0D182E] to-[#080E1B] p-6 sm:p-7 shadow-xl space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="border-b border-slate-800/80 pb-3.5 flex items-center justify-between">
              <h4 className="text-sm sm:text-base font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-400" />
                Capital & Environment
              </h4>
              <span className="text-xs sm:text-sm font-mono text-slate-400 font-semibold">2 of 2</span>
            </div>

            <div>
              <label className="block text-sm sm:text-base font-mono font-bold text-slate-200 mb-2 uppercase tracking-wider">
                Broker / Execution Provider <span className="text-cyan-400">*</span>
              </label>
              <select
                value={draft.broker}
                onChange={(e) => updateDraft({ broker: e.target.value as ProviderType })}
                className="w-full rounded-xl border border-slate-800 bg-[#070D1A] px-4 py-3 text-sm sm:text-base text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono font-semibold shadow-inner"
              >
                {marketCfg.brokers.map((b) => (
                  <option key={b} value={b}>
                    {b === "DELTA"
                      ? "DELTA EXCHANGE INDIA"
                      : b === "PAPER"
                      ? "PAPER SIMULATOR (VIRTUAL TRADING)"
                      : b}
                  </option>
                ))}
              </select>
            </div>

            {/* Live Broker Funds Banner */}
            <div className="rounded-xl border border-slate-800/90 bg-[#070D1A] p-4 sm:p-5 space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm sm:text-base font-mono text-slate-300">
                  <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                  <span className="font-bold">Provider Available Funds:</span>
                </div>
                <button
                  type="button"
                  onClick={() => fetchFunds(draft.broker)}
                  disabled={loadingFunds}
                  className="text-xs sm:text-sm font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer font-bold"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingFunds ? "animate-spin" : ""}`} /> Refresh
                </button>
              </div>

              <div className="flex items-baseline gap-2">
                {draft.available_funds === "UNAVAILABLE" ? (
                  <div className="space-y-2.5 w-full">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/10 border border-amber-500/30 text-amber-300">
                      UNAVAILABLE (SIMULATOR SAFE)
                    </span>
                    <p className="text-xs sm:text-sm text-slate-400 font-mono leading-relaxed">
                      {draft.available_funds_reason || `Provider ${draft.broker} balance requires active API credentials.`}
                    </p>
                    {detectedIp && (
                      <div className="pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5 bg-slate-900/60 p-3 rounded-xl">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-xs font-mono">Detected IP:</span>
                          <code className="text-amber-300 bg-black/60 px-2.5 py-1 rounded text-xs font-bold select-all">
                            {detectedIp}
                          </code>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyIp(detectedIp)}
                            className="px-3 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            {copiedIp ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                            {copiedIp ? "Copied" : "Copy IP"}
                          </button>
                          <a
                            href="https://india.delta.exchange/app/settings/api-keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Delta Settings
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-400 tracking-tight">
                    {draft.market_type.includes("INDIA") ? "₹" : "$"}
                    {Number(draft.available_funds).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm sm:text-base font-mono font-bold text-slate-200 mb-2 uppercase tracking-wider">
                Capital Allocation for Bot ({draft.market_type.includes("INDIA") ? "₹" : "$"}) <span className="text-cyan-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="any"
                required
                value={draft.capital_allocation}
                onChange={(e) => updateDraft({ capital_allocation: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-xl border border-slate-800 bg-[#070D1A] px-4 py-3 text-sm sm:text-base text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono font-bold tracking-wider shadow-inner"
              />
              <p className="text-xs sm:text-sm text-slate-400 mt-2 font-sans leading-relaxed">
                Max capital boundary the internal risk engine will permit this bot instance to commit.
              </p>
            </div>

            <div>
              <label className="block text-sm sm:text-base font-mono font-bold text-slate-200 mb-2 uppercase tracking-wider">
                Execution Mode <span className="text-cyan-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3.5">
                <button
                  type="button"
                  onClick={() => updateDraft({ execution_mode: "PAPER" })}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    draft.execution_mode === "PAPER"
                      ? "border-emerald-500/60 bg-emerald-950/30 text-emerald-300 shadow-md shadow-emerald-950/20 ring-1 ring-emerald-500/30"
                      : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold font-mono text-sm sm:text-base text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    PAPER TRADING
                  </div>
                  <div className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed font-sans">
                    Real streaming quotes executed in risk-free virtual simulator.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => updateDraft({ execution_mode: "LIVE" })}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    draft.execution_mode === "LIVE"
                      ? "border-rose-500/60 bg-rose-950/40 text-rose-300 shadow-md shadow-rose-950/20 ring-1 ring-rose-500/30"
                      : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold font-mono text-sm sm:text-base text-rose-400">
                    <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
                    LIVE TRADING
                  </div>
                  <div className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed font-sans">
                    Real capital orders routed directly to broker exchange API.
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Action */}
          <div className="pt-5 border-t border-slate-800/80 flex justify-end">
            <button
              type="button"
              onClick={onNext}
              className="inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 px-7 py-3.5 text-sm sm:text-base font-mono font-bold text-white shadow-lg shadow-blue-600/30 hover:from-blue-500 hover:to-cyan-400 transition-all cursor-pointer active:scale-95"
            >
              <span>Continue to Step 2: Live Market</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
