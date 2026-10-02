"""
Premium Intent & Resolution REST API Endpoints
==============================================
Provides endpoints:
- POST /api/premium/scan -> Scans live option chain for target premium/delta/strike criteria
- POST /api/premium/resolve-plan -> Fully prices a strategy execution plan with margin & signed cash flows
- POST /api/premium/validate-intent -> Preflight validation of PremiumIntent
"""

import logging
from flask import Blueprint, jsonify, request
from src.premium_intent import PremiumIntent
from src.premium_resolver import global_premium_resolver, ResolvedPremiumPlan

logger = logging.getLogger("PremiumResolverRoutes")

premium_bp = Blueprint("premium_resolver_bp", __name__)


@premium_bp.route("/api/premium/scan", methods=["POST"])
def scan_premium():
    try:
        data = request.get_json() or {}
        intent = PremiumIntent.from_dict(data.get("intent", data))
        limit = int(data.get("limit", 5))

        is_valid, errors = intent.validate()
        if not is_valid:
            return jsonify({"success": False, "errors": errors}), 400

        plans = global_premium_resolver.scan_chain_for_intent(intent, limit=limit)
        return jsonify({
            "success": True,
            "underlying": intent.underlying,
            "provider": intent.provider,
            "count": len(plans),
            "plans": [p.to_dict() for p in plans],
        }), 200
    except Exception as e:
        logger.exception("Error in /api/premium/scan")
        return jsonify({"success": False, "error": str(e)}), 500


@premium_bp.route("/api/premium/resolve-plan", methods=["POST"])
def resolve_plan():
    try:
        data = request.get_json() or {}
        intent_data = data.get("intent", data)
        strategy_id = data.get("strategy_id") or intent_data.get("strategy_id")
        strategy_name = data.get("strategy_name") or intent_data.get("strategy_name")
        available_capital = float(data.get("available_capital", 500000.0))

        intent = PremiumIntent.from_dict(intent_data)
        is_valid, errors = intent.validate()
        if not is_valid:
            return jsonify({"success": False, "errors": errors}), 400

        plan: ResolvedPremiumPlan = global_premium_resolver.resolve_intent_to_plan(
            intent=intent,
            strategy_id=strategy_id,
            strategy_name=strategy_name,
            available_capital=available_capital,
        )

        status_code = 200 if plan.valid else (503 if plan.error_code == "DATA_UNAVAILABLE" else 422)
        return jsonify(plan.to_dict()), status_code
    except Exception as e:
        logger.exception("Error in /api/premium/resolve-plan")
        return jsonify({"success": False, "error": str(e)}), 500


@premium_bp.route("/api/premium/validate-intent", methods=["POST"])
def validate_intent():
    try:
        data = request.get_json() or {}
        intent = PremiumIntent.from_dict(data.get("intent", data))
        is_valid, errors = intent.validate()
        return jsonify({
            "valid": is_valid,
            "errors": errors,
            "intent": intent.to_dict(),
        }), 200 if is_valid else 422
    except Exception as e:
        logger.exception("Error in /api/premium/validate-intent")
        return jsonify({"valid": False, "errors": [str(e)]}), 500


def register_premium_resolver_routes(app):
    app.register_blueprint(premium_bp)
    logger.info("Registered /api/premium routes blueprint successfully.")
