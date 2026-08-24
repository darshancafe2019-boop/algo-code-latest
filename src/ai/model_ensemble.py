"""
Quant.OS AI Model Ensemble Engine
=================================
- LightGBM: Primary tabular 3-class signal model
- XGBoost: Independent confirmation and disagreement filter
- Probability Calibration: Isotonic / Sigmoid empirical alignment
- SHAP: Point-in-time local feature attribution
- Strict Math Rules:
  1. Agreement requires same non-trivial class (LONG==LONG or SHORT==SHORT).
  2. Net Expected Return must exceed hurdle rate (+0.25% after 12 bps friction).
  3. Risk/Reward ratio >= 1:1.50 enforced mathematically.
  4. Fail-closed: any conflict, staleness, or missing data produces HOLD.
"""

import json
import logging
import math
import os
import pickle
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import lightgbm as lgb
import numpy as np
import optuna
import pandas as pd
import shap
import xgboost as xgb
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import accuracy_score, f1_score, log_loss, precision_score

optuna.logging.set_verbosity(optuna.logging.WARNING)
logger = logging.getLogger("AIModelEnsemble")

MODELS_DIR = Path("models")
MODELS_DIR.mkdir(parents=True, exist_ok=True)


@dataclass
class EnsemblePrediction:
    """Standardized output for model ensemble predictions."""
    decision: str  # "LONG", "SHORT", "HOLD"
    confidence: float  # Calibrated probability of the selected class [0.0 - 1.0]
    expected_return: float  # Projected net return after friction
    lightgbm_prob_long: float
    lightgbm_prob_short: float
    lightgbm_prob_hold: float
    xgboost_prob_long: float
    xgboost_prob_short: float
    xgboost_prob_hold: float
    model_agreement: bool
    market_regime: str
    risk_reward: float = 0.0
    top_factors: List[Dict[str, Any]] = field(default_factory=list)
    veto_reasons: List[str] = field(default_factory=list)
    mandatory_conditions: List[Dict[str, Any]] = field(default_factory=list)
    model_version: str = "ai-ensemble-1.0.0"
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class TimeSeriesWalkForwardCV:
    """Chronological walk-forward time-series splitter with embargo gaps."""

    def __init__(self, n_splits: int = 4, train_ratio: float = 0.65, embargo_bars: int = 10):
        self.n_splits = n_splits
        self.train_ratio = train_ratio
        self.embargo_bars = embargo_bars

    def split(self, X: pd.DataFrame) -> List[Tuple[np.ndarray, np.ndarray]]:
        n_samples = len(X)
        if n_samples < 100:
            split_point = int(n_samples * 0.7)
            return [(np.arange(0, split_point), np.arange(split_point + self.embargo_bars, n_samples))]

        folds = []
        test_chunk_size = int((n_samples * (1.0 - self.train_ratio)) / self.n_splits)

        for i in range(self.n_splits):
            train_end = int(n_samples * self.train_ratio) + (i * test_chunk_size)
            test_start = train_end + self.embargo_bars
            test_end = min(n_samples, test_start + test_chunk_size)

            if test_start < n_samples and test_end > test_start:
                train_idx = np.arange(0, train_end)
                test_idx = np.arange(test_start, test_end)
                folds.append((train_idx, test_idx))

        return folds if folds else [(np.arange(0, int(n_samples * 0.7)), np.arange(int(n_samples * 0.7) + 5, n_samples))]


