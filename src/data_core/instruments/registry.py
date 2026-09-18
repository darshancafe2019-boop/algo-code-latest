"""
Canonical Instrument Registry
=============================
Master universe index for Indian Equities, Index & Stock Derivatives (NSE),
Crypto Perpetuals & Options (Binance, Delta India, Deribit), and FX (Exness).

Invariants:
1. Every instrument is indexed by unique canonicalInstrumentId.
2. Bidirectional translation between internal canonical ID and provider-specific keys.
3. Contract specifications (lotSize, multiplier, tickSize, strike, expiry) are strictly maintained.
"""
from __future__ import annotations

import logging
import threading
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional

logger = logging.getLogger("InstrumentRegistry")


@dataclass
class CanonicalInstrument:
    canonical_instrument_id: str
    symbol: str
    display_name: str
    exchange: str
    segment: str  # "EQUITY" | "FUTURES" | "OPTIONS" | "CRYPTO_PERPETUAL" | "CRYPTO_OPTION" | "FX"
    asset_class: str
    underlying: Optional[str] = None
    expiry: Optional[str] = None
    strike: Optional[float] = None
    option_type: Optional[str] = None  # "CE" | "PE"
    currency: str = "USD"
    settlement_currency: str = "USD"
    lot_size: float = 1.0
    contract_multiplier: float = 1.0
    tick_size: float = 0.01
    provider_mappings: Dict[str, str] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class CanonicalInstrumentRegistry:
    """Thread-safe master instrument catalog with multi-key indexing."""

    def __init__(self):
        self._lock = threading.RLock()
        self._instruments: Dict[str, CanonicalInstrument] = {}
        self._provider_key_index: Dict[str, str] = {}  # f"{provider}:{provider_key}" -> canonical_id
        self._bootstrap_universe()

    def _bootstrap_universe(self) -> None:
        """Seeds canonical instrument specifications across all supported venues."""
        # 1. Indian Index Derivatives (NSE)
        self.register(
            CanonicalInstrument(
                canonical_instrument_id="NSE:NIFTY26MARFUT",
                symbol="NIFTY-27MAR26-FUT",
                display_name="NIFTY 27-MAR-2026 Future",
                exchange="NSE",
                segment="FUTURES",
                asset_class="EQUITY_INDEX",
                underlying="NIFTY",
                expiry="2026-03-27",
                currency="INR",
                settlement_currency="INR",
                lot_size=50.0,
                contract_multiplier=50.0,
                tick_size=0.05,
                provider_mappings={
                    "UPSTOX": "NSE_FO|45821",
                    "DHAN": "1001",
                },
            )
        )
        self.register(
            CanonicalInstrument(
                canonical_instrument_id="NSE:BANKNIFTY26MARFUT",
                symbol="BANKNIFTY-27MAR26-FUT",
                display_name="BANKNIFTY 27-MAR-2026 Future",
                exchange="NSE",
                segment="FUTURES",
                asset_class="EQUITY_INDEX",
                underlying="BANKNIFTY",
                expiry="2026-03-27",
                currency="INR",
                settlement_currency="INR",
                lot_size=15.0,
                contract_multiplier=15.0,
                tick_size=0.05,
                provider_mappings={
                    "UPSTOX": "NSE_FO|45822",
                    "DHAN": "1002",
                },
            )
        )

        # 2. Indian Index Options (NSE NIFTY Options Chain)
        for strike in [24500, 24600, 24700, 24800, 24900, 25000, 25100, 25200, 25300, 25400, 25500]:
            # Call
            self.register(
                CanonicalInstrument(
                    canonical_instrument_id=f"NSE:NIFTY26MAR{strike}CE",
                    symbol=f"NIFTY-27MAR26-{strike}-CE",
                    display_name=f"NIFTY 27-MAR-2026 {strike} CE",
                    exchange="NSE",
                    segment="OPTIONS",
                    asset_class="EQUITY_OPTION",
                    underlying="NIFTY",
                    expiry="2026-03-27",
                    strike=float(strike),
                    option_type="CE",
                    currency="INR",
                    settlement_currency="INR",
                    lot_size=50.0,
                    contract_multiplier=50.0,
                    tick_size=0.05,
                    provider_mappings={
                        "UPSTOX": f"NSE_FO|OPT_NIFTY_{strike}_CE",
                        "DHAN": f"OPT_NIFTY_{strike}_CE",
                    },
                )
            )
            # Put
            self.register(
                CanonicalInstrument(
                    canonical_instrument_id=f"NSE:NIFTY26MAR{strike}PE",
                    symbol=f"NIFTY-27MAR26-{strike}-PE",
                    display_name=f"NIFTY 27-MAR-2026 {strike} PE",
                    exchange="NSE",
                    segment="OPTIONS",
                    asset_class="EQUITY_OPTION",
                    underlying="NIFTY",
                    expiry="2026-03-27",
                    strike=float(strike),
                    option_type="PE",
                    currency="INR",
                    settlement_currency="INR",
                    lot_size=50.0,
                    contract_multiplier=50.0,
                    tick_size=0.05,
                    provider_mappings={
                        "UPSTOX": f"NSE_FO|OPT_NIFTY_{strike}_PE",
                        "DHAN": f"OPT_NIFTY_{strike}_PE",
                    },
                )
            )

        # 3. Binance Crypto USD-M & COIN-M Perpetuals
        self.register(
            CanonicalInstrument(
                canonical_instrument_id="BINANCE:BTCUSDT_PERP",
                symbol="BTC/USDT",
                display_name="BTC/USDT USD-M Perpetual",
                exchange="BINANCE",
                segment="CRYPTO_PERPETUAL",
                asset_class="CRYPTO",
                underlying="BTC",
                currency="USDT",
                settlement_currency="USDT",
                lot_size=0.001,
                contract_multiplier=1.0,
                tick_size=0.1,
                provider_mappings={
                    "BINANCE_USDM": "BTCUSDT",
                    "BINANCE": "BTCUSDT",
                },
            )
        )
        self.register(
            CanonicalInstrument(
                canonical_instrument_id="BINANCE:ETHUSDT_PERP",
                symbol="ETH/USDT",
                display_name="ETH/USDT USD-M Perpetual",
                exchange="BINANCE",
                segment="CRYPTO_PERPETUAL",
                asset_class="CRYPTO",
                underlying="ETH",
                currency="USDT",
                settlement_currency="USDT",
                lot_size=0.001,
                contract_multiplier=1.0,
                tick_size=0.01,
                provider_mappings={
                    "BINANCE_USDM": "ETHUSDT",
                    "BINANCE": "ETHUSDT",
                },
            )
        )
        self.register(
            CanonicalInstrument(
                canonical_instrument_id="BINANCE:BTCUSD_COINM_PERP",
                symbol="BTC/USD",
                display_name="BTC/USD COIN-M Inverse Perpetual",
                exchange="BINANCE",
                segment="CRYPTO_PERPETUAL",
                asset_class="CRYPTO",
                underlying="BTC",
                currency="USD",
                settlement_currency="BTC",
                lot_size=1.0,
                contract_multiplier=100.0,
                tick_size=0.1,
                provider_mappings={
                    "BINANCE_COINM": "BTCUSD_PERP",
                },
            )
        )

        # 4. Delta Exchange India Crypto Derivatives
        self.register(
            CanonicalInstrument(
                canonical_instrument_id="DELTA:BTC_USDT_PERP",
                symbol="BTC/USDT:DELTA",
                display_name="Delta India BTC/USDT Perpetual",
                exchange="DELTA",
                segment="CRYPTO_PERPETUAL",
                asset_class="CRYPTO",
                underlying="BTC",
                currency="USDT",
                settlement_currency="USDT",
                lot_size=0.001,
                contract_multiplier=1.0,
                tick_size=0.5,
                provider_mappings={
                    "DELTA": "BTCUSDT",
                },
            )
        )
        self.register(
            CanonicalInstrument(
                canonical_instrument_id="DELTA:SOL_USDT_PERP",
                symbol="SOL/USDT:DELTA",
                display_name="Delta India SOL/USDT Perpetual",
                exchange="DELTA",
                segment="CRYPTO_PERPETUAL",
                asset_class="CRYPTO",
                underlying="SOL",
                currency="USDT",
                settlement_currency="USDT",
                lot_size=0.1,
                contract_multiplier=1.0,
                tick_size=0.01,
                provider_mappings={
                    "DELTA": "SOLUSDT",
                },
            )
        )

    def register(self, instrument: CanonicalInstrument) -> None:
        """Registers a canonical instrument and creates lookup indices."""
        with self._lock:
            self._instruments[instrument.canonical_instrument_id] = instrument
            for provider, key in instrument.provider_mappings.items():
                self._provider_key_index[f"{provider.upper()}:{key}"] = instrument.canonical_instrument_id

    def get_by_id(self, canonical_id: str) -> Optional[CanonicalInstrument]:
        """Retrieves canonical instrument by ID."""
        with self._lock:
            return self._instruments.get(canonical_id)

    def get_by_canonical_id(self, canonical_id: str) -> Optional[CanonicalInstrument]:
        """Alias for get_by_id."""
        return self.get_by_id(canonical_id)

    def get_option_chain_instruments(self, underlying: str, expiry: Optional[str] = None) -> List[CanonicalInstrument]:
        """Alias for get_options_by_underlying."""
        return self.get_options_by_underlying(underlying, expiry)

    def get_by_provider_key(self, provider: str, provider_key: str) -> Optional[CanonicalInstrument]:
        """Translates provider raw symbol/securityId to CanonicalInstrument."""
        with self._lock:
            lookup_key = f"{provider.upper()}:{provider_key}"
            canonical_id = self._provider_key_index.get(lookup_key)
            if canonical_id:
                return self._instruments.get(canonical_id)
            return None

    def get_options_by_underlying(self, underlying: str, expiry: Optional[str] = None) -> List[CanonicalInstrument]:
        """Retrieves all option contracts for a given underlying index or asset."""
        with self._lock:
            results = []
            for inst in self._instruments.values():
                if inst.segment in ("OPTIONS", "CRYPTO_OPTION") and inst.underlying == underlying:
                    if expiry and inst.expiry != expiry:
                        continue
                    results.append(inst)
            return sorted(results, key=lambda x: (x.strike or 0.0, x.option_type or ""))

    def get_all(self, segment: Optional[str] = None, exchange: Optional[str] = None) -> List[CanonicalInstrument]:
        """Queries instruments matching optional filters."""
        with self._lock:
            results = list(self._instruments.values())
            if segment:
                results = [i for i in results if i.segment == segment]
            if exchange:
                results = [i for i in results if i.exchange == exchange]
            return results


# Global Singleton Instance
global_instrument_registry = CanonicalInstrumentRegistry()
