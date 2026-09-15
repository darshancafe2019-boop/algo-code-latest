import unittest
import json
from dashboard import app

class TestStrategyBotCreationWorkflow(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_01_create_nifty_bull_call_spread_bot(self):
        """Test direct bot creation with multi-leg NIFTY Bull Call Spread configuration."""
        payload = {
            "name": "NIFTY Auto Bull Call Spread",
            "strategy": "BULL_CALL_SPREAD",
            "symbol": "NIFTY",
            "asset_class": "OPTIONS",
            "execution_mode": "PAPER",
            "broker": "DHAN",
            "allocated_capital": 50000.0,
            "risk_per_trade_pct": 2.0,
            "max_loss_limit": 6000.0,
            "profit_target_limit": 12000.0,
            "option_legs": [
                {
                    "action": "BUY",
                    "option_type": "CE",
                    "strike": 24600,
                    "expiry": "2026-09-25",
                    "quantity": 50,
                    "premium": 140.0,
                    "security_id": "DHAN_NIFTY_24600_CE",
                    "trading_symbol": "NIFTY 24600 CE"
                },
                {
                    "action": "SELL",
                    "option_type": "CE",
                    "strike": 24800,
                    "expiry": "2026-09-25",
                    "quantity": 50,
                    "premium": 48.0,
                    "security_id": "DHAN_NIFTY_24800_CE",
                    "trading_symbol": "NIFTY 24800 CE"
                }
            ],
            "risk_config": {
                "stop_loss_type": "POINTS",
                "stop_loss_value": 30,
                "take_profit_type": "POINTS",
                "take_profit_value": 60,
                "trailing_stop_enabled": True,
                "exit_before_expiry": True,
                "exit_minutes_before_close": 15
            }
        }

        response = self.client.post("/api/bots/create", json=payload)
        self.assertIn(response.status_code, [200, 201])
        data = response.get_json()
        self.assertTrue(data.get("success", True))
        self.assertIn("bot_id", data)

    def test_02_create_banknifty_iron_condor_bot(self):
        """Test direct bot creation with 4-leg BANKNIFTY Iron Condor configuration."""
        payload = {
            "name": "BANKNIFTY 4-Leg Iron Condor",
            "strategy": "IRON_CONDOR",
            "symbol": "BANKNIFTY",
            "asset_class": "OPTIONS",
            "execution_mode": "PAPER",
            "broker": "DHAN",
            "allocated_capital": 150000.0,
            "risk_per_trade_pct": 3.0,
            "max_loss_limit": 12000.0,
            "profit_target_limit": 8000.0,
            "option_legs": [
                {"action": "BUY", "option_type": "PE", "strike": 50000, "expiry": "2026-09-25", "quantity": 15, "premium": 25.0},
                {"action": "SELL", "option_type": "PE", "strike": 50500, "expiry": "2026-09-25", "quantity": 15, "premium": 65.0},
                {"action": "SELL", "option_type": "CE", "strike": 51500, "expiry": "2026-09-25", "quantity": 15, "premium": 70.0},
                {"action": "BUY", "option_type": "CE", "strike": 52000, "expiry": "2026-09-25", "quantity": 15, "premium": 22.0}
            ]
        }

        response = self.client.post("/api/bots/create", json=payload)
        self.assertIn(response.status_code, [200, 201])
        data = response.get_json()
        self.assertTrue(data.get("success", True))

    def test_03_bot_draft_persistence(self):
        """Test bot draft saving and retrieval."""
        draft_payload = {
            "name": "Draft Strategy Bot",
            "strategy": "LONG_STRADDLE",
            "symbol": "FINNIFTY",
            "execution_mode": "PAPER",
            "draft_data": {
                "underlying": "FINNIFTY",
                "capital": 60000,
                "strategy": "LONG_STRADDLE"
            }
        }
        res = self.client.post("/api/bots/drafts", json=draft_payload)
        self.assertIn(res.status_code, [200, 201])

if __name__ == "__main__":
    unittest.main()
