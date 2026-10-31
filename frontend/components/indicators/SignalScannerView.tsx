"use client";

import React, { useState } from "react";
import { Radar, Filter, RefreshCw, CheckCircle2, AlertTriangle, ArrowUpRight, ArrowDownRight, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent } from "@/lib/formatters";

interface ScannerResult {
  symbol: string;
  market: "CRYPTO" | "NSE" | "MCX";
  ltp: number;
  changePct: number;
  rsi: number;
  macdCross: "BULLISH" | "BEARISH" | "NEUTRAL";
  supertrend: "BUY" | "SELL";
  emaTrend: "BULLISH" | "BEARISH";
  confluenceScore: number;
  recommendation: "STRONG BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG SELL";
}

const DEFAULT_SCAN_RESULTS: ScannerResult[] = [
  { symbol: "BTC-PERP", market: "CRYPTO", ltp: 68450.0, changePct: 2.15, rsi: 62.4, macdCross: "BULLISH", supertrend: "BUY", emaTrend: "BULLISH", confluenceScore: 84, recommendation: "STRONG BUY" },
  { symbol: "NIFTY 24300 CE", market: "NSE", ltp: 168.20, changePct: 35.1, rsi: 68.5, macdCross: "BULLISH", supertrend: "BUY", emaTrend: "BULLISH", confluenceScore: 78, recommendation: "BUY" },
  { symbol: "SOL-PERP", market: "CRYPTO", ltp: 178.20, changePct: 3.85, rsi: 71.2, macdCross: "BULLISH", supertrend: "BUY", emaTrend: "BULLISH", confluenceScore: 88, recommendation: "STRONG BUY" },
  { symbol: "CRUDEOIL FUT", market: "MCX", ltp: 5920.0, changePct: -1.25, rsi: 41.0, macdCross: "BEARISH", supertrend: "SELL", emaTrend: "BEARISH", confluenceScore: 24, recommendation: "SELL" },
  { symbol: "BANKNIFTY", market: "NSE", ltp: 51820.25, changePct: 0.62, rsi: 54.3, macdCross: "NEUTRAL", supertrend: "BUY", emaTrend: "BULLISH", confluenceScore: 65, recommendation: "BUY" },
  { symbol: "ETH-PERP", market: "CRYPTO", ltp: 2540.50, changePct: 1.45, rsi: 58.1, macdCross: "BULLISH", supertrend: "BUY", emaTrend: "BULLISH", confluenceScore: 72, recommendation: "BUY" },
  { symbol: "TITAN", market: "NSE", ltp: 3240.00, changePct: -4.65, rsi: 28.5, macdCross: "BEARISH", supertrend: "SELL", emaTrend: "BEARISH", confluenceScore: 16, recommendation: "STRONG SELL" },
];

