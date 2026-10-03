"""
QUANT.OS — Canonical Gateway & Service Configuration
===================================================
Authoritative configuration object providing single source of truth for:
- Market Data Gateway (IPv4 127.0.0.1:5051)
- Backend Core (127.0.0.1:5050)
- Frontend BFF (127.0.0.1:3100)

Never use localhost fallbacks that can resolve to IPv6 ::1 on macOS.
"""

import os
from typing import Dict, Any


class GatewayConfig:
    """Canonical Gateway and Internal Service Configuration."""

    GATEWAY_HOST: str = os.getenv("MARKET_GATEWAY_HOST", "127.0.0.1")
    GATEWAY_PORT: int = int(os.getenv("MARKET_GATEWAY_PORT", "5051"))
    
    # Internal HTTP Base URL (Strict IPv4 to prevent ::1 macOS lookup issues)
    HTTP_BASE_URL: str = os.getenv("MARKET_DATA_GATEWAY_URL", f"http://{GATEWAY_HOST}:{GATEWAY_PORT}")
    if "localhost" in HTTP_BASE_URL:
        HTTP_BASE_URL = HTTP_BASE_URL.replace("localhost", "127.0.0.1")

    # WebSocket Base URL
    WS_BASE_URL: str = os.getenv("MARKET_DATA_GATEWAY_WS_URL", f"ws://{GATEWAY_HOST}:{GATEWAY_PORT}/ws")
    if "localhost" in WS_BASE_URL:
        WS_BASE_URL = WS_BASE_URL.replace("localhost", "127.0.0.1")

    # Health URL
    HEALTH_URL: str = f"{HTTP_BASE_URL}/health"
    SNAPSHOT_URL: str = f"{HTTP_BASE_URL}/snapshot"
    SEARCH_URL: str = f"{HTTP_BASE_URL}/search"

    # Backend Core
    BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "5050"))
    BACKEND_URL: str = os.getenv("BACKEND_URL", f"http://127.0.0.1:{BACKEND_PORT}")
    if "localhost" in BACKEND_URL:
        BACKEND_URL = BACKEND_URL.replace("localhost", "127.0.0.1")

    # Cache Settings
    CACHE_BACKEND: str = "REDIS" if os.getenv("REDIS_ENABLED", "false").lower() == "true" else "IN_MEMORY"
    MAX_QUOTE_AGE_MS: int = int(os.getenv("MAX_QUOTE_AGE_MS", "15000"))
    MAX_LEG_QUOTE_SKEW_MS: int = int(os.getenv("MAX_LEG_QUOTE_SKEW_MS", "5000"))

    @classmethod
    def to_dict(cls) -> Dict[str, Any]:
        return {
            "httpBaseUrl": cls.HTTP_BASE_URL,
            "wsBaseUrl": cls.WS_BASE_URL,
            "healthUrl": cls.HEALTH_URL,
            "snapshotUrl": cls.SNAPSHOT_URL,
            "searchUrl": cls.SEARCH_URL,
            "backendUrl": cls.BACKEND_URL,
            "cacheBackend": cls.CACHE_BACKEND,
            "maxQuoteAgeMs": cls.MAX_QUOTE_AGE_MS,
            "maxLegQuoteSkewMs": cls.MAX_LEG_QUOTE_SKEW_MS,
        }


# Global singleton instance
global_gateway_config = GatewayConfig()
