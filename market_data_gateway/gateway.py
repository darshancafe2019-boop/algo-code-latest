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
from market_data_gateway.adapters.binance_usdm_ws import BinanceUSDMWSAdapter
from market_data_gateway.adapters.binance_coinm_ws import BinanceCoinMWSAdapter
from market_data_gateway.adapters.upstox_ws import UpstoxWSAdapter
from market_data_gateway.adapters.dhan_ws import DhanWSAdapter
from market_data_gateway.adapters.fyers_ws import FyersWSAdapter
from market_data_gateway.adapters.simulation_feed import SimulationFeedAdapter
from market_data_gateway.adapters.angelone_smartapi import AngelOneAdapter
from market_data_gateway.adapters.yahoo_fallback import YahooFallbackAdapter
from market_data_gateway.adapters.delta_options_ws import DeltaOptionsWSAdapter
from market_data_gateway.adapters.oanda_ws import OandaWSAdapter
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
def get_instrument_identity(provider: str, exchange: str, symbol: str, contract_type: str = "SPOT") -> str:
    """Returns canonical immutable instrument identity: PROVIDER:EXCHANGE:SYMBOL:CONTRACT_TYPE."""
    prov = (provider or "UNKNOWN").upper().strip()
    ex = (exchange or prov).upper().strip()
    sym = (symbol or "").upper().strip().replace(" ", "").replace("-", "")
    ct = (contract_type or "SPOT").upper().strip()
    return f"{prov}:{ex}:{sym}:{ct}"


