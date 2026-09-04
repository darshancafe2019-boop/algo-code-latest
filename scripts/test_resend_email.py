#!/usr/bin/env python3
"""
Quant.OS — Authoritative Resend Email Verification Script
Sends a single test message to ashishparadkar1999@gmail.com to verify provider acceptance.
Never outputs or leaks API keys.
"""

import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src import config

def test_email():
    target_email = os.getenv("AUTH_ADMIN_EMAIL", "ashishparadkar1999@gmail.com").strip()
    api_key = (os.getenv("RESEND_API_KEY") or config.RESEND_API_KEY or "").strip()
    sender = (os.getenv("AUTH_EMAIL_FROM") or config.AUTH_EMAIL_FROM or "onboarding@resend.dev").strip()

    if not api_key:
        print("FAILED")
        print("provider_status=CONFIG_ERROR")
        print("provider_error=RESEND_API_KEY is not configured in environment")
        sys.exit(1)

    try:
        import resend
        resend.api_key = api_key

        params = {
            "from": sender,
            "to": [target_email],
            "subject": "Alpha Algo Email Test",
            "text": "Your Alpha Algo Terminal email service is working.",
            "html": """<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: monospace; background-color: #060913; color: #f1f5f9; padding: 24px;">
  <div style="max-width: 500px; margin: 0 auto; background: #0b132b; border: 1px solid #1e293b; padding: 24px; border-radius: 12px;">
    <div style="color: #00f0ff; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">Alpha Algo Terminal</div>
    <h2 style="color: #00e676; margin-top: 8px;">Email Service Verification</h2>
    <p style="color: #94a3b8; font-size: 13px;">Your Alpha Algo Terminal email service is working and connected to Resend.</p>
    <p style="color: #64748b; font-size: 11px; margin-top: 16px; border-top: 1px solid #1e293b; padding-top: 8px;">Quant.OS Transactional Mail Subsystem</p>
  </div>
</body>
</html>"""
        }

        resp = resend.Emails.send(params)
        msg_id = resp.get("id") if isinstance(resp, dict) else getattr(resp, "id", "unknown_id")
        print("SUCCESS")
        print(f"message_id={msg_id}")
        sys.exit(0)

    except Exception as exc:
        err_msg = str(exc)
        # Safe error sanitizer (remove any potential sensitive data)
        safe_err = err_msg.replace(api_key, "[REDACTED]") if api_key else err_msg
        print("FAILED")
        print("provider_status=PROVIDER_ERROR")
        print(f"provider_error={safe_err}")
        sys.exit(1)

if __name__ == "__main__":
    test_email()
