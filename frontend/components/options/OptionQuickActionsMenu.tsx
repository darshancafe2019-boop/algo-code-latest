"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  MoreVertical,
  TrendingUp,
  TrendingDown,
  Bot,
  BookmarkPlus,
  Activity,
  LineChart,
  Shield,
  Layers,
} from "lucide-react";
import { ActionableOptionContract } from "@/types/option-terminal";
import { OptionOrderIntent, getStandardOptionLotSize } from "@/types/option-order-intent";
import { openBotCreator } from "@/lib/bot-creation-bridge";
import { useGlobalData } from "@/context/GlobalDataContext";
import { useRouter } from "next/navigation";

interface OptionQuickActionsMenuProps {
  contract: ActionableOptionContract;
  underlying: string;
  strike: number;
  expiry: string;
  onDirectOrder: (intent: OptionOrderIntent) => void;
  onAnalyze?: (contract: ActionableOptionContract) => void;
  onPayoff?: (contract: ActionableOptionContract) => void;
  onAddWatchlist?: (contract: ActionableOptionContract) => void;
}

export const OptionQuickActionsMenu: React.FC<OptionQuickActionsMenuProps> = ({
  contract,
  underlying,
  strike,
  expiry,
  onDirectOrder,
  onAnalyze,
  onPayoff,
  onAddWatchlist,
}) => {
  const router = useRouter();
  const { tradingMode } = useGlobalData();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const lotSize = contract.lotSize || getStandardOptionLotSize(underlying);
  const optType = contract.optionType === "PE" || contract.optionType === "PUT" ? "PUT" : "CALL";

  const buildIntent = (side: "BUY" | "SELL", customType?: "CALL" | "PUT"): OptionOrderIntent => {
    const finalType = customType || optType;
    const finalPrice = side === "BUY"
      ? (contract.ask > 0 ? contract.ask : contract.ltp)
      : (contract.bid > 0 ? contract.bid : contract.ltp);

    return {
      broker: contract.broker || "PAPER",
      exchange: contract.broker === "DELTA" ? "DELTA" : "NSE",
      underlying,
      securityId: String(contract.securityId || contract.instrumentId || ""),
      tradingSymbol: contract.symbol,
      expiry: expiry || contract.expiry,
      strike,
      optionType: finalType,
      side,
      quantity: lotSize,
      lots: 1,
      lotSize,
      orderType: "LIMIT",
      price: finalPrice,
      productType: "INTRADAY",
      mode: (tradingMode === "LIVE" ? "LIVE" : "PAPER"),
      timestamp: new Date().toISOString(),
      ltp: contract.ltp,
      bid: contract.bid,
      ask: contract.ask,
      iv: contract.iv,
      oi: contract.oi,
      quoteStatus: (contract as any).quoteStatus || "LIVE",
    };
  };

  const handleCreateBot = () => {
    setIsOpen(false);
    const canonicalContractId = `${contract.broker || "NSE"}:${contract.broker === "DELTA" ? "DELTA" : "NSE_FO"}:${underlying}:${expiry || contract.expiry}:${strike}:${optType}:${contract.instrumentId || contract.securityId || contract.symbol}`;
    openBotCreator({
      symbol: contract.symbol,
      canonicalSymbol: canonicalContractId,
      canonicalContractId,
      side: "BUY",
      strategyDirection: optType === "CALL" ? "BUY_CALL" : "BUY_PUT",
      assetClass: contract.broker === "DELTA" ? "CRYPTO_OPTIONS" : "INDIAN_OPTIONS",
      underlying,
      exchange: contract.broker === "DELTA" ? "DELTA" : "NSE",
      broker: contract.broker || "PAPER",
      securityId: contract.securityId,
      tradingSymbol: contract.symbol,
      lotSize,
      currentPrice: contract.ltp,
      ltp: contract.ltp,
      bid: contract.bid,
      ask: contract.ask,
      strike,
      expiry: expiry || contract.expiry,
      optionType: optType === "CALL" ? "CE" : "PE",
      iv: contract.iv,
      delta: (contract as any).delta,
      gamma: (contract as any).gamma,
      theta: (contract as any).theta,
      vega: (contract as any).vega,
      openInterest: contract.oi,
      oi: contract.oi,
      volume: (contract as any).volume,
      timestamp: Date.now(),
      origin: "OPTIONS",
    }, router);
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        title="Quick Actions"
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 z-50 mt-1 w-48 rounded-xl bg-[#09101E] border border-slate-700 shadow-2xl py-1 text-xs font-mono divide-y divide-slate-800/80 animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Direct Order Actions */}
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onDirectOrder(buildIntent("BUY", "CALL"));
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800/80 text-emerald-400 flex items-center gap-2 font-bold"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>BUY CALL</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onDirectOrder(buildIntent("SELL", "CALL"));
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800/80 text-rose-400 flex items-center gap-2 font-bold"
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>SELL CALL</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onDirectOrder(buildIntent("BUY", "PUT"));
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800/80 text-emerald-400 flex items-center gap-2 font-bold"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>BUY PUT</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onDirectOrder(buildIntent("SELL", "PUT"));
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800/80 text-rose-400 flex items-center gap-2 font-bold"
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>SELL PUT</span>
            </button>
          </div>

          {/* Analytical Actions */}
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (onAnalyze) onAnalyze(contract);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-300 flex items-center gap-2"
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>ANALYZE</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (onPayoff) onPayoff(contract);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-300 flex items-center gap-2"
            >
              <LineChart className="w-3.5 h-3.5 text-purple-400" />
              <span>PAYOFF</span>
            </button>

            <button
              type="button"
              onClick={handleCreateBot}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-cyan-300 flex items-center gap-2 font-bold"
            >
              <Bot className="w-3.5 h-3.5 text-cyan-400" />
              <span>CREATE BOT</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (onAddWatchlist) onAddWatchlist(contract);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-300 flex items-center gap-2"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-amber-400" />
              <span>ADD WATCHLIST</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
