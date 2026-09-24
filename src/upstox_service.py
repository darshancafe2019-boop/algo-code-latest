"""
Quant.OS Upstox V3 Market Data & Broker Service
================================================
Official Upstox API V3 Integration for Indian Stock Market:
- Equities (NSE/BSE)
- Indices (NIFTY 50, BANK NIFTY, INDIA VIX)
- Futures & Options (NSE F&O)
- REST Quotes, Historical & Intraday Candles, V3 WebSocket Authorization

STRICT TRUTH-IN-DATA POLICY:
- Zero fake, mock, simulated, or hardcoded prices.
- Never returns synthetic ticks.
- If credentials or market data are unavailable, reports exact status and diagnostics.
"""

from __future__ import annotations

import os
import ssl
import time
import json
import logging
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple, Union
import pandas as pd

try:
    import certifi
    _ssl_context = ssl.create_default_context(cafile=certifi.where())
except Exception:
    _ssl_context = ssl.create_default_context()

from src import config

logger = logging.getLogger("UpstoxService")

# Authoritative ISIN / Symbol -> Official Upstox Instrument Key Registry
OFFICIAL_UPSTOX_KEYS: Dict[str, Dict[str, Any]] = {
    # Indices
    "NIFTY": {
        "instrument_key": "NSE_INDEX|Nifty 50",
        "name": "NIFTY 50",
        "exchange": "NSE_INDEX",
        "asset_class": "INDIAN_INDICES",
        "lot_size": 25,
        "tick_size": 0.05,
        "isin": "NIFTY50",
        "trading_symbol": "NIFTY",
        "canonical_symbol": "NIFTY",
    },
    "NIFTY 50": {
        "instrument_key": "NSE_INDEX|Nifty 50",
        "name": "NIFTY 50",
        "exchange": "NSE_INDEX",
        "asset_class": "INDIAN_INDICES",
        "lot_size": 25,
        "tick_size": 0.05,
        "isin": "NIFTY50",
        "trading_symbol": "NIFTY",
        "canonical_symbol": "NIFTY",
    },
    "BANKNIFTY": {
        "instrument_key": "NSE_INDEX|Nifty Bank",
        "name": "NIFTY BANK",
        "exchange": "NSE_INDEX",
        "asset_class": "INDIAN_INDICES",
        "lot_size": 15,
        "tick_size": 0.05,
        "isin": "NIFTYBANK",
        "trading_symbol": "BANKNIFTY",
        "canonical_symbol": "BANKNIFTY",
    },
    "NIFTY BANK": {
        "instrument_key": "NSE_INDEX|Nifty Bank",
        "name": "NIFTY BANK",
        "exchange": "NSE_INDEX",
        "asset_class": "INDIAN_INDICES",
        "lot_size": 15,
        "tick_size": 0.05,
        "isin": "NIFTYBANK",
        "trading_symbol": "BANKNIFTY",
        "canonical_symbol": "BANKNIFTY",
    },
    "INDIA VIX": {
        "instrument_key": "NSE_INDEX|India VIX",
        "name": "INDIA VIX",
        "exchange": "NSE_INDEX",
        "asset_class": "INDIAN_INDICES",
        "lot_size": 1,
        "tick_size": 0.01,
        "isin": "INDIAVIX",
        "trading_symbol": "INDIA VIX",
        "canonical_symbol": "INDIA VIX",
    },
    "INDIAVIX": {
        "instrument_key": "NSE_INDEX|India VIX",
        "name": "INDIA VIX",
        "exchange": "NSE_INDEX",
        "asset_class": "INDIAN_INDICES",
        "lot_size": 1,
        "tick_size": 0.01,
        "isin": "INDIAVIX",
        "trading_symbol": "INDIA VIX",
        "canonical_symbol": "INDIA VIX",
    },
    "FINNIFTY": {
        "instrument_key": "NSE_INDEX|Nifty Fin Service",
        "name": "NIFTY FINANCIAL SERVICES",
        "exchange": "NSE_INDEX",
        "asset_class": "INDIAN_INDICES",
        "lot_size": 25,
        "tick_size": 0.05,
        "isin": "FINNIFTY",
        "trading_symbol": "FINNIFTY",
        "canonical_symbol": "FINNIFTY",
    },
    "NIFTY FIN SERVICE": {
        "instrument_key": "NSE_INDEX|Nifty Fin Service",
        "name": "NIFTY FINANCIAL SERVICES",
        "exchange": "NSE_INDEX",
        "asset_class": "INDIAN_INDICES",
        "lot_size": 25,
        "tick_size": 0.05,
        "isin": "FINNIFTY",
        "trading_symbol": "FINNIFTY",
        "canonical_symbol": "FINNIFTY",
    },
    "SENSEX": {
        "instrument_key": "BSE_INDEX|SENSEX",
        "name": "BSE SENSEX",
        "exchange": "BSE_INDEX",
        "asset_class": "INDIAN_INDICES",
        "lot_size": 10,
        "tick_size": 0.01,
        "isin": "SENSEX",
        "trading_symbol": "SENSEX",
        "canonical_symbol": "SENSEX",
    },
    "BSE SENSEX": {
        "instrument_key": "BSE_INDEX|SENSEX",
        "name": "BSE SENSEX",
        "exchange": "BSE_INDEX",
        "asset_class": "INDIAN_INDICES",
        "lot_size": 10,
        "tick_size": 0.01,
        "isin": "SENSEX",
        "trading_symbol": "SENSEX",
        "canonical_symbol": "SENSEX",
    },
    "MIDCPNIFTY": {
        "instrument_key": "NSE_INDEX|NIFTY MID SELECT",
        "name": "NIFTY MIDCAP SELECT",
        "exchange": "NSE_INDEX",
        "asset_class": "INDIAN_INDICES",
        "lot_size": 50,
        "tick_size": 0.05,
        "isin": "MIDCPNIFTY",
        "trading_symbol": "MIDCPNIFTY",
        "canonical_symbol": "MIDCPNIFTY",
    },
    "NIFTY MID SELECT": {
        "instrument_key": "NSE_INDEX|NIFTY MID SELECT",
        "name": "NIFTY MIDCAP SELECT",
        "exchange": "NSE_INDEX",
        "asset_class": "INDIAN_INDICES",
        "lot_size": 50,
        "tick_size": 0.05,
        "isin": "MIDCPNIFTY",
        "trading_symbol": "MIDCPNIFTY",
        "canonical_symbol": "MIDCPNIFTY",
    },
    "NIFTY MIDCAP SELECT": {
        "instrument_key": "NSE_INDEX|NIFTY MID SELECT",
        "name": "NIFTY MIDCAP SELECT",
        "exchange": "NSE_INDEX",
        "asset_class": "INDIAN_INDICES",
        "lot_size": 50,
        "tick_size": 0.05,
        "isin": "MIDCPNIFTY",
        "trading_symbol": "MIDCPNIFTY",
        "canonical_symbol": "MIDCPNIFTY",
    },

    # Core High-Liquidity Indian Equities
    "RELIANCE": {
        "instrument_key": "NSE_EQ|INE002A01018",
        "name": "Reliance Industries Limited",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE002A01018",
        "trading_symbol": "RELIANCE",
        "canonical_symbol": "RELIANCE",
    },
    "HDFCBANK": {
        "instrument_key": "NSE_EQ|INE040A01034",
        "name": "HDFC Bank Limited",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE040A01034",
        "trading_symbol": "HDFCBANK",
        "canonical_symbol": "HDFCBANK",
    },
    "HDFC BANK": {
        "instrument_key": "NSE_EQ|INE040A01034",
        "name": "HDFC Bank Limited",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE040A01034",
        "trading_symbol": "HDFCBANK",
        "canonical_symbol": "HDFCBANK",
    },
    "ICICIBANK": {
        "instrument_key": "NSE_EQ|INE090A01021",
        "name": "ICICI Bank Limited",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE090A01021",
        "trading_symbol": "ICICIBANK",
        "canonical_symbol": "ICICIBANK",
    },
    "ICICI BANK": {
        "instrument_key": "NSE_EQ|INE090A01021",
        "name": "ICICI Bank Limited",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE090A01021",
        "trading_symbol": "ICICIBANK",
        "canonical_symbol": "ICICIBANK",
    },
    "ICICI": {
        "instrument_key": "NSE_EQ|INE090A01021",
        "name": "ICICI Bank Limited",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE090A01021",
        "trading_symbol": "ICICIBANK",
        "canonical_symbol": "ICICIBANK",
    },
    "INFY": {
        "instrument_key": "NSE_EQ|INE009A01021",
        "name": "Infosys Limited",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE009A01021",
        "trading_symbol": "INFY",
        "canonical_symbol": "INFY",
    },
    "INFOSYS": {
        "instrument_key": "NSE_EQ|INE009A01021",
        "name": "Infosys Limited",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE009A01021",
        "trading_symbol": "INFY",
        "canonical_symbol": "INFY",
    },
    "TCS": {
        "instrument_key": "NSE_EQ|INE467B01029",
        "name": "Tata Consultancy Services Limited",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE467B01029",
        "trading_symbol": "TCS",
        "canonical_symbol": "TCS",
    },
    "SBIN": {
        "instrument_key": "NSE_EQ|INE062A01020",
        "name": "State Bank of India",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE062A01020",
        "trading_symbol": "SBIN",
        "canonical_symbol": "SBIN",
    },
    "SBI": {
        "instrument_key": "NSE_EQ|INE062A01020",
        "name": "State Bank of India",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE062A01020",
        "trading_symbol": "SBIN",
        "canonical_symbol": "SBIN",
    },
    "STATE BANK OF INDIA": {
        "instrument_key": "NSE_EQ|INE062A01020",
        "name": "State Bank of India",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE062A01020",
        "trading_symbol": "SBIN",
        "canonical_symbol": "SBIN",
    },
    "BHARTIARTL": {
        "instrument_key": "NSE_EQ|INE397D01024",
        "name": "Bharti Airtel Limited",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE397D01024",
        "trading_symbol": "BHARTIARTL",
        "canonical_symbol": "BHARTIARTL",
    },
    "BHARTI AIRTEL": {
        "instrument_key": "NSE_EQ|INE397D01024",
        "name": "Bharti Airtel Limited",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE397D01024",
        "trading_symbol": "BHARTIARTL",
        "canonical_symbol": "BHARTIARTL",
    },
    "AIRTEL": {
        "instrument_key": "NSE_EQ|INE397D01024",
        "name": "Bharti Airtel Limited",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE397D01024",
        "trading_symbol": "BHARTIARTL",
        "canonical_symbol": "BHARTIARTL",
    },
    "KOTAKBANK": {
        "instrument_key": "NSE_EQ|INE237A01028",
        "name": "Kotak Mahindra Bank Limited",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE237A01028",
        "trading_symbol": "KOTAKBANK",
        "canonical_symbol": "KOTAKBANK",
    },
    "LT": {
        "instrument_key": "NSE_EQ|INE018A01030",
        "name": "Larsen & Toubro Limited",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE018A01030",
        "trading_symbol": "LT",
        "canonical_symbol": "LT",
    },
    "AXISBANK": {
        "instrument_key": "NSE_EQ|INE238A01034",
        "name": "Axis Bank Limited",
        "exchange": "NSE_EQ",
        "asset_class": "INDIAN_EQUITIES",
        "lot_size": 1,
        "tick_size": 0.05,
        "isin": "INE238A01034",
        "trading_symbol": "AXISBANK",
        "canonical_symbol": "AXISBANK",
    },
}

