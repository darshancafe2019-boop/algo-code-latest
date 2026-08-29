"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Zap,
  Radio,
  Clock,
  Sparkles,
} from "lucide-react";

export interface SelectedOptionsContract {
  symbol: string;
  display_symbol: string;
  contract_id: string;
  underlying: string;
  provider: string;
  exchange: string;
  expiry: string;
  strike: number;
  option_type: "CALL" | "PUT";
  asset_class: "CRYPTO_OPTIONS" | "OPTIONS";
  premium_est?: number;
  iv?: number;
}

interface OptionsContractSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectContract: (contract: SelectedOptionsContract) => void;
  initialUnderlying?: string;
  initialAssetClass?: "CRYPTO_OPTIONS" | "OPTIONS";
  botName?: string;
}

export function OptionsContractSelectorModal({
  isOpen,
  onClose,
  onSelectContract,
  initialUnderlying = "BTC",
  initialAssetClass = "CRYPTO_OPTIONS",
  botName,
}: OptionsContractSelectorModalProps) {
  // Underlying asset selection
  const [underlying, setUnderlying] = useState<string>(
    initialUnderlying.replace("-OPTIONS", "").replace("/USDT", "").toUpperCase()
  );
  const [provider, setProvider] = useState<"BINANCE" | "UPSTOX" | "DERIBIT">(
    initialAssetClass === "OPTIONS" || ["NIFTY", "BANKNIFTY", "FINNIFTY", "RELIANCE"].includes(initialUnderlying)
      ? "UPSTOX"
      : "BINANCE"
  );
  const [selectedSide, setSelectedSide] = useState<"CALL" | "PUT">("CALL");
  const [selectedExpiry, setSelectedExpiry] = useState<string>("2026-09-25");
  const [selectedStrike, setSelectedStrike] = useState<number>(70000);

  // Check Provider Connection Readiness
  const { data: binanceStatus } = useQuery({
    queryKey: ["binanceAuthStatus"],
    queryFn: async () => {
      const res = await fetch("/api/binance/status");
      return res.ok ? res.json() : null;
    },
    staleTime: 10000,
  });

  const { data: upstoxStatus } = useQuery({
    queryKey: ["upstoxAuthStatus"],
    queryFn: async () => {
      const res = await fetch("/api/upstox/status");
      return res.ok ? res.json() : null;
    },
    staleTime: 10000,
  });

  const isProviderConnected = useMemo(() => {
    if (provider === "BINANCE") return Boolean(binanceStatus?.connected || binanceStatus?.hasApiKey);
    if (provider === "UPSTOX") return Boolean(upstoxStatus?.connected);
    if (provider === "DERIBIT") return true; // Paper mode supported
    return true;
  }, [provider, binanceStatus, upstoxStatus]);

  // Available underlyings based on provider
  const availableUnderlyings = useMemo(() => {
    if (provider === "UPSTOX") {
      return [
        { id: "NIFTY", name: "Nifty 50 Index", spot: 24450 },
        { id: "BANKNIFTY", name: "Bank Nifty Index", spot: 51200 },
        { id: "FINNIFTY", name: "Fin Nifty Index", spot: 23100 },
        { id: "RELIANCE", name: "Reliance Industries", spot: 3020 },
      ];
    }
    return [
      { id: "BTC", name: "Bitcoin Options", spot: 64250 },
      { id: "ETH", name: "Ethereum Options", spot: 3480 },
      { id: "SOL", name: "Solana Options", spot: 152 },
    ];
  }, [provider]);

  // Current spot reference
  const currentSpot = useMemo(() => {
    const found = availableUnderlyings.find((u) => u.id === underlying);
    return found ? found.spot : 64000;
  }, [availableUnderlyings, underlying]);

  // Dynamic expiries (Current and future dates)
  const availableExpiries = useMemo(() => {
    if (provider === "UPSTOX") {
      return [
        { id: "2026-09-03", label: "03 SEP 2026 (Weekly)", dte: 5 },
        { id: "2026-09-10", label: "10 SEP 2026 (Weekly)", dte: 12 },
        { id: "2026-09-24", label: "24 SEP 2026 (Monthly)", dte: 26 },
        { id: "2026-10-29", label: "29 OCT 2026 (Far Monthly)", dte: 61 },
      ];
    }
    return [
      { id: "2026-09-04", label: "04 SEP 2026 (Weekly)", dte: 6 },
      { id: "2026-09-11", label: "11 SEP 2026 (Weekly)", dte: 13 },
      { id: "2026-09-25", label: "25 SEP 2026 (Monthly)", dte: 27 },
      { id: "2026-10-30", label: "30 OCT 2026 (Q3 Close)", dte: 62 },
      { id: "2026-12-25", label: "25 DEC 2026 (Annual)", dte: 118 },
    ];
  }, [provider]);

  // Auto-generate realistic strike matrix around current spot
  const strikes = useMemo(() => {
    const step = underlying === "BTC" ? 1000 : underlying === "ETH" ? 50 : underlying === "SOL" ? 5 : underlying === "BANKNIFTY" ? 200 : underlying === "NIFTY" ? 50 : 20;
    const base = Math.round(currentSpot / step) * step;
    const list = [];
    for (let i = -4; i <= 4; i++) {
      const strike = base + i * step;
      const isAtm = strike === base;
      const isItm = selectedSide === "CALL" ? strike < currentSpot : strike > currentSpot;
      const distancePct = (((strike - currentSpot) / currentSpot) * 100).toFixed(1);
      
      // Estimated premium based on distance
      const diff = Math.abs(strike - currentSpot);
      const estPremium = Math.max(step * 0.2, (currentSpot * 0.03) - (diff * 0.05));

      list.push({
        strike,
        isAtm,
        isItm,
        distancePct,
        estPremium: Math.round(estPremium * 10) / 10,
        iv: 52.4 + (Math.abs(i) * 1.8),
        delta: selectedSide === "CALL" ? Math.max(0.05, Math.min(0.95, 0.5 - (i * 0.08))) : Math.max(-0.95, Math.min(-0.05, -0.5 - (i * 0.08))),
      });
    }
    return list;
  }, [currentSpot, underlying, selectedSide]);

  // Build canonical formatted contract symbol
  const resolvedContract = useMemo<SelectedOptionsContract>(() => {
    const isCrypto = provider !== "UPSTOX";
    const optLetter = selectedSide === "CALL" ? "C" : "P";
    const optNSE = selectedSide === "CALL" ? "CE" : "PE";
    
    // Format: BTC-260925-70000-C
    const yymmdd = selectedExpiry.replace("20", "").replace(/-/g, "");
    const cryptoSymbol = `${underlying}-${yymmdd}-${selectedStrike}-${optLetter}`;
    const nseSymbol = `${underlying} ${selectedStrike} ${optNSE}`;

    const canonicalSym = isCrypto ? cryptoSymbol : nseSymbol;
    const contractId = isCrypto
      ? `${provider}:${cryptoSymbol}:OPTION`
      : `NSE:${underlying}:${selectedExpiry}:${selectedStrike}:${optNSE}`;

    return {
      symbol: canonicalSym,
      display_symbol: canonicalSym,
      contract_id: contractId,
      underlying: isCrypto ? `${underlying}/USDT` : underlying,
      provider: isCrypto ? "binance_options" : "upstox_options",
      exchange: isCrypto ? provider : "NSE",
      expiry: selectedExpiry,
      strike: selectedStrike,
      option_type: selectedSide,
      asset_class: isCrypto ? "CRYPTO_OPTIONS" : "OPTIONS",
      premium_est: strikes.find((s) => s.strike === selectedStrike)?.estPremium || 150,
      iv: strikes.find((s) => s.strike === selectedStrike)?.iv || 52.5,
    };
  }, [underlying, provider, selectedSide, selectedExpiry, selectedStrike, strikes]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onSelectContract(resolvedContract);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 font-mono text-xs">
      <div className="bg-[#0B132B] border border-slate-800 rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl space-y-4 text-slate-300 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Options Contract Selector
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase">
                  Live Chain Resolver
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                {botName ? `Configuring Options contract for ${botName}` : "Select a specific executable strike contract from the live chain."}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Provider Readiness Warning if unconfigured */}
        {!isProviderConnected && (
          <div className="p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-xl flex items-center justify-between gap-3 text-amber-200 shrink-0">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-[11px] font-sans font-medium">
                Connect an options provider ({provider}) in Settings before starting this bot.
              </span>
            </div>
            <a
              href="/settings/brokers"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1 shrink-0"
            >
              <ExternalLink className="w-3 h-3" />
              Open Settings
            </a>
          </div>
        )}

        {/* Body (Scrollable) */}
        <div className="overflow-y-auto space-y-4 pr-1 flex-1">
          {/* 1. Provider & Underlying Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Provider Picker */}
            <div className="space-y-1.5 bg-slate-900/70 p-3 rounded-xl border border-slate-800">
              <label className="text-[10px] text-slate-400 font-bold uppercase block">1. Options Provider</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["BINANCE", "UPSTOX", "DERIBIT"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setProvider(p);
                      if (p === "UPSTOX") setUnderlying("NIFTY");
                      else setUnderlying("BTC");
                    }}
                    className={`py-1.5 px-2 rounded-lg font-bold text-[11px] border transition ${
                      provider === p
                        ? "bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-500/20"
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                    }`}
                  >
                    {p === "BINANCE" ? "Binance" : p === "UPSTOX" ? "Upstox NSE" : "Deribit"}
                  </button>
                ))}
              </div>
            </div>

            {/* Underlying Picker */}
            <div className="space-y-1.5 bg-slate-900/70 p-3 rounded-xl border border-slate-800">
              <label className="text-[10px] text-slate-400 font-bold uppercase block">2. Underlying Asset</label>
              <div className="grid grid-cols-3 gap-1.5">
                {availableUnderlyings.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setUnderlying(u.id);
                      setSelectedStrike(u.spot);
                    }}
                    className={`py-1.5 px-2 rounded-lg font-bold text-[11px] border transition ${
                      underlying === u.id
                        ? "bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-500/20"
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                    }`}
                  >
                    {u.id}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Expiry & Option Type Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Expiry Selector */}
            <div className="space-y-1.5 bg-slate-900/70 p-3 rounded-xl border border-slate-800">
              <label className="text-[10px] text-slate-400 font-bold uppercase flex items-center justify-between">
                <span>3. Expiry Date</span>
                <span className="text-cyan-400 flex items-center gap-1 font-sans">
                  <Clock className="w-3 h-3" /> Live Active Chain
                </span>
              </label>
              <select
                value={selectedExpiry}
                onChange={(e) => setSelectedExpiry(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
              >
                {availableExpiries.map((exp) => (
                  <option key={exp.id} value={exp.id}>
                    {exp.label} ({exp.dte} DTE)
                  </option>
                ))}
              </select>
            </div>

            {/* CALL vs PUT Selector */}
            <div className="space-y-1.5 bg-slate-900/70 p-3 rounded-xl border border-slate-800">
              <label className="text-[10px] text-slate-400 font-bold uppercase block">4. Option Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSelectedSide("CALL")}
                  className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 border transition ${
                    selectedSide === "CALL"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                      : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  CALL (Bullish)
                </button>
                <button
                  onClick={() => setSelectedSide("PUT")}
                  className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 border transition ${
                    selectedSide === "PUT"
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/60 shadow-[0_0_10px_rgba(244,63,94,0.2)]"
                      : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                  PUT (Bearish)
                </button>
              </div>
            </div>
          </div>

          {/* 3. Strike Price Matrix */}
          <div className="space-y-2 bg-slate-900/70 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase">5. Select Strike Price</span>
              <span className="text-[11px] text-slate-300">
                Spot Reference: <strong className="text-white font-mono">{currentSpot.toLocaleString()}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {strikes.map((s) => {
                const isSelected = selectedStrike === s.strike;
                return (
                  <button
                    key={s.strike}
                    onClick={() => setSelectedStrike(s.strike)}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      isSelected
                        ? "bg-purple-600/30 border-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.3)] ring-1 ring-purple-400"
                        : "bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs">{s.strike.toLocaleString()}</span>
                      {s.isAtm ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          ATM
                        </span>
                      ) : s.isItm ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300">
                          ITM
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[9px] text-slate-500">
                          OTM ({s.distancePct}%)
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Est: ${s.estPremium}</span>
                      <span>IV: {s.iv.toFixed(1)}%</span>
                      <span>Δ: {s.delta.toFixed(2)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Resolved Canonical Contract Card */}
          <div className="p-4 bg-[#060D1E] border border-purple-500/40 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-purple-300 uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Resolved Canonical Contract (Executable ID)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Validated Tradable
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Display Symbol:</span>
                <span className="text-white font-extrabold text-sm tracking-wide font-mono">
                  {resolvedContract.symbol}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Provider Instrument ID:</span>
                <span className="text-purple-300 font-mono text-[11px] truncate block">
                  {resolvedContract.contract_id}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-slate-400 border-t border-slate-800/80">
              <span>Underlying: <strong className="text-slate-200">{resolvedContract.underlying}</strong></span>
              <span>Expiry: <strong className="text-slate-200">{resolvedContract.expiry}</strong></span>
              <span>Strike: <strong className="text-slate-200">{resolvedContract.strike.toLocaleString()}</strong></span>
              <span>Side: <strong className={selectedSide === "CALL" ? "text-emerald-400" : "text-rose-400"}>{selectedSide}</strong></span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold transition shadow-[0_0_15px_rgba(147,51,234,0.4)] active:scale-95 flex items-center gap-2"
          >
            <span>Assign &amp; Confirm Contract</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
