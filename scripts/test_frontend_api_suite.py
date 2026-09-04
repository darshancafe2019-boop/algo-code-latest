import urllib.request
import urllib.error
import json

BASE_URL = "http://127.0.0.1:5050"

def test_frontend_endpoints():
    login_payload = json.dumps({"username": "admin", "password": "AlgoTrading@2026!"}).encode("utf-8")
    req = urllib.request.Request(f"{BASE_URL}/api/auth/login", data=login_payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=3) as resp:
        body = json.loads(resp.read().decode("utf-8"))
        token = body.get("session_token")

    headers = {
        "Authorization": f"Bearer {token}",
        "Cookie": f"algo_session_token={token}",
        "Content-Type": "application/json"
    }

    test_urls = [
        "/api/health",
        "/api/health/live",
        "/api/health/ready",
        "/api/status",
        "/api/market-health",
        "/api/bots",
        "/api/bots/summary",
        "/api/positions",
        "/api/orders",
        "/api/portfolio/snapshot",
        "/api/universe/instruments?asset_class=ALL&search=&limit=250",
        "/api/universe/watchlists",
        "/api/universe/summary",
        "/api/universe/sessions",
        "/api/market-data/stocks/list",
        "/api/futures/universe",
        "/api/futures/funding-heatmap",
        "/api/options/chain?underlying=NIFTY",
        "/api/market/providers/health"
    ]

    print("=== TESTING COMMON FRONTEND ENDPOINTS ===")
    for u in test_urls:
        try:
            req = urllib.request.Request(f"{BASE_URL}{u}", headers=headers)
            with urllib.request.urlopen(req, timeout=4) as resp:
                print(f"  {u:<50} : HTTP {resp.status} OK")
        except urllib.error.HTTPError as he:
            err_msg = he.read().decode("utf-8", errors="ignore")[:80].replace("\n", " ")
            print(f"  {u:<50} : HTTP {he.code} -> {err_msg}")
        except Exception as ex:
            print(f"  {u:<50} : EXCEPTION -> {ex}")

if __name__ == "__main__":
    test_frontend_endpoints()
