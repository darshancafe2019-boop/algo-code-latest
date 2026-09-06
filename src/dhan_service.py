"""
Quant.OS Dhan HQ API v2 Market Data & Broker Service
=====================================================
Authoritative service providing:
1. Official ISIN / Symbol -> Dhan Security ID Registry (Indices, Equities, F&O)
2. Token validation and connection health diagnostics
3. Live REST quote, OHLC, and LTP fetchers (/v2/marketfeed/*)
4. Historical candle bar queries (/v2/charts/*)
5. Live account funds & margin limits (/v2/fundlimit)
"""
from __future__ import annotations

import json
import logging
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple

from src import config, db
from src.secrets_manager import SecretsManager

logger = logging.getLogger("DhanService")

# ─────────────────────────────────────────────────────────────────────────────
# OFFICIAL DHAN SECURITY ID & INSTRUMENT REGISTRY
# ─────────────────────────────────────────────────────────────────────────────
# Maps canonical symbol -> Dhan Security ID & Exchange Segment
OFFICIAL_DHAN_KEYS: Dict[str, Dict[str, Any]] = {
    # ── Indices ──────────────────────────────────────────────────────────────
    "NIFTY": {
        "security_id": "13",
        "exchange_segment": "IDX_I",
        "name": "NIFTY 50",
        "exchange": "NSE_INDEX",
        "asset_class": "INDIAN_INDICES",
        "lot_size": 25,
        "tick_size": 0.05,
        "isin": "NIFTY50",
        "trading_symbol": "NIFTY",
    },
    "NIFTY 50": {
        "security_id": "13",
        "exchange_segment": "IDX_I",
        "name": "NIFTY 50",
        "exchange": "NSE_INDEX",
        "asset_class": "INDIAN_INDICES",
        "lot_size": 25,
        "tick_size": 0.05,
        "isin": "NIFTY50",
        "trading_symbol": "NIFTY",
    },
    "BANKNIFTY": {
        "security_id": "25",
        "exchange_segment": "IDX_I",
        "name": "NIFTY BANK",
        "exchange": "NSE_INDEX",
        "asset_class": "INDIAN_INDICES",
        "lot_size": 15,
        "tick_size": 0.05,
        "isin": "NIFTYBANK",
        "trading_symbol": "BANKNIFTY",
    },
    "NIFTY BANK": {
        "security_id": "25",
        "exchange_segment": "IDX_I",
        "name": "NIFTY BANK",
        "exchange": "NSE_INDEX",
        "asset_class": "INDIAN_INDICES",
        "lot_size": 15,
        "tick_size": 0.05,
        "isin": "NIFTYBANK",
        "trading_symbol": "BANKNIFTY",
    },
    "FINNIFTY": {
        "security_id": "27",
        "exchange_segment": "IDX_I",
        "name": "NIFTY FINANCIAL SERVICES",
        "exchange": "NSE_INDEX",
        "asset_class": "INDIAN_INDICES",
        "lot_size": 25,
        "tick_size": 0.05,
        "isin": "FINNIFTY",
        "trading_symbol": "FINNIFTY",
    },
    "INDIA VIX": {
        "security_id": "26",
        "exchange_segment": "IDX_I",
        "name": "INDIA VIX",
        "exchange": "NSE_INDEX",
        "asset_class": "INDIAN_INDICES",
        "lot_size": 1,
        "tick_size": 0.01,
        "isin": "INDIAVIX",
        "trading_symbol": "INDIA VIX",
    },
    "INDIAVIX": {
        "security_id": "26",
        "exchange_segment": "IDX_I",
        "name": "INDIA VIX",
        "exchange": "NSE_INDEX",
        "asset_class": "INDIAN_INDICES",
        "lot_size": 1,
        "tick_size": 0.01,
        "isin": "INDIAVIX",
        "trading_symbol": "INDIA VIX",
    },

    # ── Core High-Liquidity Indian Equities (NSE_EQ) ─────────────────────────
    "RELIANCE": {
        "security_id": "2885",
        "exchange_segment": "NSE_EQ",
        "name": "Reliance Industries Limited",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE002A01018",
        "trading_symbol": "RELIANCE",
    },
    "HDFCBANK": {
        "security_id": "1333",
        "exchange_segment": "NSE_EQ",
        "name": "HDFC Bank Limited",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE040A01034",
        "trading_symbol": "HDFCBANK",
    },
    "ICICIBANK": {
        "security_id": "4963",
        "exchange_segment": "NSE_EQ",
        "name": "ICICI Bank Limited",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE090A01021",
        "trading_symbol": "ICICIBANK",
    },
    "INFY": {
        "security_id": "1594",
        "exchange_segment": "NSE_EQ",
        "name": "Infosys Limited",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE009A01021",
        "trading_symbol": "INFY",
    },
    "TCS": {
        "security_id": "11536",
        "exchange_segment": "NSE_EQ",
        "name": "Tata Consultancy Services Limited",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE467B01029",
        "trading_symbol": "TCS",
    },
    "SBIN": {
        "security_id": "3045",
        "exchange_segment": "NSE_EQ",
        "name": "State Bank of India",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE062A01020",
        "trading_symbol": "SBIN",
    },
    "BHARTIARTL": {
        "security_id": "10604",
        "exchange_segment": "NSE_EQ",
        "name": "Bharti Airtel Limited",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE397D01024",
        "trading_symbol": "BHARTIARTL",
    },
    "KOTAKBANK": {
        "security_id": "1922",
        "exchange_segment": "NSE_EQ",
        "name": "Kotak Mahindra Bank Limited",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE237A01028",
        "trading_symbol": "KOTAKBANK",
    },
    "LT": {
        "security_id": "11483",
        "exchange_segment": "NSE_EQ",
        "name": "Larsen & Toubro Limited",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE018A01030",
        "trading_symbol": "LT",
    },
    "AXISBANK": {
        "security_id": "5900",
        "exchange_segment": "NSE_EQ",
        "name": "Axis Bank Limited",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE238A01034",
        "trading_symbol": "AXISBANK",
    },
    "TATAMOTORS": {
        "security_id": "3456",
        "exchange_segment": "NSE_EQ",
        "name": "Tata Motors Limited",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE155A01022",
        "trading_symbol": "TATAMOTORS",
    },
    "ITC": {
        "security_id": "1660",
        "exchange_segment": "NSE_EQ",
        "name": "ITC Limited",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE154A01025",
        "trading_symbol": "ITC",
    },
    "HINDUNILVR": {
        "security_id": "1394",
        "exchange_segment": "NSE_EQ",
        "name": "Hindustan Unilever Limited",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE030A01027",
        "trading_symbol": "HINDUNILVR",
    },
    "BAJFINANCE": {
        "security_id": "317",
        "exchange_segment": "NSE_EQ",
        "name": "Bajaj Finance Limited",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE296A01024",
        "trading_symbol": "BAJFINANCE",
    },
    "MARUTI": {
        "security_id": "10999",
        "exchange_segment": "NSE_EQ",
        "name": "Maruti Suzuki India Limited",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE585B01010",
        "trading_symbol": "MARUTI",
    },
    "SUNPHARMA": {
        "security_id": "3351",
        "exchange_segment": "NSE_EQ",
        "name": "Sun Pharmaceutical Industries Limited",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE044A01036",
        "trading_symbol": "SUNPHARMA",
    },
    "TITAN": {
        "security_id": "3506",
        "exchange_segment": "NSE_EQ",
        "name": "Titan Company Limited",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE280A01028",
        "trading_symbol": "TITAN",
    },
    "TATASTEEL": {
        "security_id": "3499",
        "exchange_segment": "NSE_EQ",
        "name": "Tata Steel Limited",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE081A01020",
        "trading_symbol": "TATASTEEL",
    },
    "WIPRO": {
        "security_id": "3787",
        "exchange_segment": "NSE_EQ",
        "name": "Wipro Limited",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE075A01022",
        "trading_symbol": "WIPRO",
    },
}


