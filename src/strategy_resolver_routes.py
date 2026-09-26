"""
Strategy Resolver & Position Execution REST API Routes
=======================================================
Provides endpoints:
- POST /api/strategy/resolve -> Resolves strategy definition to exact live contracts & parent position
- POST /api/strategy/execute -> Validates and creates a parent StrategyPosition (Paper or Live)
- GET /api/strategy/positions -> Lists active resolved StrategyPositions
"""

from datetime import datetime, timezone
import json
import logging
from typing import Dict, Any, List
from flask import Blueprint, jsonify, request

try:
    from src.strategy_instrument_resolver import (
        StrategyInstrumentResolver,
        StrategyResolutionRequest,
        StrategyResolutionResult,
        InstrumentClass,
    )
except ImportError:
    from strategy_instrument_resolver import (  # type: ignore
        StrategyInstrumentResolver,
        StrategyResolutionRequest,
        StrategyResolutionResult,
        InstrumentClass,
    )

logger = logging.getLogger("StrategyResolverRoutes")

# In-memory store for resolved parent strategy positions
_ACTIVE_STRATEGY_POSITIONS: Dict[str, Dict[str, Any]] = {}


def register_strategy_resolver_routes(app) -> None:
    """Registers the /api/strategy/resolve, execute, and positions endpoints onto Flask app."""

    @app.route("/api/strategy/resolve", methods=["POST"])
    def resolve_strategy_endpoint():
        """
        Resolves any strategy (Equity, Futures, Single Option, Multi-Leg Option) to live verified contracts.
        """
        try:
            data = request.get_json() or {}
            strategy_id = data.get("strategy_id") or data.get("template_id") or "options-strat-01"
            strategy_name = data.get("strategy_name") or "Short Iron Condor"
            underlying = data.get("underlying") or data.get("symbol") or "NIFTY"
            provider = data.get("provider") or "UPSTOX"
            environment = (data.get("environment") or "PAPER").upper()
            lots = int(data.get("lots", 1))
            target_expiry = data.get("target_expiry") or data.get("expiry")

            req = StrategyResolutionRequest(
                strategy_id=strategy_id,
                strategy_name=strategy_name,
                underlying=underlying,
                provider=provider,
                environment=environment,
                lots=lots,
                target_expiry=target_expiry,
                custom_parameters=data.get("parameters", {}),
            )

            result: StrategyResolutionResult = StrategyInstrumentResolver.resolve_strategy(req)
            status_code = 200 if result.success else (503 if result.error_code == "DATA_UNAVAILABLE" else 422)
            return jsonify(result.to_dict()), status_code
        except Exception as e:
            logger.exception("Error in /api/strategy/resolve")
            return jsonify({
                "success": False,
                "error_code": "STRATEGY_RESOLUTION_FAILED",
                "error_message": str(e),
                "position": None,
                "raw_quotes": {},
            }), 500

    @app.route("/api/strategy/execute", methods=["POST"])
    def execute_strategy_endpoint():
        """
        Validates live contracts and executes/creates a StrategyPosition.
        PAPER remains default unless environment strictly equals LIVE.
        """
        try:
            data = request.get_json() or {}
            strategy_id = data.get("strategy_id") or "options-strat-01"
            strategy_name = data.get("strategy_name") or "Short Iron Condor"
            underlying = data.get("underlying") or "NIFTY"
            environment = (data.get("environment") or "PAPER").upper()
            lots = int(data.get("lots", 1))

            req = StrategyResolutionRequest(
                strategy_id=strategy_id,
                strategy_name=strategy_name,
                underlying=underlying,
                environment=environment,
                lots=lots,
                target_expiry=data.get("target_expiry"),
                custom_parameters=data.get("parameters", {}),
            )

            # Step 1: Authoritative live resolution
            result: StrategyResolutionResult = StrategyInstrumentResolver.resolve_strategy(req)
            if not result.success or not result.position:
                return jsonify(result.to_dict()), 422

            pos_dict = result.position.to_dict()
            pos_dict["status"] = "OPEN" if environment == "PAPER" else "SUBMITTED"
            pos_dict["updated_at"] = datetime.now(timezone.utc).isoformat()

            # Record in active positions ledger
            _ACTIVE_STRATEGY_POSITIONS[result.position.position_id] = pos_dict

            return jsonify({
                "success": True,
                "message": f"Strategy position '{result.position.strategy_name}' executed in {environment} mode.",
                "position": pos_dict,
            }), 200
        except Exception as e:
            logger.exception("Error in /api/strategy/execute")
            return jsonify({
                "success": False,
                "error_code": "EXECUTION_FAILED",
                "error_message": str(e),
            }), 500

    @app.route("/api/strategy/positions", methods=["GET"])
    def get_strategy_positions_endpoint():
        """
        Returns all active strategy positions with multi-leg breakdowns.
        """
        return jsonify({
            "success": True,
            "count": len(_ACTIVE_STRATEGY_POSITIONS),
            "positions": list(_ACTIVE_STRATEGY_POSITIONS.values()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }), 200

    @app.route("/api/strategies", methods=["GET"])
    @app.route("/api/strategies/catalog", methods=["GET"])
    def get_strategies_catalog_endpoint():
        """
        Dynamic Strategy Registry Endpoint: returns all registered strategies across Options, Futures, Equities.
        """
        try:
            category = request.args.get("category", "").upper().strip()
            instrument_class = request.args.get("instrument_class", "").upper().strip()
            all_strats = StrategyInstrumentResolver.get_strategy_catalog()

            if category and category != "ALL":
                all_strats = [s for s in all_strats if s.get("category", "").upper() == category]
            if instrument_class:
                all_strats = [s for s in all_strats if s.get("instrument_class", "").upper() == instrument_class]

            return jsonify({
                "success": True,
                "count": len(all_strats),
                "strategies": all_strats,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }), 200
        except Exception as e:
            logger.exception("Error in /api/strategies")
            return jsonify({
                "success": False,
                "error": str(e),
                "strategies": [],
            }), 500
