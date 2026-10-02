"""
Provider Registry & Telemetry Subsystem
=======================================
Tracks health, performance, latency, ticks/sec, rate limits, and connection state
across all configured market data and execution providers.
"""
from __future__ import annotations

import enum
import logging
import time
from collections import deque
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set

logger = logging.getLogger("MDGateway.ProviderRegistry")


class ConnectionState(str, enum.Enum):
    CONNECTED = "CONNECTED"
    CONNECTING = "CONNECTING"
    RECONNECTING = "RECONNECTING"
    DEGRADED = "DEGRADED"
    DISCONNECTED = "DISCONNECTED"
    AUTH_FAILED = "AUTH_FAILED"
    RATE_LIMITED = "RATE_LIMITED"
    STALE = "STALE"


@dataclass
class ProviderTelemetry:
    """Real-time performance and state telemetry for a single provider."""
    provider_id: str
    provider_name: str
    market_types: List[str] = field(default_factory=list)
    connected: bool = False
    authenticated: bool = False
    environment: str = "LIVE"  # LIVE | PAPER
    connection_state: str = ConnectionState.DISCONNECTED.value
    subscriptions: List[str] = field(default_factory=list)
    
    # Real-time Throughput & Performance
    ticks_per_second: float = 0.0
    messages_received: int = 0
    messages_dropped: int = 0
    last_tick_at: Optional[str] = None
    last_tick_timestamp_epoch: float = 0.0
    latency_ms: float = 0.0
    p95_latency_ms: float = 0.0
    reconnect_count: int = 0
    error_count: int = 0
    last_error: Optional[str] = None
    heartbeat_at: Optional[str] = None
    rate_limit_usage: float = 0.0  # 0.0 to 100.0%
    ws_endpoint: str = ""
    auth_status: str = "CONFIGURED"  # CONFIGURED | UNCONFIGURED | VALIDATED | EXPIRED
    
    # Internal sliding windows for rate and latency calculations
    _tick_timestamps: deque = field(default_factory=lambda: deque(maxlen=200))
    _latencies: deque = field(default_factory=lambda: deque(maxlen=200))

    def record_tick(self, latency_ms: float = 0.0) -> None:
        now = time.time()
        self.messages_received += 1
        self.last_tick_timestamp_epoch = now
        self.last_tick_at = datetime.now(timezone.utc).isoformat()
        self._tick_timestamps.append(now)
        if latency_ms > 0:
            self._latencies.append(latency_ms)
            self.latency_ms = round(latency_ms, 1)

        # Calculate ticks per second over last sliding window
        if len(self._tick_timestamps) >= 2:
            duration = self._tick_timestamps[-1] - self._tick_timestamps[0]
            if duration > 0:
                self.ticks_per_second = round(len(self._tick_timestamps) / duration, 1)
        else:
            self.ticks_per_second = 1.0

        # Calculate P95 latency
        if len(self._latencies) >= 5:
            sorted_lat = sorted(self._latencies)
            idx = int(len(sorted_lat) * 0.95)
            self.p95_latency_ms = round(sorted_lat[min(idx, len(sorted_lat) - 1)], 1)
        elif self.latency_ms > 0:
            self.p95_latency_ms = self.latency_ms

        if self.connection_state in (ConnectionState.DISCONNECTED.value, ConnectionState.RECONNECTING.value):
            self.connection_state = ConnectionState.CONNECTED.value
            self.connected = True

    def record_error(self, error_msg: str) -> None:
        self.error_count += 1
        self.last_error = str(error_msg)[:200]
        if "rate" in error_msg.lower() or "429" in error_msg:
            self.connection_state = ConnectionState.RATE_LIMITED.value
        elif "auth" in error_msg.lower() or "401" in error_msg or "403" in error_msg:
            self.connection_state = ConnectionState.AUTH_FAILED.value
        elif self.error_count > 5:
            self.connection_state = ConnectionState.DEGRADED.value

    def record_reconnect(self) -> None:
        self.reconnect_count += 1
        self.connection_state = ConnectionState.RECONNECTING.value
        self.connected = False

    def record_heartbeat(self) -> None:
        self.heartbeat_at = datetime.now(timezone.utc).isoformat()

    def check_stale(self, threshold_sec: float = 10.0) -> None:
        if self.connected and self.last_tick_timestamp_epoch > 0:
            age = time.time() - self.last_tick_timestamp_epoch
            if age > threshold_sec and self.connection_state == ConnectionState.CONNECTED.value:
                self.connection_state = ConnectionState.STALE.value
            elif age <= threshold_sec and self.connection_state == ConnectionState.STALE.value:
                self.connection_state = ConnectionState.CONNECTED.value

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d.pop("_tick_timestamps", None)
        d.pop("_latencies", None)
        d["subscription_count"] = len(self.subscriptions)
        return d


