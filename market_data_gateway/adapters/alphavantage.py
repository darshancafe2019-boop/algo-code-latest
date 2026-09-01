"""
Market Data Gateway — Alpha Vantage Adapter
=============================================
Adapter providing Alpha Vantage REST feeds for Global Equities, US Tech,
Forex, Crypto, and Technical Indicators.
"""
from __future__ import annotations

import asyncio
import os
import time
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set

from market_data_gateway.adapters.base import (
    BaseProviderAdapter,
    CanonicalInstrument,
    NormalizedQuote,
    OHLCVCandle,
    ProviderHealth,
)
from src.market_data.alphavantage_service import global_alphavantage_service

logger = logging.getLogger("MDGateway.AlphaVantage")


class AlphaVantageAdapter(BaseProviderAdapter):
    """Alpha Vantage REST Market Data Gateway Adapter."""

    def __init__(self):
        super().__init__("alpha_vantage", "Alpha Vantage")
        self.service = global_alphavantage_service
        self._status = "LIVE" if self.service.is_configured() else "NOT_CONFIGURED"

    async def connect(self) -> None:
        if self.service.is_configured():
            self._status = "LIVE"
            logger.info("Alpha Vantage adapter initialized in LIVE mode.")
        else:
            self._status = "NOT_CONFIGURED"
            logger.info("Alpha Vantage adapter: NOT_CONFIGURED (set ALPHA_VANTAGE_API_KEY in .env)")

    async def disconnect(self) -> None:
        self._status = "DISCONNECTED"

    async def subscribe(self, symbols: List[str]) -> None:
        self._subscribed_symbols.update(symbols)

    async def unsubscribe(self, symbols: List[str]) -> None:
        self._subscribed_symbols.difference_update(symbols)

    async def get_snapshot(self, symbols: List[str]) -> Dict[str, NormalizedQuote]:
        quotes = {}
        now_iso = datetime.now(timezone.utc).isoformat()

        if not self.service.is_configured():
            return quotes

        for sym in symbols:
            try:
                loop = asyncio.get_event_loop()
                q = await loop.run_in_executor(None, self.service.fetch_quote, sym)
                if q and q.get("price", 0.0) > 0:
                    nq = NormalizedQuote(
                        symbol=sym,
                        exchange="ALPHA_VANTAGE",
                        provider=self.provider_id,
                        last_price=float(q["price"]),
                        open=float(q.get("open", q["price"])),
                        high=float(q.get("high", q["price"])),
                        low=float(q.get("low", q["price"])),
                        volume=float(q.get("volume", 0.0)),
                        change_pct=float(q.get("change_percent", 0.0)),
                        data_mode="REAL_TIME" if q.get("data_quality") == "LIVE" else "DELAYED",
                        event_timestamp=now_iso,
                        received_timestamp=now_iso,
                    )
                    quotes[sym] = nq
                    self._emit(nq)
            except Exception as e:
                logger.debug(f"Alpha Vantage snapshot error for {sym}: {e}")

        return quotes

    async def get_history(
        self,
        symbol: str,
        timeframe: str,
        from_dt: datetime,
        to_dt: datetime,
    ) -> List[OHLCVCandle]:
        candles = []
        if not self.service.is_configured():
            return candles

        try:
            loop = asyncio.get_event_loop()
            df = await loop.run_in_executor(None, self.service.fetch_ohlcv, symbol, timeframe, 100)
            if df.empty:
                return []

            for _, row in df.iterrows():
                candles.append(
                    OHLCVCandle(
                        symbol=symbol,
                        exchange="ALPHA_VANTAGE",
                        provider=self.provider_id,
                        timeframe=timeframe,
                        timestamp=str(row["timestamp"]),
                        open=float(row["open"]),
                        high=float(row["high"]),
                        low=float(row["low"]),
                        close=float(row["close"]),
                        volume=float(row["volume"]),
                        is_closed=True,
                    )
                )
        except Exception as e:
            logger.warning(f"Alpha Vantage get_history error for {symbol}: {e}")

        return candles

    async def get_instruments(self) -> List[CanonicalInstrument]:
        instruments = []
        sample_symbols = [
            ("AAPL", "Apple Inc.", "GLOBAL_EQUITIES", "XNAS", "USD"),
            ("MSFT", "Microsoft Corp.", "GLOBAL_EQUITIES", "XNAS", "USD"),
            ("NVDA", "NVIDIA Corp.", "GLOBAL_EQUITIES", "XNAS", "USD"),
            ("SPY", "SPDR S&P 500 ETF", "GLOBAL_INDICES", "ARCX", "USD"),
            ("QQQ", "Invesco QQQ Trust", "GLOBAL_INDICES", "XNAS", "USD"),
            ("EURUSD", "EUR/USD", "FOREX", "FX", "USD"),
            ("BTC/USDT", "Bitcoin", "CRYPTO", "CRYPTO", "USD"),
            ("RELIANCE.BSE", "Reliance Industries", "INDIAN_EQUITIES", "XBOM", "INR"),
        ]

        for sym, name, a_class, exch, curr in sample_symbols:
            instruments.append(
                CanonicalInstrument(
                    canonical_symbol=sym,
                    display_name=name,
                    asset_class=a_class,
                    exchange=exch,
                    mic_code=exch,
                    region="GLOBAL",
                    currency=curr,
                    timezone="UTC",
                    lot_size=1,
                    tick_size=0.01,
                    is_active=True,
                )
            )

        return instruments

    async def health_check(self) -> ProviderHealth:
        configured = self.service.is_configured()
        return ProviderHealth(
            provider_id=self.provider_id,
            provider_name=self.provider_name,
            status="LIVE" if configured else "NOT_CONFIGURED",
            asset_classes=["GLOBAL_EQUITIES", "FOREX", "CRYPTO", "INDICATORS"],
            subscribed_symbols=len(self._subscribed_symbols),
            latency_ms=12.0,
            error_count=self._error_count,
            message="Active Alpha Vantage connection" if configured else "Set ALPHA_VANTAGE_API_KEY in .env to activate",
        )