export function SignalScannerView() {
  const [universe, setUniverse] = useState<"ALL" | "CRYPTO" | "NSE" | "MCX">("ALL");
  const [filterRsiOversold, setFilterRsiOversold] = useState(false);
  const [filterBullishOnly, setFilterBullishOnly] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const filtered = DEFAULT_SCAN_RESULTS.filter((r) => {
    if (universe !== "ALL" && r.market !== universe) return false;
    if (filterRsiOversold && r.rsi > 35) return false;
    if (filterBullishOnly && !r.recommendation.includes("BUY")) return false;
    return true;
  });

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => setIsScanning(false), 600);
  };

  return (
    <div className="space-y-3">
      {/* Scanner Control Header */}
      <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Radar className="h-4 w-4 text-[#00F0FF]" />
          <h2 className="text-xs font-bold text-[#F8FAFC] tracking-wider uppercase">MULTI-ASSET SIGNAL SCANNER</h2>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30">
            Real-Time Screener
          </span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 text-[11px]">
          {/* Universe Pills */}
          <div className="flex items-center gap-1 bg-[#06101B] p-0.5 rounded border border-[#10263A]">
            {(["ALL", "CRYPTO", "NSE", "MCX"] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUniverse(u)}
                className={cn(
                  "px-2 py-0.5 rounded font-semibold text-[10px] transition-colors",
                  universe === u ? "bg-[#168BFF] text-white" : "text-[#7D8EA5] hover:text-[#F8FAFC]"
                )}
              >
                {u}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setFilterBullishOnly(!filterBullishOnly)}
            className={cn(
              "px-2 py-1 rounded text-[10px] font-semibold border transition-colors",
              filterBullishOnly
                ? "bg-[#00E89A]/15 text-[#00E89A] border-[#00E89A]/40"
                : "bg-[#06101B] text-[#7D8EA5] border-[#10263A] hover:text-[#F8FAFC]"
            )}
          >
            Bullish Confluence Only
          </button>

          <button
            type="button"
            onClick={handleScan}
            disabled={isScanning}
            className="px-3 py-1 rounded bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] hover:bg-[#00F0FF]/25 font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RefreshCw className={cn("h-3 w-3", isScanning && "animate-spin")} />
            <span>Scan Universe</span>
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] overflow-x-auto">
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr className="h-[32px] bg-[#06101B] border-b border-[#122A42] text-[10px] uppercase font-semibold text-[#7D8EA5]">
              <th className="px-3 py-1">Symbol</th>
              <th className="px-2 py-1">Market</th>
              <th className="px-3 py-1 text-right">LTP</th>
              <th className="px-3 py-1 text-right">24h Change</th>
              <th className="px-2 py-1 text-center">RSI (14)</th>
              <th className="px-2 py-1 text-center">MACD Cross</th>
              <th className="px-2 py-1 text-center">Supertrend</th>
              <th className="px-2 py-1 text-center">EMA Trend</th>
              <th className="px-3 py-1 text-center">Confluence Score</th>
              <th className="px-3 py-1 text-center">Recommendation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#10263A]/60">
            {filtered.map((r) => {
              const isUp = r.changePct >= 0;
              const isStrongBuy = r.recommendation === "STRONG BUY";
              const isBuy = r.recommendation === "BUY";
              const isSell = r.recommendation.includes("SELL");

              return (
                <tr key={r.symbol} className="h-[36px] hover:bg-[#0E1E34] transition-colors">
                  <td className="px-3 py-1 font-semibold text-[#F8FAFC]">{r.symbol}</td>
                  <td className="px-2 py-1">
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#06101B] text-[#7D8EA5] border border-[#10263A]">
                      {r.market}
                    </span>
                  </td>
                  <td className="px-3 py-1 text-right tabular-nums font-mono font-semibold text-[#F8FAFC]">
                    {formatCurrency(r.ltp, "", 2)}
                  </td>
                  <td className={cn("px-3 py-1 text-right tabular-nums font-mono font-bold", isUp ? "text-[#00E89A]" : "text-[#FF3B5C]")}>
                    {isUp ? "+" : ""}{formatPercent(r.changePct, 2)}
                  </td>
                  <td className={cn("px-2 py-1 text-center font-mono font-semibold", r.rsi > 70 ? "text-[#FF3B5C]" : r.rsi < 30 ? "text-[#00E89A]" : "text-[#7D8EA5]")}>
                    {r.rsi.toFixed(1)}
                  </td>
                  <td className="px-2 py-1 text-center">
                    <span className={cn(
                      "px-1 py-0.2 rounded text-[9px] font-mono font-bold",
                      r.macdCross === "BULLISH" ? "text-[#00E89A] bg-[#00E89A]/10" : r.macdCross === "BEARISH" ? "text-[#FF3B5C] bg-[#FF3B5C]/10" : "text-[#7D8EA5]"
                    )}>
                      {r.macdCross}
                    </span>
                  </td>
                  <td className="px-2 py-1 text-center">
                    <span className={cn(
                      "px-1 py-0.2 rounded text-[9px] font-mono font-bold",
                      r.supertrend === "BUY" ? "text-[#00E89A] bg-[#00E89A]/10" : "text-[#FF3B5C] bg-[#FF3B5C]/10"
                    )}>
                      {r.supertrend}
                    </span>
                  </td>
                  <td className="px-2 py-1 text-center">
                    <span className={cn(
                      "px-1 py-0.2 rounded text-[9px] font-mono font-bold",
                      r.emaTrend === "BULLISH" ? "text-[#00E89A] bg-[#00E89A]/10" : "text-[#FF3B5C] bg-[#FF3B5C]/10"
                    )}>
                      {r.emaTrend}
                    </span>
                  </td>
                  <td className="px-3 py-1 text-center font-mono font-bold">
                    <span className={r.confluenceScore >= 70 ? "text-[#00E89A]" : r.confluenceScore <= 30 ? "text-[#FF3B5C]" : "text-[#F59E0B]"}>
                      {r.confluenceScore}%
                    </span>
                  </td>
                  <td className="px-3 py-1 text-center">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider",
                      isStrongBuy ? "bg-[#00E89A]/20 text-[#00E89A] border border-[#00E89A]/40" :
                      isBuy ? "bg-[#00E89A]/10 text-[#00E89A] border border-[#00E89A]/20" :
                      isSell ? "bg-[#FF3B5C]/15 text-[#FF3B5C] border border-[#FF3B5C]/30" :
                      "bg-[#7D8EA5]/15 text-[#7D8EA5]"
                    )}>
                      {r.recommendation}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

