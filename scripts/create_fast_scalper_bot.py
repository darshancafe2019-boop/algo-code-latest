import sqlite3
import json
from datetime import datetime, timezone
import uuid

conn = sqlite3.connect("data/trading_bot.db")
c = conn.cursor()

bot_id = f"bot-scalper-{uuid.uuid4().hex[:8]}"
name = "⚡ Ultra-Fast 1m Scalper (BTC)"
symbol = "BTC/USDT"
asset_class = "CRYPTO"
timeframe = "1m"
strategy = "EMA_MACD_SCALPER"
execution_mode = "PAPER"
allocated_capital = 10000.0
now_iso = datetime.now(timezone.utc).isoformat()

config_payload = {
    "strategy_name": "Ultra Fast 1m Momentum Scalper",
    "timeframe": "1m",
    "risk_pct": 0.01,
    "take_profit_pct": 0.005,
    "stop_loss_pct": 0.003,
    "confluence_threshold": 65.0,
    "indicators": [
        {"name": "EMA 9/21 Scalp", "type": "EMA", "status": "ACTIVE"},
        {"name": "Fast RSI (7)", "type": "RSI", "status": "ACTIVE"},
        {"name": "MACD 6/13/4", "type": "MACD", "status": "ACTIVE"},
        {"name": "Volume Profile", "type": "VP", "status": "ACTIVE"}
    ],
    "description": "High-frequency 1-minute scalping bot designed for rapid buy and sell cycle verification with tight 0.5% TP and 0.3% SL."
}

c.execute("""
    INSERT INTO bot_instances (
        id, name, symbol, asset_class, timeframe, strategy, execution_mode,
        allocated_capital, status, last_error, config_json, created_at, updated_at,
        is_deleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'RUNNING', NULL, ?, ?, ?, 0)
""", (
    bot_id,
    name,
    symbol,
    asset_class,
    timeframe,
    strategy,
    execution_mode,
    allocated_capital,
    json.dumps(config_payload),
    now_iso,
    now_iso
))

conn.commit()
conn.close()

print(f"[SUCCESS] Created Ultra-Fast Scalper Bot with ID: {bot_id}")
print(f"Name: {name}")
print(f"Symbol: {symbol} | Timeframe: {timeframe} | Mode: {execution_mode}")
