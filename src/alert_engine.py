"""
Institutional Real-Time Alert Engine & Incident Management Core
================================================================
Central single source of truth for:
- Structured event ingestion & centralized severity taxonomy
- Alert fingerprinting, occurrence counting & deduplication
- Incident correlation, root cause grouping & alert storm protection
- Multi-state lifecycle management (NEW -> ACKNOWLEDGED -> INVESTIGATING -> RESOLVED -> ARCHIVED)
- Granular notification policy dispatching & Telegram telemetry tracking
- Non-destructive historical preservation & server-side cursor/offset queries
"""

import json
import uuid
import logging
import threading
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List, Tuple

from src import config, db

logger = logging.getLogger("AlertEngine")


# =============================================================================
# 1. SEVERITY TAXONOMY & STATUS CONSTANTS
# =============================================================================

SEVERITY_CRITICAL = "CRITICAL" # Immediate operational or capital risk
SEVERITY_ERROR    = "ERROR"    # Function or worker failure
SEVERITY_WARNING  = "WARNING"  # Attention needed, safe execution continuing
SEVERITY_NOTICE   = "NOTICE"   # Informative state shift
SEVERITY_INFO     = "INFO"     # Normal routine activity

STATUS_NEW           = "NEW"
STATUS_ACKNOWLEDGED  = "ACKNOWLEDGED"
STATUS_INVESTIGATING = "INVESTIGATING"
STATUS_RESOLVED      = "RESOLVED"
STATUS_ARCHIVED      = "ARCHIVED"
STATUS_SUPPRESSED    = "SUPPRESSED"


# =============================================================================
# 2. CENTRAL ALERT ENGINE CLASS
# =============================================================================

