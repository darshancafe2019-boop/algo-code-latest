export type DeltaConnectionStatus =
  | "LIVE"
  | "DELAYED"
  | "STALE"
  | "RECONNECTING"
  | "DISCONNECTED";

export type DeltaOptionSide =
  | "CALL"
  | "PUT";

export type DeltaOptionLeg = {
  source: "DELTA_EXCHANGE";
  broker: "DELTA";
  symbol: string;
  productId: number;

  underlying: string;
  expiry: string;
  strike: number;
  side: DeltaOptionSide;

  spot: number | null;
  mark: number | null;

  bid: number | null;
  ask: number | null;
  bidSize: number | null;
  askSize: number | null;

  askIv: number | null;
  bidIv: number | null;
  markIv: number | null;

  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  rho: number | null;

  openInterest: number | null;
  volume: number | null;

  exchangeTs: number | null;
  receivedAt: number;

  status: DeltaConnectionStatus;
};

export type OptionChainRow = {
  strike: number;
  call: DeltaOptionLeg | null;
  put: DeltaOptionLeg | null;
};

export type DeltaOptionChainSnapshot = {
  source: "DELTA_EXCHANGE";
  broker: "DELTA";
  underlying: string;
  expiry: string;

  spot: number | null;
  atmStrike: number | null;

  contracts: number;
  rows: OptionChainRow[];

  status: DeltaConnectionStatus;

  exchangeTs: number | null;
  receivedAt: number;
};

