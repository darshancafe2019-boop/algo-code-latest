"""
Quant.OS Tax Intelligence — Flask API Routes Blueprint
======================================================
Provides REST API endpoints for Tax Intelligence tab, portfolio integration,
what-if scenario modeling, and broker tax reconciliation.
"""

import logging
from flask import Blueprint, jsonify, request
from src.tax_engine.liability_engine import tax_liability_engine
from src.tax_engine.reconciliation_engine import tax_reconciliation_engine
from src.tax_engine.rule_registry import tax_rule_registry
from src.tax_engine.tax_service import tax_service

logger = logging.getLogger("TaxIntelligenceAPI")

tax_blueprint = Blueprint("tax_blueprint", __name__)


@tax_blueprint.route("/overview", methods=["GET"])
def get_tax_overview():
    """Return top command center overview cards, global tax exposure, and reminders."""
    try:
        data = tax_service.get_overview()
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        logger.error(f"Error computing tax overview: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


@tax_blueprint.route("/profile", methods=["GET"])
def get_taxpayer_profile():
    """Return configured taxpayer profile."""
    try:
        data = tax_service.get_profile()
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        logger.error(f"Error fetching taxpayer profile: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


@tax_blueprint.route("/profile", methods=["POST", "PUT"])
def update_taxpayer_profile():
    """Update taxpayer profile settings."""
    try:
        req_data = request.get_json() or {}
        updated = tax_service.update_profile(req_data)
        return jsonify({"status": "success", "data": updated})
    except Exception as e:
        logger.error(f"Error updating taxpayer profile: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


@tax_blueprint.route("/positions", methods=["GET"])
def get_tax_positions():
    """Return live open positions with holding-period countdown and potential tax consequences."""
    try:
        positions = tax_service.get_positions()
        return jsonify({"status": "success", "data": positions})
    except Exception as e:
        logger.error(f"Error fetching tax positions: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


@tax_blueprint.route("/lots", methods=["GET"])
def get_tax_lots():
    """Return all open and partially closed tax lots."""
    try:
        lots = tax_service.get_tax_lots()
        return jsonify({"status": "success", "data": lots})
    except Exception as e:
        logger.error(f"Error fetching tax lots: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


@tax_blueprint.route("/transactions", methods=["GET"])
def get_tax_transactions():
    """Return normalized canonical tax transactions with fee/tax separation."""
    try:
        transactions = tax_service.get_transactions()
        return jsonify({"status": "success", "data": transactions})
    except Exception as e:
        logger.error(f"Error fetching tax transactions: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


@tax_blueprint.route("/countries", methods=["GET"])
def get_country_coverage():
    """Return worldwide country coverage catalog with honest verification statuses."""
    try:
        countries = tax_service.get_countries()
        return jsonify({"status": "success", "data": countries})
    except Exception as e:
        logger.error(f"Error fetching country coverage: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


@tax_blueprint.route("/calendar", methods=["GET"])
def get_tax_calendar():
    """Return official statutory payment, advance tax, and filing deadlines."""
    try:
        deadlines = tax_service.get_calendar()
        return jsonify({"status": "success", "data": deadlines})
    except Exception as e:
        logger.error(f"Error fetching tax calendar: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


@tax_blueprint.route("/alerts", methods=["GET"])
def get_tax_alerts():
    """Return actionable tax review alerts and statutory reminders."""
    try:
        alerts = tax_service.get_alerts()
        return jsonify({"status": "success", "data": alerts})
    except Exception as e:
        logger.error(f"Error fetching tax alerts: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


@tax_blueprint.route("/whatif", methods=["POST"])
def simulate_what_if_scenario():
    """Simulate tax consequences of a proposed trade action."""
    try:
        req_data = request.get_json() or {}
        simulation = tax_service.simulate_what_if(req_data)
        return jsonify({"status": "success", "data": simulation})
    except Exception as e:
        logger.error(f"Error running what-if simulation: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


@tax_blueprint.route("/documents", methods=["GET"])
def get_tax_documents():
    """Return tax documentation compliance checklist."""
    try:
        documents = tax_service.get_documents()
        return jsonify({"status": "success", "data": documents})
    except Exception as e:
        logger.error(f"Error fetching tax documents: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


@tax_blueprint.route("/sources", methods=["GET"])
def get_tax_rule_sources():
    """Return authoritative tax rules, versioning, and legislative citations."""
    try:
        sources = tax_service.get_rule_sources()
        return jsonify({"status": "success", "data": sources})
    except Exception as e:
        logger.error(f"Error fetching rule sources: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


@tax_blueprint.route("/audit", methods=["GET"])
def get_tax_audit_trail():
    """Return immutable calculation audit records."""
    try:
        records = [r.to_dict() for r in tax_liability_engine.get_audit_history()]
        return jsonify({"status": "success", "data": records})
    except Exception as e:
        logger.error(f"Error fetching tax audit trail: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


@tax_blueprint.route("/reconcile", methods=["POST"])
def reconcile_broker_trades():
    """Reconcile broker statement against internal Quant.OS trades."""
    try:
        req_data = request.get_json() or {}
        broker_records = req_data.get("broker_records", [])
        transactions = tax_service._transactions
        result = tax_reconciliation_engine.reconcile_trades(transactions, broker_records)
        return jsonify({"status": "success", "data": result})
    except Exception as e:
        logger.error(f"Error reconciling trades: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500
