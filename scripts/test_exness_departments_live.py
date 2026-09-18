import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from dashboard import app
import json

client = app.test_client()

print("=" * 65)
print("1. EXNESS MULTI-ASSET DEPARTMENTS TELEMETRY")
print("=" * 65)
r1 = client.get("/api/exness/departments")
d1 = json.loads(r1.data)
print(f"Status Code: {r1.status_code}")
print(f"Total Departments: {d1.get('total_departments')}")
for d in d1.get("departments", []):
    print(f"  - [{d['id']}] {d['name']} | Exchange: {d['exchange']} | Hours: {d.get('trading_hours', 'N/A')}")

print("\n" + "=" * 65)
print("2. EXNESS FOREX MAJORS & MINORS (Bid/Ask & Raw Spreads)")
print("=" * 65)
r2 = client.get("/api/exness/forex")
d2 = json.loads(r2.data)
for p in d2.get("pairs", [])[:6]:
    print(f"  - {p['symbol']:<8} | Bid: {p['bid']:<9.5f} | Ask: {p['ask']:<9.5f} | Spread: {p['spread_pips']:<4.1f} pips | Swap(L/S): {p['swap_long']}/{p['swap_short']}")

print("\n" + "=" * 65)
print("3. EXNESS METALS & ENERGIES (XAUUSD, XAGUSD, USOIL, UKOIL)")
print("=" * 65)
r3 = client.get("/api/exness/metals")
d3 = json.loads(r3.data)
for m in d3.get("commodities", []):
    print(f"  - {m['symbol']:<8} | LTP: ${m['last_price']:<9.2f} | Bid: ${m['bid']:<9.2f} | Ask: ${m['ask']:<9.2f} | {m['name']}")

print("\n" + "=" * 65)
print("4. EXNESS GLOBAL INDICES CFDs (US30, US500, USTEC, GER40)")
print("=" * 65)
r4 = client.get("/api/exness/indices")
d4 = json.loads(r4.data)
for idx in d4.get("indices", []):
    print(f"  - {idx['symbol']:<8} | LTP: {idx['last_price']:<10.2f} | Spread: {idx['spread_pips']} pts | {idx['name']}")

print("\n" + "=" * 65)
print("5. EXNESS 24/7 CRYPTO CFDs (Zero Overnight Swap)")
print("=" * 65)
r5 = client.get("/api/exness/crypto")
d5 = json.loads(r5.data)
for c in d5.get("crypto", []):
    print(f"  - {c['symbol']:<8} | LTP: ${c['last_price']:<10.2f} | Spread: {c['spread_pips']} | Chg: {c['change_pct']:+.2f}%")

print("\n" + "=" * 65)
print("6. EXNESS STOCKS CFDs (AAPL, MSFT, NVDA, TSLA)")
print("=" * 65)
r6 = client.get("/api/exness/stocks")
d6 = json.loads(r6.data)
for s in d6.get("stocks", []):
    print(f"  - {s['symbol']:<8} | LTP: ${s['last_price']:<8.2f} | Bid: ${s['bid']:<8.2f} | Ask: ${s['ask']:<8.2f} | {s['name']}")

print("\n" + "=" * 65)
print("7. EXNESS MT5 / WEBTERMINAL ACCOUNT TELEMETRY")
print("=" * 65)
r7 = client.get("/api/exness/account/funds")
d7 = json.loads(r7.data)
acc = d7["data"]
print(f"Server: {acc.get('server')} | Leverage: {acc.get('leverage')}")
print(f"Balance: ${acc.get('balance'):,.2f} | Equity: ${acc.get('equity'):,.2f} | Free Margin: ${acc.get('free_margin'):,.2f} | Status: {acc.get('status')}")
print("=" * 65)
