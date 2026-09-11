"""
QUANT.OS Application Middleware & Request Validation
=====================================================
Request correlation tracking (X-Request-Id), latency measurement,
security headers injection, and structured request validation.
"""

import time
import uuid
import logging
from typing import Dict, Any, List, Optional, Callable
from functools import wraps
from flask import request, g
from app.errors import ValidationError, InvalidRequestError

logger = logging.getLogger("AppMiddleware")


def setup_middleware(app):
    """Configures request lifecycle middleware on the Flask application."""

    @app.before_request
    def before_request_hook():
        # 1. Establish unique request correlation ID
        request_id = request.headers.get("X-Request-Id") or f"req_{uuid.uuid4().hex[:12]}"
        request.request_id = request_id
        g.request_id = request_id
        g.start_time = time.time()

    @app.after_request
    def after_request_hook(response):
        # 1. Measure total response time
        start_time = getattr(g, "start_time", time.time())
        latency_ms = round((time.time() - start_time) * 1000, 2)
        request_id = getattr(request, "request_id", "")

        # 2. Inject standard headers
        if request_id:
            response.headers["X-Request-Id"] = request_id
        response.headers["X-Response-Time-Ms"] = str(latency_ms)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"

        # 3. Structured access logging (excluding high-frequency health probes in debug)
        if not request.path.endswith(("/health", "/health/live", "/health/ready")):
            logger.info(
                "%s %s %d %0.2fms | ID: %s | IP: %s",
                request.method, request.path, response.status_code, latency_ms,
                request_id, request.remote_addr
            )

        return response


def validate_json_payload(required_fields: Optional[List[str]] = None) -> Callable:
    """Decorator to enforce and validate JSON request payloads on POST/PUT/PATCH."""
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if request.method in ("POST", "PUT", "PATCH"):
                if not request.is_json and request.data:
                    raise InvalidRequestError("Request content-type must be application/json")
                
                data = request.get_json(silent=True)
                if data is None and request.content_length and request.content_length > 0:
                    raise InvalidRequestError("Malformed JSON payload in request body")
                
                if required_fields:
                    data = data or {}
                    missing = [field for field in required_fields if field not in data or data[field] is None]
                    if missing:
                        raise ValidationError(
                            f"Missing required fields: {', '.join(missing)}",
                            details={"missingFields": missing}
                        )
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def validate_order_intent(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Validates order placement / trade intent parameters rigorously."""
    if not isinstance(payload, dict):
        raise ValidationError("Order payload must be a JSON object")

    symbol = payload.get("symbol")
    if not symbol or not isinstance(symbol, str) or len(symbol.strip()) == 0:
        raise ValidationError("Valid 'symbol' string is required for order placement")

    side = str(payload.get("side", "")).upper()
    if side not in ("BUY", "SELL"):
        raise ValidationError(f"Invalid order side '{side}'. Must be 'BUY' or 'SELL'")

    quantity = payload.get("quantity")
    if quantity is None:
        raise ValidationError("Order 'quantity' is required")
    try:
        qty_num = float(quantity)
        if qty_num <= 0:
            raise ValueError()
    except (ValueError, TypeError):
        raise ValidationError(f"Order quantity must be a positive number, got: {quantity}")

    order_type = str(payload.get("order_type", payload.get("orderType", "MARKET"))).upper()
    if order_type not in ("MARKET", "LIMIT", "SL", "SL-M", "STOP_LIMIT"):
        raise ValidationError(f"Invalid order type '{order_type}'")

    if order_type in ("LIMIT", "SL", "STOP_LIMIT"):
        price = payload.get("price")
        if price is None:
            raise ValidationError(f"Price is required for {order_type} orders")
        try:
            px_num = float(price)
            if px_num <= 0:
                raise ValueError()
        except (ValueError, TypeError):
            raise ValidationError(f"Price must be a positive number, got: {price}")

    return payload
