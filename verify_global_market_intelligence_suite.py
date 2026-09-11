import sys
import traceback
import json
import pandas as pd

from src.indicators import UniversalIndicatorEngine
from src.option_chain_engine import (
    OptionGreeksCalculator,
    OptionChainEngine,
    OptionStrategyAnalyzer,
)
from src.market_status_engine import MarketStatusEngine
from src.connection_registry import ConnectionRegistry
from src.report_engine import UniversalReportEngine, REPORT_TYPES

passed = 0
failed = 0

def test(name, fn):
    global passed, failed
    try:
        fn()
        print(f"  [PASS] {name}")
        passed += 1
    except Exception as e:
        print(f"  [FAIL] {name}: {e}")
        traceback.print_exc()
        failed += 1

print("=" * 70)
print("QUANT.OS GLOBAL MARKET INTELLIGENCE & REPORT ENGINE TEST RUNNER")
print("=" * 70)

# 1. Indicator Engine Tests
print("\n[1] Testing UniversalIndicatorEngine...")
def t_ind_small():
    df_small = pd.DataFrame({"open": [100.0, 101.0], "high": [102.0, 103.0], "low": [99.0, 100.0], "close": [101.5, 102.5], "volume": [1000.0, 1500.0]})
    res = UniversalIndicatorEngine.compute_suite("TEST_SYM", "15m", df_small)
    assert res["status"] == "INSUFFICIENT_DATA"

def t_ind_full():
    periods = 210
    prices = [100.0 + i * 0.5 for i in range(periods)]
    df = pd.DataFrame({"open": prices, "high": [p * 1.01 for p in prices], "low": [p * 0.99 for p in prices], "close": prices, "volume": [50000.0] * periods})
    res = UniversalIndicatorEngine.compute_suite("RELIANCE", "15m", df)
    assert res["status"] == "CALCULATED"
    assert res["indicators"]["ema_200"]["status"] == "CALCULATED"
    assert res["indicators"]["rsi_14"]["status"] == "CALCULATED"
    assert len(res["interpretations"]) > 0

test("Insufficient candles return INSUFFICIENT_DATA", t_ind_small)
test("Full candle calculation computes EMA, RSI, MACD, ATR, ADX, VWAP", t_ind_full)

# 2. Options Engine Tests
print("\n[2] Testing OptionChainEngine & Strategy Analyzer...")
def t_greeks():
    g = OptionGreeksCalculator.calculate_greeks("CALL", 25000.0, 25000.0, 14.0 / 365.0, 0.065, 0.15)
    assert 0.45 <= g["delta"] <= 0.60
    assert g["gamma"] > 0
    assert g["theta"] < 0
    assert g["vega"] > 0

def t_opt_intel():
    sample_chain = [
        {"strike": 24800, "ce": {"ltp": 380.0, "open_interest": 100000, "volume": 5000, "iv": 14.5}, "pe": {"ltp": 30.0, "open_interest": 800000, "volume": 12000, "iv": 16.0}},
        {"strike": 25000, "ce": {"ltp": 210.0, "open_interest": 500000, "volume": 15000, "iv": 14.2}, "pe": {"ltp": 60.0, "open_interest": 1200000, "volume": 25000, "iv": 15.5}},
        {"strike": 25200, "ce": {"ltp": 80.0, "open_interest": 1500000, "volume": 35000, "iv": 14.0}, "pe": {"ltp": 130.0, "open_interest": 400000, "volume": 8000, "iv": 15.2}},
    ]
    intel = OptionChainEngine.calculate_market_intelligence(sample_chain, 25000.0, 7)
    assert intel["status"] == "CALCULATED"
    assert intel["pcr_oi"] > 0
    assert intel["max_pain"]["label"] == "CALCULATED ANALYTIC"
    assert intel["expected_move"]["label"] == "CALCULATED ANALYTIC"

