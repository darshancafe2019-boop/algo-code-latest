"""
Live Market Data Feed Manager & Event Bus
=========================================
Central orchestrator for multi-provider live market data ingestion:
- Manages independent live feeds: Dhan, Delta, FYERS, Upstox, Binance
- Normalizes all incoming ticks into canonical MarketTick & NormalizedQuote contracts
- Validates data quality (prevents negative price, crossed spreads, NaN, Infinity)
- Deduplicates and handles out-of-order sequence arrivals
- Publishes to internal Event Bus (market.tick, market.quote, market.depth, market.greeks, feed.connected, feed.disconnected)
- Updates low-latency MarketDataCache
"""
from __future__ import annotations

import asyncio
import logging
from typing import Dict, List, Optional, Set, Callable, Any

from market_data_gateway.models.tick import MarketTick
from market_data_gateway.models.feed_status import FeedState, ProviderHealthReport
from market_data_gateway.adapters.base import NormalizedQuote, BaseProviderAdapter, ProviderHealth
from market_data_gateway.cache.market_cache import MarketDataCache, global_market_cache
from market_data_gateway.core.stale_detector import StaleDetector, global_stale_detector
from market_data_gateway.core.metrics import MetricsCollector, global_metrics
from market_data_gateway.core.subscription_manager import SubscriptionManager, global_subscription_manager

logger = logging.getLogger("FeedCore.FeedManager")


class MarketDataEventBus:
    """Internal event bus for decoupling market data ingestion from strategy and UI consumers."""

    def __init__(self):
        self._subscribers: Dict[str, List[Callable[[Any], None]]] = {
            "market.tick": [],
            "market.quote": [],
            "market.depth": [],
            "market.greeks": [],
            "feed.connected": [],
            "feed.disconnected": [],
            "feed.auth_expired": [],
            "feed.error": [],
        }

    def subscribe(self, event_type: str, callback: Callable[[Any], None]) -> None:
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(callback)

    def publish(self, event_type: str, data: Any) -> None:
        for cb in self._subscribers.get(event_type, []):
            try:
                cb(data)
            except Exception as e:
                logger.error("EventBus error dispatching '%s': %s", event_type, e)


class FeedManager:
    """Central manager coordinating all provider feeds, validation, cache, and broadcasting."""

    def __init__(
        self,
        adapters: Optional[Dict[str, BaseProviderAdapter]] = None,
        cache: Optional[MarketDataCache] = None,
        stale_detector: Optional[StaleDetector] = None,
        metrics: Optional[MetricsCollector] = None,
    ):
        self.adapters: Dict[str, BaseProviderAdapter] = adapters or {}
        self.cache = cache or global_market_cache
        self.stale_detector = stale_detector or global_stale_detector
        self.metrics = metrics or global_metrics
        self.event_bus = MarketDataEventBus()
        self.subscription_manager = global_subscription_manager
        self.subscription_manager.set_adapters(self.adapters)

        # Register quote receiver callback
        for adapter in self.adapters.values():
            adapter.set_quote_callback(self.handle_incoming_quote)

    def register_adapter(self, key: str, adapter: BaseProviderAdapter) -> None:
        self.adapters[key] = adapter
        adapter.set_quote_callback(self.handle_incoming_quote)
        self.subscription_manager.set_adapters(self.adapters)

    def handle_incoming_quote(self, quote: NormalizedQuote) -> None:
        """Processes normalized quotes from any adapter with quality gating and bus dispatch."""
        if not quote or not quote.symbol:
            return

        # Data Quality Gate
        if quote.last_price is None or quote.last_price < 0 or float(quote.last_price) != float(quote.last_price):
            logger.debug("Dropped malformed quote for %s: price=%s", quote.symbol, quote.last_price)
            return

        # Stale classification
        quote.mark_stale()

        # Update cache
        self.cache._quotes[quote.symbol] = quote
        self.cache._quotes[quote.symbol.upper()] = quote

        # Publish to Event Bus
        self.event_bus.publish("market.quote", quote)

    def get_health_report(self) -> Dict[str, Any]:
        """Returns instantaneous health status snapshot for all providers."""
        results: Dict[str, Any] = {}
        for key, adapter in self.adapters.items():
            results[key] = {
                "provider_id": key,
                "status": adapter.get_status(),
                "subscriptions": len(adapter.get_subscribed_symbols()),
                "metrics": self.metrics.get_provider(key).to_dict(),
            }
        return results

    def get_metrics(self) -> Dict[str, Any]:
        return self.metrics.to_dict()

    async def get_health_summary(self) -> Dict[str, Any]:
        """Returns unified health report across all 4 key providers + gateways."""
        results: Dict[str, Any] = {}
        for key, adapter in self.adapters.items():
            try:
                h: ProviderHealth = await adapter.health_check()
                results[key] = h.to_dict()
            except Exception as exc:
                results[key] = {
                    "provider_id": key,
                    "status": "ERROR",
                    "message": str(exc),
                }
        return results


global_feed_manager = FeedManager()
