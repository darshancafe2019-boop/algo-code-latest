export interface TradeAnalysisInstrument {
  symbol: string;
  underlying: string;
  side: "BUY" | "SELL";
  assetClass: "EQUITY" | "FUTURES" | "OPTION" | "CRYPTO";
  strike?: number;
  expiry?: string;
  ltp: number;
  optionType?: "CE" | "PE";
  lotSize: number;
  securityId?: string;
  bid?: number;
  ask?: number;
  spread?: number;
  volume?: number;
  openInterest?: number;
  iv?: number;
  greeks?: {
    delta?: number;
    gamma?: number;
    theta?: number;
    vega?: number;
  };
}

export interface TradeAnalysisMetrics {
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  iv?: number;
  maxProfit?: number | string;
  maxLoss?: number | string;
  breakeven?: number | string;
  riskRewardRatio?: number | string;
  pop?: number;
}
