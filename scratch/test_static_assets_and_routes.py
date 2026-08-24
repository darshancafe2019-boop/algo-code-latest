#!/usr/bin/env python3
"""
Verify Static Assets and Frontend Pages
=======================================
1. Fetches root page from http://127.0.0.1:3100/
2. Extracts all linked JS scripts, CSS stylesheets, and /_next/static/* assets
3. Requests each asset and asserts HTTP 200 OK (ensuring ZERO 503 errors)
4. Checks /api/health, /api/status, /api/bots, /api/market/providers/health
"""

import re
import sys
import urllib.request
import urllib.error

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

def test_static_assets():
    print("\n" + "=" * 70)
    print("  VERIFYING FRONTEND STATIC ASSETS (JS/CSS/CHUNKS) ON PORT 3100")
    print("=" * 70 + "\n")

    base_url = "http://127.0.0.1:3100"

    # 1. Fetch HTML page
    print(f"[*] Fetching HTML from {base_url}/ ...")
    req = urllib.request.Request(f"{base_url}/", headers={"User-Agent": "StaticAssetTester/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=45.0) as res:
            assert res.status == 200
            html = res.read().decode("utf-8")
            print(f"  [PASS] {base_url}/ -> HTTP {res.status} ({len(html)} bytes)")
    except Exception as e:
        print(f"  [FAIL] Failed to fetch root HTML: {e}")
        return False

    # 2. Extract script sources and stylesheet links
    scripts = re.findall(r'<script[^>]+src=["\']([^"\']+)["\']', html)
    styles = re.findall(r'<link[^>]+rel=["\']stylesheet["\'][^>]+href=["\']([^"\']+)["\']', html)
    styles_alt = re.findall(r'<link[^>]+href=["\']([^"\']+)["\'][^>]+rel=["\']stylesheet["\']', html)
    all_assets = list(set(scripts + styles + styles_alt))

    print(f"\n[*] Found {len(all_assets)} static assets referenced in HTML:")
    all_passed = True
    for asset_path in all_assets:
        full_url = asset_path if asset_path.startswith("http") else f"{base_url}{asset_path}"
        try:
            areq = urllib.request.Request(full_url, headers={"User-Agent": "StaticAssetTester/1.0"})
            with urllib.request.urlopen(areq, timeout=5.0) as ares:
                content_type = ares.headers.get("Content-Type", "")
                is_200 = ares.status == 200
                if is_200:
                    print(f"  [PASS] {asset_path:<55} -> HTTP {ares.status} ({content_type})")
                else:
                    print(f"  [FAIL] {asset_path:<55} -> HTTP {ares.status}")
                    all_passed = False
        except Exception as e:
            print(f"  [FAIL] {asset_path:<55} -> Error: {e}")
            all_passed = False

    # 3. Test API probes
    print("\n[*] Testing core API endpoints:")
    api_endpoints = [
        "/api/health",
        "/api/status",
        "/api/bots",
        "/api/market/providers/health"
    ]
    for ep in api_endpoints:
        url = f"{base_url}{ep}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "StaticAssetTester/1.0"})
            with urllib.request.urlopen(req, timeout=15.0) as res:
                if res.status == 200:
                    print(f"  [PASS] {ep:<55} -> HTTP {res.status}")
                else:
                    print(f"  [FAIL] {ep:<55} -> HTTP {res.status}")
                    all_passed = False
        except Exception as e:
            print(f"  [FAIL] {ep:<55} -> Error: {e}")
            all_passed = False

    print("\n" + "=" * 70)
    if all_passed:
        print("  [OK] ALL STATIC ASSETS (JS/CSS/CHUNKS) & APIs RETURNED 200 OK!")
    else:
        print("  [WARN] Some assets or APIs failed verification.")
    print("=" * 70 + "\n")
    return all_passed

if __name__ == "__main__":
    ok = test_static_assets()
    sys.exit(0 if ok else 1)
