import urllib.request
import json

def test():
    # Test Candles API
    try:
        url = "http://127.0.0.1:5050/api/nse/candles?symbol=NIFTY%2050&interval=1d&days=7"
        req = urllib.request.Request(url, headers={"User-Agent": "Test"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            print(f"[+] /api/nse/candles status: {data.get('status')}, candle count: {data.get('count')}")
    except Exception as e:
        print(f"[-] Candle error: {e}")

    # Test Search API
    try:
        url = "http://127.0.0.1:5050/api/nse/master/search?symbol=BANKNIFTY&exchange=NFO"
        req = urllib.request.Request(url, headers={"User-Agent": "Test"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            print(f"[+] /api/nse/master/search status: {data.get('status')}, found: {data.get('count')}")
    except Exception as e:
        print(f"[-] Search error: {e}")

if __name__ == "__main__":
    test()
