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
    Uses Binance Testnet (Sandbox) for live runner order/balance checks if configured.
    Implements a thread-safe singleton pattern per environment (Mainnet/Testnet).
    """
    _instances: Dict[bool, "DataFetcher"] = {}
    _lock = threading.Lock()

    def __new__(cls, use_testnet: bool = False):
        with cls._lock:
            if use_testnet not in cls._instances:
                instance = super(DataFetcher, cls).__new__(cls)
                instance._initialized = False
                cls._instances[use_testnet] = instance
            return cls._instances[use_testnet]

    def __init__(self, use_testnet: bool = False):
        if getattr(self, "_initialized", False):
            return
        self.use_testnet = use_testnet
        
        if self.use_testnet:
            logger.info("Initializing CCXT Binance in TESTNET mode.")
            # Set credentials for Testnet
            self.exchange = ccxt.binance({
                'apiKey': config.BINANCE_TESTNET_API_KEY,
                'secret': config.BINANCE_TESTNET_SECRET_KEY,
                'enableRateLimit': True,
                'timeout': 10000,
            })
            self.exchange.set_sandbox_mode(True)
        else:
            logger.info("Initializing CCXT Binance in MAINNET mode (Public endpoints).")
            # Public mainnet needs no API credentials
            self.exchange = ccxt.binance({
                'enableRateLimit': True,
                'timeout': 10000,
            })
        self._initialized = True

    def fetch_historical_ohlcv(
        self,
        symbol: str,
        timeframe: str,
        start_date_str: str,
        end_date_str: Optional[str] = None
    ) -> pd.DataFrame:
        """
        Fetches historical OHLCV candles from Binance Mainnet by handling pagination.
        
        Args:
            symbol (str): The trading pair, e.g. "BTC/USDT".
            timeframe (str): Candle timeframe, e.g. "1h", "4h".
            start_date_str (str): Start date string (YYYY-MM-DD).
            end_date_str (str, optional): End date string (YYYY-MM-DD). If None, fetches up to now.
            
        Returns:
            pd.DataFrame: Pandas DataFrame with columns: [timestamp, open, high, low, close, volume]
        """
        # Ensure we use Mainnet public endpoint for deep historical data
        if self.use_testnet:
            logger.warning("Forcing Mainnet connection for deep historical data fetch.")
            mainnet_exchange = get_mainnet_fetcher().exchange
        else:
            mainnet_exchange = self.exchange

        # Parse start and end times to milliseconds
        since = int(pd.to_datetime(start_date_str, utc=True).timestamp() * 1000)
        end_time = int(pd.to_datetime(end_date_str, utc=True).timestamp() * 1000) if end_date_str else None

        all_candles = []
        limit = 1000  # Binance maximum candle limit per request
        
        logger.info(f"Starting historical fetch for {symbol} {timeframe} from {start_date_str}...")

        while True:
            try:
                # Fetch chunk of candles
                candles = mainnet_exchange.fetch_ohlcv(
                    symbol=symbol,
                    timeframe=timeframe,
                    since=since,
                    limit=limit
                )
                
                if not candles:
                    logger.info("No more candles returned by the API.")
                    break
                
                # Check if the last candle exceeds our end_time (if defined)
                last_timestamp = candles[-1][0]
                
                all_candles.extend(candles)
                
                # Next request starts right after the last candle received
                since = last_timestamp + 1
                
                # Progress logging
                last_date = pd.to_datetime(last_timestamp, unit='ms')
                logger.info(f"Fetched {len(candles)} candles. Latest timestamp: {last_date}")

                # Stop conditions
                if len(candles) < limit:
                    logger.info("Fetched final chunk of candles.")
                    break
                
                if end_time and last_timestamp >= end_time:
                    logger.info(f"Reached end date limit: {end_date_str}")
                    break

                # Sleep to respect rate limits
                time.sleep(mainnet_exchange.rateLimit / 1000.0)

            except ccxt.NetworkError as ne:
                logger.error(f"Network error during fetch: {ne}. Retrying in 10 seconds...")
                time.sleep(10)
            except ccxt.ExchangeError as ee:
                logger.error(f"Exchange error during fetch: {ee}. Stopping fetch.")
                break
            except Exception as e:
                logger.error(f"Unexpected error: {e}. Stopping fetch.")
                break

        # Process candles into a dataframe
        if not all_candles:
            return pd.DataFrame()

        df = pd.DataFrame(
            all_candles,
            columns=["timestamp", "open", "high", "low", "close", "volume"]
        )
        
        # Deduplicate and sort
        df.drop_duplicates(subset=["timestamp"], inplace=True)
        df.sort_values(by="timestamp", inplace=True)
        df.reset_index(drop=True, inplace=True)

        # Filter out rows beyond end_time if end_time was specified
        if end_time:
            df = df[df["timestamp"] <= end_time]

        return df

    def fetch_live_ohlcv(self, symbol: str, timeframe: str, limit: int = 500) -> pd.DataFrame:
        """
        Fetches the most recent live candles for indicator calculations.
        If use_testnet is True, checks credentials. Note that Testnet candles can be
        unstable/disjointed, so using Mainnet public endpoint is generally preferred
        for live indicator checks unless explicitly required.
        
        Args:
            symbol (str): The trading pair, e.g. "BTC/USDT".
            timeframe (str): Candle timeframe, e.g. "1h", "4h".
            limit (int): Number of recent candles to fetch (e.g. 500 to cover 200 EMA).
            
        Returns:
            pd.DataFrame: Pandas DataFrame of recent candles.
        """
        try:
            candles = self.exchange.fetch_ohlcv(
                symbol=symbol,
                timeframe=timeframe,
                limit=limit
            )
            df = pd.DataFrame(
                candles,
                columns=["timestamp", "open", "high", "low", "close", "volume"]
            )
            df.sort_values(by="timestamp", inplace=True)
            df.reset_index(drop=True, inplace=True)
            return df
        except ccxt.RateLimitExceeded as rle:
            logger.error(f"CCXT Rate Limit Exceeded (429) for {symbol} {timeframe}: {rle}. Backing off 30s...")
            time.sleep(30)
            raise rle
        except (ccxt.RequestTimeout, ccxt.NetworkError) as net_err:
            logger.error(f"CCXT Network/Timeout error for {symbol} {timeframe}: {net_err}")
            raise net_err
        except Exception as e:
            logger.error(f"Error fetching live OHLCV for {symbol} {timeframe}: {e}")
            raise e

    def fetch_testnet_balance(self) -> float:
        """
        Fetches the USDT balance of the Binance Testnet account.
        This verifies that the credentials work on Testnet.
        
        Returns:
            float: Available USDT balance.
        """
        if not self.use_testnet:
            raise ValueError("Testnet balance can only be fetched when initialized in TESTNET mode.")
            
        try:
            balance = self.exchange.fetch_balance()
            usdt_balance = balance.get('USDT', {}).get('free', 0.0)
            logger.info(f"Testnet free USDT balance: {usdt_balance}")
            return float(usdt_balance)
        except Exception as e:
            logger.error(f"Error fetching Testnet balance: {e}")
            raise e


def get_mainnet_fetcher() -> DataFetcher:
    """Return the shared thread-safe singleton DataFetcher for Binance Mainnet."""
    return DataFetcher(use_testnet=False)


def get_testnet_fetcher() -> DataFetcher:
    """Return the shared thread-safe singleton DataFetcher for Binance Testnet."""
    return DataFetcher(use_testnet=True)


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

