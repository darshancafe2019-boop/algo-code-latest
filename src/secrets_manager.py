"""
Institutional Secret Manager & Envelope Encryption Vault.
Implements:
- Symmetric authenticated envelope encryption using cryptography.fernet.Fernet.
- Strict withdrawal permission enforcement: WITHDRAW scope is disabled (allow_withdraw=0).
- Automatic high-priority security alerting if withdrawal permissions are detected.
- Sensitive credential masking (never exposes raw API secrets to the frontend or logs).
"""

import os
import json
import base64
import hashlib
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List, Tuple
from cryptography.fernet import Fernet

from src import db


class SecretsManager:
    """Authoritative credential encryption and scope validation vault."""

    def __init__(self):
        self._fernet = self._get_or_create_fernet()

    def _get_or_create_fernet(self) -> Fernet:
        """Derives a deterministic 32-byte Fernet key from environment or local machine seed."""
        master_secret = os.getenv("ENCRYPTION_MASTER_KEY")
        if not master_secret:
            # Deterministic fallback tied to server installation path & secret file
            seed_source = f"{os.path.abspath(__file__)}:algo-trading-vault-key-2026"
            master_secret = hashlib.sha256(seed_source.encode("utf-8")).hexdigest()

        key_bytes = hashlib.sha256(master_secret.encode("utf-8")).digest()
        fernet_key = base64.urlsafe_b64encode(key_bytes)
        return Fernet(fernet_key)

    def encrypt_secret(self, plaintext: str) -> str:
        """Encrypts a plaintext secret string."""
        if not plaintext:
            return ""
        return self._fernet.encrypt(plaintext.encode("utf-8")).decode("utf-8")

    def decrypt_secret(self, ciphertext: str) -> str:
        """Decrypts a ciphertext string."""
        if not ciphertext:
            return ""
        try:
            return self._fernet.decrypt(ciphertext.encode("utf-8")).decode("utf-8")
        except Exception:
            return ""

    def store_credential(
        self,
        provider_id: str,
        account_name: str,
        api_key: str,
        secret_key: str,
        allow_read: bool = True,
        allow_trade: bool = True,
        allow_withdraw: bool = False,
        ip_restrictions: Optional[List[str]] = None,
        credential_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Stores encrypted broker API credentials in database.
        Enforces withdrawal scope rule.
        """
        if allow_withdraw:
            # High-priority security warning & force disable
            db.create_security_alert(
                severity="CRITICAL",
                category="CREDENTIAL_RISK",
                title="Withdrawal Permission Violation Detected",
                description=f"Exchange API credential for '{account_name}' ({provider_id}) had withdrawal permission enabled. Algo platform policy requires withdrawal permissions to be strictly DISABLED."
            )
            allow_withdraw = False

        if not credential_id:
            existing = db.safe_query("SELECT credential_id FROM broker_credentials WHERE provider_id = ? LIMIT 1", (provider_id,))
            cid = existing[0]["credential_id"] if existing else f"cred-{uuid.uuid4().hex[:8]}"
        else:
            cid = credential_id

        now_iso = datetime.now(timezone.utc).isoformat()
        enc_api_key = self.encrypt_secret(api_key)
        enc_secret = self.encrypt_secret(secret_key)
        key_prefix = (api_key[:4] + "..." + api_key[-4:]) if len(api_key) >= 8 else (api_key[:4] + "..." if api_key else "NOT_CONFIGURED")

        db.safe_execute(
            """
            INSERT INTO broker_credentials (
                credential_id, provider_id, account_name, encrypted_api_key,
                encrypted_secret_key, key_prefix, allow_read, allow_trade,
                allow_withdraw, ip_restrictions_json, status, last_validated_at,
                created_at, rotated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONNECTED', ?, ?, ?)
            ON CONFLICT(credential_id) DO UPDATE SET
                provider_id = excluded.provider_id,
                account_name = excluded.account_name,
                encrypted_api_key = excluded.encrypted_api_key,
                encrypted_secret_key = excluded.encrypted_secret_key,
                key_prefix = excluded.key_prefix,
                allow_read = excluded.allow_read,
                allow_trade = excluded.allow_trade,
                allow_withdraw = excluded.allow_withdraw,
                ip_restrictions_json = excluded.ip_restrictions_json,
                last_validated_at = excluded.last_validated_at,
                rotated_at = excluded.rotated_at
            """,
            (
                cid,
                provider_id,
                account_name,
                enc_api_key,
                enc_secret,
                key_prefix,
                1 if allow_read else 0,
                1 if allow_trade else 0,
                0, # ALWAYS 0 FOR WITHDRAW
                json.dumps(ip_restrictions or []),
                now_iso,
                now_iso,
                now_iso,
            )
        )

        db.log_security_audit_event(
            action="BROKER_CREDENTIAL_STORED",
            resource_type="BROKER_CREDENTIAL",
            resource_id=cid,
            result="SUCCESS",
            assurance_level="LEVEL_4_CRITICAL_SECURITY",
            details={
                "provider_id": provider_id,
                "account_name": account_name,
                "key_prefix": key_prefix,
                "allow_withdraw": False,
            }
        )

        return {
            "credential_id": cid,
            "provider_id": provider_id,
            "account_name": account_name,
            "key_prefix": key_prefix,
            "allow_read": allow_read,
            "allow_trade": allow_trade,
            "allow_withdraw": False,
            "status": "CONNECTED",
            "last_validated_at": now_iso
        }

    def get_decrypted_credential(self, provider_id: str) -> Optional[Tuple[str, str]]:
        """Returns (api_key, secret_key) decrypted for execution worker only."""
        rows = db.safe_query(
            "SELECT encrypted_api_key, encrypted_secret_key FROM broker_credentials WHERE provider_id = ? AND status = 'CONNECTED' ORDER BY (encrypted_api_key != '') DESC, rotated_at DESC, created_at DESC LIMIT 1",
            (provider_id,),
        )
        if not rows:
            return None
        enc_k = rows[0]["encrypted_api_key"]
        enc_s = rows[0]["encrypted_secret_key"]
        return self.decrypt_secret(enc_k), self.decrypt_secret(enc_s)

    def get_masked_credentials(self) -> List[Dict[str, Any]]:
        """Returns safe masked credential metadata for frontend Security Center display."""
        rows = db.safe_query("SELECT * FROM broker_credentials ORDER BY created_at DESC")
        out = []
        for r in rows:
            out.append({
                "credential_id": r["credential_id"],
                "provider_id": r["provider_id"],
                "account_name": r["account_name"],
                "key_prefix": r["key_prefix"],
                "allow_read": bool(r["allow_read"]),
                "allow_trade": bool(r["allow_trade"]),
                "allow_withdraw": False, # Always false
                "ip_restrictions": json.loads(r.get("ip_restrictions_json") or "[]"),
                "status": r["status"],
                "last_validated_at": r["last_validated_at"],
                "created_at": r["created_at"],
                "rotated_at": r["rotated_at"]
            })
        return out

    def rotate_credential(self, credential_id: str, new_api_key: str, new_secret_key: str) -> bool:
        """Rotates an existing credential."""
        now_iso = datetime.now(timezone.utc).isoformat()
        enc_api = self.encrypt_secret(new_api_key)
        enc_sec = self.encrypt_secret(new_secret_key)
        prefix = (new_api_key[:4] + "..." + new_api_key[-4:]) if len(new_api_key) >= 8 else (new_api_key[:4] + "..." if new_api_key else "NOT_CONFIGURED")

        ok = db.safe_execute(
            """
            UPDATE broker_credentials
            SET encrypted_api_key = ?, encrypted_secret_key = ?, key_prefix = ?, rotated_at = ?, last_validated_at = ?
            WHERE credential_id = ?
            """,
            (enc_api, enc_sec, prefix, now_iso, now_iso, credential_id),
        )

        if ok:
            db.log_security_audit_event(
                action="BROKER_CREDENTIAL_ROTATED",
                resource_type="BROKER_CREDENTIAL",
                resource_id=credential_id,
                result="SUCCESS",
                assurance_level="LEVEL_4_CRITICAL_SECURITY",
                details={"rotated_at": now_iso}
            )
        return ok


global_secrets_manager = SecretsManager()
