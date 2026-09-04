"""
Alpha Algo Terminal - Email Auth Flow Verification Script
Tests database configuration, admin record synchronization, Resend email readiness,
and challenge lifecycle without logging sensitive secrets.
"""

import os
import sys
import uuid
import hashlib
import datetime
from pathlib import Path
from dotenv import load_dotenv

# Ensure repo root is on PYTHONPATH
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
load_dotenv(ROOT / ".env")

from src import db
from src.email_service import email_service

def verify_db_and_admin():
    print("\n[1/4] Checking Database and Admin Email Synchronization...")
    db.init_db()
    admin_user = db.get_user_by_username("admin")
    if not admin_user:
        print("  [FAIL] 'admin' user not found in database.")
        return False
    
    email = admin_user.get("email")
    role = admin_user.get("role")
    is_active = admin_user.get("is_active")
    
    print(f"  [OK] User: {admin_user.get('username')}")
    print(f"  [OK] Email: {email}")
    print(f"  [OK] Role: {role}")
    print(f"  [OK] Active: {bool(is_active)}")
    
    if email != "ashishparadkar1999@gmail.com":
        print("  [FAIL] Admin email does not match ashishparadkar1999@gmail.com")
        return False
    return True

def verify_email_service():
    print("\n[2/4] Verifying Email Service Configuration...")
    status = email_service.get_delivery_status()
    print(f"  [OK] Email Provider: {status['provider']}")
    print(f"  [OK] Configured: {status['configured']}")
    print(f"  [OK] Sender Address: {status['sender']}")
    
    if not status['configured']:
        print("  [FAIL] Resend API Key is missing or unconfigured.")
        return False
    return True

def verify_otp_challenge_lifecycle():
    print("\n[3/4] Verifying Email OTP Challenge Database Lifecycle...")
    admin_user = db.get_user_by_username("admin")
    user_id = admin_user["id"]
    
    # 1. Invalidate previous challenges
    db.invalidate_user_otp_challenges(user_id, "TEST_VERIFY")
    
    # 2. Create test challenge
    test_otp = "123456"
    test_hash = hashlib.sha256(test_otp.encode("utf-8")).hexdigest()
    expires_at = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=5)).isoformat()
    challenge_id = f"test_chall_{uuid.uuid4().hex[:12]}"
    
    db.create_email_otp_challenge(
        challenge_id=challenge_id,
        user_id=user_id,
        purpose="TEST_VERIFY",
        otp_hash=test_hash,
        expires_at=expires_at,
        requested_ip="127.0.0.1",
        request_id="cli_test"
    )
    print(f"  [OK] Challenge Created: id={challenge_id}")
    
    # 3. Retrieve challenge
    challenge = db.get_email_otp_challenge(challenge_id)
    if not challenge or challenge["user_id"] != user_id:
        print("  [FAIL] Challenge retrieval mismatch.")
        return False
    print("  [OK] Challenge Retrieved successfully.")
    
    # 4. Increment attempts
    attempts = db.increment_email_otp_attempts(challenge_id)
    print(f"  [OK] Challenge attempts incremented: count={attempts}")
    
    # 5. Mark used
    db.mark_email_otp_challenge_used(challenge_id)
    challenge_after = db.get_email_otp_challenge(challenge_id)
    if not challenge_after.get("used_at"):
        print("  [FAIL] Challenge used_at flag not set.")
        return False
    print("  [OK] Challenge marked used successfully.")
    
    # Clean up test challenge
    db.invalidate_user_otp_challenges(user_id, "TEST_VERIFY")
    return True

def verify_email_event_logging():
    print("\n[4/4] Verifying Email Delivery Event Logging...")
    admin_user = db.get_user_by_username("admin")
    user_id = admin_user["id"]
    event_id = f"test_evt_{uuid.uuid4().hex[:12]}"
    
    db.record_email_delivery_event(
        event_id=event_id,
        user_id=user_id,
        recipient_email="ashishparadkar1999@gmail.com",
        purpose="CLI_TEST_VERIFY",
        provider="resend",
        provider_message_id="mock_test_msg_id",
        status="sent",
        error_details=""
    )
    print(f"  [OK] Email Delivery Event Recorded: id={event_id}")
    return True

def main():
    print("==================================================")
    print(" ALPHA ALGO TERMINAL - AUTH VERIFICATION SUITE")
    print("==================================================")
    
    success = True
    success = verify_db_and_admin() and success
    success = verify_email_service() and success
    success = verify_otp_challenge_lifecycle() and success
    success = verify_email_event_logging() and success
    
    print("\n--------------------------------------------------")
    if success:
        print("[RESULT] ALL 4 VERIFICATION STAGES PASSED SUCCESSFULLY!")
        print("==================================================")
        sys.exit(0)
    else:
        print("[RESULT] VERIFICATION FAILED.")
        print("==================================================")
        sys.exit(1)

if __name__ == "__main__":
    main()
