"""Read-only BTC option data audit: Delta India public API vs local gateway.

No credentials, orders, subscriptions, writes, process changes, or DB updates.
Run from the Windows PC running the trading bot with Python 3.9+.
"""
import json
import time
from datetime import datetime, timezone
from urllib.parse import urlencode, quote
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

GATEWAY = 'http://127.0.0.1:5051'
DELTA = 'https://api.india.delta.exchange'
CONTRACT = 'C-BTC-83400-151026'
EXPIRY = '2026-10-15'


def get_json(base, path, params=None, timeout=7):
    url = base + path
    if params:
        url += '?' + urlencode(params)
    begin = time.monotonic()
    try:
        req = Request(url, headers={'Accept': 'application/json', 'User-Agent': 'MarketDataReadOnlyAudit/1.0'})
        with urlopen(req, timeout=timeout) as response:
            status = response.status
            raw = response.read(3_000_000)
        value = json.loads(raw.decode('utf-8'))
        if isinstance(value, dict) and value.get('success') is False:
            return None, f'API success=false (HTTP {status}): {str(value.get("error", "unknown"))[:180]}'
        return value, None
    except (HTTPError, URLError, TimeoutError, ValueError, OSError) as exc:
        return None, f'{type(exc).__name__}: {str(exc)[:180]}'
    finally:
        print(f'  GET {url} [{time.monotonic() - begin:.2f}s]')


def val(obj, *keys):
    if not isinstance(obj, dict):
        return None
    for key in keys:
        if key in obj and obj[key] is not None:
            return obj[key]
    return None


def num(x):
    try:
        return float(x) if x is not None and str(x).strip() != '' else None
    except (TypeError, ValueError):
        return None


def show_pair(name, exchange, local):
    x, y = num(exchange), num(local)
    if x is None or y is None:
        print(f'  {name:15} exchange={exchange!s:14} bot={local!s:14}  UNKNOWN (missing value)')
        return
    print(f'  {name:15} exchange={x:14.5f} bot={y:14.5f}  delta={y - x:+.5f} (non-synchronous samples)')


def show_providers():
    print('\n=== GATEWAY PROVIDER HEALTH ===')
    r, error = get_json(GATEWAY, '/providers/health')
    if error:
        print('  UNAVAILABLE:', error)
        return
    print('  Gateway reported status:', val(r, 'status'))
    for provider in (val(r, 'providers') or []):
        if not isinstance(provider, dict):
            continue
        metrics = val(provider, 'metrics') or {}
        print('  ', val(provider, 'provider_id', 'id'), 'status=', val(provider, 'status'),
              'subs=', val(provider, 'subscriptions'),
              'ticks=', val(metrics, 'ticks_received', 'ticks_processed'),
              'last=', val(metrics, 'last_tick_time'))


def extract_call(chain):
    if not isinstance(chain, dict):
        return None
    rows = val(chain, 'strikes', 'rows') or []
    if isinstance(rows, dict):
        rows = list(rows.values())
    for row in rows:
        if not isinstance(row, dict):
            continue
        strike = num(val(row, 'strike', 'strikePrice', 'strike_price'))
        if strike is not None and abs(strike - 83400) < 0.01:
            return val(row, 'call', 'ce')
    return None


def show_sample(n):
    print(f'\n=== SAMPLE {n} — {datetime.now(timezone.utc).isoformat()} ===')
    direct, e1 = get_json(DELTA, '/v2/tickers/' + quote(CONTRACT, safe=''))
    local, e2 = get_json(GATEWAY, '/api/market/quote', {'symbol': CONTRACT})
    chain, e3 = get_json(GATEWAY, '/api/options/chain',
                         {'underlying': 'BTC', 'source': 'DELTA_INDIA', 'expiry': EXPIRY})
    for name, error in [('Delta ticker', e1), ('Gateway quote', e2), ('Gateway chain', e3)]:
        if error:
            print('  ERROR', name, error)
    if not direct or not local:
        print('  UNKNOWN: no reliable direct-to-gateway numeric comparison possible')
        return
    tick = val(direct, 'result') or {}
    if not isinstance(tick, dict):
        print('  UNKNOWN: Delta ticker result missing or unexpected'); return
    quotes = val(tick, 'quotes') or {}
    greeks = val(tick, 'greeks') or {}
    print('  Direct symbol=', val(tick, 'symbol'), 'product_id=', val(tick, 'product_id'),
          'exchange timestamp=', val(tick, 'timestamp'))
    print('  Gateway symbol=', val(local, 'symbol'), 'source=', val(local, 'source'),
          'status=', val(local, 'status'), 'ageMs=', val(local, 'ageMs'),
          'timestamp=', val(local, 'timestamp'))
    show_pair('Mark vs price', val(tick, 'mark_price'), val(local, 'price'))
    show_pair('Trade close vs price', val(tick, 'close'), val(local, 'price'))
    show_pair('Best bid', val(quotes, 'best_bid'), val(local, 'bid'))
    show_pair('Best ask', val(quotes, 'best_ask'), val(local, 'ask'))
    bid = num(val(local, 'bid')); ask = num(val(local, 'ask'))
    if bid is not None and ask is not None and bid > ask:
        print('  FAIL: BOT CROSSED QUOTE: bid is greater than ask')
    call = extract_call(chain)
    if call:
        print('  Chain selected-strike CALL raw values (public market data only):')
        for key in ('symbol', 'product_id', 'ltp', 'last_price', 'mark_price', 'bid', 'ask',
                    'iv', 'mark_iv', 'delta', 'gamma', 'theta', 'vega', 'oi', 'volume'):
            if isinstance(call, dict) and key in call:
                print(f'    {key}: {call[key]}')
    else:
        print('  UNKNOWN: could not locate 83400 call leg in gateway chain')
    print('  Delta option REST fields:')
    for key, value in [('mark_price', val(tick, 'mark_price')),
                       ('close (last trade)', val(tick, 'close')),
                       ('spot_price', val(tick, 'spot_price')),
                       ('bid', val(quotes, 'best_bid')),
                       ('ask', val(quotes, 'best_ask')),
                       ('ask_iv', val(quotes, 'ask_iv')),
                       ('bid_iv', val(quotes, 'bid_iv')),
                       ('oi (raw unit)', val(tick, 'oi')),
                       ('volume (raw unit)', val(tick, 'volume')),
                       ('greeks', greeks)]:
        print(f'    {key}: {value}')


if __name__ == '__main__':
    print('READ-ONLY AUDIT: No orders, writes, subscriptions or configuration changes.')
    print('Prices change between requests: differences alone do not prove inaccurate mapping.')
    show_providers()
    show_sample(1)
    time.sleep(3)
    show_sample(2)
    print('\nRESULT: Review price source, exact symbols, quote age, and raw Delta-vs-bot fields.')
    print('A valid market-data PASS still requires mapping checks and matching timestamps.')
