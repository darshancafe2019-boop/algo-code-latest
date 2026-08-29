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
import time
import json
import logging
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple, Union
import pandas as pd

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
    },
}

# Backward compatibility alias
UPSTOX_INSTRUMENT_MAP = OFFICIAL_UPSTOX_KEYS


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
        self.client_secret = client_secret if client_secret is not None else os.getenv("UPSTOX_CLIENT_SECRET", "")
        self.access_token = access_token if access_token is not None else os.getenv("UPSTOX_ACCESS_TOKEN", "")
        self.redirect_uri = redirect_uri if redirect_uri is not None else os.getenv("UPSTOX_REDIRECT_URI", "http://localhost:5050/api/upstox/callback")
        self._last_auth_error: Optional[str] = None

    @property
    def is_configured(self) -> bool:
        """Returns whether Upstox client credentials or access token are set."""
        return bool(self.client_id or self.access_token)

    @property
    def is_authenticated(self) -> bool:
        """Returns whether a non-empty access token is present."""
        return bool(self.access_token and len(self.access_token.strip()) > 10)

    def resolve_instrument_key(self, symbol: str) -> Optional[str]:
        """Maps canonical symbol or ISIN to official Upstox instrument_key."""
        clean_sym = symbol.strip().upper().replace(" ", "").replace("_", "")
        for key, meta in OFFICIAL_UPSTOX_KEYS.items():
            k_clean = key.strip().upper().replace(" ", "").replace("_", "")
            if clean_sym == k_clean or clean_sym == meta["isin"]:
                return meta["instrument_key"]
        if symbol in OFFICIAL_UPSTOX_KEYS:
            return OFFICIAL_UPSTOX_KEYS[symbol]["instrument_key"]
        # If already in valid formatted syntax like NSE_EQ|... or NSE_INDEX|...
        if "|" in symbol and (symbol.startswith("NSE_") or symbol.startswith("BSE_")):
            return symbol
        return None

    def get_instrument_metadata(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Retrieves structured instrument metadata for an Indian stock or index."""
        clean_sym = symbol.strip().upper()
        if clean_sym in OFFICIAL_UPSTOX_KEYS:
            return OFFICIAL_UPSTOX_KEYS[clean_sym]
        for key, meta in OFFICIAL_UPSTOX_KEYS.items():
            if clean_sym == key.upper():
                return meta
        return None

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
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read().decode("utf-8")
                return json.loads(raw)
        except urllib.error.HTTPError as he:
            body = ""
            try:
                body = he.read().decode("utf-8")
            except Exception:
                pass
            self._last_auth_error = f"HTTP {he.code}: {body or he.reason}"
            logger.warning("Upstox HTTP error on %s: %s (Body: %s)", endpoint, he.code, body)
            raise RuntimeError(f"Upstox API HTTP {he.code}: {body or he.reason}")
        except Exception as e:
            self._last_auth_error = str(e)
            logger.warning("Upstox request error on %s: %s", endpoint, e)
            raise e

    def authorize_market_data_feed(self) -> Dict[str, Any]:
        """
        Calls official Upstox V3 Market Data Feed Authorize endpoint:
        GET https://api.upstox.com/v3/feed/market-data-feed/authorize
        Returns:
            {"status": "success", "authorized_redirect_uri": "wss://..."}
        """
        if not self.is_authenticated:
            return {
                "success": False,
                "error": "UPSTOX_ACCESS_TOKEN_MISSING",
                "message": "Upstox access token is not set in environment or configuration.",
            }

        try:
            res = self._make_request("feed/market-data-feed/authorize", method="GET", api_version="v3")
            if res.get("status") == "success" and "data" in res:
                redirect_uri = res["data"].get("authorizedRedirectUri")
                return {
                    "success": True,
                    "authorized_redirect_uri": redirect_uri,
                    "raw_data": res["data"],
                }
            return {
                "success": False,
                "error": "AUTHORIZATION_FAILED",
                "message": res.get("errors", [{}])[0].get("message", "Authorization failed"),
            }
        except Exception as e:
            return {
                "success": False,
                "error": "UPSTOX_AUTH_ERROR",
                "message": str(e),
            }

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

    def get_trades(self) -> List[Dict[str, Any]]:
        """Queries executed trades for the current session (V2)."""
        if self.is_authenticated:
            try:
                res = self._make_request("order/trades/get-trades-for-day", api_version="v2")
                if res.get("status") == "success" and "data" in res:
                    return res["data"] or []
            except Exception as e:
                logger.warning("Upstox trades query error: %s", e)
        return []


# Global Singleton Instance
global_upstox_service = UpstoxService()