def get_quote_aliases(symbol: str, exchange: str = "", provider: str = "") -> Set[str]:
    aliases: Set[str] = set()
    s = (symbol or "").strip().upper()
    if not s:
        return aliases

    aliases.add(s)

    # If symbol contains exchange/provider prefix
    clean_sym = s
    prefix = ""
    if ":" in s:
        parts = s.split(":", 1)
        prefix = parts[0]
        clean_sym = parts[1]
        # Remove suffix like :SPOT, :PERP, :EQ
        if ":" in clean_sym:
            clean_sym = clean_sym.split(":", 1)[0]
        aliases.add(clean_sym)
    elif "|" in s:
        parts = s.split("|", 1)
        prefix = parts[0]
        clean_sym = parts[1]
        aliases.add(clean_sym)

    # Slash variations
    if "/" in clean_sym:
        no_slash = clean_sym.replace("/", "")
        aliases.add(no_slash)
    elif clean_sym.endswith("USDT") and len(clean_sym) > 4:
        slash_v = f"{clean_sym[:-4]}/USDT"
        aliases.add(slash_v)
    elif clean_sym.endswith("USD") and len(clean_sym) > 3:
        slash_v = f"{clean_sym[:-3]}/USD"
        aliases.add(slash_v)

    indian_alias_groups = [
        {"NIFTY", "NIFTY 50", "NIFTY50", "NSE:NIFTY", "NSE_INDEX|NIFTY 50", "NSE_INDEX:NIFTY 50", "DHAN:13", "UPSTOX:NSE_INDEX|Nifty 50"},
        {"BANKNIFTY", "NIFTY BANK", "NIFTYBANK", "NSE:BANKNIFTY", "NSE_INDEX|NIFTY BANK", "NSE_INDEX:NIFTY BANK", "DHAN:25", "UPSTOX:NSE_INDEX|Nifty Bank"},
        {"FINNIFTY", "NIFTY FIN SERVICE", "NIFTY FINANCIAL SERVICES", "NIFTY_FIN_SERVICE", "NSE:FINNIFTY", "NSE_INDEX|NIFTY FIN SERVICE", "NSE_INDEX:NIFTY FIN SERVICE", "DHAN:27", "UPSTOX:NSE_INDEX|Nifty Fin Service"},
        {"SENSEX", "BSE SENSEX", "BSESENSEX", "BSE:SENSEX", "BSE_INDEX|SENSEX", "BSE_INDEX:SENSEX", "DHAN:51", "UPSTOX:BSE_INDEX|SENSEX"},
        {"MIDCPNIFTY", "NIFTY MID SELECT", "NIFTY MIDCAP SELECT", "NIFTYMIDSELECT", "NSE:MIDCPNIFTY", "NSE_INDEX|NIFTY MID SELECT", "NSE_INDEX:NIFTY MID SELECT", "DHAN:447", "UPSTOX:NSE_INDEX|NIFTY MID SELECT"},
        {"INDIA VIX", "INDIAVIX", "INDIA_VIX", "NSE:INDIA VIX", "NSE_INDEX|INDIA VIX", "NSE_INDEX:INDIA VIX"},
        {"RELIANCE", "RELIANCE INDUSTRIES", "INE002A01018", "NSE:RELIANCE", "NSE_EQ|INE002A01018", "NSE_EQ:INE002A01018"},
        {"HDFCBANK", "HDFC BANK", "HDFC", "INE040A01034", "NSE:HDFCBANK", "NSE_EQ|INE040A01034", "NSE_EQ:INE040A01034"},
        {"ICICIBANK", "ICICI BANK", "ICICI", "INE090A01021", "NSE:ICICIBANK", "NSE_EQ|INE090A01021", "NSE_EQ:INE090A01021"},
        {"INFY", "INFOSYS", "INE009A01021", "NSE:INFY", "NSE_EQ|INE009A01021", "NSE_EQ:INE009A01021"},
        {"TCS", "TATA CONSULTANCY SERVICES", "INE467B01029", "NSE:TCS", "NSE_EQ|INE467B01029", "NSE_EQ:INE467B01029"},
        {"SBIN", "SBI", "STATE BANK OF INDIA", "INE062A01020", "NSE:SBIN", "NSE_EQ|INE062A01020", "NSE_EQ:INE062A01020"},
        {"BHARTIARTL", "BHARTI AIRTEL", "AIRTEL", "BHARTI", "INE397D01024", "NSE:BHARTIARTL", "NSE_EQ|INE397D01024", "NSE_EQ:INE397D01024"},
    ]

    for group in indian_alias_groups:
        if any(item in aliases for item in group):
            aliases.update(group)

    # Provider/Exchange specific aliases
    ex_u = (exchange or "").upper()
    prov_u = (provider or "").upper()

    for base in list(aliases):
        if "BINANCE" in ex_u or "BINANCE" in prov_u or prefix == "BINANCE":
            aliases.add(f"BINANCE:{base}")
            aliases.add(f"BINANCE:{base}:SPOT")
            aliases.add(f"BINANCE:{base}:PERP")
        if "DELTA" in ex_u or "DELTA" in prov_u or prefix == "DELTA":
            aliases.add(f"DELTA:{base}")
            aliases.add(f"DELTA:{base}:PERP")
        if "NSE" in ex_u or "DHAN" in prov_u or "UPSTOX" in prov_u or prefix in ("NSE", "DHAN", "UPSTOX"):
            aliases.add(f"NSE:{base}")
            aliases.add(f"NSE:{base}:EQ")
            aliases.add(f"DHAN:{base}")
            aliases.add(f"UPSTOX:{base}")
        if "OANDA" in ex_u or prefix == "OANDA":
            aliases.add(f"OANDA:{base}")
            aliases.add(f"OANDA:{base}:FX")

    return aliases


