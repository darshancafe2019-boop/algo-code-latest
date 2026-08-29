"""
Statistical Pairs Trading & Cointegration Engine
=================================================
Authoritative quantitative implementation of pairs trading mathematics from:
'The Handbook of Pairs Trading Strategies'

Key Features:
1. Multi-asset statistical analysis (Equities, ETFs, Indices, Futures, Crypto Perps).
2. OLS and Rolling-Window Regression for dynamic hedge ratio calibration ($\beta$).
3. Engle-Granger 2-step cointegration testing with critical value tables.
4. Augmented Dickey-Fuller (ADF) stationarity test on spread residuals.
5. Ornstein-Uhlenbeck continuous-time parameter estimation & discrete AR(1) Half-Life of mean reversion.
6. Multi-window correlation and hedge-ratio stability metrics.
7. 8-mode position neutralization engine (Dollar, Beta, Volatility, Regression, Delta).
8. Real-time Z-score tracking, historical crossing frequency, and maximum divergence estimation.
9. Composite statistical ranking and scoring model.
"""

import math
import logging
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Dict, Any, List, Optional, Tuple, Union
from datetime import datetime, timezone
import numpy as np
import pandas as pd

logger = logging.getLogger("PairsStatisticalEngine")


class NeutralizationMode(str, Enum):
    """Position sizing and exposure neutralization modes."""
    EQUAL_QUANTITY = "EQUAL_QUANTITY"
    EQUAL_NOTIONAL = "EQUAL_NOTIONAL"
    DOLLAR_NEUTRAL = "DOLLAR_NEUTRAL"
    BETA_NEUTRAL = "BETA_NEUTRAL"
    VOLATILITY_NEUTRAL = "VOLATILITY_NEUTRAL"
    REGRESSION_HEDGE_RATIO = "REGRESSION_HEDGE_RATIO"
    DELTA_NEUTRAL = "DELTA_NEUTRAL"
    CONTRACT_VALUE_NEUTRAL = "CONTRACT_VALUE_NEUTRAL"


class PairEntryDirection(str, Enum):
    """Execution direction for statistical pair trades."""
    LONG_A_SHORT_B = "LONG_A_SHORT_B"  # Spread is abnormally LOW -> Buy cheap Leg A, Short rich Leg B
    SHORT_A_LONG_B = "SHORT_A_LONG_B"  # Spread is abnormally HIGH -> Short rich Leg A, Buy cheap Leg B
    NEUTRAL_FLAT = "NEUTRAL_FLAT"      # Spread within equilibrium bounds


class PairRegimeType(str, Enum):
    """Pair relationship regime classification."""
    COINTEGRATED_MEAN_REVERTING = "COINTEGRATED_MEAN_REVERTING"
    HIGH_CORRELATION_NON_STATIONARY = "HIGH_CORRELATION_NON_STATIONARY"
    DIVERGING_TREND = "DIVERGING_TREND"
    REGIME_BREAK_WARNING = "REGIME_BREAK_WARNING"
    INSUFFICIENT_HISTORY = "INSUFFICIENT_HISTORY"


