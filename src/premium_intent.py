"""
Authoritative Premium Intent Specification & Validation Engine
===============================================================
Defines the canonical PremiumIntent schema and validation invariants
guaranteeing deterministic alignment between user intent, strategy execution profiles,
live market quotes, and order routing.
"""

from __future__ import annotations

import enum
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Union


class MarketType(str, enum.Enum):
    INDIAN_EQUITY = "INDIAN_EQUITY"
    INDIAN_INDEX = "INDIAN_INDEX"
    INDIAN_FUTURES = "INDIAN_FUTURES"
    INDIAN_OPTIONS = "INDIAN_OPTIONS"
    CRYPTO_SPOT = "CRYPTO_SPOT"
    CRYPTO_FUTURES = "CRYPTO_FUTURES"
    CRYPTO_OPTIONS = "CRYPTO_OPTIONS"
    FOREX = "FOREX"
    COMMODITIES = "COMMODITIES"


class InstrumentClass(str, enum.Enum):
    EQUITY = "EQUITY"
    FUTURE = "FUTURE"
    OPTION_SINGLE = "OPTION_SINGLE"
    OPTION_MULTI_LEG = "OPTION_MULTI_LEG"
    CRYPTO_SPOT = "CRYPTO_SPOT"
    CRYPTO_FUTURE = "CRYPTO_FUTURE"
    CRYPTO_OPTION = "CRYPTO_OPTION"


class ExpiryMode(str, enum.Enum):
    CURRENT = "CURRENT"
    NEXT = "NEXT"
    NEAREST_WEEKLY = "NEAREST_WEEKLY"
    NEAREST_MONTHLY = "NEAREST_MONTHLY"
    MONTHLY = "MONTHLY"
    CUSTOM = "CUSTOM"
    EXACT = "EXACT"


class StrikeMode(str, enum.Enum):
    ATM = "ATM"
    ITM = "ITM"
    OTM = "OTM"
    FIXED_STRIKE = "FIXED_STRIKE"
    TARGET_PREMIUM = "TARGET_PREMIUM"
    TARGET_DELTA = "TARGET_DELTA"
    CUSTOM = "CUSTOM"


class PremiumMode(str, enum.Enum):
    TARGET_PREMIUM = "TARGET_PREMIUM"
    PREMIUM_RANGE = "PREMIUM_RANGE"
    TARGET_DELTA = "TARGET_DELTA"
    ATM = "ATM"
    ITM = "ITM"
    OTM = "OTM"
    FIXED_STRIKE = "FIXED_STRIKE"
    CUSTOM = "CUSTOM"


class ContractMode(str, enum.Enum):
    DYNAMIC = "DYNAMIC"
    PINNED = "PINNED"


@dataclass
class PremiumIntent:
    market_type: str = MarketType.INDIAN_OPTIONS.value
    underlying: str = "NIFTY"
    exchange: str = "NSE"
    instrument_class: str = InstrumentClass.OPTION_SINGLE.value

    expiry_mode: str = ExpiryMode.CURRENT.value
    selected_expiry: Optional[str] = None

    option_type: str = "CE"  # CE, PE, BOTH, STRADDLE, STRANGLE, SPREAD, CONDOR, etc.

    strike_mode: str = StrikeMode.ATM.value
    selected_strike: Optional[float] = None

    premium_mode: str = PremiumMode.TARGET_PREMIUM.value
    target_premium: Optional[float] = None
    premium_min: Optional[float] = None
    premium_max: Optional[float] = None

    target_delta: Optional[float] = None

    quantity: int = 25
    lots: int = 1
    lot_size: int = 25

    provider: str = "UPSTOX"
    contract_mode: str = ContractMode.DYNAMIC.value

    # Signal vs Execution decoupling
    signal_instrument_class: Optional[str] = None
    signal_underlying: Optional[str] = None

    # Wing width for multi-leg spreads / condors
    strike_gap: Optional[float] = 100.0
    wing_width_strikes: Optional[int] = 1

    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> PremiumIntent:
        if not data:
            return cls()
        valid_keys = cls.__dataclass_fields__.keys()
        filtered = {k: v for k, v in data.items() if k in valid_keys}
        return cls(**filtered)

    def validate(self) -> Tuple[bool, List[str]]:
        """Strict validation of intent invariants."""
        errors = []
        if not self.underlying:
            errors.append("Underlying asset is required.")
        if self.lots <= 0:
            errors.append("Lots must be greater than zero.")
        if self.premium_min is not None and self.premium_max is not None:
            if self.premium_min > self.premium_max:
                errors.append(f"premium_min ({self.premium_min}) cannot exceed premium_max ({self.premium_max}).")
        if self.target_delta is not None and not (0.0 <= abs(self.target_delta) <= 1.0):
            errors.append("target_delta must be between 0.0 and 1.0.")
        return len(errors) == 0, errors
