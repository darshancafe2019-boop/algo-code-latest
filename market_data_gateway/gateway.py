"""
Quant.OS Market Data Gateway
==============================
Always-running asyncio aiohttp server (port 5051 by default).
Exposes:
  GET  /health           — provider status matrix
  GET  /snapshot         — latest quotes for ?symbols=...
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
from market_data_gateway.adapters.dhan_ws import DhanWSAdapter
from market_data_gateway.adapters.fyers_ws import FyersWSAdapter
from market_data_gateway.adapters.simulation_feed import SimulationFeedAdapter
from market_data_gateway.adapters.angelone_smartapi import AngelOneAdapter
from market_data_gateway.adapters.yahoo_fallback import YahooFallbackAdapter
from market_data_gateway.adapters.delta_options_ws import DeltaOptionsWSAdapter
from market_data_gateway.adapters.twelve_data_ws import TwelveDataWSAdapter
from market_data_gateway.adapters.alpaca_iex_ws import AlpacaIEXWSAdapter
from market_data_gateway.adapters.not_configured_stub import NotConfiguredAdapter
from market_data_gateway.subscription_registry import SubscriptionRegistry
from market_data_gateway.failover_manager import FailoverManager
from market_data_gateway.cache.market_cache import global_market_cache
from market_data_gateway.core.feed_manager import global_feed_manager
from market_data_gateway.core.subscription_manager import global_subscription_manager
from market_data_gateway.models.feed_status import FeedState
from src.dhan_credential_manager import global_dhan_credential_manager

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
        dhan_diagnostic_mode = os.environ.get("DHAN_ONLY_DIAGNOSTIC_MODE", "false").lower() == "true"
        
        if dhan_diagnostic_mode:
            logger.info("[DHAN_ONLY_DIAGNOSTIC_MODE] Initializing Dhan and Delta adapters.")
            self.adapters = {
                "dhan_ws": DhanWSAdapter(),
                "delta_options_ws": DeltaOptionsWSAdapter(),
            }
        else:
            # Initialize adapters
            alpaca_key = os.environ.get("ALPACA_API_KEY", "").strip()
            alpaca_secret = os.environ.get("ALPACA_API_SECRET", "").strip()
            twelve_data_key = os.environ.get("TWELVE_DATA_API_KEY", "").strip()
            self.adapters = {
                "alpaca_iex": AlpacaIEXWSAdapter(api_key=alpaca_key, api_secret=alpaca_secret) if (alpaca_key and alpaca_secret) else NotConfiguredAdapter(
                    "alpaca_iex", "Alpaca IEX (Real-Time)",
                    ["GLOBAL_EQUITIES"],
                    "Set ALPACA_API_KEY and ALPACA_API_SECRET in .env to activate",
                ),
                "binance_ws": BinanceWSAdapter(),
                "delta_options_ws": DeltaOptionsWSAdapter(),
                "dhan_ws": DhanWSAdapter(),
                "upstox_ws": UpstoxWSAdapter(),
                "fyers_ws": FyersWSAdapter(),
                "sim_feed": SimulationFeedAdapter(),
                "angelone": AngelOneAdapter(),
                "yahoo_fallback": YahooFallbackAdapter(poll_interval_sec=60.0),
                # Stub adapters for providers that need credentials
                "zerodha": NotConfiguredAdapter(
                    "zerodha", "Zerodha Kite Connect",
                    ["INDIAN_EQUITIES", "OPTIONS", "FUTURES"],
                    "Set ZERODHA_API_KEY and ZERODHA_ACCESS_TOKEN in .env to activate",
                ),
                "icici_direct": NotConfiguredAdapter(
                    "icici_direct", "ICICI Direct Breeze",
                    ["INDIAN_EQUITIES", "OPTIONS"],
                    "Set ICICI_API_KEY and ICICI_SESSION_TOKEN in .env to activate",
                ),
                "five_paisa": NotConfiguredAdapter(
                    "five_paisa", "5Paisa Open API",
                    ["INDIAN_EQUITIES", "OPTIONS"],
                    "Set FIVE_PAISA_APP_NAME and FIVE_PAISA_APP_KEY in .env to activate",
                ),
                "bybit": NotConfiguredAdapter(
                    "bybit", "Bybit V5",
                    ["CRYPTO_SPOT", "CRYPTO_PERP"],
                    "Set BYBIT_API_KEY and BYBIT_API_SECRET in .env to activate",
                ),
                "okx": NotConfiguredAdapter(
                    "okx", "OKX V5",
                    ["CRYPTO_SPOT", "CRYPTO_PERP", "CRYPTO_OPTIONS"],
                    "Set OKX_API_KEY and OKX_SECRET_KEY in .env to activate",
                ),
                "mt5": NotConfiguredAdapter(
                    "mt5", "MetaTrader 5",
                    ["FOREX", "CFD", "COMMODITIES"],
                    "Set MT5_LOGIN, MT5_PASSWORD, and MT5_SERVER in .env to activate",
                ),
                "exness": NotConfiguredAdapter(
                    "exness", "Exness Bridge",
                    ["FOREX", "METALS", "CRYPTO"],
                    "Set EXNESS_ACCOUNT_ID and EXNESS_API_KEY in .env to activate",
                ),
                "ibkr": NotConfiguredAdapter(
                    "ibkr", "Interactive Brokers",
                    ["GLOBAL_EQUITIES", "OPTIONS", "FUTURES", "FOREX"],
                    "Set IBKR_PORT and IBKR_CLIENT_ID in .env to activate",
                ),
                "twelve_data": TwelveDataWSAdapter(api_key=twelve_data_key) if twelve_data_key else NotConfiguredAdapter(
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

        # Register adapters in FeedManager and SubscriptionManager
        for name, adapter in self.adapters.items():
            global_feed_manager.register_adapter(name, adapter)
            global_subscription_manager.register_adapter(name, adapter)

        self.failover = FailoverManager(self.adapters)
        # Quote cache: symbol -> NormalizedQuote (latest from any active provider)
        self._quote_cache: Dict[str, NormalizedQuote] = {}
        # WebSocket clients: client_id -> (ws, subscribed_symbols)
        self._ws_clients: Dict[str, tuple] = {}
        self._ws_lock = asyncio.Lock()

        def _on_quote(quote: NormalizedQuote) -> None:
            """Called by any adapter when a new quote arrives."""
            self._quote_cache[quote.symbol] = quote
            # Update canonical cache as well
            global_market_cache.put_normalized_quote(quote)
            asyncio.ensure_future(self._broadcast_quote(quote))

        # Bridge DhanFeedManager singleton ticks directly into gateway quote cache
        try:
            from src.dhan_feed_manager import global_dhan_feed_manager
            def _on_dhan_tick(tick: Dict[str, Any]) -> None:
                sym = tick.get("symbol", "NIFTY")
                last_p = float(tick.get("last_price", 0.0))
                if last_p <= 0:
                    return
                quote = NormalizedQuote(
                    symbol=sym,
                    exchange=tick.get("exchange_segment", "NSE_EQ"),
                    provider="dhan",
                    last_price=last_p,
                    bid=float(tick.get("bid_price") or last_p),
                    ask=float(tick.get("ask_price") or last_p),
                    volume=float(tick.get("volume") or 0.0),
                    open=float(tick.get("open")) if tick.get("open") else None,
                    high=float(tick.get("high")) if tick.get("high") else None,
                    low=float(tick.get("low")) if tick.get("low") else None,
                    close=float(tick.get("previous_close")) if tick.get("previous_close") else None,
                    oi=float(tick.get("open_interest")) if tick.get("open_interest") else None,
                    event_timestamp=tick.get("event_time") or datetime.now(timezone.utc).isoformat(),
                    received_timestamp=tick.get("received_at") or datetime.now(timezone.utc).isoformat(),
                    feed_latency_ms=float(tick.get("freshness_ms") or 0.0),
                    data_mode="REAL_TIME",
                )
                self._quote_cache[sym] = quote
                global_market_cache.put_normalized_quote(quote)
                asyncio.ensure_future(self._broadcast_quote(quote))

            global_dhan_feed_manager.add_callback(_on_dhan_tick)
        except Exception as bridge_err:
            logger.debug("DhanFeedManager direct bridge note: %s", bridge_err)

        self.subscription_registry = SubscriptionRegistry(
            add_callback=lambda sym: asyncio.ensure_future(self._on_new_subscription(sym)),
            remove_callback=lambda sym: asyncio.ensure_future(self._on_remove_subscription(sym)),
        )

        for adapter in self.adapters.values():
            adapter.set_quote_callback(_on_quote)

    async def startup(self) -> None:
        """Connect all adapters and initialize storage."""
        # Start Dhan background credential watcher
        global_dhan_credential_manager.start_background_watcher(interval_sec=300)

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

    async def handle_market_data_health(self, request: web.Request) -> web.Response:
        report = global_feed_manager.get_health_report()
        dhan_stat = self.adapters.get("dhan_ws")
        delta_stat = self.adapters.get("delta_options_ws")
        fyers_stat = self.adapters.get("fyers_ws")
        upstox_stat = self.adapters.get("upstox_ws")
        sim_stat = self.adapters.get("sim_feed")

        def _fmt_provider(ad):
            if not ad:
                return {"status": "not_configured", "subscriptions": 0, "lastTick": None}
            st = ad.get_status().lower()
            return {
                "status": "connected" if st in ("connected", "live", "ok") else st,
                "subscriptions": len(ad.get_subscribed_symbols()),
                "lastTick": datetime.now(timezone.utc).isoformat() if st in ("connected", "live", "ok") else None,
                "dataMode": getattr(ad, "data_mode", "REAL_TIME"),
            }

        return web.json_response({
            "status": "OK",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "providers": report,
            "dhan": _fmt_provider(dhan_stat),
            "delta": _fmt_provider(delta_stat),
            "fyers": _fmt_provider(fyers_stat),
            "upstox": _fmt_provider(upstox_stat),
            "simulation": _fmt_provider(sim_stat),
            "metrics": global_feed_manager.get_metrics(),
        })

    async def handle_metrics(self, request: web.Request) -> web.Response:
        return web.json_response({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "metrics": global_feed_manager.get_metrics(),
            "cache": global_market_cache.get_stats(),
            "subscriptions": global_subscription_manager.get_status(),
        })

    async def handle_feed_control(self, request: web.Request) -> web.Response:
        """Control individual provider feeds securely."""
        try:
            body = await request.json()
        except Exception:
            return web.json_response({"error": "Invalid JSON payload"}, status=400)
            
        action = body.get("action", "").lower()
        provider = body.get("provider", "").lower()
        symbols = body.get("symbols", [])
        
        adapter_key = provider if provider.endswith("_ws") else f"{provider}_ws"
        if provider in ("delta", "delta_options"):
            adapter_key = "delta_options_ws"
        elif provider in ("sim", "simulation"):
            adapter_key = "sim_feed"
            
        adapter = self.adapters.get(adapter_key)
        if not adapter:
            return web.json_response({"error": f"Provider '{provider}' not found"}, status=404)
            
        if action == "connect":
            await adapter.connect()
        elif action == "disconnect":
            await adapter.disconnect()
        elif action == "reconnect":
            await adapter.disconnect()
            await adapter.connect()
        elif action == "subscribe" and symbols:
            await adapter.subscribe(symbols)
        elif action == "unsubscribe" and symbols:
            await adapter.unsubscribe(symbols)
        else:
            return web.json_response({"error": f"Unknown or invalid action '{action}'"}, status=400)
            
        return web.json_response({
            "status": "OK",
            "provider": provider,
            "action": action,
            "provider_status": adapter.get_status(),
            "subscriptions": list(adapter.get_subscribed_symbols()),
        })

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
            "providers": healths,
            "dhan_credentials": global_dhan_credential_manager.get_status(),
            "failover_transitions": self.failover.get_transitions(limit=10),
            "subscriptions": self.subscription_registry.dump(),
            "feed_manager_health": global_feed_manager.get_health_report(),
        })

    async def handle_snapshot(self, request: web.Request) -> web.Response:
        raw = request.rel_url.query.get("symbols", "")
        symbols = [s.strip().upper() for s in raw.split(",") if s.strip()]
        if not symbols:
            return web.json_response({"error": "symbols parameter required"}, status=400)

        result: Dict[str, Any] = {}
        for sym in symbols:
            # Check cache first (direct and canonical alias)
            aliases = [sym]
            if "/" in sym:
                aliases.append(sym.replace("/", ""))
            elif sym.endswith("USDT") and len(sym) > 4:
                aliases.append(f"{sym[:-4]}/USDT")
            elif sym.endswith("USD") and len(sym) > 3:
                aliases.append(f"{sym[:-3]}/USD")

            matched_q: Optional[NormalizedQuote] = None
            for a in aliases:
                if a in self._quote_cache:
                    matched_q = self._quote_cache[a]
                    break

            if matched_q:
                matched_q.mark_stale(STALE_THRESHOLD_SEC)
                result[sym] = matched_q.to_dict()
                continue

            # Try failover adapter snapshot
            adapter = self.failover.get_best_provider(sym)
            if adapter:
                quotes = await adapter.get_snapshot([sym])
                if sym in quotes:
                    result[sym] = quotes[sym].to_dict()
                    self._quote_cache[sym] = quotes[sym]
                else:
                    for a in aliases:
                        if a in quotes:
                            result[sym] = quotes[a].to_dict()
                            self._quote_cache[a] = quotes[a]
                            break

        return web.json_response({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "quotes": result,
            "missing": [s for s in symbols if s not in result],
        })

    async def handle_ltp(self, request: web.Request) -> web.Response:
        """
        Canonical single-symbol real-time LTP endpoint.
        Returns authoritative price, provider source, freshness, and age without fallbacks.
        """
        raw_sym = request.rel_url.query.get("symbol", "").strip()
        if not raw_sym:
            return web.json_response({
                "ok": False,
                "code": "INVALID_SYMBOL",
                "symbol": "",
                "message": "Query parameter 'symbol' is required."
            }, status=400)

        sym = raw_sym.upper()
        aliases = [sym]
        if "/" in sym:
            aliases.append(sym.replace("/", ""))
        elif sym.endswith("USDT") and len(sym) > 4:
            aliases.append(f"{sym[:-4]}/USDT")
        elif sym.endswith("USD") and len(sym) > 3:
            aliases.append(f"{sym[:-3]}/USD")

        matched_q: Optional[NormalizedQuote] = None
        for a in aliases:
            if a in self._quote_cache:
                matched_q = self._quote_cache[a]
                break

        if not matched_q:
            adapter = self.failover.get_best_provider(sym)
            if adapter:
                try:
                    quotes = await asyncio.wait_for(adapter.get_snapshot([sym]), timeout=2.5)
                    if sym in quotes:
                        matched_q = quotes[sym]
                        self._quote_cache[sym] = matched_q
                    else:
                        for a in aliases:
                            if a in quotes:
                                matched_q = quotes[a]
                                self._quote_cache[a] = matched_q
                                break
                except (asyncio.TimeoutError, Exception) as ex:
                    logger.debug("Snapshot query note for %s from %s: %s", sym, adapter.provider_id, ex)

        if matched_q:
            matched_q.mark_stale(STALE_THRESHOLD_SEC)
            try:
                dt = datetime.fromisoformat(matched_q.received_timestamp.replace("Z", "+00:00"))
                ts_ms = int(dt.timestamp() * 1000)
                age_ms = max(0, int((datetime.now(timezone.utc).timestamp() - dt.timestamp()) * 1000))
            except Exception:
                ts_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
                age_ms = 0

            quote_status = "LIVE" if not matched_q.is_stale else "STALE"
            if matched_q.provider in ("dhan", "dhan_ws"):
                from market_data_gateway.adapters.dhan_ws import is_indian_market_open
                if not is_indian_market_open():
                    quote_status = "MARKET_CLOSED"

            return web.json_response({
                "ok": True,
                "symbol": sym,
                "price": matched_q.last_price,
                "source": (matched_q.provider or "GATEWAY").upper(),
                "status": quote_status,
                "timestamp": ts_ms,
                "ageMs": age_ms,
                "bid": matched_q.bid,
                "ask": matched_q.ask,
                "volume": matched_q.volume,
            }, status=200)

        adapter = self.failover.get_best_provider(sym)
        if not adapter:
            from market_data_gateway.failover_manager import _get_asset_class, FAILOVER_CHAINS
            asset_class = _get_asset_class(sym)
            chain = FAILOVER_CHAINS.get(asset_class, [])
            for pid in chain:
                cand = self.adapters.get(pid)
                if cand:
                    cand_status = cand.get_status()
                    if cand_status == "NOT_CONFIGURED":
                        return web.json_response({
                            "ok": False,
                            "code": "DATA_SOURCE_NOT_CONFIGURED",
                            "symbol": sym,
                            "source": cand.provider_id.upper(),
                            "message": f"Market data source {cand.provider_id} for {sym} is not configured."
                        }, status=200)
                    if cand_status in ("AUTH_REQUIRED", "AUTH_ERROR", "AUTH_FAILED"):
                        return web.json_response({
                            "ok": False,
                            "code": "AUTH_REQUIRED",
                            "symbol": sym,
                            "source": cand.provider_id.upper(),
                            "message": f"Provider {cand.provider_id} requires authentication.",
                        }, status=401)
                    if cand_status in ("DISCONNECTED", "ERROR"):
                        return web.json_response({
                            "ok": False,
                            "code": "SOURCE_DISCONNECTED",
                            "symbol": sym,
                            "source": cand.provider_id.upper(),
                            "message": f"Provider {cand.provider_id} is disconnected.",
                        }, status=503)

            return web.json_response({
                "ok": False,
                "code": "NO_LIVE_PROVIDER",
                "symbol": sym,
                "source": "NO_LIVE_PROVIDER",
                "message": f"No live provider tick available for {sym}."
            }, status=200)

        status = adapter.get_status()
        if status in ("AUTH_REQUIRED", "AUTH_ERROR", "AUTH_FAILED"):
            return web.json_response({
                "ok": False,
                "code": "AUTH_REQUIRED",
                "symbol": sym,
                "source": adapter.provider_id.upper(),
                "message": f"Provider {adapter.provider_id} requires authentication.",
            }, status=401)

        if status == "NOT_CONFIGURED":
            return web.json_response({
                "ok": False,
                "code": "NO_LIVE_PROVIDER",
                "symbol": sym,
                "source": "NO_LIVE_PROVIDER",
                "message": f"Market data source for {sym} is not configured."
            }, status=200)

        if status in ("DISCONNECTED", "ERROR"):
            return web.json_response({
                "ok": False,
                "code": "SOURCE_DISCONNECTED",
                "symbol": sym,
                "source": adapter.provider_id.upper(),
                "message": f"Configured market data source {adapter.provider_id} is {status.lower()}."
            }, status=503)

        return web.json_response({
            "ok": False,
            "code": "NO_LIVE_PROVIDER",
            "symbol": sym,
            "source": "NO_LIVE_PROVIDER",
            "message": f"No live provider tick found for {sym}."
        }, status=200)

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
                                self.subscription_registry.unsubscribe(sym, reason, source=client_id)
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
            # Clean up all subscriptions from this client source cleanly
            self.subscription_registry.unsubscribe_all_for_source(client_id)
            logger.info("WS client disconnected and cleaned up: %s", client_id)

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

    async def handle_options_chain(self, request: web.Request) -> web.Response:
        """
        Canonical Option Chain HTTP Snapshot Endpoint.
        Supports Delta Exchange India / Global for BTC, ETH, SOL, etc.
        """
        und = request.rel_url.query.get("underlying") or request.rel_url.query.get("symbol") or "BTC"
        expiry = request.rel_url.query.get("expiry") or None
        strike_count_str = request.rel_url.query.get("strike_count") or "40"
        strike_count = int(strike_count_str) if strike_count_str.isdigit() else 40

        delta_adapter = self.adapters.get("delta_options_ws")
        if delta_adapter and hasattr(delta_adapter, "get_normalized_option_chain"):
            try:
                res = await delta_adapter.get_normalized_option_chain(
                    underlying=und,
                    expiry=expiry,
                    strike_count=strike_count,
                )
                return web.json_response(res)
            except Exception as ex:
                logger.error(f"Error fetching Delta option chain: {ex}", exc_info=True)
                return web.json_response({
                    "success": False,
                    "error": str(ex),
                    "source": "DELTA_EXCHANGE",
                    "broker": "DELTA",
                    "underlying": und,
                    "rows": [],
                    "strikes": [],
                }, status=500)

        return web.json_response({
            "success": False,
            "error": "Delta options adapter not configured on gateway",
            "source": "DELTA_EXCHANGE",
            "broker": "DELTA",
            "underlying": und,
            "rows": [],
            "strikes": [],
        }, status=503)


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
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Gateway-Secret, X-Request-Id, Authorization, X-Idempotency-Key"
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
    app.router.add_get("/ltp", gateway.handle_ltp)
    app.router.add_get("/api/market-data/ltp", gateway.handle_ltp)
    app.router.add_get("/search", gateway.handle_search)
    app.router.add_get("/ws", gateway.handle_ws)
    app.router.add_post("/subscriptions", gateway.handle_subscribe_api)
    app.router.add_get("/api/market-data/health", gateway.handle_market_data_health)
    app.router.add_get("/api/market-data/status", gateway.handle_market_data_health)
    app.router.add_get("/metrics", gateway.handle_metrics)
    app.router.add_post("/api/market-data/feed/control", gateway.handle_feed_control)
    app.router.add_get("/api/options/chain", gateway.handle_options_chain)
    app.router.add_get("/api/options/delta/chain", gateway.handle_options_chain)
    app.router.add_get("/options/chain", gateway.handle_options_chain)
    app.router.add_get("/api/market-data/options", gateway.handle_options_chain)

    async def _on_startup(app_):
        await gateway.startup()

    async def _on_shutdown(app_):
        await gateway.shutdown()

    app.on_startup.append(_on_startup)
    app.on_shutdown.append(_on_shutdown)

    return app, gateway


async def main():
    port = int(os.environ.get("MARKET_GATEWAY_PORT", "5051"))
    host = os.environ.get("HOST", "0.0.0.0")
    app, _ = create_app()
    runner = web.AppRunner(app, handle_signals=False)
    await runner.setup()
    try:
        site = web.TCPSite(runner, host, port)
        await site.start()
        logger.info("Market Data Gateway running on http://%s:%d (Backend port: 5050)", host, port)
    except OSError as oe:
        logger.error("Market Data Gateway failed to bind on port %d: %s. Port may be occupied.", port, oe)
        raise

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
