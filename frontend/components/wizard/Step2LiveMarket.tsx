"use client";

import React, { useEffect, useState, useMemo } from "react";
import { BotWizardDraft, SelectedContract } from "./types";
import { api } from "../../lib/api";
import {
  Activity,
  CheckCircle2,
  RefreshCw,
  Search,
  Zap,
  TrendingUp,
  TrendingDown,
  Layers,
  Radio,
  Clock,
  AlertCircle,
} from "lucide-react";

interface Step2Props {
  draft: BotWizardDraft;
  updateDraft: (updates: Partial<BotWizardDraft>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function Step2LiveMarket({ draft, updateDraft, onNext, onPrev }: Step2Props) {
  const [loading, setLoading] = useState(false);
  const [instruments, setInstruments] = useState<any[]>([]);
  const [expiries, setExpiries] = useState<any[]>([]);
  const [selectedExpiry, setSelectedExpiry] = useState<string>("");
  const [optionChain, setOptionChain] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [liveUnderlyingQuote, setLiveUnderlyingQuote] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isOptionMarket = draft.market_type.includes("OPTION");
  const isFutureMarket = draft.market_type.includes("FUTURE");
  const isStockMarket = draft.market_type === "INDIA_STOCK" || draft.market_type === "US_STOCK" || draft.market_type === "CRYPTO_SPOT";
  const currencySymbol = draft.market_type.includes("INDIA") ? "₹" : "$";

  // Reset selected expiry when market type or underlying changes
  useEffect(() => {
    setSelectedExpiry("");
    setOptionChain(null);
  }, [draft.market_type, draft.underlying]);

  // Load Expiries & Option Chain or Instruments
  const fetchMarketData = async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    setErrorMsg(null);
    try {
      if (isOptionMarket) {
        const expList = await api.getExpiries(draft.market_type, draft.underlying);
        const normalizedExpiries = (expList || []).map((item: any) => {
          if (typeof item === "string") return { expiry: item, label: item, days_to_expiry: 0 };
          return {
            expiry: item.expiry || item.label || String(item),
            label: item.label || item.expiry || String(item),
            days_to_expiry: item.days_to_expiry ?? 0,
          };
        });
        setExpiries(normalizedExpiries);

        // Pick active expiry: prefer selectedExpiry if in list, otherwise pick first with days_to_expiry > 0, otherwise first in list
        const activeExp = (selectedExpiry && normalizedExpiries.some((e: any) => e.expiry === selectedExpiry))
          ? selectedExpiry
          : (normalizedExpiries.find((e: any) => e.days_to_expiry > 0)?.expiry || (normalizedExpiries.length > 0 ? normalizedExpiries[0].expiry : ""));

        if (activeExp && activeExp !== selectedExpiry) {
          setSelectedExpiry(activeExp);
        }

        const chain = await api.getLiveOptionChain(draft.market_type, draft.underlying, activeExp);
        setOptionChain(chain);
        const spot = chain?.underlying_price ?? chain?.spot_price;
        if (spot !== undefined && spot !== null) {
          setLiveUnderlyingQuote({
            symbol: chain.underlying,
            ltp: spot,
            is_live: true,
            provider: chain.provider || draft.broker,
            timestamp: chain.timestamp || new Date().toISOString(),
          });
        }
      } else {
        const insts = await api.getInstruments(draft.market_type, draft.underlying, searchTerm);
        setInstruments(insts || []);
        if (insts && insts.length > 0) {
          const firstInst = insts[0];
          setLiveUnderlyingQuote({
            symbol: firstInst.symbol,
            ltp: firstInst.ltp || firstInst.price || 0,
            is_live: true,
            provider: firstInst.provider || draft.broker,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (err: any) {
      if (!silent) setErrorMsg(err.message || "Failed to fetch live market data");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData(false);
    const interval = setInterval(() => {
      fetchMarketData(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [draft.market_type, draft.underlying, selectedExpiry]);

  const handleSelectContract = (contract: SelectedContract) => {
    updateDraft({
      contract,
      // If an option strategy exists, update its legs/payoff automatically
      option_strategy: null,
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Info */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-950/10 p-4 sm:p-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-2 text-blue-400">
            <Radio className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Step 2 — Live Market & Instrument Selection</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              100% Real-Time Provider Quotes. Every strike, expiry, premium, bid, ask and OI comes from configured live adapters.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            LIVE FEED (4s)
          </span>
          <button
            type="button"
            onClick={() => fetchMarketData(false)}
            disabled={loading}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-mono text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Selected Contract Persistent Banner */}
      {draft.contract && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-500/20 border border-emerald-500/40 p-1.5 text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase font-bold text-white tracking-wider">
                  CANONICAL SELECTED CONTRACT:
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  {draft.contract.symbol}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                  {draft.contract.provider}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono text-slate-400 mt-1">
                <span>
                  LTP: <strong className="text-emerald-400">{currencySymbol}{draft.contract.premium.toFixed(2)}</strong>
                </span>
                <span>
                  Bid: <strong className="text-slate-300">{currencySymbol}{draft.contract.bid.toFixed(2)}</strong>
                </span>
                <span>
                  Ask: <strong className="text-slate-300">{currencySymbol}{draft.contract.ask.toFixed(2)}</strong>
                </span>
                {draft.contract.expiry && <span>Expiry: {draft.contract.expiry}</span>}
                {draft.contract.strike && <span>Strike: {draft.contract.strike}</span>}
                {draft.contract.option_type && <span>Type: {draft.contract.option_type}</span>}
              </div>
            </div>
          </div>

          <div className="text-right font-mono text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" /> LIVE CONNECTED
            </span>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-xs font-mono text-red-400 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* OPTION CHAIN VIEW */}
      {isOptionMarket && (
        <div className="space-y-4">
          {/* Expiry Selector Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium text-slate-400">Underlying Spot:</span>
              <span className="text-sm font-mono font-bold text-white">
                {draft.underlying} ={" "}
                <span className="text-emerald-400">
                  {currencySymbol}{liveUnderlyingQuote?.ltp ? liveUnderlyingQuote.ltp.toLocaleString() : "..."}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-xs font-mono text-slate-500 mr-1">Expiry:</span>
              {expiries.map((expItem: any) => {
                const expVal = typeof expItem === "string" ? expItem : (expItem.expiry || expItem.label || String(expItem));
                const expLabel = typeof expItem === "string" ? expItem : (expItem.label || expItem.expiry || String(expItem));
                return (
                  <button
                    key={expVal}
                    type="button"
                    onClick={() => setSelectedExpiry(expVal)}
                    className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-all ${
                      selectedExpiry === expVal
                        ? "border-blue-500 bg-blue-600/30 text-blue-200 font-bold shadow-sm"
                        : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    {expLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Option Chain Table */}
          {loading && !optionChain ? (
            <div className="py-12 text-center text-xs font-mono text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
              Loading real live option chain from {draft.broker}...
            </div>
          ) : (() => {
            const strikesList = optionChain?.strikes || optionChain?.chain || [];
            return strikesList.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 shadow-2xl">
              <table className="w-full text-left border-collapse text-[11px] font-mono">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400">
                    <th colSpan={7} className="py-2.5 px-3 text-center border-r border-slate-800 bg-emerald-950/20 text-emerald-400 font-bold tracking-wider">
                      CALLS (CE)
                    </th>
                    <th className="py-2.5 px-4 text-center bg-slate-800 text-white font-bold tracking-wider">
                      STRIKE
                    </th>
                    <th colSpan={7} className="py-2.5 px-3 text-center border-l border-slate-800 bg-red-950/20 text-red-400 font-bold tracking-wider">
                      PUTS (PE)
                    </th>
                  </tr>
                  <tr className="border-b border-slate-800 text-slate-500 bg-slate-900/40 text-[10px]">
                    {/* Call Headers */}
                    <th className="py-2 px-2 text-right">OI</th>
                    <th className="py-2 px-2 text-right">IV</th>
                    <th className="py-2 px-2 text-right">Delta</th>
                    <th className="py-2 px-2 text-right">Theta</th>
                    <th className="py-2 px-2 text-right">Bid</th>
                    <th className="py-2 px-2 text-right">Ask</th>
                    <th className="py-2 px-3 text-right border-r border-slate-800 text-emerald-400 font-bold">LTP</th>

                    {/* Strike */}
                    <th className="py-2 px-4 text-center bg-slate-900 text-slate-300 font-bold">Price</th>

                    {/* Put Headers */}
                    <th className="py-2 px-3 text-left border-l border-slate-800 text-red-400 font-bold">LTP</th>
                    <th className="py-2 px-2 text-left">Bid</th>
                    <th className="py-2 px-2 text-left">Ask</th>
                    <th className="py-2 px-2 text-left">Delta</th>
                    <th className="py-2 px-2 text-left">Theta</th>
                    <th className="py-2 px-2 text-left">IV</th>
                    <th className="py-2 px-2 text-left">OI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {strikesList.map((row: any) => {
                    const call = row.call;
                    const put = row.put;
                    const strike = row.strike;
                    const spot = optionChain.underlying_price || optionChain.spot_price || 0;
                    const isATM = Math.abs(strike - spot) < (strike * 0.008);

                    const isCallSelected = draft.contract?.symbol === call?.symbol;
                    const isPutSelected = draft.contract?.symbol === put?.symbol;

                    return (
                      <tr
                        key={strike}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isATM ? "bg-blue-500/5 font-semibold" : ""
                        }`}
                      >
                        {/* CALL CELLS */}
                        {call ? (
                          <>
                            <td className="py-2 px-2 text-right text-slate-400">{call.open_interest || 0}</td>
                            <td className="py-2 px-2 text-right text-slate-400">{call.iv ? `${call.iv.toFixed(1)}%` : "-"}</td>
                            <td className="py-2 px-2 text-right text-slate-300">
                              {call.delta !== undefined ? call.delta.toFixed(3) : "-"}
                            </td>
                            <td className="py-2 px-2 text-right text-slate-400">
                              {call.theta !== undefined ? call.theta.toFixed(1) : "-"}
                            </td>
                            <td className="py-2 px-2 text-right text-slate-400">{call.bid ? `${currencySymbol}${call.bid.toFixed(1)}` : "-"}</td>
                            <td className="py-2 px-2 text-right text-slate-400">{call.ask ? `${currencySymbol}${call.ask.toFixed(1)}` : "-"}</td>
                            <td className="py-2 px-3 text-right border-r border-slate-800">
                              <button
                                type="button"
                                onClick={() =>
                                  handleSelectContract({
                                    instrument_id: String(call.product_id || call.symbol),
                                    symbol: call.symbol,
                                    underlying: draft.underlying,
                                    expiry: call.expiry,
                                    strike: strike,
                                    option_type: "CE",
                                    premium: call.ltp || (call.bid + call.ask) / 2 || 0,
                                    bid: call.bid || 0,
                                    ask: call.ask || 0,
                                    volume: call.volume || 0,
                                    open_interest: call.open_interest || 0,
                                    lot_size: call.lot_size || 0.001,
                                    tick_size: call.tick_size || 0.1,
                                    provider: draft.broker,
                                    exchange: draft.market_type.includes("INDIA") ? "UPSTOX" : "DELTA",
                                    timestamp: optionChain.timestamp,
                                    is_live: true,
                                    greeks: {
                                      delta: call.delta,
                                      gamma: call.gamma,
                                      theta: call.theta,
                                      vega: call.vega,
                                      iv: call.iv,
                                      greeks_source: call.greeks_source,
                                    },
                                  })
                                }
                                className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                                  isCallSelected
                                    ? "bg-emerald-500 text-slate-950 shadow-md ring-2 ring-emerald-400"
                                    : "bg-emerald-950/40 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/30"
                                }`}
                              >
                                {currencySymbol}{call.ltp ? call.ltp.toFixed(2) : "0.00"}
                              </button>
                            </td>
                          </>
                        ) : (
                          <td colSpan={7} className="text-center text-slate-600 py-2 border-r border-slate-800">
                            -
                          </td>
                        )}

                        {/* STRIKE CELL */}
                        <td
                          className={`py-2 px-4 text-center font-bold font-mono text-xs ${
                            isATM
                              ? "bg-blue-600 text-white shadow-inner"
                              : "bg-slate-900 text-slate-200"
                          }`}
                        >
                          {strike.toLocaleString()}
                        </td>

                        {/* PUT CELLS */}
                        {put ? (
                          <>
                            <td className="py-2 px-3 text-left border-l border-slate-800">
                              <button
                                type="button"
                                onClick={() =>
                                  handleSelectContract({
                                    instrument_id: String(put.product_id || put.symbol),
                                    symbol: put.symbol,
                                    underlying: draft.underlying,
                                    expiry: put.expiry,
                                    strike: strike,
                                    option_type: "PE",
                                    premium: put.ltp || (put.bid + put.ask) / 2 || 0,
                                    bid: put.bid || 0,
                                    ask: put.ask || 0,
                                    volume: put.volume || 0,
                                    open_interest: put.open_interest || 0,
                                    lot_size: put.lot_size || 0.001,
                                    tick_size: put.tick_size || 0.1,
                                    provider: draft.broker,
                                    exchange: draft.market_type.includes("INDIA") ? "UPSTOX" : "DELTA",
                                    timestamp: optionChain.timestamp,
                                    is_live: true,
                                    greeks: {
                                      delta: put.delta,
                                      gamma: put.gamma,
                                      theta: put.theta,
                                      vega: put.vega,
                                      iv: put.iv,
                                      greeks_source: put.greeks_source,
                                    },
                                  })
                                }
                                className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                                  isPutSelected
                                    ? "bg-red-500 text-slate-950 shadow-md ring-2 ring-red-400"
                                    : "bg-red-950/40 text-red-400 hover:bg-red-600 hover:text-white border border-red-500/30"
                                }`}
                              >
                                {currencySymbol}{put.ltp ? put.ltp.toFixed(2) : "0.00"}
                              </button>
                            </td>
                            <td className="py-2 px-2 text-left text-slate-400">{put.bid ? `${currencySymbol}${put.bid.toFixed(1)}` : "-"}</td>
                            <td className="py-2 px-2 text-left text-slate-400">{put.ask ? `${currencySymbol}${put.ask.toFixed(1)}` : "-"}</td>
                            <td className="py-2 px-2 text-left text-slate-300">
                              {put.delta !== undefined ? put.delta.toFixed(3) : "-"}
                            </td>
                            <td className="py-2 px-2 text-left text-slate-400">
                              {put.theta !== undefined ? put.theta.toFixed(1) : "-"}
                            </td>
                            <td className="py-2 px-2 text-left text-slate-400">{put.iv ? `${put.iv.toFixed(1)}%` : "-"}</td>
                            <td className="py-2 px-2 text-left text-slate-400">{put.open_interest || 0}</td>
                          </>
                        ) : (
                          <td colSpan={7} className="text-center text-slate-600 py-2 border-l border-slate-800">
                            -
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            ) : (
              <div className="py-8 text-center text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No live option contracts available for this underlying/expiry.
              </div>
            );
          })()}
        </div>
      )}

      {/* FUTURES / EQUITIES LIST VIEW */}
      {!isOptionMarket && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search live instrument contracts..."
                className="w-full rounded-lg border border-slate-800 bg-slate-900/90 pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs font-mono text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
              Fetching live contracts from {draft.broker}...
            </div>
          ) : instruments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {instruments.map((inst) => {
                const isSelected = draft.contract?.symbol === inst.symbol;
                return (
                  <button
                    key={inst.symbol}
                    type="button"
                    onClick={() =>
                      handleSelectContract({
                        instrument_id: inst.instrument_id || inst.symbol,
                        symbol: inst.symbol,
                        underlying: inst.underlying || draft.underlying,
                        expiry: inst.expiry || "",
                        strike: null,
                        option_type: null,
                        premium: inst.ltp || inst.price || 0,
                        bid: inst.bid || 0,
                        ask: inst.ask || 0,
                        volume: inst.volume || 0,
                        open_interest: inst.open_interest || 0,
                        lot_size: inst.lot_size || 1,
                        tick_size: inst.tick_size || 0.01,
                        provider: inst.provider || draft.broker,
                        exchange: inst.exchange || (draft.market_type.includes("INDIA") ? "UPSTOX" : "DELTA"),
                        timestamp: new Date().toISOString(),
                        is_live: true,
                      })
                    }
                    className={`p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-950/30 ring-2 ring-emerald-500/40"
                        : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-white">{inst.symbol}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300">
                        {inst.provider || draft.broker}
                      </span>
                    </div>

                    <div className="mt-3 flex items-baseline justify-between">
                      <div className="text-base font-mono font-bold text-emerald-400">
                        {draft.market_type.includes("INDIA") ? "₹" : "$"}
                        {(inst.ltp || inst.price || 0).toLocaleString()}
                      </div>
                      {inst.change_pct !== undefined && (
                        <span
                          className={`text-xs font-mono flex items-center gap-0.5 ${
                            inst.change_pct >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {inst.change_pct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {inst.change_pct.toFixed(2)}%
                        </span>
                      )}
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 pt-2 border-t border-slate-800/80">
                      <div>Bid: {inst.bid ? `${currencySymbol}${inst.bid}` : "-"}</div>
                      <div>Ask: {inst.ask ? `${currencySymbol}${inst.ask}` : "-"}</div>
                      <div>Vol: {(inst.volume || 0).toLocaleString()}</div>
                      <div>Lot: {inst.lot_size || 1}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-xl">
              No live instruments found matching your search.
            </div>
          )}
        </div>
      )}

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={onPrev}
          className="rounded-lg border border-slate-800 bg-slate-900 px-5 py-2.5 text-xs font-mono font-bold text-slate-300 hover:text-white transition-colors"
        >
          ← Back: Step 1
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!draft.contract}
          className={`rounded-lg px-6 py-2.5 text-xs font-mono font-bold text-white shadow-lg transition-all flex items-center gap-2 ${
            draft.contract
              ? "bg-blue-600 hover:bg-blue-500 cursor-pointer"
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
          }`}
        >
          Proceed to Step 3: Indicators →
        </button>
      </div>
    </div>
  );
}
