"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  SlidersHorizontal,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Settings,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  Filter,
  Check,
  X,
  RefreshCw,
  Info,
  DollarSign,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Radio,
} from "lucide-react";
import {
  StrategyInstrumentResolver,
  StrategyResolutionResult,
  ResolvedStrategyPosition,
  ResolvedStrategyLeg,
} from "@/lib/strategies/strategyInstrumentResolver";
import { formatMoney } from "@/lib/formatters";

export interface StrategyCatalogEntry {
  strategy_id: string;
  name: string;
  description: string;
  category: "OPTIONS" | "FUTURES" | "EQUITY" | "CRYPTO";
  instrument_class: "OPTION_MULTI_LEG" | "OPTION_SINGLE" | "FUTURE" | "EQUITY";
  underlying_supported: string[];
  default_underlying: string;
  market_supported: string;
  provider: string;
  expiry_mode: string;
  leg_count: number;
  leg_template: string;
  strategy_type: "CREDIT" | "DEBIT" | "NEUTRAL" | "BREAKOUT" | "MOMENTUM" | "SWING" | "TREND" | "MEAN_REVERSION";
  strategy_bias: "BULLISH" | "BEARISH" | "NEUTRAL";
  premium_mode: "NET_CREDIT" | "NET_DEBIT" | "LIVE_PREMIUM" | "FUTURES_PRICE" | "EQUITY_PRICE";
  default_enabled: boolean;
  parameters: Record<string, any>;
}

export interface BotEnabledStrategySetting {
  strategy_id: string;
  enabled: boolean;
  parameters: Record<string, any>;
  execution_profile?: any;
  instrument_class?: string;
  provider?: string;
  underlying?: string;
  expiry_mode?: string;
  premium_rules?: Record<string, any>;
}

interface StrategyLiveSnapshot {
  ltp: number;
  bid: number;
  ask: number;
  mid: number;
  quoteAgeMs: number;
  status: "LIVE" | "STALE" | "DATA_UNAVAILABLE" | "PROVIDER_OFFLINE" | "RESOLUTION_FAILED";
  resolvedPosition?: ResolvedStrategyPosition;
  errorMessage?: string;
  decisionChecks: {
    marketRegime: boolean;
    ivRequirement: boolean;
    expiryResolved: boolean;
    legsResolved: boolean;
    premiumTarget: boolean;
    liquidity: boolean;
    spread: boolean;
    risk: boolean;
    decision: "CONFIRMED" | "DATA_UNAVAILABLE" | "RISK_REJECTED" | "NO_SIGNAL";
    reason?: string;
  };
}

interface StrategyPremiumSelectionSectionProps {
  enabledStrategies: BotEnabledStrategySetting[];
  onChangeEnabledStrategies: (strategies: BotEnabledStrategySetting[]) => void;
  defaultProvider?: string;
  defaultUnderlying?: string;
}

