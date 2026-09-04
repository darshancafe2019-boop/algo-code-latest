"""
Candle Store
============
OHLCV storage backend. Uses TimescaleDB (PostgreSQL) when available;
falls back to the existing SQLite candles_cache table gracefully.
"""
from __future__ import annotations

import logging
import os
import sqlite3
import threading
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from market_data_gateway.adapters.base import OHLCVCandle

logger = logging.getLogger("MDGateway.CandleStore")

TIMESCALE_SQL = """
CREATE TABLE IF NOT EXISTS ohlcv (
    time        TIMESTAMPTZ NOT NULL,
    symbol      TEXT NOT NULL,
    exchange    TEXT NOT NULL,
    provider    TEXT NOT NULL,
    timeframe   TEXT NOT NULL,
    open        DOUBLE PRECISION NOT NULL,
    high        DOUBLE PRECISION NOT NULL,
    low         DOUBLE PRECISION NOT NULL,
    close       DOUBLE PRECISION NOT NULL,
    volume      DOUBLE PRECISION NOT NULL,
    is_closed   BOOLEAN DEFAULT TRUE,
    UNIQUE (time, symbol, exchange, timeframe)
);
SELECT create_hypertable('ohlcv', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_ohlcv_sym_tf ON ohlcv (symbol, timeframe, time DESC);
"""


