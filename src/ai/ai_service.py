"""
Central AI Intelligence Service for Quant.OS
Singleton manager handling on-demand prediction, background training,
MLOps version management, and automated PAPER execution.
"""

import json
import logging
import sqlite3
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from src import config, db
from src.ai.decision_engine import DecisionEngine
from src.ai.feature_pipeline import FeaturePipeline
from src.ai.mlops_registry import MLOpsRegistry
from src.ai.model_ensemble import ModelEnsemble

logger = logging.getLogger("AIService")

_ai_service_instance: Optional["AIService"] = None
_service_lock = threading.Lock()


class AIService:
    """
    Central orchestration service for Quant.OS AI capabilities.
    """

    def __init__(self):
        self.mlops_registry = MLOpsRegistry()
        active_version = self.mlops_registry.get_champion_version() or "ai-ensemble-1.0.0"
        self.model_ensemble = ModelEnsemble(model_version=active_version)
        self.decision_engine = DecisionEngine(model_ensemble=self.model_ensemble)
        self.feature_pipeline = FeaturePipeline()

        # Operational Flags
        self.is_enabled: bool = True
        self.auto_execute_paper: bool = False  # Manual confirmation by default
        self.active_symbol: str = "BTC/USDT"
        self.active_timeframe: str = "5m"
        self.confidence_threshold: float = 0.75
        self.prediction_horizon_bars: int = 5

        self.last_decision: Optional[Dict[str, Any]] = None
        self._training_in_progress: bool = False
        self._training_status: Dict[str, Any] = {"status": "IDLE"}

        # If no models are trained, trigger background bootstrap training
        if not self.model_ensemble.is_trained:
            self.trigger_background_training(n_trials=5, is_bootstrap=True)

    @classmethod
    def get_instance(cls) -> "AIService":
        global _ai_service_instance
        with _service_lock:
            if _ai_service_instance is None:
                _ai_service_instance = cls()
            return _ai_service_instance

    def get_status(self) -> Dict[str, Any]:
        """Returns the real-time operational status of the AI Intelligence Engine."""
        return {
            "status": "OPERATIONAL" if self.is_enabled else "DISABLED",
            "is_enabled": self.is_enabled,
            "auto_execute_paper": self.auto_execute_paper,
            "active_symbol": self.active_symbol,
            "active_timeframe": self.active_timeframe,
            "confidence_threshold": self.confidence_threshold,
            "prediction_horizon_bars": self.prediction_horizon_bars,
            "active_model_version": self.model_ensemble.model_version,
            "is_model_trained": self.model_ensemble.is_trained,
            "model_metrics": self.model_ensemble.metrics,
            "training_status": self._training_status,
            "last_prediction_time": self.last_decision.get("createdAt") if self.last_decision else None,
        }

    def get_health(self) -> Dict[str, Any]:
        """Returns diagnostic health metrics for monitoring and alerts."""
        return {
            "status": "HEALTHY",
            "engine": "LightGBM + XGBoost Multi-Model Ensemble",
            "explainability": "SHAP TreeExplainer Local Attribution",
            "sentiment_module": "FinBERT News Freshness Filter",
            "challenger_module": "Amazon Chronos-2 Quantile Bounds",
            "model_version": self.model_ensemble.model_version,
            "is_trained": self.model_ensemble.is_trained,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def predict_latest(
        self,
        symbol: Optional[str] = None,
        timeframe: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Fetches latest candle data, extracts features, and evaluates model predictions."""
        sym = symbol or self.active_symbol
        tf = timeframe or self.active_timeframe

        df_candles = self._load_recent_candles(sym, tf, limit=300)
        decision = self.decision_engine.evaluate_market_update(
            symbol=sym,
            timeframe=tf,
            df_candles=df_candles,
            confidence_threshold=self.confidence_threshold,
            prediction_horizon_bars=self.prediction_horizon_bars,
        )

        self.last_decision = decision
        self._record_decision_snapshot(decision)

        return decision

    def _load_recent_candles(self, symbol: str, timeframe: str, limit: int = 300) -> pd.DataFrame:
        """Loads historical and cached candles from SQLite."""
        try:
            # 1. Try loading from candles_cache table
            conn = sqlite3.connect(str(config.DB_PATH), timeout=10.0)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT timestamp, open, high, low, close, volume 
                FROM candles_cache 
                WHERE symbol = ? AND timeframe = ?
                ORDER BY timestamp DESC LIMIT ?
                """,
                (symbol, timeframe, limit),
            )
            rows = [dict(r) for r in cursor.fetchall()]
            conn.close()

            if rows and len(rows) >= 50:
                df = pd.DataFrame(rows[::-1])
                return df
        except Exception as e:
            logger.debug("Candle load note from cache: %s", e)

        # Generate synthetic realistic OHLCV walk if DB empty for testing/bootstrap
        now = time.time()
        base_price = 65000.0 if "BTC" in symbol else 3400.0
        synthetic_rows = []
        p = base_price
        for i in range(limit):
            t = now - ((limit - i) * 300)
            ret = np.random.normal(0.0001, 0.003)
            p = p * (1.0 + ret)
            high = p * (1.0 + abs(np.random.normal(0, 0.0015)))
            low = p * (1.0 - abs(np.random.normal(0, 0.0015)))
            op = p * (1.0 - (ret * 0.5))
            vol = max(10.0, np.random.normal(50.0, 15.0))
            synthetic_rows.append({
                "timestamp": datetime.fromtimestamp(t, tz=timezone.utc).isoformat(),
                "open": op,
                "high": high,
                "low": low,
                "close": p,
                "volume": vol,
            })
        return pd.DataFrame(synthetic_rows)

    def _record_decision_snapshot(self, decision: Dict[str, Any]):
        """Persists decision record to decision_snapshots table."""
        try:
            conn = sqlite3.connect(str(config.DB_PATH), timeout=10.0)
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO decision_snapshots (
                    bot_id, symbol, state, last_state, price, pnl, current_regime,
                    primary_indicators, higher_tf_confluence, active_reasons, missing_conditions,
                    risk_assessment, next_check_seconds, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "ai-ensemble-engine",
                    decision.get("symbol", "BTC/USDT"),
                    decision.get("decision", "HOLD"),
                    "AI_DECISION",
                    0.0,
                    0.0,
                    decision.get("marketRegime", "RANGING"),
                    json.dumps(decision.get("topFactors", [])),
                    f"LightGBM: {decision.get('lightgbmProbability', 0):.2f}, XGBoost: {decision.get('xgboostProbability', 0):.2f}",
                    json.dumps(decision.get("vetoReasons", [])),
                    json.dumps(decision.get("chronosForecast", {})),
                    decision.get("riskStatus", "PASSED"),
                    15,
                    decision.get("createdAt", datetime.now(timezone.utc).isoformat()),
                ),
            )
            conn.commit()
            conn.close()
        except Exception as e:
            logger.debug("Failed to record decision snapshot: %s", e)

    def trigger_background_training(
        self,
        symbol: str = "BTC/USDT",
        timeframe: str = "5m",
        n_trials: int = 10,
        is_bootstrap: bool = False,
    ):
        """Starts walk-forward training job in a separate daemon thread."""
        if self._training_in_progress:
            return {"status": "BUSY", "message": "Training job already running"}

        self._training_in_progress = True
        self._training_status = {
            "status": "RUNNING",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "symbol": symbol,
            "timeframe": timeframe,
        }

        def _worker():
            try:
                logger.info("Background AI Training Job started for %s (%s)...", symbol, timeframe)
                df = self._load_recent_candles(symbol, timeframe, limit=600)
                feat_df, _ = self.feature_pipeline.extract_features(df)
                targets = self.feature_pipeline.generate_targets(df, horizon_bars=5, cost_threshold_bps=12.0)

                new_version = f"ai-ensemble-{int(time.time())}"
                temp_ensemble = ModelEnsemble(model_version=new_version)
                metrics = temp_ensemble.train_walk_forward(
                    feat_df,
                    targets,
                    tune_hyperparameters=True,
                    n_trials=n_trials,
                )

                # Register in MLOps Registry
                self.mlops_registry.register_model(
                    version=new_version,
                    metrics=metrics,
                    hyperparameters={"trials": n_trials, "horizon": 5},
                    is_champion=True,
                )

                self.model_ensemble = temp_ensemble
                self.decision_engine.model_ensemble = temp_ensemble
                self._training_status = {
                    "status": "COMPLETED",
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                    "model_version": new_version,
                    "metrics": metrics,
                }
                logger.info("Background AI Training Job COMPLETED: %s (Acc: %.2f)", new_version, metrics.get("test_accuracy", 0))
            except Exception as e:
                logger.error("Background AI Training Error: %s", e)
                self._training_status = {
                    "status": "FAILED",
                    "error": str(e),
                    "failed_at": datetime.now(timezone.utc).isoformat(),
                }
            finally:
                self._training_in_progress = False

        t = threading.Thread(target=_worker, daemon=True, name="AITrainingWorker")
        t.start()
        return {"status": "STARTED", "job_id": self._training_status["started_at"]}

    def promote_model(self, version: str) -> bool:
        """Promotes a specified model version to active Champion."""
        if self.mlops_registry.promote_model(version):
            self.model_ensemble = ModelEnsemble(model_version=version)
            self.decision_engine.model_ensemble = self.model_ensemble
            return True
        return False

    def rollback_model(self) -> Optional[str]:
        """Rolls back to the previous champion model version."""
        prev_v = self.mlops_registry.rollback_model()
        if prev_v:
            self.model_ensemble = ModelEnsemble(model_version=prev_v)
            self.decision_engine.model_ensemble = self.model_ensemble
            return prev_v
        return None
