"""
Quant.OS Global Canonical Symbol & Instrument Master Registry
============================================================
Provides canonical instrument specifications, tick sizes, lot sizes, trading sessions,
multi-asset categorization, and variation resolution across Crypto, Indian Markets,
US/Global Equities, Indices, Forex, and Commodities.
"""

import logging
import re
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple, Union

logger = logging.getLogger("SymbolMaster")


class AssetClass(str, Enum):
    CRYPTO_SPOT = "CRYPTO_SPOT"
    CRYPTO_FUTURES = "CRYPTO_FUTURES"
    INDIAN_EQUITIES = "INDIAN_EQUITIES"
    INDIAN_INDICES = "INDIAN_INDICES"
    INDIAN_FNO = "INDIAN_FNO"
    US_EQUITIES = "US_EQUITIES"
    GLOBAL_INDICES = "GLOBAL_INDICES"
    FOREX = "FOREX"
    COMMODITIES = "COMMODITIES"


class FeedClassification(str, Enum):
    REAL_TIME = "REAL-TIME"
    DELAYED = "DELAYED"
    EOD = "EOD"
    STALE = "STALE"
    UNAVAILABLE = "UNAVAILABLE"
    UNSUPPORTED = "UNSUPPORTED"


class InstrumentType(str, Enum):
    SPOT = "SPOT"
    PERPETUAL = "PERPETUAL"
    FUTURES = "FUTURES"
    OPTION = "OPTION"
    INDEX = "INDEX"
    EQUITY = "EQUITY"
    ETF = "ETF"


@dataclass
class CanonicalInstrument:
    instrument_id: str
    display_symbol: str
    provider_symbol: str
    exchange: str
    asset_class: AssetClass
    instrument_type: InstrumentType
    base_currency: str
    quote_currency: str
    price_precision: int
    quantity_precision: int
    tick_size: float
    lot_size: float
    contract_multiplier: float
    timezone: str
    trading_session: str
    feed_status: FeedClassification
    provider: str
    expiry: Optional[str] = None
    strike: Optional[float] = None
    call_put_type: Optional[str] = None  # "CE" or "PE"
    has_options: bool = False
    has_futures: bool = False
    aliases: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["asset_class"] = self.asset_class.value
        d["feed_status"] = self.feed_status.value
        d["instrument_type"] = self.instrument_type.value
        return d


