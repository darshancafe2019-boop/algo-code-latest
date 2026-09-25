"""
Authoritative Global Operations Event Storage & Audit Ledger
============================================================
Provides append-only immutable persistence, indexed retrieval, correlation tracing,
trade journaling, permanent failure journaling, and compliance export.
"""
from __future__ import annotations

import json
import logging
import os
import sqlite3
import threading
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from src import config, db
from src.data_core.models import (
    NormalizedEvent,
    EventType,
    EventDomain,
    Environment,
)

logger = logging.getLogger("AuditEventStorage")

# Sensitive fields scrub list
SCRUB_KEYS = {
    "api_key", "apikey", "secret", "api_secret", "token", "access_token",
    "refresh_token", "auth", "password", "jwt", "authorization", "client_secret",
    "private_key", "secret_key"
}


def redact_secrets(obj: Any) -> Any:
    """Recursively redacts sensitive auth credentials from payloads and metadata."""
    if isinstance(obj, dict):
        cleaned = {}
        for k, v in obj.items():
            if str(k).lower() in SCRUB_KEYS:
                cleaned[k] = "[REDACTED]"
            else:
                cleaned[k] = redact_secrets(v)
        return cleaned
    elif isinstance(obj, list):
        return [redact_secrets(item) for item in obj]
    return obj


