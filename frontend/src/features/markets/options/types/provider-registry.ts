/**
 * Options Provider Registry & Extensibility Catalog
 * Canonical metadata for multi-provider Options market data & execution gateways.
 */

export type OptionProviderId =
  | "ALL"
  | "DHAN"
  | "UPSTOX"
  | "DELTA_INDIA"
  | "BINANCE"
  | "OTHER";

export type OptionRegion = "ALL" | "INDIA" | "CRYPTO" | "US" | "GLOBAL" | "COMMODITY";

export interface OptionsProviderMetadata {
  provider_id: OptionProviderId;
  display_name: string;
  short_name: string;
  enabled: boolean;
  badge?: string;
  region: OptionRegion;
  asset_classes: string[];
  markets: string[];
  supports_option_chain: boolean;
  supports_streaming: boolean;
  supports_greeks: boolean;
  supports_iv: boolean;
  supports_oi: boolean;
  supports_depth: boolean;
  supports_orders: boolean;
  supports_multi_leg: boolean;
  supports_positions: boolean;
  supports_margin: boolean;
  route: string;
  supported_underlyings: string[];
  health_status: "LIVE" | "AUTH_REQUIRED" | "TOKEN_EXPIRED" | "NOT_CONFIGURED" | "NOT_SUPPORTED";
}

export const OPTIONS_PROVIDER_REGISTRY: OptionsProviderMetadata[] = [
  {
    provider_id: "ALL",
    display_name: "All Options (Consolidated)",
    short_name: "All Sources",
    enabled: true,
    region: "ALL",
    asset_classes: ["INDEX", "EQUITY", "CRYPTO", "COMMODITY"],
    markets: ["NSE", "BSE", "CRYPTO", "GLOBAL"],
    supports_option_chain: true,
    supports_streaming: true,
    supports_greeks: true,
    supports_iv: true,
    supports_oi: true,
    supports_depth: true,
    supports_orders: true,
    supports_multi_leg: true,
    supports_positions: true,
    supports_margin: true,
    route: "/options",
    supported_underlyings: ["NIFTY", "BANKNIFTY", "FINNIFTY", "SENSEX", "RELIANCE", "HDFCBANK", "BTC", "ETH", "SOL"],
    health_status: "LIVE",
  },
  {
    provider_id: "DHAN",
    display_name: "Dhan Options",
    short_name: "Dhan",
    enabled: true,
    badge: "NSE",
    region: "INDIA",
    asset_classes: ["INDEX", "EQUITY"],
    markets: ["NSE", "BSE", "MCX"],
    supports_option_chain: true,
    supports_streaming: true,
    supports_greeks: true,
    supports_iv: true,
    supports_oi: true,
    supports_depth: true,
    supports_orders: true,
    supports_multi_leg: true,
    supports_positions: true,
    supports_margin: true,
    route: "/options/dhan",
    supported_underlyings: ["NIFTY", "BANKNIFTY", "FINNIFTY", "SENSEX", "RELIANCE", "HDFCBANK", "INFY", "TCS", "ICICIBANK"],
    health_status: "LIVE",
  },
  {
    provider_id: "UPSTOX",
    display_name: "Upstox Options",
    short_name: "Upstox",
    enabled: true,
    badge: "NSE",
    region: "INDIA",
    asset_classes: ["INDEX", "EQUITY"],
    markets: ["NSE", "BSE", "MCX"],
    supports_option_chain: true,
    supports_streaming: true,
    supports_greeks: true,
    supports_iv: true,
    supports_oi: true,
    supports_depth: true,
    supports_orders: true,
    supports_multi_leg: true,
    supports_positions: true,
    supports_margin: true,
    route: "/options/upstox",
    supported_underlyings: ["NIFTY", "BANKNIFTY", "FINNIFTY", "SENSEX", "RELIANCE", "HDFCBANK", "INFY", "TCS", "TATAMOTORS"],
    health_status: "LIVE",
  },
  {
    provider_id: "DELTA_INDIA",
    display_name: "Delta Exchange India",
    short_name: "Delta Exchange",
    enabled: true,
    badge: "CRYPTO",
    region: "CRYPTO",
    asset_classes: ["CRYPTO"],
    markets: ["DELTA_INDIA"],
    supports_option_chain: true,
    supports_streaming: true,
    supports_greeks: true,
    supports_iv: true,
    supports_oi: true,
    supports_depth: true,
    supports_orders: true,
    supports_multi_leg: true,
    supports_positions: true,
    supports_margin: true,
    route: "/options/delta",
    supported_underlyings: ["BTC", "ETH", "SOL", "XAUT"],
    health_status: "LIVE",
  },
  {
    provider_id: "BINANCE",
    display_name: "Binance European Options (EAPI)",
    short_name: "Binance Options",
    enabled: true,
    badge: "CRYPTO",
    region: "CRYPTO",
    asset_classes: ["CRYPTO"],
    markets: ["BINANCE_EAPI"],
    supports_option_chain: true,
    supports_streaming: true,
    supports_greeks: true,
    supports_iv: true,
    supports_oi: true,
    supports_depth: true,
    supports_orders: true,
    supports_multi_leg: true,
    supports_positions: true,
    supports_margin: true,
    route: "/options/binance",
    supported_underlyings: ["BTC", "ETH"],
    health_status: "LIVE",
  },
  {
    provider_id: "OTHER",
    display_name: "Other Providers & Connectors",
    short_name: "Other Providers",
    enabled: true,
    badge: "MORE",
    region: "GLOBAL",
    asset_classes: ["US_EQUITY", "GLOBAL_INDEX", "COMMODITY"],
    markets: ["CBOE", "CME", "EUREX", "IBKR"],
    supports_option_chain: true,
    supports_streaming: true,
    supports_greeks: true,
    supports_iv: true,
    supports_oi: true,
    supports_depth: true,
    supports_orders: false,
    supports_multi_leg: false,
    supports_positions: false,
    supports_margin: false,
    route: "/options/providers",
    supported_underlyings: ["SPX", "NDX", "AAPL", "NVDA", "TSLA"],
    health_status: "NOT_CONFIGURED",
  },
];

