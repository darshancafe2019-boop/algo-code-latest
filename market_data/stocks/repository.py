"""
Stock Database Repository
=========================
Manages SQLite storage for stock metadata, user watchlists, favorites, and saved screens.
"""

import sqlite3
import json
import logging
from typing import Dict, Any, List, Optional
from src import db, config
from market_data.stocks.models import StockInstrument

logger = logging.getLogger("StockRepository")


class StockRepository:
    """Persistence Layer for Equities Universe."""

    @classmethod
    def init_schema(cls) -> None:
        """Initializes tables and indexes for pure stock universe."""
        with db.get_db_transaction() as conn:
            cursor = conn.cursor()
            
            # Stock Instruments Table
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS stock_instruments (
                    instrument_id TEXT PRIMARY KEY,
                    symbol TEXT NOT NULL,
                    company_name TEXT NOT NULL,
                    exchange TEXT NOT NULL,
                    region TEXT NOT NULL,
                    currency TEXT NOT NULL,
                    instrument_type TEXT DEFAULT 'EQUITY',
                    isin TEXT,
                    provider_token TEXT,
                    sector TEXT,
                    industry TEXT,
                    market_cap_category TEXT DEFAULT 'UNKNOWN',
                    index_memberships TEXT,
                    trading_status TEXT DEFAULT 'ACTIVE',
                    tick_size REAL DEFAULT 0.05,
                    lot_size INTEGER DEFAULT 1,
                    session_timezone TEXT DEFAULT 'Asia/Kolkata',
                    primary_provider TEXT DEFAULT 'upstox',
                    is_fno_enabled INTEGER DEFAULT 0,
                    last_metadata_refresh TEXT,
                    metadata TEXT
                )
                """
            )

            # Saved Screener Presets Table
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS stock_saved_screens (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    filters_json TEXT NOT NULL,
                    is_preset INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )

            # Stock Favorites / Watchlist Table
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS stock_favorites (
                    instrument_id TEXT PRIMARY KEY,
                    symbol TEXT NOT NULL,
                    exchange TEXT NOT NULL,
                    added_at TEXT NOT NULL
                )
                """
            )

            # Indexes for fast querying and filtering
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_stock_sym_ex ON stock_instruments(symbol, exchange)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_stock_ex ON stock_instruments(exchange)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_stock_region ON stock_instruments(region)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_stock_sector ON stock_instruments(sector)")

    @classmethod
    def upsert_instrument(cls, inst: StockInstrument) -> None:
        with db.get_db_transaction() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT OR REPLACE INTO stock_instruments (
                    instrument_id, symbol, company_name, exchange, region, currency,
                    instrument_type, isin, provider_token, sector, industry,
                    market_cap_category, index_memberships, trading_status,
                    tick_size, lot_size, session_timezone, primary_provider,
                    is_fno_enabled, last_metadata_refresh, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    inst.instrument_id, inst.symbol, inst.company_name, inst.exchange, inst.region, inst.currency,
                    inst.instrument_type, inst.isin, inst.provider_token, inst.sector, inst.industry,
                    inst.market_cap_category, json.dumps(inst.index_memberships), inst.trading_status,
                    inst.tick_size, inst.lot_size, inst.session_timezone, inst.primary_provider,
                    1 if inst.is_fno_enabled else 0, inst.last_metadata_refresh, json.dumps(inst.metadata)
                )
            )

    @classmethod
    def get_favorites(cls) -> List[str]:
        with db.get_db_transaction() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT instrument_id FROM stock_favorites")
            return [row[0] for row in cursor.fetchall()]

    @classmethod
    def toggle_favorite(cls, instrument_id: str, symbol: str, exchange: str) -> bool:
        with db.get_db_transaction() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1 FROM stock_favorites WHERE instrument_id = ?", (instrument_id,))
            exists = cursor.fetchone()
            if exists:
                cursor.execute("DELETE FROM stock_favorites WHERE instrument_id = ?", (instrument_id,))
                return False
            else:
                from datetime import datetime, timezone
                cursor.execute(
                    "INSERT INTO stock_favorites (instrument_id, symbol, exchange, added_at) VALUES (?, ?, ?, ?)",
                    (instrument_id, symbol, exchange, datetime.now(timezone.utc).isoformat())
                )
                return True


# Initialize schema
try:
    StockRepository.init_schema()
except Exception as e:
    logger.warning(f"StockRepository init_schema notice: {e}")
