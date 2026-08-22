export type ErrorSeverity = "INFO" | "WARNING" | "ERROR" | "CRITICAL";

export type IncidentStatus = "NEW" | "ACTIVE" | "ACKNOWLEDGED" | "RECOVERING" | "RESOLVED" | "ARCHIVED";

export type ErrorCategory =
  | "INSTRUMENT_RESOLUTION"
  | "PROVIDER_CONNECTIVITY"
  | "PROVIDER_RATE_LIMIT"
  | "PROVIDER_AUTH"
  | "MARKET_DATA"
  | "ORDER_EXECUTION"
  | "RISK_ENGINE"
  | "DATABASE"
  | "WORKER"
  | "STRATEGY"
  | "CONFIGURATION"
  | "NETWORK"
  | "INTERNAL";

export interface SystemIncident {
  id: number;
  fingerprint?: string;
  error_code?: string;
  category?: ErrorCategory | string;
  severity?: ErrorSeverity | string;
  status?: IncidentStatus | string;
  error_message: string;
  provider?: string;
  operation?: string;
  bot_id?: string;
  instrument_id?: string;
  occurrence_count?: number;
  first_seen?: string;
  last_seen?: string;
  timestamp?: string;
  http_status?: number | null;
  is_retryable?: number | boolean;
  retry_state?: string;
  root_cause?: string;
  plain_explanation?: string;
  recommended_action?: string;
  stack_trace?: string;
  resolved_at?: string | null;
  archived_at?: string | null;
}

export interface ReliabilitySummary {
  active_incidents: number;
  critical_incidents: number;
  resolved_incidents: number;
  affected_bots: number;
  system_health: "HEALTHY" | "WARNING" | "DEGRADED" | "UNKNOWN";
}

export interface ProviderHealth {
  provider_id: string;
  name: string;
  status: "HEALTHY" | "DEGRADED" | "RATE_LIMITED" | "CIRCUIT_OPEN" | "OFFLINE" | "NOT_CONFIGURED";
  circuit_state: "CLOSED" | "OPEN" | "HALF_OPEN";
  request_count: number;
  error_count: number;
  p95_latency_ms: number;
  last_success: string;
  is_rate_limited: boolean;
}
