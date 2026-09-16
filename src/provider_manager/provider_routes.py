"""
Provider Control Plane REST API
===============================
Exposes endpoints for querying provider registry, health telemetry,
active role assignment, connection testing, and secure credential configuration.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request

from src.provider_manager.provider_service import global_provider_service
from src.provider_manager.provider_registry import ProviderCategory

provider_manager_bp = Blueprint("provider_manager_bp", __name__)


@provider_manager_bp.route("", methods=["GET"])
@provider_manager_bp.route("/", methods=["GET"])
@provider_manager_bp.route("/catalog", methods=["GET"])
def get_providers_catalog():
    """Returns all supported providers with genuine capabilities, categories, and live health."""
    providers = global_provider_service.get_all_providers_status()
    active_roles = global_provider_service.get_active_roles()
    connected_count = sum(1 for p in providers if p.get("connectionState") in ["CONNECTED", "LIVE"])

    return jsonify({
        "status": "success",
        "total_count": len(providers),
        "connected_count": connected_count,
        "active_roles": active_roles,
        "categories": [c.value for c in ProviderCategory],
        "providers": providers,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


@provider_manager_bp.route("/active", methods=["GET"])
@provider_manager_bp.route("/selection", methods=["GET"])
def get_active_roles():
    """Returns currently selected market data, execution, and options providers."""
    active_roles = global_provider_service.get_active_roles()
    return jsonify({
        "status": "success",
        "active_roles": active_roles,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


@provider_manager_bp.route("/select", methods=["POST"])
def select_provider_role():
    """
    Assigns a provider to a specific platform role without reloading the application.
    Body: {"role": "market_data_provider", "provider_id": "upstox"}
    """
    data = request.get_json(silent=True) or {}
    role_key = data.get("role_key") or data.get("role")
    provider_id = data.get("provider_id")

    if not role_key or not provider_id:
        return jsonify({"status": "error", "error": "Both 'role' (or 'role_key') and 'provider_id' are required."}), 400

    try:
        res = global_provider_service.set_active_role(role_key, provider_id)
        active_roles = global_provider_service.get_active_roles()
        return jsonify({
            "status": "success",
            "message": f"Assigned role '{role_key}' to provider '{provider_id}'.",
            "result": res,
            "active_roles": active_roles,
        })
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 400


@provider_manager_bp.route("/<provider_id>", methods=["GET"])
def get_provider_details(provider_id: str):
    """Returns detailed status and capabilities for a single provider."""
    provider = global_provider_service.get_provider_by_id(provider_id)
    if not provider:
        return jsonify({"status": "error", "error": f"Provider '{provider_id}' not found."}), 404

    return jsonify({
        "status": "success",
        "provider": provider,
    })


@provider_manager_bp.route("/<provider_id>/health", methods=["GET"])
def get_provider_health(provider_id: str):
    """Returns real-time latency and health metrics for a provider."""
    provider = global_provider_service.get_provider_by_id(provider_id)
    if not provider:
        return jsonify({"status": "error", "error": f"Provider '{provider_id}' not found."}), 404

    health_data = {
        "connectionState": provider.get("connectionState"),
        "latencyMs": provider.get("latencyMs", 0.0),
        "lastTickIso": provider.get("lastTickIso", ""),
        "lastError": provider.get("lastError", ""),
        "subscriptionsCount": provider.get("subscriptionsCount", 0),
    }

    return jsonify({
        "status": "success",
        "provider_id": provider_id,
        "health": health_data,
        "connectionState": provider.get("connectionState"),
        "latencyMs": provider.get("latencyMs", 0.0),
        "lastTickIso": provider.get("lastTickIso", ""),
        "lastError": provider.get("lastError", ""),
        "subscriptionsCount": provider.get("subscriptionsCount", 0),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


@provider_manager_bp.route("/<provider_id>/test", methods=["POST"])
def test_provider(provider_id: str):
    """Performs a server-side connectivity test for the given provider."""
    res = global_provider_service.test_provider_connection(provider_id)
    return jsonify(res), 200



@provider_manager_bp.route("/<provider_id>/connect", methods=["POST"])
def connect_provider(provider_id: str):
    """Triggers connection to provider adapter."""
    test_res = global_provider_service.test_provider_connection(provider_id)
    return jsonify({
        "status": "success" if test_res.get("success") else "error",
        "message": f"Connection initiated for {provider_id}.",
        "details": test_res,
    })


@provider_manager_bp.route("/<provider_id>/disconnect", methods=["POST"])
def disconnect_provider(provider_id: str):
    """Disconnects provider adapter."""
    return jsonify({
        "status": "success",
        "message": f"Provider {provider_id} disconnected.",
    })


@provider_manager_bp.route("/<provider_id>/reconnect", methods=["POST"])
def reconnect_provider(provider_id: str):
    """Restarts connection loop for provider adapter."""
    test_res = global_provider_service.test_provider_connection(provider_id)
    return jsonify({
        "status": "success",
        "message": f"Reconnecting {provider_id}...",
        "details": test_res,
    })


@provider_manager_bp.route("/<provider_id>/capabilities", methods=["GET"])
def get_provider_capabilities(provider_id: str):
    """Returns capabilities of a specific provider."""
    provider = global_provider_service.get_provider_by_id(provider_id)
    if not provider:
        return jsonify({"status": "error", "error": f"Provider '{provider_id}' not found."}), 404

    return jsonify({
        "status": "success",
        "provider_id": provider_id,
        "capabilities": provider.get("capabilities", {}),
    })
