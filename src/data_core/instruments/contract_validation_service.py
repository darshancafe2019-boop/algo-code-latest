"""
Quant.OS Central Contract & Expiry Validation Service
====================================================
Authoritative validator ensuring:
1. Expiry Safety: Full timestamp verification with timezone and settlement metadata via MarketClock.
2. 5 Expiry Risk States: NORMAL (>24h), EXPIRY_APPROACHING (6-24h), EXPIRY_DAY (2-6h), EXPIRY_CRITICAL (<2h), EXPIRED (<=0s).
3. Complete execution blocking on expired contracts with zero silent auto-rollover.
4. Suggests alternative valid expiries from active catalog (D1, D2, W1, W2, M1).
5. Preserves provider-specific settlement times (Delta: 17:30 IST, NSE: 15:30 IST).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple

from src.market_clock import MarketClock
from src.contract_resolver import global_contract_resolver

logger = logging.getLogger("ContractValidationService")


@dataclass
class ExpiryValidationResult:
    """Result of contract and expiry verification."""
    is_valid: bool
    status: str                         # 'NORMAL', 'EXPIRY_APPROACHING', 'EXPIRY_DAY', 'EXPIRY_CRITICAL', 'EXPIRED', 'INACTIVE_IN_CATALOG', 'INVALID_FORMAT'
    expiry: str
    current_date: str
    days_to_expiry: int
    is_blocked: bool
    expiry_date: str = ""
    expiry_time: str = ""
    expiry_timezone: str = "UTC"
    expiry_timestamp: Optional[str] = None
    seconds_to_expiry: float = 0.0
    dte: float = 0.0
    settlement_method: str = "CASH_SETTLED"
    settlement_timestamp: Optional[str] = None
    blocking_reason: Optional[str] = None
    recommended_action: Optional[str] = None
    suggested_expiries: List[str] = field(default_factory=list)

    @property
    def is_expired(self) -> bool:
        return self.status == "EXPIRED" or self.seconds_to_expiry <= 0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# Alias for backwards compatibility
ContractValidationResult = ExpiryValidationResult


class ContractValidationService:
    """Authoritative Contract & Expiry Validation Service."""

    @classmethod
    def resolve_expiry_timestamp(
        cls,
        expiry_str: str,
        provider: str = "UPSTOX",
        underlying: str = "NIFTY",
    ) -> Tuple[datetime, str, str, str]:
        """
        Resolves exact expiry datetime in UTC with timezone & settlement info.
        Returns: (expiry_dt_utc, expiry_time_display, timezone_name, settlement_method)
        """
        prov_upper = (provider or "UPSTOX").upper()
        und_upper = (underlying or "NIFTY").upper()

        cutoff_utc = MarketClock.get_expiry_settlement_cutoff(
            expiry_str, exchange_or_provider=prov_upper, underlying=und_upper
        )

        if "DELTA" in prov_upper or und_upper in ("BTC", "ETH", "SOL", "XRP", "BNB"):
            time_display = "17:30 IST (12:00 UTC)"
            tz_display = "Asia/Kolkata (IST)"
            settlement_method = "CASH_SETTLED_USDT"
        else:
            time_display = "15:30 IST (10:00 UTC)"
            tz_display = "Asia/Kolkata (IST)"
            settlement_method = "CASH_SETTLED_INR"

        return cutoff_utc, time_display, tz_display, settlement_method

    @classmethod
    def validate_expiry(
        cls,
        expiry_str: Optional[str],
        underlying: str = "NIFTY",
        provider: str = "UPSTOX",
        active_catalog_expiries: Optional[List[str]] = None,
        same_day_allowed: bool = False,
        mode: str = "LIVE",
    ) -> ExpiryValidationResult:
        """
        Validates contract expiry date/timestamp against current market time and active catalogs.
        Strictly blocks if secondsToExpiry <= 0.
        """
        prov_upper = (provider or "UPSTOX").upper()
        und_upper = (underlying or "NIFTY").upper()
        today_str = MarketClock.trading_date(prov_upper)

        if not expiry_str or expiry_str.upper() in ("PERPETUAL", "PERP", "NONE", ""):
            return ExpiryValidationResult(
                is_valid=True,
                status="NORMAL",
                expiry=expiry_str or "PERPETUAL",
                current_date=today_str,
                days_to_expiry=999,
                is_blocked=False,
                expiry_date="PERPETUAL",
                expiry_time="N/A",
                expiry_timezone="UTC",
                seconds_to_expiry=99999999.0,
                dte=999.0,
                settlement_method="CONTINUOUS_FUNDING",
            )

        clean_pref = expiry_str.strip().upper()
        if clean_pref in ("AUTO", "CURRENT_WEEK", "NEXT_WEEK", "CURRENT_MONTH", "NEXT_MONTH", "FAR_WEEK", "FAR_MONTH", "NEAREST", "NEXT", "FAR"):
            resolved = global_contract_resolver.resolve_contract(
                broker=provider,
                underlying=underlying,
                expiry_preference=clean_pref,
                mode=mode,
            )
            if not resolved or not resolved.expiry:
                return ExpiryValidationResult(
                    is_valid=False,
                    status="NO_ACTIVE_CONTRACT",
                    expiry=clean_pref,
                    current_date=today_str,
                    days_to_expiry=-999,
                    is_blocked=True,
                    blocking_reason=f"Unable to dynamically resolve valid unexpired contract for {underlying} with preference {clean_pref}.",
                    recommended_action="RESELECT_CONTRACT",
                    suggested_expiries=[e for e in (active_catalog_expiries or []) if e >= today_str][:5],
                )
            clean_expiry = resolved.expiry
        else:
            clean_expiry = expiry_str.strip()[:10]

        try:
            exp_date = datetime.strptime(clean_expiry, "%Y-%m-%d").date()
        except ValueError:
            return ExpiryValidationResult(
                is_valid=False,
                status="INVALID_FORMAT",
                expiry=clean_expiry,
                current_date=today_str,
                days_to_expiry=-999,
                is_blocked=True,
                blocking_reason=f"Invalid date format '{clean_expiry}'. Expected 'YYYY-MM-DD' or dynamic preference (AUTO, CURRENT_WEEK, etc.).",
                recommended_action="RESELECT_CONTRACT",
                suggested_expiries=[e for e in (active_catalog_expiries or []) if e >= today_str][:5],
            )

        expiry_dt_utc, time_display, tz_display, settlement_method = cls.resolve_expiry_timestamp(
            clean_expiry, provider=provider, underlying=underlying
        )

        now_utc = MarketClock.now_utc()
        seconds_diff = (expiry_dt_utc - now_utc).total_seconds()
        dte = max(seconds_diff / 86400.0, 0.0)
        today_date = MarketClock.trading_date_obj(prov_upper)
        days_diff = (exp_date - today_date).days

        # Classify into 5 Canonical Expiry States
        if seconds_diff <= 0 and mode != "BACKTEST":
            available_expiries = active_catalog_expiries or global_contract_resolver.get_available_expiries(
                broker=provider, exchange="NSE" if "NSE" in prov_upper or "UPSTOX" in prov_upper else "DELTA", underlying=underlying, mode=mode
            )
            suggestions = [e for e in available_expiries if e >= today_str][:5]
            return ExpiryValidationResult(
                is_valid=False,
                status="EXPIRED",
                expiry=clean_expiry,
                current_date=today_str,
                days_to_expiry=days_diff,
                is_blocked=True,
                expiry_date=clean_expiry,
                expiry_time=time_display,
                expiry_timezone=tz_display,
                expiry_timestamp=expiry_dt_utc.isoformat(),
                seconds_to_expiry=seconds_diff,
                dte=0.0,
                settlement_method=settlement_method,
                settlement_timestamp=expiry_dt_utc.isoformat(),
                blocking_reason=f"CRITICAL — CONTRACT EXPIRED: Contract expiry timestamp '{expiry_dt_utc.isoformat()}' has elapsed. Current date is {today_str}. Execution strictly blocked.",
                recommended_action="RESELECT_CONTRACT",
                suggested_expiries=suggestions,
            )

        if seconds_diff < 7200:  # < 2 hours
            status_tag = "EXPIRY_CRITICAL"
        elif seconds_diff < 21600 or days_diff == 0:  # 2h - 6h or same day
            status_tag = "EXPIRY_DAY"
        elif seconds_diff <= 86400:  # 6h - 24h
            status_tag = "EXPIRY_APPROACHING"
        else:
            status_tag = "NORMAL"

        # Active catalog check
        if active_catalog_expiries and clean_expiry not in active_catalog_expiries and mode != "BACKTEST":
            return ExpiryValidationResult(
                is_valid=False,
                status="INACTIVE_IN_CATALOG",
                expiry=clean_expiry,
                current_date=today_str,
                days_to_expiry=days_diff,
                is_blocked=True,
                expiry_date=clean_expiry,
                expiry_time=time_display,
                expiry_timezone=tz_display,
                expiry_timestamp=expiry_dt_utc.isoformat(),
                seconds_to_expiry=seconds_diff,
                dte=round(dte, 2),
                settlement_method=settlement_method,
                blocking_reason=f"Expiry '{clean_expiry}' is not an active tradable contract for {underlying} on {provider}.",
                recommended_action="SELECT_ACTIVE_EXPIRY",
                suggested_expiries=[e for e in active_catalog_expiries if e >= today_str][:5],
            )

        # Same-day policy check if restricted
        is_blocked = False
        blocking_reason = None
        if status_tag in ("EXPIRY_DAY", "EXPIRY_CRITICAL") and not same_day_allowed:
            blocking_reason = f"WARNING: Same-day expiry detected ({time_display}, {int(seconds_diff // 3600)}h {(int(seconds_diff % 3600) // 60)}m remaining)."

        return ExpiryValidationResult(
            is_valid=True,
            status=status_tag,
            expiry=clean_expiry,
            current_date=today_str,
            days_to_expiry=days_diff,
            is_blocked=is_blocked,
            expiry_date=clean_expiry,
            expiry_time=time_display,
            expiry_timezone=tz_display,
            expiry_timestamp=expiry_dt_utc.isoformat(),
            seconds_to_expiry=seconds_diff,
            dte=round(dte, 2),
            settlement_method=settlement_method,
            settlement_timestamp=expiry_dt_utc.isoformat(),
            blocking_reason=blocking_reason,
            suggested_expiries=[e for e in (active_catalog_expiries or []) if e > clean_expiry][:5],
        )


global_contract_validation_service = ContractValidationService()
