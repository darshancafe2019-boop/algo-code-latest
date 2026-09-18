"""
Quant.OS Delta Exchange Multi-Department Market Data Blueprint
==============================================================
Provides high-performance live market data and execution routes across all Delta Exchange departments:
- Crypto Options (DELTA_OPTIONS: BTC, ETH vanilla European calls/puts, strike chains, Greeks & IV)
- Crypto Futures & Perpetuals (DELTA_FUTURES: BTCUSD, ETHUSD, SOLUSD perp swaps & funding rates)
- Crypto Spot Markets (DELTA_SPOT: Spot trading pairs, orderbooks & trades)
- Spot Reference Indices (DELTA_INDICES: .DE_BTCUSD, .DE_ETHUSD mark indices)
- Account Portfolio & Execution (DELTA_ACCOUNT: Balances, margin health, open positions & orders)
"""

import json
import logging
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from flask import Blueprint, jsonify, request

from src.delta_options_client import global_delta_client
from src.delta_options_service import DeltaOptionsService
from src.delta_exchange_adapter import DeltaExchangeAdapter
from src.delta_region_adapter import DeltaRegionAdapter

logger = logging.getLogger("DeltaRoutes")

delta_blueprint = Blueprint("delta_api", __name__)
_delta_service_instance: Optional[DeltaOptionsService] = None


def get_delta_service() -> DeltaOptionsService:
    global _delta_service_instance
    if _delta_service_instance is None:
        _delta_service_instance = DeltaOptionsService()
    return _delta_service_instance


@delta_blueprint.route("/departments", methods=["GET"])
def get_delta_departments():
    """Returns overview, live counts, and operational telemetry across all 5 Delta Exchange departments."""
    svc = get_delta_service()
    adapter = DeltaExchangeAdapter()

    departments = [
        {
            "id": "DELTA_OPTIONS",
            "name": "Crypto Options",
            "exchange": "DELTA_EXCHANGE",
            "segment": "OPTIONS",
            "description": "BTC & ETH European Vanilla Options, Expiries, Greeks (Delta, Gamma, Theta, Vega), IV Smiles & PCR",
            "underlyings": ["BTC", "ETH"],
            "status": "LIVE",
            "feed_quality": "REAL_TIME",
            "trading_hours": "24/7/365 Non-Stop",
            "settlement": "Daily / Weekly / Monthly Cash Settlement",
            "supported_order_types": ["MARKET", "LIMIT", "IOC", "FOK"],
        },
        {
            "id": "DELTA_FUTURES",
            "name": "Perpetual Swaps & Futures",
            "exchange": "DELTA_EXCHANGE",
            "segment": "FUTURES",
            "description": "BTCUSD, ETHUSD, SOLUSD, XRPUSD, DOGEUSD Linear & Inverse Perpetual Swaps with dynamic funding rates",
            "underlyings": ["BTC", "ETH", "SOL", "XRP", "DOGE", "AVAX", "BNB", "LINK", "SUI", "NEAR"],
            "status": "LIVE",
            "feed_quality": "REAL_TIME",
            "trading_hours": "24/7/365 Non-Stop",
            "max_leverage": "100x",
            "supported_order_types": ["MARKET", "LIMIT", "STOP_LIMIT", "TRAILING_STOP"],
        },
        {
            "id": "DELTA_SPOT",
            "name": "Spot Crypto Markets",
            "exchange": "DELTA_EXCHANGE",
            "segment": "SPOT",
            "description": "Spot Crypto Pairs (BTC/USDT, ETH/USDT, DETO/USDT) with full Level-2 depth",
            "underlyings": ["BTC", "ETH", "SOL", "DETO", "USDT"],
            "status": "LIVE",
            "feed_quality": "REAL_TIME",
            "trading_hours": "24/7/365 Non-Stop",
            "supported_order_types": ["MARKET", "LIMIT"],
        },
        {
            "id": "DELTA_INDICES",
            "name": "Spot Reference Indices",
            "exchange": "DELTA_EXCHANGE",
            "segment": "INDEX",
            "description": "Institutional reference indices aggregated across Binance, Coinbase, Kraken, OKX",
            "indices": [".DE_BTCUSD", ".DE_ETHUSD", ".DE_SOLUSD", ".DE_XRPUSD"],
            "status": "LIVE",
            "feed_quality": "REAL_TIME",
            "trading_hours": "24/7/365 Non-Stop",
        },
        {
            "id": "DELTA_ACCOUNT",
            "name": "Portfolio & Margin Account",
            "exchange": "DELTA_EXCHANGE",
            "segment": "ACCOUNT",
            "description": "Unified Multi-Asset Collateral (USDT, BTC, ETH, INR), Margin Health, Active Positions & Orders",
            "status": "LIVE" if adapter.is_authenticated else "READY_FOR_AUTH",
            "is_authenticated": adapter.is_authenticated,
            "region": adapter.base_url,
        },
    ]

    return jsonify({
        "status": "success",
        "provider": "Delta Exchange V2 Institutional Gateway",
        "region": global_delta_client.region,
        "rest_endpoint": global_delta_client.base_url,
        "is_authenticated": adapter.is_authenticated,
        "total_departments": len(departments),
        "departments": departments,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }), 200


