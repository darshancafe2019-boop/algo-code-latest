"""
Quant.OS Market Data Gateway
==============================
Always-running asyncio aiohttp server (port 5051 by default).
Exposes:
  GET  /health           — provider status matrix
  GET  /snapshot         — latest quotes for ?symbols=...
  GET  /history          — OHLCV candles for ?symbol=&tf=&from=&to=
  GET  /search           — instrument search ?q=&limit=20
  WS   /ws               — authenticated real-time quote stream

Internal only — not exposed to the internet.
Next.js BFF proxies /api/market/* -> this service.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import time
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Set

import aiohttp
from aiohttp import web

from market_data_gateway.adapters.base import NormalizedQuote, ProviderHealth
from market_data_gateway.adapters.binance_ws import BinanceWSAdapter
from market_data_gateway.adapters.upstox_ws import UpstoxWSAdapter
from market_data_gateway.adapters.angelone_smartapi import AngelOneAdapter
from market_data_gateway.adapters.yahoo_fallback import YahooFallbackAdapter
from market_data_gateway.adapters.delta_options_ws import DeltaOptionsWSAdapter
from market_data_gateway.adapters.alphavantage import AlphaVantageAdapter
from market_data_gateway.adapters.not_configured_stub import NotConfiguredAdapter
from market_data_gateway.subscription_registry import SubscriptionRegistry
from market_data_gateway.failover_manager import FailoverManager
from market_data_gateway.candle_store import global_candle_store

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("MDGateway")

GATEWAY_SECRET = os.environ.get("MARKET_GATEWAY_SECRET", "changeme-set-a-strong-random-secret-here")
STALE_THRESHOLD_SEC = 10.0


# ─────────────────────────────────────────────────────────────────────────────
# GATEWAY APPLICATION
# ─────────────────────────────────────────────────────────────────────────────

class MarketDataGateway:
    def __init__(self):
        # Initialize adapters
        self.adapters = {
            "binance_ws": BinanceWSAdapter(),
            "delta_options_ws": DeltaOptionsWSAdapter(),
            "upstox_ws": UpstoxWSAdapter(),
            "angelone": AngelOneAdapter(),
            "alpha_vantage": AlphaVantageAdapter(),
            "yahoo_fallback": YahooFallbackAdapter(poll_interval_sec=60.0),
            # Stub adapters for providers that need credentials
            "twelve_data": NotConfiguredAdapter(
                "twelve_data", "Twelve Data",
                ["GLOBAL_EQUITIES", "FOREX", "INDICES"],
                "Set TWELVE_DATA_API_KEY in .env to activate",
            ),
            "polygon": NotConfiguredAdapter(
                "polygon", "Polygon.io",
                ["GLOBAL_EQUITIES", "OPTIONS", "INDICES"],
                "Set POLYGON_API_KEY in .env to activate",
            ),
            "databento": NotConfiguredAdapter(
                "databento", "Databento",
                ["FUTURES", "OPTIONS"],
                "Set DATABENTO_API_KEY in .env to activate",
            ),
            "trading_economics": NotConfiguredAdapter(
                "trading_economics", "Trading Economics",
                ["MACRO"],
                "Set TRADING_ECONOMICS_API_KEY in .env to activate",
            ),
        }

        self.failover = FailoverManager(self.adapters)
        # Quote cache: symbol -> NormalizedQuote (latest from any active provider)
        self._quote_cache: Dict[str, NormalizedQuote] = {}
        # WebSocket clients: client_id -> (ws, subscribed_symbols)
        self._ws_clients: Dict[str, tuple] = {}
        self._ws_lock = asyncio.Lock()

        def _on_quote(quote: NormalizedQuote) -> None:
            """Called by any adapter when a new quote arrives."""
            self._quote_cache[quote.symbol] = quote
            asyncio.ensure_future(self._broadcast_quote(quote))

        self.subscription_registry = SubscriptionRegistry(
            add_callback=lambda sym: asyncio.ensure_future(self._on_new_subscription(sym)),
            remove_callback=lambda sym: asyncio.ensure_future(self._on_remove_subscription(sym)),
        )

        for adapter in self.adapters.values():
            adapter.set_quote_callback(_on_quote)

    async def startup(self) -> None:
        """Connect all adapters and initialize storage."""
        await global_candle_store.initialize()
        logger.info("Candle store backend: %s", global_candle_store.get_backend())

        for name, adapter in self.adapters.items():
            try:
                await adapter.connect()
                logger.info("Adapter %s: status=%s", name, adapter.get_status())
            except Exception as exc:
                logger.error("Adapter %s connect failed: %s", name, exc)

        # Start heartbeat loop
        asyncio.ensure_future(self._heartbeat_loop())

    async def shutdown(self) -> None:
        for adapter in self.adapters.values():
            try:
                await adapter.disconnect()
            except Exception:
                pass

    # ─── Subscription management ──────────────────────────────────────────────

    async def _on_new_subscription(self, symbol: str) -> None:
        adapter = self.failover.get_best_provider(symbol)
        if adapter:
            await adapter.subscribe([symbol])

    async def _on_remove_subscription(self, symbol: str) -> None:
        for adapter in self.adapters.values():
            if symbol in adapter.get_subscribed_symbols():
                await adapter.unsubscribe([symbol])

    # ─── WebSocket fan-out ────────────────────────────────────────────────────

    async def _broadcast_quote(self, quote: NormalizedQuote) -> None:
        """Send a quote update to subscribed WebSocket clients."""
        payload = json.dumps({"type": "QUOTE", "data": quote.to_dict()})
        sym = quote.symbol.upper()
        async with self._ws_lock:
            dead_clients = []
            for client_id, (ws, subscriptions) in list(self._ws_clients.items()):
                if "*" in subscriptions or sym in subscriptions:
                    try:
                        await ws.send_str(payload)
                    except Exception:
                        dead_clients.append(client_id)
            for c in dead_clients:
                self._ws_clients.pop(c, None)

    async def _heartbeat_loop(self) -> None:
        """Send periodic heartbeat to all connected WS clients."""
        while True:
            await asyncio.sleep(10)
            msg = json.dumps({
                "type": "HEARTBEAT",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "active_providers": [
                    {"id": a.provider_id, "status": a.get_status()}
                    for a in self.adapters.values()
                ],
            })
            async with self._ws_lock:
                dead = []
                for client_id, (ws, _) in list(self._ws_clients.items()):
                    try:
                        await ws.send_str(msg)
                    except Exception:
                        dead.append(client_id)
                for c in dead:
                    self._ws_clients.pop(c, None)

    # ─── HTTP handlers ────────────────────────────────────────────────────────

    async def handle_health(self, request: web.Request) -> web.Response:
        healths = []
        for adapter in self.adapters.values():
            try:
                h = await adapter.health_check()
                healths.append(h.to_dict())
            except Exception as exc:
                healths.append({
                    "provider_id": adapter.provider_id,
                    "status": "ERROR",
                    "message": str(exc),
                })
        return web.json_response({
            "status": "OK",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "candle_backend": global_candle_store.get_backend(),
            "providers": healths,
            "failover_transitions": self.failover.get_transitions(limit=10),
            "subscriptions": self.subscription_registry.dump(),
        })

    async def handle_snapshot(self, request: web.Request) -> web.Response:
        raw = request.rel_url.query.get("symbols", "")
        symbols = [s.strip().upper() for s in raw.split(",") if s.strip()]
        if not symbols:
            return web.json_response({"error": "symbols parameter required"}, status=400)

        result: Dict[str, Any] = {}
        for sym in symbols:
            # Check cache first
            if sym in self._quote_cache:
                q = self._quote_cache[sym]
                q.mark_stale(STALE_THRESHOLD_SEC)
                result[sym] = q.to_dict()
                continue

            # Try failover
            adapter = self.failover.get_best_provider(sym)
            if adapter:
                quotes = await adapter.get_snapshot([sym])
                if sym in quotes:
                    result[sym] = quotes[sym].to_dict()
                    self._quote_cache[sym] = quotes[sym]

        return web.json_response({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "quotes": result,
            "missing": [s for s in symbols if s not in result],
        })

    async def handle_history(self, request: web.Request) -> web.Response:
        symbol = request.rel_url.query.get("symbol", "").upper()
        timeframe = request.rel_url.query.get("tf", "1d")
        from_str = request.rel_url.query.get("from", "")
        to_str = request.rel_url.query.get("to", "")

        if not symbol:
            return web.json_response({"error": "symbol parameter required"}, status=400)

        now = datetime.now(timezone.utc)
        try:
            from_dt = datetime.fromisoformat(from_str.replace("Z", "+00:00")) if from_str else now - timedelta(days=30)
            to_dt = datetime.fromisoformat(to_str.replace("Z", "+00:00")) if to_str else now
        except ValueError as e:
            return web.json_response({"error": f"Invalid date format: {e}"}, status=400)

        # Check candle store first
        candles = await global_candle_store.get_candles(symbol, timeframe, from_dt, to_dt)
        if not candles:
            adapter = self.failover.get_best_provider(symbol)
            if adapter:
                candles = await adapter.get_history(symbol, timeframe, from_dt, to_dt)
                if candles:
                    await global_candle_store.store_candles(candles)

        return web.json_response({
            "symbol": symbol,
            "timeframe": timeframe,
            "from": from_dt.isoformat(),
            "to": to_dt.isoformat(),
            "count": len(candles),
            "candles": [c.to_dict() for c in candles],
        })

    async def handle_search(self, request: web.Request) -> web.Response:
        query = request.rel_url.query.get("q", "").upper().strip()
        limit = min(int(request.rel_url.query.get("limit", "20")), 50)

        if not query or len(query) < 1:
            return web.json_response({"error": "q parameter required"}, status=400)

        # Search across canonical registry (reuse existing InstrumentMaster)
        try:
            from src.market_data.instrument_master import global_instrument_master
            results = global_instrument_master.search_instruments(query, limit=limit)
        except Exception:
            results = []

        # Note: search results NEVER trigger subscriptions
        return web.json_response({
            "query": query,
            "count": len(results),
            "results": results,
            "note": "Search results do not trigger market data subscriptions",
        })

    async def handle_ws(self, request: web.Request) -> web.WebSocketResponse:
        """Internal WebSocket endpoint. Accepts X-Gateway-Secret header, query param, or loopback clients."""
        secret = (
            request.headers.get("X-Gateway-Secret", "")
            or request.rel_url.query.get("secret", "")
            or request.rel_url.query.get("token", "")
        )
        remote_host = request.remote or ""
        is_loopback = remote_host in ("127.0.0.1", "::1", "localhost", "")

        if GATEWAY_SECRET and secret != GATEWAY_SECRET and not is_loopback:
            raise web.HTTPForbidden(reason="Invalid gateway secret")

        ws = web.WebSocketResponse(heartbeat=30)
        await ws.prepare(request)

        client_id = str(uuid.uuid4())
        subscriptions: Set[str] = set()

        async with self._ws_lock:
            self._ws_clients[client_id] = (ws, subscriptions)

        logger.info("WS client connected: %s", client_id)

        try:
            async for msg in ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    try:
                        cmd = json.loads(msg.data)
                        action = cmd.get("action", "")
                        syms = [s.upper() for s in cmd.get("symbols", [])]
                        reason = cmd.get("reason", "CHART_VIEW")

                        if action == "subscribe":
                            for sym in syms:
                                subscriptions.add(sym)
                                self.subscription_registry.subscribe(sym, reason, source=client_id)
                            # Send current quotes immediately
                            for sym in syms:
                                if sym in self._quote_cache:
                                    await ws.send_str(json.dumps({
                                        "type": "QUOTE",
                                        "data": self._quote_cache[sym].to_dict(),
                                    }))
                        elif action == "unsubscribe":
                            for sym in syms:
                                subscriptions.discard(sym)
                                self.subscription_registry.unsubscribe(sym, reason)
                        elif action == "snapshot":
                            result = {}
                            for sym in syms:
                                if sym in self._quote_cache:
                                    result[sym] = self._quote_cache[sym].to_dict()
                            await ws.send_str(json.dumps({"type": "SNAPSHOT", "data": result}))

                    except json.JSONDecodeError:
                        pass
                elif msg.type == aiohttp.WSMsgType.ERROR:
                    break
        finally:
            async with self._ws_lock:
                self._ws_clients.pop(client_id, None)
            # Clean up subscriptions from this client
            for sym in list(subscriptions):
                self.subscription_registry.unsubscribe(sym, "CHART_VIEW")
            logger.info("WS client disconnected: %s", client_id)

        return ws

    async def handle_subscribe_api(self, request: web.Request) -> web.Response:
        """REST endpoint to subscribe/unsubscribe symbols (used by Flask backend)."""
        data = await request.json()
        action = data.get("action", "subscribe")
        symbols = [s.upper() for s in data.get("symbols", [])]
        reason = data.get("reason", "RUNNING_BOT")
        source = data.get("source", "")

        if action == "subscribe":
            for sym in symbols:
                self.subscription_registry.subscribe(sym, reason, source)
        elif action == "unsubscribe":
            for sym in symbols:
                self.subscription_registry.unsubscribe(sym, reason)
        elif action == "clear_reason":
            self.subscription_registry.clear_reason(reason)

        return web.json_response({
            "status": "ok",
            "subscriptions": self.subscription_registry.dump(),
        })


# ─────────────────────────────────────────────────────────────────────────────
# ENTRYPOINT
# ─────────────────────────────────────────────────────────────────────────────

@web.middleware
async def cors_middleware(request: web.Request, handler):
    if request.method == "OPTIONS":
        response = web.Response(status=204)
    else:
        try:
            response = await handler(request)
        except web.HTTPException as ex:
            response = ex
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Gateway-Secret, X-Request-Id, Authorization"
    return response


def create_app() -> tuple:
    gateway = MarketDataGateway()
    app = web.Application(middlewares=[cors_middleware])

    app.router.add_get("/health", gateway.handle_health)
    app.router.add_get("/health/live", gateway.handle_health)
    app.router.add_get("/health/ready", gateway.handle_health)
    app.router.add_get("/api/health", gateway.handle_health)
    app.router.add_get("/api/health/live", gateway.handle_health)
    app.router.add_get("/api/health/ready", gateway.handle_health)
    app.router.add_get("/providers/health", gateway.handle_health)
    app.router.add_get("/snapshot", gateway.handle_snapshot)
    app.router.add_get("/history", gateway.handle_history)
    app.router.add_get("/search", gateway.handle_search)
    app.router.add_get("/ws", gateway.handle_ws)
    app.router.add_post("/subscriptions", gateway.handle_subscribe_api)

    async def _on_startup(app_):
        await gateway.startup()

    async def _on_shutdown(app_):
        await gateway.shutdown()

    app.on_startup.append(_on_startup)
    app.on_shutdown.append(_on_shutdown)

    return app, gateway


async def main():
    port = int(os.environ.get("MARKET_GATEWAY_PORT", os.environ.get("PORT", "5051")))
    host = os.environ.get("HOST", "0.0.0.0")
    app, _ = create_app()
    runner = web.AppRunner(app, handle_signals=False)
    await runner.setup()
    site = web.TCPSite(runner, host, port)
    await site.start()
    logger.info("Market Data Gateway running on http://%s:%d", host, port)
    stop_event = asyncio.Event()
    try:
        await stop_event.wait()
    except (asyncio.CancelledError, KeyboardInterrupt):
        pass
    except Exception as e:
        logger.error("Market Data Gateway loop error: %s", e, exc_info=True)
    finally:
        await runner.cleanup()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
