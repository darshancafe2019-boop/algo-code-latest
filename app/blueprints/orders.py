"""
QUANT.OS Order Management System & Execution Blueprints
=========================================================
Idempotent order submission, pre-trade risk gating, order cancellation,
and broker position/order reconciliation.
"""

import uuid
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from src.universal_risk_engine import universal_risk_engine
from src.execution_service import execution_service
from src.trade_ledger import global_trade_ledger
from app.middleware import validate_json_payload, validate_order_intent
from app.errors import RiskBlockedError, ConflictError

orders_bp = Blueprint("orders", __name__)
_PROCESSED_IDEMPOTENCY_KEYS = {}


@orders_bp.route("/api/orders", methods=["GET"])
def get_orders():
    """Returns order history and active orders from the trade ledger."""
    limit = int(request.args.get("limit", 50))
    orders = global_trade_ledger.get_orders(limit=limit)
    return jsonify({
        "success": True,
        "orders": orders,
        "count": len(orders),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }), 200


@orders_bp.route("/api/orders/intent", methods=["POST"])
@orders_bp.route("/api/orders", methods=["POST"])
@validate_json_payload(required_fields=["symbol", "side", "quantity"])
def place_order():
    """
    Submits a validated, idempotent order intent through pre-trade risk gates.
    """
    data = request.get_json()
    validated = validate_order_intent(data)

    # 1. Idempotency verification
    idempotency_key = request.headers.get("X-Idempotency-Key") or validated.get("idempotencyKey")
    if idempotency_key:
        if idempotency_key in _PROCESSED_IDEMPOTENCY_KEYS:
            cached_resp = _PROCESSED_IDEMPOTENCY_KEYS[idempotency_key]
            return jsonify(cached_resp), 200

    # 2. Pre-Trade Risk Gate Validation
    risk_decision = universal_risk_engine.evaluate_order_intent(validated)
    if not risk_decision.get("allowed", False):
        raise RiskBlockedError(
            message=risk_decision.get("message", "Order blocked by pre-trade risk engine"),
            details=risk_decision
        )

    # 3. Execution Routing
    mode = str(validated.get("mode", "PAPER")).upper()
    exec_res = execution_service.execute_order(
        symbol=validated["symbol"],
        side=validated["side"],
        quantity=float(validated["quantity"]),
        order_type=validated.get("orderType", validated.get("order_type", "MARKET")),
        price=validated.get("price"),
        mode=mode,
        broker=validated.get("broker", "DELTA"),
        strategy=validated.get("strategy", "MANUAL_DISPATCH"),
        client_order_id=idempotency_key
    )

    if isinstance(exec_res, tuple):
        success, message, order_dict = exec_res
        order_result = order_dict if isinstance(order_dict, dict) else {"success": success, "message": message}
        order_result["success"] = success
        order_result["message"] = message
    else:
        order_result = exec_res or {}

    now_iso = datetime.now(timezone.utc).isoformat()
    response_payload = {
        "success": bool(order_result.get("success", True)),
        "status": order_result.get("status", "SUBMITTED"),
        "orderId": order_result.get("order_id", f"ord_{uuid.uuid4().hex[:10]}"),
        "order": order_result,
        "riskDecision": risk_decision,
        "timestamp": now_iso
    }

    if idempotency_key:
        _PROCESSED_IDEMPOTENCY_KEYS[idempotency_key] = response_payload

    return jsonify(response_payload), 201


@orders_bp.route("/api/orders/<order_id>/cancel", methods=["POST"])
def cancel_order(order_id: str):
    """Cancels an active or pending order."""
    res = execution_service.cancel_order(order_id)
    return jsonify({
        "success": True,
        "orderId": order_id,
        "result": res,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }), 200


@orders_bp.route("/api/positions/<path:symbol>/reduce", methods=["POST"])
def reduce_position(symbol: str):
    """Partially reduces open position (e.g. 25%, 50%)."""
    data = request.get_json() or {}
    percentage = float(data.get("percentage", 0.50))
    broker = str(data.get("broker", "PAPER")).upper()
    res = execution_service.reduce_position(symbol=symbol, percentage=percentage, broker=broker)
    status_code = 200 if res.get("success", False) else 400
    return jsonify({
        "success": res.get("success", False),
        "result": res,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }), status_code


@orders_bp.route("/api/positions/<path:symbol>/exit", methods=["POST"])
def exit_position(symbol: str):
    """Completely exits an open position (100%)."""
    data = request.get_json() or {}
    broker = str(data.get("broker", "PAPER")).upper()
    res = execution_service.reduce_position(symbol=symbol, percentage=1.0, broker=broker)
    status_code = 200 if res.get("success", False) else 400
    return jsonify({
        "success": res.get("success", False),
        "result": res,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }), status_code
