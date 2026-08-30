"""
Stock Market Data Flask Blueprint Routes
=========================================
Registers all standard stock market data REST & streaming endpoints:
- GET /api/market-data/stocks
- GET /api/market-data/stocks/filters/schema
- GET /api/market-data/stocks/screener
- GET /api/market-data/stocks/movers
- GET /api/market-data/stocks/<instrument_id>
- GET /api/market-data/stocks/<instrument_id>/quote
- GET /api/market-data/stocks/<instrument_id>/history
- GET /api/market-data/stocks/<instrument_id>/analysis
- GET /api/market-data/stocks/<instrument_id>/fundamentals
- GET /api/market-data/stocks/<instrument_id>/quality
- GET /api/market-data/stocks/health
- GET /api/market-data/stocks/stream
"""

import json
import time
from typing import Dict, Any
from flask import Blueprint, jsonify, request, Response
from market_data.stocks.service import global_stock_service
from market_data.stocks.filter_engine import StockFilterEngine
from market_data.stocks.schemas import make_success_response, make_error_response
from market_data.stocks.repository import StockRepository

stocks_blueprint = Blueprint("stocks_market_data", __name__)


@stocks_blueprint.route("", methods=["GET"])
@stocks_blueprint.route("/", methods=["GET"])
def get_stocks_universe():
    """Main stocks screener endpoint."""
    try:
        criteria = StockFilterEngine.from_query_params(request.args)
        res = global_stock_service.get_stocks(criteria)
        return jsonify(
            make_success_response(
                data=res["items"],
                total=res["total"],
                page=res["page"],
                page_size=res["pageSize"],
                provider="QuantOS-StockEngine"
            )
        ), 200
    except Exception as e:
        return jsonify(make_error_response(message=str(e), code="STOCKS_FETCH_ERROR")), 500


@stocks_blueprint.route("/screener", methods=["GET"])
def get_screener_results():
    """Dedicated alias for screener queries."""
    return get_stocks_universe()


@stocks_blueprint.route("/filters/schema", methods=["GET"])
def get_filter_schema():
    """Returns available filter options and categories."""
    schema = {
        "regions": ["ALL", "INDIA", "US", "GLOBAL"],
        "exchanges": ["ALL", "NSE", "BSE", "NASDAQ", "NYSE"],
        "sectors": [
            "ALL", "Technology", "Financial Services", "Energy & Conglomerate",
            "Consumer Goods", "Automobile", "Healthcare", "Utilities", "Metals & Mining",
            "Communication Services", "Consumer Discretionary"
        ],
        "marketCapCategories": ["ALL", "MEGA_CAP", "LARGE_CAP", "MID_CAP", "SMALL_CAP"],
        "indexes": ["ALL", "NIFTY 50", "NIFTY 100", "NASDAQ 100", "S&P 500"],
        "presets": [
            {"id": "top_gainers", "name": "Top Gainers", "description": "Stocks with largest positive 24h % return"},
            {"id": "top_losers", "name": "Top Losers", "description": "Stocks with largest negative 24h % return"},
            {"id": "most_active", "name": "Most Active", "description": "Highest trading share volume"},
            {"id": "unusual_volume", "name": "Unusual Volume", "description": "Volume surging > 1.5x of 30D average"},
            {"id": "near_52w_high", "name": "Near 52-Week High", "description": "Within 3% of 52-week peak"},
            {"id": "breakouts", "name": "Breakouts", "description": "20-period price momentum breakout"},
            {"id": "high_quality", "name": "High Quality Data", "description": "100% verified live feeds"}
        ]
    }
    return jsonify(make_success_response(data=schema, total=len(schema))), 200


@stocks_blueprint.route("/movers", methods=["GET"])
def get_top_movers():
    """Returns ranked movers: gainers, losers, most active, unusual volume."""
    preset = request.args.get("preset", "gainers")
    exchange = request.args.get("exchange") if request.args.get("exchange") != "ALL" else None
    limit = int(request.args.get("limit", 10))
    movers = global_stock_service.get_movers(preset=preset, exchange=exchange, limit=limit)
    return jsonify(make_success_response(data=movers, total=len(movers))), 200


@stocks_blueprint.route("/health", methods=["GET"])
def get_health_status():
    """Returns subsystem health and status statistics."""
    health_data = global_stock_service.get_system_health()
    return jsonify(make_success_response(data=health_data, total=1)), 200


@stocks_blueprint.route("/favorites", methods=["GET"])
def get_favorites():
    """Returns list of favorite instrument IDs."""
    favs = StockRepository.get_favorites()
    return jsonify(make_success_response(data=favs, total=len(favs))), 200


