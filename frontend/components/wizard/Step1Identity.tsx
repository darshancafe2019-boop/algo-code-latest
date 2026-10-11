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
    <div className="space-y-8 animate-fadeIn">
      {/* Header Info */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-950/10 p-4 sm:p-5 flex items-start gap-4">
        <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-2 text-blue-400">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Step 1 — Identity & Capital Allocation</h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Configure the foundational target market, execution environment, and risk capital. Providers are automatically filtered to those natively supporting this market.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Market & Identity */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
              Market / Asset Type <span className="text-blue-400">*</span>
            </label>
            <select
              value={draft.market_type}
              onChange={(e) => handleMarketTypeChange(e.target.value as MarketType)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none font-mono"
            >
              {Object.entries(MARKET_TYPE_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">{marketCfg.description}</p>
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
              Underlying / Target Symbol <span className="text-blue-400">*</span>
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
              className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none font-mono font-bold"
            />
            <div className="flex gap-2 mt-2">
              {(draft.market_type.includes("INDIA")
                ? ["NIFTY", "BANKNIFTY", "FINNIFTY", "RELIANCE", "TCS"]
                : ["BTC", "ETH", "SOL", "BTCUSD", "ETHUSD"]
              ).map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => updateDraft({ underlying: sym, contract: null })}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                    draft.underlying === sym
                      ? "border-blue-500 bg-blue-500/20 text-blue-300"
                      : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {sym}
                </button>
              ))}
            </div>

            {/* Real-Time Live Feed Card */}
            <div className="mt-3 p-3 rounded-lg border border-slate-800 bg-slate-950/70 flex items-center justify-between font-mono text-xs">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">{draft.underlying} Live Feed:</span>
                    {liveSpot?.last ? (
                      <span className="text-emerald-400 font-extrabold text-sm">
                        {draft.market_type.includes("INDIA") ? "₹" : "$"}
                        {Number(liveSpot.last).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    ) : loadingSpot ? (
                      <span className="text-slate-400 text-[11px] animate-pulse">Streaming live feed...</span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">Connecting...</span>
                    )}
                  </div>
                  {liveSpot && (
                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>Bid: {liveSpot.bid || "-"}</span>
                      <span>•</span>
                      <span>Ask: {liveSpot.ask || "-"}</span>
                      <span>•</span>
                      <span className="text-blue-400">{liveSpot.provider || draft.broker}</span>
                      <span>•</span>
                      <span className="text-emerald-400">LIVE</span>
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={fetchLiveSpot}
                disabled={loadingSpot}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                title="Refresh Live Quote"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingSpot ? "animate-spin text-blue-400" : ""}`} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
              Bot Name <span className="text-blue-400">*</span>
            </label>
            <input
              type="text"
              required
              value={draft.bot_name}
              onChange={(e) => updateDraft({ bot_name: e.target.value })}
              placeholder="e.g. Delta BTC Alpha Sniper"
              className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
              Execution Timeframe
            </label>
            <div className="grid grid-cols-4 gap-2">
              {["1m", "3m", "5m", "15m", "30m", "1H", "4H", "1D"].map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => updateDraft({ timeframe: tf })}
                  className={`py-2 text-xs font-mono font-semibold rounded-lg border transition-all ${
                    draft.timeframe === tf
                      ? "border-blue-500 bg-blue-600/20 text-blue-300 shadow-sm"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Broker & Capital */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
              Broker / Provider Integration <span className="text-blue-400">*</span>
            </label>
            <select
              value={draft.broker}
              onChange={(e) => updateDraft({ broker: e.target.value as ProviderType })}
              className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none font-mono"
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
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <Wallet className="h-4 w-4 text-emerald-400" />
                <span>Broker Available Funds:</span>
              </div>
              <button
                type="button"
                onClick={() => fetchFunds(draft.broker)}
                disabled={loadingFunds}
                className="text-[11px] font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
              >
                <RefreshCw className={`h-3 w-3 ${loadingFunds ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>

            <div className="flex items-baseline gap-2">
              {draft.available_funds === "UNAVAILABLE" ? (
                <div className="space-y-2">
                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    UNAVAILABLE
                  </span>
                  <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
                    {draft.available_funds_reason || `Provider ${draft.broker} balance requires active API credentials.`}
                  </p>
                  {detectedIp && (
                    <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-900/80 p-2.5 rounded-lg">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-[10px]">Detected IP:</span>
                        <code className="text-amber-300 bg-black/60 px-1.5 py-0.5 rounded text-[10px] font-bold select-all">
                          {detectedIp}
                        </code>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyIp(detectedIp)}
                          className="px-2 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {copiedIp ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          {copiedIp ? "Copied!" : "Copy IP"}
                        </button>
                        <a
                          href="https://india.delta.exchange/app/settings/api-keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 rounded border border-blue-500/40 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 text-[10px] flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Delta Settings
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xl font-bold font-mono text-emerald-400">
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
            <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
              Capital Allocation for this Bot ({draft.market_type.includes("INDIA") ? "₹" : "$"}) <span className="text-blue-400">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="any"
              required
              value={draft.capital_allocation}
              onChange={(e) => updateDraft({ capital_allocation: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none font-mono font-bold"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Maximum capital the risk engine will permit this bot instance to deploy simultaneously.
            </p>
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
              Execution Mode <span className="text-blue-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => updateDraft({ execution_mode: "PAPER" })}
                className={`p-3 rounded-lg border text-left transition-all ${
                  draft.execution_mode === "PAPER"
                    ? "border-emerald-500/60 bg-emerald-950/20 text-emerald-300 shadow-sm"
                    : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold font-mono text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  PAPER TRADING
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  100% real live market feeds executed in risk-free virtual simulator.
                </div>
              </button>

              <button
                type="button"
                onClick={() => updateDraft({ execution_mode: "LIVE" })}
                className={`p-3 rounded-lg border text-left transition-all ${
                  draft.execution_mode === "LIVE"
                    ? "border-red-500/60 bg-red-950/30 text-red-300 shadow-sm"
                    : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold font-mono text-xs text-red-400">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                  LIVE TRADING
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Real monetary orders routed directly to broker exchange API.
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Next Button */}
      <div className="flex justify-end pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={onNext}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-xs font-mono font-bold text-white shadow-lg hover:bg-blue-500 focus:outline-none transition-all flex items-center gap-2"
        >
          Proceed to Step 2: Live Market Selection →
        </button>
      </div>
    </div>
  );
}
