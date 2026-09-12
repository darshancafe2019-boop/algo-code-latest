import urllib.request
import json

url = 'https://api.india.delta.exchange/v2/tickers?contract_types=call_options,put_options&underlying_asset_symbols=BTC&expiry_date=18-09-2026'
req = urllib.request.Request(url, headers={'User-Agent': 'QuantOS/2.0'})
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode('utf-8'))

res = data.get('result', [])
print(f"Tickers returned for BTC 18-09-2026: {len(res)}")
if res:
    sample = res[0]
    print("Sample ticker keys:", list(sample.keys()))
    print("Sample ticker quotes:", sample.get('quotes'))
    print("Sample ticker greeks:", sample.get('greeks'))
    print("Sample ticker:", sample.get('symbol'), sample.get('strike_price'), sample.get('mark_price'), sample.get('spot_price'))
