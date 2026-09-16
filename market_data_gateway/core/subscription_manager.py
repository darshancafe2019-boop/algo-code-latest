"""
Central Subscription Manager
============================
Unified subscription coordinator across all market data adapters (Dhan, Delta, FYERS, Upstox, Binance).
Enforces:
- Dynamic subscriptions & unsubscriptions without full reconnects
- Provider capacity limits & priority queuing (Active strategies > Positions > Option Chain > Watchlist > Table)
- Single connection ownership
- Deduplicated active tracking
"""
from __future__ import annotations

import asyncio
import logging
from typing import Dict, List, Optional, Set, Any

from market_data_gateway.subscriptions.planner import (
    SubscriptionPlanner,
    SubscriptionPriority,
    global_subscription_planner,
)
from market_data_gateway.subscriptions.resolver import (
    InstrumentResolver,
    global_instrument_resolver,
)
from market_data_gateway.adapters.base import BaseProviderAdapter

logger = logging.getLogger("FeedCore.SubscriptionManager")


class SubscriptionManager:
    """Coordinates multi-provider market data subscriptions."""

    def __init__(self, adapters: Optional[Dict[str, BaseProviderAdapter]] = None):
        self._adapters: Dict[str, BaseProviderAdapter] = adapters or {}
        self._planner = global_subscription_planner
        self._resolver = global_instrument_resolver
        self._lock = asyncio.Lock()

    def set_adapters(self, adapters: Dict[str, BaseProviderAdapter]) -> None:
        self._adapters = adapters

    def register_adapter(self, name: str, adapter: BaseProviderAdapter) -> None:
        self._adapters[name] = adapter

    async def subscribe(
        self,
        provider: str,
        instruments: List[str],
        priority: SubscriptionPriority = SubscriptionPriority.VISIBLE_TABLE,
        mode: str = "LTP",
        reason: str = "UI_REQUEST",
    ) -> Dict[str, Any]:
        """
        Main entrypoint for subscription requests.
        Decides provider adapter, checks capacity, plans prioritization, and dispatches to WebSocket adapter.
        """
        prov_key = provider.lower().strip()
        # Map generic provider name to adapter key
        adapter_key = prov_key
        if prov_key == "fyers":
            adapter_key = "fyers_ws"
        elif prov_key == "upstox":
            adapter_key = "upstox_ws"
        elif prov_key == "dhan":
            adapter_key = "dhan_ws"
        elif prov_key == "delta":
            adapter_key = "delta_options_ws"
        elif prov_key == "binance":
            adapter_key = "binance_ws"

        adapter = self._adapters.get(adapter_key)
        if not adapter:
            logger.warning("Adapter '%s' not registered in SubscriptionManager.", adapter_key)
            return {
                "status": "error",
                "message": f"Provider adapter '{provider}' not available.",
                "provider": provider,
                "approved": [],
                "rejected": instruments,
            }

        async with self._lock:
            # Plan and validate capacity
            approved, rejected = self._planner.plan_subscriptions(
                provider=prov_key,
                symbols=instruments,
                priority=priority,
                reason=reason,
            )

            if approved:
                try:
                    await adapter.subscribe(approved)
                except Exception as exc:
                    logger.error("Error subscribing symbols on %s: %s", adapter_key, exc)
                    return {
                        "status": "partial_error",
                        "provider": provider,
                        "approved": [],
                        "rejected": instruments,
                        "error": str(exc),
                    }

            return {
                "status": "success" if not rejected else "partial_success",
                "provider": provider,
                "adapter": adapter_key,
                "approved_count": len(approved),
                "rejected_count": len(rejected),
                "approved": approved,
                "rejected": rejected,
                "active_total": self._planner.get_active_count(prov_key),
                "remaining_capacity": self._planner.get_remaining_capacity(prov_key),
            }

    async def unsubscribe(self, provider: str, instruments: List[str]) -> Dict[str, Any]:
        """Releases ref-counts and unsubscribes from broker WebSocket when zero active consumers remain."""
        prov_key = provider.lower().strip()
        adapter_key = prov_key
        if prov_key == "fyers":
            adapter_key = "fyers_ws"
        elif prov_key == "upstox":
            adapter_key = "upstox_ws"
        elif prov_key == "dhan":
            adapter_key = "dhan_ws"
        elif prov_key == "delta":
            adapter_key = "delta_options_ws"

        adapter = self._adapters.get(adapter_key)
        async with self._lock:
            to_unsub = self._planner.release_subscriptions(prov_key, instruments)
            if to_unsub and adapter:
                try:
                    await adapter.unsubscribe(to_unsub)
                except Exception as exc:
                    logger.error("Error unsubscribing on %s: %s", adapter_key, exc)

            return {
                "status": "success",
                "provider": provider,
                "unsubscribed_symbols": to_unsub,
                "active_total": self._planner.get_active_count(prov_key),
            }

    def get_status(self) -> Dict[str, Any]:
        return {
            "active_subscriptions": {
                prov: self._planner.get_active_count(prov)
                for prov in self._planner.max_capacity
            },
            "remaining_capacity": {
                prov: self._planner.get_remaining_capacity(prov)
                for prov in self._planner.max_capacity
            },
        }


global_subscription_manager = SubscriptionManager()
