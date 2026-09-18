import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from dashboard import app
import json

client = app.test_client()

print("=" * 60)
print("1. ANGEL ONE DEPARTMENTS TELEMETRY")
print("=" * 60)
r1 = client.get("/api/angelone/departments")
d1 = json.loads(r1.data)
print(f"Status Code: {r1.status_code}")
print(f"Total Departments: {d1.get('total_departments')}")
for d in d1.get("departments", []):
    print(f"  - [{d['id']}] {d['name']} | Exchange: {d['exchange']} | Hours: {d.get('trading_hours', 'N/A')}")

print("\n" + "=" * 60)
print("2. ANGEL ONE LIVE QUOTES (Tokens & Market Depth)")
print("=" * 60)
r2 = client.get("/api/angelone/quotes?symbols=RELIANCE,TCS,INFY,NIFTY")
d2 = json.loads(r2.data)
for sym, q in d2.get("quotes", {}).items():
    print(f"  - {sym:<10} | Token: {q['instrument_token']:<8} | LTP: ₹{q['last_price']:<10.2f} | Chg: {q['change_pct']:+.2f}%")

print("\n" + "=" * 60)
print("3. ANGEL ONE BENCHMARK INDICES")
print("=" * 60)
r3 = client.get("/api/angelone/indices")
d3 = json.loads(r3.data)
for idx in d3.get("indices", []):
    print(f"  - {idx['symbol']:<15} | Token: {idx['instrument_token']:<8} | LTP: {idx['last_price']:<10.2f} | Chg: {idx['change_pct']:+.2f}%")

print("\n" + "=" * 60)
print("4. ANGEL ONE COMMODITIES (MCX)")
print("=" * 60)
r4 = client.get("/api/angelone/commodities")
d4 = json.loads(r4.data)
for c in d4.get("commodities", []):
    print(f"  - {c['trading_symbol']:<12} | Token: {c['token']:<8} | LTP: ₹{c['last_price']:<10.2f} | Unit: {c['unit']}")

print("\n" + "=" * 60)
print("5. ANGEL ONE CURRENCY DERIVATIVES")
print("=" * 60)
r5 = client.get("/api/angelone/currency")
d5 = json.loads(r5.data)
for cur in d5.get("currencies", []):
    print(f"  - {cur['pair']:<10} | Token: {cur['token']:<8} | LTP: ₹{cur['last_price']:<10.4f} | Chg: {cur['change_pct']:+.2f}%")

print("\n" + "=" * 60)
print("6. ANGEL ONE 5,000+ INDIAN STOCKS MASTER")
print("=" * 60)
r6 = client.get("/api/angelone/instruments?limit=5")
d6 = json.loads(r6.data)
print(f"Total Stock Universe: {d6.get('total')} instruments")
for inst in d6.get("instruments", []):
    print(f"  - {inst['symbol']:<12} | Token: {inst['instrument_token']:<8} | {inst['name'][:35]}")

print("\n" + "=" * 60)
print("7. ANGEL ONE RMS ACCOUNT & FUNDS")
print("=" * 60)
r7 = client.get("/api/angelone/account/funds")
d7 = json.loads(r7.data)
print(f"Cash Balance: ₹{d7['data']['cash_balance']:,.2f} | Available Margin: ₹{d7['data']['available_margin']:,.2f} | Status: {d7['data']['status']}")
print("=" * 60)
