"""
Quant.OS Tax Intelligence — Tax Deadline Engine
===============================================
Computes statutory tax filing, advance payment, and compliance deadlines
customized by jurisdiction, taxpayer entity type, and fiscal year.
"""

from datetime import datetime, timezone
from typing import List
from src.tax_engine.jurisdictions import jurisdiction_adapters
from src.tax_engine.models import TaxDeadline, TaxpayerProfile


class TaxDeadlineEngine:
    """
    Generates and tracks official tax deadlines and days remaining for portfolios.
    """

    def get_upcoming_deadlines(
        self,
        taxpayer: TaxpayerProfile,
        estimated_tax: float,
        tax_year: str = "FY 2025-26",
    ) -> List[TaxDeadline]:
        primary_country = taxpayer.primary_residence.upper()
        adapter = jurisdiction_adapters.get_adapter(primary_country)
        if not adapter:
            return []

        deadlines = adapter.determine_deadlines(
            taxpayer=taxpayer,
            tax_year=tax_year,
            estimated_tax=estimated_tax,
        )

        now = datetime.now(timezone.utc).replace(tzinfo=None)

        # Update days remaining & statuses
        for dl in deadlines:
            due_dt = self._parse_date(dl.due_date)
            if due_dt:
                diff_days = (due_dt - now).days
                dl.days_remaining = diff_days
                if diff_days < 0:
                    dl.status = "OVERDUE"
                elif diff_days <= 14:
                    dl.status = "APPROACHING"
                else:
                    dl.status = "UPCOMING"

        return sorted(deadlines, key=lambda d: d.due_date)

    def _parse_date(self, date_str: str) -> datetime:
        try:
            return datetime.strptime(date_str[:10], "%Y-%m-%d")
        except Exception:
            return datetime.now(timezone.utc).replace(tzinfo=None)



# Global Singleton
tax_deadline_engine = TaxDeadlineEngine()
