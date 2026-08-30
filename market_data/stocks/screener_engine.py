"""
Stock Screener Engine
=====================
Orchestrates multi-parameter screening, sorting, pagination, and data enrichment.
"""

from typing import Dict, Any, List, Optional
from market_data.stocks.instrument_master import global_stock_master
from market_data.stocks.quote_engine import global_stock_quote_engine
from market_data.stocks.fundamentals_engine import global_stock_fundamentals_engine
from market_data.stocks.technical_engine import global_stock_technical_engine
from market_data.stocks.historical_engine import global_stock_historical_engine
from market_data.stocks.analysis_engine import global_stock_analysis_engine
from market_data.stocks.filter_engine import StockFilterEngine, StockFilterCriteria


class StockScreenerEngine:
    """Executes server-side screening across the stock universe."""

    @classmethod
    def run_screen(cls, criteria: StockFilterCriteria) -> Dict[str, Any]:
        """Runs the screener and returns paginated, sorted results with metadata."""
        all_instruments = global_stock_master.get_all()
        all_quotes = global_stock_quote_engine.get_all_quotes()

        # Step 1: Materialize enriched records
        rows = []
        for inst in all_instruments:
            q = all_quotes.get(inst.instrument_id)
            if not q:
                continue

            # Calculate fast technicals snapshot
            candles = global_stock_historical_engine.get_candles(
                symbol=inst.symbol,
                timeframe="1d",
                limit=30,
                base_price=q.last_price
            )
            tech = global_stock_technical_engine.calculate_technicals(
                instrument_id=inst.instrument_id,
                symbol=inst.symbol,
                candles=candles,
                timeframe="1d",
                high_52w=q.high_52w,
                low_52w=q.low_52w
            )
            fund = global_stock_fundamentals_engine.get_fundamentals(
                symbol=inst.symbol,
                instrument_id=inst.instrument_id
            )
            analysis = global_stock_analysis_engine.analyze_stock(
                instrument_id=inst.instrument_id,
                symbol=inst.symbol,
                quote=q,
                technicals=tech,
                fundamentals=fund,
                timeframe="1d"
            )

            record = {
                "instrument_id": inst.instrument_id,
                "symbol": inst.symbol,
                "company_name": inst.company_name,
                "exchange": inst.exchange,
                "region": inst.region,
                "currency": inst.currency,
                "instrument_type": inst.instrument_type,
                "isin": inst.isin,
                "sector": inst.sector,
                "industry": inst.industry,
                "market_cap_category": inst.market_cap_category,
                "index_memberships": inst.index_memberships,
                "is_fno_enabled": inst.is_fno_enabled,
                "trading_status": inst.trading_status,
                
                # Quote metrics
                "last_price": q.last_price,
                "open_price": q.open_price,
                "high_price": q.high_price,
                "low_price": q.low_price,
                "previous_close": q.previous_close,
                "change_abs": q.change_abs,
                "change_pct": q.change_pct,
                "bid": q.bid,
                "ask": q.ask,
                "spread": q.spread,
                "volume_shares": q.volume_shares,
                "relative_volume": q.relative_volume or 1.0,
                "turnover": q.turnover_quote_currency,
                "turnover_usd": q.turnover_usd,
                "turnover_inr": q.turnover_inr,
                "vwap": q.vwap,
                "high_52w": q.high_52w,
                "low_52w": q.low_52w,
                "market_status": q.market_status,
                "data_quality": q.data_quality,
                "data_age_ms": q.data_age_ms,
                "provider": q.provider,
                "timestamp_exchange": q.timestamp_exchange,

                # Technical metrics
                "rsi_14": tech.rsi_14,
                "macd_line": tech.macd_line,
                "macd_signal": tech.macd_signal,
                "macd_hist": tech.macd_hist,
                "ema_20": tech.ema_20,
                "ema_50": tech.ema_50,
                "ema_200": tech.ema_200,
                "atr_14": tech.atr_14,
                "is_breakout": tech.is_breakout,
                "is_breakdown": tech.is_breakdown,

                # Fundamental metrics
                "pe_ratio": fund.pe_ratio,
                "pb_ratio": fund.pb_ratio,
                "eps_ttm": fund.eps_ttm,
                "dividend_yield_pct": fund.dividend_yield_pct,
                "roe_pct": fund.roe_pct,
                "debt_to_equity": fund.debt_to_equity,

                # Quantitative Analysis metrics
                "directional_bias": analysis.directional_bias,
                "overall_score": analysis.overall_score,
                "technical_score": analysis.technical_score,
                "momentum_score": analysis.momentum_score,
                "confidence_score": analysis.confidence_score,
                "summary_explanation": analysis.summary_explanation,
            }

            # Filter validation
            if StockFilterEngine.matches(record, criteria):
                rows.append(record)

        # Step 2: Sorting
        sort_key = criteria.sort_by
        reverse = criteria.sort_direction.lower() == "desc"

        def get_sort_val(r):
            v = r.get(sort_key)
            if v is None:
                return -999999999.0 if reverse else 999999999.0
            return v

        rows.sort(key=get_sort_val, reverse=reverse)

        # Step 3: Pagination
        total = len(rows)
        page = max(1, criteria.page)
        page_size = max(1, min(200, criteria.page_size))
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated = rows[start_idx:end_idx]

        return {
            "items": paginated,
            "total": total,
            "page": page,
            "pageSize": page_size,
            "totalPages": max(1, (total + page_size - 1) // page_size),
        }


global_stock_screener_engine = StockScreenerEngine()
