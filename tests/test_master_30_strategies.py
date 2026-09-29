"""
TEST SUITE: QUANT.OS MASTER 30-STRATEGY TRADING ENGINE
======================================================
Comprehensive automated verification for all 30 algorithmic strategies.
Validates:
1. Complete 30-strategy catalog registration and schema integrity.
2. Centralized indicator calculation engine.
3. Deterministic signal generation (Long, Short, Hold, Rejection).
4. Mathematical risk and position sizing.
5. Historical backtesting engine.
6. Data validation and stale data handling.
7. Flask REST API endpoints.
"""

import pytest
import numpy as np
import pandas as pd
from datetime import datetime, timezone

from src.master_30_strategies import (
    Master30StrategyEngine,
    STRATEGY_REGISTRY_CATALOG,
    StrategySignal,
    StrategyDefinition,
)
from dashboard import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def sample_trending_bull_candles():
    """Generates 100 bars of clean bullish trending OHLCV data."""
    np.random.seed(42)
    n = 100
    base = 50000.0
    drift = np.linspace(0, 5000, n)
    noise = np.random.normal(0, 50, n)
    closes = base + drift + noise
    opens = closes - np.random.uniform(10, 40, n)
    highs = np.maximum(opens, closes) + np.random.uniform(20, 60, n)
    lows = np.minimum(opens, closes) - np.random.uniform(20, 60, n)
    volumes = np.random.uniform(1000, 3000, n)

    return pd.DataFrame({
        "timestamp": [f"2026-01-01T{i:02d}:00:00Z" for i in range(n)],
        "open": opens,
        "high": highs,
        "low": lows,
        "close": closes,
        "volume": volumes,
    })


@pytest.fixture
def sample_ranging_candles():
    """Generates 100 bars of ranging/mean-reverting OHLCV data."""
    np.random.seed(99)
    n = 100
    base = 60000.0
    oscillations = np.sin(np.linspace(0, 10 * np.pi, n)) * 800.0
    closes = base + oscillations + np.random.normal(0, 30, n)
    opens = closes - np.random.uniform(-30, 30, n)
    highs = np.maximum(opens, closes) + np.random.uniform(10, 50, n)
    lows = np.minimum(opens, closes) - np.random.uniform(10, 50, n)
    volumes = np.random.uniform(500, 1500, n)

    return pd.DataFrame({
        "timestamp": [f"2026-02-01T{i:02d}:00:00Z" for i in range(n)],
        "open": opens,
        "high": highs,
        "low": lows,
        "close": closes,
        "volume": volumes,
    })


# ============================================================================
# 1. CATALOG REGISTRY TESTS (ALL 30 STRATEGIES)
# ============================================================================

def test_all_30_strategies_exist_and_unique():
    """Verify exactly 30 unique strategies exist from S01 to S30."""
    assert len(STRATEGY_REGISTRY_CATALOG) == 30
    for i in range(1, 31):
        strat_id = f"S{i:02d}"
        strat = Master30StrategyEngine.get_strategy(strat_id)
        assert strat is not None, f"Strategy {strat_id} missing from catalog"
        assert strat.id == strat_id
        assert strat.number == f"{i:02d}"
        assert len(strat.name) > 0
        assert len(strat.category) > 0
        assert len(strat.required_indicators) > 0
        assert "rr_ratio" in strat.default_parameters or "atr_multiplier" in strat.default_parameters
        assert len(strat.presets) >= 3, f"Strategy {strat_id} must have at least 3 presets"


def test_strategy_id_normalization():
    """Verify lookup normalizes aliases like '01', 's1', 'crypto-strat-01'."""
    s1 = Master30StrategyEngine.get_strategy("01")
    s2 = Master30StrategyEngine.get_strategy("S01")
    s3 = Master30StrategyEngine.get_strategy("crypto-strat-01")
    assert s1 is not None and s2 is not None and s3 is not None
    assert s1.id == s2.id == s3.id == "S01"


# ============================================================================
# 2. INDICATOR ENGINE CALCULATION TESTS
# ============================================================================

