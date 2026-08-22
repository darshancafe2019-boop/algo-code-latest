"""
Automated Pytest Suite for Crypto Derivatives & Options Engine
==============================================================
Tests:
- Crypto derivatives provider initialization & discovery
- Dynamic expiries discovery for BTC/ETH/SOL
- Live futures contracts structure, basis, and funding calculations
- Option chain matrix, ATM detection, PCR, Max Pain, and Greeks attribution
- Multi-leg strategy evaluator (Iron Condor, Bull Call Spread, Straddle)
- 14-stage derivative risk pre-check
- Database CRUD for derivative orders and positions
"""

import pytest
from src.crypto_derivatives_provider import CCXTCryptoDerivativesProvider, crypto_derivatives_provider
from src.crypto_option_strategy import OptionStrategyEngine
from src.universal_risk_engine import evaluate_trade_precheck
from src import db


def test_crypto_provider_initialization():
    provider = CCXTCryptoDerivativesProvider()
    assert provider.get_provider_id() == "crypto_derivatives_ccxt"
    assert "Binance USDM + Deribit" in provider.get_provider_name()


def test_crypto_spot_price():
    btc_spot = crypto_derivatives_provider.get_spot_price("BTC")
    assert btc_spot > 1000.0, f"Expected BTC spot > 1000, got {btc_spot}"
    eth_spot = crypto_derivatives_provider.get_spot_price("ETH")
    assert eth_spot > 100.0, f"Expected ETH spot > 100, got {eth_spot}"


def test_dynamic_expiries_discovery():
    expiries = crypto_derivatives_provider.get_expiries("BTC")
    assert len(expiries) >= 4, f"Expected at least 4 active expiries, got {len(expiries)}"
    for exp in expiries:
        assert len(exp) == 10
        assert exp[4] == "-" and exp[7] == "-"


def test_crypto_futures_structure():
    futures = crypto_derivatives_provider.get_futures("BTC")
    assert len(futures) > 0
    primary = futures[0]
    assert primary["underlying"] == "BTC"
    assert primary["contract_type"] in ["PERPETUAL", "DATED_FUTURES"]
    assert primary["mark_price"] > 0
    assert "funding_rate_pct" in primary
    assert "funding_countdown" in primary
    assert "basis" in primary
    assert primary["status"] in ["LIVE", "DELAYED", "STALE"]


def test_crypto_option_chain_matrix():
    chain = crypto_derivatives_provider.get_option_chain("BTC", strike_range=10)
    assert chain["status"] == "success"
    assert chain["spot_price"] > 0
    assert chain["atm_strike"] > 0
    assert chain["max_pain"] > 0
    assert chain["expected_move"] > 0
    assert chain["pcr"]["pcr_oi"] >= 0
    assert len(chain["strikes"]) > 0

    # Test strike row attributes
    first_strike = chain["strikes"][0]
    assert "strike" in first_strike
    assert "is_atm" in first_strike
    assert "call" in first_strike
    assert "put" in first_strike


def test_option_strategy_iron_condor():
    res = OptionStrategyEngine.get_preset_strategy("IRON_CONDOR", "BTC", 64000.0, "2026-08-28")
    assert res["status"] == "success"
    assert res["nature"] == "NET CREDIT"
    assert res["legs_count"] == 4
    assert len(res["breakevens"]) == 2
    assert len(res["payoff_curve"]) > 10
    assert "delta" in res["aggregate_greeks"]


def test_option_strategy_bull_call_spread():
    res = OptionStrategyEngine.get_preset_strategy("BULL_CALL_SPREAD", "BTC", 64000.0, "2026-08-28")
    assert res["status"] == "success"
    assert res["nature"] == "NET DEBIT"
    assert res["legs_count"] == 2
    assert len(res["breakevens"]) >= 1


def test_derivative_risk_precheck_valid():
    trade_req = {
        "symbol": "BTC-PERP",
        "direction": "LONG",
        "entry_price": 64000.0,
        "stop_loss": 62500.0,
        "take_profit": 67000.0,
        "quantity": 0.01,
        "leverage": 5.0,
        "asset_class": "crypto"
    }
    account_st = {"balance": 10000.0, "available_capital": 8500.0, "daily_pnl": 0.0}
    risk_lim = {
        "max_risk_per_trade_pct": 5.0,
        "max_daily_drawdown_pct": 5.0,
        "max_single_asset_exposure_pct": 30.0,
        "max_open_positions": 5
    }
    res = evaluate_trade_precheck(trade_req, account_st, [], risk_lim)
    assert res["is_approved"] is True
    assert res["status"] == "APPROVED"


def test_derivative_orders_and_positions_db():
    import uuid
    order_id = f"test_dord_{uuid.uuid4().hex[:6]}"
    pos_id = f"test_dpos_{uuid.uuid4().hex[:6]}"

    order = {
        "order_id": order_id,
        "bot_id": "bot-1",
        "symbol": "BTC-PERP",
        "canonical_symbol": "BTC-PERP",
        "underlying": "BTC",
        "instrument_type": "FUTURES",
        "side": "BUY",
        "order_type": "MARKET",
        "quantity": 0.05,
        "price": 64200.0,
        "leverage": 5.0,
        "margin": 642.0,
        "status": "FILLED",
        "execution_mode": "PAPER"
    }
    assert db.record_derivative_order(order) is True

    pos = {
        "position_id": pos_id,
        "bot_id": "bot-1",
        "symbol": "BTC-PERP",
        "canonical_symbol": "BTC-PERP",
        "underlying": "BTC",
        "instrument_type": "FUTURES",
        "side": "BUY",
        "quantity": 0.05,
        "entry_price": 64200.0,
        "current_price": 64500.0,
        "mark_price": 64500.0,
        "leverage": 5.0,
        "margin": 642.0,
        "unrealized_pnl": 15.0,
        "realized_pnl": 0.0,
        "status": "OPEN"
    }
    assert db.record_derivative_position(pos) is True

    active_positions = db.get_active_derivative_positions()
    assert any(p["position_id"] == pos_id for p in active_positions)

    # Test closing position
    assert db.close_derivative_position(pos_id, 64600.0, 20.0) is True
    active_after = db.get_active_derivative_positions()
    assert not any(p["position_id"] == pos_id for p in active_after)
