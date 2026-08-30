"""
API Schemas & Envelope Formatting
=================================
Uniform JSON response envelopes and request schema validation.
"""

from typing import Dict, Any, List, Optional, Generic, TypeVar
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone

T = TypeVar("T")


@dataclass
class ResponseMeta:
    provider: str = "QuantOS-UnifiedData"
    total: int = 0
    page: int = 1
    pageSize: int = 50
    totalPages: int = 1
    exchangeTimestamp: Optional[str] = None
    receivedTimestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    isLive: bool = True
    isStale: bool = False
    quality: str = "LIVE"


@dataclass
class ApiResponseEnvelope:
    success: bool = True
    data: Any = None
    meta: ResponseMeta = field(default_factory=ResponseMeta)
    error: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "data": self.data,
            "meta": asdict(self.meta),
            "error": self.error,
        }


def make_success_response(
    data: Any,
    total: int = 1,
    page: int = 1,
    page_size: int = 50,
    provider: str = "QuantOS-StockEngine",
    is_live: bool = True,
    quality: str = "LIVE",
    exchange_ts: Optional[str] = None
) -> Dict[str, Any]:
    """Generates standardized API envelope for successful responses."""
    total_pages = max(1, (total + page_size - 1) // page_size) if page_size > 0 else 1
    meta = ResponseMeta(
        provider=provider,
        total=total,
        page=page,
        pageSize=page_size,
        totalPages=total_pages,
        exchangeTimestamp=exchange_ts,
        isLive=is_live,
        isStale=quality in ("STALE", "DELAYED"),
        quality=quality
    )
    return ApiResponseEnvelope(success=True, data=data, meta=meta, error=None).to_dict()


def make_error_response(
    message: str,
    code: str = "BAD_REQUEST",
    details: Optional[Dict[str, Any]] = None,
    status_code: int = 400
) -> Dict[str, Any]:
    """Generates standardized API envelope for error responses."""
    meta = ResponseMeta(isLive=False, quality="ERROR")
    error_obj = {
        "code": code,
        "message": message,
        "details": details or {},
        "statusCode": status_code,
    }
    return ApiResponseEnvelope(success=False, data=None, meta=meta, error=error_obj).to_dict()
