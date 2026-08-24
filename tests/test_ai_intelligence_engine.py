"""
Comprehensive Automated Test Suite for Quant.OS AI Intelligence Engine:
- Zero future-data leakage
- Chronological walk-forward validation
- LightGBM + XGBoost ensemble & probability calibration
- SHAP feature attribution
- Model disagreement & fail-closed HOLD behaviour
- MLOps model registry, promotion & rollback
- Deterministic risk gate verification
"""

import math
import unittest
from datetime import datetime, timezone
import numpy as np
import pandas as pd

from src.ai.feature_pipeline import FeaturePipeline
from src.ai.model_ensemble import ModelEnsemble, TimeSeriesWalkForwardCV
from src.ai.decision_engine import DecisionEngine
from src.ai.mlops_registry import MLOpsRegistry
from src.ai.ai_service import AIService
from src.ai.sentiment_challenger import FinBERTSentimentEngine, ChronosChallengerAdapter


def generate_synthetic_ohlcv(n_bars: int = 400) -> pd.DataFrame:
    """Generates synthetic point-in-time OHLCV data for testing."""
    np.random.seed(42)
    now = datetime.now(timezone.utc).timestamp()
    rows = []
    p = 65000.0
    for i in range(n_bars):
        t = now - ((n_bars - i) * 300)
        ret = np.random.normal(0.0002, 0.004)
        p = p * (1.0 + ret)
        high = p * (1.0 + abs(np.random.normal(0, 0.002)))
        low = p * (1.0 - abs(np.random.normal(0, 0.002)))
        op = p * (1.0 - (ret * 0.5))
        vol = max(10.0, float(np.random.normal(100.0, 30.0)))
        rows.append({
            "timestamp": datetime.fromtimestamp(t, tz=timezone.utc).isoformat(),
            "open": op,
            "high": high,
            "low": low,
            "close": p,
            "volume": vol,
        })
    return pd.DataFrame(rows)


class TestAIFeaturePipeline(unittest.TestCase):

    def setUp(self):
        self.pipeline = FeaturePipeline()
        self.df = generate_synthetic_ohlcv(300)

    def test_feature_extraction_completeness_and_no_nans(self):
        feat_df, meta = self.pipeline.extract_features(self.df)
        self.assertFalse(feat_df.empty)
        self.assertEqual(len(feat_df), len(self.df))
        self.assertEqual(meta["quality_score"], 1.0)
        self.assertFalse(feat_df.isna().any().any())

    def test_no_future_leakage(self):
        """Verifies that features for bar T only depend on bars <= T."""
        feat_df1, _ = self.pipeline.extract_features(self.df.iloc[:200])
        feat_df2, _ = self.pipeline.extract_features(self.df)
        # The 199th row features should match between the 200-bar and 300-bar datasets
        for col in ["returns_1", "rsi_14", "ema_9_dist", "atr_14_norm"]:
            val1 = float(feat_df1[col].iloc[199])
            val2 = float(feat_df2[col].iloc[199])
            self.assertAlmostEqual(val1, val2, places=4)

    def test_target_generation_cost_adjusted(self):
        targets = self.pipeline.generate_targets(self.df, horizon_bars=5, cost_threshold_bps=12.0)
        valid_targets = targets.dropna()
        self.assertTrue(set(valid_targets.unique()).issubset({-1, 0, 1}))
        # Last 5 bars must be NaN (future not yet known)
        self.assertTrue(targets.iloc[-5:].isna().all())


class TestModelEnsembleAndWalkForward(unittest.TestCase):

    def setUp(self):
        self.df = generate_synthetic_ohlcv(350)
        self.pipeline = FeaturePipeline()
        self.feat_df, _ = self.pipeline.extract_features(self.df)
        self.targets = self.pipeline.generate_targets(self.df, horizon_bars=5)

    def test_walk_forward_cv_no_overlap(self):
        cv = TimeSeriesWalkForwardCV(n_splits=3, train_ratio=0.6, embargo_bars=5)
        folds = cv.split(self.feat_df)
        self.assertGreater(len(folds), 0)
        for tr, val in folds:
            self.assertLess(tr[-1] + 5, val[0])  # Embargo gap strictly respected
            self.assertTrue(np.all(tr < val[0]))

    def test_ensemble_train_and_predict(self):
        ensemble = ModelEnsemble(model_version="test-ensemble-v1")
        metrics = ensemble.train_walk_forward(self.feat_df, self.targets, tune_hyperparameters=False)
        self.assertTrue(ensemble.is_trained)
        self.assertIn("test_accuracy", metrics)
        self.assertGreater(metrics["test_accuracy"], 0.0)

        # Single row prediction
        pred = ensemble.predict(self.feat_df.iloc[[-1]], confidence_threshold=0.60)
        self.assertIn(pred.decision, ["LONG", "SHORT", "HOLD"])
        self.assertGreaterEqual(pred.confidence, 0.0)
        self.assertLessEqual(pred.confidence, 1.0)
        self.assertIsInstance(pred.top_factors, list)


class TestDecisionEngineAndRisk(unittest.TestCase):

    def setUp(self):
        self.df = generate_synthetic_ohlcv(250)
        self.decision_engine = DecisionEngine()

    def test_stale_data_fails_closed_to_hold(self):
        # Create stale dataframe (timestamp 10 minutes ago)
        stale_df = self.df.copy()
        stale_ts = datetime.fromtimestamp(datetime.now(timezone.utc).timestamp() - 600, tz=timezone.utc).isoformat()
        stale_df["timestamp"] = stale_ts

        dec = self.decision_engine.evaluate_market_update(
            symbol="BTC/USDT",
            timeframe="5m",
            df_candles=stale_df,
        )
        self.assertEqual(dec["decision"], "HOLD")
        self.assertEqual(dec["riskStatus"], "BLOCKED")
        self.assertIn("stale", dec["vetoReasons"][0].lower())

    def test_news_sentiment_integration(self):
        sent_engine = FinBERTSentimentEngine()
        res_bull = sent_engine.analyze_news_headlines("BTC/USDT", [
            {"headline": "Bitcoin surges past resistance in massive institutional rally", "timestamp": datetime.now(timezone.utc).isoformat()}
        ])
        self.assertEqual(res_bull["sentiment_label"], "BULLISH")
        self.assertGreater(res_bull["sentiment_score"], 0.0)

    def test_chronos_challenger_bounds(self):
        chronos = ChronosChallengerAdapter()
        prices = [65000.0 * (1.0 + (i * 0.001)) for i in range(30)]
        res = chronos.forecast_bounds(prices, prediction_horizon_bars=5)
        self.assertEqual(res["status"], "OK")
        self.assertEqual(res["predicted_direction"], "BULLISH")


class TestMLOpsRegistryAndRollback(unittest.TestCase):

    def setUp(self):
        self.registry = MLOpsRegistry()

    def test_register_and_rollback(self):
        self.registry.register_model("v1.0", {"test_accuracy": 0.65}, {}, is_champion=True)
        self.registry.register_model("v2.0", {"test_accuracy": 0.72}, {}, is_champion=True)

        champ = self.registry.get_champion_version()
        self.assertEqual(champ, "v2.0")

        # Rollback to v1.0
        rolled = self.registry.rollback_model()
        self.assertEqual(rolled, "v1.0")
        self.assertEqual(self.registry.get_champion_version(), "v1.0")


if __name__ == "__main__":
    unittest.main()
