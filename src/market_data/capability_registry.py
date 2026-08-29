"""
Quant.OS Provider Capability Registry
====================================
Capability-based routing matrix for global market data.
Routes queries by capability flags (e.g. options_chain, funding_rate, economic_data)
and market region, never by brittle symbol prefixes.
"""

from __future__ import annotations

import os
import logging
from typing import Dict, Any, List, Optional
from src.market_data.global_taxonomy import (
    ProviderCapabilityRecord,
    MarketRegion,
    AssetClass,
    InstrumentType,
    DataStatus,
)

logger = logging.getLogger("CapabilityRegistry")


class ProviderCapabilityRegistry:
    """Authoritative registry of market data providers and their genuine capabilities."""

    def __init__(self):
        self._providers: Dict[str, ProviderCapabilityRecord] = {}
        self._initialize_registry()

    def _initialize_registry(self) -> None:
        has_upstox_token = bool(os.getenv("UPSTOX_ACCESS_TOKEN") or os.getenv("UPSTOX_ANALYTICS_TOKEN"))
        has_binance_key = bool(os.getenv("BINANCE_API_KEY") or True) # Public market data available
        has_global_key = bool(os.getenv("POLYGON_API_KEY") or os.getenv("TWELVE_DATA_API_KEY") or os.getenv("FINNHUB_API_KEY"))

        # 1. Official Upstox (India Equities, Indices, F&O)
        self._providers["upstox"] = ProviderCapabilityRecord(
            provider="upstox",
            supported_markets=[MarketRegion.INDIA.value],
            supported_asset_classes=[
                AssetClass.EQUITY.value,
                AssetClass.INDEX.value,
            ],
            instrument_discovery=True,
            historical_data=True,
            rest_quotes=True,
            websocket_quotes=True,
            trades=True,
            orderbook=True,
            options_chain=True,
            open_interest=True,
            funding_rate=False,
            economic_data=False,
            authentication_required=True,
            rate_limits={"requests_per_sec": 25, "websocket_subscriptions": 100},
            licence_status="VERIFIED_OFFICIAL",
            connection_status="LIVE" if has_upstox_token else "AUTH_REQUIRED",
        )

        # 2. Official Binance (Crypto Spot, Futures, Perpetuals, Options)
        self._providers["binance"] = ProviderCapabilityRecord(
            provider="binance",
            supported_markets=[MarketRegion.CRYPTO.value],
            supported_asset_classes=[
                AssetClass.CRYPTO.value,
            ],
            instrument_discovery=True,
            historical_data=True,
            rest_quotes=True,
            websocket_quotes=True,
            trades=True,
            orderbook=True,
            options_chain=True,
            open_interest=True,
            funding_rate=True,
            economic_data=False,
            authentication_required=False,
            rate_limits={"requests_per_min": 1200, "weight_per_min": 6000},
            licence_status="VERIFIED_OFFICIAL",
            connection_status="LIVE",
        )

        # 3. Licensed Global Provider (US/EU Stocks, Funds, Bonds, Forex, Commodities, Macro)
        self._providers["licensed_global"] = ProviderCapabilityRecord(
            provider="licensed_global",
            supported_markets=[
                MarketRegion.US.value,
                MarketRegion.EUROPE.value,
                MarketRegion.ASIA.value,
                MarketRegion.GLOBAL.value,
            ],
            supported_asset_classes=[
                AssetClass.EQUITY.value,
                AssetClass.FUND.value,
                AssetClass.ETF.value,
                AssetClass.INDEX.value,
                AssetClass.FOREX.value,
                AssetClass.COMMODITY.value,
                AssetClass.BOND.value,
                AssetClass.ECONOMIC_SERIES.value,
            ],
            instrument_discovery=True,
            historical_data=True,
            rest_quotes=True,
            websocket_quotes=has_global_key,
            trades=True,
            orderbook=False,
            options_chain=False,
            open_interest=False,
            funding_rate=False,
            economic_data=True,
            authentication_required=True,
            rate_limits={"requests_per_min": 60},
            licence_status="LICENSED" if has_global_key else "DATA_SOURCE_REQUIRED",
            connection_status="LIVE" if has_global_key else "DATA_SOURCE_REQUIRED",
        )

    def get_all_providers(self) -> List[Dict[str, Any]]:
        """Returns all provider capability records."""
        return [p.to_dict() for p in self._providers.values()]

    def get_provider(self, provider_id: str) -> Optional[ProviderCapabilityRecord]:
        return self._providers.get(provider_id.lower())

    def find_providers_for_capability(
        self,
        capability: str,
        market_region: Optional[str] = None,
        asset_class: Optional[str] = None,
    ) -> List[ProviderCapabilityRecord]:
        """Finds matching providers that satisfy the capability and market criteria."""
        matched: List[ProviderCapabilityRecord] = []
        for p in self._providers.values():
            if hasattr(p, capability) and getattr(p, capability) is True:
                if market_region and market_region not in p.supported_markets and "GLOBAL" not in p.supported_markets:
                    continue
                if asset_class and asset_class not in p.supported_asset_classes:
                    continue
                matched.append(p)
        return matched


# Global singleton instance
global_capability_registry = ProviderCapabilityRegistry()
