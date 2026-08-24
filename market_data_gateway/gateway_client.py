"""
Gateway Client
==============
Synchronous HTTP client for Flask/live_runner to query the Market Data Gateway.
Keeps Flask's synchronous workers non-async while still benefiting from the gateway.
"""
from __future__ import annotations

import logging
import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import requests

logger = logging.getLogger("MDGateway.Client")

_GATEWAY_URL = os.environ.get("MARKET_GATEWAY_URL", "http://127.0.0.1:5051")
_GATEWAY_SECRET = os.environ.get("MARKET_GATEWAY_SECRET", "changeme-set-a-strong-random-secret-here")
_DEFAULT_TIMEOUT = 3.0  # seconds

STALE_THRESHOLD_SEC = 10.0


class GatewayClient:
    """
    Synchronous gateway client. Thread-safe. Singleton-friendly.
    Falls back gracefully if the gateway is not running.
    """

    def __init__(self, base_url: str = _GATEWAY_URL, timeout: float = _DEFAULT_TIMEOUT):
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self._headers = {"X-Gateway-Secret": _GATEWAY_SECRET}
        self._is_available: Optional[bool] = None
        self._last_availability_check: float = 0.0

    # ─── Public API ───────────────────────────────────────────────────────────

    def is_gateway_available(self) -> bool:
        """Check if gateway is reachable (cached for 5 seconds)."""
        now = time.time()
        if now - self._last_availability_check < 5.0 and self._is_available is not None:
            return self._is_available
        try:
            resp = requests.get(f"{self._base_url}/health", timeout=1.0, headers=self._headers)
            self._is_available = resp.status_code == 200
        except Exception:
            self._is_available = False
        self._last_availability_check = now
        return self._is_available

    def get_snapshot(self, symbols: List[str]) -> Dict[str, Any]:
        """
        Return the latest normalized quotes for given symbols.
        Returns {} if gateway is unavailable.
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
                data = resp.json()
                return data.get("quotes", {})
        except Exception as exc:
            logger.warning("Gateway snapshot error: %s", exc)
        return {}

    def get_quote(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Return the latest quote for a single symbol."""
        quotes = self.get_snapshot([symbol])
        return quotes.get(symbol)

    def is_symbol_safe_for_trading(self, symbol: str) -> tuple[bool, str, float]:
        """
        Returns (is_safe, reason, age_sec).
        FAIL CLOSED: if the gateway is unavailable, treat as unsafe after 30s.
        """
        quote = self.get_quote(symbol)
        if quote is None:
            if not self.is_gateway_available():
                return False, "GATEWAY_UNAVAILABLE: Market data gateway is not running", 9999.0
            return False, f"NO_DATA: No quote available for {symbol}", 9999.0

        age_sec = quote.get("age_seconds", 9999.0)
        is_stale = quote.get("is_stale", False)
        data_mode = quote.get("data_mode", "UNKNOWN")

        if data_mode in ("EOD", "CACHED"):
            return False, f"DELAYED_DATA_ONLY: {symbol} data is {data_mode} — not safe for automated signals", age_sec

        if is_stale or age_sec > STALE_THRESHOLD_SEC:
            return False, f"STALE_DATA: {symbol} last tick was {age_sec:.1f}s ago (limit: {STALE_THRESHOLD_SEC}s)", age_sec

        return True, "", age_sec

    def get_history(
        self,
        symbol: str,
        timeframe: str = "1d",
        from_dt: Optional[datetime] = None,
        to_dt: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """Return historical OHLCV candles."""
        params: Dict[str, str] = {"symbol": symbol, "tf": timeframe}
        if from_dt:
            params["from"] = from_dt.isoformat()
        if to_dt:
            params["to"] = to_dt.isoformat()
        try:
            resp = requests.get(
                f"{self._base_url}/history",
                params=params,
                headers=self._headers,
                timeout=max(self._timeout, 10.0),
            )
            if resp.status_code == 200:
                return resp.json().get("candles", [])
        except Exception as exc:
            logger.warning("Gateway history error for %s: %s", symbol, exc)
        return []

    def get_provider_health(self) -> List[Dict[str, Any]]:
        """Return provider health matrix."""
        try:
            resp = requests.get(
                f"{self._base_url}/health",
                headers=self._headers,
                timeout=self._timeout,
            )
            if resp.status_code == 200:
                return resp.json().get("providers", [])
        except Exception as exc:
            logger.warning("Gateway health error: %s", exc)
        return []

    def subscribe(self, symbols: List[str], reason: str = "RUNNING_BOT", source: str = "") -> None:
        """Register a subscription in the gateway."""
        try:
            requests.post(
                f"{self._base_url}/subscriptions",
                json={"action": "subscribe", "symbols": symbols, "reason": reason, "source": source},
                headers=self._headers,
                timeout=self._timeout,
            )
        except Exception as exc:
            logger.warning("Gateway subscribe error: %s", exc)

    def unsubscribe(self, symbols: List[str], reason: str = "RUNNING_BOT") -> None:
        """Remove a subscription from the gateway."""
        try:
            requests.post(
                f"{self._base_url}/subscriptions",
                json={"action": "unsubscribe", "symbols": symbols, "reason": reason},
                headers=self._headers,
                timeout=self._timeout,
            )
        except Exception as exc:
            logger.warning("Gateway unsubscribe error: %s", exc)


# Global singleton for Flask/live_runner use
gateway_client = GatewayClient()
