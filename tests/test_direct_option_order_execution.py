"""
Test Suite: Direct Option Order Execution Pipeline
==================================================
Validates:
1. Canonical OptionOrderIntent data model and normalization
2. Four Direct Option Actions: BUY CALL, SELL CALL, BUY PUT, SELL PUT
3. Moneyness variants: ATM, ITM, OTM
4. Broker routing across Dhan, Angel One, Upstox, Delta, and Paper OMS
5. Dual-mode invariant: Paper simulation vs Live protection
6. Stale quote protection (Rejection of STALE, DELAYED, UNKNOWN, INVALID, NO_DATA)
7. Safety gates: Duplicate order prevention, Risk Engine, Live armed lock
8. Adapter contracts: placeOrder, modifyOrder, cancelOrder, getOrderStatus, getOrders, getTrades
9. Authoritative REST endpoints: /api/options/order/direct, /validate, /recent, /cancel
"""

import time
import pytest
from unittest.mock import patch, MagicMock

from src import config
from src.option_order_intent import OptionOrderIntent
from src.broker_router import (
    BrokerRouter,
    DhanAdapter,
    AngelOneAdapter,
    UpstoxAdapter,
    DeltaAdapter,
    PaperOMS,
    global_broker_router,
)


@pytest.fixture
def clean_router():
    """Provides an isolated BrokerRouter instance for test purity."""
    router = BrokerRouter()
    return router


# ============================================================================
# 1. CANONICAL OPTION ORDER INTENT MODEL TESTS
# ============================================================================

def test_option_order_intent_normalization():
    """Validates that OptionOrderIntent correctly standardizes fields and types."""
    intent = OptionOrderIntent(
        broker="dhan",
        exchange="nse",
        underlying="nifty",
        securityId="12345",
        tradingSymbol="NIFTY 25000 CE",
        expiry="2026-09-24",
        strike=25000.0,
        optionType="CE",
        side="BUY",
        quantity=50.0,
        lots=1,
        lotSize=50,
        orderType="LIMIT",
        price=145.50,
        stopLoss=120.0,
        target=180.0,
        productType="INTRADAY",
        mode="PAPER",
    )

    assert intent.broker == "DHAN"
    assert intent.exchange == "NSE"
    assert intent.underlying == "NIFTY"
    assert intent.optionType == "CALL"
    assert intent.side == "BUY"
    assert intent.quantity == 50.0
    assert intent.orderType == "LIMIT"
    assert intent.price == 145.50
    assert intent.stopLoss == 120.0
    assert intent.target == 180.0
    assert intent.mode == "PAPER"
    assert intent.clientOrderId is not None
    assert intent.correlationId is not None


def test_option_order_intent_from_dict_and_put_mapping():
    """Validates from_dict parsing with PE -> PUT and SELL mapping."""
    payload = {
        "broker": "upstox",
        "underlying": "BANKNIFTY",
        "strike": 52000,
        "optionType": "PE",
        "side": "SELL",
        "lots": 2,
        "lotSize": 15,
        "price": 280.0,
        "mode": "PAPER",
    }
    intent = OptionOrderIntent.from_dict(payload)
    assert intent.broker == "UPSTOX"
    assert intent.optionType == "PUT"
    assert intent.side == "SELL"
    assert intent.lots == 2
    assert intent.lotSize == 15
    assert intent.quantity == 30.0
    assert intent.price == 280.0


def test_option_order_intent_validation_invalid_type():
    """Ensures invalid option types raise ValueError."""
    with pytest.raises(ValueError):
        OptionOrderIntent(
            broker="DHAN",
            exchange="NSE",
            underlying="NIFTY",
            securityId="1",
            tradingSymbol="SYM",
            expiry="2026-09-24",
            strike=25000,
            optionType="INVALID",  # type: ignore
            side="BUY",
            quantity=50,
            lots=1,
            lotSize=50,
        )


# ============================================================================
# 2. FOUR DIRECT OPTION ACTIONS & MONEYNESS (ATM, ITM, OTM)
# ============================================================================

