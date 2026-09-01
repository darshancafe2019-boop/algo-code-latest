/**
 * Modular Futures Universe TypeScript Definitions
 * ================================================
 * Institutional types for Futures contracts, funding rates, basis arbitrage,
 * and margin liquidation calculations.
 */

export type FuturesContractType =
  | "PERPETUAL"
  | "QUARTERLY"
  | "MONTHLY"
  | "INDEX_FUTURES"
  | "COMMODITY_FUTURES";

export type MarketVenue =
  | "BINANCE"
  | "DELTA_EXCHANGE"
  | "UPSTOX_NSE"
  | "CME"
  | "DERIBIT";

export type MarginMode = "CROSS" | "ISOLATED";

export interface FundingRateData {
  symbol: string;
  venue: MarketVenue;
  funding_rate_8h: number;
  funding_rate_annualized: number;
  predicted_next_rate: number;
  next_funding_time: string;
  countdown_seconds: number;
  historical_avg_7d: number;
}

export interface BasisData {
  symbol: string;
  spot_symbol: string;
  spot_price: number;
  futures_price: number;
  basis_absolute: number;
  basis_percentage: number;
  annualized_basis: number;
  regime: "CONTANGO" | "BACKWARDATION" | "PARITY";
}

export interface CanonicalFuturesContract {
  symbol: string;
  underlying: string;
  displayName: string;
  contract_type: FuturesContractType;
  venue: MarketVenue;
  mark_price: number;
  index_price: number;
  last_price: number;
  change_24h_pct: number;
  volume_24h_usd: number;
  open_interest_usd: number;
  open_interest_coins: number;
  funding_rate?: FundingRateData;
  basis?: BasisData;
  max_leverage: number;
  min_qty: number;
  tick_size: number;
  maker_fee_pct?: number;
  taker_fee_pct?: number;
  expiry_date?: string;
  is_active: boolean;
  long_short_ratio: number;
  timestamp: string;
}

export interface FundingHeatmapItem {
  symbol: string;
  underlying: string;
  markPrice: number;
  change24h: number;
  rate8h: number;
  apr: number;
  countdown: string;
  openInterestUsd: number;
}

export interface LiquidationCalcResult {
  entryPrice: number;
  leverage: number;
  side: "LONG" | "SHORT" | "BUY" | "SELL";
  liquidationPrice: number;
  liquidationDistancePct: number;
  riskLevel: "HIGH" | "MODERATE" | "SAFE";
}
