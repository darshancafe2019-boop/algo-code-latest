/**
 * Centralized OpenAI Configuration, Circuit Breaker & Rate Limiter
 * ================================================================
 * Configures models, token budgets, rate limits, and fallback resilience.
 * STRICT SECURITY INVARIANT: OPENAI_API_KEY is loaded server-side only.
 */

export interface OpenAiConfig {
  apiKey: string;
  model: string;
  fallbackModel: string;
  timeoutMs: number;
  maxTokens: number;
  temperature: number;
  isConfigured: boolean;
  isEnabled: boolean;
  maxPerMinute: number;
  dailyBudgetTokens: number;
}

export interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
  consecutiveSuccesses: number;
}

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_TIMEOUT_MS = 60000; // 1 minute

const circuitBreaker: CircuitBreakerState = {
  failures: 0,
  lastFailureTime: 0,
  state: "CLOSED",
  consecutiveSuccesses: 0,
};

// Rate limiter tracking
let minuteRequests = 0;
let minuteWindowStart = Date.now();

export function getOpenAiConfig(): OpenAiConfig {
  const apiKey = process.env.OPENAI_API_KEY || "";
  const model =
    process.env.OPENAI_MARKET_ANALYSIS_MODEL ||
    process.env.OPENAI_MODEL ||
    "gpt-4o";
  const fallbackModel = "gpt-4o-mini";
  const timeoutMs = parseInt(process.env.OPENAI_TIMEOUT_MS || "15000", 10);
  const maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS || "2500", 10);
  const temperature = parseFloat(process.env.OPENAI_TEMPERATURE || "0.2");
  const isEnabled = process.env.OPENAI_ANALYSIS_ENABLED !== "false";
  const maxPerMinute = parseInt(process.env.OPENAI_MAX_ANALYSIS_PER_MINUTE || "100", 10);
  const dailyBudgetTokens = parseInt(process.env.OPENAI_DAILY_BUDGET || "1000000", 10);

  return {
    apiKey: apiKey.trim(),
    model: model.trim(),
    fallbackModel,
    timeoutMs,
    maxTokens,
    temperature,
    isConfigured: Boolean(apiKey && apiKey.trim().length > 10),
    isEnabled,
    maxPerMinute,
    dailyBudgetTokens,
  };
}

export function checkRateLimit(): { allowed: boolean; current: number; max: number } {
  const now = Date.now();
  if (now - minuteWindowStart > 60000) {
    minuteRequests = 0;
    minuteWindowStart = now;
  }

  const config = getOpenAiConfig();
  if (minuteRequests >= config.maxPerMinute) {
    return { allowed: false, current: minuteRequests, max: config.maxPerMinute };
  }

  minuteRequests += 1;
  return { allowed: true, current: minuteRequests, max: config.maxPerMinute };
}

export function isCircuitBreakerOpen(): boolean {
  const now = Date.now();
  if (circuitBreaker.state === "OPEN") {
    if (now - circuitBreaker.lastFailureTime > CIRCUIT_BREAKER_RESET_TIMEOUT_MS) {
      circuitBreaker.state = "HALF_OPEN";
      return false;
    }
    return true;
  }
  return false;
}

export function recordCircuitSuccess(): void {
  if (circuitBreaker.state === "HALF_OPEN") {
    circuitBreaker.consecutiveSuccesses += 1;
    if (circuitBreaker.consecutiveSuccesses >= 2) {
      circuitBreaker.state = "CLOSED";
      circuitBreaker.failures = 0;
    }
  } else {
    circuitBreaker.failures = 0;
  }
}

export function recordCircuitFailure(): void {
  circuitBreaker.failures += 1;
  circuitBreaker.lastFailureTime = Date.now();
  circuitBreaker.consecutiveSuccesses = 0;

  if (circuitBreaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreaker.state = "OPEN";
  }
}

export function getCircuitBreakerStatus(): CircuitBreakerState {
  return { ...circuitBreaker };
}
