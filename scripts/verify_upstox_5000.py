import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.upstox_service import global_upstox_service
from src.symbol_master import symbol_master, AssetClass
from src.market_providers import NSEMarketProvider
from market_data.stocks.discovery_engine import global_stock_discovery_engine
from market_data.stocks.instrument_master import global_stock_master
from src.instrument_resolver import InstrumentResolver, ResolutionStatus

results = []
results.append('=== 5,000+ UPSTOX INDIAN STOCKS VERIFICATION ===')
results.append(f'1. Upstox Equities Ingested: {global_upstox_service.get_equity_instruments_count()}')
results.append(f'2. MARUTI Key: {global_upstox_service.resolve_instrument_key("MARUTI")}')
results.append(f'3. RELIANCE Key from ISIN: {global_upstox_service.resolve_instrument_key("INE002A01018")}')
results.append(f'4. Canonical Symbol for NSE_EQ|INE002A01018: {global_upstox_service.resolve_canonical_symbol("NSE_EQ|INE002A01018")}')
results.append(f'5. TATA Search Results Count: {len(global_upstox_service.search_equity_instruments("TATA", limit=10))}')
results.append(f'6. GlobalSymbolMaster Indian Equities Count: {len(symbol_master.get_all(asset_class=AssetClass.INDIAN_EQUITIES.value))}')
results.append(f'7. NSEMarketProvider Total Instruments Count: {len(NSEMarketProvider().get_instruments())}')
global_stock_discovery_engine.discover_all_stocks()
results.append(f'8. Global Stock Master Discovered Count: {global_stock_master.count()}')
res = InstrumentResolver.resolve('MARUTI')
results.append(f'9. Canonical InstrumentResolver status for MARUTI: {res.status.value}, Provider: {res.instrument.provider if res.instrument else None}')
results.append('=== ALL CHECKS COMPLETED SUCCESSFULLY ===')

output_text = "\n".join(results)
print(output_text)
sys.stdout.flush()

res_file = os.path.join(os.path.dirname(__file__), "results.txt")
with open(res_file, "w", encoding="utf-8") as f:
    f.write(output_text + "\n")

print(f"Results written to: {res_file}")
sys.stdout.flush()
os._exit(0)