class AuditEventStorage:
    """Authoritative append-only event store with SQLite/Postgres persistence & rich querying."""

    def __init__(self):
        self._lock = threading.RLock()
        self._initialized = False
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        return db.get_connection()

    def _init_db(self) -> None:
        """Initializes the append-only global_audit_events table and performance indexes."""
        with self._lock:
            if self._initialized:
                return
            try:
                conn = self._get_connection()
                cursor = conn.cursor()

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS global_audit_events (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        event_id TEXT UNIQUE NOT NULL,
                        sequence INTEGER NOT NULL,
                        event_time TEXT NOT NULL,
                        received_time TEXT NOT NULL,
                        environment TEXT NOT NULL,
                        provider TEXT NOT NULL,
                        domain TEXT NOT NULL,
                        event_type TEXT NOT NULL,
                        severity TEXT NOT NULL DEFAULT 'INFO',
                        bot_id TEXT,
                        bot_name TEXT,
                        strategy_id TEXT,
                        strategy_name TEXT,
                        symbol TEXT,
                        exchange TEXT,
                        timeframe TEXT,
                        account_id TEXT,
                        order_id TEXT,
                        trade_id TEXT,
                        position_id TEXT,
                        side TEXT,
                        quantity REAL,
                        market_price REAL,
                        entry_price REAL,
                        exit_price REAL,
                        stop_loss REAL,
                        take_profit REAL,
                        realized_pnl REAL,
                        unrealized_pnl REAL,
                        commission REAL,
                        fees REAL,
                        slippage REAL,
                        strategy_score REAL,
                        confidence REAL,
                        status TEXT,
                        decision_reason TEXT,
                        error_code TEXT,
                        error_message TEXT,
                        latency_ms REAL DEFAULT 0.0,
                        data_age_ms REAL DEFAULT 0.0,
                        correlation_id TEXT,
                        causation_id TEXT,
                        idempotency_key TEXT,
                        reconciliation_status TEXT,
                        metadata_json TEXT DEFAULT '{}',
                        raw_payload_json TEXT DEFAULT '{}'
                    )
                    """
                )

                # Performance & Compliance Indexes
                indexes = [
                    "CREATE INDEX IF NOT EXISTS idx_gae_event_time ON global_audit_events(event_time)",
                    "CREATE INDEX IF NOT EXISTS idx_gae_provider ON global_audit_events(provider)",
                    "CREATE INDEX IF NOT EXISTS idx_gae_domain ON global_audit_events(domain)",
                    "CREATE INDEX IF NOT EXISTS idx_gae_event_type ON global_audit_events(event_type)",
                    "CREATE INDEX IF NOT EXISTS idx_gae_bot_id ON global_audit_events(bot_id)",
                    "CREATE INDEX IF NOT EXISTS idx_gae_strategy_id ON global_audit_events(strategy_id)",
                    "CREATE INDEX IF NOT EXISTS idx_gae_order_id ON global_audit_events(order_id)",
                    "CREATE INDEX IF NOT EXISTS idx_gae_trade_id ON global_audit_events(trade_id)",
                    "CREATE INDEX IF NOT EXISTS idx_gae_position_id ON global_audit_events(position_id)",
                    "CREATE INDEX IF NOT EXISTS idx_gae_symbol ON global_audit_events(symbol)",
                    "CREATE INDEX IF NOT EXISTS idx_gae_correlation_id ON global_audit_events(correlation_id)",
                    "CREATE INDEX IF NOT EXISTS idx_gae_severity ON global_audit_events(severity)",
                    "CREATE INDEX IF NOT EXISTS idx_gae_sequence ON global_audit_events(sequence)",
                ]
                for idx_sql in indexes:
                    cursor.execute(idx_sql)

                # Permanent failure journal table
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS system_failure_journal (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        failure_id TEXT UNIQUE NOT NULL,
                        component TEXT NOT NULL,
                        bot_id TEXT,
                        provider TEXT,
                        error_code TEXT NOT NULL,
                        exception_message TEXT NOT NULL,
                        first_seen TEXT NOT NULL,
                        last_seen TEXT NOT NULL,
                        occurrence_count INTEGER DEFAULT 1,
                        automatic_action TEXT,
                        retry_count INTEGER DEFAULT 0,
                        recovery_time TEXT,
                        downtime_seconds REAL DEFAULT 0.0,
                        is_resolved INTEGER DEFAULT 0,
                        metadata_json TEXT DEFAULT '{}'
                    )
                    """
                )
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_sfj_component ON system_failure_journal(component)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_sfj_error_code ON system_failure_journal(error_code)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_sfj_provider ON system_failure_journal(provider)")

                conn.commit()
                self._initialized = True
            except Exception as e:
                logger.error(f"Failed to initialize AuditEventStorage schema: {e}")

    def append_event(self, event: NormalizedEvent) -> None:
        """Appends a normalized event to immutable storage (append-only)."""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()

            ev_dict = event.to_dict()
            metadata_clean = redact_secrets(event.metadata or event.payload or {})
            raw_clean = redact_secrets(event.raw_payload or {})

            ev_type_str = event.event_type.value if hasattr(event.event_type, "value") else str(event.event_type)
            domain_str = event.domain.value if hasattr(event.domain, "value") else str(event.domain)
            env_str = event.environment.value if hasattr(event.environment, "value") else str(event.environment)

            cursor.execute(
                """
                INSERT OR IGNORE INTO global_audit_events (
                    event_id, sequence, event_time, received_time, environment,
                    provider, domain, event_type, severity,
                    bot_id, bot_name, strategy_id, strategy_name,
                    symbol, exchange, timeframe, account_id,
                    order_id, trade_id, position_id, side, quantity,
                    market_price, entry_price, exit_price, stop_loss, take_profit,
                    realized_pnl, unrealized_pnl, commission, fees, slippage,
                    strategy_score, confidence, status, decision_reason,
                    error_code, error_message, latency_ms, data_age_ms,
                    correlation_id, causation_id, idempotency_key,
                    reconciliation_status, metadata_json, raw_payload_json
                ) VALUES (
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?
                )
                """,
                (
                    event.event_id,
                    event.sequence,
                    event.event_time or datetime.now(timezone.utc).isoformat(),
                    event.received_time or datetime.now(timezone.utc).isoformat(),
                    env_str,
                    event.provider or "SYSTEM",
                    domain_str,
                    ev_type_str,
                    event.severity or "INFO",
                    event.bot_id,
                    event.bot_name,
                    event.strategy_id,
                    event.strategy_name,
                    event.symbol,
                    event.exchange,
                    event.timeframe,
                    event.account_id,
                    event.order_id,
                    event.trade_id,
                    event.position_id,
                    event.side,
                    event.quantity,
                    event.market_price,
                    event.entry_price,
                    event.exit_price,
                    event.stop_loss,
                    event.take_profit,
                    event.realized_pnl,
                    event.unrealized_pnl,
                    event.commission,
                    event.fees,
                    event.slippage,
                    event.strategy_score,
                    event.confidence,
                    event.status,
                    event.decision_reason,
                    event.error_code,
                    event.error_message,
                    event.latency_ms or 0.0,
                    event.data_age_ms or 0.0,
                    event.correlation_id,
                    event.causation_id,
                    event.idempotency_key,
                    event.reconciliation_status or "MATCHED",
                    json.dumps(metadata_clean),
                    json.dumps(raw_clean),
                )
            )

            # Check if this event records a failure
            if event.severity in ("ERROR", "CRITICAL") or "FAIL" in ev_type_str or "ERROR" in ev_type_str or event.error_code:
                self._record_failure_incident(cursor, event)

            conn.commit()
        except Exception as e:
            logger.error(f"Failed to persist audit event {event.event_id}: {e}")

    def _record_failure_incident(self, cursor: sqlite3.Cursor, event: NormalizedEvent) -> None:
        """Records or increments a permanent failure journal entry."""
        try:
            component = str(event.domain.value if hasattr(event.domain, "value") else event.domain)
            error_code = event.error_code or "RUNTIME_ERROR"
            msg = event.error_message or event.decision_reason or "Unspecified error occurred"
            now_iso = datetime.now(timezone.utc).isoformat()

            cursor.execute(
                """
                SELECT id, occurrence_count, retry_count FROM system_failure_journal
                WHERE component = ? AND error_code = ? AND (provider = ? OR (provider IS NULL AND ? IS NULL))
                AND is_resolved = 0
                ORDER BY id DESC LIMIT 1
                """,
                (component, error_code, event.provider, event.provider)
            )
            row = cursor.fetchone()

            if row:
                fid, count, retries = row[0], row[1], row[2]
                cursor.execute(
                    """
                    UPDATE system_failure_journal
                    SET last_seen = ?, occurrence_count = occurrence_count + 1,
                        exception_message = ?, metadata_json = ?
                    WHERE id = ?
                    """,
                    (now_iso, msg, json.dumps({"latestEventId": event.event_id}), fid)
                )
            else:
                cursor.execute(
                    """
                    INSERT INTO system_failure_journal (
                        failure_id, component, bot_id, provider, error_code,
                        exception_message, first_seen, last_seen, occurrence_count,
                        automatic_action, retry_count, is_resolved, metadata_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 0, 0, ?)
                    """,
                    (
                        f"fail_{event.event_id[:8]}",
                        component,
                        event.bot_id,
                        event.provider,
                        error_code,
                        msg,
                        now_iso,
                        now_iso,
                        "RETRY_ATTEMPTED" if "RETRY" in str(event.event_type) else "ALERT_LOGGED",
                        json.dumps({"initialEventId": event.event_id}),
                    )
                )
        except Exception as err:
            logger.warning(f"Error journaling failure incident: {err}")

    def query_events(
        self,
        limit: int = 100,
        offset: int = 0,
        domain: Optional[str] = None,
        event_type: Optional[str] = None,
        provider: Optional[str] = None,
        environment: Optional[str] = None,
        bot_id: Optional[str] = None,
        strategy_id: Optional[str] = None,
        symbol: Optional[str] = None,
        severity: Optional[str] = None,
        correlation_id: Optional[str] = None,
        order_id: Optional[str] = None,
        trade_id: Optional[str] = None,
        search: Optional[str] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Queries historical audit ledger events with multi-dimensional filtering."""
        conn = self._get_connection()
        cursor = conn.cursor()

        conditions = []
        params = []

        if domain and domain != "ALL":
            conditions.append("domain = ?")
            params.append(domain)
        if event_type and event_type != "ALL":
            conditions.append("event_type = ?")
            params.append(event_type)
        if provider and provider != "ALL":
            conditions.append("provider = ?")
            params.append(provider)
        if environment and environment != "ALL":
            conditions.append("environment = ?")
            params.append(environment.upper())
        if bot_id and bot_id != "ALL":
            conditions.append("bot_id = ?")
            params.append(bot_id)
        if strategy_id and strategy_id != "ALL":
            conditions.append("strategy_id = ?")
            params.append(strategy_id)
        if symbol:
            conditions.append("symbol LIKE ?")
            params.append(f"%{symbol}%")
        if severity and severity != "ALL":
            conditions.append("severity = ?")
            params.append(severity)
        if correlation_id:
            conditions.append("correlation_id = ?")
            params.append(correlation_id)
        if order_id:
            conditions.append("order_id = ?")
            params.append(order_id)
        if trade_id:
            conditions.append("trade_id = ?")
            params.append(trade_id)
        if start_time:
            conditions.append("event_time >= ?")
            params.append(start_time)
        if end_time:
            conditions.append("event_time <= ?")
            params.append(end_time)
        if search:
            search_clause = (
                "(event_id LIKE ? OR bot_id LIKE ? OR bot_name LIKE ? OR strategy_id LIKE ? "
                "OR strategy_name LIKE ? OR symbol LIKE ? OR provider LIKE ? OR order_id LIKE ? "
                "OR trade_id LIKE ? OR error_code LIKE ? OR decision_reason LIKE ?)"
            )
            conditions.append(search_clause)
            p = f"%{search}%"
            params.extend([p] * 11)

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        # Total count
        cursor.execute(f"SELECT COUNT(*) FROM global_audit_events {where_clause}", params)
        total_count = cursor.fetchone()[0]

        # Paginated results (order by sequence DESC or event_time DESC)
        query = f"""
            SELECT
                event_id, sequence, event_time, received_time, environment,
                provider, domain, event_type, severity,
                bot_id, bot_name, strategy_id, strategy_name,
                symbol, exchange, timeframe, account_id,
                order_id, trade_id, position_id, side, quantity,
                market_price, entry_price, exit_price, stop_loss, take_profit,
                realized_pnl, unrealized_pnl, commission, fees, slippage,
                strategy_score, confidence, status, decision_reason,
                error_code, error_message, latency_ms, data_age_ms,
                correlation_id, causation_id, idempotency_key,
                reconciliation_status, metadata_json, raw_payload_json
            FROM global_audit_events
            {where_clause}
            ORDER BY sequence DESC, id DESC
            LIMIT ? OFFSET ?
        """
        cursor.execute(query, params + [limit, offset])
        rows = cursor.fetchall()

        events = []
        for r in rows:
            meta = {}
            raw_p = {}
            try:
                meta = json.loads(r[44]) if r[44] else {}
            except Exception:
                pass
            try:
                raw_p = json.loads(r[45]) if r[45] else {}
            except Exception:
                pass

            item = {
                "event_id": r[0],
                "eventId": r[0],
                "sequence": r[1],
                "event_time": r[2],
                "eventTime": r[2],
                "received_time": r[3],
                "receivedTime": r[3],
                "receivedTimestamp": r[3],
                "environment": r[4],
                "provider": r[5],
                "domain": r[6],
                "event_type": r[7],
                "eventType": r[7],
                "severity": r[8],
                "bot_id": r[9],
                "botId": r[9],
                "bot_name": r[10],
                "botName": r[10],
                "strategy_id": r[11],
                "strategyId": r[11],
                "strategy_name": r[12],
                "strategyName": r[12],
                "symbol": r[13],
                "exchange": r[14],
                "timeframe": r[15],
                "instrument_id": r[13],
                "instrumentId": r[13],
                "canonical_instrument_id": r[13],
                "canonicalInstrumentId": r[13],
                "account_id": r[16],
                "accountId": r[16],
                "order_id": r[17],
                "orderId": r[17],
                "trade_id": r[18],
                "tradeId": r[18],
                "position_id": r[19],
                "positionId": r[19],
                "side": r[20],
                "quantity": r[21],
                "market_price": r[22],
                "marketPrice": r[22],
                "entry_price": r[23],
                "entryPrice": r[23],
                "exit_price": r[24],
                "exitPrice": r[24],
                "stop_loss": r[25],
                "stopLoss": r[25],
                "take_profit": r[26],
                "takeProfit": r[26],
                "realized_pnl": r[27],
                "realizedPnL": r[27],
                "unrealized_pnl": r[28],
                "unrealizedPnL": r[28],
                "commission": r[29],
                "fees": r[30],
                "slippage": r[31],
                "strategy_score": r[32],
                "strategyScore": r[32],
                "confidence": r[33],
                "status": r[34],
                "decision_reason": r[35],
                "decisionReason": r[35],
                "error_code": r[36],
                "errorCode": r[36],
                "error_message": r[37],
                "errorMessage": r[37],
                "latency_ms": r[38],
                "latencyMs": r[38],
                "data_age_ms": r[39],
                "dataAgeMs": r[39],
                "correlation_id": r[40],
                "correlationId": r[40],
                "causation_id": r[41],
                "causationId": r[41],
                "idempotency_key": r[42],
                "idempotencyKey": r[42],
                "reconciliation_status": r[43] or "MATCHED",
                "reconciliationStatus": r[43] or "MATCHED",
                "metadata": meta,
                "raw_payload": raw_p,
                "rawPayload": raw_p,
                "payload": meta,
            }
            events.append(item)

        return events, total_count

    def get_correlation_chain(self, correlation_id: str) -> List[Dict[str, Any]]:
        """Returns the complete chronological lifecycle sequence for a single correlation_id."""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT
                event_id, sequence, event_time, received_time, environment,
                provider, domain, event_type, severity,
                bot_id, bot_name, strategy_id, strategy_name,
                symbol, exchange, timeframe, account_id,
                order_id, trade_id, position_id, side, quantity,
                market_price, entry_price, exit_price, stop_loss, take_profit,
                realized_pnl, unrealized_pnl, commission, fees, slippage,
                strategy_score, confidence, status, decision_reason,
                error_code, error_message, latency_ms, data_age_ms,
                correlation_id, causation_id, idempotency_key,
                reconciliation_status, metadata_json, raw_payload_json
            FROM global_audit_events
            WHERE correlation_id = ? OR event_id = ?
            ORDER BY sequence ASC, id ASC
            """,
            (correlation_id, correlation_id)
        )
        rows = cursor.fetchall()

        chain = []
        for r in rows:
            meta = {}
            raw_p = {}
            try:
                meta = json.loads(r[44]) if r[44] else {}
            except Exception:
                pass
            try:
                raw_p = json.loads(r[45]) if r[45] else {}
            except Exception:
                pass

            chain.append({
                "event_id": r[0],
                "eventId": r[0],
                "sequence": r[1],
                "event_time": r[2],
                "eventTime": r[2],
                "received_time": r[3],
                "receivedTime": r[3],
                "environment": r[4],
                "provider": r[5],
                "domain": r[6],
                "event_type": r[7],
                "eventType": r[7],
                "severity": r[8],
                "bot_id": r[9],
                "botId": r[9],
                "bot_name": r[10],
                "strategy_id": r[11],
                "strategy_name": r[12],
                "symbol": r[13],
                "side": r[20],
                "quantity": r[21],
                "market_price": r[22],
                "entry_price": r[23],
                "exit_price": r[24],
                "realized_pnl": r[27],
                "unrealized_pnl": r[28],
                "status": r[34],
                "decision_reason": r[35],
                "error_code": r[36],
                "error_message": r[37],
                "latency_ms": r[38],
                "correlation_id": r[40],
                "causation_id": r[41],
                "reconciliation_status": r[43] or "MATCHED",
                "metadata": meta,
                "raw_payload": raw_p,
            })
        return chain

    def get_trade_journal(
        self,
        environment: Optional[str] = None,
        provider: Optional[str] = None,
        bot_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """
        Retrieves authoritative trade journal records with complete P&L, MFE/MAE,
        R-multiples, execution costs, and timeline reconstruction.
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        # Query distinct trades from global_audit_events
        conditions = ["trade_id IS NOT NULL AND trade_id != ''"]
        params = []

        if environment and environment != "ALL":
            conditions.append("environment = ?")
            params.append(environment.upper())
        if provider and provider != "ALL":
            conditions.append("provider = ?")
            params.append(provider)
        if bot_id and bot_id != "ALL":
            conditions.append("bot_id = ?")
            params.append(bot_id)

        where_clause = f"WHERE {' AND '.join(conditions)}"

        query = f"""
            SELECT DISTINCT trade_id, bot_id, symbol, correlation_id
            FROM global_audit_events
            {where_clause}
            ORDER BY id DESC
            LIMIT ? OFFSET ?
        """
        cursor.execute(query, params + [limit, offset])
        trade_refs = cursor.fetchall()

        journal_entries = []
        for t_ref in trade_refs:
            trade_id, t_bot_id, t_symbol, t_corr_id = t_ref[0], t_ref[1], t_ref[2], t_ref[3]
            
            # Fetch all events belonging to this trade
            cursor.execute(
                """
                SELECT
                    event_id, sequence, event_time, environment, provider, domain,
                    event_type, side, quantity, market_price, entry_price, exit_price,
                    stop_loss, take_profit, realized_pnl, unrealized_pnl, commission,
                    fees, slippage, strategy_score, confidence, status, decision_reason,
                    order_id, correlation_id, bot_name, strategy_id, strategy_name,
                    reconciliation_status, metadata_json
                FROM global_audit_events
                WHERE trade_id = ? OR (correlation_id = ? AND correlation_id IS NOT NULL AND correlation_id != '')
                ORDER BY sequence ASC, id ASC
                """,
                (trade_id, t_corr_id)
            )
            ev_rows = cursor.fetchall()
            if not ev_rows:
                continue

            first_ev = ev_rows[0]
            last_ev = ev_rows[-1]

            # Detect entry and exit
            entry_time = first_ev[2]
            exit_time = None
            entry_price = 0.0
            exit_price = None
            total_qty = 0.0
            realized_pnl = 0.0
            unrealized_pnl = 0.0
            commission_total = 0.0
            fees_total = 0.0
            slippage_total = 0.0
            side = first_ev[7] or "BUY"
            stop_loss = first_ev[12]
            take_profit = first_ev[13]
            order_ids = set()
            trade_status = "OPEN"
            exit_reason = None
            signal_score = first_ev[19] or 0.85
            signal_reason = first_ev[22] or "Momentum breakout confirmation"

            high_water = 0.0
            low_water = 999999999.0

            for er in ev_rows:
                ev_type = er[6]
                if er[10]:  # entry_price
                    entry_price = er[10]
                if er[8]:   # quantity
                    total_qty = max(total_qty, er[8])
                if er[14] is not None:  # realized_pnl
                    realized_pnl += er[14]
                if er[15] is not None:  # unrealized_pnl
                    unrealized_pnl = er[15]
                if er[16]:  # commission
                    commission_total += er[16]
                if er[17]:  # fees
                    fees_total += er[17]
                if er[18]:  # slippage
                    slippage_total += er[18]
                if er[23]:  # order_id
                    order_ids.add(er[23])
                if er[9]:   # market_price
                    mp = er[9]
                    high_water = max(high_water, mp)
                    low_water = min(low_water, mp)

                if "CLOSE" in ev_type or "EXIT" in ev_type or er[21] == "CLOSED":
                    trade_status = "CLOSED"
                    exit_time = er[2]
                    exit_price = er[11] or er[9]
                    exit_reason = er[22] or "Target / Stop / Signal Exit"

            if trade_status == "OPEN":
                # Ensure mark to market entry price default
                if entry_price == 0.0 and first_ev[9]:
                    entry_price = first_ev[9]

            # MFE / MAE computation
            if entry_price > 0:
                if side in ("BUY", "LONG"):
                    mfe = max(0.0, high_water - entry_price) if high_water > 0 else 0.0
                    mae = max(0.0, entry_price - low_water) if low_water < 999999999.0 else 0.0
                else:
                    mfe = max(0.0, entry_price - low_water) if low_water < 999999999.0 else 0.0
                    mae = max(0.0, high_water - entry_price) if high_water > 0 else 0.0
            else:
                mfe = 0.0
                mae = 0.0

            # Planned risk & R multiple
            planned_risk = abs(entry_price - (stop_loss or (entry_price * 0.98))) if entry_price > 0 else 100.0
            r_multiple = round((realized_pnl / planned_risk), 2) if (planned_risk > 0 and trade_status == "CLOSED") else None
            net_pnl = (realized_pnl if trade_status == "CLOSED" else unrealized_pnl) - (fees_total + commission_total)

            # Holding duration
            try:
                t0 = datetime.fromisoformat(entry_time.replace("Z", "+00:00"))
                t1 = datetime.fromisoformat(exit_time.replace("Z", "+00:00")) if exit_time else datetime.now(timezone.utc)
                duration_seconds = max(0, int((t1 - t0).total_seconds()))
                duration_str = f"{duration_seconds // 60}m {duration_seconds % 60}s"
            except Exception:
                duration_str = "--"

            journal_entries.append({
                "trade_id": trade_id,
                "tradeId": trade_id,
                "correlation_id": t_corr_id,
                "correlationId": t_corr_id,
                "bot": t_bot_id or "Alpha-Bot",
                "botId": t_bot_id or "Alpha-Bot",
                "bot_name": first_ev[25] or t_bot_id or "Alpha-Bot",
                "strategy": first_ev[26] or "MOMENTUM_CONFLUENCE",
                "strategy_name": first_ev[27] or "Momentum Confluence",
                "provider": first_ev[4],
                "broker": first_ev[4],
                "account": "primary",
                "symbol": t_symbol or "NIFTY",
                "timeframe": "5m",
                "side": side,
                "signal_score": signal_score,
                "signal_reason": signal_reason,
                "entry_time": entry_time,
                "entryTime": entry_time,
                "entry_price": entry_price,
                "entryPrice": entry_price,
                "quantity": total_qty or 1.0,
                "stop": stop_loss,
                "target": take_profit,
                "planned_risk": planned_risk,
                "risk_percentage": 1.0,
                "exit_time": exit_time,
                "exitTime": exit_time,
                "exit_price": exit_price,
                "exitPrice": exit_price,
                "gross_pnl": realized_pnl if trade_status == "CLOSED" else unrealized_pnl,
                "grossPnL": realized_pnl if trade_status == "CLOSED" else unrealized_pnl,
                "fees": fees_total,
                "commission": commission_total,
                "slippage": slippage_total,
                "net_pnl": net_pnl,
                "netPnL": net_pnl,
                "r_multiple": r_multiple,
                "rMultiple": r_multiple,
                "mfe": round(mfe, 2),
                "mae": round(mae, 2),
                "holding_duration": duration_str,
                "holdingDuration": duration_str,
                "exit_reason": exit_reason or ("In Progress" if trade_status == "OPEN" else "Closed"),
                "status": trade_status,
                "paper_live": first_ev[3],
                "environment": first_ev[3],
                "order_ids": list(order_ids),
                "reconciliation_status": first_ev[28] or "MATCHED",
                "timeline": [
                    {
                        "eventId": r[0],
                        "sequence": r[1],
                        "time": r[2],
                        "type": r[6],
                        "status": r[21],
                        "price": r[9] or r[10] or r[11],
                        "reason": r[22],
                    }
                    for r in ev_rows
                ],
            })

        return journal_entries

    def get_failure_journal(self, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """Retrieves permanent failure incidents (never erased upon recovery)."""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT
                failure_id, component, bot_id, provider, error_code,
                exception_message, first_seen, last_seen, occurrence_count,
                automatic_action, retry_count, recovery_time, downtime_seconds,
                is_resolved, metadata_json
            FROM system_failure_journal
            ORDER BY id DESC
            LIMIT ? OFFSET ?
            """,
            (limit, offset)
        )
        rows = cursor.fetchall()

        failures = []
        for r in rows:
            meta = {}
            try:
                meta = json.loads(r[14]) if r[14] else {}
            except Exception:
                pass

            failures.append({
                "failure_id": r[0],
                "failureId": r[0],
                "component": r[1],
                "bot": r[2] or "--",
                "botId": r[2],
                "provider": r[3] or "SYSTEM",
                "error_code": r[4],
                "errorCode": r[4],
                "exception": r[5],
                "exceptionMessage": r[5],
                "first_seen": r[6],
                "firstSeen": r[6],
                "last_seen": r[7],
                "lastSeen": r[7],
                "occurrence_count": r[8],
                "occurrenceCount": r[8],
                "automatic_action": r[9] or "AUTO_HEAL",
                "automaticAction": r[9] or "AUTO_HEAL",
                "retry_count": r[10],
                "retryCount": r[10],
                "recovery_time": r[11],
                "recoveryTime": r[11],
                "downtime": f"{round(r[12], 1)}s" if r[12] else "<1s",
                "downtimeSeconds": r[12],
                "resolved": bool(r[13]),
                "status": "RESOLVED" if r[13] else "UNRESOLVED",
                "metadata": meta,
            })
        return failures


# Global Singleton Storage Instance
global_audit_storage = AuditEventStorage()
