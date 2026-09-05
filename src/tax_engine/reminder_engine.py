"""
Quant.OS Tax Intelligence — Tax Reminder Engine
===============================================
Generates proactive alerts and calendar reminders at 90, 60, 30, 14, 7, 3, 1 days
before statutory tax deadlines.
"""

from typing import List
from src.tax_engine.models import AlertSeverity, TaxAlert, TaxConfidence, TaxDeadline, TaxpayerProfile


class TaxReminderEngine:
    """
    Evaluates upcoming tax obligations and produces timely reminders.
    """

    REMINDER_THRESHOLDS = [90, 60, 30, 14, 7, 3, 1, 0]

    def generate_reminders_for_deadlines(
        self, deadlines: List[TaxDeadline], taxpayer: TaxpayerProfile
    ) -> List[TaxAlert]:
        reminders: List[TaxAlert] = []

        for dl in deadlines:
            days = dl.days_remaining
            severity = "INFORMATIONAL"

            if days < 0:
                severity = "CRITICAL"
                title = f"OVERDUE: {dl.title}"
                msg = f"Tax deadline was due on {dl.due_date} ({abs(days)} days ago). Estimated amount: {dl.currency} {dl.estimated_amount:,.2f}. Penalties/interest may accrue."
            elif days <= 3:
                severity = "CRITICAL"
                title = f"URGENT: {dl.title} Due in {days} Days"
                msg = f"Immediate action required. Statutory deadline on {dl.due_date}. Estimated payable: {dl.currency} {dl.estimated_amount:,.2f}."
            elif days <= 14:
                severity = "HIGH"
                title = f"Approaching Deadline: {dl.title} ({days} Days Remaining)"
                msg = f"Statutory due date: {dl.due_date}. Estimated payable: {dl.currency} {dl.estimated_amount:,.2f}. Reference: {dl.statutory_reference}."
            elif days <= 30:
                severity = "MEDIUM"
                title = f"Upcoming Deadline: {dl.title} in {days} Days"
                msg = f"Scheduled for {dl.due_date}. Estimated obligation: {dl.currency} {dl.estimated_amount:,.2f}."
            else:
                continue  # Future reminder

            reminders.append(
                TaxAlert(
                    id=f"REMINDER_{dl.id}",
                    alert_type="TAX_DEADLINE",
                    symbol="",
                    title=title,
                    message=msg,
                    severity=severity,
                    confidence=dl.confidence,
                    potential_tax_saving=0.0,
                    currency=dl.currency,
                    status="ACTIVE",
                )
            )

        return reminders


# Global Singleton
tax_reminder_engine = TaxReminderEngine()
