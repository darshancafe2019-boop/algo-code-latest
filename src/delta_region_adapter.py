"""
Delta Exchange Regional Multi-Environment Adapter
=================================================
Manages region-specific REST and WebSocket configurations for Delta Exchange.
Supports:
- DELTA_INDIA (India Production & Regulated Environment)
- DELTA_GLOBAL (Global / International Production Environment)
"""

import os
from enum import Enum
from typing import Dict, Any, Optional
from dataclasses import dataclass


class DeltaRegion(str, Enum):
    INDIA = "INDIA"
    GLOBAL = "GLOBAL"


@dataclass(frozen=True)
class DeltaRegionConfig:
    region: DeltaRegion
    exchange_name: str
    rest_base_url: str
    ws_base_url: str
    ws_fallback_url: str
    currency: str
    settlement_currency: str
    is_india: bool


DELTA_REGIONAL_CONFIGS: Dict[DeltaRegion, DeltaRegionConfig] = {
    DeltaRegion.INDIA: DeltaRegionConfig(
        region=DeltaRegion.INDIA,
        exchange_name="Delta Exchange India",
        rest_base_url=os.getenv("DELTA_INDIA_REST_URL", "https://api.india.delta.exchange"),
        ws_base_url=os.getenv("DELTA_INDIA_WS_URL", "wss://public-socket.india.delta.exchange"),
        ws_fallback_url=os.getenv("DELTA_INDIA_WS_FALLBACK", "wss://socket.india.delta.exchange"),
        currency="USD",
        settlement_currency="USD",
        is_india=True,
    ),
    DeltaRegion.GLOBAL: DeltaRegionConfig(
        region=DeltaRegion.GLOBAL,
        exchange_name="Delta Exchange Global",
        rest_base_url=os.getenv("DELTA_GLOBAL_REST_URL", "https://api.delta.exchange"),
        ws_base_url=os.getenv("DELTA_GLOBAL_WS_URL", "wss://socket.delta.exchange"),
        ws_fallback_url=os.getenv("DELTA_GLOBAL_WS_FALLBACK", "wss://production-es.delta.exchange"),
        currency="USD",
        settlement_currency="USD",
        is_india=False,
    ),
}


class DeltaRegionAdapter:
    """Provides regional endpoint resolution and configuration."""

    @staticmethod
    def get_config(region: Optional[str] = None) -> DeltaRegionConfig:
        clean_reg = (region or os.getenv("DELTA_DEFAULT_REGION", "INDIA")).upper().strip()
        if "GLOBAL" in clean_reg or clean_reg == "WORLD":
            return DELTA_REGIONAL_CONFIGS[DeltaRegion.GLOBAL]
        return DELTA_REGIONAL_CONFIGS[DeltaRegion.INDIA]

    @staticmethod
    def get_rest_url(region: Optional[str] = None) -> str:
        return DeltaRegionAdapter.get_config(region).rest_base_url

    @staticmethod
    def get_ws_url(region: Optional[str] = None) -> str:
        return DeltaRegionAdapter.get_config(region).ws_base_url

    @staticmethod
    def get_ws_fallback_url(region: Optional[str] = None) -> str:
        return DeltaRegionAdapter.get_config(region).ws_fallback_url
