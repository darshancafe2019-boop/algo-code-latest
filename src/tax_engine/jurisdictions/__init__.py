"""
Quant.OS Tax Intelligence — Jurisdiction Adapter Registry & Factory
===================================================================
Instantiates and routes country-specific tax computation adapters.
"""

from typing import Dict, Optional
from src.tax_engine.jurisdictions.base_adapter import BaseTaxJurisdictionAdapter
from src.tax_engine.jurisdictions.germany_adapter import GermanyTaxAdapter
from src.tax_engine.jurisdictions.india_adapter import IndiaTaxAdapter
from src.tax_engine.jurisdictions.singapore_adapter import SingaporeTaxAdapter
from src.tax_engine.jurisdictions.uae_adapter import UaeTaxAdapter
from src.tax_engine.jurisdictions.uk_adapter import UkTaxAdapter
from src.tax_engine.jurisdictions.us_adapter import UsTaxAdapter


class JurisdictionAdapterRegistry:
    """Factory and cache for country tax computation adapters."""

    def __init__(self):
        self._adapters: Dict[str, BaseTaxJurisdictionAdapter] = {
            "IN": IndiaTaxAdapter(),
            "US": UsTaxAdapter(),
            "GB": UkTaxAdapter(),
            "SG": SingaporeTaxAdapter(),
            "AE": UaeTaxAdapter(),
            "DE": GermanyTaxAdapter(),
        }

    def get_adapter(self, country_code: str) -> Optional[BaseTaxJurisdictionAdapter]:
        """Return the adapter for a country code, or None if unsupported."""
        return self._adapters.get(country_code.upper())

    def is_supported(self, country_code: str) -> bool:
        """Check whether full programmatic adapter calculation is available."""
        return country_code.upper() in self._adapters


# Global Singleton
jurisdiction_adapters = JurisdictionAdapterRegistry()
