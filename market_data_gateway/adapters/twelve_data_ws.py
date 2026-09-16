"""
Twelve Data Real-time WebSocket & REST Adapter
================================================
Provides continuous live market quotes for US Equities (AAPL, NVDA, TSLA, etc.).
Subscribes to Twelve Data WebSocket feed, normalizes incoming ticks as NormalizedQuote,
and emits them via self._emit(quote) to update Gateway cache and broadcast to clients.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Set

import aiohttp
from market_data_gateway.adapters.base import (
    BaseProviderAdapter,
    CanonicalInstrument,
    NormalizedQuote,
    OHLCVCandle,
    ProviderHealth,
)

logger = logging.getLogger("MDGateway.TwelveDataWS")


class TwelveDataWSAdapter(BaseProviderAdapter):
    """
    Twelve Data real-time WebSocket provider adapter.
    """

    def __init__(self, api_key: Optional[str] = None):
        super().__init__("twelve_data", "Twelve Data")
        self._api_key = (api_key or os.environ.get("TWELVE_DATA_API_KEY", "")).strip()
        self._quote_cache: Dict[str, NormalizedQuote] = {}
        self._subscribed_symbols: Set[str] = set()
        self._ws: Optional[aiohttp.ClientWebSocketResponse] = None
        self._session: Optional[aiohttp.ClientSession] = None
        self._listen_task: Optional[asyncio.Task] = None
        self._reconnect_task: Optional[asyncio.Task] = None
        self._running = False
        self._status = "LIVE" if self._api_key else "NOT_CONFIGURED"

    async def connect(self) -> None:
        self._api_key = (self._api_key or os.environ.get("TWELVE_DATA_API_KEY", "")).strip()
        if not self._api_key or self._api_key.lower() == "demo":
            self._status = "NOT_CONFIGURED"
            logger.info("TwelveDataWSAdapter: TWELVE_DATA_API_KEY not set or demo key; adapter NOT_CONFIGURED.")
            return

        self._running = True
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        await self._connect_ws()

    async def _connect_ws(self) -> None:
        if not self._running or not self._api_key or self._api_key.lower() == "demo":
            self._status = "NOT_CONFIGURED"
            return

        url = f"wss://ws.twelvedata.com/v1/quotes/price?apikey={self._api_key}"
        try:
            if self._session is None or self._session.closed:
                self._session = aiohttp.ClientSession()

            self._ws = await self._session.ws_connect(url, heartbeat=20.0)
            self._status = "LIVE"
            logger.info("TwelveDataWSAdapter connected to WebSocket.")

            # Resubscribe any previously subscribed symbols
            if self._subscribed_symbols:
                syms_str = ",".join(list(self._subscribed_symbols))
                sub_msg = {"action": "subscribe", "params": {"symbols": syms_str}}
                await self._ws.send_json(sub_msg)
                logger.info("Resubscribed to Twelve Data symbols: %s", syms_str)

            if self._listen_task is None or self._listen_task.done():
                self._listen_task = asyncio.create_task(self._listen_loop())
        except aiohttp.WSServerHandshakeError as ex:
            if ex.status in (200, 401, 403, 400):
                self._status = "NOT_CONFIGURED"
                logger.warning("TwelveDataWSAdapter: API key invalid for WebSocket (status %d). Set valid TWELVE_DATA_API_KEY in .env to activate.", ex.status)
                return
            self._status = "ERROR"
            self._schedule_reconnect()
        except Exception as exc:
            self._status = "ERROR"
            logger.error("TwelveDataWSAdapter WS connection failed: %s", exc)
            self._schedule_reconnect()

    def _schedule_reconnect(self) -> None:
        if self._running and (self._reconnect_task is None or self._reconnect_task.done()):
            self._reconnect_task = asyncio.create_task(self._reconnect_loop())

    async def _reconnect_loop(self) -> None:
        delay = 2.0
        while self._running and (self._ws is None or self._ws.closed):
            await asyncio.sleep(delay)
            logger.info("Attempting TwelveData WS reconnect...")
            try:
                await self._connect_ws()
                if self._ws and not self._ws.closed:
                    break
            except Exception as e:
                logger.warning("TwelveData WS reconnect attempt failed: %s", e)
            delay = min(delay * 1.5, 15.0)

    async def _listen_loop(self) -> None:
        while self._running and self._ws and not self._ws.closed:
            try:
                msg = await self._ws.receive()
                if msg.type == aiohttp.WSMsgType.TEXT:
                    data = json.loads(msg.data)
                    self._parse_msg(data)
                elif msg.type in (aiohttp.WSMsgType.CLOSED, aiohttp.WSMsgType.ERROR):
                    logger.warning("TwelveData WS closed or error.")
                    break
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error("TwelveData WS listen loop error: %s", exc)
                break

        if self._running:
            self._status = "DISCONNECTED"
            self._schedule_reconnect()

    def _parse_msg(self, data: dict) -> None:
        event = data.get("event")
        if event == "price":
            sym = str(data.get("symbol", "")).upper().strip()
            price_val = data.get("price")
            if not sym or price_val is None:
                return
            try:
                live_price = float(price_val)
                if live_price <= 0:
                    return
            except (ValueError, TypeError):
                return

            now_iso = datetime.now(timezone.utc).isoformat()
            quote = NormalizedQuote(
                symbol=sym,
                exchange=str(data.get("exchange") or "NASDAQ"),
                provider="twelve_data",
                last_price=live_price,
                bid=float(data.get("bid")) if data.get("bid") is not None else live_price,
                ask=float(data.get("ask")) if data.get("ask") is not None else live_price,
                volume=float(data.get("day_volume")) if data.get("day_volume") is not None else 0.0,
                event_timestamp=now_iso,
                received_timestamp=now_iso,
                data_mode="REAL_TIME",
                is_stale=False,
            )
            self._quote_cache[sym] = quote
            self._emit(quote)
        elif event == "subscribe-status":
            logger.info("TwelveData subscribe status: %s", data)

    async def subscribe(self, symbols: List[str]) -> None:
        if not self._api_key:
            return

        new_syms = [s.upper().strip() for s in symbols if s.upper().strip() not in self._subscribed_symbols]
        if not new_syms:
            return

        for s in new_syms:
            self._subscribed_symbols.add(s)

        if self._ws and not self._ws.closed:
            sub_msg = {"action": "subscribe", "params": {"symbols": ",".join(new_syms)}}
            await self._ws.send_json(sub_msg)
            logger.info("TwelveData subscribed to: %s", new_syms)

    async def unsubscribe(self, symbols: List[str]) -> None:
        if not self._api_key:
            return

        unsub_syms = [s.upper().strip() for s in symbols if s.upper().strip() in self._subscribed_symbols]
        if not unsub_syms:
            return

        for s in unsub_syms:
            self._subscribed_symbols.discard(s)
            self._quote_cache.pop(s, None)

        if self._ws and not self._ws.closed:
            unsub_msg = {"action": "unsubscribe", "params": {"symbols": ",".join(unsub_syms)}}
            await self._ws.send_json(unsub_msg)

    async def get_snapshot(self, symbols: List[str]) -> Dict[str, NormalizedQuote]:
        res: Dict[str, NormalizedQuote] = {}
        missing: List[str] = []
        for s in symbols:
            upper_s = s.upper().strip()
            if upper_s in self._quote_cache:
                res[upper_s] = self._quote_cache[upper_s]
            else:
                missing.append(upper_s)

        if missing and self._api_key and self._session:
            try:
                syms_param = ",".join(missing)
                url = f"https://api.twelvedata.com/quote?symbol={syms_param}&apikey={self._api_key}"
                async with self._session.get(url, timeout=3.0) as resp:
                    if resp.status == 200:
                        json_data = await resp.json()
                        now_iso = datetime.now(timezone.utc).isoformat()
                        items = json_data if isinstance(json_data, dict) and "close" not in json_data else {missing[0]: json_data}
                        for sym_k, item in items.items():
                            if isinstance(item, dict) and "close" in item:
                                lp = float(item.get("close") or item.get("price") or 0.0)
                                if lp > 0:
                                    canon_sym = sym_k.upper().strip()
                                    q = NormalizedQuote(
                                        symbol=canon_sym,
                                        exchange=str(item.get("exchange") or "NASDAQ"),
                                        provider="twelve_data",
                                        last_price=lp,
                                        open=float(item.get("open")) if item.get("open") else None,
                                        high=float(item.get("high")) if item.get("high") else None,
                                        low=float(item.get("low")) if item.get("low") else None,
                                        close=float(item.get("previous_close")) if item.get("previous_close") else None,
                                        change_pct=float(item.get("percent_change")) if item.get("percent_change") else None,
                                        volume=float(item.get("volume")) if item.get("volume") else 0.0,
                                        event_timestamp=now_iso,
                                        received_timestamp=now_iso,
                                        data_mode="REAL_TIME",
                                        is_stale=False,
                                    )
                                    self._quote_cache[canon_sym] = q
                                    res[canon_sym] = q
            except Exception as ex:
                logger.debug("TwelveData REST snapshot note: %s", ex)

        return res

    async def get_history(self, symbol: str, timeframe: str, from_dt: datetime, to_dt: datetime) -> List[OHLCVCandle]:
        return []

    async def get_instruments(self) -> List[CanonicalInstrument]:
        return []

    async def health_check(self) -> ProviderHealth:
        return ProviderHealth(
            provider_id="twelve_data",
            provider_name="Twelve Data",
            status=self._status,
            asset_classes=["GLOBAL_EQUITIES", "FOREX", "INDICES"],
            subscribed_symbols=len(self._subscribed_symbols),
            error_count=self._error_count,
            message="Twelve Data WebSocket real-time feed." if self._api_key else "Set TWELVE_DATA_API_KEY in .env to activate.",
        )

    async def disconnect(self) -> None:
        self._running = False
        if self._ws and not self._ws.closed:
            await self._ws.close()
        if self._session and not self._session.closed:
            await self._session.close()
        self._status = "DISCONNECTED"
