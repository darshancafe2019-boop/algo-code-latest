"""
Authoritative Transactional Email Delivery Service.
===================================================
Supports:
- Resend REST API (Production)
- Standard SMTP / STARTTLS (Corporate / On-Premise)
- Local Console & Outbox File Provider (Development / Testing)
- Automatic delivery recording in email_delivery_events table
"""

import json
import logging
import os
import smtplib
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from src import config, db

logger = logging.getLogger("EmailService")


class EmailDeliveryError(Exception):
    """Base exception for email delivery failures."""
    pass

class ProviderUnavailableError(EmailDeliveryError):
    pass

class InvalidApiKeyError(EmailDeliveryError):
    pass

class UnverifiedSenderError(EmailDeliveryError):
    pass

class RateLimitError(EmailDeliveryError):
    pass


class BaseEmailProvider(ABC):
    """Abstract base class for email delivery providers."""

    @abstractmethod
    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str,
        from_email: Optional[str] = None
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """Sends an email and returns (success, error_message, provider_message_id)."""
        pass


class ConsoleLogEmailProvider(BaseEmailProvider):
    """
    Safe local development & test provider.
    Logs email dispatch and appends to data/outbox.log for non-blocking local operation.
    """

    def __init__(self, outbox_file: Optional[Path] = None):
        self.outbox_file = outbox_file or (config.DATA_DIR / "outbox.log")
        self.outbox_file.parent.mkdir(parents=True, exist_ok=True)

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str,
        from_email: Optional[str] = None
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        timestamp = datetime.now(timezone.utc).isoformat()
        sender = from_email or config.AUTH_EMAIL_FROM or "security@algotrading.local"
        mock_id = f"mock_{uuid.uuid4().hex[:12]}"

        record = {
            "timestamp": timestamp,
            "message_id": mock_id,
            "from": sender,
            "to": to_email,
            "subject": subject,
            "text": text_content,
        }

        try:
            with open(self.outbox_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(record) + "\n")
        except Exception as e:
            logger.warning("Failed appending to outbox log: %s", e)

        logger.info("[OUTBOX DEV EMAIL] To: %s | Subject: %s | ID: %s", to_email, subject, mock_id)
        logger.info("[OUTBOX BODY]:\n%s", text_content)
        return True, None, mock_id


