"""
Quant.OS Tax Intelligence — Base Tax Jurisdiction Adapter
=========================================================
Abstract base contract for all country-specific tax computation engines.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from src.tax_engine.models import (
    IncomeClassification,
    TaxAlert,
    TaxCalculationAudit,
    TaxConfidence,
    TaxDeadline,
    TaxLot,
    TaxpayerProfile,
    TaxTransaction,
)


class BaseTaxJurisdictionAdapter(ABC):
    """
    Standardized interface that every supported country tax adapter must implement.
    Ensures consistent treatment across diverse legal systems.
    """

    @property
    @abstractmethod
    def country_code(self) -> str:
        """ISO 3166-1 alpha-2 country code (e.g., 'IN', 'US', 'GB')."""
        pass

    @property
    @abstractmethod
    def country_name(self) -> str:
        """Full English country name."""
        pass

    @property
    @abstractmethod
    def default_currency(self) -> str:
        """Reporting currency (e.g., 'INR', 'USD', 'GBP')."""
        pass

    @abstractmethod
    def supported_tax_years(self) -> List[str]:
        """List of active statutory tax years supported."""
        pass

    @abstractmethod
    def classify_income(
        self,
        transaction: TaxTransaction,
        holding_period_days: int,
        taxpayer: TaxpayerProfile,
    ) -> IncomeClassification:
        """Classify transaction income into jurisdiction-specific statutory category."""
        pass

    @abstractmethod
    def calculate_transaction_tax(
        self, transaction: TaxTransaction
    ) -> Dict[str, float]:
        """
        Calculate mandatory statutory transaction taxes (e.g., STT, Stamp Duty, SDRT).
        Must NOT include broker commission.
        """
        pass

    @abstractmethod
    def calculate_gain_loss(
        self,
        sell_tx: TaxTransaction,
        matched_lots: List[Dict[str, Any]],
        taxpayer: TaxpayerProfile,
    ) -> Dict[str, Any]:
        """Compute realized gain/loss, holding periods, and applicable statutory tax rates."""
        pass

    @abstractmethod
    def calculate_estimated_liability(
        self,
        realized_gains: float,
        realized_losses: float,
        business_income: float,
        crypto_gains: float,
        taxpayer: TaxpayerProfile,
    ) -> Dict[str, Any]:
        """Compute estimated tax liability, applying statutory thresholds and exemptions."""
        pass

    @abstractmethod
    def determine_deadlines(
        self,
        taxpayer: TaxpayerProfile,
        tax_year: str,
        estimated_tax: float,
    ) -> List[TaxDeadline]:
        """Generate official filing, payment, and advance tax deadlines."""
        pass

    @abstractmethod
    def check_anti_avoidance(
        self,
        transactions: List[TaxTransaction],
        open_lots: List[TaxLot],
    ) -> List[TaxAlert]:
        """Check jurisdiction-specific anti-avoidance rules (e.g. Wash Sale, Bed & Breakfast)."""
        pass

    @abstractmethod
    def get_holding_period_threshold_days(self, asset_class: str) -> int:
        """Return legal threshold in days for Long-Term classification (e.g., 365, 730, 1095)."""
        pass
