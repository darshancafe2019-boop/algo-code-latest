"""
Trading Orchestrator REST & SSE API Routes
==========================================
Exposes endpoints for scheduler configuration, checkpoint triggers,
workflow state inspection, AI decisions review, human approval gate, and real-time SSE streaming.
"""

from __future__ import annotations

import json
import queue
import logging
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request, Response

from src import config, db
from trading_orchestrator.scheduler.scheduler import global_trading_scheduler
from trading_orchestrator.workflow.workflow_engine import global_workflow_engine
from trading_orchestrator.workflow.workflow_state import global_workflow_state_mgr
from trading_orchestrator.decisions.decision_history import (
    list_recent_decisions,
    update_decision_approval,
    update_decision_execution,
)
from trading_orchestrator.reports.trading_journal import get_recent_journal_entries
from trading_orchestrator.reports.daily_report import get_latest_daily_report, generate_daily_report
from trading_orchestrator.context.market_context import build_comprehensive_market_context
from src.universal_risk_engine import get_universal_risk_limits
from src.execution_service import LiveExecutionAdapter, PaperExecutionAdapter

logger = logging.getLogger("OrchestratorAPI")

orchestrator_bp = Blueprint("orchestrator_bp", __name__, url_prefix="/api/orchestrator")


@orchestrator_bp.route("/status", methods=["GET"])
def get_orchestrator_status():
    """Returns top-level orchestrator lifecycle, active state, mode, and scheduler status."""
    current_ctx = global_workflow_state_mgr.get_current_context()
    checkpoints = global_trading_scheduler.get_checkpoints_status()
    risk_limits = get_universal_risk_limits()

    return jsonify({
        "status": "success",
        "is_running": global_trading_scheduler._is_running,
        "is_paused": global_workflow_engine.is_paused,
        "is_killed": global_workflow_engine.is_killed,
        "trading_mode": getattr(config, "TRADING_MODE", "PAPER"),
        "live_trading_enabled": not getattr(config, "GLOBAL_KILL_SWITCH", False) and getattr(config, "ENABLE_LIVE_TRADING", False),
        "current_state": current_ctx.current_state.value if current_ctx else "IDLE",
        "current_run": current_ctx.to_dict() if current_ctx else None,
        "checkpoints": checkpoints,
        "risk_summary": {
            "daily_loss_limit": risk_limits.get("max_daily_loss_usd", 2500.0),
            "max_position_size": risk_limits.get("max_position_size_usd", 100000.0),
            "kill_switch_active": getattr(config, "GLOBAL_KILL_SWITCH", False),
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


@orchestrator_bp.route("/workflow", methods=["GET"])
def get_workflow_details():
    """Returns detailed history and telemetry for the active or latest workflow run."""
    current_ctx = global_workflow_state_mgr.get_current_context()
    return jsonify({
        "status": "success",
        "workflow": current_ctx.to_dict() if current_ctx else None,
    })


@orchestrator_bp.route("/checkpoints", methods=["GET"])
def get_checkpoints():
    """Returns list of 6 daily checkpoints with schedules, last run, and next run."""
    checkpoints = global_trading_scheduler.get_checkpoints_status()
    return jsonify({
        "status": "success",
        "checkpoints": checkpoints,
    })


@orchestrator_bp.route("/checkpoints/configure", methods=["POST"])
def configure_checkpoint():
    """Updates time schedule or enable/disable toggle for a checkpoint."""
    data = request.get_json(silent=True) or {}
    checkpoint_id = data.get("checkpoint_id")
    if not checkpoint_id:
        return jsonify({"status": "error", "message": "Missing 'checkpoint_id'"}), 400

    try:
        updated = global_trading_scheduler.update_checkpoint_config(
            checkpoint_id=checkpoint_id,
            scheduled_time=data.get("scheduled_time"),
            is_enabled=data.get("is_enabled"),
            tz_name=data.get("timezone"),
        )
        return jsonify({"status": "success", "checkpoint": updated})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400


@orchestrator_bp.route("/checkpoints/trigger", methods=["POST"])
def trigger_checkpoint():
    """Manually triggers execution of a specific checkpoint."""
    data = request.get_json(silent=True) or {}
    checkpoint_id = data.get("checkpoint_id", "MARKET_OPEN_SCAN")
    execution_mode = data.get("execution_mode", getattr(config, "TRADING_MODE", "PAPER"))

    try:
        res = global_trading_scheduler.trigger_checkpoint_manually(
            checkpoint_id=checkpoint_id,
            execution_mode=execution_mode,
        )
        return jsonify({"status": "success", "result": res})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@orchestrator_bp.route("/start", methods=["POST"])
def start_scheduler():
    global_trading_scheduler.start()
    return jsonify({"status": "success", "message": "Trading Orchestrator started."})


@orchestrator_bp.route("/pause", methods=["POST"])
def pause_scheduler():
    res = global_workflow_engine.pause_orchestrator()
    return jsonify({"status": "success", "result": res})


@orchestrator_bp.route("/resume", methods=["POST"])
def resume_scheduler():
    res = global_workflow_engine.resume_orchestrator()
    return jsonify({"status": "success", "result": res})


@orchestrator_bp.route("/stop", methods=["POST"])
def stop_scheduler():
    global_trading_scheduler.stop()
    return jsonify({"status": "success", "message": "Trading Orchestrator stopped."})


@orchestrator_bp.route("/kill", methods=["POST"])
def emergency_kill():
    data = request.get_json(silent=True) or {}
    operator = data.get("operator", "Operator")
    action = data.get("action", "KILL").upper()

    if action == "RESET":
        res = global_workflow_engine.reset_kill_switch(operator=operator)
    else:
        res = global_workflow_engine.trigger_kill_switch(operator=operator)

    return jsonify(res)


@orchestrator_bp.route("/decisions", methods=["GET"])
def get_decisions():
    limit = int(request.args.get("limit", 50))
    decisions = list_recent_decisions(limit=limit)
    return jsonify({
        "status": "success",
        "decisions": decisions,
    })


@orchestrator_bp.route("/decisions/<decision_id>/approve", methods=["POST"])
def approve_decision(decision_id: str):
    """Human Approval Gate: Explicitly approves an AI decision for live or paper execution."""
    data = request.get_json(silent=True) or {}
    operator = data.get("operator", "Operator")

    rows = db.safe_query("SELECT * FROM orchestrator_decisions WHERE decision_id = ?", (decision_id,))
    if not rows:
        return jsonify({"status": "error", "message": f"Decision {decision_id} not found."}), 404

    decision_record = dict(rows[0])
    if decision_record.get("risk_status") != "APPROVED":
        return jsonify({"status": "error", "message": "Cannot approve a trade blocked by the Risk Engine."}), 400

    if global_workflow_engine.is_killed:
        return jsonify({"status": "error", "message": "Cannot execute orders while Emergency Kill Switch is active."}), 403

    # Route order
    sym = decision_record["symbol"]
    side = decision_record["action"]
    qty = float(decision_record["quantity"])
    price = float(decision_record["entry_price"])
    mode = getattr(config, "TRADING_MODE", "PAPER").upper()

    if mode == "LIVE":
        adapter = LiveExecutionAdapter()
    else:
        adapter = PaperExecutionAdapter()

    try:
        fill_res = adapter.submit_order(symbol=sym, side=side, amount=qty, price=price)
        ord_id = fill_res.get("order_id", f"ORD_{decision_id}")
        broker_ord_id = fill_res.get("broker_order_id", ord_id)

        update_decision_approval(decision_id=decision_id, approved=True, approved_by=operator, execution_status="FILLED")
        update_decision_execution(
            decision_id=decision_id,
            order_id=ord_id,
            broker_order_id=broker_ord_id,
            status="FILLED",
            execution_details=fill_res,
        )

        global_workflow_engine.broadcast_event("ORDER_FILLED", {"decision_id": decision_id, "order": fill_res})
        return jsonify({"status": "success", "message": "Order executed successfully.", "fill": fill_res})
    except Exception as e:
        logger.error("Execution failed for decision %s: %s", decision_id, e)
        return jsonify({"status": "error", "message": f"Execution failed: {e}"}), 500


@orchestrator_bp.route("/decisions/<decision_id>/reject", methods=["POST"])
def reject_decision(decision_id: str):
    data = request.get_json(silent=True) or {}
    operator = data.get("operator", "Operator")
    update_decision_approval(decision_id=decision_id, approved=False, approved_by=operator, execution_status="REJECTED")
    return jsonify({"status": "success", "message": f"Decision {decision_id} rejected by {operator}."})


@orchestrator_bp.route("/risk", methods=["GET"])
def get_risk_telemetry():
    limits = get_universal_risk_limits()
    raw_positions = db.safe_query("SELECT * FROM positions WHERE status = 'OPEN'") or []
    positions_list = [dict(p) for p in raw_positions]

    return jsonify({
        "status": "success",
        "risk_limits": limits,
        "open_positions_count": len(positions_list),
        "kill_switch_active": getattr(config, "GLOBAL_KILL_SWITCH", False),
        "status_gate": "BLOCKED" if getattr(config, "GLOBAL_KILL_SWITCH", False) else "APPROVED",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


@orchestrator_bp.route("/journal", methods=["GET"])
def get_journal():
    limit = int(request.args.get("limit", 30))
    entries = get_recent_journal_entries(limit=limit)
    return jsonify({
        "status": "success",
        "journal": entries,
    })


@orchestrator_bp.route("/report", methods=["GET"])
def get_daily_report_endpoint():
    date_param = request.args.get("date")
    report = get_latest_daily_report() if not date_param else generate_daily_report(date_param)
    return jsonify({
        "status": "success",
        "report": report,
    })


@orchestrator_bp.route("/stream", methods=["GET"])
def sse_orchestrator_stream():
    """Server-Sent Events stream for push updates to the Next.js frontend."""
    event_queue = queue.Queue(maxsize=100)

    def event_listener(event_dict: Dict[str, Any]):
        try:
            event_queue.put_nowait(event_dict)
        except queue.Full:
            pass

    global_workflow_engine.register_listener(event_listener)

    def event_generator():
        try:
            yield f"data: {json.dumps({'type': 'CONNECTED', 'timestamp': datetime.now(timezone.utc).isoformat()})}\n\n"
            while True:
                try:
                    ev = event_queue.get(timeout=15.0)
                    yield f"data: {json.dumps(ev)}\n\n"
                except queue.Empty:
                    # Heartbeat
                    yield f"data: {json.dumps({'type': 'HEARTBEAT', 'timestamp': datetime.now(timezone.utc).isoformat()})}\n\n"
        except GeneratorExit:
            global_workflow_engine.unregister_listener(event_listener)
        except Exception:
            global_workflow_engine.unregister_listener(event_listener)

    return Response(
        event_generator(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