def _compute_top_movers(quotes_dict: Dict[str, NormalizedQuote], limit: int = 10) -> Dict[str, List[Dict[str, Any]]]:
    """Computes top gainers, losers, and volume leaders from normalized quotes dictionary."""
    quotes_list: List[Dict[str, Any]] = []
    for sym, q in list(quotes_dict.items()):
        if ":" in sym:
            continue
        if q.last_price and q.last_price > 0:
            q.mark_stale(5.0, 15.0)
            d = q.to_dict()
            quotes_list.append(d)

    seen_syms = set()
    deduped = []
    for q in quotes_list:
        s = q["symbol"]
        if s not in seen_syms:
            seen_syms.add(s)
            deduped.append(q)

    gainers = sorted([q for q in deduped if (q.get("changePct") or q.get("change_pct") or 0) >= 0], key=lambda x: (x.get("changePct") or x.get("change_pct") or 0), reverse=True)[:limit]
    losers = sorted([q for q in deduped if (q.get("changePct") or q.get("change_pct") or 0) < 0], key=lambda x: (x.get("changePct") or x.get("change_pct") or 0))[:limit]
    volume_leaders = sorted(deduped, key=lambda x: (x.get("volume") or 0), reverse=True)[:limit]

    return {
        "gainers": gainers,
        "losers": losers,
        "volume_leaders": volume_leaders,
        "active": volume_leaders,
    }


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
                "binance_usdm": BinanceUSDMWSAdapter(),
                "binance_coinm": BinanceCoinMWSAdapter(),
                "delta_options_ws": DeltaOptionsWSAdapter(),
                "dhan_ws": DhanWSAdapter(),
                "upstox_ws": UpstoxWSAdapter(),
                "fyers_ws": FyersWSAdapter(),
                "oanda": OandaWSAdapter(),
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
            aliases = get_quote_aliases(quote.symbol, quote.exchange, quote.provider)
            for a in aliases:
                self._quote_cache[a] = quote
            # Update canonical cache as well
            global_market_cache.put_normalized_quote(quote)
            asyncio.ensure_future(self._broadcast_quote(quote, aliases))

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
                aliases = get_quote_aliases(quote.symbol, quote.exchange, quote.provider)
                for a in aliases:
                    self._quote_cache[a] = quote
                global_market_cache.put_normalized_quote(quote)
                asyncio.ensure_future(self._broadcast_quote(quote, aliases))

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
            clean_sym = symbol
            if ":" in symbol:
                clean_sym = symbol.split(":", 1)[1]
                if ":" in clean_sym:
                    clean_sym = clean_sym.split(":", 1)[0]
            await adapter.subscribe([symbol, clean_sym])

    async def _on_remove_subscription(self, symbol: str) -> None:
        for adapter in self.adapters.values():
            if symbol in adapter.get_subscribed_symbols():
                await adapter.unsubscribe([symbol])

    # ─── WebSocket fan-out ────────────────────────────────────────────────────

    async def _broadcast_quote(self, quote: NormalizedQuote, aliases: Optional[Set[str]] = None) -> None:
        """Send a quote update to subscribed WebSocket clients."""
        payload = json.dumps({"type": "QUOTE", "data": quote.to_dict()})
        if aliases is None:
            aliases = get_quote_aliases(quote.symbol, quote.exchange, quote.provider)
        async with self._ws_lock:
            dead_clients = []
            for client_id, (ws, subscriptions) in list(self._ws_clients.items()):
                if "*" in subscriptions or not subscriptions.isdisjoint(aliases):
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

        prov_dict = {}
        for adapter in self.adapters.values():
            try:
                st = adapter.get_status()
                subs = adapter.get_subscribed_symbols() or []
                prov_dict[adapter.provider_id] = {
                    "status": st,
                    "subscriptions": len(subs),
                    "dataMode": getattr(adapter, "data_mode", "REAL_TIME"),
                }
            except Exception:
                prov_dict[adapter.provider_id] = {"status": "UNKNOWN", "subscriptions": 0}

        valid_quotes = list(self._quote_cache.values())
        live_cnt = sum(1 for q in valid_quotes if not getattr(q, "is_stale", False) and (getattr(q, "last_price", 0) or 0) > 0)
        stale_cnt = sum(1 for q in valid_quotes if getattr(q, "is_stale", False) or (getattr(q, "last_price", 0) or 0) <= 0)
        tick_timestamps = [str(q.received_timestamp) for q in valid_quotes if getattr(q, "received_timestamp", None)]
        latest_tick = max(tick_timestamps, default=None)

        return web.json_response({
            "status": "OK",
            "gateway": "ready",
            "websocket": "ready",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "providers": prov_dict,
            "subscriptions": len(self.subscription_registry.get_active_symbols()),
            "live_instruments": live_cnt,
            "stale_instruments": stale_cnt,
            "last_tick_at": latest_tick,
            "errors": [],
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

        if not symbols and request.method == "POST":
            try:
                body = await request.json()
                if isinstance(body, dict) and "symbols" in body:
                    symbols = [str(s).strip().upper() for s in body.get("symbols", []) if str(s).strip()]
                elif isinstance(body, list):
                    symbols = [str(s).strip().upper() for s in body if str(s).strip()]
            except Exception:
                pass

        # If no symbols specified, return all active non-empty quotes in cache
        if not symbols:
            result = {}
            for sym, q in list(self._quote_cache.items()):
                if ":" not in sym and "/" not in sym and q.last_price > 0:
                    q.mark_stale(5.0, 15.0)
                    result[sym] = q.to_dict()
            return web.json_response({
                "status": "success",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "quotes": result,
                "totalCount": len(result),
                "missing": [],
            })

        result: Dict[str, Any] = {}
        for sym in symbols:
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
                matched_q.mark_stale(5.0, 15.0)
                result[sym] = matched_q.to_dict()
                continue

            # Try failover adapter snapshot
            adapter = self.failover.get_best_provider(sym)
            if adapter:
                try:
                    quotes = await asyncio.wait_for(adapter.get_snapshot([sym]), timeout=2.0)
                    if sym in quotes:
                        quotes[sym].mark_stale(5.0, 15.0)
                        result[sym] = quotes[sym].to_dict()
                        self._quote_cache[sym] = quotes[sym]
                    else:
                        for a in aliases:
                            if a in quotes:
                                quotes[a].mark_stale(5.0, 15.0)
                                result[sym] = quotes[a].to_dict()
                                self._quote_cache[a] = quotes[a]
                                break
                except Exception:
                    pass

        return web.json_response({
            "status": "success",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "quotes": result,
            "totalCount": len(result),
            "missing": [s for s in symbols if s not in result],
        })

    async def handle_movers(self, request: web.Request) -> web.Response:
        """Returns top gainers, losers, and most active volume leaders from normalized live cache."""
        limit_str = request.rel_url.query.get("limit", "10")
        limit = int(limit_str) if limit_str.isdigit() else 10
        movers = _compute_top_movers(self._quote_cache, limit=limit)

        return web.json_response({
            "status": "success",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "movers": movers,
        })

    async def handle_futures(self, request: web.Request) -> web.Response:
        """Returns normalized futures contracts list."""
        contracts = []
        for sym in ["BTC/USDT", "ETH/USDT", "SOL/USDT", "NIFTY", "BANKNIFTY"]:
            q = self._quote_cache.get(sym)
            if q and q.last_price > 0:
                contracts.append(q.to_dict())
        return web.json_response({
            "status": "success",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "contracts": contracts,
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
        remote_host = (request.remote or "").lower().strip()
        is_loopback = (
            remote_host in ("127.0.0.1", "::1", "localhost", "testclient", "")
            or remote_host.startswith("127.")
            or remote_host.startswith("::ffff:127.")
            or remote_host in ("0.0.0.0", "::")
        )

        if GATEWAY_SECRET and secret != GATEWAY_SECRET and not is_loopback:
            raise web.HTTPForbidden(reason="Invalid gateway secret")

        ws = web.WebSocketResponse(heartbeat=30)
        await ws.prepare(request)

        client_id = str(uuid.uuid4())
        subscriptions: Set[str] = set()

        async with self._ws_lock:
            self._ws_clients[client_id] = (ws, subscriptions)

        logger.info("[GATEWAY][WS] CONNECT client_id=%s remote=%s", client_id, remote_host)

        # Send immediate handshake to client
        try:
            await ws.send_str(json.dumps({
                "type": "GATEWAY_READY",
                "clientId": client_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "status": "READY",
                "activeProviders": [
                    {"id": a.provider_id, "status": a.get_status()}
                    for a in self.adapters.values()
                ],
            }))
        except Exception:
            pass

        try:
            async for msg in ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    try:
                        cmd = json.loads(msg.data)
                        action = cmd.get("action", "")
                        syms = [s.upper() for s in cmd.get("symbols", [])]
                        reason = cmd.get("reason", "CHART_VIEW")

                        if action == "subscribe":
                            provider_hint = cmd.get("provider")
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
                        elif action == "change_depth":
                            depth_levels = int(cmd.get("depth", 5))
                            symbol = cmd.get("symbol", "").upper()
                            logger.info("[GATEWAY][WS] Client %s changed depth to %d for %s", client_id, depth_levels, symbol)
                            await ws.send_str(json.dumps({
                                "type": "DEPTH_CONFIG",
                                "symbol": symbol,
                                "depth": depth_levels,
                                "status": "APPLIED",
                            }))
                        elif action == "select_provider":
                            provider_name = cmd.get("provider", "").lower()
                            logger.info("[GATEWAY][WS] Client %s selected provider %s", client_id, provider_name)
                            await ws.send_str(json.dumps({
                                "type": "PROVIDER_SELECTED",
                                "provider": provider_name,
                                "status": "ACTIVE",
                            }))
                        elif action == "select_symbol":
                            symbol = cmd.get("symbol", "").upper()
                            if symbol:
                                subscriptions.add(symbol)
                                self.subscription_registry.subscribe(symbol, "DETAIL_VIEW", source=client_id)
                                if symbol in self._quote_cache:
                                    await ws.send_str(json.dumps({
                                        "type": "QUOTE",
                                        "data": self._quote_cache[symbol].to_dict(),
                                    }))
                        elif action == "ping":
                            await ws.send_str(json.dumps({
                                "type": "PONG",
                                "timestamp": datetime.now(timezone.utc).isoformat(),
                            }))
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
        Canonical Option Chain HTTP Snapshot Endpoint across all supported providers.
        Centralized server-side cache keyed by PROVIDER:UNDERLYING:EXPIRY.
        """
        und = (request.rel_url.query.get("underlying") or request.rel_url.query.get("symbol") or "NIFTY").upper().strip()
        provider = (request.rel_url.query.get("provider") or request.rel_url.query.get("source") or ("DELTA_INDIA" if und in ["BTC", "ETH", "SOL", "XRP"] else "DHAN")).upper().strip()
        expiry = request.rel_url.query.get("expiry") or None
        strike_count_str = request.rel_url.query.get("strike_count") or "40"
        strike_count = int(strike_count_str) if strike_count_str.isdigit() else 40
        market_data_mode = request.rel_url.query.get("mode", "LIVE").upper()

        cache_key = f"{provider}:{und}:{expiry or 'DEFAULT'}"
        cached = global_market_cache.get_option_chain(cache_key)
        if cached:
            return web.json_response(cached)

        # Delta Exchange / Crypto Options
        if provider in ("DELTA", "DELTA_INDIA") or und in ["BTC", "ETH", "SOL", "XRP"]:
            delta_adapter = self.adapters.get("delta_options_ws")
            if delta_adapter and hasattr(delta_adapter, "get_normalized_option_chain"):
                try:
                    res = await delta_adapter.get_normalized_option_chain(
                        underlying=und,
                        expiry=expiry,
                        strike_count=strike_count,
                    )
                    global_market_cache.set_option_chain(cache_key, res)
                    return web.json_response(res)
                except Exception as ex:
                    logger.error(f"Error fetching Delta option chain: {ex}", exc_info=True)
                    return web.json_response({
                        "success": False,
                        "error": str(ex),
                        "source": "DELTA_INDIA",
                        "broker": "DELTA",
                        "underlying": und,
                        "rows": [],
                        "strikes": [],
                    }, status=500)

        # Indian Options (Dhan, Upstox, Paper Simulator) via UniversalOptionsEngine
        try:
            from src.market_data import global_options_engine
            # Retrieve spot price if known
            spot_price = 0.0
            q = self._quote_cache.get(und)
            if q and q.last_price > 0:
                spot_price = q.last_price

            snap = global_options_engine.get_option_chain(
                underlying=und,
                provider=provider,
                spot_price=spot_price,
                expiry=expiry,
                strike_count=strike_count,
                environment="LIVE" if market_data_mode == "LIVE" else "PAPER",
            )
            res = snap.to_dict()
            if snap.status == "LIVE" and snap.strikes:
                global_market_cache.set_option_chain(cache_key, res)
            return web.json_response(res)
        except Exception as ex:
            logger.error(f"Error fetching option chain for {und} ({provider}): {ex}", exc_info=True)
            return web.json_response({
                "status": "error",
                "error": str(ex),
                "provider": provider,
                "underlying": und,
                "strikes": [],
                "available_expiries": [],
            }, status=500)

    async def handle_options_underlyings(self, request: web.Request) -> web.Response:
        """Returns list of all F&O eligible underlying instruments."""
        indices = ["NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "SENSEX"]
        equities = [
            "RELIANCE", "HDFCBANK", "ICICIBANK", "SBIN", "INFY", "TCS",
            "AXISBANK", "KOTAKBANK", "BHARTIARTL", "LT", "ITC", "TATAMOTORS",
            "TATASTEEL", "BAJFINANCE", "MARUTI", "SUNPHARMA", "HINDUNILVR"
        ]
        crypto = ["BTC", "ETH", "SOL", "XRP"]
        return web.json_response({
            "status": "success",
            "indices": indices,
            "equities": equities,
            "crypto": crypto,
            "all": indices + equities + crypto,
        })

    async def handle_options_expiries(self, request: web.Request) -> web.Response:
        """Returns official/standard available expiries for underlying."""
        und = (request.rel_url.query.get("underlying") or "NIFTY").upper().strip()
        provider = (request.rel_url.query.get("provider") or "DHAN").upper().strip()

        try:
            from src.market_data.instrument_master import global_instrument_master
            expiries = global_instrument_master.get_expiries_for_underlying(und)
            return web.json_response({
                "status": "success",
                "underlying": und,
                "provider": provider,
                "expiries": expiries,
            })
        except Exception as ex:
            return web.json_response({"status": "error", "error": str(ex), "expiries": []}, status=500)

    async def handle_options_diagnostics(self, request: web.Request) -> web.Response:
        """
        Diagnostic Endpoint for Option Chain Pipeline (Requirement 27).
        Returns underlying resolution, native underlying ID, expiries, selected expiry,
        contract count, CE count, PE count, active subscriptions, fresh ticks, stale contracts, last provider error.
        """
        und = (request.rel_url.query.get("underlying") or "NIFTY").upper().strip()
        provider = (request.rel_url.query.get("provider") or ("DELTA_INDIA" if und in ["BTC", "ETH", "SOL", "XRP"] else "DHAN")).upper().strip()
        expiry = request.rel_url.query.get("expiry") or None

        native_id = "UNKNOWN"
        is_resolved = False
        last_error = None

        if provider == "DHAN":
            try:
                scrip_map = {
                    "NIFTY": {"scrip": 13, "seg": "IDX_I"},
                    "BANKNIFTY": {"scrip": 25, "seg": "IDX_I"},
                    "FINNIFTY": {"scrip": 27, "seg": "IDX_I"},
                    "MIDCPNIFTY": {"scrip": 44, "seg": "IDX_I"},
                    "SENSEX": {"scrip": 51, "seg": "IDX_I"},
                    "RELIANCE": {"scrip": 2885, "seg": "NSE_EQ"},
                    "HDFCBANK": {"scrip": 1333, "seg": "NSE_EQ"},
                    "ICICIBANK": {"scrip": 4963, "seg": "NSE_EQ"},
                    "SBIN": {"scrip": 3045, "seg": "NSE_EQ"},
                    "INFY": {"scrip": 1594, "seg": "NSE_EQ"},
                    "TCS": {"scrip": 11536, "seg": "NSE_EQ"},
                }
                info = scrip_map.get(und)
                if not info:
                    from src.dhan_service import global_dhan_service
                    meta = global_dhan_service.get_security_metadata(und)
                    if meta and "security_id" in meta:
                        info = {"scrip": int(meta["security_id"]), "seg": meta.get("exchange_segment", "NSE_EQ")}
                if info:
                    native_id = f"DHAN:{info['seg']}:{info['scrip']}"
                    is_resolved = True
            except Exception as e:
                last_error = str(e)
        elif provider == "UPSTOX":
            try:
                from src.upstox_service import OFFICIAL_UPSTOX_KEYS
                reg = OFFICIAL_UPSTOX_KEYS.get(und)
                if reg:
                    native_id = reg.get("instrument_key", "UNKNOWN")
                    is_resolved = True
            except Exception as e:
                last_error = str(e)
        elif provider in ("DELTA", "DELTA_INDIA"):
            native_id = f"DELTA:{und}_USD"
            is_resolved = True

        from src.market_data.instrument_master import global_instrument_master
        available_expiries = global_instrument_master.get_expiries_for_underlying(und)
        selected_exp = expiry or (available_expiries[0] if available_expiries else "")

        contract_count = 0
        ce_count = 0
        pe_count = 0
        fresh_ticks = 0
        stale_contracts = 0
        status = "OFFLINE"

        try:
            from src.market_data import global_options_engine
            snap = global_options_engine.get_option_chain(underlying=und, provider=provider, expiry=selected_exp)
            if snap and snap.strikes:
                contract_count = len(snap.strikes) * 2
                ce_count = len(snap.strikes)
                pe_count = len(snap.strikes)
                fresh_ticks = sum(1 for s in snap.strikes if (s.ce.lastPrice is not None or s.pe.lastPrice is not None))
                status = snap.freshnessStatus
        except Exception as e:
            last_error = str(e)

        active_subs = len([s for s in self.subscription_registry.get_active_subscriptions() if und in s])

        return web.json_response({
            "status": "success",
            "underlying": und,
            "provider": provider,
            "resolved": is_resolved,
            "native_underlying_id": native_id,
            "available_expiries": available_expiries,
            "selected_expiry": selected_exp,
            "contract_count": contract_count,
            "ce_count": ce_count,
            "pe_count": pe_count,
            "active_subscriptions": active_subs,
            "fresh_ticks": fresh_ticks,
            "stale_contracts": stale_contracts,
            "provider_status": status,
            "last_error": last_error,
            "timestamp": datetime.now(timezone.utc).isoformat(),
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
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Gateway-Secret, X-Request-Id, Authorization, X-Idempotency-Key"
    return response


def create_app() -> tuple:
    gateway = MarketDataGateway()
    app = web.Application(middlewares=[cors_middleware])

    # Health & Matrix Endpoints
    app.router.add_get("/health", gateway.handle_health)
    app.router.add_get("/health/live", gateway.handle_health)
    app.router.add_get("/health/ready", gateway.handle_health)
    app.router.add_get("/health/market-data", gateway.handle_market_data_health)
    app.router.add_get("/health/providers", gateway.handle_health)
    app.router.add_get("/api/health", gateway.handle_health)
    app.router.add_get("/api/health/live", gateway.handle_health)
    app.router.add_get("/api/health/ready", gateway.handle_health)
    app.router.add_get("/api/market/health", gateway.handle_market_data_health)
    app.router.add_get("/api/market-data/health", gateway.handle_market_data_health)
    app.router.add_get("/api/market/status", gateway.handle_market_data_health)
    app.router.add_get("/api/market-data/status", gateway.handle_market_data_health)
    app.router.add_get("/providers/health", gateway.handle_health)
    app.router.add_get("/metrics", gateway.handle_metrics)

    # Snapshot & Quotes Endpoints (GET & POST)
    app.router.add_get("/snapshot", gateway.handle_snapshot)
    app.router.add_post("/snapshot", gateway.handle_snapshot)
    app.router.add_get("/api/snapshot", gateway.handle_snapshot)
    app.router.add_post("/api/snapshot", gateway.handle_snapshot)
    app.router.add_get("/api/v1/snapshot", gateway.handle_snapshot)
    app.router.add_post("/api/v1/snapshot", gateway.handle_snapshot)
    app.router.add_get("/api/market/snapshot", gateway.handle_snapshot)
    app.router.add_post("/api/market/snapshot", gateway.handle_snapshot)
    app.router.add_get("/api/market-data/snapshot", gateway.handle_snapshot)
    app.router.add_post("/api/market-data/snapshot", gateway.handle_snapshot)
    app.router.add_get("/api/market/quotes", gateway.handle_snapshot)
    app.router.add_get("/api/market-data/quotes", gateway.handle_snapshot)

    # Single Quote & LTP
    app.router.add_get("/ltp", gateway.handle_ltp)
    app.router.add_get("/api/ltp", gateway.handle_ltp)
    app.router.add_get("/api/market/quote", gateway.handle_ltp)
    app.router.add_get("/api/market-data/ltp", gateway.handle_ltp)
    app.router.add_get("/api/market-data/quote", gateway.handle_ltp)

    # Top Movers & Market Universe
    app.router.add_get("/movers", gateway.handle_movers)
    app.router.add_get("/api/movers", gateway.handle_movers)
    app.router.add_get("/api/market/movers", gateway.handle_movers)
    app.router.add_get("/api/market-data/movers", gateway.handle_movers)

    # Instruments & Search
    app.router.add_get("/search", gateway.handle_search)
    app.router.add_get("/api/search", gateway.handle_search)
    app.router.add_get("/api/market/instruments", gateway.handle_search)
    app.router.add_get("/api/market/instruments/search", gateway.handle_search)
    app.router.add_get("/api/market-data/instruments", gateway.handle_search)

    # Options & Derivatives
    app.router.add_get("/options/chain", gateway.handle_options_chain)
    app.router.add_get("/api/options/chain", gateway.handle_options_chain)
    app.router.add_get("/api/options/delta/chain", gateway.handle_options_chain)
    app.router.add_get("/api/market/options", gateway.handle_options_chain)
    app.router.add_get("/api/market/options/chain", gateway.handle_options_chain)
    app.router.add_get("/api/market/options/underlyings", gateway.handle_options_underlyings)
    app.router.add_get("/api/market/options/expiries", gateway.handle_options_expiries)
    app.router.add_get("/api/market/options/diagnostics", gateway.handle_options_diagnostics)
    app.router.add_get("/api/options/diagnostics", gateway.handle_options_diagnostics)
    app.router.add_get("/api/market-data/options", gateway.handle_options_chain)
    app.router.add_get("/api/market/futures", gateway.handle_futures)
    app.router.add_get("/api/market/futures/contracts", gateway.handle_futures)

    # Feed Control & Subscriptions
    app.router.add_post("/subscriptions", gateway.handle_subscribe_api)
    app.router.add_post("/api/subscriptions", gateway.handle_subscribe_api)
    app.router.add_post("/api/market/subscribe", gateway.handle_subscribe_api)
    app.router.add_post("/api/market/subscriptions", gateway.handle_subscribe_api)
    app.router.add_post("/api/market-data/subscriptions", gateway.handle_subscribe_api)
    app.router.add_post("/api/market-data/feed/control", gateway.handle_feed_control)

    # WebSockets (Universal port 5051 real-time stream)
    app.router.add_get("/ws", gateway.handle_ws)
    app.router.add_get("/ws/market", gateway.handle_ws)
    app.router.add_get("/ws/market-data", gateway.handle_ws)
    app.router.add_get("/api/ws", gateway.handle_ws)

    async def _on_startup(app_):
        await gateway.startup()

    async def _on_shutdown(app_):
        await gateway.shutdown()

    app.on_startup.append(_on_startup)
    app.on_shutdown.append(_on_shutdown)

    return app, gateway


async def main():
    port = int(os.environ.get("MARKET_GATEWAY_PORT", "5051"))
    host = os.environ.get("MARKET_GATEWAY_HOST", "0.0.0.0")
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
