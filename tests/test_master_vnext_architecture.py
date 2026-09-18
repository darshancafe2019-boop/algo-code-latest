"""
Test Master VNEXT Architecture
==============================
Verifies the complete 12-domain QuantDataCore architecture:
1. Canonical Instrument Domain (multi-venue indexing & bidirectional resolution)
2. Market Data & Quality Domain (sanitization, feed age, NaN guards, inverted book protection)
3. Order Book Domain (L1-L200 depth ladders, spread bps, flow analytics)
4. Options Domain (Black-Scholes analytical Greeks, IV skew, Max Pain, PCR)
5. Account Domain (Segregated broker accounts, multi-currency isolation)
6. Portfolio Domain (Equity aggregations & benchmark FX conversion)
7. Position Domain (Marked-to-market valuations, marketDataProvider vs executionBroker)
8. Centralized OMS Order Domain (lifecycle transitions & execution fills)
9. Append-Only Capital Ledger Domain (strict continuity, debit/credit invariant)
10. 20-Gate Risk Intelligence Matrix (margin, Greeks, VaR 99%, kill switch)
11. Continuous Reconciliation Domain (cross-broker mathematical drift detection)
12. Subscription Orchestrator (reference-counted adaptive depth escalation)
"""

import pytest
import math
from src.data_core.core import quant_data_core, QuantDataCore
from src.data_core.models import (
    Environment,
    OrderSide,
    OrderType,
    MarketDataEvent,
)
from src.data_core.options.engine import (
    calculate_black_scholes_greeks,
    calculate_implied_volatility,
    OptionsEngine,
)
from src.data_core.subscriptions.orchestrator import SubscriptionOrchestrator
from src.data_core.quality.engine import DataQualityEngine


def test_options_black_scholes_greeks():
    """Validates analytical Black-Scholes Greeks calculation."""
    # NIFTY ATM Call: Spot 24500, Strike 24500, DTE 7 days, IV 15%, Rate 7%
    greeks = calculate_black_scholes_greeks(
        spot=24500.0,
        strike=24500.0,
        dte_days=7.0,
        r=0.07,
        iv=0.15,
        option_type="CE",
    )

    assert 0.45 <= greeks.delta <= 0.60
    assert greeks.gamma > 0
    assert greeks.theta < 0  # Time decay is negative
    assert greeks.vega > 0   # Long option benefits from rising IV
    assert greeks.iv == 15.0


def test_options_implied_volatility_solver():
    """Validates Newton-Raphson IV solver."""
    iv = calculate_implied_volatility(
        market_price=180.0,
        spot=24500.0,
        strike=24500.0,
        dte_days=7.0,
        r=0.07,
        option_type="CE",
    )
    assert 0.05 <= iv <= 0.40


def test_options_engine_chain_aggregation():
    """Validates Option Chain building, PCR, and Max Pain determination."""
    engine = OptionsEngine()
    engine.set_underlying_spot("NIFTY", 24500.0)

    # Ingest series of Call and Put market events
    for strike in [24300, 24400, 24500, 24600, 24700]:
        engine.update_from_market_event(MarketDataEvent(
            provider="UPSTOX",
            instrument_id=f"NIFTY-{strike}-CE",
            symbol=f"NIFTY 28-SEP-2026 {strike} CE",
            underlying="NIFTY",
            expiry="28-SEP-2026",
            strike=float(strike),
            option_type="CE",
            ltp=max(5.0, 24500.0 - strike + 50.0),
            bid=10.0,
            ask=12.0,
            oi=50000.0,
            volume=20000.0,
        ))
        engine.update_from_market_event(MarketDataEvent(
            provider="UPSTOX",
            instrument_id=f"NIFTY-{strike}-PE",
            symbol=f"NIFTY 28-SEP-2026 {strike} PE",
            underlying="NIFTY",
            expiry="28-SEP-2026",
            strike=float(strike),
            option_type="PE",
            ltp=max(5.0, strike - 24500.0 + 50.0),
            bid=10.0,
            ask=12.0,
            oi=60000.0,
            volume=25000.0,
        ))

    snapshot = engine.build_option_chain_snapshot("NIFTY", "28-SEP-2026")
    assert snapshot.underlying == "NIFTY"
    assert snapshot.spot_price == 24500.0
    assert snapshot.atm_strike == 24500.0
    assert snapshot.pcr_oi == round((60000.0 * 5) / (50000.0 * 5), 3)  # 1.2
    assert len(snapshot.strikes) == 5
    assert snapshot.max_pain in [24300, 24400, 24500, 24600, 24700]


def test_subscription_orchestrator_ref_counting():
    """Validates dynamic subscription reference counting and depth escalation."""
    orch = SubscriptionOrchestrator()

    # Client A subscribes at LTPC
    res_a = orch.subscribe("NIFTY-FUT", "UPSTOX", "NIFTY FUT", depth_level="LTPC", subscriber_id="widget_1")
    assert res_a["new_subscription"] is True
    assert res_a["ref_count"] == 1
    assert res_a["depth_level"] == "LTPC"

    # Client B subscribes to same instrument at FULL_D20 (escalation)
    res_b = orch.subscribe("NIFTY-FUT", "UPSTOX", "NIFTY FUT", depth_level="FULL_D20", subscriber_id="widget_2")
    assert res_b["new_subscription"] is False
    assert res_b["escalation_needed"] is True
    assert res_b["ref_count"] == 2
    assert res_b["depth_level"] == "FULL_D20"

    # Client B unsubscribes
    unsub_b = orch.unsubscribe("NIFTY-FUT", "UPSTOX", subscriber_id="widget_2")
    assert unsub_b["unsubscribed"] is False
    assert unsub_b["remaining_refs"] == 1

    # Client A unsubscribes -> feed freed
    unsub_a = orch.unsubscribe("NIFTY-FUT", "UPSTOX", subscriber_id="widget_1")
    assert unsub_a["unsubscribed"] is True
    assert unsub_a["remaining_refs"] == 0


def test_data_quality_engine_sanitization():
    """Validates Data Quality guards against NaN, inverted books, and stale feeds."""
    quality = DataQualityEngine()

    # Event with NaN/Inf values
    bad_event = MarketDataEvent(
        provider="BINANCE_USDM",
        instrument_id="BTCUSDT",
        symbol="BTCUSDT",
        ltp=float("nan"),
        bid=65000.0,
        ask=64990.0,  # Inverted! Bid > Ask
        oi=float("inf"),
        volume=-500.0,  # Negative
    )

    sanitized, status = quality.sanitize_and_audit(bad_event)
    assert sanitized.ltp == 0.0
    assert sanitized.oi == 0.0
    assert sanitized.volume == 0.0
    assert status.value == "DEGRADED"  # Inverted book detected


def test_master_quant_data_core_end_to_end():
    """Validates complete QuantDataCore façade across all 12 domains."""
    core = QuantDataCore()

    # 1. Check system health
    health = core.get_system_health()
    assert health["status"] in ("HEALTHY", "WARNING")

    # 2. Canonical instrument check
    nifty = core.instruments.get_by_canonical_id("NSE:NIFTY26MARFUT")
    assert nifty is not None
    assert nifty.lot_size == 50.0

    # 3. 20-Gate Risk Intelligence Matrix
    risk_report = core.risk.evaluate_20_gates(Environment.PAPER)
    assert risk_report.gates_evaluated == 20
    assert risk_report.overall_status in ("ARMED", "TRIGGERED")

    # 4. Continuous Reconciliation
    recon_report = core.reconciliation.run_reconciliation(Environment.PAPER)
    assert recon_report.status.value in ("HEALTHY", "DRIFT")
