"""
Futures Market Flask REST API Routes
=====================================
REST endpoints for Futures Universe, Funding Rates, Basis, and Liquidations.
"""

from __future__ import annotations
from flask import Blueprint, jsonify, request
from market_data.futures.service import FuturesMarketService

futures_bp = Blueprint("futures_bp", __name__)


@futures_bp.route("/api/futures/universe", methods=["GET"])
@futures_bp.route("/api/futures/contracts", methods=["GET"])
def get_futures_universe():
    service = FuturesMarketService.get_instance()
    underlying = request.args.get("underlying")
    venue = request.args.get("exchange") or request.args.get("venue")
    contract_type = request.args.get("type")

    contracts = service.get_all_contracts()

    if underlying:
        u_upper = underlying.upper().strip()
        contracts = [c for c in contracts if u_upper in c.underlying.upper() or u_upper in c.symbol.upper()]
    if venue and venue.upper() != "ALL":
        v_upper = venue.upper().strip()
        contracts = [c for c in contracts if v_upper in c.venue.value.upper()]
    if contract_type and contract_type.upper() != "ALL":
        t_upper = contract_type.upper().strip()
        contracts = [c for c in contracts if t_upper in c.contract_type.value.upper()]

    return jsonify({
        "status": "SUCCESS",
        "count": len(contracts),
        "contracts": [c.to_dict() for c in contracts],
    }), 200


@futures_bp.route("/api/futures/funding-heatmap", methods=["GET"])
def get_funding_heatmap():
    service = FuturesMarketService.get_instance()
    heatmap = service.get_funding_heatmap()
    return jsonify({
        "status": "SUCCESS",
        "count": len(heatmap),
        "data": heatmap,
    }), 200


@futures_bp.route("/api/futures/contract/<symbol>", methods=["GET"])
def get_contract_detail(symbol: str):
    service = FuturesMarketService.get_instance()
    contract = service.get_contract_by_symbol(symbol)
    if not contract:
        return jsonify({"status": "ERROR", "message": f"Contract '{symbol}' not found"}), 404
    return jsonify({
        "status": "SUCCESS",
        "contract": contract.to_dict(),
    }), 200


@futures_bp.route("/api/futures/calculate-liquidation", methods=["POST"])
def calculate_liquidation():
    body = request.get_json(silent=True) or {}
    side = body.get("side", "LONG")
    entry_price = float(body.get("entryPrice") or body.get("entry_price") or 0.0)
    leverage = int(body.get("leverage") or 10)

    service = FuturesMarketService.get_instance()
    result = service.calculate_liquidation(side, entry_price, leverage)
    return jsonify({"status": "SUCCESS", "result": result}), 200
