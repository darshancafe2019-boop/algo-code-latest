import urllib.request
import json
import time

ENDPOINTS = [
    "/api/nse/quote?symbol=NIFTY",
    "/api/nse/quote?symbol=RELIANCE",
    "/api/nse/option-chain?symbol=NIFTY&strike_count=10",
    "/api/nse/market-summary",
    "/api/nse/derivatives/most-active",
    "/api/nse/fii-dii",
    "/api/nse/holidays",
    "/api/nse/gainers-losers",
    "/api/nse/corporate-actions",
]

def test_nse():
    print("Testing NSE API Endpoints on Port 5050 and Proxy Port 3100...\n")
    for ep in ENDPOINTS:
        url_5050 = f"http://127.0.0.1:5050{ep}"
        url_3100 = f"http://127.0.0.1:3100{ep}"
        
        # Test backend directly
        try:
            req = urllib.request.Request(url_5050)
            with urllib.request.urlopen(req, timeout=8) as res:
                data = json.loads(res.read().decode("utf-8"))
                status = data.get("status", "unknown")
                print(f"[Backend 5050 OK] {ep:<45} -> Status: {status}")
        except Exception as e:
            print(f"[Backend 5050 ERR] {ep:<45} -> {e}")

        # Test frontend proxy
        try:
            req = urllib.request.Request(url_3100)
            with urllib.request.urlopen(req, timeout=8) as res:
                data = json.loads(res.read().decode("utf-8"))
                status = data.get("status", "unknown")
                print(f"[Frontend 3100 OK] {ep:<44} -> Status: {status}")
        except Exception as e:
            print(f"[Frontend 3100 ERR] {ep:<44} -> {e}")

if __name__ == "__main__":
    test_nse()
