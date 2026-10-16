from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class OptionLeg(BaseModel):
    strike: float = 0.0
    option_type: str = "CE"  # "CE" or "PE"
    side: str = "BUY"  # "BUY" or "SELL"
    quantity: float = 1.0
    ratio: Optional[float] = None
    premium: float = 0.0
    expiry: Optional[str] = None
    delta: float = 0.0
    theta: float = 0.0
    gamma: float = 0.0
    vega: float = 0.0
    greeks: Optional[Dict[str, Any]] = None
    symbol: Optional[str] = None
    lot_size: Optional[float] = None


class OptionStrategyDefinition(BaseModel):
    id: str
    code: str
    name: str
    market_view: str  # "Bullish", "Bearish", "Neutral", "High Volatility", "Low Volatility"
    sentiment: str
    description: str
    default_legs_count: int
    structure_template: List[Dict[str, Any]]  # Template specifying relative strikes/sides


class TradingStrategyDefinition(BaseModel):
    id: str
    code: str
    name: str
    category: str  # "Trend", "Breakout", "Mean Reversion", "Volume & Flow", "Regime & Quant"
    market_view: str  # "Trend Following", "Range Bound", "Reversal", "Expansion"
    description: str
    default_timeframe: str = "15m"
    parameters: Dict[str, Any] = Field(default_factory=dict)
    required_inputs: List[str] = Field(default_factory=list)  # e.g. ["CANDLES", "OI", "BASIS", "VOLUME"]
    supported_markets: List[str] = Field(default_factory=list)


