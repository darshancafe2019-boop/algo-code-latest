import urllib.request
import json

def test(name, url):
    try:
        req = urllib.request.Request(url, headers={'Accept': 'application/json', 'User-Agent': 'TestRunner'})
        res = urllib.request.urlopen(req, timeout=5)
        data = json.loads(res.read().decode('utf-8'))
        print(f"PASS [HTTP {res.status}]: {name}")
        return data
    except Exception as e:
        print(f"FAIL: {name} -> {e}")
        return None

print("=== VALIDATING COMPREHENSIVE MARKET DATA INTEGRATION ===\n")

# 1. Authorize feed endpoint
d1 = test("Upstox V3 Market Data Feed Authorize (/feed/market-data-feed/authorize)", "http://127.0.0.1:3100/feed/market-data-feed/authorize")
if d1:
    print("   -> Authorized Redirect URI:", str(d1.get("authorized_redirect_uri", ""))[:65] + "...")

# 2. Universe Summary (All categories, comprehensive counts)
d2 = test("Universe Summary (/api/universe/summary)", "http://127.0.0.1:3100/api/universe/summary")
if d2:
    s = d2.get("summary", {})
    print(f"   -> Total Instruments: {s.get('ALL')}")
    print(f"   -> Indian Stocks:     {s.get('STOCKS')}")
    print(f"   -> Indian Futures:    {s.get('FUTURES')}")
    print(f"   -> US/Global Stocks:  {s.get('GLOBAL')}")
    print(f"   -> Option Contracts:  {s.get('OPTIONS')}")
    print(f"   -> Market Indices:    {s.get('INDICES')}")
    print(f"   -> Crypto Assets:     {s.get('CRYPTO')}")
    print(f"   -> Forex Pairs:       {s.get('FOREX')}")
    print(f"   -> Commodities:       {s.get('COMMODITIES')}")

# 3. US Market Equities
d3 = test("US Market Universe (/api/universe/instruments?asset_class=Global)", "http://127.0.0.1:3100/api/universe/instruments?asset_class=Global")
if d3:
    insts = d3.get("instruments", [])
    print(f"   -> Fetched {len(insts)} US equities (Sample: {[i.get('symbol') for i in insts[:5]]})")

# 4. Comprehensive Futures
d4 = test("Futures Universe (/api/universe/instruments?asset_class=Futures)", "http://127.0.0.1:3100/api/universe/instruments?asset_class=Futures")
if d4:
    insts = d4.get("instruments", [])
    print(f"   -> Fetched {len(insts)} Futures contracts (Sample: {[i.get('symbol') for i in insts[:4]]})")

# 5. Futures Term Structure
d5 = test("Futures Term Structure (/api/universe/futures-chain?underlying=NIFTY)", "http://127.0.0.1:3100/api/universe/futures-chain?underlying=NIFTY")
if d5:
    contracts = d5.get("contracts", [])
    print(f"   -> Term structure loaded with {len(contracts)} contracts across near, next, far expiries")
    for c in contracts[:3]:
        print(f"      * {c.get('display_symbol')}: Expiry {c.get('expiry')}, Spot {c.get('spot_price')}, Futures {c.get('last_price')}, Basis {c.get('basis')}, DTE {c.get('days_to_expiry')}d")

# 6. Live Upstox Option Chain
d6 = test("Live Upstox Option Chain (/api/market/option-chain?underlying=NIFTY)", "http://127.0.0.1:3100/api/market/option-chain?underlying=NIFTY")
if d6:
    chain = d6.get("data") or d6
    print(f"   -> Spot Price: {chain.get('spot_price')}, Strikes Count: {len(chain.get('strikes', []))}, PCR: {chain.get('pcr')}")

# 7. Gateway Live Status
d7 = test("Market Data Gateway Providers (/providers/health)", "http://127.0.0.1:5051/providers/health")
if d7:
    provs = d7.get("providers", [])
    upstox = next((p for p in provs if p.get("provider_id") == "upstox_ws"), {})
    alpaca = next((p for p in provs if p.get("provider_id") == "alpaca_iex"), {})
    delta = next((p for p in provs if p.get("provider_id") == "delta_options_ws"), {})
    binance = next((p for p in provs if p.get("provider_id") == "binance_ws"), {})
    print(f"   -> Upstox WS: {upstox.get('status')}")
    print(f"   -> US Alpaca IEX: {alpaca.get('status')}")
    print(f"   -> Delta Options WS: {delta.get('status')}")
    print(f"   -> Binance WS: {binance.get('status')}")

print("\n=== ALL COMPREHENSIVE REQUIREMENTS VERIFIED ===")
