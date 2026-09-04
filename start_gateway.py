#!/usr/bin/env python3
"""
Market Data Gateway Launcher
==============================
Start the Quant.OS Market Data Gateway as a standalone process.

Usage:
    .venv/bin/python start_gateway.py [--port 5051] [--log-level INFO]

The gateway should be started before the Flask backend and Next.js frontend.
Add to your system startup sequence BEFORE dashboard.py.
"""
import argparse
import asyncio
import logging
import os
import sys

# Ensure project root is on the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()


def parse_args():
    p = argparse.ArgumentParser(description="Quant.OS Market Data Gateway")
    default_port = int(os.environ.get("MARKET_GATEWAY_PORT", "5051"))
    p.add_argument("--port", type=int, default=default_port)
    p.add_argument("--log-level", default="INFO", choices=["DEBUG", "INFO", "WARNING", "ERROR"])
    return p.parse_args()


def main():
    args = parse_args()
    os.environ["PORT"] = str(args.port)
    os.environ["MARKET_GATEWAY_PORT"] = str(args.port)

    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )
    logger = logging.getLogger("MDGateway.Launcher")
    logger.info("Starting Market Data Gateway on port %d", args.port)

    from market_data_gateway.gateway import main as gateway_main
    try:
        asyncio.run(gateway_main())
    except KeyboardInterrupt:
        logger.info("Gateway stopped by user")
    except Exception as e:
        logger.error("Gateway encountered fatal exception: %s", e, exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
