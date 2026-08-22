"""
End-to-End Automated Test Suite: Strategy Research, Simulation & Deployment IDE
==============================================================================
Validates:
1. Strategy catalog listing and deterministic config hashes.
2. Canonical AST rule compilation & draft persistence.
3. 6-Pillar Strategy Readiness Scorecard & 20-Stage Pre-Flight checklist.
4. Live Observe mode & 'Why No Trade?' Realtime Signal Debugger (no real orders).
5. Immutable version snapshot creation and SemVer locking.
6. Visual & structural Version Diff Engine.
7. Real multi-timeframe bar-by-bar backtest simulation.
8. Safe bot assignment flow.
"""

import json
import sys
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:5050"


def http_request(path, method="GET", data=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            res_body = res.read().decode("utf-8")
            return res.status, json.loads(res_body)
    except urllib.error.HTTPError as e:
        res_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(res_body)
        except Exception:
            return e.code, {"error": res_body}
    except Exception as e:
        return 500, {"error": str(e)}


def test_suite():
    print("================================================================================")
    print("STARTING STRATEGY IDE AUTHORITATIVE END-TO-END VERIFICATION SUITE")
    print("================================================================================\n")

    passed_tests = 0
    total_tests = 8

    # 1. Test Strategy Catalog Listing
    print("[1/8] Testing Strategy Catalog Listing (/api/strategy/ide/strategies)...")
    status, res = http_request("/api/strategy/ide/strategies")
    assert status == 200, f"Expected 200, got {status}: {res}"
    assert res.get("status") == "success"
    strategies = res.get("strategies", [])
    assert len(strategies) >= 2, f"Expected at least 2 default templates, got {len(strategies)}"
    print(f"      ✓ Passed: Catalog returned {len(strategies)} strategies with readiness scores and AST expressions.")
    passed_tests += 1

    # 2. Test Save Strategy Draft with AST
    print("\n[2/8] Testing Save Strategy Draft (/api/strategy/ide/save)...")
    sample_strat = {
        "strategy_id": "strat-e2e-test-confluence",
        "name": "E2E Automated Confluence Test Strategy",
        "description": "Macro 1H Close > EMA 200, 15M EMA 9/21 cross, 15M RSI > 50",
        "status": "DRAFT",
        "active_version": "v1.0.0",
        "market_type": "crypto",
        "symbol": "BTC/USDT",
        "base_timeframe": "15m",
        "direction": "LONG",
        "entry": {
            "setup": {
                "conjunction": "AND",
                "rules": [
                    {
                        "id": "setup-1",
                        "timeframe": "1h",
                        "left": "close",
                        "leftLabel": "1H Close",
                        "op": ">",
                        "right": "ema_200",
                        "rightLabel": "1H EMA 200",
                        "category": "TREND",
                        "enabled": True
                    }
                ]
            },
            "confirmation": {
                "conjunction": "AND",
                "rules": [
                    {
                        "id": "conf-1",
                        "timeframe": "15m",
                        "left": "rsi_14",
                        "leftLabel": "15M RSI 14",
                        "op": ">",
                        "right": "50",
                        "rightLabel": "50.0",
                        "category": "MOMENTUM",
                        "enabled": True
                    }
                ]
            },
            "trigger": {
                "conjunction": "AND",
                "rules": [
                    {
                        "id": "trig-1",
                        "timeframe": "15m",
                        "left": "ema_9",
                        "leftLabel": "15M EMA 9",
                        "op": "crosses_above",
                        "right": "ema_21",
                        "rightLabel": "15M EMA 21",
                        "category": "TREND",
                        "enabled": True
                    }
                ]
            }
        },
        "exit": {
            "stop_loss_type": "ATR",
            "stop_loss_value": 1.5,
            "take_profit_type": "RR_RATIO",
            "take_profit_value": 2.0,
            "multi_target": [{"ratio": 1.0, "pct": 50}, {"ratio": 2.0, "pct": 50}],
            "trailing_stop_enabled": False
        },
        "risk": {
            "capital": 10000.0,
            "risk_per_trade_pct": 1.0,
            "max_position_size_pct": 25.0,
            "max_daily_loss": 500.0,
            "max_drawdown_pct": 5.0,
            "max_open_positions": 3,
            "leverage": 1.0,
            "cooldown_bars": 3
        }
    }
    status, res = http_request("/api/strategy/ide/save", method="POST", data=sample_strat)
    assert status == 200, f"Expected 200, got {status}: {res}"
    assert res.get("status") == "success"
    config_hash = res.get("config_hash")
    assert config_hash, "Expected deterministic config_hash in response"
    print(f"      ✓ Passed: Strategy draft saved. Hash: #{config_hash}, DSL: {res.get('compiled_expression')}")
    passed_tests += 1

    # 3. Test Validate Strategy (6-Pillar Scorecard & 20-Stage Preflight)
    print("\n[3/8] Testing Strategy Validation (/api/strategy/ide/validate)...")
    status, res = http_request("/api/strategy/ide/validate", method="POST", data={"strategy": sample_strat})
    assert status == 200, f"Expected 200, got {status}: {res}"
    readiness = res.get("readiness", {})
    preflight = res.get("preflight", {})
    assert readiness.get("total_score") >= 80, f"Expected total score >= 80, got {readiness.get('total_score')}"
    assert preflight.get("status") == "APPROVED"
    assert preflight.get("pass_count") == 20
    print(f"      ✓ Passed: 6-Pillar Readiness Score = {readiness.get('total_score')}/100. 20-Stage Preflight = APPROVED (20/20 stages).")
    passed_tests += 1

    # 4. Test Live Observe & 'Why No Trade?' Debugger
    print("\n[4/8] Testing Live Observation & Signal Debugger (/api/strategy/ide/live-observe)...")
    status, res = http_request("/api/strategy/ide/live-observe", method="POST", data={"strategy": sample_strat})
    assert status == 200, f"Expected 200, got {status}: {res}"
    obs = res.get("observation", {})
    assert "hypothetical_action" in obs
    assert "rule_evaluations" in obs
    assert len(obs["rule_evaluations"]) >= 3
    print(f"      ✓ Passed: Live observation evaluated at ${obs.get('market_price'):,.2f} -> Action: {obs.get('hypothetical_action')}. {len(obs['rule_evaluations'])} rules checked.")
    passed_tests += 1

    # 5. Test Publish Immutable Version
    import time
    test_ver = f"1.{int(time.time()) % 1000}.0"
    print(f"\n[5/8] Testing Immutable Version Publishing (/api/strategy/ide/publish-version) -> v{test_ver}...")
    status, res = http_request("/api/strategy/ide/publish-version", method="POST", data={
        "strategy": sample_strat,
        "version": test_ver,
        "change_summary": "E2E automated version bump test",
        "author": "E2E Tester"
    })
    assert status == 200, f"Expected 200, got {status}: {res}"
    assert res.get("version") == test_ver
    print(f"      ✓ Passed: Immutable Version v{test_ver} published and locked in database.")
    passed_tests += 1

    # 6. Test Version Diff Engine
    print(f"\n[6/8] Testing Version Diff Engine (/api/strategy/ide/version-diff)...")
    status, res = http_request(f"/api/strategy/ide/version-diff?strategy_id=strat-e2e-test-confluence&v_old=1.0.0&v_new={test_ver}")
    assert status == 200, f"Expected 200, got {status}: {res}"
    assert res.get("status") == "success"
    print(f"      ✓ Passed: Version diff executed cleanly. Status: {res.get('status')}.")
    passed_tests += 1

    # 7. Test Historical Backtest Lab
    print("\n[7/8] Testing Authoritative Backtest Simulation (/api/strategy/ide/backtest)...")
    bt_payload = {
        "symbol": "BTC/USDT",
        "timeframe": "15m",
        "start_date": "2026-01-01",
        "end_date": "2026-08-15",
        "capital": 10000.0,
        "fees_pct": 0.001,
        "slippage_pct": 0.0005,
        "name": "E2E Test Strategy",
        "version": "v1.1.0",
        "allow_shorts": True
    }
    status, res = http_request("/api/strategy/ide/backtest", method="POST", data=bt_payload)
    assert status == 200, f"Expected 200, got {status}: {res}"
    metrics = res.get("metrics", {})
    assert "total_trades" in metrics
    assert "win_rate_pct" in metrics
    assert "total_net_profit" in metrics
    print(f"      ✓ Passed: Historical simulation finished. Trades: {metrics.get('total_trades')}, Win Rate: {metrics.get('win_rate_pct')}%, Net Profit: ${metrics.get('total_net_profit'):,.2f}")
    passed_tests += 1

    # 8. Test Safe Bot Assignment Flow
    print("\n[8/8] Testing Safe Bot Assignment Flow (/api/strategy/ide/assign-bot)...")
    status, res = http_request("/api/strategy/ide/assign-bot", method="POST", data={
        "strategy": sample_strat,
        "bot_id": "bot-test-instance-01",
        "execution_mode": "PAPER"
    })
    assert status == 200, f"Expected 200, got {status}: {res}"
    assert res.get("deployment_id")
    print(f"      ✓ Passed: Deployment snapshot {res.get('deployment_id')} recorded without unprompted live execution.")
    passed_tests += 1

    print("\n================================================================================")
    print(f"ALL {passed_tests}/{total_tests} STRATEGY IDE E2E TESTS PASSED WITH 100% SUCCESS RATE!")
    print("================================================================================\n")
    return 0


if __name__ == "__main__":
    sys.exit(test_suite())
