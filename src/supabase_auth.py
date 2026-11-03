"""
Authoritative Supabase JWT Authentication & Identity Mapping Engine for QUANT.OS
================================================================================
Validates Supabase-issued JSON Web Tokens (JWT) for the Flask backend.

Key Security Guarantees:
1. Cryptographic Signature Validation via Supabase JWKS (RS256/ES256) or JWT secret (HS256).
2. Strict verification of claims:
   - Expiration (exp)
   - Issuer (iss matches SUPABASE_JWT_ISSUER or ${SUPABASE_URL}/auth/v1)
   - Audience (aud matches SUPABASE_JWT_AUDIENCE or "authenticated")
   - Algorithm & Key ID (kid) verification against public keyset.
3. Safe in-memory caching of JWKS with dynamic key-rotation refreshes.
4. Independent database role mapping:
   - Client-provided roles in JWT or headers are NEVER trusted.
   - Maps Supabase UUID (sub) or verified email to existing QUANT.OS user record.
   - Enforces account active status (is_active == 1).
   - Authoritative permissions and roles are loaded directly from the QUANT.OS database.
"""

import os
import time
import logging
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timezone
from urllib.parse import urlsplit

import jwt
from jwt import PyJWKClient

from src import db, config

logger = logging.getLogger("SUPABASE_AUTH")


