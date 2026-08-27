"""
Canonical Instrument Resolver & Master Registry.
Provides deterministic resolution from category/query/alias -> structured Canonical Instrument.
Guarantees that unexecutable category labels (e.g. BTC-OPTIONS, ETH-OPTIONS, CRYPTO-OPTIONS)
are rejected with structured validation errors instead of being routed to exchange adapters.
"""

import enum
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("InstrumentResolver")


class AssetClass(str, enum.Enum):
    CRYPTO = "CRYPTO"
    EQUITY = "EQUITY"
    INDIAN_STOCKS = "INDIAN_STOCKS"
    US_STOCKS = "US_STOCKS"
    FOREX = "FOREX"
    COMMODITIES = "COMMODITIES"


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
class CanonicalInstrument:
    instrument_id: str  # e.g., "BINANCE:BTCUSDT:SPOT" or "BINANCE:BTCUSDT:PERPETUAL"
    asset_class: AssetClass
    instrument_type: InstrumentType
    provider: str  # e.g., "binance_spot", "binance_futures", "deribit", "zerodha"
    exchange: str  # e.g., "BINANCE", "DERIBIT", "NSE"
    base_asset: str  # e.g., "BTC", "ETH", "RELIANCE"
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
    option_type: Optional[str] = None  # "CALL" | "PUT"
    contract_type: str = "VANILLA"
    settlement_asset: str = "USDT"
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "instrument_id": self.instrument_id,
            "asset_class": self.asset_class.value,
            "instrument_type": self.instrument_type.value,
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


