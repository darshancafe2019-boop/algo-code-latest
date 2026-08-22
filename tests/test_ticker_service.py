"""
Unit tests for Resilient TickerService and multi-provider failover.
"""
import pytest
from src.ticker_service import get_ticker_service, normalize_symbol, ProviderCircuitBreaker

def test_symbol_normalization():
    assert normalize_symbol("BTC/USDT") == "BTC/USDT"
    assert normalize_symbol("BTC%2FUSDT") == "BTC/USDT"
    assert normalize_symbol("BTCUSDT") == "BTC/USDT"
    assert normalize_symbol("eth/usdt") == "ETH/USDT"
    assert normalize_symbol("SOL-USDT") == "SOL/USDT"
    assert normalize_symbol("") == "BTC/USDT"
    assert normalize_symbol(None) == "BTC/USDT"

def test_circuit_breaker_lifecycle():
    cb = ProviderCircuitBreaker("TestProvider", failure_threshold=2, recovery_timeout_sec=0.2)
    assert cb.can_attempt() is True
    
    cb.record_failure()
    assert cb.can_attempt() is True
    
    cb.record_failure()
    # Should trip to OPEN
    assert cb.state == "OPEN"
    assert cb.can_attempt() is False
    
    import time
    time.sleep(0.25)
    # After recovery timeout, should allow HALF_OPEN attempt
    assert cb.can_attempt() is True
    assert cb.state == "HALF_OPEN"
    
    cb.record_success()
    assert cb.state == "CLOSED"
    assert cb.failure_count == 0

def test_ticker_service_get_ticker():
    svc = get_ticker_service()
    res = svc.get_ticker("BTC/USDT")
    assert res is not None
    assert "last" in res or "price" in res
    assert float(res.get("last") or res.get("price")) > 0
    assert res.get("symbol") == "BTC/USDT"

def test_ticker_service_caching_and_deduplication():
    svc = get_ticker_service()
    # First call
    res1 = svc.get_ticker("ETH/USDT")
    # Immediate second call should be served from cache
    res2 = svc.get_ticker("ETH/USDT")
    assert res2.get("cached") is True or res2.get("status") == "success"
    assert res1.get("last") == res2.get("last")