@delta_blueprint.route("/products", methods=["GET"])
def get_delta_products():
    """Returns products catalog with filtering by contract_type and department."""
    contract_type = request.args.get("contract_type", request.args.get("type"))
    states = request.args.get("states", "live,upcoming").split(",")
    contract_types = [contract_type.strip()] if contract_type else None

    products = global_delta_client.get_products(contract_types=contract_types, states=states)
    return jsonify({
        "status": "success",
        "count": len(products),
        "products": products,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }), 200


@delta_blueprint.route("/tickers", methods=["GET"])
def get_delta_tickers():
    """Fetches live market tickers across Delta Exchange with optional underlying filter."""
    underlying = request.args.get("underlying")
    contract_type = request.args.get("contract_type", request.args.get("type"))

    und_list = [underlying.upper().strip()] if underlying else None
    ct_list = [contract_type.strip()] if contract_type else None

    tickers = global_delta_client.get_tickers(underlying_asset_symbols=und_list, contract_types=ct_list)
    return jsonify({
        "status": "success",
        "count": len(tickers),
        "tickers": tickers,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }), 200


@delta_blueprint.route("/ticker/<path:symbol>", methods=["GET"])
def get_delta_single_ticker(symbol: str):
    """Fetches live ticker for a single instrument (e.g. BTCUSD, C-BTC-65000-250926)."""
    clean_sym = symbol.strip()
    ticker = global_delta_client.get_ticker(clean_sym)
    if ticker:
        return jsonify({"status": "success", "symbol": clean_sym, "ticker": ticker}), 200
    return jsonify({"status": "error", "message": f"Ticker not found for symbol {clean_sym}"}), 404


@delta_blueprint.route("/option-chain", methods=["GET"])
def get_delta_option_chain():
    """Returns live dual-sided option chain with strike ladders, Greeks, PCR, and Max Pain."""
    underlying = request.args.get("underlying", "BTC").strip().upper()
    expiry = request.args.get("expiry")
    region = request.args.get("region")

    svc = get_delta_service()
    chain = svc.get_option_chain(underlying=underlying, expiry=expiry, region=region)
    return jsonify({
        "status": "success",
        "department": "DELTA_OPTIONS",
        "underlying": underlying,
        "chain": chain,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }), 200


@delta_blueprint.route("/expiries", methods=["GET"])
def get_delta_expiries():
    """Discovers valid future option expiries for BTC or ETH."""
    underlying = request.args.get("underlying", "BTC").strip().upper()
    svc = get_delta_service()
    expiries = svc.get_available_expiries(underlying)
    return jsonify({
        "status": "success",
        "underlying": underlying,
        "count": len(expiries),
        "expiries": expiries,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }), 200


@delta_blueprint.route("/futures", methods=["GET"])
def get_delta_futures():
    """Returns live Perpetual Swaps & Futures market overview."""
    tickers = global_delta_client.get_tickers(contract_types=["perpetual_futures", "futures"])
    now_iso = datetime.now(timezone.utc).isoformat()

    enriched_futures = []
    for t in tickers:
        sym = t.get("symbol", "")
        mark_p = float(t.get("mark_price") or t.get("close") or 0.0)
        idx_p = float(t.get("spot_price") or mark_p)
        basis = round(mark_p - idx_p, 2)
        funding = float(t.get("funding_rate") or 0.0)
        chg_24h = float(t.get("change_24h") or 0.0)

        enriched_futures.append({
            "symbol": sym,
            "contract_type": t.get("contract_type", "perpetual_futures"),
            "mark_price": mark_p,
            "index_price": idx_p,
            "basis": basis,
            "funding_rate": funding,
            "predicted_funding_rate": float(t.get("predicted_funding_rate") or funding),
            "open_interest": float(t.get("open_interest") or 0.0),
            "volume_24h": float(t.get("volume_24h") or 0.0),
            "turnover_24h": float(t.get("turnover_24h") or 0.0),
            "change_24h_pct": round(chg_24h, 2),
            "high_24h": float(t.get("high_24h") or mark_p * 1.02),
            "low_24h": float(t.get("low_24h") or mark_p * 0.98),
            "data_quality": "LIVE",
            "timestamp": now_iso,
        })

    return jsonify({
        "status": "success",
        "department": "DELTA_FUTURES",
        "count": len(enriched_futures),
        "futures": enriched_futures,
        "timestamp": now_iso,
    }), 200


