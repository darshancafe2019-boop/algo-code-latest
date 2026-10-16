"""
QUANT.OS — COMPREHENSIVE MULTI-MARKET BOT FLEET SEEDER
======================================================
Deploys an institutional-grade quantitative trading bot fleet spanning:
1. Indian Equity Cash (NSE: RELIANCE, TCS, HDFCBANK, INFY) - [₹ INR]
2. Indian Index Derivatives (NSE F&O: NIFTY-FUT, BANKNIFTY-FUT, NIFTY 23200 CE, NIFTY 22800 PE, BANKNIFTY Straddle) - [₹ INR]
3. US Equities & ETFs (NASDAQ/NYSE: AAPL, TSLA, NVDA, SPY) - [$ USD]
4. Crypto Spot (Binance/Delta: BTC/USDT, ETH/USDT, SOL/USDT) - [$ USD]
5. Crypto Perpetual Futures (Binance/Delta: BTC-PERP, ETH-PERP) - [$ USD]
6. Crypto Options (Delta Exchange: C-BTC-86000, P-BTC-81000) - [$ USD]
7. Commodities Futures (MCX: CRUDEOIL-FUT, GOLD-FUT) - [₹ INR]

Spans all primary strategy archetypes:
- Trend Pullback to EMA
- Momentum Expansion & Breakout
- VWAP Mean Reversion Scalper
- Volatility Squeeze & Donchian Breakout
- Dynamic Arithmetic Grid & Market Making
- Volume Profile & Value Area Expansion
- Directional & Non-Directional Option Spreads
"""

import sys
import json
import uuid
import sqlite3
from pathlib import Path
from datetime import datetime, timezone, timedelta

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from src.bot_wizard_service import deploy_wizard_bot, _get_db_connection

