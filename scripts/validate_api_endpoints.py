import urllib.request
import urllib.error
import json

BASE_URL = "http://127.0.0.1:5050"
GATEWAY_URL = "http://127.0.0.1:5051"

def test_endpoints():
    print("=== TESTING BACKEND & GATEWAY ENDPOINTS ===")
    
    # 1. Test Gateway Health
    print("\n--- 1. MARKET DATA GATEWAY (5051) ---")
    try:
        req = urllib.request.Request(f"{GATEWAY_URL}/health")
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print("Gateway /health:", resp.status, data)
    except Exception as e:
        print("Gateway /health ERROR:", e)

    try:
        req = urllib.request.Request(f"{GATEWAY_URL}/market-feed/status")
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print("Gateway /market-feed/status:", resp.status, data)
    except Exception as e:
        print("Gateway /market-feed/status ERROR:", e)

    # 2. Test Backend Health & Public Endpoints
    print("\n--- 2. BACKEND ENGINE (5050) ---")
    try:
        req = urllib.request.Request(f"{BASE_URL}/api/health")
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print("Backend /api/health:", resp.status, data.get("status"))
    except Exception as e:
        print("Backend /api/health ERROR:", e)

    # 3. Authenticate to test protected endpoints
    token = None
    login_payload = json.dumps({"username": "admin", "password": "AlgoTrading@2026!"}).encode("utf-8")
    req = urllib.request.Request(f"{BASE_URL}/api/auth/login", data=login_payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=3) as resp:
            body = json.loads(resp.read().decode("utf-8"))
            token = body.get("session_token") or body.get("token") or body.get("access_token")
            print("Backend /api/auth/login: SUCCESS, session_token acquired:", bool(token))
    except Exception as e:
        print("Backend /api/auth/login ERROR:", e)

    if not token:
        print("Cannot test protected endpoints without token.")
        return

    headers = {
        "Authorization": f"Bearer {token}",
        "Cookie": f"algo_session_token={token}",
        "Content-Type": "application/json"
    }

    # 4. Probe protected endpoints
    endpoints = [
        "/api/system/status",
        "/api/bots",
        "/api/bots/summary",
        "/api/positions",
        "/api/orders",
        "/api/risk/status",
        "/api/risk/circuit-breakers",
        "/api/market/status",
        "/api/market/providers",
        "/api/crypto-options/overview",
        "/api/nse/status",
        "/api/system/errors",
        "/api/audit/logs",
        "/api/settings",
    ]

    print("\n--- 3. PROBING PROTECTED BACKEND ENDPOINTS ---")
    for ep in endpoints:
        try:
            req = urllib.request.Request(f"{BASE_URL}{ep}", headers=headers)
            with urllib.request.urlopen(req, timeout=3) as resp:
                raw = resp.read().decode("utf-8")
                try:
                    data = json.loads(raw)
                    summary = f"OK ({len(data)} items)" if isinstance(data, (list, dict)) else "OK"
                except:
                    summary = "OK (text)"
                print(f"  {ep:<32}: HTTP {resp.status} - {summary}")
        except urllib.error.HTTPError as he:
            err_body = he.read().decode("utf-8", errors="ignore")[:100]
            print(f"  {ep:<32}: HTTP {he.code} - {err_body}")
        except Exception as ex:
            print(f"  {ep:<32}: EXCEPTION - {ex}")

if __name__ == "__main__":
    test_endpoints()