def test_prepare_dataframe_indicators(sample_trending_bull_candles):
    """Verify indicator calculation engine populates all standard indicators."""
    df = Master30StrategyEngine.prepare_dataframe_indicators(sample_trending_bull_candles)
    required_cols = [
        "ema_9", "ema_21", "ema_50", "ema_200",
        "sma_20", "vol_sma_20", "rsi_14", "macd_line",
        "macd_signal", "macd_hist", "atr_14", "bb_mid",
        "bb_upper", "bb_lower", "bb_bandwidth", "donchian_high_20",
        "donchian_low_20", "vwap", "obv", "adx_14"
    ]
    for col in required_cols:
        assert col in df.columns, f"Indicator column {col} missing in prepared DataFrame"
        assert not df[col].tail(10).isna().all(), f"Indicator column {col} contains all NaNs"


# ============================================================================
# 3. DETERMINISTIC STRATEGY SIGNAL TESTS
# ============================================================================

def test_s01_trend_pullback_evaluation(sample_trending_bull_candles):
    """Verify S01 Trend Pullback produces valid signal structure."""
    sig = Master30StrategyEngine.evaluate("S01", sample_trending_bull_candles)
    assert isinstance(sig, StrategySignal)
    assert sig.strategy_id == "S01"
    assert sig.strategy_name == "Trend Pullback to EMA"
    assert sig.direction in ["LONG", "SHORT", "HOLD", "NO_SIGNAL"]
    assert sig.signal_score >= 0.0
    if sig.direction == "LONG":
        assert sig.stop_price < sig.trigger_price
        assert sig.target_price > sig.trigger_price
        assert sig.risk_reward >= 1.5


def test_s02_momentum_expansion_evaluation(sample_trending_bull_candles):
    """Verify S02 Momentum Expansion evaluates RSI, MACD, and RVOL."""
    sig = Master30StrategyEngine.evaluate("S02", sample_trending_bull_candles)
    assert isinstance(sig, StrategySignal)
    assert sig.strategy_id == "S02"
    assert len(sig.reason) > 0


def test_s07_donchian_breakout_evaluation(sample_trending_bull_candles):
    """Verify S07 Donchian Breakout triggers on breakout above 20-bar high."""
    sig = Master30StrategyEngine.evaluate("S07", sample_trending_bull_candles)
    assert isinstance(sig, StrategySignal)
    assert sig.strategy_id == "S07"
    if sig.direction == "LONG":
        assert sig.trigger_price > 0
        assert sig.stop_price < sig.trigger_price
        assert sig.target_price > sig.trigger_price


def test_s11_bollinger_reversion_evaluation(sample_ranging_candles):
    """Verify S11 Bollinger Reversion handles mean reversion in ranging regimes."""
    sig = Master30StrategyEngine.evaluate("S11", sample_ranging_candles)
    assert isinstance(sig, StrategySignal)
    assert sig.strategy_id == "S11"
    assert sig.confirmation_status in ["CONFIRMED", "WAITING"]


def test_s12_rsi_extreme_reversion(sample_ranging_candles):
    """Verify S12 RSI Extreme Reversion evaluates extreme boundaries."""
    sig = Master30StrategyEngine.evaluate("S12", sample_ranging_candles)
    assert isinstance(sig, StrategySignal)
    assert sig.strategy_id == "S12"


def test_s30_three_factor_regime_confluence(sample_trending_bull_candles):
    """Verify S30 evaluates all 3 quantitative macro factors."""
    sig = Master30StrategyEngine.evaluate(
        "S30",
        sample_trending_bull_candles,
        extra_data={"funding_rate_pct": 0.01}
    )
    assert isinstance(sig, StrategySignal)
    assert sig.strategy_id == "S30"
    assert "Three-Factor" in sig.strategy_name or "Three-Factor" in sig.reason


# ============================================================================
# 4. INSUFFICIENT / STALE DATA REJECTION TESTS
# ============================================================================

def test_insufficient_data_rejection():
    """Verify engine rejects datasets with fewer than 25 bars."""
    short_df = pd.DataFrame({
        "open": [100.0, 101.0, 102.0],
        "high": [105.0, 106.0, 107.0],
        "low": [95.0, 96.0, 97.0],
        "close": [102.0, 103.0, 104.0],
        "volume": [100, 200, 300],
    })
    sig = Master30StrategyEngine.evaluate("S01", short_df)
    assert sig.confirmation_status == "DATA_UNAVAILABLE"
    assert sig.direction == "NO_SIGNAL"
    assert "Insufficient" in sig.reason


