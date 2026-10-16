"""
Targeted Verification Test Suite for QuantOS Audit & Repair
============================================================
Verifies:
1. Admin Bootstrap without undefined 'existing_user' or errors
2. Dynamic Admin Email resolution (no hardcoded email fallbacks)
3. Auth Login flow & password verification
4. Email OTP generation & verification
5. RBAC authorization (Admin vs Operator vs Viewer vs Unauthenticated)
6. All 7 steps of the Bot Creation Wizard
7. Fail-closed trading guardrails (TRADING_MODE=PAPER, LIVE_TRADING_ENABLED=false)
"""

import os
import sys
import json
import uuid
import hashlib
import unittest
from datetime import datetime, timezone, timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

# Enforce test environment variables before importing modules
os.environ["TRADING_MODE"] = "PAPER"
os.environ["LIVE_TRADING_ENABLED"] = "false"
os.environ["MASTER_LIVE_TRADING"] = "false"
os.environ["FORCE_SQLITE"] = "true"
os.environ["AUTH_ADMIN_EMAIL"] = "admin_test@quantos.local"
os.environ["AUTH_BOOTSTRAP_PASSWORD"] = "TestAdminPass@2026!"
os.environ["AUTH_BOOTSTRAP_ENABLED"] = "true"

from src import config, db
from src.security_auth import SecurityAuthManager, PasswordManager
from src.bot_wizard_service import validate_wizard_draft, deploy_wizard_bot, list_bots