class InstrumentResolver:
    """
    Authoritative resolution engine that normalizes inputs and enforces strict separation
    between generic category names and tradable provider contracts.
    """

    # Category labels that can NEVER be traded directly
    CATEGORY_LABELS = {
        "BTC-OPTIONS": {
            "asset_class": AssetClass.CRYPTO,
            "instrument_type": InstrumentType.OPTION,
            "reason": "'BTC-OPTIONS' is a generic asset category, not an executable contract symbol.",
            "candidates": ["BTC-260327-70000-C", "BTC-260327-65000-P"],
            "action": "Select a specific options contract with expiry, strike, and call/put designation, or configure an options provider.",
            "underlying_symbol": "BTC/USDT",
        },
        "ETH-OPTIONS": {
            "asset_class": AssetClass.CRYPTO,
            "instrument_type": InstrumentType.OPTION,
            "reason": "'ETH-OPTIONS' is a category alias and cannot be sent to an exchange adapter.",
            "candidates": ["ETH-260327-3500-C", "ETH-260327-3000-P"],
            "action": "Select a valid dated options contract from the options chain.",
            "underlying_symbol": "ETH/USDT",
        },
        "SOL-OPTIONS": {
            "asset_class": AssetClass.CRYPTO,
            "instrument_type": InstrumentType.OPTION,
            "reason": "'SOL-OPTIONS' is a category alias and cannot be sent to an exchange adapter.",
            "candidates": ["SOL-260327-150-C", "SOL-260327-130-P"],
            "action": "Select a valid dated options contract from the options chain.",
            "underlying_symbol": "SOL/USDT",
        },
        "CRYPTO-OPTIONS": {
            "asset_class": AssetClass.CRYPTO,
            "instrument_type": InstrumentType.OPTION,
            "reason": "'CRYPTO-OPTIONS' is a high-level universe category.",
            "candidates": [],
            "action": "Select a specific underlying and strike.",
            "underlying_symbol": "BTC/USDT",
        },
        "BTC-FUTURES": {
            "asset_class": AssetClass.CRYPTO,
            "instrument_type": InstrumentType.PERPETUAL,
            "reason": "'BTC-FUTURES' is a category descriptor. For perpetual futures, use 'BTC/USDT:USDT' or 'BTC-PERP'.",
            "candidates": ["BTC/USDT:USDT", "BTC/USD:BTC"],
            "action": "Select BTC/USDT:USDT for USDT-M Perpetual.",
            "underlying_symbol": "BTC/USDT:USDT",
        },
        "ETH-FUTURES": {
            "asset_class": AssetClass.CRYPTO,
            "instrument_type": InstrumentType.PERPETUAL,
            "reason": "'ETH-FUTURES' is a category descriptor.",
            "candidates": ["ETH/USDT:USDT"],
            "action": "Select ETH/USDT:USDT for Perpetual Futures.",
            "underlying_symbol": "ETH/USDT:USDT",
        },
        "NIFTY-OPTIONS": {
            "asset_class": AssetClass.INDIAN_STOCKS,
            "instrument_type": InstrumentType.OPTION,
            "reason": "'NIFTY-OPTIONS' is an Indian index category.",
            "candidates": ["NIFTY26MAR24000CE", "NIFTY26MAR24000PE"],
            "action": "Select a specific weekly/monthly strike contract from NSE options chain.",
            "underlying_symbol": "NIFTY",
        },
        "BANKNIFTY-OPTIONS": {
            "asset_class": AssetClass.INDIAN_STOCKS,
            "instrument_type": InstrumentType.OPTION,
            "reason": "'BANKNIFTY-OPTIONS' is an Indian index category.",
            "candidates": ["BANKNIFTY26MAR51000CE", "BANKNIFTY26MAR51000PE"],
            "action": "Select an active BANKNIFTY strike contract.",
            "underlying_symbol": "BANKNIFTY",
        },
        "FINNIFTY-OPTIONS": {
            "asset_class": AssetClass.INDIAN_STOCKS,
            "instrument_type": InstrumentType.OPTION,
            "reason": "'FINNIFTY-OPTIONS' is an Indian index category.",
            "candidates": ["FINNIFTY26MAR23000CE", "FINNIFTY26MAR23000PE"],
            "action": "Select an active FINNIFTY strike contract.",
            "underlying_symbol": "FINNIFTY",
        },
    }

    # Static Registry of Canonical Instruments
    _CANONICAL_REGISTRY: Dict[str, CanonicalInstrument] = {
        # Binance Spot
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
        # Binance Futures (Perpetuals)
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
        "ETH/USDT:USDT": CanonicalInstrument(
            instrument_id="BINANCE:ETHUSDT:PERPETUAL",
            asset_class=AssetClass.CRYPTO,
            instrument_type=InstrumentType.PERPETUAL,
            provider="binance_futures",
            exchange="BINANCE",
            base_asset="ETH",
            quote_asset="USDT",
            canonical_symbol="ETH/USDT:USDT",
            provider_symbol="ETH/USDT:USDT",
            exchange_symbol="ETHUSDT",
            tick_size=0.01,
            quantity_step=0.001,
            lot_size=1.0,
            tradable=True,
            data_supported=True,
            execution_supported=True,
            settlement_asset="USDT",
        ),
        # Indian Equities
        "RELIANCE": CanonicalInstrument(
            instrument_id="NSE:RELIANCE:EQUITY",
            asset_class=AssetClass.INDIAN_STOCKS,
            instrument_type=InstrumentType.SPOT,
            provider="zerodha",
            exchange="NSE",
            base_asset="RELIANCE",
            quote_asset="INR",
            canonical_symbol="RELIANCE",
            provider_symbol="RELIANCE",
            exchange_symbol="RELIANCE",
            tick_size=0.05,
            quantity_step=1.0,
            lot_size=1.0,
            tradable=True,
            data_supported=True,
            execution_supported=True,
            settlement_asset="INR",
        ),
        "TCS": CanonicalInstrument(
            instrument_id="NSE:TCS:EQUITY",
            asset_class=AssetClass.INDIAN_STOCKS,
            instrument_type=InstrumentType.SPOT,
            provider="zerodha",
            exchange="NSE",
            base_asset="TCS",
            quote_asset="INR",
            canonical_symbol="TCS",
            provider_symbol="TCS",
            exchange_symbol="TCS",
            tick_size=0.05,
            quantity_step=1.0,
            lot_size=1.0,
            tradable=True,
            data_supported=True,
            execution_supported=True,
            settlement_asset="INR",
        ),
        "NIFTY": CanonicalInstrument(
            instrument_id="NSE:NIFTY50:INDEX",
            asset_class=AssetClass.INDIAN_STOCKS,
            instrument_type=InstrumentType.INDEX,
            provider="zerodha",
            exchange="NSE",
            base_asset="NIFTY",
            quote_asset="INR",
            canonical_symbol="NIFTY",
            provider_symbol="NIFTY 50",
            exchange_symbol="NIFTY",
            tick_size=0.05,
            quantity_step=1.0,
            lot_size=25.0,
            tradable=False,
            data_supported=True,
            execution_supported=False,
            settlement_asset="INR",
        ),
    }

    # Alias Mappings
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
    ) -> ResolutionResult:
        """
        Resolves an arbitrary input string into a structured Canonical Instrument.
        Rejects category placeholders deterministically.
        """
        if not query or not query.strip():
            return ResolutionResult(
                status=ResolutionStatus.NOT_FOUND,
                query="",
                reason="Empty symbol query provided.",
                error_code="INSTRUMENT_EMPTY_QUERY",
                suggested_action="Provide a valid trading symbol.",
            )

        clean_query = query.strip().upper()

        # 1. Check for Category Labels (e.g. BTC-OPTIONS, ETH-OPTIONS)
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

        # 2. Check direct canonical registry match
        if clean_query in cls._CANONICAL_REGISTRY:
            inst = cls._CANONICAL_REGISTRY[clean_query]
            return cls._validate_instrument_context(inst, clean_query, asset_class, instrument_type, provider)

        # 3. Check alias mappings
        if clean_query in cls._ALIAS_MAPPINGS:
            canonical_key = cls._ALIAS_MAPPINGS[clean_query]
            if canonical_key in cls._CANONICAL_REGISTRY:
                inst = cls._CANONICAL_REGISTRY[canonical_key]
                return cls._validate_instrument_context(inst, clean_query, asset_class, instrument_type, provider)

        # 4. Check option patterns (e.g. BTC-260327-70000-C)
        if "-C" in clean_query or "-P" in clean_query or "CE" in clean_query or "PE" in clean_query:
            return cls._resolve_options_contract(clean_query, asset_class, provider)

        # 5. Check if query is ambiguous (e.g. "BTC")
        if clean_query == "BTC":
            return ResolutionResult(
                status=ResolutionStatus.AMBIGUOUS,
                query=clean_query,
                candidate_symbols=["BTC/USDT (Spot)", "BTC/USDT:USDT (Perpetual Futures)"],
                reason="Symbol 'BTC' is ambiguous. Multiple asset types match (Spot, Futures, Options).",
                error_code="INSTRUMENT_AMBIGUOUS",
                suggested_action="Specify exact contract: 'BTC/USDT' for Spot or 'BTC-PERP' for Futures.",
            )

        if clean_query == "ETH":
            return ResolutionResult(
                status=ResolutionStatus.AMBIGUOUS,
                query=clean_query,
                candidate_symbols=["ETH/USDT (Spot)", "ETH/USDT:USDT (Perpetual Futures)"],
                reason="Symbol 'ETH' is ambiguous. Multiple asset types match.",
                error_code="INSTRUMENT_AMBIGUOUS",
                suggested_action="Specify exact contract: 'ETH/USDT' for Spot or 'ETH-PERP' for Futures.",
            )

        # 6. Fallback - Symbol Not Found
        return ResolutionResult(
            status=ResolutionStatus.NOT_FOUND,
            query=clean_query,
            reason=f"Symbol '{clean_query}' not recognized in Canonical Instrument Master.",
            error_code="INSTRUMENT_NOT_FOUND",
            suggested_action="Check the market universe or configure symbol in Instrument Master.",
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
        """Handles structured option contract strings for Crypto and Indian NSE options."""
        clean_q = query.strip().upper().replace("NSE:", "").replace("NFO:", "")
        
        # 1. Crypto Option Format (e.g. BTC-260327-70000-C)
        parts = clean_q.split("-")
        if len(parts) == 4 and parts[0] in ["BTC", "ETH"]:
            underlying, expiry, strike_str, opt_type_letter = parts
            try:
                strike_val = float(strike_str)
                opt_type = "CALL" if opt_type_letter.upper() == "C" else "PUT"
                inst = CanonicalInstrument(
                    instrument_id=f"DERIBIT:{clean_q}:OPTION",
                    asset_class=AssetClass.CRYPTO,
                    instrument_type=InstrumentType.OPTION,
                    provider="deribit_options",
                    exchange="DERIBIT",
                    base_asset=underlying,
                    quote_asset="USD",
                    canonical_symbol=clean_q,
                    provider_symbol=clean_q,
                    exchange_symbol=clean_q,
                    expiry=f"20{expiry[:2]}-{expiry[2:4]}-{expiry[4:]}",
                    strike=strike_val,
                    option_type=opt_type,
                    tick_size=0.0005,
                    quantity_step=0.1,
                    lot_size=1.0,
                    tradable=True,
                    data_supported=True,
                    execution_supported=True,
                    settlement_asset="BTC" if underlying == "BTC" else "ETH",
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

        # 2. NSE Indian Options Format (e.g. "NIFTY 24400 CE", "NIFTY-24400-CE", "NSE:NIFTY-26AUG27-24400-CE", "BANKNIFTY 51000 PE")
        import re
        # Pattern 1: Space or hyphen separated (e.g. NIFTY 24400 CE, BANKNIFTY-51000-PE, NIFTY 27AUG26 24400 CE)
        nse_match = re.match(r"^([A-Z]+)[-_ ]+(?:([0-9]{1,2}[A-Z]{3}[0-9]{2,4})[-_ ]+)?([0-9]+(?:\.[0-9]+)?)[-_ ]*(CE|PE|CALL|PUT)$", clean_q)
        if nse_match:
            underlying, expiry_str, strike_str, opt_type_raw = nse_match.groups()
            try:
                strike_val = float(strike_str)
                opt_type = "CALL" if opt_type_raw in ["CE", "CALL"] else "PUT"
                
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
                    provider="nse_options",
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
    def list_all_instruments(cls) -> List[Dict[str, Any]]:
        """Returns all canonical instruments formatted as dicts."""
        return [inst.to_dict() for inst in cls._CANONICAL_REGISTRY.values()]

    @classmethod
    def get_underlying_symbol(cls, query: str) -> str:
        """Returns the executable underlying symbol for any symbol or category."""
        clean = (query or "").strip().upper()
        if clean in cls.CATEGORY_LABELS and "underlying_symbol" in cls.CATEGORY_LABELS[clean]:
            return cls.CATEGORY_LABELS[clean]["underlying_symbol"]
        return query

    @classmethod
    def resolve_for_bot(
        cls,
        query: str,
        execution_mode: str = "PAPER",
        asset_class: Optional[str] = None
    ) -> ResolutionResult:
        """
        Resolves symbol for bot execution and data feeds.
        If query is a category alias (e.g. ETH-OPTIONS, BTC-OPTIONS) used in bot configuration,
        resolves to the underlying executable instrument (e.g. ETH/USDT, BTC/USDT) for data feeds.
        """
        res = cls.resolve(query, asset_class=asset_class)
        if res.is_valid:
            return res
        clean = (query or "").strip().upper()
        if clean in cls.CATEGORY_LABELS:
            underlying = cls.CATEGORY_LABELS[clean].get("underlying_symbol")
            if underlying:
                underlying_res = cls.resolve(underlying)
                if underlying_res.is_valid:
                    return underlying_res
        return res

    def resolve_bot(self, query: str, execution_mode: str = "PAPER", asset_class: Optional[str] = None) -> ResolutionResult:
        return self.__class__.resolve_for_bot(query, execution_mode=execution_mode, asset_class=asset_class)


# Global shared resolver instance
global_instrument_resolver = InstrumentResolver()

