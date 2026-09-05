"use client";

import React, { memo } from "react";
import { ChevronDown } from "lucide-react";
import { useUIStore } from "@/lib/store/useUIStore";
import { useActiveBot } from "@/context/ActiveBotContext";

export const HeaderSymbolSelector = memo(function HeaderSymbolSelector() {
  const { setMarketSwitcherOpen } = useUIStore();
  const { activeSymbol } = useActiveBot();

  const formattedSymbol = (() => {
    const sym = activeSymbol || "BTC/USDT";
    if (sym === "BTC-OPTIONS") return "BTC Options";
    if (sym === "ETH-OPTIONS") return "ETH Options";
    if (sym === "SOL-OPTIONS") return "SOL Options";
    if (sym.includes("-OPTIONS")) return sym.replace("-OPTIONS", " Options");
    if (sym === "NIFTY") return "NIFTY 50";
    if (sym === "BANKNIFTY") return "Bank Nifty";
    return sym;
  })();

  return (
    <button
      type="button"
      onClick={() => setMarketSwitcherOpen(true)}
      aria-label={`Select trading instrument, current: ${formattedSymbol}`}
      className="flex items-center gap-1.5 bg-[var(--theme-elevated)]/70 hover:bg-[var(--theme-elevated)] border border-[var(--theme-border)] hover:border-sky-500/40 rounded-lg px-2.5 py-1 text-xs font-mono transition-all cursor-pointer group shadow-xs active:scale-95 focus:outline-none focus-visible:ring-1 focus-visible:ring-sky-500"
      title="Click to search & switch instruments (Crypto, Stocks, Indices, Futures, Options)"
    >
      <span className="text-sky-400 font-bold group-hover:text-sky-300 transition-colors">
        {formattedSymbol}
      </span>
      <ChevronDown className="h-3 w-3 text-slate-400 group-hover:text-slate-200 transition-transform group-hover:translate-y-0.5" />
    </button>
  );
});
