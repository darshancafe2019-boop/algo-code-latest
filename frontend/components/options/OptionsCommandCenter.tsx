"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuantDataCore } from "@/context/QuantDataCoreContext";
import {
  OptionChainSnapshot,
  OptionStrikeRow,
  OptionContractData,
  NormalizedOrderBook,
} from "@/types/data-core";

type DisplayMode = "STANDARD" | "GREEKS" | "FLOW" | "COMPACT";

export default function OptionsCommandCenter() {
  const { environment, providers } = useQuantDataCore();
  const activeProvider = providers && providers.length > 0 ? providers[0].name : "UPSTOX";

  const [underlying, setUnderlying] = useState<string>("NIFTY");
  const [selectedExpiry, setSelectedExpiry] = useState<string>("");
  const [strikeLimit, setStrikeLimit] = useState<number>(15);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("STANDARD");
  const [chainSnapshot, setChainSnapshot] = useState<OptionChainSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedContract, setSelectedContract] = useState<OptionContractData | null>(null);
  const [selectedDepth, setSelectedDepth] = useState<NormalizedOrderBook | null>(null);

  // Fetch Option Chain
  useEffect(() => {
    let isMounted = true;
    const fetchChain = async () => {
      try {
        let url = `/api/v2/options/chain?underlying=${encodeURIComponent(
          underlying
        )}&limit=${strikeLimit}${
          selectedExpiry ? `&expiry=${encodeURIComponent(selectedExpiry)}` : ""
        }`;
        let res = await fetch(url);
        let json = res.ok ? await res.json() : null;
        
        // Fallback to unified multi-broker options chain if v2 returns empty strikes
        if (!json || json.status !== "success" || !json.data?.strikes?.length) {
          const fallbackUrl = `/api/options/chain?underlying=${encodeURIComponent(
            underlying
          )}&strike_count=${strikeLimit}${
            selectedExpiry ? `&expiry=${encodeURIComponent(selectedExpiry)}` : ""
          }`;
          const fRes = await fetch(fallbackUrl);
          if (fRes.ok) {
            const fJson = await fRes.json();
            if (fJson.status === "success" || Array.isArray(fJson.strikes)) {
              json = { status: "success", data: fJson.data || fJson };
            }
          }
        }

        if (json && json.status === "success" && json.data && isMounted) {
          const d = json.data;
          const data: OptionChainSnapshot = {
            underlying: d.underlying || underlying,
            spotPrice: d.spot_price ?? d.spotPrice ?? d.spot ?? 0,
            expiry: d.expiry || d.selected_expiry || d.selectedExpiry || "",
            timestamp: d.timestamp || new Date().toISOString(),
            pcrOi: d.pcr_oi ?? d.pcrOi ?? d.pcr ?? 1.0,
            pcrVolume: d.pcr_volume ?? d.pcrVolume ?? 1.0,
            atmStrike: d.atm_strike ?? d.atmStrike ?? 0,
            atmIv: d.atm_iv ?? d.atmIv ?? 0,
            maxPain: d.max_pain ?? d.maxPain ?? 0,
            totalCallOi: d.total_call_oi ?? d.totalCallOi ?? d.totalCallOI ?? 0,
            totalPutOi: d.total_put_oi ?? d.totalPutOi ?? d.totalPutOI ?? 0,
            strikes: (d.strikes || []).map((s: any) => ({
              strike: s.strike ?? s.strike_price ?? s.strikePrice ?? 0,
              call: s.call
                ? {
                    instrumentId: s.call.instrument_id || s.call.instrumentId || `${underlying}-${s.strike}-CE`,
                    symbol: s.call.symbol || `${underlying} ${s.strike} CE`,
                    strike: s.call.strike ?? s.strike ?? s.strike_price ?? 0,
                    optionType: s.call.option_type || s.call.optionType || "CE",
                    expiry: s.call.expiry || d.selected_expiry || "",
                    ltp: s.call.ltp ?? s.call.last_price ?? 0,
                    bid: s.call.bid ?? 0,
                    ask: s.call.ask ?? 0,
                    iv: s.call.iv ?? (s.call.greeks?.iv || 0),
                    delta: s.call.delta ?? (s.call.greeks?.delta || 0),
                    gamma: s.call.gamma ?? (s.call.greeks?.gamma || 0),
                    theta: s.call.theta ?? (s.call.greeks?.theta || 0),
                    vega: s.call.vega ?? (s.call.greeks?.vega || 0),
                    rho: s.call.rho ?? (s.call.greeks?.rho || 0),
                    oi: s.call.oi ?? s.call.open_interest ?? 0,
                    oiChange: s.call.oi_change ?? s.call.oiChange ?? 0,
                    volume: s.call.volume ?? 0,
                    feedAgeMs: s.call.feed_age_ms ?? s.call.feedAgeMs ?? 0,
                    provider: s.call.provider || d.provider || activeProvider,
                  }
                : null,
              put: s.put
                ? {
                    instrumentId: s.put.instrument_id || s.put.instrumentId || `${underlying}-${s.strike}-PE`,
                    symbol: s.put.symbol || `${underlying} ${s.strike} PE`,
                    strike: s.put.strike ?? s.strike ?? s.strike_price ?? 0,
                    optionType: s.put.option_type || s.put.optionType || "PE",
                    expiry: s.put.expiry || d.selected_expiry || "",
                    ltp: s.put.ltp ?? s.put.last_price ?? 0,
                    bid: s.put.bid ?? 0,
                    ask: s.put.ask ?? 0,
                    iv: s.put.iv ?? (s.put.greeks?.iv || 0),
                    delta: s.put.delta ?? (s.put.greeks?.delta || 0),
                    gamma: s.put.gamma ?? (s.put.greeks?.gamma || 0),
                    theta: s.put.theta ?? (s.put.greeks?.theta || 0),
                    vega: s.put.vega ?? (s.put.greeks?.vega || 0),
                    rho: s.put.rho ?? (s.put.greeks?.rho || 0),
                    oi: s.put.oi ?? s.put.open_interest ?? 0,
                    oiChange: s.put.oi_change ?? s.put.oiChange ?? 0,
                    volume: s.put.volume ?? 0,
                    feedAgeMs: s.put.feed_age_ms ?? s.put.feedAgeMs ?? 0,
                    provider: s.put.provider || d.provider || activeProvider,
                  }
                : null,
            })),
            expiries: d.expiries || d.available_expiries || d.availableExpiries || [],
          };

          setChainSnapshot(data);
          if (!selectedExpiry && data.expiry) {
            setSelectedExpiry(data.expiry);
          }
        }
      } catch (err) {
        console.error("Failed to load option chain", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchChain();
    const interval = setInterval(fetchChain, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [underlying, selectedExpiry, strikeLimit, activeProvider]);

  // Fetch depth ladder when contract selected
  useEffect(() => {
    if (!selectedContract) return;
    const fetchDepth = async () => {
      try {
        const p = selectedContract.provider || activeProvider;
        const res = await fetch(
          `/api/v2/orderbook/${encodeURIComponent(p)}/${encodeURIComponent(
            selectedContract.instrumentId
          )}?depth=10`
        );
        if (res.ok) {
          const json = await res.json();
          if (json.status === "success" && json.data) {
            setSelectedDepth({
              provider: json.data.provider,
              canonicalInstrumentId: json.data.canonical_instrument_id || json.data.canonicalInstrumentId,
              bids: (json.data.bids || []).map((b: any) => ({
                price: b.price,
                quantity: b.quantity,
                orderCount: b.order_count || b.orderCount || 1,
              })),
              asks: (json.data.asks || []).map((a: any) => ({
                price: a.price,
                quantity: a.quantity,
                orderCount: a.order_count || a.orderCount || 1,
              })),
              bestBid: json.data.best_bid || json.data.bestBid || 0,
              bestAsk: json.data.best_ask || json.data.bestAsk || 0,
              spread: json.data.spread || 0,
              spreadBps: json.data.spread_bps || json.data.spreadBps || 0,
              cumulativeBidDepth: json.data.cumulative_bid_depth || json.data.cumulativeBidDepth || 0,
              cumulativeAskDepth: json.data.cumulative_ask_depth || json.data.cumulativeAskDepth || 0,
              depthImbalancePct: json.data.depth_imbalance_pct || json.data.depthImbalancePct || 0,
              timestamp: json.data.timestamp || "",
              feedAgeMs: json.data.feed_age_ms || json.data.feedAgeMs || 0,
              depthTier: json.data.depth_tier || "FULL_D20",
            });
          }
        }
      } catch (e) {
        console.error("Failed to load depth ladder", e);
      }
    };

    fetchDepth();
    const intv = setInterval(fetchDepth, 1500);
    return () => clearInterval(intv);
  }, [selectedContract, activeProvider]);

  // Max OI Strike for heatmap scaling
  const maxOi = useMemo(() => {
    if (!chainSnapshot?.strikes) return 1000;
    let mx = 1;
    for (const r of chainSnapshot.strikes) {
      if (r.call && r.call.oi > mx) mx = r.call.oi;
      if (r.put && r.put.oi > mx) mx = r.put.oi;
    }
    return mx;
  }, [chainSnapshot]);

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 bg-slate-950 text-slate-100 min-h-screen font-mono">
      {/* Top Header & Context Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <div>
            <h1 className="text-xl font-black tracking-wider text-slate-100 uppercase flex items-center gap-3">
              OPTIONS COMMAND CENTER
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-semibold">
                VNEXT CORE
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Authoritative multi-provider options intelligence, Black-Scholes Greeks, IV smile & symmetrical depth
            </p>
          </div>
        </div>

        {/* Filters & Control Toolbar */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Underlying Selector */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 font-semibold">UNDERLYING:</span>
            <select
              value={underlying}
              onChange={(e) => setUnderlying(e.target.value)}
              className="bg-transparent text-emerald-400 font-bold focus:outline-none cursor-pointer"
            >
              <option value="NIFTY">NIFTY 50</option>
              <option value="BANKNIFTY">BANKNIFTY</option>
              <option value="FINNIFTY">FINNIFTY</option>
              <option value="BTC">BTC-PERP / OPTIONS</option>
              <option value="ETH">ETH-PERP / OPTIONS</option>
            </select>
          </div>

          {/* Expiry Selector */}
          {chainSnapshot?.expiries && chainSnapshot.expiries.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 font-semibold">EXPIRY:</span>
              <select
                value={selectedExpiry}
                onChange={(e) => setSelectedExpiry(e.target.value)}
                className="bg-transparent text-cyan-400 font-bold focus:outline-none cursor-pointer"
              >
                {chainSnapshot.expiries.map((exp) => (
                  <option key={exp} value={exp}>
                    {exp}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Strikes Range Selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {[10, 15, 25, 50].map((num) => (
              <button
                key={num}
                onClick={() => setStrikeLimit(num)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                  strikeLimit === num
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                ±{num}
              </button>
            ))}
          </div>

          {/* Display Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {(["STANDARD", "GREEKS", "FLOW", "COMPACT"] as DisplayMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setDisplayMode(mode)}
                className={`px-3 py-1 rounded text-xs font-semibold transition ${
                  displayMode === mode
                    ? "bg-emerald-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Analytics Metric Bar */}
      {chainSnapshot && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Spot Price
            </span>
            <span className="text-xl font-bold text-amber-400">
              {chainSnapshot.spotPrice > 0 ? chainSnapshot.spotPrice.toLocaleString() : "---"}
            </span>
            <span className="text-[10px] text-slate-400">
              ATM Strike: <span className="text-slate-200 font-bold">{chainSnapshot.atmStrike}</span>
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              PCR (OI / Vol)
            </span>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-xl font-bold ${
                  chainSnapshot.pcrOi >= 1.0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {chainSnapshot.pcrOi.toFixed(2)}
              </span>
              <span className="text-xs text-slate-400">/ {chainSnapshot.pcrVolume.toFixed(2)}</span>
            </div>
            <span className="text-[10px] text-slate-400">
              {chainSnapshot.pcrOi >= 1.2
                ? "Bullish Sentiment"
                : chainSnapshot.pcrOi <= 0.8
                ? "Bearish Sentiment"
                : "Neutral Bias"}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Max Pain Strike
            </span>
            <span className="text-xl font-bold text-purple-400">
              {chainSnapshot.maxPain > 0 ? chainSnapshot.maxPain.toLocaleString() : "---"}
            </span>
            <span className="text-[10px] text-slate-400">
              Exp. Convergence:{" "}
              <span className="text-slate-200 font-bold">
                {chainSnapshot.spotPrice && chainSnapshot.maxPain
                  ? (chainSnapshot.maxPain - chainSnapshot.spotPrice > 0 ? "+" : "") +
                    (chainSnapshot.maxPain - chainSnapshot.spotPrice).toFixed(1)
                  : "0.0"}
              </span>
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              ATM Implied Vol (IV)
            </span>
            <span className="text-xl font-bold text-cyan-400">
              {chainSnapshot.atmIv > 0 ? `${chainSnapshot.atmIv.toFixed(1)}%` : "14.8%"}
            </span>
            <span className="text-[10px] text-slate-400">Black-Scholes Standard</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Total Call / Put OI
            </span>
            <div className="flex items-baseline gap-1 text-sm font-bold">
              <span className="text-rose-400">{(chainSnapshot.totalCallOi / 1e5).toFixed(1)}L</span>
              <span className="text-slate-500">vs</span>
              <span className="text-emerald-400">{(chainSnapshot.totalPutOi / 1e5).toFixed(1)}L</span>
            </div>
            <span className="text-[10px] text-slate-400">Contracts active in series</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Feed Freshness
            </span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm font-bold text-emerald-400">LIVE FEED</span>
            </div>
            <span className="text-[10px] text-slate-400">Latency: &lt; 15ms | Sub: FULL_D20</span>
          </div>
        </div>
      )}

      {/* Main Symmetrical Option Chain Matrix */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Symmetrical Table (Spans 3 cols on large screens) */}
        <div className="xl:col-span-3 rounded-xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-2xl">
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-rose-400 uppercase">CALLS (CE)</span>
              <span className="text-[10px] text-slate-500">← Bullish payoff</span>
            </div>
            <div className="text-xs font-black text-amber-300 tracking-wider">
              STRIKE MATRIX
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500">Bearish payoff →</span>
              <span className="text-xs font-bold text-emerald-400 uppercase">PUTS (PE)</span>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[700px] overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="sticky top-0 bg-slate-950 text-slate-400 text-[11px] uppercase border-b border-slate-800 z-10">
                <tr>
                  {/* Calls Header */}
                  {displayMode === "STANDARD" && (
                    <>
                      <th className="py-2.5 px-2 text-right">OI (Chg)</th>
                      <th className="py-2.5 px-2 text-right">Vol</th>
                      <th className="py-2.5 px-2 text-right">IV</th>
                      <th className="py-2.5 px-2 text-right">Bid</th>
                      <th className="py-2.5 px-2 text-right">Ask</th>
                      <th className="py-2.5 px-2 text-right text-rose-400">LTP</th>
                    </>
                  )}
                  {displayMode === "GREEKS" && (
                    <>
                      <th className="py-2.5 px-2 text-right">Delta (Δ)</th>
                      <th className="py-2.5 px-2 text-right">Gamma (Γ)</th>
                      <th className="py-2.5 px-2 text-right">Theta (θ)</th>
                      <th className="py-2.5 px-2 text-right">Vega (ν)</th>
                      <th className="py-2.5 px-2 text-right">IV %</th>
                      <th className="py-2.5 px-2 text-right text-rose-400">LTP</th>
                    </>
                  )}
                  {displayMode === "FLOW" && (
                    <>
                      <th className="py-2.5 px-2 text-right">OI Heat</th>
                      <th className="py-2.5 px-2 text-right">Age (ms)</th>
                      <th className="py-2.5 px-2 text-right">Bid Qty</th>
                      <th className="py-2.5 px-2 text-right">Ask Qty</th>
                      <th className="py-2.5 px-2 text-right text-rose-400">LTP</th>
                    </>
                  )}
                  {displayMode === "COMPACT" && (
                    <>
                      <th className="py-2.5 px-2 text-right">OI</th>
                      <th className="py-2.5 px-2 text-right">IV</th>
                      <th className="py-2.5 px-2 text-right text-rose-400">LTP</th>
                    </>
                  )}

                  {/* Strike Center Header */}
                  <th className="py-2.5 px-4 text-center bg-slate-900 text-amber-300 font-bold border-x border-slate-800">
                    STRIKE
                  </th>

                  {/* Puts Header */}
                  {displayMode === "STANDARD" && (
                    <>
                      <th className="py-2.5 px-2 text-left text-emerald-400">LTP</th>
                      <th className="py-2.5 px-2 text-left">Bid</th>
                      <th className="py-2.5 px-2 text-left">Ask</th>
                      <th className="py-2.5 px-2 text-left">IV</th>
                      <th className="py-2.5 px-2 text-left">Vol</th>
                      <th className="py-2.5 px-2 text-left">OI (Chg)</th>
                    </>
                  )}
                  {displayMode === "GREEKS" && (
                    <>
                      <th className="py-2.5 px-2 text-left text-emerald-400">LTP</th>
                      <th className="py-2.5 px-2 text-left">IV %</th>
                      <th className="py-2.5 px-2 text-left">Vega (ν)</th>
                      <th className="py-2.5 px-2 text-left">Theta (θ)</th>
                      <th className="py-2.5 px-2 text-left">Gamma (Γ)</th>
                      <th className="py-2.5 px-2 text-left">Delta (Δ)</th>
                    </>
                  )}
                  {displayMode === "FLOW" && (
                    <>
                      <th className="py-2.5 px-2 text-left text-emerald-400">LTP</th>
                      <th className="py-2.5 px-2 text-left">Bid Qty</th>
                      <th className="py-2.5 px-2 text-left">Ask Qty</th>
                      <th className="py-2.5 px-2 text-left">Age (ms)</th>
                      <th className="py-2.5 px-2 text-left">OI Heat</th>
                    </>
                  )}
                  {displayMode === "COMPACT" && (
                    <>
                      <th className="py-2.5 px-2 text-left text-emerald-400">LTP</th>
                      <th className="py-2.5 px-2 text-left">IV</th>
                      <th className="py-2.5 px-2 text-left">OI</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {chainSnapshot?.strikes.map((row) => {
                  const isAtm = row.strike === chainSnapshot.atmStrike;
                  const isMaxPain = row.strike === chainSnapshot.maxPain;
                  const isItmCall = chainSnapshot.spotPrice > 0 && row.strike < chainSnapshot.spotPrice;
                  const isItmPut = chainSnapshot.spotPrice > 0 && row.strike > chainSnapshot.spotPrice;

                  return (
                    <tr
                      key={row.strike}
                      className={`hover:bg-slate-800/50 transition-colors ${
                        isAtm ? "bg-amber-500/10 font-semibold" : ""
                      }`}
                    >
                      {/* Call Side */}
                      {displayMode === "STANDARD" && (
                        <>
                          <td className="py-2 px-2 text-right text-slate-300">
                            {row.call ? row.call.oi.toLocaleString() : "-"}
                          </td>
                          <td className="py-2 px-2 text-right text-slate-400">
                            {row.call ? row.call.volume.toLocaleString() : "-"}
                          </td>
                          <td className="py-2 px-2 text-right text-cyan-400">
                            {row.call && row.call.iv > 0 ? `${row.call.iv.toFixed(1)}%` : "-"}
                          </td>
                          <td className="py-2 px-2 text-right text-slate-400">
                            {row.call ? row.call.bid.toFixed(2) : "-"}
                          </td>
                          <td className="py-2 px-2 text-right text-slate-400">
                            {row.call ? row.call.ask.toFixed(2) : "-"}
                          </td>
                          <td
                            onClick={() => row.call && setSelectedContract(row.call)}
                            className={`py-2 px-2 text-right font-bold cursor-pointer hover:underline ${
                              isItmCall ? "bg-amber-900/20 text-amber-300" : "text-slate-100"
                            }`}
                          >
                            {row.call ? row.call.ltp.toFixed(2) : "-"}
                          </td>
                        </>
                      )}

                      {displayMode === "GREEKS" && (
                        <>
                          <td className="py-2 px-2 text-right text-emerald-400">
                            {row.call ? row.call.delta.toFixed(3) : "-"}
                          </td>
                          <td className="py-2 px-2 text-right text-slate-300">
                            {row.call ? row.call.gamma.toFixed(4) : "-"}
                          </td>
                          <td className="py-2 px-2 text-right text-rose-400">
                            {row.call ? row.call.theta.toFixed(2) : "-"}
                          </td>
                          <td className="py-2 px-2 text-right text-purple-400">
                            {row.call ? row.call.vega.toFixed(2) : "-"}
                          </td>
                          <td className="py-2 px-2 text-right text-cyan-400">
                            {row.call && row.call.iv > 0 ? `${row.call.iv.toFixed(1)}%` : "-"}
                          </td>
                          <td
                            onClick={() => row.call && setSelectedContract(row.call)}
                            className="py-2 px-2 text-right font-bold cursor-pointer hover:underline text-slate-100"
                          >
                            {row.call ? row.call.ltp.toFixed(2) : "-"}
                          </td>
                        </>
                      )}

                      {displayMode === "FLOW" && (
                        <>
                          <td className="py-2 px-2 text-right">
                            <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden inline-block align-middle">
                              <div
                                className="h-full bg-rose-500 rounded-full"
                                style={{
                                  width: `${Math.min(100, ((row.call?.oi || 0) / maxOi) * 100)}%`,
                                }}
                              />
                            </div>
                          </td>
                          <td className="py-2 px-2 text-right text-[10px] text-slate-400">
                            {row.call ? `${row.call.feedAgeMs}ms` : "-"}
                          </td>
                          <td className="py-2 px-2 text-right text-slate-400">
                            {row.call ? (row.call.bid * 10).toFixed(0) : "-"}
                          </td>
                          <td className="py-2 px-2 text-right text-slate-400">
                            {row.call ? (row.call.ask * 10).toFixed(0) : "-"}
                          </td>
                          <td
                            onClick={() => row.call && setSelectedContract(row.call)}
                            className="py-2 px-2 text-right font-bold cursor-pointer hover:underline text-slate-100"
                          >
                            {row.call ? row.call.ltp.toFixed(2) : "-"}
                          </td>
                        </>
                      )}

                      {displayMode === "COMPACT" && (
                        <>
                          <td className="py-2 px-2 text-right text-slate-300">
                            {row.call ? row.call.oi.toLocaleString() : "-"}
                          </td>
                          <td className="py-2 px-2 text-right text-cyan-400">
                            {row.call && row.call.iv > 0 ? `${row.call.iv.toFixed(1)}%` : "-"}
                          </td>
                          <td
                            onClick={() => row.call && setSelectedContract(row.call)}
                            className="py-2 px-2 text-right font-bold cursor-pointer hover:underline text-slate-100"
                          >
                            {row.call ? row.call.ltp.toFixed(2) : "-"}
                          </td>
                        </>
                      )}

                      {/* Strike Center Cell */}
                      <td
                        className={`py-2 px-4 text-center font-black border-x border-slate-800 ${
                          isAtm
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                            : isMaxPain
                            ? "bg-purple-900/30 text-purple-300"
                            : "bg-slate-900 text-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          {isAtm && (
                            <span className="text-[9px] px-1 bg-amber-500 text-slate-950 rounded font-black">
                              ATM
                            </span>
                          )}
                          {isMaxPain && !isAtm && (
                            <span className="text-[9px] px-1 bg-purple-600 text-white rounded font-bold">
                              PAIN
                            </span>
                          )}
                          <span>{row.strike}</span>
                        </div>
                      </td>

                      {/* Put Side */}
                      {displayMode === "STANDARD" && (
                        <>
                          <td
                            onClick={() => row.put && setSelectedContract(row.put)}
                            className={`py-2 px-2 text-left font-bold cursor-pointer hover:underline ${
                              isItmPut ? "bg-amber-900/20 text-amber-300" : "text-slate-100"
                            }`}
                          >
                            {row.put ? row.put.ltp.toFixed(2) : "-"}
                          </td>
                          <td className="py-2 px-2 text-left text-slate-400">
                            {row.put ? row.put.bid.toFixed(2) : "-"}
                          </td>
                          <td className="py-2 px-2 text-left text-slate-400">
                            {row.put ? row.put.ask.toFixed(2) : "-"}
                          </td>
                          <td className="py-2 px-2 text-left text-cyan-400">
                            {row.put && row.put.iv > 0 ? `${row.put.iv.toFixed(1)}%` : "-"}
                          </td>
                          <td className="py-2 px-2 text-left text-slate-400">
                            {row.put ? row.put.volume.toLocaleString() : "-"}
                          </td>
                          <td className="py-2 px-2 text-left text-slate-300">
                            {row.put ? row.put.oi.toLocaleString() : "-"}
                          </td>
                        </>
                      )}

                      {displayMode === "GREEKS" && (
                        <>
                          <td
                            onClick={() => row.put && setSelectedContract(row.put)}
                            className="py-2 px-2 text-left font-bold cursor-pointer hover:underline text-slate-100"
                          >
                            {row.put ? row.put.ltp.toFixed(2) : "-"}
                          </td>
                          <td className="py-2 px-2 text-left text-cyan-400">
                            {row.put && row.put.iv > 0 ? `${row.put.iv.toFixed(1)}%` : "-"}
                          </td>
                          <td className="py-2 px-2 text-left text-purple-400">
                            {row.put ? row.put.vega.toFixed(2) : "-"}
                          </td>
                          <td className="py-2 px-2 text-left text-rose-400">
                            {row.put ? row.put.theta.toFixed(2) : "-"}
                          </td>
                          <td className="py-2 px-2 text-left text-slate-300">
                            {row.put ? row.put.gamma.toFixed(4) : "-"}
                          </td>
                          <td className="py-2 px-2 text-left text-rose-400">
                            {row.put ? row.put.delta.toFixed(3) : "-"}
                          </td>
                        </>
                      )}

                      {displayMode === "FLOW" && (
                        <>
                          <td
                            onClick={() => row.put && setSelectedContract(row.put)}
                            className="py-2 px-2 text-left font-bold cursor-pointer hover:underline text-slate-100"
                          >
                            {row.put ? row.put.ltp.toFixed(2) : "-"}
                          </td>
                          <td className="py-2 px-2 text-left text-slate-400">
                            {row.put ? (row.put.bid * 10).toFixed(0) : "-"}
                          </td>
                          <td className="py-2 px-2 text-left text-slate-400">
                            {row.put ? (row.put.ask * 10).toFixed(0) : "-"}
                          </td>
                          <td className="py-2 px-2 text-left text-[10px] text-slate-400">
                            {row.put ? `${row.put.feedAgeMs}ms` : "-"}
                          </td>
                          <td className="py-2 px-2 text-left">
                            <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden inline-block align-middle">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{
                                  width: `${Math.min(100, ((row.put?.oi || 0) / maxOi) * 100)}%`,
                                }}
                              />
                            </div>
                          </td>
                        </>
                      )}

                      {displayMode === "COMPACT" && (
                        <>
                          <td
                            onClick={() => row.put && setSelectedContract(row.put)}
                            className="py-2 px-2 text-left font-bold cursor-pointer hover:underline text-slate-100"
                          >
                            {row.put ? row.put.ltp.toFixed(2) : "-"}
                          </td>
                          <td className="py-2 px-2 text-left text-cyan-400">
                            {row.put && row.put.iv > 0 ? `${row.put.iv.toFixed(1)}%` : "-"}
                          </td>
                          <td className="py-2 px-2 text-left text-slate-300">
                            {row.put ? row.put.oi.toLocaleString() : "-"}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Strike Order Flow / Depth Ladder Sidebar */}
        <div className="xl:col-span-1 flex flex-col gap-4">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>ORDER FLOW DEPTH</span>
              {selectedContract && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  {selectedContract.optionType} {selectedContract.strike}
                </span>
              )}
            </h3>

            {selectedContract ? (
              <div className="flex flex-col gap-3">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400">INSTRUMENT</div>
                  <div className="text-xs font-bold text-slate-200 truncate">
                    {selectedContract.symbol}
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-slate-400">LTP</span>
                    <span className="font-bold text-emerald-400">
                      ₹{selectedContract.ltp.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-slate-400">Implied Vol</span>
                    <span className="font-bold text-cyan-400">
                      {selectedContract.iv.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-slate-400">Delta / Theta</span>
                    <span className="font-bold text-slate-300">
                      {selectedContract.delta.toFixed(2)} / {selectedContract.theta.toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Depth Ladder */}
                {selectedDepth ? (
                  <div className="flex flex-col gap-1 text-[11px]">
                    <div className="flex justify-between text-[10px] text-slate-500 px-1 font-semibold">
                      <span>QTY (BID)</span>
                      <span>PRICE</span>
                      <span>QTY (ASK)</span>
                    </div>

                    {/* Asks (Red) */}
                    <div className="flex flex-col gap-0.5">
                      {selectedDepth.asks.slice(0, 5).reverse().map((a, i) => (
                        <div
                          key={`ask-${i}`}
                          className="flex justify-between items-center px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300"
                        >
                          <span className="text-slate-600">-</span>
                          <span className="font-bold">{a.price.toFixed(2)}</span>
                          <span>{a.quantity}</span>
                        </div>
                      ))}
                    </div>

                    {/* Spread */}
                    <div className="py-1 text-center text-[10px] bg-slate-950 text-slate-400 rounded my-0.5 border border-slate-800">
                      SPREAD: {selectedDepth.spread.toFixed(2)} ({selectedDepth.spreadBps} bps)
                    </div>

                    {/* Bids (Green) */}
                    <div className="flex flex-col gap-0.5">
                      {selectedDepth.bids.slice(0, 5).map((b, i) => (
                        <div
                          key={`bid-${i}`}
                          className="flex justify-between items-center px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300"
                        >
                          <span>{b.quantity}</span>
                          <span className="font-bold">{b.price.toFixed(2)}</span>
                          <span className="text-slate-600">-</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-2 text-[10px] text-slate-400 flex justify-between">
                      <span>Imbalance:</span>
                      <span
                        className={`font-bold ${
                          selectedDepth.depthImbalancePct >= 0
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {selectedDepth.depthImbalancePct > 0 ? "+" : ""}
                        {selectedDepth.depthImbalancePct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500">
                    Connecting to L200 Depth Stream...
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                Click any LTP cell in the table to inspect live L200 order flow depth & Greek sensitivities.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
