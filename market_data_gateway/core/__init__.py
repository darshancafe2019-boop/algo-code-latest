"""
Market Data Gateway Core Subsystem
==================================
"""
from market_data_gateway.core.feed_manager import FeedManager, MarketDataEventBus, global_feed_manager
from market_data_gateway.core.subscription_manager import SubscriptionManager, global_subscription_manager
from market_data_gateway.core.reconnect import ReconnectPolicy
from market_data_gateway.core.stale_detector import StaleDetector, global_stale_detector
from market_data_gateway.core.rate_limiter import FeedRateLimiter
from market_data_gateway.core.metrics import MetricsCollector, ProviderMetrics, global_metrics

__all__ = [
    "FeedManager",
    "MarketDataEventBus",
    "global_feed_manager",
    "SubscriptionManager",
    "global_subscription_manager",
    "ReconnectPolicy",
    "StaleDetector",
    "global_stale_detector",
    "FeedRateLimiter",
    "MetricsCollector",
    "ProviderMetrics",
    "global_metrics",
]
