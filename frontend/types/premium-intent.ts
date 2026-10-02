export type MarketType =
  | "INDIAN_EQUITY"
  | "INDIAN_INDEX"
  | "INDIAN_FUTURES"
  | "INDIAN_OPTIONS"
  | "CRYPTO_SPOT"
  | "CRYPTO_FUTURES"
  | "CRYPTO_OPTIONS"
  | "FOREX"
  | "COMMODITIES";

export type InstrumentClass =
  | "EQUITY"
  | "FUTURE"
  | "OPTION_SINGLE"
  | "OPTION_MULTI_LEG"
  | "CRYPTO_SPOT"
  | "CRYPTO_FUTURE"
  | "CRYPTO_OPTION";

export type ExpiryMode =
  | "CURRENT"
  | "NEXT"
  | "NEAREST_WEEKLY"
  | "NEAREST_MONTHLY"
  | "MONTHLY"
  | "CUSTOM"
  | "EXACT";

export type StrikeMode =
  | "ATM"
  | "ITM"
  | "OTM"
  | "FIXED_STRIKE"
  | "TARGET_PREMIUM"
  | "TARGET_DELTA"
  | "CUSTOM";

export type PremiumMode =
  | "TARGET_PREMIUM"
  | "PREMIUM_RANGE"
  | "TARGET_DELTA"
  | "ATM"
  | "ITM"
  | "OTM"
  | "FIXED_STRIKE"
  | "CUSTOM";

export type ContractMode = "DYNAMIC" | "PINNED";

export interface PremiumIntent {
  market_type: MarketType;
  underlying: string;
  exchange: string;
  instrument_class: InstrumentClass;

  expiry_mode: ExpiryMode;
  selected_expiry?: string;

  option_type: string; // CE, PE, BOTH, STRADDLE, STRANGLE, SPREAD, CONDOR, etc.

  strike_mode: StrikeMode;
  selected_strike?: number;

  premium_mode: PremiumMode;
  target_premium?: number;
  premium_min?: number;
  premium_max?: number;

  target_delta?: number;

  quantity: number;
  lots: number;
  lot_size: number;

  provider: string;
  contract_mode: ContractMode;

  signal_instrument_class?: string;
  signal_underlying?: string;

  strike_gap?: number;
  wing_width_strikes?: number;

  created_at?: string;
}

export interface ResolvedLegQuote {
  instrument_key: string;
  trading_symbol: string;
  underlying: string;
  option_type: string; // "CE" | "PE" | "FUT" | "EQ"
  strike: number;
  expiry: string;
  side: "BUY" | "SELL";
  ratio: number;
  quantity: number;
  lot_size: number;
  bid?: number;
  ask?: number;
  ltp?: number;
  mid?: number;
  selected_execution_price: number;
  iv?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  open_interest?: number;
  oi_change?: number;
  volume?: number;
  provider: string;
  data_age_ms: number;
  stale: boolean;
}

export interface MatchScoreBreakdown {
  target_premium_match_pct: number;
  delta_match_pct: number;
  liquidity_status: "PASS" | "WARN" | "FAIL";
  spread_status: "PASS" | "WARN" | "FAIL";
  expiry_status: "PASS" | "FAIL";
  strategy_compatibility: "PASS" | "FAIL";
  freshness_ms: number;
  overall_score: number;
  rank_label: "BEST_MATCH" | "ALTERNATIVE_1" | "ALTERNATIVE_2" | "VIABLE";
}

export interface ResolvedPremiumPlan {
  plan_id: string;
  strategy_id: string;
  strategy_name: string;
  underlying: string;
  spot_price: number;
  selected_expiry: string;
  legs: ResolvedLegQuote[];

  // Signed cash flows
  net_debit_per_unit: number;
  net_credit_per_unit: number;
  net_debit_per_lot: number;
  net_credit_per_lot: number;
  net_debit_total: number;
  net_credit_total: number;

  // Conservative execution
  mid_execution_value: number;
  conservative_execution_value: number;

  // Risk & Capital
  estimated_margin: number;
  estimated_max_loss: number;
  estimated_fees: number;
  required_capital: number;
  available_capital: number;
  is_sufficient_capital: boolean;

  // Status
  score_breakdown?: MatchScoreBreakdown;
  valid: boolean;
  error_code?: string;
  rejection_reason?: string;
  resolved_at: string;
}
