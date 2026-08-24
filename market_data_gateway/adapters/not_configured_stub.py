"""
NOT_CONFIGURED Stub Adapter
============================
Placeholder for providers that require credentials not yet supplied.
Returns NOT_CONFIGURED status so the health endpoint is honest about which providers
are active vs. pending setup.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List

from market_data_gateway.adapters.base import (
    BaseProviderAdapter,
    CanonicalInstrument,
    NormalizedQuote,
    OHLCVCandle,
    ProviderHealth,
)


class NotConfiguredAdapter(BaseProviderAdapter):
    """
    Placeholder adapter for providers that are not yet configured.
    """
    def __init__(
        self,
        provider_id: str,
        provider_name: str,
        asset_classes: List[str],
        setup_instructions: str,
    ):
        super().__init__(provider_id, provider_name)
        self._asset_classes = asset_classes
        self._setup_instructions = setup_instructions
        self._status = "NOT_CONFIGURED"

    async def connect(self) -> None:
        self._status = "NOT_CONFIGURED"

    async def disconnect(self) -> None:
        pass

    async def subscribe(self, symbols: List[str]) -> None:
        pass

    async def unsubscribe(self, symbols: List[str]) -> None:
        pass

    async def get_snapshot(self, symbols: List[str]) -> Dict[str, NormalizedQuote]:
        return {}

    async def get_history(self, symbol, timeframe, from_dt, to_dt) -> List[OHLCVCandle]:
        return []

    async def get_instruments(self) -> List[CanonicalInstrument]:
        return []

    async def health_check(self) -> ProviderHealth:
        return ProviderHealth(
            provider_id=self.provider_id,
            provider_name=self.provider_name,
            status="NOT_CONFIGURED",
            asset_classes=self._asset_classes,
            message=self._setup_instructions,
        )
