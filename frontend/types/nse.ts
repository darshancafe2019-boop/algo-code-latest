/**
 * TypeScript Interfaces for Quant.OS NSE Indian Market Intelligence
 */

export interface NseQuoteData {
  Symbol: string;
  LastTradedPrice: number;
  PreviousClose?: number;
  Change?: number;
  PercentChange?: number;
  Open?: number;
  Close?: number;
  High?: number;
  Low?: number;
  VWAP?: number;
  UpperCircuit?: number;
  LowerCircuit?: number;
}

export interface NseQuoteResponse {
  status: "success" | "warning" | "error";
  symbol: string;
  data: NseQuoteData;
  timestamp: string;
}

export interface OptionLegGreekData {
  ltp: number;
  change: number;
  open_interest: number;
  change_in_oi: number;
  volume: number;
  iv: number;
  moneyness?: "ITM" | "ATM" | "OTM";
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  rho?: number;
  intrinsic_value?: number;
  time_value?: number;
}

export interface NseOptionStrikeRow {
  strike: number;
  is_atm: boolean;
  distance_pct?: number;
  ce: OptionLegGreekData;
  pe: OptionLegGreekData;
}

export interface NseOptionChainResponse {
  status: "success" | "warning" | "error";
  symbol: string;
  spot_price: number;
  selected_expiry: string;
  available_expiries: string[];
  max_pain_strike: number;
  pcr_oi: number;
  pcr_volume: number;
  total_call_oi: number;
  total_put_oi: number;
  strikes: NseOptionStrikeRow[];
  timestamp: string;
}

export interface AdvanceDeclineItem {
  Index: string;
  Advances: number;
  Declines: number;
  Unchanged: number;
}

export interface GainerLoserItem {
  symbol: string;
  ltp?: number;
  pChange?: number;
  perChange?: number;
  volume?: number;
  lastPrice?: number;
}

export interface FiiDiiFlowItem {
  category: string;
  buyValue: string | number;
  sellValue: string | number;
  netValue: string | number;
  date: string;
}

export interface NseMarketSummaryResponse {
  status: "success" | "warning" | "error";
  indices: Record<string, NseQuoteData>;
  advance_decline: AdvanceDeclineItem[];
  gainers: GainerLoserItem[];
  losers: GainerLoserItem[];
  fii_dii: FiiDiiFlowItem[];
  timestamp: string;
}

export interface ActiveOptionContract {
  identifier?: string;
  symbol: string;
  strikePrice?: number;
  optionType?: "CE" | "PE";
  totalTradedVolume?: number;
  lastPrice?: number;
  pChange?: number;
}

export interface OiSpurtItem {
  symbol: string;
  oi_bucket?: string;
  changeInOI?: number;
  pChange?: number;
}

export interface NseDerivativesResponse {
  status: "success" | "error";
  most_active_options: ActiveOptionContract[];
  oi_underlying: any[];
  oi_contracts: OiSpurtItem[];
  timestamp: string;
}

export interface CorporateActionItem {
  symbol: string;
  series?: string;
  subject: string;
  exDate?: string;
  recordDate?: string;
}

export interface NseTradeExecutionPayload {
  symbol: string;
  direction: "BUY" | "SELL";
  quantity: number;
  price?: number;
  order_type?: "MARKET" | "LIMIT";
  stop_loss?: number;
  take_profit?: number;
  bot_id?: string;
  strategy?: string;
  mode?: "PAPER" | "LIVE";
}

export interface NseTradeExecutionResponse {
  status: "success" | "error";
  order_id: string;
  symbol: string;
  direction: string;
  quantity: number;
  fill_price: number;
  mode: string;
  message: string;
}
