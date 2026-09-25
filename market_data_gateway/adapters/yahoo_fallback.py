"""
Yahoo Finance Fallback Adapter
================================
Free delayed/EOD data for global equities, ETFs, indices, forex.
IMPORTANT: Always data_mode=EOD or DELAYED. Never used for live trading signals.
"""
from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional

from market_data_gateway.adapters.base import (
    BaseProviderAdapter,
    CanonicalInstrument,
    NormalizedQuote,
    OHLCVCandle,
    ProviderHealth,
)

logger = logging.getLogger("MDGateway.YahooFallback")

# Symbol mapping: canonical -> Yahoo ticker
YAHOO_SYMBOL_MAP: Dict[str, str] = {
    # U.S. Equities
    "AAPL": "AAPL", "MSFT": "MSFT", "NVDA": "NVDA", "AMZN": "AMZN",
    "META": "META", "GOOGL": "GOOGL", "TSLA": "TSLA", "AMD": "AMD",
    "INTC": "INTC", "NFLX": "NFLX", "JPM": "JPM", "V": "V", "MA": "MA",
    "WMT": "WMT", "DIS": "DIS", "UNH": "UNH", "GS": "GS", "BAC": "BAC",
    # U.S. Indices
    "SPX": "^GSPC", "NDX": "^NDX", "DJI": "^DJI", "VIX": "^VIX", "RUT": "^RUT",
    # Global Indices
    "FTSE100": "^FTSE", "DAX": "^GDAXI", "CAC40": "^FCHI",
    "NIKKEI225": "^N225", "HANGSENG": "^HSI", "ASX200": "^AXJO",
    "SHANGCOMP": "000001.SS",
    # Indian Indices (delayed)
    "NIFTY": "^NSEI", "BANKNIFTY": "^NSEBANK", "SENSEX": "^BSESN",
    "MIDCPNIFTY": "^NSEMDCP50", "FINNIFTY": "NIFTY_FIN_SERVICE.NS",
    # Forex
    "EUR/USD": "EURUSD=X", "GBP/USD": "GBPUSD=X", "USD/JPY": "JPY=X",
    "USD/INR": "INR=X", "AUD/USD": "AUDUSD=X", "USD/CHF": "CHF=X",
    # Commodities
    "GOLD": "GC=F", "SILVER": "SI=F", "CRUDE_OIL": "CL=F",
    "BRENT": "BZ=F", "NATURAL_GAS": "NG=F", "COPPER": "HG=F",
    # Crypto (delayed)
    "BTC/USDT": "BTC-USD", "ETH/USDT": "ETH-USD", "BNB/USDT": "BNB-USD",
    "SOL/USDT": "SOL-USD", "XRP/USDT": "XRP-USD",
}

REVERSE_MAP: Dict[str, str] = {v: k for k, v in YAHOO_SYMBOL_MAP.items()}

FOREX_CURRENCIES = {
    "USD", "EUR", "GBP", "JPY", "INR", "AUD", "CAD", "CHF", "NZD", "SGD", "HKD", "CNY", "SEK", "NOK", "KRW", "MXN", "ZAR", "BRL", "RUB", "TRY"
}

KNOWN_US_STOCKS = {
    "AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOGL", "GOOG", "TSLA", "AMD", "INTC",
    "NFLX", "JPM", "V", "MA", "WMT", "DIS", "UNH", "GS", "BAC", "SPY", "QQQ", "IWM", "DIA"
}


