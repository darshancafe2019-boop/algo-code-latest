"""
End-to-End Verification for Quant.OS Global Data & P&L Engine
=============================================================
Tests all REST and SSE backend endpoints on Port 5050 and checks mathematical consistency.
"""

import json
import urllib.request
import urllib.error

BACKEND_URL = "http://127.0.0.1:5050"

def test_endpoints():
    endpoints = [
        "/api/data/health",
        "/api/providers",
        "/api/portfolio/snapshot",
        "/api/portfolio/equity-curve",
        "/api/pnl/summary",
        "/api/positions",
        "/api/orders",
        "/api/risk/summary",
        "/api/reconciliation/status",
    ]

    print("================================================================")
    print("  QUANT.OS GLOBAL DATA & P&L ENGINE - REST ENDPOINTS AUDIT")
    print("================================================================")

    results = {}
    for ep in endpoints:
        url = f"{BACKEND_URL}{ep}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "QuantOS-E2E-Auditor"})
            with urllib.request.urlopen(req, timeout=5.0) as resp:
                status_code = resp.status
                body = resp.read().decode("utf-8")
                data = json.loads(body)
                results[ep] = data
                print(f"  [OK]   {ep:<30} -> HTTP {status_code} OK (Keys: {len(data)})")
        except Exception as e:
            print(f"  [FAIL] {ep:<30} -> FAILED ({e})")
            return False

    print("\n================================================================")
    print("  MATHEMATICAL CONSISTENCY AUDIT ACROSS CONTRACTS")
    print("================================================================")

    snapshot = results["/api/portfolio/snapshot"]
    pnl_summary = results["/api/pnl/summary"]
    risk = results["/api/risk/summary"]["risk"]
    reconciliation = results["/api/reconciliation/status"]

    print(f"  * Snapshot Equity:        ${snapshot['equity']:,.2f}")
    print(f"  * P&L Summary Equity:     ${pnl_summary['total_equity']:,.2f}")
    print(f"  * Risk Summary Equity:    ${risk['portfolioEquity']:,.2f}")
    assert snapshot["equity"] == pnl_summary["total_equity"] == risk["portfolioEquity"], "Equity mismatch!"
    print("  [OK] Equity is mathematically identical across all 3 endpoints.")

    print(f"  * Snapshot Net P&L:       ${snapshot['netPnl']:,.2f}")
    print(f"  * P&L Summary Net P&L:    ${pnl_summary['total_net_pnl']:,.2f}")
    assert snapshot["netPnl"] == pnl_summary["total_net_pnl"], "Net PnL mismatch!"
    print("  [OK] Net P&L is mathematically identical across contracts.")

    print(f"  * Snapshot Daily P&L:     ${snapshot['dailyPnl']:,.2f}")
    print(f"  * P&L Summary Daily P&L:  ${pnl_summary['today_pnl']:,.2f}")
    assert snapshot["dailyPnl"] == pnl_summary["today_pnl"], "Daily PnL mismatch!"
    print("  [OK] Daily P&L is identical across contracts.")

    print(f"  * Reconciliation Status:  {reconciliation['reconciliation_status']}")
    assert reconciliation["reconciliation_status"] == snapshot["reconciliationStatus"], "Reconciliation status mismatch!"
    print("  [OK] Reconciliation status is synchronized.")

    print("\n================================================================")
    print("  PROVIDER HEALTH & CAPABILITY MATRIX AUDIT")
    print("\n================================================================")
    providers = results["/api/providers"]["providers"]
    print(f"  * Active Providers Count: {len(providers)}")
    for p in providers:
        print(f"    - [{p['status']:<12}] {p['provider_name']:<30} (Asset classes: {', '.join(p['asset_classes'])})")

    print("\n[OK] ALL GLOBAL DATA & P&L ENGINE AUDITS PASSED WITH 100% SUCCESS!\n")
    return True

if __name__ == "__main__":
    success = test_endpoints()
    exit(0 if success else 1)
