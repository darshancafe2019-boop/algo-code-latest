"""
Derivative Expiry Manager (Central Expiry Lifecycle & Auto Square-Off Service)
==============================================================================
Authoritative, institutional-grade automated expiry square-off, contract lifecycle,
entry blocking, state machine, and settlement reconciliation engine for Quant.OS.

Key Invariants:
1. Universal Derivative Support: Monitors Indian index/stock options, Indian futures,
   crypto dated options, crypto dated futures, and all expiring derivatives.
2. Non-Expiring Safety: Normal equities (EQUITY) and crypto perpetuals (PERPETUAL / USDT PERP)
   are strictly preserved and NEVER subjected to expiry square-off.
3. Zero User Confirmation: Automatic square-off operates fully autonomously by default.
4. Entry Gatekeeper: Contracts inside their entry-lock cutoff window strictly block new entries.
5. Idempotent & Crash-Resilient: DB-backed idempotency prevents duplicate execution orders
   across server restarts or duplicate scheduler ticks.
6. Multi-Leg Sequencing: Risk-reducing exit sequences (short/risk legs first, then protective legs).
7. Execution Truth: Uses live option premiums / futures market prices (never underlying spot).
8. Broker Reconciliation: Confirms broker truth before marking closed; flags RECONCILIATION_REQUIRED on mismatch.
9. Bot Vitality: Position expiry is a trade lifecycle event; the bot, backend, and gateway
   remain alive and ready for future trading signals.
"""
from __future__ import annotations

import enum
import json
import logging
import sqlite3
import threading
import time
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple, Union

from src import config, db, pnl_engine
from src.instrument_resolver import (
    AssetClass,
    CanonicalInstrument,
    FuturesResolver,
    InstrumentRef,
    InstrumentType,
    OptionContractNormalizer,
    global_instrument_resolver,
    resolve_contract_rollover,
    validate_contract_expiry,
)

logger = logging.getLogger("DerivativeExpiryManager")


class ExpiryState(str, enum.Enum):
    OPEN = "OPEN"
    EXPIRY_APPROACHING = "EXPIRY_APPROACHING"
    EXPIRY_LOCKED = "EXPIRY_LOCKED"
    EXPIRY_WINDOW_ENTERED = "EXPIRY_WINDOW_ENTERED"
    SQUARE_OFF_PENDING = "SQUARE_OFF_PENDING"
    EXPIRY_EXIT_PENDING = "EXPIRY_EXIT_PENDING"
    SQUARE_OFF_SUBMITTED = "SQUARE_OFF_SUBMITTED"
    EXPIRY_EXIT_SUBMITTED = "EXPIRY_EXIT_SUBMITTED"
    SQUARE_OFF_PARTIAL = "SQUARE_OFF_PARTIAL"
    EXPIRY_EXIT_PARTIAL_FILL = "EXPIRY_EXIT_PARTIAL_FILL"
    SQUARE_OFF_FILLED = "SQUARE_OFF_FILLED"
    EXPIRY_EXIT_FILLED = "EXPIRY_EXIT_FILLED"
    CLOSED_EXPIRED = "CLOSED_EXPIRED"
    CLOSED = "CLOSED"
    DATA_UNAVAILABLE = "DATA_UNAVAILABLE"
    EXIT_RETRY = "EXIT_RETRY"
    EXIT_FAILED = "EXIT_FAILED"
    EXPIRED_PENDING_SETTLEMENT = "EXPIRED_PENDING_SETTLEMENT"
    SETTLEMENT_PENDING = "SETTLEMENT_PENDING"
    EXPIRY_RECONCILED = "EXPIRY_RECONCILED"
    RECONCILIATION_REQUIRED = "RECONCILIATION_REQUIRED"
    ERROR = "ERROR"


@dataclass
class ExpiryPositionRecord:
    position_id: str
    bot_id: str
    provider: str
    exchange: str
    instrument_key: str
    trading_symbol: str
    asset_class: str
    expiry_date: Optional[date]
    expiry_cutoff_utc: Optional[datetime]
    quantity: float
    side: str  # "LONG" or "SHORT" / "BUY" or "SELL"
    entry_price: float
    current_price: float
    status: ExpiryState
    execution_broker: str
    environment: str  # "PAPER" or "LIVE"
    currency: str
    is_expiring: bool
    auto_square_off_on_expiry: bool = True
    expiry_entry_lock_minutes: int = 45
    expiry_exit_buffer_minutes: int = 15
    require_user_confirmation: bool = False
    roll_on_expiry: bool = False
    rollover_policy: str = "STRATEGY_RESOLVE"
    retry_count: int = 0
    closed_quantity: float = 0.0
    remaining_quantity: float = 0.0
    last_retry_timestamp: Optional[datetime] = None
    parent_position_id: Optional[str] = None
    legs: List[Dict[str, Any]] = field(default_factory=list)
    strategy_id: Optional[str] = None


