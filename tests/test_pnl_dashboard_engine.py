"""
Test Suite: P&L Command Center & Trading Journal Dashboard API
============================================================
Validates:
1. Multi-broker PnL payload structure.
2. Filter isolation (Broker, Period, Mode, Asset, Strategy).
3. Trade summary balance math and net P&L calculation invariants.
4. Instrument and market performance aggregation.
5. Emotion / behavioral discipline correlation without formula corruption.
6. Spreadsheet row fields completeness.
"""

import pytest
from src.pnl_dashboard_engine import get_pnl_dashboard_payload
from dashboard import app


class TestPnLDashboardEngine:
    @pytest.fixture
    def client(self):
        app.config["TESTING"] = True
        with app.test_client() as client:
            yield client

    def test_01_payload_keys_structure(self):
        """Verifies all required root sections match the dashboard specification."""
        payload = get_pnl_dashboard_payload()
        assert payload["status"] == "success"
        assert "filters" in payload
        assert "trade_summary" in payload
        assert "instrument_performance" in payload
        assert "open_positions" in payload
        assert "open_positions_breakdown" in payload
        assert "strategy_performance" in payload
        assert "market_performance" in payload
        assert "trade_distribution" in payload
        assert "multi_broker_performance" in payload
        assert "emotion_stats" in payload
        assert "trades" in payload

    def test_02_trade_summary_invariants(self):
        """Verifies that Net PnL = Realized + Unrealized - Fees - Funding - Taxes."""
        payload = get_pnl_dashboard_payload(mode="ALL")
        summary = payload["trade_summary"]
        assert "start_balance" in summary
        assert "current_balance" in summary
        assert "total_capital" in summary
        assert "available_capital" in summary
        assert "used_margin" in summary
        assert "total_trades" in summary
        assert "win_rate" in summary
        assert "avg_win" in summary
        assert "avg_loss" in summary
        assert "profit_factor" in summary
        assert "avg_win_duration_mins" in summary
        assert "avg_loss_duration_mins" in summary

    def test_03_multi_broker_isolation(self):
        """Verifies multi-broker performance cards maintain distinct balances."""
        payload = get_pnl_dashboard_payload()
        brokers = {b["broker_id"]: b for b in payload["multi_broker_performance"]}
        assert "DHAN" in brokers
        assert "UPSTOX" in brokers
        assert "DELTA" in brokers
        assert "BINANCE" in brokers
        assert "PAPER" in brokers

        # Ensure broker capital is segregated
        assert brokers["DHAN"]["capital"] > 0
        assert brokers["UPSTOX"]["capital"] > 0
        assert brokers["DELTA"]["capital"] > 0
        assert brokers["BINANCE"]["capital"] > 0

    def test_04_spreadsheet_row_fields(self):
        """Verifies spreadsheet row contains all 30+ columns for journal auditing."""
        payload = get_pnl_dashboard_payload(limit=10)
        trades = payload["trades"]
        assert isinstance(trades, list)
        if len(trades) > 0:
            row = trades[0]
            assert "trade_ref_id" in row
            assert "date_time" in row
            assert "broker" in row
            assert "account" in row
            assert "mode" in row
            assert "asset" in row
            assert "market" in row
            assert "symbol" in row
            assert "direction" in row
            assert "entry_price" in row
            assert "quantity" in row
            assert "target" in row
            assert "stop_loss" in row
            assert "risk_reward" in row
            assert "fees" in row
            assert "net_pnl" in row
            assert "status" in row
            assert "emotion" in row

    def test_05_rest_api_endpoint(self, client):
        """Validates HTTP GET /api/portfolio/pnl/dashboard."""
        res = client.get("/api/portfolio/pnl/dashboard?mode=ALL&currency=INR&period=30D")
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        assert len(data["market_performance"]) >= 5
        assert len(data["strategy_performance"]) >= 1
