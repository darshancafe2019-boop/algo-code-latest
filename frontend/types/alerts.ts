export type IncidentSeverity = "ALL" | "CRITICAL" | "ERROR" | "WARNING" | "NOTICE" | "INFO";
export type AlertSeverity = IncidentSeverity; // Backward compatibility

export type IncidentStatus = 
  | "ALL"
  | "ACTIVE"
  | "NEW" 
  | "ACKNOWLEDGED" 
  | "INVESTIGATING" 
  | "RESOLVED" 
  | "ARCHIVED" 
  | "SUPPRESSED";

export type IncidentCategory = 
  | "ALL"
  | "TRADING" 
  | "RISK" 
  | "BOT" 
  | "WORKER" 
  | "ORDER" 
  | "POSITION" 
  | "BROKER" 
  | "MARKET_DATA" 
  | "DATABASE" 
  | "SYSTEM" 
  | "TELEGRAM" 
  | "SECURITY"
  | "TEST";

export interface IncidentItem {
  incident_id: string;
  fingerprint: string;
  title: string;
  summary: string;
  severity: "CRITICAL" | "ERROR" | "WARNING" | "NOTICE" | "INFO";
  status: "NEW" | "ACKNOWLEDGED" | "INVESTIGATING" | "RESOLVED" | "ARCHIVED" | "SUPPRESSED";
  category: string;
  source: string;
  bot_id?: string;
  worker_id?: string;
  strategy_id?: string;
  order_id?: string;
  position_id?: string;
  account_id?: string;
  symbol?: string;
  error_code?: string;
  root_cause?: string;
  recommended_action?: string;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  acknowledged_at?: string | null;
  acknowledged_by?: string;
  resolved_at?: string | null;
  resolved_by?: string;
  resolution_note?: string;
  archived_at?: string | null;
  archived_by?: string;
  occurrence_count: number;
  impact_score: number;
  is_test: number;
  metadata_json?: string;
  active_duration_str?: string;
  active_duration_sec?: number;
}

export interface AlertChildItem {
  alert_id: string;
  incident_id: string;
  event_id?: string;
  correlation_id?: string;
  fingerprint: string;
  severity: string;
  status: string;
  category: string;
  source: string;
  title: string;
  message: string;
  technical_details?: string;
  entity_type?: string;
  entity_id?: string;
  bot_id?: string;
  symbol?: string;
  order_id?: string;
  position_id?: string;
  timestamp_utc: string;
  is_test: number;
  notification_status?: string;
  created_at: string;
}

export interface IncidentComment {
  comment_id: string;
  incident_id: string;
  author: string;
  comment_text: string;
  created_at: string;
}

export interface NotificationDeliveryItem {
  delivery_id: string;
  incident_id: string;
  alert_id?: string;
  channel: string;
  recipient?: string;
  status: "PENDING" | "SENT" | "FAILED" | "SUPPRESSED";
  attempts: number;
  max_attempts: number;
  error_message?: string;
  sent_at?: string;
  created_at: string;
}

export interface IncidentDetailData extends IncidentItem {
  alerts: AlertChildItem[];
  comments: IncidentComment[];
  deliveries: NotificationDeliveryItem[];
}

export interface AlertRuleItem {
  rule_id: string;
  name: string;
  category: string;
  severity: string;
  condition_type: string;
  threshold_value: number;
  duration_sec: number;
  cooldown_sec: number;
  auto_resolve: number;
  telegram_notify: number;
  is_enabled: number;
  is_system_required: number;
  version: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface IncidentMetricsSummary {
  total_incidents: number;
  active_incidents: number;
  critical: number;
  error: number;
  warning: number;
  unacknowledged: number;
  affected_bots_count: number;
  affected_bots: string[];
  resolved_today: number;
  last_updated: string;
}

export interface IncidentsListResponse {
  status: "success" | "error";
  incidents: IncidentItem[];
  total_count: number;
  limit: number;
  offset: number;
  message?: string;
}

export interface IncidentDetailResponse {
  status: "success" | "error";
  incident?: IncidentDetailData;
  message?: string;
}

export interface IncidentSummaryResponse {
  status: "success" | "error";
  metrics: IncidentMetricsSummary;
}

export interface AlertRulesResponse {
  status: "success" | "error";
  rules: AlertRuleItem[];
}

export interface TestAlertResponse {
  status: "success" | "error";
  message: string;
  result?: any;
  telegram_response?: any;
}

// Backward Compatibility Types
export interface AlertItem {
  id: string | number;
  incident_id?: string;
  category: string;
  level: "INFO" | "NOTICE" | "WARNING" | "ERROR" | "CRITICAL" | string;
  title?: string;
  message: string;
  timestamp: string;
  is_read: number;
  icon?: string;
  bot_id?: string;
  symbol?: string;
  occurrence_count?: number;
  status?: string;
}

export interface AlertsResponse {
  status: "success" | "error";
  notifications: AlertItem[];
  incidents?: IncidentItem[];
  message?: string;
}
