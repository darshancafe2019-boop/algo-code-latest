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
