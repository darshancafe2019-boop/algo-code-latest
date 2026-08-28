"""
Dynamic Global Instrument Master & Multi-Market Catalog
======================================================
Maintains normalized specifications, regional groupings, lot sizes, contract multipliers,
tick sizes, exercise styles (American/European), and settlement modes (Cash/Physical) across:
- Indian Derivatives (NSE / BSE Indices & Stock Options)
- Global Markets (US CBOE/NASDAQ/NYSE Index & ETF/Equity Options, European & Asian Indices)
- Crypto Markets (Binance & Deribit Options, Linear & Inverse Perpetuals)
"""

import re
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone, timedelta
from src.market_data.interfaces import AssetClass, SecurityType, OptionExerciseStyle, OptionSettlementType
from src.market_data.schemas import InstrumentMetadata


def _get_indian_monthly_expiries(count: int = 6) -> List[str]:
    """Generates standard monthly derivative expiry dates (Last Thursday of the month for India)."""
    expiries = []
    today = datetime.now(timezone.utc)
    for offset in range(count):
        m = today.month + offset
        y = today.year
        while m > 12:
            m -= 12
            y += 1

        if m == 12:
            next_m = datetime(y + 1, 1, 1)
        else:
            next_m = datetime(y, m + 1, 1)
        last_day = next_m - timedelta(days=1)

        while last_day.weekday() != 3:  # Thursday
            last_day -= timedelta(days=1)

        expiries.append(last_day.strftime("%Y-%m-%d"))
    return expiries


def _get_global_monthly_expiries(count: int = 6) -> List[str]:
    """Generates standard US/Global derivative expiry dates (3rd Friday of the month)."""
    expiries = []
    today = datetime.now(timezone.utc)
    for offset in range(count):
        m = today.month + offset
        y = today.year
        while m > 12:
            m -= 12
            y += 1

        first_day = datetime(y, m, 1)
        # Find 1st Friday
        days_to_fri = (4 - first_day.weekday()) % 7
        first_fri = first_day + timedelta(days=days_to_fri)
        third_fri = first_fri + timedelta(weeks=2)
        expiries.append(third_fri.strftime("%Y-%m-%d"))
    return expiries


def _get_crypto_expiries(count: int = 6) -> List[str]:
    """Generates standard Deribit/Binance crypto derivative expiry dates (Weekly/Bi-weekly Fridays)."""
    expiries = []
    today = datetime.now(timezone.utc)
    days_ahead = (4 - today.weekday()) % 7
    if days_ahead == 0:
        days_ahead = 7
    next_fri = today + timedelta(days=days_ahead)

    for i in range(count):
        fri = next_fri + timedelta(weeks=i * 2)
        expiries.append(fri.strftime("%Y-%m-%d"))
    return expiries


