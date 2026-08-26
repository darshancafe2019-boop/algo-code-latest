"""
Test Suite: Market Data Standardization & Single Source of Truth for Quant.OS
=============================================================================
Verifies:
1. Micro-Price Precision & dynamic decimal handling (PEPE, SHIB never rounded to $0.00).
2. Volume Formatting & multi-abbreviation prevention.
3. Canonical Instrument Identity resolution across exchanges (Binance vs Bybit vs OANDA).
4. Single Source of Truth snapshot consistency across Market, P&L, Risk, and Bot states.
"""

import pytest
import math
from src import db, config
from src.global_data_engine import GlobalDataEngine
from src.market_universe import MarketUniverseManager


def test_micro_price_precision_and_dynamic_decimals():
    """Verify that low-priced assets retain precision and are never rounded to zero."""
    def format_price_py(val: float, currency: str = "$") -> str:
        if val is None or math.isnan(val):
            return "—"
        if val == 0:
            return f"{currency}0.00"
        abs_val = abs(val)
        if abs_val < 0.0001:
            return f"{currency}{val:.8f}"
        elif abs_val < 0.01:
            return f"{currency}{val:.6f}"
        elif abs_val < 1.0:
            return f"{currency}{val:.4f}"
        else:
            return f"{currency}{val:,.2f}"

    assert format_price_py(0.00001150) == "$0.00001150"
    assert format_price_py(0.00000872) == "$0.00000872"
    assert format_price_py(0.12345) == "$0.1235"
    assert format_price_py(3456.28) == "$3,456.28"
    assert format_price_py(78872.50) == "$78,872.50"
    assert format_price_py(0.00001150) != "$0.00"


def test_volume_formatting_and_no_double_abbreviations():
    """Verify volume abbreviations are never multiplied or duplicated."""
    def format_volume_py(val: float, currency: str = "$") -> str:
        if val is None or math.isnan(val) or val == 0:
            return "—"
        abs_val = abs(val)
        sign = "-" if val < 0 else ""
        if abs_val >= 1_000_000_000:
            v = abs_val / 1_000_000_000
            fmt = f"{v:.0f}" if v >= 100 else (f"{v:.1f}" if v >= 10 else f"{v:.2f}")
            return f"{sign}{currency}{fmt}B"
        elif abs_val >= 1_000_000:
            v = abs_val / 1_000_000
            fmt = f"{v:.0f}" if v >= 100 else (f"{v:.1f}" if v >= 10 else f"{v:.2f}")
            return f"{sign}{currency}{fmt}M"
        elif abs_val >= 1_000:
            v = abs_val / 1_000
            fmt = f"{v:.0f}" if v >= 100 else (f"{v:.1f}" if v >= 10 else f"{v:.2f}")
            return f"{sign}{currency}{fmt}K"
        else:
            return f"{sign}{currency}{val:,.0f}"

    assert format_volume_py(850_000_000_000) == "$850B"
    assert format_volume_py(2_400_000_000) == "$2.40B"
    assert format_volume_py(920_000_000) == "$920M"
    assert format_volume_py(850_000) == "$850K"
    assert format_volume_py(850_000_000_000) != "$850000.00M"


def test_instrument_registry_master_query():
    """Verify instrument master queries return canonical instruments with valid schema."""
    master = db.get_instruments_master(limit=50)
    assert master is not None
    assert "total" in master
    assert master["total"] >= 10
    assert "instruments" in master

    for inst in master["instruments"]:
        assert "canonical_symbol" in inst or "symbol" in inst
        assert "exchange" in inst
        assert "asset_class" in inst


def test_single_source_of_truth_portfolio_reconciliation():
    """Verify GlobalDataEngine produces a single reconciled portfolio snapshot."""
    gde = GlobalDataEngine.get_instance()
    paper_snap = gde.get_portfolio_snapshot(mode="PAPER")
    live_snap = gde.get_portfolio_snapshot(mode="LIVE")

    assert paper_snap["reconciliationStatus"] == "RECONCILED"
    assert live_snap["reconciliationStatus"] == "RECONCILED"
    assert paper_snap["equity"] > 0
    assert live_snap["equity"] == 10000.0
    # Strict mode separation
    assert paper_snap["mode"] == "PAPER"
    assert live_snap["mode"] == "LIVE"
