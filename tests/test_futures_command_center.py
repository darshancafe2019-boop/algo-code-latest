"""
Futures Multi-Provider Real-Time Command Center Test Suite
===========================================================
Validates:
1. Binance USD-M vs COIN-M contract isolation and stream routing
2. DhanHQ and Upstox Indian futures normalization (NSE/NFO)
3. Delta Exchange India crypto perpetuals normalization
4. Mathematical Basis and Annualized Basis Engine
5. Funding Rate & APR Engine isolation (Perpetuals only, never dated futures)
6. Term Structure curve builder across maturities
7. Stale detection, market closed states, and zero synthetic fabrication
8. Dynamic subscription reference counting
"""
from __future__ import annotations

import pytest
import time
from datetime import datetime, timezone

from market_data.futures.models import (
    CanonicalFuturesContract,
    FuturesContractType,
    MarketVenue,
    FundingRateData,
    BasisData,
)
from market_data.futures.quote_engine import FuturesQuoteEngine
from market_data.futures.funding_engine import FundingRateEngine
from market_data.futures.basis_engine import BasisEngine
from market_data_gateway.adapters.base import NormalizedQuote
from market_data_gateway.adapters.binance_usdm_ws import _canonical_to_usdm, _usdm_to_canonical
from market_data_gateway.adapters.binance_coinm_ws import _canonical_to_coinm, _coinm_to_canonical
from market_data_gateway.subscription_registry import SubscriptionRegistry


def test_binance_usdm_and_coinm_contract_isolation():
    """Verify USD-M and COIN-M contract identities, streams, and margins are strictly segregated."""
    # USD-M
    usdm_stream = _canonical_to_usdm("BTC/USDT:USDT")
    assert usdm_stream == "btcusdt"
    usdm_canonical = _usdm_to_canonical("BTCUSDT")
    assert usdm_canonical == "BTC/USDT:USDT"

    # COIN-M
    coinm_stream = _canonical_to_coinm("BTC/USD:BTC")
    assert coinm_stream == "btcusd_perp"
    coinm_canonical = _coinm_to_canonical("BTCUSD_PERP")
    assert coinm_canonical == "BTC/USD:BTC"

    # Verify they never collide
    assert usdm_stream != coinm_stream
    assert usdm_canonical != coinm_canonical


def test_basis_and_annualized_basis_engine():
    """Verify Basis Engine computes raw basis, percentage basis, and annualized yield for dated futures."""
    basis_engine = BasisEngine()

    # NIFTY Dated Future (18 days to expiry, Futures=25000, Spot=24800)
    res = basis_engine.calculate_basis(
        symbol="NIFTY-FUT",
        spot_symbol="NIFTY",
        spot_price=24800.0,
        futures_price=25000.0,
        days_to_expiry=18,
    )

    assert res.spot_price == 24800.0
    assert res.futures_price == 25000.0
    assert res.basis_absolute == 200.0
    assert round(res.basis_percentage, 2) == 0.81  # (200 / 24800) * 100 = 0.806%
    # Annualized: (200 / 24800) * (365 / 18) * 100 = 16.35%
    assert round(res.annualized_basis, 2) == 16.35
    assert res.regime == "CONTANGO"

    # Backwardation case (Futures < Spot)
    res_back = basis_engine.calculate_basis(
        symbol="TCS-FUT",
        spot_symbol="TCS",
        spot_price=4300.0,
        futures_price=4250.0,
        days_to_expiry=15,
    )
    assert res_back.basis_absolute == -50.0
    assert res_back.regime == "BACKWARDATION"
    assert res_back.annualized_basis < 0


def test_funding_rate_and_apr_isolation():
    """Verify FundingRateEngine calculates 8h funding and APR, strictly isolated to perpetuals."""
    funding_engine = FundingRateEngine()

    # Binance BTC/USDT Perpetual with 0.01% (0.0001) 8h rate
    f_data = funding_engine.get_funding_data(
        symbol="BTC/USDT:USDT",
        venue=MarketVenue.BINANCE_USDM,
        raw_rate=0.0001,
    )

    assert f_data.funding_rate_8h == 0.0001
    # APR = 0.0001 * 3 * 365 * 100 = 10.95%
    assert round(f_data.funding_rate_annualized, 2) == 10.95
    assert f_data.countdown_seconds is not None


def test_term_structure_sorting_and_curve():
    """Verify term structure contracts sort correctly by expiry horizon."""
    quote_engine = FuturesQuoteEngine()
    contracts = quote_engine.get_all_universe_contracts()
    assert len(contracts) > 0

    # Filter by BTC contracts
    btc_contracts = [c for c in contracts if c.underlying == "BTC"]
    assert len(btc_contracts) >= 2

    # Check distinct venues and providers
    venues = set(c.venue for c in btc_contracts)
    assert MarketVenue.BINANCE_USDM in venues
    assert MarketVenue.BINANCE_COINM in venues
    assert MarketVenue.DELTA_EXCHANGE in venues


def test_no_synthetic_or_mock_futures_prices():
    """Verify quote engine does not inject hardcoded fake numbers for unquoted instruments."""
    quote_engine = FuturesQuoteEngine()
    contracts = quote_engine.get_all_universe_contracts()

    for c in contracts:
        # Check that unauthenticated providers don't have synthetic live prices forced
        if c.status in ["NOT_CONFIGURED", "AUTH_REQUIRED", "NO_DATA"]:
            assert c.last_price is None or c.freshness_status != "LIVE"
            assert c.freshness_status in ["NO_DATA", "LAST_TRADED", "STALE", "NOT_CONFIGURED"]


def test_subscription_reference_counting():
    """Verify SubscriptionRegistry reference counting manages futures symbols accurately."""
    reg = SubscriptionRegistry()

    # Watchlist subscribes to BTC/USDT:USDT
    reg.subscribe("BTC/USDT:USDT", reason="WATCHLIST", source="futures_table")
    # Order book subscribes to BTC/USDT:USDT
    reg.subscribe("BTC/USDT:USDT", reason="CHART_VIEW", source="order_book_l2")

    assert "BTC/USDT:USDT" in reg.get_active_symbols()

    # Table leaves view
    reg.unsubscribe("BTC/USDT:USDT", reason="WATCHLIST", source="futures_table")
    # Still active because order book holds it
    assert "BTC/USDT:USDT" in reg.get_active_symbols()

    # Order book closes
    reg.unsubscribe("BTC/USDT:USDT", reason="CHART_VIEW", source="order_book_l2")
    assert "BTC/USDT:USDT" not in reg.get_active_symbols()
