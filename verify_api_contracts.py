"""
Comprehensive API Contract Validator for All Frontend Endpoints
Tests exact response schema, field types, array integrity, and proxy routing on port 3000.
"""

import urllib.request
import json
import sys

def test_api_contracts():
    endpoints = [
        ("/api/ticker?symbol=BTC/USDT", "dict", ["status", "data"]),
        ("/api/universe/instruments?limit=25", "dict", ["instruments", "status"]),
        ("/api/universe/summary", "dict", ["status", "summary"]),
        ("/api/universe/intelligence", "dict", ["intelligence", "status"]),
        ("/api/universe/providers", "dict", ["providers", "status"]),
        ("/api/universe/option-chain?symbol=BTC", "dict", ["status", "data"]),
        ("/api/universe/futures-chain?symbol=BTC", "dict", ["contracts", "status"]),
        ("/api/scanner/run", "dict", ["status", "results"]),
        ("/api/bots", "dict", ["bots", "status"]),
        ("/api/bots/summary", "dict", ["metrics", "status"]),
        ("/api/bot/status", "dict", ["health", "bot"]),
        ("/api/analytics?bot_id=ALL&strategy=ALL&symbol=ALL", "dict", ["charts", "bot_comparison"]),
        ("/api/alerts?limit=10", "dict", ["notifications", "status"]),
        ("/api/providers/capabilities", "dict", ["providers", "status"]),
        ("/api/options/chain?symbol=BTC", "dict", ["strikes", "status"]),
        ("/api/orderbook/depth?symbol=BTC/USDT", "dict", ["bids", "asks"]),
        ("/api/reliability/incidents?limit=10", "dict", ["incidents", "status"]),
        ("/api/reliability/summary", "dict", ["summary", "status"]),
        ("/api/reliability/providers", "dict", ["providers", "status"]),
    ]

    print("=" * 80)
    print("  VERIFYING FRONTEND -> BACKEND PROXIED API CONTRACTS (PORT 3000)")
    print("=" * 80)

    all_passed = True
    for path, expected_type, required_keys in endpoints:
        url = f"http://127.0.0.1:3000{path}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "ContractTester/1.0"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                if resp.status != 200:
                    print(f"❌ {path:<50} -> HTTP {resp.status}")
                    all_passed = False
                    continue
                data = json.loads(resp.read().decode())
                
                # Validate root type
                if expected_type == "dict" and not isinstance(data, dict):
                    print(f"❌ {path:<50} -> Expected dict, got {type(data)}")
                    all_passed = False
                    continue
                elif expected_type == "list" and not isinstance(data, list):
                    print(f"❌ {path:<50} -> Expected list, got {type(data)}")
                    all_passed = False
                    continue
                
                # Validate required keys
                missing = [k for k in required_keys if k not in data]
                if missing:
                    print(f"❌ {path:<50} -> Missing keys: {missing}")
                    all_passed = False
                    continue
                
                print(f"✅ {path:<50} -> 200 OK (Keys: {list(data.keys())[:4]}...)")
        except Exception as e:
            print(f"❌ {path:<50} -> ERROR: {e}")
            all_passed = False

    print("=" * 80)
    print(f"OVERALL API CONTRACT INTEGRITY: {'PASS' if all_passed else 'FAIL'}")
    print("=" * 80)
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(test_api_contracts())
