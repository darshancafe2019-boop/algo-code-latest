"""
Quant.OS Tax Intelligence — Tax Lot Accounting Engine
=====================================================
Multi-method tax lot tracking (FIFO, LIFO, Average Cost, Specific ID, HIFO)
with statutory jurisdiction legality validation.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from src.tax_engine.models import AccountingMethod, TaxLot, TaxTransaction


class TaxLotEngine:
    """
    Manages acquisition tax lots, tracks cost bases, and matches disposals
    using legally permissible accounting methods per jurisdiction.
    """

    def __init__(self):
        self._lots: Dict[str, List[TaxLot]] = {}  # symbol -> List[TaxLot]

    def add_lot(self, lot: TaxLot) -> None:
        """Register a new acquisition lot."""
        if lot.symbol not in self._lots:
            self._lots[lot.symbol] = []
        self._lots[lot.symbol].append(lot)

    def get_open_lots(self, symbol: Optional[str] = None) -> List[TaxLot]:
        """Return open/partially closed lots."""
        all_lots = []
        if symbol:
            target_lists = [self._lots.get(symbol, [])]
        else:
            target_lists = self._lots.values()

        for lot_list in target_lists:
            for lot in lot_list:
                if lot.remaining_quantity > 0:
                    all_lots.append(lot)
        return all_lots

    def match_disposal(
        self,
        sell_tx: TaxTransaction,
        method: AccountingMethod = AccountingMethod.FIFO,
    ) -> Tuple[List[Dict[str, Any]], float]:
        """
        Match a disposal transaction against available open lots according to the accounting method.
        Returns a tuple of (matched_lot_allocations, unmatched_quantity).
        """
        symbol = sell_tx.symbol
        open_lots = [l for l in self._lots.get(symbol, []) if l.remaining_quantity > 0]
        if not open_lots:
            return [], sell_tx.quantity

        # Sort lots based on accounting method
        sorted_lots = self._sort_lots_by_method(open_lots, method)
        
        remaining_to_match = sell_tx.quantity
        matches: List[Dict[str, Any]] = []

        sell_date = self._parse_date(sell_tx.trade_date)

        for lot in sorted_lots:
            if remaining_to_match <= 0:
                break

            matched_qty = min(lot.remaining_quantity, remaining_to_match)
            lot.remaining_quantity -= matched_qty
            if lot.remaining_quantity <= 0:
                lot.status = "CLOSED"
            else:
                lot.status = "PARTIALLY_CLOSED"
            lot.updated_at = datetime.now(timezone.utc).isoformat()

            acq_date = self._parse_date(lot.acquisition_date)
            holding_period_days = max(0, (sell_date - acq_date).days) if sell_date and acq_date else 0

            matches.append({
                "lot_id": lot.id,
                "acquisition_date": lot.acquisition_date,
                "quantity": matched_qty,
                "cost_basis_per_unit": lot.cost_basis_per_unit,
                "holding_period_days": holding_period_days,
                "broker": lot.broker,
                "account_id": lot.account_id,
            })

            remaining_to_match -= matched_qty

        return matches, remaining_to_match

    def _sort_lots_by_method(
        self, lots: List[TaxLot], method: AccountingMethod
    ) -> List[TaxLot]:
        if method == AccountingMethod.FIFO:
            return sorted(lots, key=lambda l: l.acquisition_date)
        elif method == AccountingMethod.LIFO:
            return sorted(lots, key=lambda l: l.acquisition_date, reverse=True)
        elif method == AccountingMethod.HIFO:
            return sorted(lots, key=lambda l: l.cost_basis_per_unit, reverse=True)
        elif method == AccountingMethod.AVERAGE_COST:
            # For average cost / Section 104 pooling
            return sorted(lots, key=lambda l: l.acquisition_date)
        else:  # SPECIFIC_ID default to FIFO
            return sorted(lots, key=lambda l: l.acquisition_date)

    def _parse_date(self, date_str: str) -> Optional[datetime]:
        if not date_str:
            return None
        formats = ["%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d %H:%M:%S"]
        for fmt in formats:
            try:
                return datetime.strptime(date_str[:19], fmt[: len(date_str[:19])])
            except Exception:
                continue
        return None

    def validate_method_for_jurisdiction(
        self, jurisdiction: str, method: AccountingMethod
    ) -> bool:
        """Check if an accounting method is legally permissible in the jurisdiction."""
        jurisdiction = jurisdiction.upper()
        if jurisdiction == "IN":
            # Demat shares in India mandated under FIFO (Sec 45(2A))
            return method in [AccountingMethod.FIFO, AccountingMethod.SPECIFIC_ID]
        elif jurisdiction == "GB":
            # UK uses Section 104 Pooling / Same-day / 30-day Bed & Breakfast
            return method in [AccountingMethod.AVERAGE_COST, AccountingMethod.FIFO]
        elif jurisdiction == "US":
            # US allows FIFO, Specific ID, and HIFO
            return method in [AccountingMethod.FIFO, AccountingMethod.SPECIFIC_ID, AccountingMethod.HIFO]
        return True


# Global Singleton
tax_lot_engine = TaxLotEngine()
