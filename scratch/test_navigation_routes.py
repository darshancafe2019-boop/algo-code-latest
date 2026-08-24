import urllib.request
import urllib.error
import re
import sys
import time

ROUTES = [
    "/",
    "/dashboard",
    "/pnl",
    "/bots",
    "/crypto",
    "/trade-journal",
    "/risk",
    "/scanner",
    "/strategy-builder",
    "/system-health",
    "/watchlists",
    "/orderbook",
    "/positions",
]

def test_routes():
    print(f"Testing navigation across {len(ROUTES)} Quant.OS routes on port 3100...\n")
    success_count = 0
    failed_count = 0

    for route in ROUTES:
        url = f"http://127.0.0.1:3100{route}"
        t0 = time.perf_counter()
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 QuantOS-Tester"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                elapsed_ms = (time.perf_counter() - t0) * 1000
                html = resp.read().decode("utf-8")
                
                # Check for assets inside page
                scripts = re.findall(r'src="(/_next/[^"]+)"', html)
                css = re.findall(r'href="(/_next/[^"]+)"', html)
                assets = set(scripts + css)
                
                # Verify a sample of assets
                asset_errors = []
                for asset in assets:
                    try:
                        a_req = urllib.request.Request(f"http://127.0.0.1:3100{asset}", headers={"User-Agent": "Mozilla/5.0"})
                        with urllib.request.urlopen(a_req, timeout=5) as a_resp:
                            if a_resp.status != 200:
                                asset_errors.append(f"{asset} -> {a_resp.status}")
                    except Exception as e:
                        asset_errors.append(f"{asset} -> {e}")

                if asset_errors:
                    print(f"[-] {route:<20} HTTP {resp.status} ({elapsed_ms:.0f}ms) - ASSET ERRORS: {asset_errors}")
                    failed_count += 1
                else:
                    print(f"[+] {route:<20} HTTP {resp.status} ({elapsed_ms:.0f}ms) - {len(assets)} assets OK ({len(html)} bytes)")
                    success_count += 1

        except urllib.error.HTTPError as he:
            elapsed_ms = (time.perf_counter() - t0) * 1000
            print(f"[-] {route:<20} HTTP {he.code} ({elapsed_ms:.0f}ms) - {he.reason}")
            failed_count += 1
        except Exception as e:
            elapsed_ms = (time.perf_counter() - t0) * 1000
            print(f"[-] {route:<20} FAILED ({elapsed_ms:.0f}ms) - {e}")
            failed_count += 1

    print(f"\n========================================================")
    print(f"NAVIGATION AUDIT SUMMARY: {success_count}/{len(ROUTES)} PASSED (Failed: {failed_count})")
    print(f"========================================================")
    
    if failed_count > 0:
        sys.exit(1)

if __name__ == "__main__":
    test_routes()