FLEET_SPECS = [
    # ── 1. INDIAN EQUITIES (NSE) [INR ₹] ─────────────────────────────────────
    {
        "bot_name": "RELIANCE Trend Pullback Alpha",
        "underlying": "RELIANCE",
        "market_type": "INDIA_STOCK",
        "broker": "UPSTOX",
        "currency": "INR",
        "execution_mode": "PAPER",
        "timeframe": "5m",
        "contract": {
            "symbol": "NSE:RELIANCE",
            "instrument_id": "NSE:RELIANCE",
            "contract_type": "SPOT",
            "provider": "UPSTOX",
        },
        "trading_strategy": {
            "strategy_id": "STRAT_01",
            "strategy_name": "Trend Pullback to EMA",
            "category": "Trend",
            "compatible": True,
        },
        "risk": {
            "quantity": 10.0,
            "max_position_size": 25.0,
            "max_loss_per_trade": 1500.0,
            "max_daily_loss": 5000.0,
            "stop_loss_value": 1.5,
            "take_profit_value": 3.5,
            "trading_style": "INTRADAY",
        },
        "auto_start": True,
        "sample_pnl": {"realized": 3450.0, "unrealized": 1250.0, "fees": 64.20, "entry": 2980.50, "current": 3012.00, "qty": 10.0},
    },
    {
        "bot_name": "TCS Momentum Breakout Engine",
        "underlying": "TCS",
        "market_type": "INDIA_STOCK",
        "broker": "DHAN",
        "currency": "INR",
        "execution_mode": "PAPER",
        "timeframe": "15m",
        "contract": {
            "symbol": "NSE:TCS",
            "instrument_id": "NSE:TCS",
            "contract_type": "SPOT",
            "provider": "DHAN",
        },
        "trading_strategy": {
            "strategy_id": "STRAT_02",
            "strategy_name": "Momentum Expansion",
            "category": "Momentum",
            "compatible": True,
        },
        "risk": {
            "quantity": 8.0,
            "max_position_size": 16.0,
            "max_loss_per_trade": 2000.0,
            "max_daily_loss": 6000.0,
            "stop_loss_value": 1.2,
            "take_profit_value": 2.8,
            "trading_style": "INTRADAY",
        },
        "auto_start": True,
        "sample_pnl": {"realized": 2180.0, "unrealized": 840.0, "fees": 48.50, "entry": 4120.00, "current": 4145.50, "qty": 8.0},
    },
    {
        "bot_name": "HDFCBANK VWAP Mean Reversion",
        "underlying": "HDFCBANK",
        "market_type": "INDIA_STOCK",
        "broker": "UPSTOX",
        "currency": "INR",
        "execution_mode": "PAPER",
        "timeframe": "5m",
        "contract": {
            "symbol": "NSE:HDFCBANK",
            "instrument_id": "NSE:HDFCBANK",
            "contract_type": "SPOT",
            "provider": "UPSTOX",
        },
        "trading_strategy": {
            "strategy_id": "STRAT_05",
            "strategy_name": "VWAP Mean Reversion Scalper",
            "category": "Mean Reversion",
            "compatible": True,
        },
        "risk": {
            "quantity": 25.0,
            "max_position_size": 50.0,
            "max_loss_per_trade": 1200.0,
            "max_daily_loss": 4000.0,
            "stop_loss_value": 1.0,
            "take_profit_value": 2.0,
            "trading_style": "INTRADAY",
        },
        "auto_start": True,
        "sample_pnl": {"realized": 1820.0, "unrealized": -310.0, "fees": 36.80, "entry": 1680.00, "current": 1676.50, "qty": 25.0},
    },
    {
        "bot_name": "INFY Volatility Donchian Breakout",
        "underlying": "INFY",
        "market_type": "INDIA_STOCK",
        "broker": "DHAN",
        "currency": "INR",
        "execution_mode": "PAPER",
        "timeframe": "15m",
        "contract": {
            "symbol": "NSE:INFY",
            "instrument_id": "NSE:INFY",
            "contract_type": "SPOT",
            "provider": "DHAN",
        },
        "trading_strategy": {
            "strategy_id": "STRAT_03",
            "strategy_name": "Donchian Breakout Expansion",
            "category": "Breakout",
            "compatible": True,
        },
        "risk": {
            "quantity": 15.0,
            "max_position_size": 30.0,
            "max_loss_per_trade": 1500.0,
            "max_daily_loss": 4500.0,
            "stop_loss_value": 1.5,
            "take_profit_value": 3.0,
            "trading_style": "INTRADAY",
        },
        "auto_start": True,
        "sample_pnl": {"realized": 1450.0, "unrealized": 620.0, "fees": 32.10, "entry": 1910.00, "current": 1928.00, "qty": 15.0},
    },

    # ── 2. INDIAN INDEX DERIVATIVES (NSE F&O) [INR ₹] ─────────────────────────
    {
        "bot_name": "NIFTY-FUT Supertrend Trend Rider",
        "underlying": "NIFTY",
        "market_type": "INDIA_FUTURE",
        "broker": "UPSTOX",
        "currency": "INR",
        "execution_mode": "PAPER",
        "timeframe": "5m",
        "contract": {
            "symbol": "NSE:NIFTY-FUT",
            "instrument_id": "NSE:NIFTY-FUT",
            "contract_type": "FUTURE",
            "provider": "UPSTOX",
        },
        "trading_strategy": {
            "strategy_id": "STRAT_08",
            "strategy_name": "Supertrend Trend Rider",
            "category": "Trend",
            "compatible": True,
        },
        "risk": {
            "quantity": 50.0,
            "max_position_size": 100.0,
            "max_loss_per_trade": 3000.0,
            "max_daily_loss": 10000.0,
            "stop_loss_value": 0.8,
            "take_profit_value": 2.2,
            "trading_style": "INTRADAY",
        },
        "auto_start": True,
        "sample_pnl": {"realized": 8450.0, "unrealized": 3200.0, "fees": 128.50, "entry": 23040.00, "current": 23104.00, "qty": 50.0},
    },
    {
        "bot_name": "BANKNIFTY-FUT Opening Range Breakout",
        "underlying": "BANKNIFTY",
        "market_type": "INDIA_FUTURE",
        "broker": "DHAN",
        "currency": "INR",
        "execution_mode": "PAPER",
        "timeframe": "15m",
        "contract": {
            "symbol": "NSE:BANKNIFTY-FUT",
            "instrument_id": "NSE:BANKNIFTY-FUT",
            "contract_type": "FUTURE",
            "provider": "DHAN",
        },
        "trading_strategy": {
            "strategy_id": "STRAT_06",
            "strategy_name": "Opening Range Breakout (ORB)",
            "category": "Breakout",
            "compatible": True,
        },
        "risk": {
            "quantity": 30.0,
            "max_position_size": 60.0,
            "max_loss_per_trade": 4500.0,
            "max_daily_loss": 12000.0,
            "stop_loss_value": 1.0,
            "take_profit_value": 2.5,
            "trading_style": "INTRADAY",
        },
        "auto_start": True,
        "sample_pnl": {"realized": 6200.0, "unrealized": 1850.0, "fees": 142.00, "entry": 51200.00, "current": 51320.00, "qty": 30.0},
    },
    {
        "bot_name": "NIFTY 23200 CE Bull Call Spread",
        "underlying": "NIFTY",
        "market_type": "INDIA_OPTION",
        "broker": "UPSTOX",
        "currency": "INR",
        "execution_mode": "PAPER",
        "timeframe": "5m",
        "contract": {
            "symbol": "NIFTY 23200 CE",
            "instrument_id": "NSE:NIFTY-23200-CE",
            "contract_type": "OPTION",
            "provider": "UPSTOX",
            "strike": 23200.0,
            "expiry": "2026-10-22",
            "option_type": "CE",
        },
        "trading_strategy": {
            "strategy_id": "OPT_05",
            "strategy_name": "Bull Call Spread",
            "category": "Options Directional",
            "compatible": True,
        },
        "risk": {
            "quantity": 50.0,
            "max_position_size": 100.0,
            "max_loss_per_trade": 2500.0,
            "max_daily_loss": 7500.0,
            "stop_loss_value": 20.0,
            "take_profit_value": 45.0,
            "trading_style": "INTRADAY",
        },
        "auto_start": True,
        "sample_pnl": {"realized": 4350.0, "unrealized": 1650.0, "fees": 85.00, "entry": 142.50, "current": 165.20, "qty": 50.0},
    },
    {
        "bot_name": "NIFTY 22800 PE Bear Put Spread",
        "underlying": "NIFTY",
        "market_type": "INDIA_OPTION",
        "broker": "DHAN",
        "currency": "INR",
        "execution_mode": "PAPER",
        "timeframe": "5m",
        "contract": {
            "symbol": "NIFTY 22800 PE",
            "instrument_id": "NSE:NIFTY-22800-PE",
            "contract_type": "OPTION",
            "provider": "DHAN",
            "strike": 22800.0,
            "expiry": "2026-10-22",
            "option_type": "PE",
        },
        "trading_strategy": {
            "strategy_id": "OPT_06",
            "strategy_name": "Bear Put Spread",
            "category": "Options Directional",
            "compatible": True,
        },
        "risk": {
            "quantity": 50.0,
            "max_position_size": 100.0,
            "max_loss_per_trade": 2500.0,
            "max_daily_loss": 7500.0,
            "stop_loss_value": 25.0,
            "take_profit_value": 50.0,
            "trading_style": "INTRADAY",
        },
        "auto_start": True,
        "sample_pnl": {"realized": 3100.0, "unrealized": -450.0, "fees": 78.00, "entry": 115.00, "current": 108.50, "qty": 50.0},
    },

    # ── 3. US EQUITIES & ETFS (NASDAQ/NYSE) [USD $] ──────────────────────────
    {
        "bot_name": "AAPL Trend Pullback Alpha",
        "underlying": "AAPL",
        "market_type": "US_STOCK",
        "broker": "ALPACA",
        "currency": "USD",
        "execution_mode": "PAPER",
        "timeframe": "5m",
        "contract": {
            "symbol": "AAPL",
            "instrument_id": "NASDAQ:AAPL",
            "contract_type": "SPOT",
            "provider": "ALPACA",
        },
        "trading_strategy": {
            "strategy_id": "STRAT_01",
            "strategy_name": "Trend Pullback to EMA",
            "category": "Trend",
            "compatible": True,
        },
        "risk": {
            "quantity": 25.0,
            "max_position_size": 50.0,
            "max_loss_per_trade": 250.0,
            "max_daily_loss": 1000.0,
            "stop_loss_value": 1.2,
            "take_profit_value": 2.8,
            "trading_style": "INTRADAY",
        },
        "auto_start": True,
        "sample_pnl": {"realized": 420.50, "unrealized": 185.00, "fees": 4.50, "entry": 228.40, "current": 234.10, "qty": 25.0},
    },
    {
        "bot_name": "TSLA Volatility Squeeze Rider",
        "underlying": "TSLA",
        "market_type": "US_STOCK",
        "broker": "ALPACA",
        "currency": "USD",
        "execution_mode": "PAPER",
        "timeframe": "5m",
        "contract": {
            "symbol": "TSLA",
            "instrument_id": "NASDAQ:TSLA",
            "contract_type": "SPOT",
            "provider": "ALPACA",
        },
        "trading_strategy": {
            "strategy_id": "STRAT_02",
            "strategy_name": "Volatility Squeeze Breakout",
            "category": "Momentum",
            "compatible": True,
        },
        "risk": {
            "quantity": 15.0,
            "max_position_size": 30.0,
            "max_loss_per_trade": 350.0,
            "max_daily_loss": 1200.0,
            "stop_loss_value": 2.0,
            "take_profit_value": 5.0,
            "trading_style": "INTRADAY",
        },
        "auto_start": True,
        "sample_pnl": {"realized": 650.00, "unrealized": 245.00, "fees": 6.20, "entry": 218.00, "current": 224.20, "qty": 15.0},
    },
    {
        "bot_name": "NVDA Value Area Flow Expander",
        "underlying": "NVDA",
        "market_type": "US_STOCK",
        "broker": "ALPACA",
        "currency": "USD",
        "execution_mode": "PAPER",
        "timeframe": "15m",
        "contract": {
            "symbol": "NVDA",
            "instrument_id": "NASDAQ:NVDA",
            "contract_type": "SPOT",
            "provider": "ALPACA",
        },
        "trading_strategy": {
            "strategy_id": "STRAT_04",
            "strategy_name": "Volume Profile Value Area Expansion",
            "category": "Order Flow",
            "compatible": True,
        },
        "risk": {
            "quantity": 20.0,
            "max_position_size": 40.0,
            "max_loss_per_trade": 400.0,
            "max_daily_loss": 1500.0,
            "stop_loss_value": 1.5,
            "take_profit_value": 3.8,
            "trading_style": "INTRADAY",
        },
        "auto_start": True,
        "sample_pnl": {"realized": 580.00, "unrealized": 310.00, "fees": 5.80, "entry": 132.50, "current": 138.20, "qty": 20.0},
    },
    {
        "bot_name": "SPY VWAP Mean Reversion Scalper",
        "underlying": "SPY",
        "market_type": "US_STOCK",
        "broker": "ALPACA",
        "currency": "USD",
        "execution_mode": "PAPER",
        "timeframe": "5m",
        "contract": {
            "symbol": "SPY",
            "instrument_id": "NYSE:SPY",
            "contract_type": "SPOT",
            "provider": "ALPACA",
        },
        "trading_strategy": {
            "strategy_id": "STRAT_05",
            "strategy_name": "VWAP Mean Reversion Scalper",
            "category": "Mean Reversion",
            "compatible": True,
        },
        "risk": {
            "quantity": 30.0,
            "max_position_size": 60.0,
            "max_loss_per_trade": 300.0,
            "max_daily_loss": 1000.0,
            "stop_loss_value": 0.8,
            "take_profit_value": 1.8,
            "trading_style": "INTRADAY",
        },
        "auto_start": True,
        "sample_pnl": {"realized": 310.00, "unrealized": 95.00, "fees": 3.90, "entry": 582.00, "current": 585.10, "qty": 30.0},
    },

    # ── 4. CRYPTO SPOT (BINANCE/DELTA) [USD $] ───────────────────────────────
    {
        "bot_name": "BTC/USDT Dynamic Grid Scalper",
        "underlying": "BTC",
        "market_type": "CRYPTO_SPOT",
        "broker": "BINANCE",
        "currency": "USD",
        "execution_mode": "PAPER",
        "timeframe": "1m",
        "contract": {
            "symbol": "BTC/USDT",
            "instrument_id": "BINANCE:BTCUSDT",
            "contract_type": "SPOT",
            "provider": "BINANCE",
        },
        "trading_strategy": {
            "strategy_id": "STRAT_07",
            "strategy_name": "Dynamic Arithmetic Grid Scalper",
            "category": "Grid / Market Making",
            "compatible": True,
        },
        "risk": {
            "quantity": 0.05,
            "max_position_size": 0.25,
            "max_loss_per_trade": 150.0,
            "max_daily_loss": 800.0,
            "stop_loss_value": 2.5,
            "take_profit_value": 1.0,
            "trading_style": "GRID",
        },
        "auto_start": True,
        "sample_pnl": {"realized": 890.00, "unrealized": 120.00, "fees": 18.50, "entry": 84200.00, "current": 84650.00, "qty": 0.05},
    },
    {
        "bot_name": "ETH/USDT EMA Ribbon Trend Scalper",
        "underlying": "ETH",
        "market_type": "CRYPTO_SPOT",
        "broker": "BINANCE",
        "currency": "USD",
        "execution_mode": "PAPER",
        "timeframe": "5m",
        "contract": {
            "symbol": "ETH/USDT",
            "instrument_id": "BINANCE:ETHUSDT",
            "contract_type": "SPOT",
            "provider": "BINANCE",
        },
        "trading_strategy": {
            "strategy_id": "STRAT_01",
            "strategy_name": "EMA Ribbon Trend Scalper",
            "category": "Trend",
            "compatible": True,
        },
        "risk": {
            "quantity": 1.0,
            "max_position_size": 4.0,
            "max_loss_per_trade": 120.0,
            "max_daily_loss": 600.0,
            "stop_loss_value": 1.8,
            "take_profit_value": 3.8,
            "trading_style": "INTRADAY",
        },
        "auto_start": True,
        "sample_pnl": {"realized": 430.00, "unrealized": 85.00, "fees": 8.20, "entry": 2610.00, "current": 2645.00, "qty": 1.0},
    },
    {
        "bot_name": "SOL/USDT Momentum Squeeze Engine",
        "underlying": "SOL",
        "market_type": "CRYPTO_SPOT",
        "broker": "DELTA",
        "currency": "USD",
        "execution_mode": "PAPER",
        "timeframe": "5m",
        "contract": {
            "symbol": "SOL/USDT",
            "instrument_id": "DELTA:SOLUSDT",
            "contract_type": "SPOT",
            "provider": "DELTA",
        },
        "trading_strategy": {
            "strategy_id": "STRAT_02",
            "strategy_name": "Momentum Squeeze Breakout",
            "category": "Momentum",
            "compatible": True,
        },
        "risk": {
            "quantity": 10.0,
            "max_position_size": 30.0,
            "max_loss_per_trade": 150.0,
            "max_daily_loss": 700.0,
            "stop_loss_value": 2.2,
            "take_profit_value": 5.2,
            "trading_style": "INTRADAY",
        },
        "auto_start": True,
        "sample_pnl": {"realized": 320.00, "unrealized": 140.00, "fees": 6.50, "entry": 178.00, "current": 184.50, "qty": 10.0},
    },

    # ── 5. CRYPTO PERPETUAL FUTURES [USD $] ──────────────────────────────────
    {
        "bot_name": "BTC-PERP Supertrend 3x Momentum",
        "underlying": "BTC",
        "market_type": "CRYPTO_FUTURE",
        "broker": "DELTA",
        "currency": "USD",
        "execution_mode": "PAPER",
        "timeframe": "15m",
        "contract": {
            "symbol": "BTC-PERP",
            "instrument_id": "DELTA:BTC-PERP",
            "contract_type": "FUTURE",
            "provider": "DELTA",
        },
        "trading_strategy": {
            "strategy_id": "STRAT_08",
            "strategy_name": "Supertrend + MACD 3x Trend Follower",
            "category": "Trend",
            "compatible": True,
        },
        "risk": {
            "quantity": 0.1,
            "max_position_size": 0.3,
            "max_loss_per_trade": 300.0,
            "max_daily_loss": 1200.0,
            "stop_loss_value": 1.5,
            "take_profit_value": 4.5,
            "trading_style": "INTRADAY",
        },
        "auto_start": True,
        "sample_pnl": {"realized": 1250.00, "unrealized": 480.00, "fees": 24.50, "entry": 83900.00, "current": 84520.00, "qty": 0.1},
    },

    # ── 6. CRYPTO OPTIONS (DELTA EXCHANGE) [USD $] ───────────────────────────
    {
        "bot_name": "C-BTC-86000 Delta Gamma Velocity",
        "underlying": "BTC",
        "market_type": "CRYPTO_OPTION",
        "broker": "DELTA",
        "currency": "USD",
        "execution_mode": "PAPER",
        "timeframe": "5m",
        "contract": {
            "symbol": "C-BTC-86000-301026",
            "instrument_id": "DELTA:C-BTC-86000-301026",
            "contract_type": "OPTION",
            "provider": "DELTA",
            "strike": 86000.0,
            "expiry": "2026-10-30",
            "option_type": "CE",
        },
        "trading_strategy": {
            "strategy_id": "OPT_01",
            "strategy_name": "Long Call Momentum",
            "category": "Options Directional",
            "compatible": True,
        },
        "risk": {
            "quantity": 1.0,
            "max_position_size": 3.0,
            "max_loss_per_trade": 200.0,
            "max_daily_loss": 800.0,
            "stop_loss_value": 25.0,
            "take_profit_value": 60.0,
            "trading_style": "INTRADAY",
        },
        "auto_start": True,
        "sample_pnl": {"realized": 540.00, "unrealized": 210.00, "fees": 12.40, "entry": 420.00, "current": 495.00, "qty": 1.0},
    },

    # ── 7. COMMODITIES (MCX) [INR ₹] ─────────────────────────────────────────
    {
        "bot_name": "CRUDEOIL-FUT Donchian Trend Expansion",
        "underlying": "CRUDEOIL",
        "market_type": "MCX_FUTURE",
        "broker": "UPSTOX",
        "currency": "INR",
        "execution_mode": "PAPER",
        "timeframe": "15m",
        "contract": {
            "symbol": "MCX:CRUDEOIL-FUT",
            "instrument_id": "MCX:CRUDEOIL-FUT",
            "contract_type": "FUTURE",
            "provider": "UPSTOX",
        },
        "trading_strategy": {
            "strategy_id": "STRAT_03",
            "strategy_name": "Donchian Trend Expansion",
            "category": "Breakout",
            "compatible": True,
        },
        "risk": {
            "quantity": 1.0,
            "max_position_size": 2.0,
            "max_loss_per_trade": 2500.0,
            "max_daily_loss": 7500.0,
            "stop_loss_value": 1.5,
            "take_profit_value": 3.5,
            "trading_style": "INTRADAY",
        },
        "auto_start": True,
        "sample_pnl": {"realized": 4850.0, "unrealized": 1420.0, "fees": 95.00, "entry": 6120.00, "current": 6185.00, "qty": 1.0},
    },
]


