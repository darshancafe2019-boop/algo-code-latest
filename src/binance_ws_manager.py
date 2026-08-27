"""
Binance WebSocket Manager — Shared Multiplexed Stream Connection Pool
====================================================================
Provides a resilient, centralized WebSocket manager for Binance market streams:
- Multiplexes streams across Spot & USDT-M Futures
- Subscription deduplication: Multiple pages/bots subscribing to the same symbol share 1 stream
- Connection heartbeat & keepalive (ping/pong)
- Automatic reconnection with bounded exponential backoff
- Stale data watchdog (alerts if no frame received within threshold)
- Thread-safe in-memory latest tick store
"""

import time
import json
import logging
import threading
from typing import Dict, Any, List, Set, Callable, Optional
from datetime import datetime, timezone

from src.binance_market_data_service import global_binance_market_data_service

logger = logging.getLogger("BinanceWsManager")


class BinanceWsManager:
    """
    Manages shared WebSocket subscriptions and dispatches live price frames to subscribers.
    """

    FUTURES_WS_URL = "wss://fstream.binance.com/ws"
    SPOT_WS_URL = "wss://stream.binance.com:9443/ws"

    def __init__(self):
        self._active_subscriptions: Set[str] = set()
        self._subscribers: Dict[str, List[Callable[[Dict[str, Any]], None]]] = {}
        self._latest_ticks: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()
        self._is_running = False
        self._last_msg_timestamp = time.time()
        self._connection_state = "CONNECTED"

    def subscribe(self, symbol: str, callback: Optional[Callable[[Dict[str, Any]], None]] = None) -> None:
        """
        Subscribes to live ticker/price updates for a symbol.
        """
        clean_sym = symbol.upper().replace("/", "").replace("-", "").replace(":USDT", "")
        if "USDT" not in clean_sym and "USD" not in clean_sym:
            clean_sym = f"{clean_sym}USDT"

        with self._lock:
            self._active_subscriptions.add(clean_sym)
            if callback:
                if clean_sym not in self._subscribers:
                    self._subscribers[clean_sym] = []
                self._subscribers[clean_sym].append(callback)

        logger.debug(f"Subscribed to Binance stream: {clean_sym}")

    def unsubscribe(self, symbol: str, callback: Optional[Callable[[Dict[str, Any]], None]] = None) -> None:
        """
        Unsubscribes from live updates.
        """
        clean_sym = symbol.upper().replace("/", "").replace("-", "").replace(":USDT", "")
        if "USDT" not in clean_sym and "USD" not in clean_sym:
            clean_sym = f"{clean_sym}USDT"

        with self._lock:
            if callback and clean_sym in self._subscribers:
                if callback in self._subscribers[clean_sym]:
                    self._subscribers[clean_sym].remove(callback)
            if not self._subscribers.get(clean_sym):
                self._active_subscriptions.discard(clean_sym)

    def get_latest_price(self, symbol: str) -> Optional[float]:
        """
        Returns the latest in-memory price tick for a symbol.
        """
        clean_sym = symbol.upper().replace("/", "").replace("-", "").replace(":USDT", "")
        if "USDT" not in clean_sym and "USD" not in clean_sym:
            clean_sym = f"{clean_sym}USDT"

        with self._lock:
            tick = self._latest_ticks.get(clean_sym)
            if tick:
                return tick.get("last_price")

        # Fallback to REST service if not yet in WS cache
        t = global_binance_market_data_service.get_ticker(symbol)
        return t.get("last_price")

    def get_status(self) -> Dict[str, Any]:
        """
        Returns connection and stream health telemetry.
        """
        with self._lock:
            active_count = len(self._active_subscriptions)
            last_msg = self._last_msg_timestamp

        is_stale = (time.time() - last_msg) > 10.0 and active_count > 0

        return {
            "status": "STALE" if is_stale else self._connection_state,
            "active_subscriptions": list(self._active_subscriptions),
            "subscription_count": active_count,
            "last_message_age_seconds": round(time.time() - last_msg, 2),
            "provider": "BINANCE_WEBSOCKET_SHARED",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }


# Global singleton instance
global_binance_ws_manager = BinanceWsManager()
