"""
Structured System Reliability & Error Ledger Engine.
Handles:
- Structured taxonomy and severity scoring.
- Error fingerprinting and automatic duplicate aggregation.
- Incident lifecycle (ACTIVE -> ACKNOWLEDGED -> RECOVERING -> RESOLVED -> ARCHIVED).
- Root-cause generation & plain-language operator explanations.
- Sensitive credential sanitization (API keys, secret tokens, auth headers).
"""

import enum
import hashlib
import json
import logging
import re
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("ErrorLedger")


class DataValidationError(ValueError):
    """Raised when critical trading/market parameters are None or invalid."""
    pass


class ErrorCategory(str, enum.Enum):
    INSTRUMENT_RESOLUTION = "INSTRUMENT_RESOLUTION"
    PROVIDER_CONNECTIVITY = "PROVIDER_CONNECTIVITY"
    PROVIDER_RATE_LIMIT = "PROVIDER_RATE_LIMIT"
    PROVIDER_AUTH = "PROVIDER_AUTH"
    MARKET_DATA = "MARKET_DATA"
    DATA_INTEGRITY = "DATA_INTEGRITY"
    ORDER_EXECUTION = "ORDER_EXECUTION"
    RISK_ENGINE = "RISK_ENGINE"
    DATABASE = "DATABASE"
    WORKER = "WORKER"
    STRATEGY = "STRATEGY"
    CONFIGURATION = "CONFIGURATION"
    NETWORK = "NETWORK"
    INTERNAL = "INTERNAL"