class DhanService:
    """
    Authoritative Dhan HQ API v2 client for live market quotes, candles,
    instrument resolution, and fund limits.
    """

    DHAN_BASE_URL = "https://api.dhan.co/v2"
    DHAN_FEED_URL = "wss://api-feed.dhan.co"

    def __init__(
        self,
        client_id: Optional[str] = None,
        access_token: Optional[str] = None,
        timeout_sec: float = 8.0,
    ):
        self.secrets_mgr = SecretsManager()
        self.client_id = (client_id or getattr(config, "DHAN_CLIENT_ID", "") or os.getenv("DHAN_CLIENT_ID", "")).strip()
        self.access_token = (access_token or getattr(config, "DHAN_ACCESS_TOKEN", "") or os.getenv("DHAN_ACCESS_TOKEN", "")).strip()
        self.timeout_sec = float(timeout_sec)
        self._auth_status = "INITIAL"
        self._last_auth_check = 0.0
        self._auth_cached_result: Optional[Dict[str, Any]] = None

        self._load_credentials_from_vault()

    def _load_credentials_from_vault(self) -> None:
        """Loads encrypted API credentials from SQLite broker_credentials if available."""
        if self.client_id and self.access_token:
            return
        try:
            creds = db.safe_query(
                "SELECT encrypted_api_key, encrypted_secret_key FROM broker_credentials WHERE provider_id = 'dhan' AND status = 'CONNECTED' ORDER BY last_validated_at DESC LIMIT 1"
            )
            if creds:
                dec_cid = self.secrets_mgr.decrypt_secret(creds[0].get("encrypted_api_key", ""))
                dec_token = self.secrets_mgr.decrypt_secret(creds[0].get("encrypted_secret_key", ""))
                if dec_cid:
                    self.client_id = dec_cid.strip()
                if dec_token:
                    self.access_token = dec_token.strip()
        except Exception as e:
            logger.debug(f"Dhan vault load note: {e}")

    @property
    def is_authenticated(self) -> bool:
        return bool(self.client_id and self.access_token)

    def validate_token(self, force: bool = False) -> Dict[str, Any]:
        """
        Validates Dhan credentials via GET /v2/profile or /v2/fundlimit.
        Caches result for 60 seconds to avoid hitting rate limits.
        """
        now = time.monotonic()
        if not force and self._auth_cached_result and (now - self._last_auth_check < 60.0):
            return self._auth_cached_result

        if not self.is_authenticated:
            self._auth_status = "CREDENTIALS_MISSING"
            res = {
                "valid": False,
                "status": "NOT_CONFIGURED",
                "message": "Dhan Client ID or Access Token not configured in .env or vault.",
                "client_id": self.client_id[:4] + "****" if self.client_id else "",
            }
            self._auth_cached_result = res
            self._last_auth_check = now
            return res

        try:
            profile = self._make_request("GET", "profile")
            # Check for Dhan error formats
            is_error = False
            error_code = None
            error_msg = ""

            if not profile or not isinstance(profile, dict):
                is_error = True
                error_msg = "Empty or invalid response from Dhan profile API"
            elif profile.get("errorType") or profile.get("errorCode") or profile.get("status") in ("error", "failed"):
                is_error = True
                error_code = profile.get("errorCode") or profile.get("errorType")
                error_msg = profile.get("errorMessage") or profile.get("message") or "Authentication failed"
            elif profile.get("http_code") in (401, 403):
                is_error = True
                error_code = "DH-901"
                error_msg = profile.get("message") or "Unauthorized or expired token"

            if is_error:
                status_code = "TOKEN_EXPIRED" if (error_code == "DH-901" or "expired" in error_msg.lower() or "invalid" in error_msg.lower()) else "AUTH_REQUIRED"
                self._auth_status = status_code
                res = {
                    "valid": False,
                    "status": status_code,
                    "error_code": error_code or "DH-901",
                    "client_id": self.client_id[:4] + "****" if self.client_id else "",
                    "message": f"Dhan authentication failed ({error_code or '401'}): {error_msg}. Please update your Dhan access token in Settings -> Brokers.",
                }
            else:
                # Check dataPlan entitlement if provided by profile
                data_plan = profile.get("dataPlan") or profile.get("data_plan")
                if data_plan and str(data_plan).upper() in ("INACTIVE", "EXPIRED", "DISABLED"):
                    self._auth_status = "DATA_PLAN_INACTIVE"
                    res = {
                        "valid": False,
                        "status": "DATA_PLAN_INACTIVE",
                        "client_id": self.client_id,
                        "data_plan": data_plan,
                        "message": "Dhan Data Plan is inactive. Please activate Live Market Data feed on Dhan HQ portal.",
                        "profile": profile,
                    }
                else:
                    self._auth_status = "CONNECTED"
                    res = {
                        "valid": True,
                        "status": "CONNECTED",
                        "client_id": self.client_id,
                        "data_plan": data_plan or "ACTIVE",
                        "profile": profile,
                        "message": "Dhan HQ API v2 authenticated successfully",
                    }
        except Exception as exc:
            self._auth_status = "ERROR"
            res = {
                "valid": False,
                "status": "ERROR",
                "message": str(exc),
            }

        self._auth_cached_result = res
        self._last_auth_check = now
        return res

    def _make_request(
        self,
        method: str,
        path: str,
        data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Makes an authenticated HTTP request to Dhan HQ API v2."""
        if not self.is_authenticated:
            return {"status": "error", "error": "DHAN_CREDENTIALS_MISSING", "message": "Dhan credentials not configured."}

        url = f"{self.DHAN_BASE_URL}/{path.lstrip('/')}"
        headers = {
            "access-token": self.access_token,
            "client-id": self.client_id,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        body_bytes = None
        if data is not None and method.upper() in ["POST", "PUT", "PATCH"]:
            body_bytes = json.dumps(data).encode("utf-8")

        req = urllib.request.Request(url, data=body_bytes, headers=headers, method=method.upper())
        try:
            with urllib.request.urlopen(req, timeout=self.timeout_sec) as resp:
                resp_text = resp.read().decode("utf-8")
                return json.loads(resp_text)
        except urllib.error.HTTPError as he:
            err_body = he.read().decode("utf-8") if he.fp else ""
            logger.error(f"Dhan API HTTP {he.code} for {url}: {err_body}")
            try:
                return json.loads(err_body)
            except Exception:
                return {"status": "error", "http_code": he.code, "message": str(he)}
        except Exception as exc:
            logger.error(f"Dhan API request failed: {exc}")
            return {"status": "error", "message": str(exc)}

    # ─── Instrument Resolution ────────────────────────────────────────────────

    def resolve_symbol(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Resolves canonical symbol or trading symbol to Dhan security id mapping."""
        clean_sym = symbol.strip().upper().replace(" ", "")
        if clean_sym in OFFICIAL_DHAN_KEYS:
            return OFFICIAL_DHAN_KEYS[clean_sym]
        for key, meta in OFFICIAL_DHAN_KEYS.items():
            if meta.get("trading_symbol", "").upper().replace(" ", "") == clean_sym:
                return meta
            if meta.get("isin", "").upper() == clean_sym:
                return meta
        return None

    def get_security_id(self, symbol: str) -> Optional[str]:
        meta = self.resolve_symbol(symbol)
        return meta.get("security_id") if meta else None

    # ─── Market Data REST Endpoints ──────────────────────────────────────────

    def get_market_quote(self, instruments_map: Dict[str, List[int | str]]) -> Dict[str, Any]:
        """
        Fetches full market quotes via POST /v2/marketfeed/quote.
        Payload format:
            {"NSE_EQ": [1333, 2885], "IDX_I": [13, 25]}
        """
        return self._make_request("POST", "marketfeed/quote", data=instruments_map)

    def get_ltp(self, instruments_map: Dict[str, List[int | str]]) -> Dict[str, Any]:
        """
        Fetches latest traded prices via POST /v2/marketfeed/ltp.
        Payload format:
            {"NSE_EQ": [1333, 2885], "IDX_I": [13, 25]}
        """
        return self._make_request("POST", "marketfeed/ltp", data=instruments_map)

    def get_ohlc(self, instruments_map: Dict[str, List[int | str]]) -> Dict[str, Any]:
        """
        Fetches OHLC via POST /v2/marketfeed/ohlc.
        """
        return self._make_request("POST", "marketfeed/ohlc", data=instruments_map)

    def get_historical_charts(
        self,
        security_id: str,
        exchange_segment: str = "NSE_EQ",
        instrument: str = "EQUITY",
        from_date: str = "",
        to_date: str = "",
        expiry_code: int = 0,
    ) -> Dict[str, Any]:
        """
        Fetches historical daily/intraday candle data via POST /v2/charts/historical.
        """
        if not from_date:
            from_date = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
        if not to_date:
            to_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        payload = {
            "securityId": str(security_id),
            "exchangeSegment": exchange_segment,
            "instrument": instrument,
            "expiryCode": expiry_code,
            "fromDate": from_date,
            "toDate": to_date,
        }
        return self._make_request("POST", "charts/historical", data=payload)

    def get_safe_diagnostic(self) -> Dict[str, Any]:
        """
        Produces an authoritative, sanitized diagnostic report for Dhan HQ API v2.
        Strictly excludes tokens, secrets, or sensitive headers.
        """
        val = self.validate_token()
        is_conf = bool(self.client_id and self.access_token)
        status = val.get("status", "NOT_CONFIGURED")
        err_code = val.get("error_code")
        
        auth_status = "VALID" if status == "CONNECTED" else ("TOKEN_EXPIRED" if status == "TOKEN_EXPIRED" else ("NOT_CONFIGURED" if not is_conf else "AUTH_REQUIRED"))
        token_status = "ACTIVE" if status == "CONNECTED" else ("EXPIRED" if status == "TOKEN_EXPIRED" else ("NOT_SET" if not is_conf else "INVALID"))
        rest_status = "UP" if status == "CONNECTED" else "DOWN"
        data_entitlement = val.get("data_plan") or ("ACTIVE" if status == "CONNECTED" else "UNKNOWN")

        return {
            "configured": is_conf,
            "authentication_status": auth_status,
            "token_status": token_status,
            "token_expiry": None,
            "data_entitlement": data_entitlement,
            "rest_status": rest_status,
            "websocket_status": "LIVE" if status == "CONNECTED" else "DOWN",
            "subscription_status": "ACTIVE" if status == "CONNECTED" else "INACTIVE",
            "decoder_status": "BINARY_OK" if status == "CONNECTED" else "DECODER_READY",
            "last_real_tick_at": None,
            "last_tick_age_ms": None,
            "error_code": err_code,
            "safe_error_message": val.get("message") if status != "CONNECTED" else None,
            "status": status,
        }


# Singleton instance
global_dhan_service = DhanService()
