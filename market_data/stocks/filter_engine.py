"""
Stock Filter Engine
===================
Parses, validates, and evaluates multi-parameter queries across all equity dimensions.
Deterministic, type-safe, and composable.
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field


@dataclass
class StockFilterCriteria:
    # 1. Identity & Classification
    search: Optional[str] = None
    country: Optional[str] = None
    exchange: Optional[str] = None
    currency: Optional[str] = None
    instrument_type: Optional[str] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    market_cap_category: Optional[str] = None
    index_membership: Optional[str] = None
    provider: Optional[str] = None

    # 2. Market Status
    session_status: Optional[str] = None
    tradable_only: bool = False
    live_data_only: bool = False

    # 3. Price & Returns
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    price_direction: Optional[str] = None # GAINERS | LOSERS | UNCHANGED
    min_change_pct: Optional[float] = None
    max_change_pct: Optional[float] = None
    near_52w_high: bool = False
    near_52w_low: bool = False

    # 4. Liquidity & Volume
    min_volume: Optional[float] = None
    min_relative_volume: Optional[float] = None
    min_turnover: Optional[float] = None
    max_spread: Optional[float] = None

    # 5. Technical Indicators
    min_rsi: Optional[float] = None
    max_rsi: Optional[float] = None
    macd_bullish_only: bool = False
    price_above_ema20: bool = False
    breakout_only: bool = False

    # 6. Fundamentals
    min_market_cap: Optional[float] = None
    max_market_cap: Optional[float] = None
    min_pe: Optional[float] = None
    max_pe: Optional[float] = None
    min_roe: Optional[float] = None
    max_debt_to_equity: Optional[float] = None

    # 7. Quantitative Analysis
    directional_bias: Optional[str] = None # BULLISH | BEARISH | NEUTRAL
    min_score: Optional[float] = None
    min_confidence: Optional[float] = None

    # 8. Pagination & Sorting
    sort_by: str = "volume_shares"
    sort_direction: str = "desc"
    page: int = 1
    page_size: int = 50


class StockFilterEngine:
    """Evaluates filter criteria against stock records."""

    @classmethod
    def from_query_params(cls, params: Dict[str, Any]) -> StockFilterCriteria:
        """Parses HTTP GET query parameters into typed filter criteria."""
        def to_float(k: str) -> Optional[float]:
            v = params.get(k)
            if v is not None and v != "":
                try: return float(v)
                except ValueError: return None
            return None

        def to_int(k: str, default: int) -> int:
            v = params.get(k)
            if v is not None and v != "":
                try: return int(v)
                except ValueError: return default
            return default

        def to_bool(k: str) -> bool:
            v = str(params.get(k, "")).lower()
            return v in ("true", "1", "yes")

        return StockFilterCriteria(
            search=params.get("search") or params.get("q"),
            country=params.get("country"),
            exchange=params.get("exchange") if params.get("exchange") != "ALL" else None,
            currency=params.get("currency"),
            instrument_type=params.get("instrument_type"),
            sector=params.get("sector") if params.get("sector") != "ALL" else None,
            industry=params.get("industry") if params.get("industry") != "ALL" else None,
            market_cap_category=params.get("market_cap_category") if params.get("market_cap_category") != "ALL" else None,
            index_membership=params.get("index") if params.get("index") != "ALL" else None,
            provider=params.get("provider"),
            session_status=params.get("status") if params.get("status") != "ALL" else None,
            tradable_only=to_bool("tradable_only"),
            live_data_only=to_bool("live_data_only"),
            min_price=to_float("min_price") or to_float("minPrice"),
            max_price=to_float("max_price") or to_float("maxPrice"),
            price_direction=params.get("price_direction"),
            min_change_pct=to_float("min_change_pct") or to_float("minChange"),
            max_change_pct=to_float("max_change_pct") or to_float("maxChange"),
            near_52w_high=to_bool("near_52w_high"),
            near_52w_low=to_bool("near_52w_low"),
            min_volume=to_float("min_volume") or to_float("minVolume"),
            min_relative_volume=to_float("min_relative_volume") or to_float("minRelVol"),
            min_turnover=to_float("min_turnover"),
            max_spread=to_float("max_spread"),
            min_rsi=to_float("min_rsi"),
            max_rsi=to_float("max_rsi"),
            macd_bullish_only=to_bool("macd_bullish_only"),
            price_above_ema20=to_bool("price_above_ema20"),
            breakout_only=to_bool("breakout_only"),
            min_market_cap=to_float("min_market_cap"),
            max_market_cap=to_float("max_market_cap"),
            min_pe=to_float("min_pe"),
            max_pe=to_float("max_pe"),
            min_roe=to_float("min_roe"),
            max_debt_to_equity=to_float("max_debt_to_equity"),
            directional_bias=params.get("bias") or params.get("directional_bias"),
            min_score=to_float("min_score"),
            min_confidence=to_float("min_confidence"),
            sort_by=params.get("sort_by") or params.get("sortBy") or "volume_shares",
            sort_direction=params.get("sort_direction") or params.get("sortDir") or "desc",
            page=to_int("page", 1),
            page_size=to_int("limit", to_int("page_size", to_int("pageSize", 50)))
        )

    @classmethod
    def matches(cls, row: Dict[str, Any], criteria: StockFilterCriteria) -> bool:
        """Evaluates whether an aggregated stock dictionary satisfies criteria."""
        # 1. Search Query
        if criteria.search:
            q = criteria.search.strip().lower()
            sym = str(row.get("symbol", "")).lower()
            name = str(row.get("company_name", "")).lower()
            isin = str(row.get("isin", "")).lower()
            if q not in sym and q not in name and q not in isin:
                return False

        # 2. Exchange & Region
        if criteria.exchange and str(row.get("exchange", "")).upper() != criteria.exchange.upper():
            return False
        if criteria.country and str(row.get("region", "")).upper() != criteria.country.upper():
            return False
        if criteria.currency and str(row.get("currency", "")).upper() != criteria.currency.upper():
            return False

        # 3. Sector / Industry / Cap
        if criteria.sector and str(row.get("sector", "")).upper() != criteria.sector.upper():
            return False
        if criteria.industry and str(row.get("industry", "")).upper() != criteria.industry.upper():
            return False
        if criteria.market_cap_category and str(row.get("market_cap_category", "")).upper() != criteria.market_cap_category.upper():
            return False
        if criteria.index_membership:
            indexes = [str(x).upper() for x in row.get("index_memberships", [])]
            if criteria.index_membership.upper() not in indexes:
                return False

        # 4. Price Boundaries
        price = row.get("last_price") or 0.0
        if criteria.min_price is not None and price < criteria.min_price:
            return False
        if criteria.max_price is not None and price > criteria.max_price:
            return False

        # 5. Returns
        chg = row.get("change_pct") or 0.0
        if criteria.price_direction:
            dir_u = criteria.price_direction.upper()
            if dir_u == "GAINERS" and chg <= 0: return False
            elif dir_u == "LOSERS" and chg >= 0: return False
            elif dir_u == "UNCHANGED" and chg != 0: return False
        if criteria.min_change_pct is not None and chg < criteria.min_change_pct:
            return False
        if criteria.max_change_pct is not None and chg > criteria.max_change_pct:
            return False

        # 6. Volume & Liquidity
        vol = row.get("volume_shares") or 0.0
        if criteria.min_volume is not None and vol < criteria.min_volume:
            return False
        rel_vol = row.get("relative_volume") or 1.0
        if criteria.min_relative_volume is not None and rel_vol < criteria.min_relative_volume:
            return False

        # 7. Directional Bias
        if criteria.directional_bias and str(row.get("directional_bias", "")).upper() != criteria.directional_bias.upper():
            return False

        # 8. Score
        score = row.get("overall_score") or 50.0
        if criteria.min_score is not None and score < criteria.min_score:
            return False

        return True
