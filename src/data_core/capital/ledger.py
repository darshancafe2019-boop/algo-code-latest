"""
Authoritative Capital Ledger
============================
Append-only, immutable financial transaction ledger for Quant.OS.
Tracks all monetary movements with strict environment and broker segregation.

Invariants:
1. Every record is immutable once appended.
2. PAPER transactions never alter LIVE account balances; LIVE events never mutate PAPER accounts.
3. Every transaction records amount, direction (CREDIT/DEBIT), reason, and resulting balance_after.
"""
from __future__ import annotations

import collections
import logging
import threading
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from src.data_core.models import (
    LedgerEntry,
    LedgerEntryType,
    LedgerDirection,
    Environment,
    NormalizedEvent,
    EventType,
    EventDomain,
)
from src.data_core.events.bus import global_event_bus

logger = logging.getLogger("CapitalLedger")


class CapitalLedger:
    """Thread-safe append-only ledger tracking all financial mutations."""

    def __init__(self, max_history: int = 10000):
        self._entries: collections.deque[LedgerEntry] = collections.deque(maxlen=max_history)
        self._balances: Dict[str, float] = collections.defaultdict(float)
        self._lock = threading.RLock()
        self._bootstrap_initial_balances()

    def _get_key(self, provider: str, account_id: str, environment: Environment, currency: str) -> str:
        return f"{provider.upper()}:{account_id}:{environment.value}:{currency.upper()}"

    def _bootstrap_initial_balances(self) -> None:
        """Seeds standard baseline balances for paper environments."""
        self.record_entry(
            provider="PAPER",
            account_id="paper_primary",
            environment=Environment.PAPER,
            currency="USD",
            amount=100000.0,
            direction=LedgerDirection.CREDIT,
            entry_type=LedgerEntryType.DEPOSIT,
            reason="Initial paper capital allocation",
            reference_id="SEED-001",
        )
        self.record_entry(
            provider="DHAN",
            account_id="dhan_paper",
            environment=Environment.PAPER,
            currency="INR",
            amount=1000000.0,
            direction=LedgerDirection.CREDIT,
            entry_type=LedgerEntryType.DEPOSIT,
            reason="Initial Dhan paper trading balance",
            reference_id="SEED-DHAN-001",
        )
        self.record_entry(
            provider="UPSTOX",
            account_id="upstox_paper",
            environment=Environment.PAPER,
            currency="INR",
            amount=1000000.0,
            direction=LedgerDirection.CREDIT,
            entry_type=LedgerEntryType.DEPOSIT,
            reason="Initial Upstox paper trading balance",
            reference_id="SEED-UPSTOX-001",
        )
        self.record_entry(
            provider="DELTA",
            account_id="delta_paper",
            environment=Environment.PAPER,
            currency="USD",
            amount=50000.0,
            direction=LedgerDirection.CREDIT,
            entry_type=LedgerEntryType.DEPOSIT,
            reason="Initial Delta paper trading balance",
            reference_id="SEED-DELTA-001",
        )

    def record_entry(
        self,
        provider: str,
        account_id: str,
        environment: Environment,
        currency: str,
        amount: float,
        direction: LedgerDirection,
        entry_type: LedgerEntryType,
        reason: str,
        reference_id: Optional[str] = None,
    ) -> LedgerEntry:
        """Appends an immutable entry to the capital ledger and calculates resulting balance."""
        with self._lock:
            key = self._get_key(provider, account_id, environment, currency)
            current_bal = self._balances[key]

            if direction == LedgerDirection.CREDIT:
                new_bal = current_bal + amount
            else:
                new_bal = current_bal - amount

            self._balances[key] = round(new_bal, 4)

            entry = LedgerEntry(
                provider=provider.upper(),
                account_id=account_id,
                environment=environment,
                currency=currency.upper(),
                amount=round(amount, 4),
                direction=direction,
                entry_type=entry_type,
                reason=reason,
                reference_id=reference_id,
                balance_after=round(new_bal, 4),
            )

            self._entries.append(entry)

        # Emit audit event to global event bus
        global_event_bus.publish(
            NormalizedEvent(
                event_type=EventType.CAPITAL_ALLOCATION if entry_type == LedgerEntryType.ALLOCATION else EventType.BALANCE_UPDATE,
                domain=EventDomain.CAPITAL,
                provider=provider,
                account_id=account_id,
                environment=environment,
                payload=entry.to_dict(),
            )
        )

        return entry

    def get_balance(
        self,
        provider: str,
        account_id: str,
        environment: Environment,
        currency: str,
    ) -> float:
        """Gets current authoritative cash balance for a specific account."""
        with self._lock:
            key = self._get_key(provider, account_id, environment, currency)
            return self._balances.get(key, 0.0)

    def get_history(
        self,
        provider: Optional[str] = None,
        account_id: Optional[str] = None,
        environment: Optional[Environment] = None,
        currency: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Queries ledger audit entries matching criteria (newest first)."""
        with self._lock:
            entries = list(self._entries)

        results = []
        for e in reversed(entries):
            if provider and e.provider != provider.upper():
                continue
            if account_id and e.account_id != account_id:
                continue
            if environment and e.environment != environment:
                continue
            if currency and e.currency != currency.upper():
                continue

            results.append(e.to_dict())
            if len(results) >= limit:
                break

        return results


# Global Singleton Capital Ledger Instance
global_capital_ledger = CapitalLedger()
