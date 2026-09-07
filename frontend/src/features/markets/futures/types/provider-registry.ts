/**
 * Futures Provider Registry
 * =========================
 * Central, extensible provider registry defining capabilities, supported asset classes,
 * markets, health status, and dedicated routing for all Futures providers in Quant.OS.
 */

export interface FuturesProviderDefinition {
  provider_id: string;
  display_name: string;
  short_name: string;
  enabled: boolean;
  is_connected: boolean;
  capabilities: ("PERPETUAL" | "DELIVERY" | "FUNDING" | "ORDERBOOK" | "EXECUTION" | "BASIS" | "GREEKS")[];
  asset_classes: ("CRYPTO" | "INDIAN_EQUITIES" | "INDIAN_INDICES" | "COMMODITIES" | "GLOBAL_INDICES" | "FOREX")[];
  markets: string[];
  route: string;
  badge: string;
  badgeColor?: string;
  description: string;
  supported_exchanges: string[];
  canonical_prefix: string;
  auth_config_key?: string;
}

export const FUTURES_PROVIDER_REGISTRY: FuturesProviderDefinition[] = [
  {
    provider_id: "BINANCE",
    display_name: "Binance Futures",
    short_name: "Binance",
    enabled: true,
    is_connected: true,
    capabilities: ["PERPETUAL", "DELIVERY", "FUNDING", "ORDERBOOK", "EXECUTION", "BASIS"],
    asset_classes: ["CRYPTO"],
    markets: ["USD-M Perpetual", "USD-M Delivery", "COIN-M Perpetual", "COIN-M Delivery"],
    route: "/futures/binance",
    badge: "CRYPTO",
    badgeColor: "amber",
    description: "World's largest cryptocurrency futures exchange with USD-M and COIN-M linear and inverse contracts.",
    supported_exchanges: ["BINANCE", "BINANCE_USDM", "BINANCE_COINM"],
    canonical_prefix: "BINANCE",
    auth_config_key: "BINANCE_API_KEY",
  },
  {
    provider_id: "DELTA_INDIA",
    display_name: "Delta Exchange India",
    short_name: "Delta Exchange",
    enabled: true,
    is_connected: true,
    capabilities: ["PERPETUAL", "DELIVERY", "FUNDING", "ORDERBOOK", "EXECUTION", "BASIS", "GREEKS"],
    asset_classes: ["CRYPTO"],
    markets: ["INR Margined Futures", "Crypto Margined Perpetuals"],
    route: "/futures/delta",
    badge: "INDIA",
    badgeColor: "cyan",
    description: "FIU-compliant cryptocurrency derivatives exchange in India with direct INR settlement and high leverage.",
    supported_exchanges: ["DELTA", "DELTA_EXCHANGE"],
    canonical_prefix: "DELTA",
    auth_config_key: "DELTA_API_KEY",
  },
  {
    provider_id: "DHAN",
    display_name: "Dhan HQ",
    short_name: "Dhan",
    enabled: true,
    is_connected: true,
    capabilities: ["DELIVERY", "ORDERBOOK", "EXECUTION", "BASIS"],
    asset_classes: ["INDIAN_INDICES", "INDIAN_EQUITIES", "COMMODITIES"],
    markets: ["NSE Index Futures", "NSE Stock Futures", "MCX Commodity Futures"],
    route: "/futures/dhan",
    badge: "NSE",
    badgeColor: "emerald",
    description: "Fast Indian financial exchange API supporting low-latency index, stock, and commodity derivatives.",
    supported_exchanges: ["NSE", "MCX", "BSE"],
    canonical_prefix: "DHAN",
    auth_config_key: "DHAN_ACCESS_TOKEN",
  },
  {
    provider_id: "UPSTOX",
    display_name: "Upstox Pro",
    short_name: "Upstox",
    enabled: true,
    is_connected: true,
    capabilities: ["DELIVERY", "ORDERBOOK", "EXECUTION", "BASIS"],
    asset_classes: ["INDIAN_INDICES", "INDIAN_EQUITIES", "COMMODITIES"],
    markets: ["NSE Index Futures", "NSE Stock Futures", "BSE Futures", "MCX Commodities"],
    route: "/futures/upstox",
    badge: "NSE",
    badgeColor: "purple",
    description: "Major Indian institutional and retail broker with WebSocket V2 streaming market data.",
    supported_exchanges: ["NSE", "BSE", "MCX"],
    canonical_prefix: "UPSTOX",
    auth_config_key: "UPSTOX_ACCESS_TOKEN",
  },
  {
    provider_id: "CME",
    display_name: "CME / Global Futures",
    short_name: "CME / Global",
    enabled: true,
    is_connected: true,
    capabilities: ["DELIVERY", "ORDERBOOK", "BASIS"],
    asset_classes: ["GLOBAL_INDICES", "COMMODITIES", "FOREX"],
    markets: ["E-mini S&P 500", "Micro Bitcoin", "Crude Oil", "Gold", "EUR/USD Futures"],
    route: "/futures/global",
    badge: "GLOBAL",
    badgeColor: "blue",
    description: "Chicago Mercantile Exchange and global institutional derivatives with authoritative settlement pricing.",
    supported_exchanges: ["CME", "CBOT", "NYMEX", "COMEX"],
    canonical_prefix: "CME",
    auth_config_key: "DATABENTO_API_KEY",
  },
  {
    provider_id: "OTHER",
    display_name: "Other Providers & Connectors",
    short_name: "Other Providers",
    enabled: true,
    is_connected: false,
    capabilities: ["PERPETUAL", "DELIVERY", "ORDERBOOK"],
    asset_classes: ["CRYPTO", "GLOBAL_INDICES", "FOREX", "INDIAN_EQUITIES"],
    markets: ["Interactive Brokers", "Fyers", "Angel One", "Coinbase", "Bybit", "OKX"],
    route: "/futures/other",
    badge: "MORE",
    badgeColor: "slate",
    description: "Catalog of secondary and custom licensed market data adapters ready for plug-and-play connection.",
    supported_exchanges: ["IBKR", "FYERS", "ANGELONE", "BYBIT", "OKX", "COINBASE"],
    canonical_prefix: "OTHER",
  },
];

