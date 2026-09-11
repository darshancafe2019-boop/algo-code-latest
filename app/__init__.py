"""
QUANT.OS Application Factory
=============================
Production-grade Flask application factory initializing extensions,
middleware, error handlers, and modular blueprints.
"""

import os
import logging
from flask import Flask, jsonify, render_template, request, send_from_directory
from app.config import config_by_name, Config
from app.errors import register_error_handlers
from app.middleware import setup_middleware

from app.blueprints.health import health_bp
from app.blueprints.market_data import market_data_bp
from app.blueprints.options import options_bp
from app.blueprints.risk import risk_bp
from app.blueprints.orders import orders_bp

logger = logging.getLogger("QuantOSApp")


def create_app(config_name: str = None) -> Flask:
    """
    Creates and configures a new Flask application instance.
    """
    if config_name is None:
        config_name = os.getenv("ENV", "development").lower()

    config_class = config_by_name.get(config_name, Config)
    template_folder = str(Config.PROJECT_ROOT / "templates")
    static_folder = str(Config.PROJECT_ROOT / "static")

    app = Flask(
        "QUANT.OS",
        template_folder=template_folder,
        static_folder=static_folder
    )
    app.config.from_object(config_class)

    # 1. Setup Request Lifecycle Middleware & Security Headers
    setup_middleware(app)

    # 2. Register Authoritative Standardized Error Handlers
    register_error_handlers(app)

    # 3. Register Modular Blueprints
    app.register_blueprint(health_bp)
    app.register_blueprint(market_data_bp)
    app.register_blueprint(options_bp)
    app.register_blueprint(risk_bp)
    app.register_blueprint(orders_bp)

    logger.info("QUANT.OS Application Factory initialized in [%s] mode.", config_name.upper())
    return app
