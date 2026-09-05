"""
Quant.OS Tax Intelligence — Tax Jurisdiction Resolver
=====================================================
Multi-factor nexus engine determining taxing rights across worldwide jurisdictions.
Evaluates residency, source, exchange, issuer, citizenship, and treaty applicability.
"""

from typing import List, Optional
from src.tax_engine.models import (
    JurisdictionResult,
    TaxConfidence,
    TaxJurisdictionRelationship,
    TaxpayerProfile,
    TaxingRightStatus,
    TaxTransaction,
)


class TaxJurisdictionResolver:
    """
    Determines all potentially relevant tax jurisdictions for a trade or portfolio.
    Never relies solely on broker location.
    """

    def resolve_jurisdictions(
        self,
        taxpayer: TaxpayerProfile,
        transaction: Optional[TaxTransaction] = None,
    ) -> List[JurisdictionResult]:
        results: List[JurisdictionResult] = []
        seen_countries = set()

        # 1. Primary Tax Residence (Highest Nexus - Worldwide Income)
        primary = taxpayer.primary_residence.upper()
        if primary:
            results.append(
                JurisdictionResult(
                    country_code=primary,
                    jurisdiction_name=self._get_country_name(primary),
                    relationship=TaxJurisdictionRelationship.TAX_RESIDENCE,
                    taxing_right_status=TaxingRightStatus.LIKELY,
                    explanation=f"Taxpayer is a tax resident of {self._get_country_name(primary)}. Subject to worldwide taxation on trading capital gains and income.",
                    treaty_relevant=False,
                    confidence=TaxConfidence.HIGH_CONFIDENCE_ESTIMATE if taxpayer.tax_id_masked else TaxConfidence.INFORMATION_REQUIRED,
                )
            )
            seen_countries.add(primary)

        # 2. Secondary Tax Residence (Dual Residency Nexus)
        sec = taxpayer.secondary_residence.upper()
        if sec and sec not in seen_countries:
            results.append(
                JurisdictionResult(
                    country_code=sec,
                    jurisdiction_name=self._get_country_name(sec),
                    relationship=TaxJurisdictionRelationship.TAX_RESIDENCE,
                    taxing_right_status=TaxingRightStatus.POSSIBLE,
                    explanation=f"Dual tax residency indicated in {self._get_country_name(sec)}. Tie-breaker rules under applicable Double Tax Avoidance Agreement (DTAA) required.",
                    treaty_relevant=True,
                    confidence=TaxConfidence.PROFESSIONAL_REVIEW_RECOMMENDED,
                )
            )
            seen_countries.add(sec)

        # 3. Citizenship (e.g., US Citizen Worldwide Taxation under IRC § 1)
        citizen = taxpayer.citizenship.upper()
        if citizen == "US" and citizen not in seen_countries:
            results.append(
                JurisdictionResult(
                    country_code="US",
                    jurisdiction_name="United States",
                    relationship=TaxJurisdictionRelationship.CITIZENSHIP,
                    taxing_right_status=TaxingRightStatus.LIKELY,
                    explanation="US citizens are subject to worldwide federal income taxation under IRC Section 1 regardless of foreign residency.",
                    treaty_relevant=True,
                    confidence=TaxConfidence.HIGH_CONFIDENCE_ESTIMATE,
                )
            )
            seen_countries.add("US")

        # 4. Transaction-specific Source / Exchange / Issuer Nexus
        if transaction:
            # Issuer Country
            issuer = (transaction.issuer_country or "").upper()
            if issuer and issuer not in seen_countries:
                withholding_likely = transaction.asset_class.lower() in ["dividend", "equity"]
                results.append(
                    JurisdictionResult(
                        country_code=issuer,
                        jurisdiction_name=self._get_country_name(issuer),
                        relationship=TaxJurisdictionRelationship.ISSUER,
                        taxing_right_status=TaxingRightStatus.POSSIBLE if withholding_likely else TaxingRightStatus.NOT_APPLICABLE,
                        explanation=f"Underlying security issuer domiciled in {self._get_country_name(issuer)}. Source-country dividend withholding tax may apply.",
                        treaty_relevant=True,
                        confidence=TaxConfidence.HIGH_CONFIDENCE_ESTIMATE,
                    )
                )
                seen_countries.add(issuer)

            # Exchange Country
            exchange_country = (transaction.exchange_country or "").upper()
            if exchange_country and exchange_country not in seen_countries:
                results.append(
                    JurisdictionResult(
                        country_code=exchange_country,
                        jurisdiction_name=self._get_country_name(exchange_country),
                        relationship=TaxJurisdictionRelationship.EXCHANGE,
                        taxing_right_status=TaxingRightStatus.POSSIBLE,
                        explanation=f"Transaction executed on exchange located in {self._get_country_name(exchange_country)}. Statutory transaction taxes (STT/SDRT/Stamp Duty) may apply.",
                        treaty_relevant=False,
                        confidence=TaxConfidence.CONFIRMED_INPUTS,
                    )
                )
                seen_countries.add(exchange_country)

        return results

    def _get_country_name(self, code: str) -> str:
        names = {
            "IN": "India",
            "US": "United States",
            "GB": "United Kingdom",
            "SG": "Singapore",
            "AE": "United Arab Emirates",
            "DE": "Germany",
            "CA": "Canada",
            "AU": "Australia",
            "JP": "Japan",
            "HK": "Hong Kong",
            "FR": "France",
        }
        return names.get(code.upper(), f"Country ({code})")


# Global Singleton
jurisdiction_resolver = TaxJurisdictionResolver()
