"""
QUANT.OS Centralized Market Data Blueprints
============================================
Authoritative endpoints for live market quotes, multi-broker sources status,
and the multiplexed centralized SSE stream.
"""

import json
import time
import queue
import logging
from datetime import datetime, timezone
from typing import Optional
from flask import Blueprint, jsonify, request, Response

from src.market_data import (
    global_market_cache,
    global_stale_protection,
    global_stream_manager,
    global_options_engine,
)
from src.ticker_service import get_ticker_service

market_data_bp = Blueprint("market_data", __name__)
logger = logging.getLogger("MarketDataRoutes")


@market_data_bp.route("/api/market-data/ltp", methods=["GET"])
def get_market_data_ltp():
    """
    Canonical single-symbol LTP endpoint.
    Queries Market Data Gateway (port 5051) or local cache with source-aware routing.
    Returns normalized schema: { symbol, price, source, status, timestamp, ageMs }.
    """
    import urllib.parse
    import urllib.request
    import os

    symbol = request.args.get("symbol", "").strip()
    if not symbol:
        return jsonify({
            "ok": False,
            "code": "INVALID_SYMBOL",
            "symbol": "",
            "message": "Symbol query parameter is required."
        }), 400

    # 1. Try querying Market Data Gateway :5051 directly
    gateway_port = int(os.environ.get("MARKET_GATEWAY_PORT", "5051"))
    gateway_secret = os.environ.get("MARKET_GATEWAY_SECRET", "changeme-set-a-strong-random-secret-here")
    gateway_url = f"http://127.0.0.1:{gateway_port}/ltp?symbol={urllib.parse.quote(symbol, safe='')}"

    try:
        req = urllib.request.Request(
            gateway_url,
            headers={
                "X-Gateway-Secret": gateway_secret,
                "Accept": "application/json",
            }
        )
        with urllib.request.urlopen(req, timeout=2.5) as response:
            if response.status == 200:
                data = json.loads(response.read().decode("utf-8"))
                return jsonify(data), 200
    except urllib.error.HTTPError as http_err:
        try:
            err_body = json.loads(http_err.read().decode("utf-8"))
            return jsonify(err_body), http_err.code
        except Exception:
            pass
    except Exception as gw_err:
        logger.debug("Gateway :5051 direct LTP probe note: %s", gw_err)

    # 2. Fallback to Central Market Cache
    cached = global_market_cache.get_quote(symbol)
    if not cached and "/" in symbol:
        cached = global_market_cache.get_quote(symbol.replace("/", ""))

    if cached:
        ltp_val = cached.get("ltp") if isinstance(cached, dict) else getattr(cached, "ltp", None)
        if ltp_val is None:
            ltp_val = cached.get("price") if isinstance(cached, dict) else getattr(cached, "price", 0.0)

        if ltp_val and float(ltp_val) > 0:
            ts_raw = cached.get("timestamp") if isinstance(cached, dict) else getattr(cached, "timestamp", None)
            now_ts = datetime.now(timezone.utc).timestamp()
            if isinstance(ts_raw, datetime):
                quote_ts = ts_raw.timestamp()
            elif isinstance(ts_raw, (int, float)):
                quote_ts = float(ts_raw) if ts_raw < 1e11 else float(ts_raw) / 1000.0
            else:
                quote_ts = now_ts

            age_ms = max(0, int((now_ts - quote_ts) * 1000))
            provider_val = cached.get("provider") if isinstance(cached, dict) else getattr(cached, "provider", "CENTRAL_CACHE")
            return jsonify({
                "ok": True,
                "symbol": symbol,
                "price": float(ltp_val),
                "source": str(provider_val or "CENTRAL_CACHE").upper(),
                "status": "LIVE" if age_ms < 15000 else "STALE",
                "timestamp": int(quote_ts * 1000),
                "ageMs": age_ms,
                "bid": cached.get("bid") if isinstance(cached, dict) else getattr(cached, "bid", None),
                "ask": cached.get("ask") if isinstance(cached, dict) else getattr(cached, "ask", None),
                "volume": cached.get("volume") if isinstance(cached, dict) else getattr(cached, "volume", None),
            }), 200

    # 3. Fallback to Ticker Service
    ticker_svc = get_ticker_service()
    if ticker_svc:
        try:
            ticker_info = ticker_svc.get_ticker(symbol)
            if ticker_info and (ticker_info.get("last") or ticker_info.get("price")):
                price_val = ticker_info.get("last") or ticker_info.get("price")
                now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
                return jsonify({
                    "ok": True,
                    "symbol": symbol,
                    "price": float(price_val),
                    "source": str(ticker_info.get("provider") or "TICKER_SERVICE").upper(),
                    "status": "LIVE",
                    "timestamp": now_ms,
                    "ageMs": int(ticker_info.get("cache_age_ms") or 0),
                    "bid": ticker_info.get("bid"),
                    "ask": ticker_info.get("ask"),
                    "volume": ticker_info.get("volume")
                }), 200
        except Exception as tick_err:
            logger.debug("Ticker service probe exception: %s", tick_err)

    # 4. Return honest structured error without fabricated prices
    return jsonify({
        "ok": False,
        "code": "INSTRUMENT_NOT_FOUND",
        "symbol": symbol,
        "source": "UNAVAILABLE",
        "message": f"No live market data quote available for {symbol}."
    }), 404


