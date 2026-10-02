"""
Canonical Instrument Model & Authoritative Resolver.
====================================================
Provides deterministic resolution from category/query/alias -> structured Canonical Instrument / InstrumentRef.
Enforces:
1. Canonical InstrumentRef data model across all runtime systems.
2. Centralized OptionContractNormalizer for Indian NSE and Crypto options.
3. FuturesResolver with strict expiry validation (blocking expired contracts like March 2026 futures on Sep 2026).
4. Strict contract expiry validation & automated rollover policy engine (NONE, NEXT_VALID_EXPIRY, STRATEGY_RESOLVE).
5. Explicit separation of Signal Instrument (underlying spot/index for indicators) from Execution Instrument (option/future contract for orders & PnL).
"""

from __future__ import annotations

import enum
import logging
import os
import re
from datetime import date, datetime, timezone, timedelta
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional, Tuple, Union

logger = logging.getLogger("InstrumentResolver")


class AssetClass(str, enum.Enum):
    CRYPTO = "CRYPTO"
    EQUITY = "EQUITY"
    INDIAN_STOCKS = "INDIAN_STOCKS"
    US_STOCKS = "US_STOCKS"
    FOREX = "FOREX"
    COMMODITIES = "COMMODITIES"
    INDEX = "INDEX"
    FUTURE = "FUTURE"
    OPTION = "OPTION"
    CRYPTO_SPOT = "CRYPTO_SPOT"
    CRYPTO_PERPETUAL = "CRYPTO_PERPETUAL"


class InstrumentType(str, enum.Enum):
    SPOT = "SPOT"
    PERPETUAL = "PERPETUAL"
    DATED_FUTURE = "DATED_FUTURE"
    OPTION = "OPTION"
    INDEX = "INDEX"


class ResolutionStatus(str, enum.Enum):
    RESOLVED = "RESOLVED"
    AMBIGUOUS = "AMBIGUOUS"
    UNSUPPORTED = "UNSUPPORTED"
    NOT_FOUND = "NOT_FOUND"
    CATEGORY_ONLY = "CATEGORY_ONLY"
    INACTIVE = "INACTIVE"
    EXPIRED = "EXPIRED"


@dataclass
class InstrumentRef:
    """Canonical Unified Instrument Reference."""
    provider: str
    exchange: str
    asset_class: str  # EQUITY, INDEX, FUTURE, OPTION, CRYPTO_SPOT, CRYPTO_PERPETUAL
    underlying: str
    provider_instrument_key: str
    trading_symbol: str

    expiry: Optional[str] = None
    strike: Optional[float] = None
    option_type: Optional[str] = None  # "CE", "PE", "CALL", "PUT"

    lot_size: float = 1.0
    tick_size: float = 0.05

    display_name: str = ""
    currency: str = "USD"
    tradable: bool = True
    data_supported: bool = True
    execution_supported: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    def to_canonical(self) -> "CanonicalInstrument":
        inst_type = InstrumentType.SPOT
        if self.asset_class in ("OPTION", "INDIAN_OPTIONS", "CRYPTO_OPTIONS") or self.option_type:
            inst_type = InstrumentType.OPTION
        elif self.asset_class in ("FUTURE", "INDIAN_FUTURES", "DATED_FUTURE"):
            inst_type = InstrumentType.DATED_FUTURE
        elif self.asset_class in ("CRYPTO_PERPETUAL", "PERPETUAL"):
            inst_type = InstrumentType.PERPETUAL
        elif self.asset_class in ("INDEX", "INDIAN_INDICES"):
            inst_type = InstrumentType.INDEX

        try:
            ac_enum = AssetClass(self.asset_class)
        except Exception:
            ac_enum = AssetClass.INDIAN_STOCKS if self.exchange == "NSE" or self.currency == "INR" else AssetClass.CRYPTO

        return CanonicalInstrument(
            instrument_id=self.provider_instrument_key or f"{self.exchange}:{self.trading_symbol}",
            asset_class=ac_enum,
            instrument_type=inst_type,
            provider=self.provider,
            exchange=self.exchange,
            base_asset=self.underlying,
            quote_asset=self.currency,
            canonical_symbol=self.trading_symbol,
            provider_symbol=self.provider_instrument_key,
            exchange_symbol=self.trading_symbol,
            tick_size=self.tick_size,
            quantity_step=self.lot_size,
            lot_size=self.lot_size,
            tradable=self.tradable,
            data_supported=self.data_supported,
            execution_supported=self.execution_supported,
            expiry=self.expiry,
            strike=self.strike,
            option_type=self.option_type,
            settlement_asset=self.currency,
            metadata=self.metadata,
        )


@dataclass
class CanonicalInstrument:
    instrument_id: str  # e.g., "BINANCE:BTCUSDT:SPOT" or "BINANCE:BTCUSDT:PERPETUAL"
    asset_class: AssetClass
    instrument_type: InstrumentType
    provider: str  # e.g., "binance_spot", "binance_futures", "deribit", "zerodha", "upstox"
    exchange: str  # e.g., "BINANCE", "DERIBIT", "NSE", "DELTA"
    base_asset: str  # e.g., "BTC", "ETH", "RELIANCE", "NIFTY"
    quote_asset: str  # e.g., "USDT", "INR", "USD"
    canonical_symbol: str  # e.g., "BTC/USDT", "BTC/USDT:USDT"
    provider_symbol: str  # e.g., "BTC/USDT", "BTCUSDT"
    exchange_symbol: str  # e.g., "BTCUSDT"
    tick_size: float = 0.01
    quantity_step: float = 0.00001
    lot_size: float = 1.0
    tradable: bool = True
    data_supported: bool = True
    execution_supported: bool = True
    expiry: Optional[str] = None  # e.g. "2026-03-27"
    strike: Optional[float] = None
    option_type: Optional[str] = None  # "CALL" | "PUT" | "CE" | "PE"
    contract_type: str = "VANILLA"
    settlement_asset: str = "USDT"
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "instrument_id": self.instrument_id,
            "asset_class": self.asset_class.value if hasattr(self.asset_class, 'value') else str(self.asset_class),
            "instrument_type": self.instrument_type.value if hasattr(self.instrument_type, 'value') else str(self.instrument_type),
            "provider": self.provider,
            "exchange": self.exchange,
            "base_asset": self.base_asset,
            "quote_asset": self.quote_asset,
            "canonical_symbol": self.canonical_symbol,
            "provider_symbol": self.provider_symbol,
            "exchange_symbol": self.exchange_symbol,
            "tick_size": self.tick_size,
            "quantity_step": self.quantity_step,
            "lot_size": self.lot_size,
            "tradable": self.tradable,
            "data_supported": self.data_supported,
            "execution_supported": self.execution_supported,
            "expiry": self.expiry,
            "strike": self.strike,
            "option_type": self.option_type,
            "contract_type": self.contract_type,
            "settlement_asset": self.settlement_asset,
            "metadata": self.metadata,
        }

    def to_ref(self) -> InstrumentRef:
        ac_str = self.asset_class.value if hasattr(self.asset_class, 'value') else str(self.asset_class)
        if self.instrument_type == InstrumentType.OPTION:
            ac_str = "OPTION"
        elif self.instrument_type == InstrumentType.DATED_FUTURE:
            ac_str = "FUTURE"
        elif self.instrument_type == InstrumentType.PERPETUAL:
            ac_str = "CRYPTO_PERPETUAL"
        elif self.instrument_type == InstrumentType.INDEX:
            ac_str = "INDEX"

        return InstrumentRef(
            provider=self.provider,
            exchange=self.exchange,
            asset_class=ac_str,
            underlying=self.base_asset,
            provider_instrument_key=self.provider_symbol or self.instrument_id,
            trading_symbol=self.canonical_symbol,
            expiry=self.expiry,
            strike=self.strike,
            option_type=self.option_type,
            lot_size=self.lot_size,
            tick_size=self.tick_size,
            display_name=self.canonical_symbol,
            currency=self.quote_asset or ("INR" if self.exchange == "NSE" else "USD"),
            tradable=self.tradable,
            data_supported=self.data_supported,
            execution_supported=self.execution_supported,
            metadata=self.metadata,
        )


@dataclass
class ResolutionResult:
    status: ResolutionStatus
    query: str
    instrument: Optional[CanonicalInstrument] = None
    candidate_symbols: List[str] = field(default_factory=list)
    reason: str = ""
    error_code: str = ""
    suggested_action: str = ""

    @property
    def is_valid(self) -> bool:
        return self.status == ResolutionStatus.RESOLVED and self.instrument is not None


# ─────────────────────────────────────────────────────────────────────────────
# 1. OPTION CONTRACT NORMALIZER
# ─────────────────────────────────────────────────────────────────────────────

