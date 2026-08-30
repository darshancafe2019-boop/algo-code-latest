"""
Pure Equity Taxonomy & Asset Class Validation
=============================================
Strict validation rules separating stocks, ETFs, indices, and derivatives.
Completely eliminates cross-asset leakage (e.g., options fields on spot crypto or stocks).
"""

from typing import Dict, Any, Optional
from market_data.stocks.enums import (
    StockRegion,
    StockExchange,
    StockInstrumentType,
    MarketCapCategory,
)


class StockTaxonomy:
    """Canonical Equity Taxonomy & Classification Rules."""

    VALID_EQUITY_TYPES = {
        "EQUITY", "ETF", "ADR", "REIT", "PREFERENCE_SHARE"
    }

    INDIAN_EXCHANGES = {"NSE", "BSE"}
    US_EXCHANGES = {"NYSE", "NASDAQ", "AMEX", "BATS"}
    GLOBAL_EXCHANGES = {"LSE", "TSX", "HKEX", "TYO", "FWB"}

    @classmethod
    def is_valid_stock(cls, instrument: Dict[str, Any]) -> bool:
        """
        Validates that an instrument record is purely an equity/ETF and not
        a crypto asset, derivative, bond, forex pair, or index.
        """
        if not isinstance(instrument, dict):
            return False

        asset_class = str(instrument.get("asset_class", "")).upper()
        inst_type = str(instrument.get("instrument_type", "")).upper()
        sym = str(instrument.get("symbol", "")).upper()

        # Reject derivatives
        if any(deriv in inst_type for deriv in ["OPTION", "FUTURE", "PERPETUAL", "SWAP"]):
            return False
        if any(deriv in asset_class for deriv in ["OPTION", "FUTURES", "DERIVATIVE"]):
            return False

        # Reject crypto, forex, commodities, bonds, economy
        if any(non_stock in asset_class for non_stock in ["CRYPTO", "FOREX", "COMMODITY", "BOND", "ECONOMY", "ECONOMIC"]):
            return False

        # Reject spot crypto pairs
        if any(fiat in sym for fiat in ["/USDT", "USDT", "/BUSD", "/USDC"]) and not any(us in instrument.get("exchange", "") for us in cls.US_EXCHANGES):
            return False

        # Must match valid equity type
        if inst_type not in cls.VALID_EQUITY_TYPES and inst_type not in ["CASH", "SPOT"]:
            return False

        return True

    @classmethod
    def determine_region(cls, exchange: str) -> str:
        ex = exchange.upper()
        if ex in cls.INDIAN_EXCHANGES:
            return StockRegion.INDIA.value
        elif ex in cls.US_EXCHANGES:
            return StockRegion.US.value
        else:
            return StockRegion.GLOBAL.value

    @classmethod
    def determine_market_cap_category(cls, market_cap_usd: Optional[float]) -> str:
        if market_cap_usd is None or market_cap_usd <= 0:
            return MarketCapCategory.UNKNOWN.value
        if market_cap_usd >= 200_000_000_000: # > $200B
            return MarketCapCategory.MEGA_CAP.value
        elif market_cap_usd >= 10_000_000_000: # $10B - $200B
            return MarketCapCategory.LARGE_CAP.value
        elif market_cap_usd >= 2_000_000_000:  # $2B - $10B
            return MarketCapCategory.MID_CAP.value
        elif market_cap_usd >= 300_000_000:    # $300M - $2B
            return MarketCapCategory.SMALL_CAP.value
        else:
            return MarketCapCategory.MICRO_CAP.value
