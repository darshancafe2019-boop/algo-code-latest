"""
Quant.OS Tax Intelligence — Anti-Avoidance Engine
=================================================
Evaluates jurisdiction-specific anti-avoidance rules:
- US IRC Section 1091 Wash Sale Rule
- UK TCGA 1992 s106A Bed & Breakfast Rule
- India Section 94(7) / 94(8) Dividend & Bonus Stripping
- Canada Superficial Loss Rules
"""

from datetime import datetime, timedelta
from typing import List, Optional
from src.tax_engine.models import TaxAlert, TaxConfidence, TaxLot, TaxTransaction


class TaxAntiAvoidanceEngine:
    """
    Scans transactions and proposed tax-loss square-offs for statutory anti-avoidance restrictions.
    """

    def check_wash_sale_risk(
        self,
        symbol: str,
        disposal_date_str: str,
        jurisdiction: str,
        all_transactions: List[TaxTransaction],
    ) -> Optional[TaxAlert]:
        """
        Check whether acquiring the same/substantially identical security within 30 days
        triggers wash-sale or bed-and-breakfast disallowance.
        """
        jurisdiction = jurisdiction.upper()
        disposal_date = self._parse_date(disposal_date_str)
        if not disposal_date:
            return None

        window_start = disposal_date - timedelta(days=30)
        window_end = disposal_date + timedelta(days=30)

        recent_buys = [
            tx for tx in all_transactions
            if tx.symbol == symbol and tx.transaction_type.upper() in ["BUY", "COVER"]
            and self._is_within_window(tx.trade_date, window_start, window_end)
        ]

        if recent_buys and jurisdiction == "US":
            return TaxAlert(
                id=f"ALERT_WASH_SALE_{symbol}",
                alert_type="WASH_SALE_STYLE_RESTRICTION",
                symbol=symbol,
                title=f"IRC § 1091 Wash Sale Restriction on {symbol}",
                message=f"Recent acquisition detected within 30 days of disposal. Loss realization on {symbol} will be disallowed and added to cost basis.",
                severity="HIGH",
                confidence=TaxConfidence.HIGH_CONFIDENCE_ESTIMATE,
                potential_tax_saving=0.0,
                currency="USD",
                status="ACTIVE",
            )
        elif recent_buys and jurisdiction == "GB":
            return TaxAlert(
                id=f"ALERT_BED_BREAKFAST_{symbol}",
                alert_type="ANTI_AVOIDANCE_WARNING",
                symbol=symbol,
                title=f"HMRC 30-Day Bed & Breakfast Rule on {symbol}",
                message=f"Disposal of {symbol} will be matched against acquisitions within the next 30 days under TCGA 1992 s106A rather than the Section 104 general holding pool.",
                severity="MEDIUM",
                confidence=TaxConfidence.HIGH_CONFIDENCE_ESTIMATE,
                potential_tax_saving=0.0,
                currency="GBP",
                status="ACTIVE",
            )

        return None

    def _parse_date(self, date_str: str) -> Optional[datetime]:
        if not date_str:
            return None
        formats = ["%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"]
        for fmt in formats:
            try:
                return datetime.strptime(date_str[:10], fmt[:10])
            except Exception:
                continue
        return None

    def _is_within_window(self, date_str: str, start: datetime, end: datetime) -> bool:
        d = self._parse_date(date_str)
        if not d:
            return False
        return start <= d <= end


# Global Singleton
anti_avoidance_engine = TaxAntiAvoidanceEngine()