class OptionContractNormalizer:
    """
    Centralized Option Symbol Normalizer.
    Accepts arbitrary legacy, display, and provider syntax and normalizes
    to a single authoritative CanonicalInstrument / InstrumentRef.
    """

    MONTH_MAP = {
        "JAN": 1, "FEB": 2, "MAR": 3, "APR": 4, "MAY": 5, "JUN": 6,
        "JUL": 7, "AUG": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 12
    }

    @classmethod
    def parse_expiry_date(cls, exp_str: str) -> Optional[date]:
        """Parses any valid expiry date string or embedded date in contract symbol into a date object."""
        if not exp_str or not exp_str.strip():
            return None
        clean = exp_str.strip().upper().replace("/", "-")

        # 1. Direct or embedded ISO YYYY-MM-DD
        m_iso = re.search(r"(\d{4}-\d{2}-\d{2})", clean)
        if m_iso:
            try:
                return datetime.strptime(m_iso.group(1), "%Y-%m-%d").date()
            except Exception:
                pass

        # 2. Direct or embedded DD-MM-YYYY
        m_dmy = re.search(r"(\b\d{1,2}-\d{1,2}-\d{4}\b)", clean)
        if m_dmy:
            try:
                return datetime.strptime(m_dmy.group(1), "%d-%m-%Y").date()
            except Exception:
                pass

        # 3. Embedded Indian Named Month DDMMMYY / DDMMMYYYY / DD-MMM-YYYY (e.g. 26SEP2026, 27-MAR-2026, 26MARFUT)
        m_named = re.search(r"(\d{1,2})[-_ ]*([A-Z]{3})[-_ ]*(\d{2,4})", clean)
        if m_named:
            d_str, mon_str, y_str = m_named.groups()
            mon_num = cls.MONTH_MAP.get(mon_str)
            if mon_num:
                y_num = int(y_str) if len(y_str) == 4 else (2000 + int(y_str))
                d_num = int(d_str)
                try:
                    return date(y_num, mon_num, d_num)
                except Exception:
                    pass

        # 4. Two digit year + month name (e.g. 26MAR in NIFTY26MARFUT) -> assume 27th/last Thursday of month
        m_ym = re.search(r"(\d{2})([A-Z]{3})(?:FUT|CE|PE)?", clean)
        if m_ym:
            y_str, mon_str = m_ym.groups()
            mon_num = cls.MONTH_MAP.get(mon_str)
            if mon_num:
                y_num = 2000 + int(y_str)
                return date(y_num, mon_num, 27)

        # 5. Compact 6 digits DDMMYY or YYMMDD at boundary or after hyphen (e.g. 260926)
        m_6 = re.search(r"[-_: ](\d{6})(?:[-_: ]|$)", clean)
        if not m_6 and len(clean) == 6 and clean.isdigit():
            m_6_val = clean
        else:
            m_6_val = m_6.group(1) if m_6 else None

        if m_6_val:
            try:
                # DDMMYY (e.g. 260926 -> 26 Sep 2026)
                d1 = int(m_6_val[:2])
                m1 = int(m_6_val[2:4])
                y1 = 2000 + int(m_6_val[4:])
                if 1 <= m1 <= 12 and 1 <= d1 <= 31:
                    return date(y1, m1, d1)
            except Exception:
                pass
            try:
                # YYMMDD (e.g. 260927 -> 27 Sep 2026)
                y2 = 2000 + int(m_6_val[:2])
                m2 = int(m_6_val[2:4])
                d2 = int(m_6_val[4:])
                if 1 <= m2 <= 12 and 1 <= d2 <= 31:
                    return date(y2, m2, d2)
            except Exception:
                pass

        return None

    @classmethod
    def normalize(
        cls,
        query: str,
        provider: Optional[str] = None,
        exchange: Optional[str] = None,
        market_date: Optional[date] = None
    ) -> ResolutionResult:
        """
        Normalizes any option format into a canonical result with expiry validation.
        """
        if not query or not query.strip():
            return ResolutionResult(
                status=ResolutionStatus.NOT_FOUND,
                query=query,
                reason="Empty option query.",
                error_code="INSTRUMENT_EMPTY_QUERY"
            )

        clean_q = query.strip().upper().replace("NSE:", "").replace("NFO:", "").replace("DELTA:", "")
        now_d = market_date or datetime.now(timezone.utc).date()

        # A. Check Delta Exchange Database Registry by product_id or exact symbol
        try:
            from src import db
            delta_contract = None
            if clean_q.isdigit():
                delta_contract = db.get_delta_contract_by_id(int(clean_q))
            if not delta_contract:
                delta_contract = db.get_delta_contract_by_symbol(clean_q)

            if delta_contract:
                settle_time = delta_contract.get("settlement_time", "")
                exp_d = cls.parse_expiry_date(settle_time)
                if exp_d and exp_d < now_d:
                    return ResolutionResult(
                        status=ResolutionStatus.EXPIRED,
                        query=query,
                        reason=f"Delta options contract '{delta_contract['symbol']}' expired on {exp_d.isoformat()}.",
                        error_code="CONTRACT_EXPIRED",
                        suggested_action="Select an active contract from the Delta options chain.",
                    )

                opt_type = "CALL" if delta_contract.get("contract_type") == "call_options" else "PUT"
                exp_iso = exp_d.isoformat() if exp_d else delta_contract.get("expiry_date", "")
                inst = CanonicalInstrument(
                    instrument_id=f"DELTA:{delta_contract['symbol']}:OPTION",
                    asset_class=AssetClass.CRYPTO,
                    instrument_type=InstrumentType.OPTION,
                    provider="delta_options",
                    exchange="DELTA",
                    base_asset=delta_contract.get("underlying_symbol", "BTC"),
                    quote_asset=delta_contract.get("quoting_asset", "USD"),
                    canonical_symbol=delta_contract["symbol"],
                    provider_symbol=delta_contract["symbol"],
                    exchange_symbol=delta_contract["symbol"],
                    expiry=exp_iso,
                    strike=float(delta_contract.get("strike_price", 0.0)),
                    option_type=opt_type,
                    tick_size=float(delta_contract.get("tick_size", 0.1)),
                    quantity_step=0.001,
                    lot_size=1.0,
                    tradable=True,
                    data_supported=True,
                    execution_supported=True,
                    settlement_asset=delta_contract.get("settling_asset", "USD"),
                    metadata={
                        "product_id": delta_contract["product_id"],
                        "contract_value": delta_contract.get("contract_value", "0.001"),
                        "trading_status": delta_contract.get("trading_status", "operational"),
                    }
                )
                return ResolutionResult(
                    status=ResolutionStatus.RESOLVED,
                    query=query,
                    instrument=inst,
                    reason="Delta Exchange option contract resolved successfully.",
                    error_code="SUCCESS",
                )
        except Exception as d_err:
            logger.debug("Delta DB lookup notice: %s", d_err)

        # B. Delta Exchange String Format (e.g. C-BTC-78000-300826 or P-ETH-3500-250926)
        parts = clean_q.split("-")
        if len(parts) == 4 and parts[0] in ["C", "P"] and parts[1] in ["BTC", "ETH", "SOL", "XAUT"]:
            opt_letter, underlying, strike_str, expiry_ddmmyy = parts
            try:
                strike_val = float(strike_str)
                opt_type = "CALL" if opt_letter == "C" else "PUT"
                exp_d = cls.parse_expiry_date(expiry_ddmmyy)
                if exp_d and exp_d < now_d:
                    return ResolutionResult(
                        status=ResolutionStatus.EXPIRED,
                        query=query,
                        reason=f"Delta options contract '{query}' expired on {exp_d.isoformat()}.",
                        error_code="CONTRACT_EXPIRED",
                        suggested_action="Select an active contract from Delta options chain.",
                    )

                exp_iso = exp_d.isoformat() if exp_d else f"20{expiry_ddmmyy[4:]}-{expiry_ddmmyy[2:4]}-{expiry_ddmmyy[:2]}"
                inst = CanonicalInstrument(
                    instrument_id=f"DELTA:{clean_q}:OPTION",
                    asset_class=AssetClass.CRYPTO,
                    instrument_type=InstrumentType.OPTION,
                    provider="delta_options",
                    exchange="DELTA",
                    base_asset=underlying,
                    quote_asset="USD",
                    canonical_symbol=clean_q,
                    provider_symbol=clean_q,
                    exchange_symbol=clean_q,
                    expiry=exp_iso,
                    strike=strike_val,
                    option_type=opt_type,
                    tick_size=0.1,
                    quantity_step=0.001,
                    lot_size=1.0,
                    tradable=True,
                    data_supported=True,
                    execution_supported=True,
                    settlement_asset="USD",
                )
                return ResolutionResult(
                    status=ResolutionStatus.RESOLVED,
                    query=query,
                    instrument=inst,
                    reason="Delta Exchange option contract resolved successfully.",
                    error_code="SUCCESS",
                )
            except Exception as e:
                logger.error("Delta option format parse error: %s", e)

        # C. Crypto Option Format (e.g. BTC 27-09-2026 84200 PE, BTC-260927-84200-P, BTC 83800 CE)
        crypto_match = re.match(
            r"^(BTC|ETH|SOL|XAUT)[-_ ]+(?:(\d{4}-\d{2}-\d{2}|\d{1,2}[-_/]\d{1,2}[-_/]\d{2,4}|\d{6})[-_ ]+)?(\d+(?:\.\d+)?)[-_ ]*(C|P|CE|PE|CALL|PUT)$",
            clean_q
        )
        if crypto_match:
            underlying, expiry_raw, strike_str, opt_type_letter = crypto_match.groups()
            try:
                strike_val = float(strike_str)
                if strike_val <= 0:
                    return ResolutionResult(
                        status=ResolutionStatus.UNSUPPORTED,
                        query=query,
                        reason=f"Strike price {strike_str} is invalid. Options strike must be positive.",
                        error_code="INVALID_STRIKE_PRICE",
                    )

                exp_d = cls.parse_expiry_date(expiry_raw) if expiry_raw else None
                if exp_d and exp_d < now_d:
                    return ResolutionResult(
                        status=ResolutionStatus.EXPIRED,
                        query=query,
                        reason=f"Crypto options contract '{query}' expired on {exp_d.isoformat()}.",
                        error_code="CONTRACT_EXPIRED",
                        suggested_action="Select an active contract from the options chain.",
                    )

                opt_type = "CALL" if opt_type_letter.upper() in ["C", "CALL", "CE"] else "PUT"
                exp_iso = exp_d.isoformat() if exp_d else ""
                inst = CanonicalInstrument(
                    instrument_id=f"DELTA:{clean_q}:OPTION",
                    asset_class=AssetClass.CRYPTO,
                    instrument_type=InstrumentType.OPTION,
                    provider="delta_options",
                    exchange="DELTA",
                    base_asset=underlying,
                    quote_asset="USD",
                    canonical_symbol=clean_q,
                    provider_symbol=clean_q,
                    exchange_symbol=clean_q,
                    expiry=exp_iso,
                    strike=strike_val,
                    option_type=opt_type,
                    tick_size=0.1,
                    quantity_step=0.001,
                    lot_size=1.0,
                    tradable=True,
                    data_supported=True,
                    execution_supported=True,
                    settlement_asset="USD",
                )
                return ResolutionResult(
                    status=ResolutionStatus.RESOLVED,
                    query=query,
                    instrument=inst,
                    reason="Crypto option contract resolved successfully.",
                    error_code="SUCCESS",
                )
            except Exception as e:
                logger.error("Crypto option parse error: %s", e)

        # D. NSE Indian Options Format (e.g. "NIFTY 2026-09-29 24900 CE", "NIFTY 24900 CE", "BANKNIFTY 29-SEP-2026 51000 PE")
        nse_match = re.match(
            r"^([A-Z]+)[-_ ]*(?:(\d{4}-\d{2}-\d{2}|\d{1,2}[-_/]\d{1,2}[-_/]\d{2,4}|\d{1,2}[A-Z]{3}\d{2,4})[-_ ]*)?(\d+(?:\.\d+)?)[-_ ]*(CE|PE|CALL|PUT)$",
            clean_q
        )
        if nse_match:
            underlying, expiry_str, strike_str, opt_type_raw = nse_match.groups()
            try:
                strike_val = float(strike_str)
                if strike_val <= 0:
                    return ResolutionResult(
                        status=ResolutionStatus.UNSUPPORTED,
                        query=query,
                        reason=f"Strike price {strike_str} is invalid. Strike must be greater than zero.",
                        error_code="INVALID_STRIKE_PRICE",
                    )

                opt_type = "CALL" if opt_type_raw in ["CE", "CALL"] else "PUT"
                exp_d = cls.parse_expiry_date(expiry_str) if expiry_str else None
                if exp_d and exp_d < now_d:
                    return ResolutionResult(
                        status=ResolutionStatus.EXPIRED,
                        query=query,
                        reason=f"Indian NSE option contract '{query}' expired on {exp_d.isoformat()}.",
                        error_code="CONTRACT_EXPIRED",
                        suggested_action="Select a valid near-month or weekly contract from the option chain.",
                    )

                # Dynamic lot size mapping
                lot_size = 25.0 if "FINNIFTY" in underlying else (15.0 if "BANK" in underlying else 25.0 if "NIFTY" in underlying else 50.0)
                if "MIDCP" in underlying:
                    lot_size = 75.0
                elif "SENSEX" in underlying:
                    lot_size = 10.0
                elif "RELIANCE" in underlying:
                    lot_size = 250.0

                canonical_sym = f"{underlying} {int(strike_val) if strike_val.is_integer() else strike_val} {opt_type_raw}"
                exp_iso = exp_d.isoformat() if exp_d else (expiry_str or "NEAR")
                inst_id = f"NSE:{underlying}:{exp_iso}:{int(strike_val) if strike_val.is_integer() else strike_val}:{opt_type_raw}"

                inst = CanonicalInstrument(
                    instrument_id=inst_id,
                    asset_class=AssetClass.INDIAN_STOCKS,
                    instrument_type=InstrumentType.OPTION,
                    provider="upstox_options",
                    exchange="NSE",
                    base_asset=underlying,
                    quote_asset="INR",
                    canonical_symbol=query.strip(),
                    provider_symbol=inst_id,
                    exchange_symbol=canonical_sym,
                    expiry=exp_iso,
                    strike=strike_val,
                    option_type=opt_type,
                    tick_size=0.05,
                    quantity_step=lot_size,
                    lot_size=lot_size,
                    tradable=True,
                    data_supported=True,
                    execution_supported=True,
                    settlement_asset="INR",
                )
                return ResolutionResult(
                    status=ResolutionStatus.RESOLVED,
                    query=query,
                    instrument=inst,
                    reason="NSE options contract resolved successfully.",
                    error_code="SUCCESS",
                )
            except Exception as e:
                logger.error("NSE option parsing error: %s", e)

        return ResolutionResult(
            status=ResolutionStatus.UNSUPPORTED,
            query=query,
            reason=f"Option contract '{query}' could not be parsed into a valid provider contract.",
            error_code="OPTION_PARSING_FAILED",
            suggested_action="Use standard format: 'NIFTY 2026-09-29 24900 CE' or 'BTC 27-09-2026 84200 PE'.",
        )


