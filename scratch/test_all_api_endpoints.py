import requests
import json
import sqlite3
import traceback
from dashboard import app

print("=== 1. CHECK DATABASE INTEGRITY ===")
try:
    conn = sqlite3.connect("data/quantos.db")
    cursor = conn.cursor()
    integrity = cursor.execute("PRAGMA integrity_check;").fetchall()
    print("SQLite integrity check:", integrity)
    tables = [r[0] for r in cursor.execute("SELECT name FROM sqlite_master WHERE type='table';").fetchall()]
    print(f"Total tables: {len(tables)}")
    conn.close()
except Exception as e:
    print(f"Database error: {e}")

print("\n=== 2. AUDIT ALL REGISTERED API ROUTES VIA FLASK TEST CLIENT ===")
client = app.test_client()

failures = []
passed = 0
skipped = 0

# Sample dummy query / path substitutions
TEST_PARAMS = {
    "<bot_id>": "bot-1",
    "<int:bot_id>": "1",
    "<id>": "1",
    "<int:trade_id>": "1",
    "<trade_id>": "1",
    "<symbol>": "BTC/USDT",
    "<instrument_id>": "BTC/USDT",
    "<watchlist_id>": "wl_main",
    "<filename>": "test.txt",
    "<path:filename>": "test.txt",
    "<path:path>": "test",
    "<alert_id>": "1",
}

for rule in app.url_map.iter_rules():
    url_pattern = str(rule)
    methods = [m for m in rule.methods if m in ("GET", "POST", "PUT", "DELETE", "PATCH")]

    # Replace dynamic parameters
    resolved_url = url_pattern
    for placeholder, val in TEST_PARAMS.items():
        resolved_url = resolved_url.replace(placeholder, val)

    # Skip SSE streaming routes in static unit scan (they block/stream infinitely)
    if "/stream" in resolved_url:
        skipped += 1
        continue

    for method in methods:
        try:
            if method == "GET":
                resp = client.get(resolved_url)
            elif method == "POST":
                resp = client.post(resolved_url, json={})
            elif method == "PUT":
                resp = client.put(resolved_url, json={})
            elif method == "DELETE":
                resp = client.delete(resolved_url)
            elif method == "PATCH":
                resp = client.patch(resolved_url, json={})
            else:
                continue

            if resp.status_code >= 500:
                print(f"🚨 [FAIL 500] {method} {url_pattern} -> {resolved_url} (HTTP {resp.status_code})")
                print(f"   Response: {resp.get_data(as_text=True)[:300]}")
                failures.append({
                    "method": method,
                    "rule": url_pattern,
                    "url": resolved_url,
                    "status": resp.status_code,
                    "data": resp.get_data(as_text=True)[:400]
                })
            else:
                passed += 1
        except Exception as e:
            print(f"🚨 [EXCEPTION 500] {method} {url_pattern} -> {e}")
            traceback.print_exc()
            failures.append({
                "method": method,
                "rule": url_pattern,
                "url": resolved_url,
                "status": "EXCEPTION",
                "error": str(e),
                "traceback": traceback.format_exc()
            })

print("\n=== SUMMARY OF API SCAN ===")
print(f"Total Routes Tested: {passed + len(failures)}")
print(f"Passed (< 500): {passed}")
print(f"Skipped (Streams): {skipped}")
print(f"Failures (>= 500): {len(failures)}")

if failures:
    print("\n--- DETAILED FAILURES ---")
    for f in failures:
        print(json.dumps(f, indent=2))
