import urllib.request
import json
import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

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
    print("  VERIFYING FRONTEND -> BACKEND PROXIED API CONTRACTS (PORT 3100 / 5050)")
    print("=" * 80)

    import hashlib
    from datetime import datetime, timezone, timedelta
    from src import db
    from src.security_auth import PasswordManager
    import dashboard

    db.init_db()
    token = "test_contract_verifier_session_token_12345"
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    user_id = "usr_contract_verifier"
    pwd_hash, salt = PasswordManager.hash_password("VerifierPass@2026!")
    db.upsert_user({
        "id": user_id,
        "username": "contract_tester",
        "email": "tester@algotrading.local",
        "password_hash": pwd_hash,
        "salt": salt,
        "role": "ADMIN",
        "is_active": 1,
        "is_2fa_enabled": 0,
        "must_change_password": 0,
    })
    now_iso = datetime.now(timezone.utc).isoformat()
    expires_iso = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    db.safe_execute(
        """
        INSERT OR REPLACE INTO user_sessions (
            session_id, user_id, token_hash, device_name, ip_address,
            user_agent, approximate_location, last_active_at, expires_at,
            is_revoked, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
        """,
        (
            "sess-contract-verifier",
            user_id,
            token_hash,
            "Contract Tester",
            "127.0.0.1",
            "ContractTester",
            "Localhost",
            now_iso,
            expires_iso,
            now_iso,
        )
    )

    auth_headers = {
        "User-Agent": "ContractTester/1.0",
        "Cookie": f"algo_session_token={token}",
        "Authorization": f"Bearer {token}"
    }

    _flask_client = dashboard.app.test_client()
    _flask_client.set_cookie("algo_session_token", token, domain="localhost", path="/")
    all_passed = True
    for path, expected_type, required_keys in endpoints:
        data = None
        status = None
        # Try live HTTP 3100 / 5050 first
        try:
            url = f"http://127.0.0.1:3100{path}"
            req = urllib.request.Request(url, headers=auth_headers)
            with urllib.request.urlopen(req, timeout=1.5) as resp:
                status = resp.status
                data = json.loads(resp.read().decode())
        except Exception:
            try:
                url = f"http://127.0.0.1:5050{path}"
                req = urllib.request.Request(url, headers=auth_headers)
                with urllib.request.urlopen(req, timeout=1.5) as resp:
                    status = resp.status
                    data = json.loads(resp.read().decode())
            except Exception:
                resp = _flask_client.get(path, headers=auth_headers)
                status = resp.status_code
                data = resp.get_json(silent=True)

        if status != 200:
            print(f"❌ {path:<50} -> HTTP {status}")
            all_passed = False
            continue

        if expected_type == "dict" and not isinstance(data, dict):
            print(f"❌ {path:<50} -> Expected dict, got {type(data)}")
            all_passed = False
            continue
        elif expected_type == "list" and not isinstance(data, list):
            print(f"❌ {path:<50} -> Expected list, got {type(data)}")
            all_passed = False
            continue

        missing = [k for k in required_keys if k not in data]
        if missing:
            print(f"❌ {path:<50} -> Missing keys: {missing}")
            all_passed = False
            continue

        print(f"✅ {path:<50} -> 200 OK (Keys: {list(data.keys())[:4]}...)")

    print("=" * 80)
    print(f"OVERALL API CONTRACT INTEGRITY: {'PASS' if all_passed else 'FAIL'}")
    print("=" * 80)
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(test_api_contracts())