# ─────────────────────────────────────────────────────────────────────────────
# 2. FUTURES RESOLVER
# ─────────────────────────────────────────────────────────────────────────────

class FuturesResolver:
    """
    Authoritative Futures Contract Resolver.
    Enforces that expired futures (e.g. March 2026 on September 2026) are strictly blocked.
    """

    @classmethod
    def resolve_future(
        cls,
        query: str,
        market_date: Optional[date] = None
    ) -> ResolutionResult:
        """
        Resolves a future contract query with strict expiry filtering.
        """
        clean = query.strip().upper().replace("NSE:", "").replace("UPSTOX:", "")
        now_d = market_date or datetime.now(timezone.utc).date()

        # 1. Crypto Perpetuals (never expire)
        if clean in ("BTC-PERP", "BTC/USDT:USDT", "BTCUSDT:USDT", "ETH-PERP", "ETH/USDT:USDT", "SOL-PERP", "SOL/USDT:USDT"):
            underlying = "BTC" if "BTC" in clean else ("ETH" if "ETH" in clean else "SOL")
            inst = CanonicalInstrument(
                instrument_id=f"BINANCE:{underlying}USDT:PERPETUAL",
                asset_class=AssetClass.CRYPTO,
                instrument_type=InstrumentType.PERPETUAL,
                provider="binance_futures",
                exchange="BINANCE",
                base_asset=underlying,
                quote_asset="USDT",
                canonical_symbol=f"{underlying}/USDT:USDT",
                provider_symbol=f"{underlying}/USDT:USDT",
                exchange_symbol=f"{underlying}USDT",
                tick_size=0.1,
                quantity_step=0.001,
                lot_size=1.0,
                tradable=True,
                data_supported=True,
                execution_supported=True,
                settlement_asset="USDT"
            )
            return ResolutionResult(
                status=ResolutionStatus.RESOLVED,
                query=query,
                instrument=inst,
                reason="Crypto perpetual futures resolved.",
                error_code="SUCCESS"
            )

        # 2. Indian Index / Stock Futures (e.g. "NIFTY 27-MAR-2026 Future", "NIFTY26MARFUT", "NIFTY 29-OCT-2026 Future")
        fut_match = re.match(
            r"^([A-Z]+)[-_ ]*(?:(\d{1,2}[-_ ][A-Z]{3}[-_ ]\d{4}|\d{4}-\d{2}-\d{2}|\d{2}[A-Z]{3}))?[-_ ]*(FUT|FUTURE)$",
            clean
        )
        if fut_match:
            underlying, exp_raw, _ = fut_match.groups()
            exp_d = OptionContractNormalizer.parse_expiry_date(exp_raw) if exp_raw else None

            # If explicit expired date is requested -> STRICT REJECTION
            if exp_d and exp_d < now_d:
                return ResolutionResult(
                    status=ResolutionStatus.EXPIRED,
                    query=query,
                    reason=f"Futures contract '{query}' expired on {exp_d.isoformat()} (Current market date: {now_d.isoformat()}).",
                    error_code="CONTRACT_EXPIRED",
                    suggested_action="Select the nearest active monthly contract from Upstox/NSE master.",
                )

            # Resolve valid contract from Upstox futures catalog
            try:
                from src.upstox_service import _UPSTOX_FUTURES_BY_UNDERLYING, _UPSTOX_FUTURES_MASTER
                candidates = _UPSTOX_FUTURES_BY_UNDERLYING.get(underlying, [])
                valid_candidates = []
                for c in candidates:
                    c_exp = OptionContractNormalizer.parse_expiry_date(c.get("expiry", ""))
                    if c_exp and c_exp >= now_d:
                        valid_candidates.append((c_exp, c))

                if valid_candidates:
                    valid_candidates.sort(key=lambda x: x[0])
                    chosen_exp, chosen_meta = valid_candidates[0]
                    inst = CanonicalInstrument(
                        instrument_id=chosen_meta.get("instrument_key", f"NSE_FO|{chosen_meta.get('trading_symbol', query)}"),
                        asset_class=AssetClass.INDIAN_STOCKS,
                        instrument_type=InstrumentType.DATED_FUTURE,
                        provider="upstox",
                        exchange="NSE",
                        base_asset=underlying,
                        quote_asset="INR",
                        canonical_symbol=chosen_meta.get("trading_symbol", query),
                        provider_symbol=chosen_meta.get("instrument_key", query),
                        exchange_symbol=chosen_meta.get("trading_symbol", query),
                        expiry=chosen_exp.isoformat(),
                        tick_size=0.05,
                        lot_size=float(chosen_meta.get("lot_size", 25.0)),
                        tradable=True,
                        data_supported=True,
                        execution_supported=True,
                        settlement_asset="INR",
                        metadata=chosen_meta
                    )
                    return ResolutionResult(
                        status=ResolutionStatus.RESOLVED,
                        query=query,
                        instrument=inst,
                        reason=f"Nearest active NSE futures contract resolved for {underlying} (Expiry: {chosen_exp.isoformat()}).",
                        error_code="SUCCESS"
                    )
            except Exception as u_err:
                logger.debug("Upstox futures catalog search error: %s", u_err)

            # Fallback valid future representation if not in catalog
            if not exp_d or exp_d >= now_d:
                lot = 25.0 if "NIFTY" in underlying else 50.0
                inst = CanonicalInstrument(
                    instrument_id=f"NSE:{clean}:FUTURE",
                    asset_class=AssetClass.INDIAN_STOCKS,
                    instrument_type=InstrumentType.DATED_FUTURE,
                    provider="upstox",
                    exchange="NSE",
                    base_asset=underlying,
                    quote_asset="INR",
                    canonical_symbol=query.strip(),
                    provider_symbol=f"NSE_FO|{clean}",
                    exchange_symbol=clean,
                    expiry=exp_d.isoformat() if exp_d else "",
                    tick_size=0.05,
                    lot_size=lot,
                    tradable=True,
                    data_supported=True,
                    execution_supported=True,
                    settlement_asset="INR"
                )
                return ResolutionResult(
                    status=ResolutionStatus.RESOLVED,
                    query=query,
                    instrument=inst,
                    reason="NSE Futures contract resolved successfully.",
                    error_code="SUCCESS"
                )

        return ResolutionResult(
            status=ResolutionStatus.UNSUPPORTED,
            query=query,
            reason=f"Futures contract '{query}' could not be resolved.",
            error_code="FUTURES_RESOLUTION_FAILED"
        )


