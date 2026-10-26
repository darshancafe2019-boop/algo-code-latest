"""
Regression test suite for market data snapshot resilience.
Verifies single-symbol, mixed-symbol, partial provider responses, provider failure fallbacks,
and explicit UNAVAILABLE/STALE metadata handling without fabrication.
"""
import pytest
from unittest.mock import patch, MagicMock
from dashboard import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


def test_snapshot_missing_parameter_returns_400(client):
    """Calling /api/market/snapshot without symbol or symbols returns HTTP 400."""
    res = client.get("/api/market/snapshot")
    assert res.status_code == 400
    data = res.get_json()
    assert "error" in data


def test_snapshot_single_crypto_btcusdt(client):
    """Single-symbol crypto request returns valid quote with proper fields."""
    res = client.get("/api/market/snapshot?symbol=BTCUSDT")
    assert res.status_code == 200
    data = res.get_json()
    assert data.get("status") == "success"
    assert "data" in data
    assert "quotes" in data
    assert "BTCUSDT" in data["quotes"]
    quote = data["quotes"]["BTCUSDT"]
    assert quote.get("clean_symbol") == "BTCUSDT"
    assert "BTC" in quote.get("symbol", "")
    assert quote.get("exchange") in ("CRYPTO", "DELTA", "BINANCE")
    assert quote.get("price_state") in ("LIVE", "UNAVAILABLE") or quote.get("last_price") is not None


def test_snapshot_single_indian_symbol_nifty(client):
    """Single-symbol NIFTY request returns NIFTY in data and quotes (never empty)."""
    res = client.get("/api/market/snapshot?symbol=NIFTY")
    assert res.status_code == 200
    data = res.get_json()
    assert data.get("status") == "success"
    assert "NIFTY" in data.get("quotes", {})
    assert "data" in data
    quote = data["quotes"]["NIFTY"]
    assert quote["clean_symbol"] == "NIFTY"
    assert quote["exchange"] == "NSE"
    # Never empty: either has real price or explicit UNAVAILABLE
    if quote.get("last_price") is None:
        assert quote.get("price_state") == "UNAVAILABLE"
        assert quote.get("status_label") == "DATA UNAVAILABLE"
        assert quote.get("is_stale") is True
    else:
        assert float(quote["last_price"]) > 0


def test_snapshot_single_indian_symbol_reliance(client):
    """Single-symbol RELIANCE request returns RELIANCE in data and quotes (never empty)."""
    res = client.get("/api/market/snapshot?symbol=RELIANCE")
    assert res.status_code == 200
    data = res.get_json()
    assert data.get("status") == "success"
    assert "RELIANCE" in data.get("quotes", {})
    quote = data["quotes"]["RELIANCE"]
    assert quote["clean_symbol"] == "RELIANCE"
    assert quote["exchange"] == "NSE"


def test_snapshot_mixed_symbols_preserves_all_requested(client):
    """Mixed request (NIFTY, BTCUSDT, RELIANCE) must contain all requested symbols."""
    res = client.get("/api/market/snapshot?symbols=NIFTY,BTCUSDT,RELIANCE")
    assert res.status_code == 200
    data = res.get_json()
    assert data.get("status") == "success"
    quotes = data.get("quotes", {})
    for sym in ["NIFTY", "BTCUSDT", "RELIANCE"]:
        assert sym in quotes, f"Missing requested symbol {sym} in response quotes"


def test_snapshot_partial_gateway_result_does_not_short_circuit(client):
    """
    If gateway returns ONLY BTCUSDT, the endpoint must NOT short-circuit;
    it must proceed to fetch NIFTY and RELIANCE so all symbols are returned.
    """
    partial_gateway_quotes = {
        "BTCUSDT": {
            "symbol": "BTCUSDT",
            "clean_symbol": "BTCUSDT",
            "last_price": 80000.0,
            "lastPrice": 80000.0,
            "exchange": "CRYPTO",
            "provider": "gateway-test",
            "price_state": "LIVE",
            "status_label": "LIVE",
            "data_quality": "LIVE",
            "is_stale": False,
        }
    }

    mock_client = MagicMock()
    mock_client.is_gateway_available.return_value = True
    mock_client.get_snapshot.return_value = partial_gateway_quotes

    with patch("market_data_gateway.gateway_client.gateway_client", mock_client):
        res = client.get("/api/market/snapshot?symbols=NIFTY,BTCUSDT,RELIANCE")
        assert res.status_code == 200
        data = res.get_json()
        assert data.get("status") == "success"
        quotes = data.get("quotes", {})
        # BTCUSDT was supplied by gateway
        assert "BTCUSDT" in quotes
        assert quotes["BTCUSDT"]["last_price"] == 80000.0
        # NIFTY and RELIANCE MUST NOT be dropped
        assert "NIFTY" in quotes, "NIFTY was dropped due to gateway short-circuit!"
        assert "RELIANCE" in quotes, "RELIANCE was dropped due to gateway short-circuit!"


def test_snapshot_provider_failure_returns_explicit_unavailable(client):
    """
    When all providers fail or symbol is unresolvable,
    returns explicit UNAVAILABLE structure, never empty object, never fabricated price.
    """
    mock_client = MagicMock()
    mock_client.is_gateway_available.return_value = False

    with patch("market_data_gateway.gateway_client.gateway_client", mock_client), \
         patch("market_data.stocks.quote_engine.LiveQuoteFetcher.fetch_live_data", return_value=None), \
         patch("src.upstox_service.upstox_service.get_full_market_quote", return_value=None):
        res = client.get("/api/market/snapshot?symbol=UNKNOWN_SYMBOL_999")
        assert res.status_code == 200
        data = res.get_json()
        assert data.get("status") == "success"
        assert "UNKNOWN_SYMBOL_999" in data.get("quotes", {})
        q = data["quotes"]["UNKNOWN_SYMBOL_999"]
        assert q["last_price"] is None
        assert q["lastPrice"] is None
        assert q["price_state"] == "UNAVAILABLE"
        assert q["status_label"] == "DATA UNAVAILABLE"
        assert q["data_quality"] == "UNAVAILABLE"
        assert q["is_stale"] is True
        # Do not label missing data LIVE
        assert q["price_state"] != "LIVE"
        assert q["status_label"] != "LIVE"


def test_live_quote_fetcher_does_not_throw_name_error():
    """Verify that LiveQuoteFetcher.fetch_live_data does not raise NameError for os."""
    from market_data.stocks.quote_engine import LiveQuoteFetcher
    # Should execute without NameError
    try:
        quote = LiveQuoteFetcher.fetch_live_data("NIFTY", "NSE")
        # May be a valid dict or None, but must not throw NameError
        assert quote is None or isinstance(quote, dict)
    except NameError as ne:
        pytest.fail(f"LiveQuoteFetcher raised NameError: {ne}")
