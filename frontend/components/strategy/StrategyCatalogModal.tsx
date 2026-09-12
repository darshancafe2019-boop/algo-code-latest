"use client";

import React, { useState } from "react";
import {
  X,
  Search,
  FolderOpen,
  Plus,
  Copy,
  Bot,
  Play,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Percent,
  BarChart2,
  Coins,
  Shield,
  Activity,
  Zap,
} from "lucide-react";
import { QosButton, QosBadge } from "@/components/ui/QosComponents";

interface StrategyCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: any[];
  onLoadStrategy: (strat: any) => void;
  onDuplicateStrategy: (strat: any) => void;
  onAssignToBot: (stratName: string) => void;
}

const BUILTIN_TEMPLATES = [
  {
    strategy_id: "strat-trend-momentum-btc",
    name: "BTC Quantitative Momentum Strategy",
    description: "1H Macro EMA 200 regime filter with 15M RSI (14) > 55 and 15M EMA 9/21 cross trigger.",
    market_type: "crypto",
    symbol: "BTC/USDT",
    base_timeframe: "15m",
    direction: "LONG",
    category: "MOMENTUM",
    win_rate: 62.4,
    profit_factor: 1.84,
  },
  {
    strategy_id: "strat-nifty-trend-following",
    name: "NIFTY Institutional Trend Following",
    description: "Daily 200-SMA macro benchmark filter with 15M Supertrend (10, 3) breakout and ADX > 25.",
    market_type: "equity",
    symbol: "NIFTY",
    base_timeframe: "15m",
    direction: "LONG",
    category: "TREND",
    win_rate: 58.9,
    profit_factor: 1.95,
  },
  {
    strategy_id: "strat-options-iron-condor",
    name: "Options Neutral Iron Condor Delta 0.15",
    description: "Multi-leg delta-neutral selling on IV Rank > 50 with 0.15 delta wings and 45 DTE entry.",
    market_type: "options",
    symbol: "NIFTY 24400 CE",
    base_timeframe: "1d",
    direction: "BOTH",
    category: "OPTIONS",
    win_rate: 74.5,
    profit_factor: 1.68,
  },
  {
    strategy_id: "strat-crypto-funding-arb",
    name: "Crypto Perpetual Funding Arbitrage",
    description: "Delta-neutral spot vs perpetual funding rate capture when 8H funding rate > 0.05%.",
    market_type: "crypto",
    symbol: "BTC-PERP",
    base_timeframe: "8h",
    direction: "BOTH",
    category: "FUNDING",
    win_rate: 88.2,
    profit_factor: 2.85,
  },
  {
    strategy_id: "strat-vol-breakout-eth",
    name: "ETH Bollinger Band Volatility Breakout",
    description: "Squeeze breakout trigger when Bollinger bandwidth < 0.04 with 2x Volume expansion.",
    market_type: "crypto",
    symbol: "ETH/USDT",
    base_timeframe: "1h",
    direction: "LONG",
    category: "VOLATILITY",
    win_rate: 54.1,
    profit_factor: 2.12,
  },
  {
    strategy_id: "strat-mean-reversion-rsi",
    name: "Equity Mean Reversion RSI Oversold",
    description: "Counter-trend dip buying when 15M RSI < 28 with Stochastic %K cross and VWAP support.",
    market_type: "equity",
    symbol: "RELIANCE",
    base_timeframe: "15m",
    direction: "LONG",
    category: "MEAN_REVERSION",
    win_rate: 66.8,
    profit_factor: 1.76,
  },
];

export function StrategyCatalogModal({
  isOpen,
  onClose,
  catalog,
  onLoadStrategy,
  onDuplicateStrategy,
  onAssignToBot,
}: StrategyCatalogModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  if (!isOpen) return null;

  const combinedCatalog = [
    ...BUILTIN_TEMPLATES,
    ...(Array.isArray(catalog) ? catalog : []),
  ];

  const filteredCatalog = combinedCatalog.filter((item) => {
    const matchesSearch =
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.symbol?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedCategory === "ALL") return true;
    return item.category?.toUpperCase() === selectedCategory.toUpperCase();
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn select-none font-sans text-xs">
      <div className="bg-[#0A1422] border border-[#12304A] rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#12304A] flex items-center justify-between bg-[#07111F]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/30">
              <FolderOpen className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC] uppercase tracking-wider">
                QUANTITATIVE STRATEGY CATALOG & TEMPLATES
              </h3>
              <p className="text-[11px] text-[#7D8EA5]">
                Load proven quantitative setups, duplicate templates, or deploy directly to bots
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[#7D8EA5] hover:text-[#F8FAFC] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="p-3 border-b border-[#12304A] bg-[#0A1422] flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-3.5 w-3.5 text-[#7D8EA5] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search strategies by name, rule, symbol, or indicator..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-8 bg-[#0C1727] border border-[#12304A] rounded-lg pl-8 pr-3 text-xs text-[#F8FAFC] placeholder:text-[#7D8EA5] focus:outline-none focus:border-[#22D3EE]"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none font-mono text-[11px]">
            {["ALL", "MOMENTUM", "TREND", "OPTIONS", "FUNDING", "VOLATILITY", "MEAN_REVERSION"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap font-bold ${
                  selectedCategory === cat
                    ? "bg-[#168BFF] text-white"
                    : "bg-[#0C1727] text-[#7D8EA5] hover:text-[#F8FAFC] border border-[#12304A]"
                }`}
              >
                {cat.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Items Grid */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-3 scrollbar-thin">
          {filteredCatalog.map((item, idx) => (
            <div
              key={item.strategy_id || idx}
              className="p-3.5 rounded-xl bg-[#0C1727] border border-[#12304A] hover:border-[#1A3E61] transition-all flex flex-col justify-between gap-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs text-[#F8FAFC] truncate">
                    {item.name}
                  </span>
                  <QosBadge status={item.direction || "LONG"} dot={false} />
                </div>

                <p className="text-[11px] text-[#7D8EA5] line-clamp-2">
                  {item.description}
                </p>

                <div className="flex items-center gap-2 text-[10px] font-mono text-[#7D8EA5] pt-1">
                  <span className="px-1.5 py-0.5 rounded bg-[#0A1422] border border-[#12304A] text-[#22D3EE]">
                    {item.symbol || "BTC/USDT"}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[#0A1422] border border-[#12304A]">
                    {item.base_timeframe || "15m"}
                  </span>
                  {item.win_rate && (
                    <span className="text-[#00E89A] font-bold">
                      {item.win_rate}% Win
                    </span>
                  )}
                  {item.profit_factor && (
                    <span className="text-[#22D3EE] font-bold">
                      PF {item.profit_factor}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#12304A]">
                <QosButton
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    onDuplicateStrategy(item);
                    onClose();
                  }}
                  className="gap-1 text-[11px]"
                >
                  <Copy className="h-3 w-3" />
                  <span>Duplicate</span>
                </QosButton>

                <QosButton
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onLoadStrategy(item);
                    onClose();
                  }}
                  className="gap-1 text-[11px]"
                >
                  <ArrowRight className="h-3 w-3" />
                  <span>Load Into IDE</span>
                </QosButton>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
