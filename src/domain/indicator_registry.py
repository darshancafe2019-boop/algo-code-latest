from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class IndicatorParam(BaseModel):
    name: str
    label: str
    type: str = "number"  # number, select, boolean
    default: Any
    min: Optional[float] = None
    max: Optional[float] = None
    options: Optional[List[str]] = None


class IndicatorDefinition(BaseModel):
    id: str
    name: str
    category: str  # Trend, Momentum, Volatility, Volume, Structure, Strength, Options
    description: str
    default_timeframe: str = "15m"
    parameters: List[IndicatorParam] = Field(default_factory=list)
    outputs: List[str] = Field(default_factory=list)  # e.g. ["value", "upper", "lower"]


class IndicatorCondition(BaseModel):
    indicator_id: str
    timeframe: str = "15m"
    parameters: Dict[str, Any] = Field(default_factory=dict)
    operator: str  # "ABOVE", "BELOW", "CROSS_ABOVE", "CROSS_BELOW", "EQUAL", "GREATER_THAN", "LESS_THAN", "BETWEEN"
    target_type: str = "VALUE"  # "VALUE", "INDICATOR", "PRICE"
    target_value: Optional[float] = None
    target_indicator_id: Optional[str] = None
    logical_connector: str = "AND"  # "AND", "OR", "NOT"


class IndicatorRegistry:
    @staticmethod
    def get_all_indicators() -> List[IndicatorDefinition]:
        return [
            # Trend
            IndicatorDefinition(
                id="EMA_9",
                name="EMA 9 (Fast Trend)",
                category="Trend",
                description="9-period Exponential Moving Average for micro trend momentum",
                parameters=[IndicatorParam(name="length", label="Period", default=9, min=1, max=500)],
                outputs=["ema"],
            ),
            IndicatorDefinition(
                id="EMA_20",
                name="EMA 20 (Short Trend)",
                category="Trend",
                description="20-period Exponential Moving Average for intraday trend direction",
                parameters=[IndicatorParam(name="length", label="Period", default=20, min=1, max=500)],
                outputs=["ema"],
            ),
            IndicatorDefinition(
                id="EMA_50",
                name="EMA 50 (Intermediate Trend)",
                category="Trend",
                description="50-period Exponential Moving Average for medium-term bias",
                parameters=[IndicatorParam(name="length", label="Period", default=50, min=1, max=500)],
                outputs=["ema"],
            ),
            IndicatorDefinition(
                id="EMA_200",
                name="EMA 200 (Macro Regime)",
                category="Trend",
                description="200-period Exponential Moving Average defining macro bull/bear regime",
                parameters=[IndicatorParam(name="length", label="Period", default=200, min=1, max=1000)],
                outputs=["ema"],
            ),
            IndicatorDefinition(
                id="SMA",
                name="Simple Moving Average (SMA)",
                category="Trend",
                description="Arithmetic mean of price over specified periods",
                parameters=[IndicatorParam(name="length", label="Period", default=20, min=1, max=500)],
                outputs=["sma"],
            ),
            IndicatorDefinition(
                id="WMA",
                name="Weighted Moving Average (WMA)",
                category="Trend",
                description="Linearly weighted moving average giving more weight to recent bars",
                parameters=[IndicatorParam(name="length", label="Period", default=20, min=1, max=500)],
                outputs=["wma"],
            ),
            IndicatorDefinition(
                id="SUPERTREND",
                name="Supertrend Indicator",
                category="Trend",
                description="Trend-following ATR trailing band indicator",
                parameters=[
                    IndicatorParam(name="atr_period", label="ATR Period", default=10, min=1, max=100),
                    IndicatorParam(name="multiplier", label="Multiplier", default=3.0, min=0.1, max=10.0),
                ],
                outputs=["supertrend", "direction"],
            ),

            # Momentum
            IndicatorDefinition(
                id="RSI",
                name="Relative Strength Index (RSI)",
                category="Momentum",
                description="Momentum oscillator measuring speed and magnitude of directional price movements",
                parameters=[
                    IndicatorParam(name="length", label="Period", default=14, min=2, max=100),
                    IndicatorParam(name="overbought", label="Overbought Level", default=70, min=50, max=95),
                    IndicatorParam(name="oversold", label="Oversold Level", default=30, min=5, max=50),
                ],
                outputs=["rsi"],
            ),
            IndicatorDefinition(
                id="MACD",
                name="Moving Average Convergence Divergence (MACD)",
                category="Momentum",
                description="Trend-following momentum oscillator showing relationship between two EMAs",
                parameters=[
                    IndicatorParam(name="fast_length", label="Fast Period", default=12, min=1, max=100),
                    IndicatorParam(name="slow_length", label="Slow Period", default=26, min=1, max=200),
                    IndicatorParam(name="signal_length", label="Signal Period", default=9, min=1, max=50),
                ],
                outputs=["macd", "signal", "histogram"],
            ),

            # Volatility
            IndicatorDefinition(
                id="BOLLINGER_BANDS",
                name="Bollinger Bands",
                category="Volatility",
                description="Volatility bands placed above and below a moving average",
                parameters=[
                    IndicatorParam(name="length", label="Period", default=20, min=2, max=200),
                    IndicatorParam(name="std_dev", label="Standard Deviation", default=2.0, min=0.5, max=5.0),
                ],
                outputs=["upper", "middle", "lower", "bandwidth"],
            ),
            IndicatorDefinition(
                id="ATR",
                name="Average True Range (ATR)",
                category="Volatility",
                description="Technical analysis volatility indicator measuring market volatility",
                parameters=[IndicatorParam(name="length", label="Period", default=14, min=1, max=100)],
                outputs=["atr"],
            ),
            IndicatorDefinition(
                id="DONCHIAN_CHANNEL",
                name="Donchian Channel",
                category="Volatility",
                description="Channel formed by the highest high and lowest low over N periods",
                parameters=[IndicatorParam(name="length", label="Period", default=20, min=5, max=200)],
                outputs=["upper", "middle", "lower"],
            ),

            # Volume & Structure
            IndicatorDefinition(
                id="VWAP",
                name="Volume Weighted Average Price (VWAP)",
                category="Volume",
                description="Benchmark price representing true average weighted by volume",
                parameters=[IndicatorParam(name="anchor", label="Anchor", default="Session", options=["Session", "Week", "Month"])],
                outputs=["vwap", "upper_band_1", "lower_band_1"],
            ),
            IndicatorDefinition(
                id="VOLUME_SMA",
                name="Volume with Moving Average",
                category="Volume",
                description="Trading volume compared with its N-period moving average",
                parameters=[IndicatorParam(name="length", label="Period", default=20, min=1, max=100)],
                outputs=["volume", "volume_sma"],
            ),
            IndicatorDefinition(
                id="OBV",
                name="On-Balance Volume (OBV)",
                category="Volume",
                description="Cumulative volume momentum indicator relating price and volume",
                parameters=[],
                outputs=["obv"],
            ),
            IndicatorDefinition(
                id="PIVOT_POINTS",
                name="Standard Pivot Points",
                category="Structure",
                description="Key support and resistance levels derived from previous session",
                parameters=[IndicatorParam(name="type", label="Formula", default="Standard", options=["Standard", "Fibonacci", "Camarilla"])],
                outputs=["pivot", "r1", "s1", "r2", "s2"],
            ),
        ]