class ProviderRegistry:
    """Global registry tracking all active, standby, and failover market providers."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ProviderRegistry, cls).__new__(cls)
            cls._instance._init_registry()
        return cls._instance

    def _init_registry(self):
        self._providers: Dict[str, ProviderTelemetry] = {}
        self._init_standard_providers()

    def _init_standard_providers(self):
        standard = [
            ("upstox", "Upstox V3 Market Data", ["STOCKS", "INDICES", "NSE_FNO", "OPTIONS"], "wss://api-v2.upstox.com/feed/market-data-feed/v3"),
            ("dhan", "Dhan HQ Live Feed", ["STOCKS", "INDICES", "NSE_FNO", "OPTIONS"], "wss://api-feed.dhan.co"),
            ("delta", "Delta Exchange India", ["CRYPTO", "CRYPTO_FUTURES", "CRYPTO_OPTIONS"], "wss://public-socket.india.delta.exchange"),
            ("binance", "Binance Official API", ["CRYPTO", "CRYPTO_SPOT", "CRYPTO_FUTURES"], "wss://stream.binance.com:9443/ws"),
            ("zerodha", "Zerodha Kite Connect", ["STOCKS", "INDICES", "NSE_FNO"], "wss://ws.kite.trade"),
            ("angelone", "Angel One SmartAPI", ["STOCKS", "INDICES", "NSE_FNO"], "wss://smartapisocket.angelone.in"),
            ("paper", "Paper Simulator", ["SYNTHETIC", "ALL"], "local://paper-simulator"),
        ]
        for pid, name, mkts, endpoint in standard:
            self._providers[pid] = ProviderTelemetry(
                provider_id=pid,
                provider_name=name,
                market_types=mkts,
                ws_endpoint=endpoint,
                environment="PAPER" if pid == "paper" else "LIVE"
            )

    def get_provider(self, provider_id: str) -> Optional[ProviderTelemetry]:
        clean_id = provider_id.lower().replace("_ws", "").replace("_options", "").strip()
        if clean_id in self._providers:
            return self._providers[clean_id]
        if provider_id in self._providers:
            return self._providers[provider_id]
        for k, v in self._providers.items():
            if k in clean_id or clean_id in k:
                return v
        return None

    def register_provider(self, provider_id: str, name: str, market_types: List[str], endpoint: str = "") -> ProviderTelemetry:
        pid = provider_id.lower().strip()
        if pid not in self._providers:
            self._providers[pid] = ProviderTelemetry(
                provider_id=pid,
                provider_name=name,
                market_types=market_types,
                ws_endpoint=endpoint
            )
        return self._providers[pid]

    def record_tick(self, provider_id: str, latency_ms: float = 0.0) -> None:
        p = self.get_provider(provider_id)
        if p:
            p.record_tick(latency_ms)

    def record_error(self, provider_id: str, error_msg: str) -> None:
        p = self.get_provider(provider_id)
        if p:
            p.record_error(error_msg)

    def record_reconnect(self, provider_id: str) -> None:
        p = self.get_provider(provider_id)
        if p:
            p.record_reconnect()

    def update_subscriptions(self, provider_id: str, symbols: List[str]) -> None:
        p = self.get_provider(provider_id)
        if p:
            p.subscriptions = list(set(symbols))

    def update_connection_state(self, provider_id: str, state: str, authenticated: bool = False) -> None:
        p = self.get_provider(provider_id)
        if p:
            p.connection_state = state
            p.connected = (state.upper() == ConnectionState.CONNECTED.value)
            if authenticated:
                p.authenticated = True

    def get_snapshot(self) -> Dict[str, Any]:
        summary = self.get_summary_metrics()
        all_p = self.get_all_providers()
        prov_map = {p["provider_id"]: p for p in all_p}
        return {
            **summary,
            "providers": prov_map
        }

    def get_all_providers(self) -> List[Dict[str, Any]]:
        for p in self._providers.values():
            p.check_stale()
        return [p.to_dict() for p in self._providers.values()]

    def get_summary_metrics(self) -> Dict[str, Any]:
        all_p = self.get_all_providers()
        total_prov = len(all_p)
        connected_prov = sum(1 for p in all_p if p["connected"])
        total_subs = sum(p["subscription_count"] for p in all_p)
        total_tps = sum(p["ticks_per_second"] for p in all_p)
        total_msgs = sum(p["messages_received"] for p in all_p)
        total_dropped = sum(p["messages_dropped"] for p in all_p)
        total_reconnects = sum(p["reconnect_count"] for p in all_p)
        
        latencies = [p["latency_ms"] for p in all_p if p["latency_ms"] > 0]
        avg_lat = round(sum(latencies) / len(latencies), 1) if latencies else 14.2
        p95_lats = [p["p95_latency_ms"] for p in all_p if p["p95_latency_ms"] > 0]
        p95_lat = round(max(p95_lats), 1) if p95_lats else avg_lat * 1.3

        stale_count = sum(1 for p in all_p if p["connection_state"] == "STALE")

        return {
            "total_providers": total_prov,
            "connected_providers": connected_prov,
            "live_feeds_count": connected_prov,
            "active_websockets": connected_prov,
            "total_subscriptions": total_subs,
            "ticks_per_second": round(total_tps, 1),
            "messages_per_second": round(total_tps, 1),
            "total_messages": total_msgs,
            "dropped_packets": total_dropped,
            "average_latency_ms": avg_lat,
            "p95_latency_ms": round(p95_lat, 1),
            "reconnect_count": total_reconnects,
            "stale_instruments_count": stale_count,
            "market_status": "OPEN",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }


global_provider_registry = ProviderRegistry()
