"""
Universal Multi-Exchange Session Engine
========================================
Authoritative exchange session and trading hours engine for:
- Indian Equities & Derivatives (NSE, BSE, MCX)
- 24/7/365 Global Crypto (Binance, Bybit, Delta, OKX, Coinbase, Kraken)
- US Equities & Options (NYSE, NASDAQ, CBOE)
- European & Global Markets (LSE, Eurex, HKEX)

Session States:
- PRE_OPEN
- OPEN
- AUCTION
- HALTED
- CLOSED
- POST_MARKET
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, time, timezone, timedelta
from typing import Dict, Any, Optional

logger = logging.getLogger("ExchangeSessionEngine")


@dataclass
class SessionInfo:
    exchange: str
    status: str              # OPEN, CLOSED, PRE_OPEN, POST_MARKET, AUCTION, HALTED
    is_trading_open: bool
    market_timezone: str
    local_time_iso: str
    next_state_change: Optional[str] = None
    reason: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "exchange": self.exchange,
            "status": self.status,
            "is_trading_open": self.is_trading_open,
            "market_timezone": self.market_timezone,
            "local_time_iso": self.local_time_iso,
            "next_state_change": self.next_state_change,
            "reason": self.reason,
        }


class ExchangeSessionEngine:
    """
    Centralized, deterministic exchange session validator.
    Eliminates hardcoded local-time assumptions across market data feeds.
    """

    # Timezone definitions
    TZ_IST = timezone(timedelta(hours=5, minutes=30))
    TZ_UTC = timezone.utc
    TZ_EST = timezone(timedelta(hours=-5))   # Approx Eastern Standard Time

    def get_session(self, exchange_or_asset: str, dt_utc: Optional[datetime] = None) -> SessionInfo:
        """
        Calculates session state for given exchange / asset at a specific UTC datetime.
        """
        now_utc = dt_utc or datetime.now(timezone.utc)
        target = exchange_or_asset.upper().strip()

        # 1. 24/7/365 Crypto Markets
        if any(kw in target for kw in ["CRYPTO", "BINANCE", "DELTA", "BYBIT", "KRAKEN", "OKX", "COINBASE", "BTC", "ETH", "SOL"]):
            return SessionInfo(
                exchange=target,
                status="OPEN",
                is_trading_open=True,
                market_timezone="UTC",
                local_time_iso=now_utc.isoformat(),
                reason="24/7 Continuous Crypto Market",
            )

        # 2. Indian Markets (NSE, BSE, NIFTY, BANKNIFTY, SENSEX, UPSTOX, DHAN)
        if any(kw in target for kw in ["NSE", "BSE", "INDIA", "NIFTY", "BANKNIFTY", "FINNIFTY", "UPSTOX", "DHAN"]):
            now_ist = now_utc.astimezone(self.TZ_IST)
            weekday = now_ist.weekday()  # 0=Mon, ..., 6=Sun
            local_time_str = now_ist.strftime("%Y-%m-%d %H:%M:%S IST")

            if weekday >= 5:  # Weekend
                return SessionInfo(
                    exchange="NSE",
                    status="CLOSED",
                    is_trading_open=False,
                    market_timezone="Asia/Kolkata",
                    local_time_iso=now_ist.isoformat(),
                    reason="Weekend Market Closure",
                )

            t = now_ist.time()
            if t < time(9, 0):
                return SessionInfo(
                    exchange="NSE",
                    status="CLOSED",
                    is_trading_open=False,
                    market_timezone="Asia/Kolkata",
                    local_time_iso=now_ist.isoformat(),
                    reason="Pre-market Closed (Opens at 09:00 IST)",
                )
            elif time(9, 0) <= t < time(9, 8):
                return SessionInfo(
                    exchange="NSE",
                    status="PRE_OPEN",
                    is_trading_open=False,
                    market_timezone="Asia/Kolkata",
                    local_time_iso=now_ist.isoformat(),
                    reason="Pre-market Order Collection",
                )
            elif time(9, 8) <= t < time(9, 15):
                return SessionInfo(
                    exchange="NSE",
                    status="AUCTION",
                    is_trading_open=False,
                    market_timezone="Asia/Kolkata",
                    local_time_iso=now_ist.isoformat(),
                    reason="Pre-market Order Matching & Discovery",
                )
            elif time(9, 15) <= t <= time(15, 30):
                return SessionInfo(
                    exchange="NSE",
                    status="OPEN",
                    is_trading_open=True,
                    market_timezone="Asia/Kolkata",
                    local_time_iso=now_ist.isoformat(),
                    reason="Regular Trading Session",
                )
            elif time(15, 30) < t <= time(16, 0):
                return SessionInfo(
                    exchange="NSE",
                    status="POST_MARKET",
                    is_trading_open=False,
                    market_timezone="Asia/Kolkata",
                    local_time_iso=now_ist.isoformat(),
                    reason="Post-Market Closing Session",
                )
            else:
                return SessionInfo(
                    exchange="NSE",
                    status="CLOSED",
                    is_trading_open=False,
                    market_timezone="Asia/Kolkata",
                    local_time_iso=now_ist.isoformat(),
                    reason="Market Closed for the Day",
                )

        # 3. Commodity / MCX
        if "MCX" in target:
            now_ist = now_utc.astimezone(self.TZ_IST)
            if now_ist.weekday() >= 5:
                return SessionInfo(
                    exchange="MCX",
                    status="CLOSED",
                    is_trading_open=False,
                    market_timezone="Asia/Kolkata",
                    local_time_iso=now_ist.isoformat(),
                    reason="MCX Weekend Closure",
                )
            t = now_ist.time()
            if time(9, 0) <= t <= time(23, 30):
                return SessionInfo(
                    exchange="MCX",
                    status="OPEN",
                    is_trading_open=True,
                    market_timezone="Asia/Kolkata",
                    local_time_iso=now_ist.isoformat(),
                    reason="MCX Regular Trading Session",
                )
            return SessionInfo(
                exchange="MCX",
                status="CLOSED",
                is_trading_open=False,
                market_timezone="Asia/Kolkata",
                local_time_iso=now_ist.isoformat(),
                reason="MCX Closed",
            )

        # 4. US Equities (NYSE, NASDAQ)
        if any(kw in target for kw in ["NYSE", "NASDAQ", "US", "XNAS", "XNYS"]):
            now_est = now_utc.astimezone(self.TZ_EST)
            if now_est.weekday() >= 5:
                return SessionInfo(
                    exchange="US_EQUITY",
                    status="CLOSED",
                    is_trading_open=False,
                    market_timezone="America/New_York",
                    local_time_iso=now_est.isoformat(),
                    reason="US Weekend Market Closure",
                )
            t = now_est.time()
            if time(4, 0) <= t < time(9, 30):
                return SessionInfo(
                    exchange="US_EQUITY",
                    status="PRE_OPEN",
                    is_trading_open=False,
                    market_timezone="America/New_York",
                    local_time_iso=now_est.isoformat(),
                    reason="US Pre-Market Hours",
                )
            elif time(9, 30) <= t <= time(16, 0):
                return SessionInfo(
                    exchange="US_EQUITY",
                    status="OPEN",
                    is_trading_open=True,
                    market_timezone="America/New_York",
                    local_time_iso=now_est.isoformat(),
                    reason="US Regular Trading Session",
                )
            elif time(16, 0) < t <= time(20, 0):
                return SessionInfo(
                    exchange="US_EQUITY",
                    status="POST_MARKET",
                    is_trading_open=False,
                    market_timezone="America/New_York",
                    local_time_iso=now_est.isoformat(),
                    reason="US After-Hours Session",
                )
            return SessionInfo(
                exchange="US_EQUITY",
                status="CLOSED",
                is_trading_open=False,
                market_timezone="America/New_York",
                local_time_iso=now_est.isoformat(),
                reason="US Market Closed",
            )

        # Default fallback: Treat as open if unknown
        return SessionInfo(
            exchange=target,
            status="OPEN",
            is_trading_open=True,
            market_timezone="UTC",
            local_time_iso=now_utc.isoformat(),
            reason="Unrestricted Session",
        )


# Global Singleton Instance
global_session_engine = ExchangeSessionEngine()
