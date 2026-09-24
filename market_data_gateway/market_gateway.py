import asyncio
import logging
import time
from typing import Dict, Any

logger = logging.getLogger("MarketGateway")


class MarketGateway:

    def __init__(self):
        self.market: Dict[str, Dict[str, Any]] = {}
        self.providers: Dict[str, Dict[str, Any]] = {}
        self.clients = set()

    async def publish_tick(self, tick: Dict[str, Any]):
        key = (
            f"{tick['provider']}:"
            f"{tick['instrument_id']}"
        )

        self.market[key] = tick

        dead_clients = []

        for websocket in self.clients:
            try:
                await websocket.send_json({
                    "type": "FUTURES_TICK",
                    "data": tick,
                })
            except Exception:
                dead_clients.append(websocket)

        for websocket in dead_clients:
            self.clients.discard(websocket)

    async def update_provider_health(
        self,
        provider: str,
        connected: bool,
        latency_ms=None,
        error=None,
    ):
        health = {
            "provider": provider,
            "connected": connected,
            "latency_ms": latency_ms,
            "last_message_ms": int(time.time() * 1000),
            "error": error,
        }

        self.providers[provider] = health

        for websocket in list(self.clients):
            try:
                await websocket.send_json({
                    "type": "PROVIDER_HEALTH",
                    "data": health,
                })
            except Exception:
                self.clients.discard(websocket)

    def snapshot(self):
        return {
            "contracts": list(self.market.values()),
            "providers": list(self.providers.values()),
            "generated_at_ms": int(time.time() * 1000),
        }


market_gateway = MarketGateway()
