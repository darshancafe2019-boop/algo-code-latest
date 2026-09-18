import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from dashboard import app
import json

client = app.test_client()

print("=" * 65)
print("1. BINANCE MULTI-DEPARTMENT TELEMETRY")
print("=" * 65)
r1 = client.get("/api/binance/departments")
d1 = json.loads(r1.data)
print(f"Status Code: {r1.status_code}")
print(f"Total Departments: {d1.get('total_departments')}")
for d in d1.get("departments", []):
    print(f"  - [{d['id']}] {d['name']} | Exchange: {d['exchange']} | Hours: {d.get('trading_hours', 'N/A')}")

print("\n" + "=" * 65)
print("2. BINANCE SPOT MARKETS (24h Volume & Prices)")
print("=" * 65)
r2 = client.get("/api/binance/spot")
d2 = json.loads(r2.data)
for m in d2.get("markets", [])[:6]:
    print(f"  - {m['symbol']:<10} | Price: ${m['last_price']:<10.2f} | 24h Vol: ${m['volume_quote']:<14,.2f} | Chg: {m['change_pct']:+.2f}%")

print("\n" + "=" * 65)
print("3. BINANCE USDⓈ-M FUTURES (Mark Prices, Funding Rates & OI)")
print("=" * 65)
r3 = client.get("/api/binance/futures")
d3 = json.loads(r3.data)
for f in d3.get("contracts", [])[:5]:
    print(f"  - {f['symbol']:<10} | Mark: ${f['mark_price']:<10.2f} | Funding: {f['funding_rate_pct']:+.4f}% | OI: {f['open_interest']:<10,.1f} | Max Lev: {f['max_leverage']}x")

print("\n" + "=" * 65)
print("4. BINANCE COIN-M INVERSE FUTURES")
print("=" * 65)
r4 = client.get("/api/binance/coinm")
d4 = json.loads(r4.data)
for c in d4.get("contracts", []):
    print(f"  - {c['symbol']:<14} | Mark: ${c['mark_price']:<10.2f} | Margin Asset: {c['margin_asset']} | Lev: {c['max_leverage']}x")

print("\n" + "=" * 65)
print("5. BINANCE CRYPTO OPTIONS (Black-Scholes Greeks & PCR)")
print("=" * 65)
r5 = client.get("/api/binance/option-chain?underlying=BTC")
d5 = json.loads(r5.data)
print(f"Underlying: {d5['underlying']} | Spot: ${d5['spot_price']:,.2f} | Max Pain: ${d5['max_pain']:,.2f} | PCR: {d5['pcr_oi']}")
for s in d5.get("strikes", [])[3:7]:
    print(f"  - Strike: ${s['strike_price']} | Call LTP: ${s['call']['last_price']} (Δ: {s['call']['delta']}) | Put LTP: ${s['put']['last_price']} (Δ: {s['put']['delta']})")

print("\n" + "=" * 65)
print("6. BINANCE SIMPLE EARN & STAKING YIELDS")
print("=" * 65)
r6 = client.get("/api/binance/earn")
d6 = json.loads(r6.data)
for e in d6.get("products", []):
    print(f"  - {e['asset']:<6} | {e['name'][:30]:<30} | APR: {e['apr_pct']:.2f}% | Tier Bonus: {e['bonus_tier_apr']:.2f}%")

print("\n" + "=" * 65)
print("7. BINANCE UNIFIED WALLET & RISK TELEMETRY")
print("=" * 65)
r7 = client.get("/api/binance/account/funds")
d7 = json.loads(r7.data)
w = d7["data"]
print(f"Total Equity: ${w['total_equity_usd']:,.2f} | Available Balance: ${w['total_available_balance_usd']:,.2f} | Margin Ratio: {w['margin_ratio_pct']}%")
print("=" * 65)