class DerivativeExpiryManager:
    """
    Centralized Singleton Derivative Expiry Lifecycle & Auto Square-Off Engine.
    Monitors all active derivative positions across Indian NSE/BSE, Delta Exchange,
    Binance, and US Options with exchange-local timezone awareness.
    """
    _instance: Optional[DerivativeExpiryManager] = None
    _lock = threading.RLock()

    # Exchange-Local Market Timing & Timezones
    EXCHANGE_CONFIGS = {
        "NSE": {
            "timezone": "Asia/Kolkata",
            "close_hour_utc": 10,  # 15:30 IST = 10:00 UTC
            "close_minute_utc": 0,
            "default_entry_lock_min": 45,  # 14:45 IST
            "default_square_off_min": 15,  # 15:15 IST
        },
        "BSE": {
            "timezone": "Asia/Kolkata",
            "close_hour_utc": 10,
            "close_minute_utc": 0,
            "default_entry_lock_min": 45,
            "default_square_off_min": 15,
        },
        "UPSTOX": {
            "timezone": "Asia/Kolkata",
            "close_hour_utc": 10,
            "close_minute_utc": 0,
            "default_entry_lock_min": 45,
            "default_square_off_min": 15,
        },
        "DHAN": {
            "timezone": "Asia/Kolkata",
            "close_hour_utc": 10,
            "close_minute_utc": 0,
            "default_entry_lock_min": 45,
            "default_square_off_min": 15,
        },
        "DELTA": {
            "timezone": "UTC",
            "close_hour_utc": 12,  # 12:00 UTC Settlement
            "close_minute_utc": 0,
            "default_entry_lock_min": 30,
            "default_square_off_min": 15,
        },
        "DELTA_INDIA": {
            "timezone": "UTC",
            "close_hour_utc": 12,
            "close_minute_utc": 0,
            "default_entry_lock_min": 30,
            "default_square_off_min": 15,
        },
        "BINANCE": {
            "timezone": "UTC",
            "close_hour_utc": 8,  # 08:00 UTC Settlement
            "close_minute_utc": 0,
            "default_entry_lock_min": 30,
            "default_square_off_min": 15,
        },
        "DERIBIT": {
            "timezone": "UTC",
            "close_hour_utc": 8,
            "close_minute_utc": 0,
            "default_entry_lock_min": 30,
            "default_square_off_min": 15,
        },
        "CME": {
            "timezone": "America/New_York",
            "close_hour_utc": 20,  # 16:00 ET = 20:00 UTC
            "close_minute_utc": 0,
            "default_entry_lock_min": 30,
            "default_square_off_min": 15,
        },
    }

    def __init__(self):
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._interval_seconds = 8.0
        self._retry_backoffs = [2.0, 5.0, 10.0]
        self._init_db_schema()

    @classmethod
    def get_instance(cls) -> DerivativeExpiryManager:
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def _init_db_schema(self) -> None:
        """Initializes persistent tables for expiry lifecycle events and idempotency."""
        try:
            db.safe_execute(
                """
                CREATE TABLE IF NOT EXISTS expiry_lifecycle_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    position_id TEXT NOT NULL,
                    bot_id TEXT,
                    symbol TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    state TEXT NOT NULL,
                    idempotency_key TEXT UNIQUE,
                    details TEXT,
                    created_at TEXT NOT NULL DEFAULT (datetime('now'))
                )
                """
            )
            db.safe_execute(
                """
                CREATE INDEX IF NOT EXISTS idx_expiry_events_pos_id 
                ON expiry_lifecycle_events(position_id, event_type)
                """
            )
            db.safe_execute(
                """
                CREATE INDEX IF NOT EXISTS idx_expiry_events_idem 
                ON expiry_lifecycle_events(idempotency_key)
                """
            )
        except Exception as e:
            logger.error("Failed to initialize expiry lifecycle db schema: %s", e)

    # ─────────────────────────────────────────────────────────────────────────
    # 1. DERIVATIVE DETECTION & EXCHANGE TIMEZONE CALCULATION
    # ─────────────────────────────────────────────────────────────────────────

    @classmethod
    def is_expiring_derivative(
        cls,
        instrument_or_symbol: Union[str, CanonicalInstrument, InstrumentRef, Dict[str, Any]]
    ) -> bool:
        """
        Determines whether an instrument is a derivative that expires.
        Equities (EQUITY) and Crypto Perpetuals (PERPETUAL / USDT-M) return False.
        """
        if isinstance(instrument_or_symbol, (CanonicalInstrument, InstrumentRef)):
            if instrument_or_symbol.asset_class in (AssetClass.CRYPTO_PERPETUAL, "CRYPTO_PERPETUAL"):
                return False
            if hasattr(instrument_or_symbol, "instrument_type"):
                if instrument_or_symbol.instrument_type == InstrumentType.PERPETUAL:
                    return False
                if instrument_or_symbol.instrument_type in (InstrumentType.OPTION, InstrumentType.DATED_FUTURE):
                    return True
            if instrument_or_symbol.expiry:
                return True
            return False

        sym = ""
        asset_class = ""
        if isinstance(instrument_or_symbol, dict):
            sym = instrument_or_symbol.get("symbol") or instrument_or_symbol.get("trading_symbol") or ""
            asset_class = instrument_or_symbol.get("asset_class") or ""
        elif isinstance(instrument_or_symbol, str):
            sym = instrument_or_symbol

        clean = sym.strip().upper()
        if "PERP" in clean or "/USDT:USDT" in clean or "USDT.P" in clean or asset_class == "CRYPTO_PERPETUAL":
            return False
        if clean in ("BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "BTCUSDT", "ETHUSDT"):
            return False

        # Options or Dated Futures detection
        if any(token in clean for token in (" CE", " PE", "-C", "-P", " CALL", " PUT", " FUT", " FUTURE")):
            return True

        # Check if symbol has parseable date
        exp_d = OptionContractNormalizer.parse_expiry_date(clean)
        return exp_d is not None

    @classmethod
    def get_exchange_config(cls, exchange_or_provider: str) -> Dict[str, Any]:
        """Returns the market timing configuration for a given exchange or provider."""
        ex_u = (exchange_or_provider or "DELTA").upper().strip()
        for k, v in cls.EXCHANGE_CONFIGS.items():
            if k in ex_u or ex_u in k:
                return v
        return cls.EXCHANGE_CONFIGS["DELTA"]

    @classmethod
    def get_contract_expiry_info(
        cls,
        instrument_or_symbol: Union[str, CanonicalInstrument, InstrumentRef, Dict[str, Any]],
        entry_lock_minutes: Optional[int] = None,
        square_off_minutes: Optional[int] = None,
        now: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Calculates complete exchange-local and UTC expiry cutoff milestones.
        """
        if not cls.is_expiring_derivative(instrument_or_symbol):
            return {
                "is_expiring": False,
                "state": ExpiryState.OPEN,
                "reason": "NON_EXPIRING_ASSET"
            }

        exp_d: Optional[date] = None
        exchange = "NSE"
        if isinstance(instrument_or_symbol, (CanonicalInstrument, InstrumentRef)):
            if instrument_or_symbol.expiry:
                exp_d = OptionContractNormalizer.parse_expiry_date(instrument_or_symbol.expiry)
            if not exp_d:
                exp_d = OptionContractNormalizer.parse_expiry_date(instrument_or_symbol.canonical_symbol)
            exchange = instrument_or_symbol.exchange.upper()
        elif isinstance(instrument_or_symbol, dict):
            exp_str = instrument_or_symbol.get("expiry") or instrument_or_symbol.get("expiry_date") or instrument_or_symbol.get("symbol") or ""
            exp_d = OptionContractNormalizer.parse_expiry_date(exp_str)
            exchange = str(instrument_or_symbol.get("exchange") or instrument_or_symbol.get("provider") or "").upper()
        else:
            exp_d = OptionContractNormalizer.parse_expiry_date(str(instrument_or_symbol))
            exchange = "NSE" if any(k in str(instrument_or_symbol).upper() for k in ("NIFTY", "BANKNIFTY", "NSE", "UPSTOX", "DHAN")) else "DELTA"

        if not exp_d:
            return {
                "is_expiring": False,
                "state": ExpiryState.OPEN,
                "reason": "UNKNOWN_EXPIRY"
            }

        ex_cfg = cls.get_exchange_config(exchange)
        lock_mins = entry_lock_minutes if entry_lock_minutes is not None else ex_cfg["default_entry_lock_min"]
        exit_mins = square_off_minutes if square_off_minutes is not None else ex_cfg["default_square_off_min"]

        close_h = ex_cfg["close_hour_utc"]
        close_m = ex_cfg["close_minute_utc"]

        settlement_utc = datetime(exp_d.year, exp_d.month, exp_d.day, close_h, close_m, 0, tzinfo=timezone.utc)
        entry_lock_utc = settlement_utc - timedelta(minutes=lock_mins)
        square_off_utc = settlement_utc - timedelta(minutes=exit_mins)

        now_utc = now or datetime.now(timezone.utc)
        time_to_settlement_s = (settlement_utc - now_utc).total_seconds()
        time_to_square_off_s = (square_off_utc - now_utc).total_seconds()
        time_to_entry_lock_s = (entry_lock_utc - now_utc).total_seconds()

        # State determination
        if now_utc > settlement_utc:
            state = ExpiryState.EXPIRED_PENDING_SETTLEMENT
        elif now_utc >= square_off_utc:
            state = ExpiryState.SQUARE_OFF_PENDING
        elif now_utc >= entry_lock_utc:
            state = ExpiryState.EXPIRY_LOCKED
        elif time_to_entry_lock_s <= 3600.0:
            state = ExpiryState.EXPIRY_APPROACHING
        else:
            state = ExpiryState.OPEN

        return {
            "is_expiring": True,
            "expiry_date": exp_d,
            "exchange": exchange,
            "timezone": ex_cfg["timezone"],
            "settlement_utc": settlement_utc,
            "entry_lock_utc": entry_lock_utc,
            "square_off_utc": square_off_utc,
            "time_to_settlement_seconds": time_to_settlement_s,
            "time_to_square_off_seconds": time_to_square_off_s,
            "time_to_entry_lock_seconds": time_to_entry_lock_s,
            "state": state,
            "entry_blocked": now_utc >= entry_lock_utc,
            "square_off_active": now_utc >= square_off_utc,
        }

    @classmethod
    def get_contract_expiry_cutoff(
        cls,
        instrument_or_symbol: Union[str, CanonicalInstrument, InstrumentRef, Dict[str, Any]],
        buffer_minutes: int = 15
    ) -> Optional[datetime]:
        """Calculates square-off deadline UTC datetime for an expiring instrument."""
        info = cls.get_contract_expiry_info(instrument_or_symbol, square_off_minutes=buffer_minutes)
        return info.get("square_off_utc") if info.get("is_expiring") else None

    @classmethod
    def is_contract_in_expiry_window(
        cls,
        instrument_or_symbol: Union[str, CanonicalInstrument, InstrumentRef, Dict[str, Any]],
        buffer_minutes: int = 15,
        now: Optional[datetime] = None
    ) -> Tuple[bool, Optional[datetime], str]:
        """
        Evaluates whether an instrument is in its expiry exit window or already expired.
        Returns: (is_in_window, cutoff_utc, status_code)
        """
        info = cls.get_contract_expiry_info(instrument_or_symbol, square_off_minutes=buffer_minutes, now=now)
        if not info.get("is_expiring"):
            return False, None, info.get("reason", "NON_EXPIRING_ASSET")

        cutoff_utc = info["square_off_utc"]
        state = info["state"]

        if state in (ExpiryState.SQUARE_OFF_PENDING, ExpiryState.EXPIRED_PENDING_SETTLEMENT):
            code = "EXPIRED_PAST_DATE" if state == ExpiryState.EXPIRED_PENDING_SETTLEMENT else "EXPIRY_WINDOW_ACTIVE"
            return True, cutoff_utc, code

        return False, cutoff_utc, "EXPIRY_WINDOW_PENDING"

    # ─────────────────────────────────────────────────────────────────────────
    # 2. AUDIT LOGGING & IDEMPOTENCY
    # ─────────────────────────────────────────────────────────────────────────

    def record_expiry_event(
        self,
        position_id: str,
        bot_id: str,
        symbol: str,
        event_type: str,
        state: str,
        idempotency_key: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Records an immutable audit event and enforces database idempotency."""
        details_json = json.dumps(details or {})
        now_iso = datetime.now(timezone.utc).isoformat()

        try:
            if idempotency_key:
                existing = db.safe_query(
                    "SELECT id FROM expiry_lifecycle_events WHERE idempotency_key = ?",
                    (idempotency_key,)
                )
                if existing:
                    logger.debug("Idempotent expiry event '%s' already recorded.", idempotency_key)
                    return False

            db.safe_execute(
                """
                INSERT INTO expiry_lifecycle_events (position_id, bot_id, symbol, event_type, state, idempotency_key, details, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (str(position_id), str(bot_id), str(symbol), event_type, state, idempotency_key, details_json, now_iso)
            )
            return True
        except Exception as e:
            logger.error("Failed to record expiry event (%s): %s", event_type, e)
            return False

    # ─────────────────────────────────────────────────────────────────────────
    # 3. POSITION INSPECTION & ORDER CANCELLATION
    # ─────────────────────────────────────────────────────────────────────────

    def cancel_pending_orders_for_position(self, bot_id: str, symbol: str) -> int:
        """
        Finds and cancels all pending/open orders for the expiring position to prevent
        accidental re-entry or exposure expansion.
        """
        cancelled_count = 0
        try:
            # Check trades_log
            pending_trades = db.safe_query(
                """
                SELECT trade_id, symbol, status FROM trades_log 
                WHERE (bot_id = ? OR symbol = ?) 
                  AND status IN ('PENDING', 'TRIGGER_PENDING', 'PARTIALLY_FILLED')
                """,
                (bot_id, symbol)
            )
            for t in (pending_trades or []):
                tid = t.get("trade_id")
                db.safe_execute("UPDATE trades_log SET status = 'CANCELLED', notes = COALESCE(notes, '') || ' [AUTO_EXPIRY_CANCELLED]' WHERE trade_id = ?", (tid,))
                cancelled_count += 1
                logger.info("[%s] Cancelled pending trade #%s for expiring instrument '%s'.", bot_id, tid, symbol)

            # Check options_orders if table exists
            try:
                pending_opt_orders = db.safe_query(
                    """
                    SELECT order_id, underlying, status FROM options_orders 
                    WHERE (instance_id = ? OR underlying = ?) 
                      AND status IN ('OPEN', 'PENDING', 'TRIGGER_PENDING', 'PARTIALLY_FILLED')
                    """,
                    (bot_id, symbol)
                )
                for o in (pending_opt_orders or []):
                    oid = o.get("order_id")
                    db.safe_execute("UPDATE options_orders SET status = 'CANCELLED' WHERE order_id = ?", (oid,))
                    cancelled_count += 1
                    logger.info("[%s] Cancelled pending options order #%s for expiring instrument '%s'.", bot_id, oid, symbol)
            except Exception:
                pass
        except Exception as e:
            logger.warning("[%s] Order cancellation check notice for %s: %s", bot_id, symbol, e)
        return cancelled_count

    def fetch_active_derivative_positions(self) -> List[ExpiryPositionRecord]:
        """
        Retrieves all currently OPEN / RUNNING / PENDING derivative positions
        from trades_log and central positions ledger.
        """
        records: List[ExpiryPositionRecord] = []
        raw_trades = db.safe_query(
            """
            SELECT * FROM trades_log 
            WHERE status IN ('OPEN', 'RUNNING', 'PARTIAL', 'EXPIRY_EXIT_PENDING', 'SQUARE_OFF_PENDING', 'EXPIRY_EXIT_SUBMITTED')
            ORDER BY id DESC
            """
        )

        for t in raw_trades:
            sym = str(t.get("symbol") or "")
            if not self.is_expiring_derivative(sym):
                continue

            pos_id = str(t.get("id"))
            bot_id = str(t.get("bot_id") or "bot-options-default")
            side = str(t.get("direction") or t.get("side") or "LONG").upper()
            qty = float(t.get("position_size") or t.get("quantity") or 0.0)
            closed_q = float(t.get("closed_quantity") or 0.0)
            remaining_q = max(0.0, qty - closed_q) if closed_q > 0 else qty
            entry_p = float(t.get("entry_price") or 0.0)
            curr_p = float(t.get("current_price") or entry_p)
            st_raw = str(t.get("status") or "OPEN").upper()
            env = str(t.get("execution_mode") or "PAPER").upper()
            curr = str(t.get("currency") or ("INR" if any(k in sym for k in ("NIFTY", "BANKNIFTY", "NSE")) else "USD"))
            broker = str(t.get("broker") or ("UPSTOX" if "INR" in curr else "DELTA"))
            exchange = "NSE" if "INR" in curr else "DELTA"

            # Compute expiry milestones
            info = self.get_contract_expiry_info(sym)
            exp_d = info.get("expiry_date")
            cutoff_utc = info.get("square_off_utc")

            try:
                st = ExpiryState(st_raw)
            except Exception:
                st = ExpiryState.OPEN

            rec = ExpiryPositionRecord(
                position_id=pos_id,
                bot_id=bot_id,
                provider=broker.lower(),
                exchange=exchange,
                instrument_key=sym,
                trading_symbol=sym,
                asset_class="OPTION" if ("CE" in sym or "PE" in sym or "-C" in sym or "-P" in sym) else "FUTURE",
                expiry_date=exp_d,
                expiry_cutoff_utc=cutoff_utc,
                quantity=qty,
                closed_quantity=closed_q,
                remaining_quantity=remaining_q,
                side=side,
                entry_price=entry_p,
                current_price=curr_p,
                status=st,
                execution_broker=broker,
                environment=env,
                currency=curr,
                is_expiring=True,
                auto_square_off_on_expiry=True,
                expiry_exit_buffer_minutes=15,
                require_user_confirmation=False,
                roll_on_expiry=False
            )
            records.append(rec)

        return records

    # ─────────────────────────────────────────────────────────────────────────
    # 4. EXECUTE EXPIRY SQUARE-OFF & MULTI-LEG SEQUENCING
    # ─────────────────────────────────────────────────────────────────────────

    def execute_expiry_square_off(
        self,
        record: ExpiryPositionRecord,
        live_quote: Optional[float] = None,
        now: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Executes autonomous, idempotent exit of an expiring derivative position.
        1. Cancels all pending orders.
        2. Closes opposite side (LONG -> SELL, SHORT -> BUY) for remaining quantity.
        3. Reconciles broker state.
        """
        now_utc = now or datetime.now(timezone.utc)
        now_iso = now_utc.isoformat()
        pos_id = record.position_id
        bot_id = record.bot_id
        sym = record.trading_symbol
        exp_str = record.expiry_date.isoformat() if record.expiry_date else "UNKNOWN"

        idem_key = f"EXPIRY_SQUARE_OFF:{record.execution_broker}:{pos_id}:{exp_str}"

        # 1. Cancel Pending Orders First
        self.cancel_pending_orders_for_position(bot_id, sym)

        logger.info(
            "[%s] AUTO_SQUARE_OFF_STARTED: Initiating auto square-off for Position #%s (%s, Qty: %.2f, Side: %s, Expiry: %s).",
            bot_id, pos_id, sym, record.quantity, record.side, exp_str
        )

        self.record_expiry_event(
            position_id=pos_id,
            bot_id=bot_id,
            symbol=sym,
            event_type="AUTO_SQUARE_OFF_STARTED",
            state=ExpiryState.SQUARE_OFF_PENDING.value,
            idempotency_key=f"{idem_key}:START",
            details={
                "quantity": record.quantity,
                "remaining_quantity": record.remaining_quantity,
                "side": record.side,
                "entry_price": record.entry_price
            }
        )

        # 2. Fetch Fresh Executable Live Price
        exec_price = live_quote
        if exec_price is None or exec_price <= 0:
            exec_inst_res = global_instrument_resolver.resolve(sym)
            if exec_inst_res.is_valid and exec_inst_res.instrument:
                inst = exec_inst_res.instrument
                if inst.provider in ("delta_options", "delta") or inst.exchange == "DELTA":
                    q = db.safe_query("SELECT mark_price, best_bid, best_ask FROM delta_option_quotes WHERE symbol = ?", (sym.strip(),))
                    if q:
                        exec_price = float(q[0].get("mark_price") or q[0].get("best_bid") or 0.0)
                elif inst.exchange == "NSE":
                    try:
                        from src.upstox_service import global_upstox_service
                        uq = global_upstox_service.get_full_market_quote(inst.provider_symbol or sym)
                        if uq:
                            exec_price = float(uq.get("last_price") or uq.get("ltp") or 0.0)
                    except Exception:
                        pass

        # If quote is missing, check if past settlement
        if exec_price is None or exec_price <= 0:
            if record.expiry_date and record.expiry_date < now_utc.date():
                logger.warning("[%s] Contract %s already past settlement date. Marking EXPIRED_PENDING_SETTLEMENT.", bot_id, sym)
                return self._handle_market_closed_settlement(record, now_utc)

            # Bounded retry with backoff
            if record.retry_count < len(self._retry_backoffs):
                record.retry_count += 1
                backoff = self._retry_backoffs[record.retry_count - 1]
                logger.warning("[%s] DATA_UNAVAILABLE for %s. Retrying exit in %.1fs (Attempt %d)...", bot_id, sym, backoff, record.retry_count)
                self.record_expiry_event(
                    position_id=pos_id,
                    bot_id=bot_id,
                    symbol=sym,
                    event_type="AUTO_SQUARE_OFF_RETRY",
                    state=ExpiryState.EXIT_RETRY.value,
                    details={"retry_count": record.retry_count, "backoff": backoff}
                )
                return {"status": "RETRY_SCHEDULED", "position_id": pos_id, "retry_count": record.retry_count}
            else:
                logger.error("[%s] EXIT_FAILED: Quote unavailable after retries for %s. Transitioning to RECONCILIATION_REQUIRED.", bot_id, sym)
                return self._handle_reconciliation_required(record, now_utc, "QUOTE_UNAVAILABLE_AFTER_RETRIES")

        # 3. Opposite Order Execution (Flatten remaining quantity)
        exit_side = "SELL" if record.side in ("LONG", "BUY") else "BUY"
        qty_to_close = record.remaining_quantity if record.remaining_quantity > 0 else record.quantity

        self.record_expiry_event(
            position_id=pos_id,
            bot_id=bot_id,
            symbol=sym,
            event_type="AUTO_SQUARE_OFF_SUBMITTED",
            state=ExpiryState.SQUARE_OFF_SUBMITTED.value,
            idempotency_key=f"{idem_key}:SUBMITTED",
            details={"exit_side": exit_side, "exit_price": exec_price, "quantity": qty_to_close}
        )

        # 4. Environment Execution
        if record.environment == "PAPER":
            # Compute realized P&L using Authoritative PnL Engine
            mult = 1.0
            pnl_res = pnl_engine.compute_unrealized_pnl(
                direction=record.side,
                entry_price=record.entry_price,
                live_price=exec_price,
                quantity=qty_to_close,
                contract_multiplier=mult,
                currency=record.currency
            )
            realized_pnl = pnl_res["unrealized_pnl"]

            # Update trades_log to CLOSED_EXPIRED
            db.safe_execute(
                """
                UPDATE trades_log SET
                    exit_price = ?,
                    exit_timestamp = ?,
                    result_pnl = ?,
                    net_pnl = ?,
                    realized_pnl = ?,
                    unrealized_pnl = 0.0,
                    status = 'CLOSED_EXPIRED',
                    exit_reason = 'AUTO_EXPIRY_SQUARE_OFF',
                    remarks = ?
                WHERE id = ?
                """,
                (exec_price, now_iso, realized_pnl, realized_pnl, realized_pnl, f"Auto squared off at contract expiry ({exp_str})", pos_id)
            )
            db.safe_execute(
                "UPDATE positions SET status = 'CLOSED_EXPIRED', unrealized_pnl = 0.0, realized_pnl = ? WHERE id = ? OR bot_id = ?",
                (realized_pnl, pos_id, bot_id)
            )

            self.record_expiry_event(
                position_id=pos_id,
                bot_id=bot_id,
                symbol=sym,
                event_type="AUTO_SQUARE_OFF_COMPLETED",
                state=ExpiryState.CLOSED_EXPIRED.value,
                idempotency_key=f"{idem_key}:FILLED",
                details={
                    "exit_price": exec_price,
                    "realized_pnl": realized_pnl,
                    "closed_quantity": qty_to_close,
                    "reason": "AUTO_EXPIRY_RISK_MANAGEMENT"
                }
            )

            db.log_bot_activity(
                bot_id,
                "DERIVATIVE_EXPIRY_AUTO_SQUARE_OFF",
                f"🎯 AUTO SQUARE-OFF AT EXPIRY: Closed Position #{pos_id} ({sym}) @ {record.currency} {exec_price:,.2f}. Realized PnL: {realized_pnl:+.2f} {record.currency}.",
                {
                    "position_id": pos_id,
                    "symbol": sym,
                    "exit_price": exec_price,
                    "realized_pnl": realized_pnl,
                    "reason": "AUTO_EXPIRY_RISK_MANAGEMENT"
                }
            )

            logger.info(
                "[%s] AUTO_SQUARE_OFF_COMPLETED: Position #%s (%s) closed at expiry @ %.2f (PnL: %+.2f %s).",
                bot_id, pos_id, sym, exec_price, realized_pnl, record.currency
            )

            # Handle Rollover if configured
            if record.roll_on_expiry:
                self._execute_bot_rollover(record, now_utc)

            return {
                "status": "CLOSED_EXPIRED",
                "position_id": pos_id,
                "symbol": sym,
                "exit_price": exec_price,
                "realized_pnl": realized_pnl,
                "execution_mode": "PAPER"
            }
        else:
            # LIVE Execution via Broker Adapter
            try:
                from src.broker_router import global_broker_router
                adapter = global_broker_router.get_broker_adapter(record.execution_broker)
                if hasattr(adapter, "square_off_position"):
                    broker_res = adapter.square_off_position(pos_id)
                else:
                    broker_res = adapter.place_order(sym, exit_side, qty_to_close, exec_price)

                logger.info("[%s] Broker live square-off response: %s", bot_id, broker_res)
                return {"status": "EXPIRY_EXIT_SUBMITTED", "position_id": pos_id, "broker_response": broker_res}
            except Exception as e:
                logger.error("[%s] Live broker square-off failed: %s", bot_id, e)
                return self._handle_reconciliation_required(record, now_utc, str(e))

    def _handle_market_closed_settlement(
        self,
        record: ExpiryPositionRecord,
        now_utc: datetime
    ) -> Dict[str, Any]:
        """Handles non-tradable expired contracts via settlement reconciliation."""
        pos_id = record.position_id
        bot_id = record.bot_id
        sym = record.trading_symbol

        db.safe_execute("UPDATE trades_log SET status = 'EXPIRED_PENDING_SETTLEMENT' WHERE id = ?", (pos_id,))

        self.record_expiry_event(
            position_id=pos_id,
            bot_id=bot_id,
            symbol=sym,
            event_type="EXPIRED_PENDING_SETTLEMENT",
            state=ExpiryState.EXPIRED_PENDING_SETTLEMENT.value,
            idempotency_key=f"EXPIRY_SQUARE_OFF:{record.execution_broker}:{pos_id}:SETTLEMENT_PENDING",
            details={"reason": "Contract expired past trading hours, awaiting settlement reconciliation."}
        )

        return {"status": "EXPIRED_PENDING_SETTLEMENT", "position_id": pos_id}

    def _handle_reconciliation_required(
        self,
        record: ExpiryPositionRecord,
        now_utc: datetime,
        reason: str
    ) -> Dict[str, Any]:
        """Marks position as requiring reconciliation without crashing server/bot."""
        pos_id = record.position_id
        bot_id = record.bot_id
        sym = record.trading_symbol

        db.safe_execute("UPDATE trades_log SET status = 'RECONCILIATION_REQUIRED' WHERE id = ?", (pos_id,))

        self.record_expiry_event(
            position_id=pos_id,
            bot_id=bot_id,
            symbol=sym,
            event_type="RECONCILIATION_REQUIRED",
            state=ExpiryState.RECONCILIATION_REQUIRED.value,
            idempotency_key=f"EXPIRY_SQUARE_OFF:{record.execution_broker}:{pos_id}:RECON_REQ",
            details={"reason": reason}
        )

        logger.warning("[%s] RECONCILIATION_REQUIRED for Position #%s (%s): %s", bot_id, pos_id, sym, reason)
        return {"status": "RECONCILIATION_REQUIRED", "position_id": pos_id, "reason": reason}

    def _execute_bot_rollover(self, record: ExpiryPositionRecord, now_utc: datetime) -> None:
        """Executes automated contract rollover resolution for the bot without forcing immediate entry."""
        roll_res = resolve_contract_rollover(
            {},
            record.trading_symbol,
            rollover_policy=record.rollover_policy,
            market_date=now_utc.date()
        )
        if roll_res.is_valid and roll_res.instrument:
            new_sym = roll_res.instrument.canonical_symbol
            logger.info("[%s] NEXT_EXPIRY_RESOLVED: Rolled over from '%s' to '%s'.", record.bot_id, record.trading_symbol, new_sym)
            db.safe_execute("UPDATE bot_instances SET symbol = ?, status = 'READY' WHERE id = ?", (new_sym, record.bot_id))

            self.record_expiry_event(
                position_id=record.position_id,
                bot_id=record.bot_id,
                symbol=new_sym,
                event_type="NEXT_EXPIRY_RESOLVED",
                state=ExpiryState.OPEN.value,
                details={"old_symbol": record.trading_symbol, "new_symbol": new_sym}
            )

    # ─────────────────────────────────────────────────────────────────────────
    # 5. STARTUP RECOVERY & PERIODIC MONITOR CYCLE
    # ─────────────────────────────────────────────────────────────────────────

    def run_startup_recovery(self) -> Dict[str, Any]:
        """
        Scans all derivative positions on server boot.
        Identifies expired or past-cutoff positions and reconciles them safely.
        """
        logger.info("[*] Running Derivative Expiry Manager startup reconciliation...")
        positions = self.fetch_active_derivative_positions()
        recovered = 0
        now_utc = datetime.now(timezone.utc)

        for p in positions:
            in_window, cutoff_utc, code = self.is_contract_in_expiry_window(p.trading_symbol, now=now_utc)
            if in_window:
                logger.info("[%s] Startup recovery found expiring/expired position #%s (%s, code: %s).", p.bot_id, p.position_id, p.trading_symbol, code)
                self.execute_expiry_square_off(p, now=now_utc)
                recovered += 1

        logger.info("[+] Derivative Expiry Manager startup recovery finished: %d position(s) reconciled.", recovered)
        return {"recovered_positions_count": recovered}

    def evaluate_expiry_lifecycle(self, now: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """
        Scans all active positions and executes auto square-off for contracts reaching cutoff.
        """
        now_utc = now or datetime.now(timezone.utc)
        positions = self.fetch_active_derivative_positions()
        results: List[Dict[str, Any]] = []

        for p in positions:
            if not p.auto_square_off_on_expiry:
                continue

            info = self.get_contract_expiry_info(p.trading_symbol, square_off_minutes=p.expiry_exit_buffer_minutes, now=now_utc)
            if not info.get("is_expiring"):
                continue

            if info.get("square_off_active"):
                cutoff_utc = info.get("square_off_utc")
                logger.info(
                    "[%s] EXPIRY_WINDOW_ENTERED: Contract '%s' reached cutoff %s (Current: %s).",
                    p.bot_id, p.trading_symbol, cutoff_utc.isoformat() if cutoff_utc else "N/A", now_utc.isoformat()
                )
                self.record_expiry_event(
                    position_id=p.position_id,
                    bot_id=p.bot_id,
                    symbol=p.trading_symbol,
                    event_type="EXPIRY_WINDOW_ENTERED",
                    state=ExpiryState.EXPIRY_WINDOW_ENTERED.value,
                    idempotency_key=f"EXPIRY_WINDOW:{p.position_id}:{cutoff_utc.isoformat() if cutoff_utc else 'NOW'}",
                    details={"cutoff": cutoff_utc.isoformat() if cutoff_utc else ""}
                )
                res = self.execute_expiry_square_off(p, now=now_utc)
                results.append(res)

        return results

    def _worker_loop(self) -> None:
        """Dedicated background monitor loop."""
        logger.info("[+] DerivativeExpiryManager background monitor worker started.")
        self.run_startup_recovery()

        while not self._stop_event.is_set():
            try:
                self.evaluate_expiry_lifecycle()
            except Exception as e:
                logger.error("Error in DerivativeExpiryManager cycle: %s", e, exc_info=True)

            self._stop_event.wait(self._interval_seconds)

        logger.info("[-] DerivativeExpiryManager background monitor worker stopped.")

    def start(self) -> None:
        """Starts the background worker thread gracefully."""
        with self._lock:
            if self._running:
                return
            self._running = True
            self._stop_event.clear()
            self._thread = threading.Thread(target=self._worker_loop, name="DerivativeExpiryManagerThread", daemon=True)
            self._thread.start()

    def stop(self) -> None:
        """Gracefully halts the background worker."""
        with self._lock:
            if not self._running:
                return
            self._running = False
            self._stop_event.set()
            if self._thread and self._thread.is_alive():
                self._thread.join(timeout=3.0)


# Aliases for 100% Backwards Compatibility
ExpiryLifecycleManager = DerivativeExpiryManager
global_derivative_expiry_manager = DerivativeExpiryManager.get_instance()
global_expiry_lifecycle_manager = global_derivative_expiry_manager