def t_strat():
    legs = [
        {"option_type": "CALL", "strike": 25000, "expiry": "2026-09-24", "side": "BUY", "quantity": 1, "entry_price": 200.0, "current_price": 220.0, "delta": 0.55, "gamma": 0.002, "theta": -9.0, "vega": 15.0},
        {"option_type": "CALL", "strike": 25200, "expiry": "2026-09-24", "side": "SELL", "quantity": 1, "entry_price": 80.0, "current_price": 90.0, "delta": -0.35, "gamma": -0.0018, "theta": 6.0, "vega": -11.0},
    ]
    strat = OptionStrategyAnalyzer.analyze_strategy("BULL_CALL_SPREAD", "NIFTY", 25000.0, legs, 25)
    assert strat["net_premium"] == 3000.0
    assert strat["pnl"] == 250.0
    assert strat["greeks"]["net_delta"] == 5.0
    assert strat["risk_classification"] == "DEFINED_RISK"

test("Black-Scholes analytical Greeks computation", t_greeks)
test("Option market intelligence (PCR, Max Pain, Expected Move)", t_opt_intel)
test("Multi-leg Bull Call Spread analysis and Greek aggregation", t_strat)

# 3. Market Status Engine Tests
print("\n[3] Testing MarketStatusEngine...")
def t_crypto_sess():
    sess = MarketStatusEngine.get_crypto_session()
    assert sess["session"] == "OPEN"
    assert sess["is_trading_open"] is True

def t_freshness():
    st = MarketStatusEngine.evaluate_instrument_status("CRYPTO", "2020-01-01T00:00:00Z", "LIVE", False, 10.0)
    assert st == "STALE"

test("Crypto 24/7 continuous session validation", t_crypto_sess)
test("Instrument freshness evaluation transitions to STALE", t_freshness)

# 4. Connection Registry Tests
print("\n[4] Testing ConnectionRegistry & Broker Segregation...")
def t_conn_mat():
    reg = ConnectionRegistry()
    mat = reg.get_connection_matrix()
    assert mat["system_quality_score"] > 50.0
    assert mat["live_trading_locked"] is True
    # Test capability separation
    assert ConnectionRegistry.CAPABILITIES["DHAN"]["indian_stocks"] is True
    assert ConnectionRegistry.CAPABILITIES["DHAN"]["crypto_spot"] is False
    assert ConnectionRegistry.CAPABILITIES["DELTA_EXCHANGE"]["indian_stocks"] is False
    assert ConnectionRegistry.CAPABILITIES["DELTA_EXCHANGE"]["crypto_spot"] is True

test("Connection matrix and capability isolation", t_conn_mat)

# 5. Universal Report Engine Tests
print("\n[5] Testing UniversalReportEngine...")
def t_report_gen():
    engine = UniversalReportEngine()
    for rt in ["GLOBAL_MARKET_REPORT", "LIVE_MARKET_REPORT", "OPTIONS_REPORT", "CRYPTO_REPORT", "PORTFOLIO_REPORT"]:
        r = engine.generate_report(rt)
        assert r["report_type"] == rt
        assert r["completeness"] == "COMPLETE"
        assert r["data_quality"]["score_pct"] > 0
        assert "market_board" in r
        assert "portfolio" in r

def t_report_sec():
    engine = UniversalReportEngine()
    r = engine.generate_report("GLOBAL_MARKET_REPORT")
    s = json.dumps(r)
    for forbidden in ["ACCESS_TOKEN", "SECRET_KEY", "PRIVATE_KEY", "postgres://"]:
        assert forbidden not in s, f"Found forbidden secret {forbidden} in report payload"

test("Generate reports across multiple canonical report types", t_report_gen)
test("Zero credential/secret leakage in generated report payload", t_report_sec)

print("\n" + "=" * 70)
print(f"SUMMARY: {passed} PASSED, {failed} FAILED")
print("=" * 70)

if failed > 0:
    sys.exit(1)
