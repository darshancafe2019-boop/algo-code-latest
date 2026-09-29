"""
Quant.OS Central Dynamic Contract Resolver & Lifecycle Manager
==============================================================
Authoritative central service responsible for:
1. Dynamic contract discovery across all brokers & market data providers (Upstox, Delta, Binance, Dhan, etc.)
2. Strict filtering of expired contracts (expiry < current trading date in exchange timezone).
3. Expiry preference resolution: AUTO, CURRENT_WEEK, NEXT_WEEK, CURRENT_MONTH, NEXT_MONTH, FAR_WEEK, FAR_MONTH, NEAREST, NEXT, FAR, MANUAL.
4. Normalizing contract metadata: instrument_key, canonical_instrument_id, trading_symbol, underlying, expiry, lot_size, tick_size, freeze_quantity, status.
5. In-memory TTL caching with mandatory date and expiry validation on EVERY read.
6. Separation of LIVE / PAPER dynamic resolution from historical BACKTEST fixtures.
7. Separation of NEW ENTRY CONTRACT resolution from EXISTING POSITION CONTRACT monitoring (Zero silent auto-roll).
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, date, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple, Union

from src.market_clock import MarketClock

logger = logging.getLogger("ContractResolver")


class ContractStatus(str, Enum):
    DISCOVERED = "DISCOVERED"
    VALID = "VALID"
    SELECTED = "SELECTED"
    ACTIVE = "ACTIVE"
    NEAR_EXPIRY = "NEAR_EXPIRY"
    EXPIRED = "EXPIRED"
    INVALID = "INVALID"


class ExpiryPreference(str, Enum):
    AUTO = "AUTO"
    CURRENT_WEEK = "CURRENT_WEEK"
    NEXT_WEEK = "NEXT_WEEK"
    CURRENT_MONTH = "CURRENT_MONTH"
    NEXT_MONTH = "NEXT_MONTH"
    FAR_WEEK = "FAR_WEEK"
    FAR_MONTH = "FAR_MONTH"
    NEAREST = "NEAREST"
    NEXT = "NEXT"
    FAR = "FAR"
    MANUAL = "MANUAL"


@dataclass
class ResolvedContract:
    """Authoritative normalized derivative contract structure."""
    instrument_key: str
    canonical_instrument_id: str
    trading_symbol: str
    underlying: str
    expiry: str  # YYYY-MM-DD or PERPETUAL
    instrument_type: str  # FUTURE | OPTION_CE | OPTION_PE | SPOT | PERPETUAL
    exchange: str  # NSE | DELTA | BINANCE | BSE
    broker: str  # UPSTOX | DELTA_EXCHANGE | DHAN | PAPER
    lot_size: float = 1.0
    tick_size: float = 0.05
    freeze_quantity: Optional[float] = None
    strike: Optional[float] = None
    option_type: Optional[str] = None  # CE | PE
    status: ContractStatus = ContractStatus.ACTIVE
    days_to_expiry: int = 0
    seconds_to_expiry: float = 0.0
    settlement_cutoff_utc: Optional[str] = None
    raw_metadata: Dict[str, Any] = field(default_factory=dict)
    is_valid: bool = True
    error_message: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["status"] = self.status.value if isinstance(self.status, ContractStatus) else str(self.status)
        return d


@dataclass
class ContractValidationResult:
    valid: bool
    status: ContractStatus
    code: str
    message: str
    contract: Optional[ResolvedContract] = None
    suggested_expiries: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "valid": self.valid,
            "status": self.status.value if isinstance(self.status, ContractStatus) else str(self.status),
            "code": self.code,
            "message": self.message,
            "contract": self.contract.to_dict() if self.contract else None,
            "suggested_expiries": self.suggested_expiries,
        }


class CentralContractResolver:
    """Central dynamic contract discovery and expiry resolution service."""

    def __init__(self, cache_ttl_seconds: float = 300.0):
        self._cache_ttl = cache_ttl_seconds
        self._cache: Dict[str, Tuple[float, str, Any]] = {}  # key -> (timestamp, cache_date, data)

    def _get_cache(self, key: str, current_date: str) -> Optional[Any]:
        """Retrieves cached data only if timestamp is fresh AND date matches today."""
        entry = self._cache.get(key)
        if not entry:
            return None
        ts, cached_date, data = entry
        now = time.time()
        if (now - ts < self._cache_ttl) and (cached_date == current_date):
            return data
        return None

    def _set_cache(self, key: str, current_date: str, data: Any) -> None:
        self._cache[key] = (time.time(), current_date, data)

    def clear_cache(self) -> None:
        """Flushes the contract resolution cache."""
        self._cache.clear()

    # =========================================================================
    # CONTRACT DISCOVERY & FETCHING
    # =========================================================================

    def get_available_contracts(
        self,
        broker: str = "UPSTOX",
        exchange: str = "NSE",
        underlying: str = "NIFTY",
        instrument_type: str = "FUTURE",
        mode: str = "LIVE",
    ) -> List[Dict[str, Any]]:
        """
        Retrieves raw active contract metadata for a given underlying from the specified broker/provider.
        Automatically filters out contracts where expiry < current_date (unless mode == 'BACKTEST').
        """
        b_upper = (broker or "UPSTOX").upper().strip()
        e_upper = (exchange or "NSE").upper().strip()
        u_clean = (underlying or "NIFTY").upper().strip()
        i_upper = (instrument_type or "FUTURE").upper().strip()

        if ":" in u_clean:
            parts = [p.strip() for p in u_clean.split(":") if p.strip()]
            if len(parts) >= 2 and parts[0] in ("NSE", "BSE", "NFO", "BFO", "MCX", "DELTA", "BINANCE", "UPSTOX"):
                e_upper = parts[0]
                u_clean = parts[1]
                if len(parts) >= 4:
                    i_upper = "FUTURE" if parts[3] in ("FUT", "FUTURE") else "OPTION" if parts[3] in ("OPT", "OPTION") else parts[3]
            elif len(parts) == 2:
                e_upper = parts[0]
                u_clean = parts[1]

        if ":" in e_upper:
            e_upper = e_upper.split(":")[0].strip()

        curr_date = MarketClock.trading_date(e_upper)
        cache_key = f"contracts:{b_upper}:{e_upper}:{u_clean}:{i_upper}:{mode}"
        cached = self._get_cache(cache_key, curr_date)
        if cached is not None:
            return cached

        contracts: List[Dict[str, Any]] = []

        # 1. Delta Exchange / Crypto Options & Futures
        if "DELTA" in b_upper or u_clean in ("BTC", "ETH", "SOL", "XRP", "BNB"):
            try:
                from src.delta_options_client import DeltaOptionsClient
                client = DeltaOptionsClient()
                products = client.get_products()
                for p in products:
                    sym = p.get("symbol", "")
                    und_sym = (p.get("underlying_asset", {}).get("symbol") or "").upper()
                    settle_time = p.get("settlement_time") or ""
                    exp_date = settle_time[:10] if settle_time else "PERPETUAL"
                    contract_type = p.get("contract_type", "").upper()

                    if und_sym != u_clean and not sym.startswith(f"C-{u_clean}") and not sym.startswith(f"P-{u_clean}") and not sym.startswith(f"MV-{u_clean}") and not sym.startswith(f"{u_clean}USD"):
                        continue

                    # Determine instrument type
                    is_opt = "OPTION" in contract_type or sym.startswith("C-") or sym.startswith("P-") or sym.startswith("MV-")
                    is_fut = "FUTURES" in contract_type or "PERPETUAL" in contract_type

                    if "OPTION" in i_upper and not is_opt:
                        continue
                    if "FUT" in i_upper and not is_fut:
                        continue

                    # Filter expired in LIVE/PAPER mode
                    if mode != "BACKTEST" and exp_date != "PERPETUAL" and MarketClock.is_contract_expired(exp_date, exchange_or_provider="DELTA", underlying=u_clean):
                        continue

                    contracts.append({
                        "instrument_key": str(p.get("id", sym)),
                        "symbol": sym,
                        "trading_symbol": sym,
                        "underlying_symbol": u_clean,
                        "expiry": exp_date,
                        "settlement_time": settle_time,
                        "strike_price": float(p.get("strike_price") or 0.0),
                        "option_type": "CE" if (sym.startswith("C-") or "CALL" in contract_type) else "PE" if (sym.startswith("P-") or "PUT" in contract_type) else None,
                        "lot_size": float(p.get("contract_value", 1.0) or 1.0),
                        "tick_size": float(p.get("tick_size", 0.1) or 0.1),
                        "exchange": "DELTA",
                        "broker": "DELTA_EXCHANGE",
                        "segment": "CRYPTO_OPTIONS" if is_opt else "CRYPTO_FUTURES",
                    })
            except Exception as e:
                logger.warning("Delta contract fetch error: %s", e)

        # 2. Upstox Indian Futures & Options
        elif e_upper in ("NSE", "BSE", "NSE_FO") or b_upper in ("UPSTOX", "DHAN", "ZERODHA", "ANGELONE", "PAPER"):
            try:
                from src.upstox_service import _UPSTOX_FUTURES_BY_UNDERLYING, UpstoxService
                # Futures
                if "FUT" in i_upper:
                    raw_futs = _UPSTOX_FUTURES_BY_UNDERLYING.get(u_clean, [])
                    for f in raw_futs:
                        exp = f.get("expiry") or ""
                        if mode != "BACKTEST" and exp and MarketClock.is_contract_expired(exp, exchange_or_provider=b_upper, underlying=u_clean):
                            continue
                        contracts.append({
                            "instrument_key": f.get("instrument_key"),
                            "symbol": f.get("symbol"),
                            "trading_symbol": f.get("trading_symbol"),
                            "underlying_symbol": u_clean,
                            "expiry": exp,
                            "strike_price": 0.0,
                            "option_type": None,
                            "lot_size": float(f.get("lot_size", 1.0) or 1.0),
                            "tick_size": float(f.get("tick_size", 0.05) or 0.05),
                            "exchange": "NSE",
                            "broker": b_upper,
                            "segment": "NSE_FO",
                        })
                # Options
                elif "OPT" in i_upper:
                    upstox_svc = UpstoxService()
                    raw_opts = upstox_svc.get_option_contracts(u_clean)
                    for o in raw_opts:
                        exp = str(o.get("expiry") or "")[:10]
                        if mode != "BACKTEST" and exp and MarketClock.is_contract_expired(exp, exchange_or_provider=b_upper, underlying=u_clean):
                            continue
                        opt_type = str(o.get("instrument_type") or "").upper()
                        if opt_type == "CALL":
                            opt_type = "CE"
                        elif opt_type == "PUT":
                            opt_type = "PE"

                        contracts.append({
                            "instrument_key": o.get("instrument_key"),
                            "symbol": o.get("trading_symbol") or o.get("symbol"),
                            "trading_symbol": o.get("trading_symbol") or o.get("symbol"),
                            "underlying_symbol": u_clean,
                            "expiry": exp,
                            "strike_price": float(o.get("strike_price") or 0.0),
                            "option_type": opt_type,
                            "lot_size": float(o.get("lot_size", 1.0) or 1.0),
                            "tick_size": float(o.get("tick_size", 0.05) or 0.05),
                            "exchange": "NSE",
                            "broker": b_upper,
                            "segment": "NSE_FO",
                        })
            except Exception as e:
                logger.warning("Upstox contract fetch error: %s", e)

        self._set_cache(cache_key, curr_date, contracts)
        return contracts

    def get_available_expiries(
        self,
        broker: str = "UPSTOX",
        exchange: str = "NSE",
        underlying: str = "NIFTY",
        instrument_type: str = "FUTURE",
        mode: str = "LIVE",
    ) -> List[str]:
        """Returns sorted, deduplicated, unexpired expiry dates for the underlying."""
        contracts = self.get_available_contracts(
            broker=broker, exchange=exchange, underlying=underlying, instrument_type=instrument_type, mode=mode
        )
        expiries = sorted(list(set(c["expiry"] for c in contracts if c.get("expiry"))))
        return expiries

    # =========================================================================
    # CONTRACT RESOLUTION LOGIC
    # =========================================================================

    def resolve_contract(
        self,
        broker: str = "UPSTOX",
        exchange: str = "NSE",
        underlying: str = "NIFTY",
        instrument_type: str = "FUTURE",
        expiry_preference: Union[ExpiryPreference, str] = ExpiryPreference.AUTO,
        target_expiry: Optional[str] = None,
        strike: Optional[Union[float, int, str]] = None,
        option_type: Optional[str] = None,
        symbol: Optional[str] = None,
        mode: str = "LIVE",
    ) -> ResolvedContract:
        """
        Authoritative contract resolver selecting a valid, unexpired contract matching preference.
        Guarantees that expired contracts are rejected and never returned as valid in LIVE/PAPER mode.
        """
        b_upper = (broker or "UPSTOX").upper().strip()
        e_upper = (exchange or "NSE").upper().strip()
        u_clean = (underlying or "NIFTY").upper().strip()
        i_upper = (instrument_type or "FUTURE").upper().strip()
        curr_date = MarketClock.trading_date(e_upper)

        pref_str = str(expiry_preference.value if isinstance(expiry_preference, ExpiryPreference) else expiry_preference).upper().strip()

        # Parse compound canonical symbols (e.g. "NSE:NIFTY:AUTO:FUT", "NSE:NIFTY")
        if ":" in u_clean:
            parts = [p.strip() for p in u_clean.split(":") if p.strip()]
            if len(parts) >= 2 and parts[0] in ("NSE", "BSE", "NFO", "BFO", "MCX", "DELTA", "BINANCE", "UPSTOX"):
                e_upper = parts[0]
                u_clean = parts[1]
                if len(parts) >= 3 and parts[2] in [e.value for e in ExpiryPreference] + ["AUTO", "PERPETUAL", "SPOT"]:
                    pref_str = parts[2]
                if len(parts) >= 4:
                    i_upper = "FUTURE" if parts[3] in ("FUT", "FUTURE") else "OPTION" if parts[3] in ("OPT", "OPTION") else parts[3]
            elif len(parts) == 2:
                e_upper = parts[0]
                u_clean = parts[1]

        if ":" in e_upper:
            e_upper = e_upper.split(":")[0].strip()
        if i_upper in ("SPOT", "PERPETUAL", "CRYPTO_PERP") or pref_str in ("PERPETUAL", "PERP"):
            return ResolvedContract(
                instrument_key=f"{e_upper}:{u_clean}USDT" if "CRYPTO" in i_upper or u_clean in ("BTC", "ETH") else f"{e_upper}:{u_clean}",
                canonical_instrument_id=f"{e_upper}:{u_clean}:PERPETUAL" if "PERP" in i_upper else f"{e_upper}:{u_clean}:SPOT",
                trading_symbol=f"{u_clean} PERP" if "PERP" in i_upper else u_clean,
                underlying=u_clean,
                expiry="PERPETUAL",
                instrument_type=i_upper,
                exchange=e_upper,
                broker=b_upper,
                lot_size=1.0,
                tick_size=0.01 if "CRYPTO" in i_upper else 0.05,
                status=ContractStatus.ACTIVE,
                days_to_expiry=9999,
                seconds_to_expiry=999999999.0,
                is_valid=True,
            )

        contracts = self.get_available_contracts(
            broker=b_upper, exchange=e_upper, underlying=u_clean, instrument_type=i_upper, mode=mode
        )

        if not contracts:
            err = f"CONTRACT_RESOLUTION_FAILED: No active derivative contracts found for {u_clean} on {b_upper} ({e_upper})."
            logger.warning(err)
            return ResolvedContract(
                instrument_key="",
                canonical_instrument_id="",
                trading_symbol=f"{u_clean} INVALID",
                underlying=u_clean,
                expiry="",
                instrument_type=i_upper,
                exchange=e_upper,
                broker=b_upper,
                status=ContractStatus.INVALID,
                is_valid=False,
                error_message=err,
            )

        # 1. Filter by Option Type / Strike if specified
        target_opt = None
        if option_type:
            target_opt = "CE" if option_type.upper() in ("CE", "CALL") else "PE" if option_type.upper() in ("PE", "PUT") else None

        filtered = contracts
        if target_opt:
            filtered = [c for c in filtered if c.get("option_type") == target_opt]

        target_strike = None
        if strike is not None:
            try:
                target_strike = float(strike)
                filtered = [c for c in filtered if abs(float(c.get("strike_price", 0.0)) - target_strike) < 0.01]
            except (ValueError, TypeError):
                pass

        if not filtered:
            filtered = contracts

        # 2. Extract and sort unique available expiries
        expiries = sorted(list(set(c["expiry"] for c in filtered if c.get("expiry"))))

        # 3. Resolve Expiry based on Preference
        selected_expiry = None

        if pref_str == "MANUAL" and target_expiry:
            clean_target = target_expiry.strip()[:10]
            if clean_target in expiries:
                selected_expiry = clean_target
            elif mode == "BACKTEST":
                selected_expiry = clean_target
            else:
                err = f"CRITICAL — CONTRACT EXPIRED OR INVALID: Target expiry '{clean_target}' is not active or has elapsed (Available: {expiries[:5]})."
                return ResolvedContract(
                    instrument_key="",
                    canonical_instrument_id="",
                    trading_symbol=f"{u_clean} EXPIRED",
                    underlying=u_clean,
                    expiry=clean_target,
                    instrument_type=i_upper,
                    exchange=e_upper,
                    broker=b_upper,
                    status=ContractStatus.EXPIRED,
                    is_valid=False,
                    error_message=err,
                )

        elif pref_str in ("AUTO", "NEAREST", "CURRENT_WEEK"):
            # Select first unexpired contract
            selected_expiry = expiries[0] if expiries else None

        elif pref_str in ("NEXT", "NEXT_WEEK"):
            # Select second unexpired contract if available, else first
            selected_expiry = expiries[1] if len(expiries) > 1 else expiries[0] if expiries else None

        elif pref_str in ("CURRENT_MONTH", "MONTHLY"):
            # Select the last expiry of the current month
            now_month = curr_date[:7]
            curr_month_exps = [e for e in expiries if e.startswith(now_month)]
            selected_expiry = curr_month_exps[-1] if curr_month_exps else (expiries[0] if expiries else None)

        elif pref_str in ("NEXT_MONTH", "FAR"):
            # Select the last expiry of next month
            # compute next month YYYY-MM
            y, m = int(curr_date[:4]), int(curr_date[5:7])
            next_m = m + 1 if m < 12 else 1
            next_y = y if m < 12 else y + 1
            next_month_str = f"{next_y:04d}-{next_m:02d}"
            next_month_exps = [e for e in expiries if e.startswith(next_month_str)]
            selected_expiry = next_month_exps[-1] if next_month_exps else (expiries[-1] if expiries else None)

        elif pref_str in ("FAR_WEEK", "FAR_MONTH"):
            selected_expiry = expiries[-1] if expiries else None

        else:
            selected_expiry = expiries[0] if expiries else None

        if not selected_expiry:
            err = f"CONTRACT_RESOLUTION_FAILED: Could not find valid unexpired contract matching preference '{pref_str}' for {u_clean}."
            return ResolvedContract(
                instrument_key="",
                canonical_instrument_id="",
                trading_symbol=f"{u_clean} UNRESOLVED",
                underlying=u_clean,
                expiry="",
                instrument_type=i_upper,
                exchange=e_upper,
                broker=b_upper,
                status=ContractStatus.INVALID,
                is_valid=False,
                error_message=err,
            )

        # 4. Find the matching contract in filtered set
        matched_candidates = [c for c in filtered if c.get("expiry") == selected_expiry]
        if not matched_candidates:
            matched_candidates = [c for c in contracts if c.get("expiry") == selected_expiry]

        selected_match = matched_candidates[0] if matched_candidates else {}

        # 5. Compute Time to Expiry and Status
        days_to_exp, sec_to_exp = MarketClock.get_days_and_seconds_to_expiry(
            selected_expiry, exchange_or_provider=e_upper, underlying=u_clean
        )
        cutoff_dt = MarketClock.get_expiry_settlement_cutoff(
            selected_expiry, exchange_or_provider=e_upper, underlying=u_clean
        )

        if sec_to_exp <= 0 and mode != "BACKTEST":
            status = ContractStatus.EXPIRED
            is_valid = False
            err = f"CRITICAL — CONTRACT EXPIRED: Contract '{selected_match.get('trading_symbol')}' expired at {cutoff_dt.isoformat()}."
        elif sec_to_exp < 7200:
            status = ContractStatus.NEAR_EXPIRY
            is_valid = True
            err = None
        else:
            status = ContractStatus.ACTIVE
            is_valid = True
            err = None

        ik = str(selected_match.get("instrument_key") or f"{e_upper}:{selected_match.get('symbol')}")
        ts = str(selected_match.get("trading_symbol") or selected_match.get("symbol") or f"{u_clean} {selected_expiry}")
        lot = float(selected_match.get("lot_size", 1.0) or 1.0)
        tick = float(selected_match.get("tick_size", 0.05) or 0.05)
        stk = selected_match.get("strike_price")
        opt = selected_match.get("option_type")

        # Canonical ID construction
        if "FUT" in i_upper:
            canon_id = f"{e_upper}:{u_clean}:{selected_expiry}:FUT"
        elif opt and stk:
            canon_id = f"{e_upper}:{u_clean}:{selected_expiry}:{int(stk) if float(stk).is_integer() else stk}:{opt}"
        else:
            canon_id = f"{e_upper}:{ts.replace(' ', '')}"

        return ResolvedContract(
            instrument_key=ik,
            canonical_instrument_id=canon_id,
            trading_symbol=ts,
            underlying=u_clean,
            expiry=selected_expiry,
            instrument_type=i_upper,
            exchange=e_upper,
            broker=b_upper,
            lot_size=lot,
            tick_size=tick,
            strike=stk,
            option_type=opt,
            status=status,
            days_to_expiry=days_to_exp,
            seconds_to_expiry=sec_to_exp,
            settlement_cutoff_utc=cutoff_dt.isoformat(),
            raw_metadata=selected_match,
            is_valid=is_valid,
            error_message=err,
        )

    def validate_contract_expiry(
        self,
        contract_or_expiry: Optional[Union[ResolvedContract, str]] = None,
        exchange: str = "NSE",
        broker: str = "UPSTOX",
        underlying: str = "NIFTY",
        instrument_type: str = "FUT",
        mode: str = "LIVE",
        contract_key: Optional[str] = None,
        expiry_str: Optional[str] = None,
        **kwargs,
    ) -> ContractValidationResult:
        """
        Validates contract existence, status, and expiry against market calendar.
        Strictly blocks execution if expired or invalid.
        """
        raw_val = expiry_str or contract_or_expiry or kwargs.get("expiry")
        exp_str = raw_val.expiry if isinstance(raw_val, ResolvedContract) else str(raw_val or "")
        exp_str = exp_str.strip()

        if not exp_str or exp_str.upper() in ("PERPETUAL", "PERP", "SPOT"):
            return ContractValidationResult(
                valid=True,
                status=ContractStatus.ACTIVE,
                code="CONTRACT_VALID_PERPETUAL",
                message="Perpetual/Spot instrument verified. No expiration cutoff applies.",
            )

        e_upper = (exchange or "NSE").upper()
        b_upper = (broker or "UPSTOX").upper()
        u_clean = (underlying or "NIFTY").upper()

        # Dynamic preference resolution
        if exp_str.upper() in ("AUTO", "CURRENT_WEEK", "NEXT_WEEK", "CURRENT_MONTH", "NEXT_MONTH", "FAR_MONTH", "NEAREST", "NEXT", "FAR"):
            resolved = self.resolve_contract(
                broker=b_upper,
                exchange=e_upper,
                underlying=u_clean,
                instrument_type=instrument_type,
                expiry_preference=exp_str.upper(),
                mode=mode,
            )
            if not resolved or not resolved.is_valid:
                return ContractValidationResult(
                    valid=False,
                    status=ContractStatus.INVALID,
                    code="CONTRACT_RESOLUTION_FAILED",
                    message=f"Unable to resolve dynamic contract for {u_clean} with preference {exp_str}.",
                    suggested_expiries=self.get_available_expiries(broker=b_upper, exchange=e_upper, underlying=u_clean, mode=mode)[:5],
                )
            return ContractValidationResult(
                valid=True,
                status=resolved.status,
                code="CONTRACT_VALID_DYNAMIC",
                message=f"Dynamic contract resolved to '{resolved.expiry}' ({resolved.days_to_expiry} days remaining).",
                suggested_expiries=self.get_available_expiries(broker=b_upper, exchange=e_upper, underlying=u_clean, mode=mode)[:5],
                contract=resolved,
            )

        clean_exp = exp_str[:10]
        days_to_exp, sec_to_exp = MarketClock.get_days_and_seconds_to_expiry(
            clean_exp, exchange_or_provider=e_upper, underlying=u_clean
        )

        available_expiries = self.get_available_expiries(
            broker=b_upper, exchange=e_upper, underlying=u_clean, mode=mode
        )

        if sec_to_exp <= 0 and mode != "BACKTEST":
            msg = f"CRITICAL — CONTRACT EXPIRED: Contract cycle '{clean_exp}' has elapsed. Execution strictly blocked."
            return ContractValidationResult(
                valid=False,
                status=ContractStatus.EXPIRED,
                code="CONTRACT_EXPIRED",
                message=msg,
                suggested_expiries=available_expiries[:5],
            )

        if available_expiries and clean_exp not in available_expiries and mode != "BACKTEST":
            msg = f"CONTRACT_INVALID: Expiry '{clean_exp}' is not in active broker catalog for {u_clean} on {b_upper}."
            return ContractValidationResult(
                valid=False,
                status=ContractStatus.INVALID,
                code="CONTRACT_NOT_IN_CATALOG",
                message=msg,
                suggested_expiries=available_expiries[:5],
            )

        status = ContractStatus.NEAR_EXPIRY if sec_to_exp < 7200 else ContractStatus.ACTIVE
        return ContractValidationResult(
            valid=True,
            status=status,
            code="CONTRACT_VALID",
            message=f"Contract cycle '{clean_exp}' is active and valid ({days_to_exp} days remaining).",
            suggested_expiries=available_expiries[:5],
        )


# Global singleton instance
global_contract_resolver = CentralContractResolver()
