import { BotConfig, BotSnapshot, BotValidationResult } from "@/types/bot";
import { CanonicalOrder, OrderSide } from "@/types/order";
import { CanonicalTrade } from "@/types/trade";
import { CanonicalPosition } from "@/types/position";

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

const API_BASE_URL = typeof window !== "undefined" ? "/api" : (process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:5050/api");

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const cleanEndpoint = endpoint.startsWith("/api") ? endpoint.replace(/^\/api/, "") : endpoint;
  const url = `${API_BASE_URL}${cleanEndpoint.startsWith("/") ? "" : "/"}${cleanEndpoint}`;

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options?.headers,
    },
    ...options,
  });

  const body = await res.json().catch(() => ({}));
  if (body.success === false && body.error) {
    throw new Error(body.error?.message || "API request failed");
  }
  // Accommodate dual schema responses (body.data or body.bots or body)
  return (body.data !== undefined ? body.data : (body.bots !== undefined ? body.bots : body)) as T;
}

export const api = {
  getHealth: () => request<any>("/health"),

  // Bots Fleet
  getBots: () => request<BotConfig[]>("/bots"),
  getBot: (botId: string) => request<BotSnapshot>(`/bots/${botId}`),
  createBot: (data: Partial<BotConfig>) =>
    request<BotConfig>("/bots", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  validateBot: (botId: string) =>
    request<BotValidationResult>(`/bots/${botId}/validate`, {
      method: "POST",
    }),
  startBot: (botId: string) =>
    request<BotConfig>(`/bots/${botId}/start`, { method: "POST" }),
  pauseBot: (botId: string) =>
    request<BotConfig>(`/bots/${botId}/pause`, { method: "POST" }),
  resumeBot: (botId: string) =>
    request<BotConfig>(`/bots/${botId}/resume`, { method: "POST" }),
  stopBot: (botId: string) =>
    request<BotConfig>(`/bots/${botId}/stop`, { method: "POST" }),
  restartBot: (botId: string) =>
    request<BotConfig>(`/bots/${botId}/restart`, { method: "POST" }),
  deleteBot: (botId: string) =>
    request<{ bot_id: string; deleted: boolean }>(`/bots/${botId}`, {
      method: "DELETE",
    }),

  // Bot Orders & Executions
  getBotOrders: (botId: string) =>
    request<CanonicalOrder[]>(`/bots/${botId}/orders`),
  getBotTrades: (botId: string) =>
    request<CanonicalTrade[]>(`/bots/${botId}/trades`),
  getBotPositions: (botId: string) =>
    request<CanonicalPosition[]>(`/bots/${botId}/positions`),
  getBotEvents: (botId: string) => request<any[]>(`/bots/${botId}/events`),
  placeBotOrder: (
    botId: string,
    side: OrderSide,
    quantity?: number,
    price?: number
  ) =>
    request<CanonicalOrder>(`/bots/${botId}/orders`, {
      method: "POST",
      body: JSON.stringify({ side, quantity, price, order_type: "MARKET" }),
    }),

  // Global Orders & Positions
  getAllOrders: (params?: {
    bot_id?: string;
    provider?: string;
    symbol?: string;
    status?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.bot_id) query.set("bot_id", params.bot_id);
    if (params?.provider) query.set("provider", params.provider);
    if (params?.symbol) query.set("symbol", params.symbol);
    if (params?.status) query.set("status", params.status);
    return request<CanonicalOrder[]>(`/orders?${query.toString()}`);
  },

  getAllPositions: () => request<CanonicalPosition[]>("/positions"),

  // Market Data Endpoints
  getMarketTypes: () => request<any[]>("/market/markets"),
  getInstruments: (marketType: string, underlying?: string, search?: string) => {
    const q = new URLSearchParams({ market_type: marketType });
    if (underlying) q.set("underlying", underlying);
    if (search) q.set("search", search);
    return request<any[]>(`/market/instruments?${q.toString()}`);
  },
  getLiveQuote: (symbol: string = "BTCUSD", provider?: string, marketType?: string) => {
    const q = new URLSearchParams({ symbol });
    if (provider) q.set("provider", provider);
    if (marketType) q.set("market_type", marketType);
    return request<any>(`/market/quote?${q.toString()}`);
  },
  getLiveOptionChain: (marketType: string, underlying: string, expiry?: string) => {
    const q = new URLSearchParams({ market_type: marketType, underlying });
    if (expiry) q.set("expiry", expiry);
    return request<any>(`/market/option-chain?${q.toString()}`);
  },
  getExpiries: (marketType: string, underlying: string) => {
    const q = new URLSearchParams({ market_type: marketType, underlying });
    return request<string[]>(`/market/expiries?${q.toString()}`);
  },
  getBrokerFunds: (provider: string) =>
    request<any>(`/market/funds?provider=${provider}`),

  // Strategy & Indicator Registries
  getOptionStrategies: () => request<any[]>("/strategies/options"),
  getTradingStrategies: () => request<any[]>("/strategies/trading"),
  getIndicatorRegistry: () => request<any[]>("/strategies/indicators"),
  calculateOptionPayoff: (payload: any) =>
    request<any>("/strategies/payoff", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Wizard Validation & Deployment
  validateWizardBot: (draft: any) =>
    request<any>("/wizard/validate", {
      method: "POST",
      body: JSON.stringify(draft),
    }),
  deployWizardBot: (draft: any) =>
    request<any>("/wizard/deploy", {
      method: "POST",
      body: JSON.stringify(draft),
    }),

  // Providers & System
  getProviders: () => request<any[]>("/providers"),
  getProviderHealth: (provider: string) =>
    request<any>(`/providers/${provider}/health`),

  triggerKillSwitch: (scope = "GLOBAL", botId?: string, reason?: string) =>
    request<any>("/system/kill-switch", {
      method: "POST",
      body: JSON.stringify({
        scope,
        bot_id: botId,
        reason: reason || "Kill switch triggered from frontend",
      }),
    }),

  resetKillSwitch: (scope = "GLOBAL", botId?: string) =>
    request<any>("/system/kill-switch/reset", {
      method: "POST",
      body: JSON.stringify({ scope, bot_id: botId }),
    }),
};