class GlobalSymbolMaster:
    """Singleton Canonical Instrument Registry."""

    _instance: Optional["GlobalSymbolMaster"] = None

    def __init__(self):
        self._registry: Dict[str, CanonicalInstrument] = {}
        self._alias_map: Dict[str, str] = {}
        self._seed_instruments()

    @classmethod
    def get_instance(cls) -> "GlobalSymbolMaster":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _seed_instruments(self):
        instruments = [
            # 1. Crypto Spot & Perps
            CanonicalInstrument(
                instrument_id="BINANCE:BTC/USDT:SPOT",
                display_symbol="BTC/USDT",
                provider_symbol="BTCUSDT",
                exchange="BINANCE",
                asset_class=AssetClass.CRYPTO_SPOT,
                instrument_type=InstrumentType.SPOT,
                base_currency="BTC",
                quote_currency="USDT",
                price_precision=2,
                quantity_precision=5,
                tick_size=0.01,
                lot_size=0.0001,
                contract_multiplier=1.0,
                timezone="UTC",
                trading_session="24/7",
                feed_status=FeedClassification.REAL_TIME,
                provider="binance_spot",
                has_options=True,
                has_futures=True,
                aliases=["BTCUSDT", "BTC/USDT", "BTC-USDT", "BTC_USDT", "BINANCE:BTCUSDT", "BTC"],
            ),
            CanonicalInstrument(
                instrument_id="BINANCE:BTC/USDT:PERP",
                display_symbol="BTC/USDT PERP",
                provider_symbol="BTCUSDT",
                exchange="BINANCE",
                asset_class=AssetClass.CRYPTO_FUTURES,
                instrument_type=InstrumentType.PERPETUAL,
                base_currency="BTC",
                quote_currency="USDT",
                price_precision=2,
                quantity_precision=3,
                tick_size=0.10,
                lot_size=0.001,
                contract_multiplier=1.0,
                timezone="UTC",
                trading_session="24/7",
                feed_status=FeedClassification.REAL_TIME,
                provider="binance_futures",
                has_options=True,
                has_futures=True,
                aliases=["BTCUSDT.P", "BTCUSDT_PERP", "BTC-PERP"],
            ),
            CanonicalInstrument(
                instrument_id="BINANCE:ETH/USDT:SPOT",
                display_symbol="ETH/USDT",
                provider_symbol="ETHUSDT",
                exchange="BINANCE",
                asset_class=AssetClass.CRYPTO_SPOT,
                instrument_type=InstrumentType.SPOT,
                base_currency="ETH",
                quote_currency="USDT",
                price_precision=2,
                quantity_precision=4,
                tick_size=0.01,
                lot_size=0.001,
                contract_multiplier=1.0,
                timezone="UTC",
                trading_session="24/7",
                feed_status=FeedClassification.REAL_TIME,
                provider="binance_spot",
                has_options=True,
                has_futures=True,
                aliases=["ETHUSDT", "ETH/USDT", "ETH-USDT", "ETH_USDT", "ETH"],
            ),
            CanonicalInstrument(
                instrument_id="BINANCE:SOL/USDT:SPOT",
                display_symbol="SOL/USDT",
                provider_symbol="SOLUSDT",
                exchange="BINANCE",
                asset_class=AssetClass.CRYPTO_SPOT,
                instrument_type=InstrumentType.SPOT,
                base_currency="SOL",
                quote_currency="USDT",
                price_precision=2,
                quantity_precision=2,
                tick_size=0.01,
                lot_size=0.01,
                contract_multiplier=1.0,
                timezone="UTC",
                trading_session="24/7",
                feed_status=FeedClassification.REAL_TIME,
                provider="binance_spot",
                has_options=False,
                has_futures=True,
                aliases=["SOLUSDT", "SOL/USDT", "SOL-USDT", "SOL"],
            ),

            # 2. Indian Indices & Derivatives
            CanonicalInstrument(
                instrument_id="NSE:NIFTY50:INDEX",
                display_symbol="NIFTY 50",
                provider_symbol="NIFTY",
                exchange="NSE",
                asset_class=AssetClass.INDIAN_INDICES,
                instrument_type=InstrumentType.INDEX,
                base_currency="NIFTY",
                quote_currency="INR",
                price_precision=2,
                quantity_precision=0,
                tick_size=0.05,
                lot_size=50.0,
                contract_multiplier=50.0,
                timezone="Asia/Kolkata",
                trading_session="09:15-15:30 IST",
                feed_status=FeedClassification.REAL_TIME,
                provider="nse_india",
                has_options=True,
                has_futures=True,
                aliases=["NIFTY", "NIFTY 50", "NIFTY50", "NSE:NIFTY", "NSE:NIFTY50", "^NSEI"],
            ),
            CanonicalInstrument(
                instrument_id="NSE:BANKNIFTY:INDEX",
                display_symbol="NIFTY BANK",
                provider_symbol="BANKNIFTY",
                exchange="NSE",
                asset_class=AssetClass.INDIAN_INDICES,
                instrument_type=InstrumentType.INDEX,
                base_currency="BANKNIFTY",
                quote_currency="INR",
                price_precision=2,
                quantity_precision=0,
                tick_size=0.05,
                lot_size=15.0,
                contract_multiplier=15.0,
                timezone="Asia/Kolkata",
                trading_session="09:15-15:30 IST",
                feed_status=FeedClassification.REAL_TIME,
                provider="nse_india",
                has_options=True,
                has_futures=True,
                aliases=["BANKNIFTY", "NIFTY BANK", "NSE:BANKNIFTY", "^NSEBANK"],
            ),
            CanonicalInstrument(
                instrument_id="NSE:FINNIFTY:INDEX",
                display_symbol="NIFTY FIN SERVICE",
                provider_symbol="FINNIFTY",
                exchange="NSE",
                asset_class=AssetClass.INDIAN_INDICES,
                instrument_type=InstrumentType.INDEX,
                base_currency="FINNIFTY",
                quote_currency="INR",
                price_precision=2,
                quantity_precision=0,
                tick_size=0.05,
                lot_size=25.0,
                contract_multiplier=25.0,
                timezone="Asia/Kolkata",
                trading_session="09:15-15:30 IST",
                feed_status=FeedClassification.REAL_TIME,
                provider="nse_india",
                has_options=True,
                has_futures=True,
                aliases=["FINNIFTY", "NIFTY FINANCIAL SERVICES", "NSE:FINNIFTY"],
            ),

            # 3. Indian Equities
            CanonicalInstrument(
                instrument_id="NSE:RELIANCE:EQ",
                display_symbol="RELIANCE",
                provider_symbol="RELIANCE",
                exchange="NSE",
                asset_class=AssetClass.INDIAN_EQUITIES,
                instrument_type=InstrumentType.EQUITY,
                base_currency="RELIANCE",
                quote_currency="INR",
                price_precision=2,
                quantity_precision=0,
                tick_size=0.05,
                lot_size=1.0,
                contract_multiplier=1.0,
                timezone="Asia/Kolkata",
                trading_session="09:15-15:30 IST",
                feed_status=FeedClassification.REAL_TIME,
                provider="nse_india",
                has_options=True,
                has_futures=True,
                aliases=["RELIANCE", "RELIANCE.NS", "NSE:RELIANCE", "RELIANCE-EQ"],
            ),
            CanonicalInstrument(
                instrument_id="NSE:TCS:EQ",
                display_symbol="TCS",
                provider_symbol="TCS",
                exchange="NSE",
                asset_class=AssetClass.INDIAN_EQUITIES,
                instrument_type=InstrumentType.EQUITY,
                base_currency="TCS",
                quote_currency="INR",
                price_precision=2,
                quantity_precision=0,
                tick_size=0.05,
                lot_size=1.0,
                contract_multiplier=1.0,
                timezone="Asia/Kolkata",
                trading_session="09:15-15:30 IST",
                feed_status=FeedClassification.REAL_TIME,
                provider="nse_india",
                has_options=True,
                has_futures=True,
                aliases=["TCS", "TCS.NS", "NSE:TCS", "TCS-EQ"],
            ),
            CanonicalInstrument(
                instrument_id="NSE:INFY:EQ",
                display_symbol="INFY",
                provider_symbol="INFY",
                exchange="NSE",
                asset_class=AssetClass.INDIAN_EQUITIES,
                instrument_type=InstrumentType.EQUITY,
                base_currency="INFY",
                quote_currency="INR",
                price_precision=2,
                quantity_precision=0,
                tick_size=0.05,
                lot_size=1.0,
                contract_multiplier=1.0,
                timezone="Asia/Kolkata",
                trading_session="09:15-15:30 IST",
                feed_status=FeedClassification.REAL_TIME,
                provider="nse_india",
                has_options=True,
                has_futures=True,
                aliases=["INFY", "INFY.NS", "NSE:INFY", "INFY-EQ"],
            ),
            CanonicalInstrument(
                instrument_id="NSE:HDFCBANK:EQ",
                display_symbol="HDFCBANK",
                provider_symbol="HDFCBANK",
                exchange="NSE",
                asset_class=AssetClass.INDIAN_EQUITIES,
                instrument_type=InstrumentType.EQUITY,
                base_currency="HDFCBANK",
                quote_currency="INR",
                price_precision=2,
                quantity_precision=0,
                tick_size=0.05,
                lot_size=1.0,
                contract_multiplier=1.0,
                timezone="Asia/Kolkata",
                trading_session="09:15-15:30 IST",
                feed_status=FeedClassification.REAL_TIME,
                provider="nse_india",
                has_options=True,
                has_futures=True,
                aliases=["HDFCBANK", "HDFCBANK.NS", "NSE:HDFCBANK", "HDFCBANK-EQ"],
            ),

            # 4. US Equities & ETFs
            CanonicalInstrument(
                instrument_id="NASDAQ:AAPL:EQ",
                display_symbol="AAPL",
                provider_symbol="AAPL",
                exchange="NASDAQ",
                asset_class=AssetClass.US_EQUITIES,
                instrument_type=InstrumentType.EQUITY,
                base_currency="AAPL",
                quote_currency="USD",
                price_precision=2,
                quantity_precision=2,
                tick_size=0.01,
                lot_size=1.0,
                contract_multiplier=1.0,
                timezone="America/New_York",
                trading_session="09:30-16:00 EST",
                feed_status=FeedClassification.DELAYED,
                provider="twelve_data_fallback",
                has_options=True,
                has_futures=False,
                aliases=["AAPL", "NASDAQ:AAPL", "AAPL.US"],
            ),
            CanonicalInstrument(
                instrument_id="NASDAQ:NVDA:EQ",
                display_symbol="NVDA",
                provider_symbol="NVDA",
                exchange="NASDAQ",
                asset_class=AssetClass.US_EQUITIES,
                instrument_type=InstrumentType.EQUITY,
                base_currency="NVDA",
                quote_currency="USD",
                price_precision=2,
                quantity_precision=2,
                tick_size=0.01,
                lot_size=1.0,
                contract_multiplier=1.0,
                timezone="America/New_York",
                trading_session="09:30-16:00 EST",
                feed_status=FeedClassification.DELAYED,
                provider="twelve_data_fallback",
                has_options=True,
                has_futures=False,
                aliases=["NVDA", "NASDAQ:NVDA", "NVDA.US"],
            ),
            CanonicalInstrument(
                instrument_id="NYSE:SPY:ETF",
                display_symbol="SPY",
                provider_symbol="SPY",
                exchange="NYSE",
                asset_class=AssetClass.US_EQUITIES,
                instrument_type=InstrumentType.ETF,
                base_currency="SPY",
                quote_currency="USD",
                price_precision=2,
                quantity_precision=2,
                tick_size=0.01,
                lot_size=1.0,
                contract_multiplier=1.0,
                timezone="America/New_York",
                trading_session="09:30-16:00 EST",
                feed_status=FeedClassification.DELAYED,
                provider="twelve_data_fallback",
                has_options=True,
                has_futures=False,
                aliases=["SPY", "NYSE:SPY", "SPY.US"],
            ),

            # 5. Global Indices
            CanonicalInstrument(
                instrument_id="CBOE:SPX:INDEX",
                display_symbol="S&P 500",
                provider_symbol="SPX",
                exchange="CBOE",
                asset_class=AssetClass.GLOBAL_INDICES,
                instrument_type=InstrumentType.INDEX,
                base_currency="SPX",
                quote_currency="USD",
                price_precision=2,
                quantity_precision=0,
                tick_size=0.10,
                lot_size=1.0,
                contract_multiplier=1.0,
                timezone="America/New_York",
                trading_session="09:30-16:00 EST",
                feed_status=FeedClassification.DELAYED,
                provider="twelve_data_fallback",
                has_options=True,
                has_futures=True,
                aliases=["SPX", "S&P 500", "SP500", "^GSPC", "US500"],
            ),
            CanonicalInstrument(
                instrument_id="NASDAQ:NDX:INDEX",
                display_symbol="NASDAQ 100",
                provider_symbol="NDX",
                exchange="NASDAQ",
                asset_class=AssetClass.GLOBAL_INDICES,
                instrument_type=InstrumentType.INDEX,
                base_currency="NDX",
                quote_currency="USD",
                price_precision=2,
                quantity_precision=0,
                tick_size=0.10,
                lot_size=1.0,
                contract_multiplier=1.0,
                timezone="America/New_York",
                trading_session="09:30-16:00 EST",
                feed_status=FeedClassification.DELAYED,
                provider="twelve_data_fallback",
                has_options=True,
                has_futures=True,
                aliases=["NDX", "NASDAQ 100", "NAS100", "^NDX", "US100"],
            ),

            # 6. Forex & Commodities
            CanonicalInstrument(
                instrument_id="FOREX:EUR/USD:SPOT",
                display_symbol="EUR/USD",
                provider_symbol="EURUSD",
                exchange="OANDA",
                asset_class=AssetClass.FOREX,
                instrument_type=InstrumentType.SPOT,
                base_currency="EUR",
                quote_currency="USD",
                price_precision=5,
                quantity_precision=0,
                tick_size=0.00001,
                lot_size=1000.0,
                contract_multiplier=1.0,
                timezone="UTC",
                trading_session="24/5",
                feed_status=FeedClassification.DELAYED,
                provider="alpha_vantage_fx",
                aliases=["EURUSD", "EUR/USD", "EUR-USD", "FX:EURUSD"],
            ),
            CanonicalInstrument(
                instrument_id="COMEX:GOLD:COMMODITY",
                display_symbol="GOLD / USD",
                provider_symbol="XAUUSD",
                exchange="COMEX",
                asset_class=AssetClass.COMMODITIES,
                instrument_type=InstrumentType.SPOT,
                base_currency="XAU",
                quote_currency="USD",
                price_precision=2,
                quantity_precision=1,
                tick_size=0.01,
                lot_size=1.0,
                contract_multiplier=1.0,
                timezone="America/New_York",
                trading_session="23/5",
                feed_status=FeedClassification.DELAYED,
                provider="twelve_data_fallback",
                aliases=["GOLD", "XAUUSD", "XAU/USD", "GC=F"],
            ),
        ]

        for inst in instruments:
            self.register_instrument(inst)

    def register_instrument(self, inst: CanonicalInstrument):
        self._registry[inst.instrument_id] = inst
        # Prioritize SPOT or first registered for ambiguous aliases like BTCUSDT
        if inst.display_symbol.upper() not in self._alias_map or inst.instrument_type == InstrumentType.SPOT:
            self._alias_map[inst.display_symbol.upper()] = inst.instrument_id
        if inst.provider_symbol.upper() not in self._alias_map or inst.instrument_type == InstrumentType.SPOT:
            self._alias_map[inst.provider_symbol.upper()] = inst.instrument_id
        self._alias_map[inst.instrument_id.upper()] = inst.instrument_id
        for alias in inst.aliases:
            if alias.upper() not in self._alias_map or inst.instrument_type == InstrumentType.SPOT:
                self._alias_map[alias.upper()] = inst.instrument_id

    def resolve(self, symbol_or_alias: str) -> Optional[CanonicalInstrument]:
        if not symbol_or_alias:
            return None
        cleaned = symbol_or_alias.strip().upper()
        iid = self._alias_map.get(cleaned)
        if iid and iid in self._registry:
            return self._registry[iid]

        # Try normalized variations
        norm = cleaned.replace("-", "/").replace("_", "/")
        iid = self._alias_map.get(norm)
        if iid and iid in self._registry:
            return self._registry[iid]

        # Dynamic resolver for unlisted options or futures (e.g. NIFTY 24500 CE)
        if " CE" in cleaned or " PE" in cleaned:
            parts = cleaned.split()
            base = parts[0]
            strike = float(parts[1]) if len(parts) > 1 and parts[1].replace(".", "").isdigit() else 0.0
            cp = parts[2] if len(parts) > 2 else "CE"
            dyn_inst = CanonicalInstrument(
                instrument_id=f"NSE:{base}_{int(strike)}_{cp}:OPTION",
                display_symbol=cleaned,
                provider_symbol=f"{base}{int(strike)}{cp}",
                exchange="NSE",
                asset_class=AssetClass.INDIAN_FNO,
                instrument_type=InstrumentType.OPTION,
                base_currency=base,
                quote_currency="INR",
                price_precision=2,
                quantity_precision=0,
                tick_size=0.05,
                lot_size=15.0 if "BANK" in base else 50.0,
                contract_multiplier=15.0 if "BANK" in base else 50.0,
                timezone="Asia/Kolkata",
                trading_session="09:15-15:30 IST",
                feed_status=FeedClassification.REAL_TIME,
                provider="nse_india",
                strike=strike,
                call_put_type=cp,
                aliases=[cleaned],
            )
            self.register_instrument(dyn_inst)
            return dyn_inst

        return None

    def search(
        self,
        query: str,
        asset_class: Optional[str] = None,
        exchange: Optional[str] = None,
        limit: int = 50
    ) -> List[CanonicalInstrument]:
        q = query.strip().upper()
        results = []
        for inst in self._registry.values():
            if asset_class and inst.asset_class.value != asset_class:
                continue
            if exchange and inst.exchange.upper() != exchange.upper():
                continue

            if not q or (
                q in inst.display_symbol.upper()
                or q in inst.provider_symbol.upper()
                or q in inst.instrument_id.upper()
                or any(q in a.upper() for a in inst.aliases)
            ):
                results.append(inst)
                if len(results) >= limit:
                    break

        return results

    def get_all(self, asset_class: Optional[str] = None) -> List[CanonicalInstrument]:
        if not asset_class:
            return list(self._registry.values())
        return [inst for inst in self._registry.values() if inst.asset_class.value == asset_class]


symbol_master = GlobalSymbolMaster.get_instance()
