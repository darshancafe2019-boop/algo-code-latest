export type ProviderCategory = "INDIAN_BROKERS" | "CRYPTO" | "GLOBAL_FOREX";

export type ConnectionState =
  | "CONNECTED"
  | "CONNECTING"
  | "RECONNECTING"
  | "DISCONNECTED"
  | "STALE"
  | "ERROR"
  | "NOT_CONFIGURED"
  | "AUTH_EXPIRED"
  | "RATE_LIMITED"
  | "LIVE";

export interface ProviderCapabilities {
  marketData: boolean;
  orderExecution: boolean;
  optionChain: boolean;
  futures: boolean;
  crypto: boolean;
  forex: boolean;
  equity: boolean;
  websocket: boolean;
  rest: boolean;
  historicalData: boolean;
  portfolio: boolean;
  orders: boolean;
  spot?: boolean;
}

export interface ProviderHealth {
  state: ConnectionState;
  pingMs: number;
  lastTickMsAgo: number | null;
  lastTickIso: string | null;
  subscriptionsCount: number;
  maxSubscriptions: number;
  apiHealthy: boolean;
  authValid: boolean;
  websocketConnected: boolean;
  lastError: string | null;
  authenticatedAt: string | null;
}

export interface ProviderDefinition {
  id: string;
  name: string;
  category: ProviderCategory;
  logo: string;
  markets: string[];
  assetClasses: string[];
  capabilities: ProviderCapabilities;
  authenticationType: string;
  description: string;
  isSimulatedOnly?: boolean;
}

export interface ProviderStatusItem extends ProviderDefinition {
  enabled: boolean;
  configured: boolean;
  primary: boolean;
  secondary: boolean;
  marketDataEnabled: boolean;
  executionEnabled: boolean;
  connectionState: ConnectionState;
  health: ProviderHealth;
  maskedCredentials?: {
    clientId?: string;
    apiKey?: string;
    apiSecret?: string;
    hasAccessToken?: boolean;
  };
}

export interface ActiveProviderRoles {
  marketDataProvider: string;
  executionBroker: string;
  optionsProvider: string;
  historicalDataProvider: string;
  secondaryFailoverProvider: string;
}

export interface ProviderCatalogResponse {
  status: string;
  total_count: number;
  connected_count: number;
  active_roles: ActiveProviderRoles;
  categories: ProviderCategory[];
  providers: ProviderStatusItem[];
  timestamp: string;
}
