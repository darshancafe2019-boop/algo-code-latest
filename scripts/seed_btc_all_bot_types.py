"""
QUANT.OS — SEED ALL BTC BOT TYPES SCRIPT
=========================================
Instantiates a complete fleet of BTC trading bots spanning all 7 quantitative archetypes:
1. Trend / Momentum Confluence Bot (EMA + MACD + Volume Profile)
2. Mean Reversion & VWAP Scalper Bot (VWAP Bands + RSI)
3. Volatility Breakout & Squeeze Bot (Bollinger Bands + Donchian Channel)
4. Volume Star Order Flow Bot (POC / Value Area Expansion)
5. Perpetual Futures Trend Follower Bot (Supertrend + MACD 3x)
6. Delta Crypto Options Directional Bot (Options Delta Momentum)
7. Dynamic Grid & Market Making Scalper Bot (ATR Grid Levels)
"""

import sys
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from src import db, config
from dashboard import app

BTC_BOT_DEFINITIONS = [
    {
        "name": "BTC Trend Confluence Alpha",
        "description": "Multi-timeframe EMA 9/21 cross, MACD momentum expansion, and Volume Profile Value Area confluence.",
        "symbol": "BTC/USDT",
        "underlying": "BTC",
        "market": "CRYPTO_SPOT",
        "exchange": "BINANCE",
        "broker": "PAPER",
        "market_data_provider": "BINANCE",
        "execution_mode": "PAPER",
        "strategy_id": "EMA_MACD_VP_CONFLUENCE",
        "timeframe": "5m",
        "allocated_capital": 25000.0,
        "sizing_mode": "RISK_BASED",
        "risk_per_trade_pct": 1.5,
        "stop_loss_pct": 1.8,
        "take_profit_pct": 3.6,
        "max_daily_loss": 1250.0,
        "max_open_positions": 1,
        "lot_size": 1.0,
        "side": "BUY"
    },
    {
        "name": "BTC VWAP Mean Reversion Scalper",
        "description": "High-probability mean reversion targeting 2.0-sigma VWAP band deviation rebounds with RSI confirmation.",
        "symbol": "BTC/USDT",
        "underlying": "BTC",
        "market": "CRYPTO_SPOT",
        "exchange": "BINANCE",
        "broker": "PAPER",
        "market_data_provider": "BINANCE",
        "execution_mode": "PAPER",
        "strategy_id": "VWAP_MEAN_REVERSION",
        "timeframe": "1m",
        "allocated_capital": 15000.0,
        "sizing_mode": "FIXED",
        "risk_per_trade_pct": 1.0,
        "stop_loss_pct": 1.2,
        "take_profit_pct": 2.4,
        "max_daily_loss": 750.0,
        "max_open_positions": 1,
        "lot_size": 1.0,
        "side": "BUY"
    },
    {
        "name": "BTC Volatility Breakout Squeeze",
        "description": "Captures explosive volatility expansions following tight Bollinger Band squeezes and Donchian channel breaks.",
        "symbol": "BTC/USDT",
        "underlying": "BTC",
        "market": "CRYPTO_SPOT",
        "exchange": "BINANCE",
        "broker": "PAPER",
        "market_data_provider": "BINANCE",
        "execution_mode": "PAPER",
        "strategy_id": "BOLLINGER_DONCHIAN_BREAKOUT",
        "timeframe": "15m",
        "allocated_capital": 20000.0,
        "sizing_mode": "RISK_BASED",
        "risk_per_trade_pct": 2.0,
        "stop_loss_pct": 2.0,
        "take_profit_pct": 5.0,
        "max_daily_loss": 1000.0,
        "max_open_positions": 1,
        "lot_size": 1.0,
        "side": "BUY"
    },
    {
        "name": "BTC Volume Star Order Flow Pro",
        "description": "Institutional order flow execution tracking Point of Control (POC) migrations and high-volume node liquidity sweeps.",
        "symbol": "BTC/USDT",
        "underlying": "BTC",
        "market": "CRYPTO_SPOT",
        "exchange": "BINANCE",
        "broker": "PAPER",
        "market_data_provider": "BINANCE",
        "execution_mode": "PAPER",
        "strategy_id": "VOLUME_STAR_PRO",
        "timeframe": "5m",
        "allocated_capital": 20000.0,
        "sizing_mode": "FIXED",
        "risk_per_trade_pct": 1.5,
        "stop_loss_pct": 1.5,
        "take_profit_pct": 3.0,
        "max_daily_loss": 1000.0,
        "max_open_positions": 1,
        "lot_size": 1.0,
        "side": "BUY"
    },
    {
        "name": "BTC Perpetual Trend Follower",
        "description": "Systematic crypto futures momentum strategy using Supertrend (10,3) and MACD histogram expansion with 3x leverage.",
        "symbol": "BTC/USDT",
        "underlying": "BTC",
        "market": "CRYPTO_FUTURES",
        "exchange": "BINANCE",
        "broker": "PAPER",
        "market_data_provider": "BINANCE",
        "execution_mode": "PAPER",
        "strategy_id": "SUPERTREND_MACD_FUTURES",
        "timeframe": "15m",
        "allocated_capital": 30000.0,
        "sizing_mode": "LEVERAGED",
        "risk_per_trade_pct": 2.0,
        "stop_loss_pct": 2.5,
        "take_profit_pct": 6.0,
        "max_daily_loss": 1500.0,
        "max_open_positions": 1,
        "lot_size": 1.0,
        "side": "BUY"
    },
    {
        "name": "BTC Delta Options Momentum Rider",
        "description": "Quantitative crypto options buyer selecting dynamic ATM/OTM contracts on Delta Exchange based on Gamma velocity.",
        "symbol": "BTC-USD",
        "underlying": "BTC",
        "market": "CRYPTO_OPTIONS",
        "exchange": "DELTA",
        "broker": "PAPER",
        "market_data_provider": "DELTA",
        "execution_mode": "PAPER",
        "strategy_id": "OPTIONS_DELTA_MOMENTUM",
        "timeframe": "5m",
        "allocated_capital": 10000.0,
        "sizing_mode": "FIXED",
        "risk_per_trade_pct": 2.5,
        "stop_loss_pct": 15.0,
        "take_profit_pct": 35.0,
        "max_daily_loss": 500.0,
        "max_open_positions": 2,
        "lot_size": 1.0,
        "strike": 87000.0,
        "expiry": "2026-10-30",
        "option_type": "CE",
        "side": "BUY"
    },
    {
        "name": "BTC Dynamic Grid Scalper",
        "description": "High-frequency multi-level arithmetic grid market making across dynamic ATR channels for continuous yield generation.",
        "symbol": "BTC/USDT",
        "underlying": "BTC",
        "market": "CRYPTO_SPOT",
        "exchange": "BINANCE",
        "broker": "PAPER",
        "market_data_provider": "BINANCE",
        "execution_mode": "PAPER",
        "strategy_id": "DYNAMIC_ARITHMETIC_GRID",
        "timeframe": "1m",
        "allocated_capital": 15000.0,
        "sizing_mode": "GRID",
        "risk_per_trade_pct": 1.0,
        "stop_loss_pct": 3.0,
        "take_profit_pct": 1.0,
        "max_daily_loss": 750.0,
        "max_open_positions": 5,
        "lot_size": 1.0,
        "side": "BUY"
    }
]