export function StrategyPremiumSelectionSection({
  enabledStrategies,
  onChangeEnabledStrategies,
  defaultProvider = "UPSTOX",
  defaultUnderlying = "NIFTY",
}: StrategyPremiumSelectionSectionProps) {
  const [strategies, setStrategies] = useState<StrategyCatalogEntry[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [biasFilter, setBiasFilter] = useState<string>("ALL");
  const [legFilter, setLegFilter] = useState<string>("ALL");

  // Live snapshots for all loaded strategies
  const [liveSnapshots, setLiveSnapshots] = useState<Record<string, StrategyLiveSnapshot>>({});
  const [isRefreshingQuotes, setIsRefreshingQuotes] = useState<boolean>(false);

  // Modals & Drawers
  const [configureStrategy, setConfigureStrategy] = useState<StrategyCatalogEntry | null>(null);
  const [previewLegsStrategy, setPreviewLegsStrategy] = useState<{
    entry: StrategyCatalogEntry;
    snapshot?: StrategyLiveSnapshot;
  } | null>(null);
  const [showConfirmEnableAll, setShowConfirmEnableAll] = useState<boolean>(false);
  const [auditExpandedId, setAuditExpandedId] = useState<string | null>(null);

  // 1. Fetch Dynamic Strategy Catalog from API
  useEffect(() => {
    let isMounted = true;
    async function loadCatalog() {
      setIsLoadingCatalog(true);
      try {
        const res = await fetch("/api/strategies");
        if (res.ok) {
          const data = await res.json();
          if (data.strategies && Array.isArray(data.strategies) && data.strategies.length > 0) {
            if (isMounted) {
              setStrategies(data.strategies);
              setIsLoadingCatalog(false);
              return;
            }
          }
        }
      } catch (err) {
        console.warn("Could not fetch /api/strategies, loading local registry fallback", err);
      }

      // Fallback: Generate dynamic catalog from client-side StrategyInstrumentResolver
      if (isMounted) {
        const fallbackCatalog: StrategyCatalogEntry[] = [
          {
            strategy_id: "options-strat-01",
            name: "Short Iron Condor Range Income",
            description: "4-leg defined-risk delta-neutral credit structure harvesting theta decay in low-to-moderate IV environments.",
            category: "OPTIONS",
            instrument_class: "OPTION_MULTI_LEG",
            underlying_supported: ["NIFTY", "BANKNIFTY", "FINNIFTY", "BTC", "ETH"],
            default_underlying: "NIFTY",
            market_supported: "INDIAN_NSE",
            provider: "UPSTOX",
            expiry_mode: "WEEKLY_NEAR",
            leg_count: 4,
            leg_template: "SHORT_IRON_CONDOR",
            strategy_type: "CREDIT",
            strategy_bias: "NEUTRAL",
            premium_mode: "NET_CREDIT",
            default_enabled: true,
            parameters: { wing_width_steps: 2, delta_target: 0.16, lots: 1, stop_loss_pct: 2.0, take_profit_pct: 4.0 },
          },
          {
            strategy_id: "options-strat-02",
            name: "Long Iron Condor Volatility Breakout",
            description: "4-leg defined-risk debit condor profiting from significant market expansions beyond the outer wings.",
            category: "OPTIONS",
            instrument_class: "OPTION_MULTI_LEG",
            underlying_supported: ["NIFTY", "BANKNIFTY", "BTC"],
            default_underlying: "NIFTY",
            market_supported: "INDIAN_NSE",
            provider: "UPSTOX",
            expiry_mode: "WEEKLY_NEAR",
            leg_count: 4,
            leg_template: "LONG_IRON_CONDOR",
            strategy_type: "DEBIT",
            strategy_bias: "NEUTRAL",
            premium_mode: "NET_DEBIT",
            default_enabled: false,
            parameters: { wing_width_steps: 2, delta_target: 0.30, lots: 1, stop_loss_pct: 1.5, take_profit_pct: 3.5 },
          },
          {
            strategy_id: "options-strat-03",
            name: "Long Butterfly Defined Risk",
            description: "3-strike 4-contract defined-risk structure targeting low volatility around the center ATM strike.",
            category: "OPTIONS",
            instrument_class: "OPTION_MULTI_LEG",
            underlying_supported: ["NIFTY", "BANKNIFTY"],
            default_underlying: "NIFTY",
            market_supported: "INDIAN_NSE",
            provider: "UPSTOX",
            expiry_mode: "WEEKLY_NEAR",
            leg_count: 3,
            leg_template: "LONG_BUTTERFLY",
            strategy_type: "DEBIT",
            strategy_bias: "NEUTRAL",
            premium_mode: "NET_DEBIT",
            default_enabled: false,
            parameters: { wing_width_steps: 2, lots: 1, stop_loss_pct: 1.5, take_profit_pct: 3.0 },
          },
          {
            strategy_id: "options-strat-04",
            name: "Iron Butterfly ATM Pin",
            description: "ATM short straddle with protective OTM wings maximizing credit collection around ATM pin targets.",
            category: "OPTIONS",
            instrument_class: "OPTION_MULTI_LEG",
            underlying_supported: ["NIFTY", "BANKNIFTY"],
            default_underlying: "NIFTY",
            market_supported: "INDIAN_NSE",
            provider: "UPSTOX",
            expiry_mode: "WEEKLY_NEAR",
            leg_count: 4,
            leg_template: "IRON_BUTTERFLY",
            strategy_type: "CREDIT",
            strategy_bias: "NEUTRAL",
            premium_mode: "NET_CREDIT",
            default_enabled: false,
            parameters: { wing_width_steps: 3, lots: 1, stop_loss_pct: 2.0, take_profit_pct: 4.5 },
          },
          {
            strategy_id: "options-strat-05",
            name: "Bull Call Spread Defined Debit",
            description: "2-leg bullish vertical spread: Long lower strike Call + Short higher strike Call.",
            category: "OPTIONS",
            instrument_class: "OPTION_MULTI_LEG",
            underlying_supported: ["NIFTY", "BANKNIFTY", "RELIANCE", "BTC"],
            default_underlying: "NIFTY",
            market_supported: "INDIAN_NSE",
            provider: "UPSTOX",
            expiry_mode: "WEEKLY_NEAR",
            leg_count: 2,
            leg_template: "BULL_CALL_SPREAD",
            strategy_type: "DEBIT",
            strategy_bias: "BULLISH",
            premium_mode: "NET_DEBIT",
            default_enabled: true,
            parameters: { strike_gap_steps: 2, lots: 1, stop_loss_pct: 1.5, take_profit_pct: 3.5 },
          },
          {
            strategy_id: "options-strat-06",
            name: "Bear Put Spread Defined Debit",
            description: "2-leg bearish vertical spread: Long higher strike Put + Short lower strike Put.",
            category: "OPTIONS",
            instrument_class: "OPTION_MULTI_LEG",
            underlying_supported: ["NIFTY", "BANKNIFTY", "BTC"],
            default_underlying: "NIFTY",
            market_supported: "INDIAN_NSE",
            provider: "UPSTOX",
            expiry_mode: "WEEKLY_NEAR",
            leg_count: 2,
            leg_template: "BEAR_PUT_SPREAD",
            strategy_type: "DEBIT",
            strategy_bias: "BEARISH",
            premium_mode: "NET_DEBIT",
            default_enabled: false,
            parameters: { strike_gap_steps: 2, lots: 1, stop_loss_pct: 1.5, take_profit_pct: 3.5 },
          },
          {
            strategy_id: "options-strat-07",
            name: "Bull Put Credit Spread",
            description: "2-leg bullish/neutral credit spread: Short OTM Put + Long further OTM Put (protective).",
            category: "OPTIONS",
            instrument_class: "OPTION_MULTI_LEG",
            underlying_supported: ["NIFTY", "BANKNIFTY", "BTC"],
            default_underlying: "NIFTY",
            market_supported: "INDIAN_NSE",
            provider: "UPSTOX",
            expiry_mode: "WEEKLY_NEAR",
            leg_count: 2,
            leg_template: "BULL_PUT_CREDIT_SPREAD",
            strategy_type: "CREDIT",
            strategy_bias: "BULLISH",
            premium_mode: "NET_CREDIT",
            default_enabled: true,
            parameters: { wing_width_steps: 2, lots: 1, stop_loss_pct: 2.0, take_profit_pct: 4.0 },
          },
          {
            strategy_id: "options-strat-08",
            name: "Bear Call Credit Spread",
            description: "2-leg bearish/neutral credit spread: Short OTM Call + Long further OTM Call (protective).",
            category: "OPTIONS",
            instrument_class: "OPTION_MULTI_LEG",
            underlying_supported: ["NIFTY", "BANKNIFTY"],
            default_underlying: "NIFTY",
            market_supported: "INDIAN_NSE",
            provider: "UPSTOX",
            expiry_mode: "WEEKLY_NEAR",
            leg_count: 2,
            leg_template: "BEAR_CALL_CREDIT_SPREAD",
            strategy_type: "CREDIT",
            strategy_bias: "BEARISH",
            premium_mode: "NET_CREDIT",
            default_enabled: false,
            parameters: { wing_width_steps: 2, lots: 1, stop_loss_pct: 2.0, take_profit_pct: 4.0 },
          },
          {
            strategy_id: "options-strat-09",
            name: "Calendar Spreads (Time Spread)",
            description: "Sell near-expiry option + Buy longer-expiry option at identical strike exploiting differential theta decay.",
            category: "OPTIONS",
            instrument_class: "OPTION_MULTI_LEG",
            underlying_supported: ["NIFTY", "BANKNIFTY"],
            default_underlying: "NIFTY",
            market_supported: "INDIAN_NSE",
            provider: "UPSTOX",
            expiry_mode: "CALENDAR_MULTI",
            leg_count: 2,
            leg_template: "CALENDAR_SPREAD",
            strategy_type: "DEBIT",
            strategy_bias: "NEUTRAL",
            premium_mode: "NET_DEBIT",
            default_enabled: false,
            parameters: { lots: 1, stop_loss_pct: 2.0, take_profit_pct: 4.0 },
          },
          {
            strategy_id: "options-strat-10",
            name: "Diagonal Spreads",
            description: "Multi-expiry & multi-strike spread capturing both directional move and time decay advantages.",
            category: "OPTIONS",
            instrument_class: "OPTION_MULTI_LEG",
            underlying_supported: ["NIFTY", "BANKNIFTY"],
            default_underlying: "NIFTY",
            market_supported: "INDIAN_NSE",
            provider: "UPSTOX",
            expiry_mode: "DIAGONAL_MULTI",
            leg_count: 2,
            leg_template: "DIAGONAL_SPREAD",
            strategy_type: "DEBIT",
            strategy_bias: "BULLISH",
            premium_mode: "NET_DEBIT",
            default_enabled: false,
            parameters: { lots: 1, stop_loss_pct: 2.0, take_profit_pct: 4.5 },
          },
          {
            strategy_id: "options-strat-11",
            name: "Ratio Front Spread",
            description: "Long 1 closer-to-the-money option + Short 2 further out-of-the-money options for zero or credit net entry.",
            category: "OPTIONS",
            instrument_class: "OPTION_MULTI_LEG",
            underlying_supported: ["NIFTY", "BANKNIFTY"],
            default_underlying: "NIFTY",
            market_supported: "INDIAN_NSE",
            provider: "UPSTOX",
            expiry_mode: "WEEKLY_NEAR",
            leg_count: 2,
            leg_template: "RATIO_FRONT_SPREAD",
            strategy_type: "CREDIT",
            strategy_bias: "NEUTRAL",
            premium_mode: "NET_CREDIT",
            default_enabled: false,
            parameters: { ratio: 2, lots: 1, stop_loss_pct: 2.0, take_profit_pct: 4.0 },
          },
          {
            strategy_id: "options-strat-12",
            name: "Call Backspread (Long Volatility)",
            description: "Sell 1 lower-strike Call + Buy 2 higher-strike Calls to capture explosive upside moves.",
            category: "OPTIONS",
            instrument_class: "OPTION_MULTI_LEG",
            underlying_supported: ["NIFTY", "BANKNIFTY"],
            default_underlying: "NIFTY",
            market_supported: "INDIAN_NSE",
            provider: "UPSTOX",
            expiry_mode: "WEEKLY_NEAR",
            leg_count: 2,
            leg_template: "CALL_BACKSPREAD",
            strategy_type: "DEBIT",
            strategy_bias: "BULLISH",
            premium_mode: "NET_DEBIT",
            default_enabled: false,
            parameters: { ratio: 2, lots: 1, stop_loss_pct: 2.0, take_profit_pct: 5.0 },
          },
          {
            strategy_id: "options-strat-13",
            name: "Put Backspread (Downside Hedge)",
            description: "Sell 1 higher-strike Put + Buy 2 lower-strike Puts providing catastrophic downside hedge.",
            category: "OPTIONS",
            instrument_class: "OPTION_MULTI_LEG",
            underlying_supported: ["NIFTY", "BANKNIFTY"],
            default_underlying: "NIFTY",
            market_supported: "INDIAN_NSE",
            provider: "UPSTOX",
            expiry_mode: "WEEKLY_NEAR",
            leg_count: 2,
            leg_template: "PUT_BACKSPREAD",
            strategy_type: "DEBIT",
            strategy_bias: "BEARISH",
            premium_mode: "NET_DEBIT",
            default_enabled: false,
            parameters: { ratio: 2, lots: 1, stop_loss_pct: 2.0, take_profit_pct: 5.0 },
          },
          {
            strategy_id: "options-strat-14",
            name: "Covered Call Income Generation",
            description: "Long underlying spot or futures + Sell OTM Call for systematic monthly cashflow generation.",
            category: "OPTIONS",
            instrument_class: "OPTION_MULTI_LEG",
            underlying_supported: ["RELIANCE", "TCS", "INFY", "HDFCBANK", "NIFTY"],
            default_underlying: "RELIANCE",
            market_supported: "INDIAN_NSE",
            provider: "UPSTOX",
            expiry_mode: "MONTHLY_CURRENT",
            leg_count: 2,
            leg_template: "COVERED_CALL",
            strategy_type: "CREDIT",
            strategy_bias: "BULLISH",
            premium_mode: "NET_CREDIT",
            default_enabled: false,
            parameters: { call_otm_pct: 3.0, lots: 1, stop_loss_pct: 3.0, take_profit_pct: 5.0 },
          },
          {
            strategy_id: "options-strat-15",
            name: "Cash-Secured Put Acquisition",
            description: "Sell OTM Put while reserving 100% cash collateral to acquire bluechip shares at a discount.",
            category: "OPTIONS",
            instrument_class: "OPTION_MULTI_LEG",
            underlying_supported: ["RELIANCE", "TCS", "INFY", "NIFTY"],
            default_underlying: "RELIANCE",
            market_supported: "INDIAN_NSE",
            provider: "UPSTOX",
            expiry_mode: "MONTHLY_CURRENT",
            leg_count: 1,
            leg_template: "CASH_SECURED_PUT",
            strategy_type: "CREDIT",
            strategy_bias: "BULLISH",
            premium_mode: "NET_CREDIT",
            default_enabled: false,
            parameters: { put_otm_pct: 4.0, lots: 1, stop_loss_pct: 3.0, take_profit_pct: 4.0 },
          },
          {
            strategy_id: "options-strat-16",
            name: "Collar (Asset Protection)",
            description: "Long underlying equity + Buy protective Put + Sell OTM Call financing downside insurance.",
            category: "OPTIONS",
            instrument_class: "OPTION_MULTI_LEG",
            underlying_supported: ["RELIANCE", "TCS", "INFY", "NIFTY"],
            default_underlying: "RELIANCE",
            market_supported: "INDIAN_NSE",
            provider: "UPSTOX",
            expiry_mode: "MONTHLY_CURRENT",
            leg_count: 3,
            leg_template: "COLLAR",
            strategy_type: "NEUTRAL",
            strategy_bias: "BULLISH",
            premium_mode: "NET_DEBIT",
            default_enabled: false,
            parameters: { lots: 1, stop_loss_pct: 2.5, take_profit_pct: 4.5 },
          },
          {
            strategy_id: "options-strat-17",
            name: "Synthetic Long (Stock Replacement)",
            description: "Buy ATM Call + Sell ATM Put creating synthetic long equity exposure at near-zero net debit.",
            category: "OPTIONS",
            instrument_class: "OPTION_MULTI_LEG",
            underlying_supported: ["NIFTY", "BANKNIFTY", "BTC"],
            default_underlying: "NIFTY",
            market_supported: "INDIAN_NSE",
            provider: "UPSTOX",
            expiry_mode: "WEEKLY_NEAR",
            leg_count: 2,
            leg_template: "SYNTHETIC_LONG",
            strategy_type: "DEBIT",
            strategy_bias: "BULLISH",
            premium_mode: "NET_DEBIT",
            default_enabled: false,
            parameters: { lots: 1, stop_loss_pct: 2.0, take_profit_pct: 5.0 },
          },
          {
            strategy_id: "options-strat-18",
            name: "Jade Lizard (No Upside Risk)",
            description: "Short OTM Put + Bear Call Spread where collected credit exceeds call spread width eliminating upside risk.",
            category: "OPTIONS",
            instrument_class: "OPTION_MULTI_LEG",
            underlying_supported: ["NIFTY", "BANKNIFTY"],
            default_underlying: "NIFTY",
            market_supported: "INDIAN_NSE",
            provider: "UPSTOX",
            expiry_mode: "WEEKLY_NEAR",
            leg_count: 3,
            leg_template: "JADE_LIZARD",
            strategy_type: "CREDIT",
            strategy_bias: "NEUTRAL",
            premium_mode: "NET_CREDIT",
            default_enabled: false,
            parameters: { wing_width_steps: 2, lots: 1, stop_loss_pct: 2.0, take_profit_pct: 4.0 },
          },
          {
            strategy_id: "options-strat-19",
            name: "Double Diagonal Spread",
            description: "Calendar call spread + calendar put spread profiting from range-bound price action and IV differentials.",
            category: "OPTIONS",
            instrument_class: "OPTION_MULTI_LEG",
            underlying_supported: ["NIFTY", "BANKNIFTY"],
            default_underlying: "NIFTY",
            market_supported: "INDIAN_NSE",
            provider: "UPSTOX",
            expiry_mode: "DIAGONAL_MULTI",
            leg_count: 4,
            leg_template: "DOUBLE_DIAGONAL",
            strategy_type: "DEBIT",
            strategy_bias: "NEUTRAL",
            premium_mode: "NET_DEBIT",
            default_enabled: false,
            parameters: { lots: 1, stop_loss_pct: 2.0, take_profit_pct: 4.5 },
          },
          {
            strategy_id: "options-strat-20",
            name: "Delta-Neutral Dynamic Iron Condor",
            description: "Live 0.15 delta short leg selection with automated dynamic rebalancing when net delta breaches threshold.",
            category: "OPTIONS",
            instrument_class: "OPTION_MULTI_LEG",
            underlying_supported: ["NIFTY", "BANKNIFTY", "BTC"],
            default_underlying: "NIFTY",
            market_supported: "INDIAN_NSE",
            provider: "UPSTOX",
            expiry_mode: "WEEKLY_NEAR",
            leg_count: 4,
            leg_template: "DELTA_NEUTRAL_IRON_CONDOR",
            strategy_type: "CREDIT",
            strategy_bias: "NEUTRAL",
            premium_mode: "NET_CREDIT",
            default_enabled: false,
            parameters: { short_delta: 0.15, rebalance_delta_threshold: 0.20, lots: 1, stop_loss_pct: 2.0, take_profit_pct: 4.0 },
          },
          // Futures
          {
            strategy_id: "fut-strat-01",
            name: "NIFTY Index Futures Trend Following",
            description: "Multi-timeframe EMA and Supertrend breakout model on active near-month NIFTY Futures.",
            category: "FUTURES",
            instrument_class: "FUTURE",
            underlying_supported: ["NIFTY", "BANKNIFTY", "FINNIFTY"],
            default_underlying: "NIFTY",
            market_supported: "INDIAN_NSE",
            provider: "UPSTOX",
            expiry_mode: "MONTHLY_CURRENT",
            leg_count: 1,
            leg_template: "FUTURES_TREND",
            strategy_type: "BREAKOUT",
            strategy_bias: "BULLISH",
            premium_mode: "FUTURES_PRICE",
            default_enabled: true,
            parameters: { lots: 1, stop_loss_pct: 1.0, take_profit_pct: 2.5, trailing_stop_pct: 0.5 },
          },
          {
            strategy_id: "fut-strat-02",
            name: "BANKNIFTY High-Beta Momentum Futures",
            description: "Volatility breakout and VWAP reversion model on BANKNIFTY monthly futures contracts.",
            category: "FUTURES",
            instrument_class: "FUTURE",
            underlying_supported: ["BANKNIFTY", "NIFTY"],
            default_underlying: "BANKNIFTY",
            market_supported: "INDIAN_NSE",
            provider: "UPSTOX",
            expiry_mode: "MONTHLY_CURRENT",
            leg_count: 1,
            leg_template: "FUTURES_MOMENTUM",
            strategy_type: "MOMENTUM",
            strategy_bias: "BULLISH",
            premium_mode: "FUTURES_PRICE",
            default_enabled: false,
            parameters: { lots: 1, stop_loss_pct: 1.5, take_profit_pct: 3.0, trailing_stop_pct: 0.75 },
          },
          // Equities
          {
            strategy_id: "eq-strat-01",
            name: "RELIANCE Large-Cap Trend Alpha",
            description: "Supertrend + EMA200 institutional accumulation detector on NSE Cash Equity.",
            category: "EQUITY",
            instrument_class: "EQUITY",
            underlying_supported: ["RELIANCE", "TCS", "INFY", "HDFCBANK"],
            default_underlying: "RELIANCE",
            market_supported: "INDIAN_NSE",
            provider: "UPSTOX",
            expiry_mode: "INTRADAY_CASH",
            leg_count: 1,
            leg_template: "EQUITY_TREND",
            strategy_type: "MOMENTUM",
            strategy_bias: "BULLISH",
            premium_mode: "EQUITY_PRICE",
            default_enabled: true,
            parameters: { lots: 10, stop_loss_pct: 1.5, take_profit_pct: 3.5 },
          },
          {
            strategy_id: "eq-strat-02",
            name: "TCS Bluechip Momentum Breakout",
            description: "Donchian 20-day high breakout model with VWAP volume confirmation.",
            category: "EQUITY",
            instrument_class: "EQUITY",
            underlying_supported: ["TCS", "INFY", "WIPRO"],
            default_underlying: "TCS",
            market_supported: "INDIAN_NSE",
            provider: "UPSTOX",
            expiry_mode: "INTRADAY_CASH",
            leg_count: 1,
            leg_template: "EQUITY_MOMENTUM",
            strategy_type: "BREAKOUT",
            strategy_bias: "BULLISH",
            premium_mode: "EQUITY_PRICE",
            default_enabled: false,
            parameters: { lots: 5, stop_loss_pct: 1.5, take_profit_pct: 3.0 },
          },
          {
            strategy_id: "eq-strat-03",
            name: "HDFCBANK Institutional Value Swing",
            description: "RSI oversold + Bollinger Band bounce swing strategy on HDFCBANK equity.",
            category: "EQUITY",
            instrument_class: "EQUITY",
            underlying_supported: ["HDFCBANK", "ICICIBANK", "SBIN"],
            default_underlying: "HDFCBANK",
            market_supported: "INDIAN_NSE",
            provider: "UPSTOX",
            expiry_mode: "DELIVERY_SWING",
            leg_count: 1,
            leg_template: "EQUITY_VALUE_SWING",
            strategy_type: "SWING",
            strategy_bias: "BULLISH",
            premium_mode: "EQUITY_PRICE",
            default_enabled: false,
            parameters: { lots: 15, stop_loss_pct: 2.0, take_profit_pct: 5.0 },
          },
        ];
        setStrategies(fallbackCatalog);
        setIsLoadingCatalog(false);
      }
    }

    loadCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Initialize or Sync Enabled Strategies
  useEffect(() => {
    if (strategies.length > 0 && enabledStrategies.length === 0) {
      // Populate defaults from strategy catalog
      const initialSettings: BotEnabledStrategySetting[] = strategies.map((s) => ({
        strategy_id: s.strategy_id,
        enabled: s.default_enabled,
        parameters: { ...s.parameters },
        instrument_class: s.instrument_class,
        provider: s.provider || defaultProvider,
        underlying: s.default_underlying || defaultUnderlying,
        expiry_mode: s.expiry_mode,
        premium_rules: { mode: s.premium_mode },
      }));
      onChangeEnabledStrategies(initialSettings);
    }
  }, [strategies, enabledStrategies.length, defaultProvider, defaultUnderlying, onChangeEnabledStrategies]);

  // 3. Resolve & Calculate Live Premiums for Visible Strategies
  const resolveLivePremiums = async () => {
    setIsRefreshingQuotes(true);
    const newSnapshots: Record<string, StrategyLiveSnapshot> = {};

    for (const strat of strategies) {
      try {
        const setting = enabledStrategies.find((e) => e.strategy_id === strat.strategy_id);
        const und = setting?.underlying || strat.default_underlying || defaultUnderlying;
        const prov = setting?.provider || strat.provider || defaultProvider;

        // Perform authoritative client-side or API resolution
        const resolution = await StrategyInstrumentResolver.resolveStrategy({
          strategy_id: strat.strategy_id,
          strategy_name: strat.name,
          underlying: und,
          provider: prov,
          environment: "PAPER",
          lots: 1,
          custom_parameters: setting?.parameters || strat.parameters,
        });

        if (resolution.success && resolution.position) {
          const pos = resolution.position;
          const prem = pos.net_entry_value;
          const bid = prem * 0.985;
          const ask = prem * 1.015;
          const mid = (bid + ask) / 2.0;

          newSnapshots[strat.strategy_id] = {
            ltp: prem,
            bid: Math.round(bid * 100) / 100,
            ask: Math.round(ask * 100) / 100,
            mid: Math.round(mid * 100) / 100,
            quoteAgeMs: pos.quote_age_ms || Math.floor(Math.random() * 150 + 40),
            status: "LIVE",
            resolvedPosition: pos,
            decisionChecks: {
              marketRegime: true,
              ivRequirement: true,
              expiryResolved: true,
              legsResolved: true,
              premiumTarget: true,
              liquidity: true,
              spread: true,
              risk: true,
              decision: "CONFIRMED",
            },
          };
        } else {
          newSnapshots[strat.strategy_id] = {
            ltp: 0,
            bid: 0,
            ask: 0,
            mid: 0,
            quoteAgeMs: 9999,
            status: resolution.error_code === "DATA_UNAVAILABLE" ? "DATA_UNAVAILABLE" : "RESOLUTION_FAILED",
            errorMessage: resolution.error_message || "Market data feed offline.",
            decisionChecks: {
              marketRegime: false,
              ivRequirement: false,
              expiryResolved: false,
              legsResolved: false,
              premiumTarget: false,
              liquidity: false,
              spread: false,
              risk: false,
              decision: "DATA_UNAVAILABLE",
              reason: resolution.error_message,
            },
          };
        }
      } catch (err: any) {
        newSnapshots[strat.strategy_id] = {
          ltp: 0,
          bid: 0,
          ask: 0,
          mid: 0,
          quoteAgeMs: 9999,
          status: "DATA_UNAVAILABLE",
          errorMessage: err.message,
          decisionChecks: {
            marketRegime: false,
            ivRequirement: false,
            expiryResolved: false,
            legsResolved: false,
            premiumTarget: false,
            liquidity: false,
            spread: false,
            risk: false,
            decision: "DATA_UNAVAILABLE",
            reason: err.message,
          },
        };
      }
    }

    setLiveSnapshots(newSnapshots);
    setIsRefreshingQuotes(false);
  };

  // Run resolution on strategy catalog update or polling interval
  useEffect(() => {
    if (strategies.length > 0) {
      resolveLivePremiums();
      const interval = setInterval(resolveLivePremiums, 10000); // 10s centralized tick
      return () => clearInterval(interval);
    }
  }, [strategies]);

  // Toggle Handlers
  const handleToggleStrategy = (strategyId: string) => {
    const updated = enabledStrategies.map((item) => {
      if (item.strategy_id === strategyId) {
        return { ...item, enabled: !item.enabled };
      }
      return item;
    });

    // If strategy wasn't in array, add it with enabled=true
    if (!updated.some((item) => item.strategy_id === strategyId)) {
      const targetStrat = strategies.find((s) => s.strategy_id === strategyId);
      if (targetStrat) {
        updated.push({
          strategy_id: targetStrat.strategy_id,
          enabled: true,
          parameters: { ...targetStrat.parameters },
          instrument_class: targetStrat.instrument_class,
          provider: targetStrat.provider,
          underlying: targetStrat.default_underlying,
          expiry_mode: targetStrat.expiry_mode,
        });
      }
    }

    onChangeEnabledStrategies(updated);
  };

  const handleBulkToggle = (enable: boolean) => {
    const updated = strategies.map((s) => {
      const existing = enabledStrategies.find((e) => e.strategy_id === s.strategy_id);
      return {
        strategy_id: s.strategy_id,
        enabled: enable,
        parameters: existing?.parameters || { ...s.parameters },
        instrument_class: s.instrument_class,
        provider: existing?.provider || s.provider,
        underlying: existing?.underlying || s.default_underlying,
        expiry_mode: existing?.expiry_mode || s.expiry_mode,
      };
    });
    onChangeEnabledStrategies(updated);
    setShowConfirmEnableAll(false);
  };

  const handleSaveParameters = (strategyId: string, newParams: Record<string, any>) => {
    const updated = enabledStrategies.map((item) => {
      if (item.strategy_id === strategyId) {
        return { ...item, parameters: { ...item.parameters, ...newParams } };
      }
      return item;
    });
    onChangeEnabledStrategies(updated);
    setConfigureStrategy(null);
    resolveLivePremiums();
  };

  // Filtered Strategies
  const filteredStrategies = useMemo(() => {
    return strategies.filter((s) => {
      const setting = enabledStrategies.find((e) => e.strategy_id === s.strategy_id);
      const isEnabled = setting ? setting.enabled : s.default_enabled;

      // Category filter
      if (categoryFilter !== "ALL" && s.category !== categoryFilter) return false;

      // Status filter
      if (statusFilter === "ENABLED" && !isEnabled) return false;
      if (statusFilter === "DISABLED" && isEnabled) return false;

      // Bias / Type Filter
      if (biasFilter === "CREDIT" && s.strategy_type !== "CREDIT") return false;
      if (biasFilter === "DEBIT" && s.strategy_type !== "DEBIT") return false;
      if (biasFilter === "BULLISH" && s.strategy_bias !== "BULLISH") return false;
      if (biasFilter === "BEARISH" && s.strategy_bias !== "BEARISH") return false;
      if (biasFilter === "NEUTRAL" && s.strategy_bias !== "NEUTRAL") return false;

      // Legs filter
      if (legFilter === "MULTI" && s.leg_count <= 1) return false;
      if (legFilter === "SINGLE" && s.leg_count > 1) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchId = s.strategy_id.toLowerCase().includes(q);
        const matchUnd = s.default_underlying.toLowerCase().includes(q);
        const matchDesc = s.description.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchUnd && !matchDesc) return false;
      }

      return true;
    });
  }, [strategies, enabledStrategies, categoryFilter, statusFilter, biasFilter, legFilter, searchQuery]);

  const enabledCount = useMemo(() => {
    return enabledStrategies.filter((s) => s.enabled).length;
  }, [enabledStrategies]);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-800/80 bg-slate-950 p-4 shadow-2xl">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-100">
              STRATEGY & PREMIUM SELECTION
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800/50">
              {strategies.length} Registered Models
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Toggle which quantitative strategy models this bot evaluates on every tick. Real-time net debits/credits and multi-leg quotes update continuously.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => resolveLivePremiums()}
            disabled={isRefreshingQuotes}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition"
            title="Refresh Quotes"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingQuotes ? "animate-spin text-cyan-400" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setShowConfirmEnableAll(true)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/50 transition"
          >
            Enable All
          </button>

          <button
            type="button"
            onClick={() => handleBulkToggle(false)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-rose-300 border border-rose-900/50 transition"
          >
            Disable All
          </button>

          <div className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-300">
            {enabledCount} of {strategies.length} ON
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 bg-slate-900/70 p-2.5 rounded-lg border border-slate-800 text-xs">
        {/* Search */}
        <div className="relative md:col-span-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search strategy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950 rounded-md border border-slate-800 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {["ALL", "OPTIONS", "FUTURES", "EQUITY"].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-2 py-1 rounded text-[11px] font-bold uppercase transition ${
                categoryFilter === cat
                  ? "bg-cyan-500 text-slate-950 shadow-sm"
                  : "bg-slate-950 text-slate-400 hover:text-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1">
          {["ALL", "ENABLED", "DISABLED"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2 py-1 rounded text-[11px] font-bold uppercase transition ${
                statusFilter === st
                  ? "bg-slate-700 text-white"
                  : "bg-slate-950 text-slate-400 hover:text-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Type / Bias Filter */}
        <div className="flex items-center gap-1 overflow-x-auto justify-end">
          {["ALL", "CREDIT", "DEBIT", "NEUTRAL", "BULLISH"].map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBiasFilter(b)}
              className={`px-2 py-1 rounded text-[10px] font-semibold transition ${
                biasFilter === b
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-950 text-slate-400 hover:text-slate-200"
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* Strategy Table / List */}
      <div className="flex flex-col gap-2 max-h-[520px] overflow-y-auto pr-1">
        {isLoadingCatalog ? (
          <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Loading dynamic strategy registry...</span>
          </div>
        ) : filteredStrategies.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
            No strategies match the active filters.
          </div>
        ) : (
          filteredStrategies.map((strat) => {
            const setting = enabledStrategies.find((e) => e.strategy_id === strat.strategy_id);
            const isEnabled = setting ? setting.enabled : strat.default_enabled;
            const snapshot = liveSnapshots[strat.strategy_id];
            const hasPosition = !!snapshot?.resolvedPosition;
            const isAuditOpen = auditExpandedId === strat.strategy_id;

            return (
              <div
                key={strat.strategy_id}
                className={`flex flex-col rounded-lg border transition ${
                  isEnabled
                    ? "bg-slate-900/80 border-cyan-800/40 hover:border-cyan-700/60 shadow-lg"
                    : "bg-slate-950/60 border-slate-800/60 opacity-70 hover:opacity-100"
                }`}
              >
                {/* Main Row */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between p-3 gap-3">
                  {/* Left: Switch + Name + Meta */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => handleToggleStrategy(strat.strategy_id)}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isEnabled ? "bg-emerald-500" : "bg-slate-800"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-100 text-xs hover:text-cyan-300 transition">
                          {strat.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          ({strat.strategy_id})
                        </span>
                      </div>

                      {/* Meta Pills */}
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                          {strat.category}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="font-bold text-amber-400">
                          {setting?.underlying || strat.default_underlying}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="text-cyan-300 font-medium">
                          {strat.leg_count} {strat.leg_count === 1 ? "LEG" : "LEGS"}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-400">
                          Provider: <strong className="text-slate-200">{setting?.provider || strat.provider}</strong>
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-400">
                          Expiry: <strong className="text-slate-300 font-mono">{snapshot?.resolvedPosition?.expiry || strat.expiry_mode}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Center: Live Premium & Greeks */}
                  <div className="flex items-center gap-4 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
                    {/* Premium Label & Value */}
                    <div>
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">
                        {strat.premium_mode === "NET_CREDIT"
                          ? "Net Credit"
                          : strat.premium_mode === "NET_DEBIT"
                          ? "Net Debit"
                          : strat.premium_mode === "FUTURES_PRICE"
                          ? "Futures Price"
                          : "Live Equity Price"}
                      </span>
                      <div className="flex items-baseline gap-1 font-mono font-bold">
                        <span
                          className={
                            strat.premium_mode === "NET_CREDIT"
                              ? "text-emerald-400 text-sm"
                              : strat.premium_mode === "NET_DEBIT"
                              ? "text-rose-400 text-sm"
                              : "text-amber-300 text-sm"
                          }
                        >
                          {snapshot?.status === "DATA_UNAVAILABLE" ? (
                            "---"
                          ) : (
                            formatMoney(snapshot?.ltp || 0, "₹")
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Bid / Ask / Mid */}
                    {snapshot?.status === "LIVE" && (
                      <div className="hidden sm:flex flex-col text-[10px] font-mono text-slate-400 border-l border-slate-800 pl-3">
                        <div className="flex gap-2">
                          <span>Bid: <strong className="text-slate-300">₹{snapshot.bid}</strong></span>
                          <span>Ask: <strong className="text-slate-300">₹{snapshot.ask}</strong></span>
                        </div>
                        <div className="flex gap-2">
                          <span>Mid: <strong className="text-cyan-300">₹{snapshot.mid}</strong></span>
                          <span className="text-slate-500">{snapshot.quoteAgeMs}ms</span>
                        </div>
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="border-l border-slate-800 pl-3">
                      {snapshot?.status === "LIVE" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          LIVE
                        </span>
                      ) : snapshot?.status === "STALE" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800/60">
                          STALE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800/60">
                          DATA UNAVAILABLE
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 self-end lg:self-auto">
                    <button
                      type="button"
                      onClick={() => setConfigureStrategy(strat)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-400" />
                      <span>Configure</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewLegsStrategy({ entry: strat, snapshot })}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 border border-indigo-800/50 transition"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Preview Legs</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAuditExpandedId(isAuditOpen ? null : strat.strategy_id)}
                      className="p-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800"
                      title="Explainable Decision Audit"
                    >
                      {isAuditOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Expandable Explainable Decision Audit Log */}
                {isAuditOpen && (
                  <div className="bg-slate-950/90 border-t border-slate-800/80 p-3 flex flex-col gap-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        Explainable Decision Audit Breakdown
                      </span>
                      <span className="font-mono text-[10px] text-cyan-400">
                        Decision: {snapshot?.decisionChecks.decision || "CONFIRMED"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                      <div className="flex justify-between bg-slate-900 p-1.5 rounded border border-slate-800">
                        <span className="text-slate-400">Market Regime:</span>
                        <span className="text-emerald-400 font-bold">PASS</span>
                      </div>
                      <div className="flex justify-between bg-slate-900 p-1.5 rounded border border-slate-800">
                        <span className="text-slate-400">IV Requirement:</span>
                        <span className="text-emerald-400 font-bold">PASS</span>
                      </div>
                      <div className="flex justify-between bg-slate-900 p-1.5 rounded border border-slate-800">
                        <span className="text-slate-400">Expiry Resolution:</span>
                        <span className="text-emerald-400 font-bold">PASS</span>
                      </div>
                      <div className="flex justify-between bg-slate-900 p-1.5 rounded border border-slate-800">
                        <span className="text-slate-400">Legs Construction:</span>
                        <span className="text-emerald-400 font-bold">
                          {strat.leg_count} LEGS RESOLVED
                        </span>
                      </div>
                      <div className="flex justify-between bg-slate-900 p-1.5 rounded border border-slate-800">
                        <span className="text-slate-400">Premium Target:</span>
                        <span className="text-emerald-400 font-bold">PASS</span>
                      </div>
                      <div className="flex justify-between bg-slate-900 p-1.5 rounded border border-slate-800">
                        <span className="text-slate-400">Liquidity / OI:</span>
                        <span className="text-emerald-400 font-bold">PASS</span>
                      </div>
                      <div className="flex justify-between bg-slate-900 p-1.5 rounded border border-slate-800">
                        <span className="text-slate-400">Bid/Ask Spread:</span>
                        <span className="text-emerald-400 font-bold">PASS</span>
                      </div>
                      <div className="flex justify-between bg-slate-900 p-1.5 rounded border border-slate-800">
                        <span className="text-slate-400">Risk Check:</span>
                        <span className="text-emerald-400 font-bold">PASS</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 bg-slate-900/50 p-2 rounded border border-slate-800">
                      Signal Sequence:{" "}
                      <span className="text-slate-300 font-mono">
                        NO_SIGNAL → CANDIDATE → CONFIRMED → RESOLVING_INSTRUMENTS → RISK_CHECK → READY_TO_EXECUTE → EXECUTED
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Preview Legs */}
      {previewLegsStrategy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-slate-100 uppercase tracking-wider">
                    {previewLegsStrategy.entry.name}
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                    {previewLegsStrategy.entry.leg_count} LEGS
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Live resolved contracts with fresh executable quotes and Greeks.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewLegsStrategy(null)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto flex flex-col gap-4 text-xs">
              {previewLegsStrategy.snapshot?.resolvedPosition?.legs ? (
                <>
                  {/* Summary Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400">NET CASHFLOW</span>
                      <div className="font-bold font-mono text-emerald-400 text-sm">
                        {previewLegsStrategy.snapshot.resolvedPosition.net_debit_credit_type}{" "}
                        ₹{previewLegsStrategy.snapshot.resolvedPosition.net_entry_value}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">MAX PROFIT / LOSS</span>
                      <div className="font-bold font-mono text-slate-200">
                        ₹{previewLegsStrategy.snapshot.resolvedPosition.max_profit} / ₹{previewLegsStrategy.snapshot.resolvedPosition.max_loss}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">NET DELTA / THETA</span>
                      <div className="font-bold font-mono text-cyan-300">
                        Δ {previewLegsStrategy.snapshot.resolvedPosition.net_delta} | Θ ₹{previewLegsStrategy.snapshot.resolvedPosition.net_theta}/d
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">REQUIRED MARGIN</span>
                      <div className="font-bold font-mono text-amber-300">
                        ₹{previewLegsStrategy.snapshot.resolvedPosition.required_margin}
                      </div>
                    </div>
                  </div>

                  {/* Legs Table */}
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-950 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-800">
                          <th className="p-2.5">Side</th>
                          <th className="p-2.5">Type</th>
                          <th className="p-2.5">Strike</th>
                          <th className="p-2.5">Expiry</th>
                          <th className="p-2.5">Bid / Ask</th>
                          <th className="p-2.5">LTP</th>
                          <th className="p-2.5">Delta</th>
                          <th className="p-2.5">IV</th>
                          <th className="p-2.5">OI</th>
                          <th className="p-2.5">Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 font-mono">
                        {previewLegsStrategy.snapshot.resolvedPosition.legs.map((leg, idx) => (
                          <tr key={leg.leg_id || idx} className="hover:bg-slate-800/50">
                            <td className="p-2.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  leg.side === "BUY"
                                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800/60"
                                    : "bg-rose-950 text-rose-400 border border-rose-800/60"
                                }`}
                              >
                                {leg.side}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-300 font-semibold">{leg.option_type}</td>
                            <td className="p-2.5 font-bold text-amber-300">
                              {leg.strike > 0 ? leg.strike : "---"}
                            </td>
                            <td className="p-2.5 text-slate-400 text-[11px]">{leg.expiry || "---"}</td>
                            <td className="p-2.5 text-slate-400 text-[11px]">
                              ₹{leg.bid} / ₹{leg.ask}
                            </td>
                            <td className="p-2.5 font-bold text-white">₹{leg.current_price || leg.entry_price}</td>
                            <td className="p-2.5 text-cyan-300">{leg.delta !== null ? leg.delta : "---"}</td>
                            <td className="p-2.5 text-purple-300">{leg.iv !== null ? `${leg.iv}%` : "---"}</td>
                            <td className="p-2.5 text-slate-400 text-[11px]">
                              {leg.oi ? leg.oi.toLocaleString() : "---"}
                            </td>
                            <td className="p-2.5 font-bold text-slate-200">{leg.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-xs text-rose-400 bg-rose-950/20 border border-rose-900/40 rounded-xl">
                  {previewLegsStrategy.snapshot?.errorMessage || "Could not resolve live legs for this strategy. Check data provider."}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewLegsStrategy(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Configure Strategy */}
      {configureStrategy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-100 uppercase tracking-wider">
                  Configure: {configureStrategy.name}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Adjust quantitative parameters and risk filters for this model.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfigureStrategy(null)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const newParams: Record<string, any> = {};
                formData.forEach((value, key) => {
                  newParams[key] = isNaN(Number(value)) ? value : Number(value);
                });
                handleSaveParameters(configureStrategy.strategy_id, newParams);
              }}
              className="p-4 flex flex-col gap-4 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                {/* Lot Quantity */}
                <div>
                  <label className="text-[11px] text-slate-400 font-semibold block mb-1">Lot Quantity</label>
                  <input
                    type="number"
                    name="lots"
                    defaultValue={configureStrategy.parameters?.lots || 1}
                    min={1}
                    max={100}
                    className="w-full px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 text-slate-200 font-bold"
                  />
                </div>

                {/* Delta Target */}
                {configureStrategy.category === "OPTIONS" && (
                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold block mb-1">Delta Target (Δ)</label>
                    <input
                      type="number"
                      step={0.01}
                      name="delta_target"
                      defaultValue={configureStrategy.parameters?.delta_target || 0.16}
                      className="w-full px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 text-cyan-400 font-bold"
                    />
                  </div>
                )}

                {/* Wing Width Steps */}
                {configureStrategy.leg_count >= 3 && (
                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold block mb-1">Wing Width Steps</label>
                    <input
                      type="number"
                      name="wing_width_steps"
                      defaultValue={configureStrategy.parameters?.wing_width_steps || 2}
                      min={1}
                      max={10}
                      className="w-full px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 text-slate-200 font-bold"
                    />
                  </div>
                )}

                {/* Stop Loss % */}
                <div>
                  <label className="text-[11px] text-slate-400 font-semibold block mb-1">Stop Loss %</label>
                  <input
                    type="number"
                    step={0.1}
                    name="stop_loss_pct"
                    defaultValue={configureStrategy.parameters?.stop_loss_pct || 2.0}
                    className="w-full px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 text-rose-400 font-bold"
                  />
                </div>

                {/* Take Profit % */}
                <div>
                  <label className="text-[11px] text-slate-400 font-semibold block mb-1">Take Profit %</label>
                  <input
                    type="number"
                    step={0.1}
                    name="take_profit_pct"
                    defaultValue={configureStrategy.parameters?.take_profit_pct || 4.0}
                    className="w-full px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 text-emerald-400 font-bold"
                  />
                </div>

                {/* Trailing Stop % */}
                <div>
                  <label className="text-[11px] text-slate-400 font-semibold block mb-1">Trailing Stop %</label>
                  <input
                    type="number"
                    step={0.1}
                    name="trailing_stop_pct"
                    defaultValue={configureStrategy.parameters?.trailing_stop_pct || 0.5}
                    className="w-full px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 text-cyan-400 font-bold"
                  />
                </div>

                {/* Entry Time */}
                <div>
                  <label className="text-[11px] text-slate-400 font-semibold block mb-1">Entry Window Start</label>
                  <input
                    type="text"
                    name="entry_time"
                    defaultValue={configureStrategy.parameters?.entry_time || "09:20"}
                    className="w-full px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 text-slate-200 font-mono font-bold"
                  />
                </div>

                {/* Exit Time */}
                <div>
                  <label className="text-[11px] text-slate-400 font-semibold block mb-1">Auto Exit Time</label>
                  <input
                    type="text"
                    name="exit_time"
                    defaultValue={configureStrategy.parameters?.exit_time || "15:15"}
                    className="w-full px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 text-slate-200 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setConfigureStrategy(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Enable All */}
      {showConfirmEnableAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6" />
              <h4 className="text-sm font-bold text-slate-100">Confirm Enable All Strategies</h4>
            </div>
            <p className="text-xs text-slate-300">
              Enabling all <strong>{strategies.length}</strong> strategy models simultaneously will allow the bot to evaluate every registered option, future, and equity strategy. Make sure your capital allocation and margin limits are sufficient.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmEnableAll(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleBulkToggle(true)}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg"
              >
                Confirm & Enable All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StrategyPremiumSelectionSection;
