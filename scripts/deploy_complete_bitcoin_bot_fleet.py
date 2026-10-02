"""
Deploy Complete Institutional Bitcoin Paper Trading Fleet (51 Bots)
====================================================================
Sets up and deploys 51 specialized paper trading bot instances on Bitcoin:
- 30 Institutional Strategies (Trend, Pullback, Structure, Volume, Multi-Factor)
- 21 Multi-Leg Options Strategies (Iron Condor, Straddle, Strangle, Spreads, Calendars, etc.)
- Full 20 Indicators Stack (EMA 9/20/50/200, Supertrend, RSI, MACD, Bollinger Bands, etc.)
"""

import sqlite3
import json
import uuid
from datetime import datetime, timezone
import os

DB_PATH = "data/trading_bot.db"

# 30 Comprehensive Market Strategies Catalog
STRATEGIES_30 = [
    # Category A: Trend & Continuation (01 - 10)
    {"num": "01", "id": "BTC_01_TREND_PULLBACK_EMA", "name": "BTC Trend Pullback to EMA 20/50", "cat": "Trend & Continuation", "tf": "15m", "ind": ["EMA 20", "EMA 50", "EMA 200", "ATR 14"], "dir": "LONG / SHORT"},
    {"num": "02", "id": "BTC_02_MOMENTUM_EXPANSION", "name": "BTC Momentum Ignition & Expansion", "cat": "Trend & Continuation", "tf": "5m", "ind": ["MACD (12,26,9)", "RSI 14", "Volume SMA 20", "ATR 14"], "dir": "LONG / SHORT"},
    {"num": "03", "id": "BTC_03_DAILY_TREND_1H_TRIGGER", "name": "BTC Daily Trend + 1H Breakout Trigger", "cat": "Trend & Continuation", "tf": "1h", "ind": ["Daily EMA 200", "1H EMA 9", "1H EMA 20", "RSI 14"], "dir": "LONG"},
    {"num": "04", "id": "BTC_04_TREND_RESUMPTION_SQUEEZE", "name": "BTC Trend Resumption After Squeeze", "cat": "Trend & Continuation", "tf": "15m", "ind": ["Bollinger Bands (20,2)", "Donchian 20", "ADX 14", "Volume"], "dir": "LONG / SHORT"},
    {"num": "05", "id": "BTC_05_TIME_SERIES_MOMENTUM", "name": "BTC Time-Series Momentum Trend", "cat": "Trend & Continuation", "tf": "1h", "ind": ["EMA 50", "EMA 200", "ROC 14", "Supertrend (10,3)"], "dir": "LONG / SHORT"},
    {"num": "06", "id": "BTC_06_BANDWIDTH_SQUEEZE_BREAKOUT", "name": "BTC Bollinger Bandwidth Squeeze Breakout", "cat": "Trend & Continuation", "tf": "15m", "ind": ["Bollinger Bandwidth", "Volume SMA 20", "EMA 9"], "dir": "LONG / SHORT"},
    {"num": "07", "id": "BTC_07_DONCHIAN_20_BREAKOUT", "name": "BTC Donchian 20 High/Low Turtle Breakout", "cat": "Trend & Continuation", "tf": "1h", "ind": ["Donchian Channels (20)", "ATR 14", "Volume"], "dir": "LONG / SHORT"},
    {"num": "08", "id": "BTC_08_UTC_OPENING_RANGE_BREAKOUT", "name": "BTC UTC Opening Range Breakout (ORB)", "cat": "Trend & Continuation", "tf": "5m", "ind": ["Opening Range 30m", "VWAP", "Volume Surge"], "dir": "LONG / SHORT"},
    {"num": "09", "id": "BTC_09_PREV_DAY_HIGH_LOW_BREAK", "name": "BTC Previous Day High/Low Expansion", "cat": "Trend & Continuation", "tf": "15m", "ind": ["Prior Day High/Low", "Pivot Points", "RSI 14"], "dir": "LONG / SHORT"},
    {"num": "10", "id": "BTC_10_BREAKOUT_RETEST_ACCELERATION", "name": "BTC Resistance Breakout + Retest Confluence", "cat": "Trend & Continuation", "tf": "15m", "ind": ["EMA 20", "VWAP", "Volume Climax", "OBV"], "dir": "LONG"},

    # Category B: Pullback & Mean Reversion (11 - 15)
    {"num": "11", "id": "BTC_11_BOLLINGER_REVERSION", "name": "BTC Bollinger 2.5 StdDev Mean Reversion", "cat": "Pullback & Mean Reversion", "tf": "15m", "ind": ["Bollinger Bands (20,2.5)", "RSI 14", "WMA 20"], "dir": "LONG / SHORT"},
    {"num": "12", "id": "BTC_12_RSI_EXTREME_REVERSION", "name": "BTC RSI Extreme Oversold/Overbought Reversion", "cat": "Pullback & Mean Reversion", "tf": "15m", "ind": ["RSI 14 (<25 / >75)", "RSI Divergence", "EMA 50"], "dir": "LONG / SHORT"},
    {"num": "13", "id": "BTC_13_ANCHORED_VWAP_REVERSION", "name": "BTC Anchored VWAP Institutional Reversion", "cat": "Pullback & Mean Reversion", "tf": "1h", "ind": ["Anchored VWAP (Swing Anchor)", "ATR 14", "Volume SMA"], "dir": "LONG / SHORT"},
    {"num": "14", "id": "BTC_14_ATR_EXTENSION_REVERSAL", "name": "BTC ATR 3.0x Extension Exhaustion Fade", "cat": "Pullback & Mean Reversion", "tf": "1h", "ind": ["ATR 14 Keltner Envelope", "Volume Climax", "RSI 14"], "dir": "LONG / SHORT"},
    {"num": "15", "id": "BTC_15_RANGE_FADE_VWAP", "name": "BTC Value Area Range Fade to VWAP", "cat": "Pullback & Mean Reversion", "tf": "15m", "ind": ["VWAP Standard Bands", "Volume Profile", "Pivot Points"], "dir": "LONG / SHORT"},

    # Category C: Structure & Reversal (16 - 20)
    {"num": "16", "id": "BTC_16_SWING_SWEEP_REVERSAL", "name": "BTC Liquidity Sweep & Turtle Soup Reversal", "cat": "Structure & Reversal", "tf": "15m", "ind": ["Swing Pivot High/Low", "RSI Divergence", "Volume Climax"], "dir": "LONG / SHORT"},
    {"num": "17", "id": "BTC_17_FAILED_BREAKOUT_REVERSAL", "name": "BTC Failed Breakout Bull/Bear Trap Reversal", "cat": "Structure & Reversal", "tf": "15m", "ind": ["Donchian 20", "OBV Divergence", "Supertrend"], "dir": "LONG / SHORT"},
    {"num": "18", "id": "BTC_18_PRIOR_LEVEL_REJECTION", "name": "BTC Key Structural S/R Level Rejection", "cat": "Structure & Reversal", "tf": "1h", "ind": ["Pivot Points Fibonacci", "EMA 200", "Volume SMA 20"], "dir": "LONG / SHORT"},
    {"num": "19", "id": "BTC_19_STRUCTURE_BREAK_RETEST", "name": "BTC Market Structure Break (MSB) + Retest", "cat": "Structure & Reversal", "tf": "1h", "ind": ["Market Structure Choch", "EMA 50", "RSI 14"], "dir": "LONG / SHORT"},
    {"num": "20", "id": "BTC_20_DAILY_COMPRESSION_EXPANSION", "name": "BTC Inside Day Multi-Bar Compression Break", "cat": "Structure & Reversal", "tf": "1D", "ind": ["Inside Bar Array", "ATR 14", "ADX 14"], "dir": "LONG / SHORT"},

    # Category D: Momentum & Volume (21 - 25)
    {"num": "21", "id": "BTC_21_RELATIVE_VOLUME_BREAKOUT", "name": "BTC Relative Volume Surge Breakout (>2.0x)", "cat": "Momentum & Volume", "tf": "5m", "ind": ["Volume SMA 20", "Volume Ratio", "EMA 9", "EMA 20"], "dir": "LONG / SHORT"},
    {"num": "22", "id": "BTC_22_VOLUME_DRYUP_CONTINUATION", "name": "BTC Low-Volume Pullback Dry-Up Continuation", "cat": "Momentum & Volume", "tf": "15m", "ind": ["Volume SMA 20", "EMA 20", "RSI 14"], "dir": "LONG"},
    {"num": "23", "id": "BTC_23_VOLUME_CLIMAX_REVERSAL", "name": "BTC Capitulation Volume Climax Reversal", "cat": "Momentum & Volume", "tf": "15m", "ind": ["Volume Climax (3.5x)", "RSI Divergence", "Bollinger Bands"], "dir": "LONG / SHORT"},
    {"num": "24", "id": "BTC_24_OBV_DIVERGENCE_MOMENTUM", "name": "BTC On-Balance Volume (OBV) Hidden Divergence", "cat": "Momentum & Volume", "tf": "1h", "ind": ["OBV", "OBV EMA 20", "RSI 14", "EMA 50"], "dir": "LONG / SHORT"},
    {"num": "25", "id": "BTC_25_VWAP_RECLAIM_ON_VOLUME", "name": "BTC Session VWAP Aggressive Reclaim on Volume", "cat": "Momentum & Volume", "tf": "5m", "ind": ["Session VWAP", "Volume Surge (1.8x)", "EMA 9"], "dir": "LONG"},

    # Category E: Crypto-Specific & Multi-Factor (26 - 30)
    {"num": "26", "id": "BTC_26_BASIS_EXTREME_REVERSAL", "name": "BTC Perpetual Funding & Basis Extreme Arbitrage", "cat": "Crypto-Specific & Multi-Factor", "tf": "1h", "ind": ["Funding Rate", "Perp Basis", "RSI 14", "EMA 200"], "dir": "LONG / SHORT"},
    {"num": "27", "id": "BTC_27_OPEN_INTEREST_EXPANSION", "name": "BTC Open Interest (OI) Surge + Momentum Breakout", "cat": "Crypto-Specific & Multi-Factor", "tf": "15m", "ind": ["Open Interest Delta", "Cumulative Volume Delta (CVD)", "EMA 20"], "dir": "LONG / SHORT"},
    {"num": "28", "id": "BTC_28_FLUSH_AND_RECLAIM", "name": "BTC Liquidation Flush & Rapid V-Shape Reclaim", "cat": "Crypto-Specific & Multi-Factor", "tf": "5m", "ind": ["Liquidation Spikes", "Volume Surge", "VWAP", "RSI 14"], "dir": "LONG"},
    {"num": "29", "id": "BTC_29_DOMINANCE_FILTERED_TREND", "name": "BTC Dominance-Filtered Trend Accelerator", "cat": "Crypto-Specific & Multi-Factor", "tf": "4h", "ind": ["BTC.D Trend", "EMA 50", "EMA 200", "ADX 14"], "dir": "LONG"},
    {"num": "30", "id": "BTC_30_THREE_FACTOR_REGIME", "name": "BTC 3-Factor Confluence (Trend + Vol + Volume)", "cat": "Crypto-Specific & Multi-Factor", "tf": "1h", "ind": ["EMA 50/200", "ATR Volatility", "Volume SMA 20", "Supertrend"], "dir": "LONG / SHORT"},
]

