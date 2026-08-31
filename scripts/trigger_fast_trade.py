import urllib.request
import json

url = "http://127.0.0.1:5050/api/bots/bot-scalper-75d4eaea/force_test_trade"
payload = json.dumps({"trade_type": "LONG_ENTRY"}).encode("utf-8")
req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})

try:
    with urllib.request.urlopen(req, timeout=5) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        print("[SUCCESS] Fast Scalper Trade Executed:")
        print(f"  Trade ID: #{data.get('trade_id')}")
        print(f"  Symbol:   {data.get('symbol')} ({data.get('direction')})")
        print(f"  Price:    ${data.get('price'):,.2f}")
        print(f"  Order ID: {data.get('order_id')}")
        print(f"  Message:  {data.get('message')}")
except Exception as e:
    print("[ERROR]:", e)
