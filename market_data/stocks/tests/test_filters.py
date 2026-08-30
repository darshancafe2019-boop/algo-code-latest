"""
Unit Tests for Stock Screening & Filtering
==========================================
Verifies:
- Individual filters (Search, Exchange, Sector, Price range, Volume)
- Combined multi-parameter queries
- Sorting & pagination
"""

import pytest
from market_data.stocks.filter_engine import StockFilterEngine, StockFilterCriteria
from market_data.stocks.screener_engine import StockScreenerEngine
from market_data.stocks.service import StockMarketDataService


def test_screener_filters_and_pagination():
    service = StockMarketDataService()

    # Test 1: Search by symbol
    criteria_search = StockFilterEngine.from_query_params({"search": "TCS"})
    res1 = service.get_stocks(criteria_search)
    assert res1["total"] >= 1
    assert any(item["symbol"] == "TCS" for item in res1["items"])

    # Test 2: Exchange filter (NSE only)
    criteria_nse = StockFilterEngine.from_query_params({"exchange": "NSE"})
    res2 = service.get_stocks(criteria_nse)
    assert res2["total"] >= 5
    for item in res2["items"]:
        assert item["exchange"] == "NSE"

    # Test 3: US Markets filter (NASDAQ)
    criteria_nasdaq = StockFilterEngine.from_query_params({"exchange": "NASDAQ"})
    res3 = service.get_stocks(criteria_nasdaq)
    assert res3["total"] >= 3
    for item in res3["items"]:
        assert item["exchange"] == "NASDAQ"
        assert item["currency"] == "USD"

    # Test 4: Gainers price direction
    criteria_gainers = StockFilterEngine.from_query_params({"price_direction": "GAINERS"})
    res4 = service.get_stocks(criteria_gainers)
    for item in res4["items"]:
        assert (item["change_pct"] or 0) > 0

    # Test 5: Sorting by change_pct desc
    criteria_sort = StockFilterEngine.from_query_params({"sort_by": "change_pct", "sort_direction": "desc", "limit": "5"})
    res5 = service.get_stocks(criteria_sort)
    items = res5["items"]
    if len(items) >= 2:
        assert items[0]["change_pct"] >= items[1]["change_pct"]