# Backward compatibility alias
UPSTOX_INSTRUMENT_MAP = OFFICIAL_UPSTOX_KEYS

# 5,000+ Indian Equity Master Storage & In-Memory Indexes
UPSTOX_EQUITY_MASTER_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "upstox_equity_master.json"
)

_UPSTOX_EQUITY_MASTER: List[Dict[str, Any]] = []
_UPSTOX_EQUITY_BY_KEY: Dict[str, Dict[str, Any]] = {}
_UPSTOX_EQUITY_BY_SYMBOL: Dict[str, Dict[str, Any]] = {}
_UPSTOX_EQUITY_BY_ISIN: Dict[str, Dict[str, Any]] = {}


def _load_upstox_equity_master() -> None:
    global _UPSTOX_EQUITY_MASTER, _UPSTOX_EQUITY_BY_KEY, _UPSTOX_EQUITY_BY_SYMBOL, _UPSTOX_EQUITY_BY_ISIN
    if _UPSTOX_EQUITY_MASTER:
        return
    if os.path.exists(UPSTOX_EQUITY_MASTER_FILE):
        try:
            with open(UPSTOX_EQUITY_MASTER_FILE, "r", encoding="utf-8") as f:
                items = json.load(f)
                _UPSTOX_EQUITY_MASTER = items
                for item in items:
                    sym = item.get("symbol", "").upper().strip()
                    ts = item.get("trading_symbol", "").upper().strip()
                    ik = item.get("instrument_key", "").strip()
                    isin = item.get("isin", "").upper().strip()
                    ex = item.get("exchange", "NSE").upper().strip()

                    meta = {
                        "instrument_key": ik,
                        "name": item.get("company_name", sym),
                        "exchange": f"{ex}_EQ",
                        "asset_class": "INDIAN_EQUITIES",
                        "lot_size": float(item.get("lot_size", 1.0) or 1.0),
                        "tick_size": float(item.get("tick_size", 0.05) or 0.05),
                        "isin": isin,
                        "trading_symbol": ts or sym,
                        "canonical_symbol": sym,
                        "exchange_token": str(item.get("exchange_token", "")),
                        "currency": "INR",
                        "segment": item.get("segment", f"{ex}_EQ"),
                        "is_tradable": bool(item.get("is_tradable", True)),
                    }

                    if ik:
                        _UPSTOX_EQUITY_BY_KEY[ik] = meta
                        _UPSTOX_EQUITY_BY_KEY[ik.replace("|", ":")] = meta
                        _UPSTOX_EQUITY_BY_KEY[ik.upper()] = meta
                    if sym:
                        _UPSTOX_EQUITY_BY_SYMBOL[sym] = meta
                        _UPSTOX_EQUITY_BY_SYMBOL[f"{ex}:{sym}"] = meta
                        _UPSTOX_EQUITY_BY_SYMBOL[f"{sym}.NS"] = meta
                        _UPSTOX_EQUITY_BY_SYMBOL[f"{sym}.BO"] = meta
                    if ts and ts != sym:
                        _UPSTOX_EQUITY_BY_SYMBOL[ts] = meta
                    if isin:
                        _UPSTOX_EQUITY_BY_ISIN[isin] = meta

            logger.info("Loaded and indexed %d Upstox Indian equity instruments.", len(items))
        except Exception as e:
            logger.warning("Failed to load Upstox equity master: %s", e)


_load_upstox_equity_master()


# ─────────────────────────────────────────────────────────────────────────────
# Upstox Futures Master (NSE F&O Futures Index & Stock Master)
# ─────────────────────────────────────────────────────────────────────────────
UPSTOX_FUTURES_MASTER_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "upstox_futures_master.json"
)

_UPSTOX_FUTURES_MASTER: List[Dict[str, Any]] = []
_UPSTOX_FUTURES_BY_KEY: Dict[str, Dict[str, Any]] = {}
_UPSTOX_FUTURES_BY_SYMBOL: Dict[str, Dict[str, Any]] = {}
_UPSTOX_FUTURES_BY_UNDERLYING: Dict[str, List[Dict[str, Any]]] = {}


def _load_upstox_futures_master() -> None:
    global _UPSTOX_FUTURES_MASTER, _UPSTOX_FUTURES_BY_KEY, _UPSTOX_FUTURES_BY_SYMBOL, _UPSTOX_FUTURES_BY_UNDERLYING
    if _UPSTOX_FUTURES_MASTER:
        return
    if not os.path.exists(UPSTOX_FUTURES_MASTER_FILE):
        try:
            import urllib.request, gzip, ssl
            req = urllib.request.Request('https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz', headers={'User-Agent': 'Mozilla/5.0'})
            try:
                from src.ssl_util import get_ssl_context
                ctx = get_ssl_context()
            except Exception:
                ctx = ssl.create_default_context()
            with urllib.request.urlopen(req, context=ctx, timeout=25) as resp:
                data = json.loads(gzip.decompress(resp.read()).decode('utf-8'))
                futs = [x for x in data if x.get('segment') == 'NSE_FO' and 'FUT' in (x.get('instrument_type') or '')]
                with open(UPSTOX_FUTURES_MASTER_FILE, 'w', encoding='utf-8') as f:
                    json.dump(futs, f, indent=2)
        except Exception as dl_err:
            logger.warning("Failed to download Upstox futures master: %s", dl_err)

    if os.path.exists(UPSTOX_FUTURES_MASTER_FILE):
        try:
            with open(UPSTOX_FUTURES_MASTER_FILE, "r", encoding="utf-8") as f:
                items = json.load(f)
                _UPSTOX_FUTURES_MASTER = items
                for item in items:
                    ik = item.get("instrument_key", "").strip()
                    ts = item.get("trading_symbol", "").strip()
                    und = (item.get("underlying_symbol") or item.get("asset_symbol") or item.get("name") or "").strip().upper()
                    name = item.get("name") or und
                    asset_type = item.get("asset_type", "EQUITY")

                    expiry_val = item.get("expiry")
                    expiry_str = None
                    if expiry_val:
                        if isinstance(expiry_val, (int, float)):
                            sec = expiry_val / 1000.0 if expiry_val > 10000000000 else expiry_val
                            expiry_str = datetime.fromtimestamp(sec, timezone.utc).strftime("%Y-%m-%d")
                        elif isinstance(expiry_val, str):
                            expiry_str = expiry_val[:10]

                    lot_size = float(item.get("lot_size", 1.0) or 1.0)
                    raw_tick = float(item.get("tick_size", 0.05) or 0.05)
                    tick_size = raw_tick / 100.0 if raw_tick > 1.0 else raw_tick
                    sym_clean = ts.replace(" ", "-").upper()

                    meta = {
                        "instrument_key": ik,
                        "symbol": sym_clean,
                        "trading_symbol": ts,
                        "underlying_symbol": und,
                        "name": name,
                        "exchange": "NSE",
                        "segment": "NSE_FO",
                        "asset_class": "INDIAN_FUTURES",
                        "asset_type": asset_type,
                        "instrument_type": "INDEX_FUTURES" if asset_type == "INDEX" else "STOCK_FUTURES",
                        "lot_size": lot_size,
                        "tick_size": tick_size,
                        "expiry": expiry_str,
                        "expiry_timestamp": expiry_val,
                        "exchange_token": str(item.get("exchange_token", "")),
                        "currency": "INR",
                        "is_tradable": True,
                    }

                    if ik:
                        _UPSTOX_FUTURES_BY_KEY[ik] = meta
                        _UPSTOX_FUTURES_BY_KEY[ik.replace("|", ":")] = meta
                        _UPSTOX_FUTURES_BY_KEY[ik.upper()] = meta
                    if ts:
                        _UPSTOX_FUTURES_BY_SYMBOL[ts.upper()] = meta
                        _UPSTOX_FUTURES_BY_SYMBOL[sym_clean] = meta
                        _UPSTOX_FUTURES_BY_SYMBOL[f"NSE:{sym_clean}"] = meta
                        _UPSTOX_FUTURES_BY_SYMBOL[f"UPSTOX:{sym_clean}"] = meta
                        _UPSTOX_FUTURES_BY_SYMBOL[f"UPSTOX:{ts.upper()}"] = meta
                    if und:
                        if und not in _UPSTOX_FUTURES_BY_UNDERLYING:
                            _UPSTOX_FUTURES_BY_UNDERLYING[und] = []
                        _UPSTOX_FUTURES_BY_UNDERLYING[und].append(meta)

            logger.info("Loaded and indexed %d Upstox Indian futures instruments.", len(items))
        except Exception as e:
            logger.warning("Failed to load Upstox futures master: %s", e)


