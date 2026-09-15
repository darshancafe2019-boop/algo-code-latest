"""Regression tests for paper-first execution safety and truthful fills."""

import pytest

from src import config
from src.execution import ExecutionEngine
from src.execution_service import (
    LiveExecutionAdapter,
    OrderExecutionService,
    PaperExecutionAdapter,
)


class ExchangeSpy:
    def __init__(self):
        self.load_markets_calls = 0
        self.create_order_calls = 0

    def load_markets(self):
        self.load_markets_calls += 1

    def market(self, symbol):
        return {
            "limits": {
                "amount": {"min": 0.001},
                "cost": {"min": 1.0},
            }
        }

    def amount_to_precision(self, symbol, amount):
        return str(amount)

    def create_order(self, *args, **kwargs):
        self.create_order_calls += 1
        return {"id": "must-not-be-called"}


def test_direct_exchange_adapter_is_closed_in_paper_mode(monkeypatch):
    monkeypatch.setattr(config, "TRADING_MODE", "PAPER")
    monkeypatch.setattr(config, "PAPER_TRADING", True)
    monkeypatch.setattr(config, "LIVE_TRADING_ENABLED", False)
    monkeypatch.setattr(config, "LIVE_TRADING_ARMED", False)
    monkeypatch.setattr(config, "MASTER_LIVE_TRADING", False)

    exchange = ExchangeSpy()
    engine = ExecutionEngine(exchange)

    assert exchange.load_markets_calls == 0
    with pytest.raises(PermissionError):
        engine.market_buy("BTC/USDT", 0.01, 65000.0)
    assert exchange.create_order_calls == 0


def test_paper_adapter_never_requires_or_calls_a_broker():
    result = PaperExecutionAdapter().submit_order(
        "NIFTY 25000 CE",
        "BUY",
        1.0,
        125.0,
        broker="DHAN",
    )

    assert result["success"] is True
    assert result["execution_mode"] == "PAPER"
    assert result["broker"] == "DHAN"
    assert result["filled_quantity"] == 1.0
    assert result["average_price"] == 125.0


def test_order_service_rejects_missing_price_without_a_constant_fallback():
    service = OrderExecutionService()

    result = service.execute_order(
        symbol="BTC/USDT",
        side="BUY",
        quantity=0.01,
        price=None,
        stop_loss=64000.0,
        take_profit=68000.0,
        mode="PAPER",
    )

    assert result[0] is False
    assert "PRICE_UNAVAILABLE" in result[1]


def test_route_order_requires_explicit_protective_levels():
    service = OrderExecutionService()

    result = service.route_order(
        symbol="BTC/USDT",
        direction="LONG",
        quantity=0.01,
        price=65000.0,
        stop_loss=None,
        take_profit=None,
        mode="PAPER",
    )

    assert result["success"] is False
    assert "INVALID_PROTECTIVE_LEVELS" in result["reason"]


def test_live_adapter_does_not_report_unverified_fill(monkeypatch):
    class UnfilledEngine:
        def market_buy(self, symbol, amount, price):
            return {"order_id": "accepted-but-unfilled", "filled_amount": 0.0, "average_price": 0.0}

    class Fetcher:
        exchange = object()

    monkeypatch.setattr("src.execution.ExecutionEngine", lambda exchange: UnfilledEngine())
    monkeypatch.setattr("src.data_fetcher.get_testnet_fetcher", lambda: Fetcher())

    result = LiveExecutionAdapter().submit_order("BTC/USDT", "BUY", 0.01, 65000.0)

    assert result["success"] is False
    assert result["status"] == "SUBMITTED"
    assert "verified fill" in result["message"]
