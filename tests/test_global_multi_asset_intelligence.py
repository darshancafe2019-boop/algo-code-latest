"""
Comprehensive Test Suite for Quant.OS Global Multi-Asset Trading Intelligence System
==================================================================================
Validates:
1. Global Symbol Master resolution across all asset classes & aliases.
2. AI Model Ensemble mathematical integrity (Agreement, Expected Return Hurdle, RR >= 1:1.50).
3. Risk Engine 20-Gate Pre-Trade Validation & Fail-Closed protection (1:0.00 RR rejection).
4. Authoritative REST APIs & Typed Decision Contract JSON schemas.
5. End-to-End PAPER trading order execution.
"""

import json
import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timezone
from src.symbol_master import GlobalSymbolMaster, symbol_master, AssetClass, FeedClassification
from src.ai.model_ensemble import ModelEnsemble, EnsemblePrediction
from src.ai.decision_engine import DecisionEngine
from src import universal_risk_engine
from dashboard import app


@pytest.fixture
def test_client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


# ============================================================================
# 1. GLOBAL SYMBOL MASTER TESTS
# ============================================================================

def test_symbol_master_crypto_resolution():
    inst = symbol_master.resolve("BTC/USDT")
    assert inst is not None
    assert inst.instrument_id == "BINANCE:BTC/USDT:SPOT"
    assert inst.asset_class == AssetClass.CRYPTO_SPOT
    assert inst.feed_status == FeedClassification.REAL_TIME

    # Alias variations
    assert symbol_master.resolve("BTCUSDT").instrument_id == "BINANCE:BTC/USDT:SPOT"
    assert symbol_master.resolve("BTC-USDT").instrument_id == "BINANCE:BTC/USDT:SPOT"


def test_symbol_master_indian_markets_resolution():
    nifty = symbol_master.resolve("NIFTY 50")
    assert nifty is not None
    assert nifty.exchange == "NSE"
    assert nifty.asset_class == AssetClass.INDIAN_INDICES
    assert nifty.lot_size == 50.0

    # Alias
    assert symbol_master.resolve("^NSEI").instrument_id == "NSE:NIFTY50:INDEX"

    reliance = symbol_master.resolve("RELIANCE.NS")
    assert reliance is not None
    assert reliance.instrument_id == "NSE:RELIANCE:EQ"
    assert reliance.asset_class == AssetClass.INDIAN_EQUITIES


def test_symbol_master_us_equities_and_forex():
    aapl = symbol_master.resolve("AAPL")
    assert aapl is not None
    assert aapl.exchange == "NASDAQ"
    assert aapl.asset_class == AssetClass.US_EQUITIES
    assert aapl.feed_status == FeedClassification.DELAYED

    eurusd = symbol_master.resolve("EUR/USD")
    assert eurusd is not None
    assert eurusd.asset_class == AssetClass.FOREX

    gold = symbol_master.resolve("GOLD")
    assert gold is not None
    assert gold.asset_class == AssetClass.COMMODITIES


def test_symbol_master_search():
    results = symbol_master.search("NIFTY")
    assert len(results) >= 1
    assert any("NIFTY" in r.display_symbol for r in results)


# ============================================================================
# 2. AI MODEL ENSEMBLE MATHEMATICAL INTEGRITY & REPAIR TESTS
# ============================================================================

def test_model_ensemble_disagreement_veto():
    """Validates Bug 1 repair: LightGBM ~60.7% (LONG) vs XGBoost ~50.1% (HOLD) MUST be DISAGREEMENT & HOLD."""
    ensemble = ModelEnsemble()
    
    # Mock trained state
    ensemble.is_trained = True
    ensemble.feature_names = ["feature_1", "feature_2", "atr_14_norm"]
    
    class MockLGB:
        def predict_proba(self, X):
            return np.array([[0.10, 0.293, 0.607]])  # Index 2 = LONG (60.7%)

    class MockXGB:
        def predict_proba(self, X):
            return np.array([[0.20, 0.501, 0.299]])  # Index 1 = HOLD (50.1%)

    ensemble.lgb_model = MockLGB()
    ensemble.xgb_model = MockXGB()
    ensemble.lgb_calibrated = None
    ensemble.xgb_calibrated = None

    df_features = pd.DataFrame([{"feature_1": 1.0, "feature_2": 2.0, "atr_14_norm": 0.02}])
    
    pred = ensemble.predict(
        X_single=df_features,
        confidence_threshold=0.60,
        entry_price=65000.0,
        stop_loss=64000.0,
        take_profit=67000.0,
    )

    assert pred.model_agreement is False
    assert pred.decision == "HOLD"
    assert any("Model Disagreement" in v for v in pred.veto_reasons)


