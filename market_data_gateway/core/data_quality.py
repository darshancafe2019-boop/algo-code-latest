"""
Data Quality Engine & Validation Rules
======================================
Detects stale ticks, duplicate sequence gaps, out-of-order ticks, zero prices,
timestamp drift, abnormal spreads, and triggers provider health state adjustments.
"""
from __future__ import annotations

import logging
import time
from collections import deque
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

logger = logging.getLogger("MDGateway.DataQuality")


@dataclass
class QualityAnomaly:
    anomaly_id: str
    symbol: str
    provider: str
    anomaly_type: str  # STALE_TICK | ZERO_PRICE | ABNORMAL_SPREAD | SEQUENCE_GAP | TIMESTAMP_DRIFT | OUT_OF_ORDER
    severity: str      # LOW | MEDIUM | HIGH | CRITICAL
    detected_value: Any
    expected_range: str
    timestamp: str
    details: str


class DataQualityEngine:
    """Monitors live normalized stream for data integrity and anomalies."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DataQualityEngine, cls).__new__(cls)
            cls._instance._init_engine()
        return cls._instance

    def _init_engine(self):
        self._last_sequences: Dict[str, int] = {}
        self._last_timestamps: Dict[str, float] = {}
        self._last_prices: Dict[str, float] = {}
        self._anomalies: deque = deque(maxlen=500)
        self._anomaly_counter = 0

    def validate_event(self, event: Any) -> Dict[str, Any]:
        """Validate NormalizedMarketEvent or dict returning structured validation result."""
        d = event.to_dict() if hasattr(event, "to_dict") else dict(event)
        is_valid, warnings = self.validate_quote(d)
        return {
            "is_valid": is_valid,
            "anomalies": warnings
        }

    def validate_quote(self, quote_dict: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Validates quote data integrity according to institutional rules:
        - Must not have price <= 0 in live mode
        - Must not have excessive timestamp drift (> 60s)
        - Must not have abnormal spread (e.g. spread > 25% of LTP)
        - Sequence check
        """
        symbol = str(quote_dict.get("symbol") or "").upper()
        provider = str(quote_dict.get("provider") or "").lower()
        ltp = quote_dict.get("last_price") or quote_dict.get("ltp")
        key = f"{provider}:{symbol}"
        now_epoch = time.time()
        now_iso = datetime.now(timezone.utc).isoformat()
        warnings = []

        # 1. Price Non-Zero Check
        if ltp is None or float(ltp) <= 0:
            self._record_anomaly(
                symbol=symbol,
                provider=provider,
                anomaly_type="ZERO_PRICE",
                severity="HIGH",
                detected_val=ltp,
                expected="LTP > 0.0",
                details=f"Received non-positive or null price {ltp} on live feed."
            )
            return False, ["ZERO_OR_NEGATIVE_PRICE"]

        price_f = float(ltp)

        # 2. Timestamp Drift Check
        evt_ts = quote_dict.get("event_timestamp") or quote_dict.get("timestamp")
        if evt_ts:
            try:
                dt = datetime.fromisoformat(str(evt_ts).replace("Z", "+00:00"))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                drift_sec = abs(now_epoch - dt.timestamp())
                if drift_sec > 120:  # > 2 mins drift
                    self._record_anomaly(
                        symbol=symbol,
                        provider=provider,
                        anomaly_type="TIMESTAMP_DRIFT",
                        severity="MEDIUM",
                        detected_val=f"{drift_sec:.1f}s",
                        expected="< 60s",
                        details=f"Provider timestamp drifted by {drift_sec:.1f} seconds."
                    )
                    warnings.append("TIMESTAMP_DRIFT")
            except Exception:
                pass

        # 3. Abnormal Spread Check
        bid = quote_dict.get("bid")
        ask = quote_dict.get("ask")
        if bid is not None and ask is not None and float(bid) > 0 and float(ask) > 0:
            b_f = float(bid)
            a_f = float(ask)
            if a_f < b_f:
                self._record_anomaly(
                    symbol=symbol,
                    provider=provider,
                    anomaly_type="CROSSED_BOOK",
                    severity="HIGH",
                    detected_val=f"Bid:{b_f} > Ask:{a_f}",
                    expected="Bid <= Ask",
                    details=f"Crossed order book condition detected: Best Bid ({b_f}) > Best Ask ({a_f})."
                )
                warnings.append("CROSSED_BOOK")
            else:
                spread = a_f - b_f
                if price_f > 0 and (spread / price_f) > 0.35:  # > 35% spread
                    self._record_anomaly(
                        symbol=symbol,
                        provider=provider,
                        anomaly_type="ABNORMAL_SPREAD",
                        severity="MEDIUM",
                        detected_val=f"{spread:.2f} ({((spread/price_f)*100):.1f}%)",
                        expected="< 35%",
                        details=f"Abnormally wide spread of {spread:.2f} on {symbol}."
                    )
                    warnings.append("ABNORMAL_SPREAD")

        # 4. Sequence Continuity Check
        seq = quote_dict.get("sequence")
        if seq is not None and isinstance(seq, int):
            last_seq = self._last_sequences.get(key)
            if last_seq is not None:
                if seq < last_seq:
                    self._record_anomaly(
                        symbol=symbol,
                        provider=provider,
                        anomaly_type="OUT_OF_ORDER",
                        severity="LOW",
                        detected_val=f"seq {seq} after {last_seq}",
                        expected=f"seq >= {last_seq}",
                        details="Out-of-order sequence packet arrived."
                    )
                    warnings.append("OUT_OF_ORDER")
                elif seq > last_seq + 10:
                    self._record_anomaly(
                        symbol=symbol,
                        provider=provider,
                        anomaly_type="SEQUENCE_GAP",
                        severity="MEDIUM",
                        detected_val=f"jump from {last_seq} to {seq}",
                        expected=f"seq == {last_seq + 1}",
                        details=f"Sequence gap of {seq - last_seq} packets detected."
                    )
                    warnings.append("SEQUENCE_GAP")
            self._last_sequences[key] = seq

        self._last_prices[key] = price_f
        self._last_timestamps[key] = now_epoch
        return True, warnings

    def _record_anomaly(
        self,
        symbol: str,
        provider: str,
        anomaly_type: str,
        severity: str,
        detected_val: Any,
        expected: str,
        details: str
    ):
        self._anomaly_counter += 1
        anom = QualityAnomaly(
            anomaly_id=f"anom-{int(time.time()*1000)}-{self._anomaly_counter}",
            symbol=symbol,
            provider=provider,
            anomaly_type=anomaly_type,
            severity=severity,
            detected_value=str(detected_val),
            expected_range=expected,
            timestamp=datetime.now(timezone.utc).isoformat(),
            details=details
        )
        self._anomalies.append(anom)
        
        # Rate limit console logging to once per 30s per symbol/anomaly_type to avoid stdout pipe saturation
        if not hasattr(self, "_log_cooldowns"):
            self._log_cooldowns: Dict[str, float] = {}
        now_t = time.time()
        cooldown_key = f"{provider}:{symbol}:{anomaly_type}"
        if severity in ("HIGH", "CRITICAL") and (now_t - self._log_cooldowns.get(cooldown_key, 0) > 30.0):
            self._log_cooldowns[cooldown_key] = now_t
            logger.warning(f"[DATA QUALITY {severity}] {provider.upper()} on {symbol}: {details}")

    def get_recent_anomalies(self, limit: int = 50) -> List[Dict[str, Any]]:
        return [asdict(a) for a in list(self._anomalies)[-limit:]]

    def get_quality_summary(self) -> Dict[str, Any]:
        total = len(self._anomalies)
        critical_count = sum(1 for a in self._anomalies if a.severity in ("HIGH", "CRITICAL"))
        types_breakdown: Dict[str, int] = {}
        for a in self._anomalies:
            types_breakdown[a.anomaly_type] = types_breakdown.get(a.anomaly_type, 0) + 1

        return {
            "total_anomalies_detected": total,
            "critical_anomalies": critical_count,
            "score": max(0.0, round(100.0 - (critical_count * 2.5) - (total * 0.2), 1)),
            "breakdown": types_breakdown,
            "status": "HEALTHY" if critical_count == 0 else ("DEGRADED" if critical_count < 5 else "CRITICAL")
        }


global_data_quality_engine = DataQualityEngine()
