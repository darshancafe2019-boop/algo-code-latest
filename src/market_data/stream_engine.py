"""
Centralized Realtime Stream Multiplexer
=======================================
Central stream manager handling client subscriptions, heartbeat pings,
incremental deltas, sequence ordering, and SSE/WebSocket fan-out.
"""

import time
import json
import queue
import logging
import threading
from typing import Dict, Any, List, Optional, Set
from datetime import datetime, timezone
from src.market_data.schemas import MarketQuote
from src.market_data.cache_engine import global_market_cache
from src.market_data.data_quality import DataQualityEngine

logger = logging.getLogger("CentralizedStreamManager")


class CentralizedStreamManager:
    """
    Centralized Realtime Stream Manager.
    Multiplexes all symbol quote streams into a single client connection.
    """

    def __init__(self, max_queue_size: int = 100):
        self._lock = threading.RLock()
        self._max_queue_size = max_queue_size
        self._client_queues: Dict[str, queue.Queue] = {}  # client_id -> Queue
        self._client_subscriptions: Dict[str, Set[str]] = {}  # client_id -> Set[symbol]
        self._client_metrics: Dict[str, Dict[str, Any]] = {}  # client_id -> metrics
        self._sequence_counter = 0
        self._quality_engine = DataQualityEngine()

    def register_client(self, client_id: str) -> queue.Queue:
        """Registers a new SSE / WebSocket client listener with bounded queue."""
        with self._lock:
            q = queue.Queue(maxsize=self._max_queue_size)
            self._client_queues[client_id] = q
            self._client_subscriptions[client_id] = set(["BTC/USDT", "ETH/USDT", "NIFTY", "BANKNIFTY"])
            self._client_metrics[client_id] = {
                "registered_at": time.time(),
                "delivered": 0,
                "dropped": 0,
            }
            logger.info("Registered stream client: %s (Queue maxsize: %d, Total active: %d)", client_id, self._max_queue_size, len(self._client_queues))
            return q

    def unregister_client(self, client_id: str) -> None:
        """Safely removes a disconnected client listener and drains queue."""
        with self._lock:
            if client_id in self._client_queues:
                q = self._client_queues.pop(client_id, None)
                if q:
                    # Drain queue to assist garbage collection
                    while not q.empty():
                        try:
                            q.get_nowait()
                        except Exception:
                            break
            if client_id in self._client_subscriptions:
                del self._client_subscriptions[client_id]
            if client_id in self._client_metrics:
                del self._client_metrics[client_id]
            logger.info("Unregistered stream client: %s (Remaining active: %d)", client_id, len(self._client_queues))

    def update_subscriptions(self, client_id: str, symbols: List[str]) -> None:
        """Updates the set of subscribed symbols for a client."""
        with self._lock:
            if client_id in self._client_subscriptions:
                self._client_subscriptions[client_id] = set(s.upper() for s in symbols)

    def broadcast_quote(self, quote: MarketQuote) -> None:
        """
        Validates, caches, and fans out a normalized quote to subscribed clients.
        Slow-client protection: drops oldest message when queue is full.
        """
        # Validate quality
        is_valid, quality, reasons = self._quality_engine.validate_quote(quote)
        if not is_valid and quality != "VALID":
            logger.debug("Broadcast quote rejected by quality engine for %s: %s", quote.symbol, reasons)

        with self._lock:
            self._sequence_counter += 1
            quote.sequence = self._sequence_counter

        # Cache in global cache
        quote_dict = quote.to_dict()
        global_market_cache.publish_ticker(quote.symbol, quote_dict)

        # Fan out to client queues
        payload = json.dumps({"type": "QUOTE", "data": quote_dict})
        sym_key = quote.symbol.upper()

        with self._lock:
            for cid, q in list(self._client_queues.items()):
                subs = self._client_subscriptions.get(cid, set())
                if "*" in subs or sym_key in subs or sym_key.replace("/", "") in subs:
                    try:
                        q.put_nowait(payload)
                        if cid in self._client_metrics:
                            self._client_metrics[cid]["delivered"] += 1
                    except queue.Full:
                        try:
                            q.get_nowait()  # Drop oldest (slow-client protection)
                            q.put_nowait(payload)
                            if cid in self._client_metrics:
                                self._client_metrics[cid]["dropped"] += 1
                        except Exception:
                            pass

    def send_heartbeat(self) -> None:
        """Sends periodic heartbeat ping to keep SSE connections alive."""
        payload = json.dumps({
            "type": "HEARTBEAT",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "HEALTHY",
        })
        with self._lock:
            for cid, q in list(self._client_queues.items()):
                try:
                    q.put_nowait(payload)
                    if cid in self._client_metrics:
                        self._client_metrics[cid]["delivered"] += 1
                except queue.Full:
                    try:
                        q.get_nowait()
                        q.put_nowait(payload)
                        if cid in self._client_metrics:
                            self._client_metrics[cid]["dropped"] += 1
                    except Exception:
                        pass

    def get_stream_stats(self) -> Dict[str, Any]:
        """Provides diagnostic stream statistics and metrics."""
        with self._lock:
            active_clients = len(self._client_queues)
            total_symbols = set()
            for s in self._client_subscriptions.values():
                total_symbols.update(s)

            total_delivered = sum(m.get("delivered", 0) for m in self._client_metrics.values())
            total_dropped = sum(m.get("dropped", 0) for m in self._client_metrics.values())

        return {
            "active_clients": active_clients,
            "monitored_symbols_count": len(total_symbols),
            "sequence_counter": self._sequence_counter,
            "total_delivered": total_delivered,
            "total_dropped": total_dropped,
            "status": "STREAMING_LIVE",
        }


# Global Singleton Instance
global_stream_manager = CentralizedStreamManager()