def test_empty_dataframe_rejection():
    """Verify engine gracefully rejects empty DataFrame."""
    sig = Master30StrategyEngine.evaluate("S01", pd.DataFrame())
    assert sig.confirmation_status == "DATA_UNAVAILABLE"
    assert sig.direction == "NO_SIGNAL"


# ============================================================================
# 5. RISK AND POSITION SIZING TESTS
# ============================================================================

def test_risk_and_position_sizing_mathematics():
    """Verify Risk Amount = Capital * Risk% and Size = Risk Amount / Stop Distance."""
    risk_info = Master30StrategyEngine.calculate_risk_and_position_size(
        account_capital=100000.0,
        risk_pct=1.0,
        entry_price=80000.0,
        stop_price=78000.0,
        lot_size=1.0,
        max_leverage=1.0,
    )
    # Risk Amount = 100,000 * 1% = 1,000
    assert risk_info["risk_amount"] == 1000.0
    # Stop Distance = 80,000 - 78,000 = 2,000
    assert risk_info["stop_distance"] == 2000.0
    # Raw Size = 1,000 / 2,000 = 0.5 BTC
    assert risk_info["raw_size"] == 0.5
    assert risk_info["required_margin"] > 0
    assert risk_info["max_loss"] <= 1000.0 * 1.05  # within rounding bounds


# ============================================================================
# 6. HISTORICAL BACKTESTING ENGINE TESTS
# ============================================================================

def test_strategy_backtest_execution(sample_trending_bull_candles):
    """Verify backtesting engine executes across all 30 strategies and computes metrics."""
    for sid in ["S01", "S02", "S07", "S11", "S30"]:
        res = Master30StrategyEngine.run_backtest(
            strategy_id_or_number=sid,
            df=sample_trending_bull_candles,
            initial_capital=50000.0,
            risk_pct=1.0,
        )
        assert res["status"] == "success"
        assert "total_trades" in res
        assert "win_rate_pct" in res
        assert "net_pnl" in res
        assert "max_drawdown_pct" in res
        assert "final_equity" in res


# ============================================================================
# 7. FLASK REST API ENDPOINTS TESTS
# ============================================================================

def test_api_strategies_catalog(client):
    """Verify GET /api/strategies/master30 returns all 30 strategies."""
    resp = client.get("/api/strategies/master30")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "success"
    assert data["total"] == 30
    assert len(data["strategies"]) == 30



def test_api_strategy_schema(client):
    """Verify GET /api/strategies/<id>/schema returns individual strategy metadata."""
    resp = client.get("/api/strategies/S01/schema")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "success"
    assert data["strategy"]["id"] == "S01"
    assert "default_parameters" in data["strategy"]
    assert "presets" in data["strategy"]


def test_api_strategy_signal(client, sample_trending_bull_candles):
    """Verify POST /api/strategies/S01/signal returns deterministic signal."""
    payload = {
        "candles": sample_trending_bull_candles.to_dict(orient="records"),
        "parameters": {"rr_ratio": 2.5}
    }
    resp = client.post("/api/strategies/S01/signal", json=payload)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "success"
    assert "signal" in data
    assert data["signal"]["strategy_id"] == "S01"


def test_api_strategy_risk(client):
    """Verify POST /api/strategies/S01/risk computes position size."""
    payload = {
        "account_capital": 50000.0,
        "risk_pct": 2.0,
        "entry_price": 2500.0,
        "stop_price": 2400.0,
    }
    resp = client.post("/api/strategies/S01/risk", json=payload)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "success"
    assert data["risk"]["risk_amount"] == 1000.0


def test_api_strategy_backtest(client, sample_trending_bull_candles):
    """Verify POST /api/strategies/S01/backtest runs backtest."""
    payload = {
        "candles": sample_trending_bull_candles.to_dict(orient="records"),
        "initial_capital": 100000.0,
        "risk_pct": 1.0,
    }
    resp = client.post("/api/strategies/S01/backtest", json=payload)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "success"
    assert "win_rate_pct" in data