class AlertEngine:
    """
    Thread-safe, enterprise-grade alert evaluation, deduplication, and incident correlation engine.
    """

    def __init__(self):
        self._lock = threading.RLock()
        self._storm_cache: Dict[str, List[float]] = {}  # fingerprint -> [timestamps]

    def generate_fingerprint(
        self,
        category: str,
        source: str,
        entity_id: str = "",
        error_code: str = "",
        condition_type: str = ""
    ) -> str:
        """Generates deterministic alert fingerprint for deduplication."""
        c = (category or "SYSTEM").upper().strip()
        s = (source or "System").strip()
        e = (entity_id or "fleet").strip()
        code = (error_code or condition_type or "EVENT").upper().strip()
        return f"{c}:{s}:{e}:{code}"

    def calculate_impact_score(
        self,
        severity: str,
        is_live_mode: bool = False,
        open_exposure: float = 0.0,
        affected_bot_count: int = 1
    ) -> float:
        """Calculates transparent numeric impact score (0.0 - 100.0)."""
        base = {
            SEVERITY_CRITICAL: 80.0,
            SEVERITY_ERROR: 50.0,
            SEVERITY_WARNING: 25.0,
            SEVERITY_NOTICE: 10.0,
            SEVERITY_INFO: 2.0
        }.get(severity.upper(), 10.0)

        # Multipliers for real capital and affected scope
        if is_live_mode:
            base *= 1.25
        if open_exposure > 0:
            base += min(15.0, (open_exposure / 5000.0) * 5.0)
        base += min(10.0, max(0, affected_bot_count - 1) * 2.5)

        return round(min(100.0, base), 1)

    def ingest_event(
        self,
        title: str,
        message: str,
        severity: str = "INFO",
        category: str = "SYSTEM",
        source: str = "System",
        bot_id: str = "",
        worker_id: str = "",
        strategy_id: str = "",
        order_id: str = "",
        position_id: str = "",
        symbol: str = "",
        error_code: str = "",
        root_cause: str = "",
        recommended_action: str = "",
        technical_details: str = "",
        event_id: str = "",
        correlation_id: str = "",
        is_test: bool = False,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Ingests an event into the incident correlation pipeline.
        Deduplicates against active incidents, groups alert storms, records to SQLite,
        and triggers notification policies.
        """
        severity = severity.upper()
        category = category.upper()
        now_utc = datetime.now(timezone.utc)
        now_iso = now_utc.isoformat()

        # Enforce Rule 3 & 4: Routine user lifecycle events must NOT become WARNINGS!
        routine_keywords = ["started", "stopped", "paused", "resumed", "execution resumed", "execution paused"]
        msg_lower = message.lower()
        if category == "BOT" or "bot control" in source.lower():
            if any(k in msg_lower for k in routine_keywords) and "failed" not in msg_lower and "crash" not in msg_lower and "stalled" not in msg_lower:
                if severity == "WARNING":
                    severity = SEVERITY_INFO

        fingerprint = self.generate_fingerprint(
            category=category,
            source=source,
            entity_id=bot_id or symbol or order_id or source,
            error_code=error_code or title
        )

        with self._lock:
            # 1. Check for Active Incident with same Fingerprint
            active_incidents = db.safe_query(
                """
                SELECT * FROM incidents 
                WHERE fingerprint = ? AND status IN ('NEW', 'ACKNOWLEDGED', 'INVESTIGATING')
                ORDER BY created_at DESC LIMIT 1
                """,
                (fingerprint,)
            )

            alert_id = f"ALT-{now_utc.strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"
            meta_json = json.dumps(metadata) if metadata else "{}"

            # Alert Storm Detection
            now_ts = now_utc.timestamp()
            if fingerprint not in self._storm_cache:
                self._storm_cache[fingerprint] = []
            self._storm_cache[fingerprint].append(now_ts)
            # Retain last 60 seconds of timestamps
            self._storm_cache[fingerprint] = [t for t in self._storm_cache[fingerprint] if (now_ts - t) <= 60.0]
            is_storm = len(self._storm_cache[fingerprint]) >= 20

            if active_incidents:
                # 2A. Update Existing Incident (Occurrence Increment & Last Seen Refresh)
                existing = active_incidents[0]
                inc_id = existing["incident_id"]
                new_count = int(existing.get("occurrence_count") or 1) + 1

                new_title = existing["title"]
                if is_storm and "ALERT STORM" not in new_title:
                    new_title = f"[ALERT STORM] {new_title}"

                db.safe_execute(
                    """
                    UPDATE incidents SET 
                        occurrence_count = ?,
                        last_seen_at = ?,
                        title = ?,
                        severity = CASE 
                            WHEN ? = 'CRITICAL' THEN 'CRITICAL'
                            WHEN ? = 'ERROR' AND severity != 'CRITICAL' THEN 'ERROR'
                            ELSE severity 
                        END
                    WHERE incident_id = ?
                    """,
                    (new_count, now_iso, new_title, severity, severity, inc_id)
                )

                # Record granular child alert
                db.safe_execute(
                    """
                    INSERT INTO alerts (
                        alert_id, incident_id, event_id, correlation_id, fingerprint,
                        severity, status, category, source, title, message,
                        technical_details, bot_id, symbol, order_id, position_id,
                        timestamp_utc, is_test, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        alert_id, inc_id, event_id or "", correlation_id or "", fingerprint,
                        severity, STATUS_NEW, category, source, title, message,
                        technical_details, bot_id, symbol, order_id, position_id,
                        now_iso, 1 if is_test else 0, now_iso
                    )
                )

                return {
                    "incident_id": inc_id,
                    "alert_id": alert_id,
                    "action": "DEDUP_INCREMENT",
                    "occurrence_count": new_count,
                    "severity": severity,
                    "fingerprint": fingerprint
                }

            else:
                # 2B. Open New Parent Incident
                inc_id = f"INC-{now_utc.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
                impact = self.calculate_impact_score(severity, is_live_mode=False, open_exposure=0.0)

                db.safe_execute(
                    """
                    INSERT INTO incidents (
                        incident_id, fingerprint, title, summary, severity, status,
                        category, source, bot_id, worker_id, strategy_id, order_id,
                        position_id, symbol, error_code, root_cause, recommended_action,
                        first_seen_at, last_seen_at, created_at, occurrence_count,
                        impact_score, is_test, metadata_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        inc_id, fingerprint, title, message, severity, STATUS_NEW,
                        category, source, bot_id, worker_id, strategy_id, order_id,
                        position_id, symbol, error_code, root_cause, recommended_action,
                        now_iso, now_iso, now_iso, 1, impact, 1 if is_test else 0, meta_json
                    )
                )

                # Record primary child alert
                db.safe_execute(
                    """
                    INSERT INTO alerts (
                        alert_id, incident_id, event_id, correlation_id, fingerprint,
                        severity, status, category, source, title, message,
                        technical_details, bot_id, symbol, order_id, position_id,
                        timestamp_utc, is_test, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        alert_id, inc_id, event_id or "", correlation_id or "", fingerprint,
                        severity, STATUS_NEW, category, source, title, message,
                        technical_details, bot_id, symbol, order_id, position_id,
                        now_iso, 1 if is_test else 0, now_iso
                    )
                )

                # Evaluate Notification Policy
                self._dispatch_external_notification(
                    incident_id=inc_id,
                    alert_id=alert_id,
                    severity=severity,
                    category=category,
                    title=title,
                    message=message,
                    bot_id=bot_id,
                    symbol=symbol,
                    is_test=is_test
                )

                return {
                    "incident_id": inc_id,
                    "alert_id": alert_id,
                    "action": "INCIDENT_OPENED",
                    "occurrence_count": 1,
                    "severity": severity,
                    "fingerprint": fingerprint
                }

    def _dispatch_external_notification(
        self,
        incident_id: str,
        alert_id: str,
        severity: str,
        category: str,
        title: str,
        message: str,
        bot_id: str = "",
        symbol: str = "",
        is_test: bool = False
    ):
        """Evaluates notification policies and dispatches to Telegram without leaking secrets."""
        try:
            # Check alert_rules table for notification routing
            rules = db.safe_query(
                "SELECT * FROM alert_rules WHERE category = ? AND is_enabled = 1",
                (category,)
            )
            telegram_notify = True
            if rules:
                telegram_notify = bool(rules[0].get("telegram_notify", 1))

            # Only notify Telegram for WARNING/ERROR/CRITICAL or test alerts
            if not is_test and severity in [SEVERITY_INFO, SEVERITY_NOTICE] and not telegram_notify:
                return

            from src.telegram_service import global_telegram_service
            delivery_id = f"DEL-{uuid.uuid4().hex[:8]}"

            # Log pending delivery in SQLite
            db.safe_execute(
                """
                INSERT INTO notification_deliveries (
                    delivery_id, incident_id, alert_id, channel, status, created_at
                ) VALUES (?, ?, ?, 'TELEGRAM', 'PENDING', ?)
                """,
                (delivery_id, incident_id, alert_id, datetime.now(timezone.utc).isoformat())
            )

            # Format and queue to Telegram
            if severity == SEVERITY_CRITICAL:
                formatted_text = f"🚨 <b>CRITICAL INCIDENT #{incident_id}</b>\n\n<b>{title}</b>\n{message}\n\n• Bot: <code>{bot_id or 'Fleet'}</code>\n• Symbol: <code>{symbol or 'N/A'}</code>"
            elif severity == SEVERITY_ERROR:
                formatted_text = f"⚠️ <b>ERROR ALERT #{incident_id}</b>\n\n<b>{title}</b>\n{message}\n• Bot: <code>{bot_id or 'System'}</code>"
            else:
                formatted_text = f"ℹ️ <b>NOTIFICATION #{incident_id}</b>\n\n<b>{title}</b>\n{message}"

            if is_test:
                formatted_text = f"🧪 <b>[TEST EVENT]</b> " + formatted_text

            success, res = global_telegram_service.send_message(formatted_text)
            status = "SENT" if success else "FAILED"

            db.safe_execute(
                """
                UPDATE notification_deliveries SET 
                    status = ?, 
                    sent_at = ?, 
                    error_message = ? 
                WHERE delivery_id = ?
                """,
                (status, datetime.now(timezone.utc).isoformat(), str(res) if not success else "", delivery_id)
            )
        except Exception as e:
            logger.error("Error dispatching external alert notification: %s", e)

    def acknowledge_incident(self, incident_id: str, operator_name: str = "Operator") -> Dict[str, Any]:
        """Transitions an incident from NEW to ACKNOWLEDGED."""
        now_iso = datetime.now(timezone.utc).isoformat()
        db.safe_execute(
            """
            UPDATE incidents SET 
                status = 'ACKNOWLEDGED',
                acknowledged_at = ?,
                acknowledged_by = ?
            WHERE incident_id = ? AND status = 'NEW'
            """,
            (now_iso, operator_name, incident_id)
        )
        return {"status": "success", "incident_id": incident_id, "state": STATUS_ACKNOWLEDGED}

    def resolve_incident(self, incident_id: str, operator_name: str = "Operator", note: str = "") -> Dict[str, Any]:
        """Resolves an incident with user attribution and optional resolution note."""
        now_iso = datetime.now(timezone.utc).isoformat()
        db.safe_execute(
            """
            UPDATE incidents SET 
                status = 'RESOLVED',
                resolved_at = ?,
                resolved_by = ?,
                resolution_note = ?
            WHERE incident_id = ?
            """,
            (now_iso, operator_name, note, incident_id)
        )
        return {"status": "success", "incident_id": incident_id, "state": STATUS_RESOLVED}

    def archive_incident(self, incident_id: str, operator_name: str = "Operator") -> Dict[str, Any]:
        """Archives a resolved incident without deleting historical data."""
        now_iso = datetime.now(timezone.utc).isoformat()
        db.safe_execute(
            """
            UPDATE incidents SET 
                status = 'ARCHIVED',
                archived_at = ?,
                archived_by = ?
            WHERE incident_id = ?
            """,
            (now_iso, operator_name, incident_id)
        )
        return {"status": "success", "incident_id": incident_id, "state": STATUS_ARCHIVED}

    def bulk_action(self, action: str, incident_ids: List[str], operator_name: str = "Operator") -> Dict[str, Any]:
        """Applies bulk Acknowledge, Resolve, or Archive actions safely."""
        act = (action or "").upper()
        if not incident_ids:
            return {"status": "success", "affected_count": 0}

        count = 0
        for inc_id in incident_ids:
            if act == "ACKNOWLEDGE":
                self.acknowledge_incident(inc_id, operator_name)
                count += 1
            elif act == "RESOLVE":
                self.resolve_incident(inc_id, operator_name, note="Bulk resolved by operator")
                count += 1
            elif act == "ARCHIVE":
                self.archive_incident(inc_id, operator_name)
                count += 1

        return {"status": "success", "action": act, "affected_count": count}

    def auto_resolve_by_fingerprint(self, fingerprint: str, resolution_reason: str = "Condition recovered") -> int:
        """Automatically resolves active incidents when recovery event is detected."""
        now_iso = datetime.now(timezone.utc).isoformat()
        active = db.safe_query(
            "SELECT incident_id FROM incidents WHERE fingerprint = ? AND status IN ('NEW', 'ACKNOWLEDGED', 'INVESTIGATING')",
            (fingerprint,)
        )
        for row in active:
            self.resolve_incident(row["incident_id"], operator_name="SYSTEM", note=resolution_reason)
        return len(active)

    def get_incidents(
        self,
        status: str = "ALL",
        severity: str = "ALL",
        category: str = "ALL",
        bot_id: str = "ALL",
        search: str = "",
        timeframe: str = "ALL",
        limit: int = 50,
        offset: int = 0,
        is_test: Optional[int] = 0
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Server-side filtered and paginated query for incidents."""
        query = "SELECT * FROM incidents WHERE 1=1"
        count_query = "SELECT COUNT(*) FROM incidents WHERE 1=1"
        params = []

        if is_test is not None:
            query += " AND COALESCE(is_test, 0) = ?"
            count_query += " AND COALESCE(is_test, 0) = ?"
            params.append(is_test)

        if status != "ALL":
            if status == "ACTIVE":
                query += " AND status IN ('NEW', 'ACKNOWLEDGED', 'INVESTIGATING')"
                count_query += " AND status IN ('NEW', 'ACKNOWLEDGED', 'INVESTIGATING')"
            else:
                query += " AND status = ?"
                count_query += " AND status = ?"
                params.append(status)

        if severity != "ALL":
            query += " AND severity = ?"
            count_query += " AND severity = ?"
            params.append(severity.upper())

        if category != "ALL":
            query += " AND category = ?"
            count_query += " AND category = ?"
            params.append(category.upper())

        if bot_id != "ALL":
            query += " AND (bot_id = ? OR bot_id = '')"
            count_query += " AND (bot_id = ? OR bot_id = '')"
            params.append(bot_id)

        if search:
            s_param = f"%{search}%"
            query += " AND (title LIKE ? OR summary LIKE ? OR symbol LIKE ? OR incident_id LIKE ? OR bot_id LIKE ?)"
            count_query += " AND (title LIKE ? OR summary LIKE ? OR symbol LIKE ? OR incident_id LIKE ? OR bot_id LIKE ?)"
            params.extend([s_param, s_param, s_param, s_param, s_param])

        if timeframe != "ALL":
            now = datetime.now(timezone.utc)
            delta = None
            if timeframe == "1H":
                delta = timedelta(hours=1)
            elif timeframe == "6H":
                delta = timedelta(hours=6)
            elif timeframe == "24H":
                delta = timedelta(hours=24)
            elif timeframe == "7D":
                delta = timedelta(days=7)
            if delta:
                cut_off = (now - delta).isoformat()
                query += " AND created_at >= ?"
                count_query += " AND created_at >= ?"
                params.append(cut_off)

        # Count total
        count_rows = db.safe_query(count_query, tuple(params))
        total_count = int(list(count_rows[0].values())[0]) if count_rows and count_rows[0] else 0

        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
        query_params = list(params)
        query_params.extend([limit, offset])

        rows = db.safe_query(query, tuple(query_params))
        return [dict(r) for r in rows], total_count

    def get_incident_detail(self, incident_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves full incident record, linked alerts, operator comments, and delivery telemetry."""
        inc_rows = db.safe_query("SELECT * FROM incidents WHERE incident_id = ?", (incident_id,))
        if not inc_rows:
            return None

        incident = dict(inc_rows[0])
        alerts = db.safe_query("SELECT * FROM alerts WHERE incident_id = ? ORDER BY created_at ASC", (incident_id,))
        comments = db.safe_query("SELECT * FROM incident_comments WHERE incident_id = ? ORDER BY created_at ASC", (incident_id,))
        deliveries = db.safe_query("SELECT * FROM notification_deliveries WHERE incident_id = ? ORDER BY created_at DESC", (incident_id,))

        incident["alerts"] = [dict(a) for a in alerts]
        incident["comments"] = [dict(c) for c in comments]
        incident["deliveries"] = [dict(d) for d in deliveries]

        # Calculate Active Duration
        try:
            t1 = datetime.fromisoformat(incident["first_seen_at"].replace("Z", "+00:00"))
            if incident.get("resolved_at"):
                t2 = datetime.fromisoformat(incident["resolved_at"].replace("Z", "+00:00"))
            else:
                t2 = datetime.now(timezone.utc)
            duration_sec = max(0, int((t2 - t1).total_seconds()))
            m, s = divmod(duration_sec, 60)
            h, m = divmod(m, 60)
            incident["active_duration_str"] = f"{h}h {m}m {s}s" if h > 0 else (f"{m}m {s}s" if m > 0 else f"{s}s")
            incident["active_duration_sec"] = duration_sec
        except Exception:
            incident["active_duration_str"] = "N/A"
            incident["active_duration_sec"] = 0

        return incident

    def get_metrics_summary(self) -> Dict[str, Any]:
        """Calculates authoritative KPI strip statistics from database records."""
        incidents = db.safe_query("SELECT * FROM incidents WHERE COALESCE(is_test, 0) = 0")

        active_incidents = [i for i in incidents if i.get("status") in ["NEW", "ACKNOWLEDGED", "INVESTIGATING"]]
        critical_count = sum(1 for i in active_incidents if i.get("severity") == SEVERITY_CRITICAL)
        error_count = sum(1 for i in active_incidents if i.get("severity") == SEVERITY_ERROR)
        warning_count = sum(1 for i in active_incidents if i.get("severity") == SEVERITY_WARNING)
        unack_count = sum(1 for i in active_incidents if i.get("status") == STATUS_NEW)

        affected_bots = set()
        for i in active_incidents:
            b = i.get("bot_id")
            if b:
                affected_bots.add(b)

        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        resolved_today = sum(
            1 for i in incidents 
            if i.get("status") in ["RESOLVED", "ARCHIVED"] and (i.get("resolved_at") or "").startswith(today_str)
        )

        return {
            "total_incidents": len(incidents),
            "active_incidents": len(active_incidents),
            "critical": critical_count,
            "error": error_count,
            "warning": warning_count,
            "unacknowledged": unack_count,
            "affected_bots_count": len(affected_bots),
            "affected_bots": list(affected_bots),
            "resolved_today": resolved_today,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }


# Global Alert Engine Singleton
global_alert_engine = AlertEngine()
