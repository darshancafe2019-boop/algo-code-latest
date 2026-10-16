"""
QUANT.OS — REAL-TIME MULTI-MARKET BOT FLEET MONITOR
===================================================
Institutional console terminal monitor for tracking all quantitative trading bots across:
- 🇮🇳 Indian Markets (NSE Equity, NSE F&O Options/Futures, MCX Commodities) in ₹ INR
- 🇺🇸 US & Global Crypto Markets (NASDAQ/NYSE Equities, Crypto Spot/Perp/Options) in $ USD

Usage:
  python scripts/monitor_fleet.py          # Single snapshot view
  python scripts/monitor_fleet.py --watch  # Continuous live refresh (3s)
  python scripts/monitor_fleet.py --india  # Indian market bots only
  python scripts/monitor_fleet.py --us     # US & Crypto bots only
"""

import os
import sys
import time
import argparse
from pathlib import Path
from datetime import datetime

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

import logging
logging.getLogger().setLevel(logging.WARNING)
for _h in logging.root.handlers:
    _h.setLevel(logging.WARNING)

from src.bot_wizard_service import list_bots


def format_inr(val: float) -> str:
    sign = "+" if val > 0 else ("-" if val < 0 else " ")
    abs_v = abs(val)
    return f"{sign}₹{abs_v:,.2f}"


def format_usd(val: float) -> str:
    sign = "+" if val > 0 else ("-" if val < 0 else " ")
    abs_v = abs(val)
    return f"{sign}${abs_v:,.2f}"


def is_indian_bot(b: dict) -> bool:
    curr = str(b.get("currency") or b.get("pnl", {}).get("currency") or "").upper()
    if curr in ("INR", "₹"):
        return True
    if curr in ("USD", "$"):
        return False
    mkt = str(b.get("market", {}).get("market_type") or b.get("market_type") or "").upper()
    if any(k in mkt for k in ("INDIA", "NSE", "BSE", "MCX")):
        return True
    sym = str(b.get("symbol") or b.get("name") or "").upper()
    if any(k in sym for k in ("NIFTY", "BANKNIFTY", "RELIANCE", "TCS", "HDFCBANK", "INFY", "CRUDEOIL", "GOLD")):
        return True
    return False


def render_fleet_screen(filter_mode: str = "ALL"):
    bots = list_bots()

    indian_bots = [b for b in bots if is_indian_bot(b)]
    us_bots = [b for b in bots if not is_indian_bot(b)]

    ind_net = sum(float(b.get("pnl", {}).get("net_pnl") or 0.0) for b in indian_bots)
    ind_real = sum(float(b.get("pnl", {}).get("realized_pnl") or 0.0) for b in indian_bots)
    ind_unreal = sum(float(b.get("pnl", {}).get("unrealized_pnl") or 0.0) for b in indian_bots)
    ind_fees = sum(float(b.get("pnl", {}).get("fees") or 0.0) for b in indian_bots)
    ind_live = sum(1 for b in indian_bots if str(b.get("status")).upper() == "RUNNING")
    ind_pos = sum(int(b.get("positions_count") or 0) for b in indian_bots)

    us_net = sum(float(b.get("pnl", {}).get("net_pnl") or 0.0) for b in us_bots)
    us_real = sum(float(b.get("pnl", {}).get("realized_pnl") or 0.0) for b in us_bots)
    us_unreal = sum(float(b.get("pnl", {}).get("unrealized_pnl") or 0.0) for b in us_bots)
    us_fees = sum(float(b.get("pnl", {}).get("fees") or 0.0) for b in us_bots)
    us_live = sum(1 for b in us_bots if str(b.get("status")).upper() == "RUNNING")
    us_pos = sum(int(b.get("positions_count") or 0) for b in us_bots)

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    print("\033[2J\033[H", end="") if sys.stdout.isatty() else None
    print("=" * 110)
    print(f" QUANT.OS — REAL-TIME TRADING BOT FLEET COMMAND MONITOR           [Timestamp: {now_str}]")
    print("=" * 110)

    # Dual PnL KPI Overview Bar
    print(f" 🇮🇳 INDIAN MARKET FLEET  : Net P&L: {format_inr(ind_net):<16} | Realized: {format_inr(ind_real):<14} | Unreal: {format_inr(ind_unreal):<14} | Active: {ind_live}/{len(indian_bots)} Bots | Pos: {ind_pos}")
    print(f" 🇺🇸 US & CRYPTO FLEET    : Net P&L: {format_usd(us_net):<16} | Realized: {format_usd(us_real):<14} | Unreal: {format_usd(us_unreal):<14} | Active: {us_live}/{len(us_bots)} Bots | Pos: {us_pos}")
    print("-" * 110)

    def print_bot_table(title: str, bot_list: list, currency_sym: str):
        print(f"\n >>> {title} ({len(bot_list)} Bots Registered):")
        print(f" {'BOT ID':<14} {'SYMBOL / INSTRUMENT':<26} {'STRATEGY TYPE':<26} {'STATUS':<9} {'POS':<5} {'NET P&L':<14} {'REALIZED':<12}")
        print(" " + "-" * 108)

        for b in bot_list:
            bid = b.get("id", "N/A")
            sym = (b.get("market", {}).get("symbol") or b.get("symbol") or "N/A")[:24]
            strat = (b.get("strategy", {}).get("type") or "Strategy")[:24]
            stat = str(b.get("status", "STOPPED")).upper()
            pos = int(b.get("positions_count") or 0)
            pnl_data = b.get("pnl") or {}
            net_v = float(pnl_data.get("net_pnl") or 0.0)
            real_v = float(pnl_data.get("realized_pnl") or 0.0)

            net_str = f"{'+' if net_v > 0 else ('-' if net_v < 0 else ' ')}{currency_sym}{abs(net_v):,.2f}"
            real_str = f"{'+' if real_v > 0 else ('-' if real_v < 0 else ' ')}{currency_sym}{abs(real_v):,.2f}"

            stat_color = stat
            print(f" {bid:<14} {sym:<26} {strat:<26} {stat_color:<9} {pos:<5} {net_str:<14} {real_str:<12}")

    if filter_mode in ("ALL", "INDIA"):
        print_bot_table("🇮🇳 INDIAN MARKET BOTS (NSE Equity, F&O Options/Futures, MCX)", indian_bots, "₹")

    if filter_mode in ("ALL", "US"):
        print_bot_table("🇺🇸 US & GLOBAL CRYPTO BOTS (NASDAQ/NYSE Stocks, Crypto Spot, Perpetuals, Options)", us_bots, "$")

    print("\n" + "=" * 110)
    print(" [TIPS] Monitor in UI at: http://localhost:3100/bots  |  Interactive Terminals, Start/Pause/Stop, Risk Controls")
    print("=" * 110)


def main():
    parser = argparse.ArgumentParser(description="QuantOS Real-Time Bot Fleet Monitor")
    parser.add_argument("--watch", action="store_true", help="Continuously poll and refresh every 3 seconds")
    parser.add_argument("--india", action="store_true", help="Display only Indian market bots (INR ₹)")
    parser.add_argument("--us", action="store_true", help="Display only US and Crypto market bots (USD $)")
    args = parser.parse_args()

    mode = "INDIA" if args.india else ("US" if args.us else "ALL")

    if args.watch:
        try:
            while True:
                render_fleet_screen(mode)
                time.sleep(3)
        except KeyboardInterrupt:
            print("\nFleet monitor exited.")
    else:
        render_fleet_screen(mode)


if __name__ == "__main__":
    main()
