import time
import logging
import threading
from typing import Optional, Dict, Any, List, Tuple
import pandas as pd
import ccxt
from src import config

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("DataFetcher")


class DataFetcher:
    """
    Handles fetching of historical and live crypto market data using ccxt.
    Uses Binance Mainnet public endpoints for historical data (no API key needed).
    Uses Binance Testnet (Sandbox) for isolated testnet orders and balance checks.
    Uses Binance Spot Production for live production execution and account balance.
    Implements a thread-safe singleton pattern per environment (PUBLIC / TESTNET / LIVE).
    """
    _instances: Dict[str, "DataFetcher"] = {}
    _lock = threading.Lock()

    def __new__(cls, use_testnet: bool = False, mode: Optional[str] = None):
        env_mode = (mode or ("TESTNET" if use_testnet else "PUBLIC")).upper()
        if env_mode == "MAINNET":
            env_mode = "PUBLIC"
        with cls._lock:
            if env_mode not in cls._instances:
                instance = super(DataFetcher, cls).__new__(cls)
                instance._initialized = False
                cls._instances[env_mode] = instance
            return cls._instances[env_mode]

    def __init__(self, use_testnet: bool = False, mode: Optional[str] = None):
        if getattr(self, "_initialized", False):
            return
        env_mode = (mode or ("TESTNET" if use_testnet else "PUBLIC")).upper()
        if env_mode == "MAINNET":
            env_mode = "PUBLIC"
        self.mode = env_mode
        self.use_testnet = (env_mode == "TESTNET")
        self.is_live = (env_mode in ["LIVE", "PRODUCTION"])
        
        if self.mode == "TESTNET":
            logger.info("Initializing CCXT Binance in TESTNET mode.")
            self.exchange = ccxt.binance({
                'apiKey': config.BINANCE_TESTNET_API_KEY,
                'secret': config.BINANCE_TESTNET_SECRET_KEY,
                'enableRateLimit': True,
                'timeout': 10000,
                'options': {
                    'adjustForTimeDifference': True,
                    'recvWindow': 60000,
                },
            })
            self.exchange.set_sandbox_mode(True)
            try:
                self.exchange.load_time_difference()
            except Exception as td_err:
                logger.debug("Could not sync exchange time difference: %s", td_err)

        elif self.mode in ["LIVE", "PRODUCTION"]:
            logger.info("Initializing CCXT Binance in PRODUCTION LIVE mode.")
            self.exchange = ccxt.binance({
                'apiKey': getattr(config, "BINANCE_LIVE_API_KEY", ""),
                'secret': getattr(config, "BINANCE_LIVE_SECRET_KEY", ""),
                'enableRateLimit': True,
                'timeout': 10000,
                'options': {
                    'adjustForTimeDifference': True,
                    'recvWindow': 60000,
                },
            })
            self.exchange.set_sandbox_mode(False)
            try:
                self.exchange.load_time_difference()
            except Exception as td_err:
                logger.debug("Could not sync exchange time difference: %s", td_err)

        else:
            logger.info("Initializing CCXT Binance in PUBLIC MAINNET mode (Public endpoints).")
            self.exchange = ccxt.binance({
                'enableRateLimit': True,
                'timeout': 10000,
            })
            self.exchange.set_sandbox_mode(False)
            
        self._initialized = True

    def fetch_testnet_balance(self) -> float:
        """
        Fetches the USDT balance of the Binance Testnet account.
        This verifies that the credentials work on Testnet.
        """
        if self.mode != "TESTNET":
            raise ValueError("Testnet balance can only be fetched when initialized in TESTNET mode.")
            
        try:
            balance = self.exchange.fetch_balance()
            usdt_balance = balance.get('USDT', {}).get('free', 0.0)
            logger.info(f"Testnet free USDT balance: {usdt_balance}")
            return float(usdt_balance)
        except Exception as e:
            logger.error(f"Error fetching Testnet balance: {e}")
            raise e

    def fetch_live_balance(self) -> float:
        """
        Fetches the USDT balance of the Binance Spot PRODUCTION account.
        Fails closed if live production API keys are missing.
        """
        if not getattr(config, "BINANCE_LIVE_API_KEY", "") or not getattr(config, "BINANCE_LIVE_SECRET_KEY", ""):
            raise PermissionError("LIVE_CREDENTIALS_MISSING: BINANCE_LIVE_API_KEY and BINANCE_LIVE_SECRET_KEY must be configured for LIVE production balance query.")
            
        try:
            balance = self.exchange.fetch_balance()
            usdt_balance = balance.get('USDT', {}).get('free', 0.0)
            logger.info(f"Production Live free USDT balance: {usdt_balance}")
            return float(usdt_balance)
        except Exception as e:
            logger.error(f"Error fetching Production Live balance: {e}")
            raise e

    def fetch_live_ohlcv(self, symbol: str = "BTC/USDT", timeframe: str = "1m", limit: int = 100) -> pd.DataFrame:
        """Fetches OHLCV candlestick data and returns a pandas DataFrame."""
        try:
            raw = self.exchange.fetch_ohlcv(symbol, timeframe=timeframe, limit=limit)
            df = pd.DataFrame(raw, columns=["timestamp", "open", "high", "low", "close", "volume"])
            df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms", utc=True)
            try:
                from src.market_data.stale_protection import global_stale_protection
                global_stale_protection.record_tick(symbol)
            except Exception:
                pass
            return df
        except Exception as e:
            logger.warning(f"Error fetching live OHLCV for {symbol}: {e}")
            return pd.DataFrame(columns=["timestamp", "open", "high", "low", "close", "volume"])

    def fetch_quote(self, symbol: str = "BTC/USDT") -> Dict[str, Any]:
        """Fetches the latest ticker quote for a symbol."""
        try:
            ticker = self.exchange.fetch_ticker(symbol)
            try:
                from src.market_data.stale_protection import global_stale_protection
                global_stale_protection.record_tick(symbol)
            except Exception:
                pass
            return ticker
        except Exception as e:
            logger.warning(f"Error fetching quote for {symbol}: {e}")
            return {}

    def get_usdt_balance(self) -> float:
        """Fetches available USDT balance."""
        try:
            balance = self.exchange.fetch_balance()
            return float(balance.get("USDT", {}).get("free", 0.0))
        except Exception as e:
            logger.warning(f"Error fetching USDT balance: {e}")
            return 0.0


