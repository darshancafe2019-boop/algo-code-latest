"use client";

import { formatNumber, formatMoney, formatPrice } from "@/lib/formatters";
import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { OptionStrikeRow, OptionContractQuote } from "@/types/option-chain";
import { dispatchBotCreation } from "@/lib/store/useBotCreationIntentStore";

interface SimpleLiveOptionChainTableProps {
  strikes: OptionStrikeRow[];
  spotPrice: number;
  currency?: string;
  sourceName?: string;
  brokerAccountAlias?: string;
  environment?: "PAPER" | "LIVE";
  dataFeed?: "REST" | "WEBSOCKET" | string;
  freshnessStatus?: string;
  dataAgeMs?: number;
  latencyMs?: number;
  filterMoneyness?: "ALL" | "ITM" | "ATM" | "OTM";
  showAdvancedColumns?: boolean;
  selectedStrike?: number | null;
  selectedOptionType?: "CE" | "PE" | null;
  onSelectOption: (strike: number, type: "CE" | "PE", quote: OptionContractQuote | null) => void;
  onQuickTrade?: (strike: number, type: "CE" | "PE", side: "BUY" | "SELL", ltp: number) => void;
}

function formatVolumeOrOI(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val) || val <= 0) return "—";
  if (val >= 10_000_000) return `${(val / 10_000_000).toFixed(2)}Cr`;
  if (val >= 100_000) return `${(val / 100_000).toFixed(1)}L`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return formatNumber(val);
}

function formatGreek(val: number | undefined | null, decimals: number = 2): string {
  if (val === undefined || val === null || isNaN(val) || val === 0) return "—";
  return val.toFixed(decimals);
}

interface OptionChainStrikeRowProps {
  row: OptionStrikeRow;
  spotPrice: number;
  currency: string;
  sourceName: string;
  showAdvancedColumns: boolean;
  isCeSelected: boolean;
  isPeSelected: boolean;
  onSelectOption: (strike: number, type: "CE" | "PE", quote: OptionContractQuote | null) => void;
  onCreateOptionBot: (
    strike: number,
    type: "CE" | "PE",
    side: "BUY" | "SELL",
    quote: OptionContractQuote | null,
    e: React.MouseEvent
  ) => void;
}

