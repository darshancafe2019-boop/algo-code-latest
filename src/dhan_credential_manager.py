"""
Quant.OS Dhan HQ v2 Authoritative Credential Lifecycle Manager
===============================================================
Central server-side singleton managing:
1. Token state, Client ID, and local JWT expiry computation
2. Single-flight proactive token renewal (GET https://api.dhan.co/v2/RenewToken)
3. Atomic .env file persistence preserving comments and formatting
4. Hot credential reloading and memory synchronization across services
5. Subscription and WebSocket re-authentication event dispatching
6. Manual .env edit detection via file hash monitoring
"""
from __future__ import annotations

import base64
import hashlib
import json
import logging
import os
import tempfile
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

logger = logging.getLogger("DhanCredentialManager")

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"
RENEW_THRESHOLD_MINUTES = int(os.getenv("DHAN_RENEW_BEFORE_MINUTES", "60"))


class DhanCredentialManager:
    """
    Authoritative server-side manager for Dhan HQ v2 authentication lifecycle.
    """
    _instance: Optional[DhanCredentialManager] = None
    _singleton_lock = threading.Lock()

    @classmethod
    def get_instance(cls) -> DhanCredentialManager:
        if cls._instance is None:
            with cls._singleton_lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def __init__(self):
        self._lock = threading.RLock()
        self._renewal_lock = threading.Lock()
        self._client_id: str = ""
        self._access_token: str = ""
        self._token_expiry_utc: Optional[float] = None
        self._token_expiry_ist: str = ""
        self._status: str = "NOT_CONFIGURED"
        self._last_validation_time: float = 0.0
        self._last_validation_result: Optional[Dict[str, Any]] = None
        self._last_successful_renewal: float = 0.0
        self._credential_generation: int = 1
        self._file_fingerprint: str = ""
        self._callbacks: List[Callable[[str, str, int], None]] = []
        self._watcher_thread: Optional[threading.Thread] = None
        self._watcher_running: bool = False
        
        # Initial load
        self.load_from_environment()

    # ─────────────────────────────────────────────────────────────────────────
    # Token Resolution & Loading
    # ─────────────────────────────────────────────────────────────────────────

    def _read_env_file(self) -> Dict[str, str]:
        env_vars = {}
        if not ENV_FILE.is_file():
            return env_vars
        try:
            with open(ENV_FILE, "r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    k, v = line.split("=", 1)
                    env_vars[k.strip()] = v.strip().strip("'\"")
        except Exception as e:
            logger.warning(f"Error reading .env file: {e}")
        return env_vars

    def _compute_fingerprint(self, token: str) -> str:
        if not token:
            return ""
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    def decode_jwt_expiry(self, token: str) -> Optional[float]:
        """Decodes JWT payload locally to extract expiry without network request."""
        if not token:
            return None
        try:
            parts = token.split(".")
            if len(parts) != 3:
                return None
            payload = parts[1]
            rem = len(payload) % 4
            if rem > 0:
                payload += "=" * (4 - rem)
            decoded = base64.urlsafe_b64decode(payload)
            data = json.loads(decoded)
            return float(data.get("exp", 0.0))
        except Exception:
            return None

    def load_from_environment(self, force_notify: bool = False, override_token: Optional[str] = None, override_cid: Optional[str] = None) -> None:
        """Loads credentials from .env and synchronizes process environment."""
        with self._lock:
            env_vars = self._read_env_file()
            cid = override_cid or env_vars.get("DHAN_CLIENT_ID", "") or os.environ.get("DHAN_CLIENT_ID", "")
            token = override_token or env_vars.get("DHAN_ACCESS_TOKEN", "") or os.environ.get("DHAN_ACCESS_TOKEN", "")

            cid = str(cid).strip()
            token = str(token).strip()

            new_fingerprint = self._compute_fingerprint(token)
            is_changed = (token != self._access_token or cid != self._client_id)

            self._client_id = cid
            self._access_token = token
            self._file_fingerprint = new_fingerprint

            if token:
                os.environ["DHAN_ACCESS_TOKEN"] = token
            if cid:
                os.environ["DHAN_CLIENT_ID"] = cid

            if is_changed:
                self._credential_generation += 1

            self._update_expiry_state_locked()

        if is_changed or force_notify:
            logger.info(
                "Dhan credentials updated (Gen=%d, ClientId=%s, Status=%s)",
                self._credential_generation,
                self.masked_client_id,
                self._status,
            )
            self._notify_callbacks()

    def _update_expiry_state_locked(self) -> None:
        """Calculates token expiry status based on current time."""
        if not self._client_id or not self._access_token:
            self._status = "NOT_CONFIGURED"
            self._token_expiry_utc = None
            self._token_expiry_ist = ""
            return

        exp_ts = self.decode_jwt_expiry(self._access_token)
        if not exp_ts:
            self._status = "INVALID_FORMAT"
            self._token_expiry_utc = None
            self._token_expiry_ist = ""
            return

        self._token_expiry_utc = exp_ts
        now_ts = time.time()
        remaining_seconds = exp_ts - now_ts

        # Convert to IST string
        ist_offset = timezone(timedelta(hours=5, minutes=30))
        exp_dt_ist = datetime.fromtimestamp(exp_ts, tz=timezone.utc).astimezone(ist_offset)
        self._token_expiry_ist = exp_dt_ist.strftime("%Y-%m-%d %H:%M:%S IST")

        if remaining_seconds <= 0:
            self._status = "EXPIRED"
        elif remaining_seconds <= (RENEW_THRESHOLD_MINUTES * 60):
            self._status = "EXPIRING_SOON"
        else:
            self._status = "VALID"

    # ─────────────────────────────────────────────────────────────────────────
    # Public Getters
    # ─────────────────────────────────────────────────────────────────────────

    @property
    def client_id(self) -> str:
        with self._lock:
            return self._client_id

    @property
    def access_token(self) -> str:
        with self._lock:
            return self._access_token

    @property
    def masked_client_id(self) -> str:
        cid = self.client_id
        if not cid:
            return ""
        if len(cid) <= 4:
            return "****"
        return cid[:4] + "****"

    @property
    def credential_generation(self) -> int:
        with self._lock:
            return self._credential_generation

    def get_credentials(self) -> Tuple[str, str, int]:
        with self._lock:
            return self._client_id, self._access_token, self._credential_generation

    def get_status(self) -> Dict[str, Any]:
        with self._lock:
            self._update_expiry_state_locked()
            now_ts = time.time()
            remaining_min = 0
            if self._token_expiry_utc:
                remaining_min = max(0, int((self._token_expiry_utc - now_ts) / 60))

            return {
                "provider": "DHAN",
                "client_id_masked": self.masked_client_id,
                "status": self._status,
                "authenticated": self._status in ("VALID", "EXPIRING_SOON"),
                "token_expiry_utc": self._token_expiry_utc,
                "token_expiry_ist": self._token_expiry_ist,
                "token_remaining_minutes": remaining_min,
                "credential_generation": self._credential_generation,
                "last_validation_time": self._last_validation_time,
                "last_successful_renewal": self._last_successful_renewal,
            }

    # ─────────────────────────────────────────────────────────────────────────
    # Profile Validation
    # ─────────────────────────────────────────────────────────────────────────

    def validate_with_profile(self, force: bool = False) -> Dict[str, Any]:
        """Authoritative profile validation against Dhan HQ."""
        with self._lock:
            now = time.monotonic()
            if not force and self._last_validation_result and (now - self._last_validation_time < 30.0):
                return self._last_validation_result

            cid = self._client_id
            token = self._access_token

        if not cid or not token:
            return {
                "success": False,
                "status": "NOT_CONFIGURED",
                "error_code": "DH-901",
                "message": "Dhan credentials not configured.",
            }

        headers = {
            "access-token": token,
            "client-id": cid,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        url = "https://api.dhan.co/v2/profile"
        try:
            req = urllib.request.Request(url, headers=headers, method="GET")
            from src.ssl_util import get_ssl_context
            with urllib.request.urlopen(req, timeout=6.0, context=get_ssl_context()) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                res = {
                    "success": True,
                    "status": "AUTHENTICATED",
                    "client_id": self.masked_client_id,
                    "data_plan": data.get("dataPlan", "Active"),
                    "data_validity": data.get("dataValidity", ""),
                    "active_segment": data.get("activeSegment", ""),
                }
                with self._lock:
                    self._last_validation_time = time.monotonic()
                    self._last_validation_result = res
                return res

        except urllib.error.HTTPError as he:
            err_body = ""
            try:
                err_body = he.read().decode("utf-8")
            except Exception:
                pass

            status_label = "AUTH_REQUIRED" if he.code == 401 else ("RATE_LIMITED" if he.code == 429 else "PROVIDER_ERROR")
            res = {
                "success": False,
                "status": status_label,
                "http_status": he.code,
                "error_body": err_body,
                "message": f"Dhan API returned HTTP {he.code}",
            }
            with self._lock:
                self._last_validation_time = time.monotonic()
                self._last_validation_result = res
                if he.code == 401:
                    self._status = "AUTH_REQUIRED"
            return res

        except Exception as ex:
            return {
                "success": False,
                "status": "NETWORK_ERROR",
                "message": str(ex),
            }

    # ─────────────────────────────────────────────────────────────────────────
    # Single-Flight Token Renewal
    # ─────────────────────────────────────────────────────────────────────────

    def renew_token(self) -> Tuple[bool, str]:
        """
        Calls official Dhan v2 RenewToken endpoint while token is still active.
        Persists the renewed token atomically and notifies all subscribers.
        """
        if not self._renewal_lock.acquire(blocking=False):
            return False, "Renewal already in progress (single-flight locked)."

        try:
            with self._lock:
                cid = self._client_id
                token = self._access_token
                self._update_expiry_state_locked()
                if self._status == "EXPIRED":
                    return False, "Token is already EXPIRED. Dhan RenewToken only functions while active."

            if not cid or not token:
                return False, "Credentials missing for renewal."

            logger.info("Initiating proactive Dhan token renewal for ClientId=%s...", self.masked_client_id)

            headers = {
                "access-token": token,
                "dhanClientId": cid,
                "Content-Type": "application/json",
                "Accept": "application/json",
            }

            url = "https://api.dhan.co/v2/RenewToken"
            req = urllib.request.Request(url, headers=headers, method="GET")
            from src.ssl_util import get_ssl_context
            with urllib.request.urlopen(req, timeout=8.0, context=get_ssl_context()) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                new_token = data.get("token")
                if not new_token:
                    logger.error("Dhan RenewToken returned response without 'token' field: %s", data)
                    return False, "Response missing renewed token."

                # Validate new token
                new_exp = self.decode_jwt_expiry(new_token)
                if not new_exp or new_exp <= time.time():
                    logger.error("Dhan RenewToken returned invalid or expired token.")
                    return False, "Renewed token has invalid expiration."

                # Atomically update and persist
                persist_ok = self.atomic_persist_token(new_token)
                if not persist_ok:
                    logger.warning("Token renewed in memory, but atomic .env persistence failed.")

                with self._lock:
                    self._access_token = new_token
                    self._file_fingerprint = self._compute_fingerprint(new_token)
                    self._last_successful_renewal = time.time()
                    self._credential_generation += 1
                    self._update_expiry_state_locked()
                    os.environ["DHAN_ACCESS_TOKEN"] = new_token

                logger.info(
                    "Dhan token renewal SUCCEEDED! (Gen=%d, NewExpiry=%s)",
                    self._credential_generation,
                    self._token_expiry_ist,
                )

                self._notify_callbacks()
                return True, "Renewal successful"

        except urllib.error.HTTPError as he:
            logger.error("Dhan RenewToken failed with HTTP %d: %s", he.code, he.reason)
            return False, f"RenewToken HTTP {he.code}: {he.reason}"
        except Exception as ex:
            logger.error("Dhan RenewToken exception: %s", ex, exc_info=True)
            return False, str(ex)
        finally:
            self._renewal_lock.release()

    # ─────────────────────────────────────────────────────────────────────────
    # Atomic File Persistence
    # ─────────────────────────────────────────────────────────────────────────

    def atomic_persist_token(self, new_token: str) -> bool:
        """Replaces DHAN_ACCESS_TOKEN in root .env atomically preserving all formatting."""
        if not ENV_FILE.exists():
            return False

        try:
            with open(ENV_FILE, "r", encoding="utf-8") as f:
                lines = f.readlines()

            found = False
            new_lines = []
            for line in lines:
                stripped = line.strip()
                if stripped.startswith("DHAN_ACCESS_TOKEN=") or stripped.startswith("DHAN_ACCESS_TOKEN ="):
                    new_lines.append(f"DHAN_ACCESS_TOKEN={new_token}\n")
                    found = True
                else:
                    new_lines.append(line)

            if not found:
                new_lines.append(f"\nDHAN_ACCESS_TOKEN={new_token}\n")

            # Write to temp file in same directory for atomic rename
            temp_fd, temp_path = tempfile.mkstemp(dir=str(ENV_FILE.parent), prefix=".env_tmp_")
            with os.fdopen(temp_fd, "w", encoding="utf-8") as tf:
                tf.writelines(new_lines)
                tf.flush()
                os.fsync(tf.fileno())

            # Atomic replace
            os.replace(temp_path, str(ENV_FILE))
            return True
        except Exception as e:
            logger.error("Failed to atomically persist renewed token to .env: %s", e)
            return False

    # ─────────────────────────────────────────────────────────────────────────
    # Manual Edit Detection & Hot-Reload
    # ─────────────────────────────────────────────────────────────────────────

    def check_manual_env_change(self) -> bool:
        """Checks if .env was manually edited with a new token."""
        env_vars = self._read_env_file()
        file_token = env_vars.get("DHAN_ACCESS_TOKEN", "").strip()
        if not file_token:
            return False

        fp = self._compute_fingerprint(file_token)
        with self._lock:
            current_fp = self._file_fingerprint

        if fp and fp != current_fp:
            logger.info("Detected manual change in DHAN_ACCESS_TOKEN (.env). Reloading...")
            self.load_from_environment(force_notify=True)
            return True
        return False

    # ─────────────────────────────────────────────────────────────────────────
    # Subscriptions & Event Callbacks
    # ─────────────────────────────────────────────────────────────────────────

    def register_callback(self, callback: Callable[[str, str, int], None]) -> None:
        """Registers listener to be called on credential changes: cb(client_id, token, generation)."""
        with self._lock:
            if callback not in self._callbacks:
                self._callbacks.append(callback)

    def _notify_callbacks(self) -> None:
        with self._lock:
            cid = self._client_id
            token = self._access_token
            gen = self._credential_generation
            callbacks = list(self._callbacks)

        for cb in callbacks:
            try:
                cb(cid, token, gen)
            except Exception as e:
                logger.error("Error executing credential update callback: %s", e)

    # ─────────────────────────────────────────────────────────────────────────
    # Background Watcher
    # ─────────────────────────────────────────────────────────────────────────

    def start_background_watcher(self, interval_sec: int = 300) -> None:
        """Starts background daemon watcher checking token expiry and .env edits."""
        with self._lock:
            if self._watcher_running:
                return
            self._watcher_running = True
            self._watcher_thread = threading.Thread(
                target=self._watcher_loop,
                args=(interval_sec,),
                name="DhanCredentialWatcher",
                daemon=True,
            )
            self._watcher_thread.start()
            logger.info("Started DhanCredentialWatcher (interval=%ds)", interval_sec)

    def _watcher_loop(self, interval_sec: int) -> None:
        while self._watcher_running:
            try:
                # 1. Check if .env was manually edited
                self.check_manual_env_change()

                # 2. Check token status
                status = self.get_status()
                if status["status"] == "EXPIRING_SOON":
                    logger.info("Dhan token EXPIRING_SOON (%d mins remaining). Attempting proactive renewal...", status["token_remaining_minutes"])
                    self.renew_token()

            except Exception as e:
                logger.error("Error in DhanCredentialWatcher loop: %s", e)

            # Sleep in small increments for responsive shutdown
            for _ in range(max(1, interval_sec)):
                if not self._watcher_running:
                    break
                time.sleep(1)


# Global Authoritative Singleton Instance
global_dhan_credential_manager = DhanCredentialManager.get_instance()