# 21 Canonical Options Strategies Catalog
OPTIONS_21 = [
    {"num": "01", "id": "BTC_OPT_01_LONG_CALL", "name": "BTC Long Call Delta Momentum", "cat": "Directional Options", "legs": 1, "bias": "BULLISH", "type": "DEBIT"},
    {"num": "02", "id": "BTC_OPT_02_LONG_PUT", "name": "BTC Long Put Downside Crash Protection", "cat": "Directional Options", "legs": 1, "bias": "BEARISH", "type": "DEBIT"},
    {"num": "03", "id": "BTC_OPT_03_SHORT_CALL", "name": "BTC Short OTM Call Premium Harvest", "cat": "Income Options", "legs": 1, "bias": "BEARISH", "type": "CREDIT"},
    {"num": "04", "id": "BTC_OPT_04_SHORT_PUT", "name": "BTC Cash-Secured Short Put Accumulator", "cat": "Income Options", "legs": 1, "bias": "BULLISH", "type": "CREDIT"},
    {"num": "05", "id": "BTC_OPT_05_BULL_CALL_SPREAD", "name": "BTC Bull Call Defined Risk Debit Spread", "cat": "Spread Options", "legs": 2, "bias": "BULLISH", "type": "DEBIT"},
    {"num": "06", "id": "BTC_OPT_06_BEAR_PUT_SPREAD", "name": "BTC Bear Put Defined Risk Debit Spread", "cat": "Spread Options", "legs": 2, "bias": "BEARISH", "type": "DEBIT"},
    {"num": "07", "id": "BTC_OPT_07_BULL_PUT_SPREAD", "name": "BTC Bull Put Support Credit Spread", "cat": "Spread Options", "legs": 2, "bias": "BULLISH", "type": "CREDIT"},
    {"num": "08", "id": "BTC_OPT_08_BEAR_CALL_SPREAD", "name": "BTC Bear Call Resistance Credit Spread", "cat": "Spread Options", "legs": 2, "bias": "BEARISH", "type": "CREDIT"},
    {"num": "09", "id": "BTC_OPT_09_SHORT_IRON_CONDOR", "name": "BTC Short Iron Condor Range Income Engine", "cat": "Income Options", "legs": 4, "bias": "NEUTRAL", "type": "CREDIT"},
    {"num": "10", "id": "BTC_OPT_10_RATIO_FRONT_SPREAD", "name": "BTC Ratio Front Call Spread (1x2 Asymmetric)", "cat": "Combination Options", "legs": 2, "bias": "BULLISH", "type": "CREDIT"},
    {"num": "11", "id": "BTC_OPT_11_CALL_BACKSPREAD", "name": "BTC Call Backspread Volatility Explosion", "cat": "Volatility Options", "legs": 2, "bias": "HIGH_VOLATILITY", "type": "DEBIT"},
    {"num": "12", "id": "BTC_OPT_12_LONG_STRADDLE", "name": "BTC Long Straddle ATM Gamma Explosion", "cat": "Volatility Options", "legs": 2, "bias": "HIGH_VOLATILITY", "type": "DEBIT"},
    {"num": "13", "id": "BTC_OPT_13_LONG_STRANGLE", "name": "BTC Long Strangle Outlier Volatility Breakout", "cat": "Volatility Options", "legs": 2, "bias": "HIGH_VOLATILITY", "type": "DEBIT"},
    {"num": "14", "id": "BTC_OPT_14_SHORT_STRADDLE", "name": "BTC Short Straddle Maximum Theta Decay Scalper", "cat": "Income Options", "legs": 2, "bias": "NEUTRAL", "type": "CREDIT"},
    {"num": "15", "id": "BTC_OPT_15_SHORT_STRANGLE", "name": "BTC Short Strangle Statistical Premium Collector", "cat": "Income Options", "legs": 2, "bias": "NEUTRAL", "type": "CREDIT"},
    {"num": "16", "id": "BTC_OPT_16_LONG_BUTTERFLY", "name": "BTC Long Call Butterfly Pinpoint Strike Pin", "cat": "Combination Options", "legs": 3, "bias": "NEUTRAL", "type": "DEBIT"},
    {"num": "17", "id": "BTC_OPT_17_LONG_CONDOR", "name": "BTC Long Condor Defined Range Window", "cat": "Combination Options", "legs": 4, "bias": "NEUTRAL", "type": "DEBIT"},
    {"num": "18", "id": "BTC_OPT_18_LONG_CALENDAR", "name": "BTC Long Calendar Time Decay Differential", "cat": "Spread Options", "legs": 2, "bias": "NEUTRAL", "type": "DEBIT"},
    {"num": "19", "id": "BTC_OPT_19_DIAGONAL_SPREAD", "name": "BTC Diagonal Spread Dynamic Covered Engine", "cat": "Spread Options", "legs": 2, "bias": "BULLISH", "type": "DEBIT"},
    {"num": "20", "id": "BTC_OPT_20_COVERED_CALL", "name": "BTC Covered Call Underlying Holding Yield", "cat": "Combination Options", "legs": 2, "bias": "BULLISH", "type": "CREDIT"},
    {"num": "21", "id": "BTC_OPT_21_COLLAR", "name": "BTC Zero-Cost Collar Downside Capital Insurance", "cat": "Combination Options", "legs": 3, "bias": "BULLISH", "type": "VARIABLE"},
]

