"""
Option Greeks Model
===================
Canonical model for Option Greeks and Implied Volatility.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any, Dict, Optional


@dataclass
class OptionGreeks:
    iv: Optional[float] = None
    delta: Optional[float] = None
    gamma: Optional[float] = None
    theta: Optional[float] = None
    vega: Optional[float] = None
    rho: Optional[float] = None
    source: str = "CALCULATED"  # "PROVIDER" or "CALCULATED"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
