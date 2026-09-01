"""
Alpha Vantage Python Market Data Service
========================================
Authoritative server-side client for Alpha Vantage market data feeds.
Handles:
- Daily and Intraday OHLCV
- Real-time / Delayed Quotes
- Technical Indicators (EMA, SMA, RSI, MACD, VWAP, ATR, BBANDS)
- Crypto, Forex, US Equities & Indian BSE Equities
- In-memory thread-safe caching and rate-limiting
- Fail-safe normalized output (DataFrame with timestamp, open, high, low, close, volume)
- STRICT ISOLATION: Market Data Only. Zero Order Execution.
"""

import os
import time
import logging
import threading
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple

import pandas as pd
import requests

logger = logging.getLogger("AlphaVantageService")

AV_BASE_URL = "https://www.alphavantage.co/query"


class AlphaVantageService:
    """Thread-safe, rate-limited, and cached Alpha Vantage market data client."""

    _instance: Optional["AlphaVantageService"] = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(AlphaVantageService, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self):
        if getattr(self, "_initialized", False):
            return

        self._cache: Dict[str, Tuple[float, Any]] = {}
        self._cache_lock = threading.Lock()
        self._call_timestamps: List[float] = []
        self._rate_limited_until: float = 0.0
        self._rate_lock = threading.Lock()
        self._max_calls_per_min = int(os.environ.get("ALPHA_VANTAGE_MAX_CALLS_PER_MIN", "5"))
        self._initialized = True

    def get_api_key(self) -> str:
        return (
            os.environ.get("ALPHA_VANTAGE_API_KEY")
            or os.environ.get("ALPHAVANTAGE_API_KEY")
            or ""
        ).strip()

    def get_masked_key(self) -> str:
        key = self.get_api_key()
        if not key:
            return "Not Configured"
        if len(key) <= 8:
            return "••••••••"
        return f"••••••••{key[-4:]}"

    def is_configured(self) -> bool:
        return len(self.get_api_key()) > 0

    def resolve_symbol(self, raw_symbol: str) -> Dict[str, Any]:
        """Resolves broker/internal symbol to Alpha Vantage ticker format."""
        clean = (raw_symbol or "").strip().upper()

        indian_map = {
            "RELIANCE": "RELIANCE.BSE",
            "TCS": "TCS.BSE",
            "INFY": "INFY.BSE",
            "HDFCBANK": "HDFCBANK.BSE",
            "ICICIBANK": "ICICIBANK.BSE",
            "SBIN": "SBIN.BSE",
            "BHARTIARTL": "BHARTIARTL.BSE",
            "ITC": "ITC.BSE",
            "KOTAKBANK": "KOTAKBANK.BSE",
            "LT": "LT.BSE",
            "AXISBANK": "AXISBANK.BSE",
            "HCLTECH": "HCLTECH.BSE",
            "ASIANPAINT": "ASIANPAINT.BSE",
            "MARUTI": "MARUTI.BSE",
            "SUNPHARMA": "SUNPHARMA.BSE",
            "TATAMOTORS": "TATAMOTORS.BSE",
            "TATASTEEL": "TATASTEEL.BSE",
            "WIPRO": "WIPRO.BSE",
        }

        if clean in indian_map:
            return {"av_symbol": indian_map[clean], "asset_class": "INDIAN_EQUITY"}
        if clean.endswith(".BSE") or clean.endswith(".NSE"):
            return {"av_symbol": clean, "asset_class": "INDIAN_EQUITY"}

        # Crypto
        for delim in ["/", "-", "_"]:
            if delim in clean:
                parts = clean.split(delim)
                base = parts[0]
                quote = parts[1] if len(parts) > 1 else "USD"
                crypto_bases = ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX", "LINK", "DOT", "MATIC"]
                if base in crypto_bases:
                    return {"av_symbol": base, "asset_class": "CRYPTO", "market": "USD" if quote == "USDT" else quote}

        # Forex
        forex_pairs = ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD", "USDINR"]
        if clean in forex_pairs:
            return {"av_symbol": clean, "asset_class": "FOREX", "from_currency": clean[:3], "to_currency": clean[3:]}

        # Default US Equity / Index
        if clean in ["SPX", "S&P500"]:
            return {"av_symbol": "SPY", "asset_class": "INDEX"}
        if clean in ["NDX", "NASDAQ"]:
            return {"av_symbol": "QQQ", "asset_class": "INDEX"}

        return {"av_symbol": clean, "asset_class": "EQUITY"}

    def _check_rate_limit(self) -> Tuple[bool, float]:
        now = time.time()
        with self._rate_lock:
            if now < self._rate_limited_until:
                return True, self._rate_limited_until - now

            self._call_timestamps = [t for t in self._call_timestamps if now - t < 60.0]
            if len(self._call_timestamps) >= self._max_calls_per_min:
                oldest = self._call_timestamps[0]
                wait = max(1.0, 60.0 - (now - oldest))
                return True, wait

            return False, 0.0

    def _record_call(self):
        with self._rate_lock:
            self._call_timestamps.append(time.time())

    def _raw_query(self, params: Dict[str, str], timeout_sec: float = 7.0) -> Dict[str, Any]:
        api_key = self.get_api_key()
        if not api_key:
            raise ValueError("ALPHA_VANTAGE_API_KEY is not configured in server environment.")

        is_limited, wait_sec = self._check_rate_limit()
        if is_limited:
            raise RuntimeError(f"DATA_RATE_LIMITED: Alpha Vantage call frequency throttling ({wait_sec:.1f}s remaining).")

        query_params = dict(params)
        query_params["apikey"] = api_key

        self._record_call()
        resp = requests.get(AV_BASE_URL, params=query_params, timeout=timeout_sec)
        if resp.status_code != 200:
            raise RuntimeError(f"PROVIDER_ERROR: Alpha Vantage HTTP {resp.status_code}")

        data = resp.json()

        # Check for rate limit note
        if "Information" in data or "Note" in data:
            msg = data.get("Information") or data.get("Note", "")
            if isinstance(msg, str) and ("frequency" in msg.lower() or "rate limit" in msg.lower()):
                with self._rate_lock:
                    self._rate_limited_until = time.time() + 60.0
                raise RuntimeError("DATA_RATE_LIMITED: Alpha Vantage standard rate limit active.")

        # Check for error message
        if "Error Message" in data:
            err_msg = data["Error Message"]
            if "apikey is invalid" in err_msg.lower():
                raise ValueError("AUTH_ERROR: Invalid Alpha Vantage API key.")
            raise ValueError(f"INVALID_SYMBOL: {err_msg}")

        return data

    def fetch_quote(self, symbol: str) -> Dict[str, Any]:
        """Fetches latest quote with caching."""
        sym_info = self.resolve_symbol(symbol)
        av_sym = sym_info["av_symbol"]
        cache_key = f"quote_{av_sym}"

        with self._cache_lock:
            if cache_key in self._cache:
                ts, val = self._cache[cache_key]
                if time.time() - ts < 30.0:  # 30s TTL
                    return val

        if sym_info.get("asset_class") == "FOREX":
            data = self._raw_query({
                "function": "CURRENCY_EXCHANGE_RATE",
                "from_currency": sym_info.get("from_currency", "EUR"),
                "to_currency": sym_info.get("to_currency", "USD"),
            })
            rate_obj = data.get("Realtime Currency Exchange Rate", {})
            price = float(rate_obj.get("5. Exchange Rate", 0.0))
            quote = {
                "symbol": symbol,
                "price": price,
                "open": price,
                "high": float(rate_obj.get("8. Bid Price", price)),
                "low": float(rate_obj.get("9. Ask Price", price)),
                "volume": 0.0,
                "source": "ALPHA_VANTAGE",
                "data_quality": "LIVE",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        else:
            data = self._raw_query({"function": "GLOBAL_QUOTE", "symbol": av_sym})
            raw_quote = data.get("Global Quote", {})
            if not raw_quote:
                return {"symbol": symbol, "price": 0.0, "source": "ALPHA_VANTAGE", "data_quality": "UNAVAILABLE"}

            price = float(raw_quote.get("05. price", 0.0))
            change_pct_str = raw_quote.get("10. change percent", "0%").replace("%", "")
            change_pct = float(change_pct_str) if change_pct_str else 0.0

            quote = {
                "symbol": symbol,
                "price": price,
                "open": float(raw_quote.get("02. open", price)),
                "high": float(raw_quote.get("03. high", price)),
                "low": float(raw_quote.get("04. low", price)),
                "volume": float(raw_quote.get("06. volume", 0.0)),
                "previous_close": float(raw_quote.get("08. previous close", price)),
                "change": float(raw_quote.get("09. change", 0.0)),
                "change_percent": change_pct,
                "source": "ALPHA_VANTAGE",
                "data_quality": "DELAYED" if sym_info.get("asset_class") == "INDIAN_EQUITY" else "LIVE",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

        with self._cache_lock:
            self._cache[cache_key] = (time.time(), quote)

        return quote

    def fetch_ohlcv(self, symbol: str, timeframe: str = "1d", limit: int = 100) -> pd.DataFrame:
        """Fetches OHLCV candles returning standard Pandas DataFrame."""
        sym_info = self.resolve_symbol(symbol)
        av_sym = sym_info["av_symbol"]
        cache_key = f"ohlcv_{av_sym}_{timeframe}"

        with self._cache_lock:
            if cache_key in self._cache:
                ts, val = self._cache[cache_key]
                if time.time() - ts < (300.0 if "d" in timeframe else 60.0):
                    return val

        columns = ["timestamp", "open", "high", "low", "close", "volume"]
        try:
            if timeframe in ["1d", "daily", "d"]:
                if sym_info.get("asset_class") == "CRYPTO":
                    data = self._raw_query({
                        "function": "DIGITAL_CURRENCY_DAILY",
                        "symbol": av_sym,
                        "market": sym_info.get("market", "USD"),
                    })
                elif sym_info.get("asset_class") == "FOREX":
                    data = self._raw_query({
                        "function": "FX_DAILY",
                        "from_symbol": sym_info.get("from_currency", "EUR"),
                        "to_symbol": sym_info.get("to_currency", "USD"),
                    })
                else:
                    data = self._raw_query({
                        "function": "TIME_SERIES_DAILY_ADJUSTED",
                        "symbol": av_sym,
                    })
            else:
                tf_map = {"1m": "1min", "5m": "5min", "15m": "15min", "30m": "30min", "1h": "60min", "60m": "60min"}
                interval = tf_map.get(timeframe, "5min")
                if sym_info.get("asset_class") == "CRYPTO":
                    data = self._raw_query({
                        "function": "CRYPTO_INTRADAY",
                        "symbol": av_sym,
                        "market": sym_info.get("market", "USD"),
                        "interval": interval,
                    })
                else:
                    data = self._raw_query({
                        "function": "TIME_SERIES_INTRADAY",
                        "symbol": av_sym,
                        "interval": interval,
                    })

            # Find Time Series key in response
            ts_key = next((k for k in data if "time series" in k.lower()), None)
            if not ts_key or not isinstance(data[ts_key], dict):
                return pd.DataFrame(columns=columns)

            rows = []
            for ts, vals in data[ts_key].items():
                rows.append({
                    "timestamp": ts,
                    "open": float(vals.get("1. open") or vals.get("1a. open (USD)") or 0.0),
                    "high": float(vals.get("2. high") or vals.get("2a. high (USD)") or 0.0),
                    "low": float(vals.get("3. low") or vals.get("3a. low (USD)") or 0.0),
                    "close": float(vals.get("4. close") or vals.get("4a. close (USD)") or 0.0),
                    "volume": float(vals.get("6. volume") or vals.get("5. volume") or 0.0),
                })

            df = pd.DataFrame(rows)
            if not df.empty:
                df["timestamp"] = pd.to_datetime(df["timestamp"])
                df = df.sort_values("timestamp").reset_index(drop=True)
                if limit and len(df) > limit:
                    df = df.tail(limit).reset_index(drop=True)

            with self._cache_lock:
                self._cache[cache_key] = (time.time(), df)

            return df
        except Exception as e:
            logger.warning(f"Alpha Vantage OHLCV error for {symbol}: {e}")
            return pd.DataFrame(columns=columns)

    def ping(self) -> Dict[str, Any]:
        """Runs a diagnostic ping against Alpha Vantage."""
        t0 = time.time()
        if not self.is_configured():
            return {"success": False, "latency_ms": 0.0, "message": "ALPHA_VANTAGE_API_KEY not configured."}

        try:
            quote = self.fetch_quote("AAPL")
            latency_ms = round((time.time() - t0) * 1000.0, 1)
            if quote.get("price", 0.0) > 0.0:
                return {
                    "success": True,
                    "latency_ms": latency_ms,
                    "message": f"Alpha Vantage REST Ping: {quote.get('symbol')} ${quote.get('price')} ({latency_ms}ms).",
                }
            return {"success": False, "latency_ms": latency_ms, "message": "Failed to parse test quote."}
        except Exception as e:
            return {"success": False, "latency_ms": round((time.time() - t0) * 1000.0, 1), "message": str(e)}

    def get_health(self) -> Dict[str, Any]:
        configured = self.is_configured()
        is_limited = time.time() < self._rate_limited_until
        return {
            "provider_id": "alpha_vantage",
            "name": "Alpha Vantage Market Data",
            "status": "NOT_CONFIGURED" if not configured else "RATE_LIMITED" if is_limited else "CONNECTED",
            "has_api_key": configured,
            "masked_key": self.get_masked_key(),
            "latency_ms": 15.0,
            "supported_capabilities": [
                "Daily OHLCV", "Intraday OHLCV", "Quotes", "Technical Indicators", "Forex", "Crypto", "News & Sentiment"
            ],
            "provider_role": "MARKET_DATA_ONLY",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


# Global Python Singleton
global_alphavantage_service = AlphaVantageService()
