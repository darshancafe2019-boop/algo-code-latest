"""
Standalone Executable Test Runner for Canonical Instrument Architecture.
"""
import os
import sys
from datetime import date

sys.path.insert(0, os.getcwd())

from tests.test_canonical_instruments_and_lifecycle import TestCanonicalInstrumentArchitecture

def run_all_tests():
    print("================================================================================")
    print("        RUNNING COMPLETE CANONICAL INSTRUMENTS & LIFECYCLE TEST SUITE          ")
    print("================================================================================")
    
    tester = TestCanonicalInstrumentArchitecture()
    market_date = date(2026, 9, 27)

    tests = [
        ("Canonical InstrumentRef Model", lambda: tester.test_canonical_instrument_ref_model()),
        ("NIFTY Option ISO Normalization", lambda: tester.test_nifty_option_iso_normalization(market_date)),
        ("NIFTY Option Short Normalization", lambda: tester.test_nifty_option_short_normalization(market_date)),
        ("Delta BTC Option Normalization", lambda: tester.test_delta_btc_option_normalization(market_date)),
        ("Expired BTC Option Rejection", lambda: tester.test_expired_btc_option_rejection(market_date)),
        ("Expired NIFTY Future Rejection", lambda: tester.test_expired_nifty_future_rejection(market_date)),
        ("Nearest Valid NIFTY Future Selection", lambda: tester.test_nearest_valid_nifty_future_selection(market_date)),
        ("Contract Rollover STRATEGY_RESOLVE", lambda: tester.test_contract_rollover_strategy_resolve(market_date)),
        ("Contract Rollover Blocked When NONE", lambda: tester.test_contract_rollover_blocked_when_none(market_date)),
        ("Signal vs Execution Separation", lambda: tester.test_signal_vs_execution_instrument_separation()),
        ("Strategy Asset Declarations", lambda: tester.test_strategy_asset_declarations()),
        ("Authoritative PnL Calculations & Currency", lambda: tester.test_authoritative_pnl_calculations()),
    ]

    passed = 0
    failed = 0
    for name, fn in tests:
        try:
            fn()
            print(f"  [PASS] {name}")
            passed += 1
        except Exception as e:
            print(f"  [FAIL] {name} -> {e}")
            failed += 1

    print("================================================================================")
    print(f"Total: {len(tests)} | Passed: {passed} | Failed: {failed}")
    print("================================================================================")
    assert failed == 0

if __name__ == "__main__":
    run_all_tests()
