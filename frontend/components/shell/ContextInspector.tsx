"use client";

import React from "react";
import {
  X,
  Layers,
  Activity,
  Shield,
  DollarSign,
  TrendingUp,
  Cpu,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Zap,
} from "lucide-react";
import { ProviderBadge } from "@/components/ui/ProviderBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMoney, formatPnL, formatNumber, formatPercent } from "@/lib/formatters";

export interface ContextEntityReference {
  id: string;
  symbol: string;
  canonicalId?: string;
  assetClass?: "STOCK" | "FUTURE" | "OPTION" | "CRYPTO" | "INDEX";
  provider: "DHAN" | "UPSTOX" | "DELTA" | "BINANCE" | "YAHOO" | "OTHER" | string;
  providerInstrumentId?: string;
  exchange?: string;
  
  // 1. Market Data Reference (Read from Market Data Gateway)
  marketQuote?: {
    ltp: number;
    change24h?: number;
    bid?: number;
    ask?: number;
    bidQty?: number;
    askQty?: number;
    volume?: number;
    openInterest?: number;
    iv?: number;
    timestamp?: string | number;
    latencyMs?: number;
  };

  // 2. Portfolio Reference (Read from Portfolio Service)
  portfolioPosition?: {
    account: string;
    quantity: number;
    avgPrice: number;
    usedMargin?: number;
    unrealizedPnl?: number;
    status: "OPEN" | "CLOSED" | "FLAT";
  };

  // 3. P&L Reference (Read from P&L Engine)
  pnlAttribution?: {
    realizedPnl: number;
    unrealizedPnl: number;
    netPnl: number;
    feesPaid?: number;
    tradeCount?: number;
  };

  // 4. Risk Profile Reference (Read from Risk Service)
  riskProfile?: {
    maxLossLimit?: number;
    marginRequirement?: number;
    var99?: number;
    killSwitchEligible: boolean;
    status: "SAFE" | "WARN" | "BLOCKED";
  };

  // 5. Strategy / Bot Reference (If attached)
  botReference?: {
    botId: string;
    botName: string;
    strategyName: string;
    state: string;
  };
}

interface ContextInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  entity: ContextEntityReference | null;
  onNavigateDepartment?: (route: string) => void;
}

