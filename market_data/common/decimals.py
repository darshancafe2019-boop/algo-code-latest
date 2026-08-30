"""
Decimal-Safe Financial Arithmetic Utilities
===========================================
Ensures all price, spread, return, and volume calculations avoid floating-point drift.
"""

from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
from typing import Optional, Union

NumberLike = Union[int, float, str, Decimal]


def to_decimal(val: Optional[NumberLike], default: Optional[Decimal] = None) -> Optional[Decimal]:
    """Safely converts input into a Decimal."""
    if val is None or val == "":
        return default
    if isinstance(val, Decimal):
        return val
    try:
        # Avoid float string representation artifacts by formatting
        if isinstance(val, float):
            return Decimal(str(round(val, 8)))
        return Decimal(str(val))
    except (InvalidOperation, ValueError, TypeError):
        return default


def quantize_price(price: Optional[NumberLike], tick_size: Optional[NumberLike] = "0.01") -> Optional[float]:
    """Rounds price to nearest valid tick size with Decimal precision."""
    d_price = to_decimal(price)
    if d_price is None:
        return None
    d_tick = to_decimal(tick_size, default=Decimal("0.01"))
    if d_tick is None or d_tick <= 0:
        d_tick = Decimal("0.01")
    
    # Calculate nearest tick
    rounded = (d_price / d_tick).quantize(Decimal("1"), rounding=ROUND_HALF_UP) * d_tick
    return float(rounded)


def quantize_quantity(qty: Optional[NumberLike], lot_size: Optional[NumberLike] = "1.0") -> Optional[float]:
    """Rounds quantity to nearest valid lot size."""
    d_qty = to_decimal(qty)
    if d_qty is None:
        return None
    d_lot = to_decimal(lot_size, default=Decimal("1.0"))
    if d_lot is None or d_lot <= 0:
        d_lot = Decimal("1.0")
    
    rounded = (d_qty / d_lot).quantize(Decimal("1"), rounding=ROUND_HALF_UP) * d_lot
    return float(rounded)


def calculate_pct_change(last_price: Optional[NumberLike], prev_close: Optional[NumberLike]) -> Optional[float]:
    """Calculates exact percentage change: ((last - prev) / prev) * 100."""
    d_last = to_decimal(last_price)
    d_prev = to_decimal(prev_close)
    if d_last is None or d_prev is None or d_prev <= 0:
        return None
    
    pct = ((d_last - d_prev) / d_prev) * Decimal("100")
    return float(pct.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def calculate_spread(bid: Optional[NumberLike], ask: Optional[NumberLike]) -> Optional[float]:
    """Calculates bid-ask spread: ask - bid."""
    d_bid = to_decimal(bid)
    d_ask = to_decimal(ask)
    if d_bid is None or d_ask is None:
        return None
    spread = d_ask - d_bid
    return float(spread.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP))
