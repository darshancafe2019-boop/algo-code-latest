import requests
import json
import uuid

def test_live_api():
    base_url = "http://127.0.0.1:5000"
    unique_name = f"Unified Control Plane Bot {uuid.uuid4().hex[:4]}"

    payload = {
        "identity": {
            "name": unique_name,
            "description": "Unified Bot Creation Experience Verified",
            "group_name": "Institutional Fleet",
            "tags": ["NSE", "OPTIONS", "UNIFIED"],
            "customer_id": "cust_default",
            "department_id": "dept_algo_trading",
            "broker_folder_id": "bf_paper",
            "broker_account_id": "ba_paper_primary",
            "broker_provider": "UPSTOX",
            "strategy_id": "EMA_SUPERTREND_CONFLUENCE",
        },
        "environment": {
            "execution_mode": "PAPER",
            "data_provider_id": "UPSTOX",
            "execution_broker_id": "paper_simulator",
            "exchange": "NSE",
            "timezone": "Asia/Kolkata"
        },
        "capital": {
            "currency": "INR",
            "allocated_capital": 50000.0,
            "total_capital": 500000.0,
            "sizing_method": "FIXED_CAPITAL",
            "risk_reserve": 0.0
        },
        "universe": {
            "asset_class": "OPTIONS",
            "canonical_instrument_id": "NSE:NIFTY26MAR24600CE",
            "display_symbol": "NIFTY 24600 CE",
            "symbol": "NIFTY 24600 CE",
            "lot_size": 25,
            "tick_size": 0.05,
            "contract_multiplier": 1.0,
            "expiry": "2026-03-27",
            "strike": 24600.0,
            "option_type": "CE"
        },
        "strategy": {
            "strategy_id": "EMA_SUPERTREND_CONFLUENCE",
            "primary_timeframe": "5m",
            "confirmation_timeframes": ["15m"],
            "long_enabled": True,
            "short_enabled": False
        },
        "risk": {
            "stop_loss_pct": 1.5,
            "profit_target_pct": 3.0,
            "trailing_stop_pct": 0.5,
            "risk_per_trade_pct": 1.0,
            "max_daily_loss": 5000.0,
            "max_drawdown_pct": 5.0
        },
        "expiry_policy": {
            "auto_square_off": True,
            "entry_lock_minutes": 15,
            "square_off_minutes": 5,
            "rollover_policy": "NONE"
        },
        "execution": {
            "order_type": "MARKET",
            "product_type": "INTRADAY",
            "max_slippage_pct": 0.2,
            "multi_leg_safety": True,
            "basket_orders": True
        },
        "status": "CREATED"
    }

    print(f"Sending POST to {base_url}/api/bots/create...")
    r = requests.post(f"{base_url}/api/bots/create", json=payload, timeout=10)
    print("Status Code:", r.status_code)
    data = r.json()
    print("Response Data:", data)
    assert r.status_code == 200, f"Creation failed: {data}"
    bot_id = data.get("bot_id") or data.get("bot", {}).get("id")
    assert bot_id is not None, "Missing bot_id in response"

    # Query fleet
    r_fleet = requests.get(f"{base_url}/api/bots", timeout=10)
    assert r_fleet.status_code == 200
    fleet = r_fleet.json().get("bots", [])
    matched = [b for b in fleet if b["id"] == bot_id or b["name"] == unique_name]
    assert len(matched) > 0, "Created bot not found in fleet"
    print(f"✓ Bot {bot_id} successfully found in fleet listing!")

if __name__ == "__main__":
    test_live_api()
    print("ALL LIVE SERVER TESTS PASSED!")