/**
 * Secondary/Extended Providers Catalog (for Other Providers workspace)
 */
export interface SecondaryProviderCatalogItem {
  id: string;
  name: string;
  category: "CRYPTO" | "INDIAN_BROKER" | "GLOBAL_BROKER";
  status: "READY_TO_CONNECT" | "CONFIGURED" | "ENTERPRISE_ONLY" | "BETA";
  supported_assets: string[];
  docs_url?: string;
}

export const SECONDARY_PROVIDERS_CATALOG: SecondaryProviderCatalogItem[] = [
  {
    id: "interactive_brokers",
    name: "Interactive Brokers (TWS / Client Portal)",
    category: "GLOBAL_BROKER",
    status: "READY_TO_CONNECT",
    supported_assets: ["Global Index Futures", "Commodities", "Forex Futures"],
  },
  {
    id: "fyers",
    name: "Fyers API V3",
    category: "INDIAN_BROKER",
    status: "READY_TO_CONNECT",
    supported_assets: ["NSE Futures", "BSE Futures", "MCX Commodities"],
  },
  {
    id: "angelone",
    name: "Angel One SmartAPI",
    category: "INDIAN_BROKER",
    status: "READY_TO_CONNECT",
    supported_assets: ["NSE Futures", "NFO Derivatives", "MCX"],
  },
  {
    id: "bybit",
    name: "Bybit V5 Unified Trading",
    category: "CRYPTO",
    status: "READY_TO_CONNECT",
    supported_assets: ["USDT Perpetuals", "USDC Perpetuals", "Inverse Futures"],
  },
  {
    id: "okx",
    name: "OKX V5 Derivatives",
    category: "CRYPTO",
    status: "READY_TO_CONNECT",
    supported_assets: ["Crypto Perpetuals", "Expiry Futures", "Margin Contracts"],
  },
  {
    id: "coinbase",
    name: "Coinbase Derivatives (CFTC)",
    category: "CRYPTO",
    status: "READY_TO_CONNECT",
    supported_assets: ["Nano Bitcoin Futures", "Nano Ether", "Oil & Gold Futures"],
  },
];
