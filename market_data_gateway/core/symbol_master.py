"""
Universal Instrument Master & Provider Key Resolution
=====================================================
Unified mapping of provider-specific identifiers to canonical symbols.
"""
from __future__ import annotations

import logging
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional, Set

logger = logging.getLogger("MDGateway.SymbolMaster")


@dataclass
class CanonicalMasterRecord:
    canonical_symbol: str
    display_symbol: str
    asset_class: str      # STOCKS | INDICES | FUTURES | OPTIONS | CRYPTO | CRYPTO_FUTURES | CRYPTO_OPTIONS
    exchange: str         # NSE | BSE | DELTA | BINANCE
    instrument_type: str  # SPOT | FUTURE | OPTION | INDEX
    underlying: str
    strike: Optional[float] = None
    expiry: Optional[str] = None
    option_type: Optional[str] = None  # CE | PE | CALL | PUT | None
    lot_size: int = 1
    tick_size: float = 0.05
    
    # Provider-Specific Key Mappings
    upstox_key: Optional[str] = None
    dhan_security_id: Optional[str] = None
    zerodha_token: Optional[str] = None
    delta_symbol: Optional[str] = None
    binance_symbol: Optional[str] = None
    angelone_token: Optional[str] = None


class UniversalSymbolMaster:
    """Central store resolving canonical symbols to/from provider-specific keys."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(UniversalSymbolMaster, cls).__new__(cls)
            cls._instance._init_master()
        return cls._instance

    def _init_master(self):
        self._by_canonical: Dict[str, CanonicalMasterRecord] = {}
        self._by_upstox: Dict[str, str] = {}
        self._by_dhan: Dict[str, str] = {}
        self._by_delta: Dict[str, str] = {}
        self._by_binance: Dict[str, str] = {}
        self._by_zerodha: Dict[str, str] = {}
        self._init_seed_data()

    def _init_seed_data(self):
        seeds = [
            CanonicalMasterRecord(
                canonical_symbol="NIFTY:INDEX",
                display_symbol="NIFTY 50",
                asset_class="INDICES",
                exchange="NSE",
                instrument_type="INDEX",
                underlying="NIFTY",
                lot_size=50,
                upstox_key="NSE_INDEX|Nifty 50",
                dhan_security_id="13",
                zerodha_token="256265"
            ),
            CanonicalMasterRecord(
                canonical_symbol="BANKNIFTY:INDEX",
                display_symbol="BANK NIFTY",
                asset_class="INDICES",
                exchange="NSE",
                instrument_type="INDEX",
                underlying="BANKNIFTY",
                lot_size=15,
                upstox_key="NSE_INDEX|Nifty Bank",
                dhan_security_id="25",
                zerodha_token="260105"
            ),
            CanonicalMasterRecord(
                canonical_symbol="RELIANCE:EQ",
                display_symbol="RELIANCE",
                asset_class="STOCKS",
                exchange="NSE",
                instrument_type="SPOT",
                underlying="RELIANCE",
                lot_size=1,
                upstox_key="NSE_EQ|INE002A01018",
                dhan_security_id="2885",
                zerodha_token="738561"
            ),
            CanonicalMasterRecord(
                canonical_symbol="BTC:USDT:SPOT",
                display_symbol="BTC/USDT",
                asset_class="CRYPTO",
                exchange="BINANCE",
                instrument_type="SPOT",
                underlying="BTC",
                binance_symbol="BTCUSDT",
                delta_symbol="BTCUSD"
            ),
            CanonicalMasterRecord(
                canonical_symbol="ETH:USDT:SPOT",
                display_symbol="ETH/USDT",
                asset_class="CRYPTO",
                exchange="BINANCE",
                instrument_type="SPOT",
                underlying="ETH",
                binance_symbol="ETHUSDT",
                delta_symbol="ETHUSD"
            ),
            CanonicalMasterRecord(
                canonical_symbol="SOL:USDT:SPOT",
                display_symbol="SOL/USDT",
                asset_class="CRYPTO",
                exchange="BINANCE",
                instrument_type="SPOT",
                underlying="SOL",
                binance_symbol="SOLUSDT",
                delta_symbol="SOLUSD"
            ),
        ]
        for s in seeds:
            self.register_record(s)

    def register_record(self, rec: CanonicalMasterRecord) -> None:
        self._by_canonical[rec.canonical_symbol.upper()] = rec
        if rec.upstox_key:
            self._by_upstox[rec.upstox_key.upper()] = rec.canonical_symbol
        if rec.dhan_security_id:
            self._by_dhan[rec.dhan_security_id.upper()] = rec.canonical_symbol
        if rec.delta_symbol:
            self._by_delta[rec.delta_symbol.upper()] = rec.canonical_symbol
        if rec.binance_symbol:
            self._by_binance[rec.binance_symbol.upper()] = rec.canonical_symbol
        if rec.zerodha_token:
            self._by_zerodha[rec.zerodha_token.upper()] = rec.canonical_symbol

    def resolve_to_canonical(self, raw_symbol_or_key: str, provider: Optional[str] = None) -> str:
        s = raw_symbol_or_key.strip().upper()
        if s in self._by_canonical:
            return s
        if s in self._by_upstox:
            return self._by_upstox[s]
        if s in self._by_dhan:
            return self._by_dhan[s]
        if s in self._by_delta:
            return self._by_delta[s]
        if s in self._by_binance:
            return self._by_binance[s]
        if s in self._by_zerodha:
            return self._by_zerodha[s]
        return s

    def get_provider_key(self, canonical_or_symbol: str, target_provider: str) -> Optional[str]:
        p = target_provider.lower().replace("_ws", "").strip()
        can = self.resolve_to_canonical(canonical_or_symbol)
        rec = self._by_canonical.get(can)
        if not rec:
            return canonical_or_symbol
        if "upstox" in p:
            return rec.upstox_key or rec.display_symbol
        elif "dhan" in p:
            return rec.dhan_security_id or rec.display_symbol
        elif "delta" in p:
            return rec.delta_symbol or rec.display_symbol
        elif "binance" in p:
            return rec.binance_symbol or rec.display_symbol
        return rec.display_symbol


global_symbol_master = UniversalSymbolMaster()