# ─────────────────────────────────────────────────────────────────────────────
# 3. EXPIRY VALIDATION & AUTOMATED ROLLOVER POLICY
# ─────────────────────────────────────────────────────────────────────────────

def validate_contract_expiry(
    instrument: Union[CanonicalInstrument, InstrumentRef, Dict[str, Any], str],
    market_date: Optional[date] = None
) -> Tuple[bool, str, Optional[date]]:
    """
    Validates whether a contract is active or expired.
    Returns: (is_valid, reason_code, expiry_date)
    """
    now_d = market_date or datetime.now(timezone.utc).date()

    exp_str = ""
    if isinstance(instrument, (CanonicalInstrument, InstrumentRef)):
        exp_str = instrument.expiry or ""
    elif isinstance(instrument, dict):
        exp_str = instrument.get("expiry") or instrument.get("expiry_date") or instrument.get("settlement_time") or ""
    elif isinstance(instrument, str):
        exp_str = instrument

    if not exp_str:
        return True, "NO_EXPIRY_DECLARED", None

    exp_d = OptionContractNormalizer.parse_expiry_date(exp_str)
    if not exp_d:
        return True, "UNPARSED_EXPIRY_PERMITTED", None

    if exp_d < now_d:
        return False, "CONTRACT_EXPIRED", exp_d

    return True, "VALID_ACTIVE_CONTRACT", exp_d


def resolve_contract_rollover(
    bot_config: Dict[str, Any],
    current_symbol_or_inst: Union[str, CanonicalInstrument, InstrumentRef],
    rollover_policy: str = "STRATEGY_RESOLVE",
    market_date: Optional[date] = None
) -> ResolutionResult:
    """
    Executes automated contract rollover for expired option and futures bots.
    Policies:
    - NONE: Strictly returns CONTRACT_EXPIRED (manual action required)
    - STRATEGY_RESOLVE / NEXT_VALID_EXPIRY / NEAREST_WEEKLY / NEAREST_MONTHLY:
      Resolves the next active dated contract matching the strategy criteria.
    """
    pol = (rollover_policy or "STRATEGY_RESOLVE").upper()
    if pol == "NONE":
        return ResolutionResult(
            status=ResolutionStatus.EXPIRED,
            query=str(current_symbol_or_inst),
            reason="Contract is expired and bot rollover policy is set to NONE.",
            error_code="CONTRACT_EXPIRED"
        )

    now_d = market_date or datetime.now(timezone.utc).date()

    # Determine underlying and asset type
    sym_str = current_symbol_or_inst.canonical_symbol if hasattr(current_symbol_or_inst, "canonical_symbol") else str(current_symbol_or_inst)
    clean_sym = sym_str.strip().upper()

    # 1. Crypto Option Rollover (e.g. Delta BTC/ETH options)
    if "BTC" in clean_sym or "ETH" in clean_sym or "DELTA" in clean_sym:
        und = "BTC" if "BTC" in clean_sym else "ETH"
        opt_type = "PE" if ("PE" in clean_sym or "-P" in clean_sym or "PUT" in clean_sym) else "CE"
        strike_match = re.search(r"(\d{4,6})", clean_sym)
        strike_val = float(strike_match.group(1)) if strike_match else (84200.0 if und == "BTC" else 3500.0)

        try:
            from src import db
            active_contracts = db.get_delta_active_contracts(underlying=und)
            valid_contracts = []
            for c in active_contracts:
                c_type = "CE" if c.get("contract_type") == "call_options" else "PE"
                if c_type == opt_type:
                    c_exp = OptionContractNormalizer.parse_expiry_date(c.get("settlement_time") or c.get("expiry_date"))
                    if c_exp and c_exp >= now_d:
                        valid_contracts.append((abs(float(c.get("strike_price", 0)) - strike_val), c_exp, c))

            if valid_contracts:
                # Sort by nearest strike, then nearest expiry
                valid_contracts.sort(key=lambda x: (x[1], x[0]))
                chosen = valid_contracts[0][2]
                return OptionContractNormalizer.normalize(chosen["symbol"], market_date=now_d)
        except Exception as e:
            logger.debug("Database rollover search error: %s", e)

        # Dynamic fallback: advance expiry to next valid date
        next_d = now_d if now_d >= now_d else (now_d + timedelta(days=1))
        new_sym = f"{und} {next_d.strftime('%d-%m-%Y')} {int(strike_val)} {opt_type}"
        return OptionContractNormalizer.normalize(new_sym, market_date=now_d)

    # 2. Indian NSE Option Rollover
    if "NIFTY" in clean_sym or "BANKNIFTY" in clean_sym:
        und = "BANKNIFTY" if "BANKNIFTY" in clean_sym else "NIFTY"
        opt_type = "PE" if ("PE" in clean_sym or "PUT" in clean_sym) else "CE"
        strike_match = re.search(r"(\d{4,6})", clean_sym)
        strike_val = float(strike_match.group(1)) if strike_match else 24900.0

        # Next valid Tuesday/Thursday expiry
        days_ahead = (1 - now_d.weekday()) % 7  # Tuesday
        if days_ahead == 0:
            days_ahead = 7
        target_exp = now_d + timedelta(days=days_ahead)
        new_sym = f"{und} {target_exp.isoformat()} {int(strike_val)} {opt_type}"
        return OptionContractNormalizer.normalize(new_sym, market_date=now_d)

    # 3. Futures Rollover
    if "FUT" in clean_sym or "FUTURE" in clean_sym:
        und = "NIFTY" if "NIFTY" in clean_sym else "BANKNIFTY"
        return FuturesResolver.resolve_future(f"{und} FUTURE", market_date=now_d)

    return ResolutionResult(
        status=ResolutionStatus.UNSUPPORTED,
        query=sym_str,
        reason="Could not determine rollover target.",
        error_code="ROLLOVER_FAILED"
    )


