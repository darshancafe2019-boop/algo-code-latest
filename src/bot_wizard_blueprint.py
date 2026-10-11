"""
Quant.OS Bot Wizard & Fleet Management Flask Blueprint
========================================================
Registers authoritative API routes matching the source reference implementation:
- /api/bots (GET, POST)
- /api/bots/<bot_id> (GET, DELETE)
- /api/bots/<bot_id>/start, pause, resume, stop, restart, validate, orders, trades, positions, events
- /api/wizard/validate, /api/wizard/deploy
- /api/market/markets, instruments, quote, option-chain, expiries, funds
- /api/strategies/options, trading, indicators, payoff
- /api/providers, /api/system/kill-switch
"""

import json
import logging
from flask import Blueprint, jsonify, request
from src import bot_wizard_service
from src.domain.strategy_registry import StrategyRegistry, OptionLeg
from src.domain.indicator_registry import IndicatorRegistry

logger = logging.getLogger("BotWizardBlueprint")

bot_wizard_blueprint = Blueprint("bot_wizard", __name__)


# ── BOTS FLEET & SNAPSHOTS ─────────────────────────────────────────────────────

@bot_wizard_blueprint.route("/api/bots", methods=["GET"])
def list_bots_api():
    try:
        bots = bot_wizard_service.list_bots()
        # Compute summary metrics
        total = len(bots)
        active = sum(1 for b in bots if b.get("status") in ("RUNNING", "ACTIVE", "READY"))
        stopped = sum(1 for b in bots if b.get("status") == "STOPPED")
        daily_pnl = sum(float(b.get("pnl", {}).get("daily", 0.0)) for b in bots)

        metrics = {
            "total_bots": total,
            "active_bots": active,
            "stopped_bots": stopped,
            "total_pnl": daily_pnl,
            "running_capital": sum(float(b.get("risk", {}).get("max_loss_per_trade", 1000.0)) for b in bots),
        }

        # Dual-schema response for both source and legacy destination consumers
        return jsonify({
            "success": True,
            "status": "success",
            "data": bots,
            "bots": bots,
            "metrics": metrics,
            "total": total,
            "total_bots": total,
        })
    except Exception as e:
        logger.error(f"Error listing bots: {e}")
        return jsonify({"success": False, "status": "error", "error": {"code": "FETCH_FAILED", "message": str(e)}}), 500


@bot_wizard_blueprint.route("/api/bots", methods=["POST"])
def create_bot_api():
    try:
        data = request.get_json(force=True) or {}
        created = bot_wizard_service.deploy_wizard_bot(data)
        return jsonify({"success": True, "status": "success", "data": created}), 201
    except Exception as e:
        logger.error(f"Error creating bot: {e}")
        return jsonify({"success": False, "status": "error", "error": {"code": "CREATE_FAILED", "message": str(e)}}), 400


@bot_wizard_blueprint.route("/api/bots/<bot_id>", methods=["GET"])
def get_bot_details_api(bot_id: str):
    try:
        snapshot = bot_wizard_service.get_bot_snapshot(bot_id)
        return jsonify({"success": True, "status": "success", "data": snapshot})
    except KeyError:
        return jsonify({"success": False, "error": {"code": "NOT_FOUND", "message": f"Bot {bot_id} not found."}}), 404
    except Exception as e:
        return jsonify({"success": False, "error": {"code": "FETCH_FAILED", "message": str(e)}}), 500


@bot_wizard_blueprint.route("/api/bots/<bot_id>", methods=["DELETE"])
def delete_bot_api(bot_id: str):
    try:
        bot_wizard_service.delete_bot(bot_id)
        return jsonify({"success": True, "data": {"bot_id": bot_id, "deleted": True}})
    except Exception as e:
        return jsonify({"success": False, "error": {"code": "DELETE_FAILED", "message": str(e)}}), 500


# ── BOT LIFECYCLE CONTROLS ─────────────────────────────────────────────────────

@bot_wizard_blueprint.route("/api/bots/<bot_id>/start", methods=["POST"])
def start_bot_api(bot_id: str):
    try:
        updated = bot_wizard_service.start_bot(bot_id)
        return jsonify({"success": True, "data": updated})
    except Exception as e:
        return jsonify({"success": False, "error": {"code": "START_FAILED", "message": str(e)}}), 500


@bot_wizard_blueprint.route("/api/bots/<bot_id>/pause", methods=["POST"])
def pause_bot_api(bot_id: str):
    try:
        updated = bot_wizard_service.pause_bot(bot_id)
        return jsonify({"success": True, "data": updated})
    except Exception as e:
        return jsonify({"success": False, "error": {"code": "PAUSE_FAILED", "message": str(e)}}), 500


@bot_wizard_blueprint.route("/api/bots/<bot_id>/resume", methods=["POST"])
def resume_bot_api(bot_id: str):
    try:
        updated = bot_wizard_service.resume_bot(bot_id)
        return jsonify({"success": True, "data": updated})
    except Exception as e:
        return jsonify({"success": False, "error": {"code": "RESUME_FAILED", "message": str(e)}}), 500


