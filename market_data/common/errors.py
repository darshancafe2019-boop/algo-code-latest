"""
Standard Domain Errors
======================
Standard domain errors for the Quant.OS market data architecture.
"""

from typing import Optional, Any, Dict


class MarketDataError(Exception):
    """Base exception for all market data domain errors."""
    def __init__(self, message: str, code: str = "MARKET_DATA_ERROR", details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "code": self.code,
            "message": self.message,
            "details": self.details,
        }


class InstrumentNotFoundError(MarketDataError):
    def __init__(self, instrument_id: str):
        super().__init__(
            message=f"Instrument '{instrument_id}' was not found in catalog.",
            code="INSTRUMENT_NOT_FOUND",
            details={"instrument_id": instrument_id}
        )


class ProviderUnavailableError(MarketDataError):
    def __init__(self, provider_id: str, reason: str = "Provider disconnected or rate limited"):
        super().__init__(
            message=f"Provider '{provider_id}' is unavailable: {reason}",
            code="PROVIDER_UNAVAILABLE",
            details={"provider_id": provider_id, "reason": reason}
        )


class InvalidFilterError(MarketDataError):
    def __init__(self, filter_name: str, value: Any, reason: str):
        super().__init__(
            message=f"Invalid filter parameter '{filter_name}' with value '{value}': {reason}",
            code="INVALID_FILTER",
            details={"filter_name": filter_name, "value": value, "reason": reason}
        )


class DataQualityError(MarketDataError):
    def __init__(self, instrument_id: str, reason: str):
        super().__init__(
            message=f"Data quality violation for '{instrument_id}': {reason}",
            code="DATA_QUALITY_VIOLATION",
            details={"instrument_id": instrument_id, "reason": reason}
        )
