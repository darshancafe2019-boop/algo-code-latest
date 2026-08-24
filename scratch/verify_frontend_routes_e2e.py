"""
Frontend 23-Route Real Server Response Verification
===================================================
Queries all dashboard routes against http://localhost:3100 and verifies HTTP 200 responses.
"""

import urllib.request
import urllib.error

FRONTEND_URL = "http://localhost:3100"

ROUTES = [
    ("/", "Home Dashboard"),
    ("/pnl", "P&L Performance Analytics"),
    ("/positions", "Positions Ledger"),
    ("/orders", "Order Execution & History"),
    ("/risk", "Risk Management Hub"),
    ("/intelligence", "AI Intelligence Workspace"),
    ("/trade-journal", "Trade Journal"),
    ("/providers", "Provider Capability Matrix"),
    ("/system-health", "System Health Telemetry"),
    ("/scanner", "Market Scanner"),
    ("/bots", "Bot Control Center"),
    ("/bots/create", "Bot Create Modal"),
    ("/strategies", "Strategy Catalog"),
    ("/strategy-builder", "Strategy Builder IDE"),
    ("/options", "Options Terminal"),
    ("/option-chain", "Option Chain Viewer"),
    ("/crypto", "Crypto Command Hub"),
    ("/crypto/futures", "Crypto Futures Terminal"),
    ("/crypto/options", "Crypto Options Hub"),
    ("/crypto/options-chain", "Crypto Options Chain"),
    ("/alerts", "Alerts & Notifications"),
    ("/logs", "Audit Logs & Error Ledger"),
    ("/settings", "Terminal Settings"),
    ("/watchlists", "Market Watchlists"),
]

def audit_all_routes():
    print("================================================================")
    print("  QUANT.OS FRONTEND 24-ROUTE AUDIT (http://localhost:3100)")
    print("================================================================")

    passed = 0
    for path, name in ROUTES:
        url = f"{FRONTEND_URL}{path}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "QuantOS-Page-Auditor"})
            with urllib.request.urlopen(req, timeout=10.0) as resp:
                status = resp.status
                html = resp.read().decode("utf-8")
                if status == 200 and len(html) > 500:
                    print(f"  [OK] (200) {name:<30} -> {path}")
                    passed += 1
                else:
                    print(f"  [WARN] ({status}) {name:<30} -> {path} (Length: {len(html)})")
        except Exception as e:
            print(f"  [FAIL] {name:<30} -> {path} ({e})")

    print("\n================================================================")
    print(f"  RESULT: {passed}/{len(ROUTES)} frontend routes verified successfully!")
    print("================================================================\n")
    return passed == len(ROUTES)

if __name__ == "__main__":
    success = audit_all_routes()
    exit(0 if success else 1)
