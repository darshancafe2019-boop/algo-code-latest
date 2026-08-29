"""
Quant.OS Multi-Market Statistical Pairs Trading & Pair Options Engine
=====================================================================
Comprehensive implementation of statistical arbitrage and pairs trading methodologies from:
- 'The Handbook of Pairs Trading Strategies'
- 'Complete Option Strategies Visual Learning Guide'

Modules:
- pairs_statistical_engine: Cointegration (Engle-Granger), ADF, OLS, Rolling Beta, Half-Life, Z-Score, Neutral Sizing
- pair_options_engine: Option Overlays, Deep-ITM Substitutions, Vertical/Backspread Proxies, Comparative Analytics
- pairs_backtester: Walk-Forward historical pairs simulator with formation/calibration/OOS splits
- pairs_execution_engine: Synchronized dual-leg order execution & legging protection
"""

from src.pairs_trading.pairs_statistical_engine import (
    PairsStatisticalEngine,
    PairCandidate,
    PairAnalysisResult,
    NeutralizationMode,
    PairEntryDirection,
)
from src.pairs_trading.pair_options_engine import (
    PairOptionsEngine,
    OptionOverlayType,
    OptionSubstitutionType,
    PairOptionStructureResult,
)
from src.pairs_trading.pairs_backtester import (
    PairsBacktester,
    PairsBacktestResult,
    PairTradeRecord,
)
from src.pairs_trading.pairs_execution_engine import (
    PairsExecutionEngine,
    PairOrderIntent,
    PairExecutionResult,
)

__all__ = [
    "PairsStatisticalEngine",
    "PairCandidate",
    "PairAnalysisResult",
    "NeutralizationMode",
    "PairEntryDirection",
    "PairOptionsEngine",
    "OptionOverlayType",
    "OptionSubstitutionType",
    "PairOptionStructureResult",
    "PairsBacktester",
    "PairsBacktestResult",
    "PairTradeRecord",
    "PairsExecutionEngine",
    "PairOrderIntent",
    "PairExecutionResult",
]
