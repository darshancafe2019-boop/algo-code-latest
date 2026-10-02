"""
End-to-End Paper Trading Execution Verification for Options and Futures.
"""
import os
import sys
from datetime import date, datetime, timezone
import pandas as pd

sys.path.insert(0, os.getcwd())

from src.instrument_resolver import (
    global_instrument_resolver,
    resolve_signal_and_execution_instruments,
    validate_contract_expiry,
    OptionContractNormalizer,
    FuturesResolver,
)
from src.pnl_engine import compute_unrealized_pnl, compute_authoritative_pnl
from src.live_runner import LiveRunner
from src import db

def test_e2e_option_bot():
    print("--- [E2E TEST 1: Option Bot Execution & P&L] ---")
    market_date = date(2026, 9, 27)

    # 1. Resolve instruments
    opt_symbol = "BTC 27-09-2026 84200 PE"
    sig_inst, exec_inst = resolve_signal_and_execution_instruments(opt_symbol)
    print(f"  ✓ Signal Instrument:    {sig_inst.canonical_symbol} ({sig_inst.instrument_type.value})")
    print(f"  ✓ Execution Instrument: {exec_inst.canonical_symbol} (Strike: {exec_inst.strike}, Type: {exec_inst.option_type})")
    
    assert sig_inst.canonical_symbol == "BTC/USDT"
    assert exec_inst.strike == 84200.0

    # 2. Expiry validation
    is_valid, code, exp_d = validate_contract_expiry(exec_inst, market_date=market_date)
    print(f"  ✓ Contract Validity:    {is_valid} (Code: {code}, Expiry: {exp_d})")
    assert is_valid is True

    # 3. Premium fetch (never underlying spot 84912)
    underlying_spot = 84912.00
    runner = LiveRunner(bot_id="bot_eyug52w")
    premium = runner.get_execution_live_quote(exec_inst, fallback_price=underlying_spot)
    print(f"  ✓ Live Option Premium:  ${premium:,.2f} (Underlying Spot: ${underlying_spot:,.2f})")
    assert premium < underlying_spot  # Must be option premium, not spot price!

    # 4. Position P&L tracking based on Option Premium
    entry_premium = 350.00
    current_premium = 420.00
    quantity = 1.0
    upnl = compute_unrealized_pnl("LONG", entry_premium, current_premium, quantity, currency="USD")
    print(f"  ✓ Option Position PnL:  {upnl['unrealized_pnl']:+.2f} {upnl['currency']} (Entry: ${entry_premium}, Current: ${current_premium})")
    assert upnl["unrealized_pnl"] == 70.00
    assert upnl["currency"] == "USD"
    print("  ✓ Option Bot E2E flow verified successfully.\n")


def test_e2e_futures_bot():
    print("--- [E2E TEST 2: Futures Bot Execution & P&L] ---")
    market_date = date(2026, 9, 27)

    # 1. Resolve futures contract
    fut_symbol = "NIFTY FUT 29 SEP 26"
    sig_inst, exec_inst = resolve_signal_and_execution_instruments(fut_symbol)
    print(f"  ✓ Signal Instrument:    {sig_inst.canonical_symbol}")
    print(f"  ✓ Execution Instrument: {exec_inst.canonical_symbol} (Exchange: {exec_inst.exchange})")

    # 2. Expiry validation
    is_valid, code, exp_d = validate_contract_expiry(exec_inst, market_date=market_date)
    print(f"  ✓ Contract Validity:    {is_valid} (Expiry: {exp_d})")
    assert is_valid is True

    # 3. Futures P&L in INR
    entry_price = 24942.39
    live_price = 24985.98
    quantity = 4.0
    upnl = compute_unrealized_pnl("LONG", entry_price, live_price, quantity, currency="INR")
    print(f"  ✓ Futures Position PnL: {upnl['unrealized_pnl']:+.2f} {upnl['currency']} (Live: {live_price}, Entry: {entry_price})")
    assert upnl["unrealized_pnl"] == 174.36
    assert upnl["currency"] == "INR"
    print("  ✓ Futures Bot E2E flow verified successfully.\n")


if __name__ == "__main__":
    test_e2e_option_bot()
    test_e2e_futures_bot()
    print("=== ALL E2E PAPER EXECUTION TESTS PASSED! ===")
