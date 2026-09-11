"""
QUANT.OS Pre-Trade Risk Engine & Kill-Switch Blueprints
========================================================
Authoritative pre-trade safety gates, risk limits evaluation,
kill-switch control, and risk audit forensics.
"""

from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from src.universal_risk_engine import universal_risk_engine
from app.middleware import validate_json_payload

risk_bp = Blueprint("risk", __name__)


@risk_bp.route("/api/risk/status", methods=["GET"])
def get_risk_status():
    """Returns comprehensive risk system status."""
    return jsonify({
        "success": True,
        "status": "OPERATIONAL",
        "killSwitchActive": universal_risk_engine.is_kill_switch_active(),
        "summary": universal_risk_engine.get_risk_summary(),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }), 200


@risk_bp.route("/api/risk/kill-switch", methods=["GET"])
def get_kill_switch():
    """Returns whether the universal trading kill switch is engaged."""
    is_active = universal_risk_engine.is_kill_switch_active()
    return jsonify({
        "success": True,
        "kill_switch_active": is_active,
        "trading_allowed": not is_active,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }), 200


@risk_bp.route("/api/risk/kill-switch/halt", methods=["POST"])
@risk_bp.route("/api/risk/kill-switch/engage", methods=["POST"])
def engage_kill_switch():
    """Immediately halts all live trading and blocks order execution."""
    data = request.get_json(silent=True) or {}
    reason = data.get("reason", "Manual emergency kill-switch activation by operator")
    
    universal_risk_engine.activate_kill_switch(reason=reason)
    return jsonify({
        "success": True,
        "message": "Universal kill-switch engaged. All trading activity is HALTED.",
        "kill_switch_active": True,
        "reason": reason,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }), 200


@risk_bp.route("/api/risk/kill-switch/resume", methods=["POST"])
def resume_trading():
    """Resumes live trading after operator authorization."""
    universal_risk_engine.deactivate_kill_switch()
    return jsonify({
        "success": True,
        "message": "Universal kill-switch disengaged. Normal trading allowed.",
        "kill_switch_active": False,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }), 200


@risk_bp.route("/api/risk/evaluate", methods=["POST"])
@validate_json_payload(required_fields=["symbol", "side", "quantity"])
def evaluate_trade_intent():
    """
    Evaluates a proposed trade intent against all pre-trade risk gates:
    - Stale market data check
    - Broker connectivity
    - Daily loss limits
    - Account drawdown limits
    - Maximum position sizing
    - Kill-switch state
    """
    data = request.get_json()
    decision = universal_risk_engine.evaluate_order_intent(data)
    
    status_code = 200 if decision.get("allowed", False) else 422
    return jsonify({
        "success": decision.get("allowed", False),
        "decision": decision,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }), status_code
