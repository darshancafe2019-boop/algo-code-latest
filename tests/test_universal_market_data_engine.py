"""
Automated Pytest Suite for Universal Market Data Engine
======================================================
"""

import pytest
import time
from datetime import datetime, timezone, timedelta
from src.market_data import (
    global_instrument_master,
    global_options_engine,
    global_futures_engine,
    global_market_cache,
    global_stale_protection,
    global_stream_manager,
    DataQualityEngine,
    MarketQuote,
    ProviderCapability,
    ProviderStatus,
    AssetClass,
    DataQuality,
)


class TestInstrumentMaster:
    def test_nifty_metadata_and_search(self):
        nifty = global_instrument_master.get_instrument("NIFTY")
        assert nifty is not None
        assert nifty.exchange == "NSE"
        assert nifty.has_options is True
        assert nifty.lot_size == 50

        results = global_instrument_master.search("NIFTY")
        assert len(results) >= 1
        assert results[0]["symbol"] == "NIFTY"

    def test_crypto_and_global_indices(self):
        btc = global_instrument_master.get_instrument("BTC/USDT")
        assert btc is not None
        assert btc.asset_class == AssetClass.CRYPTO.value

        spx = global_instrument_master.get_instrument("SPX")
        assert spx is not None
        assert spx.region == "North America"

    def test_expiries_generation(self):
        nifty_expiries = global_instrument_master.get_expiries_for_underlying("NIFTY")
        assert len(nifty_expiries) >= 3
        btc_expiries = global_instrument_master.get_expiries_for_underlying("BTC")
        assert len(btc_expiries) >= 3


class TestOptionsAndFuturesEngines:
    def test_options_greeks_black_scholes(self):
        greeks = global_options_engine.calculate_greeks(
            option_type="CE",
            spot=24500.0,
            strike=24500.0,
            time_to_expiry_years=7.0 / 365.0,
            iv=0.18,
            risk_free_rate=0.065,
        )
        assert 0.45 <= greeks["delta"] <= 0.60
        assert greeks["gamma"] > 0
        assert greeks["vega"] > 0
        assert greeks["theta"] < 0

    def test_option_chain_snapshot(self):
        chain = global_options_engine.generate_option_chain("NIFTY", 24500.0, strike_count=10)
        assert len(chain.strikes) == 10
        assert chain.max_pain > 0
        assert chain.pcr_oi > 0
        assert len(chain.support_zones) > 0

    def test_futures_contracts_and_basis(self):
        contracts = global_futures_engine.generate_futures_contracts("BTC", 65400.0)
        assert len(contracts) >= 3

        basis_data = global_futures_engine.calculate_basis(65400.0, 65850.0, 30.0)
        assert basis_data["basis"] == 450.0
        assert basis_data["annualized_basis_pct"] > 0


class TestDataQualityAndStaleProtection:
    def test_data_quality_validations(self):
        quality_engine = DataQualityEngine(max_clock_skew_sec=3.0, max_stale_age_sec=10.0)

        # 1. Valid
        quote = MarketQuote(
            symbol="BTC/USDT",
            exchange="Binance",
            provider="test",
            lastPrice=65400.0,
            bid=65390.0,
            ask=65410.0,
            volume=100.0,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
        is_val, qual, _ = quality_engine.validate_quote(quote)
        assert is_val is True
        assert qual == DataQuality.VALID

        # 2. Crossed Book
        crossed = MarketQuote(
            symbol="BTC/USDT",
            exchange="Binance",
            provider="test",
            lastPrice=65400.0,
            bid=65500.0,
            ask=65400.0,
            volume=100.0,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
        is_val2, qual2, _ = quality_engine.validate_quote(crossed)
        assert is_val2 is False
        assert qual2 == DataQuality.CROSSED_BOOK

    def test_stale_protection_lockout(self):
        global_stale_protection.record_tick("ETH/USDT")
        is_safe, _, _ = global_stale_protection.is_symbol_safe_for_trading("ETH/USDT")
        assert is_safe is True

        global_stale_protection._feed_last_active["STALE_TEST"] = time.time() - 30.0
        is_safe_stale, reason, _ = global_stale_protection.is_symbol_safe_for_trading("STALE_TEST")
        assert is_safe_stale is False
        assert "BLOCKED_BY_STALE_DATA" in reason


class TestCacheAndStreamManager:
    def test_cache_set_and_get(self):
        global_market_cache.set_quote("SOL/USDT", {"price": 185.0}, ttl_sec=10)
        q = global_market_cache.get_quote("SOL/USDT")
        assert q is not None
        assert q["price"] == 185.0

    def test_stream_manager_broadcast(self):
        q = global_stream_manager.register_client("pytest_client")
        test_quote = MarketQuote(
            symbol="BTC/USDT",
            exchange="Binance",
            provider="test",
            lastPrice=65400.0,
            bid=65390.0,
            ask=65410.0,
            volume=100.0,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
        global_stream_manager.broadcast_quote(test_quote)
        msg = q.get(timeout=1.0)
        assert "BTC/USDT" in msg
        global_stream_manager.unregister_client("pytest_client")