@market_data_bp.route("/api/market/quote", methods=["GET"])
def get_market_quote():
    """
    Returns the authoritative real-time market quote for a single symbol.
    Strict Zero-Fabrication Guarantee: returns status "no_data" if quote is missing.
    """
    symbol = request.args.get("symbol", "").strip()
    if not symbol:
        return jsonify({
            "status": "error",
            "message": "Symbol query parameter is required"
        }), 400

    # 1. Query Central In-Memory Market Cache
    cached = global_market_cache.get(symbol)
    if cached:
        stale_info = global_stale_protection.is_stale(symbol, cached.timestamp)
        return jsonify({
            "status": "success",
            "symbol": symbol,
            "source": cached.provider or "CENTRAL_CACHE",
            "quote": {
                "symbol": cached.symbol,
                "ltp": cached.ltp,
                "bid": cached.bid,
                "ask": cached.ask,
                "volume": cached.volume,
                "oi": cached.oi,
                "high": cached.high,
                "low": cached.low,
                "open": cached.open,
                "close": cached.close,
                "timestamp": cached.timestamp.isoformat() if cached.timestamp else None,
                "is_stale": stale_info.get("is_stale", False),
                "data_quality": cached.data_quality
            },
            "providerStatus": "LIVE" if not stale_info.get("is_stale", False) else "STALE",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 200

    # 2. Query Resilient Ticker Service
    ticker_svc = get_ticker_service()
    if ticker_svc:
        spot = ticker_svc.get_spot_price(symbol)
        if spot and spot > 0:
            now_iso = datetime.now(timezone.utc).isoformat()
            return jsonify({
                "status": "success",
                "symbol": symbol,
                "source": "TICKER_SERVICE",
                "quote": {
                    "symbol": symbol,
                    "ltp": spot,
                    "bid": None,
                    "ask": None,
                    "volume": None,
                    "oi": None,
                    "high": None,
                    "low": None,
                    "open": None,
                    "close": None,
                    "timestamp": now_iso,
                    "is_stale": False,
                    "data_quality": "VALIDATED"
                },
                "providerStatus": "LIVE",
                "timestamp": now_iso
            }), 200

    # 3. Strictly return no_data when unquoted (never synthesize a fake quote)
    return jsonify({
        "status": "no_data",
        "symbol": symbol,
        "source": "UNAVAILABLE",
        "quote": None,
        "providerStatus": "NO_DATA",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }), 200


@market_data_bp.route("/api/markets/quote", methods=["GET"])
def get_markets_quote_batch():
    """
    Returns real quotes for multiple symbols or primary indices.
    """
    symbols_param = request.args.get("symbols", "")
    if symbols_param:
        symbols = [s.strip() for s in symbols_param.split(",") if s.strip()]
    else:
        symbols = ["BTC", "ETH", "SOL", "NIFTY", "BANKNIFTY", "RELIANCE"]

    results = {}
    ticker_svc = get_ticker_service()

    for sym in symbols:
        cached = global_market_cache.get(sym)
        if cached:
            results[sym] = {
                "symbol": cached.symbol,
                "ltp": cached.ltp,
                "bid": cached.bid,
                "ask": cached.ask,
                "volume": cached.volume,
                "oi": cached.oi,
                "timestamp": cached.timestamp.isoformat() if cached.timestamp else None,
                "source": cached.provider or "CENTRAL_CACHE"
            }
        elif ticker_svc:
            px = ticker_svc.get_spot_price(sym)
            if px and px > 0:
                results[sym] = {
                    "symbol": sym,
                    "ltp": px,
                    "bid": None,
                    "ask": None,
                    "volume": None,
                    "oi": None,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "source": "TICKER_SERVICE"
                }
            else:
                results[sym] = None
        else:
            results[sym] = None

    return jsonify({
        "success": True,
        "quotes": results,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }), 200


@market_data_bp.route("/api/market-data/sources", methods=["GET"])
def get_market_data_sources():
    """
    Returns real-time status, health, and latency for all integrated brokers.
    """
    sources = global_options_engine.get_sources_status()
    return jsonify({
        "success": True,
        "sources": sources,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }), 200


@market_data_bp.route("/api/stream/centralized", methods=["GET"])
def stream_centralized_sse():
    """
    Centralized multiplexed SSE stream broadcasting real market ticks,
    normalized quotes, and keep-alive heartbeats.
    """
    client_id = f"client_{int(time.time() * 1000)}"
    q = global_stream_manager.register_client(client_id)

    def generate():
        try:
            while True:
                try:
                    msg = q.get(timeout=2.0)
                    yield f"data: {msg}\n\n"
                except queue.Empty:
                    heartbeat = {
                        "type": "HEARTBEAT",
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
                    yield f"data: {json.dumps(heartbeat)}\n\n"
        except GeneratorExit:
            global_stream_manager.unregister_client(client_id)
            logger.info("Client %s disconnected from centralized stream", client_id)

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive"
        }
    )
