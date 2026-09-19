"""
QUANT.OS Centralized Market Data Blueprints
============================================
Authoritative endpoints for live market quotes, multi-broker sources status,
and the multiplexed centralized SSE stream.

All endpoints uniformly utilize the centralized Canonical Market Data Pipeline:
- /api/market-data/ltp
- /api/market/quote
- /api/markets/quote
- /api/stream/centralized
"""

import json
import time
import queue
import logging
import urllib.parse
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from flask import Blueprint, jsonify, request, Response

from src.market_data import (
    global_stream_manager,
    global_options_engine,
)
from src.market_data.canonical_pipeline import (
    resolve_canonical_quote,
    resolve_symbol_aliases,
    evaluate_quote_freshness,
    validate_canonical_quote,
    STATE_LIVE,
    STATE_DELAYED,
    STATE_STALE,
    STATE_UNKNOWN,
    STATE_INVALID,
    STATE_NO_DATA,
    QUALITY_VALIDATED,
    QUALITY_REJECTED,
)

market_data_bp = Blueprint("market_data", __name__)
logger = logging.getLogger("MarketDataRoutes")


@market_data_bp.route("/api/market-data/ltp", methods=["GET"])
def get_market_data_ltp():
    """
    Canonical single-symbol LTP endpoint.
    Queries the centralized canonical quote resolver with source-aware routing.
    Returns normalized schema: { symbol, price, source, status, timestamp, ageMs, is_tradeable }.
    """
    symbol = request.args.get("symbol", "").strip()
    if not symbol:
        return jsonify({
            "ok": False,
            "status": "error",
            "code": "INVALID_SYMBOL",
            "symbol": "",
            "message": "Symbol query parameter is required."
        }), 400

    code, data = resolve_canonical_quote(symbol)
    return jsonify(data), code


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

    code, res = resolve_canonical_quote(symbol)

    if code == 200 and res.get("ok"):
        ts_ms = res.get("timestamp")
        ts_iso = datetime.fromtimestamp(ts_ms / 1000.0, timezone.utc).isoformat() if ts_ms else None
        return jsonify({
            "status": "success",
            "symbol": res.get("symbol", symbol),
            "source": res.get("source", "CENTRAL_CACHE"),
            "quote": {
                "symbol": res.get("symbol", symbol),
                "ltp": res.get("ltp"),
                "bid": res.get("bid"),
                "ask": res.get("ask"),
                "volume": res.get("volume"),
                "oi": res.get("oi"),
                "high": res.get("high"),
                "low": res.get("low"),
                "open": res.get("open"),
                "close": res.get("close"),
                "previous_close": res.get("previous_close"),
                "change_pct": res.get("change_pct"),
                "timestamp": ts_iso,
                "is_stale": (res.get("freshness") != STATE_LIVE),
                "freshness": res.get("freshness"),
                "data_quality": res.get("data_quality"),
                "is_tradeable": res.get("is_tradeable", False),
            },
            "providerStatus": res.get("freshness"),
            "is_tradeable": res.get("is_tradeable", False),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 200

    # Strict Zero-Fabrication Return
    return jsonify({
        "status": "no_data",
        "symbol": symbol,
        "source": "UNAVAILABLE",
        "quote": None,
        "providerStatus": STATE_NO_DATA,
        "freshness": STATE_NO_DATA,
        "is_tradeable": False,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }), 200


@market_data_bp.route("/api/markets/quote", methods=["GET"])
def get_markets_quote_batch():
    """
    Batch endpoint returning canonical quotes for multiple symbols or primary indices.
    Each item is evaluated through the single canonical quote pipeline.
    """
    symbols_param = request.args.get("symbols", "")
    if symbols_param:
        symbols = [s.strip() for s in symbols_param.split(",") if s.strip()]
    else:
        symbols = ["BTC", "ETH", "SOL", "NIFTY", "BANKNIFTY", "RELIANCE"]

    results: Dict[str, Any] = {}

    for sym in symbols:
        code, res = resolve_canonical_quote(sym)
        if code == 200 and res.get("ok"):
            results[sym] = {
                "symbol": res.get("symbol", sym),
                "ltp": res.get("ltp"),
                "bid": res.get("bid"),
                "ask": res.get("ask"),
                "volume": res.get("volume"),
                "oi": res.get("oi"),
                "timestamp": res.get("timestamp"),
                "ageMs": res.get("ageMs", 0),
                "freshness": res.get("freshness"),
                "data_quality": res.get("data_quality"),
                "source": res.get("source"),
                "is_tradeable": res.get("is_tradeable", False),
            }
        else:
            results[sym] = {
                "symbol": sym,
                "quote": None,
                "status": STATE_NO_DATA,
                "freshness": STATE_NO_DATA,
                "data_quality": QUALITY_REJECTED,
                "source": "UNAVAILABLE",
                "is_tradeable": False,
            }

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
    
    Guarantees:
    - finally-based unregister on client disconnect or exception
    - bounded queue with slow-client drop protection
    - heartbeat every 2 seconds
    - zero crash propagation to stream manager
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
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "status": "HEALTHY",
                        "stream_stats": global_stream_manager.get_stream_stats()
                    }
                    yield f"data: {json.dumps(heartbeat)}\n\n"
        except (GeneratorExit, Exception) as exc:
            logger.debug("SSE stream termination for %s (%s)", client_id, type(exc).__name__)
        finally:
            global_stream_manager.unregister_client(client_id)
            logger.info("Guaranteed unregister completed for stream client %s", client_id)

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive"
        }
    )