class ErrorSeverity(str, enum.Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class IncidentStatus(str, enum.Enum):
    NEW = "NEW"
    ACTIVE = "ACTIVE"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RECOVERING = "RECOVERING"
    RESOLVED = "RESOLVED"
    ARCHIVED = "ARCHIVED"


@dataclass
class SystemIncident:
    incident_id: str
    fingerprint: str
    error_code: str
    category: ErrorCategory
    severity: ErrorSeverity
    status: IncidentStatus
    error_message: str
    provider: str = "System"
    operation: str = "runner_cycle"
    bot_id: str = "system"
    instrument_id: str = "UNKNOWN"
    occurrence_count: int = 1
    first_seen: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_seen: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    http_status: Optional[int] = None
    is_retryable: bool = False
    retry_state: str = "STOPPED"
    next_retry_seconds: Optional[int] = None
    root_cause: str = ""
    plain_explanation: str = ""
    recommended_action: str = ""
    stack_trace: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    resolved_at: Optional[str] = None
    archived_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["category"] = self.category.value
        d["severity"] = self.severity.value
        d["status"] = self.status.value
        return d


class ErrorLedger:
    """Central engine for recording, aggregating, and diagnosing system reliability incidents."""

    @staticmethod
    def sanitize_secrets(text: str) -> str:
        """Removes API keys, passwords, and secret tokens from strings and stack traces."""
        if not text:
            return ""
        # Redact API keys and hashes (alphanumeric sequences > 24 chars)
        sanitized = re.sub(r"(api_?key|secret|password|token|auth)[\s:=]+['\"]?([A-Za-z0-9_\-]{8,})['\"]?", r"\1: [REDACTED]", text, flags=re.IGNORECASE)
        sanitized = re.sub(r"(Bearer\s+)[A-Za-z0-9\-\._~+/]+=*", r"\1[REDACTED]", sanitized, flags=re.IGNORECASE)
        return sanitized

    @classmethod
    def generate_fingerprint(
        cls,
        error_code: str,
        provider: str,
        operation: str,
        bot_id: str,
        instrument_id: str,
    ) -> str:
        """Computes a deterministic fingerprint for grouping identical recurring incidents."""
        raw = f"{error_code.strip().upper()}|{provider.strip().lower()}|{operation.strip().lower()}|{bot_id.strip()}|{instrument_id.strip()}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]

    @classmethod
    def classify_exception(
        cls,
        exc: Exception,
        bot_id: str = "system",
        symbol_query: str = "",
        operation: str = "runner_cycle",
    ) -> Tuple[str, ErrorCategory, ErrorSeverity, bool, str, str, str]:
        """
        Derives structured taxonomy, severity, plain explanation, root cause,
        and recommended action from an exception.
        """
        msg = str(exc)
        exc_name = type(exc).__name__

        # 1. Invalid Symbol / Category As Symbol Error (e.g. BTC-OPTIONS)
        if "BadSymbol" in exc_name or "does not have market symbol" in msg or "INSTRUMENT_RESOLUTION_FAILED" in msg:
            error_code = "INSTRUMENT_NOT_FOUND"
            category = ErrorCategory.INSTRUMENT_RESOLUTION
            severity = ErrorSeverity.ERROR
            is_retryable = False

            plain_exp = (
                f"The bot '{bot_id}' attempted to request market data using an invalid or unexecutable label '{symbol_query or 'BTC-OPTIONS'}'. "
                f"The exchange or data provider does not recognize this symbol as an active tradable market."
            )
            root_cause = f"Invalid instrument mapping: '{symbol_query or 'BTC-OPTIONS'}' is a generic asset category, not an executable contract symbol."
            rec_action = (
                f"Resolve '{symbol_query or 'BTC-OPTIONS'}' to a valid canonical contract (e.g. BTC/USDT for Spot or BTC/USDT:USDT for Perpetual) "
                f"or configure a dedicated options broker before starting the bot."
            )
            return error_code, category, severity, is_retryable, plain_exp, root_cause, rec_action

        # 2. Options Execution Unsupported
        if "OPTIONS EXECUTION UNSUPPORTED" in msg or "OPTIONS_EXECUTION_UNSUPPORTED" in msg:
            error_code = "OPTIONS_UNSUPPORTED"
            category = ErrorCategory.CONFIGURATION
            severity = ErrorSeverity.ERROR
            is_retryable = False
            plain_exp = "The bot is configured for Options strategy, but no active Options-capable broker gateway is configured."
            root_cause = "Options derivatives require dedicated options adapter credentials (e.g. Deribit API / Binance European Options)."
            rec_action = "Configure credentials for an options provider in Settings -> Broker Providers."
            return error_code, category, severity, is_retryable, plain_exp, root_cause, rec_action

        # 3. Provider Rate Limit (HTTP 429 / 418)
        if "RateLimitExceeded" in exc_name or "429" in msg or "418" in msg:
            error_code = "PROVIDER_RATE_LIMIT"
            category = ErrorCategory.PROVIDER_RATE_LIMIT
            severity = ErrorSeverity.WARNING
            is_retryable = True
            plain_exp = "The market data provider is rate-limiting requests due to request volume."
            root_cause = "Exchange request rate exceeded the configured limits per minute (HTTP 429)."
            rec_action = "The system has engaged automatic backoff. Reduce polling frequency across running bot instances."
            return error_code, category, severity, is_retryable, plain_exp, root_cause, rec_action

        # 4. Network / Exchange Timeout / DNS reset (e.g. exchangeInfo timeout)
        if "NetworkError" in exc_name or "RequestTimeout" in exc_name or "exchangeInfo" in msg or "ConnectionError" in msg:
            error_code = "PROVIDER_CONNECTIVITY"
            category = ErrorCategory.PROVIDER_CONNECTIVITY
            severity = ErrorSeverity.WARNING
            is_retryable = True
            plain_exp = "A transient network timeout or connection reset occurred while connecting to the provider's API endpoint."
            root_cause = f"HTTP request to exchange endpoint timed out or failed: {msg[:120]}"
            rec_action = "System will retry with exponential backoff. Check internet connectivity and provider API status."
            return error_code, category, severity, is_retryable, plain_exp, root_cause, rec_action

        # 5. Authentication Failure
        if "AuthenticationError" in exc_name or "APIKeyMissing" in msg or "InvalidAPIKey" in msg:
            error_code = "PROVIDER_AUTH_FAILED"
            category = ErrorCategory.PROVIDER_AUTH
            severity = ErrorSeverity.CRITICAL
            is_retryable = False
            plain_exp = "API credentials were rejected by the exchange or broker."
            root_cause = "Invalid API Key, Secret, or permissions on the configured exchange account."
            rec_action = "Verify API key permissions and IP whitelisting in your exchange dashboard."
            return error_code, category, severity, is_retryable, plain_exp, root_cause, rec_action

        # 6. Data Validation / Missing Numeric Price or Balance Error
        if isinstance(exc, DataValidationError) or "DataValidationError" in exc_name or "NoneType" in msg or "missing price" in msg.lower():
            error_code = "DATA_VALIDATION_FAILED"
            category = ErrorCategory.DATA_INTEGRITY
            severity = ErrorSeverity.ERROR
            is_retryable = False
            plain_exp = "Required numeric value (price, size, or balance) was missing or null. Trade execution and P&L calculation were safely blocked to protect portfolio integrity."
            root_cause = f"Null or missing financial parameter: {msg[:140]}"
            rec_action = "Verify live market feed connectivity and database position records."
            return error_code, category, severity, is_retryable, plain_exp, root_cause, rec_action

        # 7. Generic Default Fallback
        error_code = "RUNNER_EXECUTION_ERROR"
        category = ErrorCategory.INTERNAL
        severity = ErrorSeverity.ERROR
        is_retryable = False
        plain_exp = f"An unexpected execution failure occurred during the bot runner cycle: {msg[:150]}"
        root_cause = f"Unhandled exception in {operation}: {exc_name} ({msg[:120]})"
        rec_action = "Inspect technical details and stack trace in System Reliability Center."
        return error_code, category, severity, is_retryable, plain_exp, root_cause, rec_action

    @classmethod
    def record_incident(
        cls,
        exc: Exception,
        bot_id: str = "system",
        symbol: str = "",
        provider: str = "Binance",
        operation: str = "runner_cycle",
        stack_trace: str = "",
    ) -> Dict[str, Any]:
        """
        Authoritative entry point for error recording.
        Performs fingerprinting, deduplication, sanitization, and DB persistence.
        """
        from src import db

        error_code, category, severity, is_retryable, plain_exp, root_cause, rec_action = cls.classify_exception(
            exc=exc,
            bot_id=bot_id,
            symbol_query=symbol,
            operation=operation,
        )

        sanitized_msg = cls.sanitize_secrets(str(exc))
        sanitized_stack = cls.sanitize_secrets(stack_trace)
        fingerprint = cls.generate_fingerprint(
            error_code=error_code,
            provider=provider,
            operation=operation,
            bot_id=bot_id,
            instrument_id=symbol or "UNKNOWN",
        )

        retry_state = "RETRYING" if is_retryable else "STOPPED (NON-RETRYABLE)"

        now_iso = datetime.now(timezone.utc).isoformat()

        # Database deduplication check & upsert
        incident = db.upsert_system_incident(
            fingerprint=fingerprint,
            error_code=error_code,
            category=category.value,
            severity=severity.value,
            status=IncidentStatus.ACTIVE.value,
            error_message=sanitized_msg,
            provider=provider,
            operation=operation,
            bot_id=bot_id,
            instrument_id=symbol or "UNKNOWN",
            is_retryable=1 if is_retryable else 0,
            retry_state=retry_state,
            root_cause=root_cause,
            plain_explanation=plain_exp,
            recommended_action=rec_action,
            stack_trace=sanitized_stack,
            now_iso=now_iso,
        )

        return incident


# Global shared ErrorLedger instance
global_error_ledger = ErrorLedger()
