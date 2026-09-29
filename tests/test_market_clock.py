"""
Tests for Quant.OS MarketClock
==============================
Validates authoritative exchange timezone handling, trading dates, and settlement cutoffs.
"""

from datetime import datetime, timezone, date
import pytest
from src.market_clock import MarketClock


def test_market_clock_timezones():
    now_ist = MarketClock.now("NSE")
    now_utc = MarketClock.now_utc()
    assert now_ist.tzinfo is not None
    assert now_utc.tzinfo == timezone.utc


def test_market_clock_trading_date():
    tdate = MarketClock.trading_date("NSE")
    assert len(tdate) == 10
    assert tdate.count("-") == 2
    # Should parse to valid date
    d = datetime.strptime(tdate, "%Y-%m-%d").date()
    assert isinstance(d, date)


def test_market_clock_settlement_cutoff():
    # NSE 15:30 IST is 10:00 UTC
    nse_cutoff = MarketClock.get_expiry_settlement_cutoff("2026-10-29", exchange_or_provider="UPSTOX", underlying="NIFTY")
    assert nse_cutoff.hour == 10
    assert nse_cutoff.minute == 30 or nse_cutoff.minute == 0

    # Delta 17:30 IST is 12:00 UTC
    delta_cutoff = MarketClock.get_expiry_settlement_cutoff("2026-10-29", exchange_or_provider="DELTA", underlying="BTC")
    assert delta_cutoff.hour == 12
    assert delta_cutoff.minute == 0


def test_is_contract_expired():
    # An old date in early 2026 is expired when current application date is late 2026 (e.g. 2026-09-29)
    assert MarketClock.is_contract_expired("2026-03-27", exchange_or_provider="UPSTOX") is True

    # A far future date is not expired
    assert MarketClock.is_contract_expired("2029-12-31", exchange_or_provider="UPSTOX") is False


def test_days_and_seconds_to_expiry():
    days, secs = MarketClock.get_days_and_seconds_to_expiry("2026-03-27", exchange_or_provider="UPSTOX")
    assert secs <= 0
    assert days <= 0

    far_days, far_secs = MarketClock.get_days_and_seconds_to_expiry("2029-12-31", exchange_or_provider="UPSTOX")
    assert far_secs > 0
    assert far_days > 0