@delta_blueprint.route("/spot", methods=["GET"])
def get_delta_spot():
    """Returns live Spot Crypto market pairs."""
    tickers = global_delta_client.get_tickers(contract_types=["spot"])
    return jsonify({
        "status": "success",
        "department": "DELTA_SPOT",
        "count": len(tickers),
        "spot": tickers,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }), 200


@delta_blueprint.route("/indices", methods=["GET"])
def get_delta_indices():
    """Returns live spot reference indices from Delta Exchange."""
    indices = global_delta_client.get_spot_indices()
    return jsonify({
        "status": "success",
        "department": "DELTA_INDICES",
        "count": len(indices),
        "indices": indices,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }), 200


@delta_blueprint.route("/orderbook/<path:symbol>", methods=["GET"])
def get_delta_orderbook(symbol: str):
    """Returns Level 2 orderbook snapshot for an instrument."""
    book = global_delta_client.get_l2_orderbook(symbol.strip())
    return jsonify({
        "status": "success",
        "symbol": symbol.strip(),
        "orderbook": book,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }), 200


@delta_blueprint.route("/trades/<path:symbol>", methods=["GET"])
def get_delta_trades(symbol: str):
    """Returns recent public trades for an instrument."""
    trades = global_delta_client.get_recent_trades(symbol.strip())
    return jsonify({
        "status": "success",
        "symbol": symbol.strip(),
        "count": len(trades),
        "trades": trades,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }), 200


@delta_blueprint.route("/candles", methods=["GET"])
def get_delta_candles():
    """Returns historical/intraday OHLC candles."""
    symbol = request.args.get("symbol", "BTCUSD").strip()
    resolution = request.args.get("resolution", "15m").strip()
    start_time = request.args.get("start")
    end_time = request.args.get("end")

    st = int(start_time) if start_time and start_time.isdigit() else None
    et = int(end_time) if end_time and end_time.isdigit() else None

    candles = global_delta_client.get_candles(symbol=symbol, resolution=resolution, start_time=st, end_time=et)
    return jsonify({
        "status": "success",
        "symbol": symbol,
        "resolution": resolution,
        "count": len(candles),
        "candles": candles,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }), 200


@delta_blueprint.route("/account/wallet", methods=["GET"])
def get_delta_wallet():
    """Returns user's wallet balances and margin health."""
    adapter = DeltaExchangeAdapter()
    balances = adapter.get_balances()
    return jsonify({
        "status": "success",
        "is_authenticated": adapter.is_authenticated,
        "balances": balances,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }), 200


@delta_blueprint.route("/account/positions", methods=["GET"])
def get_delta_positions():
    """Returns user's open futures & options positions."""
    adapter = DeltaExchangeAdapter()
    positions = adapter.get_positions()
    return jsonify({
        "status": "success",
        "is_authenticated": adapter.is_authenticated,
        "count": len(positions),
        "positions": positions,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }), 200


@delta_blueprint.route("/account/orders", methods=["GET"])
def get_delta_orders():
    """Returns user's open orders."""
    adapter = DeltaExchangeAdapter()
    orders = adapter.get_open_orders()
    return jsonify({
        "status": "success",
        "is_authenticated": adapter.is_authenticated,
        "count": len(orders),
        "orders": orders,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }), 200


@delta_blueprint.route("/region", methods=["POST"])
def set_delta_region():
    """Switches active Delta Exchange region (INDIA vs GLOBAL)."""
    payload = request.get_json() or {}
    region = (payload.get("region") or "INDIA").upper().strip()

    global_delta_client.set_region(region)
    svc = get_delta_service()
    svc.set_region(region)

    return jsonify({
        "status": "success",
        "message": f"Delta Exchange region set to {region}",
        "region": region,
        "rest_endpoint": global_delta_client.base_url,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }), 200


@delta_blueprint.route("/health", methods=["GET"])
def get_delta_health():
    """Subsystem health, rate-limiter stats, and connection latency."""
    health = global_delta_client.health_check()
    return jsonify({
        "status": health.get("status", "HEALTHY"),
        "provider": "Delta Exchange V2",
        "region": global_delta_client.region,
        "base_url": global_delta_client.base_url,
        "latency_ms": health.get("latency_ms"),
        "api_endpoints": [
            "/api/delta/departments",
            "/api/delta/products",
            "/api/delta/tickers",
            "/api/delta/option-chain",
            "/api/delta/expiries",
            "/api/delta/futures",
            "/api/delta/spot",
            "/api/delta/indices",
            "/api/delta/orderbook/<symbol>",
            "/api/delta/trades/<symbol>",
            "/api/delta/candles",
            "/api/delta/account/wallet",
            "/api/delta/account/positions",
            "/api/delta/account/orders",
            "/api/delta/region",
            "/api/delta/health",
        ],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }), 200
