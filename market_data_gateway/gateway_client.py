"""
Gateway Client
==============
Synchronous HTTP client for Flask/live_runner to query the Market Data Gateway.
Keeps Flask's synchronous workers non-async while still benefiting from the gateway.
"""
from __future__ import annotations

import json
import logging
import math
import os
import threading
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

import requests

logger = logging.getLogger("MDGateway.Client")

_DEFAULT_URL = os.environ.get("MARKET_GATEWAY_URL", "http://127.0.0.1:5051")
_GATEWAY_SECRET = os.environ.get("MARKET_GATEWAY_SECRET", "")
_DEFAULT_TIMEOUT = 3.0  # seconds

STALE_THRESHOLD_SEC = 10.0
# Allowed real-time data modes for automated trading
VERIFIED_REALTIME_MODES = frozenset({"REAL_TIME", "LIVE"})


def _is_cloud_production() -> bool:
    """Detect whether running in cloud production (e.g. Render)."""
    return bool(
        os.environ.get("RENDER")
        or os.environ.get("APP_ENV") == "production"
        or os.environ.get("FLASK_ENV") == "production"
    )


class GatewayClient:
    """
    Synchronous gateway client. Thread-safe. Singleton-friendly.
    Falls back gracefully if the gateway is not running.
    """

    def __init__(self, base_url: Optional[str] = None, timeout: float = _DEFAULT_TIMEOUT):
        raw_url = (base_url or os.environ.get("MARKET_GATEWAY_URL") or _DEFAULT_URL).strip().rstrip("/")
        if raw_url and not (raw_url.startswith("http://") or raw_url.startswith("https://")):
            raw_url = f"http://{raw_url}"
        self._base_url = raw_url
        self._timeout = timeout
        self._secret = os.environ.get("MARKET_GATEWAY_SECRET", _GATEWAY_SECRET)
        self._headers = {"X-Gateway-Secret": self._secret} if self._secret else {}
        self._is_available: Optional[bool] = None
        self._last_availability_check: float = 0.0
        self._lock = threading.Lock()

        # Log sanitized configuration on init
        parsed = urlparse(self._base_url)
        netloc = parsed.netloc or self._base_url
        if _is_cloud_production() and ("127.0.0.1" in netloc or "localhost" in netloc):
            logger.warning(
                "Running in cloud production with loopback MARKET_GATEWAY_URL (%s). "
                "Ensure MARKET_GATEWAY_URL is configured to the reachable gateway service address.",
                netloc,
            )

    # ─── Public API ───────────────────────────────────────────────────────────

    def is_gateway_available(self) -> bool:
        """
        Check if gateway is reachable (cached for 5 seconds).
        Thread-safe across concurrent Flask worker threads.
        """
        now = time.time()
        with self._lock:
            if now - self._last_availability_check < 5.0 and self._is_available is not None:
                return self._is_available

        # Network call outside lock to prevent blocking other threads
        available = False
        try:
            resp = requests.get(f"{self._base_url}/health", timeout=min(self._timeout, 1.5), headers=self._headers)
            available = resp.status_code == 200
        except Exception:
            available = False

        with self._lock:
            self._is_available = available
            self._last_availability_check = now
            return self._is_available

    def get_snapshot(self, symbols: List[str]) -> Dict[str, Any]:
        """
        Return the latest normalized quotes for given symbols.
        Returns {} if gateway is unavailable or fails.
        """
        if not symbols:
            return {}
        try:
            params = {"symbols": ",".join(symbols)}
            resp = requests.get(
                f"{self._base_url}/snapshot",
                params=params,
                headers=self._headers,
                timeout=self._timeout,
            )
            if resp.status_code == 200:
                try:
                    data = resp.json()
                    if isinstance(data, dict):
                        quotes = data.get("quotes")
                        return quotes if isinstance(quotes, dict) else {}
                except (ValueError, json.JSONDecodeError):
                    logger.warning("Gateway snapshot response was not valid JSON")
                    return {}
            else:
                logger.warning("Gateway snapshot returned HTTP %d", resp.status_code)
        except Exception as exc:
            logger.warning("Gateway snapshot request failed: %s", type(exc).__name__)
        return {}

    def get_quote(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Return the latest quote for a single symbol."""
        if not symbol or not isinstance(symbol, str):
            return None
        quotes = self.get_snapshot([symbol])
        quote = quotes.get(symbol)
        return quote if isinstance(quote, dict) else None

    def is_symbol_safe_for_trading(self, symbol: str) -> tuple[bool, str, float]:
        """
        Returns (is_safe, reason, age_sec).
        STRICT FAIL-CLOSED: immediately rejects trading if the gateway is
        unavailable, quotes are missing/malformed, data mode is non-real-time,
        or quotes are stale (> 10s).
        """
        if not symbol or not isinstance(symbol, str):
            return False, "INVALID_SYMBOL: Symbol must be a non-empty string", 9999.0

        quote = self.get_quote(symbol)
        if quote is None or not isinstance(quote, dict):
            if not self.is_gateway_available():
                return False, "GATEWAY_UNAVAILABLE: Market data gateway is not reachable", 9999.0
            return False, f"NO_DATA: No quote available for {symbol}", 9999.0

        # Validate age_seconds: must be a finite, non-negative numeric value
        raw_age = quote.get("age_seconds")
        if (
            raw_age is None
            or isinstance(raw_age, bool)
            or not isinstance(raw_age, (int, float))
            or math.isnan(raw_age)
            or math.isinf(raw_age)
            or raw_age < 0.0
        ):
            return (
                False,
                f"INVALID_AGE: {symbol} age_seconds ({raw_age!r}) is invalid or non-numeric",
                9999.0,
            )
        age_sec = float(raw_age)

        # Validate data_mode: Automated live trading only allowed on explicitly verified real-time modes
        raw_mode = quote.get("data_mode")
        if not raw_mode or not isinstance(raw_mode, str):
            return False, f"UNKNOWN_DATA_MODE: {symbol} missing or invalid data_mode", age_sec

        data_mode = raw_mode.strip().upper()
        if data_mode in ("EOD", "CACHED", "DELAYED"):
            return False, f"DELAYED_DATA_ONLY: {symbol} data is {data_mode} — not safe for automated signals", age_sec

        if data_mode == "SIMULATED":
            return False, f"SIMULATED_DATA: {symbol} data is simulated — not safe for automated live execution", age_sec

        if data_mode not in VERIFIED_REALTIME_MODES:
            return False, f"UNVERIFIED_DATA_MODE: {symbol} data mode '{data_mode}' is not verified real-time", age_sec

        # Stale threshold check (limit: 10.0s)
        is_stale = bool(quote.get("is_stale", False))
        if is_stale or age_sec > STALE_THRESHOLD_SEC:
            return False, f"STALE_DATA: {symbol} last tick was {age_sec:.1f}s ago (limit: {STALE_THRESHOLD_SEC}s)", age_sec

        return True, "", age_sec

    def get_provider_health(self) -> List[Dict[str, Any]]:
        """Return provider health matrix."""
        try:
            resp = requests.get(
                f"{self._base_url}/health",
                headers=self._headers,
                timeout=self._timeout,
            )
            if resp.status_code == 200:
                try:
                    data = resp.json()
                    providers = data.get("providers", []) if isinstance(data, dict) else []
                    return providers if isinstance(providers, list) else []
                except (ValueError, json.JSONDecodeError):
                    logger.warning("Gateway health response was not valid JSON")
                    return []
            else:
                logger.warning("Gateway health returned HTTP %d", resp.status_code)
        except Exception as exc:
            logger.warning("Gateway health request failed: %s", type(exc).__name__)
        return []

    def subscribe(self, symbols: List[str], reason: str = "RUNNING_BOT", source: str = "") -> bool:
        """
        Register a subscription in the gateway.
        Returns True if successfully acknowledged by the gateway (HTTP 200/201).
        """
        if not symbols or not isinstance(symbols, list):
            return False
        try:
            resp = requests.post(
                f"{self._base_url}/subscriptions",
                json={"action": "subscribe", "symbols": symbols, "reason": reason, "source": source},
                headers=self._headers,
                timeout=self._timeout,
            )
            if resp.status_code in (200, 201):
                return True
            logger.warning("Gateway subscribe failed with HTTP %d", resp.status_code)
            return False
        except Exception as exc:
            logger.warning("Gateway subscribe error: %s", type(exc).__name__)
            return False

    def unsubscribe(self, symbols: List[str], reason: str = "RUNNING_BOT") -> bool:
        """
        Remove a subscription from the gateway.
        Returns True if successfully acknowledged by the gateway (HTTP 200/201).
        """
        if not symbols or not isinstance(symbols, list):
            return False
        try:
            resp = requests.post(
                f"{self._base_url}/subscriptions",
                json={"action": "unsubscribe", "symbols": symbols, "reason": reason},
                headers=self._headers,
                timeout=self._timeout,
            )
            if resp.status_code in (200, 201):
                return True
            logger.warning("Gateway unsubscribe failed with HTTP %d", resp.status_code)
            return False
        except Exception as exc:
            logger.warning("Gateway unsubscribe error: %s", type(exc).__name__)
            return False


# Global singleton for Flask/live_runner use
gateway_client = GatewayClient()
