"""
Stock Instrument Master
=======================
Central repository and memory index for all discovered pure equities.
Provides fast multi-index lookup (by canonical ID, provider token, symbol+exchange, ISIN).
"""

from typing import Dict, List, Optional, Set, Any
from market_data.stocks.models import StockInstrument
from market_data.stocks.taxonomy import StockTaxonomy


class StockInstrumentMaster:
    """In-memory indexed catalog of all authorized stock instruments."""

    def __init__(self):
        self._by_id: Dict[str, StockInstrument] = {}
        self._by_symbol_exchange: Dict[str, StockInstrument] = {}
        self._by_isin: Dict[str, StockInstrument] = {}
        self._by_exchange: Dict[str, List[StockInstrument]] = {}
        self._by_region: Dict[str, List[StockInstrument]] = {}

    def clear(self) -> None:
        self._by_id.clear()
        self._by_symbol_exchange.clear()
        self._by_isin.clear()
        self._by_exchange.clear()
        self._by_region.clear()

    def register(self, instrument: StockInstrument) -> None:
        """Registers or updates a stock instrument in all lookup indexes."""
        self._by_id[instrument.instrument_id] = instrument
        
        sym_ex_key = f"{instrument.symbol.upper()}:{instrument.exchange.upper()}"
        self._by_symbol_exchange[sym_ex_key] = instrument

        if instrument.isin:
            self._by_isin[instrument.isin.upper()] = instrument

        ex = instrument.exchange.upper()
        if ex not in self._by_exchange:
            self._by_exchange[ex] = []
        self._by_exchange[ex].append(instrument)

        region = instrument.region.upper()
        if region not in self._by_region:
            self._by_region[region] = []
        self._by_region[region].append(instrument)

    def bulk_register(self, instruments: List[StockInstrument]) -> int:
        count = 0
        for inst in instruments:
            self.register(inst)
            count += 1
        return count

    def get_by_id(self, instrument_id: str) -> Optional[StockInstrument]:
        return self._by_id.get(instrument_id)

    def get_by_symbol(self, symbol: str, exchange: str = "NSE") -> Optional[StockInstrument]:
        key = f"{symbol.upper()}:{exchange.upper()}"
        return self._by_symbol_exchange.get(key)

    def get_by_isin(self, isin: str) -> Optional[StockInstrument]:
        return self._by_isin.get(isin.upper())

    def get_all(self) -> List[StockInstrument]:
        return list(self._by_id.values())

    def get_by_exchange(self, exchange: str) -> List[StockInstrument]:
        return self._by_exchange.get(exchange.upper(), [])

    def get_by_region(self, region: str) -> List[StockInstrument]:
        return self._by_region.get(region.upper(), [])

    def count(self) -> int:
        return len(self._by_id)


global_stock_master = StockInstrumentMaster()