@pytest.mark.parametrize("side,opt_type,strike,moneyness", [
    ("BUY", "CALL", 25000, "ATM"),
    ("BUY", "CALL", 24500, "ITM"),
    ("BUY", "CALL", 25500, "OTM"),
    ("SELL", "CALL", 25000, "ATM"),
    ("SELL", "CALL", 24500, "ITM"),
    ("SELL", "CALL", 25500, "OTM"),
    ("BUY", "PUT", 25000, "ATM"),
    ("BUY", "PUT", 25500, "ITM"),
    ("BUY", "PUT", 24500, "OTM"),
    ("SELL", "PUT", 25000, "ATM"),
    ("SELL", "PUT", 25500, "ITM"),
    ("SELL", "PUT", 24500, "OTM"),
])
def test_four_direct_option_actions_across_moneyness(clean_router, side, opt_type, strike, moneyness):
    """Tests BUY CALL, SELL CALL, BUY PUT, SELL PUT for ATM, ITM, and OTM strikes."""
    intent = OptionOrderIntent(
        broker="PAPER",
        exchange="NSE",
        underlying="NIFTY",
        securityId=f"NIFTY_{strike}_{opt_type}",
        tradingSymbol=f"NIFTY 26SEP24 {strike} {opt_type}",
        expiry="2026-09-24",
        strike=strike,
        optionType=opt_type,
        side=side,
        quantity=50.0,
        lots=1,
        lotSize=50,
        orderType="LIMIT",
        price=150.0,
        mode="PAPER",
        quoteStatus="LIVE",
    )

    res = clean_router.execute_order(intent)
    assert res["status"] == "success"
    assert res["success"] is True
    assert res["orderId"].startswith("SIM_")
    assert res["executionStatus"] == "TRADED"
    assert res["side"] == side
    assert res["optionType"] == opt_type
    assert res["strike"] == strike
    assert res["filledQty"] == 50.0


# ============================================================================
# 3. BROKER ADAPTER CONTRACT TESTS (DHAN, ANGEL ONE, UPSTOX, DELTA)
# ============================================================================

def test_broker_adapters_canonical_interface_methods():
    """Validates that all 4 broker adapters implement the 6 required methods."""
    adapters = [DhanAdapter(), AngelOneAdapter(), UpstoxAdapter(), DeltaAdapter()]
    required_methods = [
        "place_order", "placeOrder",
        "modify_order", "modifyOrder",
        "cancel_order", "cancelOrder",
        "get_order_status", "getOrderStatus",
        "get_orders", "getOrders",
        "get_trades", "getTrades",
    ]

    for adapter in adapters:
        for method_name in required_methods:
            assert hasattr(adapter, method_name), f"Adapter {adapter.broker_id} is missing method {method_name}"
            assert callable(getattr(adapter, method_name))


def test_delta_adapter_order_routing():
    """Tests DeltaAdapter placeOrder for Crypto Options."""
    adapter = DeltaAdapter()
    intent = OptionOrderIntent(
        broker="DELTA",
        exchange="DELTA",
        underlying="BTC",
        securityId="1001",
        tradingSymbol="C-BTC-65000-240926",
        expiry="2026-09-24",
        strike=65000.0,
        optionType="CALL",
        side="BUY",
        quantity=1.0,
        lots=1,
        lotSize=1,
        orderType="LIMIT",
        price=2500.0,
        mode="PAPER",
        quoteStatus="LIVE",
    )
    res = adapter.placeOrder(intent)
    assert res["success"] is True
    assert res["broker"] == "DELTA"
    assert res["order_id"] is not None


# ============================================================================
# 4. PAPER OMS & DUAL-MODE INVARIANTS
# ============================================================================

def test_paper_order_never_hits_external_broker(clean_router):
    """Validates that under TRADING_MODE=PAPER, orders execute in simulated OMS without external dispatch."""
    intent = OptionOrderIntent(
        broker="DHAN",
        exchange="NSE",
        underlying="NIFTY",
        securityId="1234",
        tradingSymbol="NIFTY 25000 CE",
        expiry="2026-09-24",
        strike=25000.0,
        optionType="CALL",
        side="BUY",
        quantity=50.0,
        lots=1,
        lotSize=50,
        price=120.0,
        mode="PAPER",
        quoteStatus="LIVE",
    )

    with patch.object(DhanAdapter, "place_order") as mock_dhan:
        res = clean_router.execute_order(intent)
        assert mock_dhan.call_count == 0  # CRITICAL: External broker NOT called!
        assert res["status"] == "success"
        assert res["mode"] == "PAPER"
        assert res["orderId"].startswith("SIM_")