def normalize_to_yahoo_ticker(raw_symbol: str) -> Optional[str]:
    """
    Maps canonical instrument symbols to provider-specific Yahoo Finance tickers.
    Strict separation across Forex, Crypto, US Stocks, Indices, Commodities, and Indian Equities.
    Never blindly attaches .NS to Forex, Crypto, Commodities, or non-NSE instruments.
    """
    if not raw_symbol or not isinstance(raw_symbol, str):
        return None
    s = raw_symbol.strip()
    if s.startswith("$"):
        s = s[1:].strip()
    s_upper = s.upper()

    # Skip options and derivative tokens
    if (
        s_upper.startswith("C-") or s_upper.startswith("P-") or "-C-" in s_upper or "-P-" in s_upper
        or s_upper.startswith("O:") or s_upper.startswith("NSE_FO|")
        or "-CE" in s_upper or "-PE" in s_upper or " CE" in s_upper or " PE" in s_upper
        or (len(s_upper) > 6 and s_upper[-2:] in ("CE", "PE") and any(c.isdigit() for c in s_upper[:-2]))
    ):
        return None

    # Check direct dictionary map
    if s_upper in YAHOO_SYMBOL_MAP:
        return YAHOO_SYMBOL_MAP[s_upper]
    if s in YAHOO_SYMBOL_MAP:
        return YAHOO_SYMBOL_MAP[s]

    # Forex with slash: EUR/USD, GBP/USD, USD/INR -> EURUSD=X, GBPUSD=X, INR=X
    if "/" in s_upper and len(s_upper.replace("/", "")) == 6:
        base, quote = s_upper.split("/", 1)
        if base in FOREX_CURRENCIES and quote in FOREX_CURRENCIES:
            if base == "USD":
                return f"{quote}=X"
            return f"{base}{quote}=X"

    # Forex 6-letter without slash: EURUSD, GBPUSD, USDJPY, USDINR, AUDUSD, NZDUSD, USDCAD
    if len(s_upper) == 6 and s_upper[:3] in FOREX_CURRENCIES and s_upper[3:] in FOREX_CURRENCIES:
        if s_upper.startswith("USD"):
            return f"{s_upper[3:]}=X"
        return f"{s_upper}=X"

    # Crypto: BTC/USDT, BTCUSDT, ETHUSDT, SOLUSDT, BTCUSD, ETHUSD
    for base_crypto in ("BTC", "ETH", "SOL", "XRP", "BNB", "ADA", "DOGE", "AVAX", "DOT", "MATIC", "LINK"):
        if s_upper in (f"{base_crypto}/USDT", f"{base_crypto}USDT", f"{base_crypto}/USD", f"{base_crypto}USD"):
            return f"{base_crypto}-USD"

    # Commodities
    if s_upper in ("GOLD", "XAUUSD", "XAU/USD"):
        return "GC=F"
    if s_upper in ("SILVER", "XAGUSD", "XAG/USD"):
        return "SI=F"
    if s_upper in ("CRUDE_OIL", "CRUDEOIL", "CL", "WTI"):
        return "CL=F"
    if s_upper in ("BRENT", "BZ"):
        return "BZ=F"
    if s_upper in ("NATURAL_GAS", "NATGAS", "NG"):
        return "NG=F"
    if s_upper in ("COPPER", "HG"):
        return "HG=F"

    # US Stocks
    if s_upper in KNOWN_US_STOCKS:
        return s_upper

    # Suffix/prefix handling
    if s_upper.startswith("NSE:"):
        clean_eq = s_upper.replace("NSE:", "").strip()
        return f"{clean_eq}.NS"
    if s_upper.startswith("BSE:"):
        clean_eq = s_upper.replace("BSE:", "").strip()
        return f"{clean_eq}.BO"
    if s_upper.endswith(".NS") or s_upper.endswith(".BO") or s_upper.startswith("^"):
        return s_upper

    # Default Indian NSE equity only if standard ticker format without forex/crypto ambiguity
    if s_upper.isalpha():
        return f"{s_upper}.NS"

    return s_upper


