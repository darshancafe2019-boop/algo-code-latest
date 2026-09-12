import urllib.request
import json
from collections import defaultdict

url = 'https://api.india.delta.exchange/v2/products?contract_types=call_options,put_options'
req = urllib.request.Request(url, headers={'User-Agent': 'QuantOS/2.0'})
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode('utf-8'))

prods = data.get('result', [])
print(f"Total products returned: {len(prods)}")
print(f"Meta: {data.get('meta')}")

by_und = defaultdict(lambda: defaultdict(list))
for p in prods:
    und = (p.get('underlying_asset') or {}).get('symbol') or 'UNKNOWN'
    st = p.get('settlement_time')
    by_und[und][st].append(p)

for und, exp_map in sorted(by_und.items()):
    print(f"\n==========================================")
    print(f"Underlying: {und} (Total Expiries: {len(exp_map)})")
    for st in sorted(exp_map.keys()):
        contracts = exp_map[st]
        calls = [c for c in contracts if c.get('contract_type') == 'call_options']
        puts = [c for c in contracts if c.get('contract_type') == 'put_options']
        strikes = sorted(set([float(c.get('strike_price')) for c in contracts if c.get('strike_price')]))
        print(f"  Expiry {st}: {len(contracts)} contracts (Calls: {len(calls)}, Puts: {len(puts)}), Strikes: {len(strikes)} (min: {min(strikes) if strikes else 0}, max: {max(strikes) if strikes else 0})")
