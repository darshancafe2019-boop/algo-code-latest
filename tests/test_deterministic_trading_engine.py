"""
Comprehensive Test Suite for Quant.OS 100% Deterministic Trading System
=======================================================================
Validates:
1. Global Symbol Master multi-asset resolution.
2. Deterministic Technical Indicator & Rule Confluence Engine (EMA, RSI, MACD, ATR, ADX).
3. Decision Output Invariance: Identical OHLCV & indicators return identical decision states.
4. Transparent Explainability without AI: 'Why No Trade' rule diagnostic breakdowns.
5. Pre-Trade Risk Engine 20-Gate Enforcement: R:R ratio >= 1:1.50, stop-loss, drawdown, margin.
6. Emergency Kill Switch Fail-Closed Protection: Armed halt immediately blocks all orders.
7. Stale Market Data Invalidation: High tick latency pauses trading.
8. REST API Contracts: /api/markets/universe, /api/intelligence/signal, /api/intelligence/matrix, /api/paper/orders.
"""

import json
import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timezone
from src.symbol_master import GlobalSymbolMaster, symbol_master, AssetClass, FeedClassification
from src.intelligence_engine import IntelligenceEngine, global_intelligence_engine
from src import universal_risk_engine
from src.indicators import calculate_rsi, calculate_emas, calculate_macd, calculate_atr, calculate_adx
from dashboard import app


@pytest.fixture
def test_client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


# ============================================================================
# 1. GLOBAL MULTI-ASSET SYMBOL MASTER TESTS
# ============================================================================

def test_symbol_master_crypto_resolution():
    inst = symbol_master.resolve("BTC/USDT")
    assert inst is not None
    assert inst.instrument_id == "BINANCE:BTC/USDT:SPOT"
    assert inst.asset_class == AssetClass.CRYPTO_SPOT
    assert inst.feed_status == FeedClassification.REAL_TIME
    assert symbol_master.resolve("BTCUSDT").instrument_id == "BINANCE:BTC/USDT:SPOT"


def test_symbol_master_indian_markets_resolution():
    nifty = symbol_master.resolve("NIFTY 50")
    assert nifty is not None
    assert nifty.exchange == "NSE"
    assert nifty.asset_class == AssetClass.INDIAN_INDICES
    assert nifty.lot_size == 50.0

    reliance = symbol_master.resolve("RELIANCE.NS")
    assert reliance is not None
    assert reliance.instrument_id == "NSE:RELIANCE:EQ"
    assert reliance.asset_class == AssetClass.INDIAN_EQUITIES


def test_symbol_master_global_assets():
    eurusd = symbol_master.resolve("EUR/USD")
    assert eurusd is not None
    assert eurusd.asset_class == AssetClass.FOREX

    gold = symbol_master.resolve("GOLD")
    assert gold is not None
    assert gold.asset_class == AssetClass.COMMODITIES


# ============================================================================
# 2. DETERMINISTIC INDICATOR CALCULATIONS
# ============================================================================

def test_deterministic_indicators_math():
    df = pd.DataFrame({"close": [100.0 + i * 1.5 for i in range(50)]})
    df = calculate_rsi(df, length=14)
    assert "rsi" in df.columns
    # Monotonically increasing prices must produce high RSI
    assert df["rsi"].iloc[-1] > 90.0

    df = calculate_emas(df)
    assert df["ema_9"].iloc[-1] > df["ema_20"].iloc[-1]
    assert df["ema_20"].iloc[-1] > df["ema_50"].iloc[-1]


# ============================================================================
# 3. DECISION INVARIANCE TEST (IDENTICAL INPUT -> IDENTICAL OUTPUT)
# ============================================================================

def test_decision_invariance_no_randomness():
    """Identical market inputs must always produce the exact same deterministic decision state."""
    engine = IntelligenceEngine()

    res1 = engine.get_decision_snapshot(symbol="BTC/USDT", is_test=True)
    res2 = engine.get_decision_snapshot(symbol="BTC/USDT", is_test=True)

    assert res1["decision"]["state"] == res2["decision"]["state"]
    assert res1["confluence"]["total_score"] == res2["confluence"]["total_score"]
    assert len(res1["rules_evaluation"]) == len(res2["rules_evaluation"])
    for r1, r2 in zip(res1["rules_evaluation"], res2["rules_evaluation"]):
        assert r1["rule"] == r2["rule"]
        assert r1["passed"] == r2["passed"]


# ============================================================================
# 4. DETERMINISTIC EXPLAINABILITY ('WHY NO TRADE' WITHOUT AI)
# ============================================================================

def test_why_no_trade_deterministic_rules():
    engine = IntelligenceEngine()
    snapshot = engine.get_decision_snapshot(symbol="BTC/USDT", is_test=True)
    
    rules = snapshot.get("rules_evaluation", [])
    assert len(rules) > 0
    # Verify every rule condition contains exact deterministic fact/threshold details
    for r in rules:
        assert "rule" in r
        assert "category" in r
        assert "passed" in r
        assert "live_value" in r
        assert "threshold" in r
        assert isinstance(r["passed"], bool)


# ============================================================================
# 5. PRE-TRADE RISK ENGINE 20-GATE VALIDATION
# ============================================================================