class CandleStore:
    """
    Unified candle store.
    Attempts TimescaleDB first; automatically falls back to SQLite.
    """

    def __init__(self):
        self._ts_conn = None  # asyncpg or psycopg2 connection
        self._sqlite_path: Optional[str] = None
        self._sqlite_lock = threading.RLock()
        self._backend = "sqlite"  # "timescale" | "sqlite"

    async def initialize(self) -> None:
        """Connect to TimescaleDB or fall back to SQLite."""
        ts_url = os.environ.get("TIMESCALE_URL", "")
        if ts_url and ts_url not in ("NOT_CONFIGURED", ""):
            ok = await self._init_timescale(ts_url)
            if ok:
                self._backend = "timescale"
                logger.info("CandleStore: using TimescaleDB")
                return

        # Fall back to canonical SQLite database
        from pathlib import Path
        project_root = Path(__file__).resolve().parent.parent
        default_db = project_root / "data" / "trading_bot.db"
        db_path = os.environ.get("DATABASE_PATH", str(default_db))
        if not os.path.exists(db_path) and default_db.exists():
            db_path = str(default_db)
        self._sqlite_path = db_path
        self._init_sqlite()
        logger.info("CandleStore: using canonical SQLite at %s", self._sqlite_path)

    async def _init_timescale(self, url: str) -> bool:
        try:
            import asyncpg
            self._ts_conn = await asyncpg.connect(url)
            # Create hypertable
            for stmt in TIMESCALE_SQL.strip().split(";"):
                stmt = stmt.strip()
                if stmt:
                    try:
                        await self._ts_conn.execute(stmt)
                    except Exception as e:
                        if "already a hypertable" not in str(e).lower():
                            logger.warning("TimescaleDB init stmt error: %s", e)
            return True
        except ImportError:
            logger.info("asyncpg not installed — TimescaleDB unavailable. Install: pip install asyncpg")
        except Exception as exc:
            logger.warning("TimescaleDB connection failed (%s) — falling back to SQLite", exc)
        return False

    def _init_sqlite(self) -> None:
        """Ensure the candles_cache table has the right schema."""
        with sqlite3.connect(self._sqlite_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS candles_cache (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    symbol     TEXT NOT NULL,
                    timeframe  TEXT NOT NULL,
                    timestamp  INTEGER NOT NULL,
                    open       REAL NOT NULL,
                    high       REAL NOT NULL,
                    low        REAL NOT NULL,
                    close      REAL NOT NULL,
                    volume     REAL NOT NULL,
                    exchange   TEXT DEFAULT 'UNKNOWN',
                    provider   TEXT DEFAULT 'unknown',
                    UNIQUE(symbol, timeframe, timestamp)
                )
            """)
            # Add columns to existing table if missing
            for col, defn in [("exchange", "TEXT DEFAULT 'UNKNOWN'"), ("provider", "TEXT DEFAULT 'unknown'")]:
                try:
                    conn.execute(f"ALTER TABLE candles_cache ADD COLUMN {col} {defn}")
                except Exception:
                    pass
            conn.execute("CREATE INDEX IF NOT EXISTS idx_cc_sym_tf_ts ON candles_cache(symbol, timeframe, timestamp DESC)")
            conn.commit()

    # ─── Write ────────────────────────────────────────────────────────────────

    async def store_candles(self, candles: List[OHLCVCandle]) -> int:
        """Insert candles, rejecting duplicates. Returns count stored."""
        if not candles:
            return 0
        if self._backend == "timescale":
            return await self._store_timescale(candles)
        return self._store_sqlite(candles)

    async def _store_timescale(self, candles: List[OHLCVCandle]) -> int:
        count = 0
        for c in candles:
            try:
                ts = datetime.fromisoformat(c.timestamp.replace("Z", "+00:00"))
                await self._ts_conn.execute(
                    """
                    INSERT INTO ohlcv (time, symbol, exchange, provider, timeframe, open, high, low, close, volume, is_closed)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    ON CONFLICT (time, symbol, exchange, timeframe) DO NOTHING
                    """,
                    ts, c.symbol, c.exchange, c.provider, c.timeframe,
                    c.open, c.high, c.low, c.close, c.volume, c.is_closed,
                )
                count += 1
            except Exception as exc:
                logger.debug("TimescaleDB insert error: %s", exc)
        return count

    def _store_sqlite(self, candles: List[OHLCVCandle]) -> int:
        count = 0
        with self._sqlite_lock:
            try:
                with sqlite3.connect(self._sqlite_path) as conn:
                    for c in candles:
                        try:
                            ts = int(datetime.fromisoformat(c.timestamp.replace("Z", "+00:00")).timestamp() * 1000)
                            conn.execute(
                                """
                                INSERT OR IGNORE INTO candles_cache
                                (symbol, timeframe, timestamp, open, high, low, close, volume, exchange, provider)
                                VALUES (?,?,?,?,?,?,?,?,?,?)
                                """,
                                (c.symbol, c.timeframe, ts, c.open, c.high, c.low, c.close, c.volume, c.exchange, c.provider),
                            )
                            count += 1
                        except Exception:
                            pass
                    conn.commit()
            except Exception as exc:
                logger.error("SQLite store error: %s", exc)
        return count

    # ─── Read ─────────────────────────────────────────────────────────────────

    async def get_candles(
        self,
        symbol: str,
        timeframe: str,
        from_dt: datetime,
        to_dt: datetime,
    ) -> List[OHLCVCandle]:
        if self._backend == "timescale":
            return await self._get_timescale(symbol, timeframe, from_dt, to_dt)
        return self._get_sqlite(symbol, timeframe, from_dt, to_dt)

    async def _get_timescale(self, symbol, timeframe, from_dt, to_dt) -> List[OHLCVCandle]:
        rows = await self._ts_conn.fetch(
            "SELECT time, open, high, low, close, volume, exchange, provider, is_closed FROM ohlcv "
            "WHERE symbol=$1 AND timeframe=$2 AND time >= $3 AND time <= $4 ORDER BY time ASC",
            symbol, timeframe, from_dt, to_dt,
        )
        return [
            OHLCVCandle(
                symbol=symbol, exchange=r["exchange"], provider=r["provider"],
                timeframe=timeframe, timestamp=r["time"].isoformat(),
                open=r["open"], high=r["high"], low=r["low"],
                close=r["close"], volume=r["volume"], is_closed=r["is_closed"],
            )
            for r in rows
        ]

    def _get_sqlite(self, symbol, timeframe, from_dt, to_dt) -> List[OHLCVCandle]:
        start_ms = int(from_dt.timestamp() * 1000)
        end_ms = int(to_dt.timestamp() * 1000)
        candles = []
        try:
            with sqlite3.connect(self._sqlite_path) as conn:
                rows = conn.execute(
                    "SELECT timestamp, open, high, low, close, volume, exchange, provider FROM candles_cache "
                    "WHERE symbol=? AND timeframe=? AND timestamp>=? AND timestamp<=? ORDER BY timestamp ASC",
                    (symbol, timeframe, start_ms, end_ms),
                ).fetchall()
                for row in rows:
                    ts = datetime.fromtimestamp(row[0] / 1000, tz=timezone.utc).isoformat()
                    candles.append(OHLCVCandle(
                        symbol=symbol, exchange=row[6] or "UNKNOWN", provider=row[7] or "unknown",
                        timeframe=timeframe, timestamp=ts,
                        open=row[1], high=row[2], low=row[3], close=row[4], volume=row[5],
                    ))
        except Exception as exc:
            logger.error("SQLite read error: %s", exc)
        return candles

    def get_backend(self) -> str:
        return self._backend


# Global singleton
global_candle_store = CandleStore()
