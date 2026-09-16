"""
Provider-Independent Feed Simulator
===================================
Generates deterministic synthetic market ticks and order books for test and staging environments.
Outputs canonical MarketTick & NormalizedQuote labeled with dataMode='SIMULATION'.
"""
from __future__ import annotations

import asyncio
import logging
import math
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Set

from market_data_gateway.adapters.base import (
    BaseProviderAdapter,
    CanonicalInstrument,
    NormalizedQuote,
    OHLCVCandle,
    ProviderHealth,
)
from market_data_gateway.models.tick import MarketTick

logger = logging.getLogger("MDGateway.SimFeed")


class SimulationFeedAdapter(BaseProviderAdapter):
    """Deterministic Multi-Asset Market Feed Simulator."""

    def __init__(self, tick_interval_sec: float = 1.0):
        super().__init__("sim_feed", "Simulation Feed Engine")
        self.tick_interval_sec = tick_interval_sec
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._base_prices: Dict[str, float] = {
            "NIFTY": 24850.0,
            "BANKNIFTY": 51200.0,
            "RELIANCE": 2980.0,
            "TCS": 4210.0,
            "INFY": 1890.0,
            "HDFCBANK": 1645.0,
            "BTC/USDT": 64500.0,
            "ETH/USDT": 3480.0,
            "SOL/USDT": 185.0,
        }
        self._quote_cache: Dict[str, NormalizedQuote] = {}

    async def connect(self) -> None:
        self._running = True
        self._status = "LIVE"
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._simulation_loop())
        logger.info("[OK] Simulation feed connected and generating synthetic ticks.")

    async def disconnect(self) -> None:
        self._running = False
        self._status = "DISCONNECTED"
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _simulation_loop(self) -> None:
        step = 0
        while self._running:
            try:
                now_iso = datetime.now(timezone.utc).isoformat()
                step += 1
                for sym, base in self._base_prices.items():
                    # Generate deterministic sinusoidal price walk
                    drift = math.sin(step / 5.0 + hash(sym) % 10) * (base * 0.001)
                    price = round(base + drift, 2)
                    bid = round(price - (base * 0.0002), 2)
                    ask = round(price + (base * 0.0002), 2)

                    q = NormalizedQuote(
                        symbol=sym,
                        exchange="NSE" if "/" not in sym else "BINANCE",
                        provider="sim_feed",
                        last_price=price,
                        bid=bid,
                        ask=ask,
                        volume=float(100000 + (step * 500) % 50000),
                        open=base,
                        high=round(price * 1.005, 2),
                        low=round(price * 0.995, 2),
                        close=base,
                        change_pct=round((drift / base) * 100.0, 2),
                        event_timestamp=now_iso,
                        received_timestamp=now_iso,
                        data_mode="SIMULATION",
                        status="LIVE",
                    )
                    self._quote_cache[sym] = q
                    self._emit(q)

                await asyncio.sleep(self.tick_interval_sec)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Simulation loop error: %s", e)
                await asyncio.sleep(1.0)

    async def subscribe(self, symbols: List[str]) -> None:
        for s in symbols:
            self._subscribed_symbols.add(s)
            if s not in self._base_prices:
                self._base_prices[s] = 100.0

    async def unsubscribe(self, symbols: List[str]) -> None:
        for s in symbols:
            self._subscribed_symbols.discard(s)

    async def get_snapshot(self, symbols: List[str]) -> Dict[str, NormalizedQuote]:
        return {s: self._quote_cache[s] for s in symbols if s in self._quote_cache}

    async def get_history(self, symbol: str, timeframe: str, from_dt: datetime, to_dt: datetime) -> List[OHLCVCandle]:
        return []

    async def get_instruments(self) -> List[CanonicalInstrument]:
        return []

    async def health_check(self) -> ProviderHealth:
        return ProviderHealth(
            provider_id="sim_feed",
            provider_name="Simulation Feed Engine",
            status="LIVE",
            asset_classes=["INDIAN_EQUITIES", "INDIAN_INDICES", "CRYPTO"],
            subscribed_symbols=len(self._subscribed_symbols),
            latency_ms=1.0,
            message="Deterministic Simulator Active (Mode: SIMULATION)",
            auth_status="HEALTHY",
            rest_status="HEALTHY",
            stream_status="CONNECTED",
            capabilities={"simulation": True},
        )