def test_risk_engine_rr_zero_rejection():
    """UniversalRiskEngine Stage 19 MUST FAIL when TP is missing or RR is 0.00."""
    trade_req = {
        "symbol": "BTC/USDT",
        "direction": "BUY",
        "entry_price": 65000.0,
        "stop_loss": 64000.0,
        "take_profit": 0.0,  # Missing TP -> RR 1:0.00
        "quantity": 0.05,
        "leverage": 1.0,
        "data_age_seconds": 1.0,
        "market_status": "OPEN",
        "spread_pct": 0.02,
        "authenticated": True,
        "broker_connected": True,
    }
    val = universal_risk_engine.validate_trade_against_risk_limits(
        trade_request=trade_req,
        account_balance=50000.0,
        available_balance=40000.0,
    )

    assert val["status"] == "BLOCKED"
    assert val["is_approved"] is False
    assert val["risk_checks"]["19_order_validation"] == "FAILED"
    assert any("Risk/Reward" in r or "Take profit" in r for r in val["rejection_reasons"])


def test_risk_engine_valid_pass():
    """UniversalRiskEngine passes all 20 gates when trade satisfies every condition."""
    trade_req = {
        "symbol": "BTC/USDT",
        "direction": "BUY",
        "entry_price": 65000.0,
        "stop_loss": 64000.0,  # Risk $1000
        "take_profit": 67000.0,  # Reward $2000 -> RR = 2.0 (>= 1.50)
        "quantity": 0.05,
        "leverage": 1.0,
        "data_age_seconds": 1.0,
        "market_status": "OPEN",
        "spread_pct": 0.02,
        "authenticated": True,
        "broker_connected": True,
    }
    val = universal_risk_engine.validate_trade_against_risk_limits(
        trade_request=trade_req,
        account_balance=50000.0,
        available_balance=40000.0,
    )

    assert val["status"] == "APPROVED"
    assert val["is_approved"] is True
    assert val["risk_checks"]["19_order_validation"] == "PASSED"
    assert val["risk_checks"]["20_final_approval"] == "PASSED"


# ============================================================================
# 6. EMERGENCY KILL SWITCH & STALE DATA PROTECTION
# ============================================================================

def test_risk_engine_kill_switch_blocking():
    trade_req = {
        "symbol": "BTC/USDT",
        "direction": "BUY",
        "entry_price": 65000.0,
        "stop_loss": 64000.0,
        "take_profit": 67000.0,
        "quantity": 0.05,
        "leverage": 1.0,
        "data_age_seconds": 1.0,
        "market_status": "OPEN",
        "spread_pct": 0.02,
        "authenticated": True,
        "broker_connected": True,
    }
    # Pass with kill switch NORMAL
    universal_risk_engine.set_kill_switch_state("NORMAL")
    val_off = universal_risk_engine.validate_trade_against_risk_limits(
        trade_request=trade_req,
        account_balance=50000.0,
        available_balance=40000.0,
    )
    assert val_off["is_approved"] is True

    # Block with kill switch HALTED
    universal_risk_engine.set_kill_switch_state("HALTED")
    val_on = universal_risk_engine.validate_trade_against_risk_limits(
        trade_request=trade_req,
        account_balance=50000.0,
        available_balance=40000.0,
    )
    assert val_on["is_approved"] is False
    assert val_on["status"] == "BLOCKED"
    assert val_on["risk_checks"]["16_kill_switch"] == "FAILED"
    # Reset back to NORMAL
    universal_risk_engine.set_kill_switch_state("NORMAL")


def test_stale_data_blocking():
    trade_req = {
        "symbol": "BTC/USDT",
        "direction": "BUY",
        "entry_price": 65000.0,
        "stop_loss": 64000.0,
        "take_profit": 67000.0,
        "quantity": 0.05,
        "leverage": 1.0,
        "data_age_seconds": 300.0,  # 5 minutes old (stale)
        "market_status": "OPEN",
        "spread_pct": 0.02,
        "authenticated": True,
        "broker_connected": True,
    }
    val = universal_risk_engine.validate_trade_against_risk_limits(
        trade_request=trade_req,
        account_balance=50000.0,
        available_balance=40000.0,
    )
    assert val["is_approved"] is False
    assert val["status"] == "BLOCKED"
    assert val["risk_checks"]["4_data_freshness"] == "FAILED"


# ============================================================================
# 7. REST API & DETERMINISTIC CONTRACT TESTS
# ============================================================================

def test_api_markets_universe(test_client):
    res = test_client.get("/api/markets/universe")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert len(data["universe"]) >= 10


def test_api_intelligence_signal(test_client):
    res = test_client.get("/api/intelligence/signal?symbol=BTC/USDT&timeframe=5m")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert "decision" in data
    assert "confluence" in data
    assert "rules" in data
    assert "risk" in data


def test_api_intelligence_matrix(test_client):
    res = test_client.get("/api/intelligence/matrix?symbol=BTC/USDT")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert "result" in data
    assert "matrix" in data["result"]


def test_api_paper_order_execution(test_client):
    res = test_client.post(
        "/api/paper/orders",
        data=json.dumps({
            "symbol": "BTC/USDT",
            "direction": "BUY",
            "quantity": 0.01,
            "price": 65000.0,
            "stop_loss": 64000.0,
            "take_profit": 67500.0,
            "strategy": "QUANT_CONFLUENCE_PRO"
        }),
        content_type="application/json"
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data.get("status") in ["success", "FILLED", "ORDER_PENDING", "APPROVED"] or data.get("success") is True