class ResendEmailProvider(BaseEmailProvider):
    """Production provider integrating the Resend REST API."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        if not api_key:
            logger.warning("[RESEND_API_KEY_MISSING] ResendEmailProvider initialized without an API key.")
        sender = config.AUTH_EMAIL_FROM or ""
        if "@" in sender:
            domain = sender.split("@")[1].lower()
            if domain != "resend.dev" and not getattr(config, "IS_POSTGRES", False):
                logger.info("Resend sender domain: %s (ensure DNS records are verified in Resend dashboard)", domain)

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str,
        from_email: Optional[str] = None
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        if not self.api_key:
            logger.error("[RESEND_API_KEY_MISSING] Cannot send email because RESEND_API_KEY is not configured.")
            return False, "RESEND_API_KEY is not configured.", None

        sender = from_email or config.AUTH_EMAIL_FROM or "onboarding@resend.dev"

        # Always record to local outbox log for observability and test inspection
        ConsoleLogEmailProvider().send_email(to_email, subject, html_content, text_content, from_email=sender)

        # In testing mode with sandbox test domains (.test, .invalid, .example), return sandbox success
        if any(to_email.endswith(d) for d in (".test", ".invalid", ".example")):
            mock_id = f"sandbox_{uuid.uuid4().hex[:12]}"
            logger.info("Local test recipient '%s' recorded to outbox log (simulated sandbox delivery)", to_email)
            return True, None, mock_id

        try:
            import resend
            resend.api_key = self.api_key

            params: resend.Emails.SendParams = {
                "from": sender,
                "to": [to_email],
                "subject": subject,
                "html": html_content,
                "text": text_content,
            }
            resp = resend.Emails.send(params)
            msg_id = resp.get("id") if isinstance(resp, dict) else getattr(resp, "id", "sent")
            logger.info("[EMAIL_SENT] Email dispatched successfully via Resend to %s [Message ID: %s]", to_email, msg_id)
            return True, None, str(msg_id)
        except Exception as e:
            err_str = str(e).lower()
            if "api key" in err_str or "unauthorized" in err_str or "401" in err_str:
                logger.error("[RESEND_INVALID_API_KEY] Resend delivery failed: Invalid or unauthorized API key")
            elif "unverified" in err_str or "domain" in err_str or "422" in err_str or "from" in err_str:
                logger.error("[RESEND_DOMAIN_NOT_VERIFIED] Resend delivery failed: Unverified sender domain. In development, use 'onboarding@resend.dev'")
            elif "recipient" in err_str or "restricted" in err_str or "403" in err_str:
                logger.error("[RESEND_RECIPIENT_RESTRICTED] Resend delivery failed: In trial mode, emails can only be sent to the verified account owner.")
            elif "rate" in err_str or "429" in err_str:
                logger.error("[RESEND_RATE_LIMITED] Resend delivery failed: Rate limit exceeded")
            else:
                logger.error("[RESEND_REQUEST_FAILED] Resend API delivery failure: %s (%s)", type(e).__name__, e)
            return False, str(e), None


class SmtpEmailProvider(BaseEmailProvider):
    """Standard TLS SMTP provider for self-hosted or corporate mail servers."""

    def __init__(self, host: str, port: int, user: str, password: str):
        self.host = host
        self.port = port
        self.user = user
        self.password = password

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str,
        from_email: Optional[str] = None
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        if not self.host:
            return False, "SMTP_HOST is not configured.", None

        sender = from_email or config.AUTH_EMAIL_FROM or self.user
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = sender
        msg["To"] = to_email

        msg.attach(MIMEText(text_content, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        try:
            with smtplib.SMTP(self.host, self.port, timeout=10) as server:
                server.ehlo()
                if server.has_extn("STARTTLS"):
                    server.starttls()
                    server.ehlo()
                if self.user and self.password:
                    server.login(self.user, self.password)
                server.sendmail(sender, [to_email], msg.as_string())
            smtp_id = f"smtp_{uuid.uuid4().hex[:12]}"
            logger.info("[EMAIL_SENT] Email dispatched successfully via SMTP to %s", to_email)
            return True, None, smtp_id
        except Exception as e:
            logger.error("SMTP delivery failure: %s", e)
            return False, str(e), None


class EmailService:
    """Central authoritative email delivery coordinator."""

    def __init__(self):
        self._provider: Optional[BaseEmailProvider] = None

    def get_provider(self) -> BaseEmailProvider:
        if self._provider is not None:
            return self._provider

        provider_name = (config.EMAIL_PROVIDER or "console").strip().lower()
        if provider_name == "resend" and config.RESEND_API_KEY:
            self._provider = ResendEmailProvider(api_key=config.RESEND_API_KEY)
        elif provider_name == "smtp" and config.SMTP_HOST:
            self._provider = SmtpEmailProvider(
                host=config.SMTP_HOST,
                port=config.SMTP_PORT,
                user=config.SMTP_USER,
                password=config.SMTP_PASSWORD
            )
        else:
            self._provider = ConsoleLogEmailProvider()

        return self._provider

    def set_provider(self, provider: BaseEmailProvider) -> None:
        """Allows test suites to inject custom mock email providers."""
        self._provider = provider

    def get_delivery_status(self) -> Dict[str, Any]:
        """Returns provider and configuration status without disclosing sensitive keys."""
        provider_name = (config.EMAIL_PROVIDER or "console").strip().lower()
        is_configured = False
        if provider_name == "resend":
            is_configured = bool(config.RESEND_API_KEY)
        elif provider_name == "smtp":
            is_configured = bool(config.SMTP_HOST)
        else:
            is_configured = True

        return {
            "provider": provider_name,
            "configured": is_configured,
            "sender": config.AUTH_EMAIL_FROM or config.RESEND_FROM_EMAIL or "onboarding@resend.dev",
            "admin_email": config.AUTH_ADMIN_EMAIL or "ashishparadkar1999@gmail.com"
        }

    def _dispatch_and_record(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str,
        purpose: str,
        user_id: Optional[str] = None
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """Sends email via configured provider and records delivery event in database."""
        provider = self.get_provider()
        provider_name = "resend" if isinstance(provider, ResendEmailProvider) else ("smtp" if isinstance(provider, SmtpEmailProvider) else "console")
        event_id = f"eml_{uuid.uuid4().hex[:12]}"

        success, err_msg, msg_id = provider.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )

        status = "SENT" if success else "FAILED"
        try:
            db.record_email_delivery_event(
                event_id=event_id,
                user_id=user_id,
                recipient_email=to_email,
                purpose=purpose,
                provider=provider_name,
                provider_message_id=msg_id or "",
                status=status,
                error_details=err_msg or ""
            )
        except Exception as e:
            logger.warning("Failed to record email delivery event in database: %s", e)

        return success, err_msg, msg_id

    def send_login_otp(
        self,
        to_email: str,
        otp_code: str,
        username: str = "admin",
        user_id: Optional[str] = None
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Dispatches 6-digit Login Two-Factor Verification Code.
        """
        subject = "Alpha Algo Terminal — Login Verification Code"

        text_content = f"""ALPHA ALGO TERMINAL

Your verification code is:

{otp_code}

This code expires in 5 minutes.

If you did not attempt to sign in, do not share this code.
"""

        html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; background-color: #060913; color: #f1f5f9; padding: 24px; }}
    .card {{ max-width: 520px; margin: 0 auto; background-color: #0b132b; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; }}
    .header {{ font-family: monospace; font-size: 12px; letter-spacing: 2px; color: #00f0ff; text-transform: uppercase; margin-bottom: 8px; }}
    h1 {{ font-size: 20px; font-weight: 700; color: #ffffff; margin: 0 0 16px 0; font-family: monospace; }}
    p {{ font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 8px 0; }}
    .otp-container {{ text-align: center; margin: 28px 0; }}
    .otp-box {{ display: inline-block; background-color: #060913; border: 2px solid #00f0ff; border-radius: 12px; padding: 16px 32px; font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 12px; color: #00f0ff; box-shadow: 0 0 20px rgba(0, 240, 255, 0.2); }}
    .footer {{ font-size: 11px; color: #64748b; margin-top: 24px; border-top: 1px solid #1e293b; padding-top: 16px; font-family: monospace; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">Alpha Algo Terminal</div>
    <h1>Two-Step Login Verification</h1>
    <p>Hello <strong>{username}</strong>,</p>
    <p>Your 6-digit one-time login verification code is:</p>
    <div class="otp-container">
      <div class="otp-box">{otp_code}</div>
    </div>
    <p><strong>Security Notice:</strong> This code expires in <strong>5 minutes</strong> and can only be used once.</p>
    <p>If you did not attempt to sign in to Alpha Algo Terminal, do not share this code with anyone.</p>
    <div class="footer">Alpha Algo Terminal · Institutional Trading Systems · Automated Security Gateway</div>
  </div>
</body>
</html>"""

        return self._dispatch_and_record(
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            text_content=text_content,
            purpose="LOGIN",
            user_id=user_id
        )

    def send_password_reset_otp(
        self,
        to_email: str,
        otp_code: str,
        username: str = "admin",
        user_id: Optional[str] = None
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Dispatches 6-digit Password Reset Verification Code.
        """
        subject = "Alpha Algo Terminal — Password Reset Code"

        text_content = f"""Your password reset verification code is:

{otp_code}

The code expires in 10 minutes.

If you did not request a password reset, ignore this email.
"""

        html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; background-color: #060913; color: #f1f5f9; padding: 24px; }}
    .card {{ max-width: 520px; margin: 0 auto; background-color: #0b132b; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; }}
    .header {{ font-family: monospace; font-size: 12px; letter-spacing: 2px; color: #f59e0b; text-transform: uppercase; margin-bottom: 8px; }}
    h1 {{ font-size: 20px; font-weight: 700; color: #ffffff; margin: 0 0 16px 0; font-family: monospace; }}
    p {{ font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 8px 0; }}
    .otp-container {{ text-align: center; margin: 28px 0; }}
    .otp-box {{ display: inline-block; background-color: #060913; border: 2px solid #f59e0b; border-radius: 12px; padding: 16px 32px; font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 12px; color: #fbbf24; box-shadow: 0 0 20px rgba(245, 158, 11, 0.2); }}
    .footer {{ font-size: 11px; color: #64748b; margin-top: 24px; border-top: 1px solid #1e293b; padding-top: 16px; font-family: monospace; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">Security Notice</div>
    <h1>Password Reset Authorization</h1>
    <p>Hello <strong>{username}</strong>,</p>
    <p>A request was received to reset your Alpha Algo Terminal master password. Your 6-digit verification code is:</p>
    <div class="otp-container">
      <div class="otp-box">{otp_code}</div>
    </div>
    <p><strong>Note:</strong> This verification code expires in <strong>10 minutes</strong> and is valid for a single reset attempt.</p>
    <p>If you did not request a password reset, ignore this email. Your current password remains secure.</p>
    <div class="footer">Alpha Algo Terminal · Institutional Trading Systems · Cryptographic Key Management</div>
  </div>
</body>
</html>"""

        return self._dispatch_and_record(
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            text_content=text_content,
            purpose="PASSWORD_RESET",
            user_id=user_id
        )

    def send_password_changed_notification(
        self,
        to_email: str,
        username: str = "admin",
        user_id: Optional[str] = None
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """Sends security alert confirming password update."""
        subject = "Alpha Algo Terminal — Security Alert: Password Changed"
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        text_content = f"""Hello {username},

This is an automated notification confirming that the master password for your Alpha Algo Terminal account was updated on {now_str}.

All previous active sessions have been revoked.

If you did not perform this change, immediately run scripts/reset_admin_password.py locally or contact your system administrator.

Alpha Algo Terminal Security Team
"""
        html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: monospace; background-color: #060913; color: #f1f5f9; padding: 24px;">
  <div style="max-width: 500px; margin: 0 auto; background: #0b132b; border: 1px solid #1e293b; padding: 24px; border-radius: 12px;">
    <h2 style="color: #00e676; margin-top: 0;">Password Successfully Updated</h2>
    <p style="color: #94a3b8; font-size: 13px;">The master password for operator <strong>{username}</strong> was changed at {now_str}.</p>
    <p style="color: #94a3b8; font-size: 13px;">All previous active sessions have been revoked.</p>
    <p style="color: #64748b; font-size: 11px; margin-top: 16px; border-top: 1px solid #1e293b; padding-top: 8px;">Alpha Algo Terminal Security Team</p>
  </div>
</body>
</html>"""

        return self._dispatch_and_record(
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            text_content=text_content,
            purpose="PASSWORD_CHANGED",
            user_id=user_id
        )

    def send_test_email(
        self,
        to_email: str
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """Sends a verification test email."""
        subject = "Alpha Algo Email Test"
        text_content = "Your Alpha Algo Terminal email service is working."
        html_content = """<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: monospace; background-color: #060913; color: #f1f5f9; padding: 24px;">
  <div style="max-width: 500px; margin: 0 auto; background: #0b132b; border: 1px solid #1e293b; padding: 24px; border-radius: 12px;">
    <div style="color: #00f0ff; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">Alpha Algo Terminal</div>
    <h2 style="color: #00e676; margin-top: 8px;">Email Service Verification</h2>
    <p style="color: #94a3b8; font-size: 13px;">Your Alpha Algo Terminal email service is working and connected to Resend.</p>
  </div>
</body>
</html>"""
        return self._dispatch_and_record(
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            text_content=text_content,
            purpose="TEST_EMAIL"
        )


global_email_service = EmailService()
email_service = global_email_service
