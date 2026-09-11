"""
QUANT.OS Options Engine & Workstation Blueprints
=================================================
Authoritative options chain calculations, expiry discovery, and Delta Exchange
real-time options quotes with strict zero-fabrication guarantees.
"""

from datetime import datetime, timezone
from typing import Optional
from flask import Blueprint, jsonify, request

from src.market_data import global_options_engine
from src.delta_options_service import global_delta_options_service
from src.delta_exchange_adapter import global_delta_adapter
from market_data_gateway.adapters.delta_options_ws import delta_options_ws_adapter

options_bp = Blueprint("options", __name__)


@options_bp.route("/api/options/chain", methods=["GET"])
def get_options_chain():
    """
    Returns live option chain with Black-Scholes Greeks, IV, PCR, and Max Pain.
    Strict Zero-Fabrication: If unquoted, values remain strict null.
    """
    provider = (request.args.get("provider") or request.args.get("source") or "DELTA").upper()
    underlying = (request.args.get("underlying") or request.args.get("symbol") or "BTC").upper()
    expiry = request.args.get("expiry")
    mode = request.args.get("mode", "LIVE").upper()
    strike_count = int(request.args.get("strike_count", 25))

    is_delta = "DELTA" in provider or underlying in ["BTC", "ETH", "SOL", "XRP", "XAUT"]

    if is_delta:
        res = delta_options_ws_adapter.get_normalized_option_chain(underlying, expiry, strike_count)
        return jsonify(res), 200

    snapshot = global_options_engine.get_option_chain(
        provider_name=provider,
        underlying=underlying,
        expiry=expiry,
        mode=mode
    )

    return jsonify(snapshot.to_dict()), 200



@options_bp.route("/api/options/workstation/overview", methods=["GET"])
def get_options_workstation_overview():
    """
    Returns options workstation overview with active expiries and real chain metrics.
    """
    underlying = request.args.get("underlying", "BTC").upper()
    provider = request.args.get("provider", "DELTA").upper()

    snapshot = global_options_engine.get_option_chain(
        provider_name=provider,
        underlying=underlying,
        mode="LIVE"
    )
    return jsonify({
        "success": True,
        "underlying": underlying,
        "provider": provider,
        "chain": snapshot.to_dict(),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }), 200


@options_bp.route("/api/market-data/delta/status", methods=["GET"])
@options_bp.route("/api/brokers/delta/status", methods=["GET"])
def get_delta_status():
    """
    Returns live telemetry for Delta Exchange India/Global WebSocket and REST connections.
    """
    ws_health = delta_options_ws_adapter.get_sync_health()
    conn_status = global_delta_adapter.get_connection_status()

    is_live = ws_health.get("status") == "LIVE" or conn_status.get("authenticated", False)
    return jsonify({
        "status": "LIVE" if is_live else "DEGRADED",
        "provider": "DELTA",
        "websocket": ws_health,
        "rest": conn_status,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }), 200


@options_bp.route("/api/market-data/delta/quotes", methods=["GET"])
def get_delta_quotes():
    """
    Returns real quotes for tracked Delta contracts.
    """
    quotes = global_delta_options_service.get_all_quotes()
    now_iso = datetime.now(timezone.utc).isoformat()
    
    formatted = {}
    for sym, q in quotes.items():
        formatted[sym] = {
            "symbol": sym,
            "ltp": q.get("mark_price") or q.get("close"),
            "bid": q.get("best_bid"),
            "ask": q.get("best_ask"),
            "oi": q.get("open_interest"),
            "volume": q.get("volume"),
            "timestamp": now_iso
        }

    return jsonify({
        "success": True,
        "provider": "DELTA",
        "quotes": formatted,
        "count": len(formatted),
        "timestamp": now_iso
    }), 200
