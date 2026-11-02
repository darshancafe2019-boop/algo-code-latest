"use client";

import { formatNumber, formatMoney } from "@/lib/formatters";
import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { OptionChainData } from "@/types/market-universe";
import { X, Layers, RefreshCw, ShieldAlert } from "lucide-react";
import { normalizeExpiriesList } from "@/lib/expiry-utils";

interface OptionChainModalProps {
  underlying: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectContract?: (symbol: string, type: "CE" | "PE", strike: number, price: number) => void;
}

export function OptionChainModal({ underlying, isOpen, onClose, onSelectContract }: OptionChainModalProps) {
  const [selectedUnderlying, setSelectedUnderlying] = useState(underlying || "NIFTY50");
  const [selectedExpiry, setSelectedExpiry] = useState<string>("");

  useEffect(() => {
    if (underlying) {
      setSelectedUnderlying(underlying);
      setSelectedExpiry("");
    }
  }, [underlying]);

  const isCrypto = useMemo(() => {
    const u = (selectedUnderlying || "").toUpperCase();
    return u.includes("BTC") || u.includes("ETH") || u.includes("SOL") || u.includes("XRP") || u.includes("BINANCE") || u.includes("DELTA");
  }, [selectedUnderlying]);

  const currencySymbol = isCrypto ? "$" : "₹";

  const { data, isLoading, refetch, isFetching } = useQuery<{ status: string; data: OptionChainData }>({
    queryKey: ["optionChain", selectedUnderlying, selectedExpiry],
    queryFn: async () => {
      const res = await fetch(`/api/market/option-chain?underlying=${encodeURIComponent(selectedUnderlying)}&expiry=${encodeURIComponent(selectedExpiry)}`);
      if (!res.ok) throw new Error("Failed to fetch option chain");
      return res.json();
    },
    enabled: isOpen,
    refetchInterval: 3000,
  });

  const chain = data?.data || (data as any);
  const spotPrice = Number(chain?.spot_price || chain?.spot || 0.0);
  const strikes: any[] = chain?.strikes || chain?.chain || chain?.rows || [];
  const normalizedExpiries = useMemo(() => {
    const rawExpiries = chain?.available_expiries || chain?.availableExpiries || [];
    return normalizeExpiriesList(rawExpiries, selectedUnderlying);
  }, [chain?.available_expiries, chain?.availableExpiries, selectedUnderlying]);
  const activeExpiry = selectedExpiry || chain?.selected_expiry || chain?.selectedExpiry || normalizedExpiries[0]?.value || "";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#0B0E14] border border-[#1A2A3F] rounded-2xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="p-4 bg-[#121824] border-b border-[#1A2A3F] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Real-Time Option Chain & Greeks Ladder
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[11px] font-bold border border-cyan-500/30">
                  {selectedUnderlying}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-mono font-bold">
                  Spot: {isCrypto ? `$${spotPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : formatMoney(spotPrice, "₹")}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Authoritative strike matrix with Open Interest, Implied Volatility, and Black-Scholes Greeks.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Underlying Switcher */}
            <select
              value={selectedUnderlying}
              onChange={(e) => {
                setSelectedUnderlying(e.target.value);
                setSelectedExpiry("");
              }}
              className="px-3 py-1.5 rounded-lg bg-[#0F141F] border border-[#1A2A3F] text-xs font-semibold text-white focus:outline-none focus:border-cyan-500"
            >
              {!["BTC", "ETH", "SOL", "NIFTY50", "BANKNIFTY", "FINNIFTY", "RELIANCE", "TCS", "HDFCBANK"].includes(selectedUnderlying) && (
                <option value={selectedUnderlying}>{selectedUnderlying}</option>
              )}
              <optgroup label="Crypto (Delta)">
                <option value="BTC">BTC (Bitcoin)</option>
                <option value="ETH">ETH (Ethereum)</option>
                <option value="SOL">SOL (Solana)</option>
              </optgroup>
              <optgroup label="Indian Indices (NSE)">
                <option value="NIFTY50">NIFTY 50</option>
                <option value="BANKNIFTY">BANK NIFTY</option>
                <option value="FINNIFTY">FIN NIFTY</option>
              </optgroup>
              <optgroup label="Indian Equities (NSE)">
                <option value="RELIANCE">RELIANCE</option>
                <option value="TCS">TCS</option>
                <option value="HDFCBANK">HDFC BANK</option>
              </optgroup>
            </select>

            {/* Expiry Selector */}
            {normalizedExpiries.length > 0 && (
              <select
                value={activeExpiry}
                onChange={(e) => setSelectedExpiry(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-[#0F141F] border border-[#1A2A3F] text-xs font-semibold text-cyan-300 focus:outline-none focus:border-cyan-500"
              >
                {normalizedExpiries.map((opt) => (
                  <option key={opt.key} value={opt.value}>
                    Expiry: {opt.label}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => refetch()}
              className="p-2 rounded-lg bg-[#0F141F] hover:bg-slate-800 border border-[#1A2A3F] text-slate-300 hover:text-white"
              title="Refresh Option Chain"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin text-cyan-400" : ""}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-[#0F141F] hover:bg-red-500/20 border border-[#1A2A3F] hover:border-red-500/40 text-slate-400 hover:text-red-400 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Chain Table View */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
              <RefreshCw className="h-7 w-7 animate-spin text-cyan-400" />
              <p className="text-xs">Assembling strike ladder and Greek surfaces...</p>
            </div>
          ) : strikes.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <ShieldAlert className="h-8 w-8 mx-auto mb-2 text-amber-400" />
              <p className="text-sm font-semibold text-white">No active strikes discovered for {selectedUnderlying}</p>
              <p className="text-xs text-slate-400 mt-1">Please sync the derivatives engine or select another expiry.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-[#121824] border-b border-[#1A2A3F] text-[11px] text-slate-400">
                  <th colSpan={7} className="text-center py-2 bg-emerald-950/20 text-emerald-300 font-bold border-r border-[#1A2A3F]">
                    CALL OPTIONS (CE)
                  </th>
                  <th className="text-center py-2 px-3 bg-[#0B0E14] text-white font-bold tracking-wider">
                    STRIKE
                  </th>
                  <th colSpan={7} className="text-center py-2 bg-rose-950/20 text-rose-300 font-bold border-l border-[#1A2A3F]">
                    PUT OPTIONS (PE)
                  </th>
                </tr>
                <tr className="bg-[#0D121C] border-b border-[#1A2A3F] text-[10px] text-slate-400">
                  {/* Call Columns */}
                  <th className="py-2 px-2 text-right">OI (Lots)</th>
                  <th className="py-2 px-2 text-right">OI Chg</th>
                  <th className="py-2 px-2 text-right">IV%</th>
                  <th className="py-2 px-2 text-right">Delta</th>
                  <th className="py-2 px-2 text-right">LTP ({currencySymbol})</th>
                  <th className="py-2 px-2 text-right">Chg%</th>
                  <th className="py-2 px-2 text-center border-r border-[#1A2A3F]">Action</th>

                  {/* Strike Column */}
                  <th className="py-2 px-3 text-center bg-[#121824] text-white font-bold">Strike</th>

                  {/* Put Columns */}
                  <th className="py-2 px-2 text-center border-l border-[#1A2A3F]">Action</th>
                  <th className="py-2 px-2 text-left">Chg%</th>
                  <th className="py-2 px-2 text-left">LTP ({currencySymbol})</th>
                  <th className="py-2 px-2 text-left">Delta</th>
                  <th className="py-2 px-2 text-left">IV%</th>
                  <th className="py-2 px-2 text-left">OI Chg</th>
                  <th className="py-2 px-2 text-left">OI (Lots)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#161F30]">
                {strikes.map((s: any) => {
                  const strikeNum = Number(s.strike ?? s.strikePrice ?? 0);
                  const isAtm = Boolean(s.isATM || s.is_atm) || (spotPrice > 0 && Math.abs(strikeNum - spotPrice) <= (isCrypto ? (spotPrice * 0.005) : 35));
                  const isCallItm = strikeNum < spotPrice;
                  const isPutItm = strikeNum > spotPrice;

                  // Call leg properties
                  const callObj = s.call || s.ce;
                  const callLtp = callObj?.last_price ?? callObj?.ltp ?? callObj?.price ?? callObj?.last;
                  const callIv = callObj?.implied_volatility ?? callObj?.iv ?? callObj?.greeks?.iv;
                  const callDelta = callObj?.delta ?? callObj?.greeks?.delta;
                  const callOi = callObj?.open_interest ?? callObj?.oi ?? callObj?.openInterest;
                  const callOiChg = callObj?.oi_change ?? callObj?.oiChange;
                  const callChg = callObj?.change_24h ?? callObj?.change ?? callObj?.change_pct ?? callObj?.changePct;

                  // Put leg properties
                  const putObj = s.put || s.pe;
                  const putLtp = putObj?.last_price ?? putObj?.ltp ?? putObj?.price ?? putObj?.last;
                  const putIv = putObj?.implied_volatility ?? putObj?.iv ?? putObj?.greeks?.iv;
                  const putDelta = putObj?.delta ?? putObj?.greeks?.delta;
                  const putOi = putObj?.open_interest ?? putObj?.oi ?? putObj?.openInterest;
                  const putOiChg = putObj?.oi_change ?? putObj?.oiChange;
                  const putChg = putObj?.change_24h ?? putObj?.change ?? putObj?.change_pct ?? putObj?.changePct;

                  return (
                    <tr
                      key={strikeNum}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isAtm ? "bg-cyan-500/10 font-bold ring-1 ring-cyan-500/30" : ""
                      }`}
                    >
                      {/* Call OI */}
                      <td className={`py-2 px-2 text-right ${isCallItm ? "bg-emerald-950/10 text-slate-300" : "text-slate-400"}`}>
                        {callOi != null && Number(callOi) > 0
                          ? (isCrypto ? Number(callOi).toFixed(2) : (Number(callOi) >= 1000 ? `${(Number(callOi) / 1000).toFixed(0)}k` : String(callOi)))
                          : "—"}
                      </td>
                      {/* Call OI Chg */}
                      <td className="py-2 px-2 text-right text-[10px]">
                        {callOiChg != null ? (
                          <span className={Number(callOiChg) >= 0 ? "text-emerald-400" : "text-rose-400"}>
                            {Number(callOiChg) > 0 ? "+" : ""}
                            {Math.abs(Number(callOiChg)) >= 1000 ? `${(Number(callOiChg) / 1000).toFixed(1)}k` : Number(callOiChg).toFixed(0)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      {/* Call IV */}
                      <td className="py-2 px-2 text-right text-slate-400 text-[10px]">
                        {callIv != null ? `${Number(callIv).toFixed(1)}%` : "—"}
                      </td>
                      {/* Call Delta */}
                      <td className="py-2 px-2 text-right text-cyan-300 text-[10px]">
                        {callDelta != null ? Number(callDelta).toFixed(2) : "—"}
                      </td>
                      {/* Call LTP */}
                      <td className={`py-2 px-2 text-right font-bold ${isCallItm ? "text-emerald-300" : "text-white"}`}>
                        {callLtp != null ? `${currencySymbol}${Number(callLtp).toFixed(2)}` : "—"}
                      </td>
                      {/* Call Chg% */}
                      <td className="py-2 px-2 text-right text-[10px]">
                        {callChg != null ? (
                          <span className={Number(callChg) >= 0 ? "text-emerald-400" : "text-rose-400"}>
                            {Number(callChg) > 0 ? "+" : ""}
                            {Number(callChg).toFixed(1)}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      {/* Call Quick Buy */}
                      <td className="py-1 px-2 text-center border-r border-[#1A2A3F]">
                        {callObj && (
                          <button
                            onClick={() =>
                              onSelectContract?.(
                                callObj.canonical_symbol || callObj.symbol || `${selectedUnderlying}-${activeExpiry}-${strikeNum}-CE`,
                                "CE",
                                strikeNum,
                                Number(callLtp || 0)
                              )
                            }
                            className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 transition-colors"
                          >
                            Buy CE
                          </button>
                        )}
                      </td>

                      {/* Strike Price (Center) */}
                      <td className={`py-2 px-3 text-center bg-[#0F141F] font-bold ${isAtm ? "text-cyan-300 ring-1 ring-cyan-500/40" : "text-white"}`}>
                        {formatNumber(strikeNum)}
                        {isAtm && <span className="ml-1 text-[9px] text-cyan-400 uppercase tracking-tighter">(ATM)</span>}
                      </td>

                      {/* Put Quick Buy */}
                      <td className="py-1 px-2 text-center border-l border-[#1A2A3F]">
                        {putObj && (
                          <button
                            onClick={() =>
                              onSelectContract?.(
                                putObj.canonical_symbol || putObj.symbol || `${selectedUnderlying}-${activeExpiry}-${strikeNum}-PE`,
                                "PE",
                                strikeNum,
                                Number(putLtp || 0)
                              )
                            }
                            className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 text-[10px] font-bold border border-rose-500/30 transition-colors"
                          >
                            Buy PE
                          </button>
                        )}
                      </td>
                      {/* Put Chg% */}
                      <td className="py-2 px-2 text-left text-[10px]">
                        {putChg != null ? (
                          <span className={Number(putChg) >= 0 ? "text-emerald-400" : "text-rose-400"}>
                            {Number(putChg) > 0 ? "+" : ""}
                            {Number(putChg).toFixed(1)}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      {/* Put LTP */}
                      <td className={`py-2 px-2 text-left font-bold ${isPutItm ? "text-rose-300" : "text-white"}`}>
                        {putLtp != null ? `${currencySymbol}${Number(putLtp).toFixed(2)}` : "—"}
                      </td>
                      {/* Put Delta */}
                      <td className="py-2 px-2 text-left text-cyan-300 text-[10px]">
                        {putDelta != null ? Number(putDelta).toFixed(2) : "—"}
                      </td>
                      {/* Put IV */}
                      <td className="py-2 px-2 text-left text-slate-400 text-[10px]">
                        {putIv != null ? `${Number(putIv).toFixed(1)}%` : "—"}
                      </td>
                      {/* Put OI Chg */}
                      <td className="py-2 px-2 text-left text-[10px]">
                        {putOiChg != null ? (
                          <span className={Number(putOiChg) >= 0 ? "text-emerald-400" : "text-rose-400"}>
                            {Number(putOiChg) > 0 ? "+" : ""}
                            {Math.abs(Number(putOiChg)) >= 1000 ? `${(Number(putOiChg) / 1000).toFixed(1)}k` : Number(putOiChg).toFixed(0)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      {/* Put OI */}
                      <td className={`py-2 px-2 text-left ${isPutItm ? "bg-rose-950/10 text-slate-300" : "text-slate-400"}`}>
                        {putOi != null && Number(putOi) > 0
                          ? (isCrypto ? Number(putOi).toFixed(2) : (Number(putOi) >= 1000 ? `${(Number(putOi) / 1000).toFixed(0)}k` : String(putOi)))
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-[#0D121C] border-t border-[#1A2A3F] flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" /> ITM Calls (Green Shading)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-rose-400 inline-block" /> ITM Puts (Rose Shading)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-cyan-400 inline-block" /> At-The-Money (ATM)
            </span>
          </div>
          <span className="text-slate-500 font-mono">Realtime Greeks (Delta, IV, Theta, Vega) dynamically computed</span>
        </div>
      </div>
    </div>
  );
}