def test_paper_position_ledger_and_pnl_updates(clean_router):
    """Tests that Paper OMS properly updates position inventory and P&L."""
    oms = PaperOMS()
    intent_buy = OptionOrderIntent(
        broker="DHAN",
        exchange="NSE",
        underlying="NIFTY",
        securityId="1234",
        tradingSymbol="NIFTY 25000 CE",
        expiry="2026-09-24",
        strike=25000.0,
        optionType="CALL",
        side="BUY",
        quantity=50.0,
        lots=1,
        lotSize=50,
        price=100.0,
        mode="PAPER",
        quoteStatus="LIVE",
    )
    oms.execute_paper_order(intent_buy)
    positions = oms.get_positions()
    assert len(positions) == 1
    assert positions[0]["quantity"] == 50.0
    assert positions[0]["averagePrice"] == 100.0

    # Sell 50 to square off
    intent_sell = OptionOrderIntent(
        broker="DHAN",
        exchange="NSE",
        underlying="NIFTY",
        securityId="1234",
        tradingSymbol="NIFTY 25000 CE",
        expiry="2026-09-24",
        strike=25000.0,
        optionType="CALL",
        side="SELL",
        quantity=50.0,
        lots=1,
        lotSize=50,
        price=120.0,
        mode="PAPER",
        quoteStatus="LIVE",
    )
    oms.execute_paper_order(intent_sell)
    assert len(oms.get_positions()) == 0  # Fully squared off!


# ============================================================================
# 5. STALE QUOTE PROTECTION (SECTION 10)
# ============================================================================

@pytest.mark.parametrize("stale_status", ["STALE", "DELAYED", "UNKNOWN", "INVALID", "NO_DATA"])
def test_stale_quote_rejection(clean_router, stale_status):
    """Ensures orders with STALE, DELAYED, UNKNOWN, INVALID, or NO_DATA quotes are rejected."""
    intent = OptionOrderIntent(
        broker="DHAN",
        exchange="NSE",
        underlying="NIFTY",
        securityId="1234",
        tradingSymbol="NIFTY 25000 CE",
        expiry="2026-09-24",
        strike=25000.0,
        optionType="CALL",
        side="BUY",
        quantity=50.0,
        lots=1,
        lotSize=50,
        price=100.0,
        mode="PAPER",
        quoteStatus=stale_status,
    )

    res = clean_router.execute_order(intent)
    assert res["status"] == "rejected"
    assert res["success"] is False
    assert res["errorCode"] == "STALE_QUOTE"
    assert "Only LIVE + VALIDATED quotes can be traded" in res["errorReason"]


# ============================================================================
# 6. RISK, DUPLICATE ORDER, AND SAFETY GATES
# ============================================================================

def test_duplicate_order_prevention(clean_router):
    """Ensures identical order intents within 60s are caught and rejected as DUPLICATE_ORDER."""
    intent = OptionOrderIntent(
        broker="DHAN",
        exchange="NSE",
        underlying="NIFTY",
        securityId="1234",
        tradingSymbol="NIFTY 25000 CE",
        expiry="2026-09-24",
        strike=25000.0,
        optionType="CALL",
        side="BUY",
        quantity=50.0,
        lots=1,
        lotSize=50,
        price=100.0,
        mode="PAPER",
        quoteStatus="LIVE",
        clientOrderId="UNIQUE_SIGNAL_123",
        correlationId="UNIQUE_SIGNAL_123",
    )

    # First execution succeeds
    res1 = clean_router.execute_order(intent)
    assert res1["status"] == "success"

    # Second immediate execution with same key must be rejected
    res2 = clean_router.execute_order(intent)
    assert res2["status"] == "rejected"
    assert res2["errorCode"] == "DUPLICATE_ORDER"