class YahooFallbackAdapter(BaseProviderAdapter):
    """
    Yahoo Finance delayed data adapter.
    Always EOD for equities; near-real-time (15-min delayed) for crypto via yfinance.
    Never used for automated trading signals — display and reference only.
    """

    def __init__(self, poll_interval_sec: float = 3.0):
        super().__init__("yahoo_fallback", "Yahoo Finance (Delayed)")
        self._poll_interval = poll_interval_sec
        self._quote_cache: Dict[str, NormalizedQuote] = {}
        self._poll_task: Optional[asyncio.Task] = None
        self._running = False

    async def connect(self) -> None:
        try:
            import yfinance  # noqa: F401 — just verify it's installed
            self._running = True
            self._status = "DELAYED"
            logger.info("YahooFallbackAdapter ready (delayed/EOD data)")
        except ImportError:
            self._status = "NOT_CONFIGURED"
            logger.info("YahooFallbackAdapter: optional yfinance not installed; adapter disabled.")

    async def disconnect(self) -> None:
        self._running = False
        if self._poll_task and not self._poll_task.done():
            self._poll_task.cancel()
            try:
                await self._poll_task
            except asyncio.CancelledError:
                pass
        self._status = "DISCONNECTED"

    async def subscribe(self, symbols: List[str]) -> None:
        for s in symbols:
            self._subscribed_symbols.add(s)
        if self._running and (self._poll_task is None or self._poll_task.done()):
            self._poll_task = asyncio.create_task(self._poll_loop())

    async def unsubscribe(self, symbols: List[str]) -> None:
        for s in symbols:
            self._subscribed_symbols.discard(s)
            self._quote_cache.pop(s, None)
        if not self._subscribed_symbols and self._poll_task and not self._poll_task.done():
            self._poll_task.cancel()

    async def get_snapshot(self, symbols: List[str]) -> Dict[str, NormalizedQuote]:
        """Return cached quotes or fetch via yfinance synchronously in thread."""
        result: Dict[str, NormalizedQuote] = {}
        missing = [s for s in symbols if s not in self._quote_cache]
        if missing:
            fetched = await asyncio.get_event_loop().run_in_executor(None, self._fetch_batch, missing)
            result.update(fetched)
        for s in symbols:
            if s in self._quote_cache:
                result[s] = self._quote_cache[s]
        return result

    async def get_instruments(self) -> List[CanonicalInstrument]:
        return []

    async def health_check(self) -> ProviderHealth:
        return ProviderHealth(
            provider_id="yahoo_fallback",
            provider_name="Yahoo Finance (Delayed)",
            status=self._status,
            asset_classes=["GLOBAL_EQUITIES", "GLOBAL_INDICES", "FOREX", "COMMODITIES", "CRYPTO"],
            subscribed_symbols=len(self._subscribed_symbols),
            error_count=self._error_count,
            message="Delayed/EOD data. Do NOT use for live trading signals.",
        )

    # ─── Internal ─────────────────────────────────────────────────────────────

    async def _poll_loop(self) -> None:
        """Periodically refresh quotes for all subscribed symbols."""
        while self._running and self._subscribed_symbols:
            syms = list(self._subscribed_symbols)
            try:
                quotes = await asyncio.get_event_loop().run_in_executor(None, self._fetch_batch, syms)
                for sym, q in quotes.items():
                    self._quote_cache[sym] = q
                    self._emit(q)
            except Exception as exc:
                self._record_error(str(exc))
            await asyncio.sleep(self._poll_interval)

    def _fetch_batch(self, symbols: List[str]) -> Dict[str, NormalizedQuote]:
        """Synchronous yfinance batch fetch — runs in thread pool."""
        try:
            import yfinance as yf
        except ImportError:
            return {}

        result: Dict[str, NormalizedQuote] = {}
        
        valid_pairs: List[Tuple[str, str]] = []
        for s in symbols:
            yahoo_t = normalize_to_yahoo_ticker(s)
            if yahoo_t:
                valid_pairs.append((s, yahoo_t))

        if not valid_pairs:
            return result

        recv_iso = datetime.now(timezone.utc).isoformat()
        yahoo_tickers_str = " ".join([yp[1] for yp in valid_pairs])

        try:
            tickers = yf.Tickers(yahoo_tickers_str)
            for canon_sym, yahoo_sym in valid_pairs:
                try:
                    ticker = tickers.tickers.get(yahoo_sym)
                    if ticker is None:
                        continue
                    info = ticker.fast_info
                    last_price = getattr(info, "last_price", None) or getattr(info, "regularMarketPrice", None) or 0.0
                    if not last_price or last_price <= 0:
                        continue
                    quote = NormalizedQuote(
                        symbol=canon_sym,
                        exchange=getattr(info, "exchange", "UNKNOWN"),
                        provider="yahoo_fallback",
                        last_price=float(last_price),
                        bid=float(getattr(info, "bid", 0) or 0),
                        ask=float(getattr(info, "ask", 0) or 0),
                        volume=float(getattr(info, "three_month_average_volume", 0) or 0),
                        high=float(getattr(info, "day_high", 0) or 0) or None,
                        low=float(getattr(info, "day_low", 0) or 0) or None,
                        event_timestamp=recv_iso,
                        received_timestamp=recv_iso,
                        data_mode="DELAYED",
                        feed_latency_ms=0.0,
                    )
                    result[canon_sym] = quote
                    self._quote_cache[canon_sym] = quote
                except Exception:
                    pass
        except Exception as exc:
            logger.error("Yahoo batch fetch error: %s", exc)

        return result
