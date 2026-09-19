"""
Market Data Feed Configuration
==============================
Centralized configuration for all live market-data feeds, WebSocket adapters,
reconnection policies, rate limits, and stale data thresholds.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class FeedConfig:
    # Gateway Server Settings
    host: str = os.getenv("MARKET_GATEWAY_HOST", "0.0.0.0")
    port: int = int(os.getenv("MARKET_GATEWAY_PORT", "5051"))
    secret: str = os.getenv("MARKET_GATEWAY_SECRET", "")
    
    # Stale Data & Freshness Thresholds (milliseconds / seconds)
    live_threshold_ms: float = float(os.getenv("FEED_LIVE_THRESHOLD_MS", "1500.0"))
    stale_threshold_sec: float = float(os.getenv("FEED_STALE_THRESHOLD_SEC", "10.0"))
    disconnected_threshold_sec: float = float(os.getenv("FEED_DISCONNECTED_THRESHOLD_SEC", "30.0"))
    
    # Reconnection & Heartbeat
    initial_backoff_sec: float = 1.0
    max_backoff_sec: float = 30.0
    backoff_multiplier: float = 1.5
    backoff_jitter: float = 0.2
    heartbeat_interval_sec: float = 5.0
    heartbeat_timeout_sec: float = 15.0
    
    # Provider Capacity & Limits
    fyers_max_subscriptions: int = int(os.getenv("FYERS_MAX_SUBSCRIPTIONS", "5000"))
    upstox_max_subscriptions: int = int(os.getenv("UPSTOX_MAX_SUBSCRIPTIONS", "5000"))
    dhan_max_subscriptions: int = int(os.getenv("DHAN_MAX_SUBSCRIPTIONS", "5000"))
    delta_max_subscriptions: int = int(os.getenv("DELTA_MAX_SUBSCRIPTIONS", "10000"))
    
    # Debug Logging
    raw_feed_debug: bool = os.getenv("RAW_FEED_DEBUG", "false").lower() == "true"
    
    # Provider Credentials (Read strictly from server-side env vars)
    fyers_app_id: str = os.getenv("FYERS_APP_ID", "")
    fyers_access_token: str = os.getenv("FYERS_ACCESS_TOKEN", "")
    fyers_ws_url: str = os.getenv("FYERS_WS_URL", "wss://socket.fyers.in/service/v3/data/feed")
    
    upstox_client_id: str = os.getenv("UPSTOX_CLIENT_ID", "")
    upstox_client_secret: str = os.getenv("UPSTOX_CLIENT_SECRET", "")
    upstox_access_token: str = os.getenv("UPSTOX_ACCESS_TOKEN", "")
    
    dhan_client_id: str = os.getenv("DHAN_CLIENT_ID", "")
    dhan_access_token: str = os.getenv("DHAN_ACCESS_TOKEN", "")
    
    delta_api_key: str = os.getenv("DELTA_API_KEY", "")
    delta_api_secret: str = os.getenv("DELTA_API_SECRET", "")
    delta_public_ws_url: str = os.getenv("DELTA_PUBLIC_WS_URL", "wss://public-socket.india.delta.exchange")


global_feed_config = FeedConfig()
