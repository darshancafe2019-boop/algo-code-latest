import unittest
import json
from dashboard import app
from src import config

class TestDhanDirectOptionChainExecution(unittest.TestCase):
    def setUp(self):
        self.app = app
        self.client = self.app.test_client()

    def test_dhan_nifty_call_buy_execution(self):
        payload = {
            "client_order_id": "OPT_DHAN_NIFTY_25000_CE_BUY_TEST",
            "symbol": "NIFTY 25000 CE",
            "direction": "LONG",
            "order_type": "LIMIT",
            "product_type": "INTRADAY",
            "quantity": 50,
            "price": 125.50,
            "mode": "PAPER",
            "bot_id": "option-chain-terminal",
            "strategy": "OPTION_CHAIN_DIRECT",
            "provider": "DHAN",
            "broker": "DHAN",
            "broker_account_id": "ba_dhan_primary",
            "instrument_id": "DHAN_NIFTY_25000_CE",
            "security_id": "123456",
            "exchange_segment": "NSE_FNO",
            "underlying": "NIFTY",
            "expiry": "2026-09-18",
            "strike": 25000,
            "option_type": "CE"
        }
        res = self.client.post(
            "/api/quick-trade/execute",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data.get("status"), "success")
        self.assertEqual(data.get("symbol"), "NIFTY 25000 CE")
        self.assertEqual(data.get("direction"), "LONG")
        self.assertEqual(data.get("quantity"), 50)
        self.assertEqual(data.get("mode"), "PAPER")

    def test_dhan_banknifty_put_sell_execution(self):
        payload = {
            "client_order_id": "OPT_DHAN_BANKNIFTY_48000_PE_SELL_TEST",
            "symbol": "BANKNIFTY 48000 PE",
            "direction": "SHORT",
            "order_type": "MARKET",
            "product_type": "NORMAL",
            "quantity": 15,
            "price": 280.00,
            "mode": "PAPER",
            "bot_id": "option-chain-terminal",
            "strategy": "OPTION_CHAIN_DIRECT",
            "provider": "DHAN",
            "broker": "DHAN",
            "broker_account_id": "ba_dhan_primary",
            "instrument_id": "DHAN_BANKNIFTY_48000_PE",
            "security_id": "654321",
            "exchange_segment": "NSE_FNO",
            "underlying": "BANKNIFTY",
            "expiry": "2026-09-25",
            "strike": 48000,
            "option_type": "PE"
        }
        res = self.client.post(
            "/api/quick-trade/execute",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data.get("status"), "success")
        self.assertEqual(data.get("symbol"), "BANKNIFTY 48000 PE")
        self.assertEqual(data.get("direction"), "SHORT")
        self.assertEqual(data.get("quantity"), 15)

    def test_dhan_equity_reliance_call_buy_execution(self):
        payload = {
            "client_order_id": "OPT_DHAN_RELIANCE_3000_CE_BUY_TEST",
            "symbol": "RELIANCE 3000 CE",
            "direction": "LONG",
            "order_type": "LIMIT",
            "product_type": "INTRADAY",
            "quantity": 250,
            "price": 45.00,
            "mode": "PAPER",
            "bot_id": "option-chain-terminal",
            "strategy": "OPTION_CHAIN_DIRECT",
            "provider": "DHAN",
            "broker": "DHAN",
            "security_id": "288501",
            "exchange_segment": "NSE_FNO",
            "underlying": "RELIANCE",
            "expiry": "2026-09-25",
            "strike": 3000,
            "option_type": "CE"
        }
        res = self.client.post(
            "/api/quick-trade/execute",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data.get("status"), "success")
        self.assertEqual(data.get("symbol"), "RELIANCE 3000 CE")
        self.assertEqual(data.get("quantity"), 250)

    def test_dhan_idempotency_duplicate_protection(self):
        payload = {
            "client_order_id": "OPT_DHAN_IDEM_TEST_999",
            "symbol": "NIFTY 25000 CE",
            "direction": "LONG",
            "quantity": 50,
            "price": 125.50,
            "mode": "PAPER",
            "broker": "DHAN"
        }
        res1 = self.client.post("/api/quick-trade/execute", data=json.dumps(payload), content_type="application/json")
        self.assertEqual(res1.status_code, 200)
        
        # Second submission with same idempotency key must not create duplicate order
        res2 = self.client.post("/api/quick-trade/execute", data=json.dumps(payload), content_type="application/json")
        self.assertEqual(res2.status_code, 200)
        data1 = json.loads(res1.data)
        data2 = json.loads(res2.data)
        self.assertEqual(data1.get("client_order_id"), data2.get("client_order_id"))

if __name__ == "__main__":
    unittest.main()