# ─────────────────────────────────────────────────────────────────────────────
# 4. SIGNAL ASSET VS EXECUTION ASSET ROUTER
# ─────────────────────────────────────────────────────────────────────────────

def resolve_signal_and_execution_instruments(
    bot_symbol_or_inst: Union[str, CanonicalInstrument, InstrumentRef],
    strategy_id: Optional[str] = None
) -> Tuple[CanonicalInstrument, CanonicalInstrument]:
    """
    Enforces strict architectural separation:
    - Signal Instrument: The underlying asset (BTC/USDT, NIFTY Index) used to calculate indicators (EMA, RSI, VP).
    - Execution Instrument: The exact tradable contract (Option contract, Futures contract) used for quotes, orders & PnL.
    """
    exec_res = global_instrument_resolver.resolve(bot_symbol_or_inst if isinstance(bot_symbol_or_inst, str) else bot_symbol_or_inst.canonical_symbol)
    exec_inst = exec_res.instrument if exec_res.is_valid else None

    if not exec_inst:
        if isinstance(bot_symbol_or_inst, CanonicalInstrument):
            exec_inst = bot_symbol_or_inst
        else:
            exec_inst = global_instrument_resolver._CANONICAL_REGISTRY.get("BTC/USDT")

    # Options -> Signal is underlying Spot/Index
    if exec_inst.instrument_type == InstrumentType.OPTION:
        und = exec_inst.base_asset or "BTC"
        if und in ("BTC", "ETH", "SOL"):
            sig_res = global_instrument_resolver.resolve(f"{und}/USDT")
            sig_inst = sig_res.instrument if sig_res.is_valid else exec_inst
        else:
            sig_res = global_instrument_resolver.resolve(und)
            sig_inst = sig_res.instrument if sig_res.is_valid else exec_inst
        return sig_inst, exec_inst

    # Futures -> Signal is underlying or future itself
    if exec_inst.instrument_type in (InstrumentType.DATED_FUTURE, InstrumentType.PERPETUAL):
        und = exec_inst.base_asset or "BTC"
        if und in ("BTC", "ETH", "SOL"):
            sig_res = global_instrument_resolver.resolve(f"{und}/USDT:USDT")
            sig_inst = sig_res.instrument if sig_res.is_valid else exec_inst
        else:
            sig_res = global_instrument_resolver.resolve(und)
            sig_inst = sig_res.instrument if sig_res.is_valid else exec_inst
        return sig_inst, exec_inst

    # Spot / Equity -> Signal and Execution are the same instrument
    return exec_inst, exec_inst


# ─────────────────────────────────────────────────────────────────────────────
# 5. MASTER INSTRUMENT RESOLVER CLASS
# ─────────────────────────────────────────────────────────────────────────────

