/**
 * Quant.OS Bot Creation Intent Types
 * ===================================
 * Typed data structure representing the exact market context, instrument,
 * and trading direction captured when clicking BUY / SELL from market data screens.
 */

export type BotTradingDirection = "BUY" | "SELL" | "BOTH";

export type BotAssetClass =
  | "SPOT"
  | "FUTURE"
  | "FUTURES"
  | "PERPETUAL"
  | "OPTION"
  | "OPTIONS"
  | "CRYPTO"
  | "CRYPTO_OPTIONS"
  | "EQUITY"
  | "STOCKS"
  | "FOREX"
  | "COMMODITY"
  | "COMMODITIES"
  | "ETF"
  | "INDEX";

export interface BotCreationIntent {
  symbol: string;
  canonicalSymbol: string;

  side: "BUY" | "SELL";

  assetClass: BotAssetClass;

  market?: string;
  exchange?: string;

  broker?: string;
  marketDataSource?: string;

  instrumentId?: string;

  currentPrice?: number | null;
  bid?: number | null;
  ask?: number | null;
  markPrice?: number | null;

  underlying?: string;
  securityId?: string;
  tradingSymbol?: string;

  timeframe?: string;

  expiry?: string | null;
  strike?: number | null;

  optionType?: "CALL" | "PUT" | "CE" | "PE" | null;

  lotSize?: number | null;
  tickSize?: number | null;

  openInterest?: number | null;
  volume?: number | null;

  delta?: number | null;
  gamma?: number | null;
  theta?: number | null;
  vega?: number | null;
  iv?: number | null;

  maxLeverage?: number | null;
  fundingRate?: number | null;

  timestamp: number;

  origin: "LIVE_FEED" | "OPTIONS" | "FUTURES";

  mode?: "new" | "addLeg";

  creationIntentId?: string;
}