def get_mainnet_fetcher() -> DataFetcher:
    """Return the shared thread-safe singleton DataFetcher for Binance Mainnet (Public)."""
    return DataFetcher(mode="PUBLIC")


def get_public_fetcher() -> DataFetcher:
    """Return the shared thread-safe singleton DataFetcher for Binance Public."""
    return DataFetcher(mode="PUBLIC")


def get_testnet_fetcher() -> DataFetcher:
    """Return the shared thread-safe singleton DataFetcher for Binance Testnet."""
    return DataFetcher(mode="TESTNET")


def get_live_fetcher() -> DataFetcher:
    """Return the shared thread-safe singleton DataFetcher for Binance Spot PRODUCTION."""
    return DataFetcher(mode="LIVE")


def get_live_production_fetcher() -> DataFetcher:
    """Return the shared thread-safe singleton DataFetcher for Binance Spot PRODUCTION."""
    return DataFetcher(mode="LIVE")


# =============================================================================
# CANONICAL MARKET DATA MODELS & FRESHNESS ENGINE
# =============================================================================
class DataFreshnessStatus:
    LIVE = "LIVE"
    DELAYED = "DELAYED"
    STALE = "STALE"
    DISCONNECTED = "DISCONNECTED"
    INVALID = "INVALID"
    NOT_CONFIGURED = "NOT_CONFIGURED"