class StrategyRegistry:
    @staticmethod
    def get_all_option_strategies() -> List[OptionStrategyDefinition]:
        return [
            OptionStrategyDefinition(
                id="OPT_01", code="01", name="Long Call", market_view="Strongly Bullish", sentiment="BULLISH",
                description="Purchase call option for uncapped upside with risk strictly defined to premium paid.",
                default_legs_count=1,
                structure_template=[{"strike_offset": "ATM", "option_type": "CE", "side": "BUY", "ratio": 1}],
            ),
            OptionStrategyDefinition(
                id="OPT_02", code="02", name="Long Put", market_view="Strongly Bearish", sentiment="BEARISH",
                description="Purchase put option for substantial downside gain with defined max loss.",
                default_legs_count=1,
                structure_template=[{"strike_offset": "ATM", "option_type": "PE", "side": "BUY", "ratio": 1}],
            ),
            OptionStrategyDefinition(
                id="OPT_03", code="03", name="Short Call", market_view="Moderately Bearish", sentiment="BEARISH",
                description="Sell call option to collect premium, profiting if underlying stays below strike.",
                default_legs_count=1,
                structure_template=[{"strike_offset": "OTM", "option_type": "CE", "side": "SELL", "ratio": 1}],
            ),
            OptionStrategyDefinition(
                id="OPT_04", code="04", name="Short Put", market_view="Moderately Bullish", sentiment="BULLISH",
                description="Sell put option to capture premium decay if price stays above strike.",
                default_legs_count=1,
                structure_template=[{"strike_offset": "OTM", "option_type": "PE", "side": "SELL", "ratio": 1}],
            ),
            OptionStrategyDefinition(
                id="OPT_05", code="05", name="Bull Call Spread", market_view="Moderately Bullish", sentiment="BULLISH",
                description="Buy lower strike ITM/ATM Call, sell higher strike OTM Call. Defined risk & defined reward.",
                default_legs_count=2,
                structure_template=[
                    {"strike_offset": "ITM", "option_type": "CE", "side": "BUY", "ratio": 1},
                    {"strike_offset": "OTM", "option_type": "CE", "side": "SELL", "ratio": 1},
                ],
            ),
            OptionStrategyDefinition(
                id="OPT_06", code="06", name="Bear Put Spread", market_view="Moderately Bearish", sentiment="BEARISH",
                description="Buy higher strike ITM/ATM Put, sell lower strike OTM Put. Reduced cost debit spread.",
                default_legs_count=2,
                structure_template=[
                    {"strike_offset": "ITM", "option_type": "PE", "side": "BUY", "ratio": 1},
                    {"strike_offset": "OTM", "option_type": "PE", "side": "SELL", "ratio": 1},
                ],
            ),
            OptionStrategyDefinition(
                id="OPT_07", code="07", name="Bull Put Spread", market_view="Moderately Bullish", sentiment="BULLISH",
                description="Sell higher strike Put, buy lower strike OTM Put. Net credit received upfront.",
                default_legs_count=2,
                structure_template=[
                    {"strike_offset": "OTM_LOW", "option_type": "PE", "side": "BUY", "ratio": 1},
                    {"strike_offset": "ATM", "option_type": "PE", "side": "SELL", "ratio": 1},
                ],
            ),
            OptionStrategyDefinition(
                id="OPT_08", code="08", name="Bear Call Spread", market_view="Moderately Bearish", sentiment="BEARISH",
                description="Sell lower strike Call, buy higher strike OTM Call. Credit spread with defined risk.",
                default_legs_count=2,
                structure_template=[
                    {"strike_offset": "ATM", "option_type": "CE", "side": "SELL", "ratio": 1},
                    {"strike_offset": "OTM", "option_type": "CE", "side": "BUY", "ratio": 1},
                ],
            ),
            OptionStrategyDefinition(
                id="OPT_09", code="09", name="Short Iron Condor", market_view="Neutral / Rangebound", sentiment="NEUTRAL",
                description="Sell OTM Put Spread and sell OTM Call Spread. Maximum profit if price stays in middle range.",
                default_legs_count=4,
                structure_template=[
                    {"strike_offset": "FAR_OTM", "option_type": "PE", "side": "BUY", "ratio": 1},
                    {"strike_offset": "OTM", "option_type": "PE", "side": "SELL", "ratio": 1},
                    {"strike_offset": "OTM", "option_type": "CE", "side": "SELL", "ratio": 1},
                    {"strike_offset": "FAR_OTM", "option_type": "CE", "side": "BUY", "ratio": 1},
                ],
            ),
            OptionStrategyDefinition(
                id="OPT_10", code="10", name="Ratio Front Spread", market_view="Directional with Low Volatility", sentiment="BULLISH",
                description="Buy 1 ATM option and sell 2 OTM options for net credit or small debit.",
                default_legs_count=2,
                structure_template=[
                    {"strike_offset": "ATM", "option_type": "CE", "side": "BUY", "ratio": 1},
                    {"strike_offset": "OTM", "option_type": "CE", "side": "SELL", "ratio": 2},
                ],
            ),
            OptionStrategyDefinition(
                id="OPT_11", code="11", name="Call Backspread", market_view="Strong Bullish Volatility", sentiment="BULLISH",
                description="Sell 1 ITM Call, buy 2 OTM Calls. Profiting immensely from explosive breakout.",
                default_legs_count=2,
                structure_template=[
                    {"strike_offset": "ITM", "option_type": "CE", "side": "SELL", "ratio": 1},
                    {"strike_offset": "OTM", "option_type": "CE", "side": "BUY", "ratio": 2},
                ],
            ),
            OptionStrategyDefinition(
                id="OPT_12", code="12", name="Long Straddle / Strangle", market_view="High Volatility (Direction Agnostic)", sentiment="VOLATILE",
                description="Buy both ATM/OTM Call and Put. Profits from violent moves in either direction.",
                default_legs_count=2,
                structure_template=[
                    {"strike_offset": "ATM", "option_type": "CE", "side": "BUY", "ratio": 1},
                    {"strike_offset": "ATM", "option_type": "PE", "side": "BUY", "ratio": 1},
                ],
            ),
            OptionStrategyDefinition(
                id="OPT_13", code="13", name="Short Straddle / Strangle", market_view="Low Volatility / Rangebound", sentiment="NEUTRAL",
                description="Sell both ATM/OTM Call and Put. Collects massive theta time decay.",
                default_legs_count=2,
                structure_template=[
                    {"strike_offset": "ATM", "option_type": "CE", "side": "SELL", "ratio": 1},
                    {"strike_offset": "ATM", "option_type": "PE", "side": "SELL", "ratio": 1},
                ],
            ),
            OptionStrategyDefinition(
                id="OPT_14", code="14", name="Long Butterfly", market_view="Targeted Pin at Strike", sentiment="NEUTRAL",
                description="Buy 1 lower Call, sell 2 middle Calls, buy 1 upper Call. Low cost high-reward pin trade.",
                default_legs_count=3,
                structure_template=[
                    {"strike_offset": "ITM", "option_type": "CE", "side": "BUY", "ratio": 1},
                    {"strike_offset": "ATM", "option_type": "CE", "side": "SELL", "ratio": 2},
                    {"strike_offset": "OTM", "option_type": "CE", "side": "BUY", "ratio": 1},
                ],
            ),
            OptionStrategyDefinition(
                id="OPT_15", code="15", name="Long Condor", market_view="Neutral Range Target", sentiment="NEUTRAL",
                description="4-legged spread widening the maximum profit plateau compared to butterfly.",
                default_legs_count=4,
                structure_template=[
                    {"strike_offset": "ITM", "option_type": "CE", "side": "BUY", "ratio": 1},
                    {"strike_offset": "ATM_LOW", "option_type": "CE", "side": "SELL", "ratio": 1},
                    {"strike_offset": "ATM_HIGH", "option_type": "CE", "side": "SELL", "ratio": 1},
                    {"strike_offset": "OTM", "option_type": "CE", "side": "BUY", "ratio": 1},
                ],
            ),
            OptionStrategyDefinition(
                id="OPT_16", code="16", name="Long Calendar", market_view="Neutral with Rising IV", sentiment="NEUTRAL",
                description="Sell near-term expiry option, buy far-term expiry option at same strike.",
                default_legs_count=2,
                structure_template=[
                    {"strike_offset": "ATM", "option_type": "CE", "side": "SELL", "expiry_type": "NEAR", "ratio": 1},
                    {"strike_offset": "ATM", "option_type": "CE", "side": "BUY", "expiry_type": "FAR", "ratio": 1},
                ],
            ),
            OptionStrategyDefinition(
                id="OPT_17", code="17", name="Diagonal Spread", market_view="Directional Time Decay", sentiment="BULLISH",
                description="Different strikes and different expiries combined for leveraged theta and delta harvest.",
                default_legs_count=2,
                structure_template=[
                    {"strike_offset": "ITM", "option_type": "CE", "side": "BUY", "expiry_type": "FAR", "ratio": 1},
                    {"strike_offset": "OTM", "option_type": "CE", "side": "SELL", "expiry_type": "NEAR", "ratio": 1},
                ],
            ),
            OptionStrategyDefinition(
                id="OPT_18", code="18", name="Covered Call", market_view="Mildly Bullish Income", sentiment="BULLISH",
                description="Hold spot/futures long position while selling OTM Call options for monthly yield.",
                default_legs_count=2,
                structure_template=[
                    {"strike_offset": "SPOT", "option_type": "UNDERLYING", "side": "BUY", "ratio": 1},
                    {"strike_offset": "OTM", "option_type": "CE", "side": "SELL", "ratio": 1},
                ],
            ),
            OptionStrategyDefinition(
                id="OPT_19", code="19", name="Long Combination", market_view="Synthetic Long", sentiment="BULLISH",
                description="Buy Call and sell Put at same or adjacent strike to simulate leveraged long equity.",
                default_legs_count=2,
                structure_template=[
                    {"strike_offset": "ATM", "option_type": "CE", "side": "BUY", "ratio": 1},
                    {"strike_offset": "ATM", "option_type": "PE", "side": "SELL", "ratio": 1},
                ],
            ),
            OptionStrategyDefinition(
                id="OPT_20", code="20", name="Collar", market_view="Capital Protection / Hedge", sentiment="NEUTRAL",
                description="Protective Put financed by selling OTM Covered Call on held asset.",
                default_legs_count=3,
                structure_template=[
                    {"strike_offset": "SPOT", "option_type": "UNDERLYING", "side": "BUY", "ratio": 1},
                    {"strike_offset": "OTM", "option_type": "PE", "side": "BUY", "ratio": 1},
                    {"strike_offset": "OTM", "option_type": "CE", "side": "SELL", "ratio": 1},
                ],
            ),
            OptionStrategyDefinition(
                id="OPT_21", code="21", name="Covered Combination", market_view="Enhanced Income Yield", sentiment="BULLISH",
                description="Hold underlying while selling both OTM Put and OTM Call.",
                default_legs_count=3,
                structure_template=[
                    {"strike_offset": "SPOT", "option_type": "UNDERLYING", "side": "BUY", "ratio": 1},
                    {"strike_offset": "OTM", "option_type": "CE", "side": "SELL", "ratio": 1},
                    {"strike_offset": "OTM", "option_type": "PE", "side": "SELL", "ratio": 1},
                ],
            ),
        ]

    @staticmethod
    def get_all_trading_strategies() -> List[TradingStrategyDefinition]:
        all_markets = ["INDIA_STOCK", "INDIA_FUTURE", "INDIA_OPTION", "CRYPTO_SPOT", "CRYPTO_FUTURE", "CRYPTO_OPTION", "MCX_FUTURE"]
        return [
            # Group 1: Trend & Momentum (01-10)
            TradingStrategyDefinition(
                id="STRAT_01", code="01", name="Trend Pullback to EMA", category="Trend",
                market_view="Trend Following", description="Enters on shallow pullbacks into EMA 20/50 during confirmed trends with volume expansion.",
                parameters={"ema_fast": 20, "ema_slow": 50, "atr_filter": True},
                required_inputs=["CANDLES", "VOLUME"], supported_markets=all_markets,
            ),
            TradingStrategyDefinition(
                id="STRAT_02", code="02", name="Momentum Expansion", category="Momentum",
                market_view="Expansion", description="Identifies volatility compression breakouts accompanied by RSI momentum surges > 60/40.",
                parameters={"rsi_period": 14, "lookback": 20, "expansion_multiplier": 1.5},
                required_inputs=["CANDLES", "VOLUME"], supported_markets=all_markets,
            ),
            TradingStrategyDefinition(
                id="STRAT_03", code="03", name="Daily Trend + 1H Trigger", category="Trend",
                market_view="Multi-Timeframe Trend", description="Multi-timeframe alignment using Daily 200 EMA regime filter and 1H structure breakout triggers.",
                parameters={"daily_ema": 200, "trigger_timeframe": "1h"},
                required_inputs=["CANDLES"], supported_markets=all_markets,
            ),
            TradingStrategyDefinition(
                id="STRAT_04", code="04", name="Trend Resumption After Squeeze", category="Trend",
                market_view="Trend Following", description="Bollinger Band inside Keltner Channel squeeze release in direction of dominant moving averages.",
                parameters={"bb_length": 20, "bb_std": 2.0, "keltner_mult": 1.5},
                required_inputs=["CANDLES"], supported_markets=all_markets,
            ),
            TradingStrategyDefinition(
                id="STRAT_05", code="05", name="Time-Series Momentum", category="Trend",
                market_view="Quantitative Trend", description="Systematic trend-following measuring N-day excess returns against trailing risk thresholds.",
                parameters={"lookback_days": 30, "rebalance_freq": "1d"},
                required_inputs=["CANDLES"], supported_markets=all_markets,
            ),
            TradingStrategyDefinition(
                id="STRAT_06", code="06", name="Bandwidth Squeeze Breakout", category="Breakout",
                market_view="Volatility Expansion", description="Enters on sharp expansion following lowest 6-month historical Bollinger Bandwidth percentile.",
                parameters={"percentile_threshold": 10, "bandwidth_period": 20},
                required_inputs=["CANDLES"], supported_markets=all_markets,
            ),
            TradingStrategyDefinition(
                id="STRAT_07", code="07", name="Donchian 20 Breakout", category="Breakout",
                market_view="Turtle Trend", description="Classic turtle trading strategy buying 20-period highs and selling 20-period lows.",
                parameters={"channel_period": 20, "atr_trailing": 2.0},
                required_inputs=["CANDLES"], supported_markets=all_markets,
            ),
            TradingStrategyDefinition(
                id="STRAT_08", code="08", name="UTC Opening Range Breakout", category="Breakout",
                market_view="Opening Drive", description="Captures institutional liquidity breaks outside the initial 15-minute / 30-minute session range.",
                parameters={"range_minutes": 15, "extension_multiplier": 1.0},
                required_inputs=["CANDLES", "SESSION"], supported_markets=all_markets,
            ),
            TradingStrategyDefinition(
                id="STRAT_09", code="09", name="Previous-Day High/Low Breakout", category="Breakout",
                market_view="Daily Range Extension", description="Executes on sustained breaks of PDH/PDL with volume confirmation and immediate retest support.",
                parameters={"min_hold_bars": 3, "volume_multiplier": 1.3},
                required_inputs=["CANDLES", "VOLUME"], supported_markets=all_markets,
            ),
            TradingStrategyDefinition(
                id="STRAT_10", code="10", name="Breakout Retest", category="Breakout",
                market_view="Structural Retest", description="Waits for structural break and confirms entry upon successful retest of broken support/resistance.",
                parameters={"lookback_swings": 5, "retest_tolerance_pct": 0.2},
                required_inputs=["CANDLES"], supported_markets=all_markets,
            ),

            # Group 2: Mean Reversion & Reversal (11-20)
            TradingStrategyDefinition(
                id="STRAT_11", code="11", name="Bollinger Reversion", category="Mean Reversion",
                market_view="Range Bound", description="Fades Bollinger Band 2.5 standard deviation touches back toward the central moving average.",
                parameters={"std_dev": 2.5, "target": "MIDDLE_BAND"},
                required_inputs=["CANDLES"], supported_markets=all_markets,
            ),
            TradingStrategyDefinition(
                id="STRAT_12", code="12", name="RSI Extreme Reversion", category="Mean Reversion",
                market_view="Overbought/Oversold", description="Mean reversion entries triggered when RSI crosses back inside bands from extreme <20 or >80 zones.",
                parameters={"rsi_length": 14, "extreme_high": 80, "extreme_low": 20},
                required_inputs=["CANDLES"], supported_markets=all_markets,
            ),
            TradingStrategyDefinition(
                id="STRAT_13", code="13", name="Anchored VWAP Reversion", category="Mean Reversion",
                market_view="Fair Value Target", description="Trades extended price deviations back to session/weekly anchored volume-weighted average price.",
                parameters={"deviation_bands": 2.0, "anchor": "Session"},
                required_inputs=["CANDLES", "VOLUME"], supported_markets=all_markets,
            ),
            TradingStrategyDefinition(
                id="STRAT_14", code="14", name="ATR Extension Reversal", category="Mean Reversion",
                market_view="Exhaustion Reversal", description="Fades moves exceeding 3x daily average true range without volume support.",
                parameters={"atr_multiplier": 3.0, "atr_period": 14},
                required_inputs=["CANDLES"], supported_markets=all_markets,
            ),
            TradingStrategyDefinition(
                id="STRAT_15", code="15", name="Range Fade", category="Mean Reversion",
                market_view="Oscillator Range", description="Identifies established consolidation ranges and trades limit orders at boundary extremes.",
                parameters={"range_lookback": 50, "sl_buffer_pct": 0.3},
                required_inputs=["CANDLES"], supported_markets=all_markets,
            ),
            TradingStrategyDefinition(
                id="STRAT_16", code="16", name="Swing Sweep Reversal", category="Mean Reversion",
                market_view="Liquidity Sweep", description="Liquidity grab strategy: enters upon false breakout and immediate wick rejection of key swing high/low.",
                parameters={"wick_ratio": 0.6, "rejection_bars": 2},
                required_inputs=["CANDLES"], supported_markets=all_markets,
            ),
            TradingStrategyDefinition(
                id="STRAT_17", code="17", name="Failed Breakout Reversal", category="Mean Reversion",
                market_view="Trap Fade", description="Fades trapped breakout traders when price immediately falls back inside previous range.",
                parameters={"confirmation_close": True, "trap_tolerance": 0.5},
                required_inputs=["CANDLES"], supported_markets=all_markets,
            ),
            TradingStrategyDefinition(
                id="STRAT_18", code="18", name="Prior-Level Rejection", category="Mean Reversion",
                market_view="Support/Resistance", description="Reversal strategy at historical high-volume nodes and daily pivot confluence levels.",
                parameters={"pivot_type": "Standard", "confluence_count": 2},
                required_inputs=["CANDLES"], supported_markets=all_markets,
            ),
            TradingStrategyDefinition(
                id="STRAT_19", code="19", name="Structure Break + Retest", category="Mean Reversion",
                market_view="Change of Character", description="Detects market structure shifts (MSS/CHoCH) on lower timeframes with order block alignment.",
                parameters={"swing_length": 5, "fvg_filter": True},
                required_inputs=["CANDLES"], supported_markets=all_markets,
            ),
            TradingStrategyDefinition(
                id="STRAT_20", code="20", name="Daily Compression Expansion", category="Mean Reversion",
                market_view="NR7 Breakout", description="Narrow Range 7 (NR7) and inside day compression setups preparing for large directional moves.",
                parameters={"nr_days": 7},
                required_inputs=["CANDLES"], supported_markets=all_markets,
            ),

            # Group 3: Volume & Order Flow (21-30)
            TradingStrategyDefinition(
                id="STRAT_21", code="21", name="Relative Volume Breakout", category="Volume & Flow",
                market_view="Institutional Flow", description="Breakout strategy requiring RVOL > 2.5x 20-day average volume for valid participation.",
                parameters={"rvol_threshold": 2.5, "rvol_period": 20},
                required_inputs=["CANDLES", "VOLUME"], supported_markets=all_markets,
            ),
            TradingStrategyDefinition(
                id="STRAT_22", code="22", name="Volume Dry-Up Continuation", category="Volume & Flow",
                market_view="Low-Volume Pullback", description="Buys trend continuation after volume shrinks by >50% on counter-trend consolidations.",
                parameters={"volume_decay_pct": 50, "trend_ema": 20},
                required_inputs=["CANDLES", "VOLUME"], supported_markets=all_markets,
            ),
            TradingStrategyDefinition(
                id="STRAT_23", code="23", name="Volume Climax Reversal", category="Volume & Flow",
                market_view="Capitulation Reversal", description="Fades massive volume spikes (>4x avg) accompanied by extended tails indicating climax exhaustion.",
                parameters={"volume_multiplier": 4.0, "reversal_trigger": "Next Bar Close"},
                required_inputs=["CANDLES", "VOLUME"], supported_markets=all_markets,
            ),
            TradingStrategyDefinition(
                id="STRAT_24", code="24", name="OBV Divergence", category="Volume & Flow",
                market_view="Volume Divergence", description="Spots smart money accumulation/distribution when On-Balance Volume diverges from price peaks/valleys.",
                parameters={"obv_period": 20, "divergence_bars": 10},
                required_inputs=["CANDLES", "VOLUME"], supported_markets=all_markets,
            ),
            TradingStrategyDefinition(
                id="STRAT_25", code="25", name="VWAP Reclaim on Volume", category="Volume & Flow",
                market_view="Intraday Reclaim", description="Enters long when price drops below intraday VWAP and powerfully reclaims it on above-average volume.",
                parameters={"volume_threshold": 1.5, "hold_period": 2},
                required_inputs=["CANDLES", "VOLUME"], supported_markets=all_markets,
            ),
            TradingStrategyDefinition(
                id="STRAT_26", code="26", name="Basis Extreme Reversal", category="Volume & Flow",
                market_view="Futures Basis Arbitrage", description="Trades dislocations when Futures/Perpetual basis to spot exceeds historical 99th percentile.",
                parameters={"basis_zscore": 2.5},
                required_inputs=["CANDLES", "BASIS"], supported_markets=["INDIA_FUTURE", "CRYPTO_FUTURE"],
            ),
            TradingStrategyDefinition(
                id="STRAT_27", code="27", name="Open Interest Expansion", category="Volume & Flow",
                market_view="OI Flow Breakout", description="Confirms high-conviction breakout when price advance is coupled with aggressive net new Open Interest growth.",
                parameters={"oi_growth_pct": 10.0, "price_change_pct": 1.0},
                required_inputs=["CANDLES", "OI"], supported_markets=["INDIA_FUTURE", "INDIA_OPTION", "CRYPTO_FUTURE", "CRYPTO_OPTION"],
            ),
            TradingStrategyDefinition(
                id="STRAT_28", code="28", name="Flush & Reclaim", category="Volume & Flow",
                market_view="Stop Hunt Reclaim", description="Exploits stop cascades by buying the immediate reclaim of support within 3 bars of liquidation flush.",
                parameters={"flush_bars": 3, "min_reclaim_pct": 0.8},
                required_inputs=["CANDLES", "VOLUME"], supported_markets=all_markets,
            ),
            TradingStrategyDefinition(
                id="STRAT_29", code="29", name="Dominance-Filtered Alt Trend", category="Regime & Quant",
                market_view="Crypto Rotation", description="Executes altcoin momentum trades only when Bitcoin dominance (BTC.D) is in favorable contraction regime.",
                parameters={"btcd_ma": 50, "relative_strength_rank": 10},
                required_inputs=["CANDLES", "DOMINANCE"], supported_markets=["CRYPTO_SPOT", "CRYPTO_FUTURE"],
            ),
            TradingStrategyDefinition(
                id="STRAT_30", code="30", name="Three-Factor Regime Setup", category="Regime & Quant",
                market_view="Macro Multi-Factor", description="Combines Trend (EMA 200), Volatility (ATR Percentile), and Volume Flow (RVOL) into probabilistic filter.",
                parameters={"trend_weight": 0.4, "vol_weight": 0.3, "flow_weight": 0.3},
                required_inputs=["CANDLES", "VOLUME"], supported_markets=all_markets,
            ),
        ]

    @staticmethod
    def calculate_option_payoff(legs: List[OptionLeg], spot_price: float, lot_size: float = 1.0) -> Dict[str, Any]:
        """
        Calculates exact payoff profile, breakevens, max profit, max loss, net debit/credit, and Greeks.
        """
        if not legs:
            return {"error": "No option legs provided"}

        # Normalize legs and extract greeks/ratios
        for leg in legs:
            if leg.ratio is not None and leg.ratio > 0:
                leg.quantity = float(leg.ratio)
            elif leg.quantity <= 0:
                leg.quantity = 1.0

            if leg.greeks and isinstance(leg.greeks, dict):
                if leg.delta == 0.0 and "delta" in leg.greeks:
                    leg.delta = float(leg.greeks.get("delta") or 0.0)
                if leg.theta == 0.0 and "theta" in leg.greeks:
                    leg.theta = float(leg.greeks.get("theta") or 0.0)
                if leg.gamma == 0.0 and "gamma" in leg.greeks:
                    leg.gamma = float(leg.greeks.get("gamma") or 0.0)
                if leg.vega == 0.0 and "vega" in leg.greeks:
                    leg.vega = float(leg.greeks.get("vega") or 0.0)

        strikes = [leg.strike for leg in legs if leg.strike > 0]
        if spot_price <= 0:
            spot_price = (sum(strikes) / len(strikes)) if strikes else 100.0

        min_strike = min(strikes) if strikes else spot_price * 0.8
        max_strike = max(strikes) if strikes else spot_price * 1.2

        range_min = min_strike * 0.85
        range_max = max_strike * 1.15
        step = (range_max - range_min) / 60.0

        net_premium = 0.0
        total_delta = 0.0
        total_theta = 0.0
        total_gamma = 0.0
        total_vega = 0.0

        for leg in legs:
            mult = 1.0 if leg.side.upper() == "BUY" else -1.0
            net_premium += mult * leg.premium * leg.quantity
            total_delta += mult * leg.delta * leg.quantity
            total_theta += mult * leg.theta * leg.quantity
            total_gamma += mult * leg.gamma * leg.quantity
            total_vega += mult * leg.vega * leg.quantity

        is_debit = net_premium > 0
        points = []
        pnl_values = []
        breakevens = []

        curr_p = range_min
        last_pnl = None

        for _ in range(61):
            pnl_at_expiry = 0.0
            for leg in legs:
                # Intrinsic value at expiry
                if leg.option_type.upper() in ("CALL", "CE"):
                    intrinsic = max(0.0, curr_p - leg.strike)
                else:
                    intrinsic = max(0.0, leg.strike - curr_p)

                if leg.side.upper() == "BUY":
                    leg_pnl = (intrinsic - leg.premium) * leg.quantity * lot_size
                else:
                    leg_pnl = (leg.premium - intrinsic) * leg.quantity * lot_size

                pnl_at_expiry += leg_pnl

            points.append({"price": round(curr_p, 2), "underlying_price": round(curr_p, 2), "pnl": round(pnl_at_expiry, 2)})
            pnl_values.append(pnl_at_expiry)

            if last_pnl is not None:
                if (last_pnl < 0 and pnl_at_expiry >= 0) or (last_pnl > 0 and pnl_at_expiry <= 0):
                    breakevens.append(round(curr_p, 2))

            last_pnl = pnl_at_expiry
            curr_p += step

        max_profit = max(pnl_values) if pnl_values else 0.0
        min_profit = min(pnl_values) if pnl_values else 0.0

        # Detect unlimited profit/loss
        is_unlimited_profit = any(leg.side.upper() == "BUY" and leg.option_type.upper() in ("CALL", "CE") for leg in legs)
        is_unlimited_loss = any(leg.side.upper() == "SELL" and leg.option_type.upper() in ("CALL", "CE") for leg in legs)

        net_val = round(abs(net_premium) * lot_size, 2)
        cost_str = "DEBIT" if is_debit else "CREDIT"

        return {
            "net_debit_credit": net_val,
            "net_cost": net_val,
            "type": "NET_DEBIT" if is_debit else "NET_CREDIT",
            "cost_type": cost_str,
            "max_profit": "UNLIMITED" if is_unlimited_profit else round(max_profit, 2),
            "max_loss": "UNLIMITED" if is_unlimited_loss else round(abs(min_profit), 2),
            "breakevens": breakevens,
            "total_delta": round(total_delta, 4),
            "total_theta": round(total_theta, 4),
            "total_gamma": round(total_gamma, 6),
            "total_vega": round(total_vega, 4),
            "greeks": {
                "delta": round(total_delta, 4),
                "theta": round(total_theta, 4),
                "gamma": round(total_gamma, 6),
                "vega": round(total_vega, 4),
            },
            "payoff_curve": points,
            "payoff_points": points,
            "spot_price": spot_price,
            "lot_size": lot_size,
        }
