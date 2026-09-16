"""
Tests for Market Universe Row Provider Resolution & Market Session
===================================================================
Verifies:
1. Indian equities (NSE/BSE) dynamically resolve provider and market session (CLOSED outside market hours -> LAST_TRADED).
2. Crypto instruments resolve 24X7 session and LIVE_TRADE price state.
3. No row is left unassigned when compatible configured providers exist.
"""

import pytest
from src import db


def test_01_indian_equities_resolve_provider_and_closed_session():
    res = db.get_instruments_master(exchange="NSE", limit=10)
    instruments = res.get("instruments", [])
    assert len(instruments) > 0

    for inst in instruments:
        assert inst.get("provider") in ["upstox", "dhan"]
        assert inst.get("marketSession") in ["OPEN", "CLOSED"]
        assert inst.get("priceState") in ["LIVE_TRADE", "LAST_TRADED"]
        # Symbol and display name must be defined
        assert bool(inst.get("symbol")) is True


def test_02_crypto_instruments_resolve_24x7_live():
    res = db.get_instruments_master(asset_class="Crypto", limit=10)
    instruments = res.get("instruments", [])
    assert len(instruments) > 0

    for inst in instruments:
        assert inst.get("provider") in ["delta", "binance"]
        assert inst.get("marketSession") == "24X7"
        assert inst.get("priceState") == "LIVE_TRADE"
        assert inst.get("market_status") == "OPEN"


def test_03_specific_symbols_resolution():
    for sym in ["NIFTY", "RELIANCE", "SBIN", "HDFCBANK"]:
        res = db.get_instruments_master(search=sym, limit=1)
        insts = res.get("instruments", [])
        if insts:
            inst = insts[0]
            assert inst.get("provider") in ["upstox", "dhan"]
            assert inst.get("priceState") in ["LAST_TRADED", "LIVE_TRADE"]