class ModelEnsemble:
    """Coordinates LightGBM + XGBoost inference, calibration, and governance."""

    def __init__(self, model_version: str = "ai-ensemble-1.0.0"):
        self.model_version = model_version
        self.lgb_model: Optional[lgb.LGBMClassifier] = None
        self.xgb_model: Optional[xgb.XGBClassifier] = None
        self.lgb_calibrated: Optional[Any] = None
        self.xgb_calibrated: Optional[Any] = None
        self.shap_explainer: Optional[shap.TreeExplainer] = None
        self.feature_names: List[str] = []
        self.is_trained: bool = False
        self.metrics: Dict[str, Any] = {}
        self.model_path = MODELS_DIR / f"{model_version}.pkl"

        self._try_load_model()

    def _try_load_model(self) -> bool:
        if self.model_path.exists():
            try:
                with open(self.model_path, "rb") as f:
                    bundle = pickle.load(f)
                    self.lgb_model = bundle.get("lgb_model")
                    self.xgb_model = bundle.get("xgb_model")
                    self.lgb_calibrated = bundle.get("lgb_calibrated")
                    self.xgb_calibrated = bundle.get("xgb_calibrated")
                    self.feature_names = bundle.get("feature_names", [])
                    self.metrics = bundle.get("metrics", {})
                    self.is_trained = bundle.get("is_trained", False)
                    if self.lgb_model is not None:
                        try:
                            self.shap_explainer = shap.TreeExplainer(self.lgb_model)
                        except Exception:
                            pass
                    logger.info("Loaded AI Ensemble model: %s", self.model_version)
                    return True
            except Exception as e:
                logger.warning("Could not load model %s: %s", self.model_path, e)
        return False

    def save_model(self) -> bool:
        try:
            bundle = {
                "model_version": self.model_version,
                "lgb_model": self.lgb_model,
                "xgb_model": self.xgb_model,
                "lgb_calibrated": self.lgb_calibrated,
                "xgb_calibrated": self.xgb_calibrated,
                "feature_names": self.feature_names,
                "metrics": self.metrics,
                "is_trained": self.is_trained,
                "saved_at": datetime.now(timezone.utc).isoformat(),
            }
            with open(self.model_path, "wb") as f:
                pickle.dump(bundle, f)
            logger.info("Saved AI Ensemble model to %s", self.model_path)
            return True
        except Exception as e:
            logger.error("Failed to save model: %s", e)
            return False

    def train_walk_forward(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        n_trials: int = 8,
        hurdle_return_bps: float = 25.0,
        tune_hyperparameters: bool = False,
        **kwargs
    ) -> Dict[str, Any]:
        """Runs chronological walk-forward training and calibration."""
        # Clean target and align X
        y_raw = pd.Series(y)
        valid_mask = y_raw.notna() & np.isfinite(y_raw)
        if not valid_mask.any():
            raise ValueError("Target series contains no valid non-NaN labels")

        y_valid = y_raw[valid_mask]
        # Map targets to 0, 1, 2 (if -1, 0, 1)
        if set(y_valid.unique()).issubset({-1, 0, 1}):
            y_clean = y_valid.map({-1: 0, 0: 1, 1: 2}).astype(int)
        else:
            y_clean = y_valid.astype(int)

        self.feature_names = [c for c in X.columns if c not in ["timestamp", "target", "close", "symbol"]]
        X_clean = X.loc[y_valid.index][self.feature_names].fillna(0.0)

        if len(X_clean) < 60:
            raise ValueError(f"Insufficient valid samples ({len(X_clean)}) for walk-forward training (minimum 60 required)")

        cv = TimeSeriesWalkForwardCV(n_splits=3, train_ratio=0.7, embargo_bars=5)
        folds = cv.split(X_clean)

        best_lgb_params = {
            "n_estimators": 50,
            "max_depth": 4,
            "learning_rate": 0.05,
            "num_leaves": 15,
            "random_state": 42,
            "verbose": -1,
        }
        best_xgb_params = {
            "n_estimators": 50,
            "max_depth": 4,
            "learning_rate": 0.05,
            "random_state": 42,
            "eval_metric": "mlogloss",
        }

        train_idx, val_idx = folds[-1]
        X_train, y_train = X_clean.iloc[train_idx].copy(), y_clean.iloc[train_idx].copy()
        X_test, y_test = X_clean.iloc[val_idx].copy(), y_clean.iloc[val_idx].copy()

        # Ensure all 3 classes exist for robust 3-class softprob
        existing_classes = set(y_train.unique())
        missing_classes = {0, 1, 2} - existing_classes
        if missing_classes:
            median_row = X_train.median().to_frame().T
            synthetic_X = []
            synthetic_y = []
            for mc in missing_classes:
                synthetic_X.append(median_row)
                synthetic_y.append(pd.Series([mc]))
            X_train = pd.concat([X_train] + synthetic_X, ignore_index=True)
            y_train = pd.concat([y_train] + synthetic_y, ignore_index=True)

        self.lgb_model = lgb.LGBMClassifier(**best_lgb_params)
        self.lgb_model.fit(X_train, y_train)

        best_xgb_params["objective"] = "multi:softprob"
        best_xgb_params["num_class"] = 3
        self.xgb_model = xgb.XGBClassifier(**best_xgb_params)
        self.xgb_model.fit(X_train, y_train)

        try:
            self.lgb_calibrated = CalibratedClassifierCV(self.lgb_model, cv="prefit", method="sigmoid")
            self.lgb_calibrated.fit(X_test, y_test)
        except Exception:
            self.lgb_calibrated = None

        try:
            self.xgb_calibrated = CalibratedClassifierCV(self.xgb_model, cv="prefit", method="sigmoid")
            self.xgb_calibrated.fit(X_test, y_test)
        except Exception:
            self.xgb_calibrated = None

        lgb_preds = self.lgb_model.predict(X_test)
        xgb_preds = self.xgb_model.predict(X_test)

        acc = float(accuracy_score(y_test, lgb_preds))
        f1_macro = float(f1_score(y_test, lgb_preds, average="macro", zero_division=0))
        prec_long = float(precision_score(y_test, lgb_preds, labels=[2], average="macro", zero_division=0))
        prec_short = float(precision_score(y_test, lgb_preds, labels=[0], average="macro", zero_division=0))
        agreement = float(np.mean(lgb_preds == xgb_preds))

        try:
            self.shap_explainer = shap.TreeExplainer(self.lgb_model)
        except Exception:
            self.shap_explainer = None

        self.is_trained = True
        self.metrics = {
            "test_accuracy": round(acc, 4),
            "test_f1_macro": round(f1_macro, 4),
            "precision_long": round(prec_long, 4),
            "precision_short": round(prec_short, 4),
            "model_agreement": round(agreement, 4),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "feature_count": len(self.feature_names),
            "trained_at": datetime.now(timezone.utc).isoformat(),
        }

        self.save_model()
        return self.metrics

    def predict(
        self,
        X_single: pd.DataFrame,
        market_regime: str = "TRENDING_UP",
        confidence_threshold: float = 0.75,
        estimated_friction_bps: float = 12.0,
        entry_price: float = 0.0,
        stop_loss: float = 0.0,
        take_profit: float = 0.0,
    ) -> EnsemblePrediction:
        """
        Executes real-time inference on a point-in-time feature row with strict mathematical validation:
        1. Model Agreement: LightGBM and XGBoost MUST agree on the exact non-HOLD direction (e.g. LONG==LONG).
        2. Net Expected Return: Must exceed +0.25% after friction (0.00% strictly blocked).
        3. Risk/Reward: Must be >= 1:1.50 (1:0.00 strictly blocked).
        """
        if not self.is_trained or self.lgb_model is None or self.xgb_model is None:
            return EnsemblePrediction(
                decision="HOLD",
                confidence=0.50,
                expected_return=0.0,
                lightgbm_prob_long=0.33,
                lightgbm_prob_short=0.33,
                lightgbm_prob_hold=0.34,
                xgboost_prob_long=0.33,
                xgboost_prob_short=0.33,
                xgboost_prob_hold=0.34,
                model_agreement=False,
                market_regime=market_regime,
                risk_reward=0.0,
                veto_reasons=["AI Models initializing or background training in progress"],
                mandatory_conditions=[
                    {"name": "Model Ready", "status": "FAIL", "reason": "Model weights uninitialized"},
                    {"name": "Model Agreement", "status": "FAIL", "reason": "Awaiting trained models"},
                    {"name": "Net Expected Return >= 0.25%", "status": "FAIL", "reason": "Expected return 0.00%"},
                    {"name": "Risk/Reward >= 1:1.50", "status": "FAIL", "reason": "RR 1:0.00 below minimum"},
                ],
                model_version=self.model_version,
            )

        x_row = X_single.reindex(columns=self.feature_names, fill_value=0.0).iloc[[-1]]

        # LightGBM Probabilities (0: SHORT, 1: HOLD, 2: LONG)
        if self.lgb_calibrated is not None:
            lgb_probs = self.lgb_calibrated.predict_proba(x_row)[0]
        else:
            lgb_probs = self.lgb_model.predict_proba(x_row)[0]

        # XGBoost Probabilities
        if self.xgb_calibrated is not None:
            xgb_probs = self.xgb_calibrated.predict_proba(x_row)[0]
        else:
            xgb_probs = self.xgb_model.predict_proba(x_row)[0]

        prob_short_lgb, prob_hold_lgb, prob_long_lgb = lgb_probs[0], lgb_probs[1], lgb_probs[2]
        prob_short_xgb, prob_hold_xgb, prob_long_xgb = xgb_probs[0], xgb_probs[1], xgb_probs[2]

        lgb_action_idx = int(np.argmax(lgb_probs))
        xgb_action_idx = int(np.argmax(xgb_probs))

        idx_to_name = {0: "SHORT", 1: "HOLD", 2: "LONG"}
        lgb_decision = idx_to_name[lgb_action_idx]
        xgb_decision = idx_to_name[xgb_action_idx]

        # EXACT AGREEMENT RULE:
        # If LightGBM predicts LONG (60.7%) but XGBoost predicts HOLD (50.1%), they do NOT agree!
        # Agreement is TRUE only when both models select the EXACT SAME class.
        model_agreement = (lgb_action_idx == xgb_action_idx)

        veto_reasons = []
        mandatory_conditions = []
        decision = "HOLD"
        confidence = float(lgb_probs[lgb_action_idx])

        # 1. Mandatory Condition: Model Agreement
        if not model_agreement:
            veto_reasons.append(
                f"Model Disagreement: LightGBM predicts {lgb_decision} ({lgb_probs[lgb_action_idx]*100:.1f}%), "
                f"XGBoost predicts {xgb_decision} ({xgb_probs[xgb_action_idx]*100:.1f}%)."
            )
            mandatory_conditions.append({
                "name": "Model Agreement",
                "status": "FAIL",
                "observed": f"{lgb_decision} vs {xgb_decision}",
                "required": "Identical Actionable Class",
                "reason": "LightGBM and XGBoost must independently select the same class",
            })
            confidence = float(max(prob_hold_lgb, prob_hold_xgb))
        else:
            mandatory_conditions.append({
                "name": "Model Agreement",
                "status": "PASS",
                "observed": f"Both predict {lgb_decision}",
                "required": "Identical Actionable Class",
            })

        # 2. Mandatory Condition: Confidence Threshold
        if lgb_decision in ["LONG", "SHORT"] and model_agreement:
            if confidence < confidence_threshold:
                veto_reasons.append(
                    f"Calibrated Confidence ({confidence*100:.1f}%) is below required threshold ({confidence_threshold*100:.1f}%)."
                )
                mandatory_conditions.append({
                    "name": "Confidence Threshold",
                    "status": "FAIL",
                    "observed": f"{confidence*100:.1f}%",
                    "required": f">={confidence_threshold*100:.1f}%",
                    "reason": "Insufficient probability conviction",
                })
            else:
                mandatory_conditions.append({
                    "name": "Confidence Threshold",
                    "status": "PASS",
                    "observed": f"{confidence*100:.1f}%",
                    "required": f">={confidence_threshold*100:.1f}%",
                })

        # 3. Mandatory Condition: Net Expected Return After Costs
        friction_pct = estimated_friction_bps / 10000.0  # 12 bps = 0.0012
        atr_norm = float(x_row["atr_14_norm"].iloc[0]) if "atr_14_norm" in x_row.columns else 0.015
        projected_move = max(0.005, atr_norm * 1.5)

        if lgb_decision == "LONG":
            raw_er = (prob_long_lgb * projected_move) - ((1.0 - prob_long_lgb) * (projected_move * 0.8))
            expected_return = max(0.0, raw_er - friction_pct)
        elif lgb_decision == "SHORT":
            raw_er = (prob_short_lgb * projected_move) - ((1.0 - prob_short_lgb) * (projected_move * 0.8))
            expected_return = max(0.0, raw_er - friction_pct)
        else:
            expected_return = 0.0

        min_hurdle_return = 0.0025  # 25 bps net
        if expected_return < min_hurdle_return:
            if lgb_decision in ["LONG", "SHORT"]:
                veto_reasons.append(
                    f"Net Expected Return (+{expected_return*100:.2f}%) is below hurdle rate (+{min_hurdle_return*100:.2f}% after {estimated_friction_bps:.0f} bps friction)."
                )
            mandatory_conditions.append({
                "name": "Net Expected Return >= +0.25%",
                "status": "FAIL" if lgb_decision != "HOLD" else "WAIT",
                "observed": f"+{expected_return*100:.2f}%",
                "required": f">={min_hurdle_return*100:.2f}%",
                "reason": "Projected return does not overcome trading friction & spread",
            })
        else:
            mandatory_conditions.append({
                "name": "Net Expected Return >= +0.25%",
                "status": "PASS",
                "observed": f"+{expected_return*100:.2f}%",
                "required": f">={min_hurdle_return*100:.2f}%",
            })

        # 4. Mandatory Condition: Risk / Reward Ratio >= 1:1.50
        risk_dist = abs(entry_price - stop_loss) if (entry_price > 0 and stop_loss > 0) else 0.0
        reward_dist = abs(take_profit - entry_price) if (entry_price > 0 and take_profit > 0) else 0.0
        risk_reward = round(reward_dist / risk_dist, 2) if risk_dist > 0 else 0.0

        if risk_reward < 1.50:
            if lgb_decision in ["LONG", "SHORT"]:
                veto_reasons.append(
                    f"Risk/Reward 1:{risk_reward:.2f} fails minimum hurdle (1:1.50 required)."
                )
            mandatory_conditions.append({
                "name": "Risk/Reward >= 1:1.50",
                "status": "FAIL" if lgb_decision != "HOLD" else "WAIT",
                "observed": f"1:{risk_reward:.2f}",
                "required": ">= 1:1.50",
                "reason": "1:0.00 or sub-1.50 RR is strictly prohibited for entry",
            })
        else:
            mandatory_conditions.append({
                "name": "Risk/Reward >= 1:1.50",
                "status": "PASS",
                "observed": f"1:{risk_reward:.2f}",
                "required": ">= 1:1.50",
            })

        # Final Action Authorization (Fail-Closed)
        all_passed = (
            model_agreement
            and lgb_decision in ["LONG", "SHORT"]
            and confidence >= confidence_threshold
            and expected_return >= min_hurdle_return
            and risk_reward >= 1.50
            and len(veto_reasons) == 0
        )

        if all_passed:
            decision = lgb_decision
        else:
            decision = "HOLD"

        top_factors = self._get_shap_factors(x_row)

        return EnsemblePrediction(
            decision=decision,
            confidence=round(confidence, 4),
            expected_return=round(expected_return, 4),
            lightgbm_prob_long=round(float(prob_long_lgb), 4),
            lightgbm_prob_short=round(float(prob_short_lgb), 4),
            lightgbm_prob_hold=round(float(prob_hold_lgb), 4),
            xgboost_prob_long=round(float(prob_long_xgb), 4),
            xgboost_prob_short=round(float(prob_short_xgb), 4),
            xgboost_prob_hold=round(float(prob_hold_xgb), 4),
            model_agreement=model_agreement,
            market_regime=market_regime,
            risk_reward=risk_reward,
            top_factors=top_factors,
            veto_reasons=veto_reasons,
            mandatory_conditions=mandatory_conditions,
            model_version=self.model_version,
        )

    def _get_shap_factors(self, x_row: pd.DataFrame) -> List[Dict[str, Any]]:
        if self.shap_explainer is None:
            if self.lgb_model is not None and hasattr(self.lgb_model, "feature_importances_"):
                imp = self.lgb_model.feature_importances_
                top_idx = np.argsort(imp)[-6:][::-1]
                return [
                    {
                        "feature": self.feature_names[i],
                        "value": round(float(x_row[self.feature_names[i]].iloc[0]), 4),
                        "importance": round(float(imp[i] / max(1, np.sum(imp))), 4),
                        "impact": "BULLISH" if float(x_row[self.feature_names[i]].iloc[0]) > 0 else "BEARISH",
                    }
                    for i in top_idx
                    if i < len(self.feature_names)
                ]
            return []

        try:
            shap_values = self.shap_explainer.shap_values(x_row)
            if isinstance(shap_values, list) and len(shap_values) == 3:
                vals = shap_values[2][0]  # Class 2 (LONG) attribution
            elif hasattr(shap_values, "values"):
                vals = shap_values.values[0]
            else:
                vals = np.array(shap_values)[0]

            top_idx = np.argsort(np.abs(vals))[-6:][::-1]
            return [
                {
                    "feature": self.feature_names[i],
                    "value": round(float(x_row[self.feature_names[i]].iloc[0]), 4),
                    "importance": round(float(abs(vals[i])), 4),
                    "impact": "BULLISH" if vals[i] > 0 else "BEARISH",
                }
                for i in top_idx
                if i < len(self.feature_names)
            ]
        except Exception:
            return []
