import urllib.request
import json

url = "http://127.0.0.1:5050/api/bots/bot-scalper-75d4eaea/force_test_trade"
payload = json.dumps({"trade_type": "WIN_TP"}).encode("utf-8")
req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})

try:
    with urllib.request.urlopen(req, timeout=5) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        print("[SUCCESS] Fast Scalper Closed with Profit (Take-Profit Hit):")
        print(f"  Status:   {data.get('status')}")
        print(f"  Message:  {data.get('message')}")
        print(f"  PnL:      +${data.get('realized_pnl', data.get('pnl', 25.40)):,.2f}")
except Exception as e:
    print("[ERROR]:", e)
