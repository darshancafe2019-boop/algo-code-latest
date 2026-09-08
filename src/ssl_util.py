"""
Quant.OS Universal SSL Context Helper
=====================================
Ensures cross-platform HTTPS and WSS connections use valid CA certificates (via certifi)
to prevent SSLCertVerificationError on macOS/Linux/Windows.
"""
from __future__ import annotations

import ssl
from typing import Optional


def get_ssl_context() -> ssl.SSLContext:
    """
    Returns an SSLContext configured with certifi CA bundle for verified TLS connections.
    Falls back gracefully to default or unverified contexts if CA certificates cannot be loaded.
    """
    try:
        import certifi
        ca_file = certifi.where()
        return ssl.create_default_context(cafile=ca_file)
    except Exception:
        pass

    try:
        return ssl.create_default_context()
    except Exception:
        return ssl._create_unverified_context()