def test_model_ensemble_zero_expected_return_veto():
    """Validates Bug 2 repair: 0.00% expected return cannot enter."""
    ensemble = ModelEnsemble()
    ensemble.is_trained = True
    ensemble.feature_names = ["feature_1", "atr_14_norm"]

    # Both agree on LONG
    class MockAgreedLGB:
        def predict_proba(self, X):
            return np.array([[0.05, 0.15, 0.80]])

    class MockAgreedXGB:
        def predict_proba(self, X):
            return np.array([[0.05, 0.15, 0.80]])

    ensemble.lgb_model = MockAgreedLGB()
    ensemble.xgb_model = MockAgreedXGB()
    ensemble.lgb_calibrated = None
    ensemble.xgb_calibrated = None

    # Zero volatility / high friction causing 0.00% net expected return
    df_features = pd.DataFrame([{"feature_1": 1.0, "atr_14_norm": 0.0001}])

    pred = ensemble.predict(
        X_single=df_features,
        confidence_threshold=0.70,
        estimated_friction_bps=100.0,  # 1% friction overcomes 0.01% move
        entry_price=65000.0,
        stop_loss=64000.0,
        take_profit=67000.0,
    )

    assert pred.expected_return == 0.0
    assert pred.decision == "HOLD"
    assert any("Net Expected Return" in v for v in pred.veto_reasons)


def test_model_ensemble_risk_reward_veto():
    """Validates Bug 3 repair: 1:0.00 or sub-1.50 RR must strictly veto."""
    ensemble = ModelEnsemble()
    ensemble.is_trained = True
    ensemble.feature_names = ["feature_1", "atr_14_norm"]

    class MockAgreed:
        def predict_proba(self, X):
            return np.array([[0.05, 0.05, 0.90]])

    ensemble.lgb_model = MockAgreed()
    ensemble.xgb_model = MockAgreed()
    ensemble.lgb_calibrated = None
    ensemble.xgb_calibrated = None

    df_features = pd.DataFrame([{"feature_1": 1.0, "atr_14_norm": 0.02}])

    # 1:0.00 RR (no take profit)
    pred_no_tp = ensemble.predict(
        X_single=df_features,
        confidence_threshold=0.70,
        entry_price=65000.0,
        stop_loss=64000.0,
        take_profit=0.0,  # RR = 0.00
    )
    assert pred_no_tp.risk_reward == 0.0
    assert pred_no_tp.decision == "HOLD"
    assert any("Risk/Reward" in v for v in pred_no_tp.veto_reasons)

    # Sub-1.50 RR (Risk $1000, Reward $500 -> RR = 0.50)
    pred_sub_rr = ensemble.predict(
        X_single=df_features,
        confidence_threshold=0.70,
        entry_price=65000.0,
        stop_loss=64000.0,
        take_profit=65500.0,
    )
    assert pred_sub_rr.risk_reward == 0.50
    assert pred_sub_rr.decision == "HOLD"


# ============================================================================
# 3. UNIVERSAL RISK ENGINE PRE-TRADE TESTS
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
# 4. REST API & CONTRACT INTEGRATION TESTS
# ============================================================================

def test_api_markets_universe(test_client):
    res = test_client.get("/api/markets/universe")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert len(data["universe"]) >= 10


def test_api_markets_search(test_client):
    res = test_client.get("/api/markets/search?query=BTC")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert any("BTC" in r["display_symbol"] for r in data["results"])


def test_api_markets_quote(test_client):
    res = test_client.get("/api/markets/quote?symbol=BTC/USDT")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert "price" in data
    assert "feedStatus" in data


def test_api_providers_capabilities(test_client):
    res = test_client.get("/api/providers/capabilities")
    assert res.status_code == 200
    data = res.get_json()
    items = data.get("capabilities") or data.get("providers") or []
    assert len(items) >= 4


def test_api_intelligence_signal_typed_contract(test_client):
    """Validates Phase 10 Typed Contract JSON keys."""
    res = test_client.get("/api/intelligence/signal?symbol=BTC/USDT&timeframe=5m")
    assert res.status_code == 200
    contract = res.get_json()
    required_keys = [
        "instrumentId", "symbol", "exchange", "assetClass", "timeframe",
        "decision", "confidence", "expectedReturnAfterCosts", "lightgbm",
        "xgboost", "modelAgreement", "marketRegime", "riskReward",
        "dataSource", "dataClass", "dataAgeMs", "modelVersion",
        "topFactors", "mandatoryConditions", "riskChecks", "vetoReasons", "createdAt"
    ]
    for k in required_keys:
        assert k in contract, f"Missing key '{k}' in decision contract"


def test_api_intelligence_scanner(test_client):
    res = test_client.get("/api/intelligence/scanner")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert len(data["results"]) > 0


def test_api_models_status(test_client):
    res = test_client.get("/api/models/status")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert "active_model_version" in data


def test_api_paper_order_execution(test_client):
    """Validates end-to-end PAPER trade order execution."""
    res = test_client.post(
        "/api/paper/orders",
        data=json.dumps({
            "symbol": "BTC/USDT",
            "direction": "BUY",
            "quantity": 0.01,
            "price": 65000.0,
            "stop_loss": 64000.0,
            "take_profit": 67500.0,
            "strategy": "AI_ENSEMBLE_PRO"
        }),
        content_type="application/json"
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data.get("status") in ["success", "FILLED", "ORDER_PENDING", "APPROVED"] or data.get("success") is True
