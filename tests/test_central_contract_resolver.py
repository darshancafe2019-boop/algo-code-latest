"""
Tests for CentralContractResolver
=================================
Validates dynamic contract resolution, expiry filtering, mode separation, and caching.
"""

import pytest
from src.contract_resolver import CentralContractResolver, global_contract_resolver, ContractStatus
from src.market_clock import MarketClock


def test_resolve_upstox_nifty_future_dynamic():
    resolver = CentralContractResolver()
    resolved = resolver.resolve_contract(
        broker="UPSTOX",
        exchange="NSE",
        underlying="NIFTY",
        instrument_type="FUT",
        expiry_preference="AUTO",
        mode="LIVE",
    )
    assert resolved is not None
    assert resolved.underlying == "NIFTY"
    assert resolved.instrument_type == "FUT"
    assert resolved.is_valid is True
    assert resolved.status in (ContractStatus.ACTIVE, ContractStatus.NEAR_EXPIRY)
    assert resolved.lot_size > 0
    # Must NOT be the expired 2026-03-27 contract
    assert resolved.expiry != "2026-03-27"
    # Expiry must be >= current trading date
    today = MarketClock.trading_date("NSE")
    assert resolved.expiry >= today


def test_resolve_upstox_nifty_preferences():
    resolver = CentralContractResolver()
    
    # Monthly
    res_month = resolver.resolve_contract(
        broker="UPSTOX",
        exchange="NSE",
        underlying="NIFTY",
        instrument_type="FUT",
        expiry_preference="CURRENT_MONTH",
    )
    assert res_month is not None
    assert res_month.expiry != "2026-03-27"

    # Next Month
    res_next_month = resolver.resolve_contract(
        broker="UPSTOX",
        exchange="NSE",
        underlying="NIFTY",
        instrument_type="FUT",
        expiry_preference="NEXT_MONTH",
    )
    assert res_next_month is not None


def test_resolve_delta_btc_options():
    resolver = CentralContractResolver()
    resolved = resolver.resolve_contract(
        broker="DELTA",
        exchange="DELTA",
        underlying="BTC",
        instrument_type="OPT",
        expiry_preference="AUTO",
        strike=83200,
        option_type="CE",
    )
    assert resolved is not None
    assert resolved.underlying == "BTC"
    assert resolved.is_valid is True
    assert resolved.status in (ContractStatus.ACTIVE, ContractStatus.NEAR_EXPIRY)
    today = MarketClock.trading_date("DELTA")
    assert resolved.expiry >= today


def test_validate_contract_expiry_expired_blocks_execution():
    resolver = CentralContractResolver()
    
    # Given an expired contract (2026-03-27 when application date is 2026-09-29)
    res = resolver.validate_contract_expiry(
        contract_key="NSE:NIFTY26MARFUT",
        expiry_str="2026-03-27",
        underlying="NIFTY",
        broker="UPSTOX",
        exchange="NSE",
        mode="LIVE",
    )
    assert res.valid is False
    assert res.status == ContractStatus.EXPIRED
    assert "EXPIRED" in (res.message or "")


def test_validate_contract_expiry_backtest_mode_separation():
    resolver = CentralContractResolver()
    
    # In BACKTEST mode, historical contracts are permitted
    res = resolver.validate_contract_expiry(
        contract_key="NSE:NIFTY26MARFUT",
        expiry_str="2026-03-27",
        underlying="NIFTY",
        broker="UPSTOX",
        exchange="NSE",
        mode="BACKTEST",
    )
    assert res.valid is True


def test_validate_dynamic_auto_preference():
    resolver = CentralContractResolver()
    res = resolver.validate_contract_expiry(
        contract_key="NSE:NIFTY:AUTO:FUT",
        expiry_str="AUTO",
        underlying="NIFTY",
        broker="UPSTOX",
        exchange="NSE",
        mode="LIVE",
    )
    assert res.valid is True
    assert res.status in (ContractStatus.ACTIVE, ContractStatus.NEAR_EXPIRY)
    assert res.contract is not None
    assert res.contract.expiry != "AUTO"
    assert res.contract.expiry != "2026-03-27"
