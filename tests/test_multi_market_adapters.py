"""
Unit and Integration Tests for Multi-Market Adapters & Capabilities
===================================================================
Tests:
1. Instrument resolution for Indian, US, and Crypto assets.
2. Broker capability matrices.
3. Multi-leg order execution through PaperMultiMarketAdapter.
4. Position square-off lifecycle.
"""

import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.market_data.instrument_master import global_instrument_master
from src.market_data.multi_market_broker_adapters import (
    global_broker_manager,
    PaperMultiMarketAdapter,
)
from src.market_data.options_workstation_service import global_options_service


def test_instrument_resolution():
    """Verify resolution of Indian indices, US equities, and Crypto options."""
    nifty = global_instrument_master.get_instrument("NIFTY")
    assert nifty is not None
    assert nifty.country == "India"
    assert nifty.contract_multiplier == 50.0
    assert nifty.exercise_style == "EUROPEAN"
    assert nifty.settlement_style == "CASH"

    spx = global_instrument_master.get_instrument("SPX")
    assert spx is not None
    assert spx.exchange == "CBOE"
    assert spx.contract_multiplier == 100.0

    btc = global_instrument_master.get_instrument("BTC/USDT")
    assert btc is not None
    assert btc.contract_multiplier == 1.0
    assert btc.linear_or_inverse == "LINEAR"


def test_broker_capabilities():
    """Verify truthful broker capability objects."""
    caps = global_broker_manager.list_all_capabilities()
    assert len(caps) >= 4
    broker_ids = [c["broker_id"] for c in caps]
    assert "paper_multi_market" in broker_ids
    assert "indian_broker_gateway" in broker_ids
    assert "ibkr_global" in broker_ids
    assert "binance_options" in broker_ids


def test_paper_multileg_execution_lifecycle():
    """Test full multi-leg order execution and square-off in paper broker."""
    adapter = PaperMultiMarketAdapter(initial_capital=500000.0)

    order_payload = {
        "strategy_id": "BULL_CALL_SPREAD",
        "underlying": "NIFTY",
        "lots": 2,
        "legs": [
            {"action": "BUY", "option_type": "CE", "strike": 24000.0, "expiry": "2026-09-04", "premium": 150.0, "quantity": 100.0},
            {"action": "SELL", "option_type": "CE", "strike": 24200.0, "expiry": "2026-09-04", "premium": 60.0, "quantity": 100.0},
        ],
    }

    order_res = adapter.place_multileg_order(order_payload)
    assert order_res["status"] == "FILLED"
    assert "order_id" in order_res
    assert "position_id" in order_res

    positions = adapter.get_positions()
    assert len(positions) == 1
    pos = positions[0]
    assert pos["underlying"] == "NIFTY"
    assert pos["lots"] == 2

    # Square off
    close_res = adapter.square_off_position(pos["position_id"])
    assert close_res["status"] == "SQUARED_OFF"
    assert len(adapter.get_positions()) == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
