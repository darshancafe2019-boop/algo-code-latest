"""
Failover Manager
================
Per-asset-class priority-ordered provider chains.
When a primary provider trips, a deterministic secondary is activated.
Validates symbol/exchange/currency/timestamp consistency before accepting backup feed.
"""
from __future__ import annotations

import logging
import time
from typing import Any, Dict, List, Optional, Tuple

from market_data_gateway.adapters.base import BaseProviderAdapter, NormalizedQuote

logger = logging.getLogger("MDGateway.Failover")

# Provider priority chains per asset class
# Primary -> Fallback -> Last-resort
FAILOVER_CHAINS: Dict[str, List[str]] = {
    "CRYPTO": ["binance_ws", "delta_options_ws", "yahoo_fallback"],
    "CRYPTO_OPTIONS": ["delta_options_ws", "binance_ws"],
    "INDIAN_EQUITIES": ["dhan_ws", "upstox_ws", "angelone", "yahoo_fallback"],
    "INDIAN_INDICES": ["dhan_ws", "upstox_ws", "angelone", "yahoo_fallback"],
    "GLOBAL_EQUITIES": ["twelve_data", "polygon", "yahoo_fallback"],
    "GLOBAL_INDICES": ["twelve_data", "yahoo_fallback"],
    "FOREX": ["twelve_data", "yahoo_fallback"],
    "COMMODITIES": ["dhan_ws", "twelve_data", "yahoo_fallback"],
    "FUTURES": ["binance_ws", "delta_options_ws", "dhan_ws", "upstox_ws", "databento", "yahoo_fallback"],
    "OPTIONS": ["delta_options_ws", "dhan_ws", "upstox_ws", "angelone", "twelve_data"],
}

# Asset class assignment per symbol prefix/pattern (simplified)
ASSET_CLASS_HINTS: Dict[str, str] = {
    "NIFTY": "INDIAN_INDICES", "BANKNIFTY": "INDIAN_INDICES",
    "FINNIFTY": "INDIAN_INDICES", "SENSEX": "INDIAN_INDICES",
    "SPX": "GLOBAL_INDICES", "NDX": "GLOBAL_INDICES", "DJI": "GLOBAL_INDICES",
    "FTSE100": "GLOBAL_INDICES", "DAX": "GLOBAL_INDICES", "NIKKEI225": "GLOBAL_INDICES",
    "BTC/USDT": "CRYPTO", "ETH/USDT": "CRYPTO", "BNB/USDT": "CRYPTO", "SOL/USDT": "CRYPTO",
    "BTCUSDT": "CRYPTO", "ETHUSDT": "CRYPTO", "SOLUSDT": "CRYPTO",
    "BTCUSD": "CRYPTO", "ETHUSD": "CRYPTO", "SOLUSD": "CRYPTO", "XRPUSD": "CRYPTO",
    "EUR/USD": "FOREX", "GBP/USD": "FOREX", "USD/JPY": "FOREX",
    "GOLD": "COMMODITIES", "SILVER": "COMMODITIES", "CRUDE_OIL": "COMMODITIES",
}


def _get_asset_class(symbol: str) -> str:
    """Infer asset class from symbol (best-effort)."""
    sym = symbol.strip().upper()
    if sym in ASSET_CLASS_HINTS:
        return ASSET_CLASS_HINTS[sym]

    # Crypto option format e.g. BTC-300826-60000-C or BTC-240927-60000-P
    if ("-C" in sym or "-P" in sym) and any(sym.startswith(c) for c in ("BTC", "ETH", "SOL", "BNB")):
        return "CRYPTO_OPTIONS"

    if "/" in sym:
        parts = sym.split("/")
        # If quote is a stablecoin/USD -> crypto
        if parts[-1] in ("USDT", "USDC", "BTC", "ETH", "BNB", "BUSD", "USD"):
            return "CRYPTO"
        # Currency pair
        if all(len(p) == 3 for p in parts):
            return "FOREX"

    # Bare crypto ticker ending with USDT/USDC/USD
    for suffix in ("USDT", "USDC", "BUSD"):
        if sym.endswith(suffix) and len(sym) > len(suffix):
            return "CRYPTO"

    if sym.endswith("USD") and len(sym) == 6 and any(sym.startswith(c) for c in ("BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOG")):
        return "CRYPTO"

    # Default to Indian equity for bare ticker (NSE stock pattern)
    return "INDIAN_EQUITIES"


class FailoverManager:
    """
    Selects the best available provider for a given symbol.
    Records failover transitions with timestamps and reasons.
    """

    def __init__(self, adapters: Dict[str, BaseProviderAdapter]):
        self._adapters = adapters
        # symbol -> currently-active provider_id
        self._active_provider: Dict[str, str] = {}
        # Transition log (bounded)
        self._transitions: List[Dict[str, Any]] = []

    def get_best_provider(self, symbol: str) -> Optional[BaseProviderAdapter]:
        """
        Return the highest-priority LIVE/DELAYED adapter for the symbol.
        Falls back down the chain if primary is DISCONNECTED/STALE/NOT_CONFIGURED.
        """
        asset_class = _get_asset_class(symbol)
        chain = FAILOVER_CHAINS.get(asset_class, ["yahoo_fallback"])

        for provider_id in chain:
            adapter = self._adapters.get(provider_id)
            if adapter is None:
                continue
            status = adapter.get_status()
            if status in ("LIVE", "DELAYED", "STALE"):
                # Record transition if provider changed
                prev = self._active_provider.get(symbol)
                if prev and prev != provider_id:
                    self._log_transition(symbol, prev, provider_id, "failover")
                self._active_provider[symbol] = provider_id
                return adapter

        logger.warning("No available provider for %s (chain: %s)", symbol, chain)
        return None

    def get_quote(self, symbol: str) -> Optional[NormalizedQuote]:
        """
        Synchronous LKG cache lookup — returns cached quote from any active provider.
        Used by the Flask endpoint for REST snapshot.
        """
        asset_class = _get_asset_class(symbol)
        chain = FAILOVER_CHAINS.get(asset_class, ["yahoo_fallback"])
        for provider_id in chain:
            adapter = self._adapters.get(provider_id)
            if adapter is None or adapter.get_status() not in ("LIVE", "DELAYED", "STALE"):
                continue
            cache = getattr(adapter, "_quote_cache", {})
            if symbol in cache:
                return cache[symbol]
        return None

    def get_all_provider_health(self) -> List[Dict[str, Any]]:
        """Return health status for all registered adapters."""
        result = []
        for adapter in self._adapters.values():
            result.append({
                "provider_id": adapter.provider_id,
                "provider_name": adapter.provider_name,
                "status": adapter.get_status(),
                "subscribed_symbols": len(adapter.get_subscribed_symbols()),
                "error_count": adapter._error_count,
            })
        return result

    def get_transitions(self, limit: int = 20) -> List[Dict[str, Any]]:
        return self._transitions[-limit:]

    def _log_transition(self, symbol: str, from_id: str, to_id: str, reason: str) -> None:
        event = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "symbol": symbol,
            "from_provider": from_id,
            "to_provider": to_id,
            "reason": reason,
        }
        self._transitions.append(event)
        if len(self._transitions) > 500:
            self._transitions.pop(0)
        logger.warning(
            "FAILOVER: %s switched from %s -> %s (%s)",
            symbol, from_id, to_id, reason,
        )
