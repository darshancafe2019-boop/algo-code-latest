"""
Quant.OS Market Data Gateway
============================
Always-running multi-provider global market data service.
Exposes a unified REST + WebSocket API consumed by the Flask backend and Next.js frontend.
"""
from market_data_gateway.market_gateway import MarketGateway, market_gateway

__version__ = "1.0.0"
__all__ = ["MarketGateway", "market_gateway"]