const OptionChainStrikeRowComponent = React.memo(function OptionChainStrikeRowComponent({
  row,
  spotPrice,
  currency,
  sourceName,
  showAdvancedColumns,
  isCeSelected,
  isPeSelected,
  onSelectOption,
  onCreateOptionBot,
}: OptionChainStrikeRowProps) {
  const isATM = Boolean(row.is_atm);
  const ce = (row.ce || (row as any).call || {}) as OptionContractQuote;
  const pe = (row.pe || (row as any).put || {}) as OptionContractQuote;

  const ceITM = ce?.moneyness === "ITM" || (ce?.strike ? ce.strike < spotPrice : row.strike < spotPrice);
  const peITM = pe?.moneyness === "ITM" || (pe?.strike ? pe.strike > spotPrice : row.strike > spotPrice);

  const ceLtp = ce?.ltp ?? ce?.markPrice ?? (ce as any)?.last_price ?? (ce as any)?.mark_price ?? null;
  const peLtp = pe?.ltp ?? pe?.markPrice ?? (pe as any)?.last_price ?? (pe as any)?.mark_price ?? null;

  const ceBid = ce?.bid ?? (ce as any)?.best_bid ?? null;
  const ceAsk = ce?.ask ?? (ce as any)?.best_ask ?? null;
  const peBid = pe?.bid ?? (pe as any)?.best_bid ?? null;
  const peAsk = pe?.ask ?? (pe as any)?.best_ask ?? null;

  const ceOI = ce?.open_interest ?? (ce as any)?.oi ?? null;
  const peOI = pe?.open_interest ?? (pe as any)?.oi ?? null;
  const ceVol = ce?.volume ?? null;
  const peVol = pe?.volume ?? null;
  const ceIV = ce?.iv ?? (ce as any)?.mark_iv ?? null;
  const peIV = pe?.iv ?? (pe as any)?.mark_iv ?? null;
  const ceDelta = ce?.delta ?? null;
  const peDelta = pe?.delta ?? null;

  return (
    <tr
      className={`transition-colors group ${
        isATM
          ? "bg-amber-500/15 font-semibold ring-1 ring-amber-500/30"
          : "hover:bg-slate-800/40"
      }`}
    >
      {/* CALLS: OI */}
      <td className={`p-2 text-right text-slate-300 font-mono text-[11px] ${ceITM ? "bg-rose-950/15" : ""}`}>
        {formatVolumeOrOI(ceOI)}
      </td>

      {/* CALLS: Volume (Advanced) */}
      {showAdvancedColumns && (
        <td className={`p-2 text-right text-slate-400 font-mono text-[11px] ${ceITM ? "bg-rose-950/15" : ""}`}>
          {formatVolumeOrOI(ceVol)}
        </td>
      )}

      {/* CALLS: IV% (Advanced) */}
      {showAdvancedColumns && (
        <td className={`p-2 text-right text-purple-300 font-mono text-[11px] ${ceITM ? "bg-rose-950/15" : ""}`}>
          {ceIV !== null && ceIV > 0 ? `${ceIV.toFixed(1)}%` : "—"}
        </td>
      )}

      {/* CALLS: Delta (Advanced) */}
      {showAdvancedColumns && (
        <td className={`p-2 text-right text-cyan-400 font-mono text-[11px] ${ceITM ? "bg-rose-950/15" : ""}`}>
          {formatGreek(ceDelta, 2)}
        </td>
      )}

      {/* CALLS: Bid */}
      <td className={`p-2 text-right text-slate-400 font-mono text-[10px] ${ceITM ? "bg-rose-950/15" : ""}`}>
        {formatPrice(ceBid, currency)}
      </td>

      {/* CALLS: Ask */}
      <td className={`p-2 text-right text-slate-400 font-mono text-[10px] ${ceITM ? "bg-rose-950/15" : ""}`}>
        {formatPrice(ceAsk, currency)}
      </td>

      {/* CALLS: LTP (Clickable) */}
      <td
        onClick={() => onSelectOption(row.strike, "CE", ce)}
        className={`p-2 text-right cursor-pointer transition ${
          ceITM ? "bg-rose-950/20" : ""
        } ${
          isCeSelected
            ? "bg-cyan-500/30 text-cyan-200 font-black ring-1 ring-cyan-400"
            : "group-hover:text-cyan-300 text-white font-bold"
        }`}
      >
        <div className="flex items-center justify-end gap-1.5">
          <span className="text-[11px]">{formatPrice(ceLtp, currency)}</span>
        </div>
      </td>

      {/* CALLS: TRADE BUTTONS */}
      <td
        className={`p-1 text-center border-r border-slate-800 ${ceITM ? "bg-rose-950/20" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={(e) => onCreateOptionBot(row.strike, "CE", "BUY", ce, e)}
            className="px-1.5 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 text-[9px] font-bold border border-emerald-500/40 transition-colors"
            title="Create Call BUY Bot"
          >
            B
          </button>
          <button
            type="button"
            onClick={(e) => onCreateOptionBot(row.strike, "CE", "SELL", ce, e)}
            className="px-1.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500 hover:text-white text-rose-400 text-[9px] font-bold border border-rose-500/40 transition-colors"
            title="Create Call SELL Bot"
          >
            S
          </button>
        </div>
      </td>

      {/* CENTER: Strike */}
      <td
        className={`p-2 text-center font-black border-r border-slate-800 ${
          isATM
            ? "bg-amber-500/30 text-amber-200"
            : "bg-slate-900/90 text-slate-100"
        }`}
      >
        <div className="flex items-center justify-center gap-1">
          {isATM && (
            <span className="text-[9px] px-1 rounded bg-amber-500 text-slate-950 font-black">
              ATM
            </span>
          )}
          <span>{formatNumber(row.strike)}</span>
        </div>
      </td>

      {/* PUTS: TRADE BUTTONS */}
      <td
        className={`p-1 text-center ${peITM ? "bg-emerald-950/20" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={(e) => onCreateOptionBot(row.strike, "PE", "BUY", pe, e)}
            className="px-1.5 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 text-[9px] font-bold border border-emerald-500/40 transition-colors"
            title="Create Put BUY Bot"
          >
            B
          </button>
          <button
            type="button"
            onClick={(e) => onCreateOptionBot(row.strike, "PE", "SELL", pe, e)}
            className="px-1.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500 hover:text-white text-rose-400 text-[9px] font-bold border border-rose-500/40 transition-colors"
            title="Create Put SELL Bot"
          >
            S
          </button>
        </div>
      </td>

      {/* PUTS: LTP (Clickable) */}
      <td
        onClick={() => onSelectOption(row.strike, "PE", pe)}
        className={`p-2 text-left cursor-pointer transition ${
          peITM ? "bg-emerald-950/20" : ""
        } ${
          isPeSelected
            ? "bg-cyan-500/30 text-cyan-200 font-black ring-1 ring-cyan-400"
            : "group-hover:text-cyan-300 text-white font-bold"
        }`}
      >
        <div className="flex items-center justify-start gap-1.5">
          <span className="text-[11px]">{formatPrice(peLtp, currency)}</span>
        </div>
      </td>

      {/* PUTS: Bid */}
      <td className={`p-2 text-left text-slate-400 font-mono text-[10px] ${peITM ? "bg-emerald-950/15" : ""}`}>
        {formatPrice(peBid, currency)}
      </td>

      {/* PUTS: Ask */}
      <td
        className={`p-2 text-left text-slate-400 font-mono text-[10px] border-r border-slate-800/60 ${
          peITM ? "bg-emerald-950/15" : ""
        }`}
      >
        {formatPrice(peAsk, currency)}
      </td>

      {/* PUTS: Delta (Advanced) */}
      {showAdvancedColumns && (
        <td className={`p-2 text-left text-cyan-400 font-mono text-[11px] ${peITM ? "bg-emerald-950/15" : ""}`}>
          {formatGreek(peDelta, 2)}
        </td>
      )}

      {/* PUTS: IV% (Advanced) */}
      {showAdvancedColumns && (
        <td className={`p-2 text-left text-purple-300 font-mono text-[11px] ${peITM ? "bg-emerald-950/15" : ""}`}>
          {peIV !== null && peIV > 0 ? `${peIV.toFixed(1)}%` : "—"}
        </td>
      )}

      {/* PUTS: Volume (Advanced) */}
      {showAdvancedColumns && (
        <td className={`p-2 text-left text-slate-400 font-mono text-[11px] ${peITM ? "bg-emerald-950/15" : ""}`}>
          {formatVolumeOrOI(peVol)}
        </td>
      )}

      {/* PUTS: OI */}
      <td className={`p-2 text-left text-slate-300 font-mono text-[11px] ${peITM ? "bg-emerald-950/15" : ""}`}>
        {formatVolumeOrOI(peOI)}
      </td>
    </tr>
  );
});

export const SimpleLiveOptionChainTable = React.memo(function SimpleLiveOptionChainTable({
  strikes,
  spotPrice,
  currency = "₹",
  sourceName = "Delta Exchange",
  brokerAccountAlias = "Primary Account",
  environment = "PAPER",
  dataFeed = "WEBSOCKET",
  freshnessStatus = "LIVE",
  dataAgeMs = 0,
  latencyMs = 16,
  filterMoneyness = "ALL",
  showAdvancedColumns = false,
  selectedStrike,
  selectedOptionType,
  onSelectOption,
  onQuickTrade,
}: SimpleLiveOptionChainTableProps) {
  const router = useRouter();

  const handleCreateOptionBot = (
    strike: number,
    type: "CE" | "PE",
    side: "BUY" | "SELL",
    quote: OptionContractQuote | null,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    const isCrypto = sourceName.toUpperCase().includes("DELTA") || currency === "$";
    const underlying = quote?.symbol ? quote.symbol.split("-")[0] : isCrypto ? "BTC" : "NIFTY";
    const sym = quote?.symbol || `${underlying} ${strike} ${type}`;
    const ltp = quote?.ltp ?? (quote as any)?.last_price ?? quote?.markPrice ?? null;
    const expiry = quote?.expiry || null;
    const bid = quote?.bid ?? (quote as any)?.best_bid ?? null;
    const ask = quote?.ask ?? (quote as any)?.best_ask ?? null;
    const oi = quote?.open_interest ?? (quote as any)?.oi ?? null;
    const vol = quote?.volume ?? null;
    const delta = quote?.delta ?? null;
    const gamma = quote?.gamma ?? null;
    const theta = quote?.theta ?? null;
    const vega = quote?.vega ?? null;
    const iv = quote?.iv ?? (quote as any)?.mark_iv ?? null;

    dispatchBotCreation(router, {
      symbol: sym,
      canonicalSymbol: sym,
      side,
      assetClass: isCrypto ? "CRYPTO_OPTIONS" : "OPTIONS",
      underlying,
      exchange: isCrypto ? "DELTA" : "NSE",
      market: isCrypto ? "Crypto Options" : "Indian Index Options",
      broker: isCrypto ? "DELTA" : sourceName.toUpperCase().includes("DHAN") ? "DHAN" : "UPSTOX",
      marketDataSource: sourceName.toUpperCase().includes("DELTA") ? "DELTA" : "DHAN",
      instrumentId: (quote as any)?.instrument_key || (quote as any)?.instrument_id || sym,
      securityId: (quote as any)?.security_id || (quote as any)?.instrument_key || (quote as any)?.instrument_id,
      tradingSymbol: sym,
      currentPrice: ltp,
      bid,
      ask,
      expiry,
      strike,
      optionType: type === "CE" ? "CALL" : "PUT",
      openInterest: oi,
      volume: vol,
      delta,
      gamma,
      theta,
      vega,
      iv,
      origin: "OPTIONS",
      timestamp: Date.now(),
    });
  };

  // Filter strikes according to moneyness
  const filteredStrikes = useMemo(() => {
    if (!strikes || strikes.length === 0) return [];
    return strikes.filter((row) => {
      const ce = row.ce || (row as any).call;
      const pe = row.pe || (row as any).put;

      if (filterMoneyness === "ALL") return true;
      if (filterMoneyness === "ATM") return row.is_atm;
      if (filterMoneyness === "ITM") {
        return (
          ce?.moneyness === "ITM" ||
          pe?.moneyness === "ITM" ||
          (ce?.strike && ce.strike < spotPrice) ||
          (pe?.strike && pe.strike > spotPrice)
        );
      }
      if (filterMoneyness === "OTM") {
        return (
          ce?.moneyness === "OTM" ||
          pe?.moneyness === "OTM" ||
          (ce?.strike && ce.strike > spotPrice) ||
          (pe?.strike && pe.strike < spotPrice)
        );
      }
      return true;
    });
  }, [strikes, filterMoneyness, spotPrice]);

  if (!strikes || strikes.length === 0) {
    return (
      <div className="bg-[#0A1020] border border-slate-800 rounded-2xl p-12 text-center text-slate-400 font-mono text-xs space-y-2">
        <div className="text-sm font-bold text-white">CONNECTING TO {sourceName.toUpperCase()} OPTION FEED...</div>
        <p className="text-slate-500">
          Synchronizing derivative contracts for {spotPrice > 0 ? formatMoney(spotPrice, currency) : "underlying"}...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#070C16] border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
      {/* Live Feed Header Metrics Strip */}
      <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-slate-200">{sourceName.toUpperCase()}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">{brokerAccountAlias}</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-slate-800/80 text-[10px] font-mono text-slate-300 border border-slate-700/50">
            {environment}
          </span>
          <span className="px-2 py-0.5 rounded bg-cyan-950/40 text-cyan-300 text-[10px] font-mono border border-cyan-800/40">
            FEED: {dataFeed}
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-1">
            <span className="text-slate-500">LATENCY:</span>
            <span className={latencyMs < 50 ? "text-emerald-400" : "text-amber-400"}>{latencyMs}ms</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">AGE:</span>
            <span className={dataAgeMs < 1000 ? "text-emerald-400" : "text-amber-400"}>{dataAgeMs}ms</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">STATUS:</span>
            <span className="font-bold text-emerald-400">{freshnessStatus}</span>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left select-none">
          <thead>
            {/* Header Super-Row */}
            <tr className="bg-slate-900/90 text-slate-300 text-[11px] font-mono border-b border-slate-800">
              <th
                colSpan={showAdvancedColumns ? 8 : 5}
                className="py-2.5 px-4 text-center font-bold tracking-wider text-rose-300 bg-rose-950/20 border-r border-slate-800"
              >
                CALLS (CE)
              </th>
              <th className="py-2.5 px-6 text-center font-black tracking-widest text-amber-300 bg-slate-900 border-r border-slate-800">
                STRIKE
              </th>
              <th
                colSpan={showAdvancedColumns ? 8 : 5}
                className="py-2.5 px-4 text-center font-bold tracking-wider text-emerald-300 bg-emerald-950/20"
              >
                PUTS (PE)
              </th>
            </tr>

            {/* Individual Columns */}
            <tr className="text-[10px] text-slate-400 font-semibold border-b border-slate-800">
              {/* Call Columns */}
              <th className="p-2 text-right">OI</th>
              {showAdvancedColumns && <th className="p-2 text-right">Vol</th>}
              {showAdvancedColumns && <th className="p-2 text-right">IV%</th>}
              {showAdvancedColumns && <th className="p-2 text-right text-cyan-400">Δ Delta</th>}
              <th className="p-2 text-right text-slate-400">Bid</th>
              <th className="p-2 text-right text-slate-400">Ask</th>
              <th className="p-2 text-right font-bold text-white">LTP</th>
              <th className="p-2 text-center text-rose-300 font-bold border-r border-slate-800">TRADE</th>

              {/* Center Strike Column */}
              <th className="p-2 text-center font-black text-white bg-slate-900 border-r border-slate-800">
                STRIKE
              </th>

              {/* Put Columns */}
              <th className="p-2 text-center text-emerald-300 font-bold">TRADE</th>
              <th className="p-2 text-left font-bold text-white">LTP</th>
              <th className="p-2 text-left text-slate-400">Bid</th>
              <th className="p-2 text-left text-slate-400 border-r border-slate-800/60">Ask</th>
              {showAdvancedColumns && <th className="p-2 text-left text-cyan-400">Δ Delta</th>}
              {showAdvancedColumns && <th className="p-2 text-left">IV%</th>}
              {showAdvancedColumns && <th className="p-2 text-left">Vol</th>}
              <th className="p-2 text-left">OI</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-800/50">
            {filteredStrikes.map((row) => (
              <OptionChainStrikeRowComponent
                key={`${sourceName}_${row.strike}`}
                row={row}
                spotPrice={spotPrice}
                currency={currency}
                sourceName={sourceName}
                showAdvancedColumns={showAdvancedColumns}
                isCeSelected={selectedStrike === row.strike && selectedOptionType === "CE"}
                isPeSelected={selectedStrike === row.strike && selectedOptionType === "PE"}
                onSelectOption={onSelectOption}
                onCreateOptionBot={handleCreateOptionBot}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
