/**
 * Quant.OS Central Contract & Expiry Resolver (Frontend Client)
 * =============================================================
 * Authoritative dynamic contract resolution service communicating with backend
 * CentralContractResolver to prevent stale / hard-coded derivative contracts.
 */

export interface ResolvedContract {
  instrumentKey: string;
  tradingSymbol: string;
  underlying: string;
  expiry: string;
  instrumentType: string;
  exchange: string;
  lotSize: number;
  tickSize: number;
  freezeQuantity: number;
  status: "ACTIVE" | "NEAR_EXPIRY" | "EXPIRED" | "INVALID" | "DISCOVERED" | "VALID" | "SELECTED";
  strike?: number;
  optionType?: "CE" | "PE";
  daysToExpiry?: number;
  dte?: number;
}

export interface ExpiryValidationResponse {
  valid: boolean;
  status: string;
  expiry: string;
  currentDate: string;
  daysToExpiry: number;
  isBlocked: boolean;
  expiryDate?: string;
  expiryTime?: string;
  expiryTimezone?: string;
  expiryTimestamp?: string;
  secondsToExpiry?: number;
  dte?: number;
  settlementMethod?: string;
  blockingReason?: string;
  recommendedAction?: string;
  suggestedExpiries?: string[];
}

export type ExpiryPreference =
  | "AUTO"
  | "CURRENT_WEEK"
  | "NEXT_WEEK"
  | "CURRENT_MONTH"
  | "NEXT_MONTH"
  | "FAR_WEEK"
  | "FAR_MONTH"
  | "NEAREST"
  | "NEXT"
  | "FAR"
  | "MANUAL";

export const EXPIRY_PREFERENCE_OPTIONS: { value: ExpiryPreference; label: string; desc: string }[] = [
  { value: "AUTO", label: "Auto (Nearest Valid)", desc: "Dynamically selects the nearest active unexpired contract" },
  { value: "CURRENT_WEEK", label: "Current Week", desc: "Current weekly expiration cycle" },
  { value: "NEXT_WEEK", label: "Next Week", desc: "Next weekly expiration cycle" },
  { value: "CURRENT_MONTH", label: "Current Month", desc: "Current monthly expiry contract" },
  { value: "NEXT_MONTH", label: "Next Month", desc: "Next monthly expiry contract" },
  { value: "FAR_MONTH", label: "Far Month", desc: "Far quarterly / monthly expiry contract" },
  { value: "MANUAL", label: "Manual Date Selection", desc: "Select a specific validated contract date from broker catalog" },
];

/**
 * Resolves active unexpired contract from CentralContractResolver API.
 */
export async function resolveContract(params: {
  broker?: string;
  exchange?: string;
  underlying?: string;
  instrumentType?: string;
  expiryPreference?: string;
  strike?: number;
  optionType?: string;
  mode?: string;
}): Promise<ResolvedContract | null> {
  const query = new URLSearchParams();
  if (params.broker) query.set("broker", params.broker);
  if (params.exchange) query.set("exchange", params.exchange);
  if (params.underlying) query.set("underlying", params.underlying);
  if (params.instrumentType) query.set("instrumentType", params.instrumentType);
  if (params.expiryPreference) query.set("expiryPreference", params.expiryPreference);
  if (params.strike) query.set("strike", String(params.strike));
  if (params.optionType) query.set("optionType", params.optionType);
  if (params.mode) query.set("mode", params.mode);

  try {
    const res = await fetch(`/api/contracts/resolve?${query.toString()}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status === "success" && json.data) {
      return {
        instrumentKey: json.data.instrument_key || json.data.instrumentKey,
        tradingSymbol: json.data.trading_symbol || json.data.tradingSymbol,
        underlying: json.data.underlying,
        expiry: json.data.expiry,
        instrumentType: json.data.instrument_type || json.data.instrumentType,
        exchange: json.data.exchange,
        lotSize: json.data.lot_size ?? json.data.lotSize ?? 1,
        tickSize: json.data.tick_size ?? json.data.tickSize ?? 0.05,
        freezeQuantity: json.data.freeze_quantity ?? json.data.freezeQuantity ?? 1800,
        status: json.data.status || "ACTIVE",
        strike: json.data.strike,
        optionType: json.data.option_type || json.data.optionType,
        daysToExpiry: json.data.days_to_expiry,
        dte: json.data.dte,
      };
    }
    return null;
  } catch (err) {
    console.error("Failed to resolve contract:", err);
    return null;
  }
}

/**
 * Retrieves valid unexpired contract expiry dates from broker catalog.
 */
export async function getAvailableExpiries(params: {
  broker?: string;
  exchange?: string;
  underlying?: string;
  mode?: string;
}): Promise<string[]> {
  const query = new URLSearchParams();
  if (params.broker) query.set("broker", params.broker);
  if (params.exchange) query.set("exchange", params.exchange);
  if (params.underlying) query.set("underlying", params.underlying);
  if (params.mode) query.set("mode", params.mode);

  try {
    const res = await fetch(`/api/contracts/expiries?${query.toString()}`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.expiries || [];
  } catch (err) {
    console.error("Failed to fetch available expiries:", err);
    return [];
  }
}

/**
 * Validates a contract key / expiry against strict expiration rules.
 */
export async function validateContractExpiry(params: {
  instrumentKey?: string;
  expiry?: string;
  underlying?: string;
  broker?: string;
  exchange?: string;
  instrumentType?: string;
  mode?: string;
}): Promise<ExpiryValidationResponse> {
  try {
    const res = await fetch("/api/contracts/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      return {
        valid: false,
        status: "VALIDATION_ERROR",
        expiry: params.expiry || "",
        currentDate: "",
        daysToExpiry: -999,
        isBlocked: true,
        blockingReason: `HTTP ${res.status} response from validation server`,
      };
    }
    const json = await res.json();
    const r = json.result || {};
    return {
      valid: r.is_valid ?? r.valid ?? false,
      status: r.status || "UNKNOWN",
      expiry: r.expiry || params.expiry || "",
      currentDate: r.current_date || "",
      daysToExpiry: r.days_to_expiry ?? -1,
      isBlocked: r.is_blocked ?? !r.is_valid,
      expiryDate: r.expiry_date,
      expiryTime: r.expiry_time,
      expiryTimezone: r.expiry_timezone,
      expiryTimestamp: r.expiry_timestamp,
      secondsToExpiry: r.seconds_to_expiry,
      dte: r.dte,
      settlementMethod: r.settlement_method,
      blockingReason: r.blocking_reason,
      recommendedAction: r.recommended_action,
      suggestedExpiries: r.suggested_expiries || [],
    };
  } catch (err: any) {
    return {
      valid: false,
      status: "NETWORK_ERROR",
      expiry: params.expiry || "",
      currentDate: "",
      daysToExpiry: -999,
      isBlocked: true,
      blockingReason: err?.message || "Failed to reach validation service",
    };
  }
}
