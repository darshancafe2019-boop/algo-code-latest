"""
Stock Market Data Service
=========================
Authoritative High-Level Service orchestrating:
- Discovery & Catalog Management
- Quotes & Historical Candles
- Technical & Fundamental Analytics
- Screener Queries & Movers
- Data Quality & Health Telemetry
"""

from typing import Dict, Any, List, Optional
from market_data.stocks.models import (
    StockInstrument,
    NormalizedStockQuote,
    StockFundamentals,
    StockTechnicals,
    StockAnalysisResult,
)
from market_data.stocks.instrument_master import global_stock_master
from market_data.stocks.discovery_engine import global_stock_discovery_engine
from market_data.stocks.quote_engine import global_stock_quote_engine
from market_data.stocks.fundamentals_engine import global_stock_fundamentals_engine
from market_data.stocks.technical_engine import global_stock_technical_engine
from market_data.stocks.historical_engine import global_stock_historical_engine
from market_data.stocks.analysis_engine import global_stock_analysis_engine
from market_data.stocks.ranking_engine import global_stock_ranking_engine
from market_data.stocks.screener_engine import global_stock_screener_engine
from market_data.stocks.session_engine import global_stock_session_engine
from market_data.stocks.data_quality import global_stock_data_quality_engine
from market_data.stocks.filter_engine import StockFilterCriteria
from market_data.stocks.repository import StockRepository


class StockMarketDataService:
    """Unified Orchestration Service for Stocks Universe."""

    def __init__(self):
        self._ensure_initialized()

    def _ensure_initialized(self) -> None:
        """Runs initial discovery if catalog is empty."""
        if global_stock_master.count() == 0:
            stocks = global_stock_discovery_engine.discover_all_stocks()
            for s in stocks:
                StockRepository.upsert_instrument(s)

    def get_stocks(self, criteria: StockFilterCriteria) -> Dict[str, Any]:
        """Runs screener query and returns paginated enriched items."""
        return global_stock_screener_engine.run_screen(criteria)

    def get_stock_by_id(self, instrument_id: str) -> Optional[StockInstrument]:
        return global_stock_master.get_by_id(instrument_id)

    def get_quote(self, instrument_id: str) -> Optional[NormalizedStockQuote]:
        return global_stock_quote_engine.get_quote(instrument_id)

    def get_historical_candles(
        self,
        symbol: str,
        timeframe: str = "15m",
        limit: int = 100,
        base_price: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        price = base_price or 1000.0
        return global_stock_historical_engine.get_candles(
            symbol=symbol,
            timeframe=timeframe,
            limit=limit,
            base_price=price
        )

    def get_fundamentals(self, symbol: str, instrument_id: str) -> StockFundamentals:
        return global_stock_fundamentals_engine.get_fundamentals(symbol, instrument_id)

    def get_technicals(
        self,
        symbol: str,
        instrument_id: str,
        timeframe: str = "1d",
        high_52w: Optional[float] = None,
        low_52w: Optional[float] = None,
        base_price: float = 1000.0
    ) -> StockTechnicals:
        candles = self.get_historical_candles(symbol, timeframe=timeframe, limit=50, base_price=base_price)
        return global_stock_technical_engine.calculate_technicals(
            instrument_id=instrument_id,
            symbol=symbol,
            candles=candles,
            timeframe=timeframe,
            high_52w=high_52w,
            low_52w=low_52w
        )

    def get_analysis(
        self,
        symbol: str,
        instrument_id: str,
        timeframe: str = "1d"
    ) -> StockAnalysisResult:
        q = self.get_quote(instrument_id)
        tech = self.get_technicals(symbol, instrument_id, timeframe=timeframe, base_price=q.last_price if q else 1000.0)
        fund = self.get_fundamentals(symbol, instrument_id)
        return global_stock_analysis_engine.analyze_stock(
            instrument_id=instrument_id,
            symbol=symbol,
            quote=q,
            technicals=tech,
            fundamentals=fund,
            timeframe=timeframe
        )

    def get_movers(self, preset: str = "gainers", exchange: Optional[str] = None, limit: int = 10) -> List[Dict[str, Any]]:
        return global_stock_ranking_engine.get_movers(preset=preset, exchange=exchange, limit=limit)

    def get_system_health(self) -> Dict[str, Any]:
        """Provides status summary for all stock data subsystems."""
        nse_sess = global_stock_session_engine.get_session_status("NSE")
        us_sess = global_stock_session_engine.get_session_status("NASDAQ")
        
        all_insts = global_stock_master.get_all()
        quotes = global_stock_quote_engine.get_all_quotes()
        
        live_count = sum(1 for q in quotes.values() if q.data_quality == "LIVE")
        stale_count = sum(1 for q in quotes.values() if q.data_quality in ("STALE", "DELAYED"))

        return {
            "status": "HEALTHY",
            "total_supported_stocks": len(all_insts),
            "live_count": live_count,
            "stale_count": stale_count,
            "providers": ["Upstox", "YahooFinance", "NSEMaster"],
            "provider_count": 3,
            "sessions": {
                "NSE": nse_sess,
                "US": us_sess
            }
        }


global_stock_service = StockMarketDataService()