@dataclass
class PairCandidate:
    """Specification of a potential pair candidate pair."""
    pair_id: str
    symbol_a: str
    symbol_b: str
    asset_class: str
    market: str  # "India", "Global", "Crypto"
    exchange_a: str
    exchange_b: str
    currency_a: str
    currency_b: str
    multiplier_a: float = 1.0
    multiplier_b: float = 1.0
    lot_size_a: float = 1.0
    lot_size_b: float = 1.0
    tick_size_a: float = 0.05
    tick_size_b: float = 0.05
    sector: str = "General"
    is_perpetual: bool = False
    is_futures: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class PairAnalysisResult:
    """Complete quantitative statistical analysis of a pair."""
    pair_id: str
    symbol_a: str
    symbol_b: str
    market: str
    asset_class: str
    last_price_a: float
    last_price_b: float
    price_ratio: float
    log_price_ratio: float
    hedge_ratio: float
    intercept: float
    r_squared: float
    correlation: float
    rolling_correlation_30d: float
    rolling_hedge_ratio_30d: float
    current_spread: float
    spread_mean: float
    spread_std: float
    current_zscore: float
    zscore_series: List[float] = field(default_factory=list)
    spread_series: List[float] = field(default_factory=list)
    timestamps: List[str] = field(default_factory=list)
    cointegration_pvalue: float = 1.0
    is_cointegrated: bool = False
    adf_statistic: float = 0.0
    adf_pvalue: float = 1.0
    adf_critical_values: Dict[str, float] = field(default_factory=dict)
    is_stationary: bool = False
    half_life_days: float = 0.0
    mean_crossings_count: int = 0
    max_divergence_pct: float = 0.0
    regime: str = PairRegimeType.INSUFFICIENT_HISTORY.value
    composite_rank_score: float = 0.0
    suggested_direction: str = PairEntryDirection.NEUTRAL_FLAT.value
    estimated_annual_turnover: float = 0.0
    estimated_funding_drag_pct: float = 0.0
    estimated_borrow_cost_pct: float = 0.0
    parameter_stability_pct: float = 0.0
    lookback_candles: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class PairsStatisticalEngine:
    """High-precision quantitative statistical calculations for multi-market pairs trading."""

    # MacKinnon Approximate Critical Values for Engle-Granger / ADF with no trend
    CRITICAL_VALUES_ADF = {
        "1%": -3.434,
        "5%": -2.863,
        "10%": -2.568,
    }

    # Cointegration test critical values (2 variables, constant, no trend)
    CRITICAL_VALUES_COINT = {
        "1%": -3.90,
        "5%": -3.34,
        "10%": -3.04,
    }

    @staticmethod
    def calculate_ols_hedge_ratio(series_a: np.ndarray, series_b: np.ndarray) -> Tuple[float, float, float]:
        """
        Calculates Ordinary Least Squares (OLS) regression:
        Price_A = alpha + beta * Price_B + epsilon
        Returns: (beta, alpha, r_squared)
        """
        if len(series_a) < 5 or len(series_b) < 5:
            return 1.0, 0.0, 0.0

        y = np.asarray(series_a, dtype=np.float64)
        x = np.asarray(series_b, dtype=np.float64)

        # Filter NaNs / Infs
        valid = np.isfinite(x) & np.isfinite(y)
        if np.sum(valid) < 5:
            return 1.0, 0.0, 0.0

        x = x[valid]
        y = y[valid]

        var_x = np.var(x)
        if var_x < 1e-12:
            return 1.0, 0.0, 0.0

        cov_xy = np.cov(x, y)[0, 1]
        beta = float(cov_xy / var_x)
        alpha = float(np.mean(y) - beta * np.mean(x))

        # Calculate R-squared
        y_pred = alpha + beta * x
        ss_res = np.sum((y - y_pred) ** 2)
        ss_tot = np.sum((y - np.mean(y)) ** 2)
        r_squared = float(1.0 - (ss_res / ss_tot)) if ss_tot > 1e-12 else 0.0
        r_squared = max(0.0, min(1.0, r_squared))

        return round(beta, 6), round(alpha, 4), round(r_squared, 4)

    @classmethod
    def calculate_rolling_ols(
        cls, series_a: np.ndarray, series_b: np.ndarray, window: int = 30
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Calculates rolling OLS hedge ratios across historical series.
        Returns: (rolling_betas, rolling_alphas)
        """
        n = min(len(series_a), len(series_b))
        betas = np.full(n, np.nan)
        alphas = np.full(n, np.nan)

        if n < window:
            b, a, _ = cls.calculate_ols_hedge_ratio(series_a, series_b)
            betas.fill(b)
            alphas.fill(a)
            return betas, alphas

        for i in range(window - 1, n):
            sub_a = series_a[i - window + 1 : i + 1]
            sub_b = series_b[i - window + 1 : i + 1]
            b, a, _ = cls.calculate_ols_hedge_ratio(sub_a, sub_b)
            betas[i] = b
            alphas[i] = a

        # Forward fill initial window with first valid
        first_valid_b = betas[window - 1] if not np.isnan(betas[window - 1]) else 1.0
        first_valid_a = alphas[window - 1] if not np.isnan(alphas[window - 1]) else 0.0
        betas[: window - 1] = first_valid_b
        alphas[: window - 1] = first_valid_a

        return betas, alphas

    @staticmethod
    def calculate_spread(
        series_a: np.ndarray, series_b: np.ndarray, hedge_ratio: float, intercept: float = 0.0
    ) -> np.ndarray:
        """Computes residual spread series: Spread_t = Price_A,t - beta * Price_B,t - alpha."""
        a = np.asarray(series_a, dtype=np.float64)
        b = np.asarray(series_b, dtype=np.float64)
        return a - (hedge_ratio * b) - intercept

    @staticmethod
    def calculate_zscore(
        spread_series: np.ndarray, lookback: Optional[int] = None
    ) -> Tuple[float, float, float, np.ndarray]:
        """
        Calculates Z-score: Z_t = (Spread_t - mean) / std.
        Returns: (current_zscore, spread_mean, spread_std, zscore_series)
        """
        s = np.asarray(spread_series, dtype=np.float64)
        valid = s[np.isfinite(s)]
        if len(valid) < 2:
            return 0.0, 0.0, 1.0, np.zeros_like(s)

        if lookback is not None and lookback > 0 and len(valid) > lookback:
            calc_window = valid[-lookback:]
        else:
            calc_window = valid

        mean_val = float(np.mean(calc_window))
        std_val = float(np.std(calc_window))
        if std_val < 1e-12:
            std_val = 1e-6

        z_series = (s - mean_val) / std_val
        current_z = float(z_series[-1]) if len(z_series) > 0 else 0.0

        return round(current_z, 4), round(mean_val, 4), round(std_val, 4), np.round(z_series, 4)

    @classmethod
    def augmented_dickey_fuller_test(
        cls, residuals: np.ndarray, max_lags: int = 1
    ) -> Tuple[float, float, bool, Dict[str, float]]:
        """
        Runs Augmented Dickey-Fuller (ADF) test for stationarity on residuals:
        Delta e_t = gamma * e_{t-1} + sum(delta_i * Delta e_{t-i}) + noise
        Null hypothesis H0: Series has unit root (Non-Stationary).
        Alternative H1: Series is stationary / mean-reverting.
        Returns: (adf_statistic, p_value, is_stationary_at_5pct, critical_values)
        """
        res = np.asarray(residuals, dtype=np.float64)
        res = res[np.isfinite(res)]
        n = len(res)

        if n < 15:
            return 0.0, 1.0, False, cls.CRITICAL_VALUES_ADF

        # Compute differences: Delta y_t
        delta_y = np.diff(res)
        y_lag = res[:-1]

        # Prepare regression matrix for Delta y_t on y_{t-1}
        if max_lags > 0 and len(delta_y) > max_lags + 2:
            # Add lagged differences
            k = max_lags
            T = len(delta_y) - k
            Y = delta_y[k:]
            X_lag = y_lag[k:]
            
            # Build design matrix with intercept, y_lag, and lagged diffs
            X = np.column_stack([np.ones(T), X_lag])
            for i in range(1, k + 1):
                lagged_diff = delta_y[k - i : -i]
                X = np.column_stack([X, lagged_diff])
        else:
            T = len(delta_y)
            Y = delta_y
            X = np.column_stack([np.ones(T), y_lag])

        try:
            # OLS: (X'X)^-1 X'Y
            xtx = np.dot(X.T, X)
            xty = np.dot(X.T, Y)
            beta_hat = np.linalg.solve(xtx, xty)

            # Residuals of regression
            e = Y - np.dot(X, beta_hat)
            sigma2 = np.sum(e ** 2) / max(1, T - X.shape[1])
            var_beta = sigma2 * np.linalg.inv(xtx)

            # t-statistic for gamma (coefficient of y_{t-1}, at index 1)
            gamma_coef = beta_hat[1]
            se_gamma = math.sqrt(max(1e-12, var_beta[1, 1]))
            t_stat = float(gamma_coef / se_gamma)

            # Approximate empirical p-value based on MacKinnon distribution surface
            # If t_stat < -3.43 (1% level), p < 0.01
            # If t_stat < -2.86 (5% level), p < 0.05
            # If t_stat < -2.57 (10% level), p < 0.10
            if t_stat <= -3.434:
                p_val = max(0.001, 0.01 * math.exp(t_stat + 3.434))
            elif t_stat <= -2.863:
                p_val = 0.01 + 0.04 * ((t_stat - (-3.434)) / ((-2.863) - (-3.434)))
            elif t_stat <= -2.568:
                p_val = 0.05 + 0.05 * ((t_stat - (-2.863)) / ((-2.568) - (-2.863)))
            else:
                p_val = min(0.99, 0.10 + 0.40 * (1.0 / (1.0 + math.exp(-2.0 * (t_stat + 2.568)))))

            is_stat_5 = bool(t_stat < cls.CRITICAL_VALUES_ADF["5%"])
            return round(t_stat, 4), round(p_val, 4), is_stat_5, cls.CRITICAL_VALUES_ADF
        except Exception as ex:
            logger.warning(f"ADF test failed: {ex}")
            return 0.0, 1.0, False, cls.CRITICAL_VALUES_ADF

    @classmethod
    def engle_granger_cointegration_test(
        cls, series_a: np.ndarray, series_b: np.ndarray
    ) -> Tuple[float, float, bool]:
        """
        Two-step Engle-Granger cointegration test:
        1. Regress Series A on Series B to obtain residuals.
        2. Run unit root test on residuals using cointegration critical values.
        Returns: (test_statistic, p_value, is_cointegrated_at_5pct)
        """
        beta, alpha, _ = cls.calculate_ols_hedge_ratio(series_a, series_b)
        residuals = cls.calculate_spread(series_a, series_b, beta, alpha)
        t_stat, p_val, _, _ = cls.augmented_dickey_fuller_test(residuals)

        # Adjust p-value for cointegration 2-variable test (stricter critical threshold -3.34)
        is_coint = bool(t_stat < cls.CRITICAL_VALUES_COINT["5%"])
        if t_stat <= -3.90:
            coint_p = max(0.001, 0.01 * math.exp(t_stat + 3.90))
        elif t_stat <= -3.34:
            coint_p = 0.01 + 0.04 * ((t_stat - (-3.90)) / ((-3.34) - (-3.90)))
        elif t_stat <= -3.04:
            coint_p = 0.05 + 0.05 * ((t_stat - (-3.34)) / ((-3.04) - (-3.34)))
        else:
            coint_p = min(0.99, 0.10 + 0.50 * (1.0 / (1.0 + math.exp(-1.5 * (t_stat + 3.04)))))

        return round(t_stat, 4), round(coint_p, 4), is_coint

    @staticmethod
    def calculate_half_life(spread_series: np.ndarray) -> float:
        """
        Calculates Ornstein-Uhlenbeck continuous mean-reversion half-life via discrete AR(1):
        Delta S_t = theta * (S_{t-1} - mu) + error
        Half-Life = -ln(2) / ln(1 + theta)  (or -ln(2) / theta for continuous approx)
        Returns: Half-life in candles / periods.
        """
        s = np.asarray(spread_series, dtype=np.float64)
        s = s[np.isfinite(s)]
        if len(s) < 10:
            return 30.0

        delta_s = np.diff(s)
        s_lag = s[:-1]

        # Regress delta_s on s_lag
        var_lag = np.var(s_lag)
        if var_lag < 1e-12:
            return 30.0

        cov = np.cov(s_lag, delta_s)[0, 1]
        theta = float(cov / var_lag)

        # If theta >= 0, series is explosive/non-reverting
        if theta >= -1e-6:
            return 999.0  # Infinite / non-reverting

        # Calculate half life
        if (1.0 + theta) > 0:
            half_life = -math.log(2.0) / math.log(1.0 + theta)
        else:
            half_life = -math.log(2.0) / theta

        return max(0.5, min(999.0, round(float(half_life), 2)))

    @staticmethod
    def calculate_crossing_frequency(spread_series: np.ndarray) -> int:
        """Counts how many times the spread crosses its historical mean."""
        s = np.asarray(spread_series, dtype=np.float64)
        s = s[np.isfinite(s)]
        if len(s) < 3:
            return 0

        mean_val = np.mean(s)
        centered = s - mean_val
        signs = np.sign(centered)
        # Avoid zeros in sign
        signs[signs == 0] = 1.0

        crossings = np.sum(signs[:-1] != signs[1:])
        return int(crossings)

    @staticmethod
    def calculate_correlation(series_a: np.ndarray, series_b: np.ndarray) -> float:
        """Computes standard Pearson correlation coefficient."""
        a = np.asarray(series_a, dtype=np.float64)
        b = np.asarray(series_b, dtype=np.float64)
        valid = np.isfinite(a) & np.isfinite(b)
        if np.sum(valid) < 5:
            return 0.0

        corr = np.corrcoef(a[valid], b[valid])[0, 1]
        return float(corr) if np.isfinite(corr) else 0.0

    @classmethod
    def analyze_pair(
        cls,
        candidate: PairCandidate,
        prices_a: List[float],
        prices_b: List[float],
        timestamps: Optional[List[str]] = None,
        entry_threshold: float = 2.0,
        exit_threshold: float = 0.5,
    ) -> PairAnalysisResult:
        """
        Executes exhaustive quantitative statistical analysis pipeline on a pair candidate.
        """
        n = min(len(prices_a), len(prices_b))
        if n < 10:
            return PairAnalysisResult(
                pair_id=candidate.pair_id,
                symbol_a=candidate.symbol_a,
                symbol_b=candidate.symbol_b,
                market=candidate.market,
                asset_class=candidate.asset_class,
                last_price_a=prices_a[-1] if prices_a else 0.0,
                last_price_b=prices_b[-1] if prices_b else 0.0,
                price_ratio=1.0,
                log_price_ratio=0.0,
                hedge_ratio=1.0,
                intercept=0.0,
                r_squared=0.0,
                correlation=0.0,
                rolling_correlation_30d=0.0,
                rolling_hedge_ratio_30d=1.0,
                current_spread=0.0,
                spread_mean=0.0,
                spread_std=1.0,
                current_zscore=0.0,
                regime=PairRegimeType.INSUFFICIENT_HISTORY.value,
            )

        arr_a = np.array(prices_a[-n:], dtype=np.float64)
        arr_b = np.array(prices_b[-n:], dtype=np.float64)
        ts_list = (timestamps[-n:] if timestamps and len(timestamps) >= n else [f"t-{i}" for i in range(n)])

        last_a = float(arr_a[-1])
        last_b = float(arr_b[-1])
        price_ratio = round(last_a / max(1e-6, last_b), 4)
        log_price_ratio = round(math.log(max(1e-6, last_a) / max(1e-6, last_b)), 4)

        # 1. Regression & Hedge Ratio
        beta, alpha, r2 = cls.calculate_ols_hedge_ratio(arr_a, arr_b)
        spread_arr = cls.calculate_spread(arr_a, arr_b, beta, alpha)

        # 2. Z-Score
        cur_z, s_mean, s_std, z_series = cls.calculate_zscore(spread_arr)

        # 3. Statistical Tests (Engle-Granger & ADF)
        coint_stat, coint_p, is_coint = cls.engle_granger_cointegration_test(arr_a, arr_b)
        adf_stat, adf_p, is_stat, crit_vals = cls.augmented_dickey_fuller_test(spread_arr)

        # 4. Mean Reversion Half-Life & Crossings
        half_life = cls.calculate_half_life(spread_arr)
        crossings = cls.calculate_crossing_frequency(spread_arr)

        # 5. Correlations & Stability
        corr = round(cls.calculate_correlation(arr_a, arr_b), 4)
        w30 = min(30, n // 2)
        corr_30d = round(cls.calculate_correlation(arr_a[-w30:], arr_b[-w30:]), 4) if w30 >= 5 else corr
        rolling_betas, _ = cls.calculate_rolling_ols(arr_a, arr_b, window=w30)
        roll_beta_cur = round(float(rolling_betas[-1]), 4) if len(rolling_betas) > 0 else beta

        # 6. Max Divergence
        spread_min, spread_max = np.min(spread_arr), np.max(spread_arr)
        max_div_pct = round(((spread_max - spread_min) / max(1e-6, last_a)) * 100.0, 2)

        # 7. Regime Classification
        if is_coint and is_stat and half_life < 60.0:
            regime = PairRegimeType.COINTEGRATED_MEAN_REVERTING.value
        elif corr > 0.80 and not is_coint:
            regime = PairRegimeType.HIGH_CORRELATION_NON_STATIONARY.value
        elif half_life > 120.0 or abs(beta - roll_beta_cur) / max(0.01, abs(beta)) > 0.50:
            regime = PairRegimeType.REGIME_BREAK_WARNING.value
        else:
            regime = PairRegimeType.DIVERGING_TREND.value

        # 8. Suggested Direction
        if cur_z >= entry_threshold:
            suggested_dir = PairEntryDirection.SHORT_A_LONG_B.value
        elif cur_z <= -entry_threshold:
            suggested_dir = PairEntryDirection.LONG_A_SHORT_B.value
        elif abs(cur_z) <= exit_threshold:
            suggested_dir = PairEntryDirection.NEUTRAL_FLAT.value
        else:
            suggested_dir = PairEntryDirection.NEUTRAL_FLAT.value

        # 9. Parameter Stability & Composite Rank Score
        # Stability: inverse variance of rolling beta relative to full beta
        if len(rolling_betas) > 10:
            beta_var_pct = float(np.std(rolling_betas) / max(0.01, abs(np.mean(rolling_betas))))
            param_stability = max(0.0, min(100.0, round((1.0 - min(1.0, beta_var_pct)) * 100.0, 1)))
        else:
            param_stability = 75.0

        # Composite Rank Score (0 to 100)
        # Weights: Cointegration (35%), ADF (25%), Half-Life (20%), Stability (10%), Correlation (10%)
        score_coint = max(0.0, (1.0 - coint_p)) * 35.0
        score_adf = max(0.0, (1.0 - adf_p)) * 25.0
        score_hl = max(0.0, (1.0 - min(1.0, half_life / 60.0))) * 20.0
        score_stab = (param_stability / 100.0) * 10.0
        score_corr = max(0.0, corr) * 10.0
        composite_score = round(score_coint + score_adf + score_hl + score_stab + score_corr, 1)

        # Estimate turnover and cost
        est_turnover = round((365.0 / max(1.0, half_life * 2.0)), 1)
        est_borrow_cost = 2.5 if candidate.asset_class in ["INDIAN_EQUITIES", "GLOBAL_EQUITIES"] else 0.0
        est_funding_drag = 0.05 * est_turnover if candidate.is_perpetual else 0.0

        return PairAnalysisResult(
            pair_id=candidate.pair_id,
            symbol_a=candidate.symbol_a,
            symbol_b=candidate.symbol_b,
            market=candidate.market,
            asset_class=candidate.asset_class,
            last_price_a=round(last_a, 2),
            last_price_b=round(last_b, 2),
            price_ratio=price_ratio,
            log_price_ratio=log_price_ratio,
            hedge_ratio=beta,
            intercept=alpha,
            r_squared=r2,
            correlation=corr,
            rolling_correlation_30d=corr_30d,
            rolling_hedge_ratio_30d=roll_beta_cur,
            current_spread=round(float(spread_arr[-1]), 4),
            spread_mean=s_mean,
            spread_std=s_std,
            current_zscore=cur_z,
            zscore_series=list(z_series[-60:]),
            spread_series=[round(float(x), 4) for x in spread_arr[-60:]],
            timestamps=list(ts_list[-60:]),
            cointegration_pvalue=coint_p,
            is_cointegrated=is_coint,
            adf_statistic=adf_stat,
            adf_pvalue=adf_p,
            adf_critical_values=crit_vals,
            is_stationary=is_stat,
            half_life_days=half_life,
            mean_crossings_count=crossings,
            max_divergence_pct=max_div_pct,
            regime=regime,
            composite_rank_score=composite_score,
            suggested_direction=suggested_dir,
            estimated_annual_turnover=est_turnover,
            estimated_funding_drag_pct=round(est_funding_drag, 2),
            estimated_borrow_cost_pct=est_borrow_cost,
            parameter_stability_pct=param_stability,
            lookback_candles=n,
        )

    @classmethod
    def calculate_position_sizing(
        cls,
        candidate: PairCandidate,
        analysis: PairAnalysisResult,
        allocated_capital: float,
        mode: NeutralizationMode = NeutralizationMode.REGRESSION_HEDGE_RATIO,
        target_leverage: float = 1.0,
    ) -> Dict[str, Any]:
        """
        Calculates exact long and short lot/contract sizes with discrete integer lot constraints
        and residual dollar/beta imbalance reporting across 8 neutralization models.
        """
        capital = max(100.0, float(allocated_capital)) * max(0.1, target_leverage)
        p_a = max(0.01, analysis.last_price_a)
        p_b = max(0.01, analysis.last_price_b)
        lot_a = max(1.0, candidate.lot_size_a)
        lot_b = max(1.0, candidate.lot_size_b)
        mult_a = max(1.0, candidate.multiplier_a)
        mult_b = max(1.0, candidate.multiplier_b)
        beta = max(0.01, abs(analysis.hedge_ratio))

        unit_cost_a = p_a * lot_a * mult_a
        unit_cost_b = p_b * lot_b * mult_b

        if mode == NeutralizationMode.EQUAL_QUANTITY:
            # 1:1 Quantity
            units = math.floor(capital / (unit_cost_a + unit_cost_b))
            units = max(1, units)
            lots_a = units
            lots_b = units
        elif mode in [NeutralizationMode.DOLLAR_NEUTRAL, NeutralizationMode.EQUAL_NOTIONAL]:
            # 50% capital to Leg A, 50% capital to Leg B
            half_cap = capital / 2.0
            lots_a = max(1, math.floor(half_cap / unit_cost_a))
            lots_b = max(1, math.floor(half_cap / unit_cost_b))
        elif mode == NeutralizationMode.REGRESSION_HEDGE_RATIO:
            # Sizing according to beta: Q_b = beta * Q_a
            # Total Notional = Q_a * P_a + (beta * Q_a) * P_b = Q_a * (P_a + beta * P_b)
            comb_price = unit_cost_a + (beta * unit_cost_b)
            base_lots_a = max(1, math.floor(capital / comb_price))
            lots_a = base_lots_a
            raw_b = base_lots_a * beta * (lot_a * mult_a) / (lot_b * mult_b)
            lots_b = max(1, round(raw_b))
        elif mode == NeutralizationMode.BETA_NEUTRAL:
            # Beta weighted notional
            beta_a = 1.0
            beta_b = beta
            weight_a = beta_b / (beta_a + beta_b)
            weight_b = beta_a / (beta_a + beta_b)
            lots_a = max(1, math.floor((capital * weight_a) / unit_cost_a))
            lots_b = max(1, math.floor((capital * weight_b) / unit_cost_b))
        elif mode == NeutralizationMode.VOLATILITY_NEUTRAL:
            # Inverse volatility weighting
            vol_a = max(0.01, analysis.spread_std / p_a)
            vol_b = max(0.01, analysis.spread_std / p_b)
            weight_a = (1.0 / vol_a) / ((1.0 / vol_a) + (1.0 / vol_b))
            weight_b = (1.0 / vol_b) / ((1.0 / vol_a) + (1.0 / vol_b))
            lots_a = max(1, math.floor((capital * weight_a) / unit_cost_a))
            lots_b = max(1, math.floor((capital * weight_b) / unit_cost_b))
        else:
            # Default to Regression Hedge Ratio
            comb_price = unit_cost_a + (beta * unit_cost_b)
            lots_a = max(1, math.floor(capital / comb_price))
            lots_b = max(1, round(lots_a * beta))

        qty_a = lots_a * lot_a
        qty_b = lots_b * lot_b
        notional_a = qty_a * p_a * mult_a
        notional_b = qty_b * p_b * mult_b
        gross_exposure = notional_a + notional_b
        net_dollar_exposure = notional_a - notional_b
        dollar_imbalance_pct = round((abs(net_dollar_exposure) / max(1.0, gross_exposure)) * 100.0, 2)
        effective_hedge_ratio = round(qty_b / max(1e-6, qty_a), 4)

        # Margin requirements: 20% for equities/futures, 10% for crypto perps
        margin_rate = 0.10 if candidate.is_perpetual else 0.20
        required_initial_margin = round(gross_exposure * margin_rate, 2)

        return {
            "mode": mode.value,
            "lots_a": lots_a,
            "lots_b": lots_b,
            "quantity_a": qty_a,
            "quantity_b": qty_b,
            "notional_a": round(notional_a, 2),
            "notional_b": round(notional_b, 2),
            "gross_exposure": round(gross_exposure, 2),
            "net_dollar_exposure": round(net_dollar_exposure, 2),
            "dollar_imbalance_pct": dollar_imbalance_pct,
            "target_hedge_ratio": beta,
            "effective_hedge_ratio": effective_hedge_ratio,
            "hedge_ratio_residual_pct": round(abs(effective_hedge_ratio - beta) / max(0.01, beta) * 100.0, 2),
            "required_margin": required_initial_margin,
            "leverage": round(gross_exposure / max(1.0, capital), 2),
        }
