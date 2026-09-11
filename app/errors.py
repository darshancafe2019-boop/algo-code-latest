"""
QUANT.OS Standardized API Error Handling
=========================================
Authoritative, RFC-compliant error handlers with correct HTTP status codes
and structured, secure error responses. Stack traces and internal secrets
are strictly logged server-side and never exposed to the client.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from flask import jsonify, request, Response
from werkzeug.exceptions import HTTPException

logger = logging.getLogger("AppErrors")


class APIError(Exception):
    """Base API Exception for domain-specific errors."""
    code: str = "INTERNAL_SERVER_ERROR"
    status_code: int = 500
    message: str = "An unexpected error occurred"

    def __init__(
        self,
        message: Optional[str] = None,
        code: Optional[str] = None,
        status_code: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message or self.message)
        if message:
            self.message = message
        if code:
            self.code = code
        if status_code:
            self.status_code = status_code
        self.details = details or {}


class InvalidRequestError(APIError):
    code = "INVALID_REQUEST"
    status_code = 400
    message = "Invalid request payload or parameters"


class AuthenticationError(APIError):
    code = "AUTHENTICATION_FAILED"
    status_code = 401
    message = "Authentication required or invalid credentials"


class AuthorizationError(APIError):
    code = "AUTHORIZATION_DENIED"
    status_code = 403
    message = "Insufficient permissions to perform this action"


class NotFoundError(APIError):
    code = "RESOURCE_NOT_FOUND"
    status_code = 404
    message = "The requested resource was not found"


class ConflictError(APIError):
    code = "CONFLICT"
    status_code = 409
    message = "Resource conflict or duplicate order key"


class ValidationError(APIError):
    code = "VALIDATION_ERROR"
    status_code = 422
    message = "Request validation failed"


class RateLimitExceededError(APIError):
    code = "RATE_LIMIT_EXCEEDED"
    status_code = 429
    message = "Rate limit exceeded. Please back off and retry."


class UpstreamProviderError(APIError):
    code = "UPSTREAM_PROVIDER_FAILURE"
    status_code = 502
    message = "Upstream broker or market data exchange connection failure"


class ServiceUnavailableError(APIError):
    code = "SERVICE_UNAVAILABLE"
    status_code = 503
    message = "Service is temporarily unavailable"


class UpstreamTimeoutError(APIError):
    code = "UPSTREAM_TIMEOUT"
    status_code = 504
    message = "Upstream provider request timed out"


class MarketDataStaleError(APIError):
    code = "MARKET_DATA_STALE"
    status_code = 503
    message = "Market data is stale or provider feed is unavailable"


class RiskBlockedError(APIError):
    code = "RISK_GATE_BLOCKED"
    status_code = 422
    message = "Order blocked by pre-trade risk engine"


def create_error_response(
    code: str,
    message: str,
    status_code: int,
    details: Optional[Dict[str, Any]] = None,
    request_id: Optional[str] = None
) -> Tuple[Response, int]:
    """Generates standardized JSON error response with correct HTTP status code."""
    req_id = request_id or getattr(request, "request_id", None) or f"req_{uuid.uuid4().hex[:12]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    
    payload = {
        "success": False,
        "ok": False,
        "status": "error",
        "error": {
            "code": code,
            "message": message,
            "requestId": req_id,
            "timestamp": now_iso,
            "details": details or {}
        },
        "meta": {
            "timestamp": now_iso,
            "requestId": req_id
        }
    }
    return jsonify(payload), status_code


def register_error_handlers(app):
    """Registers authoritative error handlers on the Flask application."""

    @app.errorhandler(APIError)
    def handle_api_error(e: APIError):
        req_id = getattr(request, "request_id", f"req_{uuid.uuid4().hex[:12]}")
        logger.warning(
            "APIError [%s] %s (HTTP %d) | RequestId: %s | URL: %s %s",
            e.code, e.message, e.status_code, req_id, request.method, request.path
        )
        return create_error_response(
            code=e.code,
            message=e.message,
            status_code=e.status_code,
            details=e.details,
            request_id=req_id
        )

    @app.errorhandler(HTTPException)
    def handle_http_exception(e: HTTPException):
        req_id = getattr(request, "request_id", f"req_{uuid.uuid4().hex[:12]}")
        code_map = {
            400: "BAD_REQUEST",
            401: "UNAUTHORIZED",
            403: "FORBIDDEN",
            404: "NOT_FOUND",
            405: "METHOD_NOT_ALLOWED",
            409: "CONFLICT",
            422: "UNPROCESSABLE_ENTITY",
            429: "RATE_LIMIT_EXCEEDED",
            500: "INTERNAL_SERVER_ERROR",
            502: "BAD_GATEWAY",
            503: "SERVICE_UNAVAILABLE",
            504: "GATEWAY_TIMEOUT",
        }
        error_code = code_map.get(e.code, "HTTP_ERROR")
        return create_error_response(
            code=error_code,
            message=str(e.description or e.name),
            status_code=e.code or 500,
            request_id=req_id
        )

    @app.errorhandler(Exception)
    def handle_unhandled_exception(e: Exception):
        req_id = getattr(request, "request_id", f"req_{uuid.uuid4().hex[:12]}")
        logger.error(
            "Unhandled Exception [500] | RequestId: %s | Path: %s %s | Error: %s",
            req_id, request.method, request.path, e,
            exc_info=True
        )
        # Never expose internal traceback or secrets to client
        return create_error_response(
            code="INTERNAL_SERVER_ERROR",
            message="An internal server error occurred. Please contact the administrator.",
            status_code=500,
            details={"requestId": req_id},
            request_id=req_id
        )