class InstrumentResolver:
    """Authoritative master resolver registry."""

    CATEGORY_LABELS = {
        "BTC-OPTIONS": {
            "asset_class": AssetClass.CRYPTO,
            "instrument_type": InstrumentType.OPTION,
            "reason": "'BTC-OPTIONS' is a generic asset category, not an executable contract symbol.",
            "candidates": ["BTC 27-09-2026 84200 CE", "BTC 27-09-2026 84200 PE"],
            "action": "Select an active options contract with valid expiry and strike.",
            "underlying_symbol": "BTC/USDT",
        },
        "ETH-OPTIONS": {
            "asset_class": AssetClass.CRYPTO,
            "instrument_type": InstrumentType.OPTION,
            "reason": "'ETH-OPTIONS' is a category alias.",
            "candidates": ["ETH 27-09-2026 3500 CE"],
            "action": "Select a valid dated options contract.",
            "underlying_symbol": "ETH/USDT",
        },
        "NIFTY-OPTIONS": {
            "asset_class": AssetClass.INDIAN_STOCKS,
            "instrument_type": InstrumentType.OPTION,
            "reason": "'NIFTY-OPTIONS' is an Indian index category.",
            "candidates": ["NIFTY 2026-09-29 24900 CE"],
            "action": "Select a specific strike and expiry from NSE options chain.",
            "underlying_symbol": "NIFTY",
        },
        "BTC-FUTURES": {
            "asset_class": AssetClass.CRYPTO,
            "instrument_type": InstrumentType.PERPETUAL,
            "reason": "'BTC-FUTURES' is a category descriptor. For perpetual futures, use 'BTC/USDT:USDT'.",
            "candidates": ["BTC/USDT:USDT"],
            "action": "Select BTC/USDT:USDT for USDT-M Perpetual.",
            "underlying_symbol": "BTC/USDT:USDT",
        },
        "CRYPTO-OPTIONS": {
            "asset_class": AssetClass.CRYPTO,
            "instrument_type": InstrumentType.OPTION,
            "reason": "'CRYPTO-OPTIONS' is a generic asset category, not an executable contract symbol.",
            "candidates": ["BTC 27-09-2026 84200 CE", "ETH 27-09-2026 3500 CE"],
            "action": "Select an active crypto options contract from the option chain.",
            "underlying_symbol": "BTC/USDT",
        },
    }

    AMBIGUOUS_QUERIES = {
        "BTC": ["BTC/USDT", "BTC/USDT:USDT", "BTC 27-09-2026 84200 CE"],
        "ETH": ["ETH/USDT", "ETH/USDT:USDT", "ETH 27-09-2026 3500 CE"],
        "SOL": ["SOL/USDT", "SOL/USDT:USDT"],
    }

    _CANONICAL_REGISTRY: Dict[str, CanonicalInstrument] = {
        "BTC/USDT": CanonicalInstrument(
            instrument_id="BINANCE:BTCUSDT:SPOT",
            asset_class=AssetClass.CRYPTO,
            instrument_type=InstrumentType.SPOT,
            provider="binance_spot",
            exchange="BINANCE",
            base_asset="BTC",
            quote_asset="USDT",
            canonical_symbol="BTC/USDT",
            provider_symbol="BTC/USDT",
            exchange_symbol="BTCUSDT",
            tick_size=0.01,
            quantity_step=0.00001,
            lot_size=1.0,
            tradable=True,
            data_supported=True,
            execution_supported=True,
        ),
        "ETH/USDT": CanonicalInstrument(
            instrument_id="BINANCE:ETHUSDT:SPOT",
            asset_class=AssetClass.CRYPTO,
            instrument_type=InstrumentType.SPOT,
            provider="binance_spot",
            exchange="BINANCE",
            base_asset="ETH",
            quote_asset="USDT",
            canonical_symbol="ETH/USDT",
            provider_symbol="ETH/USDT",
            exchange_symbol="ETHUSDT",
            tick_size=0.01,
            quantity_step=0.0001,
            lot_size=1.0,
            tradable=True,
            data_supported=True,
            execution_supported=True,
        ),
        "SOL/USDT": CanonicalInstrument(
            instrument_id="BINANCE:SOLUSDT:SPOT",
            asset_class=AssetClass.CRYPTO,
            instrument_type=InstrumentType.SPOT,
            provider="binance_spot",
            exchange="BINANCE",
            base_asset="SOL",
            quote_asset="USDT",
            canonical_symbol="SOL/USDT",
            provider_symbol="SOL/USDT",
            exchange_symbol="SOLUSDT",
            tick_size=0.01,
            quantity_step=0.01,
            lot_size=1.0,
            tradable=True,
            data_supported=True,
            execution_supported=True,
        ),
        "BTC/USDT:USDT": CanonicalInstrument(
            instrument_id="BINANCE:BTCUSDT:PERPETUAL",
            asset_class=AssetClass.CRYPTO,
            instrument_type=InstrumentType.PERPETUAL,
            provider="binance_futures",
            exchange="BINANCE",
            base_asset="BTC",
            quote_asset="USDT",
            canonical_symbol="BTC/USDT:USDT",
            provider_symbol="BTC/USDT:USDT",
            exchange_symbol="BTCUSDT",
            tick_size=0.1,
            quantity_step=0.001,
            lot_size=1.0,
            tradable=True,
            data_supported=True,
            execution_supported=True,
            settlement_asset="USDT",
        ),
        "NIFTY": CanonicalInstrument(
            instrument_id="NSE:NIFTY50:INDEX",
            asset_class=AssetClass.INDIAN_STOCKS,
            instrument_type=InstrumentType.INDEX,
            provider="upstox",
            exchange="NSE",
            base_asset="NIFTY",
            quote_asset="INR",
            canonical_symbol="NIFTY",
            provider_symbol="NSE_INDEX|Nifty 50",
            exchange_symbol="NIFTY",
            tick_size=0.05,
            quantity_step=1.0,
            lot_size=25.0,
            tradable=False,
            data_supported=True,
            execution_supported=False,
            settlement_asset="INR",
        ),
        "BANKNIFTY": CanonicalInstrument(
            instrument_id="NSE:BANKNIFTY:INDEX",
            asset_class=AssetClass.INDIAN_STOCKS,
            instrument_type=InstrumentType.INDEX,
            provider="upstox",
            exchange="NSE",
            base_asset="BANKNIFTY",
            quote_asset="INR",
            canonical_symbol="BANKNIFTY",
            provider_symbol="NSE_INDEX|Nifty Bank",
            exchange_symbol="BANKNIFTY",
            tick_size=0.05,
            quantity_step=1.0,
            lot_size=15.0,
            tradable=False,
            data_supported=True,
            execution_supported=False,
            settlement_asset="INR",
        ),
    }

    _ALIAS_MAPPINGS: Dict[str, str] = {
        "BTCUSDT": "BTC/USDT",
        "ETHUSDT": "ETH/USDT",
        "SOLUSDT": "SOL/USDT",
        "BTC-PERP": "BTC/USDT:USDT",
        "ETH-PERP": "ETH/USDT:USDT",
        "BTC_USDT": "BTC/USDT",
        "ETH_USDT": "ETH/USDT",
        "XBT/USDT": "BTC/USDT",
    }

    @classmethod
    def resolve(
        cls,
        query: str,
        asset_class: Optional[str] = None,
        instrument_type: Optional[str] = None,
        provider: Optional[str] = None,
        market_date: Optional[date] = None,
    ) -> ResolutionResult:
        """
        Deterministic symbol resolution using centralized normalizers.
        """
        if not query or not query.strip():
            return ResolutionResult(
                status=ResolutionStatus.NOT_FOUND,
                query="",
                reason="Empty symbol query provided.",
                error_code="INSTRUMENT_EMPTY_QUERY",
            )

        clean_query = query.strip().upper()

        # 1. Check Category Labels
        if clean_query in cls.CATEGORY_LABELS:
            cat_info = cls.CATEGORY_LABELS[clean_query]
            return ResolutionResult(
                status=ResolutionStatus.CATEGORY_ONLY,
                query=clean_query,
                reason=cat_info["reason"],
                candidate_symbols=cat_info["candidates"],
                error_code="INSTRUMENT_CATEGORY_NOT_EXECUTABLE",
                suggested_action=cat_info["action"],
            )

        # 1.1 Check Ambiguous Bare Symbols (e.g. "BTC", "ETH")
        if clean_query in cls.AMBIGUOUS_QUERIES:
            candidates = cls.AMBIGUOUS_QUERIES[clean_query]
            return ResolutionResult(
                status=ResolutionStatus.AMBIGUOUS,
                query=clean_query,
                reason=f"Symbol '{clean_query}' is ambiguous. Please specify Spot, Futures, or Options.",
                candidate_symbols=candidates,
                error_code="INSTRUMENT_AMBIGUOUS",
                suggested_action=f"Select one of the candidate symbols: {', '.join(candidates)}",
            )

        # 2. Check Options Format via OptionContractNormalizer
        if (
            clean_query.startswith(("C-", "P-"))
            or "-C" in clean_query
            or "-P" in clean_query
            or " CE" in clean_query
            or " PE" in clean_query
            or " CALL" in clean_query
            or " PUT" in clean_query
            or bool(re.search(r"\d+\s*(?:CE|PE)$", clean_query))
            or (asset_class and str(asset_class).upper() in ("CRYPTO_OPTIONS", "OPTIONS", "INDIAN_OPTIONS"))
        ):
            opt_res = OptionContractNormalizer.normalize(clean_query, provider=provider, market_date=market_date)
            if opt_res.is_valid or opt_res.status == ResolutionStatus.EXPIRED:
                return opt_res

        # 3. Check Futures Format via FuturesResolver
        if (
            "FUT" in clean_query
            or "FUTURE" in clean_query
            or "-PERP" in clean_query
            or (asset_class and str(asset_class).upper() in ("FUTURES", "INDIAN_FUTURES", "CRYPTO_PERPETUAL"))
        ):
            fut_res = FuturesResolver.resolve_future(clean_query, market_date=market_date)
            if fut_res.status != ResolutionStatus.NOT_FOUND:
                return fut_res

        # 4. Check Direct Registry
        if clean_query in cls._CANONICAL_REGISTRY:
            return ResolutionResult(
                status=ResolutionStatus.RESOLVED,
                query=clean_query,
                instrument=cls._CANONICAL_REGISTRY[clean_query],
                reason="Direct canonical registry match.",
                error_code="SUCCESS"
            )

        # 5. Check Alias Mappings
        if clean_query in cls._ALIAS_MAPPINGS:
            can_sym = cls._ALIAS_MAPPINGS[clean_query]
            if can_sym in cls._CANONICAL_REGISTRY:
                return ResolutionResult(
                    status=ResolutionStatus.RESOLVED,
                    query=clean_query,
                    instrument=cls._CANONICAL_REGISTRY[can_sym],
                    reason="Alias mapped to canonical registry.",
                    error_code="SUCCESS"
                )

        # 6. Check Upstox Indian Equity Master
        try:
            from src.upstox_service import global_upstox_service
            u_meta = global_upstox_service.get_instrument_metadata(clean_query)
            if u_meta:
                sym = u_meta.get("canonical_symbol") or u_meta.get("trading_symbol") or clean_query
                ex = u_meta.get("exchange", "NSE_EQ").replace("_EQ", "").replace("_INDEX", "")
                ik = u_meta.get("instrument_key", f"{ex}_EQ|{sym}")
                is_index = "INDEX" in u_meta.get("exchange", "") or "INDICES" in u_meta.get("asset_class", "")

                inst = CanonicalInstrument(
                    instrument_id=f"{ex}:{sym}:{'INDEX' if is_index else 'EQUITY'}",
                    asset_class=AssetClass.INDIAN_STOCKS,
                    instrument_type=InstrumentType.INDEX if is_index else InstrumentType.SPOT,
                    provider="upstox",
                    exchange=ex,
                    base_asset=sym,
                    quote_asset="INR",
                    canonical_symbol=sym,
                    provider_symbol=ik,
                    exchange_symbol=sym,
                    tick_size=float(u_meta.get("tick_size", 0.05) or 0.05),
                    quantity_step=1.0,
                    lot_size=float(u_meta.get("lot_size", 1.0) or 1.0),
                    tradable=not is_index,
                    data_supported=True,
                    execution_supported=not is_index,
                    settlement_asset="INR",
                    metadata=u_meta,
                )
                return ResolutionResult(
                    status=ResolutionStatus.RESOLVED,
                    query=clean_query,
                    instrument=inst,
                    reason="Upstox Indian master resolved successfully.",
                    error_code="SUCCESS",
                )
        except Exception:
            pass

        return ResolutionResult(
            status=ResolutionStatus.NOT_FOUND,
            query=clean_query,
            reason=f"Symbol '{clean_query}' not recognized in Canonical Instrument Master.",
            error_code="INSTRUMENT_NOT_FOUND",
        )

    @classmethod
    def _validate_instrument_context(
        cls,
        inst: CanonicalInstrument,
        raw_query: str,
        asset_class: Optional[str],
        instrument_type: Optional[str],
        provider: Optional[str],
    ) -> ResolutionResult:
        """Validates that the resolved instrument matches requested constraints."""
        if instrument_type and instrument_type.upper() == "OPTIONS" and inst.instrument_type != InstrumentType.OPTION:
            return ResolutionResult(
                status=ResolutionStatus.UNSUPPORTED,
                query=raw_query,
                reason=f"Instrument '{inst.canonical_symbol}' is a {inst.instrument_type.value} instrument, not an OPTION.",
                error_code="INSTRUMENT_TYPE_MISMATCH",
                suggested_action="Select an options contract or change bot strategy type to match Spot/Futures.",
            )

        return ResolutionResult(
            status=ResolutionStatus.RESOLVED,
            query=raw_query,
            instrument=inst,
            reason="Canonical instrument resolved successfully.",
            error_code="SUCCESS",
        )

    @classmethod
    def _resolve_options_contract(
        cls,
        query: str,
        asset_class: Optional[str],
        provider: Optional[str],
    ) -> ResolutionResult:
        """Handles structured option contract strings for Delta Exchange, Crypto and Indian NSE options."""
        clean_q = query.strip().upper().replace("NSE:", "").replace("NFO:", "").replace("DELTA:", "")
        now_date = datetime.now(timezone.utc).date()
        now_iso = datetime.now(timezone.utc).isoformat()

        # 0. Check Delta Exchange Database Registry by product_id or exact symbol
        try:
            from src import db
            delta_contract = None
            if clean_q.isdigit():
                delta_contract = db.get_delta_contract_by_id(int(clean_q))
            if not delta_contract:
                delta_contract = db.get_delta_contract_by_symbol(clean_q)

            if delta_contract:
                settle_time = delta_contract.get("settlement_time", "")
                if settle_time:
                    clean_ts = settle_time.replace("Z", "+00:00")
                    settle_dt = datetime.fromisoformat(clean_ts)
                    if settle_dt.tzinfo is None:
                        settle_dt = settle_dt.replace(tzinfo=timezone.utc)
                    if settle_dt < datetime.now(timezone.utc):
                        return ResolutionResult(
                            status=ResolutionStatus.UNSUPPORTED,
                            query=query,
                            reason=f"Delta options contract '{delta_contract['symbol']}' has expired on {settle_time}.",
                            error_code="EXPIRED_OPTIONS_CONTRACT",
                            suggested_action="Select an active future-dated contract from Delta options chain.",
                        )

                opt_type = "CALL" if delta_contract.get("contract_type") == "call_options" else "PUT"
                inst = CanonicalInstrument(
                    instrument_id=f"DELTA:{delta_contract['symbol']}:OPTION",
                    asset_class=AssetClass.CRYPTO,
                    instrument_type=InstrumentType.OPTION,
                    provider="delta_options",
                    exchange="DELTA",
                    base_asset=delta_contract.get("underlying_symbol", "BTC"),
                    quote_asset=delta_contract.get("quoting_asset", "USD"),
                    canonical_symbol=delta_contract["symbol"],
                    provider_symbol=delta_contract["symbol"],
                    exchange_symbol=delta_contract["symbol"],
                    expiry=delta_contract.get("settlement_time"),
                    strike=float(delta_contract.get("strike_price", 0.0)),
                    option_type=opt_type,
                    tick_size=float(delta_contract.get("tick_size", 0.1)),
                    quantity_step=0.001,
                    lot_size=1.0,
                    tradable=True,
                    data_supported=True,
                    execution_supported=True,
                    settlement_asset=delta_contract.get("settling_asset", "USD"),
                    metadata={
                        "product_id": delta_contract["product_id"],
                        "contract_value": delta_contract.get("contract_value", "0.001"),
                        "trading_status": delta_contract.get("trading_status", "operational"),
                    }
                )
                return ResolutionResult(
                    status=ResolutionStatus.RESOLVED,
                    query=query,
                    instrument=inst,
                    reason="Delta Exchange option contract resolved successfully.",
                    error_code="SUCCESS",
                )
        except Exception as d_err:
            logger.debug(f"Delta DB contract lookup notice: {d_err}")

        # 1. Delta Exchange Options Format (e.g. C-BTC-78000-300826 or P-ETH-3500-250926)
        parts = clean_q.split("-")
        if len(parts) == 4 and parts[0] in ["C", "P"] and parts[1] in ["BTC", "ETH", "SOL", "XAUT"]:
            opt_letter, underlying, strike_str, expiry_ddmmyy = parts
            try:
                strike_val = float(strike_str)
                opt_type = "CALL" if opt_letter == "C" else "PUT"
                if len(expiry_ddmmyy) == 6 and expiry_ddmmyy.isdigit():
                    exp_day = int(expiry_ddmmyy[:2])
                    exp_month = int(expiry_ddmmyy[2:4])
                    exp_year = 2000 + int(expiry_ddmmyy[4:])
                    try:
                        exp_date = datetime(exp_year, exp_month, exp_day, tzinfo=timezone.utc).date()
                        if exp_date < now_date:
                            return ResolutionResult(
                                status=ResolutionStatus.UNSUPPORTED,
                                query=query,
                                reason=f"Delta options contract '{query}' expired on {exp_date.isoformat()}.",
                                error_code="EXPIRED_OPTIONS_CONTRACT",
                                suggested_action="Select an active contract from Delta options chain.",
                            )
                    except ValueError:
                        pass

                inst = CanonicalInstrument(
                    instrument_id=f"DELTA:{clean_q}:OPTION",
                    asset_class=AssetClass.CRYPTO,
                    instrument_type=InstrumentType.OPTION,
                    provider="delta_options",
                    exchange="DELTA",
                    base_asset=underlying,
                    quote_asset="USD",
                    canonical_symbol=clean_q,
                    provider_symbol=clean_q,
                    exchange_symbol=clean_q,
                    expiry=f"20{expiry_ddmmyy[4:]}-{expiry_ddmmyy[2:4]}-{expiry_ddmmyy[:2]}",
                    strike=strike_val,
                    option_type=opt_type,
                    tick_size=0.1,
                    quantity_step=0.001,
                    lot_size=1.0,
                    tradable=True,
                    data_supported=True,
                    execution_supported=True,
                    settlement_asset="USD",
                )
                return ResolutionResult(
                    status=ResolutionStatus.RESOLVED,
                    query=query,
                    instrument=inst,
                    reason="Delta Exchange option contract resolved successfully.",
                    error_code="SUCCESS",
                )
            except Exception as e:
                logger.error(f"Delta option format parse error: {e}")

        # 2. Crypto Option Format (e.g. BTC-260327-70000-C, BTC 26-09-2026 83800 CE, BTC 83800 CE, BTC-260925-70000-P)
        import re
        crypto_opt_match = None
        if len(parts) == 4 and parts[0] in ["BTC", "ETH", "SOL", "XAUT"]:
            crypto_opt_match = (parts[0], parts[1], parts[2], parts[3])
        else:
            m = re.match(r"^(BTC|ETH|SOL|XAUT)[-_ ]+(?:([0-9]{1,2}[-_/][0-9]{1,2}[-_/][0-9]{2,4}|[0-9]{6})[-_ ]+)?([0-9]+(?:\.[0-9]+)?)[-_ ]*(C|P|CE|PE|CALL|PUT)$", clean_q)
            if m:
                crypto_opt_match = m.groups()

        if crypto_opt_match:
            underlying = crypto_opt_match[0]
            expiry_raw = crypto_opt_match[1] or ""
            strike_str = crypto_opt_match[2]
            opt_type_letter = crypto_opt_match[3]

            try:
                strike_val = float(strike_str)
                if strike_val <= 0:
                    return ResolutionResult(
                        status=ResolutionStatus.UNSUPPORTED,
                        query=query,
                        reason=f"Strike price {strike_str} is invalid. Options strike must be greater than zero.",
                        error_code="INVALID_STRIKE_PRICE",
                        suggested_action="Select a positive strike price from the options chain.",
                    )

                exp_formatted = None
                # Validate Expiry Date if present
                if expiry_raw:
                    clean_exp = expiry_raw.replace("/", "-")
                    if len(clean_exp) == 6 and clean_exp.isdigit():
                        exp_year = 2000 + int(clean_exp[:2])
                        exp_month = int(clean_exp[2:4])
                        exp_day = int(clean_exp[4:])
                        exp_formatted = f"20{clean_exp[:2]}-{clean_exp[2:4]}-{clean_exp[4:]}"
                    else:
                        exp_parts = clean_exp.split("-")
                        if len(exp_parts) == 3:
                            if len(exp_parts[0]) == 4:  # YYYY-MM-DD
                                exp_year, exp_month, exp_day = int(exp_parts[0]), int(exp_parts[1]), int(exp_parts[2])
                                exp_formatted = clean_exp
                            elif len(exp_parts[2]) == 4:  # DD-MM-YYYY
                                exp_day, exp_month, exp_year = int(exp_parts[0]), int(exp_parts[1]), int(exp_parts[2])
                                exp_formatted = f"{exp_parts[2]}-{exp_parts[1].zfill(2)}-{exp_parts[0].zfill(2)}"
                            else:
                                exp_year = 2000 + int(exp_parts[0])
                                exp_month = int(exp_parts[1])
                                exp_day = int(exp_parts[2])
                                exp_formatted = f"20{exp_parts[0].zfill(2)}-{exp_parts[1].zfill(2)}-{exp_parts[2].zfill(2)}"
                    
                    try:
                        exp_date = datetime(exp_year, exp_month, exp_day, tzinfo=timezone.utc).date()
                        if exp_date < now_date:
                            return ResolutionResult(
                                status=ResolutionStatus.UNSUPPORTED,
                                query=query,
                                reason=f"Options contract '{query}' has already expired on {exp_date.isoformat()}.",
                                error_code="EXPIRED_OPTIONS_CONTRACT",
                                suggested_action="Select an active, future-dated contract from the options chain.",
                            )
                    except Exception:
                        pass

                opt_type = "CALL" if opt_type_letter.upper() in ["C", "CALL", "CE"] else "PUT"

                # Check for explicit provider configuration
                opt_provider = (provider or "delta_options").lower()
                if opt_provider in ["deribit", "deribit_options"]:
                    if not os.getenv("DERIBIT_API_KEY") and not os.getenv("DERIBIT_CLIENT_ID"):
                        return ResolutionResult(
                            status=ResolutionStatus.UNSUPPORTED,
                            query=query,
                            reason=f"Options provider '{opt_provider}' is not configured. Missing API credentials.",
                            error_code="OPTIONS_PROVIDER_NOT_CONFIGURED",
                            suggested_action="Configure Deribit API keys or select an active supported provider.",
                        )
                    selected_provider = "deribit_options"
                    selected_exchange = "DERIBIT"
                else:
                    selected_provider = "delta_options"
                    selected_exchange = "DELTA"

                inst = CanonicalInstrument(
                    instrument_id=f"{selected_exchange}:{clean_q}:OPTION",
                    asset_class=AssetClass.CRYPTO,
                    instrument_type=InstrumentType.OPTION,
                    provider=selected_provider,
                    exchange=selected_exchange,
                    base_asset=underlying,
                    quote_asset="USD",
                    canonical_symbol=clean_q,
                    provider_symbol=clean_q,
                    exchange_symbol=clean_q,
                    expiry=exp_formatted,
                    strike=strike_val,
                    option_type=opt_type,
                    tick_size=0.1,
                    quantity_step=0.001,
                    lot_size=1.0,
                    tradable=True,
                    data_supported=True,
                    execution_supported=True,
                    settlement_asset="USD",
                )
                return ResolutionResult(
                    status=ResolutionStatus.RESOLVED,
                    query=query,
                    instrument=inst,
                    reason="Crypto option contract resolved successfully.",
                    error_code="SUCCESS",
                )
            except Exception as e:
                logger.error("Crypto option parsing error: %s", e)

        # 2. NSE Indian Options Format (e.g. "NIFTY 24400 CE", "NIFTY26MAR24000CE", "NIFTY-26AUG27-24400-CE", "BANKNIFTY 51000 PE")
        import re
        # Pattern 1: Space or hyphen or compact separated
        nse_match = re.match(r"^([A-Z]+)[-_ ]*(?:([0-9]{1,2}[A-Z]{3}[0-9]{2,4})[-_ ]*)?([0-9]+(?:\.[0-9]+)?)[-_ ]*(CE|PE|CALL|PUT)$", clean_q)
        if nse_match:
            underlying, expiry_str, strike_str, opt_type_raw = nse_match.groups()
            try:
                strike_val = float(strike_str)
                if strike_val <= 0:
                    return ResolutionResult(
                        status=ResolutionStatus.UNSUPPORTED,
                        query=query,
                        reason=f"Strike price {strike_str} is invalid. Options strike must be greater than zero.",
                        error_code="INVALID_STRIKE_PRICE",
                        suggested_action="Select a positive strike price from the options chain.",
                    )

                opt_type = "CALL" if opt_type_raw in ["CE", "CALL"] else "PUT"
                
                # Check Expiry if present (e.g. 26AUG23)
                if expiry_str:
                    try:
                        # Attempt DDMMMYY parse
                        exp_dt = datetime.strptime(expiry_str, "%d%b%y" if len(expiry_str) <= 7 else "%d%b%Y")
                        if exp_dt.date() < now_date:
                            return ResolutionResult(
                                status=ResolutionStatus.UNSUPPORTED,
                                query=query,
                                reason=f"Indian NSE option contract '{query}' has already expired on {exp_dt.date().isoformat()}.",
                                error_code="EXPIRED_OPTIONS_CONTRACT",
                                suggested_action="Select a valid near-month or weekly contract from the option chain.",
                            )
                    except Exception:
                        pass

                # Dynamic lot size mapping
                lot_size = 50.0
                if "BANK" in underlying:
                    lot_size = 15.0
                elif "FINNIFTY" in underlying:
                    lot_size = 25.0
                elif "MIDCP" in underlying:
                    lot_size = 75.0
                elif "SENSEX" in underlying:
                    lot_size = 10.0
                elif "RELIANCE" in underlying:
                    lot_size = 250.0
                elif "TCS" in underlying:
                    lot_size = 175.0
                elif "INFY" in underlying:
                    lot_size = 400.0
                elif "HDFC" in underlying:
                    lot_size = 550.0

                canonical_sym = f"{underlying} {int(strike_val) if strike_val.is_integer() else strike_val} {opt_type_raw}"
                inst_id = f"NSE:{underlying}:{expiry_str or 'NEAR'}:{int(strike_val) if strike_val.is_integer() else strike_val}:{opt_type_raw}"

                inst = CanonicalInstrument(
                    instrument_id=inst_id,
                    asset_class=AssetClass.INDIAN_STOCKS,
                    instrument_type=InstrumentType.OPTION,
                    provider="upstox_options",
                    exchange="NSE",
                    base_asset=underlying,
                    quote_asset="INR",
                    canonical_symbol=canonical_sym,
                    provider_symbol=canonical_sym,
                    exchange_symbol=canonical_sym,
                    expiry=expiry_str or "",
                    strike=strike_val,
                    option_type=opt_type,
                    tick_size=0.05,
                    quantity_step=lot_size,
                    lot_size=lot_size,
                    tradable=True,
                    data_supported=True,
                    execution_supported=True,
                    settlement_asset="INR",
                )
                return ResolutionResult(
                    status=ResolutionStatus.RESOLVED,
                    query=query,
                    instrument=inst,
                    reason="NSE options contract resolved successfully.",
                    error_code="SUCCESS",
                )
            except Exception as e:
                logger.error("NSE option parsing error: %s", e)

        return ResolutionResult(
            status=ResolutionStatus.UNSUPPORTED,
            query=query,
            reason=f"Option contract '{query}' could not be parsed into a valid provider contract.",
            error_code="OPTION_PARSING_FAILED",
            suggested_action="Use standard format: 'NIFTY 24400 CE' or 'BTC-YYMMDD-STRIKE-C'.",
        )

    @classmethod
    @classmethod
    def resolve_for_bot(
        cls,
        query: str,
        execution_mode: str = "PAPER",
        asset_class: Optional[str] = None,
        market_date: Optional[date] = None
    ) -> ResolutionResult:
        """
        Authoritative entry point for bot lifecycle pre-flight validation.
        """
        res = cls.resolve(query, asset_class=asset_class, market_date=market_date)
        if res.is_valid:
            return res
        clean = (query or "").strip().upper()
        if clean in cls.CATEGORY_LABELS:
            und = cls.CATEGORY_LABELS[clean].get("underlying_symbol")
            if und:
                und_res = cls.resolve(und, market_date=market_date)
                if und_res.is_valid:
                    return und_res
        return res

    def resolve_bot(self, query: str, execution_mode: str = "PAPER", asset_class: Optional[str] = None) -> ResolutionResult:
        return self.__class__.resolve_for_bot(query, execution_mode=execution_mode, asset_class=asset_class)

    @classmethod
    def get_underlying_symbol(cls, query: str) -> str:
        """Returns the executable underlying symbol for any symbol or category."""
        clean = (query or "").strip().upper()
        if clean in cls.CATEGORY_LABELS and "underlying_symbol" in cls.CATEGORY_LABELS[clean]:
            return cls.CATEGORY_LABELS[clean]["underlying_symbol"]
        return query

    @classmethod
    def list_all_instruments(cls) -> List[Dict[str, Any]]:
        """Returns all canonical instruments formatted as dicts."""
        return [inst.to_dict() for inst in cls._CANONICAL_REGISTRY.values()]


# Global shared instance
global_instrument_resolver = InstrumentResolver()