class MarketTick:
    def __init__(
        self,
        symbol: str,
        price: float,
        bid: float = 0.0,
        ask: float = 0.0,
        volume_24h: float = 0.0,
        change_24h_pct: float = 0.0,
        high_24h: float = 0.0,
        low_24h: float = 0.0,
        provider: str = "binance",
        exchange: str = "Binance",
        timestamp_ms: Optional[int] = None
    ):
        self.symbol = symbol
        self.price = float(price)
        self.bid = float(bid)
        self.ask = float(ask)
        self.spread = round(abs(self.ask - self.bid), 4) if (self.bid > 0 and self.ask > 0) else 0.0
        self.spread_pct = round((self.spread / self.price * 100.0), 4) if self.price > 0 else 0.0
        self.volume_24h = float(volume_24h)
        self.change_24h_pct = float(change_24h_pct)
        self.high_24h = float(high_24h)
        self.low_24h = float(low_24h)
        self.provider = provider
        self.exchange = exchange
        self.received_at_ms = int(time.time() * 1000)
        self.timestamp_ms = timestamp_ms or self.received_at_ms

    @property
    def age_ms(self) -> int:
        return max(0, int(time.time() * 1000) - self.timestamp_ms)

    @property
    def status(self) -> str:
        age_sec = self.age_ms / 1000.0
        if self.price <= 0:
            return DataFreshnessStatus.INVALID
        if age_sec <= 3.0:
            return DataFreshnessStatus.LIVE
        elif age_sec <= 30.0:
            return DataFreshnessStatus.DELAYED
        else:
            return DataFreshnessStatus.STALE

    def to_dict(self) -> Dict[str, Any]:
        return {
            "symbol": self.symbol,
            "price": self.price,
            "bid": self.bid,
            "ask": self.ask,
            "spread": self.spread,
            "spread_pct": self.spread_pct,
            "volume_24h": self.volume_24h,
            "change_24h_pct": self.change_24h_pct,
            "high_24h": self.high_24h,
            "low_24h": self.low_24h,
            "provider": self.provider,
            "exchange": self.exchange,
            "timestamp_ms": self.timestamp_ms,
            "received_at_ms": self.received_at_ms,
            "age_ms": self.age_ms,
            "status": self.status
        }


def calculate_data_quality_score(
    tick: Optional[MarketTick] = None,
    tick_dict: Optional[Dict[str, Any]] = None,
    max_acceptable_age_sec: float = 60.0,
    max_acceptable_spread_pct: float = 2.0
) -> Dict[str, Any]:
    """
    Computes a 0 to 100 Data Quality Score based on:
    - Freshness / latency (40% weight)
    - Price & spread sanity (30% weight)
    - Field completeness (20% weight)
    - Sequence / Provider status (10% weight)
    """
    data = tick.to_dict() if tick else (tick_dict or {})
    if not data:
        return {
            "score": 0.0,
            "status": "CRITICAL",
            "is_tradable": False,
            "reason": "Missing market data tick.",
            "components": {"freshness": 0, "spread_sanity": 0, "completeness": 0, "provider": 0}
        }

    price = float(data.get("price", 0.0))
    bid = float(data.get("bid", 0.0))
    ask = float(data.get("ask", 0.0))
    age_sec = float(data.get("age_ms", 0)) / 1000.0
    spread_pct = float(data.get("spread_pct", 0.0))

    # 1. Freshness Score (0 - 40 pts)
    if age_sec <= 2.0:
        freshness_score = 40.0
    elif age_sec <= max_acceptable_age_sec:
        freshness_score = max(0.0, 40.0 * (1.0 - (age_sec / max_acceptable_age_sec)))
    else:
        freshness_score = 0.0

    # 2. Spread & Price Sanity (0 - 30 pts)
    spread_score = 0.0
    if price > 0:
        spread_score += 15.0
        if 0 < spread_pct <= max_acceptable_spread_pct:
            spread_score += 15.0
        elif spread_pct == 0 and bid > 0 and ask > 0:
            spread_score += 10.0
        elif spread_pct > max_acceptable_spread_pct:
            spread_score += max(0.0, 15.0 * (1.0 - (spread_pct / (max_acceptable_spread_pct * 3.0))))

    # 3. Field Completeness (0 - 20 pts)
    fields = ["price", "volume_24h", "high_24h", "low_24h", "provider"]
    present = sum(1 for f in fields if data.get(f) is not None)
    completeness_score = (present / len(fields)) * 20.0

    # 4. Provider / Status (0 - 10 pts)
    status = data.get("status", DataFreshnessStatus.LIVE)
    if status == DataFreshnessStatus.LIVE:
        provider_score = 10.0
    elif status == DataFreshnessStatus.DELAYED:
        provider_score = 7.0
    else:
        provider_score = 0.0

    total_score = round(freshness_score + spread_score + completeness_score + provider_score, 1)

    if total_score >= 85.0:
        quality_status = "EXCELLENT"
    elif total_score >= 70.0:
        quality_status = "GOOD"
    elif total_score >= 50.0:
        quality_status = "WARNING"
    else:
        quality_status = "CRITICAL"

    return {
        "score": total_score,
        "status": quality_status,
        "is_tradable": total_score >= 60.0 and age_sec <= max_acceptable_age_sec and price > 0,
        "age_seconds": round(age_sec, 2),
        "components": {
            "freshness": round(freshness_score, 1),
            "spread_sanity": round(spread_score, 1),
            "completeness": round(completeness_score, 1),
            "provider_status": round(provider_score, 1)
        }
    }

