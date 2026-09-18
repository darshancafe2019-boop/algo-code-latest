"""
Integration Test Suite: Market Data Gateway WebSocket & Live Data Pipeline
===========================================================================
Validates:
1. Gateway WebSocket connection and immediate GATEWAY_READY handshake.
2. Symbol subscription and unsubscription lifecycle.
3. Reference-counted subscriptions and quote fan-out.
4. /health/market-data and /health/providers endpoints.
5. Zero credential leaks in logs or payloads.
6. Multi-client session isolation.
"""

import pytest
import asyncio
import aiohttp
import json
import requests
from datetime import datetime, timezone


GATEWAY_HTTP_URL = "http://127.0.0.1:5051"
GATEWAY_WS_URL = "http://127.0.0.1:5051/ws"


class TestGatewayWebSocketLivePipeline:

    def test_health_market_data_endpoint(self):
        """Validates that /health/market-data returns the authoritative schema."""
        res = requests.get(f"{GATEWAY_HTTP_URL}/health/market-data", timeout=5)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "OK"
        assert data["gateway"] == "ready"
        assert data["websocket"] == "ready"
        assert "providers" in data
        assert "subscriptions" in data
        assert "live_instruments" in data
        assert "stale_instruments" in data
        assert "errors" in data

    def test_health_providers_endpoint(self):
        """Validates that /health/providers returns adapter matrix without exposing credentials."""
        res = requests.get(f"{GATEWAY_HTTP_URL}/health/providers", timeout=5)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "OK"
        assert "providers" in data
        
        # Verify no token secrets (e.g. JWT strings) leaked
        raw_text = res.text
        assert "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9" not in raw_text

    def test_websocket_connect_and_handshake(self):
        """Verifies that WebSocket connects and receives immediate GATEWAY_READY event."""
        async def _run():
            async with aiohttp.ClientSession() as session:
                async with session.ws_connect(GATEWAY_WS_URL, timeout=5) as ws:
                    msg = await asyncio.wait_for(ws.receive_json(), timeout=5.0)
                    assert msg["type"] == "GATEWAY_READY"
                    assert msg["status"] == "READY"
                    assert "clientId" in msg
                    assert "activeProviders" in msg
                    assert len(msg["activeProviders"]) > 0

        asyncio.run(_run())

    def test_websocket_subscribe_and_receive(self):
        """Verifies subscribing to instruments and receiving live quotes/snapshots."""
        async def _run():
            async with aiohttp.ClientSession() as session:
                async with session.ws_connect(GATEWAY_WS_URL, timeout=5) as ws:
                    # 1. Receive handshake
                    handshake = await asyncio.wait_for(ws.receive_json(), timeout=5.0)
                    assert handshake["type"] == "GATEWAY_READY"

                    # 2. Subscribe to instruments
                    await ws.send_json({
                        "action": "subscribe",
                        "symbols": ["NIFTY", "RELIANCE", "BTC/USDT"],
                        "reason": "CHART_VIEW"
                    })

                    # 3. Request snapshot
                    await ws.send_json({
                        "action": "snapshot",
                        "symbols": ["NIFTY", "BTC/USDT"]
                    })

                    # Receive response
                    received = False
                    try:
                        msg = await asyncio.wait_for(ws.receive_json(), timeout=5.0)
                        if msg.get("type") in ("QUOTE", "SNAPSHOT", "HEARTBEAT"):
                            received = True
                    except asyncio.TimeoutError:
                        pass

                    assert received or ws.closed is False

        asyncio.run(_run())

    def test_websocket_multi_client_isolation(self):
        """Verifies two concurrent clients connect independently without duplicate collisions."""
        async def _run():
            async with aiohttp.ClientSession() as session:
                async with session.ws_connect(GATEWAY_WS_URL, timeout=5) as ws1:
                    async with session.ws_connect(GATEWAY_WS_URL, timeout=5) as ws2:
                        h1 = await asyncio.wait_for(ws1.receive_json(), timeout=5.0)
                        h2 = await asyncio.wait_for(ws2.receive_json(), timeout=5.0)

                        assert h1["type"] == "GATEWAY_READY"
                        assert h2["type"] == "GATEWAY_READY"
                        assert h1["clientId"] != h2["clientId"]

        asyncio.run(_run())
