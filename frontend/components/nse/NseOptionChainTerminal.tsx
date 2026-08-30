"use client";

import React, { useState } from "react";
import {
  Layers,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Zap,
  Crosshair,
  BarChart2,
  ShieldAlert,
} from "lucide-react";
import { useNseOptionChain } from "@/hooks/useNseData";
import { NseOptionStrikeRow } from "@/types/nse";
import { NseQuickOrderModal } from "./NseQuickOrderModal";
import { normalizeExpiriesList } from "@/lib/expiry-utils";

const POPULAR_UNDERLYINGS = [
  { label: "NIFTY 50", symbol: "NIFTY", lotSize: 50 },
  { label: "BANK NIFTY", symbol: "BANKNIFTY", lotSize: 15 },
  { label: "FIN NIFTY", symbol: "FINNIFTY", lotSize: 25 },
  { label: "RELIANCE", symbol: "RELIANCE", lotSize: 250 },
  { label: "TCS", symbol: "TCS", lotSize: 175 },
  { label: "INFY", symbol: "INFY", lotSize: 400 },
  { label: "HDFC BANK", symbol: "HDFCBANK", lotSize: 550 },
];

export function NseOptionChainTerminal() {
  const [selectedSymbol, setSelectedSymbol] = useState("NIFTY");
  const [selectedExpiry, setSelectedExpiry] = useState("");
  const [strikeCount, setStrikeCount] = useState(20);

  // Modal Order State
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderStrike, setOrderStrike] = useState<number | undefined>(undefined);
  const [orderType, setOrderType] = useState<"CE" | "PE">("CE");
  const [orderPrice, setOrderPrice] = useState(100);
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");

  const { data: chainData, isLoading, refetch, isFetching } = useNseOptionChain(
    selectedSymbol,
    selectedExpiry,
    strikeCount
  );

  const spotPrice = chainData?.spot_price || 24350.0;
  const maxPain = chainData?.max_pain_strike || spotPrice;
  const pcr = chainData?.pcr_oi || 1.0;
  const normalizedExpiries = React.useMemo(() => {
    const availableExpiries = chainData?.available_expiries || [];
    return normalizeExpiriesList(availableExpiries, selectedSymbol);
  }, [chainData?.available_expiries, selectedSymbol]);
  const strikes = chainData?.strikes || [];

  const handleOpenOrder = (strike: number, type: "CE" | "PE", price: number, side: "BUY" | "SELL") => {
    setOrderStrike(strike);
    setOrderType(type);
    setOrderPrice(price || 100);
    setOrderSide(side);
    setOrderModalOpen(true);
  };

  return (
    <div className="bg-[#0B132B]/80 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-md">
      {/* Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        {/* Symbol Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800">
          {POPULAR_UNDERLYINGS.map((item) => (
            <button
              key={item.symbol}
              onClick={() => {
                setSelectedSymbol(item.symbol);
                setSelectedExpiry("");
              }}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition ${
                selectedSymbol === item.symbol
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Expiry & Strike Filter */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Expiry selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-sans">Expiry:</span>
            <select
              value={selectedExpiry || (normalizedExpiries[0]?.value || "")}
              onChange={(e) => setSelectedExpiry(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-white font-mono text-xs px-2.5 py-1.5 rounded-lg focus:border-cyan-400 focus:outline-none"
            >
              {normalizedExpiries.map((opt) => (
                <option key={opt.key} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Strike Count */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-sans">Strikes:</span>
            <select
              value={strikeCount}
              onChange={(e) => setStrikeCount(parseInt(e.target.value))}
              className="bg-slate-900 border border-slate-700 text-white font-mono text-xs px-2.5 py-1.5 rounded-lg focus:border-cyan-400 focus:outline-none"
            >
              <option value={10}>10 Strikes</option>
              <option value={20}>20 Strikes</option>
              <option value={30}>30 Strikes</option>
            </select>
          </div>

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-cyan-300 transition"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Analytics Summary Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 font-mono">
        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="text-xs text-slate-400 font-sans">Underlying Spot Price</div>
          <div className="text-lg font-bold text-white mt-1">₹{spotPrice.toLocaleString("en-IN")}</div>
        </div>

        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="text-xs text-slate-400 font-sans">Put-Call Ratio (PCR)</div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-lg font-bold ${pcr > 1 ? "text-emerald-400" : "text-rose-400"}`}>
              {pcr.toFixed(2)}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
              {pcr > 1.2 ? "BULLISH" : pcr < 0.8 ? "BEARISH" : "NEUTRAL"}
            </span>
          </div>
        </div>

        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="text-xs text-slate-400 font-sans">Max Pain Strike</div>
          <div className="text-lg font-bold text-amber-300 mt-1">₹{maxPain.toLocaleString("en-IN")}</div>
        </div>

        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="text-xs text-slate-400 font-sans">Total Call / Put OI</div>
          <div className="text-xs font-bold text-slate-300 mt-2 flex justify-between">
            <span className="text-emerald-400">C: {(chainData?.total_call_oi ? chainData.total_call_oi / 100000 : 12.5).toFixed(1)}L</span>
            <span className="text-rose-400">P: {(chainData?.total_put_oi ? chainData.total_put_oi / 100000 : 14.2).toFixed(1)}L</span>
          </div>
        </div>
      </div>

      {/* Option Chain Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-xs font-mono border-collapse text-right">
          <thead>
            <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
              {/* Call Headers */}
              <th className="py-2.5 px-3 text-left text-emerald-400 font-bold">CALLS (CE)</th>
              <th className="py-2.5 px-2">OI (Chg)</th>
              <th className="py-2.5 px-2">Volume</th>
              <th className="py-2.5 px-2">IV (%)</th>
              <th className="py-2.5 px-2">Delta</th>
              <th className="py-2.5 px-2">Theta</th>
              <th className="py-2.5 px-3 text-emerald-300">LTP</th>

              {/* Center Strike */}
              <th className="py-2.5 px-4 text-center bg-slate-950 text-cyan-300 font-bold border-x border-slate-800">
                STRIKE
              </th>

              {/* Put Headers */}
              <th className="py-2.5 px-3 text-rose-300 text-left">LTP</th>
              <th className="py-2.5 px-2 text-left">Theta</th>
              <th className="py-2.5 px-2 text-left">Delta</th>
              <th className="py-2.5 px-2 text-left">IV (%)</th>
              <th className="py-2.5 px-2 text-left">Volume</th>
              <th className="py-2.5 px-2 text-left">OI (Chg)</th>
              <th className="py-2.5 px-3 text-right text-rose-400 font-bold">PUTS (PE)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {strikes.map((row) => {
              const strike = row.strike;
              const isAtm = row.is_atm;
              const ce = row.ce;
              const pe = row.pe;

              const isCeItm = strike < spotPrice;
              const isPeItm = strike > spotPrice;

              return (
                <tr
                  key={strike}
                  className={`hover:bg-cyan-950/20 transition ${
                    isAtm ? "bg-cyan-950/40 font-bold" : ""
                  }`}
                >
                  {/* CE Quick Action */}
                  <td className={`py-2 px-3 text-left ${isCeItm ? "bg-emerald-950/20" : ""}`}>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenOrder(strike, "CE", ce.ltp, "BUY")}
                        className="px-1.5 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 font-bold text-[10px] transition"
                      >
                        BUY
                      </button>
                      <button
                        onClick={() => handleOpenOrder(strike, "CE", ce.ltp, "SELL")}
                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] transition"
                      >
                        SELL
                      </button>
                    </div>
                  </td>

                  {/* CE OI */}
                  <td className={`py-2 px-2 text-slate-300 ${isCeItm ? "bg-emerald-950/20" : ""}`}>
                    <div>{(ce.open_interest / 1000).toFixed(0)}k</div>
                    <div className={`text-[10px] ${ce.change_in_oi >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {ce.change_in_oi > 0 ? "+" : ""}
                      {(ce.change_in_oi / 1000).toFixed(0)}k
                    </div>
                  </td>

                  {/* CE Volume */}
                  <td className={`py-2 px-2 text-slate-400 ${isCeItm ? "bg-emerald-950/20" : ""}`}>
                    {(ce.volume / 1000).toFixed(0)}k
                  </td>

                  {/* CE IV */}
                  <td className={`py-2 px-2 text-slate-400 ${isCeItm ? "bg-emerald-950/20" : ""}`}>
                    {ce.iv ? ce.iv.toFixed(1) : "14.2"}%
                  </td>

                  {/* CE Delta */}
                  <td className={`py-2 px-2 text-emerald-400 ${isCeItm ? "bg-emerald-950/20" : ""}`}>
                    {ce.delta ? ce.delta.toFixed(2) : "0.50"}
                  </td>

                  {/* CE Theta */}
                  <td className={`py-2 px-2 text-slate-400 ${isCeItm ? "bg-emerald-950/20" : ""}`}>
                    {ce.theta ? ce.theta.toFixed(1) : "-8.2"}
                  </td>

                  {/* CE LTP */}
                  <td className={`py-2 px-3 font-bold text-emerald-300 ${isCeItm ? "bg-emerald-950/20" : ""}`}>
                    ₹{ce.ltp.toFixed(2)}
                  </td>

                  {/* CENTER STRIKE */}
                  <td className="py-2 px-4 text-center bg-slate-950 border-x border-slate-800">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className={`font-bold ${isAtm ? "text-cyan-300 scale-110" : "text-white"}`}>
                        {strike.toLocaleString("en-IN")}
                      </span>
                      {isAtm && (
                        <span className="px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-bold">
                          ATM
                        </span>
                      )}
                    </div>
                  </td>

                  {/* PE LTP */}
                  <td className={`py-2 px-3 font-bold text-rose-300 text-left ${isPeItm ? "bg-rose-950/20" : ""}`}>
                    ₹{pe.ltp.toFixed(2)}
                  </td>

                  {/* PE Theta */}
                  <td className={`py-2 px-2 text-slate-400 text-left ${isPeItm ? "bg-rose-950/20" : ""}`}>
                    {pe.theta ? pe.theta.toFixed(1) : "-7.8"}
                  </td>

                  {/* PE Delta */}
                  <td className={`py-2 px-2 text-rose-400 text-left ${isPeItm ? "bg-rose-950/20" : ""}`}>
                    {pe.delta ? pe.delta.toFixed(2) : "-0.50"}
                  </td>

                  {/* PE IV */}
                  <td className={`py-2 px-2 text-slate-400 text-left ${isPeItm ? "bg-rose-950/20" : ""}`}>
                    {pe.iv ? pe.iv.toFixed(1) : "14.8"}%
                  </td>

                  {/* PE Volume */}
                  <td className={`py-2 px-2 text-slate-400 text-left ${isPeItm ? "bg-rose-950/20" : ""}`}>
                    {(pe.volume / 1000).toFixed(0)}k
                  </td>

                  {/* PE OI */}
                  <td className={`py-2 px-2 text-slate-300 text-left ${isPeItm ? "bg-rose-950/20" : ""}`}>
                    <div>{(pe.open_interest / 1000).toFixed(0)}k</div>
                    <div className={`text-[10px] ${pe.change_in_oi >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {pe.change_in_oi > 0 ? "+" : ""}
                      {(pe.change_in_oi / 1000).toFixed(0)}k
                    </div>
                  </td>

                  {/* PE Quick Action */}
                  <td className={`py-2 px-3 text-right ${isPeItm ? "bg-rose-950/20" : ""}`}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenOrder(strike, "PE", pe.ltp, "BUY")}
                        className="px-1.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white font-bold text-[10px] transition"
                      >
                        BUY
                      </button>
                      <button
                        onClick={() => handleOpenOrder(strike, "PE", pe.ltp, "SELL")}
                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] transition"
                      >
                        SELL
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Quick Order Dialog */}
      <NseQuickOrderModal
        isOpen={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        defaultSymbol={selectedSymbol}
        defaultStrike={orderStrike}
        defaultOptionType={orderType}
        defaultPrice={orderPrice}
        defaultSide={orderSide}
      />
    </div>
  );
}
