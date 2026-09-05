"""
Quant.OS Tax Intelligence — Tax Action Advisor & Position Monitor
=================================================================
Evaluates open positions for tax-loss harvesting, holding-period threshold countdowns,
and generates tax review priority scores.
NEVER automatically closes trades. Strictly advisory decision support.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from src.tax_engine.anti_avoidance import anti_avoidance_engine
from src.tax_engine.jurisdictions import jurisdiction_adapters
from src.tax_engine.models import (
    IncomeClassification,
    TaxAlert,
    TaxConfidence,
    TaxLot,
    TaxpayerProfile,
    TaxTransaction,
)


class TaxActionAdvisor:
    """
    Analyzes live open positions against jurisdiction rules to identify
    tax-loss harvesting opportunities, holding-period milestones, and anti-avoidance alerts.
    """

    def analyze_open_positions(
        self,
        open_lots: List[TaxLot],
        current_prices: Dict[str, float],
        taxpayer: TaxpayerProfile,
        all_transactions: List[TaxTransaction],
    ) -> List[Dict[str, Any]]:
        """
        Evaluate each open tax lot for current unrealized tax exposure,
        holding period countdown, and potential tax consequences if closed today.
        """
        adapter = jurisdiction_adapters.get_adapter(taxpayer.primary_residence)
        analysis_results: List[Dict[str, Any]] = []

        now = datetime.now(timezone.utc).replace(tzinfo=None)


        for lot in open_lots:
            if lot.remaining_quantity <= 0:
                continue

            symbol = lot.symbol
            current_price = current_prices.get(symbol, lot.cost_basis_per_unit)
            market_value = round(lot.remaining_quantity * current_price, 2)
            cost_basis = round(lot.remaining_quantity * lot.cost_basis_per_unit, 2)
            unrealized_pl = round(market_value - cost_basis, 2)

            acq_date = self._parse_date(lot.acquisition_date)
            holding_period_days = (now - acq_date).days if acq_date else 0

            threshold_days = 365
            if adapter:
                threshold_days = adapter.get_holding_period_threshold_days(lot.asset_class)

            days_remaining_for_ltcg = max(0, threshold_days - holding_period_days) if threshold_days > 0 else 0

            # Current classification if closed today
            curr_class = "SHORT_TERM_CAPITAL_GAIN" if (threshold_days > 0 and holding_period_days <= threshold_days) else "LONG_TERM_CAPITAL_GAIN"
            future_class = "LONG_TERM_CAPITAL_GAIN"

            # Tax estimate if closed today
            est_tax_if_sold_now = 0.0
            est_tax_after_threshold = 0.0

            if unrealized_pl > 0:
                if taxpayer.primary_residence == "IN":
                    est_tax_if_sold_now = round(unrealized_pl * 0.20, 2)  # STCG 20%
                    est_tax_after_threshold = round(unrealized_pl * 0.125, 2)  # LTCG 12.5%
                elif taxpayer.primary_residence == "US":
                    est_tax_if_sold_now = round(unrealized_pl * 0.30, 2)  # Ordinary
                    est_tax_after_threshold = round(unrealized_pl * 0.15, 2)  # Preferential 15%
                elif taxpayer.primary_residence == "DE" and lot.asset_class.lower() in ["crypto", "vda"]:
                    est_tax_if_sold_now = round(unrealized_pl * 0.30, 2)
                    est_tax_after_threshold = 0.0  # 100% Tax free after 1 year

            potential_tax_savings_waiting = round(max(0.0, est_tax_if_sold_now - est_tax_after_threshold), 2)

            # Calculate Tax Review Priority Score (0 - 100)
            priority_score = self._compute_priority_score(
                unrealized_pl=unrealized_pl,
                days_remaining=days_remaining_for_ltcg,
                potential_savings=potential_tax_savings_waiting,
            )

            # Check Wash Sale / Anti-avoidance
            wash_sale_alert = anti_avoidance_engine.check_wash_sale_risk(
                symbol=symbol,
                disposal_date_str=now.strftime("%Y-%m-%d"),
                jurisdiction=taxpayer.primary_residence,
                all_transactions=all_transactions,
            )

            analysis_results.append({
                "lot_id": lot.id,
                "symbol": symbol,
                "asset_class": lot.asset_class,
                "broker": lot.broker,
                "account_id": lot.account_id,
                "quantity": lot.remaining_quantity,
                "cost_basis_per_unit": lot.cost_basis_per_unit,
                "total_cost_basis": cost_basis,
                "current_price": current_price,
                "market_value": market_value,
                "unrealized_pl": unrealized_pl,
                "holding_period_days": holding_period_days,
                "statutory_threshold_days": threshold_days,
                "days_remaining_to_threshold": days_remaining_for_ltcg,
                "current_classification_if_sold": curr_class,
                "future_classification": future_class,
                "estimated_tax_if_sold_now": est_tax_if_sold_now,
                "estimated_tax_after_threshold": est_tax_after_threshold,
                "potential_tax_savings_waiting": potential_tax_savings_waiting,
                "tax_action_priority_score": priority_score,
                "anti_avoidance_warning": wash_sale_alert.to_dict() if wash_sale_alert else None,
                "confidence": TaxConfidence.HIGH_CONFIDENCE_ESTIMATE.value,
            })

        return sorted(analysis_results, key=lambda r: r["tax_action_priority_score"], reverse=True)

    def generate_advisory_alerts(
        self,
        analyzed_positions: List[Dict[str, Any]],
        taxpayer: TaxpayerProfile,
    ) -> List[TaxAlert]:
        """
        Generate decision-support alerts for tax opportunities and approaching thresholds.
        Strictly advisory.
        """
        alerts: List[TaxAlert] = []

        for pos in analyzed_positions:
            sym = pos["symbol"]
            pl = pos["unrealized_pl"]
            days_rem = pos["days_remaining_to_threshold"]
            savings = pos["potential_tax_savings_waiting"]

            # 1. Holding Period Proximity Alert (Within 30 days of threshold with gains)
            if 0 < days_rem <= 30 and pl > 0 and savings > 1000:
                alerts.append(
                    TaxAlert(
                        id=f"ALERT_HOLDING_{sym}_{days_rem}D",
                        alert_type="HOLDING_PERIOD_THRESHOLD",
                        symbol=sym,
                        title=f"Holding Period Threshold in {days_rem} Days for {sym}",
                        message=f"{sym} has been held for {pos['holding_period_days']} days. Waiting {days_rem} days transitions gains to Long-Term classification, saving an estimated {taxpayer.base_currency} {savings:,.0f} in tax.",
                        severity="HIGH" if days_rem <= 7 else "MEDIUM",
                        confidence=TaxConfidence.HIGH_CONFIDENCE_ESTIMATE,
                        potential_tax_saving=savings,
                        currency=taxpayer.base_currency,
                        status="ACTIVE",
                    )
                )

            # 2. Tax-Loss Harvesting Opportunity (Unrealized Loss > Threshold)
            if pl < -5000:
                est_loss_benefit = round(abs(pl) * 0.20, 2)
                alerts.append(
                    TaxAlert(
                        id=f"ALERT_LOSS_HARVEST_{sym}",
                        alert_type="TAX_LOSS_HARVEST_REVIEW",
                        symbol=sym,
                        title=f"Tax-Loss Harvesting Review for {sym}",
                        message=f"{sym} has an unrealized loss of {taxpayer.base_currency} {abs(pl):,.0f}. Realizing this loss may offset taxable capital gains (estimated tax reduction: {taxpayer.base_currency} {est_loss_benefit:,.0f}). Check reacquisition rules before trading.",
                        severity="MEDIUM",
                        confidence=TaxConfidence.HIGH_CONFIDENCE_ESTIMATE,
                        potential_tax_saving=est_loss_benefit,
                        currency=taxpayer.base_currency,
                        status="ACTIVE",
                    )
                )

        return alerts

    def _compute_priority_score(
        self, unrealized_pl: float, days_remaining: int, potential_savings: float
    ) -> int:
        """Compute review priority between 0 and 100."""
        score = 20

        # Close to holding period threshold with significant savings
        if 0 < days_remaining <= 30 and potential_savings > 0:
            proximity_weight = max(0, (30 - days_remaining) * 2)
            score += proximity_weight + min(30, int(potential_savings / 500))

        # Significant unrealized loss for harvesting
        if unrealized_pl < -10000:
            score += min(40, int(abs(unrealized_pl) / 1000))

        return min(100, max(0, score))

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


# Global Singleton
tax_action_advisor = TaxActionAdvisor()
