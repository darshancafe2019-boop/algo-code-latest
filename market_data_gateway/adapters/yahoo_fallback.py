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


class YahooFallbackAdapter(BaseProviderAdapter):
    """
    Yahoo Finance delayed data adapter.
    Always EOD for equities; near-real-time (15-min delayed) for crypto via yfinance.
    Never used for automated trading signals — display and reference only.
    """

    def __init__(self, poll_interval_sec: float = 60.0):
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

    async def get_history(
        self,
        symbol: str,
        timeframe: str,
        from_dt: datetime,
        to_dt: datetime,
    ) -> List[OHLCVCandle]:
        """Fetch historical OHLCV from yfinance."""
        return await asyncio.get_event_loop().run_in_executor(
            None, self._fetch_history_sync, symbol, timeframe, from_dt, to_dt
        )

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
        yahoo_syms = [YAHOO_SYMBOL_MAP.get(s, s) for s in symbols]
        recv_iso = datetime.now(timezone.utc).isoformat()

        try:
            tickers = yf.Tickers(" ".join(yahoo_syms))
            for canon_sym, yahoo_sym in zip(symbols, yahoo_syms):
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

    def _fetch_history_sync(
        self, symbol: str, timeframe: str, from_dt: datetime, to_dt: datetime
    ) -> List[OHLCVCandle]:
        try:
            import yfinance as yf
        except ImportError:
            return []

        interval_map = {
            "1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m",
            "1h": "1h", "4h": "4h", "1d": "1d", "1w": "1wk", "1M": "1mo",
        }
        yahoo_sym = YAHOO_SYMBOL_MAP.get(symbol, symbol)
        interval = interval_map.get(timeframe, "1d")
        candles: List[OHLCVCandle] = []
        try:
            df = yf.download(
                yahoo_sym,
                start=from_dt.strftime("%Y-%m-%d"),
                end=to_dt.strftime("%Y-%m-%d"),
                interval=interval,
                progress=False,
                auto_adjust=True,
            )
            for idx, row in df.iterrows():
                ts = idx.isoformat() if hasattr(idx, "isoformat") else str(idx)
                candles.append(OHLCVCandle(
                    symbol=symbol, exchange="YAHOO", provider="yahoo_fallback",
                    timeframe=timeframe, timestamp=ts,
                    open=float(row["Open"]), high=float(row["High"]),
                    low=float(row["Low"]), close=float(row["Close"]),
                    volume=float(row.get("Volume", 0)),
                    is_closed=True,
                ))
        except Exception as exc:
            logger.error("Yahoo history fetch error for %s: %s", symbol, exc)
        return candles
