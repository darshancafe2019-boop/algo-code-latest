"""
Canonical Instrument ID Resolution
==================================
Guarantees unambiguous identity resolution across exchanges and providers.
Format: {provider}:{exchange}:{instrument_key_or_token}
"""

import re
from typing import NamedTuple, Optional


class CanonicalId(NamedTuple):
    provider: str
    exchange: str
    instrument_key: str

    def to_string(self) -> str:
        return f"{self.provider.lower()}:{self.exchange.upper()}:{self.instrument_key}"


def make_canonical_id(provider: str, exchange: str, instrument_key: str) -> str:
    """Creates a standardized canonical ID string."""
    clean_provider = provider.strip().lower()
    clean_exchange = exchange.strip().upper()
    clean_key = instrument_key.strip()
    return f"{clean_provider}:{clean_exchange}:{clean_key}"


def parse_canonical_id(canonical_id: str) -> Optional[CanonicalId]:
    """Parses a canonical ID string into structured components."""
    if not canonical_id or not isinstance(canonical_id, str):
        return None
    parts = canonical_id.split(":", 2)
    if len(parts) != 3:
        return None
    return CanonicalId(provider=parts[0].lower(), exchange=parts[1].upper(), instrument_key=parts[2])


class CanonicalIdResolver:
    """Helper for cross-referencing and resolving native symbols to canonical IDs."""

    @staticmethod
    def resolve_stock(symbol: str, exchange: str = "NSE", provider: str = "upstox") -> str:
        clean_sym = symbol.strip().upper()
        clean_ex = exchange.strip().upper()
        clean_prov = provider.strip().lower()
        return f"{clean_prov}:{clean_ex}:{clean_sym}"
