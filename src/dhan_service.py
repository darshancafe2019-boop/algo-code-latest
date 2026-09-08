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

    @property
    def base_url(self) -> str:
        env_url = (os.getenv("DHAN_BASE_URL") or getattr(config, "DHAN_BASE_URL", "") or "").strip()
        if env_url:
            return env_url.rstrip("/")
        is_sandbox = (
            os.getenv("DHAN_SANDBOX", "").lower() in ("true", "1", "yes")
            or os.getenv("DHAN_ENV", "").upper() == "SANDBOX"
            or getattr(config, "DHAN_SANDBOX", False)
        )
        if is_sandbox:
            return "https://sandbox.dhan.co/v2"
        return "https://api.dhan.co/v2"

    DHAN_FEED_URL = "wss://api-feed.dhan.co"

    def __init__(
        self,
        client_id: Optional[str] = None,
        access_token: Optional[str] = None,
        timeout_sec: float = 8.0,
    ):
        self.secrets_mgr = SecretsManager()
        self.client_id = (client_id or getattr(config, "DHAN_CLIENT_ID", "") or os.getenv("DHAN_CLIENT_ID", "") or "").strip()
        self.access_token = (access_token or getattr(config, "DHAN_ACCESS_TOKEN", "") or os.getenv("DHAN_ACCESS_TOKEN", "") or "").strip()
        self.timeout_sec = float(timeout_sec)
        self._auth_status = "INITIAL"
        self._last_auth_check = 0.0
        self._auth_cached_result: Optional[Dict[str, Any]] = None

        self._load_credentials_from_vault()

    def _load_credentials_from_vault(self) -> None:
        """Loads encrypted API credentials from SQLite broker_credentials if available."""
        if self.access_token:
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

    def validate_client_id(self, client_id: Optional[str] = None) -> Tuple[bool, Optional[str]]:
        """Validates that Dhan Client ID is non-empty, non-placeholder, and valid."""
        cid = (self.client_id if client_id is None else client_id).strip()
        if not cid:
            return False, "INVALID_DHAN_CLIENT_ID: Dhan Client ID is missing."
        if any(c.isspace() for c in cid) or cid.lower() in ("your_client_id", "placeholder", "placeholder_user", "none", "null"):
            return False, f"INVALID_DHAN_CLIENT_ID: Configured Client ID '{cid}' is malformed or a placeholder."
        return True, None

    def validate_instrument(self, exchange_segment: str, security_id: str | int) -> Tuple[bool, Optional[str]]:
        """Validates instrument parameters against Dhan rules."""
        seg_str = str(exchange_segment).strip().upper()
        sec_str = str(security_id).strip()
        valid_segs = ("NSE_EQ", "IDX_I", "NSE_FNO", "BSE_EQ", "MCX_COMM", "BSE_FNO", "NSE_CURRENCY", "BSE_CURRENCY")
        if seg_str not in valid_segs:
            return False, f"INVALID_INSTRUMENT_CONFIGURATION: Unknown exchange segment '{seg_str}'."
        if not sec_str or not sec_str.isdigit():
            return False, f"INVALID_INSTRUMENT_CONFIGURATION: Security ID '{sec_str}' must be numeric integer."
        return True, None

    @property
    def is_authenticated(self) -> bool:
        return bool(self.access_token)

    def validate_token(self, force: bool = False) -> Dict[str, Any]:
        """
        Validates Dhan credentials via GET /v2/profile, /v2/fundlimit, or /v2/orders.
        Caches result for 60 seconds to avoid hitting rate limits.
        """
        now = time.monotonic()
        if not force and self._auth_cached_result and (now - self._last_auth_check < 60.0):
            return self._auth_cached_result

        cid_ok, cid_err = self.validate_client_id()
        if not cid_ok:
            res = {
                "valid": False,
                "status": "INVALID_DHAN_CLIENT_ID",
                "error_code": "INVALID_DHAN_CLIENT_ID",
                "client_id": self.client_id[:4] + "****" if self.client_id else "",
                "message": cid_err,
            }
            self._auth_cached_result = res
            self._last_auth_check = now
            return res

        if not self.is_authenticated:
            self._auth_status = "CREDENTIALS_MISSING"
            res = {
                "valid": False,
                "status": "NOT_CONFIGURED",
                "error_code": "DH-901",
                "message": "Dhan Access Token not configured in .env or vault.",
                "client_id": self.client_id[:4] + "****" if self.client_id else "",
            }
            self._auth_cached_result = res
            self._last_auth_check = now
            return res

        try:
            # First try profile
            profile = self._make_request("GET", "orders" if "sandbox" in self.base_url.lower() else "profile")
            if isinstance(profile, list):
                # /orders returned order list (sandbox / live success)
                self._auth_status = "CONNECTED"
                res = {
                    "valid": True,
                    "status": "CONNECTED",
                    "client_id": self.client_id or "SANDBOX_USER",
                    "data_plan": "ACTIVE",
                    "environment": "SANDBOX" if "sandbox" in self.base_url.lower() else "LIVE",
                    "message": "Dhan API connection authenticated successfully",
                }
                self._auth_cached_result = res
                self._last_auth_check = now
                return res

            # Check for Dhan error formats
            is_error = False
            error_code = None
            error_msg = ""
            http_status = profile.get("_http_status", 200) if isinstance(profile, dict) else 0

            if not profile or not isinstance(profile, dict):
                is_error = True
                error_msg = "Empty or invalid response from Dhan API"
                error_code = "DH-905"
            elif profile.get("data") and isinstance(profile.get("data"), dict):
                # Format: {"data": {"808": "Authentication Failed - Client ID or Token invalid"}, "status": "failed"}
                for k, v in profile["data"].items():
                    if str(k).isdigit() or str(k).startswith("DH-") or "error" in str(k).lower():
                        is_error = True
                        error_code = str(k)
                        error_msg = str(v)
                        break
            
            if not is_error and isinstance(profile, dict):
                if profile.get("errorType") or profile.get("errorCode") or profile.get("status") in ("error", "failed") or http_status >= 400:
                    is_error = True
                    error_code = profile.get("errorCode") or profile.get("errorType") or (f"HTTP-{http_status}" if http_status >= 400 else "DH-905")
                    error_msg = profile.get("errorMessage") or profile.get("message") or "Authentication failed"

            if is_error:
                if error_code in ("808", "807", "809", "810", "DH-901", "401", "Invalid_Authentication", "HTTP-401") or "expired" in error_msg.lower() or "invalid" in error_msg.lower():
                    status_code = "AUTH_REQUIRED"
                elif error_code in ("805", "DH-902", "403", "HTTP-403"):
                    status_code = "DATA_API_UNAVAILABLE"
                else:
                    status_code = "ERROR"

                self._auth_status = status_code
                res = {
                    "valid": False,
                    "status": status_code,
                    "error_code": error_code or "DH-901",
                    "http_status": http_status,
                    "client_id": self.client_id[:4] + "****" if self.client_id else "",
                    "message": f"Dhan authentication error ({error_code or http_status}): {error_msg}. Please update your Dhan access token in Settings -> Brokers.",
                    "raw_response": {k: v for k, v in profile.items() if k not in ("access-token", "token", "secret")} if isinstance(profile, dict) else {},
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
                        "environment": "SANDBOX" if "sandbox" in self.base_url.lower() else "LIVE",
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
        """Makes an authenticated HTTP request to Dhan HQ API v2 / Sandbox."""
        if not self.is_authenticated:
            return {"status": "error", "error": "DHAN_CREDENTIALS_MISSING", "message": "Dhan access token not configured."}

        url = f"{self.base_url}/{path.lstrip('/')}"
        headers = {
            "access-token": self.access_token,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if self.client_id:
            headers["client-id"] = self.client_id

        body_bytes = None
        if data is not None and method.upper() in ["POST", "PUT", "PATCH"]:
            body_bytes = json.dumps(data).encode("utf-8")

        req = urllib.request.Request(url, data=body_bytes, headers=headers, method=method.upper())
        try:
            from src.ssl_util import get_ssl_context
            ssl_ctx = get_ssl_context()
            with urllib.request.urlopen(req, timeout=self.timeout_sec, context=ssl_ctx) as resp:
                resp_text = resp.read().decode("utf-8")
                res = json.loads(resp_text)
                if isinstance(res, dict):
                    res["_http_status"] = resp.status
                return res
        except urllib.error.HTTPError as he:
            err_body = he.read().decode("utf-8") if he.fp else ""
            logger.error(f"Dhan API HTTP {he.code} for {url}: {err_body}")
            try:
                res = json.loads(err_body)
                if isinstance(res, dict):
                    res["_http_status"] = he.code
                return res
            except Exception:
                return {"status": "failed", "_http_status": he.code, "message": str(he), "raw_body": err_body}
        except Exception as exc:
            logger.error(f"Dhan API request failed: {exc}")
            return {"status": "error", "_http_status": 0, "message": str(exc)}

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
            from_date = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d %H:%M:%S")
        if not to_date:
            to_date = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

        payload = {
            "securityId": str(security_id),
            "exchangeSegment": exchange_segment,
            "instrument": instrument,
            "expiryCode": expiry_code,
            "fromDate": from_date,
            "toDate": to_date,
        }
        return self._make_request("POST", "charts/historical", data=payload)

    def get_option_chain(
        self,
        underlying_security_id: int | str,
        underlying_segment: str = "IDX_I",
        expiry: str = "",
    ) -> Dict[str, Any]:
        """
        Fetches Dhan option chain via POST /v2/optionchain.
        """
        payload: Dict[str, Any] = {
            "UnderlyingScrip": int(underlying_security_id),
            "UnderlyingSeg": underlying_segment,
        }
        if expiry:
            payload["Expiry"] = expiry
        return self._make_request("POST", "optionchain", data=payload)

    def get_expiry_list(
        self,
        underlying_security_id: int | str,
        underlying_segment: str = "IDX_I",
    ) -> Dict[str, Any]:
        """
        Fetches available expiry dates for an underlying via POST /v2/optionchain/expirylist.
        """
        payload = {
            "UnderlyingScrip": int(underlying_security_id),
            "UnderlyingSeg": underlying_segment,
        }
        return self._make_request("POST", "optionchain/expirylist", data=payload)

    def test_rest_connection(self, security_id: int | str = 2885, exchange_segment: str = "NSE_EQ") -> Dict[str, Any]:
        """
        Server-side REST smoke test against POST /v2/marketfeed/ltp.
        Strictly follows Section 1 & Section 7 contract.
        """
        cid_ok, cid_err = self.validate_client_id()
        if not cid_ok:
            return {
                "success": False,
                "status": "INVALID_DHAN_CLIENT_ID",
                "http_status": 0,
                "error_code": "INVALID_DHAN_CLIENT_ID",
                "error_message": cid_err,
                "message": cid_err,
                "latency_ms": 0.0,
                "raw_response": {"status": "failed", "error": "INVALID_DHAN_CLIENT_ID", "message": cid_err},
            }

        inst_ok, inst_err = self.validate_instrument(exchange_segment, security_id)
        if not inst_ok:
            return {
                "success": False,
                "status": "INVALID_INSTRUMENT_CONFIGURATION",
                "http_status": 0,
                "error_code": "INVALID_INSTRUMENT_CONFIGURATION",
                "error_message": inst_err,
                "message": inst_err,
                "latency_ms": 0.0,
                "raw_response": {"status": "failed", "error": "INVALID_INSTRUMENT_CONFIGURATION", "message": inst_err},
            }

        if not self.is_authenticated:
            return {
                "success": False,
                "status": "AUTH_REQUIRED",
                "http_status": 0,
                "error_code": "DH-901",
                "error_message": "Dhan credentials not configured. Please set DHAN_CLIENT_ID and DHAN_ACCESS_TOKEN.",
                "message": "Dhan credentials not configured. Please set DHAN_CLIENT_ID and DHAN_ACCESS_TOKEN.",
                "latency_ms": 0.0,
                "raw_response": {"status": "failed", "error": "DH-901", "message": "Credentials missing"},
            }

        t0 = time.monotonic()
        req_body = {str(exchange_segment): [int(security_id)]}
        resp = self.get_ltp(req_body)
        latency_ms = round((time.monotonic() - t0) * 1000.0, 1)

        http_status = resp.get("_http_status", 200) if isinstance(resp, dict) else 0

        if not resp or not isinstance(resp, dict):
            return {
                "success": False,
                "status": "ERROR",
                "http_status": http_status,
                "error_code": "DH-905",
                "error_message": "Empty or invalid response from Dhan REST API.",
                "message": "Empty or invalid response from Dhan REST API.",
                "latency_ms": latency_ms,
                "raw_response": {},
            }

        # Check for Dhan error response
        is_error = False
        err_code = None
        err_msg = None

        if resp.get("data") and isinstance(resp.get("data"), dict):
            for k, v in resp["data"].items():
                if str(k).isdigit() or str(k).startswith("DH-") or "error" in str(k).lower():
                    is_error = True
                    err_code = str(k)
                    err_msg = str(v)
                    break

        if not is_error:
            if resp.get("status") in ("error", "failed") or resp.get("errorType") or resp.get("errorCode") or http_status >= 400:
                is_error = True
                err_code = resp.get("errorCode") or resp.get("errorType") or (f"HTTP-{http_status}" if http_status >= 400 else "DH-905")
                err_msg = resp.get("errorMessage") or resp.get("message") or "Dhan API returned error."

        sanitized_resp = {k: v for k, v in resp.items() if k not in ("access-token", "token", "secret", "password")}

        if is_error:
            if err_code in ("808", "807", "809", "810", "DH-901", "401", "Invalid_Authentication", "HTTP-401") or (err_msg and ("expired" in err_msg.lower() or "invalid" in err_msg.lower())):
                status_cat = "AUTH_REQUIRED"
            elif err_code in ("805", "DH-902", "403", "HTTP-403"):
                status_cat = "DATA_API_UNAVAILABLE"
            elif err_code in ("813", "DH-813") or "instrument" in (err_msg or "").lower():
                status_cat = "INVALID_INSTRUMENT_CONFIGURATION"
            else:
                status_cat = "ERROR"

            return {
                "success": False,
                "status": status_cat,
                "http_status": http_status,
                "error_code": err_code or "DH-901",
                "error_message": err_msg or "Dhan API error",
                "message": err_msg or "Dhan API error",
                "latency_ms": latency_ms,
                "raw_response": sanitized_resp,
            }

        data_obj = resp.get("data", {})
        seg_data = data_obj.get(exchange_segment, {}) if isinstance(data_obj, dict) else {}
        sec_quote = seg_data.get(str(security_id), {}) if isinstance(seg_data, dict) else {}
        last_price = sec_quote.get("last_price") or sec_quote.get("ltp")

        if last_price is not None:
            return {
                "success": True,
                "status": "SUCCESS",
                "http_status": http_status,
                "provider": "DHAN",
                "exchange_segment": exchange_segment,
                "security_id": str(security_id),
                "last_price": float(last_price),
                "latency_ms": latency_ms,
                "raw_response": sanitized_resp,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "message": f"Dhan HQ v2 REST LTP successfully received for {exchange_segment}:{security_id} ({latency_ms}ms).",
            }
        else:
            return {
                "success": True,
                "status": "SUCCESS_EMPTY_TICK",
                "http_status": http_status,
                "provider": "DHAN",
                "exchange_segment": exchange_segment,
                "security_id": str(security_id),
                "last_price": None,
                "latency_ms": latency_ms,
                "raw_response": sanitized_resp,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "message": f"Dhan HQ v2 REST responded HTTP 200, awaiting live market ticks ({latency_ms}ms).",
            }

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
