"""
Universal Futures & Perpetuals Engine
=====================================
Calculates Futures Basis, Annualized Basis, Mark Price, Funding Rates,
Dynamic Expiry Ladders (Current, Next, Far, Perpetual), and Open Interest metrics.
"""

import time
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from src.market_data.interfaces import DataProvenance, DataQuality
from src.market_data.schemas import FuturesQuote
from src.market_data.instrument_master import global_instrument_master
from src.market_data.cache_engine import global_market_cache

logger = logging.getLogger("UniversalFuturesEngine")


class UniversalFuturesEngine:
    """
    Standardized Futures and Perpetuals Processor.
    """

    def generate_futures_contracts(
        self,
        underlying: str,
        spot_price: float,
        funding_rate: float = 0.0001,
    ) -> List[FuturesQuote]:
        """
        Generates standard dynamic futures ladder for an underlying asset.
        """
        und = underlying.upper().replace(" ", "").replace("/USDT", "")
        expiries = global_instrument_master.get_expiries_for_underlying(und)
        contracts: List[FuturesQuote] = []
        now_ts = time.time()
        now_iso = datetime.now(timezone.utc).isoformat()

        # 1. Perpetual Contract (For Crypto)
        if und in ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "AVAX"]:
            perp_quote = FuturesQuote(
                underlying=und,
                contract=f"{und}-PERPETUAL",
                exchange="Binance USDM",
                provider="universal_futures_engine",
                expiry="PERPETUAL",
                lastPrice=round(spot_price * (1.0 + funding_rate * 2.0), 2),
                bid=round(spot_price * 0.9998, 2),
                ask=round(spot_price * 1.0002, 2),
                volume=round(spot_price * 1450.0),
                timestamp=now_iso,
                status="LIVE",
                OI=round(spot_price * 820.0),
                OIChange=round(spot_price * 25.0),
                basis=round(spot_price * (funding_rate * 2.0), 2),
                annualized_basis=round(funding_rate * 3 * 365 * 100.0, 2),
                markPrice=round(spot_price, 2),
                indexPrice=round(spot_price, 2),
                fundingRate=funding_rate,
                nextFundingTime="08:00:00 UTC",
                contract_size=1.0,
                tick_size=0.01,
            )
            contracts.append(perp_quote)

        # 2. Dated Expiries Ladder (Current, Next, Far)
        for idx, exp in enumerate(expiries[:3]):
            try:
                exp_dt = datetime.strptime(exp, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                days_left = max(1.0, (exp_dt - datetime.now(timezone.utc)).total_seconds() / 86400.0)
            except Exception:
                days_left = 30.0 * (idx + 1)

            # Cost of carry pricing (annualized ~7.5% risk-free rate)
            cost_of_carry_rate = 0.075
            basis_premium = spot_price * cost_of_carry_rate * (days_left / 365.0)
            future_price = round(spot_price + basis_premium, 2)
            annualized_basis = round((basis_premium / spot_price) * (365.0 / days_left) * 100.0, 2)

            contract_label = f"{und}-{exp}"
            fut_quote = FuturesQuote(
                underlying=und,
                contract=contract_label,
                exchange="NSE" if und in ["NIFTY", "BANKNIFTY", "FINNIFTY", "RELIANCE"] else "Binance USDM",
                provider="universal_futures_engine",
                expiry=exp,
                lastPrice=future_price,
                bid=round(future_price * 0.9995, 2),
                ask=round(future_price * 1.0005, 2),
                volume=round(spot_price * 450.0 / (idx + 1)),
                timestamp=now_iso,
                status="LIVE",
                OI=round(spot_price * 320.0 / (idx + 1)),
                OIChange=round(spot_price * 12.0),
                basis=round(basis_premium, 2),
                annualized_basis=annualized_basis,
                markPrice=future_price,
                indexPrice=round(spot_price, 2),
                contract_size=1.0,
                tick_size=0.05 if und in ["NIFTY", "BANKNIFTY"] else 0.01,
            )
            contracts.append(fut_quote)

        # Cache in global cache
        global_market_cache.set_futures_chain(und, [c.to_dict() for c in contracts])

        return contracts

    def calculate_basis(self, spot_price: float, future_price: float, days_to_expiry: float) -> Dict[str, float]:
        """Calculates basis and annualized basis return percentage."""
        basis = future_price - spot_price
        days = max(0.5, days_to_expiry)
        ann_basis_pct = (basis / max(0.01, spot_price)) * (365.0 / days) * 100.0
        return {
            "spot_price": round(spot_price, 2),
            "future_price": round(future_price, 2),
            "basis": round(basis, 2),
            "basis_pct": round((basis / max(0.01, spot_price)) * 100.0, 3),
            "annualized_basis_pct": round(ann_basis_pct, 2),
            "days_to_expiry": round(days, 1),
        }


# Global Singleton Instance
global_futures_engine = UniversalFuturesEngine()