@stocks_blueprint.route("/favorites/toggle", methods=["POST"])
def toggle_favorite():
    """Toggles favorite status for an equity."""
    payload = request.get_json() or {}
    inst_id = payload.get("instrument_id")
    sym = payload.get("symbol", "")
    ex = payload.get("exchange", "NSE")
    if not inst_id:
        return jsonify(make_error_response(message="Missing instrument_id", code="MISSING_PARAM")), 400
    is_fav = StockRepository.toggle_favorite(inst_id, sym, ex)
    return jsonify(make_success_response(data={"instrument_id": inst_id, "is_favorite": is_fav})), 200


@stocks_blueprint.route("/<path:instrument_id>", methods=["GET"])
def get_stock_detail(instrument_id: str):
    """Returns stock instrument details."""
    stock = global_stock_service.get_stock_by_id(instrument_id)
    if not stock:
        # Try finding by symbol
        stock = global_stock_service.get_stock_by_id(f"nse:NSE:{instrument_id.upper()}") or global_stock_service.get_stock_by_id(f"nasdaq:NASDAQ:{instrument_id.upper()}")
    if not stock:
        return jsonify(make_error_response(message=f"Stock '{instrument_id}' not found.", code="NOT_FOUND", status_code=404)), 404
    return jsonify(make_success_response(data=stock.to_dict())), 200


@stocks_blueprint.route("/<path:instrument_id>/quote", methods=["GET"])
def get_stock_quote(instrument_id: str):
    """Returns live normalized quote."""
    q = global_stock_service.get_quote(instrument_id)
    if not q:
        stock = global_stock_service.get_stock_by_id(instrument_id)
        if stock:
            q = global_stock_service.get_quote(stock.instrument_id)
    if not q:
        return jsonify(make_error_response(message=f"Quote for '{instrument_id}' unavailable.", code="NOT_FOUND", status_code=404)), 404
    return jsonify(make_success_response(data=q.to_dict())), 200


@stocks_blueprint.route("/<path:instrument_id>/history", methods=["GET"])
def get_stock_history(instrument_id: str):
    """Returns historical OHLCV candles."""
    timeframe = request.args.get("timeframe", "15m")
    limit = int(request.args.get("limit", 100))
    stock = global_stock_service.get_stock_by_id(instrument_id)
    sym = stock.symbol if stock else instrument_id.split(":")[-1]
    q = global_stock_service.get_quote(instrument_id)
    candles = global_stock_service.get_historical_candles(
        symbol=sym,
        timeframe=timeframe,
        limit=limit,
        base_price=q.last_price if q else 1000.0
    )
    return jsonify(make_success_response(data=candles, total=len(candles))), 200


@stocks_blueprint.route("/<path:instrument_id>/analysis", methods=["GET"])
def get_stock_analysis(instrument_id: str):
    """Returns explainable quantitative analysis & scoring."""
    timeframe = request.args.get("timeframe", "1d")
    stock = global_stock_service.get_stock_by_id(instrument_id)
    sym = stock.symbol if stock else instrument_id.split(":")[-1]
    analysis = global_stock_service.get_analysis(symbol=sym, instrument_id=instrument_id, timeframe=timeframe)
    return jsonify(make_success_response(data=analysis.to_dict())), 200


@stocks_blueprint.route("/<path:instrument_id>/fundamentals", methods=["GET"])
def get_stock_fundamentals(instrument_id: str):
    """Returns fundamental financial ratios."""
    stock = global_stock_service.get_stock_by_id(instrument_id)
    sym = stock.symbol if stock else instrument_id.split(":")[-1]
    fund = global_stock_service.get_fundamentals(symbol=sym, instrument_id=instrument_id)
    return jsonify(make_success_response(data=fund.to_dict())), 200


@stocks_blueprint.route("/<path:instrument_id>/quality", methods=["GET"])
def get_stock_data_quality(instrument_id: str):
    """Returns data quality diagnostics."""
    q = global_stock_service.get_quote(instrument_id)
    quality_info = {
        "instrument_id": instrument_id,
        "status": q.data_quality if q else "UNKNOWN",
        "data_age_ms": q.data_age_ms if q else 0.0,
        "provider": q.provider if q else "upstox",
        "timestamp": q.timestamp_exchange if q else None,
        "notes": q.quality_notes if q else ["No active quote session"]
    }
    return jsonify(make_success_response(data=quality_info)), 200


@stocks_blueprint.route("/stream", methods=["GET"])
def stream_stock_quotes():
    """SSE real-time price streaming endpoint."""
    def event_stream():
        while True:
            quotes = global_stock_service.get_stocks(StockFilterEngine.from_query_params({"limit": "30"}))
            payload = json.dumps({"type": "STOCKS_TICK", "data": quotes["items"]})
            yield f"data: {payload}\n\n"
            time.sleep(2.0)

    return Response(event_stream(), mimetype="text/event-stream")