export function ContextInspector({
  isOpen,
  onClose,
  entity,
  onNavigateDepartment,
}: ContextInspectorProps) {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  if (!isOpen || !entity) return null;

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <aside className="fixed top-0 right-0 bottom-0 w-[420px] max-w-[90vw] bg-[#0A101D] border-l border-[#1E293B] shadow-2xl z-50 flex flex-col font-sans text-slate-200 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-[#1E293B] bg-[#0D1526] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Layers className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white truncate">
                {entity.symbol}
              </span>
              <ProviderBadge provider={entity.provider} size="sm" />
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              CONTEXT INSPECTOR (READ REFERENCES)
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          aria-label="Close Inspector"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body / Sections */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs scrollbar-thin">
        {/* Identifiers & Metadata */}
        <div className="p-3 rounded-xl bg-[#0F172A]/80 border border-[#1E293B] space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
            <Cpu className="h-3 w-3 text-sky-400" />
            <span>Canonical & Provider Identity</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-[10px] text-slate-500 block">EXCHANGE</span>
              <span className="text-slate-200 font-semibold">{entity.exchange || "N/A"}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">ASSET CLASS</span>
              <span className="text-sky-400 font-semibold">{entity.assetClass || "EQUITY"}</span>
            </div>
          </div>

          {entity.providerInstrumentId && (
            <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 border border-slate-800 text-[10px]">
              <span className="text-slate-400 truncate">PROVIDER ID: {entity.providerInstrumentId}</span>
              <button
                onClick={() => handleCopy("provId", entity.providerInstrumentId!)}
                className="text-slate-400 hover:text-white ml-2 shrink-0"
                title="Copy Provider Instrument ID"
              >
                {copiedKey === "provId" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
          )}
        </div>

        {/* 1. Market Data Reference */}
        <div className="p-3 rounded-xl bg-[#0F172A]/80 border border-[#1E293B] space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
              <Activity className="h-3 w-3 text-emerald-400" />
              <span>Market Data Gateway Reference</span>
            </div>
            {onNavigateDepartment && (
              <button
                onClick={() => onNavigateDepartment(entity.assetClass === "OPTION" ? "/options" : entity.assetClass === "FUTURE" ? "/futures" : "/markets")}
                className="text-[10px] text-sky-400 hover:underline flex items-center gap-1"
              >
                <span>Open View</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </button>
            )}
          </div>

          {entity.marketQuote ? (
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div>
                <span className="text-[10px] text-slate-500 block">LAST PRICE</span>
                <span className="text-emerald-400 font-bold text-sm">
                  {formatMoney(entity.marketQuote.ltp)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">24H CHANGE</span>
                <span className={`font-bold ${Number(entity.marketQuote.change24h || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {formatPercent(entity.marketQuote.change24h || 0)}
                </span>
              </div>
              {entity.marketQuote.bid !== undefined && (
                <div>
                  <span className="text-[10px] text-slate-500 block">BID / ASK</span>
                  <span className="text-slate-300">
                    {entity.marketQuote.bid} / {entity.marketQuote.ask}
                  </span>
                </div>
              )}
              {entity.marketQuote.openInterest !== undefined && (
                <div>
                  <span className="text-[10px] text-slate-500 block">OPEN INTEREST</span>
                  <span className="text-purple-400 font-semibold">
                    {formatNumber(entity.marketQuote.openInterest)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-slate-500 block py-1">
              No live ticker subscription active.
            </span>
          )}
        </div>

        {/* 2. Portfolio Position Reference */}
        <div className="p-3 rounded-xl bg-[#0F172A]/80 border border-[#1E293B] space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
              <DollarSign className="h-3 w-3 text-cyan-400" />
              <span>Portfolio Service Reference</span>
            </div>
            {onNavigateDepartment && (
              <button
                onClick={() => onNavigateDepartment("/portfolio")}
                className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
              >
                <span>Portfolio</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </button>
            )}
          </div>

          {entity.portfolioPosition ? (
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div>
                <span className="text-[10px] text-slate-500 block">ACCOUNT</span>
                <span className="text-slate-200 font-semibold">{entity.portfolioPosition.account}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">NET QUANTITY</span>
                <span className="text-white font-bold">{entity.portfolioPosition.quantity}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">AVG ENTRY</span>
                <span className="text-slate-300">{formatMoney(entity.portfolioPosition.avgPrice)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">UNREALIZED</span>
                <span className={entity.portfolioPosition.unrealizedPnl && entity.portfolioPosition.unrealizedPnl >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                  {formatPnL(entity.portfolioPosition.unrealizedPnl || 0).formatted}
                </span>
              </div>
            </div>
          ) : (
            <span className="text-[11px] text-slate-500 block py-1">
              Flat / No active exposure in portfolio.
            </span>
          )}
        </div>

        {/* 3. P&L Engine Reference */}
        <div className="p-3 rounded-xl bg-[#0F172A]/80 border border-[#1E293B] space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3 text-emerald-400" />
              <span>P&L Journal Reference</span>
            </div>
            {onNavigateDepartment && (
              <button
                onClick={() => onNavigateDepartment("/pnl")}
                className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>P&L Desk</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </button>
            )}
          </div>

          {entity.pnlAttribution ? (
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div>
                <span className="text-[10px] text-slate-500 block">REALIZED P&L</span>
                <span className={entity.pnlAttribution.realizedPnl >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                  {formatPnL(entity.pnlAttribution.realizedPnl).formatted}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">NET TOTAL P&L</span>
                <span className={entity.pnlAttribution.netPnl >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                  {formatPnL(entity.pnlAttribution.netPnl).formatted}
                </span>
              </div>
            </div>
          ) : (
            <span className="text-[11px] text-slate-500 block py-1">
              No historical fills recorded for this contract.
            </span>
          )}
        </div>

        {/* 4. Risk Engine Reference */}
        <div className="p-3 rounded-xl bg-[#0F172A]/80 border border-[#1E293B] space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
              <Shield className="h-3 w-3 text-amber-400" />
              <span>Risk Engine Reference</span>
            </div>
            {onNavigateDepartment && (
              <button
                onClick={() => onNavigateDepartment("/risk")}
                className="text-[10px] text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>Risk Desk</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-400">STATUS:</span>
            <StatusBadge status={entity.riskProfile?.status || "SAFE"} size="sm" />
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            <div>
              <span className="text-[10px] text-slate-500 block">KILL SWITCH ELIGIBLE</span>
              <span className="text-slate-300 font-semibold">
                {entity.riskProfile?.killSwitchEligible ? "YES" : "NO"}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">MARGIN REQ</span>
              <span className="text-slate-300 font-semibold">
                {formatMoney(entity.riskProfile?.marginRequirement || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-[#1E293B] bg-[#0D1526] text-[10px] font-mono text-slate-500 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 text-slate-400" />
          <span>Strict Department Isolation Enforced</span>
        </div>
        <span>QUANT.OS</span>
      </div>
    </aside>
  );
}
