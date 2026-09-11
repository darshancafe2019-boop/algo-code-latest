"""
QUANT.OS Application Configuration
===================================
Centralized configuration management with environment-specific overrides.
"""

import os
from pathlib import Path


class Config:
    """Base application configuration."""
    PROJECT_ROOT = Path(__file__).resolve().parent.parent
    SECRET_KEY = os.getenv("SECRET_KEY", "quantos-super-secret-production-key-change-in-prod")
    ENV = os.getenv("ENV", "development")
    DEBUG = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")
    TESTING = False
    
    # Server ports
    PORT = int(os.getenv("PORT", os.getenv("BACKEND_PORT", "5050")))
    ALT_PORT = 5000 if PORT == 5050 else 5050
    
    # JSON Settings
    JSON_SORT_KEYS = False
    JSONIFY_PRETTYPRINT_REGULAR = False
    
    # Database Settings
    DB_PATH = os.getenv("DB_PATH", str(PROJECT_ROOT / "data" / "quantos.db"))
    
    # Rate Limiting
    RATELIMIT_ENABLED = os.getenv("RATELIMIT_ENABLED", "true").lower() in ("true", "1")
    RATELIMIT_DEFAULT = os.getenv("RATELIMIT_DEFAULT", "200 per minute")
    
    # WebSocket / Gateway Settings
    GATEWAY_URL = os.getenv("MARKET_DATA_GATEWAY_URL", "http://127.0.0.1:5051")
    
    # Security Settings
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() in ("true", "1")
    SESSION_COOKIE_SAMESITE = "Lax"
    PERMANENT_SESSION_LIFETIME = 86400  # 24 hours


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True


class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    DEBUG = False
    DB_PATH = ":memory:"


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    SESSION_COOKIE_SECURE = True


config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}