export interface SecondaryOptionsProvider {
  id: string;
  name: string;
  category: "Indian Broker" | "Global / US" | "Crypto Derivatives" | "Market Data Gateway";
  badge: string;
  description: string;
  supportedMarkets: string[];
  supportedUnderlyings: string[];
  capabilities: {
    optionChain: boolean;
    streaming: boolean;
    greeks: boolean;
    multiLeg: boolean;
    liveExecution: boolean;
  };
  authType: "OAuth 2.0" | "API Key + Secret" | "TOTP / Session Token" | "Gateway Socket";
  status: "Ready for Activation" | "Requires License" | "Community Adapter" | "In Development";
}

export const SECONDARY_OPTIONS_PROVIDERS_CATALOG: SecondaryOptionsProvider[] = [
  {
    id: "ibkr",
    name: "Interactive Brokers (TWS / Web API)",
    category: "Global / US",
    badge: "US / GLOBAL",
    description: "CBOE, CME, Eurex, and global multi-asset options chains with Black-Scholes Greeks and portfolio margin.",
    supportedMarkets: ["US Equities", "US Indices (SPX, NDX, RUT)", "Eurex", "HKEX"],
    supportedUnderlyings: ["SPX", "NDX", "AAPL", "NVDA", "TSLA", "MSFT", "AMZN"],
    capabilities: {
      optionChain: true,
      streaming: true,
      greeks: true,
      multiLeg: true,
      liveExecution: true,
    },
    authType: "OAuth 2.0",
    status: "Ready for Activation",
  },
  {
    id: "fyers",
    name: "Fyers API v3",
    category: "Indian Broker",
    badge: "NSE",
    description: "NSE FO option chain streaming, open interest buildup feeds, and webhook order placement.",
    supportedMarkets: ["NSE FO", "BSE FO", "MCX FO"],
    supportedUnderlyings: ["NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "RELIANCE"],
    capabilities: {
      optionChain: true,
      streaming: true,
      greeks: true,
      multiLeg: true,
      liveExecution: true,
    },
    authType: "OAuth 2.0",
    status: "Ready for Activation",
  },
  {
    id: "angel_one",
    name: "Angel One SmartAPI",
    category: "Indian Broker",
    badge: "NSE",
    description: "WebSocket streaming for NIFTY/BANKNIFTY option chains with fast binary feeds and bracket orders.",
    supportedMarkets: ["NSE Equity/FO", "BSE FO", "MCX"],
    supportedUnderlyings: ["NIFTY", "BANKNIFTY", "SENSEX", "HDFCBANK"],
    capabilities: {
      optionChain: true,
      streaming: true,
      greeks: true,
      multiLeg: true,
      liveExecution: true,
    },
    authType: "TOTP / Session Token",
    status: "Ready for Activation",
  },
  {
    id: "deribit",
    name: "Deribit Institutional",
    category: "Crypto Derivatives",
    badge: "CRYPTO",
    description: "World's largest BTC & ETH options exchange with high-frequency WebSocket and portfolio margin.",
    supportedMarkets: ["Crypto Derivatives", "BTC/ETH/SOL Options"],
    supportedUnderlyings: ["BTC", "ETH", "SOL", "MATIC", "XRP"],
    capabilities: {
      optionChain: true,
      streaming: true,
      greeks: true,
      multiLeg: true,
      liveExecution: true,
    },
    authType: "API Key + Secret",
    status: "Ready for Activation",
  },
  {
    id: "bybit",
    name: "Bybit Options (USDC Settled)",
    category: "Crypto Derivatives",
    badge: "CRYPTO",
    description: "European USDC-settled BTC & ETH cash settled options with institutional Greeks.",
    supportedMarkets: ["Crypto Derivatives"],
    supportedUnderlyings: ["BTC", "ETH", "SOL"],
    capabilities: {
      optionChain: true,
      streaming: true,
      greeks: true,
      multiLeg: true,
      liveExecution: true,
    },
    authType: "API Key + Secret",
    status: "Ready for Activation",
  },
  {
    id: "coinbase",
    name: "Coinbase Derivatives",
    category: "Global / US",
    badge: "CFTC",
    description: "CFTC-regulated nano and standard crypto options for institutional participants.",
    supportedMarkets: ["CFTC Regulated Derivatives"],
    supportedUnderlyings: ["BTC", "ETH"],
    capabilities: {
      optionChain: true,
      streaming: true,
      greeks: true,
      multiLeg: false,
      liveExecution: false,
    },
    authType: "API Key + Secret",
    status: "In Development",
  },
];