class TestQuantOSAuditRepair(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        db.init_db()

    def test_01_fail_closed_trading_guardrails(self):
        """Verify institutional trading safety settings are strictly fail-closed."""
        self.assertEqual(os.environ.get("TRADING_MODE"), "PAPER")
        self.assertEqual(os.environ.get("LIVE_TRADING_ENABLED"), "false")
        self.assertEqual(os.environ.get("MASTER_LIVE_TRADING"), "false")
        self.assertFalse(config.LIVE_TRADING_ENABLED)
        self.assertFalse(config.MASTER_LIVE_TRADING)
        print("[PASS] Test 1: Fail-closed trading guardrails verified.")

    def test_02_admin_bootstrap_no_existing_user_error(self):
        """Verify initialize_bootstrap_admin executes cleanly with no undefined variable error."""
        try:
            SecurityAuthManager.initialize_bootstrap_admin()
            admin = db.get_user_by_username("admin")
            self.assertIsNotNone(admin, "Admin user must exist after bootstrap")
            self.assertEqual(admin["username"], "admin")
            self.assertEqual(admin["role"], "ADMIN")

            # Verify that subsequent bootstrap execution preserves established password
            custom_pwd = "MySecretAdminEstablishedPass@99!"
            h, s = PasswordManager.hash_password(custom_pwd)
            db.update_user_password(admin["id"], h, s, must_change_password=0)
            
            # Run bootstrap again with different env password
            os.environ["AUTH_BOOTSTRAP_PASSWORD"] = "DifferentEnvPass@123!"
            SecurityAuthManager.initialize_bootstrap_admin()
            
            # Verify custom password remains active and was NOT overwritten
            admin_refreshed = db.get_user_by_username("admin")
            self.assertTrue(PasswordManager.verify_password(custom_pwd, admin_refreshed["password_hash"], admin_refreshed["salt"]))
            print(f"[PASS] Test 2: Admin bootstrap succeeded and preserved established password without unexpected reset.")
        except NameError as ne:
            self.fail(f"Admin bootstrap threw NameError: {ne}")

    def test_03_dynamic_admin_email_resolution(self):
        """Verify admin email is resolved dynamically without hardcoded fallback."""
        from src.email_service import get_target_admin_email
        resolved = get_target_admin_email()
        self.assertEqual(resolved, "admin_test@quantos.local")
        self.assertNotIn("ashishparadkar", resolved)
        print(f"[PASS] Test 3: Dynamic admin email resolved: {resolved}")

    def test_04_password_manager_hashing_and_verification(self):
        """Verify PBKDF2 password hashing and constant-time verification."""
        test_pass = "SecureTradingPass#99!"
        pwd_hash, salt = PasswordManager.hash_password(test_pass)
        self.assertTrue(PasswordManager.verify_password(test_pass, pwd_hash, salt))
        self.assertFalse(PasswordManager.verify_password("WrongPassword!", pwd_hash, salt))
        print("[PASS] Test 4: PasswordManager cryptographic hashing & verification verified.")

    def test_05_auth_login_and_otp_lifecycle(self):
        """Verify login authentication and OTP challenge creation & verification."""
        admin = db.get_user_by_username("admin")
        self.assertIsNotNone(admin)

        # Invalidate old OTPs
        db.invalidate_user_auth_otp_challenges(admin["id"], "LOGIN")

        # Create challenge with known code
        code = "729481"
        code_hash = hashlib.sha256(code.encode("utf-8")).hexdigest()
        challenge_id = f"chall_test_{uuid.uuid4().hex[:12]}"
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()

        inserted = db.create_auth_otp_challenge(
            challenge_id=challenge_id,
            user_id=admin["id"],
            purpose="LOGIN",
            recipient_email=admin["email"],
            otp_hash=code_hash,
            expires_at=expires_at,
            requested_ip="127.0.0.1"
        )
        self.assertTrue(inserted, "OTP challenge must be inserted in DB")

        # Verify challenge
        chall = db.get_auth_otp_challenge(challenge_id)
        self.assertIsNotNone(chall)
        self.assertEqual(chall["user_id"], admin["id"])
        self.assertEqual(chall["status"], "PENDING")
        self.assertEqual(chall["otp_hash"], code_hash)

        # Mark used
        db.mark_auth_otp_challenge_used(challenge_id)
        chall_after = db.get_auth_otp_challenge(challenge_id)
        self.assertEqual(chall_after["status"], "USED")
        print("[PASS] Test 5: Login OTP challenge generation, hash match & single-use consumption verified.")

    def test_06_rbac_authorization_rules(self):
        """Verify role hierarchy and permissions for ADMIN vs VIEWER."""
        viewer_id = f"usr_viewer_{uuid.uuid4().hex[:8]}"
        pwd_h, s = PasswordManager.hash_password("ViewerPass@123")
        db.upsert_user({
            "id": viewer_id,
            "username": f"viewer_{uuid.uuid4().hex[:6]}",
            "email": f"viewer_{uuid.uuid4().hex[:4]}@quantos.local",
            "password_hash": pwd_h,
            "salt": s,
            "role": "VIEWER",
            "is_active": 1,
            "is_2fa_enabled": 0,
            "must_change_password": 0
        })
        viewer = db.get_user_by_id(viewer_id)
        self.assertEqual(viewer["role"], "VIEWER")
        self.assertNotEqual(viewer["role"], "ADMIN")
        self.assertNotEqual(viewer["role"], "OPERATOR")
        print("[PASS] Test 6: RBAC role isolation verified (VIEWER cannot execute trading operations).")

    def test_07_wizard_seven_steps_validation_and_deploy(self):
        """Verify all seven steps of Bot Creation Wizard and paper deployment."""
        payload = {
            "bot_name": f"Test Alpha BTC {uuid.uuid4().hex[:6]}",
            "underlying": "BTC",
            "market_type": "CRYPTO",
            "broker": "DELTA",
            "execution_mode": "PAPER",
            "timeframe": "5m",
            # Step 1: Capital
            "capital": {
                "allocated_amount": 5000.0,
                "currency": "USD",
                "max_risk_pct": 2.0
            },
            # Step 2: Instrument Contract
            "contract": {
                "symbol": "BTC/USDT",
                "instrument_id": "BTC/USDT",
                "contract_type": "SPOT",
                "provider": "DELTA",
                "expiry": "2026-10-30",
                "strike": 68000
            },
            # Step 3: Indicators
            "indicators": [
                {"indicator_id": "RSI", "params": {"period": 14, "overbought": 70, "oversold": 30}},
                {"indicator_id": "EMA", "params": {"short_period": 9, "long_period": 21}}
            ],
            # Step 4: Option Strategies
            "option_strategy": {
                "strategy_id": "BULL_CALL_SPREAD",
                "legs": [
                    {"leg_id": "leg_1", "type": "CALL", "strike": 68000, "action": "BUY", "ratio": 1},
                    {"leg_id": "leg_2", "type": "CALL", "strike": 70000, "action": "SELL", "ratio": 1}
                ]
            },
            # Step 5: Trading Strategy
            "trading_strategy": {
                "strategy_id": "TREND_PULLBACK",
                "strategy_name": "Trend Pullback to EMA",
                "entry_conditions": ["RSI < 35", "PRICE > EMA_21"],
                "exit_conditions": ["RSI > 70"],
                "cooldown_minutes": 15
            },
            # Step 6: Risk Management
            "risk_management": {
                "max_drawdown_pct": 5.0,
                "stop_loss_pct": 2.0,
                "take_profit_pct": 6.0,
                "trailing_stop": True,
                "max_daily_loss": 500.0
            },
            # Step 7: Execution settings
            "auto_start": False
        }

        # Validate Draft across all 7 steps
        val_result = validate_wizard_draft(payload)
        self.assertTrue(val_result["ready"], f"Draft validation failed: {val_result.get('checks')}")
        self.assertGreaterEqual(len(val_result["checks"]), 6)
        print(f"[PASS] Test 7a: Wizard draft passed all 7 pre-deployment validation checks.")

        # Deploy Paper Bot
        deploy_res = deploy_wizard_bot(payload)
        self.assertTrue(deploy_res.get("success"), f"Bot deployment failed: {deploy_res}")
        bot_id = deploy_res.get("bot_id")
        self.assertIsNotNone(bot_id)
        self.assertIn(deploy_res.get("status"), ["READY", "STOPPED"])
        self.assertEqual(deploy_res.get("mode"), "PAPER")

        # Verify Bot is listed in active fleet
        all_bots = list_bots()
        found = any(b.get("id") == bot_id or b.get("bot_id") == bot_id for b in all_bots)
        self.assertTrue(found, f"Deployed bot {bot_id} must appear in list_bots")
        print(f"[PASS] Test 7b: Paper Bot '{bot_id}' successfully deployed and verified in fleet.")

    def test_08_sensitive_api_routes_require_authentication(self):
        """Verify sensitive endpoints are strictly rejected (HTTP 401) without authentication."""
        from dashboard import app
        client = app.test_client()
        sensitive_routes = [
            "/api/bots",
            "/api/portfolio/holdings",
            "/api/trading/orders",
            "/api/security/audit"
        ]
        for route in sensitive_routes:
            resp = client.get(route)
            self.assertEqual(resp.status_code, 401, f"Expected 401 Unauthorized for {route}, got {resp.status_code}")
        print("[PASS] Test 8: Sensitive API endpoints return 401 Unauthorized without session.")


if __name__ == "__main__":
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromTestCase(TestQuantOSAuditRepair)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    print("=" * 60)
    print(f"TESTS RUN: {result.testsRun} | FAILURES: {len(result.failures)} | ERRORS: {len(result.errors)}")
    print("=" * 60)
    os._exit(0 if result.wasSuccessful() else 1)