@bot_wizard_blueprint.route("/api/bots/<bot_id>/stop", methods=["POST"])
def stop_bot_api(bot_id: str):
    try:
        updated = bot_wizard_service.stop_bot(bot_id)
        return jsonify({"success": True, "data": updated})
    except Exception as e:
        return jsonify({"success": False, "error": {"code": "STOP_FAILED", "message": str(e)}}), 500


@bot_wizard_blueprint.route("/api/bots/<bot_id>/restart", methods=["POST"])
def restart_bot_api(bot_id: str):
    try:
        updated = bot_wizard_service.restart_bot(bot_id)
        return jsonify({"success": True, "data": updated})
    except Exception as e:
        return jsonify({"success": False, "error": {"code": "RESTART_FAILED", "message": str(e)}}), 500


@bot_wizard_blueprint.route("/api/bots/<bot_id>/validate", methods=["POST"])
def validate_bot_instance_api(bot_id: str):
    try:
        snap = bot_wizard_service.get_bot_snapshot(bot_id)
        val = bot_wizard_service.validate_wizard_draft(snap["bot"])
        return jsonify({"success": True, "data": val})
    except Exception as e:
        return jsonify({"success": False, "error": {"code": "VALIDATE_FAILED", "message": str(e)}}), 500


@bot_wizard_blueprint.route("/api/bots/<bot_id>/orders", methods=["GET"])
def get_bot_orders_api(bot_id: str):
    try:
        snap = bot_wizard_service.get_bot_snapshot(bot_id)
        return jsonify({"success": True, "data": snap.get("orders", [])})
    except Exception as e:
        return jsonify({"success": False, "error": {"code": "FETCH_FAILED", "message": str(e)}}), 500


@bot_wizard_blueprint.route("/api/bots/<bot_id>/orders", methods=["POST"])
def place_bot_order_api(bot_id: str):
    try:
        data = request.get_json(force=True) or {}
        side = data.get("side", "BUY")
        quantity = float(data.get("quantity") or 1.0)
        price = float(data.get("price")) if data.get("price") else None
        order = bot_wizard_service.place_manual_order(bot_id, side, quantity, price)
        return jsonify({"success": True, "data": order})
    except Exception as e:
        return jsonify({"success": False, "error": {"code": "ORDER_FAILED", "message": str(e)}}), 500


@bot_wizard_blueprint.route("/api/bots/<bot_id>/trades", methods=["GET"])
def get_bot_trades_api(bot_id: str):
    try:
        snap = bot_wizard_service.get_bot_snapshot(bot_id)
        return jsonify({"success": True, "data": snap.get("trades", [])})
    except Exception as e:
        return jsonify({"success": False, "error": {"code": "FETCH_FAILED", "message": str(e)}}), 500


@bot_wizard_blueprint.route("/api/bots/<bot_id>/positions", methods=["GET"])
def get_bot_positions_api(bot_id: str):
    try:
        snap = bot_wizard_service.get_bot_snapshot(bot_id)
        return jsonify({"success": True, "data": snap.get("positions", [])})
    except Exception as e:
        return jsonify({"success": False, "error": {"code": "FETCH_FAILED", "message": str(e)}}), 500


@bot_wizard_blueprint.route("/api/bots/<bot_id>/events", methods=["GET"])
def get_bot_events_api(bot_id: str):
    try:
        snap = bot_wizard_service.get_bot_snapshot(bot_id)
        return jsonify({"success": True, "data": snap.get("events", [])})
    except Exception as e:
        return jsonify({"success": False, "error": {"code": "FETCH_FAILED", "message": str(e)}}), 500


# ── WIZARD VALIDATION & DEPLOYMENT ─────────────────────────────────────────────

@bot_wizard_blueprint.route("/api/wizard/validate", methods=["POST"])
def validate_wizard_api():
    try:
        data = request.get_json(force=True) or {}
        result = bot_wizard_service.validate_wizard_draft(data)
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": {"code": "VALIDATE_FAILED", "message": str(e)}}), 400


@bot_wizard_blueprint.route("/api/wizard/deploy", methods=["POST"])
def deploy_wizard_api():
    try:
        data = request.get_json(force=True) or {}
        deployed = bot_wizard_service.deploy_wizard_bot(data)
        return jsonify({"success": True, "data": deployed})
    except Exception as e:
        logger.error(f"Deploy error: {e}")
        return jsonify({"success": False, "error": {"code": "DEPLOY_FAILED", "message": str(e)}}), 400


# ── MARKET DATA DISCOVERY ─────────────────────────────────────────────────────

@bot_wizard_blueprint.route("/api/market/markets", methods=["GET"])
def get_markets_api():
    return jsonify({"success": True, "data": bot_wizard_service.get_supported_markets()})


@bot_wizard_blueprint.route("/api/market/instruments", methods=["GET"])
def get_instruments_api():
    mtype = request.args.get("market_type", "CRYPTO_OPTION")
    und = request.args.get("underlying", "BTC")
    search = request.args.get("search")
    instruments = bot_wizard_service.get_instruments(mtype, und, search)
    return jsonify({"success": True, "data": instruments})