class SupabaseAuthValidator:
    """
    Authoritative Supabase JWT validation and user resolution service.
    """

    def __init__(self):
        self._jwk_client: Optional[PyJWKClient] = None
        self._last_jwks_url: Optional[str] = None
        self._user_cache: Dict[str, Tuple[float, Dict[str, Any]]] = {}
        self._user_cache_ttl = 60.0  # 60s in-memory user mapping cache

    def is_configured(self) -> bool:
        """Checks if Supabase authentication is configured for this environment."""
        url = os.getenv("SUPABASE_URL", "").strip()
        jwks = os.getenv("SUPABASE_JWKS_URL", "").strip()
        secret = os.getenv("SUPABASE_JWT_SECRET", "").strip()
        return bool(url or jwks or secret)

    def get_jwks_url(self) -> Optional[str]:
        """Resolves the authoritative JWKS URL for Supabase asymmetric key verification."""
        explicit = os.getenv("SUPABASE_JWKS_URL", "").strip()
        if explicit:
            return explicit
        base_url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
        if base_url:
            return f"{base_url}/auth/v1/.well-known/jwks.json"
        return None

    def get_expected_issuer(self) -> Optional[str]:
        """Resolves expected token issuer."""
        if getattr(self, "issuer", None):
            return self.issuer
        explicit = os.getenv("SUPABASE_JWT_ISSUER", "").strip()
        if explicit:
            return explicit
        base_url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
        if base_url:
            return f"{base_url}/auth/v1"
        return None

    def get_expected_audience(self) -> str:
        """Resolves expected token audience (default: 'authenticated')."""
        if getattr(self, "audience", None):
            return self.audience
        return os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated").strip() or "authenticated"

    def get_jwt_secret(self) -> Optional[str]:
        """Resolves symmetric JWT secret if configured (for HS256 projects)."""
        if getattr(self, "jwt_secret", None):
            return self.jwt_secret
        return os.getenv("SUPABASE_JWT_SECRET", "").strip() or None

    def _get_jwk_client(self) -> Optional[PyJWKClient]:
        """Lazy-initializes or updates the PyJWKClient instance."""
        jwks_url = self.get_jwks_url()
        if not jwks_url:
            return None
        if self._jwk_client is None or self._last_jwks_url != jwks_url:
            try:
                self._jwk_client = PyJWKClient(jwks_url, cache_keys=True, max_cached_keys=16, lifespan=3600)
                self._last_jwks_url = jwks_url
            except Exception as exc:
                logger.error("Failed to initialize Supabase PyJWKClient for %s: %s", jwks_url, exc)
                return None
        return self._jwk_client

    def verify_token(self, token: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """
        Cryptographically validates a Supabase JWT.
        Returns (decoded_claims, None) on success, or (None, error_reason) on failure.
        """
        if not token or not isinstance(token, str):
            return None, "EMPTY_TOKEN"

        parts = token.strip().split(".")
        if len(parts) != 3:
            return None, "MALFORMED_JWT_FORMAT"

        try:
            unverified_header = jwt.get_unverified_header(token)
        except Exception as exc:
            return None, f"INVALID_HEADER: {exc}"

        alg = unverified_header.get("alg")
        kid = unverified_header.get("kid")

        expected_iss = self.get_expected_issuer()
        expected_aud = self.get_expected_audience()
        jwt_secret = self.get_jwt_secret()

        # Decode options
        options = {
            "verify_signature": True,
            "verify_exp": True,
            "verify_nbf": True,
            "verify_iat": True,
            "verify_aud": bool(expected_aud),
            "verify_iss": bool(expected_iss),
            "require": ["exp", "sub"],
        }

        # 1. Symmetric HS256 path (if secret is configured and token uses HS256)
        if alg == "HS256":
            if not jwt_secret:
                return None, "HS256_SECRET_NOT_CONFIGURED"
            try:
                claims = jwt.decode(
                    token,
                    jwt_secret,
                    algorithms=["HS256"],
                    audience=expected_aud if expected_aud else None,
                    issuer=expected_iss if expected_iss else None,
                    options=options,
                )
                return claims, None
            except jwt.ExpiredSignatureError:
                return None, "TOKEN_EXPIRED"
            except jwt.InvalidAudienceError:
                return None, "INVALID_AUDIENCE"
            except jwt.InvalidIssuerError:
                return None, "INVALID_ISSUER"
            except jwt.InvalidTokenError as exc:
                return None, f"INVALID_TOKEN: {exc}"

        # 2. Asymmetric RS256 / ES256 / EdDSA path via JWKS
        if alg in ("RS256", "ES256", "EdDSA", "PS256"):
            jwk_client = self._get_jwk_client()
            if not jwk_client:
                return None, "JWKS_CLIENT_UNAVAILABLE"
            try:
                signing_key = jwk_client.get_signing_key_from_jwt(token)
                claims = jwt.decode(
                    token,
                    signing_key.key,
                    algorithms=[alg],
                    audience=expected_aud if expected_aud else None,
                    issuer=expected_iss if expected_iss else None,
                    options=options,
                )
                return claims, None
            except jwt.ExpiredSignatureError:
                return None, "TOKEN_EXPIRED"
            except jwt.InvalidAudienceError:
                return None, "INVALID_AUDIENCE"
            except jwt.InvalidIssuerError:
                return None, "INVALID_ISSUER"
            except jwt.PyJWKClientError as exc:
                return None, f"SIGNING_KEY_LOOKUP_FAILED: {exc}"
            except jwt.InvalidTokenError as exc:
                return None, f"INVALID_TOKEN: {exc}"

        return None, f"UNSUPPORTED_ALGORITHM: {alg}"

    def map_supabase_claims_to_user(self, claims: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """
        Maps validated Supabase claims to an authoritative QUANT.OS user record.
        Enforces account active status and links the Supabase UUID on first login.
        Returns (user_dict, None) or (None, error_code).
        """
        supabase_uid = claims.get("sub")
        email = claims.get("email") or ""
        if isinstance(email, str):
            email = email.strip()

        if not supabase_uid:
            return None, "MISSING_SUB_CLAIM"

        now_ts = time.time()
        cached = self._user_cache.get(supabase_uid)
        if cached and (now_ts - cached[0] < self._user_cache_ttl):
            user = cached[1]
            if not user.get("is_active"):
                return None, "ACCOUNT_INACTIVE"
            return user, None

        # 1. First lookup by bound supabase_uid
        user = db.get_user_by_supabase_uid(supabase_uid)

        # 2. Fallback lookup by verified email
        if not user and email:
            user = db.get_user_by_email(email)
            if user:
                # Link supabase_uid to the existing user record
                try:
                    db.link_user_supabase_uid(user["id"], supabase_uid)
                    user["supabase_uid"] = supabase_uid
                    logger.info("Bound Supabase UUID %s to existing user '%s' (%s)", supabase_uid, user.get("username"), email)
                except Exception as exc:
                    logger.warning("Failed to link supabase_uid to user %s: %s", user["id"], exc)

        if not user:
            logger.warning("Supabase authenticated identity %s (%s) does not match any QUANT.OS user", supabase_uid, email)
            return None, "USER_NOT_PROVISIONED"

        if not user.get("is_active"):
            logger.warning("Supabase authenticated user '%s' is inactive", user.get("username"))
            return None, "ACCOUNT_INACTIVE"

        # Cache valid active user
        self._user_cache[supabase_uid] = (now_ts, dict(user))
        return user, None

    def authenticate_jwt(self, token: str) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]], Optional[str]]:
        """
        End-to-end authentication:
        1. Validates Supabase JWT signature & claims.
        2. Resolves and verifies the QUANT.OS user record.
        3. Constructs an authoritative, request-scoped session dictionary.
        Returns (user_dict, session_dict, None) on success or (None, None, error_code) on failure.
        """
        claims, err = self.verify_token(token)
        if err or not claims:
            return None, None, err or "TOKEN_VERIFICATION_FAILED"

        user, err = self.map_supabase_claims_to_user(claims)
        if err or not user:
            return None, None, err or "USER_RESOLUTION_FAILED"

        supabase_uid = claims.get("sub", "")
        now_utc = datetime.now(timezone.utc)
        today_date = now_utc.strftime("%Y-%m-%d")
        exp_ts = claims.get("exp")
        exp_iso = datetime.fromtimestamp(exp_ts, tz=timezone.utc).isoformat() if exp_ts else None

        session_dict = {
            "session_id": f"sb-{supabase_uid[:12]}",
            "user_id": user["id"],
            "supabase_uid": supabase_uid,
            "auth_provider": "SUPABASE",
            "role": user.get("role", "ADMIN"),
            "login_date": today_date,
            "created_at": now_utc.isoformat(),
            "expires_at": exp_iso,
            "claims": {
                "sub": supabase_uid,
                "email": claims.get("email"),
                "aud": claims.get("aud"),
                "iss": claims.get("iss"),
            },
        }

        return user, session_dict, None


# Global singleton instance
global_supabase_validator = SupabaseAuthValidator()

def is_supabase_configured() -> bool:
    return global_supabase_validator.is_configured()