def test_live_trading_safety_gate_disabled(clean_router):
    """Ensures LIVE order execution is strictly rejected when LIVE_TRADING_ENABLED=False."""
    intent = OptionOrderIntent(
        broker="DHAN",
        exchange="NSE",
        underlying="NIFTY",
        securityId="1234",
        tradingSymbol="NIFTY 25000 CE",
        expiry="2026-09-24",
        strike=25000.0,
        optionType="CALL",
        side="BUY",
        quantity=50.0,
        lots=1,
        lotSize=50,
        price=100.0,
        mode="LIVE",  # Requested LIVE!
        quoteStatus="LIVE",
    )

    with patch.object(config, "LIVE_TRADING_ENABLED", False):
        res = clean_router.execute_order(intent)
        assert res["status"] == "rejected"
        assert res["errorCode"] == "LIVE_TRADING_DISABLED"


def test_invalid_instrument_rejection(clean_router):
    """Rejects intent with empty underlying or negative strike."""
    intent = OptionOrderIntent(
        broker="DHAN",
        exchange="NSE",
        underlying="",  # Missing underlying!
        securityId="1234",
        tradingSymbol="25000 CE",
        expiry="2026-09-24",
        strike=0.0,  # Invalid strike!
        optionType="CALL",
        side="BUY",
        quantity=50.0,
        lots=1,
        lotSize=50,
        price=100.0,
        mode="PAPER",
        quoteStatus="LIVE",
    )

    res = clean_router.execute_order(intent)
    assert res["status"] == "rejected"
    assert res["errorCode"] == "INVALID_INSTRUMENT"


def test_order_cancellation(clean_router):
    """Tests cancelling an order via router."""
    intent = OptionOrderIntent(
        broker="DHAN",
        exchange="NSE",
        underlying="NIFTY",
        securityId="1234",
        tradingSymbol="NIFTY 25000 CE",
        expiry="2026-09-24",
        strike=25000.0,
        optionType="CALL",
        side="BUY",
        quantity=50.0,
        lots=1,
        lotSize=50,
        price=100.0,
        mode="PAPER",
        quoteStatus="LIVE",
    )
    placed = clean_router.execute_order(intent)
    order_id = placed["orderId"]

    cancel_res = clean_router.cancel_order(order_id)
    assert cancel_res["success"] is True
    assert cancel_res["status"] == "CANCELLED"


# ============================================================================
# 7. REST API ENDPOINTS INTEGRATION
# ============================================================================

def test_api_options_order_direct_endpoint():
    """Tests POST /api/options/order/direct endpoint via Flask test client."""
    from dashboard import app
    client = app.test_client()

    payload = {
        "broker": "PAPER",
        "underlying": "NIFTY",
        "strike": 25000,
        "optionType": "CALL",
        "side": "BUY",
        "quantity": 50,
        "lots": 1,
        "lotSize": 50,
        "orderType": "LIMIT",
        "price": 125.0,
        "mode": "PAPER",
        "quoteStatus": "LIVE",
    }

    resp = client.post("/api/options/order/direct", json=payload)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "success"
    assert data["orderId"].startswith("SIM_")
    assert data["executionStatus"] == "TRADED"


def test_api_options_order_validate_endpoint():
    """Tests POST /api/options/order/validate endpoint."""
    from dashboard import app
    client = app.test_client()

    payload = {
        "broker": "DHAN",
        "underlying": "NIFTY",
        "strike": 25000,
        "optionType": "CALL",
        "side": "BUY",
        "quantity": 50,
        "lots": 1,
        "lotSize": 50,
        "price": 100.0,
        "mode": "PAPER",
        "quoteStatus": "LIVE",
    }

    resp = client.post("/api/options/order/validate", json=payload)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["is_valid"] is True
    assert data["overall_status"] == "APPROVED"
    assert data["required_margin"] == 5000.0


def test_api_options_order_recent_endpoint():
    """Tests GET /api/options/order/recent endpoint."""
    from dashboard import app
    client = app.test_client()

    resp = client.get("/api/options/order/recent")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "success"
    assert "orders" in data
    assert isinstance(data["orders"], list)