def seed_all_btc_bots():
    print("=" * 80)
    print(" QUANT.OS — INSTANTIATING ALL BTC BOT TYPES")
    print("=" * 80)

    db.init_db(force=False)
    client = app.test_client()

    created_bots = []

    for idx, bot_def in enumerate(BTC_BOT_DEFINITIONS, 1):
        print(f"\n[{idx}/{len(BTC_BOT_DEFINITIONS)}] Creating: {bot_def['name']} ({bot_def['strategy_id']})...")
        resp = client.post("/api/bots/create", json=bot_def)
        data = resp.get_json() or {}

        if resp.status_code in [200, 201] and data.get("status") in ["success", "ok"] or data.get("success"):
            bot_id = data.get("bot_id") or data.get("bot", {}).get("id")
            slug = data.get("slug") or data.get("bot", {}).get("slug")
            print(f"  [SUCCESS] Bot created successfully! ID: {bot_id} | Slug: {slug}")
            created_bots.append({
                "id": bot_id,
                "name": bot_def["name"],
                "strategy": bot_def["strategy_id"],
                "type": bot_def["market"],
                "capital": bot_def["allocated_capital"],
                "status": "CREATED / STOPPED"
            })
        else:
            print(f"  [ERROR] Failed to create bot: {data.get('message') or data.get('error') or resp.status_code}")
            print(f"  Details: {data}")

    # Verify database state
    all_bots = db.safe_query("SELECT id, name, slug, symbol, strategy_id, allocated_capital, status, execution_mode FROM bot_instances WHERE COALESCE(is_deleted, 0) = 0")
    print("\n" + "=" * 80)
    print(f" TOTAL BOTS NOW REGISTERED IN DATABASE: {len(all_bots)}")
    print("=" * 80)
    for b in all_bots:
        print(f" • [{b['id']}] {b['name']} | Strat: {b['strategy_id']} | Sym: {b['symbol']} | Cap: ${float(b['allocated_capital'] or 0):,.2f} | Status: {b['status']} | Mode: {b['execution_mode']}")

    return created_bots


if __name__ == "__main__":
    seed_all_btc_bots()
