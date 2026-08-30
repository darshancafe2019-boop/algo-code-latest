"""
Delta Exchange Options WebSocket Adapter
========================================
Production-grade, auto-reconnecting WebSocket adapter for Delta Exchange Options.
Subscribes to Delta's official 'ticker' channel for option chains (ASSET-DDMMYY),
individual contracts, and spot indices.
Provides real-time Greeks, IV, top-of-book bid/ask, OI, volume, and mark prices.
"""
from __future__ import annotations

import asyncio
import json
import logging
import random
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set

try:
    import websockets
    from websockets.exceptions import ConnectionClosed
    WS_AVAILABLE = True
except ImportError:
    WS_AVAILABLE = False

from market_data_gateway.adapters.base import (
    BaseProviderAdapter,
    CanonicalInstrument,
    NormalizedQuote,
    OHLCVCandle,
    ProviderHealth,
)
from src import config
from src.delta_options_client import global_delta_client

logger = logging.getLogger("MDGateway.DeltaOptionsWS")

DELTA_PUBLIC_WS_DEFAULT = "wss://public-socket.india.delta.exchange"
MAX_BACKOFF_SEC = 60.0


class DeltaOptionsWSAdapter(BaseProviderAdapter):
    """
    Persistent WebSocket adapter for Delta Exchange cryptocurrency options.
    Batches subscriptions to chain-level symbols (e.g. BTC-300826) and single contracts.
    """

    def __init__(self):
        super().__init__("delta_options_ws", "Delta Exchange Options WebSocket")
        self._ws_url = getattr(config, "DELTA_PUBLIC_WS_URL", DELTA_PUBLIC_WS_DEFAULT)
        self._ws = None
        self._ws_task: Optional[asyncio.Task] = None
        self._heartbeat_task: Optional[asyncio.Task] = None
        self._running = False
        self._retry_count = 0
        self._last_msg_time: float = 0.0
        self._quote_cache: Dict[str, NormalizedQuote] = {}
        self._raw_quote_cache: Dict[str, Dict[str, Any]] = {}
        self._product_id_to_symbol: Dict[int, str] = {}
        self._chain_symbols: Set[str] = set()

    # ─── Lifecycle & Connection ───────────────────────────────────────────────

    async def connect(self) -> None:
        if not WS_AVAILABLE:
            self._logger.error("websockets package not available; Delta options WS disabled.")
            self._status = "ERROR"
            return

        self._running = True
        self._ws_task = asyncio.create_task(self._run_loop(), name="DeltaOptionsWS-Loop")
        self._logger.info("Delta Options WebSocket adapter started.")

    async def disconnect(self) -> None:
        self._running = False
        if self._heartbeat_task and not self._heartbeat_task.done():
            self._heartbeat_task.cancel()
        if self._ws_task and not self._ws_task.done():
            self._ws_task.cancel()
        if self._ws:
            try:
                await self._ws.close()
            except Exception:
                pass
        self._status = "DISCONNECTED"
        self._logger.info("Delta Options WebSocket adapter disconnected.")

    async def _run_loop(self) -> None:
        """Main connection and message dispatch loop with exponential backoff & jitter."""
        while self._running:
            try:
                self._logger.info(f"Connecting to Delta Options WebSocket: {self._ws_url}")
                async with websockets.connect(self._ws_url, ping_interval=20, ping_timeout=15) as ws:
                    self._ws = ws
                    self._retry_count = 0
                    self._record_success()
                    self._logger.info("[OK] Connected to Delta Options WebSocket successfully.")

                    # Start periodic ping/heartbeat loop
                    self._heartbeat_task = asyncio.create_task(self._ping_loop(), name="DeltaOptionsWS-Ping")

                    # Resubscribe to all active targets
                    await self._resubscribe()

                    # Message read loop
                    async for raw_msg in ws:
                        self._last_msg_time = time.monotonic()
                        try:
                            data = json.loads(raw_msg)
                            self._handle_message(data)
                        except Exception as parse_err:
                            self._logger.debug(f"Error parsing Delta WS message: {parse_err}")

            except asyncio.CancelledError:
                break
            except Exception as e:
                self._record_error(str(e))
                if self._running:
                    self._retry_count += 1
                    backoff = min(MAX_BACKOFF_SEC, (2 ** min(self._retry_count, 6))) + random.uniform(0.1, 1.0)
                    self._logger.warning(
                        f"Delta WS disconnected: {e}. Reconnecting in {backoff:.1f}s (Attempt #{self._retry_count})"
                    )
                    await asyncio.sleep(backoff)

    async def _ping_loop(self) -> None:
        """Sends periodic application-level heartbeats if required by exchange."""
        while self._running and self._ws:
            try:
                await asyncio.sleep(25.0)
                if self._ws and not self._ws.closed:
                    # Delta supports standard ping or ping message
                    try:
                        await self._ws.send(json.dumps({"type": "ping"}))
                    except Exception:
                        pass
            except asyncio.CancelledError:
                break
            except Exception:
                pass

    # ─── Subscription Management ──────────────────────────────────────────────

    async def subscribe(self, symbols: List[str]) -> None:
        new_symbols = set(symbols) - self._subscribed_symbols
        if not new_symbols:
            return

        self._subscribed_symbols.update(new_symbols)
        if self._ws and not self._ws.closed:
            await self._send_subscription(list(new_symbols))

    async def unsubscribe(self, symbols: List[str]) -> None:
        self._subscribed_symbols.difference_update(symbols)
        if self._ws and not self._ws.closed:
            unsub_msg = {
                "type": "unsubscribe",
                "payload": {
                    "channels": [
                        {"name": "ticker", "symbols": symbols}
                    ]
                }
            }
            try:
                await self._ws.send(json.dumps(unsub_msg))
            except Exception as e:
                self._logger.warning(f"Failed to send unsubscribe message: {e}")

    async def _resubscribe(self) -> None:
        """Resubscribes all tracked symbols and chain expiries upon reconnect."""
        all_to_sub = list(self._subscribed_symbols | self._chain_symbols)
        if all_to_sub and self._ws and not self._ws.closed:
            await self._send_subscription(all_to_sub)

    async def _send_subscription(self, symbols: List[str]) -> None:
        if not self._ws or self._ws.closed:
            return

        # Delta supports batched symbol subscriptions
        sub_msg = {
            "type": "subscribe",
            "payload": {
                "channels": [
                    {"name": "ticker", "symbols": symbols}
                ]
            }
        }
        try:
            await self._ws.send(json.dumps(sub_msg))
            self._logger.info(f"Sent Delta WS subscription for {len(symbols)} symbols: {symbols[:5]}...")
        except Exception as e:
            self._logger.error(f"Error sending subscription to Delta WS: {e}")

    def track_chain_symbol(self, chain_symbol: str) -> None:
        """Adds a chain symbol (e.g. BTC-300826) to background tracking."""
        self._chain_symbols.add(chain_symbol)
        if self._ws and not self._ws.closed and self._running:
            asyncio.create_task(self._send_subscription([chain_symbol]))

    # ─── Message Handling & Normalization ─────────────────────────────────────

    def _handle_message(self, data: Dict[str, Any]) -> None:
        msg_type = data.get("type")
        if msg_type == "subscriptions":
            # Subscription confirmation
            channels = data.get("channels", [])
            for ch in channels:
                if "error" in ch:
                    self._logger.warning(f"Delta WS subscription error on channel {ch.get('name')}: {ch.get('error')}")
                else:
                    self._logger.info(f"Delta WS active on channel {ch.get('name')}")
            return

        if msg_type == "pong":
            return

        if msg_type == "ticker":
            # Check if it's a batch chain update (has 'd' list and 'sy' chain symbol)
            chain_symbol = data.get("sy")
            spot_px = float(data.get("sp", 0.0)) if data.get("sp") is not None else None
            batch_items = data.get("d", [])

            if isinstance(batch_items, list) and batch_items:
                for item in batch_items:
                    self._normalize_and_emit_ticker(item, default_spot=spot_px, chain_symbol=chain_symbol)
            else:
                # Single ticker object
                self._normalize_and_emit_ticker(data, default_spot=spot_px, chain_symbol=chain_symbol)

    def _normalize_and_emit_ticker(
        self,
        item: Dict[str, Any],
        default_spot: Optional[float] = None,
        chain_symbol: Optional[str] = None
    ) -> None:
        try:
            symbol = item.get("s") or item.get("symbol")
            if not symbol:
                return

            product_id = item.get("i") or item.get("product_id")
            if product_id:
                self._product_id_to_symbol[int(product_id)] = symbol

            # Parse Mark Price
            mark_price = float(item.get("m") or item.get("mark_price") or 0.0)

            # Parse Greeks: [delta, gamma, theta, vega, rho]
            greeks_raw = item.get("g") or item.get("greeks") or []
            delta = 0.0
            gamma = 0.0
            theta = 0.0
            vega = 0.0
            rho = 0.0
            if isinstance(greeks_raw, list) and len(greeks_raw) >= 5:
                delta = float(greeks_raw[0] or 0.0)
                gamma = float(greeks_raw[1] or 0.0)
                theta = float(greeks_raw[2] or 0.0)
                vega = float(greeks_raw[3] or 0.0)
                rho = float(greeks_raw[4] or 0.0)
            elif isinstance(greeks_raw, dict):
                delta = float(greeks_raw.get("delta") or 0.0)
                gamma = float(greeks_raw.get("gamma") or 0.0)
                theta = float(greeks_raw.get("theta") or 0.0)
                vega = float(greeks_raw.get("vega") or 0.0)
                rho = float(greeks_raw.get("rho") or 0.0)

            # Parse Quotes: [best_bid, bid_size, best_ask, ask_size, impact_mid]
            quotes_raw = item.get("q") or item.get("quotes") or []
            best_bid = 0.0
            bid_size = 0.0
            best_ask = 0.0
            ask_size = 0.0
            if isinstance(quotes_raw, list) and len(quotes_raw) >= 4:
                best_bid = float(quotes_raw[0] or 0.0)
                bid_size = float(quotes_raw[1] or 0.0)
                best_ask = float(quotes_raw[2] or 0.0)
                ask_size = float(quotes_raw[3] or 0.0)
            elif isinstance(quotes_raw, dict):
                best_bid = float(quotes_raw.get("best_bid") or 0.0)
                bid_size = float(quotes_raw.get("bid_size") or 0.0)
                best_ask = float(quotes_raw.get("best_ask") or 0.0)
                ask_size = float(quotes_raw.get("ask_size") or 0.0)

            # Parse IV: [mark_iv, bid_iv, ask_iv]
            qiv_raw = item.get("qiv") or []
            mark_iv = 0.0
            bid_iv = 0.0
            ask_iv = 0.0
            if isinstance(qiv_raw, list) and len(qiv_raw) >= 3:
                mark_iv = float(qiv_raw[0] or 0.0)
                bid_iv = float(qiv_raw[1] or 0.0)
                ask_iv = float(qiv_raw[2] or 0.0)

            # Parse Open Interest: [oi_contracts, oi_change]
            oi_raw = item.get("oi") or []
            oi = 0.0
            if isinstance(oi_raw, list) and len(oi_raw) >= 1:
                oi = float(oi_raw[0] or 0.0)
            elif isinstance(oi_raw, (int, float, str)):
                try:
                    oi = float(oi_raw)
                except Exception:
                    pass

            # Parse OHLC: [open, high, low, close]
            ohlc_raw = item.get("ohlc") or []
            open_px = None
            high_px = None
            low_px = None
            close_px = None
            if isinstance(ohlc_raw, list) and len(ohlc_raw) >= 4:
                open_px = float(ohlc_raw[0]) if ohlc_raw[0] is not None else None
                high_px = float(ohlc_raw[1]) if ohlc_raw[1] is not None else None
                low_px = float(ohlc_raw[2]) if ohlc_raw[2] is not None else None
                close_px = float(ohlc_raw[3]) if ohlc_raw[3] is not None else None

            # Parse Price Bands: [lower, upper]
            pb_raw = item.get("pb") or item.get("price_band") or []
            pb_lower = 0.0
            pb_upper = 0.0
            if isinstance(pb_raw, list) and len(pb_raw) >= 2:
                pb_lower = float(pb_raw[0] or 0.0)
                pb_upper = float(pb_raw[1] or 0.0)
            elif isinstance(pb_raw, dict):
                pb_lower = float(pb_raw.get("lower_limit") or 0.0)
                pb_upper = float(pb_raw.get("upper_limit") or 0.0)

            # Spot price
            spot_price = default_spot
            if item.get("spot_price"):
                spot_price = float(item["spot_price"])

            # 24h change
            change_pct = float(item.get("m24hc") or item.get("mark_change_24h") or 0.0)

            now_iso = datetime.now(timezone.utc).isoformat()

            norm_quote = NormalizedQuote(
                symbol=symbol,
                exchange="DELTA",
                provider="delta_options_ws",
                last_price=mark_price,
                bid=best_bid,
                ask=best_ask,
                volume=float(item.get("volume", 0.0)),
                high=high_px,
                low=low_px,
                open=open_px,
                close=close_px,
                change_pct=change_pct,
                oi=oi,
                event_timestamp=now_iso,
                received_timestamp=now_iso,
                data_mode="REAL_TIME",
                is_stale=False,
            )

            # Enrich raw dictionary for option chain consumers
            raw_dict = {
                "product_id": product_id,
                "symbol": symbol,
                "mark_price": mark_price,
                "spot_price": spot_price,
                "best_bid": best_bid,
                "best_ask": best_ask,
                "bid_size": bid_size,
                "ask_size": ask_size,
                "bid_iv": bid_iv,
                "ask_iv": ask_iv,
                "mark_iv": mark_iv,
                "delta": delta,
                "gamma": gamma,
                "theta": theta,
                "vega": vega,
                "rho": rho,
                "oi": oi,
                "open_price": open_px,
                "high_price": high_px,
                "low_price": low_px,
                "close_price": close_px,
                "price_change_24h": change_pct,
                "price_band_lower": pb_lower,
                "price_band_upper": pb_upper,
                "chain_symbol": chain_symbol,
                "timestamp": now_iso,
            }

            self._quote_cache[symbol] = norm_quote
            self._raw_quote_cache[symbol] = raw_dict
            if product_id:
                self._raw_quote_cache[str(product_id)] = raw_dict

            # Emit canonical tick to gateway listeners
            self._emit(norm_quote)

        except Exception as e:
            self._logger.debug(f"Error normalizing Delta ticker: {e}")

    # ─── Public Queries & Snapshots ───────────────────────────────────────────

    async def get_snapshot(self, symbols: List[str]) -> Dict[str, NormalizedQuote]:
        res: Dict[str, NormalizedQuote] = {}
        missing: List[str] = []
        for s in symbols:
            if s in self._quote_cache:
                res[s] = self._quote_cache[s]
            else:
                missing.append(s)

        if missing:
            # Fallback to REST tickers
            try:
                tickers = await asyncio.to_thread(global_delta_client.get_tickers)
                for t in tickers:
                    sym = t.get("symbol")
                    if sym and sym in missing:
                        norm = NormalizedQuote(
                            symbol=sym,
                            exchange="DELTA",
                            provider="delta_options_ws",
                            last_price=float(t.get("mark_price", 0.0)),
                            bid=float(t.get("quotes", {}).get("best_bid", 0.0)),
                            ask=float(t.get("quotes", {}).get("best_ask", 0.0)),
                            volume=float(t.get("volume", 0.0)),
                            oi=float(t.get("oi", 0.0)),
                            change_pct=float(t.get("mark_change_24h", 0.0)),
                            data_mode="REAL_TIME",
                        )
                        self._quote_cache[sym] = norm
                        res[sym] = norm
            except Exception as e:
                self._logger.warning(f"Error in REST snapshot fallback: {e}")

        return res

    def get_raw_quote(self, symbol_or_product_id: str) -> Optional[Dict[str, Any]]:
        return self._raw_quote_cache.get(str(symbol_or_product_id))

    def get_all_raw_quotes(self) -> Dict[str, Dict[str, Any]]:
        return dict(self._raw_quote_cache)

    async def get_history(
        self,
        symbol: str,
        timeframe: str,
        from_dt: datetime,
        to_dt: datetime,
    ) -> List[OHLCVCandle]:
        # Historical endpoint for options
        return []

    async def get_instruments(self) -> List[CanonicalInstrument]:
        try:
            prods = await asyncio.to_thread(global_delta_client.get_products)
            res = []
            for p in prods:
                res.append(
                    CanonicalInstrument(
                        canonical_symbol=p.get("symbol", ""),
                        display_name=p.get("description", p.get("symbol", "")),
                        asset_class="CRYPTO_OPTIONS",
                        exchange="DELTA",
                        mic_code="DELTA",
                        region="GLOBAL",
                        currency=p.get("quoting_asset", {}).get("symbol", "USD"),
                        timezone="UTC",
                        lot_size=1,
                        tick_size=float(p.get("tick_size", 0.1)),
                        has_options=True,
                        has_futures=False,
                        is_active=p.get("state") == "live",
                        expiry=p.get("settlement_time"),
                        strike=float(p.get("strike_price", 0.0)) if p.get("strike_price") else None,
                        option_type="CALL" if p.get("contract_type") == "call_options" else "PUT",
                    )
                )
            return res
        except Exception:
            return []

    def get_sync_health(self) -> Dict[str, Any]:
        now = time.monotonic()
        latency = (now - self._last_msg_time) * 1000.0 if self._last_msg_time > 0 else 9999.0
        return {
            "provider_id": "delta_options_ws",
            "provider_name": "Delta Exchange Options WebSocket",
            "status": self._status,
            "asset_classes": ["CRYPTO_OPTIONS"],
            "subscribed_symbols": len(self._subscribed_symbols) + len(self._chain_symbols),
            "latency_ms": round(latency, 2),
            "error_count": self._error_count,
            "last_tick_time": datetime.now(timezone.utc).isoformat() if self._last_msg_time > 0 else None,
            "message": "Operational and streaming live option chains." if self._status == "LIVE" else "Disconnected or stale.",
        }

    async def health_check(self) -> ProviderHealth:
        now = time.monotonic()
        latency = (now - self._last_msg_time) * 1000.0 if self._last_msg_time > 0 else 9999.0
        return ProviderHealth(
            provider_id="delta_options_ws",
            provider_name="Delta Exchange Options WebSocket",
            status=self._status,
            asset_classes=["CRYPTO_OPTIONS"],
            subscribed_symbols=len(self._subscribed_symbols) + len(self._chain_symbols),
            latency_ms=round(latency, 2),
            error_count=self._error_count,
            last_tick_time=datetime.now(timezone.utc).isoformat() if self._last_msg_time > 0 else None,
            message="Operational and streaming live option chains." if self._status == "LIVE" else "Disconnected or stale.",
        )


# Singleton adapter instance
delta_options_ws_adapter = DeltaOptionsWSAdapter()
