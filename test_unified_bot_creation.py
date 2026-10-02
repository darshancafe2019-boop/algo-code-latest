"""
Test Unified Bot Creation API & Configuration Persistence
==========================================================
"""

import os
os.environ["TESTING"] = "1"
os.environ["WERKZEUG_RUN_MAIN"] = "true"
import json
import uuid

def run():
    from dashboard import app, db
    app.testing = True
    client = app.test_client()

    unique_name = f"Institutional NIFTY Alpha Bot {uuid.uuid4().hex[:4]}"
    bot_payload = {
        "identity": {
            "name": unique_name,
            "description": "Deterministic trend following bot with auto square-off",
            "group_name": "Institutional Fleet",
            "tags": ["NSE", "OPTIONS", "ALPHA"],
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

    print("POST /api/bots/create...")
    res = client.post("/api/bots/create", json=bot_payload)
    print("Status:", res.status_code)
    data = res.get_json()
    print("Created data:", data)
    assert res.status_code == 200, f"Error: {data}"
    bot_id = data.get("bot_id") or data.get("bot", {}).get("id")

    # Verify Fleet
    res_fleet = client.get("/api/bots")
    assert res_fleet.status_code == 200
    fleet = res_fleet.get_json().get("bots", [])
    matched = [b for b in fleet if b["id"] == bot_id or b["name"] == unique_name]
    assert len(matched) > 0, "Bot not found in fleet"
    print(f"Verified bot {bot_id} in fleet: {matched[0]['name']}")

    # Verify Database
    row = db.safe_query("SELECT config_json, allocated_capital FROM bot_instances WHERE id = ?", (bot_id,))
    assert len(row) > 0
    cfg = json.loads(row[0]["config_json"])
    assert cfg["risk"]["stop_loss_pct"] == 1.5
    print("Verified DB config successfully!")

if __name__ == "__main__":
    try:
        run()
        print("ALL TESTS PASSED!")
    finally:
        os._exit(0)
