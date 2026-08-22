/**
 * TypeScript Interfaces for Institutional Security & Access Center
 */

export interface SecurityUser {
  id: string;
  username: string;
  email: string;
  role: "VIEWER" | "TRADER" | "RISK_MANAGER" | "OPERATOR" | "ADMIN";
  is_2fa_enabled: boolean;
  passkeys_count: number;
  recovery_codes_remaining: number;
}

export interface SecuritySession {
  session_id: string;
  user_id?: string;
  device_name: string;
  ip_address: string;
  approximate_location: string;
  last_active_at: string;
  expires_at: string;
  is_current?: boolean;
  created_at?: string;
}

export interface SecurityPasskey {
  credential_id: string;
  name: string;
  added_at: string;
  last_used_at: string;
  sign_count: number;
}

export interface BrokerCredential {
  credential_id: string;
  provider_id: string;
  account_name: string;
  key_prefix: string;
  allow_read: boolean;
  allow_trade: boolean;
  allow_withdraw: boolean;
  ip_restrictions: string[];
  status: "CONNECTED" | "DISCONNECTED" | "WARNING";
  last_validated_at: string | null;
  created_at: string;
  rotated_at: string | null;
}

export interface SecurityAuditEvent {
  event_id: string;
  timestamp_utc: string;
  actor_user_id: string;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  result: "SUCCESS" | "DENIED" | "CHALLENGED" | "FAILED";
  assurance_level: string;
  ip_address: string;
  user_agent: string;
  details_json: string;
  request_id: string;
}

export interface SecurityAlert {
  alert_id: string;
  timestamp_utc: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  category: string;
  title: string;
  description: string;
  status: "ACTIVE" | "RESOLVED";
}

export interface SecurityTelemetry {
  security_status: "PROTECTED" | "DEGRADED" | "CRITICAL";
  passkey_enabled: boolean;
  two_factor_enabled: boolean;
  trading_protection: "ACTIVE" | "LOCKED" | "DISABLED";
  withdrawal_permission: "DISABLED" | "ENABLED";
  active_sessions_count: number;
  security_alerts_count: number;
  security_score: number;
  max_score: number;
}

export interface SecurityCheckupItem {
  id: string;
  label: string;
  status: "PASS" | "WARNING" | "CRITICAL" | "OPTIONAL";
  score: number;
}

export interface SecurityOverviewResponse {
  status: string;
  telemetry: SecurityTelemetry;
  checkup: SecurityCheckupItem[];
  credentials_count: number;
}

export interface BackupSnapshot {
  backup_id: string;
  timestamp_utc: string;
  file_name: string;
  file_size_bytes: number;
  raw_size_bytes: number;
  raw_sha256: string;
  encrypted: boolean;
  encryption_algorithm: string;
  verified: boolean;
  last_verified_at?: string;
  tables_count?: number;
}
