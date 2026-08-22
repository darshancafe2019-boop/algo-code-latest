"""
Dynamic Global Instrument Master
================================
Maintains dynamic specifications, regional groupings, lot sizes, tick sizes,
and derivative relationships across Global Indices, Indian Markets, Crypto,
Commodities, and Forex.
"""

import re
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone, timedelta
from src.market_data.interfaces import AssetClass
from src.market_data.schemas import InstrumentMetadata


def _get_indian_monthly_expiries(count: int = 4) -> List[str]:
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


def _get_crypto_expiries(count: int = 4) -> List[str]:
    """Generates standard Deribit/Binance crypto derivative expiry dates (Fridays)."""
    expiries = []
    today = datetime.now(timezone.utc)
    # Next Friday
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
    Central Repository of Market Instruments.
    Provides universal search, regional classification, and derivative mapping.
    """

    def __init__(self):
        self._instruments: Dict[str, InstrumentMetadata] = {}
        self._initialize_master_catalog()

    def _initialize_master_catalog(self) -> None:
        """Seeds the dynamic instrument catalog with standard asset classes."""
        catalog = [
            # 1. Indian Indices
            InstrumentMetadata("NIFTY", "NIFTY 50", "NSE Benchmark Index", AssetClass.INDIAN_INDICES.value, "NSE", "India", "nse_provider", lot_size=50, tick_size=0.05, has_options=True, has_futures=True),
            InstrumentMetadata("BANKNIFTY", "BANK NIFTY", "NSE Banking Sector Index", AssetClass.INDIAN_INDICES.value, "NSE", "India", "nse_provider", lot_size=15, tick_size=0.05, has_options=True, has_futures=True),
            InstrumentMetadata("FINNIFTY", "FINNIFTY", "NSE Financial Services Index", AssetClass.INDIAN_INDICES.value, "NSE", "India", "nse_provider", lot_size=40, tick_size=0.05, has_options=True, has_futures=True),
            InstrumentMetadata("MIDCPNIFTY", "NIFTY MIDCAP SELECT", "NSE Midcap Benchmark", AssetClass.INDIAN_INDICES.value, "NSE", "India", "nse_provider", lot_size=75, tick_size=0.05, has_options=True, has_futures=True),
            InstrumentMetadata("NIFTYNEXT50", "NIFTY NEXT 50", "NSE Top 51-100 Benchmark", AssetClass.INDIAN_INDICES.value, "NSE", "India", "nse_provider", lot_size=25, tick_size=0.05, has_options=True, has_futures=True),
            InstrumentMetadata("NIFTY100", "NIFTY 100", "NSE Top 100 Index", AssetClass.INDIAN_INDICES.value, "NSE", "India", "nse_provider", lot_size=50, tick_size=0.05, has_options=False, has_futures=False),
            InstrumentMetadata("NIFTY500", "NIFTY 500", "NSE Broad Market 500 Index", AssetClass.INDIAN_INDICES.value, "NSE", "India", "nse_provider", lot_size=50, tick_size=0.05, has_options=False, has_futures=False),
            InstrumentMetadata("SENSEX", "BSE SENSEX", "BSE Benchmark 30 Index", AssetClass.INDIAN_INDICES.value, "BSE", "India", "bse_provider", lot_size=10, tick_size=0.05, has_options=True, has_futures=True),
            InstrumentMetadata("BANKEX", "BSE BANKEX", "BSE Banking Sector Benchmark", AssetClass.INDIAN_INDICES.value, "BSE", "India", "bse_provider", lot_size=15, tick_size=0.05, has_options=True, has_futures=True),

            # 2. Global Indices
            InstrumentMetadata("SPX", "S&P 500", "US Large-Cap Benchmark", AssetClass.GLOBAL_INDICES.value, "CBOE", "North America", "yahoo_global", lot_size=1, tick_size=0.1, has_options=True, has_futures=True),
            InstrumentMetadata("NDX", "NASDAQ 100", "US Tech Top 100 Benchmark", AssetClass.GLOBAL_INDICES.value, "NASDAQ", "North America", "yahoo_global", lot_size=1, tick_size=0.1, has_options=True, has_futures=True),
            InstrumentMetadata("DJI", "Dow Jones Industrial Average", "US 30 Industrial Blue-Chips", AssetClass.GLOBAL_INDICES.value, "NYSE", "North America", "yahoo_global", lot_size=1, tick_size=1.0, has_options=False, has_futures=True),
            InstrumentMetadata("RUT", "Russell 2000", "US Small-Cap Benchmark", AssetClass.GLOBAL_INDICES.value, "CBOE", "North America", "yahoo_global", lot_size=1, tick_size=0.1, has_options=True, has_futures=True),
            InstrumentMetadata("VIX", "CBOE Volatility Index", "30-Day Forward Volatility Gauge", AssetClass.GLOBAL_INDICES.value, "CBOE", "North America", "yahoo_global", lot_size=1, tick_size=0.01, has_options=True, has_futures=True),
            InstrumentMetadata("DAX", "DAX 40", "German Benchmark Index", AssetClass.GLOBAL_INDICES.value, "XETRA", "Europe", "yahoo_global", lot_size=1, tick_size=0.5, has_options=True, has_futures=True),
            InstrumentMetadata("FTSE", "FTSE 100", "UK Top 100 Index", AssetClass.GLOBAL_INDICES.value, "LSE", "Europe", "yahoo_global", lot_size=1, tick_size=0.5, has_options=True, has_futures=True),
            InstrumentMetadata("CAC", "CAC 40", "French Benchmark Index", AssetClass.GLOBAL_INDICES.value, "EURONEXT", "Europe", "yahoo_global", lot_size=1, tick_size=0.5, has_options=False, has_futures=True),
            InstrumentMetadata("N225", "Nikkei 225", "Tokyo Stock Exchange Benchmark", AssetClass.GLOBAL_INDICES.value, "TSE", "Asia", "yahoo_global", lot_size=1, tick_size=1.0, has_options=True, has_futures=True),
            InstrumentMetadata("HSI", "Hang Seng Index", "Hong Kong Benchmark Index", AssetClass.GLOBAL_INDICES.value, "HKEX", "Asia", "yahoo_global", lot_size=1, tick_size=1.0, has_options=True, has_futures=True),

            # 3. Crypto Assets
            InstrumentMetadata("BTC/USDT", "Bitcoin / USDT", "Bitcoin Network Spot & Perps", AssetClass.CRYPTO.value, "Binance", "Crypto", "crypto_ccxt", lot_size=1, tick_size=0.01, has_options=True, has_futures=True, quote_currency="USDT"),
            InstrumentMetadata("ETH/USDT", "Ethereum / USDT", "Ethereum Network Spot & Perps", AssetClass.CRYPTO.value, "Binance", "Crypto", "crypto_ccxt", lot_size=1, tick_size=0.01, has_options=True, has_futures=True, quote_currency="USDT"),
            InstrumentMetadata("SOL/USDT", "Solana / USDT", "Solana High-Performance Network", AssetClass.CRYPTO.value, "Binance", "Crypto", "crypto_ccxt", lot_size=1, tick_size=0.01, has_options=True, has_futures=True, quote_currency="USDT"),
            InstrumentMetadata("BNB/USDT", "BNB / USDT", "BNB Ecosystem Native Asset", AssetClass.CRYPTO.value, "Binance", "Crypto", "crypto_ccxt", lot_size=1, tick_size=0.01, has_options=False, has_futures=True, quote_currency="USDT"),
            InstrumentMetadata("XRP/USDT", "XRP / USDT", "Ripple Global Settlement Network", AssetClass.CRYPTO.value, "Binance", "Crypto", "crypto_ccxt", lot_size=1, tick_size=0.0001, has_options=False, has_futures=True, quote_currency="USDT"),
            InstrumentMetadata("DOGE/USDT", "Dogecoin / USDT", "Dogecoin Network Asset", AssetClass.CRYPTO.value, "Binance", "Crypto", "crypto_ccxt", lot_size=1, tick_size=0.00001, has_options=False, has_futures=True, quote_currency="USDT"),
            InstrumentMetadata("AVAX/USDT", "Avalanche / USDT", "Avalanche Subnet Network", AssetClass.CRYPTO.value, "Binance", "Crypto", "crypto_ccxt", lot_size=1, tick_size=0.01, has_options=False, has_futures=True, quote_currency="USDT"),

            # 4. Indian Equities
            InstrumentMetadata("RELIANCE", "Reliance Industries", "Energy, Retail & Telecom Conglomerate", AssetClass.INDIAN_EQUITIES.value, "NSE", "India", "nse_provider", lot_size=250, tick_size=0.05, has_options=True, has_futures=True, base_currency="INR", quote_currency="INR"),
            InstrumentMetadata("TCS", "Tata Consultancy Services", "Global IT Services Leader", AssetClass.INDIAN_EQUITIES.value, "NSE", "India", "nse_provider", lot_size=175, tick_size=0.05, has_options=True, has_futures=True, base_currency="INR", quote_currency="INR"),
            InstrumentMetadata("INFY", "Infosys Limited", "Next-Gen Digital Services & Consulting", AssetClass.INDIAN_EQUITIES.value, "NSE", "India", "nse_provider", lot_size=400, tick_size=0.05, has_options=True, has_futures=True, base_currency="INR", quote_currency="INR"),
            InstrumentMetadata("HDFCBANK", "HDFC Bank Limited", "Leading Private Sector Bank", AssetClass.INDIAN_EQUITIES.value, "NSE", "India", "nse_provider", lot_size=550, tick_size=0.05, has_options=True, has_futures=True, base_currency="INR", quote_currency="INR"),
            InstrumentMetadata("ICICIBANK", "ICICI Bank Limited", "Diversified Financial Services Leader", AssetClass.INDIAN_EQUITIES.value, "NSE", "India", "nse_provider", lot_size=700, tick_size=0.05, has_options=True, has_futures=True, base_currency="INR", quote_currency="INR"),
            InstrumentMetadata("SBIN", "State Bank of India", "Largest Public Sector Bank", AssetClass.INDIAN_EQUITIES.value, "NSE", "India", "nse_provider", lot_size=1500, tick_size=0.05, has_options=True, has_futures=True, base_currency="INR", quote_currency="INR"),
            InstrumentMetadata("BHARTIARTL", "Bharti Airtel", "Telecom Services Provider", AssetClass.INDIAN_EQUITIES.value, "NSE", "India", "nse_provider", lot_size=950, tick_size=0.05, has_options=True, has_futures=True, base_currency="INR", quote_currency="INR"),
            InstrumentMetadata("TATAMOTORS", "Tata Motors Limited", "Global Automotive Manufacturer", AssetClass.INDIAN_EQUITIES.value, "NSE", "India", "nse_provider", lot_size=1425, tick_size=0.05, has_options=True, has_futures=True, base_currency="INR", quote_currency="INR"),

            # 5. Global Equities
            InstrumentMetadata("AAPL", "Apple Inc.", "Consumer Tech, iPhone & Services", AssetClass.GLOBAL_EQUITIES.value, "NASDAQ", "North America", "yahoo_global", lot_size=1, tick_size=0.01, has_options=True, has_futures=False),
            InstrumentMetadata("MSFT", "Microsoft Corp.", "Cloud Computing, Azure & Software", AssetClass.GLOBAL_EQUITIES.value, "NASDAQ", "North America", "yahoo_global", lot_size=1, tick_size=0.01, has_options=True, has_futures=False),
            InstrumentMetadata("NVDA", "NVIDIA Corp.", "AI GPU Computing & Data Center", AssetClass.GLOBAL_EQUITIES.value, "NASDAQ", "North America", "yahoo_global", lot_size=1, tick_size=0.01, has_options=True, has_futures=False),
            InstrumentMetadata("AMZN", "Amazon.com Inc.", "E-Commerce & AWS Cloud Infrastructure", AssetClass.GLOBAL_EQUITIES.value, "NASDAQ", "North America", "yahoo_global", lot_size=1, tick_size=0.01, has_options=True, has_futures=False),
            InstrumentMetadata("TSLA", "Tesla Inc.", "Electric Vehicles & Energy Storage", AssetClass.GLOBAL_EQUITIES.value, "NASDAQ", "North America", "yahoo_global", lot_size=1, tick_size=0.01, has_options=True, has_futures=False),
            InstrumentMetadata("ASML", "ASML Holding N.V.", "EUV Lithography Semiconductor Equipment", AssetClass.GLOBAL_EQUITIES.value, "NASDAQ", "Europe", "yahoo_global", lot_size=1, tick_size=0.01, has_options=True, has_futures=False),

            # 6. Commodities
            InstrumentMetadata("GOLD", "Gold / US Dollar", "Physical Bullion Spot & Futures", AssetClass.COMMODITIES.value, "COMEX", "Global", "commodities_provider", lot_size=100, tick_size=0.1, has_options=True, has_futures=True),
            InstrumentMetadata("SILVER", "Silver / US Dollar", "Physical Silver COMEX Contract", AssetClass.COMMODITIES.value, "COMEX", "Global", "commodities_provider", lot_size=5000, tick_size=0.005, has_options=True, has_futures=True),
            InstrumentMetadata("CRUDEOIL", "Crude Oil WTI", "Light Sweet Crude NYMEX Contract", AssetClass.COMMODITIES.value, "NYMEX", "Global", "commodities_provider", lot_size=1000, tick_size=0.01, has_options=True, has_futures=True),

            # 7. Forex
            InstrumentMetadata("EURUSD", "EUR / USD", "Euro vs US Dollar Major", AssetClass.FOREX.value, "OANDA", "Global", "oanda_forex", lot_size=100000, tick_size=0.00001, has_options=False, has_futures=True),
            InstrumentMetadata("GBPUSD", "GBP / USD", "British Pound vs US Dollar", AssetClass.FOREX.value, "OANDA", "Global", "oanda_forex", lot_size=100000, tick_size=0.00001, has_options=False, has_futures=True),
            InstrumentMetadata("USDINR", "USD / INR", "US Dollar vs Indian Rupee", AssetClass.FOREX.value, "NSE-CD", "India", "nse_provider", lot_size=1000, tick_size=0.0025, has_options=True, has_futures=True),
        ]

        for item in catalog:
            self._instruments[item.symbol.upper()] = item

    def get_instrument(self, symbol: str) -> Optional[InstrumentMetadata]:
        """Retrieves metadata by symbol identifier."""
        return self._instruments.get(symbol.upper().replace(" ", ""))

    def list_instruments(
        self,
        asset_class: Optional[str] = None,
        region: Optional[str] = None,
        exchange: Optional[str] = None,
    ) -> List[InstrumentMetadata]:
        """Filters instruments by asset class, region, or exchange."""
        results = list(self._instruments.values())
        if asset_class and asset_class.upper() != "ALL":
            results = [i for i in results if i.asset_class.upper() == asset_class.upper()]
        if region and region.upper() != "ALL":
            results = [i for i in results if i.region.upper() == region.upper()]
        if exchange and exchange.upper() != "ALL":
            results = [i for i in results if i.exchange.upper() == exchange.upper()]
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
            haystack = f"{inst.symbol} {inst.display_name} {inst.description} {inst.exchange} {inst.region} {inst.asset_class}".upper()
            score = 0
            if all(token in haystack for token in tokens):
                # Exact symbol match gives top score
                if query.upper() == inst.symbol.upper():
                    score += 100
                elif inst.symbol.upper().startswith(query.upper()):
                    score += 50
                elif query.upper() in inst.display_name.upper():
                    score += 30
                else:
                    score += 10
                matches.append((score, inst))

        # Sort by score descending
        matches.sort(key=lambda x: x[0], reverse=True)
        return [inst.to_dict() for _, inst in matches[:limit]]

    def get_expiries_for_underlying(self, underlying: str) -> List[str]:
        """Dynamically calculates standard expiry dates for an underlying instrument."""
        und = underlying.upper().replace(" ", "").replace("/USDT", "")
        if und in ["BTC", "ETH", "SOL"]:
            return _get_crypto_expiries(4)
        else:
            return _get_indian_monthly_expiries(4)


# Global Singleton Instance
global_instrument_master = InstrumentMaster()