class InstrumentMaster:
    """
    Universal Multi-Market Instrument Master.
    Enforces canonical instrument resolution, honest capability filtering,
    and derivative relationship mapping.
    """

    def __init__(self):
        self._instruments: Dict[str, InstrumentMetadata] = {}
        self._initialize_master_catalog()

    def _initialize_master_catalog(self) -> None:
        """Seeds the dynamic instrument catalog with normalized multi-market assets."""
        catalog: List[InstrumentMetadata] = [
            # ─────────────────────────────────────────────────────────────
            # 1. INDIAN MARKETS (NSE & BSE Indices & Major F&O Equities)
            # Cash indices are non-tradable directly; mapped to options/futures derivatives.
            # ─────────────────────────────────────────────────────────────
            InstrumentMetadata(
                symbol="NIFTY",
                display_name="NIFTY 50",
                description="NSE Benchmark Index (50 Blue-Chip Equities)",
                asset_class=AssetClass.INDIAN_INDICES.value,
                exchange="NSE",
                region="India",
                country="India",
                provider_id="nse_provider",
                security_type=SecurityType.CASH_INDEX.value,
                lot_size=50,
                contract_multiplier=50.0,
                tick_size=0.05,
                is_tradable=False,  # Cash index cannot be bought directly; trade options/futures
                has_options=True,
                has_futures=True,
                base_currency="INR",
                quote_currency="INR",
                settlement_currency="INR",
                exercise_style=OptionExerciseStyle.EUROPEAN.value,
                settlement_style=OptionSettlementType.CASH.value,
                trading_timezone="Asia/Kolkata",
            ),
            InstrumentMetadata(
                symbol="BANKNIFTY",
                display_name="BANK NIFTY",
                description="NSE Banking Sector Benchmark (12 Liquid Banking Stocks)",
                asset_class=AssetClass.INDIAN_INDICES.value,
                exchange="NSE",
                region="India",
                country="India",
                provider_id="nse_provider",
                security_type=SecurityType.CASH_INDEX.value,
                lot_size=15,
                contract_multiplier=15.0,
                tick_size=0.05,
                is_tradable=False,
                has_options=True,
                has_futures=True,
                base_currency="INR",
                quote_currency="INR",
                settlement_currency="INR",
                exercise_style=OptionExerciseStyle.EUROPEAN.value,
                settlement_style=OptionSettlementType.CASH.value,
                trading_timezone="Asia/Kolkata",
            ),
            InstrumentMetadata(
                symbol="FINNIFTY",
                display_name="NIFTY FINANCIAL SERVICES",
                description="NSE Financial Sector Index (Banks, NBFCs, Insurance)",
                asset_class=AssetClass.INDIAN_INDICES.value,
                exchange="NSE",
                region="India",
                country="India",
                provider_id="nse_provider",
                security_type=SecurityType.CASH_INDEX.value,
                lot_size=40,
                contract_multiplier=40.0,
                tick_size=0.05,
                is_tradable=False,
                has_options=True,
                has_futures=True,
                base_currency="INR",
                quote_currency="INR",
                settlement_currency="INR",
                exercise_style=OptionExerciseStyle.EUROPEAN.value,
                settlement_style=OptionSettlementType.CASH.value,
                trading_timezone="Asia/Kolkata",
            ),
            InstrumentMetadata(
                symbol="MIDCPNIFTY",
                display_name="NIFTY MIDCAP SELECT",
                description="NSE Midcap Benchmark (25 High-Growth Midcap Leaders)",
                asset_class=AssetClass.INDIAN_INDICES.value,
                exchange="NSE",
                region="India",
                country="India",
                provider_id="nse_provider",
                security_type=SecurityType.CASH_INDEX.value,
                lot_size=75,
                contract_multiplier=75.0,
                tick_size=0.05,
                is_tradable=False,
                has_options=True,
                has_futures=True,
                base_currency="INR",
                quote_currency="INR",
                settlement_currency="INR",
                exercise_style=OptionExerciseStyle.EUROPEAN.value,
                settlement_style=OptionSettlementType.CASH.value,
                trading_timezone="Asia/Kolkata",
            ),
            InstrumentMetadata(
                symbol="SENSEX",
                display_name="BSE SENSEX",
                description="BSE 30-Stock Landmark Benchmark",
                asset_class=AssetClass.INDIAN_INDICES.value,
                exchange="BSE",
                region="India",
                country="India",
                provider_id="bse_provider",
                security_type=SecurityType.CASH_INDEX.value,
                lot_size=10,
                contract_multiplier=10.0,
                tick_size=0.05,
                is_tradable=False,
                has_options=True,
                has_futures=True,
                base_currency="INR",
                quote_currency="INR",
                settlement_currency="INR",
                exercise_style=OptionExerciseStyle.EUROPEAN.value,
                settlement_style=OptionSettlementType.CASH.value,
                trading_timezone="Asia/Kolkata",
            ),
            InstrumentMetadata(
                symbol="BANKEX",
                display_name="BSE BANKEX",
                description="BSE Banking Sector Benchmark Index",
                asset_class=AssetClass.INDIAN_INDICES.value,
                exchange="BSE",
                region="India",
                country="India",
                provider_id="bse_provider",
                security_type=SecurityType.CASH_INDEX.value,
                lot_size=15,
                contract_multiplier=15.0,
                tick_size=0.05,
                is_tradable=False,
                has_options=True,
                has_futures=True,
                base_currency="INR",
                quote_currency="INR",
                settlement_currency="INR",
                exercise_style=OptionExerciseStyle.EUROPEAN.value,
                settlement_style=OptionSettlementType.CASH.value,
                trading_timezone="Asia/Kolkata",
            ),
            # Indian Stock Options (Physical settlement on expiry)
            InstrumentMetadata(
                symbol="RELIANCE",
                display_name="Reliance Industries",
                description="Energy, Retail & Digital Conglomerate",
                asset_class=AssetClass.INDIAN_EQUITIES.value,
                exchange="NSE",
                region="India",
                country="India",
                provider_id="nse_provider",
                security_type=SecurityType.STOCK.value,
                lot_size=250,
                contract_multiplier=250.0,
                tick_size=0.05,
                is_tradable=True,
                has_options=True,
                has_futures=True,
                base_currency="INR",
                quote_currency="INR",
                settlement_currency="INR",
                exercise_style=OptionExerciseStyle.EUROPEAN.value,
                settlement_style=OptionSettlementType.PHYSICAL.value,
                trading_timezone="Asia/Kolkata",
            ),
            InstrumentMetadata(
                symbol="TCS",
                display_name="Tata Consultancy Services",
                description="Global IT Software & Cloud Consulting",
                asset_class=AssetClass.INDIAN_EQUITIES.value,
                exchange="NSE",
                region="India",
                country="India",
                provider_id="nse_provider",
                security_type=SecurityType.STOCK.value,
                lot_size=175,
                contract_multiplier=175.0,
                tick_size=0.05,
                is_tradable=True,
                has_options=True,
                has_futures=True,
                base_currency="INR",
                quote_currency="INR",
                settlement_currency="INR",
                exercise_style=OptionExerciseStyle.EUROPEAN.value,
                settlement_style=OptionSettlementType.PHYSICAL.value,
                trading_timezone="Asia/Kolkata",
            ),
            InstrumentMetadata(
                symbol="INFY",
                display_name="Infosys Limited",
                description="Next-Gen Digital Technology Services",
                asset_class=AssetClass.INDIAN_EQUITIES.value,
                exchange="NSE",
                region="India",
                country="India",
                provider_id="nse_provider",
                security_type=SecurityType.STOCK.value,
                lot_size=400,
                contract_multiplier=400.0,
                tick_size=0.05,
                is_tradable=True,
                has_options=True,
                has_futures=True,
                base_currency="INR",
                quote_currency="INR",
                settlement_currency="INR",
                exercise_style=OptionExerciseStyle.EUROPEAN.value,
                settlement_style=OptionSettlementType.PHYSICAL.value,
                trading_timezone="Asia/Kolkata",
            ),
            InstrumentMetadata(
                symbol="HDFCBANK",
                display_name="HDFC Bank Limited",
                description="India's Premier Private Banking Institution",
                asset_class=AssetClass.INDIAN_EQUITIES.value,
                exchange="NSE",
                region="India",
                country="India",
                provider_id="nse_provider",
                security_type=SecurityType.STOCK.value,
                lot_size=550,
                contract_multiplier=550.0,
                tick_size=0.05,
                is_tradable=True,
                has_options=True,
                has_futures=True,
                base_currency="INR",
                quote_currency="INR",
                settlement_currency="INR",
                exercise_style=OptionExerciseStyle.EUROPEAN.value,
                settlement_style=OptionSettlementType.PHYSICAL.value,
                trading_timezone="Asia/Kolkata",
            ),

            # ─────────────────────────────────────────────────────────────
            # 2. GLOBAL MARKETS (US CBOE/NASDAQ/NYSE Indices, ETFs & Equities)
            # ─────────────────────────────────────────────────────────────
            InstrumentMetadata(
                symbol="SPX",
                display_name="S&P 500 Index",
                description="US Large-Cap Equity Benchmark (CBOE Cash Settled)",
                asset_class=AssetClass.GLOBAL_INDICES.value,
                exchange="CBOE",
                region="North America",
                country="United States",
                provider_id="yahoo_global",
                security_type=SecurityType.CASH_INDEX.value,
                lot_size=1,
                contract_multiplier=100.0,
                tick_size=0.05,
                is_tradable=False,
                has_options=True,
                has_futures=True,
                base_currency="USD",
                quote_currency="USD",
                settlement_currency="USD",
                exercise_style=OptionExerciseStyle.EUROPEAN.value,
                settlement_style=OptionSettlementType.CASH.value,
                trading_timezone="America/New_York",
            ),
            InstrumentMetadata(
                symbol="NDX",
                display_name="NASDAQ 100 Index",
                description="Top 100 US Tech & Growth Index (NASDAQ Cash Settled)",
                asset_class=AssetClass.GLOBAL_INDICES.value,
                exchange="NASDAQ",
                region="North America",
                country="United States",
                provider_id="yahoo_global",
                security_type=SecurityType.CASH_INDEX.value,
                lot_size=1,
                contract_multiplier=100.0,
                tick_size=0.05,
                is_tradable=False,
                has_options=True,
                has_futures=True,
                base_currency="USD",
                quote_currency="USD",
                settlement_currency="USD",
                exercise_style=OptionExerciseStyle.EUROPEAN.value,
                settlement_style=OptionSettlementType.CASH.value,
                trading_timezone="America/New_York",
            ),
            InstrumentMetadata(
                symbol="RUT",
                display_name="Russell 2000 Index",
                description="US Small-Cap Benchmark (CBOE Cash Settled)",
                asset_class=AssetClass.GLOBAL_INDICES.value,
                exchange="CBOE",
                region="North America",
                country="United States",
                provider_id="yahoo_global",
                security_type=SecurityType.CASH_INDEX.value,
                lot_size=1,
                contract_multiplier=100.0,
                tick_size=0.05,
                is_tradable=False,
                has_options=True,
                has_futures=True,
                base_currency="USD",
                quote_currency="USD",
                settlement_currency="USD",
                exercise_style=OptionExerciseStyle.EUROPEAN.value,
                settlement_style=OptionSettlementType.CASH.value,
                trading_timezone="America/New_York",
            ),
            InstrumentMetadata(
                symbol="VIX",
                display_name="CBOE Volatility Index",
                description="Market 30-Day Forward Volatility Gauge",
                asset_class=AssetClass.GLOBAL_INDICES.value,
                exchange="CBOE",
                region="North America",
                country="United States",
                provider_id="yahoo_global",
                security_type=SecurityType.CASH_INDEX.value,
                lot_size=1,
                contract_multiplier=100.0,
                tick_size=0.01,
                is_tradable=False,
                has_options=True,
                has_futures=True,
                base_currency="USD",
                quote_currency="USD",
                settlement_currency="USD",
                exercise_style=OptionExerciseStyle.EUROPEAN.value,
                settlement_style=OptionSettlementType.CASH.value,
                trading_timezone="America/New_York",
            ),
            InstrumentMetadata(
                symbol="SPY",
                display_name="SPDR S&P 500 ETF Trust",
                description="World's Most Liquid S&P 500 ETF (American Options)",
                asset_class=AssetClass.GLOBAL_EQUITIES.value,
                exchange="NYSE Arca",
                region="North America",
                country="United States",
                provider_id="yahoo_global",
                security_type=SecurityType.ETF.value,
                lot_size=1,
                contract_multiplier=100.0,
                tick_size=0.01,
                is_tradable=True,
                has_options=True,
                has_futures=False,
                base_currency="USD",
                quote_currency="USD",
                settlement_currency="USD",
                exercise_style=OptionExerciseStyle.AMERICAN.value,
                settlement_style=OptionSettlementType.PHYSICAL.value,
                trading_timezone="America/New_York",
            ),
            InstrumentMetadata(
                symbol="QQQ",
                display_name="Invesco QQQ Trust",
                description="NASDAQ 100 ETF Tracker (American Options)",
                asset_class=AssetClass.GLOBAL_EQUITIES.value,
                exchange="NASDAQ",
                region="North America",
                country="United States",
                provider_id="yahoo_global",
                security_type=SecurityType.ETF.value,
                lot_size=1,
                contract_multiplier=100.0,
                tick_size=0.01,
                is_tradable=True,
                has_options=True,
                has_futures=False,
                base_currency="USD",
                quote_currency="USD",
                settlement_currency="USD",
                exercise_style=OptionExerciseStyle.AMERICAN.value,
                settlement_style=OptionSettlementType.PHYSICAL.value,
                trading_timezone="America/New_York",
            ),
            InstrumentMetadata(
                symbol="AAPL",
                display_name="Apple Inc.",
                description="Consumer Electronics, iOS & Services Titan",
                asset_class=AssetClass.GLOBAL_EQUITIES.value,
                exchange="NASDAQ",
                region="North America",
                country="United States",
                provider_id="yahoo_global",
                security_type=SecurityType.STOCK.value,
                lot_size=1,
                contract_multiplier=100.0,
                tick_size=0.01,
                is_tradable=True,
                has_options=True,
                has_futures=False,
                base_currency="USD",
                quote_currency="USD",
                settlement_currency="USD",
                exercise_style=OptionExerciseStyle.AMERICAN.value,
                settlement_style=OptionSettlementType.PHYSICAL.value,
                trading_timezone="America/New_York",
            ),
            InstrumentMetadata(
                symbol="NVDA",
                display_name="NVIDIA Corporation",
                description="Accelerated GPU Computing & Enterprise AI",
                asset_class=AssetClass.GLOBAL_EQUITIES.value,
                exchange="NASDAQ",
                region="North America",
                country="United States",
                provider_id="yahoo_global",
                security_type=SecurityType.STOCK.value,
                lot_size=1,
                contract_multiplier=100.0,
                tick_size=0.01,
                is_tradable=True,
                has_options=True,
                has_futures=False,
                base_currency="USD",
                quote_currency="USD",
                settlement_currency="USD",
                exercise_style=OptionExerciseStyle.AMERICAN.value,
                settlement_style=OptionSettlementType.PHYSICAL.value,
                trading_timezone="America/New_York",
            ),
            InstrumentMetadata(
                symbol="TSLA",
                display_name="Tesla Inc.",
                description="Electric Vehicles, Autonomy & Clean Energy",
                asset_class=AssetClass.GLOBAL_EQUITIES.value,
                exchange="NASDAQ",
                region="North America",
                country="United States",
                provider_id="yahoo_global",
                security_type=SecurityType.STOCK.value,
                lot_size=1,
                contract_multiplier=100.0,
                tick_size=0.01,
                is_tradable=True,
                has_options=True,
                has_futures=False,
                base_currency="USD",
                quote_currency="USD",
                settlement_currency="USD",
                exercise_style=OptionExerciseStyle.AMERICAN.value,
                settlement_style=OptionSettlementType.PHYSICAL.value,
                trading_timezone="America/New_York",
            ),

            # ─────────────────────────────────────────────────────────────
            # 3. CRYPTO MARKETS (Binance & Deribit Derivatives)
            # ─────────────────────────────────────────────────────────────
            InstrumentMetadata(
                symbol="BTC/USDT",
                display_name="Bitcoin / USDT",
                description="Bitcoin Spot Reference, Perpetuals & Options",
                asset_class=AssetClass.CRYPTO.value,
                exchange="Binance",
                region="Crypto",
                country="Global",
                provider_id="crypto_ccxt",
                security_type=SecurityType.CRYPTO_OPTION.value,
                lot_size=1,
                contract_multiplier=1.0,
                tick_size=0.01,
                is_tradable=True,
                has_options=True,
                has_futures=True,
                base_currency="BTC",
                quote_currency="USDT",
                settlement_currency="USDT",
                exercise_style=OptionExerciseStyle.EUROPEAN.value,
                settlement_style=OptionSettlementType.CASH.value,
                linear_or_inverse="LINEAR",
                trading_timezone="UTC",
            ),
            InstrumentMetadata(
                symbol="ETH/USDT",
                display_name="Ethereum / USDT",
                description="Ethereum Network Reference, Perpetuals & Options",
                asset_class=AssetClass.CRYPTO.value,
                exchange="Binance",
                region="Crypto",
                country="Global",
                provider_id="crypto_ccxt",
                security_type=SecurityType.CRYPTO_OPTION.value,
                lot_size=1,
                contract_multiplier=1.0,
                tick_size=0.01,
                is_tradable=True,
                has_options=True,
                has_futures=True,
                base_currency="ETH",
                quote_currency="USDT",
                settlement_currency="USDT",
                exercise_style=OptionExerciseStyle.EUROPEAN.value,
                settlement_style=OptionSettlementType.CASH.value,
                linear_or_inverse="LINEAR",
                trading_timezone="UTC",
            ),
            InstrumentMetadata(
                symbol="SOL/USDT",
                display_name="Solana / USDT",
                description="Solana High-Throughput Network Derivatives",
                asset_class=AssetClass.CRYPTO.value,
                exchange="Binance",
                region="Crypto",
                country="Global",
                provider_id="crypto_ccxt",
                security_type=SecurityType.CRYPTO_OPTION.value,
                lot_size=1,
                contract_multiplier=1.0,
                tick_size=0.01,
                is_tradable=True,
                has_options=True,
                has_futures=True,
                base_currency="SOL",
                quote_currency="USDT",
                settlement_currency="USDT",
                exercise_style=OptionExerciseStyle.EUROPEAN.value,
                settlement_style=OptionSettlementType.CASH.value,
                linear_or_inverse="LINEAR",
                trading_timezone="UTC",
            ),
        ]

        for item in catalog:
            self._instruments[item.symbol.upper()] = item

    def get_instrument(self, symbol: str) -> Optional[InstrumentMetadata]:
        """Retrieves metadata by symbol identifier."""
        clean = symbol.upper().replace(" ", "")
        return self._instruments.get(clean)

    def list_instruments(
        self,
        asset_class: Optional[str] = None,
        region: Optional[str] = None,
        exchange: Optional[str] = None,
        country: Optional[str] = None,
    ) -> List[InstrumentMetadata]:
        """Filters instruments by asset class, region, exchange, or country."""
        results = list(self._instruments.values())
        if asset_class and asset_class.upper() != "ALL":
            results = [i for i in results if i.asset_class.upper() == asset_class.upper()]
        if region and region.upper() != "ALL":
            results = [i for i in results if i.region.upper() == region.upper()]
        if exchange and exchange.upper() != "ALL":
            results = [i for i in results if i.exchange.upper() == exchange.upper()]
        if country and country.upper() != "ALL":
            results = [i for i in results if i.country.upper() == country.upper()]
        return results

    def search(self, query: str, limit: int = 25) -> List[Dict[str, Any]]:
        """
        Universal multi-token fuzzy search across symbols, display names, and descriptions.
        """
        if not query or not query.strip():
            return [i.to_dict() for i in list(self._instruments.values())[:limit]]

        tokens = query.upper().strip().split()
        matches = []

        for inst in self._instruments.values():
            haystack = f"{inst.symbol} {inst.display_name} {inst.description} {inst.exchange} {inst.region} {inst.country} {inst.asset_class}".upper()
            score = 0
            if all(token in haystack for token in tokens):
                if query.upper() == inst.symbol.upper():
                    score += 100
                elif inst.symbol.upper().startswith(query.upper()):
                    score += 50
                elif query.upper() in inst.display_name.upper():
                    score += 30
                else:
                    score += 10
                matches.append((score, inst))

        matches.sort(key=lambda x: x[0], reverse=True)
        return [inst.to_dict() for _, inst in matches[:limit]]

    def get_expiries_for_underlying(self, underlying: str) -> List[str]:
        """Dynamically calculates standard expiry dates for an underlying instrument."""
        und = underlying.upper().replace(" ", "").replace("/USDT", "")
        if und in ["BTC", "ETH", "SOL"]:
            return _get_crypto_expiries(6)
        elif und in ["SPX", "NDX", "RUT", "VIX", "SPY", "QQQ", "AAPL", "MSFT", "NVDA", "TSLA"]:
            return _get_global_monthly_expiries(6)
        else:
            return _get_indian_monthly_expiries(6)


# Global Singleton Instance
global_instrument_master = InstrumentMaster()