def deploy_fleet():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Ensure table exists
    c.execute("""
        CREATE TABLE IF NOT EXISTS bot_instances (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            symbol TEXT NOT NULL,
            asset_class TEXT NOT NULL,
            timeframe TEXT NOT NULL,
            strategy TEXT NOT NULL,
            execution_mode TEXT NOT NULL DEFAULT 'PAPER',
            allocated_capital REAL NOT NULL DEFAULT 10000.0,
            current_equity REAL NOT NULL DEFAULT 10000.0,
            status TEXT NOT NULL DEFAULT 'RUNNING',
            last_error TEXT,
            config_json TEXT,
            group_name TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            is_deleted INTEGER NOT NULL DEFAULT 0
        )
    """)

    now_iso = datetime.now(timezone.utc).isoformat()
    deployed_count = 0

    print("=======================================================================")
    print("DEPLOYING 51 INSTITUTIONAL BITCOIN PAPER TRADING BOTS")
    print("=======================================================================")

    # 1. Deploy 30 Market Strategies
    print("\n--- Deploying 30 Market / Perps / Spot Strategies ---")
    for s in STRATEGIES_30:
        bot_id = f"bot-btc-strat-{s['num'].lower()}-{uuid.uuid4().hex[:4]}"
        cfg = {
            "strategy_id": s["id"],
            "strategy_number": s["num"],
            "strategy_name": s["name"],
            "category": s["cat"],
            "timeframe": s["tf"],
            "indicators": [{"name": ind, "status": "ACTIVE"} for ind in s["ind"]],
            "direction": s["dir"],
            "symbol": "BTC/USDT",
            "market_data_provider": "DELTA",
            "execution_broker": "PAPER",
            "risk_per_trade_pct": 1.0,
            "stop_loss_pct": 1.5,
            "take_profit_pct": 3.0,
            "max_daily_loss": 500.0,
            "auto_execute": True,
            "description": f"Institutional algorithmic paper bot running Strategy #{s['num']} ({s['name']}) on Bitcoin."
        }

        c.execute("""
            INSERT OR REPLACE INTO bot_instances (
                id, name, symbol, asset_class, timeframe, strategy, execution_mode,
                allocated_capital, current_equity, status, config_json, group_name,
                created_at, updated_at, is_deleted
            ) VALUES (?, ?, 'BTC/USDT', 'CRYPTO', ?, ?, 'PAPER', 10000.0, 10000.0, 'RUNNING', ?, 'Bitcoin Alpha Fleet', ?, ?, 0)
        """, (
            bot_id,
            f"#{s['num']} {s['name']}",
            s["tf"],
            s["id"],
            json.dumps(cfg),
            now_iso,
            now_iso
        ))
        deployed_count += 1
        print(f"  [+] [{s['num']}/30] Deployed #{s['num']} {s['name']} ({s['tf']}) -> ID: {bot_id}")

    # 2. Deploy 21 Multi-Leg Options Strategies
    print("\n--- Deploying 21 Canonical Multi-Leg Options Strategies ---")
    for opt in OPTIONS_21:
        bot_id = f"bot-btc-opt-{opt['num'].lower()}-{uuid.uuid4().hex[:4]}"
        cfg = {
            "strategy_id": opt["id"],
            "strategy_number": opt["num"],
            "strategy_name": opt["name"],
            "category": opt["cat"],
            "legs_count": opt["legs"],
            "bias": opt["bias"],
            "premium_flow": opt["type"],
            "underlying": "BTC",
            "symbol": "BTC Options",
            "timeframe": "15m",
            "market_data_provider": "DELTA",
            "execution_broker": "PAPER",
            "risk_per_trade_pct": 1.5,
            "stop_loss_pct": 2.0,
            "take_profit_pct": 4.0,
            "max_daily_loss": 600.0,
            "auto_execute": True,
            "description": f"Canonical options paper trading bot executing Strategy #{opt['num']} ({opt['name']}) on BTC derivatives."
        }

        c.execute("""
            INSERT OR REPLACE INTO bot_instances (
                id, name, symbol, asset_class, timeframe, strategy, execution_mode,
                allocated_capital, current_equity, status, config_json, group_name,
                created_at, updated_at, is_deleted
            ) VALUES (?, ?, 'BTC Options', 'CRYPTO_OPTIONS', '15m', ?, 'PAPER', 10000.0, 10000.0, 'RUNNING', ?, 'Bitcoin Options Fleet', ?, ?, 0)
        """, (
            bot_id,
            f"OPT #{opt['num']} {opt['name']}",
            opt["id"],
            json.dumps(cfg),
            now_iso,
            now_iso
        ))
        deployed_count += 1
        print(f"  [+] [OPT #{opt['num']}/21] Deployed #{opt['num']} {opt['name']} ({opt['legs']} Legs) -> ID: {bot_id}")

    conn.commit()
    conn.close()

    print("\n=======================================================================")
    print(f"SUCCESSFULLY DEPLOYED ALL {deployed_count} BITCOIN PAPER TRADING BOTS!")
    print("All bots are persisted in SQLite DB, active in PAPER mode, and evaluating live feeds.")
    print("=======================================================================")

if __name__ == "__main__":
    deploy_fleet()
