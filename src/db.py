import copy
import json
import logging
import random
import shutil
import sqlite3
import threading
import time
import uuid
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple, TypeVar


from src import config

logger = logging.getLogger("DB")

_db_initialized = False
_db_init_lock = threading.Lock()
F = TypeVar("F", bound=Callable[..., Any])


def with_db_retry(max_retries: int = 5, base_delay: float = 0.05, max_delay: float = 1.0) -> Callable[[F], F]:
    """
    Decorator that catches transient SQLite lock/busy errors and retries with jittered exponential backoff.
    Logs DB_LOCK_DETECTED, DB_LOCK_RETRY, and DB_LOCK_RECOVERED.
    """
    def decorator(func: F) -> F:
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            retries = 0
            while True:
                try:
                    res = func(*args, **kwargs)
                    if retries > 0:
                        logger.info(f"DB_LOCK_RECOVERED: Function '{func.__name__}' succeeded after {retries} retries.")
                    return res
                except sqlite3.OperationalError as e:
                    err_msg = str(e).lower()
                    if "locked" in err_msg or "busy" in err_msg:
                        retries += 1
                        if retries > max_retries:
                            logger.error(f"DB_LOCK_FAILURE: Function '{func.__name__}' failed after {max_retries} retries: {e}")
                            raise
                        # Exponential backoff with random jitter
                        sleep_time = min(max_delay, base_delay * (2 ** (retries - 1))) + random.uniform(0.01, 0.05)
                        logger.warning(f"DB_LOCK_DETECTED / DB_LOCK_RETRY: '{func.__name__}' hit '{e}', retry {retries}/{max_retries} in {sleep_time:.3f}s")
                        time.sleep(sleep_time)
                    else:
                        raise
                except Exception:
                    raise
        return wrapper  # type: ignore
    return decorator


def get_connection() -> sqlite3.Connection:
    """
    Create and return an optimized SQLite connection with 30s timeout and busy_timeout=10000ms.
    Does NOT change journal_mode on every connect to avoid exclusive lock contention.
    """
    config.DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(config.DB_PATH), timeout=30.0)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA busy_timeout=10000;")
        conn.execute("PRAGMA foreign_keys=ON;")
    except Exception:
        pass
    return conn


@contextmanager
def get_db_transaction():
    """
    Context manager for short, safe, atomic SQLite transactions.
    Automatically commits on success, rolls back on exception, and ensures the connection is closed.
    """
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception as exc:
        try:
            conn.rollback()
        except Exception:
            pass
        raise exc
    finally:
        try:
            conn.close()
        except Exception:
            pass


@with_db_retry(max_retries=5)
def safe_execute(sql: str, params: tuple = ()) -> bool:
    """Execute a mutating statement (INSERT, UPDATE, DELETE) inside a committed transaction."""
    with get_db_transaction() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
    return True


@with_db_retry(max_retries=5)
def safe_query(sql: str, params: tuple = ()) -> list:
    """Execute a read-only query safely and return dict rows."""
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(sql, params)
        rows = [dict(r) for r in cursor.fetchall()]
        return rows
    except Exception as e:
        logger.error("safe_query error: %s", e)
        return []
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


def safe_query_one(sql: str, params: tuple = ()) -> Optional[dict]:
    """Execute a read-only query safely and return first dict row or None."""
    rows = safe_query(sql, params)
    return rows[0] if rows else None


def init_db(force: bool = False) -> None:
    """Create or verify SQLite tables and configure WAL journal mode once at startup."""
    global _db_initialized
    with _db_init_lock:
        if _db_initialized and not force:
            return

        for attempt in range(5):
            try:
                conn = get_connection()
                cursor = conn.cursor()
                try:
                    cursor.execute("PRAGMA journal_mode=WAL;")
                    cursor.execute("PRAGMA synchronous=NORMAL;")
                    cursor.execute("PRAGMA busy_timeout=10000;")
                except Exception as pragma_err:
                    logger.debug("WAL pragma setup notice: %s", pragma_err)

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS signals_log (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TEXT NOT NULL,
                        symbol TEXT NOT NULL,
                        signal_type TEXT NOT NULL,
                        price REAL NOT NULL,
                        filters_status TEXT,
                        is_blocked INTEGER DEFAULT 0,
                        reason TEXT,
                        context TEXT
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS trades_log (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TEXT NOT NULL,
                        symbol TEXT NOT NULL,
                        direction TEXT NOT NULL,
                        entry_price REAL NOT NULL,
                        stop_loss REAL NOT NULL,
                        take_profit REAL NOT NULL,
                        position_size REAL NOT NULL,
                        status TEXT DEFAULT 'OPEN',
                        exit_price REAL,
                        exit_timestamp TEXT,
                        result_pnl REAL DEFAULT 0.0,
                        metadata TEXT
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS system_errors (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TEXT NOT NULL,
                        error_message TEXT NOT NULL,
                        stack_trace TEXT,
                        module TEXT,
                        function_name TEXT,
                        retry_count INTEGER DEFAULT 0,
                        fingerprint TEXT,
                        error_code TEXT DEFAULT 'RUNNER_ERROR',
                        category TEXT DEFAULT 'INTERNAL',
                        severity TEXT DEFAULT 'ERROR',
                        status TEXT DEFAULT 'ACTIVE',
                        provider TEXT DEFAULT 'Binance',
                        operation TEXT DEFAULT 'runner_cycle',
                        bot_id TEXT DEFAULT 'system',
                        instrument_id TEXT DEFAULT 'UNKNOWN',
                        occurrence_count INTEGER DEFAULT 1,
                        first_seen TEXT,
                        last_seen TEXT,
                        http_status INTEGER,
                        is_retryable INTEGER DEFAULT 0,
                        retry_state TEXT DEFAULT 'STOPPED',
                        root_cause TEXT,
                        plain_explanation TEXT,
                        recommended_action TEXT,
                        resolved_at TEXT,
                        archived_at TEXT
                    )
                    """
                )

                # SQLite column migrations if table already existed without new columns
                cols_to_add = [
                    ("fingerprint", "TEXT"),
                    ("error_code", "TEXT DEFAULT 'RUNNER_ERROR'"),
                    ("category", "TEXT DEFAULT 'INTERNAL'"),
                    ("severity", "TEXT DEFAULT 'ERROR'"),
                    ("status", "TEXT DEFAULT 'ACTIVE'"),
                    ("provider", "TEXT DEFAULT 'Binance'"),
                    ("operation", "TEXT DEFAULT 'runner_cycle'"),
                    ("bot_id", "TEXT DEFAULT 'system'"),
                    ("instrument_id", "TEXT DEFAULT 'UNKNOWN'"),
                    ("occurrence_count", "INTEGER DEFAULT 1"),
                    ("first_seen", "TEXT"),
                    ("last_seen", "TEXT"),
                    ("http_status", "INTEGER"),
                    ("is_retryable", "INTEGER DEFAULT 0"),
                    ("retry_state", "TEXT DEFAULT 'STOPPED'"),
                    ("root_cause", "TEXT"),
                    ("plain_explanation", "TEXT"),
                    ("recommended_action", "TEXT"),
                    ("resolved_at", "TEXT"),
                    ("archived_at", "TEXT"),
                ]
                for col_name, col_type in cols_to_add:
                    try:
                        cursor.execute(f"ALTER TABLE system_errors ADD COLUMN {col_name} {col_type}")
                    except Exception:
                        pass  # Column already exists

                cursor.execute("CREATE INDEX IF NOT EXISTS idx_system_errors_fp ON system_errors(fingerprint)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_system_errors_status ON system_errors(status)")

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS heartbeat_log (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TEXT NOT NULL,
                        status TEXT NOT NULL,
                        details TEXT
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS bot_status (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TEXT NOT NULL,
                        status TEXT NOT NULL,
                        exchange_status TEXT,
                        telegram_status TEXT,
                        database_status TEXT,
                        details TEXT
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS performance_stats (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TEXT NOT NULL,
                        win_rate REAL,
                        total_trades INTEGER,
                        total_pnl REAL,
                        max_drawdown REAL,
                        sharpe_ratio REAL,
                        profit_factor REAL
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS api_logs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TEXT NOT NULL,
                        endpoint TEXT NOT NULL,
                        method TEXT NOT NULL,
                        status_code INTEGER NOT NULL,
                        response_time_ms REAL,
                        error_message TEXT
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS telegram_logs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TEXT NOT NULL,
                        message_type TEXT DEFAULT 'GENERAL',
                        status TEXT DEFAULT 'PENDING',
                        recipient TEXT DEFAULT '',
                        error_message TEXT DEFAULT '',
                        event_id TEXT DEFAULT '',
                        bot_id TEXT DEFAULT '',
                        message TEXT DEFAULT '',
                        error TEXT DEFAULT '',
                        created_at TEXT DEFAULT (datetime('now')),
                        sent_at TEXT,
                        retry_count INTEGER DEFAULT 0,
                        success INTEGER DEFAULT 0
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS telegram_settings (
                        key TEXT PRIMARY KEY,
                        value TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS user_appearance_settings (
                        id INTEGER PRIMARY KEY CHECK (id = 1),
                        theme_id TEXT NOT NULL DEFAULT 'midnight-emerald',
                        theme_name TEXT NOT NULL DEFAULT 'Midnight Emerald',
                        config_json TEXT NOT NULL,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS trade_journal_reviews (
                        trade_id INTEGER PRIMARY KEY,
                        setup_quality INTEGER DEFAULT 3,
                        execution_quality INTEGER DEFAULT 3,
                        discipline_rating INTEGER DEFAULT 3,
                        confidence_before INTEGER DEFAULT 3,
                        emotion_before TEXT DEFAULT 'Calm',
                        emotion_during TEXT DEFAULT 'Focused',
                        emotion_after TEXT DEFAULT 'Neutral',
                        entry_reasoning TEXT DEFAULT '',
                        exit_reasoning TEXT DEFAULT '',
                        mistakes TEXT DEFAULT '',
                        lessons_learned TEXT DEFAULT '',
                        emotional_state TEXT DEFAULT 'NEUTRAL',
                        tags TEXT DEFAULT '[]',
                        playbook_id TEXT DEFAULT '',
                        chart_snapshot_url TEXT DEFAULT '',
                        follow_up_actions TEXT DEFAULT '',
                        what_went_well TEXT DEFAULT '',
                        what_went_wrong TEXT DEFAULT '',
                        take_again_verdict TEXT DEFAULT 'YES',
                        automated_system_review TEXT DEFAULT '',
                        strategy_compliance_score REAL DEFAULT 90.0,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS trade_playbooks (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        category TEXT DEFAULT 'GENERAL',
                        description TEXT DEFAULT '',
                        required_conditions TEXT DEFAULT '[]',
                        invalidation_rules TEXT DEFAULT '[]',
                        target_rr REAL DEFAULT 2.0,
                        preferred_regime TEXT DEFAULT 'TRENDING',
                        mistakes_to_avoid TEXT DEFAULT '[]',
                        is_active INTEGER DEFAULT 1,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS trade_attachments (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        trade_id INTEGER NOT NULL,
                        category TEXT DEFAULT 'At Entry',
                        file_url TEXT NOT NULL,
                        description TEXT DEFAULT '',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                    """
                )

                # Migrate missing columns into trade_journal_reviews if table already existed
                cursor.execute("PRAGMA table_info(trade_journal_reviews)")
                existing_cols = [r[1] for r in cursor.fetchall()]
                review_col_defs = {
                    "confidence_before": "INTEGER DEFAULT 3",
                    "emotion_before": "TEXT DEFAULT 'Calm'",
                    "emotion_during": "TEXT DEFAULT 'Focused'",
                    "emotion_after": "TEXT DEFAULT 'Neutral'",
                    "playbook_id": "TEXT DEFAULT ''",
                    "what_went_well": "TEXT DEFAULT ''",
                    "what_went_wrong": "TEXT DEFAULT ''",
                    "take_again_verdict": "TEXT DEFAULT 'YES'",
                    "automated_system_review": "TEXT DEFAULT ''",
                    "strategy_compliance_score": "REAL DEFAULT 90.0",
                }
                for col_name, col_def in review_col_defs.items():
                    if col_name not in existing_cols:
                        try:
                            cursor.execute(f"ALTER TABLE trade_journal_reviews ADD COLUMN {col_name} {col_def}")
                        except Exception:
                            pass

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS bot_instances (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        symbol TEXT NOT NULL,
                        strategy TEXT NOT NULL,
                        timeframe TEXT NOT NULL,
                        asset_class TEXT DEFAULT 'Crypto',
                        exchange TEXT DEFAULT 'ccxt_binance',
                        execution_mode TEXT DEFAULT 'PAPER',
                        status TEXT DEFAULT 'STOPPED',
                        created_at TEXT NOT NULL DEFAULT (datetime('now')),
                        updated_at TEXT DEFAULT (datetime('now')),
                        started_at TEXT,
                        stopped_at TEXT,
                        paused_at TEXT,
                        resumed_at TEXT,
                        last_heartbeat TEXT,
                        last_scan_at TEXT,
                        next_scan_at TEXT,
                        scan_count INTEGER DEFAULT 0,
                        trade_count INTEGER DEFAULT 0,
                        open_position_count INTEGER DEFAULT 0,
                        current_signal TEXT DEFAULT 'HOLD',
                        signal_confidence REAL DEFAULT 0.0,
                        required_confidence REAL DEFAULT 75.0,
                        allocated_capital REAL DEFAULT 10000.0,
                        current_equity REAL DEFAULT 10000.0,
                        realized_pnl REAL DEFAULT 0.0,
                        unrealized_pnl REAL DEFAULT 0.0,
                        error_count INTEGER DEFAULT 0,
                        last_error TEXT DEFAULT '',
                        process_id TEXT DEFAULT '',
                        config_json TEXT DEFAULT '{}',
                        template_id TEXT DEFAULT '',
                        group_name TEXT DEFAULT 'Crypto Scalping Bots',
                        description TEXT DEFAULT '',
                        risk_per_trade REAL DEFAULT 2.0,
                        last_checked_at TEXT,
                        stuck_explanation TEXT DEFAULT '',
                        is_deleted INTEGER DEFAULT 0,
                        deleted_at TEXT,
                        deleted_by TEXT,
                        deletion_reason TEXT
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS candles_cache (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        symbol TEXT NOT NULL,
                        timeframe TEXT NOT NULL,
                        timestamp INTEGER NOT NULL,
                        open REAL NOT NULL,
                        high REAL NOT NULL,
                        low REAL NOT NULL,
                        close REAL NOT NULL,
                        volume REAL NOT NULL,
                        UNIQUE(symbol, timeframe, timestamp)
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS system_health (
                        component_name TEXT PRIMARY KEY,
                        status TEXT NOT NULL,
                        last_updated TEXT NOT NULL,
                        consecutive_failures INTEGER DEFAULT 0,
                        last_error TEXT,
                        metrics_json TEXT
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS daily_statistics (
                        date TEXT PRIMARY KEY,
                        total_trades INTEGER DEFAULT 0,
                        winning_trades INTEGER DEFAULT 0,
                        losing_trades INTEGER DEFAULT 0,
                        net_pnl REAL DEFAULT 0.0,
                        start_balance REAL DEFAULT 10000.0,
                        end_balance REAL DEFAULT 10000.0,
                        max_drawdown REAL DEFAULT 0.0
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS bot_activity_logs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TEXT NOT NULL,
                        bot_id TEXT NOT NULL,
                        activity_type TEXT NOT NULL,
                        message TEXT NOT NULL,
                        details_json TEXT
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS bot_decision_logs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TEXT NOT NULL,
                        bot_id TEXT NOT NULL,
                        candle_timestamp TEXT NOT NULL,
                        action_taken TEXT NOT NULL,
                        confidence_score REAL NOT NULL,
                        threshold_used REAL NOT NULL,
                        market_regime TEXT NOT NULL,
                        long_score REAL NOT NULL,
                        short_score REAL NOT NULL,
                        reasoning_plain_english TEXT NOT NULL,
                        indicators_summary_json TEXT,
                        UNIQUE(bot_id, candle_timestamp)
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS indicator_profiles (
                        profile_id TEXT PRIMARY KEY,
                        id TEXT,
                        name TEXT NOT NULL,
                        version INTEGER DEFAULT 1,
                        is_active INTEGER DEFAULT 1,
                        market_regime TEXT NOT NULL DEFAULT 'ALL',
                        adaptive_mode TEXT DEFAULT 'BALANCED',
                        signal_threshold_long REAL DEFAULT 75.0,
                        signal_threshold_short REAL DEFAULT 75.0,
                        scoring_mode TEXT DEFAULT 'WEIGHTED',
                        config_json TEXT NOT NULL DEFAULT '{}',
                        description TEXT,
                        is_preset INTEGER DEFAULT 0,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS indicator_profile_versions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        profile_id TEXT NOT NULL,
                        version INTEGER NOT NULL,
                        name TEXT DEFAULT '',
                        config_json TEXT DEFAULT '{}',
                        config_snapshot_json TEXT DEFAULT '{}',
                        change_notes TEXT DEFAULT '',
                        saved_by TEXT DEFAULT 'system',
                        created_at TEXT NOT NULL
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS bot_indicator_profiles (
                        bot_id TEXT PRIMARY KEY,
                        profile_id TEXT NOT NULL,
                        applied_at TEXT NOT NULL DEFAULT ''
                    )
                    """
                )
                try:
                    cursor.execute("ALTER TABLE bot_indicator_profiles ADD COLUMN applied_at TEXT NOT NULL DEFAULT ''")
                except Exception:
                    pass

                # Dynamic column migrations for telegram_logs
                try:
                    cursor.execute("PRAGMA table_info(telegram_logs)")
                    existing_tg_cols = {row["name"] if isinstance(row, sqlite3.Row) else row[1] for row in cursor.fetchall()}
                    tg_missing_cols = [
                        ("event_id", "ALTER TABLE telegram_logs ADD COLUMN event_id TEXT DEFAULT ''"),
                        ("bot_id", "ALTER TABLE telegram_logs ADD COLUMN bot_id TEXT DEFAULT ''"),
                        ("message", "ALTER TABLE telegram_logs ADD COLUMN message TEXT DEFAULT ''"),
                        ("error", "ALTER TABLE telegram_logs ADD COLUMN error TEXT DEFAULT ''"),
                        ("created_at", "ALTER TABLE telegram_logs ADD COLUMN created_at TEXT DEFAULT ''"),
                        ("sent_at", "ALTER TABLE telegram_logs ADD COLUMN sent_at TEXT"),
                        ("retry_count", "ALTER TABLE telegram_logs ADD COLUMN retry_count INTEGER DEFAULT 0"),
                        ("success", "ALTER TABLE telegram_logs ADD COLUMN success INTEGER DEFAULT 0"),
                    ]
                    for col_name, alter_sql in tg_missing_cols:
                        if col_name not in existing_tg_cols:
                            try:
                                cursor.execute(alter_sql)
                            except Exception:
                                pass
                except Exception as tg_mig_err:
                    logger.debug("telegram_logs migration note: %s", tg_mig_err)


                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS scenario_profiles (
                        id TEXT PRIMARY KEY,
                        scenario_id TEXT,
                        name TEXT NOT NULL,
                        regime TEXT DEFAULT 'TRENDING',
                        description TEXT,
                        default_adaptive_mode TEXT DEFAULT 'BALANCED',
                        confluence_long_min REAL DEFAULT 75.0,
                        confluence_short_min REAL DEFAULT 75.0,
                        recommended_indicators_json TEXT,
                        preferred_indicators_json TEXT,
                        default_params_json TEXT
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS indicator_configs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        indicator_id TEXT UNIQUE NOT NULL,
                        name TEXT NOT NULL,
                        category TEXT NOT NULL DEFAULT 'General',
                        enabled INTEGER NOT NULL DEFAULT 1,
                        favorite INTEGER NOT NULL DEFAULT 0,
                        timeframe TEXT NOT NULL DEFAULT '15m',
                        weight REAL NOT NULL DEFAULT 15.0,
                        long_enabled INTEGER NOT NULL DEFAULT 1,
                        short_enabled INTEGER NOT NULL DEFAULT 1,
                        signal_mode TEXT NOT NULL DEFAULT 'both',
                        min_confirmations INTEGER NOT NULL DEFAULT 1,
                        parameters_json TEXT NOT NULL DEFAULT '{}',
                        display_json TEXT NOT NULL DEFAULT '{}',
                        signal_rules_json TEXT NOT NULL DEFAULT '{}',
                        symbol_override TEXT DEFAULT '',
                        timeframe_override TEXT DEFAULT '',
                        bot_id TEXT DEFAULT '',
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS bot_indicator_configs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        bot_id TEXT NOT NULL,
                        indicator_id TEXT NOT NULL,
                        symbol TEXT DEFAULT '',
                        timeframe TEXT DEFAULT '',
                        enabled INTEGER NOT NULL DEFAULT 1,
                        weight REAL NOT NULL DEFAULT 15.0,
                        timeframe_override TEXT DEFAULT '',
                        long_enabled INTEGER NOT NULL DEFAULT 1,
                        short_enabled INTEGER NOT NULL DEFAULT 1,
                        signal_mode TEXT NOT NULL DEFAULT 'both',
                        min_confirmations INTEGER NOT NULL DEFAULT 1,
                        parameters_json TEXT NOT NULL DEFAULT '{}',
                        display_json TEXT NOT NULL DEFAULT '{}',
                        signal_rules_json TEXT NOT NULL DEFAULT '{}',
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        UNIQUE(bot_id, indicator_id, symbol, timeframe)
                    )
                    """
                )
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_bot_ind_cfg ON bot_indicator_configs(bot_id, indicator_id)")


                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS indicator_presets (
                        preset_id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        category TEXT NOT NULL DEFAULT 'General',
                        description TEXT DEFAULT '',
                        config_json TEXT NOT NULL DEFAULT '{}',
                        is_system INTEGER NOT NULL DEFAULT 0,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS indicator_config_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TEXT NOT NULL,
                        indicator_id TEXT NOT NULL,
                        bot_id TEXT DEFAULT 'bot-1',
                        symbol TEXT DEFAULT 'BTC/USDT',
                        timeframe TEXT DEFAULT '15m',
                        action TEXT NOT NULL DEFAULT 'UPDATE',
                        user_source TEXT DEFAULT 'Web Dashboard',
                        old_config_json TEXT DEFAULT '{}',
                        new_config_json TEXT DEFAULT '{}'
                    )
                    """
                )

                cursor.execute("CREATE INDEX IF NOT EXISTS idx_ind_cfg_hist_ind ON indicator_config_history(indicator_id, id DESC)")

                # =============================================================
                # UNIVERSAL RISK MANAGEMENT ENGINE TABLES
                # =============================================================
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS risk_profiles (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        profile_id TEXT UNIQUE NOT NULL,
                        name TEXT NOT NULL,
                        category TEXT NOT NULL DEFAULT 'General',
                        description TEXT DEFAULT '',
                        is_default INTEGER NOT NULL DEFAULT 0,
                        is_system INTEGER NOT NULL DEFAULT 0,
                        config_json TEXT NOT NULL DEFAULT '{}',
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS risk_rules (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        rule_id TEXT UNIQUE NOT NULL,
                        name TEXT NOT NULL,
                        scope TEXT NOT NULL DEFAULT 'global',
                        target TEXT NOT NULL DEFAULT '*',
                        condition_json TEXT NOT NULL DEFAULT '{}',
                        action TEXT NOT NULL DEFAULT 'BLOCK_ORDER',
                        is_enabled INTEGER NOT NULL DEFAULT 1,
                        priority INTEGER NOT NULL DEFAULT 10,
                        description TEXT DEFAULT '',
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS risk_limits (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        key TEXT UNIQUE NOT NULL,
                        value_json TEXT NOT NULL DEFAULT '{}',
                        updated_at TEXT NOT NULL
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS risk_events (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TEXT NOT NULL,
                        event_type TEXT NOT NULL,
                        severity TEXT NOT NULL DEFAULT 'WARNING',
                        symbol TEXT DEFAULT 'BTC/USDT',
                        bot_id TEXT DEFAULT 'bot-1',
                        message TEXT NOT NULL,
                        details_json TEXT DEFAULT '{}'
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS risk_snapshots (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TEXT NOT NULL,
                        portfolio_equity REAL NOT NULL,
                        available_capital REAL NOT NULL,
                        margin_used REAL NOT NULL,
                        gross_exposure REAL NOT NULL,
                        net_exposure REAL NOT NULL,
                        daily_pnl REAL NOT NULL,
                        portfolio_risk_pct REAL NOT NULL,
                        risk_score TEXT NOT NULL,
                        open_positions_count INTEGER NOT NULL,
                        positions_json TEXT DEFAULT '[]'
                    )
                    """
                )

                cursor.execute("CREATE INDEX IF NOT EXISTS idx_risk_events_ts ON risk_events(timestamp DESC)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_risk_rules_scope ON risk_rules(scope, target)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_risk_snapshots_ts ON risk_snapshots(timestamp DESC)")

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS market_universe (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        symbol TEXT UNIQUE NOT NULL,
                        canonical_symbol TEXT NOT NULL,
                        display_name TEXT NOT NULL,
                        category TEXT NOT NULL,
                        asset_class TEXT NOT NULL,
                        exchange TEXT NOT NULL,
                        region TEXT NOT NULL,
                        volatility_group TEXT NOT NULL,
                        provider_id TEXT DEFAULT 'system',
                        is_active INTEGER DEFAULT 1,
                        watch_enabled INTEGER DEFAULT 1,
                        paper_enabled INTEGER DEFAULT 1,
                        strategy_enabled INTEGER DEFAULT 1,
                        live_enabled INTEGER DEFAULT 0,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                    """
                )

                # =============================================================
                # MARKET UNIVERSE 2.0 AUTHORITATIVE INSTRUMENT MASTER TABLES
                # =============================================================
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS instruments (
                        instrument_id TEXT PRIMARY KEY,
                        provider_symbol TEXT NOT NULL,
                        canonical_symbol TEXT NOT NULL,
                        display_symbol TEXT NOT NULL,
                        company_name TEXT DEFAULT '',
                        exchange TEXT NOT NULL,
                        mic TEXT DEFAULT '',
                        country TEXT DEFAULT 'GLOBAL',
                        currency TEXT DEFAULT 'USD',
                        asset_class TEXT NOT NULL,
                        instrument_type TEXT NOT NULL DEFAULT 'EQUITY',
                        underlying_id TEXT DEFAULT '',
                        underlying_symbol TEXT DEFAULT '',
                        series TEXT DEFAULT 'EQ',
                        isin TEXT DEFAULT '',
                        lot_size REAL DEFAULT 1.0,
                        tick_size REAL DEFAULT 0.05,
                        contract_size REAL DEFAULT 1.0,
                        price_multiplier REAL DEFAULT 1.0,
                        expiry TEXT DEFAULT '',
                        option_type TEXT DEFAULT 'NONE',
                        strike REAL DEFAULT 0.0,
                        segment TEXT DEFAULT 'CASH',
                        market_status TEXT DEFAULT 'OPEN',
                        tradability TEXT DEFAULT 'TRADABLE',
                        data_status TEXT DEFAULT 'LIVE',
                        data_source TEXT DEFAULT 'SYSTEM',
                        broker_symbol_mappings TEXT DEFAULT '{}',
                        contract_status TEXT DEFAULT 'ACTIVE',
                        paper_enabled INTEGER DEFAULT 1,
                        live_enabled INTEGER DEFAULT 0,
                        strategy_enabled INTEGER DEFAULT 1,
                        last_price REAL DEFAULT 0.0,
                        change_24h REAL DEFAULT 0.0,
                        volume_24h REAL DEFAULT 0.0,
                        open_interest REAL DEFAULT 0.0,
                        oi_change REAL DEFAULT 0.0,
                        implied_volatility REAL DEFAULT 0.0,
                        delta REAL DEFAULT 0.0,
                        gamma REAL DEFAULT 0.0,
                        theta REAL DEFAULT 0.0,
                        vega REAL DEFAULT 0.0,
                        volatility_score REAL DEFAULT 50.0,
                        volatility_category TEXT DEFAULT 'Medium',
                        momentum_score REAL DEFAULT 50.0,
                        directional_bias TEXT DEFAULT 'NEUTRAL',
                        is_swing_candidate INTEGER DEFAULT 0,
                        is_scalping_candidate INTEGER DEFAULT 0,
                        is_hedge_candidate INTEGER DEFAULT 0,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        active_from TEXT DEFAULT '',
                        active_to TEXT DEFAULT ''
                    )
                    """
                )
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_inst_canonical ON instruments(canonical_symbol)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_inst_asset_class ON instruments(asset_class)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_inst_exchange ON instruments(exchange)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_inst_underlying ON instruments(underlying_symbol, expiry)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_inst_strike ON instruments(underlying_symbol, strike, option_type)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_inst_contract_status ON instruments(contract_status)")

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS market_sync_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        sync_id TEXT NOT NULL,
                        job_name TEXT NOT NULL,
                        provider_id TEXT NOT NULL,
                        started_at TEXT NOT NULL,
                        finished_at TEXT NOT NULL,
                        status TEXT NOT NULL,
                        records_seen INTEGER DEFAULT 0,
                        records_added INTEGER DEFAULT 0,
                        records_updated INTEGER DEFAULT 0,
                        records_expired INTEGER DEFAULT 0,
                        errors_json TEXT DEFAULT '[]'
                    )
                    """
                )
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_sync_hist_started ON market_sync_history(started_at DESC)")

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS provider_health_status (
                        provider_id TEXT PRIMARY KEY,
                        provider_name TEXT NOT NULL,
                        status TEXT NOT NULL DEFAULT 'CONNECTED',
                        latency_ms REAL DEFAULT 0.0,
                        last_successful_sync TEXT DEFAULT '',
                        last_quote_at TEXT DEFAULT '',
                        last_error TEXT DEFAULT '',
                        instruments_count INTEGER DEFAULT 0,
                        realtime_capable INTEGER DEFAULT 1,
                        historical_capable INTEGER DEFAULT 1,
                        entitlement_status TEXT DEFAULT 'ACTIVE',
                        updated_at TEXT NOT NULL
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS user_watchlists (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        description TEXT DEFAULT '',
                        folder TEXT DEFAULT 'General',
                        custom_columns_json TEXT DEFAULT '[]',
                        is_default INTEGER DEFAULT 0,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS user_watchlist_items (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        watchlist_id TEXT NOT NULL,
                        instrument_id TEXT NOT NULL,
                        added_at TEXT NOT NULL,
                        sort_order INTEGER DEFAULT 0,
                        tags_json TEXT DEFAULT '[]',
                        notes TEXT DEFAULT '',
                        UNIQUE(watchlist_id, instrument_id)
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS saved_scanners (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        description TEXT DEFAULT '',
                        asset_class TEXT DEFAULT 'ALL',
                        rules_json TEXT NOT NULL DEFAULT '{}',
                        is_system INTEGER DEFAULT 0,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                    """
                )

                # Safe runtime column migrations
                for tbl, col, ctype in [
                    ("user_watchlists", "folder", "TEXT DEFAULT 'General'"),
                    ("user_watchlists", "custom_columns_json", "TEXT DEFAULT '[]'"),
                    ("user_watchlist_items", "sort_order", "INTEGER DEFAULT 0"),
                    ("user_watchlist_items", "tags_json", "TEXT DEFAULT '[]'"),
                ]:
                    try:
                        cursor.execute(f"ALTER TABLE {tbl} ADD COLUMN {col} {ctype}")
                    except Exception:
                        pass

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS risk_decisions (
                        risk_event_id TEXT PRIMARY KEY,
                        decision_id TEXT NOT NULL,
                        correlation_id TEXT DEFAULT '',
                        order_intent_id TEXT DEFAULT '',
                        order_id TEXT DEFAULT '',
                        position_id TEXT DEFAULT '',
                        trade_id TEXT DEFAULT '',
                        bot_id TEXT NOT NULL DEFAULT 'bot-1',
                        bot_version TEXT DEFAULT 'v2.4.1',
                        strategy_id TEXT DEFAULT 'EMA_MACD_VP',
                        strategy_version TEXT DEFAULT 'v3.2.1',
                        account_id TEXT DEFAULT 'PAPER-01',
                        account_mode TEXT NOT NULL DEFAULT 'PAPER',
                        instrument_id TEXT NOT NULL DEFAULT 'BINANCE:BTC/USDT:SPOT',
                        symbol TEXT NOT NULL DEFAULT 'BTC/USDT',
                        exchange TEXT DEFAULT 'BINANCE',
                        asset_class TEXT DEFAULT 'Crypto',
                        instrument_type TEXT DEFAULT 'SPOT',
                        decision TEXT NOT NULL,
                        severity TEXT NOT NULL DEFAULT 'INFO',
                        category TEXT NOT NULL DEFAULT 'PRE_TRADE',
                        blocking_gate TEXT DEFAULT '',
                        blocking_reason TEXT DEFAULT '',
                        plain_explanation TEXT NOT NULL,
                        required_action TEXT DEFAULT '',
                        max_passing_exposure REAL DEFAULT 0.0,
                        policy_name TEXT DEFAULT 'Conservative Intraday',
                        policy_version TEXT DEFAULT 'v3.4.1',
                        risk_engine_version TEXT DEFAULT 'v2.8.0',
                        requested_quantity REAL DEFAULT 0.0,
                        requested_notional REAL DEFAULT 0.0,
                        requested_risk_usd REAL DEFAULT 0.0,
                        requested_risk_pct REAL DEFAULT 0.0,
                        observed_value REAL DEFAULT 0.0,
                        threshold_value REAL DEFAULT 0.0,
                        threshold_unit TEXT DEFAULT '%',
                        data_source TEXT DEFAULT 'Binance Public WebSocket',
                        data_timestamp TEXT DEFAULT '',
                        data_age_ms INTEGER DEFAULT 45,
                        execution_status TEXT DEFAULT 'NOT_SUBMITTED',
                        execution_message TEXT DEFAULT '',
                        is_overridden INTEGER DEFAULT 0,
                        override_by TEXT DEFAULT '',
                        override_reason TEXT DEFAULT '',
                        override_timestamp TEXT DEFAULT '',
                        is_acknowledged INTEGER DEFAULT 0,
                        acknowledged_by TEXT DEFAULT '',
                        acknowledged_at TEXT DEFAULT '',
                        notes TEXT DEFAULT '',
                        gates_summary_json TEXT DEFAULT '{}',
                        portfolio_before_json TEXT DEFAULT '{}',
                        portfolio_after_json TEXT DEFAULT '{}',
                        risk_delta_json TEXT DEFAULT '{}',
                        timeline_json TEXT DEFAULT '[]',
                        integrity_hash TEXT DEFAULT '',
                        created_at TEXT NOT NULL,
                        evaluated_at TEXT NOT NULL,
                        source_timestamp TEXT DEFAULT ''
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS risk_gate_evaluations (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        risk_event_id TEXT NOT NULL,
                        gate_id TEXT NOT NULL,
                        gate_name TEXT NOT NULL,
                        status TEXT NOT NULL,
                        observed_value REAL DEFAULT 0.0,
                        threshold_value REAL DEFAULT 0.0,
                        unit TEXT DEFAULT '',
                        reason_code TEXT DEFAULT '',
                        message TEXT DEFAULT '',
                        evaluated_at TEXT NOT NULL
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS saved_risk_views (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        filters_json TEXT NOT NULL DEFAULT '{}',
                        created_at TEXT NOT NULL
                    )
                    """
                )

                cursor.execute("CREATE INDEX IF NOT EXISTS idx_risk_decisions_eval ON risk_decisions(evaluated_at DESC)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_risk_decisions_dec ON risk_decisions(decision)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_risk_decisions_sev ON risk_decisions(severity)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_risk_decisions_bot ON risk_decisions(bot_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_risk_decisions_sym ON risk_decisions(symbol)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_risk_decisions_corr ON risk_decisions(correlation_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_risk_gate_eval_ev ON risk_gate_evaluations(risk_event_id)")

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS bot_strategy_permissions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        bot_id TEXT NOT NULL,
                        asset_class TEXT NOT NULL,
                        strategy_name TEXT NOT NULL,
                        is_allowed INTEGER NOT NULL DEFAULT 1,
                        restriction_reason TEXT DEFAULT '',
                        updated_at TEXT NOT NULL,
                        UNIQUE(bot_id, asset_class, strategy_name)
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS backtest_runs (
                        backtest_id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        asset_class TEXT NOT NULL,
                        symbol TEXT NOT NULL,
                        exchange TEXT DEFAULT '',
                        timeframe TEXT NOT NULL,
                        start_date TEXT NOT NULL,
                        end_date TEXT NOT NULL,
                        strategy_id TEXT DEFAULT '',
                        strategy_name TEXT NOT NULL,
                        strategy_version TEXT DEFAULT 'v1.0',
                        indicator_profile TEXT DEFAULT '',
                        risk_model TEXT DEFAULT 'FIXED_RISK',
                        initial_capital REAL NOT NULL,
                        available_capital REAL DEFAULT 0.0,
                        reserve_cash REAL DEFAULT 0.0,
                        final_equity REAL DEFAULT 0.0,
                        net_profit REAL DEFAULT 0.0,
                        return_pct REAL DEFAULT 0.0,
                        cagr_pct REAL DEFAULT 0.0,
                        total_trades INTEGER DEFAULT 0,
                        winning_trades INTEGER DEFAULT 0,
                        losing_trades INTEGER DEFAULT 0,
                        breakeven_trades INTEGER DEFAULT 0,
                        win_rate_pct REAL DEFAULT 0.0,
                        profit_factor REAL DEFAULT 0.0,
                        expectancy REAL DEFAULT 0.0,
                        max_drawdown_pct REAL DEFAULT 0.0,
                        sharpe_ratio REAL DEFAULT 0.0,
                        total_fees REAL DEFAULT 0.0,
                        total_slippage REAL DEFAULT 0.0,
                        status TEXT DEFAULT 'COMPLETED',
                        config_json TEXT NOT NULL,
                        metrics_json TEXT NOT NULL,
                        equity_curve_json TEXT NOT NULL,
                        monthly_performance_json TEXT DEFAULT '[]',
                        data_quality_json TEXT DEFAULT '{}',
                        created_at TEXT NOT NULL
                    )
                    """
                )
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_bt_created ON backtest_runs(created_at DESC)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_bt_symbol ON backtest_runs(symbol, timeframe)")

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS backtest_trades (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        backtest_id TEXT NOT NULL,
                        trade_id INTEGER NOT NULL,
                        symbol TEXT NOT NULL,
                        side TEXT NOT NULL,
                        entry_time TEXT NOT NULL,
                        entry_price REAL NOT NULL,
                        exit_time TEXT NOT NULL,
                        exit_price REAL NOT NULL,
                        quantity REAL NOT NULL,
                        notional REAL NOT NULL,
                        capital_used REAL NOT NULL,
                        margin_used REAL DEFAULT 0.0,
                        stop_loss_price REAL NOT NULL,
                        stop_distance REAL DEFAULT 0.0,
                        stop_distance_pct REAL DEFAULT 0.0,
                        take_profit_price REAL NOT NULL,
                        risk_reward_ratio REAL DEFAULT 0.0,
                        planned_risk REAL DEFAULT 0.0,
                        actual_risk REAL DEFAULT 0.0,
                        gross_pnl REAL NOT NULL,
                        fees REAL DEFAULT 0.0,
                        slippage REAL DEFAULT 0.0,
                        net_pnl REAL NOT NULL,
                        return_pct REAL NOT NULL,
                        holding_time_seconds INTEGER DEFAULT 0,
                        exit_reason TEXT NOT NULL,
                        entry_score REAL DEFAULT 0.0,
                        entry_quality TEXT DEFAULT 'Good',
                        market_regime TEXT DEFAULT 'UNKNOWN',
                        indicators_at_entry_json TEXT DEFAULT '{}',
                        indicators_at_exit_json TEXT DEFAULT '{}',
                        partial_fills_json TEXT DEFAULT '[]'
                    )
                    """
                )
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_btt_bt_id ON backtest_trades(backtest_id)")

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS backtest_presets (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        category TEXT NOT NULL,
                        asset_class TEXT NOT NULL,
                        strategy_name TEXT NOT NULL,
                        timeframe TEXT NOT NULL,
                        description TEXT DEFAULT '',
                        recommended_capital REAL DEFAULT 10000.0,
                        config_json TEXT NOT NULL,
                        created_at TEXT NOT NULL
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS system_session (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        server_start_time TEXT,
                        last_heartbeat TEXT,
                        last_seen_at TEXT DEFAULT '',
                        is_active INTEGER NOT NULL DEFAULT 1,
                        status TEXT DEFAULT 'ACTIVE',
                        active_bots_count INTEGER DEFAULT 0
                    )
                    """
                )


                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS pending_signal_approvals (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        bot_id TEXT NOT NULL,
                        symbol TEXT NOT NULL,
                        timeframe TEXT DEFAULT '15m',
                        strategy TEXT DEFAULT 'EMA_MACD_VP',
                        signal_type TEXT NOT NULL,
                        price REAL NOT NULL,
                        confidence REAL DEFAULT 0.0,
                        confluence_pct REAL DEFAULT 0.0,
                        threshold_pct REAL DEFAULT 75.0,
                        reason TEXT,
                        status TEXT DEFAULT 'WAITING_APPROVAL',
                        created_at TEXT DEFAULT '',
                        timestamp TEXT DEFAULT '',
                        sl_price REAL DEFAULT 0.0,
                        tp_price REAL DEFAULT 0.0,
                        position_size REAL DEFAULT 0.0,
                        strategy_details TEXT DEFAULT '{}',
                        decided_at TEXT,
                        executed_action TEXT,
                        decision_source TEXT,
                        expires_at TEXT
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS bot_event_audit (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        event_id TEXT UNIQUE NOT NULL,
                        timestamp_utc TEXT NOT NULL,
                        local_timestamp TEXT NOT NULL,
                        bot_instance_id TEXT NOT NULL DEFAULT 'bot-1',
                        bot_instance_name TEXT NOT NULL DEFAULT 'System Bot',
                        account_id TEXT DEFAULT 'default_account',
                        asset_class TEXT DEFAULT 'Crypto',
                        symbol TEXT DEFAULT 'BTC/USDT',
                        event_type TEXT NOT NULL,
                        event_subtype TEXT DEFAULT '',
                        severity TEXT DEFAULT 'INFO',
                        status TEXT DEFAULT 'SUCCESS',
                        message TEXT NOT NULL,
                        reason TEXT DEFAULT '',
                        strategy_name TEXT DEFAULT '',
                        timeframe TEXT DEFAULT '',
                        confidence_score REAL DEFAULT 0.0,
                        threshold REAL DEFAULT 75.0,
                        order_id TEXT DEFAULT '',
                        trade_id INTEGER,
                        position_id TEXT DEFAULT '',
                        correlation_id TEXT DEFAULT '',
                        parent_event_id TEXT DEFAULT '',
                        request_id TEXT DEFAULT '',
                        provider TEXT DEFAULT '',
                        exchange TEXT DEFAULT '',
                        latency_ms REAL DEFAULT 0.0,
                        error_code TEXT DEFAULT '',
                        error_message TEXT DEFAULT '',
                        metadata_json TEXT DEFAULT '{}',
                        created_at TEXT NOT NULL
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS pre_trade_analysis (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        pre_trade_analysis_id TEXT UNIQUE NOT NULL,
                        timestamp TEXT NOT NULL,
                        bot_instance_id TEXT NOT NULL DEFAULT 'bot-1',
                        symbol TEXT NOT NULL,
                        strategy TEXT NOT NULL,
                        timeframe TEXT NOT NULL,
                        market_regime TEXT DEFAULT 'NORMAL',
                        historical_trade_count INTEGER DEFAULT 0,
                        historical_win_rate REAL DEFAULT 0.0,
                        historical_profit_factor REAL DEFAULT 1.0,
                        historical_expectancy REAL DEFAULT 0.0,
                        historical_drawdown REAL DEFAULT 0.0,
                        current_price REAL NOT NULL,
                        volatility REAL DEFAULT 0.0,
                        liquidity REAL DEFAULT 0.0,
                        spread REAL DEFAULT 0.0,
                        data_age_seconds REAL DEFAULT 0.0,
                        indicator_snapshot_json TEXT DEFAULT '{}',
                        signal_type TEXT NOT NULL,
                        confidence_score REAL DEFAULT 0.0,
                        confidence_threshold REAL DEFAULT 75.0,
                        cross_bot_exposure_json TEXT DEFAULT '[]',
                        risk_status TEXT DEFAULT 'APPROVED',
                        final_decision TEXT NOT NULL,
                        rejection_reason TEXT DEFAULT '',
                        global_scan_id TEXT DEFAULT ''
                    )
                    """
                )

                # Check and alter trades_log for extended columns
                try:
                    cursor.execute("PRAGMA table_info(trades_log)")
                    cols = [row["name"] for row in cursor.fetchall()]
                    alter_map = [
                        ("bot_id", "ALTER TABLE trades_log ADD COLUMN bot_id TEXT DEFAULT 'bot-1'"),
                        ("bot_instance_id", "ALTER TABLE trades_log ADD COLUMN bot_instance_id TEXT DEFAULT 'bot-1'"),
                        ("bot_instance_name", "ALTER TABLE trades_log ADD COLUMN bot_instance_name TEXT DEFAULT 'Alpha BTC Scalper'"),
                        ("account_id", "ALTER TABLE trades_log ADD COLUMN account_id TEXT DEFAULT 'default_account'"),
                        ("canonical_symbol", "ALTER TABLE trades_log ADD COLUMN canonical_symbol TEXT DEFAULT ''"),
                        ("display_name", "ALTER TABLE trades_log ADD COLUMN display_name TEXT DEFAULT ''"),
                        ("asset_class", "ALTER TABLE trades_log ADD COLUMN asset_class TEXT DEFAULT 'Crypto'"),
                        ("exchange", "ALTER TABLE trades_log ADD COLUMN exchange TEXT DEFAULT 'Binance'"),
                        ("provider", "ALTER TABLE trades_log ADD COLUMN provider TEXT DEFAULT 'CCXT'"),
                        ("side", "ALTER TABLE trades_log ADD COLUMN side TEXT DEFAULT 'BUY'"),
                        ("position_side", "ALTER TABLE trades_log ADD COLUMN position_side TEXT DEFAULT 'LONG'"),
                        ("strategy", "ALTER TABLE trades_log ADD COLUMN strategy TEXT DEFAULT 'EMA_MACD_VP'"),
                        ("strategy_name", "ALTER TABLE trades_log ADD COLUMN strategy_name TEXT DEFAULT 'EMA_MACD_VP'"),
                        ("timeframe", "ALTER TABLE trades_log ADD COLUMN timeframe TEXT DEFAULT '15m'"),
                        ("signal_time", "ALTER TABLE trades_log ADD COLUMN signal_time TEXT"),
                        ("order_creation_time", "ALTER TABLE trades_log ADD COLUMN order_creation_time TEXT"),
                        ("order_submission_time", "ALTER TABLE trades_log ADD COLUMN order_submission_time TEXT"),
                        ("order_ack_time", "ALTER TABLE trades_log ADD COLUMN order_ack_time TEXT"),
                        ("first_fill_time", "ALTER TABLE trades_log ADD COLUMN first_fill_time TEXT"),
                        ("last_fill_time", "ALTER TABLE trades_log ADD COLUMN last_fill_time TEXT"),
                        ("requested_quantity", "ALTER TABLE trades_log ADD COLUMN requested_quantity REAL DEFAULT 0.0"),
                        ("filled_quantity", "ALTER TABLE trades_log ADD COLUMN filled_quantity REAL DEFAULT 0.0"),
                        ("remaining_quantity", "ALTER TABLE trades_log ADD COLUMN remaining_quantity REAL DEFAULT 0.0"),
                        ("average_entry_price", "ALTER TABLE trades_log ADD COLUMN average_entry_price REAL DEFAULT 0.0"),
                        ("average_exit_price", "ALTER TABLE trades_log ADD COLUMN average_exit_price REAL DEFAULT 0.0"),
                        ("confidence_score", "ALTER TABLE trades_log ADD COLUMN confidence_score REAL DEFAULT 0.0"),
                        ("confidence_threshold", "ALTER TABLE trades_log ADD COLUMN confidence_threshold REAL DEFAULT 75.0"),
                        ("risk_amount", "ALTER TABLE trades_log ADD COLUMN risk_amount REAL DEFAULT 0.0"),
                        ("leverage", "ALTER TABLE trades_log ADD COLUMN leverage REAL DEFAULT 1.0"),
                        ("gross_pnl", "ALTER TABLE trades_log ADD COLUMN gross_pnl REAL DEFAULT 0.0"),
                        ("fees", "ALTER TABLE trades_log ADD COLUMN fees REAL DEFAULT 1.50"),
                        ("commission", "ALTER TABLE trades_log ADD COLUMN commission REAL DEFAULT 0.0"),
                        ("slippage", "ALTER TABLE trades_log ADD COLUMN slippage REAL DEFAULT 0.0"),
                        ("pnl_percent", "ALTER TABLE trades_log ADD COLUMN pnl_percent REAL DEFAULT 0.0"),
                        ("emotion_tag", "ALTER TABLE trades_log ADD COLUMN emotion_tag TEXT DEFAULT '🎯 Disciplined'"),
                        ("remarks", "ALTER TABLE trades_log ADD COLUMN remarks TEXT DEFAULT ''"),
                        ("signal_id", "ALTER TABLE trades_log ADD COLUMN signal_id INTEGER"),
                        ("approval_id", "ALTER TABLE trades_log ADD COLUMN approval_id INTEGER"),
                        ("user_selected_action", "ALTER TABLE trades_log ADD COLUMN user_selected_action TEXT"),
                        ("requested_price", "ALTER TABLE trades_log ADD COLUMN requested_price REAL"),
                        ("execution_mode", "ALTER TABLE trades_log ADD COLUMN execution_mode TEXT DEFAULT 'PAPER'"),
                        ("entry_reason", "ALTER TABLE trades_log ADD COLUMN entry_reason TEXT DEFAULT ''"),
                        ("exit_reason", "ALTER TABLE trades_log ADD COLUMN exit_reason TEXT DEFAULT ''"),
                        ("net_pnl", "ALTER TABLE trades_log ADD COLUMN net_pnl REAL DEFAULT 0.0"),
                        ("unrealized_pnl", "ALTER TABLE trades_log ADD COLUMN unrealized_pnl REAL DEFAULT 0.0"),
                        ("realized_pnl", "ALTER TABLE trades_log ADD COLUMN realized_pnl REAL DEFAULT 0.0"),
                        ("broker_order_id", "ALTER TABLE trades_log ADD COLUMN broker_order_id TEXT DEFAULT ''"),
                        ("exchange_order_id", "ALTER TABLE trades_log ADD COLUMN exchange_order_id TEXT DEFAULT ''"),
                        ("fill_id", "ALTER TABLE trades_log ADD COLUMN fill_id TEXT DEFAULT ''"),
                        ("correlation_id", "ALTER TABLE trades_log ADD COLUMN correlation_id TEXT DEFAULT ''"),
                        ("trade_ref_id", "ALTER TABLE trades_log ADD COLUMN trade_ref_id TEXT DEFAULT ''"),
                        ("indicator_snapshot_json", "ALTER TABLE trades_log ADD COLUMN indicator_snapshot_json TEXT DEFAULT '{}'"),
                        ("market_snapshot_json", "ALTER TABLE trades_log ADD COLUMN market_snapshot_json TEXT DEFAULT '{}'"),
                        ("risk_snapshot_json", "ALTER TABLE trades_log ADD COLUMN risk_snapshot_json TEXT DEFAULT '{}'"),
                        ("exit_snapshot_json", "ALTER TABLE trades_log ADD COLUMN exit_snapshot_json TEXT DEFAULT '{}'"),
                        ("mae", "ALTER TABLE trades_log ADD COLUMN mae REAL DEFAULT 0.0"),
                        ("mfe", "ALTER TABLE trades_log ADD COLUMN mfe REAL DEFAULT 0.0"),
                        ("r_multiple", "ALTER TABLE trades_log ADD COLUMN r_multiple REAL DEFAULT 0.0"),
                        ("trailing_stop", "ALTER TABLE trades_log ADD COLUMN trailing_stop REAL DEFAULT 0.0"),
                        ("notional_value", "ALTER TABLE trades_log ADD COLUMN notional_value REAL DEFAULT 0.0"),
                        ("config_version", "ALTER TABLE trades_log ADD COLUMN config_version TEXT DEFAULT 'EMA_MACD_VP v1.4.2'"),
                        ("pre_trade_analysis_id", "ALTER TABLE trades_log ADD COLUMN pre_trade_analysis_id TEXT DEFAULT ''"),
                        ("global_scan_id", "ALTER TABLE trades_log ADD COLUMN global_scan_id TEXT DEFAULT ''"),
                        ("metadata", "ALTER TABLE trades_log ADD COLUMN metadata TEXT DEFAULT '{}'")
                    ]
                    for col_name, stmt in alter_map:
                        if col_name not in cols:
                            try:
                                cursor.execute(stmt)
                            except Exception:
                                pass
                except Exception:
                    pass

                # Check and alter indicator_profiles for extended columns
                try:
                    cursor.execute("PRAGMA table_info(indicator_profiles)")
                    ip_cols = [row["name"] for row in cursor.fetchall()]
                    if "profile_id" not in ip_cols and "id" in ip_cols:
                        cursor.execute("ALTER TABLE indicator_profiles ADD COLUMN profile_id TEXT")
                        cursor.execute("UPDATE indicator_profiles SET profile_id = id WHERE profile_id IS NULL")
                    if "version" not in ip_cols:
                        cursor.execute("ALTER TABLE indicator_profiles ADD COLUMN version INTEGER DEFAULT 1")
                    if "is_active" not in ip_cols:
                        cursor.execute("ALTER TABLE indicator_profiles ADD COLUMN is_active INTEGER DEFAULT 1")
                    if "adaptive_mode" not in ip_cols:
                        cursor.execute("ALTER TABLE indicator_profiles ADD COLUMN adaptive_mode TEXT DEFAULT 'BALANCED'")
                    if "signal_threshold_long" not in ip_cols:
                        cursor.execute("ALTER TABLE indicator_profiles ADD COLUMN signal_threshold_long REAL DEFAULT 75.0")
                    if "signal_threshold_short" not in ip_cols:
                        cursor.execute("ALTER TABLE indicator_profiles ADD COLUMN signal_threshold_short REAL DEFAULT 75.0")
                    if "scoring_mode" not in ip_cols:
                        cursor.execute("ALTER TABLE indicator_profiles ADD COLUMN scoring_mode TEXT DEFAULT 'WEIGHTED'")
                    if "config_json" not in ip_cols:
                        cursor.execute("ALTER TABLE indicator_profiles ADD COLUMN config_json TEXT DEFAULT '{}'")
                except Exception:
                    pass

                try:
                    cursor.execute("PRAGMA table_info(indicator_profile_versions)")
                    ipv_cols = [row["name"] for row in cursor.fetchall()]
                    if "name" not in ipv_cols:
                        cursor.execute("ALTER TABLE indicator_profile_versions ADD COLUMN name TEXT DEFAULT ''")
                    if "config_json" not in ipv_cols:
                        cursor.execute("ALTER TABLE indicator_profile_versions ADD COLUMN config_json TEXT DEFAULT '{}'")
                    if "change_notes" not in ipv_cols:
                        cursor.execute("ALTER TABLE indicator_profile_versions ADD COLUMN change_notes TEXT DEFAULT ''")
                except Exception:
                    pass


                # Create authoritative trade_history view
                cursor.execute("DROP VIEW IF EXISTS trade_history")
                cursor.execute("CREATE VIEW IF NOT EXISTS trade_history AS SELECT * FROM trades_log")

                # Create indexes for analytics, audit, and trade query performance
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_trades_log_bot_id ON trades_log(bot_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_trades_log_bot_inst_id ON trades_log(bot_instance_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_trades_log_symbol ON trades_log(symbol)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_trades_log_status ON trades_log(status)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_trades_log_strategy ON trades_log(strategy)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_trades_log_strategy_name ON trades_log(strategy_name)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_trades_log_timestamp ON trades_log(timestamp)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_trades_log_exit_ts ON trades_log(exit_timestamp)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_bot_id ON bot_event_audit(bot_instance_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_symbol ON bot_event_audit(symbol)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_event_type ON bot_event_audit(event_type)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON bot_event_audit(timestamp_utc)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_correlation_id ON bot_event_audit(correlation_id)")

                # Check and alter indicator_configs for universal schema columns
                try:
                    cursor.execute("PRAGMA table_info(indicator_configs)")
                    ic_cols = [row["name"] for row in cursor.fetchall()]
                    ic_alter_map = [
                        ("category", "ALTER TABLE indicator_configs ADD COLUMN category TEXT DEFAULT 'General'"),
                        ("enabled", "ALTER TABLE indicator_configs ADD COLUMN enabled INTEGER DEFAULT 1"),
                        ("favorite", "ALTER TABLE indicator_configs ADD COLUMN favorite INTEGER DEFAULT 0"),
                        ("long_enabled", "ALTER TABLE indicator_configs ADD COLUMN long_enabled INTEGER DEFAULT 1"),
                        ("short_enabled", "ALTER TABLE indicator_configs ADD COLUMN short_enabled INTEGER DEFAULT 1"),
                        ("signal_mode", "ALTER TABLE indicator_configs ADD COLUMN signal_mode TEXT DEFAULT 'both'"),
                        ("min_confirmations", "ALTER TABLE indicator_configs ADD COLUMN min_confirmations INTEGER DEFAULT 1"),
                        ("parameters_json", "ALTER TABLE indicator_configs ADD COLUMN parameters_json TEXT DEFAULT '{}'"),
                        ("display_json", "ALTER TABLE indicator_configs ADD COLUMN display_json TEXT DEFAULT '{}'"),
                        ("signal_rules_json", "ALTER TABLE indicator_configs ADD COLUMN signal_rules_json TEXT DEFAULT '{}'"),
                        ("symbol_override", "ALTER TABLE indicator_configs ADD COLUMN symbol_override TEXT DEFAULT ''"),
                        ("timeframe_override", "ALTER TABLE indicator_configs ADD COLUMN timeframe_override TEXT DEFAULT ''"),
                        ("bot_id", "ALTER TABLE indicator_configs ADD COLUMN bot_id TEXT DEFAULT ''")
                    ]
                    for col_name, stmt in ic_alter_map:
                        if col_name not in ic_cols:
                            try:
                                cursor.execute(stmt)
                            except Exception:
                                pass
                except Exception:
                    pass

                # Check and alter pending_signal_approvals for extended columns
                cursor.execute("PRAGMA table_info(pending_signal_approvals)")
                psa_cols = [row["name"] for row in cursor.fetchall()]
                if "timeframe" not in psa_cols:
                    cursor.execute("ALTER TABLE pending_signal_approvals ADD COLUMN timeframe TEXT DEFAULT '15m'")
                if "strategy" not in psa_cols:
                    cursor.execute("ALTER TABLE pending_signal_approvals ADD COLUMN strategy TEXT DEFAULT 'EMA_MACD_VP'")
                if "expires_at" not in psa_cols:
                    cursor.execute("ALTER TABLE pending_signal_approvals ADD COLUMN expires_at TEXT")

                # Check and alter bot_instances for extended columns
                try:
                    cursor.execute("PRAGMA table_info(bot_instances)")
                    bi_cols = [row["name"] for row in cursor.fetchall()]
                    bi_alter_map = [
                        ("config_json", "ALTER TABLE bot_instances ADD COLUMN config_json TEXT DEFAULT '{}'"),
                        ("execution_mode", "ALTER TABLE bot_instances ADD COLUMN execution_mode TEXT DEFAULT 'PAPER'"),
                        ("last_checked_at", "ALTER TABLE bot_instances ADD COLUMN last_checked_at TEXT DEFAULT ''"),
                        ("group_name", "ALTER TABLE bot_instances ADD COLUMN group_name TEXT DEFAULT ''"),
                        ("description", "ALTER TABLE bot_instances ADD COLUMN description TEXT DEFAULT ''"),
                    ]
                    for col_name, stmt in bi_alter_map:
                        if col_name not in bi_cols:
                            try:
                                cursor.execute(stmt)
                            except Exception:
                                pass
                except Exception:
                    pass

                # Check and alter system_session for extended columns
                try:
                    cursor.execute("PRAGMA table_info(system_session)")
                    ss_cols = [row["name"] for row in cursor.fetchall()]
                    ss_alter_map = [
                        ("server_start_time", "ALTER TABLE system_session ADD COLUMN server_start_time TEXT"),
                        ("last_heartbeat", "ALTER TABLE system_session ADD COLUMN last_heartbeat TEXT"),
                        ("status", "ALTER TABLE system_session ADD COLUMN status TEXT DEFAULT 'ACTIVE'"),
                        ("active_bots_count", "ALTER TABLE system_session ADD COLUMN active_bots_count INTEGER DEFAULT 0")
                    ]
                    for col_name, stmt in ss_alter_map:
                        if col_name not in ss_cols:
                            try:
                                cursor.execute(stmt)
                            except Exception:
                                pass
                except Exception:
                    pass


                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS bot_templates (
                        template_id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        category TEXT NOT NULL,
                        asset_class TEXT NOT NULL,
                        symbol TEXT NOT NULL,
                        timeframe TEXT NOT NULL,
                        strategy TEXT NOT NULL,
                        description TEXT,
                        config_json TEXT NOT NULL DEFAULT '{}',
                        is_active INTEGER NOT NULL DEFAULT 1,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS bot_groups (
                        group_id TEXT PRIMARY KEY,
                        name TEXT UNIQUE NOT NULL,
                        description TEXT,
                        color TEXT DEFAULT '#00b4d8',
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                    """
                )
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS bot_commands (
                        command_id TEXT PRIMARY KEY,
                        bot_id TEXT NOT NULL,
                        requested_action TEXT NOT NULL,
                        requested_by TEXT NOT NULL DEFAULT 'OPERATOR',
                        expected_state TEXT DEFAULT '',
                        target_state TEXT DEFAULT '',
                        status TEXT NOT NULL DEFAULT 'RECEIVED',
                        result_msg TEXT DEFAULT '',
                        created_at TEXT NOT NULL,
                        executed_at TEXT
                    )
                    """
                )
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_bot_commands_bot ON bot_commands(bot_id, created_at DESC)")

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS bot_worker_leases (
                        bot_id TEXT PRIMARY KEY,
                        worker_id TEXT NOT NULL,
                        lease_token TEXT NOT NULL,
                        generation_id INTEGER NOT NULL DEFAULT 1,
                        lease_acquired_at TEXT NOT NULL,
                        lease_expires_at TEXT NOT NULL,
                        last_heartbeat TEXT NOT NULL,
                        state TEXT NOT NULL DEFAULT 'HEALTHY',
                        host TEXT DEFAULT 'localhost',
                        process_pid INTEGER
                    )
                    """
                )
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_bot_worker_leases_exp ON bot_worker_leases(lease_expires_at)")

                # Incidents Table: Canonical grouped operational issues
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS incidents (
                        incident_id TEXT PRIMARY KEY,
                        fingerprint TEXT NOT NULL,
                        title TEXT NOT NULL,
                        summary TEXT NOT NULL,
                        severity TEXT NOT NULL DEFAULT 'WARNING',
                        status TEXT NOT NULL DEFAULT 'NEW',
                        category TEXT NOT NULL DEFAULT 'SYSTEM',
                        source TEXT NOT NULL DEFAULT 'System',
                        bot_id TEXT DEFAULT '',
                        worker_id TEXT DEFAULT '',
                        strategy_id TEXT DEFAULT '',
                        order_id TEXT DEFAULT '',
                        position_id TEXT DEFAULT '',
                        account_id TEXT DEFAULT 'default_account',
                        symbol TEXT DEFAULT '',
                        error_code TEXT DEFAULT '',
                        root_cause TEXT DEFAULT '',
                        recommended_action TEXT DEFAULT '',
                        first_seen_at TEXT NOT NULL,
                        last_seen_at TEXT NOT NULL,
                        created_at TEXT NOT NULL,
                        acknowledged_at TEXT,
                        acknowledged_by TEXT DEFAULT '',
                        resolved_at TEXT,
                        resolved_by TEXT DEFAULT '',
                        resolution_note TEXT DEFAULT '',
                        archived_at TEXT,
                        archived_by TEXT DEFAULT '',
                        occurrence_count INTEGER NOT NULL DEFAULT 1,
                        impact_score REAL DEFAULT 0.0,
                        is_test INTEGER NOT NULL DEFAULT 0,
                        metadata_json TEXT DEFAULT '{}'
                    )
                    """
                )
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status, severity)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_incidents_fingerprint ON incidents(fingerprint, status)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at DESC)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_incidents_bot ON incidents(bot_id, status)")

                # Alerts Table: Individual event occurrences linked to incidents
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS alerts (
                        alert_id TEXT PRIMARY KEY,
                        incident_id TEXT NOT NULL,
                        event_id TEXT DEFAULT '',
                        correlation_id TEXT DEFAULT '',
                        fingerprint TEXT NOT NULL,
                        severity TEXT NOT NULL DEFAULT 'INFO',
                        status TEXT NOT NULL DEFAULT 'NEW',
                        category TEXT NOT NULL DEFAULT 'SYSTEM',
                        source TEXT NOT NULL DEFAULT 'System',
                        title TEXT NOT NULL,
                        message TEXT NOT NULL,
                        technical_details TEXT DEFAULT '',
                        entity_type TEXT DEFAULT '',
                        entity_id TEXT DEFAULT '',
                        bot_id TEXT DEFAULT '',
                        symbol TEXT DEFAULT '',
                        order_id TEXT DEFAULT '',
                        position_id TEXT DEFAULT '',
                        timestamp_utc TEXT NOT NULL,
                        is_test INTEGER NOT NULL DEFAULT 0,
                        notification_status TEXT DEFAULT 'NONE',
                        created_at TEXT NOT NULL
                    )
                    """
                )
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_incident ON alerts(incident_id, created_at DESC)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at DESC)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_fingerprint ON alerts(fingerprint)")

                # Alert Rules Table: Centralized policies & thresholds
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS alert_rules (
                        rule_id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        category TEXT NOT NULL,
                        severity TEXT NOT NULL,
                        condition_type TEXT NOT NULL,
                        threshold_value REAL DEFAULT 0.0,
                        duration_sec REAL DEFAULT 0.0,
                        cooldown_sec REAL DEFAULT 300.0,
                        auto_resolve INTEGER DEFAULT 1,
                        telegram_notify INTEGER DEFAULT 1,
                        is_enabled INTEGER DEFAULT 1,
                        is_system_required INTEGER DEFAULT 0,
                        version INTEGER DEFAULT 1,
                        description TEXT DEFAULT '',
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                    """
                )

                # Incident Comments Table
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS incident_comments (
                        comment_id TEXT PRIMARY KEY,
                        incident_id TEXT NOT NULL,
                        author TEXT NOT NULL,
                        comment_text TEXT NOT NULL,
                        created_at TEXT NOT NULL
                    )
                    """
                )
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_incident_comments_inc ON incident_comments(incident_id, created_at ASC)")

                # Notification Deliveries Table
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS notification_deliveries (
                        delivery_id TEXT PRIMARY KEY,
                        incident_id TEXT DEFAULT '',
                        alert_id TEXT DEFAULT '',
                        channel TEXT NOT NULL DEFAULT 'TELEGRAM',
                        recipient TEXT DEFAULT '',
                        status TEXT NOT NULL DEFAULT 'PENDING',
                        attempts INTEGER DEFAULT 0,
                        max_attempts INTEGER DEFAULT 3,
                        error_message TEXT DEFAULT '',
                        sent_at TEXT,
                        created_at TEXT NOT NULL
                    )
                    """
                )
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_notif_deliveries_status ON notification_deliveries(status, created_at DESC)")

                # Decision Snapshots Table: Canonical historical evaluation memory & explainability
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS decision_snapshots (
                        snapshot_id TEXT PRIMARY KEY,
                        timestamp TEXT NOT NULL,
                        bot_id TEXT NOT NULL,
                        bot_name TEXT NOT NULL,
                        symbol TEXT NOT NULL,
                        timeframe TEXT NOT NULL,
                        strategy_id TEXT NOT NULL,
                        strategy_version TEXT NOT NULL DEFAULT 'v1.0.0',
                        execution_mode TEXT NOT NULL DEFAULT 'PAPER',
                        decision_state TEXT NOT NULL,
                        why_no_trade TEXT NOT NULL,
                        blocking_rule TEXT DEFAULT '',
                        market_price REAL NOT NULL,
                        data_age_ms INTEGER DEFAULT 0,
                        data_health TEXT DEFAULT 'HEALTHY',
                        provider TEXT DEFAULT 'Binance',
                        confluence_score REAL NOT NULL,
                        required_confluence REAL NOT NULL DEFAULT 75.0,
                        confluence_breakdown_json TEXT DEFAULT '{}',
                        timeframe_matrix_json TEXT DEFAULT '[]',
                        rules_evaluation_json TEXT DEFAULT '[]',
                        indicators_snapshot_json TEXT DEFAULT '{}',
                        risk_assessment_json TEXT DEFAULT '{}',
                        market_context_json TEXT DEFAULT '{}',
                        recent_changes_json TEXT DEFAULT '[]',
                        is_test INTEGER DEFAULT 0,
                        created_at TEXT NOT NULL
                    )
                    """
                )
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_decision_snapshots_bot ON decision_snapshots(bot_id, created_at DESC)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_decision_snapshots_symbol ON decision_snapshots(symbol, created_at DESC)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_decision_snapshots_state ON decision_snapshots(decision_state, created_at DESC)")

                # Assistant Commands Table: Persistent natural-language & command audit
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS assistant_commands (
                        command_id TEXT PRIMARY KEY,
                        timestamp TEXT NOT NULL,
                        user TEXT NOT NULL DEFAULT 'Operator',
                        prompt TEXT NOT NULL,
                        intent_type TEXT NOT NULL,
                        bot_id TEXT DEFAULT '',
                        symbol TEXT DEFAULT '',
                        is_action INTEGER DEFAULT 0,
                        action_status TEXT DEFAULT 'PROCESSED',
                        response_json TEXT DEFAULT '{}',
                        created_at TEXT NOT NULL
                    )
                    """
                )
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_assistant_commands_ts ON assistant_commands(created_at DESC)")

                # Seed default alert rules if table is empty
                cursor.execute("SELECT COUNT(*) FROM alert_rules")
                if cursor.fetchone()[0] == 0:
                    now_iso = datetime.now(timezone.utc).isoformat()
                    default_rules = [
                        ("RULE_BROKER_DISCONNECT", "Broker Connection Lost", "BROKER", "CRITICAL", "HEARTBEAT_TIMEOUT", 10.0, 5.0, 300.0, 1, 1, 1, 1, 1, "Broker connection dropped with or without open exposure", now_iso, now_iso),
                        ("RULE_KILL_SWITCH", "Emergency Kill Switch Activated", "RISK", "CRITICAL", "CIRCUIT_BREAKER", 1.0, 0.0, 60.0, 0, 1, 1, 1, 1, "Global emergency halt engaged across all bots", now_iso, now_iso),
                        ("RULE_DAILY_LOSS_BREACH", "Daily Loss Limit Breached", "RISK", "CRITICAL", "DAILY_LOSS", 100.0, 0.0, 300.0, 0, 1, 1, 1, 1, "Account daily drawdown exceeded maximum threshold", now_iso, now_iso),
                        ("RULE_UNMANAGED_POSITION", "Unmanaged Live Position Detected", "POSITION", "CRITICAL", "POSITION_RECONCILIATION", 1.0, 0.0, 300.0, 1, 1, 1, 1, 1, "Position without owning active bot or stop protection", now_iso, now_iso),
                        ("RULE_WORKER_CRASH", "Bot Worker Process Crashed", "WORKER", "ERROR", "PROCESS_TERMINATED", 1.0, 0.0, 120.0, 1, 1, 1, 1, 1, "Worker process exited abnormally or died", now_iso, now_iso),
                        ("RULE_ORDER_REJECTED", "Exchange Order Rejected", "ORDER", "ERROR", "ORDER_REJECT", 1.0, 0.0, 60.0, 1, 1, 1, 0, 1, "Broker rejected automated order submission", now_iso, now_iso),
                        ("RULE_MARKET_DATA_STALE", "Market Data Feed Delayed", "MARKET_DATA", "WARNING", "DATA_LATENCY", 5.0, 5.0, 180.0, 1, 1, 1, 0, 1, "Price feed tick gap exceeds acceptable threshold", now_iso, now_iso),
                        ("RULE_WORKER_HEARTBEAT_DELAY", "Worker Heartbeat Delayed", "WORKER", "WARNING", "HEARTBEAT_DELAY", 15.0, 10.0, 180.0, 1, 0, 1, 0, 1, "Bot runner loop took longer than expected to ping", now_iso, now_iso),
                        ("RULE_HIGH_SLIPPAGE", "Execution Slippage Elevated", "TRADING", "WARNING", "SLIPPAGE_PCT", 0.5, 0.0, 300.0, 1, 0, 1, 0, 1, "Fill price deviated from expected signal price", now_iso, now_iso),
                        ("RULE_BOT_LIFECYCLE", "Routine Bot Lifecycle Transition", "BOT", "INFO", "USER_COMMAND", 1.0, 0.0, 0.0, 1, 0, 1, 0, 1, "Operator started, paused, resumed, or stopped bot", now_iso, now_iso),
                    ]
                    cursor.executemany(
                        """
                        INSERT INTO alert_rules (
                            rule_id, name, category, severity, condition_type, threshold_value,
                            duration_sec, cooldown_sec, auto_resolve, telegram_notify, is_enabled,
                            is_system_required, version, description, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        default_rules
                    )

                # Check and alter bot_instances for full registry schema
                cursor.execute("PRAGMA table_info(bot_instances)")
                bot_cols = [row["name"] for row in cursor.fetchall()]
                bot_schema_cols = {
                    "asset_class": "TEXT DEFAULT 'Crypto'",
                    "exchange": "TEXT DEFAULT 'Binance'",
                    "execution_mode": "TEXT DEFAULT 'PAPER'",
                    "group_name": "TEXT DEFAULT 'Crypto Scalping Bots'",
                    "template_id": "TEXT DEFAULT ''",
                    "strategy_id": "TEXT DEFAULT ''",
                    "strategy_version": "TEXT DEFAULT 'v1.0.0'",
                    "config_version": "TEXT DEFAULT 'v1.0.0'",
                    "desired_state": "TEXT DEFAULT 'STOPPED'",
                    "lease_token": "TEXT DEFAULT ''",
                    "generation_id": "INTEGER DEFAULT 1",
                    "last_decision_json": "TEXT DEFAULT '{}'",
                    "last_risk_json": "TEXT DEFAULT '{}'",
                    "last_why_no_trade": "TEXT DEFAULT ''",
                    "started_at": "TEXT",
                    "stopped_at": "TEXT",
                    "paused_at": "TEXT",
                    "resumed_at": "TEXT",
                    "last_heartbeat": "TEXT",
                    "last_scan_at": "TEXT",
                    "next_scan_at": "TEXT",
                    "scan_count": "INTEGER DEFAULT 0",
                    "trade_count": "INTEGER DEFAULT 0",
                    "open_position_count": "INTEGER DEFAULT 0",
                    "current_signal": "TEXT DEFAULT 'HOLD'",
                    "signal_confidence": "REAL DEFAULT 0.0",
                    "required_confidence": "REAL DEFAULT 75.0",
                    "current_equity": "REAL DEFAULT 10000.0",
                    "realized_pnl": "REAL DEFAULT 0.0",
                    "unrealized_pnl": "REAL DEFAULT 0.0",
                    "error_count": "INTEGER DEFAULT 0",
                    "last_error": "TEXT DEFAULT ''",
                    "process_id": "TEXT DEFAULT ''",
                    "last_checked_at": "TEXT",
                    "stuck_explanation": "TEXT DEFAULT ''",
                    "is_deleted": "INTEGER DEFAULT 0",
                    "deleted_at": "TEXT",
                    "deleted_by": "TEXT",
                    "deletion_reason": "TEXT"
                }
                for col_name, col_def in bot_schema_cols.items():
                    if col_name not in bot_cols:
                        cursor.execute(f"ALTER TABLE bot_instances ADD COLUMN {col_name} {col_def}")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_bot_instances_is_deleted ON bot_instances(is_deleted)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_bot_instances_active_group ON bot_instances(is_deleted, status, group_name)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_trades_log_status_id ON trades_log(status, id DESC)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_trades_log_symbol ON trades_log(symbol)")
                # Check and alter bot_activity_logs for both event_type and activity_type
                try:
                    cursor.execute("PRAGMA table_info(bot_activity_logs)")
                    act_cols = [row["name"] for row in cursor.fetchall()]
                    if "event_type" not in act_cols:
                        cursor.execute("ALTER TABLE bot_activity_logs ADD COLUMN event_type TEXT DEFAULT 'EVENT'")
                    if "activity_type" not in act_cols:
                        cursor.execute("ALTER TABLE bot_activity_logs ADD COLUMN activity_type TEXT DEFAULT 'EVENT'")
                except Exception:
                    pass

                # Check and alter scenario_profiles for scenario_id and json parameters
                try:
                    cursor.execute("PRAGMA table_info(scenario_profiles)")
                    sc_cols = [row["name"] for row in cursor.fetchall()]
                    if "scenario_id" not in sc_cols:
                        cursor.execute("ALTER TABLE scenario_profiles ADD COLUMN scenario_id TEXT")
                    if "preferred_indicators_json" not in sc_cols:
                        cursor.execute("ALTER TABLE scenario_profiles ADD COLUMN preferred_indicators_json TEXT")
                    if "default_params_json" not in sc_cols:
                        cursor.execute("ALTER TABLE scenario_profiles ADD COLUMN default_params_json TEXT")
                except Exception:
                    pass

                # Check and alter bot_decision_logs for missing columns
                try:
                    cursor.execute("PRAGMA table_info(bot_decision_logs)")
                    bdl_cols = [row["name"] for row in cursor.fetchall()]
                    bdl_alter_map = [
                        ("price", "ALTER TABLE bot_decision_logs ADD COLUMN price REAL DEFAULT 0.0"),
                        ("timeframe", "ALTER TABLE bot_decision_logs ADD COLUMN timeframe TEXT DEFAULT '15m'"),
                        ("regime", "ALTER TABLE bot_decision_logs ADD COLUMN regime TEXT DEFAULT 'TRENDING'"),
                        ("adx", "ALTER TABLE bot_decision_logs ADD COLUMN adx REAL DEFAULT 25.0"),
                        ("bullish_count", "ALTER TABLE bot_decision_logs ADD COLUMN bullish_count INTEGER DEFAULT 0"),
                        ("bearish_count", "ALTER TABLE bot_decision_logs ADD COLUMN bearish_count INTEGER DEFAULT 0"),
                        ("neutral_count", "ALTER TABLE bot_decision_logs ADD COLUMN neutral_count INTEGER DEFAULT 0"),
                        ("total_indicators", "ALTER TABLE bot_decision_logs ADD COLUMN total_indicators INTEGER DEFAULT 0"),
                        ("confluence_pct", "ALTER TABLE bot_decision_logs ADD COLUMN confluence_pct REAL DEFAULT 0.0"),
                        ("threshold_pct", "ALTER TABLE bot_decision_logs ADD COLUMN threshold_pct REAL DEFAULT 75.0"),
                        ("decision", "ALTER TABLE bot_decision_logs ADD COLUMN decision TEXT DEFAULT 'HOLD'"),
                        ("reason", "ALTER TABLE bot_decision_logs ADD COLUMN reason TEXT DEFAULT ''"),
                        ("indicators_json", "ALTER TABLE bot_decision_logs ADD COLUMN indicators_json TEXT DEFAULT '[]'"),
                        ("action_taken", "ALTER TABLE bot_decision_logs ADD COLUMN action_taken TEXT DEFAULT 'HOLD'"),
                        ("confidence_score", "ALTER TABLE bot_decision_logs ADD COLUMN confidence_score REAL DEFAULT 0.0"),
                        ("threshold_used", "ALTER TABLE bot_decision_logs ADD COLUMN threshold_used REAL DEFAULT 75.0"),
                        ("market_regime", "ALTER TABLE bot_decision_logs ADD COLUMN market_regime TEXT DEFAULT 'TRENDING'"),
                        ("long_score", "ALTER TABLE bot_decision_logs ADD COLUMN long_score REAL DEFAULT 0.0"),
                        ("short_score", "ALTER TABLE bot_decision_logs ADD COLUMN short_score REAL DEFAULT 0.0"),
                        ("reasoning_plain_english", "ALTER TABLE bot_decision_logs ADD COLUMN reasoning_plain_english TEXT DEFAULT ''"),
                        ("indicators_summary_json", "ALTER TABLE bot_decision_logs ADD COLUMN indicators_summary_json TEXT DEFAULT '[]'"),
                    ]
                    for col_name, stmt in bdl_alter_map:
                        if col_name not in bdl_cols:
                            try:
                                cursor.execute(stmt)
                            except Exception:
                                pass
                except Exception:
                    pass

                # Check and alter pending_signal_approvals for missing columns
                try:
                    cursor.execute("PRAGMA table_info(pending_signal_approvals)")
                    psa_cols = [row["name"] for row in cursor.fetchall()]
                    psa_alter_map = [
                        ("timestamp", "ALTER TABLE pending_signal_approvals ADD COLUMN timestamp TEXT DEFAULT ''"),
                        ("confluence_pct", "ALTER TABLE pending_signal_approvals ADD COLUMN confluence_pct REAL DEFAULT 0.0"),
                        ("threshold_pct", "ALTER TABLE pending_signal_approvals ADD COLUMN threshold_pct REAL DEFAULT 75.0"),
                        ("sl_price", "ALTER TABLE pending_signal_approvals ADD COLUMN sl_price REAL DEFAULT 0.0"),
                        ("tp_price", "ALTER TABLE pending_signal_approvals ADD COLUMN tp_price REAL DEFAULT 0.0"),
                        ("position_size", "ALTER TABLE pending_signal_approvals ADD COLUMN position_size REAL DEFAULT 0.0"),
                        ("strategy_details", "ALTER TABLE pending_signal_approvals ADD COLUMN strategy_details TEXT DEFAULT '{}'"),
                    ]
                    for col_name, stmt in psa_alter_map:
                        if col_name not in psa_cols:
                            try:
                                cursor.execute(stmt)
                            except Exception:
                                pass
                except Exception:
                    pass

                # Check and alter daily_statistics for missing columns
                try:
                    cursor.execute("PRAGMA table_info(daily_statistics)")
                    ds_cols = [row["name"] for row in cursor.fetchall()]
                    ds_alter_map = [
                        ("timestamp", "ALTER TABLE daily_statistics ADD COLUMN timestamp TEXT DEFAULT ''"),
                        ("date_key", "ALTER TABLE daily_statistics ADD COLUMN date_key TEXT DEFAULT ''"),
                        ("win_rate", "ALTER TABLE daily_statistics ADD COLUMN win_rate REAL DEFAULT 0.0"),
                        ("daily_pnl", "ALTER TABLE daily_statistics ADD COLUMN daily_pnl REAL DEFAULT 0.0"),
                        ("balance", "ALTER TABLE daily_statistics ADD COLUMN balance REAL DEFAULT 10000.0"),
                        ("equity", "ALTER TABLE daily_statistics ADD COLUMN equity REAL DEFAULT 10000.0"),
                    ]
                    for col_name, stmt in ds_alter_map:
                        if col_name not in ds_cols:
                            try:
                                cursor.execute(stmt)
                            except Exception:
                                pass
                except Exception:
                    pass

                # Crypto Derivatives Tables
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS crypto_instruments (
                        symbol TEXT PRIMARY KEY,
                        canonical_symbol TEXT,
                        underlying TEXT NOT NULL,
                        instrument_type TEXT NOT NULL,
                        contract_type TEXT,
                        expiry TEXT,
                        strike REAL,
                        exchange TEXT,
                        lot_size REAL DEFAULT 1.0,
                        tick_size REAL DEFAULT 0.01,
                        updated_at TEXT
                    )
                    """
                )
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS derivative_orders (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        order_id TEXT UNIQUE NOT NULL,
                        bot_id TEXT DEFAULT 'bot-1',
                        symbol TEXT NOT NULL,
                        canonical_symbol TEXT,
                        underlying TEXT,
                        instrument_type TEXT NOT NULL,
                        side TEXT NOT NULL,
                        order_type TEXT NOT NULL,
                        quantity REAL NOT NULL,
                        price REAL NOT NULL,
                        stop_loss REAL,
                        take_profit REAL,
                        leverage REAL DEFAULT 1.0,
                        margin REAL DEFAULT 0.0,
                        status TEXT NOT NULL,
                        execution_mode TEXT DEFAULT 'PAPER',
                        created_at TEXT NOT NULL,
                        filled_at TEXT,
                        remarks TEXT
                    )
                    """
                )
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS derivative_positions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        position_id TEXT UNIQUE NOT NULL,
                        bot_id TEXT DEFAULT 'bot-1',
                        symbol TEXT NOT NULL,
                        canonical_symbol TEXT,
                        underlying TEXT,
                        instrument_type TEXT NOT NULL,
                        side TEXT NOT NULL,
                        quantity REAL NOT NULL,
                        entry_price REAL NOT NULL,
                        current_price REAL NOT NULL,
                        mark_price REAL NOT NULL,
                        leverage REAL DEFAULT 1.0,
                        liquidation_price REAL,
                        margin REAL DEFAULT 0.0,
                        unrealized_pnl REAL DEFAULT 0.0,
                        realized_pnl REAL DEFAULT 0.0,
                        status TEXT NOT NULL DEFAULT 'OPEN',
                        opened_at TEXT NOT NULL,
                        closed_at TEXT,
                        updated_at TEXT NOT NULL
                    )
                    """
                )
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS option_chain_snapshots (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        underlying TEXT NOT NULL,
                        expiry TEXT NOT NULL,
                        spot_price REAL NOT NULL,
                        atm_strike REAL,
                        max_pain REAL,
                        pcr_oi REAL,
                        pcr_volume REAL,
                        snapshot_json TEXT,
                        created_at TEXT NOT NULL
                    )
                    """
                )
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS historical_data_registry (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        symbol TEXT NOT NULL,
                        provider TEXT NOT NULL,
                        timeframe TEXT NOT NULL,
                        start_timestamp TEXT,
                        end_timestamp TEXT,
                        candle_count INTEGER DEFAULT 0,
                        missing_candle_count INTEGER DEFAULT 0,
                        duplicate_count INTEGER DEFAULT 0,
                        last_updated TEXT NOT NULL,
                        data_quality_score REAL DEFAULT 0.0,
                        coverage_status TEXT DEFAULT 'MISSING',
                        UNIQUE(symbol, provider, timeframe)
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS global_market_scans (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        global_scan_id TEXT UNIQUE NOT NULL,
                        timestamp TEXT NOT NULL,
                        active_bots_count INTEGER DEFAULT 0,
                        active_bots_json TEXT DEFAULT '[]',
                        symbols_scanned_count INTEGER DEFAULT 0,
                        symbols_scanned_json TEXT DEFAULT '[]',
                        candidates_json TEXT DEFAULT '[]',
                        rejected_candidates_json TEXT DEFAULT '[]',
                        highest_opportunity_symbol TEXT DEFAULT '',
                        remarks TEXT DEFAULT ''
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS futures_funding_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        contract_id TEXT NOT NULL,
                        exchange TEXT NOT NULL,
                        symbol TEXT NOT NULL,
                        funding_rate REAL NOT NULL,
                        funding_rate_pct REAL NOT NULL,
                        funding_timestamp INTEGER NOT NULL,
                        timestamp_iso TEXT NOT NULL,
                        UNIQUE(contract_id, funding_timestamp)
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS futures_oi_snapshots (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        contract_id TEXT NOT NULL,
                        exchange TEXT NOT NULL,
                        symbol TEXT NOT NULL,
                        open_interest REAL NOT NULL,
                        open_interest_usd REAL NOT NULL,
                        price REAL NOT NULL,
                        snapshot_timestamp INTEGER NOT NULL,
                        timestamp_iso TEXT NOT NULL,
                        UNIQUE(contract_id, snapshot_timestamp)
                    )
                    """
                )

                # Safe column migrations for derivative_orders
                for col_def in [
                    ("client_order_id", "TEXT"),
                    ("idempotency_key", "TEXT"),
                    ("margin_mode", "TEXT DEFAULT 'ISOLATED'"),
                    ("reduce_only", "INTEGER DEFAULT 0"),
                    ("post_only", "INTEGER DEFAULT 0"),
                    ("time_in_force", "TEXT DEFAULT 'GTC'"),
                    ("risk_check_details_json", "TEXT")
                ]:
                    try:
                        cursor.execute(f"ALTER TABLE derivative_orders ADD COLUMN {col_def[0]} {col_def[1]}")
                    except Exception:
                        pass

                # Strategy Research, Versioning & Deployment IDE Tables
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS strategies (
                        strategy_id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        description TEXT DEFAULT '',
                        market_type TEXT DEFAULT 'crypto',
                        symbol TEXT DEFAULT 'BTC/USDT',
                        base_timeframe TEXT DEFAULT '15m',
                        direction TEXT DEFAULT 'LONG',
                        status TEXT DEFAULT 'DRAFT',
                        active_version TEXT DEFAULT 'v1.0.0',
                        author TEXT DEFAULT 'Trader',
                        tags TEXT DEFAULT '[]',
                        draft_json TEXT NOT NULL,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS strategy_versions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        strategy_id TEXT NOT NULL,
                        version_semver TEXT NOT NULL,
                        parent_version TEXT,
                        status TEXT NOT NULL DEFAULT 'SAVED',
                        strategy_json TEXT NOT NULL,
                        ast_json TEXT NOT NULL,
                        config_hash TEXT NOT NULL,
                        change_summary TEXT DEFAULT '',
                        created_at TEXT NOT NULL,
                        created_by TEXT DEFAULT 'Trader',
                        is_deployed INTEGER DEFAULT 0,
                        is_immutable INTEGER DEFAULT 1,
                        UNIQUE(strategy_id, version_semver)
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS strategy_live_observations (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        strategy_id TEXT NOT NULL,
                        version_semver TEXT NOT NULL,
                        symbol TEXT NOT NULL,
                        timeframe TEXT NOT NULL,
                        action TEXT NOT NULL,
                        signal_type TEXT NOT NULL,
                        rule_evaluations_json TEXT NOT NULL,
                        indicator_snapshot_json TEXT NOT NULL,
                        market_price REAL NOT NULL,
                        blocked_reason TEXT DEFAULT '',
                        timestamp TEXT NOT NULL
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS strategy_paper_runs (
                        id TEXT PRIMARY KEY,
                        strategy_id TEXT NOT NULL,
                        version_semver TEXT NOT NULL,
                        symbol TEXT NOT NULL,
                        timeframe TEXT NOT NULL,
                        status TEXT NOT NULL DEFAULT 'RUNNING',
                        initial_capital REAL NOT NULL DEFAULT 10000.0,
                        current_equity REAL NOT NULL DEFAULT 10000.0,
                        net_pnl REAL NOT NULL DEFAULT 0.0,
                        trades_count INTEGER NOT NULL DEFAULT 0,
                        win_rate REAL NOT NULL DEFAULT 0.0,
                        start_time TEXT NOT NULL,
                        end_time TEXT
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS strategy_deployments (
                        id TEXT PRIMARY KEY,
                        strategy_id TEXT NOT NULL,
                        version_semver TEXT NOT NULL,
                        bot_id TEXT NOT NULL,
                        config_hash TEXT NOT NULL,
                        snapshot_json TEXT NOT NULL,
                        assigned_at TEXT NOT NULL,
                        status TEXT NOT NULL DEFAULT 'ASSIGNED'
                    )
                    """
                )

                # ============================================================================
                # INSTITUTIONAL SECURITY & ACCESS CENTER TABLES
                # ============================================================================
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS users (
                        id TEXT PRIMARY KEY,
                        username TEXT UNIQUE NOT NULL,
                        email TEXT UNIQUE NOT NULL,
                        password_hash TEXT NOT NULL,
                        salt TEXT NOT NULL,
                        role TEXT NOT NULL DEFAULT 'ADMIN',
                        is_active INTEGER NOT NULL DEFAULT 1,
                        is_2fa_enabled INTEGER NOT NULL DEFAULT 0,
                        totp_secret_encrypted TEXT DEFAULT '',
                        passkeys_json TEXT DEFAULT '[]',
                        recovery_codes_json TEXT DEFAULT '[]',
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                    """
                )
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS user_sessions (
                        session_id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        token_hash TEXT NOT NULL,
                        device_name TEXT NOT NULL DEFAULT 'Browser',
                        ip_address TEXT NOT NULL DEFAULT '127.0.0.1',
                        user_agent TEXT NOT NULL DEFAULT '',
                        approximate_location TEXT NOT NULL DEFAULT 'Localhost',
                        last_active_at TEXT NOT NULL,
                        expires_at TEXT NOT NULL,
                        is_revoked INTEGER NOT NULL DEFAULT 0,
                        created_at TEXT NOT NULL
                    )
                    """
                )
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id, is_revoked)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token_hash)")

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS step_up_tokens (
                        token_id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        session_id TEXT NOT NULL,
                        purpose TEXT NOT NULL,
                        auth_method TEXT NOT NULL DEFAULT 'PASSKEY',
                        expires_at TEXT NOT NULL,
                        is_used INTEGER NOT NULL DEFAULT 0,
                        created_at TEXT NOT NULL
                    )
                    """
                )
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_step_up_user ON step_up_tokens(user_id, purpose, is_used)")

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS live_deployment_authorizations (
                        authorization_id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        bot_id TEXT NOT NULL,
                        account_id TEXT NOT NULL DEFAULT 'BINANCE-LIVE-01',
                        strategy_version TEXT NOT NULL DEFAULT 'v1.0.0',
                        max_capital REAL NOT NULL DEFAULT 5000.0,
                        max_risk_pct REAL NOT NULL DEFAULT 0.5,
                        daily_loss_limit REAL NOT NULL DEFAULT 2.0,
                        auth_strength TEXT NOT NULL DEFAULT 'PASSKEY_OR_2FA',
                        issued_at TEXT NOT NULL,
                        expires_at TEXT NOT NULL,
                        status TEXT NOT NULL DEFAULT 'ACTIVE',
                        created_at TEXT NOT NULL
                    )
                    """
                )
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_live_auth_bot ON live_deployment_authorizations(bot_id, status)")

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS broker_credentials (
                        credential_id TEXT PRIMARY KEY,
                        provider_id TEXT NOT NULL,
                        account_name TEXT NOT NULL,
                        encrypted_api_key TEXT NOT NULL,
                        encrypted_secret_key TEXT NOT NULL,
                        key_prefix TEXT NOT NULL DEFAULT '',
                        allow_read INTEGER NOT NULL DEFAULT 1,
                        allow_trade INTEGER NOT NULL DEFAULT 1,
                        allow_withdraw INTEGER NOT NULL DEFAULT 0,
                        ip_restrictions_json TEXT DEFAULT '[]',
                        status TEXT NOT NULL DEFAULT 'CONNECTED',
                        last_validated_at TEXT,
                        created_at TEXT NOT NULL,
                        rotated_at TEXT
                    )
                    """
                )
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_broker_cred_provider ON broker_credentials(provider_id)")

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS security_audit_events (
                        event_id TEXT PRIMARY KEY,
                        timestamp_utc TEXT NOT NULL,
                        actor_user_id TEXT NOT NULL DEFAULT 'usr_admin',
                        actor_role TEXT NOT NULL DEFAULT 'ADMIN',
                        action TEXT NOT NULL,
                        resource_type TEXT NOT NULL DEFAULT 'SYSTEM',
                        resource_id TEXT NOT NULL DEFAULT '',
                        result TEXT NOT NULL DEFAULT 'SUCCESS',
                        assurance_level TEXT NOT NULL DEFAULT 'LEVEL_0_READ_ONLY',
                        ip_address TEXT DEFAULT '127.0.0.1',
                        user_agent TEXT DEFAULT '',
                        details_json TEXT DEFAULT '{}',
                        request_id TEXT DEFAULT '',
                        created_at TEXT NOT NULL
                    )
                    """
                )
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_sec_audit_ts ON security_audit_events(timestamp_utc DESC)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_sec_audit_act ON security_audit_events(action, result)")

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS security_alerts (
                        alert_id TEXT PRIMARY KEY,
                        timestamp_utc TEXT NOT NULL,
                        severity TEXT NOT NULL DEFAULT 'WARNING',
                        category TEXT NOT NULL DEFAULT 'SECURITY',
                        title TEXT NOT NULL,
                        description TEXT NOT NULL,
                        status TEXT NOT NULL DEFAULT 'ACTIVE',
                        created_at TEXT NOT NULL
                    )
                    """
                )
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_sec_alerts_status ON security_alerts(status, severity)")

                cursor.execute("UPDATE bot_instances SET group_name = 'Crypto Scalping Bots' WHERE group_name IS NULL OR group_name = ''")

                conn.commit()
                conn.close()
                _db_initialized = True
                try:
                    from src.trade_ledger import init_trade_ledger_schema
                    init_trade_ledger_schema()
                except Exception as tl_err:
                    logger.debug("trade ledger schema init notice: %s", tl_err)
                logger.info("SQLite database tables verified/created.")
                seed_demo_data_if_needed()
                return
            except sqlite3.OperationalError as exc:
                if attempt == 4:
                    logger.warning("DB init operational lock warning: %s", exc)
                    _db_initialized = True
                    return
                time.sleep(0.5)


def seed_market_universe_if_needed() -> None:
    """Auto-sync market universe instruments on startup if table is empty."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM market_universe")
        cnt = cursor.fetchone()["count"]
        conn.close()
        if cnt == 0:
            import importlib
            try:
                mu_module = importlib.import_module("src.market_universe")
            except ImportError:
                mu_module = importlib.import_module("market_universe")
            if hasattr(mu_module, "seed_static_universe"):
                mu_module.seed_static_universe()
            else:
                mu_module.MarketUniverseManager.sync_all_markets()
    except Exception as exc:
        logger.error(f"Error seeding market universe: {exc}")


def seed_bot_templates_if_needed() -> None:
    """Seed default pre-configured trading bot templates if table is empty."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM bot_templates")
        if cursor.fetchone()["count"] == 0:
            now_str = datetime.now(timezone.utc).isoformat()
            templates = [
                (
                    "tpl-btc-scalper",
                    "Alpha BTC Scalper",
                    "Scalping",
                    "Crypto",
                    "BTC/USDT",
                    "5m",
                    "Scalping",
                    "High-frequency 5m scalper utilizing EMA 9/20 crossovers, VWAP mean-reversion, and fast RSI pullbacks.",
                    json.dumps({
                        "risk_pct": 0.02,
                        "required_confidence": 75.0,
                        "indicators": ["ema_9", "ema_20", "rsi", "vwap", "supertrend", "atr"]
                    }),
                    1, now_str, now_str
                ),
                (
                    "tpl-trend-breakout",
                    "Trend Breakout Pro",
                    "Trend Following",
                    "Crypto",
                    "BTC/USDT",
                    "15m",
                    "Trend Following",
                    "Institutional 15m trend breakout strategy combining Supertrend, 200 EMA filter, and Volume Profile Value Area breakouts.",
                    json.dumps({
                        "risk_pct": 0.015,
                        "required_confidence": 75.0,
                        "indicators": ["ema_20", "ema_50", "ema_200", "supertrend", "adx", "vwap"]
                    }),
                    1, now_str, now_str
                ),
                (
                    "tpl-altcoin-momentum",
                    "Altcoin Momentum Hunter",
                    "Momentum",
                    "Crypto",
                    "ETH/USDT",
                    "1h",
                    "Aggressive",
                    "Multi-hour momentum strategy capturing high-conviction breakout expansions across major altcoins.",
                    json.dumps({
                        "risk_pct": 0.02,
                        "required_confidence": 75.0,
                        "indicators": ["ema_9", "rsi", "stoch_rsi", "macd", "supertrend", "volume"]
                    }),
                    1, now_str, now_str
                ),
                (
                    "tpl-nifty-momentum",
                    "NSE Nifty Trend Surfer",
                    "Equities",
                    "Indian Equities",
                    "RELIANCE",
                    "15m",
                    "Trend Following",
                    "Intraday momentum strategy designed for Indian large-cap equities with Supertrend and Volume confirmation.",
                    json.dumps({
                        "risk_pct": 0.015,
                        "required_confidence": 75.0,
                        "indicators": ["ema_20", "ema_50", "supertrend", "volume", "vwap"]
                    }),
                    1, now_str, now_str
                ),
                (
                    "tpl-global-tech",
                    "US Tech Titan Swing",
                    "Global Equities",
                    "Global Equities",
                    "AAPL",
                    "1h",
                    "Balanced",
                    "Multi-session swing strategy utilizing daily bias alignment, Bollinger Bands, and MACD divergence.",
                    json.dumps({
                        "risk_pct": 0.015,
                        "required_confidence": 75.0,
                        "indicators": ["ema_9", "ema_20", "macd", "rsi", "adx", "bollinger"]
                    }),
                    1, now_str, now_str
                ),
                (
                    "tpl-forex-eurusd",
                    "FX London-NY Breakout",
                    "Forex",
                    "Forex",
                    "EURUSD",
                    "15m",
                    "Breakout",
                    "London and New York session overlap breakout strategy targeting high-liquidity currency pairs.",
                    json.dumps({
                        "risk_pct": 0.01,
                        "required_confidence": 75.0,
                        "indicators": ["bollinger", "donchian", "atr", "volume", "vwap"]
                    }),
                    1, now_str, now_str
                )
            ]
            cursor.executemany(
                """
                INSERT INTO bot_templates
                (template_id, name, category, asset_class, symbol, timeframe, strategy, description, config_json, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                templates
            )
            conn.commit()
        conn.close()
    except Exception as exc:
        logger.error(f"Error seeding bot templates: {exc}")


def seed_demo_data_if_needed() -> None:
    """Seed demo bot instances and realistic sample trades if database is newly initialized."""
    seed_indicator_configs_if_needed()
    seed_market_universe_if_needed()
    seed_bot_templates_if_needed()
    conn = get_connection()
    cursor = conn.cursor()
    
    # Seed default bot instances
    cursor.execute("SELECT COUNT(*) as count FROM bot_instances")
    if cursor.fetchone()["count"] == 0:
        now_str = datetime.now(timezone.utc).isoformat()
        bot1_config = {
            "risk_pct": 0.02,
            "indicators": [
                {"id": "ema", "name": "EMA (Exponential Moving Average)", "params": {"period": 20}},
                {"id": "macd", "name": "MACD (Moving Average Convergence Divergence)", "params": {"fast": 12, "slow": 26, "signal": 9}},
                {"id": "vp", "name": "Visible Range Volume Profile", "params": {"bins": 50}}
            ]
        }
        bot2_config = {
            "risk_pct": 0.015,
            "indicators": [
                {"id": "ema", "name": "EMA (Exponential Moving Average)", "params": {"period": 9}},
                {"id": "rsi", "name": "RSI (Relative Strength Index)", "params": {"period": 14}},
                {"id": "adx", "name": "Average Directional Index (ADX)", "params": {"period": 14}}
            ]
        }
        bot3_config = {
            "risk_pct": 0.025,
            "indicators": [
                {"id": "rsi", "name": "RSI (Relative Strength Index)", "params": {"period": 14}},
                {"id": "momentum", "name": "Momentum", "params": {"period": 10}},
                {"id": "bollinger", "name": "Bollinger Bands", "params": {"period": 20, "stdDev": 2.0}}
            ]
        }
        bots = [
            ("bot-1", "Alpha BTC Scalper", "BTC/USDT", "EMA_MACD_VP", "5m", 10000.0, "RUNNING", now_str, now_str, json.dumps(bot1_config)),
            ("bot-2", "Trend Breakout Pro", "BTC/USDT", "EMA9_RSI", "15m", 10000.0, "RUNNING", now_str, now_str, json.dumps(bot2_config)),
            ("bot-3", "Altcoin Momentum", "ETH/USDT", "RSI_MEAN_REVERSION", "1h", 15000.0, "STOPPED", now_str, now_str, json.dumps(bot3_config)),
        ]
        cursor.executemany(
            "INSERT INTO bot_instances (id, name, symbol, strategy, timeframe, allocated_capital, status, created_at, updated_at, config_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            bots
        )

        conn.commit()

    # Seed default Indicator Profiles if empty
    cursor.execute("SELECT COUNT(*) as count FROM indicator_profiles")
    if cursor.fetchone()["count"] == 0:
        now_str = datetime.now(timezone.utc).isoformat()
        profiles = [
            (
                "profile-btc-15m-trend", "BTC 15m Trend", 1, 1, "TRENDING", "BALANCED", 75.0, 75.0, "WEIGHTED",
                json.dumps({
                    "ema": {"enabled": True, "weight": 20, "timeframe": "15m", "fast": 20, "slow": 50, "source": "close"},
                    "rsi": {"enabled": True, "weight": 15, "timeframe": "15m", "period": 14, "oversold": 30, "overbought": 70},
                    "macd": {"enabled": True, "weight": 20, "timeframe": "15m", "fast": 12, "slow": 26, "signal": 9},
                    "adx": {"enabled": True, "weight": 15, "timeframe": "15m", "period": 14, "threshold": 25.0},
                    "supertrend": {"enabled": True, "weight": 15, "timeframe": "15m", "atr_period": 10, "multiplier": 3.0},
                    "vwap": {"enabled": True, "weight": 15, "timeframe": "15m", "mode": "session"},
                    "volume": {"enabled": True, "weight": 10, "timeframe": "15m", "vol_sma_period": 20}
                }),
                "Optimized trend-following profile for BTC on 15m timeframe.",
                now_str, now_str
            ),
            (
                "profile-btc-15m-scalping", "BTC 15m Scalping", 1, 1, "TRENDING", "AGGRESSIVE", 70.0, 70.0, "WEIGHTED",
                json.dumps({
                    "ema": {"enabled": True, "weight": 25, "timeframe": "15m", "fast": 9, "slow": 21, "source": "close"},
                    "rsi": {"enabled": True, "weight": 20, "timeframe": "15m", "period": 7, "oversold": 25, "overbought": 75},
                    "vwap": {"enabled": True, "weight": 20, "timeframe": "15m", "mode": "session"},
                    "supertrend": {"enabled": True, "weight": 15, "timeframe": "15m", "atr_period": 7, "multiplier": 2.0},
                    "volume": {"enabled": True, "weight": 10, "timeframe": "15m", "vol_sma_period": 10},
                    "atr": {"enabled": True, "weight": 10, "timeframe": "15m", "period": 14, "multiplier": 1.5}
                }),
                "Fast momentum scalping profile with tight EMA crosses & RSI(7).",
                now_str, now_str
            ),
            (
                "profile-btc-15m-breakout", "BTC 15m Breakout", 1, 1, "BREAKOUT", "BALANCED", 75.0, 75.0, "WEIGHTED",
                json.dumps({
                    "ema": {"enabled": True, "weight": 15, "timeframe": "15m", "fast": 20, "slow": 50, "source": "close"},
                    "bollinger": {"enabled": True, "weight": 25, "timeframe": "15m", "period": 20, "std_dev": 2.0},
                    "atr": {"enabled": True, "weight": 15, "timeframe": "15m", "period": 14, "multiplier": 2.0},
                    "volume": {"enabled": True, "weight": 20, "timeframe": "15m", "vol_sma_period": 20},
                    "vwap": {"enabled": True, "weight": 15, "timeframe": "15m", "mode": "session"},
                    "donchian": {"enabled": True, "weight": 10, "timeframe": "15m", "period": 20}
                }),
                "Volatile expansion and channel breakout detection profile.",
                now_str, now_str
            ),
            (
                "profile-conservative-trend", "Conservative Trend", 1, 1, "TRENDING", "CONSERVATIVE", 80.0, 80.0, "WEIGHTED",
                json.dumps({
                    "ema": {"enabled": True, "weight": 25, "timeframe": "15m", "fast": 50, "slow": 200, "source": "close"},
                    "macd": {"enabled": True, "weight": 20, "timeframe": "15m", "fast": 12, "slow": 26, "signal": 9},
                    "adx": {"enabled": True, "weight": 20, "timeframe": "15m", "period": 14, "threshold": 25.0},
                    "vwap": {"enabled": True, "weight": 15, "timeframe": "15m", "mode": "session"},
                    "volume": {"enabled": True, "weight": 10, "timeframe": "15m", "vol_sma_period": 20},
                    "rsi": {"enabled": True, "weight": 10, "timeframe": "15m", "period": 14, "oversold": 30, "overbought": 70}
                }),
                "High-confidence trend confirmation profile requiring EMA 50/200 & ADX.",
                now_str, now_str
            ),
            (
                "profile-mean-reversion", "Mean Reversion", 1, 1, "RANGING", "BALANCED", 75.0, 75.0, "WEIGHTED",
                json.dumps({
                    "rsi": {"enabled": True, "weight": 25, "timeframe": "15m", "period": 14, "oversold": 30, "overbought": 70},
                    "bollinger": {"enabled": True, "weight": 25, "timeframe": "15m", "period": 20, "std_dev": 2.0},
                    "vwap": {"enabled": True, "weight": 20, "timeframe": "15m", "mode": "session"},
                    "stoch_rsi": {"enabled": True, "weight": 15, "timeframe": "15m", "period": 14, "k": 3, "d": 3, "oversold": 20, "overbought": 80},
                    "pivot": {"enabled": True, "weight": 15, "timeframe": "15m", "type": "standard"}
                }),
                "Oscillator & envelope profile for sideways / ranging markets.",
                now_str, now_str
            )
        ]
        cursor.executemany(
            """
            INSERT INTO indicator_profiles 
            (profile_id, name, version, is_active, market_regime, adaptive_mode, signal_threshold_long, signal_threshold_short, scoring_mode, config_json, description, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            profiles
        )
        
        # Seed version history
        for p in profiles:
            cursor.execute(
                "INSERT INTO indicator_profile_versions (profile_id, version, name, config_json, config_snapshot_json, created_at, change_notes) VALUES (?, 1, ?, ?, ?, ?, 'Initial default release')",
                (p[0], p[1], p[9], p[9], now_str)
            )


        # Bind bot-1 to profile-btc-15m-trend
        cursor.execute("INSERT OR IGNORE INTO bot_indicator_profiles (bot_id, profile_id, applied_at) VALUES ('bot-1', 'profile-btc-15m-trend', ?)", (now_str,))
        cursor.execute("INSERT OR IGNORE INTO bot_indicator_profiles (bot_id, profile_id, applied_at) VALUES ('bot-2', 'profile-btc-15m-breakout', ?)", (now_str,))
        cursor.execute("INSERT OR IGNORE INTO bot_indicator_profiles (bot_id, profile_id, applied_at) VALUES ('bot-3', 'profile-mean-reversion', ?)", (now_str,))

        conn.commit()

    # Seed default Scenario Profiles if empty
    cursor.execute("SELECT COUNT(*) as count FROM scenario_profiles")
    if cursor.fetchone()["count"] == 0:
        scenarios = [
            ("sc-trending-bull", "sc-trending-bull", "Trending Bull Market", "TRENDING_BULL", json.dumps(["ema", "macd", "adx", "supertrend", "vwap", "volume"]), json.dumps({"ema": {"fast": 20, "slow": 50}, "adx": {"threshold": 25}}), "Strong upward momentum trend preferred indicators."),
            ("sc-trending-bear", "sc-trending-bear", "Trending Bear Market", "TRENDING_BEAR", json.dumps(["ema", "macd", "adx", "supertrend", "vwap", "volume"]), json.dumps({"ema": {"fast": 20, "slow": 50}, "adx": {"threshold": 25}}), "Strong downward trend preferred indicators."),
            ("sc-sideways-range", "sc-sideways-range", "Sideways / Range Market", "SIDEWAYS_RANGE", json.dumps(["rsi", "stoch_rsi", "bollinger", "vwap", "support_resistance"]), json.dumps({"rsi": {"oversold": 30, "overbought": 70}}), "Oscillator and band-reversion preferred indicators."),
            ("sc-high-volatility", "sc-high-volatility", "High Volatility", "HIGH_VOLATILITY", json.dumps(["atr", "bollinger", "adx", "volume", "supertrend"]), json.dumps({"atr": {"multiplier": 2.0}}), "Expansion and volatility envelope preferred indicators."),
            ("sc-low-volatility", "sc-low-volatility", "Low Volatility", "LOW_VOLATILITY", json.dumps(["bollinger", "vwap", "rsi", "volume"]), json.dumps({"bollinger": {"period": 20, "std_dev": 2.0}}), "Contraction and range building preferred indicators."),
            ("sc-breakout", "sc-breakout", "Breakout Scenario", "BREAKOUT", json.dumps(["volume", "bollinger", "atr", "donchian", "vwap", "ema"]), json.dumps({"donchian": {"period": 20}}), "Channel breakout & volume expansion preferred indicators."),
            ("sc-pullback", "sc-pullback", "Pullback Scenario", "PULLBACK", json.dumps(["ema", "vwap", "rsi", "macd", "volume"]), json.dumps({"rsi": {"period": 14}}), "Trend retracement entry preferred indicators.")
        ]
        cursor.executemany(
            "INSERT INTO scenario_profiles (id, scenario_id, name, regime, preferred_indicators_json, default_params_json, description) VALUES (?, ?, ?, ?, ?, ?, ?)",
            scenarios
        )
        conn.commit()

    # Seed demo trades if trade history has fewer than 10 trades
    cursor.execute("SELECT COUNT(*) as count FROM trades_log")
    if cursor.fetchone()["count"] < 5:
        now = datetime.now(timezone.utc)
        sample_trades = [
            (
                (now - timedelta(days=14, hours=3)).isoformat(), "BTC/USDT", "LONG", 62500.0, 61250.0, 65000.0, 0.25, "CLOSED", 64800.0,
                (now - timedelta(days=14, hours=1)).isoformat(), 575.0, "bot-1", "EMA_MACD_VP", 2.50, "🎯 Disciplined", "Perfect EMA cross + VP confirmation"
            ),
            (
                (now - timedelta(days=12, hours=5)).isoformat(), "BTC/USDT", "SHORT", 64200.0, 65500.0, 61600.0, 0.20, "CLOSED", 65500.0,
                (now - timedelta(days=12, hours=3)).isoformat(), -260.0, "bot-1", "EMA_MACD_VP", 2.20, "😤 FOMO", "Entered early before RSI rejection confirmed"
            ),
            (
                (now - timedelta(days=10, hours=8)).isoformat(), "BTC/USDT", "LONG", 63100.0, 62000.0, 66000.0, 0.30, "CLOSED", 65900.0,
                (now - timedelta(days=9, hours=14)).isoformat(), 840.0, "bot-2", "EMA9_RSI", 3.10, "🎯 Disciplined", "Clean trend retest at 9 EMA"
            ),
            (
                (now - timedelta(days=8, hours=2)).isoformat(), "ETH/USDT", "LONG", 3400.0, 3300.0, 3650.0, 3.5, "CLOSED", 3620.0,
                (now - timedelta(days=7, hours=19)).isoformat(), 770.0, "bot-3", "RSI_MEAN_REVERSION", 4.50, "🧘 Calm", "Oversold RSI dip play hit target"
            ),
            (
                (now - timedelta(days=6, hours=10)).isoformat(), "BTC/USDT", "SHORT", 66500.0, 67800.0, 64000.0, 0.18, "CLOSED", 67800.0,
                (now - timedelta(days=6, hours=8)).isoformat(), -234.0, "bot-1", "EMA_MACD_VP", 1.80, "⚡ Impulsive", "Breakout stop hunted"
            ),
            (
                (now - timedelta(days=4, hours=12)).isoformat(), "BTC/USDT", "LONG", 65200.0, 64100.0, 68000.0, 0.25, "CLOSED", 67600.0,
                (now - timedelta(days=3, hours=22)).isoformat(), 600.0, "bot-2", "EMA9_RSI", 2.80, "🎯 Disciplined", "Solid risk reward follow through"
            ),
            (
                (now - timedelta(days=2, hours=6)).isoformat(), "ETH/USDT", "SHORT", 3550.0, 3650.0, 3350.0, 4.0, "CLOSED", 3550.0,
                (now - timedelta(days=2, hours=4)).isoformat(), 0.0, "bot-3", "RSI_MEAN_REVERSION", 3.20, "🧘 Calm", "Breakeven exit after momentum stalled"
            ),
            (
                (now - timedelta(hours=14)).isoformat(), "BTC/USDT", "LONG", 66800.0, 65800.0, 69500.0, 0.22, "CLOSED", 68500.0,
                (now - timedelta(hours=4)).isoformat(), 374.0, "bot-1", "EMA_MACD_VP", 2.10, "🎯 Disciplined", "Trail stop hit at profit zone"
            ),
            (
                (now - timedelta(hours=2)).isoformat(), "BTC/USDT", "LONG", 68200.0, 67000.0, 71000.0, 0.20, "OPEN", None,
                None, 0.0, "bot-1", "EMA_MACD_VP", 0.0, "🎯 Disciplined", "Active trade trailing SL"
            )
        ]
        cursor.executemany(
            """
            INSERT INTO trades_log (timestamp, symbol, direction, entry_price, stop_loss, take_profit, position_size, status, exit_price, exit_timestamp, result_pnl, bot_id, strategy, fees, emotion_tag, remarks)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            sample_trades
        )
        conn.commit()
    conn.close()


def _json_dumps(value: Optional[Dict[str, Any]]) -> str:
    return json.dumps(value or {}, default=str)


def log_signal(
    symbol: str,
    signal_type: str,
    price: float,
    filters_status: dict,
    is_blocked: bool,
    reason: str,
    context: Optional[Dict[str, Any]] = None,
) -> None:
    """Persist a strategy signal evaluation to the database."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        now_str = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            """
            INSERT INTO signals_log (timestamp, symbol, signal_type, price, filters_status, is_blocked, reason, context)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (now_str, symbol, signal_type, price, _json_dumps(filters_status), 1 if is_blocked else 0, reason, _json_dumps(context)),
        )
        conn.commit()
        conn.close()
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.error("Error logging signal to DB: %s", exc)


def log_trade_entry(
    symbol: str,
    direction: str,
    entry_price: float,
    stop_loss: float,
    take_profit: float,
    position_size: float,
    metadata: Optional[Dict[str, Any]] = None,
    bot_id: str = "bot-1",
    strategy: str = "EMA_MACD_VP",
) -> int:
    """Log a new trade entry and return the generated trade row ID."""
    trade_id = -1
    try:
        conn = get_connection()
        cursor = conn.cursor()
        now_str = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            """
            INSERT INTO trades_log (timestamp, symbol, direction, entry_price, stop_loss, take_profit, position_size, status, metadata, bot_id, strategy)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, ?)
            """,
            (now_str, symbol, direction, entry_price, stop_loss, take_profit, position_size, _json_dumps(metadata), bot_id, strategy),
        )
        conn.commit()
        trade_id = cursor.lastrowid
        conn.close()
        logger.info("Logged trade entry in DB. ID: %s (Bot: %s, Strategy: %s)", trade_id, bot_id, strategy)
    except Exception as exc:
        logger.error("Error logging trade entry to DB: %s", exc)
    return trade_id


def insert_trade_record(
    bot_id: str = "bot-1",
    symbol: str = "BTC/USDT",
    direction: str = "LONG",
    entry_price: float = 65000.0,
    position_size: float = 0.1,
    stop_loss: float = 0.0,
    take_profit: float = 0.0,
    status: str = "OPEN",
    remarks: str = "",
    strategy: str = "EMA_MACD_VP",
    metadata: Optional[Dict[str, Any]] = None,
) -> int:
    """Convenience alias for log_trade_entry with status and remarks."""
    meta = metadata or {}
    if remarks:
        meta["remarks"] = remarks
    return log_trade_entry(
        symbol=symbol,
        direction=direction,
        entry_price=entry_price,
        stop_loss=stop_loss,
        take_profit=take_profit,
        position_size=position_size,
        metadata=meta,
        bot_id=bot_id,
        strategy=strategy,
    )


def log_trade_exit(trade_id: int, exit_price: float, result_pnl: float, reason: str = "") -> None:
    """Close an open trade and persist its finalized PnL."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        now_str = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            """
            UPDATE trades_log
            SET status = 'CLOSED', exit_price = ?, exit_timestamp = ?, result_pnl = ?, metadata = COALESCE(metadata, '{}') || ?
            WHERE id = ?
            """,
            (exit_price, now_str, result_pnl, json.dumps({"exit_reason": reason}), trade_id),
        )
        conn.commit()
        conn.close()
        logger.info("Updated trade exit in DB for ID: %s", trade_id)
    except Exception as exc:
        logger.error("Error logging trade exit to DB: %s", exc)


def close_all_open_positions_and_cancel_orders(reason: str = "TRADING HALTED: Emergency Kill Switch Triggered") -> Dict[str, int]:
    """
    Cancel all pending orders, close all open positions, block pending signals,
    and update all bot instances status to HALTED.
    """
    closed_positions_count = 0
    cancelled_orders_count = 0
    try:
        conn = get_connection()
        cursor = conn.cursor()
        now_str = datetime.now(timezone.utc).isoformat()

        # Find open positions
        cursor.execute("SELECT id, symbol, entry_price FROM trades_log WHERE status = 'OPEN'")
        open_trades = cursor.fetchall()
        for t in open_trades:
            trade_id = t["id"]
            entry_p = float(t["entry_price"])
            cursor.execute(
                """
                UPDATE trades_log
                SET status = 'CLOSED', exit_price = ?, exit_timestamp = ?, result_pnl = 0.0,
                    remarks = ?
                WHERE id = ?
                """,
                (entry_p, now_str, f"[KILL SWITCH] {reason}", trade_id),
            )
            closed_positions_count += 1

        # Block any pending unblocked signals
        cursor.execute("UPDATE signals_log SET is_blocked = 1, reason = ? WHERE is_blocked = 0", (f"[KILL SWITCH] {reason}",))
        cancelled_orders_count = cursor.rowcount if cursor.rowcount > 0 else 0

        # Update bot_instances status to HALTED
        cursor.execute("UPDATE bot_instances SET status = 'HALTED'")

        conn.commit()
        conn.close()

        log_bot_activity(
            bot_id="system",
            event_type="KILL_SWITCH",
            message=f"🔴 TRADING HALTED: Closed {closed_positions_count} open position(s) & cancelled pending orders.",
            details={"closed_positions": closed_positions_count, "reason": reason}
        )
    except Exception as exc:
        logger.error("Error during Kill Switch position close & order cancellation: %s", exc)

    return {"closed_positions": closed_positions_count, "cancelled_orders": cancelled_orders_count}


def create_pending_signal_approval(
    bot_id: str,
    symbol: str,
    signal_type: str,
    price: float,
    confluence_pct: float,
    threshold_pct: float = 75.0,
    sl_price: float = 0.0,
    tp_price: float = 0.0,
    position_size: float = 0.0,
    strategy_details: Optional[Dict[str, Any]] = None,
    timeframe: str = "15m",
    strategy: str = "EMA_MACD_VP",
    expires_in_seconds: int = 1800,
    reason: Optional[str] = None,
) -> int:
    """Create a new pending signal approval entry for trader decision."""
    sig_id = -1
    try:
        conn = get_connection()
        cursor = conn.cursor()
        now_dt = datetime.now(timezone.utc)
        now_str = now_dt.isoformat()
        expires_at_str = (now_dt + timedelta(seconds=expires_in_seconds)).isoformat()
        effective_reason = reason or f"Confluence score: {confluence_pct:.1f}% ({signal_type}) meets {threshold_pct:.1f}% threshold"
        cursor.execute(
            """
            INSERT INTO pending_signal_approvals 
            (timestamp, created_at, bot_id, symbol, timeframe, signal_type, price, confidence, confluence_pct, threshold_pct, sl_price, tp_price, position_size, strategy, strategy_details, reason, status, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'WAITING_APPROVAL', ?)
            """,
            (now_str, now_str, bot_id, symbol, timeframe, signal_type, price, confluence_pct, confluence_pct, threshold_pct, sl_price, tp_price, position_size, strategy, _json_dumps(strategy_details), effective_reason, expires_at_str),
        )
        conn.commit()
        sig_id = cursor.lastrowid
        conn.close()
        logger.info("Created pending signal approval ID %s for bot %s (%s @ $%.2f, status: WAITING_APPROVAL)", sig_id, bot_id, signal_type, price)
    except Exception as exc:
        logger.error("Error creating pending signal approval: %s", exc)
    return sig_id


def get_pending_signal_approvals(bot_id: Optional[str] = None) -> list[Dict[str, Any]]:
    """Retrieve active pending signal approvals waiting for decision."""
    results = []
    try:
        conn = get_connection()
        cursor = conn.cursor()
        now_str = datetime.now(timezone.utc).isoformat()
        # Automatically mark expired signals
        cursor.execute("UPDATE pending_signal_approvals SET status = 'EXPIRED' WHERE status IN ('WAITING_APPROVAL', 'PENDING') AND expires_at IS NOT NULL AND expires_at < ?", (now_str,))
        conn.commit()

        if bot_id:
            cursor.execute("SELECT * FROM pending_signal_approvals WHERE status IN ('WAITING_APPROVAL', 'PENDING') AND bot_id = ? ORDER BY id DESC", (bot_id,))
        else:
            cursor.execute("SELECT * FROM pending_signal_approvals WHERE status IN ('WAITING_APPROVAL', 'PENDING') ORDER BY id DESC")
        rows = cursor.fetchall()
        results = [dict(r) for r in rows]
        conn.close()
    except Exception as exc:
        logger.error("Error fetching pending signal approvals: %s", exc)
    return results


def resolve_pending_signal_approval(signal_id: int, action: str, decision_source: str = "Trader", new_status: Optional[str] = None) -> bool:
    """Update status of a pending signal approval once trader makes decision or state transitions."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        now_str = datetime.now(timezone.utc).isoformat()
        final_status = new_status or ("APPROVED" if action in ["BUY_LONG", "SELL_SHORT", "SQUARE_OFF"] else ("REJECTED" if action == "IGNORE" else f"RESOLVED_{action}"))
        cursor.execute(
            """
            UPDATE pending_signal_approvals
            SET status = ?, executed_action = ?, decided_at = ?, decision_source = ?
            WHERE id = ? AND status IN ('WAITING_APPROVAL', 'PENDING', 'EXECUTING')
            """,
            (final_status, action, now_str, decision_source, signal_id),
        )
        affected = cursor.rowcount
        conn.commit()
        conn.close()
        return affected > 0
    except Exception as exc:
        logger.error("Error resolving pending signal approval %s: %s", signal_id, exc)
        return False




def upsert_system_incident(
    fingerprint: str,
    error_code: str,
    category: str,
    severity: str,
    status: str,
    error_message: str,
    provider: str = "Binance",
    operation: str = "runner_cycle",
    bot_id: str = "system",
    instrument_id: str = "UNKNOWN",
    is_retryable: int = 0,
    retry_state: str = "STOPPED",
    root_cause: str = "",
    plain_explanation: str = "",
    recommended_action: str = "",
    stack_trace: str = "",
    now_iso: str = "",
) -> Dict[str, Any]:
    """
    Inserts a new system reliability incident or updates occurrence count and timestamp
    for an existing active incident matching the fingerprint.
    """
    if not now_iso:
        now_iso = datetime.now(timezone.utc).isoformat()

    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Check if an existing ACTIVE or ACKNOWLEDGED incident exists with this fingerprint
        cursor.execute(
            """
            SELECT id, occurrence_count, first_seen FROM system_errors
            WHERE fingerprint = ? AND status IN ('NEW', 'ACTIVE', 'ACKNOWLEDGED', 'RECOVERING')
            ORDER BY id DESC LIMIT 1
            """,
            (fingerprint,),
        )
        row = cursor.fetchone()

        if row:
            inc_id = row[0]
            curr_count = row[1] or 1
            new_count = curr_count + 1
            cursor.execute(
                """
                UPDATE system_errors
                SET occurrence_count = ?,
                    last_seen = ?,
                    timestamp = ?,
                    error_message = ?,
                    stack_trace = ?,
                    retry_state = ?,
                    retry_count = retry_count + 1
                WHERE id = ?
                """,
                (new_count, now_iso, now_iso, error_message, stack_trace, retry_state, inc_id),
            )
            conn.commit()
            return {
                "id": inc_id,
                "fingerprint": fingerprint,
                "occurrence_count": new_count,
                "status": status,
                "action": "DEDUPLICATED_INCREMENT",
            }
        else:
            cursor.execute(
                """
                INSERT INTO system_errors (
                    timestamp, error_message, stack_trace, module, function_name, retry_count,
                    fingerprint, error_code, category, severity, status, provider, operation,
                    bot_id, instrument_id, occurrence_count, first_seen, last_seen, is_retryable,
                    retry_state, root_cause, plain_explanation, recommended_action
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    now_iso,
                    error_message,
                    stack_trace,
                    "live_runner",
                    operation,
                    0,
                    fingerprint,
                    error_code,
                    category,
                    severity,
                    status,
                    provider,
                    operation,
                    bot_id,
                    instrument_id,
                    1,
                    now_iso,
                    now_iso,
                    is_retryable,
                    retry_state,
                    root_cause,
                    plain_explanation,
                    recommended_action,
                ),
            )
            inc_id = cursor.lastrowid
            conn.commit()
            return {
                "id": inc_id,
                "fingerprint": fingerprint,
                "occurrence_count": 1,
                "status": status,
                "action": "CREATED_NEW",
            }
    except Exception as exc:
        logger.error("Error upserting system incident: %s", exc)
        return {"id": -1, "error": str(exc)}
    finally:
        conn.close()


def get_system_incidents(
    limit: int = 50,
    offset: int = 0,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    provider: Optional[str] = None,
    search: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Fetches filtered list of structured system reliability incidents."""
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        query = "SELECT * FROM system_errors WHERE 1=1"
        params: List[Any] = []

        if severity and severity.upper() != "ALL":
            query += " AND severity = ?"
            params.append(severity.upper())

        if status and status.upper() != "ALL":
            query += " AND status = ?"
            params.append(status.upper())

        if category and category.upper() != "ALL":
            query += " AND category = ?"
            params.append(category.upper())

        if provider and provider.upper() != "ALL":
            query += " AND provider LIKE ?"
            params.append(f"%{provider}%")

        if search:
            query += " AND (error_message LIKE ? OR root_cause LIKE ? OR bot_id LIKE ? OR instrument_id LIKE ? OR error_code LIKE ?)"
            term = f"%{search}%"
            params.extend([term, term, term, term, term])

        query += " ORDER BY CASE status WHEN 'ACTIVE' THEN 1 WHEN 'ACKNOWLEDGED' THEN 2 WHEN 'RECOVERING' THEN 3 ELSE 4 END, id DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
    except Exception as exc:
        logger.error("Error fetching system incidents: %s", exc)
        return []
    finally:
        conn.close()


def get_incident_by_id(incident_id: int) -> Optional[Dict[str, Any]]:
    """Retrieves a single system incident by ID."""
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM system_errors WHERE id = ?", (incident_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
    except Exception as exc:
        logger.error("Error fetching incident by ID %s: %s", incident_id, exc)
        return None
    finally:
        conn.close()


def update_incident_status(incident_id: int, new_status: str) -> bool:
    """Updates the lifecycle status of an incident (e.g. ACKNOWLEDGED, RESOLVED, ARCHIVED)."""
    conn = get_connection()
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        if new_status.upper() == "RESOLVED":
            cursor.execute(
                "UPDATE system_errors SET status = 'RESOLVED', resolved_at = ? WHERE id = ?",
                (now_iso, incident_id),
            )
        elif new_status.upper() == "ARCHIVED":
            cursor.execute(
                "UPDATE system_errors SET status = 'ARCHIVED', archived_at = ? WHERE id = ?",
                (now_iso, incident_id),
            )
        else:
            cursor.execute(
                "UPDATE system_errors SET status = ? WHERE id = ?",
                (new_status.upper(), incident_id),
            )
        conn.commit()
        affected = cursor.rowcount
        return affected > 0
    except Exception as exc:
        logger.error("Error updating incident status %s: %s", incident_id, exc)
        return False
    finally:
        conn.close()


def get_reliability_summary() -> Dict[str, Any]:
    """Calculates high-level telemetry and status counters for Reliability Center."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT COUNT(*) FROM system_errors WHERE status IN ('NEW', 'ACTIVE')")
        active_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM system_errors WHERE status IN ('NEW', 'ACTIVE') AND severity = 'CRITICAL'")
        critical_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM system_errors WHERE status = 'RESOLVED'")
        resolved_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(DISTINCT bot_id) FROM system_errors WHERE status IN ('NEW', 'ACTIVE') AND bot_id != 'system'")
        affected_bots = cursor.fetchone()[0]

        return {
            "active_incidents": active_count,
            "critical_incidents": critical_count,
            "resolved_incidents": resolved_count,
            "affected_bots": affected_bots,
            "system_health": "DEGRADED" if critical_count > 0 else ("WARNING" if active_count > 0 else "HEALTHY"),
        }
    except Exception as exc:
        logger.error("Error generating reliability summary: %s", exc)
        return {
            "active_incidents": 0,
            "critical_incidents": 0,
            "resolved_incidents": 0,
            "affected_bots": 0,
            "system_health": "UNKNOWN",
        }
    finally:
        conn.close()


def log_error(error_message: str, stack_trace: str = "", module: str = "", function_name: str = "", retry_count: int = 0) -> None:
    """Persist an unexpected error or API failure with automatic fingerprinting."""
    try:
        from src.error_ledger import global_error_ledger
        global_error_ledger.record_incident(
            exc=Exception(error_message),
            bot_id="system",
            symbol="",
            operation=function_name or "general",
            stack_trace=stack_trace,
        )
    except Exception as exc:
        logger.error("Error logging system error to DB: %s", exc)


def log_heartbeat(status: str, details: Optional[Dict[str, Any]] = None) -> None:
    """Record a heartbeat from the runner cycle."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        now_str = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            """
            INSERT INTO heartbeat_log (timestamp, status, details)
            VALUES (?, ?, ?)
            """,
            (now_str, status, _json_dumps(details)),
        )
        conn.commit()
        conn.close()
    except Exception as exc:
        logger.error("Error logging heartbeat to DB: %s", exc)


def log_bot_status(status: str, exchange_status: str, telegram_status: str, database_status: str, details: Optional[Dict[str, Any]] = None) -> None:
    """Persist a snapshot of the bot health."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        now_str = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            """
            INSERT INTO bot_status (timestamp, status, exchange_status, telegram_status, database_status, details)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (now_str, status, exchange_status, telegram_status, database_status, _json_dumps(details)),
        )
        conn.commit()
        conn.close()
    except Exception as exc:
        logger.error("Error logging bot status: %s", exc)


def log_api_event(endpoint: str, success: bool, latency_ms: Optional[float], details: Optional[Dict[str, Any]] = None) -> None:
    """Record exchange or API interactions."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        now_str = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            """
            INSERT INTO api_logs (timestamp, endpoint, success, latency_ms, details)
            VALUES (?, ?, ?, ?, ?)
            """,
            (now_str, endpoint, 1 if success else 0, latency_ms, _json_dumps(details)),
        )
        conn.commit()
        conn.close()
    except Exception as exc:
        logger.error("Error logging API event: %s", exc)


def log_telegram_event(success: bool, message: str, error: str = "") -> None:
    """Persist Telegram delivery attempts."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        now_str = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            """
            INSERT INTO telegram_logs (timestamp, success, message, error)
            VALUES (?, ?, ?, ?)
            """,
            (now_str, 1 if success else 0, message[:400], error[:400]),
        )
        conn.commit()
        conn.close()
    except Exception as exc:
        logger.error("Error logging Telegram event: %s", exc)


DEFAULT_TELEGRAM_SETTINGS = {
    "trade_signals": True,
    "order_filled": True,
    "order_rejected": True,
    "stop_loss": True,
    "take_profit": True,
    "bot_status": True,
    "risk_alerts": True,
    "system_errors": True,
}


def get_telegram_settings() -> Dict[str, bool]:
    """Retrieve persisted user notification category toggles."""
    settings = dict(DEFAULT_TELEGRAM_SETTINGS)
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT key, value FROM telegram_settings")
        rows = cursor.fetchall()
        conn.close()
        for r in rows:
            k = r["key"] if isinstance(r, sqlite3.Row) else r[0]
            v = r["value"] if isinstance(r, sqlite3.Row) else r[1]
            settings[k] = str(v).lower() in ("true", "1", "yes")
    except Exception as exc:
        logger.debug("Could not fetch telegram_settings: %s", exc)
    return settings


def update_telegram_settings(new_settings: Dict[str, bool]) -> bool:
    """Update persisted user notification category toggles."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        now_str = datetime.now(timezone.utc).isoformat()
        for k, v in new_settings.items():
            cursor.execute(
                """
                INSERT INTO telegram_settings (key, value, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
                """,
                (k, "true" if v else "false", now_str),
            )
        conn.commit()
        conn.close()
        return True
    except Exception as exc:
        logger.error("Failed to update telegram_settings: %s", exc)
        return False


def get_appearance_settings() -> Optional[Dict[str, Any]]:
    """Retrieve persisted terminal appearance & theme configuration."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT theme_id, theme_name, config_json, updated_at FROM user_appearance_settings WHERE id = 1")
        row = cursor.fetchone()
        conn.close()
        if row:
            config_str = row["config_json"] if isinstance(row, sqlite3.Row) else row[2]
            return json.loads(config_str)
    except Exception as exc:
        logger.debug("Could not fetch appearance settings: %s", exc)
    return None


def save_appearance_settings(appearance_config: Dict[str, Any]) -> bool:
    """Save custom appearance & theme configuration to SQLite."""
    try:
        theme_id = appearance_config.get("themeId", "custom")
        theme_name = appearance_config.get("name", "Custom Theme")
        config_json_str = json.dumps(appearance_config)
        now_str = datetime.now(timezone.utc).isoformat()
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO user_appearance_settings (id, theme_id, theme_name, config_json, updated_at)
            VALUES (1, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                theme_id = excluded.theme_id,
                theme_name = excluded.theme_name,
                config_json = excluded.config_json,
                updated_at = excluded.updated_at
            """,
            (theme_id, theme_name, config_json_str, now_str),
        )
        conn.commit()
        conn.close()
        return True
    except Exception as exc:
        logger.error("Failed to save appearance settings: %s", exc)
        return False


def reset_appearance_settings() -> bool:
    """Reset appearance settings back to factory default."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM user_appearance_settings WHERE id = 1")
        conn.commit()
        conn.close()
        return True
    except Exception as exc:
        logger.error("Failed to reset appearance settings: %s", exc)
        return False


def get_trade_journal_review(trade_id: int) -> Optional[Dict[str, Any]]:
    """Retrieve human review, notes, and tags for a specific trade."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT trade_id, setup_quality, execution_quality, discipline_rating,
                   entry_reasoning, exit_reasoning, mistakes, lessons_learned,
                   emotional_state, tags, chart_snapshot_url, follow_up_actions,
                   confidence_before, emotion_before, emotion_during, emotion_after,
                   playbook_id, what_went_well, what_went_wrong, take_again_verdict,
                   automated_system_review, strategy_compliance_score, updated_at
            FROM trade_journal_reviews
            WHERE trade_id = ?
            """,
            (trade_id,),
        )
        row = cursor.fetchone()
        conn.close()
        if row:
            return {
                "trade_id": row[0],
                "setup_quality": row[1],
                "execution_quality": row[2],
                "discipline_rating": row[3],
                "entry_reasoning": row[4] or "",
                "exit_reasoning": row[5] or "",
                "mistakes": row[6] or "",
                "lessons_learned": row[7] or "",
                "emotional_state": row[8] or "NEUTRAL",
                "tags": json.loads(row[9]) if row[9] else [],
                "chart_snapshot_url": row[10] or "",
                "follow_up_actions": row[11] or "",
                "confidence_before": row[12] if len(row) > 12 and row[12] is not None else 3,
                "emotion_before": row[13] if len(row) > 13 and row[13] else "Calm",
                "emotion_during": row[14] if len(row) > 14 and row[14] else "Focused",
                "emotion_after": row[15] if len(row) > 15 and row[15] else "Neutral",
                "playbook_id": row[16] if len(row) > 16 and row[16] else "",
                "what_went_well": row[17] if len(row) > 17 and row[17] else "",
                "what_went_wrong": row[18] if len(row) > 18 and row[18] else "",
                "take_again_verdict": row[19] if len(row) > 19 and row[19] else "YES",
                "automated_system_review": row[20] if len(row) > 20 and row[20] else "",
                "strategy_compliance_score": row[21] if len(row) > 21 and row[21] is not None else 90.0,
                "updated_at": row[22] if len(row) > 22 else None,
            }
    except Exception as exc:
        logger.debug("Error getting trade journal review for %s: %s", trade_id, exc)
    return None


def save_trade_journal_review(trade_id: int, review_data: Dict[str, Any]) -> bool:
    """Save or update human review notes, mistakes, lessons, and tags for a completed trade."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        tags_json = json.dumps(review_data.get("tags", []))
        cursor.execute(
            """
            INSERT INTO trade_journal_reviews (
                trade_id, setup_quality, execution_quality, discipline_rating,
                entry_reasoning, exit_reasoning, mistakes, lessons_learned,
                emotional_state, tags, chart_snapshot_url, follow_up_actions,
                confidence_before, emotion_before, emotion_during, emotion_after,
                playbook_id, what_went_well, what_went_wrong, take_again_verdict,
                automated_system_review, strategy_compliance_score, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(trade_id) DO UPDATE SET
                setup_quality = excluded.setup_quality,
                execution_quality = excluded.execution_quality,
                discipline_rating = excluded.discipline_rating,
                entry_reasoning = excluded.entry_reasoning,
                exit_reasoning = excluded.exit_reasoning,
                mistakes = excluded.mistakes,
                lessons_learned = excluded.lessons_learned,
                emotional_state = excluded.emotional_state,
                tags = excluded.tags,
                chart_snapshot_url = excluded.chart_snapshot_url,
                follow_up_actions = excluded.follow_up_actions,
                confidence_before = excluded.confidence_before,
                emotion_before = excluded.emotion_before,
                emotion_during = excluded.emotion_during,
                emotion_after = excluded.emotion_after,
                playbook_id = excluded.playbook_id,
                what_went_well = excluded.what_went_well,
                what_went_wrong = excluded.what_went_wrong,
                take_again_verdict = excluded.take_again_verdict,
                automated_system_review = excluded.automated_system_review,
                strategy_compliance_score = excluded.strategy_compliance_score,
                updated_at = datetime('now')
            """,
            (
                trade_id,
                int(review_data.get("setup_quality", 3)),
                int(review_data.get("execution_quality", 3)),
                int(review_data.get("discipline_rating", 3)),
                str(review_data.get("entry_reasoning", "")),
                str(review_data.get("exit_reasoning", "")),
                str(review_data.get("mistakes", "")),
                str(review_data.get("lessons_learned", "")),
                str(review_data.get("emotional_state", "NEUTRAL")),
                tags_json,
                str(review_data.get("chart_snapshot_url", "")),
                str(review_data.get("follow_up_actions", "")),
                int(review_data.get("confidence_before", 3)),
                str(review_data.get("emotion_before", "Calm")),
                str(review_data.get("emotion_during", "Focused")),
                str(review_data.get("emotion_after", "Neutral")),
                str(review_data.get("playbook_id", "")),
                str(review_data.get("what_went_well", "")),
                str(review_data.get("what_went_wrong", "")),
                str(review_data.get("take_again_verdict", "YES")),
                str(review_data.get("automated_system_review", "")),
                float(review_data.get("strategy_compliance_score", 90.0)),
            ),
        )
        conn.commit()
        conn.close()
        return True
    except Exception as exc:
        logger.error("Failed to save trade journal review for %s: %s", trade_id, exc)
        return False


def get_all_trade_journal_reviews() -> Dict[int, Dict[str, Any]]:
    """Retrieve all human trade reviews indexed by trade_id."""
    reviews = {}
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT trade_id, setup_quality, execution_quality, discipline_rating,
                   entry_reasoning, exit_reasoning, mistakes, lessons_learned,
                   emotional_state, tags, chart_snapshot_url, follow_up_actions,
                   confidence_before, emotion_before, emotion_during, emotion_after,
                   playbook_id, what_went_well, what_went_wrong, take_again_verdict,
                   automated_system_review, strategy_compliance_score, updated_at
            FROM trade_journal_reviews
            """
        )
        rows = cursor.fetchall()
        conn.close()
        for row in rows:
            reviews[row[0]] = {
                "trade_id": row[0],
                "setup_quality": row[1],
                "execution_quality": row[2],
                "discipline_rating": row[3],
                "entry_reasoning": row[4] or "",
                "exit_reasoning": row[5] or "",
                "mistakes": row[6] or "",
                "lessons_learned": row[7] or "",
                "emotional_state": row[8] or "NEUTRAL",
                "tags": json.loads(row[9]) if row[9] else [],
                "chart_snapshot_url": row[10] or "",
                "follow_up_actions": row[11] or "",
                "confidence_before": row[12] if len(row) > 12 and row[12] is not None else 3,
                "emotion_before": row[13] if len(row) > 13 and row[13] else "Calm",
                "emotion_during": row[14] if len(row) > 14 and row[14] else "Focused",
                "emotion_after": row[15] if len(row) > 15 and row[15] else "Neutral",
                "playbook_id": row[16] if len(row) > 16 and row[16] else "",
                "what_went_well": row[17] if len(row) > 17 and row[17] else "",
                "what_went_wrong": row[18] if len(row) > 18 and row[18] else "",
                "take_again_verdict": row[19] if len(row) > 19 and row[19] else "YES",
                "automated_system_review": row[20] if len(row) > 20 and row[20] else "",
                "strategy_compliance_score": row[21] if len(row) > 21 and row[21] is not None else 90.0,
                "updated_at": row[22] if len(row) > 22 else None,
            }
    except Exception as exc:
        logger.debug("Error getting all trade journal reviews: %s", exc)
    return reviews


def get_all_playbooks() -> List[Dict[str, Any]]:
    """Retrieve all defined trading playbooks."""
    playbooks = []
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, category, description, required_conditions, invalidation_rules, target_rr, preferred_regime, mistakes_to_avoid, is_active, created_at, updated_at FROM trade_playbooks WHERE is_active = 1 ORDER BY name ASC")
        rows = cursor.fetchall()
        conn.close()
        for r in rows:
            playbooks.append({
                "id": r[0],
                "name": r[1],
                "category": r[2] or "GENERAL",
                "description": r[3] or "",
                "required_conditions": json.loads(r[4]) if r[4] else [],
                "invalidation_rules": json.loads(r[5]) if r[5] else [],
                "target_rr": float(r[6] or 2.0),
                "preferred_regime": r[7] or "TRENDING",
                "mistakes_to_avoid": json.loads(r[8]) if r[8] else [],
                "is_active": bool(r[9]),
                "created_at": r[10],
                "updated_at": r[11],
            })
    except Exception as exc:
        logger.debug("Error getting playbooks: %s", exc)
    return playbooks


def save_playbook(playbook_data: Dict[str, Any]) -> bool:
    """Save or update a trading playbook."""
    try:
        pb_id = playbook_data.get("id") or f"pb-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        name = playbook_data.get("name", "Untitled Playbook")
        category = playbook_data.get("category", "GENERAL")
        desc = playbook_data.get("description", "")
        req_cond = json.dumps(playbook_data.get("required_conditions", []))
        inval_rules = json.dumps(playbook_data.get("invalidation_rules", []))
        target_rr = float(playbook_data.get("target_rr", 2.0))
        pref_regime = playbook_data.get("preferred_regime", "TRENDING")
        mistakes = json.dumps(playbook_data.get("mistakes_to_avoid", []))
        is_active = 1 if playbook_data.get("is_active", True) else 0

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO trade_playbooks (
                id, name, category, description, required_conditions,
                invalidation_rules, target_rr, preferred_regime, mistakes_to_avoid,
                is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                category = excluded.category,
                description = excluded.description,
                required_conditions = excluded.required_conditions,
                invalidation_rules = excluded.invalidation_rules,
                target_rr = excluded.target_rr,
                preferred_regime = excluded.preferred_regime,
                mistakes_to_avoid = excluded.mistakes_to_avoid,
                is_active = excluded.is_active,
                updated_at = datetime('now')
            """,
            (pb_id, name, category, desc, req_cond, inval_rules, target_rr, pref_regime, mistakes, is_active),
        )
        conn.commit()
        conn.close()
        return True
    except Exception as exc:
        logger.error("Failed to save playbook: %s", exc)
        return False


def log_telegram_delivery(
    event_id: str,
    alert_type: str,
    bot_id: str,
    status: str,
    message: str,
    error: str = "",
    retry_count: int = 0,
    recipient: str = "",
) -> None:
    """Log detailed telegram delivery attempt to telegram_logs."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        now_str = datetime.now(timezone.utc).isoformat()
        is_success = 1 if status == "SENT" else 0
        sent_at_val = now_str if is_success else None
        
        cursor.execute(
            """
            INSERT INTO telegram_logs (
                timestamp, message_type, status, recipient, error_message,
                event_id, bot_id, message, error, created_at, sent_at, retry_count, success
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                now_str, alert_type, status, recipient, error,
                event_id, bot_id, message, error, now_str, sent_at_val, retry_count, is_success
            ),
        )
        conn.commit()
        conn.close()
    except Exception as exc:
        # Fallback to basic columns if needed
        try:
            conn = get_connection()
            cursor = conn.cursor()
            now_str = datetime.now(timezone.utc).isoformat()
            cursor.execute(
                "INSERT INTO telegram_logs (timestamp, success, message, error) VALUES (?, ?, ?, ?)",
                (now_str, 1 if status == "SENT" else 0, message[:400], error[:400]),
            )
            conn.commit()
            conn.close()
        except Exception as e2:
            logger.debug("Failed logging telegram delivery fallback: %s (orig: %s)", e2, exc)


def get_telegram_logs(limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    """Retrieve recent telegram audit logs."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM telegram_logs ORDER BY id DESC LIMIT ? OFFSET ?",
            (limit, offset)
        )
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows
    except Exception as exc:
        logger.error("Failed to query telegram_logs: %s", exc)
        return []


def log_bot_activity(bot_id: str, event_type: str, message: str, details: Optional[Dict[str, Any]] = None) -> None:
    """Log plain-language granular bot execution event and update last_checked_at timestamp."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        now_str = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            """
            INSERT INTO bot_activity_logs (timestamp, bot_id, event_type, activity_type, message, details_json)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (now_str, bot_id, event_type, event_type, message, _json_dumps(details or {})),
        )
        cursor.execute(
            "UPDATE bot_instances SET last_checked_at = ? WHERE id = ?",
            (now_str, bot_id)
        )
        conn.commit()
        conn.close()
    except Exception as exc:
        logger.error(f"Error logging bot activity for {bot_id}: {exc}")


def get_bot_activity_logs(bot_id: str, limit: int = 30) -> list[Dict[str, Any]]:
    """Fetch recent granular bot activity log entries for a bot instance."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT * FROM bot_activity_logs WHERE bot_id = ? ORDER BY id DESC LIMIT ?
            """,
            (bot_id, limit),
        )
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except Exception as exc:
        logger.error(f"Error fetching bot activity logs for {bot_id}: {exc}")
        return []


def log_bot_decision(
    bot_id: str,
    price: float,
    timeframe: str,
    regime: str,
    adx: float,
    bullish_count: int,
    bearish_count: int,
    neutral_count: int,
    total_indicators: int,
    confluence_pct: float,
    threshold_pct: float,
    decision: str,
    reason: str,
    indicators_details: list,
    candle_timestamp: Optional[str] = None
) -> None:
    """Log complete plain-language decision breakdown for every evaluation cycle (candle close)."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        now_str = datetime.now(timezone.utc).isoformat()
        log_ts = candle_timestamp or now_str
        cursor.execute(
            """
            INSERT INTO bot_decision_logs 
            (timestamp, bot_id, candle_timestamp, price, timeframe, regime, adx, bullish_count, bearish_count, neutral_count, total_indicators, confluence_pct, threshold_pct, decision, reason, indicators_json, action_taken, confidence_score, threshold_used, market_regime, long_score, short_score, reasoning_plain_english, indicators_summary_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                log_ts, bot_id, log_ts, price, timeframe, regime, adx,
                bullish_count, bearish_count, neutral_count, total_indicators,
                confluence_pct, threshold_pct, decision, reason, _json_dumps(indicators_details),
                decision, confluence_pct, threshold_pct, regime,
                confluence_pct if decision == "BUY" or decision == "LONG" else 0.0,
                confluence_pct if decision == "SELL" or decision == "SHORT" else 0.0,
                reason, _json_dumps(indicators_details)
            ),
        )
        cursor.execute(
            "UPDATE bot_instances SET last_checked_at = ? WHERE id = ?",
            (now_str, bot_id)
        )
        conn.commit()
        conn.close()
    except Exception as exc:

        logger.error(f"Error logging bot decision for {bot_id}: {exc}")


def get_bot_decisions(bot_id: str, limit: int = 50) -> list[Dict[str, Any]]:
    """Fetch recent decision log entries for a specific bot instance."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT * FROM bot_decision_logs WHERE bot_id = ? ORDER BY id DESC LIMIT ?
            """,
            (bot_id, limit),
        )
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except Exception as exc:
        logger.error(f"Error fetching bot decisions for {bot_id}: {exc}")
        return []


def get_bot_strategy_diagnosis(bot_id: str) -> Dict[str, Any]:
    """Generates plain-language explanation analyzing recent evaluation cycles and why trades are/aren't happening."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM bot_decision_logs WHERE bot_id = ? ORDER BY id DESC LIMIT 50",
            (bot_id,)
        )
        decisions = [dict(r) for r in cursor.fetchall()]
        
        # Fetch open or recent trade count
        cursor.execute(
            "SELECT COUNT(*) as count FROM trades_log WHERE bot_id = ? AND status = 'CLOSED'",
            (bot_id,)
        )
        trade_count_row = cursor.fetchone()
        closed_trades = trade_count_row["count"] if trade_count_row else 0
        conn.close()
        
        total_scans = len(decisions)
        if total_scans == 0:
            return {
                "total_scans": 0,
                "max_confluence_pct": 0.0,
                "threshold_pct": 75.0,
                "summary": "Bot has not evaluated any market candle cycles yet. Start the bot to begin scanning."
            }
            
        max_score = max(float(d.get("confluence_pct") or 0.0) for d in decisions)
        threshold = float(decisions[0].get("threshold_pct") or 75.0)
        
        # Analyze decisions
        trade_decisions = [d for d in decisions if d.get("decision") in ["LONG", "SHORT"]]
        
        if closed_trades > 0 or len(trade_decisions) > 0:
            summary = f"Checked market {total_scans} times in recent scans. {closed_trades} closed trade(s) executed. Bot is actively executing when threshold ({threshold:.0f}%) is met."
        elif threshold >= 100.0:
            summary = f"Checked market {total_scans} times in recent scans. No trades yet — this bot requires 100% agreement across all indicators, which is rare. Best score reached: {max_score:.0f}% (consider lowering threshold for more frequent trades)."
        elif max_score < threshold:
            summary = f"Checked market {total_scans} times in recent scans. No trades yet — indicators haven't agreed strongly enough (best score reached: {max_score:.0f}%, {threshold:.0f}% required)."
        else:
            summary = f"Checked market {total_scans} times in recent scans. Best score reached {max_score:.0f}% (threshold {threshold:.0f}%). Strategy is evaluating setups."

        return {
            "total_scans": total_scans,
            "max_confluence_pct": max_score,
            "threshold_pct": threshold,
            "summary": summary
        }
    except Exception as exc:
        logger.error(f"Error generating strategy diagnosis for {bot_id}: {exc}")
        return {
            "total_scans": 0,
            "max_confluence_pct": 0.0,
            "threshold_pct": 75.0,
            "summary": "Actively scanning market cycles..."
        }


def log_system_health(
    cpu_percent: Optional[float],
    ram_mb: Optional[float],
    internet_connected: bool,
    latency_ms: Optional[float],
    balance: Optional[float],
    equity: Optional[float],
    current_position: Optional[float],
    running_time_seconds: Optional[float],
    status: str,
) -> None:
    """Persist a health snapshot containing runtime and connectivity metrics."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        now_str = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            """
            INSERT INTO system_health (timestamp, cpu_percent, ram_mb, internet_connected, latency_ms, balance, equity, current_position, running_time_seconds, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (now_str, cpu_percent, ram_mb, 1 if internet_connected else 0, latency_ms, balance, equity, current_position, running_time_seconds, status),
        )
        conn.commit()
        conn.close()
    except Exception as exc:
        logger.error("Error logging system health: %s", exc)


def log_daily_statistics(stats: Dict[str, Any]) -> None:
    """Persist a daily summary snapshot."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        now_str = datetime.now(timezone.utc).isoformat()
        date_key = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        cursor.execute(
            """
            INSERT INTO daily_statistics (timestamp, date_key, total_trades, winning_trades, losing_trades, win_rate, daily_pnl, balance, equity)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                now_str,
                date_key,
                stats.get("total_trades", 0),
                stats.get("winning_trades", 0),
                stats.get("losing_trades", 0),
                stats.get("win_rate", 0.0),
                stats.get("daily_pnl", 0.0),
                stats.get("balance"),
                stats.get("equity"),
            ),
        )
        conn.commit()
        conn.close()
    except Exception as exc:
        logger.error("Error logging daily statistics: %s", exc)


def backup_database() -> Optional[Path]:
    """Create a timestamped backup copy of the SQLite database."""
    if not config.DB_BACKUP_ENABLED:
        return None
    try:
        backup_dir = config.BACKUP_PATH
        backup_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        destination = backup_dir / f"trading_bot_{timestamp}.db"
        shutil.copy2(str(config.DB_PATH), str(destination))
        logger.info("Database backup created at %s", destination)
        return destination
    except Exception as exc:
        logger.error("Database backup failed: %s", exc)
        return None


def check_database_integrity() -> Tuple[bool, str]:
    """Run a SQLite integrity check and return the status."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        row = cursor.execute("PRAGMA quick_check").fetchone()
        conn.close()
        if row and row[0] == "ok":
            return True, "ok"
        return False, str(row[0]) if row else "unknown"
    except Exception as exc:
        logger.error("Database integrity check failed: %s", exc)
        return False, str(exc)


def get_todays_pnl(symbol: str = config.SYMBOL) -> float:
    """Aggregate finalized PnL for trades closed today (UTC)."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        today_date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        cursor.execute(
            """
            SELECT SUM(result_pnl) as total_pnl
            FROM trades_log
            WHERE symbol = ? AND status = 'CLOSED' AND exit_timestamp LIKE ?
            """,
            (symbol, f"{today_date_str}%"),
        )
        row = cursor.fetchone()
        conn.close()
        total_pnl = row["total_pnl"]
        return float(total_pnl) if total_pnl is not None else 0.0
    except Exception as exc:
        logger.error("Error getting today's PnL from DB: %s", exc)
        return 0.0


def get_daily_summary_stats() -> dict:
    """Retrieve execution stats for the last 24 hours (UTC)."""
    stats = {"cycles_run": 0, "signals_fired": [], "errors_count": 0}
    try:
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.now(timezone.utc)
        day_ago = (now - timedelta(days=1)).isoformat()
        cursor.execute("SELECT COUNT(*) as count FROM heartbeat_log WHERE timestamp >= ?", (day_ago,))
        row = cursor.fetchone()
        stats["cycles_run"] = row["count"] if row else 0
        cursor.execute("SELECT timestamp, signal_type, price, reason FROM signals_log WHERE timestamp >= ? AND signal_type != 'HOLD'", (day_ago,))
        stats["signals_fired"] = [dict(r) for r in cursor.fetchall()]
        cursor.execute("SELECT COUNT(*) as count FROM system_errors WHERE timestamp >= ?", (day_ago,))
        row = cursor.fetchone()
        stats["errors_count"] = row["count"] if row else 0
        conn.close()
    except Exception as exc:
        logger.error("Error fetching daily summary stats: %s", exc)
    return stats


def update_server_heartbeat() -> None:
    """Touch server heartbeat record every cycle."""
    for attempt in range(3):
        try:
            conn = get_connection()
            cursor = conn.cursor()
            now_str = datetime.now(timezone.utc).isoformat()
            cursor.execute("SELECT id FROM system_session WHERE status = 'ACTIVE' ORDER BY id DESC LIMIT 1")
            row = cursor.fetchone()
            if row:
                cursor.execute("UPDATE system_session SET last_heartbeat = ? WHERE id = ?", (now_str, row['id']))
            else:
                cursor.execute("INSERT OR REPLACE INTO system_session (id, server_start_time, last_heartbeat, last_seen_at, status) VALUES (1, ?, ?, ?, 'ACTIVE')", (now_str, now_str, now_str))
            conn.commit()
            conn.close()
            break
        except Exception as exc:
            if attempt == 2:
                logger.debug("Server heartbeat update retry skipped: %s", exc)
            time.sleep(0.1)


@with_db_retry(max_retries=5)
def reconcile_stale_bot_statuses() -> Dict[str, Any]:
    """
    On server startup, check for bots marked RUNNING or PAUSED that don't have active background sub-processes.
    Correct DB status to STOPPED and attach a clear explanation.
    Uses discrete atomic transactions to prevent nested self-deadlocks.
    """
    summary = {
        "last_seen_at": None,
        "offline_seconds": 0,
        "status_changes": [],
        "trades_completed_away": [],
        "net_pnl_away": 0.0,
        "disclaimer": "IMPORTANT: Bots do NOT continue running when your PC is off or the dashboard server is closed — trading only happens while dashboard.py is actively running."
    }

    try:
        now_utc = datetime.now(timezone.utc)
        now_str = now_utc.isoformat()

        # Step 1: Session heartbeat update in a short atomic transaction
        with get_db_transaction() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM system_session ORDER BY id DESC LIMIT 1")
            last_session = cursor.fetchone()

            if last_session:
                last_hb_str = last_session["last_heartbeat"] or last_session["server_start_time"]
                summary["last_seen_at"] = last_hb_str
                try:
                    last_dt = datetime.fromisoformat(last_hb_str.replace("Z", "+00:00"))
                    if last_dt.tzinfo is None:
                        last_dt = last_dt.replace(tzinfo=timezone.utc)
                    summary["offline_seconds"] = max(0, int((now_utc - last_dt).total_seconds()))
                except Exception:
                    summary["offline_seconds"] = 0

                cursor.execute("UPDATE system_session SET status = 'CLOSED' WHERE status = 'ACTIVE'")

            cursor.execute("INSERT OR REPLACE INTO system_session (id, server_start_time, last_heartbeat, last_seen_at, status) VALUES (1, ?, ?, ?, 'ACTIVE')", (now_str, now_str, now_str))

        # Step 2: Read bot instances (read-only)
        bot_rows = safe_query("SELECT id, name, status FROM bot_instances")
        
        # Step 3: Check OS process liveness in-memory without holding SQLite transaction
        from src.process_manager import multi_bot_manager
        updates_needed = []
        for b in bot_rows:
            bot_id = b["id"]
            name = b["name"]
            current_db_status = b["status"]

            mgr = multi_bot_manager.get_manager(bot_id)
            actual_alive = mgr.is_running()

            if (current_db_status in ["RUNNING", "PAUSED"]) and not actual_alive:
                stuck_msg = "⚠️ This bot was marked RUNNING but its process is no longer active — likely stopped when the server was closed. Click Start to resume."
                updates_needed.append((bot_id, name, current_db_status, stuck_msg))

        # Step 4: Batch apply status updates in a short atomic transaction
        if updates_needed:
            with get_db_transaction() as conn:
                cursor = conn.cursor()
                for bot_id, name, current_db_status, stuck_msg in updates_needed:
                    cursor.execute(
                        "UPDATE bot_instances SET status = 'STOPPED', stuck_explanation = ? WHERE id = ?",
                        (stuck_msg, bot_id)
                    )
                    summary["status_changes"].append({
                        "bot_id": bot_id,
                        "name": name,
                        "old_status": current_db_status,
                        "new_status": "STOPPED",
                        "reason": "process ended when server/PC shut down"
                    })
                    cursor.execute(
                        "INSERT INTO bot_activity_logs (timestamp, bot_id, event_type, activity_type, message, details_json) VALUES (?, ?, 'STATUS_RECONCILED', 'STATUS_RECONCILED', ?, ?)",
                        (now_str, bot_id, f"Bot status reconciled from {current_db_status} to STOPPED on server restart.", json.dumps({"stuck_msg": stuck_msg}))
                    )

        # Step 5: Fetch recent trades
        if summary["last_seen_at"]:
            recent_trades = safe_query("SELECT * FROM trades_log WHERE status = 'CLOSED' AND exit_timestamp >= ? ORDER BY id DESC", (summary["last_seen_at"],))
        else:
            recent_trades = safe_query("SELECT * FROM trades_log WHERE status = 'CLOSED' ORDER BY id DESC LIMIT 5")

        summary["trades_completed_away"] = recent_trades
        summary["net_pnl_away"] = sum(float(t.get("result_pnl") or 0.0) for t in recent_trades)

    except Exception as exc:
        logger.error("Error during bot status reconciliation: %s", exc)

    return summary


def compute_bot_health(
    bot_id: str,
    live_market_price: Optional[Any] = None,
    bot_dict: Optional[Dict[str, Any]] = None,
    latest_decisions: Optional[Dict[str, Any]] = None,
    **kwargs: Any
) -> Dict[str, Any]:

    """
    Computes a non-falsifiable health indicator for a bot instance quickly in memory without external network calls.
    1. Process survival (actual process state vs DB status)
    2. Evaluation timestamp freshness vs timeframe expected interval
    3. Symbol-specific price accuracy
    4. Reasoning continuity
    """
    reasons = []

    if bot_dict is None:
        conn = get_connection()
        c = conn.cursor()
        c.execute("SELECT * FROM bot_instances WHERE id = ?", (bot_id,))
        row = c.fetchone()
        conn.close()
        if not row:
            return {
                "bot_id": bot_id,
                "health_status": "UNRELIABLE",
                "is_process_alive": False,
                "reasons": ["Bot instance record not found"],
                "last_checked_at": None,
                "last_logged_price": None,
                "live_market_price": None,
                "age_seconds": None,
                "info": "Bot instance not found"
            }
        bot = dict(row)
    else:
        bot = bot_dict

    symbol = bot.get("symbol", "BTC/USDT").upper()
    timeframe = bot.get("timeframe", "5m")
    last_checked_str = bot.get("last_checked_at")
    status = bot.get("status", "STOPPED")

    # 1. Process Survival Check
    from src.process_manager import multi_bot_manager
    mgr = multi_bot_manager.get_manager(bot_id)
    is_alive = mgr.is_running()

    if status in ["RUNNING", "PAUSED"] and not is_alive:
        reasons.append(f"Process is DEAD/Missing while marked {status}")

    # 2. Evaluation Timestamp Freshness Check
    from src.indicators import get_timeframe_minutes
    mins = get_timeframe_minutes(timeframe)
    max_interval_sec = max(mins * 60 * 2 + 60, 300)

    now_utc = datetime.now(timezone.utc)
    age_seconds = None

    if last_checked_str:
        try:
            last_dt = datetime.fromisoformat(last_checked_str.replace("Z", "+00:00"))
            if last_dt.tzinfo is None:
                last_dt = last_dt.replace(tzinfo=timezone.utc)
            age_seconds = int((now_utc - last_dt).total_seconds())
        except Exception:
            age_seconds = 999999

    if status == "RUNNING":
        if age_seconds is None or age_seconds > max_interval_sec:
            reasons.append(f"Evaluation Stalled: Last cycle was {age_seconds if age_seconds is not None else 'N/A'}s ago (expected <{max_interval_sec}s)")

    # 3. Decision Reasoning Check
    last_logged_price = None
    dec_row = None
    if latest_decisions and bot_id in latest_decisions:
        dec_row = dict(latest_decisions[bot_id]) if latest_decisions[bot_id] else None
    elif bot_dict is None:
        conn = get_connection()
        c = conn.cursor()
        c.execute("SELECT price, timestamp, reason, indicators_json FROM bot_decision_logs WHERE bot_id = ? ORDER BY id DESC LIMIT 1", (bot_id,))
        row = c.fetchone()
        dec_row = dict(row) if row else None
        conn.close()

    if dec_row:
        last_logged_price = float(dec_row["price"]) if dec_row.get("price") else None

    # Determine live market price
    target_live_price = None
    if isinstance(live_market_price, dict):
        target_live_price = live_market_price.get(symbol)
    elif isinstance(live_market_price, (int, float)) and symbol in ["BTC/USDT", "BTCUSDT"]:
        target_live_price = float(live_market_price)

    if status == "RUNNING":
        if not dec_row and not last_checked_str:
            reasons.append("Reasoning Missing: Zero decision logs recorded for this bot")
        elif dec_row:
            dec_time_str = dec_row.get("timestamp")
            if dec_time_str:
                try:
                    dec_dt = datetime.fromisoformat(dec_time_str.replace("Z", "+00:00"))
                    if dec_dt.tzinfo is None:
                        dec_dt = dec_dt.replace(tzinfo=timezone.utc)
                    dec_age = int((now_utc - dec_dt).total_seconds())
                    if dec_age > max_interval_sec:
                        reasons.append(f"Reasoning Stale: Last reasoning update was {dec_age}s ago")
                except Exception:
                    pass


        if target_live_price and last_logged_price:
            price_diff_pct = abs(last_logged_price - target_live_price) / target_live_price * 100.0
            if price_diff_pct > 5.0:
                reasons.append(f"Price Discrepancy ({symbol}): Logged ${last_logged_price:,.2f} vs Live ${target_live_price:,.2f} ({price_diff_pct:.1f}% deviation)")

    if status == "STOPPED":
        health_status = "STOPPED"
        if last_logged_price and age_seconds is not None:
            hours_ago = round(age_seconds / 3600.0, 1)
            info_msg = f"Bot is stopped (last evaluated {hours_ago}h ago on {symbol} at ${last_logged_price:,.2f})"
        else:
            info_msg = f"Bot is stopped on {symbol}"
    elif len(reasons) > 0:
        health_status = "UNRELIABLE"
        info_msg = " | ".join(reasons)
    else:
        health_status = "HEALTHY"
        info_msg = f"Evaluating actively on {symbol}"

    return {
        "bot_id": bot_id,
        "name": bot.get("name"),
        "symbol": symbol,
        "status": status,
        "health_status": health_status,
        "is_process_alive": is_alive,
        "reasons": reasons,
        "last_checked_at": last_checked_str,
        "age_seconds": age_seconds,
        "last_logged_price": last_logged_price,
        "live_market_price": target_live_price,
        "info": info_msg
    }




def audit_and_clean_db() -> Dict[str, Any]:
    """
    Audit trade history and bot logs in the database for corruption, duplicates, or inconsistencies.
    Removes duplicate trades from multiple server runs and reports findings.
    """
    report = {
        "trades_audited": 0,
        "duplicate_trades_removed": 0,
        "inconsistent_trades_fixed": 0,
        "details": []
    }
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM trades_log ORDER BY id ASC")
        trades = [dict(r) for r in cursor.fetchall()]
        report["trades_audited"] = len(trades)

        seen_trades = []
        duplicate_ids = []

        for t in trades:
            t_time_str = t.get("timestamp") or ""
            t_dt = None
            if t_time_str:
                try:
                    t_dt = datetime.fromisoformat(t_time_str.replace("Z", "+00:00"))
                except Exception:
                    pass

            is_dup = False
            for prev in seen_trades:
                if (t["symbol"] == prev["symbol"] and
                    t["direction"] == prev["direction"] and
                    abs(float(t["entry_price"]) - float(prev["entry_price"])) < 0.01 and
                    abs(float(t["position_size"]) - float(prev["position_size"])) < 0.00001):

                    if t_dt and prev["dt"]:
                        diff_sec = abs((t_dt - prev["dt"]).total_seconds())
                        if diff_sec <= 15:
                            is_dup = True
                            break
                    elif t_time_str == prev["timestamp"]:
                        is_dup = True
                        break

            if is_dup:
                duplicate_ids.append(t["id"])
                report["details"].append(f"Duplicate trade ID {t['id']} ({t['symbol']} {t['direction']} @ ${t['entry_price']})")
            else:
                seen_trades.append({
                    "id": t["id"],
                    "symbol": t["symbol"],
                    "direction": t["direction"],
                    "entry_price": t["entry_price"],
                    "position_size": t["position_size"],
                    "timestamp": t_time_str,
                    "dt": t_dt
                })

        if duplicate_ids:
            for did in duplicate_ids:
                cursor.execute("DELETE FROM trades_log WHERE id = ?", (did,))
            report["duplicate_trades_removed"] = len(duplicate_ids)
            logger.info("DB Audit: Removed %d duplicate trade records: %s", len(duplicate_ids), duplicate_ids)

        conn.commit()
        conn.close()
    except Exception as exc:
        logger.error("Error during DB audit and clean: %s", exc)
        report["error"] = str(exc)

    return report


def get_indicator_profiles() -> list[Dict[str, Any]]:
    """Fetch all saved indicator profiles."""
    results = []
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM indicator_profiles ORDER BY updated_at DESC")
        rows = cursor.fetchall()
        for r in rows:
            d = dict(r)
            d["config"] = json.loads(d.get("config_json") or "{}")
            results.append(d)
        conn.close()
    except Exception as exc:
        logger.error(f"Error fetching indicator profiles: {exc}")
    return results


def get_indicator_profile_by_id(profile_id: str) -> Optional[Dict[str, Any]]:
    """Fetch single indicator profile by ID."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM indicator_profiles WHERE profile_id = ?", (profile_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            d = dict(row)
            d["config"] = json.loads(d.get("config_json") or "{}")
            return d
    except Exception as exc:
        logger.error(f"Error fetching profile {profile_id}: {exc}")
    return None


def save_indicator_profile(profile_data: Dict[str, Any]) -> Tuple[bool, str]:
    """Create or update an indicator profile and record version history."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        now_str = datetime.now(timezone.utc).isoformat()

        pid = profile_data.get("profile_id") or f"profile-{int(time.time())}"
        name = profile_data.get("name", "Custom Profile")
        market_regime = profile_data.get("market_regime", "ALL")
        adaptive_mode = profile_data.get("adaptive_mode", "BALANCED")
        threshold_long = float(profile_data.get("signal_threshold_long", 75.0))
        threshold_short = float(profile_data.get("signal_threshold_short", 75.0))
        scoring_mode = profile_data.get("scoring_mode", "WEIGHTED")
        config_dict = profile_data.get("config") or profile_data.get("config_json") or {}
        config_json = json.dumps(config_dict) if isinstance(config_dict, dict) else str(config_dict)
        description = profile_data.get("description", "")

        cursor.execute("SELECT version FROM indicator_profiles WHERE profile_id = ?", (pid,))
        existing = cursor.fetchone()

        if existing:
            new_ver = existing["version"] + 1
            cursor.execute(
                """
                UPDATE indicator_profiles
                SET name = ?, version = ?, market_regime = ?, adaptive_mode = ?, signal_threshold_long = ?, signal_threshold_short = ?, scoring_mode = ?, config_json = ?, description = ?, updated_at = ?
                WHERE profile_id = ?
                """,
                (name, new_ver, market_regime, adaptive_mode, threshold_long, threshold_short, scoring_mode, config_json, description, now_str, pid),
            )
        else:
            new_ver = 1
            cursor.execute(
                """
                INSERT INTO indicator_profiles
                (profile_id, name, version, is_active, market_regime, adaptive_mode, signal_threshold_long, signal_threshold_short, scoring_mode, config_json, description, created_at, updated_at)
                VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (pid, name, new_ver, market_regime, adaptive_mode, threshold_long, threshold_short, scoring_mode, config_json, description, now_str, now_str),
            )

        # Record version history
        notes = profile_data.get("change_notes", f"Saved version {new_ver}")
        cursor.execute(
            "INSERT INTO indicator_profile_versions (profile_id, version, name, config_json, config_snapshot_json, created_at, change_notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (pid, new_ver, name, config_json, config_json, now_str, notes),
        )

        conn.commit()
        conn.close()
        return True, pid
    except Exception as exc:
        logger.error(f"Error saving indicator profile: {exc}")
        return False, str(exc)


def get_bot_indicator_profile(bot_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve active indicator profile assigned to a specific bot instance."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT ip.* FROM indicator_profiles ip
            JOIN bot_indicator_profiles bip ON ip.profile_id = bip.profile_id
            WHERE bip.bot_id = ?
            """,
            (bot_id,),
        )
        row = cursor.fetchone()
        conn.close()
        if row:
            d = dict(row)
            d["config"] = json.loads(d.get("config_json") or "{}")
            return d
    except Exception as exc:
        logger.error(f"Error fetching bot indicator profile for {bot_id}: {exc}")
    return get_indicator_profile_by_id("profile-btc-15m-trend")


def apply_profile_to_bot(bot_id: str, profile_id: str) -> bool:
    """Assign an indicator profile to a bot instance."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        now_str = datetime.now(timezone.utc).isoformat()
        cursor.execute("INSERT OR REPLACE INTO bot_indicator_profiles (bot_id, profile_id, applied_at) VALUES (?, ?, ?)", (bot_id, profile_id, now_str))
        conn.commit()
        conn.close()
        return True
    except Exception as exc:
        logger.error(f"Error applying profile {profile_id} to bot {bot_id}: {exc}")
        return False


def get_scenario_profiles() -> list[Dict[str, Any]]:
    """Retrieve scenario profiles, auto-seeding default market scenarios if table is empty."""
    results = []
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM scenario_profiles")
        if cursor.fetchone()["count"] == 0:
            scenarios = [
                ("sc-trending-bull", "sc-trending-bull", "Trending Bull Market", "TRENDING_BULL", json.dumps(["ema", "macd", "adx", "supertrend", "vwap", "volume"]), json.dumps({"ema": {"fast": 20, "slow": 50}, "adx": {"threshold": 25}}), "Strong upward momentum trend preferred indicators."),
                ("sc-trending-bear", "sc-trending-bear", "Trending Bear Market", "TRENDING_BEAR", json.dumps(["ema", "macd", "adx", "supertrend", "vwap", "volume"]), json.dumps({"ema": {"fast": 20, "slow": 50}, "adx": {"threshold": 25}}), "Strong downward trend preferred indicators."),
                ("sc-sideways-range", "sc-sideways-range", "Sideways / Range Market", "SIDEWAYS_RANGE", json.dumps(["rsi", "stoch_rsi", "bollinger", "vwap", "support_resistance"]), json.dumps({"rsi": {"oversold": 30, "overbought": 70}}), "Oscillator and band-reversion preferred indicators."),
                ("sc-high-volatility", "sc-high-volatility", "High Volatility", "HIGH_VOLATILITY", json.dumps(["atr", "bollinger", "adx", "volume", "supertrend"]), json.dumps({"atr": {"multiplier": 2.0}}), "Expansion and volatility envelope preferred indicators."),
                ("sc-low-volatility", "sc-low-volatility", "Low Volatility", "LOW_VOLATILITY", json.dumps(["bollinger", "vwap", "rsi", "volume"]), json.dumps({"bollinger": {"period": 20, "std_dev": 2.0}}), "Contraction and range building preferred indicators."),
                ("sc-breakout", "sc-breakout", "Breakout Scenario", "BREAKOUT", json.dumps(["volume", "bollinger", "atr", "donchian", "vwap", "ema"]), json.dumps({"donchian": {"period": 20}}), "Channel breakout & volume expansion preferred indicators."),
                ("sc-pullback", "sc-pullback", "Pullback Scenario", "PULLBACK", json.dumps(["ema", "vwap", "rsi", "macd", "volume"]), json.dumps({"rsi": {"period": 14}}), "Trend retracement entry preferred indicators.")
            ]
            cursor.executemany(
                "INSERT INTO scenario_profiles (id, scenario_id, name, regime, preferred_indicators_json, default_params_json, description) VALUES (?, ?, ?, ?, ?, ?, ?)",
                scenarios
            )
            conn.commit()

        cursor.execute("SELECT * FROM scenario_profiles")
        rows = cursor.fetchall()
        for r in rows:
            d = dict(r)
            d["preferred_indicators"] = json.loads(d.get("preferred_indicators_json") or "[]")
            d["default_params"] = json.loads(d.get("default_params_json") or "{}")
            results.append(d)
        conn.close()
    except Exception as exc:
        logger.error(f"Error fetching scenario profiles: {exc}")
    return results


def save_bot_indicators(bot_id: str, indicators: list) -> bool:
    """Update indicators configuration inside bot_instances.config_json for a specific bot instance."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT config_json FROM bot_instances WHERE id = ?", (bot_id,))
        row = cursor.fetchone()
        cfg = {}
        if row and row["config_json"]:
            try:
                cfg = json.loads(row["config_json"])
                if isinstance(cfg, str):
                    cfg = json.loads(cfg)
            except Exception:
                cfg = {}
        if not isinstance(cfg, dict):
            cfg = {}

        cfg["indicators"] = indicators
        cfg_str = json.dumps(cfg)
        now_str = datetime.now(timezone.utc).isoformat()

        cursor.execute(
            "UPDATE bot_instances SET config_json = ? WHERE id = ?",
            (cfg_str, bot_id)
        )
        conn.commit()
        conn.close()
        logger.info("Saved indicators configuration for bot instance '%s': %s", bot_id, indicators)
        return True
    except Exception as exc:
        logger.error("Error saving bot indicators for %s: %s", bot_id, exc)
        return False


def cleanup_bot_instances() -> Dict[str, Any]:
    """
    Remove all duplicate and temporary test bot instances from bot_instances table,
    retaining only the 3 primary core bots (bot-1, bot-2, bot-3).
    Returns a report detailing removed and retained bot IDs.
    """
    report = {
        "retained_bots": [],
        "removed_bots": []
    }
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, name FROM bot_instances")
        all_bots = cursor.fetchall()

        allowed_bot_ids = {"bot-1", "bot-2", "bot-3"}
        for b in all_bots:
            b_id = b["id"]
            b_name = b["name"]
            if b_id in allowed_bot_ids:
                report["retained_bots"].append(f"{b_id} ({b_name})")
            else:
                cursor.execute("DELETE FROM bot_instances WHERE id = ?", (b_id,))
                report["removed_bots"].append(f"{b_id} ({b_name})")

        conn.commit()
        conn.close()
        logger.info(f"Bot Instances Cleanup: Retained {len(report['retained_bots'])}, Removed {len(report['removed_bots'])} test bots.")
    except Exception as exc:
        logger.error(f"Error during bot instances cleanup: {exc}")
        report["error"] = str(exc)

    return report


def seed_indicator_configs_if_needed() -> None:
    """Seed default indicator configuration records and presets from universal schemas if not present."""
    try:
        from src.indicator_schema import UNIVERSAL_INDICATOR_SCHEMAS, UNIVERSAL_INDICATOR_PRESETS
        conn = get_connection()
        cursor = conn.cursor()
        now_str = datetime.now(timezone.utc).isoformat()

        # Seed indicator configs
        for ind_id, schema in UNIVERSAL_INDICATOR_SCHEMAS.items():
            cursor.execute("SELECT id FROM indicator_configs WHERE indicator_id = ?", (ind_id,))
            row = cursor.fetchone()
            if not row:
                params_json = json.dumps(schema.get("default_parameters", {}))
                disp_json = json.dumps(schema.get("default_display", {}))
                sig_json = json.dumps(schema.get("default_signal", {}))
                cursor.execute(
                    """
                    INSERT INTO indicator_configs 
                    (indicator_id, name, category, enabled, favorite, timeframe, weight, long_enabled, short_enabled, signal_mode, min_confirmations, parameters_json, display_json, signal_rules_json, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        ind_id,
                        schema.get("name", ind_id),
                        schema.get("category", "General"),
                        1,
                        0,
                        schema.get("default_timeframe", "15m"),
                        float(schema.get("default_weight", 15.0)),
                        1 if schema.get("default_signal", {}).get("long_enabled", True) else 0,
                        1 if schema.get("default_signal", {}).get("short_enabled", True) else 0,
                        schema.get("default_signal", {}).get("signal_mode", "both"),
                        int(schema.get("default_signal", {}).get("min_confirmations", 1)),
                        params_json,
                        disp_json,
                        sig_json,
                        now_str,
                        now_str
                    )
                )

        # Seed system presets
        for preset_name, preset_data in UNIVERSAL_INDICATOR_PRESETS.items():
            preset_id = preset_name.lower().replace(" ", "_").replace("/", "_")
            cursor.execute("SELECT preset_id FROM indicator_presets WHERE preset_id = ?", (preset_id,))
            if not cursor.fetchone():
                cursor.execute(
                    """
                    INSERT INTO indicator_presets (preset_id, name, category, description, config_json, is_system, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
                    """,
                    (
                        preset_id,
                        preset_data.get("name", preset_name),
                        preset_data.get("category", "General"),
                        preset_data.get("description", ""),
                        json.dumps(preset_data),
                        now_str,
                        now_str
                    )
                )

        conn.commit()
        conn.close()
    except Exception as exc:
        logger.error(f"Error seeding indicator configs: {exc}")


def get_all_indicator_configs() -> list[Dict[str, Any]]:
    """Retrieve all indicator configuration records from DB enriched with schema definitions."""
    results = []
    try:
        seed_indicator_configs_if_needed()
        from src.indicator_schema import UNIVERSAL_INDICATOR_SCHEMAS
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM indicator_configs ORDER BY category ASC, name ASC")
        rows = cursor.fetchall()
        for r in rows:
            d = dict(r)
            iid = d.get("indicator_id")
            d["id"] = iid
            d["enabled"] = bool(d.get("enabled", 1))
            d["favorite"] = bool(d.get("favorite", 0))
            d["long_enabled"] = bool(d.get("long_enabled", 1))
            d["short_enabled"] = bool(d.get("short_enabled", 1))
            d["parameters"] = json.loads(d.get("parameters_json") or "{}")
            d["display"] = json.loads(d.get("display_json") or "{}")
            d["signal_rules"] = json.loads(d.get("signal_rules_json") or "{}")

            # Attach schema metadata
            schema = UNIVERSAL_INDICATOR_SCHEMAS.get(iid, {})
            d["parameter_schema"] = schema.get("parameter_schema", [])
            d["description"] = schema.get("description", "")
            d["version"] = schema.get("version", "1.0.0")
            d["default_parameters"] = schema.get("default_parameters", {})
            results.append(d)
        conn.close()
    except Exception as exc:
        logger.error(f"Error fetching indicator configs: {exc}")
    return results


def get_indicator_config(indicator_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve a single indicator configuration record by indicator_id with full schema metadata."""
    try:
        seed_indicator_configs_if_needed()
        from src.indicator_schema import UNIVERSAL_INDICATOR_SCHEMAS
        r = safe_query_one("SELECT * FROM indicator_configs WHERE indicator_id = ?", (indicator_id,))
        if r:
            d = dict(r)
            iid = d.get("indicator_id")
            d["id"] = iid
            d["enabled"] = bool(d.get("enabled", 1))
            d["favorite"] = bool(d.get("favorite", 0))
            d["long_enabled"] = bool(d.get("long_enabled", 1))
            d["short_enabled"] = bool(d.get("short_enabled", 1))
            d["parameters"] = json.loads(d.get("parameters_json") or "{}")
            d["display"] = json.loads(d.get("display_json") or "{}")
            d["signal_rules"] = json.loads(d.get("signal_rules_json") or "{}")

            schema = UNIVERSAL_INDICATOR_SCHEMAS.get(iid, {})
            d["parameter_schema"] = schema.get("parameter_schema", [])
            d["description"] = schema.get("description", "")
            d["version"] = schema.get("version", "1.0.0")
            d["default_parameters"] = schema.get("default_parameters", {})
            return d
    except Exception as exc:
        logger.error(f"Error fetching indicator config {indicator_id}: {exc}")
    return None


def save_indicator_config(cfg_data: Dict[str, Any]) -> Tuple[bool, str]:
    """Create or update a specific indicator configuration record in database after schema validation."""
    try:
        from src.indicator_schema import validate_indicator_parameters
        ind_id = cfg_data.get("id") or cfg_data.get("indicator_id")
        if not ind_id:
            return False, "Missing indicator_id"

        params = cfg_data.get("parameters") or cfg_data.get("params") or {}
        if isinstance(params, str):
            try: params = json.loads(params)
            except Exception: params = {}

        # Validate parameters against schema
        is_valid, err_msg = validate_indicator_parameters(ind_id, params)
        if not is_valid:
            return False, err_msg

        # Capture old config for history tracking
        old_cfg = get_indicator_config(ind_id)

        now_str = datetime.now(timezone.utc).isoformat()
        name = cfg_data.get("name", ind_id)
        category = cfg_data.get("category", "General")
        enabled = 1 if cfg_data.get("enabled", True) else 0
        favorite = 1 if cfg_data.get("favorite", False) else 0
        timeframe = cfg_data.get("timeframe", "15m")
        weight = float(cfg_data.get("weight", 15.0))
        long_enabled = 1 if cfg_data.get("long_enabled", True) else 0
        short_enabled = 1 if cfg_data.get("short_enabled", True) else 0
        signal_mode = cfg_data.get("signal_mode", "both")
        min_confirmations = int(cfg_data.get("min_confirmations", 1))

        disp = cfg_data.get("display") or {}
        disp_json = json.dumps(disp) if isinstance(disp, dict) else str(disp)
        sig_rules = cfg_data.get("signal_rules") or {}
        sig_rules_json = json.dumps(sig_rules) if isinstance(sig_rules, dict) else str(sig_rules)
        params_json = json.dumps(params) if isinstance(params, dict) else str(params)

        with get_db_transaction() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM indicator_configs WHERE indicator_id = ?", (ind_id,))
            exists = cursor.fetchone()

            if exists:
                cursor.execute(
                    """
                    UPDATE indicator_configs
                    SET name = ?, category = ?, enabled = ?, favorite = ?, timeframe = ?, weight = ?,
                        long_enabled = ?, short_enabled = ?, signal_mode = ?, min_confirmations = ?,
                        parameters_json = ?, display_json = ?, signal_rules_json = ?, updated_at = ?
                    WHERE indicator_id = ?
                    """,
                    (name, category, enabled, favorite, timeframe, weight, long_enabled, short_enabled, signal_mode, min_confirmations, params_json, disp_json, sig_rules_json, now_str, ind_id),
                )
            else:
                cursor.execute(
                    """
                    INSERT INTO indicator_configs
                    (indicator_id, name, category, enabled, favorite, timeframe, weight, long_enabled, short_enabled, signal_mode, min_confirmations, parameters_json, display_json, signal_rules_json, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (ind_id, name, category, enabled, favorite, timeframe, weight, long_enabled, short_enabled, signal_mode, min_confirmations, params_json, disp_json, sig_rules_json, now_str, now_str),
                )

        # Log configuration change history
        new_cfg = get_indicator_config(ind_id)
        log_indicator_config_history(
            indicator_id=ind_id,
            old_cfg=old_cfg or {},
            new_cfg=new_cfg or {},
            bot_id=cfg_data.get("bot_id", "bot-1"),
            symbol=cfg_data.get("symbol", "BTC/USDT"),
            timeframe=timeframe,
            user_source=cfg_data.get("user_source", "Web Dashboard"),
            action="UPDATE"
        )

        logger.info(f"Saved universal indicator config for {ind_id} (Enabled: {enabled}, Weight: {weight}, TF: {timeframe})")
        return True, ind_id
    except Exception as exc:
        logger.error(f"Error saving indicator config: {exc}")
        return False, str(exc)


def log_indicator_config_history(indicator_id: str, old_cfg: Dict[str, Any], new_cfg: Dict[str, Any], bot_id: str = "bot-1", symbol: str = "BTC/USDT", timeframe: str = "15m", user_source: str = "Web Dashboard", action: str = "UPDATE") -> None:
    """Record an audit trail entry for indicator configuration changes."""
    try:
        now_str = datetime.now(timezone.utc).isoformat()
        safe_execute(
            """
            INSERT INTO indicator_config_history 
            (timestamp, indicator_id, bot_id, symbol, timeframe, action, user_source, old_config_json, new_config_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (now_str, indicator_id, bot_id, symbol, timeframe, action, user_source, json.dumps(old_cfg), json.dumps(new_cfg))
        )
    except Exception as exc:
        logger.error(f"Error logging indicator config history: {exc}")


def get_indicator_config_history(indicator_id: Optional[str] = None, bot_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    """Fetch chronological history of indicator configuration changes."""
    try:
        try:
            limit = int(limit)
        except Exception:
            limit = 50

        if indicator_id and bot_id:
            rows = safe_query("SELECT * FROM indicator_config_history WHERE indicator_id = ? AND bot_id = ? ORDER BY id DESC LIMIT ?", (indicator_id, bot_id, limit))
        elif indicator_id:
            rows = safe_query("SELECT * FROM indicator_config_history WHERE indicator_id = ? ORDER BY id DESC LIMIT ?", (indicator_id, limit))
        elif bot_id:
            rows = safe_query("SELECT * FROM indicator_config_history WHERE bot_id = ? ORDER BY id DESC LIMIT ?", (bot_id, limit))
        else:
            rows = safe_query("SELECT * FROM indicator_config_history ORDER BY id DESC LIMIT ?", (limit,))
        for r in rows:
            try: r["old_config"] = json.loads(r.get("old_config_json") or "{}")
            except Exception: r["old_config"] = {}
            try: r["new_config"] = json.loads(r.get("new_config_json") or "{}")
            except Exception: r["new_config"] = {}
        return rows
    except Exception as exc:
        logger.error(f"Error fetching indicator config history: {exc}")
        return []



def set_indicator_enabled(indicator_id: str, enabled: bool) -> bool:
    """Set enabled status (True/False) for an indicator in database."""
    try:
        now_str = datetime.now(timezone.utc).isoformat()
        val = 1 if enabled else 0
        return safe_execute("UPDATE indicator_configs SET enabled = ?, updated_at = ? WHERE indicator_id = ?", (val, now_str, indicator_id))
    except Exception as exc:
        logger.error(f"Error setting indicator enabled {indicator_id}: {exc}")
        return False


def set_all_indicators_enabled(enabled: bool) -> bool:
    """Set enabled status (True/False) for ALL indicators in database atomically."""
    try:
        now_str = datetime.now(timezone.utc).isoformat()
        val = 1 if enabled else 0
        return safe_execute("UPDATE indicator_configs SET enabled = ?, updated_at = ?", (val, now_str))
    except Exception as exc:
        logger.error(f"Error setting all indicators enabled={enabled}: {exc}")
        return False



def toggle_indicator_favorite(indicator_id: str) -> Tuple[bool, bool]:
    """Toggle favorite status (⭐) for an indicator in database. Returns (success, new_favorite_state)."""
    try:
        now_str = datetime.now(timezone.utc).isoformat()
        row = safe_query_one("SELECT favorite FROM indicator_configs WHERE indicator_id = ?", (indicator_id,))
        current_fav = bool(row["favorite"]) if row else False
        new_fav = not current_fav
        val = 1 if new_fav else 0
        ok = safe_execute("UPDATE indicator_configs SET favorite = ?, updated_at = ? WHERE indicator_id = ?", (val, now_str, indicator_id))
        return ok, new_fav
    except Exception as exc:
        logger.error(f"Error toggling favorite for {indicator_id}: {exc}")
        return False, False


def reset_indicator_config(indicator_id: str) -> bool:
    """Reset a single indicator to default universal schema configuration."""
    try:
        from src.indicator_schema import UNIVERSAL_INDICATOR_SCHEMAS
        schema = UNIVERSAL_INDICATOR_SCHEMAS.get(indicator_id)
        if not schema:
            return False

        default_cfg = {
            "id": indicator_id,
            "indicator_id": indicator_id,
            "name": schema.get("name", indicator_id),
            "category": schema.get("category", "General"),
            "enabled": True,
            "favorite": False,
            "timeframe": schema.get("default_timeframe", "15m"),
            "weight": schema.get("default_weight", 15.0),
            "long_enabled": schema.get("default_signal", {}).get("long_enabled", True),
            "short_enabled": schema.get("default_signal", {}).get("short_enabled", True),
            "signal_mode": schema.get("default_signal", {}).get("signal_mode", "both"),
            "min_confirmations": schema.get("default_signal", {}).get("min_confirmations", 1),
            "parameters": schema.get("default_parameters", {}),
            "display": schema.get("default_display", {})
        }
        ok, _ = save_indicator_config(default_cfg)
        return ok
    except Exception as exc:
        logger.error(f"Error resetting indicator config {indicator_id}: {exc}")
        return False


def reset_all_indicator_configs() -> bool:
    """Reset all indicators to default universal schema configurations."""
    try:
        safe_execute("DELETE FROM indicator_configs")
        seed_indicator_configs_if_needed()
        return True
    except Exception as exc:
        logger.error(f"Error resetting all indicator configs: {exc}")
        return False


# ============================================================================
# PER-BOT CUSTOM INDICATOR CONFIGURATION ENGINE & HIERARCHY RESOLVER
# ============================================================================

def get_bot_effective_indicator_configs(bot_id: str = "bot-1", symbol: Optional[str] = None, timeframe: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Resolves the effective indicator configurations for a specific bot following the strict hierarchy:
    GLOBAL DEFAULT -> PROFILE -> BOT OVERRIDE.
    Each returned indicator dictionary includes:
      - effective_source: 'BOT OVERRIDE', 'BOT PROFILE', or 'GLOBAL DEFAULT'
      - effective_profile_name: Name of active profile if applicable
      - all schema-validated parameters, weights, timeframes, and enabled flags
    """
    try:
        # 1. Base: Global Defaults from indicator_configs
        all_defaults = get_all_indicator_configs()
        resolved_map = {ind["indicator_id"]: copy.deepcopy(ind) for ind in all_defaults}

        for ind in resolved_map.values():
            ind["effective_source"] = "GLOBAL DEFAULT"
            ind["effective_profile_name"] = None
            ind["bot_id"] = bot_id

        # 2. Profile Layer: Overlay bot's assigned profile if present
        profile = get_bot_indicator_profile(bot_id)
        if profile and profile.get("config"):
            p_name = profile.get("name", "Assigned Profile")
            p_cfg = profile.get("config", {})
            for iid, p_ind in p_cfg.items():
                if iid in resolved_map and isinstance(p_ind, dict):
                    target = resolved_map[iid]
                    target["effective_source"] = "BOT PROFILE"
                    target["effective_profile_name"] = p_name
                    if "enabled" in p_ind: target["enabled"] = bool(p_ind["enabled"])
                    if "weight" in p_ind: target["weight"] = float(p_ind["weight"])
                    if "timeframe" in p_ind: target["timeframe"] = str(p_ind["timeframe"])
                    if "long_enabled" in p_ind: target["long_enabled"] = bool(p_ind["long_enabled"])
                    if "short_enabled" in p_ind: target["short_enabled"] = bool(p_ind["short_enabled"])
                    if "signal_mode" in p_ind: target["signal_mode"] = str(p_ind["signal_mode"])
                    if "parameters" in p_ind and isinstance(p_ind["parameters"], dict):
                        target["parameters"].update(p_ind["parameters"])

        # 3. Bot Override Layer: Overlay specific bot_indicator_configs for this bot
        bot_overrides = safe_query("SELECT * FROM bot_indicator_configs WHERE bot_id = ?", (bot_id,))
        for row in bot_overrides:
            iid = row.get("indicator_id")
            if iid in resolved_map:
                target = resolved_map[iid]
                target["effective_source"] = "BOT OVERRIDE"
                target["enabled"] = bool(row.get("enabled", 1))
                target["weight"] = float(row.get("weight", 15.0))
                if row.get("timeframe_override"):
                    target["timeframe"] = row["timeframe_override"]
                target["long_enabled"] = bool(row.get("long_enabled", 1))
                target["short_enabled"] = bool(row.get("short_enabled", 1))
                target["signal_mode"] = str(row.get("signal_mode") or "both")
                target["min_confirmations"] = int(row.get("min_confirmations") or 1)

                try:
                    p_json = json.loads(row.get("parameters_json") or "{}")
                    if p_json: target["parameters"].update(p_json)
                except Exception: pass

                try:
                    d_json = json.loads(row.get("display_json") or "{}")
                    if d_json: target["display"].update(d_json)
                except Exception: pass

                try:
                    s_json = json.loads(row.get("signal_rules_json") or "{}")
                    if s_json: target["signal_rules"].update(s_json)
                except Exception: pass

        return list(resolved_map.values())
    except Exception as exc:
        logger.error(f"Error resolving bot effective indicator configs for {bot_id}: {exc}")
        return get_all_indicator_configs()


def get_bot_effective_indicator_config(bot_id: str, indicator_id: str, symbol: Optional[str] = None, timeframe: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Retrieve single effective indicator configuration for a bot."""
    configs = get_bot_effective_indicator_configs(bot_id, symbol, timeframe)
    for c in configs:
        if c.get("indicator_id") == indicator_id or c.get("id") == indicator_id:
            return c
    return get_indicator_config(indicator_id)


def save_bot_indicator_config(
    bot_id: str,
    indicator_id: str,
    cfg_data: Dict[str, Any],
    symbol: str = "",
    timeframe: str = "",
    user_source: str = "Web Dashboard",
    reason: str = ""
) -> Tuple[bool, str]:
    """
    Save or update a per-bot indicator configuration override in bot_indicator_configs.
    Does NOT modify other bots or global defaults.
    """
    try:
        from src.indicator_schema import validate_indicator_parameters, UNIVERSAL_INDICATOR_SCHEMAS

        params = cfg_data.get("parameters") or cfg_data.get("params") or {}
        if not params and cfg_data.get("parameters_json"):
            try: params = json.loads(cfg_data["parameters_json"])
            except Exception: params = {}
        if isinstance(params, str):
            try: params = json.loads(params)
            except Exception: params = {}

        # Validate parameters against indicator schema
        is_valid, err_msg = validate_indicator_parameters(indicator_id, params)
        if not is_valid:
            return False, err_msg

        # Capture old effective config for historical audit diff
        old_cfg = get_bot_effective_indicator_config(bot_id, indicator_id)

        schema = UNIVERSAL_INDICATOR_SCHEMAS.get(indicator_id, {})
        enabled = 1 if cfg_data.get("enabled", True) else 0
        weight = float(cfg_data.get("weight", schema.get("default_weight", 15.0)))
        timeframe_override = str(cfg_data.get("timeframe", cfg_data.get("timeframe_override", "")))
        long_enabled = 1 if cfg_data.get("long_enabled", True) else 0
        short_enabled = 1 if cfg_data.get("short_enabled", True) else 0
        signal_mode = str(cfg_data.get("signal_mode", "both"))
        min_confirmations = int(cfg_data.get("min_confirmations", 1))

        disp_obj = cfg_data.get("display") or schema.get("default_display", {})
        if not disp_obj and cfg_data.get("display_json"):
            try: disp_obj = json.loads(cfg_data["display_json"])
            except Exception: disp_obj = {}

        sig_rules_obj = cfg_data.get("signal_rules") or {}
        if not sig_rules_obj and cfg_data.get("signal_rules_json"):
            try: sig_rules_obj = json.loads(cfg_data["signal_rules_json"])
            except Exception: sig_rules_obj = {}


        now_str = datetime.now(timezone.utc).isoformat()

        with get_db_transaction() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO bot_indicator_configs
                (bot_id, indicator_id, symbol, timeframe, enabled, weight, timeframe_override,
                 long_enabled, short_enabled, signal_mode, min_confirmations,
                 parameters_json, display_json, signal_rules_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(bot_id, indicator_id, symbol, timeframe) DO UPDATE SET
                    enabled = excluded.enabled,
                    weight = excluded.weight,
                    timeframe_override = excluded.timeframe_override,
                    long_enabled = excluded.long_enabled,
                    short_enabled = excluded.short_enabled,
                    signal_mode = excluded.signal_mode,
                    min_confirmations = excluded.min_confirmations,
                    parameters_json = excluded.parameters_json,
                    display_json = excluded.display_json,
                    signal_rules_json = excluded.signal_rules_json,
                    updated_at = excluded.updated_at
                """,
                (
                    bot_id, indicator_id, symbol, timeframe, enabled, weight, timeframe_override,
                    long_enabled, short_enabled, signal_mode, min_confirmations,
                    json.dumps(params), json.dumps(disp_obj), json.dumps(sig_rules_obj), now_str, now_str
                )
            )

        new_cfg = get_bot_effective_indicator_config(bot_id, indicator_id)

        # Record history log
        safe_execute(
            """
            INSERT INTO indicator_config_history 
            (timestamp, indicator_id, bot_id, symbol, timeframe, action, user_source, old_config_json, new_config_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                now_str, indicator_id, bot_id, symbol or "BTC/USDT", timeframe or "15m",
                "BOT_OVERRIDE_SAVE", user_source, json.dumps(old_cfg or {}), json.dumps(new_cfg or {})
            )
        )

        log_bot_activity(
            bot_id, "INDICATOR_CONFIGURED",
            f"Configured indicator '{indicator_id}' for bot {bot_id} (weight: {weight}%, enabled: {bool(enabled)})",
            {"indicator_id": indicator_id, "params": params, "reason": reason}
        )

        return True, indicator_id
    except Exception as exc:
        logger.error(f"Error saving bot indicator config for {bot_id}/{indicator_id}: {exc}")
        return False, str(exc)


def reset_bot_indicator_config(bot_id: str, indicator_id: str) -> bool:
    """Reset a bot's specific override for an indicator, falling back to profile/default."""
    try:
        old_cfg = get_bot_effective_indicator_config(bot_id, indicator_id)
        now_str = datetime.now(timezone.utc).isoformat()

        safe_execute("DELETE FROM bot_indicator_configs WHERE bot_id = ? AND indicator_id = ?", (bot_id, indicator_id))

        new_cfg = get_bot_effective_indicator_config(bot_id, indicator_id)

        safe_execute(
            """
            INSERT INTO indicator_config_history 
            (timestamp, indicator_id, bot_id, symbol, timeframe, action, user_source, old_config_json, new_config_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (now_str, indicator_id, bot_id, "BTC/USDT", "15m", "BOT_OVERRIDE_RESET", "Web Dashboard", json.dumps(old_cfg or {}), json.dumps(new_cfg or {}))
        )

        log_bot_activity(bot_id, "INDICATOR_RESET", f"Reset indicator '{indicator_id}' overrides for bot {bot_id} to profile/default.")
        return True
    except Exception as exc:
        logger.error(f"Error resetting bot indicator config {bot_id}/{indicator_id}: {exc}")
        return False


def reset_all_bot_indicator_configs(bot_id: str) -> bool:
    """Reset ALL indicator overrides for a specific bot to profile/global defaults."""
    try:
        safe_execute("DELETE FROM bot_indicator_configs WHERE bot_id = ?", (bot_id,))
        log_bot_activity(bot_id, "INDICATORS_RESET_ALL", f"Reset all indicator overrides for bot {bot_id}.")
        return True
    except Exception as exc:
        logger.error(f"Error resetting all indicator configs for bot {bot_id}: {exc}")
        return False


def set_bot_indicator_enabled(bot_id: str, indicator_id: str, enabled: bool) -> bool:
    """Set enabled status for an indicator specifically on a given bot."""
    try:
        cfg = get_bot_effective_indicator_config(bot_id, indicator_id) or {}
        cfg["enabled"] = enabled
        ok, _ = save_bot_indicator_config(bot_id, indicator_id, cfg)
        return ok
    except Exception as exc:
        logger.error(f"Error setting bot indicator enabled {bot_id}/{indicator_id}: {exc}")
        return False


def set_all_bot_indicators_enabled(bot_id: str, enabled: bool) -> bool:
    """Set enabled status for ALL indicators specifically on a given bot."""
    try:
        configs = get_bot_effective_indicator_configs(bot_id)
        for c in configs:
            c["enabled"] = enabled
            save_bot_indicator_config(bot_id, c["indicator_id"], c)
        return True
    except Exception as exc:
        logger.error(f"Error setting all bot indicators enabled for {bot_id}: {exc}")
        return False


def copy_bot_indicator_configs(source_bot_id: str, target_bot_id: str) -> bool:
    """Deep-copies all indicator overrides and profile bindings from source_bot to target_bot."""
    try:
        now_str = datetime.now(timezone.utc).isoformat()
        # 1. Copy profile binding
        prof_row = safe_query_one("SELECT profile_id FROM bot_indicator_profiles WHERE bot_id = ?", (source_bot_id,))
        if prof_row:
            safe_execute("INSERT OR REPLACE INTO bot_indicator_profiles (bot_id, profile_id, applied_at) VALUES (?, ?, ?)", (target_bot_id, prof_row["profile_id"], now_str))


        # 2. Copy indicator overrides
        overrides = safe_query("SELECT * FROM bot_indicator_configs WHERE bot_id = ?", (source_bot_id,))
        for row in overrides:
            d = dict(row)
            d.pop("id", None)
            d["bot_id"] = target_bot_id
            d["created_at"] = now_str
            d["updated_at"] = now_str
            save_bot_indicator_config(target_bot_id, d["indicator_id"], d)
        return True
    except Exception as exc:
        logger.error(f"Error copying indicator configs from {source_bot_id} to {target_bot_id}: {exc}")
        return False


def restore_indicator_config_from_history(history_id: int) -> Tuple[bool, str]:
    """Restores an indicator configuration from an indicator_config_history record."""
    try:
        row = safe_query_one("SELECT * FROM indicator_config_history WHERE id = ?", (history_id,))
        if not row:
            return False, "History entry not found"

        bot_id = row.get("bot_id") or "bot-1"
        indicator_id = row.get("indicator_id")
        old_cfg = json.loads(row.get("old_config_json") or "{}")

        if not old_cfg:
            return False, "History record contains empty configuration"

        ok, err = save_bot_indicator_config(bot_id, indicator_id, old_cfg, user_source="History Restore", reason=f"Restored from history ID {history_id}")
        return ok, err
    except Exception as exc:
        logger.error(f"Error restoring indicator config history {history_id}: {exc}")
        return False, str(exc)



def get_indicator_presets() -> List[Dict[str, Any]]:
    """Retrieve list of all saved system and user indicator presets."""
    try:
        seed_indicator_configs_if_needed()
        rows = safe_query("SELECT * FROM indicator_presets ORDER BY is_system DESC, name ASC")
        for r in rows:
            try: r["config"] = json.loads(r.get("config_json") or "{}")
            except Exception: r["config"] = {}
        return rows
    except Exception as exc:
        logger.error(f"Error fetching indicator presets: {exc}")
        return []


def save_indicator_preset(name: str, config_dict: Dict[str, Any], category: str = "General", description: str = "") -> Tuple[bool, str]:
    """Create or update a custom reusable indicator preset."""
    try:
        preset_id = name.lower().strip().replace(" ", "_").replace("/", "_")
        now_str = datetime.now(timezone.utc).isoformat()

        with get_db_transaction() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT preset_id FROM indicator_presets WHERE preset_id = ?", (preset_id,))
            exists = cursor.fetchone()

            if exists:
                cursor.execute(
                    """
                    UPDATE indicator_presets
                    SET name = ?, category = ?, description = ?, config_json = ?, updated_at = ?
                    WHERE preset_id = ?
                    """,
                    (name, category, description, json.dumps(config_dict), now_str, preset_id)
                )
            else:
                cursor.execute(
                    """
                    INSERT INTO indicator_presets (preset_id, name, category, description, config_json, is_system, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, 0, ?, ?)
                    """,
                    (preset_id, name, category, description, json.dumps(config_dict), now_str, now_str)
                )
        return True, preset_id
    except Exception as exc:
        logger.error(f"Error saving indicator preset: {exc}")
        return False, str(exc)


def delete_indicator_preset(preset_id: str) -> Tuple[bool, str]:
    """Delete a user custom preset (system presets protected)."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT is_system FROM indicator_presets WHERE preset_id = ?", (preset_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return False, f"Preset '{preset_id}' not found."
        if bool(row["is_system"]):
            conn.close()
            return False, "Cannot delete default system presets."

        cursor.execute("DELETE FROM indicator_presets WHERE preset_id = ?", (preset_id,))
        conn.commit()
        conn.close()
        return True, preset_id
    except Exception as exc:
        logger.error(f"Error deleting preset: {exc}")
        return False, str(exc)


def apply_indicator_preset(preset_name_or_id: str) -> Tuple[bool, str]:
    """Apply a preset configuration to indicator_configs table."""
    try:
        presets = get_indicator_presets()
        target = None
        for p in presets:
            if p.get("preset_id") == preset_name_or_id or p.get("name").lower() == preset_name_or_id.lower():
                target = p
                break

        if not target:
            # Fallback to schema presets
            from src.indicator_schema import UNIVERSAL_INDICATOR_PRESETS
            for k, v in UNIVERSAL_INDICATOR_PRESETS.items():
                if k.lower() == preset_name_or_id.lower() or k.lower().replace(" ", "_") == preset_name_or_id.lower():
                    target = {"config": v, "name": k}
                    break

        if not target:
            return False, f"Preset '{preset_name_or_id}' not found."

        cfg_obj = target.get("config", {})
        enabled_ids = set(cfg_obj.get("enabled_ids", []))
        weights = cfg_obj.get("weights", {})
        custom_params_map = cfg_obj.get("parameters", {})

        conn = get_connection()
        cursor = conn.cursor()
        now_str = datetime.now(timezone.utc).isoformat()

        all_configs = get_all_indicator_configs()
        for cfg in all_configs:
            ind_id = cfg["indicator_id"]
            is_enabled = ind_id in enabled_ids
            w = float(weights.get(ind_id, cfg.get("weight", 15.0)))
            val_enabled = 1 if is_enabled else 0
            
            # Apply any specific parameter overrides in the preset
            p_json = json.dumps(custom_params_map.get(ind_id, cfg.get("parameters", {})))

            cursor.execute(
                "UPDATE indicator_configs SET enabled = ?, weight = ?, parameters_json = ?, updated_at = ? WHERE indicator_id = ?",
                (val_enabled, w, p_json, now_str, ind_id),
            )

        conn.commit()
        conn.close()
        logger.info(f"Applied universal indicator preset '{target.get('name')}'. Enabled {len(enabled_ids)} indicators.")
        return True, target.get("name", preset_name_or_id)
    except Exception as exc:
        logger.error(f"Error applying indicator preset {preset_name_or_id}: {exc}")
        return False, str(exc)


def bulk_upsert_market_universe(instruments: list[Dict[str, Any]]) -> Tuple[int, int]:
    """Bulk upsert instruments into market_universe table. Returns (inserted_count, updated_count)."""
    inserted = 0
    updated = 0
    if not instruments:
        return inserted, updated

    try:
        conn = get_connection()
        cursor = conn.cursor()
        now_str = datetime.now(timezone.utc).isoformat()

        for inst in instruments:
            iid = inst.get("instrument_id") or inst.get("symbol")
            if not iid:
                continue

            symbol = inst.get("symbol", iid)
            canonical = inst.get("canonical_symbol", symbol)
            display_name = inst.get("display_name", symbol)
            company_name = inst.get("company_name", "")
            asset_class = inst.get("asset_class", "Crypto")
            inst_type = inst.get("instrument_type", "SPOT")
            exchange = inst.get("exchange", "")
            country = inst.get("country", "")
            region = inst.get("region", "")
            sector = inst.get("sector", "")
            base_curr = inst.get("base_currency", "")
            quote_curr = inst.get("quote_currency", "")
            broker_sym = inst.get("broker_symbol", symbol)
            data_prov = inst.get("data_provider", "CCXT")
            exec_prov = inst.get("execution_provider", "")
            inst_token = inst.get("instrument_token", "")
            tick_size = float(inst.get("tick_size", 0.01))
            lot_size = float(inst.get("lot_size", 1.0))
            min_qty = float(inst.get("minimum_quantity", 0.001))
            trading_status = inst.get("trading_status", "ACTIVE")
            data_avail = 1 if inst.get("data_available", True) else 0
            exec_avail = 1 if inst.get("execution_available", False) else 0

            watch_en = 1 if inst.get("watch_enabled", False) else 0
            paper_en = 1 if inst.get("paper_enabled", False) else 0
            strat_en = 1 if inst.get("strategy_enabled", False) else 0
            live_en = 1 if inst.get("live_enabled", False) else 0

            vol_score = float(inst.get("volatility_score", 0.0))
            vol_cat = inst.get("volatility_category", "Medium")
            liq_score = float(inst.get("liquidity_score", 0.0))
            mom_score = float(inst.get("momentum_score", 0.0))
            last_p = float(inst.get("last_price", 0.0))
            last_chg = float(inst.get("last_change", 0.0))
            last_vol = float(inst.get("last_volume", 0.0))

            cursor.execute("SELECT id FROM market_universe WHERE instrument_id = ?", (iid,))
            existing = cursor.fetchone()

            if existing:
                cursor.execute(
                    """
                    UPDATE market_universe
                    SET symbol=?, canonical_symbol=?, display_name=?, company_name=?, asset_class=?,
                        instrument_type=?, exchange=?, country=?, region=?, sector=?, base_currency=?,
                        quote_currency=?, broker_symbol=?, data_provider=?, execution_provider=?,
                        instrument_token=?, tick_size=?, lot_size=?, minimum_quantity=?, trading_status=?,
                        data_available=?, execution_available=?, volatility_score=?, volatility_category=?,
                        liquidity_score=?, momentum_score=?, last_price=?, last_change=?, last_volume=?,
                        last_updated=?
                    WHERE instrument_id=?
                    """,
                    (
                        symbol, canonical, display_name, company_name, asset_class,
                        inst_type, exchange, country, region, sector, base_curr,
                        quote_curr, broker_sym, data_prov, exec_prov,
                        inst_token, tick_size, lot_size, min_qty, trading_status,
                        data_avail, exec_avail, vol_score, vol_cat,
                        liq_score, mom_score, last_p, last_chg, last_vol,
                        now_str, iid
                    )
                )
                updated += 1
            else:
                cursor.execute(
                    """
                    INSERT INTO market_universe
                    (instrument_id, symbol, canonical_symbol, display_name, company_name, asset_class,
                     instrument_type, exchange, country, region, sector, base_currency, quote_currency,
                     broker_symbol, data_provider, execution_provider, instrument_token, tick_size,
                     lot_size, minimum_quantity, trading_status, data_available, execution_available,
                     watch_enabled, paper_enabled, strategy_enabled, live_enabled, volatility_score,
                     volatility_category, liquidity_score, momentum_score, last_price, last_change,
                     last_volume, last_updated, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        iid, symbol, canonical, display_name, company_name, asset_class,
                        inst_type, exchange, country, region, sector, base_curr, quote_curr,
                        broker_sym, data_prov, exec_prov, inst_token, tick_size,
                        lot_size, min_qty, trading_status, data_avail, exec_avail,
                        watch_en, paper_en, strat_en, live_en, vol_score,
                        vol_cat, liq_score, mom_score, last_p, last_chg,
                        last_vol, now_str, now_str
                    )
                )
                inserted += 1

        conn.commit()
        conn.close()
    except Exception as exc:
        logger.error(f"Error during bulk upsert market universe: {exc}")

    return inserted, updated


def get_market_universe(
    asset_class: Optional[str] = None,
    category: Optional[str] = None,
    volatility: Optional[str] = None,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    limit: int = 500,
    offset: int = 0
) -> Dict[str, Any]:
    """Retrieve filtered, searched, and paginated market universe instruments."""
    results = []
    total_count = 0
    try:
        conn = get_connection()
        cursor = conn.cursor()

        query_conditions = ["1=1"]
        params = []

        if asset_class and asset_class.upper() != "ALL":
            query_conditions.append("LOWER(asset_class) = LOWER(?)")
            params.append(asset_class)

        if volatility and volatility.upper() != "ALL":
            query_conditions.append("LOWER(volatility_category) = LOWER(?)")
            params.append(volatility)

        if category and category.upper() not in ["ALL", "ALL STOCKS", "ALL CRYPTO", "ALL FOREX", "ALL INDICES"]:
            cat_upper = category.upper()
            if cat_upper in ["INDIAN STOCKS", "INDIAN INDICES"]:
                query_conditions.append("country = 'IN'")
            elif cat_upper in ["GLOBAL STOCKS", "GLOBAL INDICES"]:
                query_conditions.append("country != 'IN'")
            elif cat_upper in ["MAJOR CRYPTO", "TOP MARKET CAP"]:
                query_conditions.append("asset_class = 'Crypto' AND (symbol LIKE 'BTC%' OR symbol LIKE 'ETH%' OR symbol LIKE 'SOL%' OR symbol LIKE 'BNB%' OR symbol LIKE 'XRP%' OR symbol LIKE 'ADA%' OR symbol LIKE 'AVAX%' OR symbol LIKE 'DOGE%')")
            elif cat_upper in ["HIGH VOLATILITY", "VOLATILE CRYPTO", "VOLATILE FOREX", "VOLATILE INDIAN STOCKS", "VOLATILE GLOBAL STOCKS"]:
                query_conditions.append("volatility_category IN ('High', 'Extreme')")

        if status_filter:
            sf_upper = status_filter.upper()
            if sf_upper == "WATCH":
                query_conditions.append("watch_enabled = 1")
            elif sf_upper == "PAPER":
                query_conditions.append("paper_enabled = 1")
            elif sf_upper == "STRATEGY":
                query_conditions.append("strategy_enabled = 1")
            elif sf_upper == "LIVE":
                query_conditions.append("live_enabled = 1")
            elif sf_upper == "DATA_ONLY":
                query_conditions.append("data_available = 1 AND execution_available = 0")
            elif sf_upper == "AVAILABLE":
                query_conditions.append("execution_available = 1")

        if search and search.strip():
            s = f"%{search.strip().lower()}%"
            query_conditions.append(
                "(LOWER(symbol) LIKE ? OR LOWER(canonical_symbol) LIKE ? OR LOWER(display_name) LIKE ? OR LOWER(company_name) LIKE ? OR LOWER(exchange) LIKE ? OR LOWER(asset_class) LIKE ?)"
            )
            params.extend([s, s, s, s, s, s])

        where_clause = " AND ".join(query_conditions)

        cursor.execute(f"SELECT COUNT(*) as cnt FROM market_universe WHERE {where_clause}", params)
        row_cnt = cursor.fetchone()
        total_count = row_cnt["cnt"] if row_cnt else 0

        fetch_params = params + [limit, offset]
        cursor.execute(
            f"SELECT * FROM market_universe WHERE {where_clause} ORDER BY asset_class ASC, volatility_score DESC, symbol ASC LIMIT ? OFFSET ?",
            fetch_params
        )
        rows = cursor.fetchall()
        for r in rows:
            d = dict(r)
            d["data_available"] = bool(d.get("data_available", 1))
            d["execution_available"] = bool(d.get("execution_available", 0))
            d["watch_enabled"] = bool(d.get("watch_enabled", 0))
            d["paper_enabled"] = bool(d.get("paper_enabled", 0))
            d["strategy_enabled"] = bool(d.get("strategy_enabled", 0))
            d["live_enabled"] = bool(d.get("live_enabled", 0))
            results.append(d)

        conn.close()
    except Exception as exc:
        logger.error(f"Error querying market universe: {exc}")

    return {"instruments": results, "total_count": total_count, "limit": limit, "offset": offset}


def get_market_instrument(identifier: str) -> Optional[Dict[str, Any]]:
    """Retrieve a single instrument by instrument_id, symbol, or canonical_symbol."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM market_universe WHERE instrument_id = ? OR symbol = ? OR canonical_symbol = ?",
            (identifier, identifier, identifier)
        )
        r = cursor.fetchone()
        conn.close()
        if r:
            d = dict(r)
            d["data_available"] = bool(d.get("data_available", 1))
            d["execution_available"] = bool(d.get("execution_available", 0))
            d["watch_enabled"] = bool(d.get("watch_enabled", 0))
            d["paper_enabled"] = bool(d.get("paper_enabled", 0))
            d["strategy_enabled"] = bool(d.get("strategy_enabled", 0))
            d["live_enabled"] = bool(d.get("live_enabled", 0))
            return d
    except Exception as exc:
        logger.error(f"Error fetching instrument {identifier}: {exc}")
    return None


def update_instrument_controls(
    identifier: str,
    watch: Optional[bool] = None,
    paper: Optional[bool] = None,
    strategy: Optional[bool] = None,
    live: Optional[bool] = None
) -> Tuple[bool, str]:
    """Update user activation controls (Watch, Paper, Strategy, Live) for an instrument."""
    try:
        inst = get_market_instrument(identifier)
        if not inst:
            return False, f"Instrument '{identifier}' not found."

        conn = get_connection()
        cursor = conn.cursor()
        now_str = datetime.now(timezone.utc).isoformat()

        w_val = (1 if watch else 0) if watch is not None else (1 if inst["watch_enabled"] else 0)
        p_val = (1 if paper else 0) if paper is not None else (1 if inst["paper_enabled"] else 0)
        s_val = (1 if strategy else 0) if strategy is not None else (1 if inst["strategy_enabled"] else 0)
        l_val = (1 if live else 0) if live is not None else (1 if inst["live_enabled"] else 0)

        cursor.execute(
            """
            UPDATE market_universe
            SET watch_enabled = ?, paper_enabled = ?, strategy_enabled = ?, live_enabled = ?, last_updated = ?
            WHERE instrument_id = ? OR symbol = ?
            """,
            (w_val, p_val, s_val, l_val, now_str, inst["instrument_id"], inst["symbol"])
        )
        conn.commit()
        conn.close()
        logger.info(f"Updated controls for {identifier}: Watch={bool(w_val)}, Paper={bool(p_val)}, Strategy={bool(s_val)}, Live={bool(l_val)}")
        return True, inst["instrument_id"]
    except Exception as exc:
        logger.error(f"Error updating instrument controls for {identifier}: {exc}")
        return False, str(exc)


def get_universe_summary_stats() -> Dict[str, Any]:
    """Returns total counts by asset class, volatility, trading status, and last sync timestamp."""
    stats = {
        "total_instruments": 0,
        "indices_count": 0,
        "indian_stocks_count": 0,
        "global_stocks_count": 0,
        "crypto_count": 0,
        "forex_count": 0,
        "high_volatility_count": 0,
        "live_enabled_count": 0,
        "paper_trading_count": 0,
        "data_only_count": 0,
        "last_sync": "Never"
    }
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) as c FROM market_universe")
        stats["total_instruments"] = cursor.fetchone()["c"]

        cursor.execute("SELECT COUNT(*) as c FROM market_universe WHERE asset_class = 'Indices'")
        stats["indices_count"] = cursor.fetchone()["c"]

        cursor.execute("SELECT COUNT(*) as c FROM market_universe WHERE asset_class = 'Stock' AND country = 'IN'")
        stats["indian_stocks_count"] = cursor.fetchone()["c"]

        cursor.execute("SELECT COUNT(*) as c FROM market_universe WHERE asset_class = 'Stock' AND country != 'IN'")
        stats["global_stocks_count"] = cursor.fetchone()["c"]

        cursor.execute("SELECT COUNT(*) as c FROM market_universe WHERE asset_class = 'Crypto'")
        stats["crypto_count"] = cursor.fetchone()["c"]

        cursor.execute("SELECT COUNT(*) as c FROM market_universe WHERE asset_class = 'Forex'")
        stats["forex_count"] = cursor.fetchone()["c"]

        cursor.execute("SELECT COUNT(*) as c FROM market_universe WHERE volatility_category IN ('High', 'Extreme')")
        stats["high_volatility_count"] = cursor.fetchone()["c"]

        cursor.execute("SELECT COUNT(*) as c FROM market_universe WHERE live_enabled = 1")
        stats["live_enabled_count"] = cursor.fetchone()["c"]

        cursor.execute("SELECT COUNT(*) as c FROM market_universe WHERE paper_enabled = 1")
        stats["paper_trading_count"] = cursor.fetchone()["c"]

        cursor.execute("SELECT COUNT(*) as c FROM market_universe WHERE data_available = 1 AND execution_available = 0")
        stats["data_only_count"] = cursor.fetchone()["c"]

        cursor.execute("SELECT MAX(last_updated) as mx FROM market_universe")
        row_mx = cursor.fetchone()
        if row_mx and row_mx["mx"]:
            stats["last_sync"] = row_mx["mx"]

        conn.close()
    except Exception as exc:
        logger.error(f"Error fetching universe summary stats: {exc}")
    return stats


def get_top_market_opportunities(limit: int = 10) -> list[Dict[str, Any]]:
    """Retrieve top ranked opportunities sorted by strategy & momentum score."""
    opps = []
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT * FROM market_universe
            WHERE trading_status = 'ACTIVE'
            ORDER BY (volatility_score * 0.4 + momentum_score * 0.6) DESC
            LIMIT ?
            """,
            (limit,)
        )
        rows = cursor.fetchall()
        for r in rows:
            d = dict(r)
            d["strategy_score"] = round(float(d.get("momentum_score", 50.0)) * 0.7 + float(d.get("volatility_score", 50.0)) * 0.3, 1)
            opps.append(d)
        conn.close()
    except Exception as exc:
        logger.error(f"Error fetching top market opportunities: {exc}")
    return opps


def batch_update_universe_controls(
    category: str,
    control_name: str,
    enable_val: bool
) -> Tuple[bool, int, str]:
    """
    Executes server-side SQL batch activation/deactivation for market universe categories
    (e.g., 'ALL INDIAN STOCKS', 'ALL CRYPTO', 'ALL FOREX', 'ALL INDICES', 'HIGH VOLATILITY').
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()
        now_str = datetime.now(timezone.utc).isoformat()
        bit_val = 1 if enable_val else 0

        col_map = {
            "watch": "watch_enabled",
            "paper": "paper_enabled",
            "strategy": "strategy_enabled",
            "live": "live_enabled"
        }
        col_name = col_map.get(control_name.lower())
        if not col_name:
            return False, 0, f"Invalid control name '{control_name}'"

        cat_upper = category.upper()
        where_clause = "1=1"

        if cat_upper in ["INDIAN STOCKS", "ALL INDIAN STOCKS"]:
            where_clause = "asset_class = 'Stock' AND country = 'IN'"
        elif cat_upper in ["GLOBAL STOCKS", "ALL GLOBAL STOCKS"]:
            where_clause = "asset_class = 'Stock' AND country != 'IN'"
        elif cat_upper in ["CRYPTO", "ALL CRYPTO"]:
            where_clause = "asset_class = 'Crypto'"
        elif cat_upper in ["FOREX", "ALL FOREX"]:
            where_clause = "asset_class = 'Forex'"
        elif cat_upper in ["INDICES", "ALL INDICES"]:
            where_clause = "asset_class = 'Indices'"
        elif cat_upper in ["HIGH VOLATILITY", "VOLATILE"]:
            where_clause = "volatility_category IN ('High', 'Extreme')"

        if col_name == "live_enabled" and bit_val == 1:
            where_clause += " AND execution_available = 1"

        query = f"UPDATE market_universe SET {col_name} = ?, last_updated = ? WHERE {where_clause}"
        cursor.execute(query, [bit_val, now_str])
        affected = cursor.rowcount
        conn.commit()
        conn.close()

        logger.info(f"Batch updated {affected} instruments in '{category}' -> {col_name}={bit_val}")
        return True, affected, category
    except Exception as exc:
        logger.error(f"Error in batch_update_universe_controls: {exc}")
        return False, 0, str(exc)


# =============================================================================
# UNIVERSAL RISK MANAGEMENT CENTER PERSISTENCE & CRUD
# =============================================================================
DEFAULT_RISK_PROFILES = {
    "conservative": {
        "profile_id": "conservative",
        "name": "Conservative",
        "category": "Capital Preservation",
        "description": "Strict capital preservation mode: 1% risk per trade, 3% max daily loss, low leverage (max 3x), and tight exposure limits.",
        "is_default": 0,
        "is_system": 1,
        "config": {
            "max_risk_per_trade_pct": 1.0,
            "max_risk_per_trade_dollars": 100.0,
            "max_daily_loss_pct": 3.0,
            "max_weekly_loss_pct": 7.0,
            "max_monthly_drawdown_pct": 12.0,
            "max_open_positions": 3,
            "max_positions_per_symbol": 1,
            "max_exposure_per_asset_pct": 15.0,
            "max_exposure_per_sector_pct": 20.0,
            "max_leverage": 3.0,
            "max_margin_usage_pct": 40.0,
            "max_consecutive_losses": 3,
            "max_order_value": 15000.0,
            "consecutive_loss_action": "PAUSE_NEW_TRADES",
            "drawdown_action": "PAUSE_ALL_BOTS",
            "position_sizing_method": "percent_equity",
            "stop_loss_method": "tighter"
        }
    },
    "balanced": {
        "profile_id": "balanced",
        "name": "Balanced",
        "category": "Standard Quantitative",
        "description": "Standard institutional balance: 2% risk per trade, 5% max daily loss, moderate leverage (max 10x), and 5 concurrent positions.",
        "is_default": 1,
        "is_system": 1,
        "config": {
            "max_risk_per_trade_pct": 2.0,
            "max_risk_per_trade_dollars": 200.0,
            "max_daily_loss_pct": 5.0,
            "max_weekly_loss_pct": 12.0,
            "max_monthly_drawdown_pct": 20.0,
            "max_open_positions": 5,
            "max_positions_per_symbol": 2,
            "max_exposure_per_asset_pct": 30.0,
            "max_exposure_per_sector_pct": 35.0,
            "max_leverage": 10.0,
            "max_margin_usage_pct": 65.0,
            "max_consecutive_losses": 4,
            "max_order_value": 50000.0,
            "consecutive_loss_action": "PAUSE_NEW_TRADES",
            "drawdown_action": "PAUSE_ALL_BOTS",
            "position_sizing_method": "percent_equity",
            "stop_loss_method": "tighter"
        }
    },
    "aggressive": {
        "profile_id": "aggressive",
        "name": "Aggressive",
        "category": "High Growth / Scalping",
        "description": "High growth momentum: 3% risk per trade, 10% daily drawdown tolerance, max 20x leverage, and expanded position limits.",
        "is_default": 0,
        "is_system": 1,
        "config": {
            "max_risk_per_trade_pct": 3.0,
            "max_risk_per_trade_dollars": 300.0,
            "max_daily_loss_pct": 10.0,
            "max_weekly_loss_pct": 20.0,
            "max_monthly_drawdown_pct": 35.0,
            "max_open_positions": 8,
            "max_positions_per_symbol": 3,
            "max_exposure_per_asset_pct": 45.0,
            "max_exposure_per_sector_pct": 50.0,
            "max_leverage": 20.0,
            "max_margin_usage_pct": 85.0,
            "max_consecutive_losses": 5,
            "max_order_value": 100000.0,
            "consecutive_loss_action": "PAUSE_STRATEGY",
            "drawdown_action": "PAUSE_ALL_BOTS",
            "position_sizing_method": "percent_equity",
            "stop_loss_method": "atr"
        }
    },
    "crypto_conservative": {
        "profile_id": "crypto_conservative",
        "name": "Crypto Conservative",
        "category": "Crypto Specific",
        "description": "Tailored for digital asset volatility: 1.5% risk per trade, 6% daily loss, 25% single-coin exposure cap, max 5x leverage.",
        "is_default": 0,
        "is_system": 1,
        "config": {
            "max_risk_per_trade_pct": 1.5,
            "max_risk_per_trade_dollars": 150.0,
            "max_daily_loss_pct": 6.0,
            "max_weekly_loss_pct": 15.0,
            "max_monthly_drawdown_pct": 25.0,
            "max_open_positions": 4,
            "max_positions_per_symbol": 1,
            "max_exposure_per_asset_pct": 25.0,
            "max_exposure_per_sector_pct": 40.0,
            "max_leverage": 5.0,
            "max_margin_usage_pct": 60.0,
            "max_consecutive_losses": 3,
            "max_order_value": 40000.0,
            "consecutive_loss_action": "PAUSE_NEW_TRADES",
            "drawdown_action": "PAUSE_ALL_BOTS",
            "position_sizing_method": "atr_based",
            "stop_loss_method": "tighter"
        }
    },
    "futures_conservative": {
        "profile_id": "futures_conservative",
        "name": "Futures Conservative",
        "category": "Derivatives",
        "description": "High margin protection: 1.0% risk per trade, strict liquidation buffers, 50% max margin utilization, max 5x leverage.",
        "is_default": 0,
        "is_system": 1,
        "config": {
            "max_risk_per_trade_pct": 1.0,
            "max_risk_per_trade_dollars": 100.0,
            "max_daily_loss_pct": 4.0,
            "max_weekly_loss_pct": 10.0,
            "max_monthly_drawdown_pct": 18.0,
            "max_open_positions": 3,
            "max_positions_per_symbol": 1,
            "max_exposure_per_asset_pct": 20.0,
            "max_exposure_per_sector_pct": 30.0,
            "max_leverage": 5.0,
            "max_margin_usage_pct": 50.0,
            "max_consecutive_losses": 3,
            "max_order_value": 30000.0,
            "consecutive_loss_action": "PAUSE_NEW_TRADES",
            "drawdown_action": "PAUSE_ALL_BOTS",
            "position_sizing_method": "fixed_risk",
            "stop_loss_method": "tighter"
        }
    },
    "equity_swing": {
        "profile_id": "equity_swing",
        "name": "Equity Swing (₹ / $)",
        "category": "Stocks",
        "description": "Stock delivery and multi-day swing mode: 2% risk, zero leverage (1x Cash Delivery), 20% max per stock, sector cap 30%.",
        "is_default": 0,
        "is_system": 1,
        "config": {
            "max_risk_per_trade_pct": 2.0,
            "max_risk_per_trade_dollars": 200.0,
            "max_daily_loss_pct": 5.0,
            "max_weekly_loss_pct": 10.0,
            "max_monthly_drawdown_pct": 18.0,
            "max_open_positions": 6,
            "max_positions_per_symbol": 1,
            "max_exposure_per_asset_pct": 20.0,
            "max_exposure_per_sector_pct": 30.0,
            "max_leverage": 1.0,
            "max_margin_usage_pct": 95.0,
            "max_consecutive_losses": 4,
            "max_order_value": 50000.0,
            "consecutive_loss_action": "PAUSE_NEW_TRADES",
            "drawdown_action": "PAUSE_ALL_BOTS",
            "position_sizing_method": "percent_equity",
            "stop_loss_method": "atr"
        }
    }
}


def seed_risk_profiles_and_rules_if_needed():
    """Seeds default risk profiles, rules, and global limits into SQLite."""
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # 1. Seed Profiles
        cursor.execute("SELECT COUNT(*) as cnt FROM risk_profiles")
        row = cursor.fetchone()
        count = row["cnt"] if row else 0

        now_str = datetime.now(timezone.utc).isoformat()
        if count == 0:
            for p_id, p_data in DEFAULT_RISK_PROFILES.items():
                cursor.execute(
                    """
                    INSERT OR REPLACE INTO risk_profiles (
                        profile_id, name, category, description, is_default, is_system, config_json, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        p_id, p_data["name"], p_data["category"], p_data["description"],
                        p_data["is_default"], p_data["is_system"], json.dumps(p_data["config"]),
                        now_str, now_str
                    )
                )

        # 2. Seed Default Rules
        cursor.execute("SELECT COUNT(*) as cnt FROM risk_rules")
        r_cnt = cursor.fetchone()["cnt"]
        if r_cnt == 0:
            default_rules = [
                ("rule_drawdown_lock", "Emergency Drawdown Lock", "global", "*", json.dumps({"metric": "daily_drawdown_pct", "operator": ">=", "value": 5.0}), "PAUSE_ALL_BOTS", 1, 100, "Pauses all bots when daily loss hits 5%"),
                ("rule_btc_exp_cap", "BTC Concentration Limit", "symbol", "BTC/USDT", json.dumps({"metric": "symbol_exposure_pct", "operator": ">=", "value": 35.0}), "BLOCK_ORDER", 1, 80, "Blocks new BTC orders if aggregate exposure across all bots exceeds 35%"),
                ("rule_margin_warning", "High Margin Utilization Guard", "global", "*", json.dumps({"metric": "margin_usage_pct", "operator": ">=", "value": 80.0}), "BLOCK_ORDER", 1, 90, "Blocks new leveraged orders when margin usage exceeds 80%"),
                ("rule_loss_streak_pause", "Consecutive Loss Circuit Breaker", "strategy", "*", json.dumps({"metric": "consecutive_losses", "operator": ">=", "value": 3}), "PAUSE_STRATEGY", 1, 75, "Pauses a strategy if it encounters 3 consecutive losing trades")
            ]
            for r_id, r_name, scope, target, cond, act, en, prio, desc in default_rules:
                cursor.execute(
                    """
                    INSERT OR REPLACE INTO risk_rules (
                        rule_id, name, scope, target, condition_json, action, is_enabled, priority, description, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (r_id, r_name, scope, target, cond, act, en, prio, desc, now_str, now_str)
                )

        # 3. Seed Default Active Limits
        cursor.execute("SELECT COUNT(*) as cnt FROM risk_limits WHERE key = 'active_limits'")
        if cursor.fetchone()["cnt"] == 0:
            cursor.execute(
                """
                INSERT OR REPLACE INTO risk_limits (key, value_json, updated_at)
                VALUES ('active_limits', ?, ?)
                """,
                (json.dumps(DEFAULT_RISK_PROFILES["balanced"]["config"]), now_str)
            )

        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Error seeding risk profiles/rules: {e}")


def get_all_risk_profiles() -> List[Dict[str, Any]]:
    """Fetches all risk profiles from the database."""
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM risk_profiles ORDER BY is_default DESC, is_system DESC, name ASC")
        rows = cursor.fetchall()
        conn.close()

        profiles = []
        for r in rows:
            profiles.append({
                "profile_id": r["profile_id"],
                "name": r["name"],
                "category": r["category"],
                "description": r["description"],
                "is_default": bool(r["is_default"]),
                "is_system": bool(r["is_system"]),
                "config": json.loads(r["config_json"]) if r["config_json"] else {},
                "created_at": r["created_at"],
                "updated_at": r["updated_at"]
            })
        return profiles
    except Exception as e:
        logger.error(f"Error fetching risk profiles: {e}")
        return list(DEFAULT_RISK_PROFILES.values())


def get_risk_profile(profile_id: str) -> Optional[Dict[str, Any]]:
    """Fetches single risk profile by ID."""
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM risk_profiles WHERE profile_id = ?", (profile_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        return {
            "profile_id": row["profile_id"],
            "name": row["name"],
            "category": row["category"],
            "description": row["description"],
            "is_default": bool(row["is_default"]),
            "is_system": bool(row["is_system"]),
            "config": json.loads(row["config_json"]) if row["config_json"] else {},
            "created_at": row["created_at"],
            "updated_at": row["updated_at"]
        }
    except Exception as e:
        logger.error(f"Error fetching profile {profile_id}: {e}")
        return None


def save_risk_profile(data: Dict[str, Any]) -> Tuple[bool, str]:
    """Creates or updates a risk profile in SQLite."""
    try:
        p_id = data.get("profile_id") or data.get("name", "").lower().replace(" ", "_")
        name = data.get("name", "Custom Profile")
        category = data.get("category", "Custom")
        description = data.get("description", "")
        is_def = 1 if data.get("is_default") else 0
        cfg = data.get("config", {})

        now_str = datetime.now(timezone.utc).isoformat()
        conn = get_connection()
        cursor = conn.cursor()

        if is_def == 1:
            cursor.execute("UPDATE risk_profiles SET is_default = 0")

        cursor.execute(
            """
            INSERT OR REPLACE INTO risk_profiles (
                profile_id, name, category, description, is_default, is_system, config_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)
            """,
            (p_id, name, category, description, is_def, json.dumps(cfg), now_str, now_str)
        )
        conn.commit()
        conn.close()
        return True, p_id
    except Exception as e:
        logger.error(f"Error saving risk profile: {e}")
        return False, str(e)


def delete_risk_profile(profile_id: str) -> Tuple[bool, str]:
    """Deletes custom risk profile (system profiles protected)."""
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT is_system FROM risk_profiles WHERE profile_id = ?", (profile_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return False, "Profile not found"
        if row["is_system"] == 1:
            conn.close()
            return False, "System profiles cannot be deleted"

        cursor.execute("DELETE FROM risk_profiles WHERE profile_id = ?", (profile_id,))
        conn.commit()
        conn.close()
        return True, profile_id
    except Exception as e:
        logger.error(f"Error deleting profile {profile_id}: {e}")
        return False, str(e)


def set_default_risk_profile(profile_id: str) -> Tuple[bool, str]:
    """Marks chosen profile as default and synchronizes active limits."""
    try:
        p = get_risk_profile(profile_id)
        if not p:
            return False, "Profile not found"

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE risk_profiles SET is_default = 0")
        cursor.execute("UPDATE risk_profiles SET is_default = 1 WHERE profile_id = ?", (profile_id,))

        now_str = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            "INSERT OR REPLACE INTO risk_limits (key, value_json, updated_at) VALUES ('active_limits', ?, ?)",
            (json.dumps(p["config"]), now_str)
        )
        conn.commit()
        conn.close()
        return True, profile_id
    except Exception as e:
        logger.error(f"Error setting default profile {profile_id}: {e}")
        return False, str(e)


def get_all_risk_rules() -> List[Dict[str, Any]]:
    """Fetches all visual risk rules."""
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM risk_rules ORDER BY priority DESC, created_at DESC")
        rows = cursor.fetchall()
        conn.close()

        rules = []
        for r in rows:
            rules.append({
                "rule_id": r["rule_id"],
                "name": r["name"],
                "scope": r["scope"],
                "target": r["target"],
                "condition": json.loads(r["condition_json"]) if r["condition_json"] else {},
                "action": r["action"],
                "is_enabled": bool(r["is_enabled"]),
                "priority": r["priority"],
                "description": r["description"],
                "created_at": r["created_at"],
                "updated_at": r["updated_at"]
            })
        return rules
    except Exception as e:
        logger.error(f"Error fetching risk rules: {e}")
        return []


def save_risk_rule(data: Dict[str, Any]) -> Tuple[bool, str]:
    """Saves or updates visual risk rule in SQLite."""
    try:
        r_id = data.get("rule_id") or f"rule_{uuid.uuid4().hex[:8]}"
        name = data.get("name", "Custom Rule")
        scope = data.get("scope", "global")
        target = data.get("target", "*")
        condition = data.get("condition", {})
        action = data.get("action", "BLOCK_ORDER")
        is_en = 1 if data.get("is_enabled", True) else 0
        prio = int(data.get("priority", 10))
        desc = data.get("description", "")

        now_str = datetime.now(timezone.utc).isoformat()
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT OR REPLACE INTO risk_rules (
                rule_id, name, scope, target, condition_json, action, is_enabled, priority, description, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (r_id, name, scope, target, json.dumps(condition), action, is_en, prio, desc, now_str, now_str)
        )
        conn.commit()
        conn.close()
        return True, r_id
    except Exception as e:
        logger.error(f"Error saving risk rule: {e}")
        return False, str(e)


def delete_risk_rule(rule_id: str) -> Tuple[bool, str]:
    """Deletes a risk rule."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM risk_rules WHERE rule_id = ?", (rule_id,))
        conn.commit()
        conn.close()
        return True, rule_id
    except Exception as e:
        logger.error(f"Error deleting risk rule {rule_id}: {e}")
        return False, str(e)


def toggle_risk_rule(rule_id: str, enabled: bool) -> Tuple[bool, bool]:
    """Toggles enabled state of a risk rule."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE risk_rules SET is_enabled = ? WHERE rule_id = ?", (1 if enabled else 0, rule_id))
        conn.commit()
        conn.close()
        return True, enabled
    except Exception as e:
        logger.error(f"Error toggling risk rule {rule_id}: {e}")
        return False, enabled


def get_active_risk_limits() -> Dict[str, Any]:
    """Returns the authoritative active risk limits."""
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT value_json FROM risk_limits WHERE key = 'active_limits'")
        row = cursor.fetchone()
        conn.close()
        if row and row["value_json"]:
            return json.loads(row["value_json"])
        return DEFAULT_RISK_PROFILES["balanced"]["config"]
    except Exception as e:
        logger.error(f"Error fetching active risk limits: {e}")
        return DEFAULT_RISK_PROFILES["balanced"]["config"]


def save_active_risk_limits(limits_dict: Dict[str, Any]) -> bool:
    """Updates active risk limits in SQLite."""
    try:
        now_str = datetime.now(timezone.utc).isoformat()
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR REPLACE INTO risk_limits (key, value_json, updated_at) VALUES ('active_limits', ?, ?)",
            (json.dumps(limits_dict), now_str)
        )
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        logger.error(f"Error saving active risk limits: {e}")
        return False


def log_risk_event(
    event_type: str,
    message: str,
    severity: str = "WARNING",
    symbol: str = "BTC/USDT",
    bot_id: str = "bot-1",
    details: Optional[Dict[str, Any]] = None
) -> bool:
    """Logs real-time risk events to the database and global audit queue."""
    try:
        now_str = datetime.now(timezone.utc).isoformat()
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO risk_events (
                timestamp, event_type, severity, symbol, bot_id, message, details_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (now_str, event_type, severity, symbol, bot_id, message, json.dumps(details or {}))
        )
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        logger.error(f"Error logging risk event: {e}")
        return False


def get_risk_events(limit: int = 50, event_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """Queries risk events history."""
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        if event_type:
            cursor.execute("SELECT * FROM risk_events WHERE event_type = ? ORDER BY id DESC LIMIT ?", (event_type, limit))
        else:
            cursor.execute("SELECT * FROM risk_events ORDER BY id DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()
        conn.close()

        events = []
        for r in rows:
            events.append({
                "id": r["id"],
                "timestamp": r["timestamp"],
                "event_type": r["event_type"],
                "severity": r["severity"],
                "symbol": r["symbol"],
                "bot_id": r["bot_id"],
                "message": r["message"],
                "details": json.loads(r["details_json"]) if r["details_json"] else {}
            })
        return events
    except Exception as e:
        logger.error(f"Error fetching risk events: {e}")
        return []


# =============================================================================
# BOT CONTROL CENTER PERSISTENCE & DATA SERVICES
# =============================================================================

DEFAULT_BOT_TEMPLATES = [
    {
        "template_id": "tpl_btc_trend_master",
        "name": "Alpha BTC Trend Master",
        "category": "Trend Following",
        "asset_class": "CRYPTO",
        "symbol": "BTC/USDT",
        "timeframe": "15m",
        "strategy": "Trend Following",
        "description": "Multi-indicator confluence trend breakout using EMA ribbon, MACD momentum, and Volume Profile value areas.",
        "config": {
            "execution_mode": "PAPER",
            "allocated_capital": 10000.0,
            "required_confidence": 75.0,
            "risk_per_trade_pct": 2.0,
            "take_profit_rr": 2.0,
            "indicators": ["ema", "macd", "vp", "supertrend"]
        }
    },
    {
        "template_id": "tpl_eth_scalper_pro",
        "name": "ETH Quick Scalper Pro",
        "category": "Scalping",
        "asset_class": "CRYPTO",
        "symbol": "ETH/USDT",
        "timeframe": "5m",
        "strategy": "Scalping",
        "description": "High-frequency mean-reversion and micro-momentum scalper with tight stop losses.",
        "config": {
            "execution_mode": "PAPER",
            "allocated_capital": 5000.0,
            "required_confidence": 78.0,
            "risk_per_trade_pct": 1.5,
            "take_profit_rr": 1.5,
            "indicators": ["rsi", "bollinger", "stochastic", "vwap"]
        }
    },
    {
        "template_id": "tpl_sol_breakout",
        "name": "Solana High-Vol Hunter",
        "category": "Volatility Breakout",
        "asset_class": "CRYPTO",
        "symbol": "SOL/USDT",
        "timeframe": "15m",
        "strategy": "Volatility",
        "description": "Catches high-volatility momentum surges when ADX indicates a strong trending regime.",
        "config": {
            "execution_mode": "PAPER",
            "allocated_capital": 5000.0,
            "required_confidence": 75.0,
            "risk_per_trade_pct": 2.0,
            "take_profit_rr": 2.5,
            "indicators": ["adx", "supertrend", "atr", "volume"]
        }
    },
    {
        "template_id": "tpl_nifty_intraday",
        "name": "Nifty 50 Momentum Core",
        "category": "Intraday",
        "asset_class": "INDIAN_STOCKS",
        "symbol": "NIFTY50",
        "timeframe": "15m",
        "strategy": "Intraday",
        "description": "Intraday trend filter with dynamic VWAP support/resistance and Floor Pivots.",
        "config": {
            "execution_mode": "PAPER",
            "allocated_capital": 200000.0,
            "required_confidence": 75.0,
            "risk_per_trade_pct": 1.0,
            "take_profit_rr": 2.0,
            "indicators": ["ema", "vwap", "supertrend", "pivots"]
        }
    },
    {
        "template_id": "tpl_aapl_swing",
        "name": "Apple Global Equity Swing",
        "category": "Swing",
        "asset_class": "GLOBAL_STOCKS",
        "symbol": "AAPL",
        "timeframe": "1h",
        "strategy": "Swing",
        "description": "1-Hour swing momentum tracking institutionally significant auto Fibonacci levels.",
        "config": {
            "execution_mode": "PAPER",
            "allocated_capital": 10000.0,
            "required_confidence": 75.0,
            "risk_per_trade_pct": 1.5,
            "take_profit_rr": 3.0,
            "indicators": ["macd", "rsi", "bollinger", "auto_fib"]
        }
    },
    {
        "template_id": "tpl_mean_reversion_master",
        "name": "Multi-Asset Mean Reversion",
        "category": "Mean Reversion",
        "asset_class": "CRYPTO",
        "symbol": "BTC/USDT",
        "timeframe": "15m",
        "strategy": "Mean Reversion",
        "description": "Capitalizes on price overextensions beyond Bollinger 2.0 standard deviations.",
        "config": {
            "execution_mode": "PAPER",
            "allocated_capital": 10000.0,
            "required_confidence": 75.0,
            "risk_per_trade_pct": 1.5,
            "take_profit_rr": 1.8,
            "indicators": ["bollinger", "rsi", "keltner", "cci"]
        }
    }
]

DEFAULT_BOT_GROUPS = [
    {
        "group_id": "grp_crypto_core",
        "name": "Crypto Scalping Bots",
        "description": "Core high-frequency crypto trading algorithms and automated scalpers.",
        "color": "#f7931a"
    },
    {
        "group_id": "grp_equity_swing",
        "name": "Equities & Global Indices",
        "description": "Intraday and swing trading bots for Indian & US stocks and index futures.",
        "color": "#00b4d8"
    },
    {
        "group_id": "grp_sandbox_test",
        "name": "Experimental Sandbox",
        "description": "Testing new indicator combinations and confluence regimes safely in paper mode.",
        "color": "#9b59b6"
    }
]


def seed_bot_templates_and_groups_if_needed() -> None:
    """Seeds pre-configured bot templates and logical bot groups if tables are empty."""
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # 1. Seed Templates
        cursor.execute("SELECT COUNT(*) as cnt FROM bot_templates")
        if cursor.fetchone()["cnt"] == 0:
            now_str = datetime.now(timezone.utc).isoformat()
            for tpl in DEFAULT_BOT_TEMPLATES:
                cursor.execute(
                    """
                    INSERT INTO bot_templates (
                        template_id, name, category, asset_class, symbol, timeframe, strategy,
                        description, config_json, is_active, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                    """,
                    (
                        tpl["template_id"], tpl["name"], tpl["category"], tpl["asset_class"],
                        tpl["symbol"], tpl["timeframe"], tpl["strategy"], tpl["description"],
                        json.dumps(tpl["config"]), now_str, now_str
                    )
                )

        # 2. Seed Groups
        cursor.execute("SELECT COUNT(*) as cnt FROM bot_groups")
        if cursor.fetchone()["cnt"] == 0:
            now_str = datetime.now(timezone.utc).isoformat()
            for grp in DEFAULT_BOT_GROUPS:
                cursor.execute(
                    """
                    INSERT OR IGNORE INTO bot_groups (
                        group_id, name, description, color, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (grp["group_id"], grp["name"], grp["description"], grp["color"], now_str, now_str)
                )

        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Error seeding bot templates and groups: {e}")


def get_all_bot_templates() -> List[Dict[str, Any]]:
    """Fetches all active bot templates."""
    try:
        seed_bot_templates_and_groups_if_needed()
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM bot_templates WHERE is_active = 1 ORDER BY created_at ASC")
        rows = cursor.fetchall()
        conn.close()

        templates = []
        for r in rows:
            cfg = {}
            if r["config_json"]:
                try:
                    cfg = json.loads(r["config_json"])
                except Exception:
                    cfg = {}
            templates.append({
                "template_id": r["template_id"],
                "name": r["name"],
                "category": r["category"],
                "asset_class": r["asset_class"],
                "symbol": r["symbol"],
                "timeframe": r["timeframe"],
                "strategy": r["strategy"],
                "description": r["description"],
                "config": cfg,
                "created_at": r["created_at"],
                "updated_at": r["updated_at"]
            })
        return templates
    except Exception as e:
        logger.error(f"Error fetching bot templates: {e}")
        return []


def get_bot_template(template_id: str) -> Optional[Dict[str, Any]]:
    """Fetches single bot template by ID."""
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM bot_templates WHERE template_id = ?", (template_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        cfg = {}
        if row["config_json"]:
            try:
                cfg = json.loads(row["config_json"])
            except Exception:
                cfg = {}
        return {
            "template_id": row["template_id"],
            "name": row["name"],
            "category": row["category"],
            "asset_class": row["asset_class"],
            "symbol": row["symbol"],
            "timeframe": row["timeframe"],
            "strategy": row["strategy"],
            "description": row["description"],
            "config": cfg,
            "created_at": row["created_at"],
            "updated_at": row["updated_at"]
        }
    except Exception as e:
        logger.error(f"Error fetching bot template {template_id}: {e}")
        return None


def save_bot_template(data: Dict[str, Any]) -> Tuple[bool, str]:
    """Creates or updates a bot template."""
    try:
        template_id = data.get("template_id") or f"tpl_{uuid.uuid4().hex[:8]}"
        name = data.get("name", "").strip()
        if not name:
            return False, "Template name is required."

        category = data.get("category", "General")
        asset_class = data.get("asset_class", "CRYPTO")
        symbol = data.get("symbol", "BTC/USDT").upper()
        timeframe = data.get("timeframe", "15m")
        strategy = data.get("strategy", "Trend Following")
        description = data.get("description", "")
        config_data = data.get("config", {})
        now_str = datetime.now(timezone.utc).isoformat()

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO bot_templates (
                template_id, name, category, asset_class, symbol, timeframe, strategy,
                description, config_json, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
            ON CONFLICT(template_id) DO UPDATE SET
                name = excluded.name,
                category = excluded.category,
                asset_class = excluded.asset_class,
                symbol = excluded.symbol,
                timeframe = excluded.timeframe,
                strategy = excluded.strategy,
                description = excluded.description,
                config_json = excluded.config_json,
                updated_at = excluded.updated_at
            """,
            (template_id, name, category, asset_class, symbol, timeframe, strategy,
             description, json.dumps(config_data), now_str, now_str)
        )
        conn.commit()
        conn.close()
        return True, template_id
    except Exception as e:
        logger.error(f"Error saving bot template: {e}")
        return False, str(e)


def delete_bot_template(template_id: str) -> Tuple[bool, str]:
    """Deletes a bot template."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM bot_templates WHERE template_id = ?", (template_id,))
        conn.commit()
        conn.close()
        return True, template_id
    except Exception as e:
        logger.error(f"Error deleting bot template {template_id}: {e}")
        return False, str(e)


def get_all_bot_groups() -> List[Dict[str, Any]]:
    """Fetches all bot groups with member bots count and aggregate statuses."""
    try:
        seed_bot_templates_and_groups_if_needed()
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM bot_groups ORDER BY name ASC")
        groups = [dict(r) for r in cursor.fetchall()]

        # Query bot counts per group
        cursor.execute(
            """
            SELECT group_name, status, COUNT(*) as cnt
            FROM bot_instances
            WHERE COALESCE(is_deleted, 0) = 0
            GROUP BY group_name, status
            """
        )
        status_rows = cursor.fetchall()
        conn.close()

        group_map = {}
        for g in groups:
            group_map[g["name"]] = {
                "group_id": g["group_id"],
                "name": g["name"],
                "description": g["description"] or "",
                "color": g["color"] or "#00b4d8",
                "total_bots": 0,
                "running_bots": 0,
                "paused_bots": 0,
                "stopped_bots": 0,
                "created_at": g["created_at"]
            }

        for sr in status_rows:
            g_name = sr["group_name"]
            if g_name in group_map:
                st = sr["status"].upper()
                c = sr["cnt"]
                group_map[g_name]["total_bots"] += c
                if st == "RUNNING":
                    group_map[g_name]["running_bots"] += c
                elif st == "PAUSED":
                    group_map[g_name]["paused_bots"] += c
                else:
                    group_map[g_name]["stopped_bots"] += c

        return list(group_map.values())
    except Exception as e:
        logger.error(f"Error fetching bot groups: {e}")
        return []


def save_bot_group(data: Dict[str, Any]) -> Tuple[bool, str]:
    """Creates or updates a bot group."""
    try:
        name = data.get("name", "").strip()
        if not name:
            return False, "Group name is required."

        group_id = data.get("group_id") or f"grp_{uuid.uuid4().hex[:8]}"
        description = data.get("description", "")
        color = data.get("color", "#00b4d8")
        now_str = datetime.now(timezone.utc).isoformat()

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO bot_groups (group_id, name, description, color, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET
                description = excluded.description,
                color = excluded.color,
                updated_at = excluded.updated_at
            """,
            (group_id, name, description, color, now_str, now_str)
        )
        conn.commit()
        conn.close()
        return True, name
    except Exception as e:
        logger.error(f"Error saving bot group: {e}")
        return False, str(e)


def delete_bot_group(group_id_or_name: str) -> Tuple[bool, str]:
    """Deletes a bot group and resets bot assignments to 'Unassigned'."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM bot_groups WHERE group_id = ? OR name = ?", (group_id_or_name, group_id_or_name))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return False, "Group not found."
        
        g_name = row["name"]
        cursor.execute("DELETE FROM bot_groups WHERE name = ?", (g_name,))
        cursor.execute("UPDATE bot_instances SET group_name = 'Crypto Scalping Bots' WHERE group_name = ?", (g_name,))
        conn.commit()
        conn.close()
        return True, g_name
    except Exception as e:
        logger.error(f"Error deleting bot group: {e}")
        return False, str(e)


def get_paper_portfolio_overview() -> Dict[str, Any]:
    """Calculates comprehensive paper trading account metrics."""
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Query all paper trades
        cursor.execute("SELECT * FROM trades_log WHERE execution_mode = 'PAPER' OR execution_mode IS NULL")
        trades = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM bot_instances WHERE execution_mode = 'PAPER' AND COALESCE(is_deleted, 0) = 0")
        paper_bots = [dict(r) for r in cursor.fetchall()]
        conn.close()

        base_balance = 10000.0
        realized_pnl = sum(float(t.get("result_pnl") or 0.0) for t in trades if t.get("status") == "CLOSED")
        
        open_trades = [t for t in trades if t.get("status") == "OPEN"]
        unrealized_pnl = sum(float(t.get("unrealized_pnl") or 0.0) for t in open_trades)
        used_capital = sum(float(t.get("position_size") or 0.0) * float(t.get("entry_price") or 0.0) for t in open_trades)
        margin_used = sum(float(t.get("position_size") or 0.0) * float(t.get("entry_price") or 0.0) / max(1.0, float(t.get("leverage") or 1.0)) for t in open_trades)

        current_equity = base_balance + realized_pnl + unrealized_pnl
        available_balance = max(0.0, current_equity - margin_used)

        total_closed = sum(1 for t in trades if t.get("status") == "CLOSED")
        win_count = sum(1 for t in trades if t.get("status") == "CLOSED" and float(t.get("result_pnl") or 0.0) > 0)
        win_rate = (win_count / total_closed * 100.0) if total_closed > 0 else 0.0

        return {
            "status": "success",
            "balance": round(base_balance + realized_pnl, 2),
            "equity": round(current_equity, 2),
            "available_balance": round(available_balance, 2),
            "margin_used": round(margin_used, 2),
            "used_capital": round(used_capital, 2),
            "realized_pnl": round(realized_pnl, 2),
            "unrealized_pnl": round(unrealized_pnl, 2),
            "open_positions_count": len(open_trades),
            "total_trades_count": len(trades),
            "win_rate_pct": round(win_rate, 1),
            "paper_bots_count": len(paper_bots),
            "open_positions": open_trades,
            "recent_trades": trades[-10:] if len(trades) > 10 else trades
        }
    except Exception as e:
        logger.error(f"Error calculating paper portfolio overview: {e}")
        return {
            "status": "error",
            "message": str(e),
            "balance": 10000.0,
            "equity": 10000.0,
            "available_balance": 10000.0,
            "margin_used": 0.0,
            "used_capital": 0.0,
            "realized_pnl": 0.0,
            "unrealized_pnl": 0.0,
            "open_positions_count": 0,
            "total_trades_count": 0,
            "win_rate_pct": 0.0,
            "paper_bots_count": 0,
            "open_positions": [],
            "recent_trades": []
        }


def reset_paper_sandbox() -> Tuple[bool, str]:
    """Resets paper trading history cleanly while preserving bot definitions."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM trades_log WHERE execution_mode = 'PAPER' OR execution_mode IS NULL")
        cursor.execute("UPDATE bot_instances SET current_equity = allocated_capital, realized_pnl = 0.0, unrealized_pnl = 0.0, trade_count = 0 WHERE execution_mode = 'PAPER'")
        conn.commit()
        conn.close()

        log_standard_bot_event(
            event_type="PAPER_SANDBOX_RESET",
            bot_id="ALL",
            message="Paper trading sandbox reset to initial balance ($10,000.00).",
            severity="WARNING",
            strategy_id="SYSTEM",
            symbol="ALL",
            metadata={"reset_balance": 10000.0}
        )
        return True, "Paper trading sandbox reset successfully."
    except Exception as e:
        logger.error(f"Error resetting paper sandbox: {e}")
        return False, str(e)


def log_standard_bot_event(
    event_type: str,
    bot_id: str = "bot-1",
    message: str = "",
    severity: str = "INFO",
    strategy_id: str = "EMA_MACD_VP",
    symbol: str = "BTC/USDT",
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Logs standard format event to bot_event_audit and bot_activity_logs."""
    event_id = f"evt_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"
    now_utc = datetime.now(timezone.utc).isoformat()
    meta = metadata or {}

    event_payload = {
        "event_id": event_id,
        "timestamp": now_utc,
        "timestamp_utc": now_utc,
        "event_type": event_type,
        "severity": severity,
        "bot_id": bot_id,
        "bot_instance_id": bot_id,
        "strategy_id": strategy_id,
        "symbol": symbol,
        "message": message,
        "metadata": meta
    }

    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO bot_event_audit (
                event_id, timestamp_utc, local_timestamp, bot_instance_id, bot_instance_name,
                symbol, event_type, severity, status, message, strategy_name, metadata_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SUCCESS', ?, ?, ?, ?)
            """,
            (
                event_id, now_utc, now_utc, bot_id, bot_id, symbol,
                event_type, severity, message, strategy_id, json.dumps(meta), now_utc
            )
        )
        cursor.execute(
            """
            INSERT INTO bot_activity_logs (timestamp, bot_id, event_type, activity_type, message, details_json)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (now_utc, bot_id, event_type, event_type, message, json.dumps(meta))
        )
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Error inserting standard bot event: {e}")

    return event_payload


# =============================================================
# MARKET UNIVERSE 2.0 DATABASE OPERATIONS & HELPERS
# =============================================================

def bulk_upsert_instruments(instruments_list: List[Dict[str, Any]]) -> Tuple[int, int]:
    """Bulk upserts canonical instrument records into instruments table without deleting historical records."""
    if not instruments_list:
        return 0, 0

    inserted = 0
    updated = 0
    now_utc = datetime.now(timezone.utc).isoformat()

    conn = get_connection()
    cursor = conn.cursor()

    for inst in instruments_list:
        inst_id = inst.get("instrument_id")
        if not inst_id:
            continue

        cursor.execute("SELECT instrument_id FROM instruments WHERE instrument_id = ?", (inst_id,))
        exists = cursor.fetchone()

        broker_mappings = inst.get("broker_symbol_mappings")
        if isinstance(broker_mappings, dict):
            broker_mappings_str = json.dumps(broker_mappings)
        elif isinstance(broker_mappings, str):
            broker_mappings_str = broker_mappings
        else:
            broker_mappings_str = "{}"

        if exists:
            cursor.execute(
                """
                UPDATE instruments SET
                    provider_symbol = ?,
                    canonical_symbol = ?,
                    display_symbol = ?,
                    company_name = ?,
                    exchange = ?,
                    mic = ?,
                    country = ?,
                    currency = ?,
                    asset_class = ?,
                    instrument_type = ?,
                    underlying_id = ?,
                    underlying_symbol = ?,
                    series = ?,
                    isin = ?,
                    lot_size = ?,
                    tick_size = ?,
                    contract_size = ?,
                    price_multiplier = ?,
                    expiry = ?,
                    option_type = ?,
                    strike = ?,
                    segment = ?,
                    market_status = ?,
                    tradability = ?,
                    data_status = ?,
                    data_source = ?,
                    broker_symbol_mappings = ?,
                    contract_status = ?,
                    paper_enabled = ?,
                    live_enabled = ?,
                    strategy_enabled = ?,
                    last_price = ?,
                    change_24h = ?,
                    volume_24h = ?,
                    open_interest = ?,
                    oi_change = ?,
                    implied_volatility = ?,
                    delta = ?,
                    gamma = ?,
                    theta = ?,
                    vega = ?,
                    volatility_score = ?,
                    volatility_category = ?,
                    momentum_score = ?,
                    directional_bias = ?,
                    is_swing_candidate = ?,
                    is_scalping_candidate = ?,
                    is_hedge_candidate = ?,
                    updated_at = ?
                WHERE instrument_id = ?
                """,
                (
                    inst.get("provider_symbol") or inst.get("symbol", ""),
                    inst.get("canonical_symbol") or inst.get("symbol", ""),
                    inst.get("display_symbol") or inst.get("display_name", ""),
                    inst.get("company_name", ""),
                    inst.get("exchange", "GLOBAL"),
                    inst.get("mic", ""),
                    inst.get("country", "GLOBAL"),
                    inst.get("currency") or inst.get("quote_currency", "USD"),
                    inst.get("asset_class", "INDIAN_STOCKS"),
                    inst.get("instrument_type", "EQUITY"),
                    inst.get("underlying_id", ""),
                    inst.get("underlying_symbol", ""),
                    inst.get("series", "EQ"),
                    inst.get("isin", ""),
                    float(inst.get("lot_size", 1.0)),
                    float(inst.get("tick_size", 0.05)),
                    float(inst.get("contract_size", 1.0)),
                    float(inst.get("price_multiplier", 1.0)),
                    inst.get("expiry", ""),
                    inst.get("option_type", "NONE"),
                    float(inst.get("strike", 0.0)),
                    inst.get("segment", "CASH"),
                    inst.get("market_status", "OPEN"),
                    inst.get("tradability", "TRADABLE"),
                    inst.get("data_status", "LIVE"),
                    inst.get("data_source", "SYSTEM"),
                    broker_mappings_str,
                    inst.get("contract_status", "ACTIVE"),
                    int(inst.get("paper_enabled", 1)),
                    int(inst.get("live_enabled", 0)),
                    int(inst.get("strategy_enabled", 1)),
                    float(inst.get("last_price", 0.0)),
                    float(inst.get("change_24h", inst.get("change_pct", 0.0))),
                    float(inst.get("volume_24h", inst.get("volume", 0.0))),
                    float(inst.get("open_interest", 0.0)),
                    float(inst.get("oi_change", 0.0)),
                    float(inst.get("implied_volatility", 0.0)),
                    float(inst.get("delta", 0.0)),
                    float(inst.get("gamma", 0.0)),
                    float(inst.get("theta", 0.0)),
                    float(inst.get("vega", 0.0)),
                    float(inst.get("volatility_score", 50.0)),
                    inst.get("volatility_category", "Medium"),
                    float(inst.get("momentum_score", 50.0)),
                    inst.get("directional_bias", "NEUTRAL"),
                    int(inst.get("is_swing_candidate", 0)),
                    int(inst.get("is_scalping_candidate", 0)),
                    int(inst.get("is_hedge_candidate", 0)),
                    now_utc,
                    inst_id
                )
            )
            updated += 1
        else:
            cursor.execute(
                """
                INSERT INTO instruments (
                    instrument_id, provider_symbol, canonical_symbol, display_symbol, company_name,
                    exchange, mic, country, currency, asset_class, instrument_type, underlying_id,
                    underlying_symbol, series, isin, lot_size, tick_size, contract_size, price_multiplier,
                    expiry, option_type, strike, segment, market_status, tradability, data_status,
                    data_source, broker_symbol_mappings, contract_status, paper_enabled, live_enabled,
                    strategy_enabled, last_price, change_24h, volume_24h, open_interest, oi_change,
                    implied_volatility, delta, gamma, theta, vega, volatility_score, volatility_category,
                    momentum_score, directional_bias, is_swing_candidate, is_scalping_candidate,
                    is_hedge_candidate, created_at, updated_at, active_from, active_to
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                )
                """,
                (
                    inst_id,
                    inst.get("provider_symbol") or inst.get("symbol", ""),
                    inst.get("canonical_symbol") or inst.get("symbol", ""),
                    inst.get("display_symbol") or inst.get("display_name", ""),
                    inst.get("company_name", ""),
                    inst.get("exchange", "GLOBAL"),
                    inst.get("mic", ""),
                    inst.get("country", "GLOBAL"),
                    inst.get("currency") or inst.get("quote_currency", "USD"),
                    inst.get("asset_class", "INDIAN_STOCKS"),
                    inst.get("instrument_type", "EQUITY"),
                    inst.get("underlying_id", ""),
                    inst.get("underlying_symbol", ""),
                    inst.get("series", "EQ"),
                    inst.get("isin", ""),
                    float(inst.get("lot_size", 1.0)),
                    float(inst.get("tick_size", 0.05)),
                    float(inst.get("contract_size", 1.0)),
                    float(inst.get("price_multiplier", 1.0)),
                    inst.get("expiry", ""),
                    inst.get("option_type", "NONE"),
                    float(inst.get("strike", 0.0)),
                    inst.get("segment", "CASH"),
                    inst.get("market_status", "OPEN"),
                    inst.get("tradability", "TRADABLE"),
                    inst.get("data_status", "LIVE"),
                    inst.get("data_source", "SYSTEM"),
                    broker_mappings_str,
                    inst.get("contract_status", "ACTIVE"),
                    int(inst.get("paper_enabled", 1)),
                    int(inst.get("live_enabled", 0)),
                    int(inst.get("strategy_enabled", 1)),
                    float(inst.get("last_price", 0.0)),
                    float(inst.get("change_24h", inst.get("change_pct", 0.0))),
                    float(inst.get("volume_24h", inst.get("volume", 0.0))),
                    float(inst.get("open_interest", 0.0)),
                    float(inst.get("oi_change", 0.0)),
                    float(inst.get("implied_volatility", 0.0)),
                    float(inst.get("delta", 0.0)),
                    float(inst.get("gamma", 0.0)),
                    float(inst.get("theta", 0.0)),
                    float(inst.get("vega", 0.0)),
                    float(inst.get("volatility_score", 50.0)),
                    inst.get("volatility_category", "Medium"),
                    float(inst.get("momentum_score", 50.0)),
                    inst.get("directional_bias", "NEUTRAL"),
                    int(inst.get("is_swing_candidate", 0)),
                    int(inst.get("is_scalping_candidate", 0)),
                    int(inst.get("is_hedge_candidate", 0)),
                    now_utc,
                    now_utc,
                    inst.get("active_from", now_utc),
                    inst.get("active_to", "")
                )
            )
            inserted += 1

    conn.commit()
    conn.close()
    return inserted, updated


def get_instruments_master(
    asset_class: str = "ALL",
    exchange: str = "ALL",
    instrument_type: str = "ALL",
    search: str = "",
    status: str = "ALL",
    volatility_filter: str = "ALL",
    limit: int = 100,
    offset: int = 0
) -> Dict[str, Any]:
    """Queries instruments with pagination and multi-parameter filters."""
    conditions = []
    params = []

    if asset_class and asset_class.upper() != "ALL":
        ac_up = asset_class.upper()
        if ac_up in ["STOCK", "STOCKS"]:
            conditions.append("asset_class IN ('Stock', 'INDIAN_STOCKS', 'GLOBAL_STOCKS')")
        elif ac_up in ["CRYPTO", "CRYPTOCURRENCY"]:
            conditions.append("asset_class IN ('Crypto', 'CRYPTO')")
        elif ac_up in ["FOREX", "FX", "CURRENCY"]:
            conditions.append("asset_class IN ('Forex', 'FOREX')")
        elif ac_up in ["INDICES", "INDEX"]:
            conditions.append("asset_class IN ('Indices', 'INDIAN_INDICES', 'GLOBAL_INDICES')")
        elif ac_up in ["COMMODITIES", "COMMODITY"]:
            conditions.append("asset_class IN ('Commodities', 'COMMODITIES')")
        else:
            conditions.append("(asset_class = ? OR asset_class = ?)")
            params.extend([asset_class, asset_class.upper()])

    if exchange and exchange.upper() != "ALL":
        conditions.append("exchange = ?")
        params.append(exchange.upper())

    if instrument_type and instrument_type.upper() != "ALL":
        conditions.append("instrument_type = ?")
        params.append(instrument_type.upper())

    if status and status.upper() != "ALL":
        conditions.append("contract_status = ?")
        params.append(status.upper())

    if volatility_filter and volatility_filter.upper() != "ALL":
        conditions.append("volatility_category = ?")
        params.append(volatility_filter)

    if search:
        search_like = f"%{search}%"
        conditions.append("(canonical_symbol LIKE ? OR display_symbol LIKE ? OR company_name LIKE ? OR isin LIKE ? OR underlying_symbol LIKE ? OR provider_symbol LIKE ?)")
        params.extend([search_like, search_like, search_like, search_like, search_like, search_like])

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    count_sql = f"SELECT COUNT(*) as total FROM instruments {where_clause}"
    count_rows = safe_query(count_sql, tuple(params))
    total_count = count_rows[0]["total"] if count_rows else 0

    query_sql = f"""
        SELECT * FROM instruments
        {where_clause}
        ORDER BY volume_24h DESC, last_price DESC
        LIMIT ? OFFSET ?
    """
    query_params = tuple(params + [limit, offset])
    rows = safe_query(query_sql, query_params)

    enriched_rows = []
    for r in rows:
        d = dict(r)
        d["symbol"] = d.get("canonical_symbol") or d.get("instrument_id")
        d["display_name"] = d.get("display_symbol") or d.get("symbol")
        d["watch_enabled"] = bool(d.get("paper_enabled", 1))
        d["paper_enabled"] = bool(d.get("paper_enabled", 1))
        d["strategy_enabled"] = bool(d.get("strategy_enabled", 1))
        d["live_enabled"] = bool(d.get("live_enabled", 0))
        enriched_rows.append(d)

    return {
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "instruments": enriched_rows
    }



def get_instrument_by_id(instrument_id: str) -> Optional[Dict[str, Any]]:
    """Fetches a canonical instrument by instrument_id."""
    return safe_query_one("SELECT * FROM instruments WHERE instrument_id = ?", (instrument_id,))


def get_instrument_by_canonical(canonical_symbol: str) -> Optional[Dict[str, Any]]:
    """Fetches a canonical instrument by canonical_symbol."""
    return safe_query_one("SELECT * FROM instruments WHERE canonical_symbol = ?", (canonical_symbol,))


def get_universe_summary_stats() -> Dict[str, Any]:
    """Returns real-time universe summary counts across asset classes and segments."""
    sql = """
        SELECT
            COUNT(*) as total_instruments,
            SUM(CASE WHEN asset_class IN ('INDIAN_STOCKS', 'Stock') AND exchange = 'NSE' THEN 1 ELSE 0 END) as indian_stocks,
            SUM(CASE WHEN asset_class IN ('INDIAN_INDICES', 'GLOBAL_INDICES', 'Indices') THEN 1 ELSE 0 END) as indices,
            SUM(CASE WHEN asset_class IN ('GLOBAL_STOCKS', 'Stock') AND exchange IN ('NASDAQ', 'NYSE') THEN 1 ELSE 0 END) as global_stocks,
            SUM(CASE WHEN asset_class IN ('CRYPTO', 'Crypto') THEN 1 ELSE 0 END) as crypto,
            SUM(CASE WHEN asset_class IN ('FOREX', 'Forex') THEN 1 ELSE 0 END) as forex,
            SUM(CASE WHEN asset_class IN ('COMMODITIES', 'Commodities') THEN 1 ELSE 0 END) as commodities,
            SUM(CASE WHEN instrument_type = 'FUTURES' THEN 1 ELSE 0 END) as futures,
            SUM(CASE WHEN instrument_type = 'OPTIONS' THEN 1 ELSE 0 END) as options,
            SUM(CASE WHEN volatility_category IN ('High', 'Extreme') THEN 1 ELSE 0 END) as high_volatility,
            SUM(CASE WHEN exchange = 'NSE' THEN 1 ELSE 0 END) as nse_total,
            SUM(CASE WHEN exchange = 'BSE' THEN 1 ELSE 0 END) as bse_total,
            SUM(CASE WHEN paper_enabled = 1 THEN 1 ELSE 0 END) as paper_enabled,
            SUM(CASE WHEN live_enabled = 1 THEN 1 ELSE 0 END) as live_enabled,
            SUM(CASE WHEN tradability = 'TRADABLE' THEN 1 ELSE 0 END) as tradable
        FROM instruments
    """
    row = safe_query_one(sql)
    if not row:
        row = {
            "total_instruments": 0, "indian_stocks": 0, "indices": 0, "global_stocks": 0,
            "crypto": 0, "forex": 0, "commodities": 0, "futures": 0, "options": 0,
            "high_volatility": 0, "nse_total": 0, "bse_total": 0, "paper_enabled": 0,
            "live_enabled": 0, "tradable": 0
        }

    # Add legacy key aliases
    row["crypto_count"] = row.get("crypto", 0)
    row["indian_stocks_count"] = row.get("indian_stocks", 0)
    row["global_stocks_count"] = row.get("global_stocks", 0)
    row["forex_count"] = row.get("forex", 0)
    row["indices_count"] = row.get("indices", 0)
    return row


def get_market_universe(
    asset_class: str = "ALL",
    category: str = "ALL",
    volatility: str = "ALL",
    search: str = "",
    status_filter: str = "",
    limit: int = 500,
    offset: int = 0
) -> Dict[str, Any]:
    """Compatibility wrapper for get_instruments_master with enriched fields."""
    # Map legacy asset class filter
    ac = asset_class
    if asset_class.lower() == "stock":
        ac = "ALL"  # will match via search or type

    res = get_instruments_master(
        asset_class=ac,
        search=search,
        volatility_filter=volatility if volatility != "ALL" else "ALL",
        limit=limit,
        offset=offset
    )

    enriched_insts = []
    for inst in res.get("instruments", []):
        d = dict(inst)
        d["symbol"] = d.get("canonical_symbol") or d.get("instrument_id")
        d["display_name"] = d.get("display_symbol") or d.get("symbol")
        d["watch_enabled"] = bool(d.get("paper_enabled", 1))
        d["paper_enabled"] = bool(d.get("paper_enabled", 1))
        d["strategy_enabled"] = bool(d.get("strategy_enabled", 1))
        d["live_enabled"] = bool(d.get("live_enabled", 0))
        enriched_insts.append(d)

    return {
        "instruments": enriched_insts,
        "total_count": res.get("total", 0),
        "limit": limit,
        "offset": offset
    }


def get_market_instrument(identifier: str) -> Optional[Dict[str, Any]]:
    """Compatibility getter for single instrument."""
    inst = get_instrument_by_id(identifier) or get_instrument_by_canonical(identifier)
    if not inst:
        # Search by symbol
        row = safe_query_one("SELECT * FROM instruments WHERE canonical_symbol LIKE ? OR provider_symbol LIKE ? LIMIT 1", (f"%{identifier}%", f"%{identifier}%"))
        inst = row

    if inst:
        d = dict(inst)
        d["symbol"] = d.get("canonical_symbol") or d.get("instrument_id")
        d["display_name"] = d.get("display_symbol") or d.get("symbol")
        d["watch_enabled"] = bool(d.get("paper_enabled", 1))
        d["paper_enabled"] = bool(d.get("paper_enabled", 1))
        d["strategy_enabled"] = bool(d.get("strategy_enabled", 1))
        d["live_enabled"] = bool(d.get("live_enabled", 0))
        return d
    return None


def update_instrument_controls(
    identifier: str,
    watch: Optional[bool] = None,
    paper: Optional[bool] = None,
    strategy: Optional[bool] = None,
    live: Optional[bool] = None
) -> Tuple[bool, str]:
    """Compatibility updater for instrument activation controls."""
    now_utc = datetime.now(timezone.utc).isoformat()
    ok = safe_execute(
        """
        UPDATE instruments SET
            paper_enabled = COALESCE(?, paper_enabled),
            live_enabled = COALESCE(?, live_enabled),
            strategy_enabled = COALESCE(?, strategy_enabled),
            updated_at = ?
        WHERE instrument_id = ? OR canonical_symbol = ? OR provider_symbol = ?
        """,
        (
            1 if paper else (0 if paper is False else None),
            1 if live else (0 if live is False else None),
            1 if strategy else (0 if strategy is False else None),
            now_utc,
            identifier,
            identifier,
            identifier
        )
    )
    return (True, identifier) if ok else (False, f"Failed to update '{identifier}'")


def get_top_market_opportunities(limit: int = 10) -> List[Dict[str, Any]]:
    """Returns top opportunities ranked by momentum score."""
    rows = safe_query("SELECT * FROM instruments ORDER BY momentum_score DESC, volume_24h DESC LIMIT ?", (limit,))
    res = []
    for r in rows:
        d = dict(r)
        d["symbol"] = d.get("canonical_symbol")
        d["display_name"] = d.get("display_symbol")
        res.append(d)
    return res



def get_option_chain_from_db(underlying: str, expiry: Optional[str] = None) -> Dict[str, Any]:
    """Builds authoritative Option Chain data from instruments table."""
    # 1. Fetch spot and futures price
    spot_row = safe_query_one(
        "SELECT last_price, change_24h FROM instruments WHERE (canonical_symbol = ? OR underlying_symbol = ?) AND instrument_type IN ('EQUITY', 'INDEX', 'SPOT') LIMIT 1",
        (underlying, underlying)
    )
    spot_price = spot_row["last_price"] if spot_row else 0.0

    # 2. Fetch available expiries
    expiries_rows = safe_query(
        "SELECT DISTINCT expiry FROM instruments WHERE underlying_symbol = ? AND instrument_type = 'OPTIONS' AND expiry != '' ORDER BY expiry ASC",
        (underlying,)
    )
    available_expiries = [r["expiry"] for r in expiries_rows]
    selected_expiry = expiry if (expiry and expiry in available_expiries) else (available_expiries[0] if available_expiries else "")

    if not selected_expiry:
        return {
            "underlying": underlying,
            "spot_price": spot_price,
            "selected_expiry": "",
            "available_expiries": [],
            "strikes": []
        }

    # 3. Query all option contracts for selected expiry
    opt_rows = safe_query(
        """
        SELECT * FROM instruments
        WHERE underlying_symbol = ? AND instrument_type = 'OPTIONS' AND expiry = ?
        ORDER BY strike ASC
        """,
        (underlying, selected_expiry)
    )

    # Group by strike
    strikes_map: Dict[float, Dict[str, Any]] = {}
    for opt in opt_rows:
        strk = float(opt.get("strike", 0.0))
        if strk not in strikes_map:
            strikes_map[strk] = {"strike": strk, "call": None, "put": None}

        op_type = opt.get("option_type", "").upper()
        if op_type == "CE":
            strikes_map[strk]["call"] = opt
        elif op_type == "PE":
            strikes_map[strk]["put"] = opt

    sorted_strikes = [strikes_map[k] for k in sorted(strikes_map.keys())]

    return {
        "underlying": underlying,
        "spot_price": spot_price,
        "selected_expiry": selected_expiry,
        "available_expiries": available_expiries,
        "strikes": sorted_strikes
    }


def get_futures_chain_from_db(underlying: str) -> List[Dict[str, Any]]:
    """Builds Futures term structure (Near, Next, Far) for an underlying."""
    spot_row = safe_query_one(
        "SELECT last_price FROM instruments WHERE (canonical_symbol = ? OR underlying_symbol = ?) AND instrument_type IN ('EQUITY', 'INDEX', 'SPOT') LIMIT 1",
        (underlying, underlying)
    )
    spot_price = spot_row["last_price"] if spot_row else 0.0

    fut_rows = safe_query(
        """
        SELECT * FROM instruments
        WHERE underlying_symbol = ? AND instrument_type = 'FUTURES'
        ORDER BY expiry ASC
        LIMIT 6
        """,
        (underlying,)
    )

    enriched_contracts = []
    today = datetime.now(timezone.utc).date()
    for fut in fut_rows:
        fut_price = float(fut.get("last_price", 0.0))
        basis = round(fut_price - spot_price, 2)
        exp_str = fut.get("expiry", "")
        days_to_exp = 0
        if exp_str and exp_str != "PERPETUAL":
            try:
                exp_d = datetime.strptime(exp_str, "%Y-%m-%d").date()
                days_to_exp = max(0, (exp_d - today).days)
            except Exception:
                days_to_exp = 0
        enriched = dict(fut)
        enriched["basis"] = basis
        enriched["spot_price"] = spot_price
        enriched["days_to_expiry"] = days_to_exp
        enriched_contracts.append(enriched)

    return enriched_contracts


def log_sync_run(
    job_name: str,
    provider_id: str,
    started_at: str,
    finished_at: str,
    status: str,
    records_seen: int,
    records_added: int,
    records_updated: int,
    records_expired: int,
    errors: Optional[List[str]] = None
) -> str:
    """Logs a sync run execution to market_sync_history."""
    sync_id = f"sync_{int(time.time()*1000)}_{uuid.uuid4().hex[:6]}"
    err_json = json.dumps(errors or [])

    safe_execute(
        """
        INSERT INTO market_sync_history (
            sync_id, job_name, provider_id, started_at, finished_at, status,
            records_seen, records_added, records_updated, records_expired, errors_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            sync_id, job_name, provider_id, started_at, finished_at, status,
            records_seen, records_added, records_updated, records_expired, err_json
        )
    )
    return sync_id


def get_sync_history(limit: int = 50) -> List[Dict[str, Any]]:
    """Fetches recent synchronization run history."""
    return safe_query("SELECT * FROM market_sync_history ORDER BY started_at DESC LIMIT ?", (limit,))


def update_provider_health_status(
    provider_id: str,
    provider_name: str,
    status: str,
    latency_ms: float = 0.0,
    last_successful_sync: str = "",
    last_quote_at: str = "",
    last_error: str = "",
    instruments_count: int = 0,
    realtime_capable: int = 1,
    historical_capable: int = 1,
    entitlement_status: str = "ACTIVE"
) -> None:
    """Updates or inserts provider health record in provider_health_status."""
    now_utc = datetime.now(timezone.utc).isoformat()
    safe_execute(
        """
        INSERT INTO provider_health_status (
            provider_id, provider_name, status, latency_ms, last_successful_sync,
            last_quote_at, last_error, instruments_count, realtime_capable, historical_capable,
            entitlement_status, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(provider_id) DO UPDATE SET
            provider_name = excluded.provider_name,
            status = excluded.status,
            latency_ms = excluded.latency_ms,
            last_successful_sync = CASE WHEN excluded.last_successful_sync != '' THEN excluded.last_successful_sync ELSE provider_health_status.last_successful_sync END,
            last_quote_at = CASE WHEN excluded.last_quote_at != '' THEN excluded.last_quote_at ELSE provider_health_status.last_quote_at END,
            last_error = excluded.last_error,
            instruments_count = excluded.instruments_count,
            realtime_capable = excluded.realtime_capable,
            historical_capable = excluded.historical_capable,
            entitlement_status = excluded.entitlement_status,
            updated_at = excluded.updated_at
        """,
        (
            provider_id, provider_name, status, latency_ms, last_successful_sync,
            last_quote_at, last_error, instruments_count, realtime_capable, historical_capable,
            entitlement_status, now_utc
        )
    )


def get_provider_health_records() -> List[Dict[str, Any]]:
    """Fetches all provider health tracking records."""
    return safe_query("SELECT * FROM provider_health_status ORDER BY provider_name ASC")


def get_strategy_permissions_matrix(bot_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Returns strategy permission rules per bot and asset class."""
    if bot_id:
        return safe_query("SELECT * FROM bot_strategy_permissions WHERE bot_id = ? ORDER BY asset_class ASC", (bot_id,))
    return safe_query("SELECT * FROM bot_strategy_permissions ORDER BY bot_id, asset_class ASC")


def save_strategy_permission(bot_id: str, asset_class: str, strategy_name: str, is_allowed: bool, reason: str = "") -> bool:
    """Saves or updates a strategy permission entry for a bot."""
    now_utc = datetime.now(timezone.utc).isoformat()
    return safe_execute(
        """
        INSERT INTO bot_strategy_permissions (bot_id, asset_class, strategy_name, is_allowed, restriction_reason, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(bot_id, asset_class, strategy_name) DO UPDATE SET
            is_allowed = excluded.is_allowed,
            restriction_reason = excluded.restriction_reason,
            updated_at = excluded.updated_at
        """,
        (bot_id, asset_class, strategy_name, 1 if is_allowed else 0, reason, now_utc)
    )


def get_user_watchlists() -> List[Dict[str, Any]]:
    """Fetches user watchlists with structured items, notes, tags, and custom columns. Never seeds demo items."""
    watchlists = safe_query("SELECT * FROM user_watchlists ORDER BY is_default DESC, name ASC")
    if not watchlists:
        # Create a single clean default container with 0 items (NEVER auto-populate default instruments)
        now_utc = datetime.now(timezone.utc).isoformat()
        safe_execute(
            "INSERT INTO user_watchlists (id, name, description, folder, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            ("wl_main", "My Watchlist", "Primary active trading watchlist", "General", 1, now_utc, now_utc)
        )
        watchlists = safe_query("SELECT * FROM user_watchlists ORDER BY is_default DESC, name ASC")

    for wl in watchlists:
        wl["watchlist_id"] = wl["id"]
        try:
            wl["custom_columns"] = json.loads(wl.get("custom_columns_json") or "[]")
        except Exception:
            wl["custom_columns"] = []

        # LEFT JOIN instruments so that user-added items are always returned even if not in instruments master
        items = safe_query(
            """
            SELECT 
                wi.id as watchlist_item_id,
                wi.watchlist_id,
                wi.instrument_id,
                wi.notes,
                wi.sort_order,
                wi.tags_json,
                wi.added_at as item_added_at,
                COALESCE(i.canonical_symbol, i.display_symbol, wi.instrument_id) as symbol,
                COALESCE(i.canonical_symbol, wi.instrument_id) as canonical_symbol,
                COALESCE(i.provider_symbol, wi.instrument_id) as provider_symbol,
                COALESCE(i.display_symbol, wi.instrument_id) as display_symbol,
                COALESCE(i.company_name, i.display_symbol, wi.instrument_id) as name,
                COALESCE(i.exchange, 'BINANCE') as exchange,
                COALESCE(i.asset_class, 'CRYPTO') as asset_class,
                COALESCE(i.segment, 'CASH') as segment,
                COALESCE(i.market_status, 'OPEN') as market_status,
                COALESCE(i.tradability, 'TRADABLE') as tradability,
                COALESCE(i.data_status, 'LIVE') as data_status,
                COALESCE(i.last_price, 0.0) as last_price,
                COALESCE(i.change_24h, 0.0) as change_24h,
                COALESCE(i.volume_24h, 0.0) as volume_24h
            FROM user_watchlist_items wi
            LEFT JOIN instruments i ON wi.instrument_id = i.instrument_id
            WHERE wi.watchlist_id = ?
            ORDER BY wi.sort_order ASC, wi.added_at DESC
            """,
            (wl["id"],)
        )
        for it in items:
            try:
                it["tags"] = json.loads(it.get("tags_json") or "[]")
            except Exception:
                it["tags"] = []
        wl["items"] = items
        wl["items_count"] = len(items)

    return watchlists


def create_user_watchlist(name: str, description: str = "", folder: str = "General", is_default: bool = False) -> str:
    """Creates a new named user watchlist."""
    wl_id = f"wl_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:4]}"
    now_utc = datetime.now(timezone.utc).isoformat()
    if is_default:
        safe_execute("UPDATE user_watchlists SET is_default = 0")
    safe_execute(
        """
        INSERT INTO user_watchlists (id, name, description, folder, is_default, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (wl_id, name, description, folder, 1 if is_default else 0, now_utc, now_utc)
    )
    return wl_id


def update_user_watchlist(watchlist_id: str, name: str, description: str = "", folder: str = "General", is_default: bool = False, custom_columns: Optional[List[str]] = None) -> bool:
    """Updates an existing watchlist metadata and columns."""
    now_utc = datetime.now(timezone.utc).isoformat()
    cols_json = json.dumps(custom_columns) if custom_columns is not None else "[]"
    if is_default:
        safe_execute("UPDATE user_watchlists SET is_default = 0 WHERE id != ?", (watchlist_id,))
    return safe_execute(
        """
        UPDATE user_watchlists
        SET name = ?, description = ?, folder = ?, is_default = ?, custom_columns_json = ?, updated_at = ?
        WHERE id = ?
        """,
        (name, description, folder, 1 if is_default else 0, cols_json, now_utc, watchlist_id)
    )


def delete_user_watchlist(watchlist_id: str) -> bool:
    """Deletes a user watchlist and its items."""
    safe_execute("DELETE FROM user_watchlist_items WHERE watchlist_id = ?", (watchlist_id,))
    return safe_execute("DELETE FROM user_watchlists WHERE id = ?", (watchlist_id,))


def clear_user_watchlist(watchlist_id: str = "wl_main") -> bool:
    """Clears all instruments from a user watchlist."""
    return safe_execute("DELETE FROM user_watchlist_items WHERE watchlist_id = ?", (watchlist_id,))


def add_item_to_watchlist(watchlist_id: str, instrument_id: str, notes: str = "", tags: Optional[List[str]] = None) -> bool:
    """Adds an instrument to a watchlist."""
    now_utc = datetime.now(timezone.utc).isoformat()
    tags_json = json.dumps(tags or [])
    # Get current max sort_order
    max_order_row = safe_query("SELECT MAX(sort_order) as m FROM user_watchlist_items WHERE watchlist_id = ?", (watchlist_id,))
    next_order = (max_order_row[0]["m"] or 0) + 1 if max_order_row and max_order_row[0]["m"] is not None else 0

    return safe_execute(
        """
        INSERT INTO user_watchlist_items (watchlist_id, instrument_id, added_at, sort_order, notes, tags_json)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(watchlist_id, instrument_id) DO UPDATE SET
            added_at = excluded.added_at,
            notes = excluded.notes,
            tags_json = excluded.tags_json
        """,
        (watchlist_id, instrument_id, now_utc, next_order, notes, tags_json)
    )


def update_watchlist_item_details(watchlist_id: str, instrument_id: str, notes: str, tags: List[str]) -> bool:
    """Updates notes and tags on a specific watchlist item."""
    tags_json = json.dumps(tags or [])
    return safe_execute(
        "UPDATE user_watchlist_items SET notes = ?, tags_json = ? WHERE watchlist_id = ? AND instrument_id = ?",
        (notes, tags_json, watchlist_id, instrument_id)
    )


def reorder_watchlist_items(watchlist_id: str, ordered_instrument_ids: List[str]) -> bool:
    """Updates the explicit display sort order for watchlist items."""
    for idx, inst_id in enumerate(ordered_instrument_ids):
        safe_execute(
            "UPDATE user_watchlist_items SET sort_order = ? WHERE watchlist_id = ? AND instrument_id = ?",
            (idx, watchlist_id, inst_id)
        )
    return True


def remove_item_from_watchlist(watchlist_id: str, instrument_id: str) -> bool:
    """Removes an instrument from a watchlist."""
    return safe_execute(
        "DELETE FROM user_watchlist_items WHERE watchlist_id = ? AND instrument_id = ?",
        (watchlist_id, instrument_id)
    )


def get_top_movers(preset: str = "gainers", asset_class: str = "ALL", min_volume: float = 10000.0, limit: int = 10) -> List[Dict[str, Any]]:
    """
    Returns server-side ranked Top Movers with liquidity protection.
    Filters out illiquid assets to prevent misleading 0-volume spikes.
    """
    order_clause = "change_24h DESC"
    if preset == "losers":
        order_clause = "change_24h ASC"
    elif preset == "volume":
        order_clause = "volume_24h DESC"
    elif preset == "oi":
        order_clause = "open_interest DESC"
    elif preset == "volatility":
        order_clause = "volatility_score DESC, change_24h DESC"
    elif preset == "momentum":
        order_clause = "momentum_score DESC, change_24h DESC"

    where_clauses = ["contract_status = 'ACTIVE'", "last_price > 0"]
    params = []

    # Liquidity Filter
    if min_volume > 0:
        where_clauses.append("volume_24h >= ?")
        params.append(min_volume)

    if asset_class != "ALL":
        where_clauses.append("asset_class = ?")
        params.append(asset_class)

    where_sql = " AND ".join(where_clauses)
    query = f"""
        SELECT * FROM instruments
        WHERE {where_sql}
        ORDER BY {order_clause}
        LIMIT {limit}
    """
    return safe_query(query, tuple(params))


def get_saved_scanners() -> List[Dict[str, Any]]:
    """Returns saved scanners list."""
    scanners = safe_query("SELECT * FROM saved_scanners ORDER BY is_system DESC, name ASC")
    if not scanners:
        # Seed system preset scanners
        now_utc = datetime.now(timezone.utc).isoformat()
        defaults = [
            ("scan_momentum", "High Momentum Leaders", "RSI > 60, MACD Bullish, Vol > 1.5x SMA", "ALL", json.dumps({"all": [{"field": "momentum_score", "op": ">=", "value": 70}, {"field": "volatility_score", "op": ">=", "value": 50}]}), 1),
            ("scan_breakouts", "Bullish Breakouts", "New 20D highs, ADX > 25, Expanding Vol", "ALL", json.dumps({"all": [{"field": "directional_bias", "op": "==", "value": "BULLISH"}, {"field": "volatility_category", "op": "in", "value": ["High", "Extreme"]}]}), 1),
            ("scan_volume_surge", "Volume Expansion", "24h Volume > 200% average", "ALL", json.dumps({"all": [{"field": "volume_24h", "op": ">=", "value": 5000000}]}), 1),
            ("scan_oversold_reversal", "Oversold Reversals", "RSI < 35 with bullish divergence", "ALL", json.dumps({"all": [{"field": "momentum_score", "op": "<=", "value": 35}]}), 1)
        ]
        for s_id, s_name, s_desc, s_asset, s_rules, s_sys in defaults:
            safe_execute(
                "INSERT INTO saved_scanners (id, name, description, asset_class, rules_json, is_system, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (s_id, s_name, s_desc, s_asset, s_rules, s_sys, now_utc, now_utc)
            )
        scanners = safe_query("SELECT * FROM saved_scanners ORDER BY is_system DESC, name ASC")

    for sc in scanners:
        try:
            sc["rules"] = json.loads(sc.get("rules_json") or "{}")
        except Exception:
            sc["rules"] = {}

    return scanners


def save_scanner(name: str, rules: Dict[str, Any], description: str = "", asset_class: str = "ALL", scanner_id: Optional[str] = None) -> str:
    """Saves or updates a custom scanner definition."""
    s_id = scanner_id or f"scan_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:4]}"
    now_utc = datetime.now(timezone.utc).isoformat()
    rules_json = json.dumps(rules)
    safe_execute(
        """
        INSERT INTO saved_scanners (id, name, description, asset_class, rules_json, is_system, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 0, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            description = excluded.description,
            asset_class = excluded.asset_class,
            rules_json = excluded.rules_json,
            updated_at = excluded.updated_at
        """,
        (s_id, name, description, asset_class, rules_json, now_utc, now_utc)
    )
    return s_id


def delete_scanner(scanner_id: str) -> bool:
    """Deletes a saved scanner."""
    return safe_execute("DELETE FROM saved_scanners WHERE id = ? AND is_system = 0", (scanner_id,))


# ============================================================================
# ADVANCED BACKTESTING LAB PERSISTENCE LAYER
# ============================================================================

def save_backtest_run(run_data: Dict[str, Any], trades: Optional[List[Dict[str, Any]]] = None) -> str:
    """Saves complete backtest run metadata, metrics, and trades to database."""
    backtest_id = run_data.get("backtest_id") or f"BT-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
    now_utc = datetime.now(timezone.utc).isoformat()

    config_json = json.dumps(run_data.get("config") or run_data.get("config_json") or {})
    metrics_json = json.dumps(run_data.get("metrics") or run_data.get("metrics_json") or {})
    equity_curve_json = json.dumps(run_data.get("equity_curve") or run_data.get("equity_curve_json") or [])
    monthly_perf_json = json.dumps(run_data.get("monthly_performance") or run_data.get("monthly_performance_json") or [])
    data_quality_json = json.dumps(run_data.get("data_quality") or run_data.get("data_quality_json") or {})

    safe_execute(
        """
        INSERT INTO backtest_runs (
            backtest_id, name, asset_class, symbol, exchange, timeframe,
            start_date, end_date, strategy_id, strategy_name, strategy_version,
            indicator_profile, risk_model, initial_capital, available_capital,
            reserve_cash, final_equity, net_profit, return_pct, cagr_pct,
            total_trades, winning_trades, losing_trades, breakeven_trades,
            win_rate_pct, profit_factor, expectancy, max_drawdown_pct,
            sharpe_ratio, total_fees, total_slippage, status,
            config_json, metrics_json, equity_curve_json, monthly_performance_json,
            data_quality_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(backtest_id) DO UPDATE SET
            name = excluded.name,
            final_equity = excluded.final_equity,
            net_profit = excluded.net_profit,
            return_pct = excluded.return_pct,
            total_trades = excluded.total_trades,
            win_rate_pct = excluded.win_rate_pct,
            profit_factor = excluded.profit_factor,
            max_drawdown_pct = excluded.max_drawdown_pct,
            sharpe_ratio = excluded.sharpe_ratio,
            metrics_json = excluded.metrics_json,
            equity_curve_json = excluded.equity_curve_json,
            monthly_performance_json = excluded.monthly_performance_json
        """,
        (
            backtest_id,
            run_data.get("name") or f"{run_data.get('strategy_name', 'Strategy')} Backtest",
            run_data.get("asset_class", "Crypto"),
            run_data.get("symbol", "BTC/USDT"),
            run_data.get("exchange", "BINANCE"),
            run_data.get("timeframe", "15m"),
            run_data.get("start_date", "2024-01-01"),
            run_data.get("end_date", "2024-06-01"),
            run_data.get("strategy_id", "EMA_MACD_VP"),
            run_data.get("strategy_name", "EMA_MACD_VP"),
            run_data.get("strategy_version", "v3.2"),
            run_data.get("indicator_profile", "Balanced"),
            run_data.get("risk_model", "FIXED_RISK"),
            float(run_data.get("initial_capital", 10000.0)),
            float(run_data.get("available_capital", 8000.0)),
            float(run_data.get("reserve_cash", 2000.0)),
            float(run_data.get("final_equity", 10000.0)),
            float(run_data.get("net_profit", 0.0)),
            float(run_data.get("return_pct", 0.0)),
            float(run_data.get("cagr_pct", 0.0)),
            int(run_data.get("total_trades", 0)),
            int(run_data.get("winning_trades", 0)),
            int(run_data.get("losing_trades", 0)),
            int(run_data.get("breakeven_trades", 0)),
            float(run_data.get("win_rate_pct", 0.0)),
            float(run_data.get("profit_factor", 0.0)),
            float(run_data.get("expectancy", 0.0)),
            float(run_data.get("max_drawdown_pct", 0.0)),
            float(run_data.get("sharpe_ratio", 0.0)),
            float(run_data.get("total_fees", 0.0)),
            float(run_data.get("total_slippage", 0.0)),
            run_data.get("status", "COMPLETED"),
            config_json,
            metrics_json,
            equity_curve_json,
            monthly_perf_json,
            data_quality_json,
            now_utc
        )
    )

    if trades:
        # Delete prior trades for this run if updating
        safe_execute("DELETE FROM backtest_trades WHERE backtest_id = ?", (backtest_id,))
        for idx, t in enumerate(trades, start=1):
            indicators_at_entry = json.dumps(t.get("indicators_at_entry") or t.get("indicators_snapshot") or {})
            indicators_at_exit = json.dumps(t.get("indicators_at_exit") or {})
            partial_fills = json.dumps(t.get("partial_fills") or [])

            safe_execute(
                """
                INSERT INTO backtest_trades (
                    backtest_id, trade_id, symbol, side, entry_time, entry_price,
                    exit_time, exit_price, quantity, notional, capital_used,
                    margin_used, stop_loss_price, stop_distance, stop_distance_pct,
                    take_profit_price, risk_reward_ratio, planned_risk, actual_risk,
                    gross_pnl, fees, slippage, net_pnl, return_pct,
                    holding_time_seconds, exit_reason, entry_score, entry_quality,
                    market_regime, indicators_at_entry_json, indicators_at_exit_json,
                    partial_fills_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    backtest_id,
                    t.get("trade_id", idx),
                    t.get("symbol", run_data.get("symbol", "BTC/USDT")),
                    t.get("side") or t.get("direction", "LONG"),
                    t.get("entry_time") or t.get("entry_timestamp", now_utc),
                    float(t.get("entry_price", 0.0)),
                    t.get("exit_time") or t.get("exit_timestamp", now_utc),
                    float(t.get("exit_price", 0.0)),
                    float(t.get("quantity") or t.get("position_size", 1.0)),
                    float(t.get("notional", 0.0)),
                    float(t.get("capital_used", 0.0)),
                    float(t.get("margin_used", 0.0)),
                    float(t.get("stop_loss_price") or t.get("stop_loss", 0.0)),
                    float(t.get("stop_distance", 0.0)),
                    float(t.get("stop_distance_pct", 0.0)),
                    float(t.get("take_profit_price") or t.get("take_profit", 0.0)),
                    float(t.get("risk_reward_ratio") or t.get("rr", 1.5)),
                    float(t.get("planned_risk", 0.0)),
                    float(t.get("actual_risk", 0.0)),
                    float(t.get("gross_pnl", 0.0)),
                    float(t.get("fees", 0.0)),
                    float(t.get("slippage", 0.0)),
                    float(t.get("net_pnl") or t.get("pnl", 0.0)),
                    float(t.get("return_pct", 0.0)),
                    int(t.get("holding_time_seconds", 0)),
                    t.get("exit_reason", "SIGNAL"),
                    float(t.get("entry_score", 85.0)),
                    t.get("entry_quality", "Strong" if float(t.get("entry_score", 85.0)) >= 80 else "Good"),
                    t.get("market_regime", "TRENDING_BULL"),
                    indicators_at_entry,
                    indicators_at_exit,
                    partial_fills
                )
            )

    return backtest_id


def get_backtest_run_by_id(backtest_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves full backtest run by ID with parsed JSON structures."""
    row = safe_query_one("SELECT * FROM backtest_runs WHERE backtest_id = ?", (backtest_id,))
    if not row:
        return None

    res = dict(row)
    res["config"] = json.loads(res.get("config_json") or "{}")
    res["metrics"] = json.loads(res.get("metrics_json") or "{}")
    res["equity_curve"] = json.loads(res.get("equity_curve_json") or "[]")
    res["monthly_performance"] = json.loads(res.get("monthly_performance_json") or "[]")
    res["data_quality"] = json.loads(res.get("data_quality_json") or "{}")
    res["trades"] = get_backtest_trades(backtest_id)
    return res


def get_backtest_history(limit: int = 50, asset_class: Optional[str] = None) -> List[Dict[str, Any]]:
    """Fetches list of backtest runs."""
    if asset_class and asset_class.upper() != "ALL":
        rows = safe_query("SELECT * FROM backtest_runs WHERE asset_class = ? ORDER BY created_at DESC LIMIT ?", (asset_class, limit))
    else:
        rows = safe_query("SELECT * FROM backtest_runs ORDER BY created_at DESC LIMIT ?", (limit,))

    results = []
    for r in rows:
        d = dict(r)
        d["config"] = json.loads(d.get("config_json") or "{}")
        d["metrics"] = json.loads(d.get("metrics_json") or "{}")
        results.append(d)
    return results


def get_backtest_trades(backtest_id: str, limit: int = 500) -> List[Dict[str, Any]]:
    """Fetches trades associated with a specific backtest run."""
    rows = safe_query("SELECT * FROM backtest_trades WHERE backtest_id = ? ORDER BY trade_id ASC LIMIT ?", (backtest_id, limit))
    trades = []
    for r in rows:
        t = dict(r)
        t["indicators_at_entry"] = json.loads(t.get("indicators_at_entry_json") or "{}")
        t["indicators_at_exit"] = json.loads(t.get("indicators_at_exit_json") or "{}")
        t["partial_fills"] = json.loads(t.get("partial_fills_json") or "[]")
        trades.append(t)
    return trades


def delete_backtest_run(backtest_id: str) -> bool:
    """Deletes backtest run and all its associated trades."""
    safe_execute("DELETE FROM backtest_trades WHERE backtest_id = ?", (backtest_id,))
    return safe_execute("DELETE FROM backtest_runs WHERE backtest_id = ?", (backtest_id,))


def get_backtest_presets() -> List[Dict[str, Any]]:
    """Fetches all preset backtest configurations."""
    presets = safe_query("SELECT * FROM backtest_presets ORDER BY name ASC")
    if not presets:
        seed_backtest_presets()
        presets = safe_query("SELECT * FROM backtest_presets ORDER BY name ASC")

    for p in presets:
        p["config"] = json.loads(p.get("config_json") or "{}")
    return presets


def seed_backtest_presets() -> None:
    """Seeds default professional backtest preset templates."""
    now_utc = datetime.now(timezone.utc).isoformat()
    defaults = [
        {
            "id": "preset_balanced_crypto",
            "name": "Balanced Trend & Momentum (BTC/ETH)",
            "category": "Trend",
            "asset_class": "Crypto",
            "strategy_name": "EMA_MACD_VP",
            "timeframe": "15m",
            "description": "Standard 15m multi-indicator balanced swing strategy with 1:2 Risk/Reward and 1% portfolio risk.",
            "recommended_capital": 10000.0,
            "config": {
                "initial_capital": 10000.0,
                "reserve_cash": 2000.0,
                "risk_model": "PERCENT_EQUITY",
                "risk_per_trade_pct": 1.0,
                "stop_loss_method": "SWING_LOW_HIGH",
                "take_profit_method": "RISK_REWARD",
                "risk_reward_ratio": 2.0,
                "fees_pct": 0.001,
                "slippage_pct": 0.0005,
                "allow_shorts": True
            }
        },
        {
            "id": "preset_conservative_equity",
            "name": "Conservative Bluechip Swing (NSE/BSE)",
            "category": "MeanReversion",
            "asset_class": "Indian Stocks",
            "strategy_name": "RSI_BB_CONFLUENCE",
            "timeframe": "1D",
            "description": "Daily timeframe RSI and Bollinger Band mean-reversion with strict 0.5% risk limit and 1:2.5 RR.",
            "recommended_capital": 25000.0,
            "config": {
                "initial_capital": 25000.0,
                "reserve_cash": 5000.0,
                "risk_model": "PERCENT_EQUITY",
                "risk_per_trade_pct": 0.5,
                "stop_loss_method": "ATR_MULTIPLIER",
                "atr_multiplier": 1.5,
                "take_profit_method": "RISK_REWARD",
                "risk_reward_ratio": 2.5,
                "fees_pct": 0.0005,
                "slippage_pct": 0.0002,
                "allow_shorts": False
            }
        },
        {
            "id": "preset_futures_momentum",
            "name": "Futures Breakout Scalper (Index / MCX)",
            "category": "Breakout",
            "asset_class": "Futures",
            "strategy_name": "SUPER_TREND_BREAKOUT",
            "timeframe": "5m",
            "description": "5-minute SuperTrend high-speed breakout strategy with multi-target scaling (TP1 50%, TP2 50%).",
            "recommended_capital": 15000.0,
            "config": {
                "initial_capital": 15000.0,
                "reserve_cash": 3000.0,
                "risk_model": "FIXED_RISK",
                "fixed_risk_amount": 200.0,
                "stop_loss_method": "FIXED_POINTS",
                "stop_points": 40.0,
                "take_profit_method": "MULTI_TARGET",
                "tp1_points": 60.0,
                "tp1_pct_size": 50.0,
                "tp2_points": 100.0,
                "tp2_pct_size": 50.0,
                "fees_pct": 0.0008,
                "slippage_pct": 0.0005,
                "allow_shorts": True
            }
        },
        {
            "id": "preset_options_spread",
            "name": "Options Bull Call Spread (NIFTY/BANKNIFTY)",
            "category": "Trend",
            "asset_class": "Options",
            "strategy_name": "OPTIONS_DELTA_NEUTRAL",
            "timeframe": "15m",
            "description": "Defined-risk vertical bull call spread with Greeks monitoring (Delta/Theta/Vega) and weekly expiration.",
            "recommended_capital": 20000.0,
            "config": {
                "initial_capital": 20000.0,
                "reserve_cash": 5000.0,
                "risk_model": "PERCENT_EQUITY",
                "risk_per_trade_pct": 2.0,
                "stop_loss_method": "FIXED_PERCENT",
                "stop_loss_pct": 30.0,
                "take_profit_method": "FIXED_PERCENT",
                "take_profit_pct": 60.0,
                "fees_pct": 0.001,
                "slippage_pct": 0.001,
                "allow_shorts": False
            }
        }
    ]

    for p in defaults:
        safe_execute(
            """
            INSERT INTO backtest_presets (id, name, category, asset_class, strategy_name, timeframe, description, recommended_capital, config_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                category = excluded.category,
                asset_class = excluded.asset_class,
                strategy_name = excluded.strategy_name,
                timeframe = excluded.timeframe,
                description = excluded.description,
                recommended_capital = excluded.recommended_capital,
                config_json = excluded.config_json
            """,
            (p["id"], p["name"], p["category"], p["asset_class"], p["strategy_name"], p["timeframe"], p["description"], p["recommended_capital"], json.dumps(p["config"]), now_utc)
        )


# ============================================================================
# CRYPTO DERIVATIVES CRUD HELPERS
# ============================================================================

def record_derivative_order(order: Dict[str, Any]) -> bool:
    """Records a crypto futures or options order into derivative_orders."""
    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        import uuid
        return safe_execute(
            """
            INSERT INTO derivative_orders (
                order_id, bot_id, symbol, canonical_symbol, underlying,
                instrument_type, side, order_type, quantity, price,
                stop_loss, take_profit, leverage, margin, status,
                execution_mode, created_at, filled_at, remarks,
                client_order_id, idempotency_key, margin_mode,
                reduce_only, post_only, time_in_force, risk_check_details_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                order.get("order_id") or f"dord_{uuid.uuid4().hex[:10]}",
                order.get("bot_id", "bot-1"),
                order.get("symbol", "BTC-PERP"),
                order.get("canonical_symbol", order.get("symbol")),
                order.get("underlying", "BTC"),
                order.get("instrument_type", "FUTURES"),
                order.get("side", "BUY").upper(),
                order.get("order_type", "MARKET").upper(),
                float(order.get("quantity", 0.0)),
                float(order.get("price", 0.0)),
                float(order.get("stop_loss") or 0.0),
                float(order.get("take_profit") or 0.0),
                float(order.get("leverage", 1.0)),
                float(order.get("margin", 0.0)),
                order.get("status", "FILLED"),
                order.get("execution_mode", "PAPER"),
                order.get("created_at", now_iso),
                order.get("filled_at", now_iso),
                order.get("remarks", ""),
                order.get("client_order_id", ""),
                order.get("idempotency_key", ""),
                order.get("margin_mode", "ISOLATED"),
                1 if order.get("reduce_only") else 0,
                1 if order.get("post_only") else 0,
                order.get("time_in_force", "GTC"),
                json.dumps(order.get("risk_check_details") or {}) if isinstance(order.get("risk_check_details"), (dict, list)) else str(order.get("risk_check_details") or "")
            )
        )
    except Exception as e:
        logger.error(f"Error recording derivative order: {e}")
        return False


def record_derivative_position(pos: Dict[str, Any]) -> bool:
    """Inserts or updates an active derivative position."""
    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        import uuid
        return safe_execute(
            """
            INSERT INTO derivative_positions (
                position_id, bot_id, symbol, canonical_symbol, underlying,
                instrument_type, side, quantity, entry_price, current_price,
                mark_price, leverage, liquidation_price, margin,
                unrealized_pnl, realized_pnl, status, opened_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(position_id) DO UPDATE SET
                quantity = excluded.quantity,
                current_price = excluded.current_price,
                mark_price = excluded.mark_price,
                unrealized_pnl = excluded.unrealized_pnl,
                margin = excluded.margin,
                status = excluded.status,
                updated_at = excluded.updated_at
            """,
            (
                pos.get("position_id") or f"dpos_{uuid.uuid4().hex[:10]}",
                pos.get("bot_id", "bot-1"),
                pos.get("symbol", "BTC-PERP"),
                pos.get("canonical_symbol", pos.get("symbol")),
                pos.get("underlying", "BTC"),
                pos.get("instrument_type", "FUTURES"),
                pos.get("side", "BUY").upper(),
                float(pos.get("quantity", 0.0)),
                float(pos.get("entry_price", 0.0)),
                float(pos.get("current_price", pos.get("entry_price", 0.0))),
                float(pos.get("mark_price", pos.get("entry_price", 0.0))),
                float(pos.get("leverage", 1.0)),
                float(pos.get("liquidation_price") or 0.0),
                float(pos.get("margin", 0.0)),
                float(pos.get("unrealized_pnl", 0.0)),
                float(pos.get("realized_pnl", 0.0)),
                pos.get("status", "OPEN"),
                pos.get("opened_at", now_iso),
                pos.get("updated_at", now_iso)
            )
        )
    except Exception as e:
        logger.error(f"Error recording derivative position: {e}")
        return False


def get_active_derivative_positions() -> List[Dict[str, Any]]:
    """Retrieves all OPEN crypto futures and options positions."""
    return safe_query("SELECT * FROM derivative_positions WHERE status = 'OPEN' ORDER BY id DESC")


def get_derivative_orders(limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieves recent crypto derivative orders."""
    return safe_query("SELECT * FROM derivative_orders ORDER BY id DESC LIMIT ?", (limit,))


def close_derivative_position(position_id: str, exit_price: float, pnl: float) -> bool:
    """Marks a derivative position as CLOSED with finalized P&L."""
    now_iso = datetime.now(timezone.utc).isoformat()
    return safe_execute(
        """
        UPDATE derivative_positions
        SET status = 'CLOSED', current_price = ?, realized_pnl = ?, closed_at = ?, updated_at = ?
        WHERE position_id = ?
        """,
        (exit_price, pnl, now_iso, now_iso, position_id)
    )


def record_futures_funding(
    contract_id: str,
    exchange: str,
    symbol: str,
    funding_rate: float,
    funding_rate_pct: float,
    funding_timestamp: int
) -> bool:
    """Inserts a historical funding rate point."""
    now_iso = datetime.now(timezone.utc).isoformat()
    return safe_execute(
        """
        INSERT INTO futures_funding_history (
            contract_id, exchange, symbol, funding_rate, funding_rate_pct, funding_timestamp, timestamp_iso
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(contract_id, funding_timestamp) DO UPDATE SET
            funding_rate = excluded.funding_rate,
            funding_rate_pct = excluded.funding_rate_pct,
            timestamp_iso = excluded.timestamp_iso
        """,
        (contract_id, exchange, symbol, funding_rate, funding_rate_pct, funding_timestamp, now_iso)
    )


def get_futures_funding_history(contract_id: str, limit: int = 30) -> List[Dict[str, Any]]:
    """Retrieves chronological funding history for a contract."""
    return safe_query(
        """
        SELECT * FROM futures_funding_history
        WHERE contract_id = ? OR symbol = ?
        ORDER BY funding_timestamp DESC LIMIT ?
        """,
        (contract_id, contract_id, limit)
    )


def record_futures_oi_snapshot(
    contract_id: str,
    exchange: str,
    symbol: str,
    open_interest: float,
    open_interest_usd: float,
    price: float,
    snapshot_timestamp: int
) -> bool:
    """Inserts an open interest snapshot."""
    now_iso = datetime.now(timezone.utc).isoformat()
    return safe_execute(
        """
        INSERT INTO futures_oi_snapshots (
            contract_id, exchange, symbol, open_interest, open_interest_usd, price, snapshot_timestamp, timestamp_iso
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(contract_id, snapshot_timestamp) DO UPDATE SET
            open_interest = excluded.open_interest,
            open_interest_usd = excluded.open_interest_usd,
            price = excluded.price,
            timestamp_iso = excluded.timestamp_iso
        """,
        (contract_id, exchange, symbol, open_interest, open_interest_usd, price, snapshot_timestamp, now_iso)
    )


def get_futures_oi_history(contract_id: str, limit: int = 30) -> List[Dict[str, Any]]:
    """Retrieves open interest history for a contract."""
    return safe_query(
        """
        SELECT * FROM futures_oi_snapshots
        WHERE contract_id = ? OR symbol = ?
        ORDER BY snapshot_timestamp DESC LIMIT ?
        """,
        (contract_id, contract_id, limit)
    )


def get_derivative_order_by_idempotency(idempotency_key: str) -> Optional[Dict[str, Any]]:
    """Retrieves an existing order by unique client idempotency key."""
    if not idempotency_key:
        return None
    rows = safe_query("SELECT * FROM derivative_orders WHERE idempotency_key = ? LIMIT 1", (idempotency_key,))
    return rows[0] if rows else None


# ==============================================================================
# STRATEGY IDE & VERSIONING PERSISTENCE HELPERS
# ==============================================================================

def save_strategy_draft(strategy_dict: Dict[str, Any]) -> bool:
    """Saves or updates a strategy draft definition."""
    try:
        strat_id = strategy_dict.get("strategy_id") or strategy_dict.get("id")
        if not strat_id:
            return False
        now_iso = datetime.now(timezone.utc).isoformat()
        draft_json = json.dumps(strategy_dict)

        return safe_execute(
            """
            INSERT INTO strategies (
                strategy_id, name, description, market_type, symbol,
                base_timeframe, direction, status, active_version,
                author, tags, draft_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(strategy_id) DO UPDATE SET
                name = excluded.name,
                description = excluded.description,
                market_type = excluded.market_type,
                symbol = excluded.symbol,
                base_timeframe = excluded.base_timeframe,
                direction = excluded.direction,
                status = excluded.status,
                active_version = excluded.active_version,
                tags = excluded.tags,
                draft_json = excluded.draft_json,
                updated_at = excluded.updated_at
            """,
            (
                strat_id,
                strategy_dict.get("name", "Unnamed Strategy"),
                strategy_dict.get("description", ""),
                strategy_dict.get("market_type", "crypto"),
                strategy_dict.get("symbol", "BTC/USDT"),
                strategy_dict.get("base_timeframe", strategy_dict.get("timeframe", "15m")),
                strategy_dict.get("direction", "LONG"),
                strategy_dict.get("status", "DRAFT"),
                strategy_dict.get("active_version", "v1.0.0"),
                strategy_dict.get("author", "Trader"),
                json.dumps(strategy_dict.get("tags", [])),
                draft_json,
                strategy_dict.get("created_at", now_iso),
                now_iso
            )
        )
    except Exception as e:
        logger.error(f"Error saving strategy draft: {e}")
        return False


def get_strategy_by_id(strategy_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a strategy draft by strategy_id."""
    rows = safe_query("SELECT * FROM strategies WHERE strategy_id = ? LIMIT 1", (strategy_id,))
    if not rows:
        return None
    r = rows[0]
    try:
        parsed = json.loads(r["draft_json"])
        return parsed
    except Exception:
        return dict(r)


def get_all_strategy_drafts() -> List[Dict[str, Any]]:
    """Retrieves all strategy drafts."""
    rows = safe_query("SELECT * FROM strategies ORDER BY updated_at DESC")
    out = []
    for r in rows:
        try:
            parsed = json.loads(r["draft_json"])
            out.append(parsed)
        except Exception:
            out.append(dict(r))
    return out


def create_strategy_version_record(version_record: Dict[str, Any]) -> bool:
    """Creates an immutable strategy version snapshot."""
    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        return safe_execute(
            """
            INSERT INTO strategy_versions (
                strategy_id, version_semver, parent_version, status,
                strategy_json, ast_json, config_hash, change_summary,
                created_at, created_by, is_deployed, is_immutable
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            """,
            (
                version_record["strategy_id"],
                version_record["version_semver"],
                version_record.get("parent_version"),
                version_record.get("status", "SAVED"),
                json.dumps(version_record.get("strategy_json", {})),
                json.dumps(version_record.get("ast_json", {})),
                version_record.get("config_hash", ""),
                version_record.get("change_summary", ""),
                version_record.get("created_at", now_iso),
                version_record.get("created_by", "Trader"),
                1 if version_record.get("is_deployed") else 0
            )
        )
    except Exception as e:
        logger.error(f"Error creating strategy version record: {e}")
        return False


def get_strategy_versions_list(strategy_id: str) -> List[Dict[str, Any]]:
    """Retrieves all versions for a given strategy_id."""
    return safe_query(
        "SELECT * FROM strategy_versions WHERE strategy_id = ? ORDER BY id DESC",
        (strategy_id,)
    )


def log_live_observation(obs_record: Dict[str, Any]) -> bool:
    """Logs a hypothetical Live Observation signal."""
    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        return safe_execute(
            """
            INSERT INTO strategy_live_observations (
                strategy_id, version_semver, symbol, timeframe,
                action, signal_type, rule_evaluations_json, indicator_snapshot_json,
                market_price, blocked_reason, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                obs_record.get("strategy_id", "default"),
                obs_record.get("version_semver", "v1.0.0"),
                obs_record.get("symbol", "BTC/USDT"),
                obs_record.get("timeframe", "15m"),
                obs_record.get("action", "NO_SIGNAL"),
                obs_record.get("signal_type", "HOLD"),
                json.dumps(obs_record.get("rule_evaluations", [])),
                json.dumps(obs_record.get("indicator_snapshot", {})),
                float(obs_record.get("market_price", 0.0)),
                obs_record.get("blocked_reason", ""),
                obs_record.get("timestamp", now_iso)
            )
        )
    except Exception as e:
        logger.error(f"Error logging live observation: {e}")
        return False


def get_live_observations_history(strategy_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieves recent live observations for a strategy."""
    return safe_query(
        """
        SELECT * FROM strategy_live_observations
        WHERE strategy_id = ?
        ORDER BY id DESC LIMIT ?
        """,
        (strategy_id, limit)
    )


# ============================================================================
# BOT COMMANDS, WORKER LEASES & RECONCILIATION HELPERS
# ============================================================================

def create_bot_command(cmd_dict: Dict[str, Any]) -> bool:
    """Inserts a new idempotent bot command into bot_commands table."""
    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        return safe_execute(
            """
            INSERT OR REPLACE INTO bot_commands (
                command_id, bot_id, requested_action, requested_by,
                expected_state, target_state, status, result_msg, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                cmd_dict.get("command_id"),
                cmd_dict.get("bot_id"),
                cmd_dict.get("requested_action"),
                cmd_dict.get("requested_by", "OPERATOR"),
                cmd_dict.get("expected_state", ""),
                cmd_dict.get("target_state", ""),
                cmd_dict.get("status", "RECEIVED"),
                cmd_dict.get("result_msg", ""),
                cmd_dict.get("created_at", now_iso)
            )
        )
    except Exception as e:
        logger.error(f"Error inserting bot command: {e}")
        return False


def get_bot_command(command_id: str) -> Optional[Dict[str, Any]]:
    """Fetches a bot command by its unique ID for idempotency verification."""
    return safe_query_one(
        "SELECT * FROM bot_commands WHERE command_id = ?",
        (command_id,)
    )


def update_bot_command(command_id: str, status: str, result_msg: str = "") -> bool:
    """Updates status and completion result of a bot command."""
    now_iso = datetime.now(timezone.utc).isoformat()
    return safe_execute(
        """
        UPDATE bot_commands
        SET status = ?, result_msg = ?, executed_at = ?
        WHERE command_id = ?
        """,
        (status, result_msg, now_iso, command_id)
    )


def get_bot_recent_commands(bot_id: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
    """Fetches recently executed bot commands."""
    if bot_id:
        return safe_query(
            "SELECT * FROM bot_commands WHERE bot_id = ? ORDER BY created_at DESC LIMIT ?",
            (bot_id, limit)
        )
    return safe_query(
        "SELECT * FROM bot_commands ORDER BY created_at DESC LIMIT ?",
        (limit,)
    )


def acquire_bot_worker_lease(bot_id: str, worker_id: str, process_pid: Optional[int] = None, duration_sec: int = 60) -> Optional[str]:
    """
    Acquires or renews an exclusive worker execution lease for a bot.
    Returns the unique lease_token if acquired, or None if actively held by another live worker.
    """
    now_dt = datetime.now(timezone.utc)
    now_iso = now_dt.isoformat()
    expires_dt = now_dt.timestamp() + duration_sec
    expires_iso = datetime.fromtimestamp(expires_dt, tz=timezone.utc).isoformat()
    token = f"lease-{bot_id}-{int(now_dt.timestamp())}-{worker_id[:8]}"

    try:
        existing = safe_query_one("SELECT * FROM bot_worker_leases WHERE bot_id = ?", (bot_id,))
        if existing:
            # Check if lease expired
            exp_str = existing.get("lease_expires_at", "")
            is_expired = True
            if exp_str:
                try:
                    exp_dt = datetime.fromisoformat(exp_str.replace("Z", "+00:00"))
                    if exp_dt.tzinfo is None:
                        exp_dt = exp_dt.replace(tzinfo=timezone.utc)
                    if exp_dt > now_dt and existing.get("worker_id") != worker_id:
                        # Another live worker holds the lease!
                        logger.warning(f"Worker {worker_id} denied lease for bot {bot_id}: held by {existing.get('worker_id')}")
                        return None
                except Exception:
                    is_expired = True

            gen = int(existing.get("generation_id", 1)) + 1
            safe_execute(
                """
                UPDATE bot_worker_leases
                SET worker_id = ?, lease_token = ?, generation_id = ?,
                    lease_acquired_at = ?, lease_expires_at = ?, last_heartbeat = ?,
                    state = 'HEALTHY', process_pid = ?
                WHERE bot_id = ?
                """,
                (worker_id, token, gen, now_iso, expires_iso, now_iso, process_pid, bot_id)
            )
        else:
            safe_execute(
                """
                INSERT INTO bot_worker_leases (
                    bot_id, worker_id, lease_token, generation_id,
                    lease_acquired_at, lease_expires_at, last_heartbeat,
                    state, host, process_pid
                ) VALUES (?, ?, ?, 1, ?, ?, ?, 'HEALTHY', 'localhost', ?)
                """,
                (bot_id, worker_id, token, now_iso, expires_iso, now_iso, process_pid)
            )

        # Update bot_instances lease token
        safe_execute("UPDATE bot_instances SET lease_token = ? WHERE id = ?", (token, bot_id))
        return token
    except Exception as e:
        logger.error(f"Error acquiring worker lease for bot {bot_id}: {e}")
        return None


def renew_bot_worker_lease(bot_id: str, lease_token: str, duration_sec: int = 60) -> bool:
    """Heartbeat lease renewal for an active worker."""
    now_dt = datetime.now(timezone.utc)
    now_iso = now_dt.isoformat()
    expires_dt = now_dt.timestamp() + duration_sec
    expires_iso = datetime.fromtimestamp(expires_dt, tz=timezone.utc).isoformat()

    return safe_execute(
        """
        UPDATE bot_worker_leases
        SET lease_expires_at = ?, last_heartbeat = ?, state = 'HEALTHY'
        WHERE bot_id = ? AND lease_token = ?
        """,
        (expires_iso, now_iso, bot_id, lease_token)
    )


def release_bot_worker_lease(bot_id: str, lease_token: Optional[str] = None) -> bool:
    """Releases the worker lease when a bot cleanly stops."""
    if lease_token:
        safe_execute("DELETE FROM bot_worker_leases WHERE bot_id = ? AND lease_token = ?", (bot_id, lease_token))
    else:
        safe_execute("DELETE FROM bot_worker_leases WHERE bot_id = ?", (bot_id,))
    safe_execute("UPDATE bot_instances SET lease_token = '' WHERE id = ?", (bot_id,))
    return True


def get_bot_worker_lease(bot_id: str) -> Optional[Dict[str, Any]]:
    """Gets current lease info for a bot."""
    return safe_query_one("SELECT * FROM bot_worker_leases WHERE bot_id = ?", (bot_id,))


def reconcile_startup_bot_states() -> Dict[str, Any]:
    """
    Authoritative startup reconciliation:
    Audits all bot instances in database against OS processes.
    If a bot is marked RUNNING or PAUSED but its OS process is dead,
    gracefully updates status to STOPPED to eliminate state contradictions.
    """
    reconciled = []
    bots = safe_query("SELECT id, name, status, process_id FROM bot_instances WHERE COALESCE(is_deleted, 0) = 0")
    for b in bots:
        b_id = b["id"]
        status = b.get("status", "STOPPED")
        pid_str = b.get("process_id", "")

        if status in ["RUNNING", "PAUSED", "STARTING", "RESUMING"]:
            is_alive = False
            if pid_str and pid_str.isdigit():
                pid = int(pid_str)
                try:
                    import psutil
                    if psutil.pid_exists(pid):
                        proc = psutil.Process(pid)
                        if proc.is_running() and proc.status() != psutil.STATUS_ZOMBIE:
                            is_alive = True
                except Exception:
                    # Fallback on OS kill 0
                    try:
                        import os
                        os.kill(pid, 0)
                        is_alive = True
                    except Exception:
                        is_alive = False

            if not is_alive:
                safe_execute(
                    "UPDATE bot_instances SET status = 'STOPPED', process_id = '', lease_token = '', stuck_explanation = 'Process terminated during server restart' WHERE id = ?",
                    (b_id,)
                )
                release_bot_worker_lease(b_id)
                reconciled.append({
                    "bot_id": b_id,
                    "name": b.get("name"),
                    "old_status": status,
                    "new_status": "STOPPED",
                    "reason": "Process was not running on startup"
                })

    logger.info(f"Bot state startup reconciliation finished: {len(reconciled)} bot(s) reconciled to STOPPED.")
    return {
        "status": "success",
        "reconciled_count": len(reconciled),
        "reconciled_bots": reconciled
    }


# =============================================================================
# RISK DECISIONS & FORENSIC EVIDENCE LEDGER
# =============================================================================

import hashlib


def record_risk_decision(
    risk_event_id: str,
    decision: str,
    severity: str,
    category: str,
    symbol: str,
    bot_id: str,
    plain_explanation: str,
    account_id: str = "PAPER-01",
    account_mode: str = "PAPER",
    instrument_id: str = "BINANCE:BTC/USDT:SPOT",
    exchange: str = "BINANCE",
    asset_class: str = "Crypto",
    instrument_type: str = "SPOT",
    bot_version: str = "v2.4.1",
    strategy_id: str = "EMA_MACD_VP",
    strategy_version: str = "v3.2.1",
    correlation_id: str = "",
    order_intent_id: str = "",
    order_id: str = "",
    position_id: str = "",
    trade_id: str = "",
    blocking_gate: str = "",
    blocking_reason: str = "",
    required_action: str = "",
    max_passing_exposure: float = 0.0,
    policy_name: str = "Conservative Intraday",
    policy_version: str = "v3.4.1",
    risk_engine_version: str = "v2.8.0",
    requested_quantity: float = 0.0,
    requested_notional: float = 0.0,
    requested_risk_usd: float = 0.0,
    requested_risk_pct: float = 0.0,
    observed_value: float = 0.0,
    threshold_value: float = 0.0,
    threshold_unit: str = "%",
    data_source: str = "Binance Public WebSocket",
    data_age_ms: int = 45,
    execution_status: str = "NOT_SUBMITTED",
    execution_message: str = "",
    gates_evaluations: Optional[List[Dict[str, Any]]] = None,
    portfolio_before: Optional[Dict[str, Any]] = None,
    portfolio_after: Optional[Dict[str, Any]] = None,
    risk_delta: Optional[Dict[str, Any]] = None,
    timeline: Optional[List[Dict[str, Any]]] = None,
    evaluated_at: Optional[str] = None
) -> str:
    """Records an immutable pre-trade risk decision and its complete gate matrix."""
    now_iso = datetime.now(timezone.utc).isoformat()
    eval_time = evaluated_at or now_iso
    decision_id = f"DEC-{uuid.uuid4().hex[:8].upper()}"

    # Compute SHA-256 integrity hash
    hash_payload = f"{risk_event_id}|{decision}|{symbol}|{bot_id}|{account_id}|{requested_notional}|{blocking_gate}|{eval_time}"
    integrity_hash = hashlib.sha256(hash_payload.encode("utf-8")).hexdigest()

    gates_summary = {}
    if gates_evaluations:
        for g in gates_evaluations:
            gates_summary[g.get("gate_id", "")] = g.get("status", "PASS")

    with get_db_transaction() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO risk_decisions (
                risk_event_id, decision_id, correlation_id, order_intent_id, order_id, position_id, trade_id,
                bot_id, bot_version, strategy_id, strategy_version, account_id, account_mode,
                instrument_id, symbol, exchange, asset_class, instrument_type,
                decision, severity, category, blocking_gate, blocking_reason, plain_explanation,
                required_action, max_passing_exposure, policy_name, policy_version, risk_engine_version,
                requested_quantity, requested_notional, requested_risk_usd, requested_risk_pct,
                observed_value, threshold_value, threshold_unit, data_source, data_timestamp, data_age_ms,
                execution_status, execution_message, gates_summary_json,
                portfolio_before_json, portfolio_after_json, risk_delta_json, timeline_json,
                integrity_hash, created_at, evaluated_at, source_timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                risk_event_id, decision_id, correlation_id or f"corr_{uuid.uuid4().hex[:8]}",
                order_intent_id, order_id, position_id, trade_id,
                bot_id, bot_version, strategy_id, strategy_version, account_id, account_mode,
                instrument_id, symbol, exchange, asset_class, instrument_type,
                decision, severity, category, blocking_gate, blocking_reason, plain_explanation,
                required_action, max_passing_exposure, policy_name, policy_version, risk_engine_version,
                requested_quantity, requested_notional, requested_risk_usd, requested_risk_pct,
                observed_value, threshold_value, threshold_unit, data_source, eval_time, data_age_ms,
                execution_status, execution_message, json.dumps(gates_summary),
                json.dumps(portfolio_before or {}), json.dumps(portfolio_after or {}),
                json.dumps(risk_delta or {}), json.dumps(timeline or []),
                integrity_hash, now_iso, eval_time, eval_time
            )
        )

        if gates_evaluations:
            for g in gates_evaluations:
                cursor.execute(
                    """
                    INSERT INTO risk_gate_evaluations (
                        risk_event_id, gate_id, gate_name, status, observed_value,
                        threshold_value, unit, reason_code, message, evaluated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        risk_event_id,
                        g.get("gate_id", "gate_unknown"),
                        g.get("gate_name", "Gate Check"),
                        g.get("status", "PASS"),
                        float(g.get("observed_value", 0.0)),
                        float(g.get("threshold_value", 0.0)),
                        g.get("unit", ""),
                        g.get("reason_code", "OK"),
                        g.get("message", ""),
                        eval_time
                    )
                )

    return risk_event_id


def get_risk_decisions(
    limit: int = 50,
    offset: int = 0,
    decision: Optional[str] = None,
    severity: Optional[str] = None,
    category: Optional[str] = None,
    bot_id: Optional[str] = None,
    symbol: Optional[str] = None,
    account_mode: Optional[str] = None,
    search: Optional[str] = None
) -> Dict[str, Any]:
    """Queries risk decisions with full server-side filtering."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM risk_decisions")
        if cursor.fetchone()[0] == 0:
            seed_canonical_risk_decisions()

        query = "SELECT * FROM risk_decisions WHERE 1=1"
        params = []

        if decision and decision != "ALL":
            query += " AND decision = ?"
            params.append(decision)
        if severity and severity != "ALL":
            query += " AND severity = ?"
            params.append(severity)
        if category and category != "ALL":
            query += " AND category = ?"
            params.append(category)
        if bot_id and bot_id != "ALL":
            query += " AND bot_id = ?"
            params.append(bot_id)
        if symbol and symbol != "ALL":
            query += " AND (symbol LIKE ? OR instrument_id LIKE ?)"
            params.append(f"%{symbol}%")
            params.append(f"%{symbol}%")
        if account_mode and account_mode != "ALL":
            query += " AND account_mode = ?"
            params.append(account_mode)
        if search and search.strip():
            s = f"%{search.strip()}%"
            query += " AND (risk_event_id LIKE ? OR symbol LIKE ? OR bot_id LIKE ? OR blocking_gate LIKE ? OR plain_explanation LIKE ? OR policy_version LIKE ?)"
            params.extend([s, s, s, s, s, s])

        # Total count query
        count_query = query.replace("SELECT *", "SELECT COUNT(*)")
        cursor.execute(count_query, params)
        total_count = cursor.fetchone()[0]

        # Paginated results
        query += " ORDER BY evaluated_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        cursor.execute(query, params)
        cols = [d[0] for d in cursor.description]
        rows = [dict(zip(cols, r)) for r in cursor.fetchall()]

        # Parse JSON fields
        for r in rows:
            for jf in ["gates_summary_json", "portfolio_before_json", "portfolio_after_json", "risk_delta_json", "timeline_json"]:
                if r.get(jf):
                    try:
                        r[jf.replace("_json", "")] = json.loads(r[jf])
                    except Exception:
                        r[jf.replace("_json", "")] = {}

        return {"total": total_count, "decisions": rows}
    finally:
        conn.close()


def get_risk_decision_by_id(risk_event_id: str) -> Optional[Dict[str, Any]]:
    """Fetches full forensic dossier for a specific risk decision including all gate results."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM risk_decisions WHERE risk_event_id = ?", (risk_event_id,))
        row = cursor.fetchone()
        if not row:
            return None
        cols = [d[0] for d in cursor.description]
        d = dict(zip(cols, row))

        # Parse JSON fields
        for jf in ["gates_summary_json", "portfolio_before_json", "portfolio_after_json", "risk_delta_json", "timeline_json"]:
            if d.get(jf):
                try:
                    d[jf.replace("_json", "")] = json.loads(d[jf])
                except Exception:
                    d[jf.replace("_json", "")] = {}

        # Fetch gates evaluations
        cursor.execute(
            "SELECT * FROM risk_gate_evaluations WHERE risk_event_id = ? ORDER BY id ASC",
            (risk_event_id,)
        )
        g_cols = [cd[0] for cd in cursor.description]
        d["gate_evaluations"] = [dict(zip(g_cols, gr)) for gr in cursor.fetchall()]

        return d
    finally:
        conn.close()


def acknowledge_risk_decision(risk_event_id: str, acknowledged_by: str = "Operator") -> bool:
    """Marks a risk warning or event as acknowledged without altering facts."""
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db_transaction() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE risk_decisions SET is_acknowledged = 1, acknowledged_by = ?, acknowledged_at = ? WHERE risk_event_id = ?",
            (acknowledged_by, now_iso, risk_event_id)
        )
        return cursor.rowcount > 0


def add_risk_decision_note(risk_event_id: str, note: str) -> bool:
    """Appends an operator note to a risk decision."""
    with get_db_transaction() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT notes FROM risk_decisions WHERE risk_event_id = ?", (risk_event_id,))
        row = cursor.fetchone()
        if not row:
            return False
        current = row[0] or ""
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        updated = f"{current}\n[{timestamp}] {note}".strip()
        cursor.execute(
            "UPDATE risk_decisions SET notes = ? WHERE risk_event_id = ?",
            (updated, risk_event_id)
        )
        return True


def override_risk_decision(risk_event_id: str, override_by: str, reason: str) -> bool:
    """Records an explicit authorized override for a blocked risk decision."""
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db_transaction() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE risk_decisions
            SET is_overridden = 1, override_by = ?, override_reason = ?, override_timestamp = ?, decision = 'OVERRIDDEN', severity = 'WARNING'
            WHERE risk_event_id = ?
            """,
            (override_by, reason, now_iso, risk_event_id)
        )
        return cursor.rowcount > 0


def get_risk_decision_analytics() -> Dict[str, Any]:
    """Computes aggregated KPI metrics and top blocking gates from the immutable ledger."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM risk_decisions")
        total = cursor.fetchone()[0]

        if total == 0:
            seed_canonical_risk_decisions()
            cursor.execute("SELECT COUNT(*) FROM risk_decisions")
            total = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM risk_decisions WHERE decision IN ('APPROVED', 'APPROVED_WITH_WARNING')")
        approved = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM risk_decisions WHERE decision = 'BLOCKED'")
        blocked = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM risk_decisions WHERE severity = 'WARNING'")
        warnings = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM risk_decisions WHERE severity = 'CRITICAL'")
        critical = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM risk_decisions WHERE is_overridden = 1")
        overrides = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM risk_decisions WHERE account_mode = 'LIVE'")
        live_events = cursor.fetchone()[0]

        # Top blocking gates
        cursor.execute(
            """
            SELECT blocking_gate, COUNT(*) as cnt
            FROM risk_decisions
            WHERE blocking_gate != '' AND blocking_gate IS NOT NULL
            GROUP BY blocking_gate
            ORDER BY cnt DESC
            LIMIT 5
            """
        )
        top_gates = [{"gate": r[0], "count": r[1]} for r in cursor.fetchall()]

        approval_rate = round((approved / total * 100.0), 1) if total > 0 else 100.0

        return {
            "total_events": total,
            "approved_count": approved,
            "blocked_count": blocked,
            "warnings_count": warnings,
            "critical_count": critical,
            "overrides_count": overrides,
            "live_events_count": live_events,
            "approval_rate_pct": approval_rate,
            "top_blocking_gates": top_gates,
            "policy_version": "v3.4.1",
            "risk_engine_status": "HEALTHY",
            "kill_switch_state": "INACTIVE"
        }
    finally:
        conn.close()


def seed_canonical_risk_decisions():
    """Seeds rich, realistic pre-trade risk evaluation dossiers into risk_decisions."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM risk_decisions")
        if cursor.fetchone()[0] > 0:
            return
    finally:
        conn.close()

    now = datetime.now(timezone.utc)
    
    # 14 standard gates generator helper
    def make_14_gates(failing_gate=None, warning_gate=None):
        gates_meta = [
            ("1_data_freshness", "Data Freshness", 45.0, 2000.0, "ms", "Observed tick latency 45ms"),
            ("2_instrument_valid", "Instrument Validity", 1.0, 1.0, "bool", "Canonical symbol verified in master"),
            ("3_account_conn", "Account Connectivity", 1.0, 1.0, "bool", "API key authenticated & connected"),
            ("4_capital_avail", "Available Capital", 8500.0, 1000.0, "$", "Free cash collateral available"),
            ("5_quantity_sanity", "Quantity Validity", 0.05, 0.001, "lot", "Quantity exceeds minimum lot size"),
            ("6_position_size", "Position Size Safety", 2800.0, 3500.0, "$", "Position size within max bounds"),
            ("7_risk_per_trade", "Risk / Trade Limit", 0.50, 1.00, "% equity", "Planned stop loss risk $50.00"),
            ("8_leverage_bounds", "Leverage Envelope", 5.0, 10.0, "x", "Requested leverage 5x within cap"),
            ("9_margin_util", "Margin Utilization", 22.0, 35.0, "%", "Margin used after trade 22%"),
            ("10_daily_loss", "Daily Loss Limit", 0.4, 3.0, "%", "Current daily loss 0.4%"),
            ("11_drawdown_cap", "Max Drawdown Limit", 2.1, 15.0, "%", "Portfolio drawdown 2.1% from peak"),
            ("12_symbol_concentration", "Single-Asset Concentration", 32.0, 40.0, "%", "Asset concentration 32%"),
            ("13_portfolio_exposure", "Portfolio Exposure Limit", 45.0, 80.0, "%", "Gross portfolio exposure 45%"),
            ("14_kill_switch", "Emergency Kill Switch", 0.0, 1.0, "state", "Kill switch state is INACTIVE (NORMAL)")
        ]
        results = []
        for gid, name, obs, thresh, unit, msg in gates_meta:
            status = "PASS"
            reason = "OK"
            if gid == failing_gate:
                status = "FAIL"
                reason = "LIMIT_EXCEEDED"
                msg = f"Observed value ({obs}{unit}) breached policy threshold ({thresh}{unit})"
            elif gid == warning_gate:
                status = "WARNING"
                reason = "WARNING_ZONE"
                msg = f"Observed value ({obs}{unit}) entered warning zone ({thresh}{unit})"
            results.append({
                "gate_id": gid,
                "gate_name": name,
                "status": status,
                "observed_value": obs,
                "threshold_value": thresh,
                "unit": unit,
                "reason_code": reason,
                "message": msg
            })
        return results

    # Record 1: Approved BTC/USDT Scalp
    record_risk_decision(
        risk_event_id="RISK-20260820-10942",
        decision="APPROVED",
        severity="INFO",
        category="PRE_TRADE",
        symbol="BTC/USDT",
        bot_id="btc-scalper",
        plain_explanation="[FACT] Pre-order risk evaluation completed with 14/14 safety gates PASSED.\n[FACT] Planned risk per trade is $50.00 (0.50% equity) vs policy cap of 1.00%.\n[DERIVED] Margin utilization will increase from 18.0% to 22.4% (well below 35.0% limit).\n[EXPLANATION] Trade satisfies all position sizing, capital availability, and volatility constraints.",
        account_id="PAPER-01",
        account_mode="PAPER",
        instrument_id="BINANCE:BTC/USDT:SPOT",
        exchange="BINANCE",
        asset_class="Crypto",
        instrument_type="SPOT",
        bot_version="v2.4.1",
        strategy_id="EMA_MACD_VP",
        strategy_version="v3.2.1",
        correlation_id="corr_btc_942",
        order_intent_id="INTENT-8841",
        order_id="ORD-9912",
        policy_name="Conservative Intraday",
        policy_version="v3.4.1",
        risk_engine_version="v2.8.0",
        requested_quantity=0.075,
        requested_notional=4875.0,
        requested_risk_usd=50.0,
        requested_risk_pct=0.50,
        observed_value=0.50,
        threshold_value=1.00,
        threshold_unit="% equity",
        data_source="Binance Public WebSocket",
        data_age_ms=42,
        execution_status="SUBMITTED",
        execution_message="Order successfully submitted to execution router after risk verification",
        gates_evaluations=make_14_gates(),
        portfolio_before={"portfolio_exposure": 32000.0, "symbol_exposure": 8000.0, "margin_used_pct": 18.0, "capital_used": 3200.0},
        portfolio_after={"portfolio_exposure": 36875.0, "symbol_exposure": 12875.0, "margin_used_pct": 22.4, "capital_used": 3687.5},
        risk_delta={"capital_used_diff": 487.5, "symbol_exposure_diff": 4875.0, "margin_diff_pct": 4.4, "daily_risk_diff_pct": 0.50},
        timeline=[
            {"time": "08:59:28.902", "event": "Strategy Signal Generated (LONG, Confluence 84/100)"},
            {"time": "08:59:28.921", "event": "Order Intent INTENT-8841 created by btc-scalper"},
            {"time": "08:59:28.937", "event": "Universal Risk Engine evaluation initiated"},
            {"time": "08:59:28.951", "event": "14/14 Pre-trade Safety Gates PASSED"},
            {"time": "08:59:28.958", "event": "Risk Decision APPROVED (Decision ID DEC-8841)"},
            {"time": "08:59:28.966", "event": "Execution Router notified. Order ORD-9912 submitted"}
        ],
        evaluated_at=now.isoformat()
    )

    # Record 2: Blocked ETH/USDT Concentration
    record_risk_decision(
        risk_event_id="RISK-20260820-10943",
        decision="BLOCKED",
        severity="BLOCKED",
        category="CONCENTRATION",
        symbol="ETH/USDT",
        bot_id="eth-breakout",
        plain_explanation="[FACT] Existing ETH portfolio exposure is $3,200.00 (32.0% equity).\n[FACT] Proposed order requested additional $4,500.00, which would bring total ETH exposure to $7,700.00 (77.0%).\n[FACT] Configured Single-Asset Concentration Cap is $4,000.00 (40.0%).\n[DERIVED] Maximum additional exposure that would pass risk verification is $800.00 (approx 0.23 ETH).\n[EXPLANATION] Order was blocked to prevent excessive capital concentration. Action required: Reduce position size by at least $3,700.00.",
        account_id="PAPER-01",
        account_mode="PAPER",
        instrument_id="BINANCE:ETH/USDT:SPOT",
        exchange="BINANCE",
        asset_class="Crypto",
        instrument_type="SPOT",
        bot_version="v2.4.1",
        strategy_id="Breakout_Momentum",
        strategy_version="v2.1.0",
        correlation_id="corr_eth_943",
        order_intent_id="INTENT-8842",
        blocking_gate="Single-Asset Concentration",
        blocking_reason="Requested exposure ($7,700.00) exceeds single-asset cap ($4,000.00)",
        required_action="Reduce order size from 1.30 ETH to 0.23 ETH or increase portfolio equity.",
        max_passing_exposure=800.0,
        policy_name="Conservative Intraday",
        policy_version="v3.4.1",
        risk_engine_version="v2.8.0",
        requested_quantity=1.30,
        requested_notional=4500.0,
        requested_risk_usd=90.0,
        requested_risk_pct=0.90,
        observed_value=77.0,
        threshold_value=40.0,
        threshold_unit="% equity",
        data_source="Binance Public WebSocket",
        data_age_ms=58,
        execution_status="NOT_SUBMITTED",
        execution_message="Risk Engine rejected order prior to execution. No order reached broker.",
        gates_evaluations=make_14_gates(failing_gate="12_symbol_concentration"),
        portfolio_before={"portfolio_exposure": 32000.0, "symbol_exposure": 3200.0, "margin_used_pct": 22.0, "capital_used": 3200.0},
        portfolio_after={"portfolio_exposure": 36500.0, "symbol_exposure": 7700.0, "margin_used_pct": 31.0, "capital_used": 7700.0},
        risk_delta={"capital_used_diff": 4500.0, "symbol_exposure_diff": 4500.0, "margin_diff_pct": 9.0, "daily_risk_diff_pct": 0.90},
        timeline=[
            {"time": "08:58:12.100", "event": "Strategy Signal Generated (LONG Breakout, Confluence 79/100)"},
            {"time": "08:58:12.115", "event": "Order Intent INTENT-8842 created by eth-breakout"},
            {"time": "08:58:12.130", "event": "Universal Risk Engine evaluation initiated"},
            {"time": "08:58:12.148", "event": "Gate 12 (Single-Asset Concentration) FAILED: 77.0% > 40.0% max"},
            {"time": "08:58:12.155", "event": "Risk Decision BLOCKED. Defense action logged"},
            {"time": "08:58:12.160", "event": "Execution Status: NOT SUBMITTED. Bot notified with reduction advice"}
        ],
        evaluated_at=(now.replace(minute=max(0, now.minute - 5))).isoformat()
    )

    # Record 3: Margin Warning NIFTY CE Options
    record_risk_decision(
        risk_event_id="RISK-20260820-10944",
        decision="APPROVED_WITH_WARNING",
        severity="WARNING",
        category="MARGIN",
        symbol="NIFTY 25000 CE",
        bot_id="nifty-trend",
        plain_explanation="[FACT] Margin utilization crossed warning threshold of 30.0% (Current: 30.4%).\n[FACT] Hard margin stop cap is 35.0% (Remaining safe buffer: 4.6% collateral).\n[DERIVED] Free collateral remaining is ₹68,000 (68.0% of total capital).\n[EXPLANATION] Order was approved because hard cap was not breached, but trading has entered margin caution zone.",
        account_id="LIVE-ZERODHA-01",
        account_mode="LIVE",
        instrument_id="NSE_OPT_NIFTY_25000_CE",
        exchange="NSE",
        asset_class="Options",
        instrument_type="OPTIONS",
        bot_version="v3.1.0",
        strategy_id="Index_Options_Selling",
        strategy_version="v4.0.1",
        correlation_id="corr_nifty_944",
        order_intent_id="INTENT-8843",
        order_id="ORD-9915",
        blocking_gate="Margin Utilization",
        blocking_reason="Margin utilization entered caution band (30.4% vs 30.0% warning threshold)",
        required_action="Monitor collateral buffer. Do not add new leveraged option legs without closing delta hedges.",
        max_passing_exposure=4600.0,
        policy_name="Options Selling Delta-Neutral",
        policy_version="v3.4.1",
        risk_engine_version="v2.8.0",
        requested_quantity=50.0,
        requested_notional=125000.0,
        requested_risk_usd=350.0,
        requested_risk_pct=0.35,
        observed_value=30.4,
        threshold_value=30.0,
        threshold_unit="% margin",
        data_source="NSE Realtime Market Feed",
        data_age_ms=18,
        execution_status="SUBMITTED",
        execution_message="Order submitted to broker with active margin caution monitor",
        gates_evaluations=make_14_gates(warning_gate="9_margin_util"),
        portfolio_before={"portfolio_exposure": 850000.0, "symbol_exposure": 120000.0, "margin_used_pct": 26.2, "capital_used": 26200.0},
        portfolio_after={"portfolio_after": 975000.0, "symbol_exposure": 245000.0, "margin_used_pct": 30.4, "capital_used": 30400.0},
        risk_delta={"capital_used_diff": 4200.0, "symbol_exposure_diff": 125000.0, "margin_diff_pct": 4.2, "daily_risk_diff_pct": 0.35},
        timeline=[
            {"time": "08:55:00.050", "event": "Strategy Signal Generated (SELL CE Delta Hedge)"},
            {"time": "08:55:00.070", "event": "Order Intent INTENT-8843 created by nifty-trend"},
            {"time": "08:55:00.085", "event": "Universal Risk Engine evaluation initiated"},
            {"time": "08:55:00.098", "event": "Gate 9 (Margin Utilization) WARNED at 30.4% (Buffer 4.6%)"},
            {"time": "08:55:00.104", "event": "Risk Decision APPROVED_WITH_WARNING"},
            {"time": "08:55:00.112", "event": "Order ORD-9915 submitted to live broker"}
        ],
        evaluated_at=(now.replace(minute=max(0, now.minute - 15))).isoformat()
    )

    # Record 4: Blocked Data Freshness
    record_risk_decision(
        risk_event_id="RISK-20260820-10945",
        decision="BLOCKED",
        severity="CRITICAL",
        category="MARKET_DATA",
        symbol="SOL/USDT",
        bot_id="sol-scalper",
        plain_explanation="[FACT] Observed market price quote age is 8.4 seconds.\n[FACT] Configured Data Freshness Gate maximum latency is 2.0 seconds.\n[EXPLANATION] Universal Risk Engine rejected order because pricing cannot be safely verified during stale data conditions. Action required: Wait for WebSocket provider reconnection.",
        account_id="PAPER-01",
        account_mode="PAPER",
        instrument_id="BINANCE:SOL/USDT:SPOT",
        exchange="BINANCE",
        asset_class="Crypto",
        instrument_type="SPOT",
        bot_version="v2.4.1",
        strategy_id="EMA_MACD_VP",
        strategy_version="v3.2.1",
        correlation_id="corr_sol_945",
        order_intent_id="INTENT-8844",
        blocking_gate="Data Freshness",
        blocking_reason="Market data is stale (8.4s age > 2.0s limit)",
        required_action="Re-evaluate trade when provider market data stream returns to healthy state (< 200ms).",
        policy_name="Conservative Intraday",
        policy_version="v3.4.1",
        risk_engine_version="v2.8.0",
        requested_quantity=10.0,
        requested_notional=1850.0,
        requested_risk_usd=37.0,
        requested_risk_pct=0.37,
        observed_value=8400.0,
        threshold_value=2000.0,
        threshold_unit="ms",
        data_source="Binance Public WebSocket",
        data_age_ms=8400,
        execution_status="NOT_SUBMITTED",
        execution_message="Order blocked at pre-check. Stale feed prevented execution router submission.",
        gates_evaluations=make_14_gates(failing_gate="1_data_freshness"),
        portfolio_before={"portfolio_exposure": 32000.0, "symbol_exposure": 0.0, "margin_used_pct": 22.0, "capital_used": 3200.0},
        portfolio_after={"portfolio_exposure": 33850.0, "symbol_exposure": 1850.0, "margin_used_pct": 23.8, "capital_used": 3385.0},
        risk_delta={"capital_used_diff": 185.0, "symbol_exposure_diff": 1850.0, "margin_diff_pct": 1.8, "daily_risk_diff_pct": 0.37},
        timeline=[
            {"time": "08:50:22.010", "event": "Strategy Signal Generated (LONG SOL)"},
            {"time": "08:50:22.025", "event": "Order Intent INTENT-8844 created by sol-scalper"},
            {"time": "08:50:22.040", "event": "Gate 1 (Data Freshness) FAILED: Quote age 8,400ms > 2,000ms"},
            {"time": "08:50:22.045", "event": "Risk Decision BLOCKED. Order aborted before execution router"}
        ],
        evaluated_at=(now.replace(minute=max(0, now.minute - 30))).isoformat()
    )
    logger.info("Canonical Risk Decisions successfully seeded.")


def get_bot_instance(bot_id: str) -> Optional[Dict[str, Any]]:
    """Gets a bot instance by its unique ID."""
    bots = safe_query("SELECT * FROM bot_instances WHERE id = ?", (bot_id,))
    return bots[0] if bots else None


# ============================================================================
# SECURITY QUERY HELPERS
# ============================================================================

def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    """Fetches user record by username."""
    rows = safe_query("SELECT * FROM users WHERE username = ? AND is_active = 1", (username,))
    return rows[0] if rows else None


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Fetches user record by ID."""
    rows = safe_query("SELECT * FROM users WHERE id = ?", (user_id,))
    return rows[0] if rows else None


def upsert_user(user_dict: Dict[str, Any]) -> bool:
    """Inserts or updates a user record."""
    now_iso = datetime.now(timezone.utc).isoformat()
    return safe_execute(
        """
        INSERT INTO users (
            id, username, email, password_hash, salt, role, is_active,
            is_2fa_enabled, totp_secret_encrypted, passkeys_json, recovery_codes_json,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            email = excluded.email,
            password_hash = excluded.password_hash,
            salt = excluded.salt,
            role = excluded.role,
            is_active = excluded.is_active,
            is_2fa_enabled = excluded.is_2fa_enabled,
            totp_secret_encrypted = excluded.totp_secret_encrypted,
            passkeys_json = excluded.passkeys_json,
            recovery_codes_json = excluded.recovery_codes_json,
            updated_at = excluded.updated_at
        """,
        (
            user_dict["id"],
            user_dict["username"],
            user_dict["email"],
            user_dict["password_hash"],
            user_dict["salt"],
            user_dict.get("role", "ADMIN"),
            user_dict.get("is_active", 1),
            user_dict.get("is_2fa_enabled", 0),
            user_dict.get("totp_secret_encrypted", ""),
            user_dict.get("passkeys_json", "[]"),
            user_dict.get("recovery_codes_json", "[]"),
            user_dict.get("created_at", now_iso),
            now_iso,
        )
    )


def create_user_session(session_dict: Dict[str, Any]) -> bool:
    """Creates a new active user session."""
    now_iso = datetime.now(timezone.utc).isoformat()
    return safe_execute(
        """
        INSERT INTO user_sessions (
            session_id, user_id, token_hash, device_name, ip_address,
            user_agent, approximate_location, last_active_at, expires_at,
            is_revoked, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
        """,
        (
            session_dict["session_id"],
            session_dict["user_id"],
            session_dict["token_hash"],
            session_dict.get("device_name", "MacBook / Chrome"),
            session_dict.get("ip_address", "127.0.0.1"),
            session_dict.get("user_agent", ""),
            session_dict.get("approximate_location", "Indore, India"),
            session_dict.get("last_active_at", now_iso),
            session_dict["expires_at"],
            now_iso,
        )
    )


def get_user_session_by_token_hash(token_hash: str) -> Optional[Dict[str, Any]]:
    """Fetches active user session by token hash."""
    now_iso = datetime.now(timezone.utc).isoformat()
    rows = safe_query(
        """
        SELECT s.*, u.username, u.email, u.role, u.is_2fa_enabled
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token_hash = ? AND s.is_revoked = 0 AND s.expires_at > ?
        """,
        (token_hash, now_iso),
    )
    return rows[0] if rows else None


def update_session_activity(session_id: str) -> bool:
    """Updates session last active timestamp."""
    now_iso = datetime.now(timezone.utc).isoformat()
    return safe_execute("UPDATE user_sessions SET last_active_at = ? WHERE session_id = ?", (now_iso, session_id))


def revoke_session(session_id: str) -> bool:
    """Revokes a specific session."""
    return safe_execute("UPDATE user_sessions SET is_revoked = 1 WHERE session_id = ?", (session_id,))


def revoke_all_other_sessions(user_id: str, keep_session_id: str) -> bool:
    """Revokes all active sessions for a user except current."""
    return safe_execute("UPDATE user_sessions SET is_revoked = 1 WHERE user_id = ? AND session_id != ?", (user_id, keep_session_id))


def get_active_sessions_for_user(user_id: str) -> List[Dict[str, Any]]:
    """Returns all active sessions for user."""
    now_iso = datetime.now(timezone.utc).isoformat()
    return safe_query(
        """
        SELECT session_id, device_name, ip_address, approximate_location, last_active_at, expires_at, created_at
        FROM user_sessions
        WHERE user_id = ? AND is_revoked = 0 AND expires_at > ?
        ORDER BY last_active_at DESC
        """,
        (user_id, now_iso),
    )


def create_step_up_token(token_id: str, user_id: str, session_id: str, purpose: str, auth_method: str, expires_at: str) -> bool:
    """Creates a purpose-bound step-up token."""
    now_iso = datetime.now(timezone.utc).isoformat()
    return safe_execute(
        """
        INSERT INTO step_up_tokens (token_id, user_id, session_id, purpose, auth_method, expires_at, is_used, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?)
        """,
        (token_id, user_id, session_id, purpose, auth_method, expires_at, now_iso),
    )


def validate_and_consume_step_up(token_id: str, purpose: str) -> bool:
    """Validates and consumes a one-time step up token."""
    now_iso = datetime.now(timezone.utc).isoformat()
    rows = safe_query(
        "SELECT * FROM step_up_tokens WHERE token_id = ? AND purpose = ? AND is_used = 0 AND expires_at > ?",
        (token_id, purpose, now_iso),
    )
    if not rows:
        return False
    safe_execute("UPDATE step_up_tokens SET is_used = 1 WHERE token_id = ?", (token_id,))
    return True


def create_live_deployment_authorization(auth_dict: Dict[str, Any]) -> bool:
    """Creates an authoritative server-side live trading authorization."""
    now_iso = datetime.now(timezone.utc).isoformat()
    return safe_execute(
        """
        INSERT INTO live_deployment_authorizations (
            authorization_id, user_id, bot_id, account_id, strategy_version,
            max_capital, max_risk_pct, daily_loss_limit, auth_strength,
            issued_at, expires_at, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
        """,
        (
            auth_dict["authorization_id"],
            auth_dict["user_id"],
            auth_dict["bot_id"],
            auth_dict.get("account_id", "BINANCE-LIVE-01"),
            auth_dict.get("strategy_version", "v1.0.0"),
            auth_dict.get("max_capital", 5000.0),
            auth_dict.get("max_risk_pct", 0.5),
            auth_dict.get("daily_loss_limit", 2.0),
            auth_dict.get("auth_strength", "PASSKEY_OR_2FA"),
            auth_dict.get("issued_at", now_iso),
            auth_dict["expires_at"],
            now_iso,
        )
    )


def get_active_live_authorization(bot_id: str) -> Optional[Dict[str, Any]]:
    """Checks if a bot has an active server-side live authorization."""
    now_iso = datetime.now(timezone.utc).isoformat()
    rows = safe_query(
        """
        SELECT * FROM live_deployment_authorizations
        WHERE bot_id = ? AND status = 'ACTIVE' AND expires_at > ?
        ORDER BY issued_at DESC LIMIT 1
        """,
        (bot_id, now_iso),
    )
    return rows[0] if rows else None


def revoke_live_authorizations_for_bot(bot_id: str) -> bool:
    """Revokes all live authorizations for a bot."""
    return safe_execute("UPDATE live_deployment_authorizations SET status = 'REVOKED' WHERE bot_id = ?", (bot_id,))


def revoke_all_live_authorizations() -> bool:
    """Emergency lock revoking all live authorizations."""
    return safe_execute("UPDATE live_deployment_authorizations SET status = 'EMERGENCY_LOCKED' WHERE status = 'ACTIVE'")


def log_security_audit_event(
    action: str,
    actor_user_id: str = "usr_admin",
    actor_role: str = "ADMIN",
    resource_type: str = "SYSTEM",
    resource_id: str = "",
    result: str = "SUCCESS",
    assurance_level: str = "LEVEL_0_READ_ONLY",
    ip_address: str = "127.0.0.1",
    user_agent: str = "",
    details: Optional[Dict[str, Any]] = None,
    request_id: str = ""
) -> str:
    """Logs an immutable security audit event."""
    event_id = f"sec-{uuid.uuid4().hex[:12]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    details_str = json.dumps(details or {})

    safe_execute(
        """
        INSERT INTO security_audit_events (
            event_id, timestamp_utc, actor_user_id, actor_role, action,
            resource_type, resource_id, result, assurance_level, ip_address,
            user_agent, details_json, request_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            event_id,
            now_iso,
            actor_user_id,
            actor_role,
            action,
            resource_type,
            resource_id,
            result,
            assurance_level,
            ip_address,
            user_agent,
            details_str,
            request_id,
            now_iso,
        )
    )
    return event_id


def get_security_audit_events(limit: int = 50, action_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    """Fetches paginated security audit history."""
    if action_filter and action_filter != "ALL":
        return safe_query(
            "SELECT * FROM security_audit_events WHERE action = ? ORDER BY timestamp_utc DESC LIMIT ?",
            (action_filter, limit),
        )
    return safe_query("SELECT * FROM security_audit_events ORDER BY timestamp_utc DESC LIMIT ?", (limit,))


def create_security_alert(severity: str, category: str, title: str, description: str) -> str:
    """Creates a high-visibility security alert."""
    alert_id = f"salert-{uuid.uuid4().hex[:8]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    safe_execute(
        """
        INSERT INTO security_alerts (alert_id, timestamp_utc, severity, category, title, description, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
        """,
        (alert_id, now_iso, severity, category, title, description, now_iso),
    )
    return alert_id


def get_active_security_alerts() -> List[Dict[str, Any]]:
    """Returns active security alerts."""
    return safe_query("SELECT * FROM security_alerts WHERE status = 'ACTIVE' ORDER BY timestamp_utc DESC")


def resolve_security_alert(alert_id: str) -> bool:
    """Resolves a security alert."""
    return safe_execute("UPDATE security_alerts SET status = 'RESOLVED' WHERE alert_id = ?", (alert_id,))














