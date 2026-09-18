import pytest
from src.upstox_service import global_upstox_service
from src.symbol_master import symbol_master, AssetClass
from src.market_providers import NSEMarketProvider
from market_data.stocks.discovery_engine import global_stock_discovery_engine
from market_data.stocks.instrument_master import global_stock_master
from src.instrument_resolver import InstrumentResolver, ResolutionStatus


def test_upstox_service_master_count():
    count = global_upstox_service.get_equity_instruments_count()
    assert count >= 5000, f'Expected >= 5000 instruments, got {count}'


def test_upstox_service_key_resolution():
    test_cases = [
        ('RELIANCE', 'NSE_EQ|INE002A01018'),
        ('TCS', 'NSE_EQ|INE467B01029'),
        ('MARUTI', 'NSE_EQ|INE585B01010'),
        ('INE002A01018', 'NSE_EQ|INE002A01018'),
        ('NIFTY', 'NSE_INDEX|Nifty 50'),
        ('BANKNIFTY', 'NSE_INDEX|Nifty Bank'),
        ('SENSEX', 'BSE_INDEX|SENSEX'),
        ('EIEL', 'NSE_EQ|INE0LLY01014'),
        ('KCK', 'NSE_EQ|INE0J1E01027'),
    ]
    for sym, expected_key in test_cases:
        resolved = global_upstox_service.resolve_instrument_key(sym)
        assert resolved == expected_key, f'For {sym}: expected {expected_key}, got {resolved}'


def test_upstox_service_canonical_resolution():
    assert global_upstox_service.resolve_canonical_symbol('NSE_EQ|INE002A01018') == 'RELIANCE'
    assert global_upstox_service.resolve_canonical_symbol('NSE_EQ:INE002A01018') == 'RELIANCE'
    assert global_upstox_service.resolve_canonical_symbol('NSE_EQ|INE585B01010') == 'MARUTI'
    assert global_upstox_service.resolve_canonical_symbol('NSE_INDEX|Nifty 50') == 'NIFTY'
    assert global_upstox_service.resolve_canonical_symbol('BSE_INDEX|SENSEX') == 'SENSEX'


def test_upstox_service_search_and_pagination():
    tata_results = global_upstox_service.search_equity_instruments('TATA', limit=10)
    assert len(tata_results) > 0
    assert any('TATA' in item.get('symbol', '') or 'TATA' in item.get('company_name', '') for item in tata_results)

    page1 = global_upstox_service.get_all_equity_instruments(limit=20, offset=0)
    page2 = global_upstox_service.get_all_equity_instruments(limit=20, offset=20)
    assert len(page1) == 20
    assert len(page2) == 20
    assert page1[0]['symbol'] != page2[0]['symbol']


def test_symbol_master_5000_equities():
    indian_equities = symbol_master.get_all(asset_class=AssetClass.INDIAN_EQUITIES.value)
    assert len(indian_equities) >= 5000, f'Expected >= 5000 Indian equities in symbol_master, got {len(indian_equities)}'

    rel = symbol_master.resolve('RELIANCE')
    assert rel is not None
    assert rel.display_symbol == 'RELIANCE'
    assert rel.exchange == 'NSE'

    maruti = symbol_master.resolve('MARUTI')
    assert maruti is not None
    assert maruti.display_symbol == 'MARUTI'


def test_nse_market_provider_5000_equities():
    provider = NSEMarketProvider()
    instruments = provider.get_instruments()
    assert len(instruments) >= 5000, f'Expected >= 5000 instruments from NSE provider, got {len(instruments)}'

    reliance_inst = next((i for i in instruments if i.get('symbol') == 'RELIANCE'), None)
    assert reliance_inst is not None
    assert 'broker_symbol_mappings' in reliance_inst
    assert reliance_inst['broker_symbol_mappings'].get('upstox') == 'NSE_EQ|INE002A01018'
    assert reliance_inst['broker_symbol_mappings'].get('zerodha') == 'NSE:RELIANCE'
    assert reliance_inst['broker_symbol_mappings'].get('angel') == 'RELIANCE'


def test_stock_discovery_engine_5000_stocks():
    discovered = global_stock_discovery_engine.discover_all_stocks()
    assert len(discovered) >= 5000, f'Expected >= 5000 discovered stocks, got {len(discovered)}'
    assert global_stock_master.count() >= 5000


def test_canonical_instrument_resolver_dynamic():
    res_reliance = InstrumentResolver.resolve('RELIANCE')
    assert res_reliance.status == ResolutionStatus.RESOLVED
    assert res_reliance.instrument is not None
    assert res_reliance.instrument.provider == 'upstox'
    assert res_reliance.instrument.exchange == 'NSE'

    res_maruti = InstrumentResolver.resolve('MARUTI')
    assert res_maruti.status == ResolutionStatus.RESOLVED
    assert res_maruti.instrument is not None
    assert res_maruti.instrument.base_asset == 'MARUTI'