def seed_fleet():
    print("=" * 80)
    print(" QUANT.OS - DEPLOYING INSTITUTIONAL MULTI-MARKET BOT FLEET")
    print("=" * 80)

    deployed_count = 0

    for idx, spec in enumerate(FLEET_SPECS, 1):
        name = spec["bot_name"]
        sym = spec["contract"]["symbol"]
        mkt = spec["market_type"]
        curr = spec["currency"]
        tag = "[INDIA-INR]" if curr == "INR" else "[GLOBAL-USD]"
        spec["auto_start"] = False

        print(f"[{idx:02d}/{len(FLEET_SPECS)}] Deploying {tag} {name} ({sym} | {mkt})...")
        try:
            res = deploy_wizard_bot(spec)
            bot_id = res.get("bot_id")
            deployed_count += 1

            # Seed sample positions & trades telemetry for monitoring
            sample = spec.get("sample_pnl")
            if sample and bot_id:
                pos_id = f"POS-{uuid.uuid4().hex[:8].upper()}"
                trade_id = f"TRD-{uuid.uuid4().hex[:8].upper()}"
                order_id = f"ORD-{uuid.uuid4().hex[:8].upper()}"
                now_ts = datetime.now(timezone.utc).isoformat()

                with _get_db_connection() as conn:
                    # 1. Active Open Position
                    conn.execute("""
                        INSERT OR REPLACE INTO positions (
                            id, bot_id, provider, symbol, instrument_id, direction,
                            quantity, average_entry_price, current_price,
                            realized_pnl, unrealized_pnl, total_pnl, opened_at, updated_at, metadata_json
                        ) VALUES (?, ?, ?, ?, ?, 'LONG', ?, ?, ?, ?, ?, ?, ?, ?, '{}')
                    """, (
                        pos_id, bot_id, spec["broker"], sym, sym,
                        sample["qty"], sample["entry"], sample["current"],
                        sample["realized"], sample["unrealized"], sample["realized"] + sample["unrealized"],
                        now_ts, now_ts
                    ))

                    # 2. Executed Trades
                    conn.execute("""
                        INSERT OR REPLACE INTO trades (
                            id, bot_id, order_id, provider_trade_id, provider,
                            symbol, side, quantity, price, fees, metadata_json, timestamp
                        ) VALUES (?, ?, ?, ?, ?, ?, 'BUY', ?, ?, ?, '{}', ?)
                    """, (
                        trade_id, bot_id, order_id, f"TXN-{uuid.uuid4().hex[:6].upper()}", spec["broker"],
                        sym, sample["qty"], sample["entry"], sample["fees"], now_ts
                    ))

                    # 3. Executed Orders
                    conn.execute("""
                        INSERT OR REPLACE INTO orders (
                            id, bot_id, client_order_id, provider, symbol, instrument_id,
                            side, order_type, quantity, filled_quantity, remaining_quantity,
                            price, average_fill_price, time_in_force, status, latency_ms,
                            metadata_json, created_at, submitted_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, 'BUY', 'MARKET', ?, ?, 0.0, ?, ?, 'IOC', 'FILLED', 14.2, '{}', ?, ?, ?)
                    """, (
                        order_id, bot_id, f"CLI-{uuid.uuid4().hex[:8].upper()}", spec["broker"], sym, sym,
                        sample["qty"], sample["qty"], sample["entry"], sample["entry"], now_ts, now_ts, now_ts
                    ))

                    # 4. Bot Event
                    conn.execute("""
                        INSERT INTO bot_events (id, event_type, severity, bot_id, message, payload, timestamp)
                        VALUES (?, 'ORDER_FILLED', 'INFO', ?, ?, '{}', ?)
                    """, (f"EVT-{uuid.uuid4().hex[:8].upper()}", bot_id, f"Market order filled: BUY {sample['qty']} {sym} @ {sample['entry']}", now_ts))

                    conn.commit()

            print(f"     -> [SUCCESS] ID: {bot_id} | Status: READY | Curr: {curr}")
        except Exception as e:
            print(f"     -> [ERROR] Failed to deploy {name}: {e}")

    print("\n" + "=" * 80)
    print(f" DEPLOYMENT COMPLETE: {deployed_count} BOTS REGISTERED AND READY FOR MONITORING")
    print("=" * 80)


if __name__ == "__main__":
    seed_fleet()