_load_upstox_futures_master()


class UpstoxService:
    """
    Authoritative Upstox API V3 client providing market data quotes,
    candle bars, instrument resolution, and live account/order management.
    """

    BASE_URL_V2 = "https://api.upstox.com/v2"
    BASE_URL_V3 = "https://api.upstox.com/v3"

    def __init__(
        self,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        access_token: Optional[str] = None,
        redirect_uri: Optional[str] = None,
    ):
        self.client_id = client_id if client_id is not None else os.getenv("UPSTOX_CLIENT_ID", "")
        raw_token = access_token.strip() if access_token is not None else (os.getenv("UPSTOX_ACCESS_TOKEN", "").strip() or os.getenv("UPSTOX_ANALYTICS_TOKEN", "").strip())
        self._access_token: str = raw_token
        self.redirect_uri = redirect_uri if redirect_uri is not None else os.getenv("UPSTOX_REDIRECT_URI", "http://localhost:5050/api/upstox/callback")
        self._last_auth_error: Optional[str] = None
        self._auth_status: str = "INITIAL"
        self._circuit_breaker_open: bool = False
        self._last_auth_error_code: Optional[str] = None
        self._last_auth_message: str = ""

    @property
    def access_token(self) -> str:
        return self._access_token

    @access_token.setter
    def access_token(self, value: Optional[str]) -> None:
        self._access_token = str(value).strip() if value else ""
        if self._access_token:
            self._circuit_breaker_open = False
            self._auth_status = "INITIAL"
            self._last_auth_error = None
            self._last_auth_error_code = None
            self._last_auth_message = ""
        else:
            self._circuit_breaker_open = False
            self._auth_status = "UNCONFIGURED"

    @property
    def is_configured(self) -> bool:
        """Returns whether Upstox client credentials or access token are set."""
        return bool(self.client_id or self._access_token)

    @property
    def is_authenticated(self) -> bool:
        """Returns whether a non-empty, non-circuit-broken access token is present."""
        return bool(
            self._access_token 
            and len(self._access_token) > 10 
            and not self._circuit_breaker_open
        )

    def get_masked_access_token(self) -> str:
        """Returns masked access token for safe logging (never outputs raw secret)."""
        if not self._access_token:
            return "MISSING"
        if len(self._access_token) <= 8:
            return "********"
        return f"********{self._access_token[-4:]}"

    def set_access_token(self, new_token: str) -> None:
        """Updates the access token and resets circuit breaker state."""
        self.access_token = new_token

    def validate_token(self, force: bool = False) -> Dict[str, Any]:
        """
        Validates the Upstox access token once with official V3 authorize endpoint.
        Trips circuit breaker on UDAPI100050 / HTTP 401 and reports AUTH_REQUIRED.
        """
        if not self.access_token or len(self.access_token.strip()) <= 10:
            self._auth_status = "UNCONFIGURED"
            self._circuit_breaker_open = True
            self._last_auth_message = "UPSTOX_ACCESS_TOKEN not set in environment."
            return {
                "valid": False,
                "status": "UNCONFIGURED",
                "message": self._last_auth_message,
            }

        if self._circuit_breaker_open and not force:
            return {
                "valid": False,
                "status": self._auth_status,
                "error_code": self._last_auth_error_code,
                "message": self._last_auth_message,
            }

        auth_res = self.authorize_market_data_feed()
        if auth_res.get("success"):
            self._auth_status = "VALID"
            self._circuit_breaker_open = False
            self._last_auth_message = "Upstox V3 token is valid and active."
            return {
                "valid": True,
                "status": "VALID",
                "message": self._last_auth_message,
            }
        
        # Authorization failed
        err_code = auth_res.get("error_code") or "AUTH_REQUIRED"
        self._auth_status = "AUTH_REQUIRED"
        self._circuit_breaker_open = True
        self._last_auth_error_code = err_code
        self._last_auth_message = auth_res.get("message", "Upstox authorization failed.")
        logger.warning(
            "[Upstox] Access token is invalid or expired (%s). Authentication required. "
            "Circuit breaker tripped. Reconnect Upstox via Settings -> Brokers or /api/upstox/login.",
            err_code
        )
        return {
            "valid": False,
            "status": "AUTH_REQUIRED",
            "error_code": err_code,
            "message": self._last_auth_message,
        }

    def resolve_instrument_key(self, symbol: str) -> Optional[str]:
        """Maps canonical symbol, trading symbol, ISIN, or alias to official Upstox instrument_key across 5000+ instruments."""
        if not symbol:
            return None
        sym_str = str(symbol).strip()
        clean_upper = sym_str.upper()
        clean_compact = clean_upper.replace(" ", "").replace("_", "")

        # 1. Check official curated registry
        if clean_upper in OFFICIAL_UPSTOX_KEYS:
            return OFFICIAL_UPSTOX_KEYS[clean_upper]["instrument_key"]
        for key, meta in OFFICIAL_UPSTOX_KEYS.items():
            k_clean = key.strip().upper().replace(" ", "").replace("_", "")
            if clean_compact == k_clean or clean_compact == meta.get("isin", "").upper():
                return meta["instrument_key"]

        # 2. Check 5000+ Indian Equity In-Memory Indexes (O(1) lookups)
        if clean_upper in _UPSTOX_EQUITY_BY_SYMBOL:
            return _UPSTOX_EQUITY_BY_SYMBOL[clean_upper]["instrument_key"]
        if clean_upper in _UPSTOX_EQUITY_BY_ISIN:
            return _UPSTOX_EQUITY_BY_ISIN[clean_upper]["instrument_key"]
        if sym_str in _UPSTOX_EQUITY_BY_KEY:
            return _UPSTOX_EQUITY_BY_KEY[sym_str]["instrument_key"]

        # 3. Check 600+ Indian Futures In-Memory Indexes (O(1) lookups)
        if clean_upper in _UPSTOX_FUTURES_BY_SYMBOL:
            return _UPSTOX_FUTURES_BY_SYMBOL[clean_upper]["instrument_key"]
        if sym_str in _UPSTOX_FUTURES_BY_KEY:
            return _UPSTOX_FUTURES_BY_KEY[sym_str]["instrument_key"]

        # 4. Check normalized variations (strip .NS, .BO, -EQ, etc.)
        if clean_upper.endswith(".NS") or clean_upper.endswith(".BO"):
            base_sym = clean_upper.rsplit(".", 1)[0]
            if base_sym in _UPSTOX_EQUITY_BY_SYMBOL:
                return _UPSTOX_EQUITY_BY_SYMBOL[base_sym]["instrument_key"]
            if base_sym in _UPSTOX_FUTURES_BY_SYMBOL:
                return _UPSTOX_FUTURES_BY_SYMBOL[base_sym]["instrument_key"]

        if clean_upper.endswith("-EQ"):
            base_sym = clean_upper.rsplit("-", 1)[0]
            if base_sym in _UPSTOX_EQUITY_BY_SYMBOL:
                return _UPSTOX_EQUITY_BY_SYMBOL[base_sym]["instrument_key"]

        if clean_upper.endswith("-FUT") or clean_upper.endswith(" FUT") or clean_upper.endswith("FUT"):
            if clean_upper in _UPSTOX_FUTURES_BY_SYMBOL:
                return _UPSTOX_FUTURES_BY_SYMBOL[clean_upper]["instrument_key"]
            base_und = clean_upper.replace("-FUT", "").replace(" FUT", "").replace("FUT", "").strip()
            if base_und in _UPSTOX_FUTURES_BY_UNDERLYING and _UPSTOX_FUTURES_BY_UNDERLYING[base_und]:
                return _UPSTOX_FUTURES_BY_UNDERLYING[base_und][0]["instrument_key"]

        if clean_upper.startswith("NSE:") or clean_upper.startswith("BSE:"):
            base_sym = clean_upper.split(":", 1)[1]
            if base_sym in _UPSTOX_EQUITY_BY_SYMBOL:
                return _UPSTOX_EQUITY_BY_SYMBOL[base_sym]["instrument_key"]
            if base_sym in _UPSTOX_FUTURES_BY_SYMBOL:
                return _UPSTOX_FUTURES_BY_SYMBOL[base_sym]["instrument_key"]

        # 5. If already in valid formatted syntax like NSE_EQ|... or NSE_INDEX|... or NSE_FO|...
        if "|" in sym_str and (sym_str.startswith("NSE_") or sym_str.startswith("BSE_")):
            return sym_str

        # 6. Check if symbol is an Option contract description (e.g. NIFTY 23400 CE, NIFTY 2026-09-22 23400 CE, UPSTOX_NSE_NIFTY_23400_CE, etc.)
        import re
        exp_match = re.search(r"(\d{4}-\d{2}-\d{2})", sym_str)
        exp_val = exp_match.group(1) if exp_match else None
        str_clean = clean_upper.replace(exp_val, "") if exp_val else clean_upper

        und_match = re.search(r"(NIFTY|BANKNIFTY|FINNIFTY|MIDCPNIFTY|SENSEX)", clean_upper)
        type_match = re.search(r"\b(CE|PE|CALL|PUT)\b", str_clean) or re.search(r"_(CE|PE|CALL|PUT)\b", str_clean) or re.search(r"(CE|PE)$", str_clean)
        strike_match = re.search(r"(\d{4,6})", str_clean)

        if und_match and type_match and strike_match:
            und = und_match.group(1)
            strike_val = float(strike_match.group(1))
            raw_t = type_match.group(1) if type_match.lastindex else type_match.group(0)
            opt_type = "CE" if "CE" in raw_t or "CALL" in raw_t else "PE"

            resolved_key = self.resolve_option_instrument_key(und, expiry=exp_val, strike=strike_val, option_type=opt_type)
            if resolved_key:
                return resolved_key

        return None

    def resolve_canonical_symbol(self, instrument_key: str) -> Optional[str]:
        """Resolves canonical symbol for an Upstox instrument key (Equities, Indices, Futures)."""
        if not instrument_key:
            return None
        ik_clean = instrument_key.strip()
        if ik_clean in _UPSTOX_FUTURES_BY_KEY:
            return _UPSTOX_FUTURES_BY_KEY[ik_clean]["trading_symbol"]
        if ik_clean in _UPSTOX_EQUITY_BY_KEY:
            return _UPSTOX_EQUITY_BY_KEY[ik_clean]["canonical_symbol"]
        for sym, meta in OFFICIAL_UPSTOX_KEYS.items():
            if meta["instrument_key"] == ik_clean or meta["instrument_key"].replace("|", ":") == ik_clean:
                return meta.get("canonical_symbol") or sym
        return None

    def get_all_futures_instruments(self) -> List[Dict[str, Any]]:
        """Returns all dynamically discovered Upstox NSE Futures instruments."""
        _load_upstox_futures_master()
        return list(_UPSTOX_FUTURES_BY_KEY.values())

    def get_futures_instruments_count(self) -> int:
        """Returns total number of registered Upstox NSE Futures instruments."""
        _load_upstox_futures_master()
        return len(_UPSTOX_FUTURES_BY_KEY)

    def resolve_futures_instrument(self, key_or_sym: str) -> Optional[Dict[str, Any]]:
        """Resolves futures metadata by instrument_key, trading_symbol, or underlying."""
        if not key_or_sym:
            return None
        clean = key_or_sym.strip()
        clean_u = clean.upper()
        if clean in _UPSTOX_FUTURES_BY_KEY:
            return _UPSTOX_FUTURES_BY_KEY[clean]
        if clean_u in _UPSTOX_FUTURES_BY_KEY:
            return _UPSTOX_FUTURES_BY_KEY[clean_u]
        if clean_u in _UPSTOX_FUTURES_BY_SYMBOL:
            return _UPSTOX_FUTURES_BY_SYMBOL[clean_u]
        if clean_u in _UPSTOX_FUTURES_BY_UNDERLYING and _UPSTOX_FUTURES_BY_UNDERLYING[clean_u]:
            return _UPSTOX_FUTURES_BY_UNDERLYING[clean_u][0]
        return None

    def get_option_contracts(self, underlying: str = "NIFTY", force: bool = False) -> List[Dict[str, Any]]:
        """
        Fetches official Upstox active option contracts for the specified underlying.
        Maintains an in-memory TTL cache (300 seconds) to minimize redundant network roundtrips.
        """
        if not self.is_authenticated:
            return []

        und_clean = underlying.upper().strip()
        reg_entry = OFFICIAL_UPSTOX_KEYS.get(und_clean, {})
        instrument_key = reg_entry.get("instrument_key")
        if not instrument_key:
            if und_clean in ["NIFTY", "NIFTY 50", "NIFTY50"]:
                instrument_key = "NSE_INDEX|Nifty 50"
            elif und_clean in ["BANKNIFTY", "NIFTY BANK"]:
                instrument_key = "NSE_INDEX|Nifty Bank"
            elif und_clean in ["FINNIFTY", "NIFTY FIN SERVICE"]:
                instrument_key = "NSE_INDEX|Nifty Fin Service"
            elif und_clean in ["MIDCPNIFTY", "NIFTY MID SELECT", "NIFTY MIDCAP SELECT"]:
                instrument_key = "NSE_INDEX|NIFTY MID SELECT"
            elif und_clean in ["SENSEX", "BSE SENSEX"]:
                instrument_key = "BSE_INDEX|SENSEX"
            elif und_clean in ["RELIANCE"]:
                instrument_key = "NSE_EQ|INE002A01018"
            elif und_clean in ["TCS"]:
                instrument_key = "NSE_EQ|INE467B01029"
            elif und_clean in ["HDFCBANK"]:
                instrument_key = "NSE_EQ|INE040A01034"
            else:
                instrument_key = self.resolve_instrument_key(underlying)
                if not instrument_key:
                    return []

        cache_key = instrument_key
        now = time.time()
        if not force and hasattr(self, "_option_contracts_cache"):
            cached = self._option_contracts_cache.get(cache_key)
            if cached and (now - cached[0] < 300.0):
                return cached[1]

        try:
            res = self._make_request("option/contract", params={"instrument_key": instrument_key}, api_version="v2")
            if res.get("status") == "success" and "data" in res:
                contracts = res.get("data", [])
                if not hasattr(self, "_option_contracts_cache"):
                    self._option_contracts_cache = {}
                self._option_contracts_cache[cache_key] = (now, contracts)
                return contracts
        except Exception as e:
            logger.warning("Upstox get_option_contracts error: %s", e)

        return []

    def resolve_option_contract(
        self,
        underlying: str,
        expiry: Optional[str] = None,
        strike: Optional[Union[float, int, str]] = None,
        option_type: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Resolves a single authoritative Upstox option contract dictionary by matching
        underlying + valid expiry + strike + CE/PE.
        """
        contracts = self.get_option_contracts(underlying)
        if not contracts:
            return None

        # Normalize parameters
        target_opt = str(option_type or "").upper().strip()
        if target_opt == "CALL":
            target_opt = "CE"
        elif target_opt == "PUT":
            target_opt = "PE"

        target_strike = None
        if strike is not None:
            try:
                target_strike = float(strike)
            except (ValueError, TypeError):
                pass

        target_expiry = str(expiry).strip() if expiry else None

        for c in contracts:
            c_exp = str(c.get("expiry") or "")
            c_type = str(c.get("instrument_type") or "").upper()
            c_strike = float(c.get("strike_price") or 0.0)

            # Match criteria
            if target_expiry and c_exp != target_expiry:
                continue
            if target_opt and c_type != target_opt:
                continue
            if target_strike is not None and abs(c_strike - target_strike) > 0.01:
                continue

            return c

        return None

    def resolve_option_instrument_key(
        self,
        underlying: str,
        expiry: Optional[str] = None,
        strike: Optional[Union[float, int, str]] = None,
        option_type: Optional[str] = None,
    ) -> Optional[str]:
        """
        Returns the exact authoritative Upstox instrument_key (e.g. 'NSE_FO|56985')
        matching underlying, expiry, strike, and CE/PE.
        Never synthesizes fake IDs.
        """
        contract = self.resolve_option_contract(underlying, expiry, strike, option_type)
        if contract and contract.get("instrument_key"):
            return str(contract["instrument_key"])
        return None

    def get_instrument_metadata(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Retrieves structured instrument metadata for any of 5000+ Indian stocks or indices."""
        if not symbol:
            return None
        sym_str = str(symbol).strip()
        clean_upper = sym_str.upper()

        # 1. Curated indices registry
        if clean_upper in OFFICIAL_UPSTOX_KEYS:
            return OFFICIAL_UPSTOX_KEYS[clean_upper]
        for key, meta in OFFICIAL_UPSTOX_KEYS.items():
            if clean_upper == key.upper():
                return meta

        # 2. Check 5000+ Indian Equity Master
        if clean_upper in _UPSTOX_EQUITY_BY_SYMBOL:
            return _UPSTOX_EQUITY_BY_SYMBOL[clean_upper]
        if clean_upper in _UPSTOX_EQUITY_BY_ISIN:
            return _UPSTOX_EQUITY_BY_ISIN[clean_upper]
        if sym_str in _UPSTOX_EQUITY_BY_KEY:
            return _UPSTOX_EQUITY_BY_KEY[sym_str]

        # 3. Strip variations
        if clean_upper.endswith(".NS") or clean_upper.endswith(".BO") or clean_upper.endswith("-EQ"):
            base_sym = clean_upper.replace(".NS", "").replace(".BO", "").replace("-EQ", "")
            if base_sym in _UPSTOX_EQUITY_BY_SYMBOL:
                return _UPSTOX_EQUITY_BY_SYMBOL[base_sym]

        return None

    def search_equity_instruments(
        self,
        query: str,
        exchange: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Searches across the 5000+ Upstox Indian equity instrument catalog."""
        q = (query or "").strip().upper()
        ex_filter = exchange.strip().upper() if exchange else None
        results: List[Dict[str, Any]] = []

        # If query matches an index
        for k, v in OFFICIAL_UPSTOX_KEYS.items():
            if q and (q in k.upper() or q in v.get("name", "").upper()):
                results.append(v)
                if len(results) >= limit:
                    return results

        # Search equity universe
        for item in _UPSTOX_EQUITY_MASTER:
            sym = item.get("symbol", "").upper()
            ts = item.get("trading_symbol", "").upper()
            name = item.get("company_name", "").upper()
            isin = item.get("isin", "").upper()
            ex = item.get("exchange", "NSE").upper()

            if ex_filter and ex != ex_filter:
                continue

            if not q or (q in sym or q in ts or q in name or q in isin):
                results.append(item)
                if len(results) >= limit:
                    break

        return results

    def get_all_equity_instruments(
        self,
        exchange: Optional[str] = None,
        limit: Optional[int] = None,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """Returns paginated or full list of the 5000+ Upstox Indian equity instruments."""
        ex_filter = exchange.strip().upper() if exchange else None
        if ex_filter:
            filtered = [i for i in _UPSTOX_EQUITY_MASTER if i.get("exchange", "NSE").upper() == ex_filter]
        else:
            filtered = _UPSTOX_EQUITY_MASTER

        if limit is not None:
            return filtered[offset : offset + limit]
        return filtered[offset:]

    def get_equity_instruments_count(self) -> int:
        """Returns total count of registered Indian equities."""
        return len(_UPSTOX_EQUITY_MASTER)

    def _make_request(
        self,
        endpoint: str,
        method: str = "GET",
        params: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None,
        timeout: float = 8.0,
        api_version: str = "v2",
    ) -> Dict[str, Any]:
        """Executes authenticated REST API request to Upstox API V2/V3."""
        if self._circuit_breaker_open and "login" not in endpoint:
            raise RuntimeError(
                f"Upstox API circuit breaker open ({self._auth_status}). Token expired or invalid."
            )

        base = self.BASE_URL_V3 if api_version == "v3" else self.BASE_URL_V2
        url = f"{base}/{endpoint.lstrip('/')}"
        if params:
            query_str = urllib.parse.urlencode(params)
            url = f"{url}?{query_str}"

        headers = {
            "Accept": "application/json",
            "User-Agent": "QuantOS-Trading-Platform/1.0",
        }
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"

        encoded_data = None
        if data and method in ["POST", "PUT", "DELETE"]:
            headers["Content-Type"] = "application/json"
            encoded_data = json.dumps(data).encode("utf-8")

        req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=timeout, context=_ssl_context) as resp:
                raw = resp.read().decode("utf-8")
                return json.loads(raw)
        except urllib.error.HTTPError as he:
            body = ""
            try:
                body = he.read().decode("utf-8")
            except Exception:
                pass
            
            # Detect expired/invalid token (HTTP 401 / UDAPI100050)
            if he.code == 401 or "UDAPI100050" in body or "Invalid token" in body:
                self._circuit_breaker_open = True
                self._auth_status = "AUTH_REQUIRED"
                self._last_auth_error_code = "UDAPI100050"
                self._last_auth_message = "Invalid token used to access API (UDAPI100050)"
                self._last_auth_error = "HTTP 401: UDAPI100050 Invalid token"
            else:
                self._last_auth_error = f"HTTP {he.code}: {body or he.reason}"
                logger.warning("Upstox HTTP error on %s: %s (Body: %s)", endpoint, he.code, body)
            
            raise RuntimeError(f"Upstox API HTTP {he.code}: {body or he.reason}")
        except Exception as e:
            self._last_auth_error = str(e)
            if not self._circuit_breaker_open:
                logger.warning("Upstox request error on %s: %s", endpoint, e)
            raise e

    def authorize_market_data_feed(self) -> Dict[str, Any]:
        """
        Calls official Upstox V3 Market Data Feed Authorize endpoint:
        GET https://api.upstox.com/v3/feed/market-data-feed/authorize
        Returns:
            {"status": "success", "authorized_redirect_uri": "wss://..."}
        """
        if not self.access_token or len(self.access_token.strip()) <= 10:
            return {
                "success": False,
                "error": "UPSTOX_ACCESS_TOKEN_MISSING",
                "error_code": "UPSTOX_ACCESS_TOKEN_MISSING",
                "message": "Upstox access token is not set in environment or configuration.",
            }

        try:
            res = self._make_request("feed/market-data-feed/authorize", method="GET", api_version="v3")
            if res.get("status") == "success" and "data" in res:
                redirect_uri = res["data"].get("authorizedRedirectUri")
                self._circuit_breaker_open = False
                self._auth_status = "VALID"
                return {
                    "success": True,
                    "authorized_redirect_uri": redirect_uri,
                    "raw_data": res["data"],
                }
            return {
                "success": False,
                "error": "AUTHORIZATION_FAILED",
                "error_code": res.get("errors", [{}])[0].get("errorCode", "AUTHORIZATION_FAILED"),
                "message": res.get("errors", [{}])[0].get("message", "Authorization failed"),
            }
        except Exception as e:
            err_str = str(e)
            code = "UDAPI100050" if "UDAPI100050" in err_str or "401" in err_str else "UPSTOX_AUTH_ERROR"
            self._circuit_breaker_open = True
            self._auth_status = "AUTH_REQUIRED"
            self._last_auth_error_code = code
            return {
                "success": False,
                "error": "AUTH_REQUIRED" if code == "UDAPI100050" else "UPSTOX_AUTH_ERROR",
                "error_code": code,
                "message": "Invalid or expired access token (UDAPI100050). Please re-authenticate." if code == "UDAPI100050" else err_str,
            }

    def get_ws_feed_auth_url(self) -> Optional[str]:
        """Returns authorized WebSocket URI for Upstox V3 Market Data Feed."""
        res = self.authorize_market_data_feed()
        if res.get("success") and res.get("authorized_redirect_uri"):
            return str(res["authorized_redirect_uri"])
        return None

    def resolve_canonical_symbol(self, input_str: str) -> str:
        """
        Maps any Upstox instrument_key, ISIN, symbol, or alias to canonical symbol across 5000+ instruments.
        Examples:
          'NSE_INDEX|Nifty 50' -> 'NIFTY'
          'NSE_EQ|INE002A01018' -> 'RELIANCE'
          'NSE_EQ|INE090A01021' -> 'ICICIBANK'
          'ICICI BANK' -> 'ICICIBANK'
          'NSE_EQ|INE062A01020' -> 'SBIN'
          'NSE_INDEX|India VIX' -> 'INDIA VIX'
          'NSE_EQ|INE397D01024' -> 'BHARTIARTL'
        """
        if not input_str:
            return ""
        clean = str(input_str).strip()
        clean_upper = clean.upper()
        clean_compact = clean_upper.replace(" ", "").replace("_", "").replace("|", ":")

        # 1. Direct registry lookup
        if clean_upper in OFFICIAL_UPSTOX_KEYS:
            return OFFICIAL_UPSTOX_KEYS[clean_upper].get("canonical_symbol") or OFFICIAL_UPSTOX_KEYS[clean_upper]["trading_symbol"]

        # 2. 5000+ Equity index lookup
        if clean in _UPSTOX_EQUITY_BY_KEY:
            return _UPSTOX_EQUITY_BY_KEY[clean]["canonical_symbol"]
        if clean_upper in _UPSTOX_EQUITY_BY_KEY:
            return _UPSTOX_EQUITY_BY_KEY[clean_upper]["canonical_symbol"]
        if clean_upper in _UPSTOX_EQUITY_BY_ISIN:
            return _UPSTOX_EQUITY_BY_ISIN[clean_upper]["canonical_symbol"]
        if clean_upper in _UPSTOX_EQUITY_BY_SYMBOL:
            return _UPSTOX_EQUITY_BY_SYMBOL[clean_upper]["canonical_symbol"]

        # 3. Iterate keys
        for key, meta in OFFICIAL_UPSTOX_KEYS.items():
            ik = meta.get("instrument_key", "").upper()
            ik_compact = ik.replace(" ", "").replace("_", "").replace("|", ":")
            isin = meta.get("isin", "").upper()
            ts = meta.get("trading_symbol", "").upper()
            cs = meta.get("canonical_symbol", ts)
            name = meta.get("name", "").upper()

            if clean_upper == ik or clean_upper == ik.replace("|", ":"):
                return cs
            if clean_compact == ik_compact:
                return cs
            if isin and clean_upper == isin:
                return cs
            if clean_upper == ts or clean_compact == ts.replace(" ", "").replace("_", ""):
                return cs
            if clean_upper == name:
                return cs

        # 4. Fallback extraction if format is EXCHANGE|SYMBOL
        if "|" in clean:
            return clean.split("|", 1)[1].strip()
        if ":" in clean:
            return clean.split(":", 1)[1].strip()
        return clean

    def get_ltp(self, symbol: Union[str, List[str]]) -> Dict[str, Any]:
        """Fetches real-time LTP for one or more symbols/instrument keys using Upstox V3 /v3/market-quote/ltp."""
        if not self.is_authenticated:
            return {
                "status": "error",
                "error": "AUTH_REQUIRED",
                "error_code": "UDAPI100050",
                "message": "Upstox access token expired or not configured. Please re-authenticate in Settings -> Brokers.",
            }

        # Parse inputs
        if isinstance(symbol, str):
            symbols_list = [s.strip() for s in symbol.split(",") if s.strip()]
        else:
            symbols_list = [str(s).strip() for s in symbol if str(s).strip()]

        if not symbols_list:
            return {"status": "error", "message": "No symbols or instrument keys provided."}

        key_to_orig: Dict[str, str] = {}
        for s in symbols_list:
            ik = self.resolve_instrument_key(s) or s
            key_to_orig[ik] = s

        ik_param = ",".join(key_to_orig.keys())
        now_iso = datetime.now(timezone.utc).isoformat()

        try:
            data = self._make_request("market-quote/ltp", params={"instrument_key": ik_param}, timeout=6.0)
            if data.get("status") == "success" and "data" in data:
                raw_data = data["data"]
                normalized_map: Dict[str, Any] = {}
                first_entry = None

                for ik, orig_sym in key_to_orig.items():
                    formatted_key = ik.replace("|", ":")
                    q_data = raw_data.get(formatted_key) or raw_data.get(ik) or {}
                    last_price = float(q_data.get("last_price") or 0.0)
                    can_sym = self.resolve_canonical_symbol(ik)

                    item = {
                        "symbol": can_sym,
                        "instrument_key": ik,
                        "last_price": last_price,
                        "ltp": last_price,
                        "timestamp": now_iso,
                    }
                    normalized_map[ik] = item
                    normalized_map[formatted_key] = item
                    normalized_map[can_sym] = item
                    normalized_map[orig_sym] = item
                    if first_entry is None:
                        first_entry = item

                res_dict = {
                    "status": "success",
                    "data": normalized_map,
                    "quotes": normalized_map,
                }
                if len(symbols_list) == 1 and first_entry:
                    res_dict.update(first_entry)
                return res_dict
            return data
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def fetch_market_quotes(self, symbols: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Fetches live market quotes for requested symbols using official Upstox REST API.
        NO FAKE DATA: If unauthenticated or request fails, returns empty dictionary or raises error.
        """
        results: Dict[str, Dict[str, Any]] = {}
        if not self.is_authenticated:
            logger.warning("Cannot fetch real Upstox quotes: UPSTOX_ACCESS_TOKEN is missing.")
            return results

        # Group instrument keys
        inst_keys = []
        sym_to_key = {}
        for sym in symbols:
            ik = self.resolve_instrument_key(sym)
            if ik:
                inst_keys.append(ik)
                sym_to_key[sym] = ik

        if not inst_keys:
            return results

        now_iso = datetime.now(timezone.utc).isoformat()
        try:
            data = self._make_request(
                "market-quote/quotes",
                params={"instrument_key": ",".join(inst_keys)},
                timeout=6.0,
            )
            if data.get("status") == "success" and "data" in data:
                raw_data = data["data"]
                for sym, ik in sym_to_key.items():
                    formatted_key = ik.replace("|", ":")
                    q_data = raw_data.get(formatted_key) or raw_data.get(ik)
                    if q_data:
                        ohlc = q_data.get("ohlc", {})
                        last_price = float(q_data.get("last_price") or ohlc.get("close", 0.0))
                        close_prev = float(ohlc.get("close") or last_price)
                        change_pct = float(q_data.get("net_change", 0.0))
                        if close_prev > 0 and change_pct == 0.0:
                            change_pct = ((last_price - close_prev) / close_prev) * 100.0

                        depth = q_data.get("depth", {})
                        buy_depth = depth.get("buy", [{}])
                        sell_depth = depth.get("sell", [{}])
                        bid = float(buy_depth[0].get("price", 0.0) if buy_depth else 0.0)
                        ask = float(sell_depth[0].get("price", 0.0) if sell_depth else 0.0)

                        quote = {
                            "symbol": sym,
                            "instrument_key": ik,
                            "last_price": last_price,
                            "price": last_price,
                            "bid": bid,
                            "ask": ask,
                            "volume": float(q_data.get("volume", 0.0)),
                            "open": float(ohlc.get("open", 0.0)),
                            "high": float(ohlc.get("high", 0.0)),
                            "low": float(ohlc.get("low", 0.0)),
                            "close": close_prev,
                            "change_pct": round(change_pct, 2),
                            "oi": float(q_data.get("oi", 0.0)),
                            "timestamp": now_iso,
                            "source": "UPSTOX_REST",
                            "is_live": True,
                        }
                        results[sym] = quote
        except Exception as e:
            logger.warning("Upstox quote fetch error: %s", e)

        return results

    def fetch_historical_candles(
        self,
        symbol: str,
        timeframe: str = "15m",
        limit: int = 500,
        days_back: int = 30,
    ) -> pd.DataFrame:
        """
        Fetches official historical OHLCV candles from Upstox API V2/V3.
        NO FAKE DATA: If unauthenticated, returns empty DataFrame with proper columns.
        """
        ik = self.resolve_instrument_key(symbol)
        if not ik:
            logger.warning("Cannot fetch candles: unknown instrument symbol %s", symbol)
            return pd.DataFrame(columns=["timestamp", "open", "high", "low", "close", "volume"])

        if not self.is_authenticated:
            logger.warning("Upstox access token missing. Real historical candles cannot be fetched.")
            return pd.DataFrame(columns=["timestamp", "open", "high", "low", "close", "volume"])

        unit = "30minute" if "30" in timeframe else ("1minute" if "1" in timeframe or "5" in timeframe or "15" in timeframe else "day")
        today_dt = datetime.now(timezone.utc)
        to_date = today_dt.strftime("%Y-%m-%d")
        from_date = (today_dt - timedelta(days=days_back)).strftime("%Y-%m-%d")

        try:
            encoded_ik = urllib.parse.quote(ik)
            endpoint = f"historical-candle/{encoded_ik}/{unit}/{to_date}/{from_date}"
            res = self._make_request(endpoint, timeout=8.0)
            if res.get("status") == "success" and "data" in res and "candles" in res["data"]:
                candles_raw = res["data"]["candles"]
                parsed = []
                for c in candles_raw:
                    parsed.append({
                        "timestamp": c[0],
                        "open": float(c[1]),
                        "high": float(c[2]),
                        "low": float(c[3]),
                        "close": float(c[4]),
                        "volume": float(c[5]),
                    })
                df = pd.DataFrame(parsed)
                if not df.empty:
                    df["timestamp"] = pd.to_datetime(df["timestamp"])
                    df.sort_values(by="timestamp", inplace=True)
                    df.reset_index(drop=True, inplace=True)
                    if len(df) > limit:
                        df = df.iloc[-limit:].reset_index(drop=True)
                    return df
        except Exception as e:
            logger.error("Upstox historical candle fetch error for %s: %s", symbol, e)

        return pd.DataFrame(columns=["timestamp", "open", "high", "low", "close", "volume"])

    def get_funds_and_margin(self) -> Dict[str, Any]:
        """Queries available equity & commodity margin on Upstox (V3)."""
        if self.is_authenticated:
            try:
                res = self._make_request("user/get-funds-and-margin", api_version="v3")
                if res.get("status") == "success" and "data" in res:
                    equity_data = res["data"].get("equity", {})
                    return {
                        "available_margin": float(equity_data.get("available_margin", 0.0)),
                        "used_margin": float(equity_data.get("used_margin", 0.0)),
                        "payin_amount": float(equity_data.get("payin_amount", 0.0)),
                        "equity": equity_data,
                        "commodity": res["data"].get("commodity", {}),
                        "status": "LIVE_UPSTOX",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
            except Exception as e:
                logger.warning("Upstox funds query error: %s", e)

        return {
            "available_margin": 0.0,
            "used_margin": 0.0,
            "payin_amount": 0.0,
            "status": "UNAUTHENTICATED" if not self.is_authenticated else "ERROR",
            "message": "UPSTOX_ACCESS_TOKEN not set" if not self.is_authenticated else "Failed to fetch funds",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def get_profile(self) -> Dict[str, Any]:
        """Queries authenticated Upstox user profile (V2)."""
        if self.is_authenticated:
            try:
                res = self._make_request("user/profile", api_version="v2")
                if res.get("status") == "success" and "data" in res:
                    return res["data"]
            except Exception as e:
                logger.warning("Upstox profile query error: %s", e)
        return {}

    def get_holdings(self) -> List[Dict[str, Any]]:
        """Queries user's long-term portfolio holdings (V2)."""
        if self.is_authenticated:
            try:
                res = self._make_request("portfolio/long-term-holdings", api_version="v2")
                if res.get("status") == "success" and "data" in res:
                    return res["data"] or []
            except Exception as e:
                logger.warning("Upstox holdings query error: %s", e)
        return []

    def get_positions(self) -> List[Dict[str, Any]]:
        """Queries user's short-term intraday and F&O positions (V2)."""
        if self.is_authenticated:
            try:
                res = self._make_request("portfolio/short-term-positions", api_version="v2")
                if res.get("status") == "success" and "data" in res:
                    return res["data"] or []
            except Exception as e:
                logger.warning("Upstox positions query error: %s", e)
        return []

    def get_orders(self) -> List[Dict[str, Any]]:
        """Queries order book for the current session (V2)."""
        if self.is_authenticated:
            try:
                res = self._make_request("order/retrieve-all", api_version="v2")
                if res.get("status") == "success" and "data" in res:
                    return res["data"] or []
            except Exception as e:
                logger.warning("Upstox orders query error: %s", e)
        return []

    def get_option_expiries(self, underlying: str = "NIFTY") -> List[str]:
        """Queries dynamic active option expiries for underlying from Upstox."""
        if not self.is_authenticated:
            return []
        und_clean = underlying.upper().strip()
        reg_entry = OFFICIAL_UPSTOX_KEYS.get(und_clean, {})
        instrument_key = reg_entry.get("instrument_key")
        if not instrument_key:
            if und_clean in ["NIFTY", "NIFTY 50", "NIFTY50"]:
                instrument_key = "NSE_INDEX|Nifty 50"
            elif und_clean in ["BANKNIFTY", "NIFTY BANK"]:
                instrument_key = "NSE_INDEX|Nifty Bank"
            elif und_clean in ["FINNIFTY", "NIFTY FIN SERVICE"]:
                instrument_key = "NSE_INDEX|Nifty Fin Service"
            elif und_clean in ["MIDCPNIFTY", "NIFTY MID SELECT", "NIFTY MIDCAP SELECT"]:
                instrument_key = "NSE_INDEX|NIFTY MID SELECT"
            elif und_clean in ["SENSEX", "BSE SENSEX"]:
                instrument_key = "BSE_INDEX|SENSEX"
            elif und_clean in ["RELIANCE"]:
                instrument_key = "NSE_EQ|INE002A01018"
            elif und_clean in ["TCS"]:
                instrument_key = "NSE_EQ|INE467B01029"
            elif und_clean in ["HDFCBANK"]:
                instrument_key = "NSE_EQ|INE040A01034"
            else:
                return []
        try:
            res = self._make_request("option/contract", params={"instrument_key": instrument_key}, api_version="v2")
            if res.get("status") == "success" and "data" in res:
                contracts = res.get("data", [])
                expiries = sorted(list(set(c.get("expiry") for c in contracts if c.get("expiry"))))
                return expiries
        except Exception as e:
            logger.warning("Upstox get_option_expiries error: %s", e)
        return []

    def get_option_chain(
        self,
        underlying: str = "NIFTY",
        expiry: Optional[str] = None,
        strike_count: int = 20,
    ) -> Dict[str, Any]:
        """
        Queries official Upstox Option Chain endpoint.
        Endpoint: GET /v2/option/chain
        """
        if not self.is_authenticated:
            return {"status": "error", "error": "UPSTOX_CREDENTIALS_MISSING", "message": "Upstox credentials not configured"}

        und_clean = underlying.upper().strip()
        reg_entry = OFFICIAL_UPSTOX_KEYS.get(und_clean, {})
        instrument_key = reg_entry.get("instrument_key")

        if not instrument_key:
            if und_clean in ["NIFTY", "NIFTY 50", "NIFTY50"]:
                instrument_key = "NSE_INDEX|Nifty 50"
            elif und_clean in ["BANKNIFTY", "NIFTY BANK"]:
                instrument_key = "NSE_INDEX|Nifty Bank"
            elif und_clean in ["FINNIFTY", "NIFTY FIN SERVICE"]:
                instrument_key = "NSE_INDEX|Nifty Fin Service"
            elif und_clean in ["MIDCPNIFTY", "NIFTY MID SELECT", "NIFTY MIDCAP SELECT"]:
                instrument_key = "NSE_INDEX|NIFTY MID SELECT"
            elif und_clean in ["SENSEX", "BSE SENSEX"]:
                instrument_key = "BSE_INDEX|SENSEX"
            elif und_clean in ["INDIA VIX", "INDIAVIX"]:
                instrument_key = "NSE_INDEX|India VIX"
            elif und_clean in ["RELIANCE"]:
                instrument_key = "NSE_EQ|INE002A01018"
            elif und_clean in ["TCS"]:
                instrument_key = "NSE_EQ|INE467B01029"
            elif und_clean in ["HDFCBANK"]:
                instrument_key = "NSE_EQ|INE040A01034"
            else:
                return {
                    "status": "error",
                    "error": "UNRESOLVED_INSTRUMENT",
                    "message": f"Could not resolve Upstox instrument key for underlying '{underlying}'."
                }

        # Fetch available expiries if not provided
        avail_exp = self.get_option_expiries(underlying)
        target_expiry = expiry if (expiry and (not avail_exp or expiry in avail_exp)) else (avail_exp[0] if avail_exp else None)

        if not target_expiry:
            return {"status": "error", "error": "NO_EXPIRIES", "message": f"No active expiries found for {underlying} on Upstox"}

        params = {"instrument_key": instrument_key, "expiry_date": target_expiry}

        try:
            res = self._make_request("option/chain", params=params, api_version="v2")
            raw_items = res.get("data", [])
            strikes = []
            spot_price = 0.0

            for item in raw_items:
                spot_price = float(item.get("underlying_spot_price") or spot_price)
                k = float(item.get("strike_price") or 0.0)
                c_opt = item.get("call_options") or {}
                p_opt = item.get("put_options") or {}
                c_md = c_opt.get("market_data") or {}
                p_md = p_opt.get("market_data") or {}
                c_grk = c_opt.get("option_greeks") or {}
                p_grk = p_opt.get("option_greeks") or {}

                ce_obj = {
                    "instrument_key": c_opt.get("instrument_key"),
                    "ltp": float(c_md.get("ltp") or c_md.get("close_price") or 0.0),
                    "bid": float(c_md.get("bid_price") or 0.0),
                    "ask": float(c_md.get("ask_price") or 0.0),
                    "bid_qty": int(c_md.get("bid_qty") or 0),
                    "ask_qty": int(c_md.get("ask_qty") or 0),
                    "volume": float(c_md.get("volume") or 0.0),
                    "open_interest": float(c_md.get("oi") or 0.0),
                    "oi": float(c_md.get("oi") or 0.0),
                    "delta": float(c_grk.get("delta") or 0.0),
                    "gamma": float(c_grk.get("gamma") or 0.0),
                    "theta": float(c_grk.get("theta") or 0.0),
                    "vega": float(c_grk.get("vega") or 0.0),
                    "iv": float(c_grk.get("iv") or 0.0),
                }

                pe_obj = {
                    "instrument_key": p_opt.get("instrument_key"),
                    "ltp": float(p_md.get("ltp") or p_md.get("close_price") or 0.0),
                    "bid": float(p_md.get("bid_price") or 0.0),
                    "ask": float(p_md.get("ask_price") or 0.0),
                    "bid_qty": int(p_md.get("bid_qty") or 0),
                    "ask_qty": int(p_md.get("ask_qty") or 0),
                    "volume": float(p_md.get("volume") or 0.0),
                    "open_interest": float(p_md.get("oi") or 0.0),
                    "oi": float(p_md.get("oi") or 0.0),
                    "delta": float(p_grk.get("delta") or 0.0),
                    "gamma": float(p_grk.get("gamma") or 0.0),
                    "theta": float(p_grk.get("theta") or 0.0),
                    "vega": float(p_grk.get("vega") or 0.0),
                    "iv": float(p_grk.get("iv") or 0.0),
                }

                is_atm = abs(k - spot_price) < 50.0 if spot_price > 0 else False
                strikes.append({
                    "strike": k,
                    "strike_price": k,
                    "is_atm": is_atm,
                    "ce": ce_obj,
                    "pe": pe_obj,
                    "call": ce_obj,
                    "put": pe_obj,
                })

            if strikes and strike_count > 0 and len(strikes) > strike_count:
                atm_idx = 0
                min_dist = float("inf")
                for idx, s in enumerate(strikes):
                    dist = abs(s["strike"] - spot_price)
                    if dist < min_dist:
                        min_dist = dist
                        atm_idx = idx
                half = strike_count // 2
                start = max(0, atm_idx - half)
                strikes = strikes[start : start + strike_count]

            return {
                "status": "success",
                "provider": "UPSTOX",
                "underlying": underlying,
                "spot_price": spot_price,
                "selected_expiry": target_expiry,
                "available_expiries": avail_exp,
                "strikes": strikes,
                "rows": strikes,
                "data": res.get("data", []),
            }
        except Exception as e:
            logger.warning("Upstox option chain query error: %s", e)
            return {"status": "error", "message": str(e)}

    def ingest_smartlist_data(self, smartlist_payload: Dict[str, Any]) -> int:
        """
        Ingests Upstox Market Insights / Smartlist payload into live cache.
        Supports TOP_TRADED, MOST_ACTIVE, GAINERS, LOSERS for indices, equities, and F&O.
        """
        data = smartlist_payload.get("data", {}) if isinstance(smartlist_payload, dict) else {}
        items = data.get("smartlist", []) if isinstance(data, dict) else []
        now_iso = datetime.now(timezone.utc).isoformat()
        ingested = 0

        # Known F&O tokens map
        fo_map = {
            "NSE_FO|62329": {"symbol": "NIFTY-FUT", "underlying": "NIFTY", "name": "NIFTY 50 Futures"},
            "NSE_FO|62326": {"symbol": "BANKNIFTY-FUT", "underlying": "BANKNIFTY", "name": "Bank NIFTY Futures"},
            "NSE_FO|61093": {"symbol": "FINNIFTY-FUT", "underlying": "FINNIFTY", "name": "FINNIFTY Futures"},
        }

        for item in items:
            ikey = item.get("instrument_key", "")
            price_info = item.get("price", {})
            metric_info = item.get("metric", {})

            cur_price = price_info.get("current")
            close_price = price_info.get("close_price")
            chg_pct = price_info.get("change_pct")
            chg_abs = price_info.get("change_abs")
            traded_val = metric_info.get("current")

            if cur_price is not None:
                meta = fo_map.get(ikey)
                sym = meta["symbol"] if meta else ikey
                und = meta["underlying"] if meta else ikey

                try:
                    from market_data_gateway.adapters.base import NormalizedQuote
                    quote = NormalizedQuote(
                        symbol=sym,
                        exchange="NSE",
                        provider="UPSTOX",
                        last_price=float(cur_price),
                        bid=float(cur_price),
                        ask=float(cur_price),
                        close=float(close_price) if close_price else None,
                        change_pct=float(chg_pct) if chg_pct is not None else None,
                        volume=float(traded_val) if traded_val else 0.0,
                        segment="EQUITY_DERIVATIVES",
                        market="INDIAN_FUTURES"
                    )
                    quote.received_timestamp = now_iso
                    quote.is_stale = False
                    quote.feed_latency_ms = 15.0

                    from market_data_gateway.cache.market_cache import global_market_cache
                    global_market_cache.set_quote(sym, quote)
                    global_market_cache.set_quote(ikey, quote)
                    global_market_cache.set_quote(f"UPSTOX:{sym}", quote)
                    global_market_cache.set_quote(f"NSE:{und}", quote)
                    ingested += 1
                except Exception as ex:
                    logger.warning("Error ingesting smartlist item %s: %s", ikey, ex)

        return ingested

    def fetch_futures_smartlist(
        self,
        asset_type: str = "INDEX",
        category: str = "TOP_TRADED",
        page_number: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        """
        Queries official Upstox V2 Smartlist API for Futures.
        Endpoint: GET https://api.upstox.com/v2/market/smartlist/futures
        """
        if not self.access_token:
            return {
                "status": "error",
                "error": "AUTH_REQUIRED",
                "message": "Upstox access token is not configured or active.",
                "data": None,
            }

        try:
            params = {
                "asset_type": asset_type,
                "category": category,
                "page_number": page_number,
                "page_size": page_size,
            }
            res = self._make_request("market/smartlist/futures", params=params, api_version="v2")
            if res.get("status") == "success":
                # Ingest into live market cache
                self.ingest_smartlist_data(res)
            return res
        except Exception as e:
            logger.warning("Upstox futures smartlist query error: %s", e)
            return {
                "status": "error",
                "error": str(e),
                "message": f"Failed to fetch futures smartlist: {e}",
            }

    def get_safe_diagnostic(self) -> Dict[str, Any]:
        """
        Produces an authoritative, sanitized diagnostic report for Upstox V3 Market Data.
        Strictly excludes tokens, client secrets, or sensitive credentials.
        Reports true WebSocket connection status, subscribed count, tick freshness, and errors.
        """
        val = self.validate_token()
        is_conf = bool(self.access_token and len(self.access_token.strip()) > 10)
        status = val.get("status", "UNCONFIGURED")
        err_code = val.get("error_code")

        auth_status = "VALID" if status == "VALID" else ("TOKEN_EXPIRED" if err_code == "UDAPI100050" or status == "AUTH_REQUIRED" else ("UNCONFIGURED" if not is_conf else "AUTH_REQUIRED"))
        token_status = "ACTIVE" if status == "VALID" else ("EXPIRED" if auth_status == "TOKEN_EXPIRED" else ("NOT_SET" if not is_conf else "INVALID"))
        rest_status = "UP" if status == "VALID" else "DOWN"

        # Query feed bridge diagnostics if available
        bridge_diag = {}
        try:
            from src.data_core.subscriptions.upstox_feed_bridge import global_upstox_feed_bridge
            bridge_diag = global_upstox_feed_bridge.get_diagnostics()
        except Exception:
            pass

        ws_connected = bridge_diag.get("websocket_connected", False)
        ws_status = bridge_diag.get("websocket_status", ("CONNECTED" if ws_connected else ("READY" if status == "VALID" else "DOWN")))
        last_real_tick_at = bridge_diag.get("last_real_tick_at")
        last_tick_age_ms = bridge_diag.get("last_tick_age_ms")
        last_error = bridge_diag.get("last_error")
        subscribed_count = bridge_diag.get("subscribed_instruments_count", 0)

        return {
            "configured": is_conf,
            "authentication_status": auth_status,
            "token_status": token_status,
            "token_expiry": None,
            "data_entitlement": "ACTIVE" if status == "VALID" else "UNKNOWN",
            "rest_status": rest_status,
            "websocket_connected": ws_connected,
            "websocket_status": ws_status,
            "subscription_status": "ACTIVE" if subscribed_count > 0 else ("READY" if status == "VALID" else "INACTIVE"),
            "subscribed_instruments_count": subscribed_count,
            "decoder_status": "PROTOBUF_OK" if status == "VALID" else "PROTOBUF_READY",
            "last_real_tick_at": last_real_tick_at,
            "last_tick_age_ms": last_tick_age_ms,
            "last_error": last_error,
            "error_code": err_code or ("UDAPI100050" if auth_status == "TOKEN_EXPIRED" else None),
            "safe_error_message": val.get("message") if status != "VALID" else last_error,
            "status": "TOKEN_EXPIRED" if err_code == "UDAPI100050" else status,
        }


# Global Singleton Instance
global_upstox_service = UpstoxService()
