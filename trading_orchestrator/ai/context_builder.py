"""
AI Context Builder
==================
Assembles multi-dimensional trading context from real-time normalized market feeds,
technical indicators, option chain Greeks, macro events, and active account positions.
"""

from __future__ import annotations

from typing import Dict, Any, List, Optional
from trading_orchestrator.context.market_context import build_comprehensive_market_context, ComprehensiveMarketContext


class ContextBuilder:
    """Builds prompt-ready and rule-ready context for the AI Strategy Agent."""

    @classmethod
    def build_agent_context(
        cls,
        symbols: Optional[List[str]] = None,
        checkpoint_name: str = "MANUAL",
        execution_mode: str = "PAPER"
    ) -> Dict[str, Any]:
        full_market_ctx: ComprehensiveMarketContext = build_comprehensive_market_context(
            symbols=symbols,
            execution_mode=execution_mode
        )
        return {
            "checkpoint": checkpoint_name,
            "execution_mode": execution_mode,
            "market_context": full_market_ctx.to_dict(),
        }
