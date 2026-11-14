"""Read-only BTC Options Intelligence API. All expiries, both directions, paper only."""
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request

from src import config
from src.delta_options_service import delta_options_service
from src.delta_options_client import global_delta_client
from src.btc_options_intelligence import analyse_btc_options

btc_options_intelligence_bp = Blueprint("btc_options_intelligence", __name__)


@btc_options_intelligence_bp.route("/api/btc-options-intelligence/health", methods=["GET"])
def scanner_health():
    try:
        health = delta_options_service.get_health()
    except Exception as exc:
        health = {"status": "UNAVAILABLE", "error": str(exc)}
    return jsonify({
        "scanner": "BTC_OPTIONS_INTELLIGENCE",
        "status": health.get("status", "UNKNOWN"),
        "trading_mode": "PAPER",
        "live_trading_enabled": False,
        "delta_rest_url": config.DELTA_REST_URL,
        "delta_public_ws_url": config.DELTA_PUBLIC_WS_URL,
        "health": health,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }), 200


@btc_options_intelligence_bp.route("/api/btc-options-intelligence/scan", methods=["GET"])
def scan_btc_options():
    """Build one scan across every active/future BTC expiry. Never submits orders."""
    try:
        expiries = delta_options_service.get_available_expiries("BTC")
        chains = []
        for expiry in expiries:
            expiry_date = expiry.get("expiry_date")
            if not expiry_date:
                continue
            chain = delta_options_service.get_option_chain(
                underlying="BTC", expiry=expiry_date, strike_count=None, region="INDIA"
            )
            if chain and chain.get("strikes"):
                chains.append(chain)

        candles = {}
        for resolution in ("1m", "5m", "15m", "1h"):
            try:
                candles[resolution] = global_delta_client.get_candles(
                    symbol="BTCUSD", resolution=resolution
                ) or []
            except Exception:
                candles[resolution] = []

        futures = {}
        try:
            futures = global_delta_client.get_ticker("BTCUSD") or {}
        except Exception:
            futures = {}

        paper_capital = request.args.get("paper_capital", type=float)
        result = analyse_btc_options(
            chains=chains,
            candles=candles,
            futures=futures,
            paper_capital=paper_capital,
            risk_fraction=0.005,
        )
        result.update({
            "exchange": "DELTA_EXCHANGE_INDIA",
            "expiry_scope": "ALL_AVAILABLE",
            "available_expiries": expiries,
            "expiry_discovery_count": len(expiries),
            "source_status": {
                "option_chain_count": len(chains),
                "candles": {key: len(value) for key, value in candles.items()},
                "futures_ticker_available": bool(futures),
            },
            "server_timestamp": datetime.now(timezone.utc).isoformat(),
        })
        # Fail closed: configuration cannot enable live execution from this scanner.
        result["mode"] = "PAPER"
        result["live_execution_enabled"] = False
        return jsonify(result), 200
    except Exception as exc:
        return jsonify({
            "scanner": "BTC_OPTIONS_INTELLIGENCE",
            "status": "UNAVAILABLE",
            "mode": "PAPER",
            "live_execution_enabled": False,
            "error": str(exc),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }), 503