@bot_wizard_blueprint.route("/api/market/quote", methods=["GET"])
def get_quote_api():
    symbol = request.args.get("symbol", "BTCUSD")
    prov = request.args.get("provider")
    mtype = request.args.get("market_type")
    quote = bot_wizard_service.get_live_quote(symbol, prov, mtype)
    return jsonify({"success": True, "data": quote})


@bot_wizard_blueprint.route("/api/market/option-chain", methods=["GET"])
def get_option_chain_api():
    mtype = request.args.get("market_type", "CRYPTO_OPTION")
    und = request.args.get("underlying", "BTC")
    expiry = request.args.get("expiry")
    chain = bot_wizard_service.get_live_option_chain(mtype, und, expiry)
    return jsonify({"success": True, "data": chain})


@bot_wizard_blueprint.route("/api/market/expiries", methods=["GET"])
def get_expiries_api():
    mtype = request.args.get("market_type", "CRYPTO_OPTION")
    und = request.args.get("underlying", "BTC")
    expiries = bot_wizard_service.get_dynamic_expiries(mtype, und)
    return jsonify({"success": True, "data": expiries})


@bot_wizard_blueprint.route("/api/market/funds", methods=["GET"])
def get_funds_api():
    prov = request.args.get("provider", "PAPER")
    funds = bot_wizard_service.get_broker_funds(prov)
    return jsonify({"success": True, "data": funds})


# ── STRATEGY & INDICATOR REGISTRIES ───────────────────────────────────────────

@bot_wizard_blueprint.route("/api/strategies/options", methods=["GET"])
def get_option_strategies_api():
    strats = StrategyRegistry.get_all_option_strategies()
    return jsonify({"success": True, "data": [s.model_dump() for s in strats]})


@bot_wizard_blueprint.route("/api/strategies/trading", methods=["GET"])
def get_trading_strategies_api():
    strats = StrategyRegistry.get_all_trading_strategies()
    return jsonify({"success": True, "data": [s.model_dump() for s in strats]})


@bot_wizard_blueprint.route("/api/strategies/indicators", methods=["GET"])
def get_indicators_api():
    inds = IndicatorRegistry.get_all_indicators()
    return jsonify({"success": True, "data": [i.model_dump() for i in inds]})


@bot_wizard_blueprint.route("/api/strategies/payoff", methods=["POST"])
def calculate_payoff_api():
    try:
        data = request.get_json(force=True) or {}
        legs_data = data.get("legs", [])
        legs = [OptionLeg(**l) if isinstance(l, dict) else l for l in legs_data]
        spot = float(data.get("spot_price") or data.get("underlying_spot") or 83000.0)
        lot = float(data.get("lot_size") or 1.0)
        payoff = StrategyRegistry.calculate_option_payoff(legs, spot, lot)
        return jsonify({"success": True, "data": payoff})
    except Exception as e:
        return jsonify({"success": False, "error": {"code": "PAYOFF_ERROR", "message": str(e)}}), 400


# ── PROVIDERS & SYSTEM ────────────────────────────────────────────────────────

@bot_wizard_blueprint.route("/api/providers", methods=["GET"])
def get_providers_api():
    providers = [
        {"id": "DELTA", "name": "Delta Exchange", "status": "LIVE", "latency_ms": 12.0, "asset_classes": ["CRYPTO_OPTIONS", "CRYPTO_FUTURES"]},
        {"id": "BINANCE", "name": "Binance", "status": "LIVE", "latency_ms": 15.0, "asset_classes": ["CRYPTO_SPOT", "CRYPTO_FUTURES"]},
        {"id": "UPSTOX", "name": "Upstox", "status": "LIVE", "latency_ms": 18.0, "asset_classes": ["EQUITY", "OPTIONS", "FUTURES"]},
        {"id": "DHAN", "name": "Dhan", "status": "LIVE", "latency_ms": 22.0, "asset_classes": ["EQUITY", "OPTIONS"]},
        {"id": "PAPER", "name": "Quant.OS Paper Simulator", "status": "LIVE", "latency_ms": 1.0, "asset_classes": ["ALL"]},
    ]
    return jsonify({"success": True, "data": providers})


@bot_wizard_blueprint.route("/api/system/kill-switch", methods=["POST"])
def trigger_kill_switch_api():
    from pathlib import Path
    Path("kill_switch.flag").touch()
    return jsonify({"success": True, "data": {"status": "TRIGGERED", "armed": False, "message": "Global Kill Switch armed."}})


@bot_wizard_blueprint.route("/api/system/kill-switch/reset", methods=["POST"])
def reset_kill_switch_api():
    from pathlib import Path
    flag = Path("kill_switch.flag")
    if flag.exists():
        flag.unlink()
    return jsonify({"success": True, "data": {"status": "DISARMED", "armed": True, "message": "Global Kill Switch disarmed."}})
