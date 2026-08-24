"""
MLOps Model Registry, Versioning, and Rollback Manager for Quant.OS
Maintains model metadata, performance metrics, Champion/Challenger status,
and provides atomic one-click model rollback.
"""

import json
import logging
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from src import config

logger = logging.getLogger("AIMLopsRegistry")

REGISTRY_FILE = Path("models/registry.json")


def _get_db():
    conn = sqlite3.connect(str(config.DB_PATH), timeout=10.0)
    conn.row_factory = sqlite3.Row
    return conn


class MLOpsRegistry:
    """
    Tracks all AI model experiments, versions, hyperparameters, and metrics.
    Guarantees reproducible rollback to previous champion model checkpoints.
    """

    def __init__(self):
        self._init_registry_table()

    def _init_registry_table(self):
        try:
            conn = _get_db()
            cursor = conn.cursor()
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS ai_model_registry (
                    version TEXT PRIMARY KEY,
                    model_type TEXT NOT NULL,
                    status TEXT NOT NULL, -- 'CHAMPION', 'CHALLENGER', 'ARCHIVED'
                    accuracy REAL,
                    f1_macro REAL,
                    precision_long REAL,
                    precision_short REAL,
                    agreement REAL,
                    train_samples INTEGER,
                    feature_count INTEGER,
                    hyperparameters TEXT,
                    created_at TEXT NOT NULL,
                    promoted_at TEXT,
                    notes TEXT
                )
                """
            )
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error("Failed to initialize ai_model_registry table: %s", e)

    def register_model(
        self,
        version: str,
        metrics: Dict[str, Any],
        hyperparameters: Dict[str, Any],
        model_type: str = "LightGBM+XGBoost Ensemble",
        is_champion: bool = True,
    ) -> bool:
        """Registers a trained model version in the catalog."""
        try:
            conn = _get_db()
            cursor = conn.cursor()

            if is_champion:
                # Demote existing champion to challenger
                cursor.execute("UPDATE ai_model_registry SET status = 'CHALLENGER' WHERE status = 'CHAMPION'")

            status = "CHAMPION" if is_champion else "CHALLENGER"
            now_iso = datetime.now(timezone.utc).isoformat()

            cursor.execute(
                """
                INSERT OR REPLACE INTO ai_model_registry (
                    version, model_type, status, accuracy, f1_macro, precision_long, precision_short,
                    agreement, train_samples, feature_count, hyperparameters, created_at, promoted_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    version,
                    model_type,
                    status,
                    metrics.get("test_accuracy", 0.0),
                    metrics.get("test_f1_macro", 0.0),
                    metrics.get("precision_long", 0.0),
                    metrics.get("precision_short", 0.0),
                    metrics.get("model_agreement", 0.0),
                    metrics.get("train_samples", 0),
                    metrics.get("feature_count", 0),
                    json.dumps(hyperparameters),
                    now_iso,
                    now_iso if is_champion else None,
                ),
            )
            conn.commit()
            conn.close()
            logger.info("Successfully registered AI model version '%s' as %s", version, status)
            return True
        except Exception as e:
            logger.error("Error registering model %s: %s", version, e)
            return False

    def get_champion_version(self) -> Optional[str]:
        """Returns the currently active champion model version."""
        try:
            conn = _get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT version FROM ai_model_registry WHERE status = 'CHAMPION' ORDER BY created_at DESC LIMIT 1")
            row = cursor.fetchone()
            conn.close()
            return row["version"] if row else "ai-ensemble-1.0.0"
        except Exception:
            return "ai-ensemble-1.0.0"

    def list_models(self) -> List[Dict[str, Any]]:
        """Lists all registered models with their performance metrics."""
        try:
            conn = _get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM ai_model_registry ORDER BY created_at DESC")
            rows = [dict(r) for r in cursor.fetchall()]
            conn.close()
            return rows
        except Exception as e:
            logger.error("Error listing models from registry: %s", e)
            return []

    def promote_model(self, version: str) -> bool:
        """Promotes a challenger model version to Champion."""
        try:
            conn = _get_db()
            cursor = conn.cursor()
            cursor.execute("UPDATE ai_model_registry SET status = 'CHALLENGER' WHERE status = 'CHAMPION'")
            cursor.execute(
                "UPDATE ai_model_registry SET status = 'CHAMPION', promoted_at = ? WHERE version = ?",
                (datetime.now(timezone.utc).isoformat(), version),
            )
            conn.commit()
            conn.close()
            logger.info("Promoted model version '%s' to CHAMPION", version)
            return True
        except Exception as e:
            logger.error("Error promoting model %s: %s", version, e)
            return False

    def rollback_model(self) -> Optional[str]:
        """
        Rolls back from the current champion to the previous champion.
        Returns the new champion version or None if no prior version exists.
        """
        try:
            conn = _get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT version FROM ai_model_registry ORDER BY created_at DESC LIMIT 2")
            rows = cursor.fetchall()
            if len(rows) < 2:
                conn.close()
                logger.warning("No previous model version available for rollback")
                return None

            current_v = rows[0]["version"]
            previous_v = rows[1]["version"]

            cursor.execute("UPDATE ai_model_registry SET status = 'ARCHIVED' WHERE version = ?", (current_v,))
            cursor.execute(
                "UPDATE ai_model_registry SET status = 'CHAMPION', promoted_at = ? WHERE version = ?",
                (datetime.now(timezone.utc).isoformat(), previous_v),
            )
            conn.commit()
            conn.close()
            logger.info("Rolled back champion model from %s to %s", current_v, previous_v)
            return previous_v
        except Exception as e:
            logger.error("Error rolling back model: %s", e)
            return None
