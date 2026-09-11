"""
Dhan HQ Broker Adapter & Indian Multi-Segment Execution Engine
==============================================================
Authoritative Broker Adapter for Dhan (Dhan HQ API v2).
Provides:
1. Dual-mode execution: PAPER (high-fidelity simulated fills with NSE STT/brokerage/taxes)
   and LIVE (official Dhan HQ REST & WebSocket APIs).
2. Official Header Authentication:
   - 'access-token': JWT / Partner token
   - 'client-id': Dhan 10-digit Client ID
3. Endpoints:
   - Profile: GET /v2/profile
   - Funds & Margins: GET /v2/fundlimit
   - Positions: GET /v2/positions
   - Orders: GET /v2/orders, POST /v2/orders, DELETE /v2/orders/{orderId}
4. Programmatic Funding Constraint:
   - Dhan HQ does NOT support programmatic fund transfers / deposits / withdrawals via REST API.
   - Programmatic funding returns 'FUNDING API UNAVAILABLE'.
   - Manual records are logged with full audit tracking.
"""

from __future__ import annotations

import json
import logging
import math
import os
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from src import config, db
from src.audit import log_bot_event
from src.capital_service import capital_accounting_service
from src.market_data.interfaces import (
    AssetClass,
    BrokerAdapter,
    BrokerCapability,
    ProviderStatus,
)
from src.secrets_manager import SecretsManager

logger = logging.getLogger("DhanBrokerAdapter")


class DhanBrokerAdapter(BrokerAdapter):
    """
    Authoritative broker adapter for Dhan HQ API v2.
    """

    @property
    def base_url(self) -> str:
        env_url = (os.getenv("DHAN_BASE_URL") or getattr(config, "DHAN_BASE_URL", "") or "").strip()
        if env_url:
            return env_url.rstrip("/")
        is_sandbox = (
            os.getenv("DHAN_SANDBOX", "").lower() in ("true", "1", "yes")
            or os.getenv("DHAN_ENV", "").upper() == "SANDBOX"
            or getattr(config, "DHAN_SANDBOX", False)
        )
        if is_sandbox:
            return "https://sandbox.dhan.co/v2"
        return "https://api.dhan.co/v2"

    def __init__(
        self,
        client_id: Optional[str] = None,
        access_token: Optional[str] = None,
        initial_capital: float = 1250000.0,
        base_currency: str = "INR",
        timeout_sec: float = 8.0,
    ):
        self.broker_id = "dhan"
        self.broker_name = "Dhan HQ API v2 Broker"
        self.base_currency = base_currency
        self.balance = float(initial_capital)
        self.available_margin = float(initial_capital)
        self.used_margin = 0.0
        self.timeout_sec = float(timeout_sec)
        self.positions: Dict[str, Dict[str, Any]] = {}
        self.orders: Dict[str, Dict[str, Any]] = {}

        self.secrets_mgr = SecretsManager()
        self.client_id = (client_id or getattr(config, "DHAN_CLIENT_ID", "") or os.getenv("DHAN_CLIENT_ID", "") or "").strip()
        self.access_token = (access_token or getattr(config, "DHAN_ACCESS_TOKEN", "") or os.getenv("DHAN_ACCESS_TOKEN", "") or "").strip()
        self._load_credentials_from_vault()

        self._auth_failed = False

        self._capability = BrokerCapability(
            broker_id=self.broker_id,
            broker_name=self.broker_name,
            supported_countries=["India"],
            supported_exchanges=["NSE", "BSE", "MCX", "NFO"],
            supported_asset_classes=["INDIAN_EQUITIES", "INDIAN_INDICES", "OPTIONS", "FUTURES", "COMMODITIES"],
            market_data_availability="LIVE",
            historical_data_availability="LIVE",
            option_chain_availability="LIVE",
            greeks_availability="ANALYTICAL_BS",
            paper_trading_availability=True,
            live_trading_availability=True,
            multileg_order_support=True,
            basket_order_support=True,
            supported_order_types=["MARKET", "LIMIT", "STOP_LOSS", "STOP_LOSS_MARKET"],
            supported_time_in_force=["DAY", "IOC"],
            margin_api_availability=True,
            position_api_availability=True,
            exercise_assignment_support=True,
            required_subscriptions=[],
            last_heartbeat_utc=datetime.now(timezone.utc).isoformat(),
            last_quote_utc=datetime.now(timezone.utc).isoformat(),
            status=ProviderStatus.LIVE if (self.is_authenticated and not self._auth_failed) else ProviderStatus.PAPER_ONLY,
        )

    def _load_credentials_from_vault(self) -> None:
        """Loads encrypted API credentials from SQLite broker_credentials if available."""
        if self.access_token:
            return
        try:
            creds = db.safe_query(
                "SELECT encrypted_api_key, encrypted_secret_key FROM broker_credentials WHERE provider_id = 'dhan' AND status = 'CONNECTED' ORDER BY last_validated_at DESC LIMIT 1"
            )
            if creds:
                dec_cid = self.secrets_mgr.decrypt_secret(creds[0].get("encrypted_api_key", ""))
                dec_token = self.secrets_mgr.decrypt_secret(creds[0].get("encrypted_secret_key", ""))
                if dec_cid:
                    self.client_id = dec_cid
                if dec_token:
                    self.access_token = dec_token
        except Exception as e:
            logger.debug(f"Dhan vault load note: {e}")

    @property
    def is_authenticated(self) -> bool:
        return bool(self.access_token) and not getattr(self, "_auth_failed", False)

    @property
    def auth_status(self) -> str:
        if getattr(self, "_auth_failed", False):
            return "AUTH_FAILED"
        return "AUTHENTICATED" if bool(self.access_token) else "NOT_CONFIGURED"

    def get_capability(self) -> BrokerCapability:
        self._capability.last_heartbeat_utc = datetime.now(timezone.utc).isoformat()
        self._capability.status = ProviderStatus.LIVE if self.is_authenticated else ProviderStatus.PAPER_ONLY
        return self._capability

    def _make_request(
        self,
        method: str,
        path: str,
        data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Makes an authenticated HTTP request to Dhan HQ API v2 / Sandbox.
        """
        if not self.access_token:
            return {"status": "error", "error": "DHAN_CREDENTIALS_MISSING", "message": "Dhan access token not configured."}
        if getattr(self, "_auth_failed", False):
            return {"status": "error", "error": "AUTH_FAILED", "message": "Dhan authentication failed previously. Live execution locked."}

        url = f"{self.base_url}/{path.lstrip('/')}"
        headers = {
            "access-token": self.access_token,
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        if self.client_id:
            headers["client-id"] = self.client_id

        body_bytes = None
        if data is not None and method.upper() in ["POST", "PUT", "PATCH"]:
            body_bytes = json.dumps(data).encode("utf-8")

        req = urllib.request.Request(url, data=body_bytes, headers=headers, method=method.upper())
        try:
            from src.ssl_util import get_ssl_context
            ssl_ctx = get_ssl_context()
            with urllib.request.urlopen(req, timeout=self.timeout_sec, context=ssl_ctx) as resp:
                resp_text = resp.read().decode("utf-8")
                return json.loads(resp_text)
        except urllib.error.HTTPError as he:
            err_body = he.read().decode("utf-8") if he.fp else ""
            logger.error(f"Dhan API HTTP error {he.code} for {url}: {err_body}")
            if he.code in [401, 403]:
                self._auth_failed = True
                log_bot_event(
                    event_type="DHAN_AUTH_FAILED",
                    status="FAILED",
                    severity="CRITICAL",
                    message=f"Dhan API returned HTTP {he.code} Unauthorized. Broker state locked to AUTH_FAILED."
                )
            try:
                err_json = json.loads(err_body)
                err_json["http_code"] = he.code
                if he.code in [401, 403]:
                    err_json["broker_status"] = "AUTH_FAILED"
                return err_json
            except Exception:
                return {"status": "error", "http_code": he.code, "message": str(he), "broker_status": "AUTH_FAILED" if he.code in [401, 403] else "ERROR"}
        except Exception as exc:
            logger.error(f"Dhan API request failed: {exc}")
            return {"status": "error", "message": str(exc)}

    # =========================================================================
    # ACCOUNT & BALANCES
    # =========================================================================

    def get_fund_limits(self) -> Dict[str, Any]:
        """
        Fetches live funds, collateral, and margin limits directly from Dhan HQ API v2.
        Endpoint: GET /v2/fundlimit
        """
        if not self.is_authenticated:
            return {"status": "error", "error": "DHAN_NOT_CONFIGURED", "message": "Dhan credentials not configured."}
        resp = self._make_request("GET", "fundlimit")
        return resp

    def get_profile(self) -> Dict[str, Any]:
        """
        Fetches user profile details from Dhan HQ API v2.
        Endpoint: GET /v2/profile
        """
        if not self.is_authenticated:
            return {"status": "error", "error": "DHAN_NOT_CONFIGURED", "message": "Dhan credentials not configured."}
        return self._make_request("GET", "profile")

    def get_holdings(self) -> List[Dict[str, Any]]:
        """
        Fetches equity portfolio holdings from Dhan HQ API v2.
        Gracefully catches DH-1111 ('No holdings available') and returns an empty list.
        Endpoint: GET /v2/holdings
        """
        if not self.is_authenticated:
            return []
        resp = self._make_request("GET", "holdings")
        if isinstance(resp, list):
            return resp
        if isinstance(resp, dict):
            # Check for empty holdings response code DH-1111
            err_code = resp.get("errorCode", "")
            err_msg = str(resp.get("errorMessage", "")).lower()
            if err_code == "DH-1111" or "no holdings" in err_msg or "not found" in err_msg:
                return []
            if "data" in resp and isinstance(resp["data"], list):
                return resp["data"]
        return []

    def get_account_summary(self) -> Dict[str, Any]:
        trading_mode = getattr(config, "TRADING_MODE", "PAPER").upper()
        if trading_mode == "LIVE" and self.is_authenticated:
            funds_resp = self._make_request("GET", "fundlimit")
            if funds_resp and ("availabelBalance" in funds_resp or "availMargin" in funds_resp):
                avail = float(funds_resp.get("availMargin") or funds_resp.get("availabelBalance") or 0.0)
                used = float(funds_resp.get("utilizedAmount") or 0.0)
                total = avail + used
                return {
                    "broker_id": self.broker_id,
                    "broker_name": self.broker_name,
                    "currency": self.base_currency,
                    "cash_balance": round(avail, 2),
                    "available_margin": round(avail, 2),
                    "used_margin": round(used, 2),
                    "total_equity": round(total, 2),
                    "open_positions_count": len(self.positions),
                    "mode": "LIVE",
                    "status": "HEALTHY",
                    "funding_api_supported": False,
                }

        # Authoritative PAPER mode or fallback
        cb = capital_accounting_service.get_capital_breakdown(
            broker_account_id="ba_dhan_primary",
            environment=trading_mode,
            currency="INR"
        )
        return {
            "broker_id": self.broker_id,
            "broker_name": self.broker_name,
            "currency": self.base_currency,
            "cash_balance": cb.broker_cash,
            "available_margin": cb.available_margin,
            "used_margin": cb.used_margin,
            "total_equity": cb.broker_balance,
            "open_positions_count": len(self.positions),
            "mode": trading_mode,
            "status": cb.status,
            "funding_api_supported": False,
        }

    # =========================================================================
    # FUNDING API ENFORCEMENT
    # =========================================================================

    def deposit_funds(self, amount: float, **kwargs) -> Dict[str, Any]:
        """
        Dhan HQ official API does not support programmatic fund transfers.
        Explicitly returns 'FUNDING API UNAVAILABLE'.
        """
        return {
            "status": "UNSUPPORTED",
            "code": "FUNDING_API_UNAVAILABLE",
            "message": "Dhan HQ does not support programmatic deposits via REST API. Please use official Dhan portal/app and record a verified audit entry.",
            "broker_id": self.broker_id,
            "supported": False
        }

    def withdraw_funds(self, amount: float, **kwargs) -> Dict[str, Any]:
        """
        Dhan HQ official API does not support programmatic withdrawals.
        """
        return {
            "status": "UNSUPPORTED",
            "code": "FUNDING_API_UNAVAILABLE",
            "message": "Dhan HQ does not support programmatic withdrawals via REST API. Please use official Dhan portal/app.",
            "broker_id": self.broker_id,
            "supported": False
        }

    # =========================================================================
    # ORDERS & POSITIONS
    # =========================================================================

    def get_positions(self) -> List[Dict[str, Any]]:
        trading_mode = getattr(config, "TRADING_MODE", "PAPER").upper()
        if trading_mode == "LIVE" and self.is_authenticated:
            resp = self._make_request("GET", "positions")
            if isinstance(resp, list):
                return resp
            if isinstance(resp, dict) and "data" in resp:
                return resp["data"]
        return list(self.positions.values())

    def get_orders(self) -> List[Dict[str, Any]]:
        trading_mode = getattr(config, "TRADING_MODE", "PAPER").upper()
        if trading_mode == "LIVE" and self.is_authenticated:
            resp = self._make_request("GET", "orders")
            if isinstance(resp, list):
                return resp
            if isinstance(resp, dict) and "data" in resp:
                return resp["data"]
        return list(self.orders.values())

    def get_trades(self) -> List[Dict[str, Any]]:
        """
        Fetches trade execution history from Dhan HQ API v2.
        Endpoint: GET /v2/trades
        """
        trading_mode = getattr(config, "TRADING_MODE", "PAPER").upper()
        if trading_mode == "LIVE" and self.is_authenticated:
            resp = self._make_request("GET", "trades")
            if isinstance(resp, list):
                return resp
            if isinstance(resp, dict) and "data" in resp:
                return resp["data"]
        return []

    def modify_order(
        self,
        order_id: str,
        order_type: str = "LIMIT",
        quantity: Optional[int] = None,
        price: Optional[float] = None,
        trigger_price: Optional[float] = None,
        validity: str = "DAY"
    ) -> Dict[str, Any]:
        """
        Modifies a pending order on Dhan HQ API v2.
        Endpoint: PUT /v2/orders/{orderId}
        """
        is_live_allowed = (
            getattr(config, "TRADING_MODE", "PAPER").upper() == "LIVE"
            and getattr(config, "LIVE_TRADING_ENABLED", False) is True
            and getattr(config, "DHAN_TRADING_ENABLED", False) is True
            and not getattr(config, "DHAN_PAPER_MODE", True)
            and self.is_authenticated
        )
        if is_live_allowed:
            payload = {
                "dhanClientId": self.client_id,
                "orderId": order_id,
                "orderType": order_type.upper(),
                "validity": validity.upper(),
            }
            if quantity is not None:
                payload["quantity"] = int(quantity)
            if price is not None:
                payload["price"] = float(price)
            if trigger_price is not None:
                payload["triggerPrice"] = float(trigger_price)
            return self._make_request("PUT", f"orders/{order_id}", payload)

        if order_id in self.orders:
            if price is not None:
                self.orders[order_id]["price"] = price
            if quantity is not None:
                self.orders[order_id]["quantity"] = quantity
            return {"status": "SUCCESS", "order_id": order_id, "mode": "PAPER"}
        return {"status": "FAILED", "error": "ORDER_NOT_FOUND"}

    def get_market_feed_ltp(self, instruments_map: Dict[str, List[int]]) -> Dict[str, Any]:
        """
        Fetches Last Traded Price (LTP) from Dhan HQ Marketfeed API.
        Endpoint: POST /v2/marketfeed/ltp
        Example: {"NSE_EQ": [1333, 11536]}
        """
        if not self.is_authenticated:
            return {"status": "error", "message": "Dhan credentials not configured"}
        return self._make_request("POST", "marketfeed/ltp", instruments_map)

    def store_credentials_in_vault(
        self,
        client_id: str = "",
        access_token: str = "",
        base_url: Optional[str] = None,
        is_sandbox: Optional[bool] = None,
    ) -> Dict[str, Any]:
        """
        Securely encrypts and stores Dhan credentials in database vault.
        """
        self.client_id = (client_id or "").strip()
        self.access_token = (access_token or "").strip()
        if is_sandbox is not None:
            os.environ["DHAN_SANDBOX"] = "true" if is_sandbox else "false"
            setattr(config, "DHAN_SANDBOX", bool(is_sandbox))
        if base_url:
            os.environ["DHAN_BASE_URL"] = base_url.strip()
            setattr(config, "DHAN_BASE_URL", base_url.strip())
        elif is_sandbox:
            os.environ["DHAN_BASE_URL"] = "https://sandbox.dhan.co/v2"
            setattr(config, "DHAN_BASE_URL", "https://sandbox.dhan.co/v2")

        res = self.secrets_mgr.store_credential(
            provider_id="dhan",
            account_name="Dhan HQ Sandbox" if "sandbox" in self.base_url.lower() else "Dhan HQ Primary",
            api_key=self.client_id or "DHAN_CLIENT",
            secret_key=self.access_token,
            allow_read=True,
            allow_trade=True,
            allow_withdraw=False
        )
        return res

    def reauthenticate(
        self,
        client_id: str,
        access_token: str,
        base_url: Optional[str] = None,
        is_sandbox: Optional[bool] = None,
    ) -> Dict[str, Any]:
        """
        Re-authenticates Dhan credentials, tests connectivity with Dhan HQ,
        and clears AUTH_FAILED lock on success.
        """
        self.client_id = (client_id or "").strip()
        self.access_token = (access_token or "").strip()
        self._auth_failed = False

        if is_sandbox is not None:
            os.environ["DHAN_SANDBOX"] = "true" if is_sandbox else "false"
            setattr(config, "DHAN_SANDBOX", bool(is_sandbox))
        if base_url:
            os.environ["DHAN_BASE_URL"] = base_url.strip()
            setattr(config, "DHAN_BASE_URL", base_url.strip())

        # Test credentials against profile endpoint
        test_res = self._make_request("GET", "profile")
        if test_res.get("status") == "error" or test_res.get("broker_status") == "AUTH_FAILED" or test_res.get("http_code") in (401, 403):
            self._auth_failed = True
            return {
                "success": False,
                "status": "AUTH_FAILED",
                "message": test_res.get("message", "Dhan authentication failed with HTTP 401 Unauthorized."),
                "error": "AUTH_FAILED"
            }

        # Store in vault
        self.store_credentials_in_vault(self.client_id, self.access_token, base_url, is_sandbox)
        self._auth_failed = False
        log_bot_event(
            event_type="DHAN_REAUTHENTICATED",
            status="SUCCESS",
            severity="INFO",
            message="Dhan credentials validated and re-authenticated successfully. Trading unlocked."
        )
        return {
            "success": True,
            "status": "AUTHENTICATED",
            "message": "Dhan credentials validated and re-authenticated successfully.",
            "profile": test_res
        }

    def place_order(
        self,
        symbol: str,
        side: str,
        quantity: float,
        order_type: str = "MARKET",
        price: Optional[float] = None,
        stop_loss: Optional[float] = None,
        take_profit: Optional[float] = None,
        client_order_id: Optional[str] = None,
        tag: str = "QUANT_OS",
        **kwargs
    ) -> Dict[str, Any]:
        """
        Executes order routing. Enforces PAPER mode by default.
        """
        order_id = client_order_id or f"DHAN-{uuid.uuid4().hex[:8].upper()}"
        now_str = datetime.now(timezone.utc).isoformat()

        # Fail-closed guard: Dhan authentication failed
        if getattr(self, "_auth_failed", False):
            return {
                "success": False,
                "status": "FAILED",
                "error": "DHAN_AUTH_FAILED",
                "code": "AUTH_FAILED",
                "message": "Dhan authentication required. Previous API call returned 401 Unauthorized. Trading is locked.",
                "order_id": order_id
            }

        # Strict safety guard: Live broker execution is locked unless all live flags are explicitly True
        is_live_allowed = (
            getattr(config, "TRADING_MODE", "PAPER").upper() == "LIVE"
            and getattr(config, "LIVE_TRADING_ENABLED", False) is True
            and getattr(config, "DHAN_TRADING_ENABLED", False) is True
            and not getattr(config, "DHAN_PAPER_MODE", True)
            and self.is_authenticated
        )

        if is_live_allowed:
            payload = {
                "dhanClientId": self.client_id,
                "correlationId": order_id,
                "transactionType": "BUY" if side.upper() == "BUY" else "SELL",
                "exchangeSegment": kwargs.get("segment", "NSE_EQ"),
                "productType": kwargs.get("product", "INTRADAY"),
                "orderType": order_type.upper(),
                "validity": "DAY",
                "tradingSymbol": symbol,
                "securityId": str(kwargs.get("security_id", "")),
                "quantity": int(quantity),
                "price": float(price or 0.0),
                "triggerPrice": float(stop_loss or 0.0),
                "afterMarketOrder": False
            }
            res = self._make_request("POST", "orders", payload)
            return {
                "order_id": order_id,
                "broker_order_id": res.get("orderId", ""),
                "status": "SUBMITTED" if res.get("orderStatus") else "FAILED",
                "symbol": symbol,
                "side": side,
                "quantity": quantity,
                "mode": "LIVE",
                "raw_response": res
            }

        # Simulated Paper Execution with Realistic Indian Brokerage (₹20 or 0.05%)
        fill_price = price or 1000.0
        notional = fill_price * quantity
        brokerage_fee = min(20.0, max(0.0, notional * 0.0003))
        stt_tax = round(notional * 0.001, 2) if side.upper() == "SELL" else 0.0
        gst = round(brokerage_fee * 0.18, 2)
        total_fees = round(brokerage_fee + stt_tax + gst, 2)

        order_record = {
            "order_id": order_id,
            "broker_order_id": f"SIM-DHAN-{order_id}",
            "symbol": symbol,
            "side": side.upper(),
            "quantity": quantity,
            "order_type": order_type,
            "price": fill_price,
            "status": "FILLED",
            "fees": total_fees,
            "brokerage": brokerage_fee,
            "taxes": stt_tax + gst,
            "currency": "INR",
            "created_at": now_str,
            "mode": "PAPER"
        }
        self.orders[order_id] = order_record

        # Log expense into append-only brokerage ledger
        capital_accounting_service.record_brokerage_expense(
            customer_id="cust_default",
            department_id="dept_algo_trading",
            broker_folder_id="bf_dhan",
            broker_account_id="ba_dhan_primary",
            expense_type="BROKERAGE",
            amount=total_fees,
            currency="INR",
            provider="dhan",
            order_id=order_id,
            source="DHAN_SIMULATOR"
        )

        return order_record

    def cancel_order(self, order_id: str) -> Dict[str, Any]:
        is_live_allowed = (
            getattr(config, "TRADING_MODE", "PAPER").upper() == "LIVE"
            and getattr(config, "LIVE_TRADING_ENABLED", False) is True
            and getattr(config, "DHAN_TRADING_ENABLED", False) is True
            and not getattr(config, "DHAN_PAPER_MODE", True)
            and self.is_authenticated
        )
        if is_live_allowed:
            res = self._make_request("DELETE", f"orders/{order_id}")
            success = bool(res.get("orderStatus") == "CANCELLED" or res.get("status") == "success")
            return {"success": success, "order_id": order_id, "status": "CANCELLED" if success else "FAILED", "raw": res}
        if order_id in self.orders:
            self.orders[order_id]["status"] = "CANCELLED"
            return {"success": True, "order_id": order_id, "status": "CANCELLED"}
        return {"success": False, "order_id": order_id, "error": "ORDER_NOT_FOUND"}

    def place_multileg_order(self, order_payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes multileg options/spread order on Dhan or simulator.
        """
        is_live_allowed = (
            getattr(config, "TRADING_MODE", "PAPER").upper() == "LIVE"
            and getattr(config, "LIVE_TRADING_ENABLED", False) is True
            and getattr(config, "DHAN_TRADING_ENABLED", False) is True
            and not getattr(config, "DHAN_PAPER_MODE", True)
            and self.is_authenticated
        )
        basket_id = f"DHAN-BASKET-{uuid.uuid4().hex[:8].upper()}"
        legs = order_payload.get("legs", [])
        results = []

        for leg in legs:
            sym = leg.get("symbol", "")
            side = leg.get("side", "BUY")
            qty = float(leg.get("quantity", 1))
            res = self.place_order(symbol=sym, side=side, quantity=qty, order_type="MARKET")
            results.append(res)

        return {
            "success": True,
            "basket_id": basket_id,
            "mode": trading_mode,
            "legs_count": len(legs),
            "results": results,
            "status": "FILLED" if trading_mode == "PAPER" else "SUBMITTED"
        }

    def square_off_position(self, position_id: str) -> Dict[str, Any]:
        """
        Closes out an open position by routing an opposite market order.
        """
        if position_id in self.positions:
            pos = self.positions.pop(position_id)
            opp_side = "SELL" if pos.get("side", "").upper() == "BUY" else "BUY"
            res = self.place_order(symbol=pos.get("symbol", ""), side=opp_side, quantity=float(pos.get("quantity", 1)))
    def get_option_chain(
        self,
        underlying: str = "NIFTY",
        expiry: Optional[str] = None,
        strike_count: int = 20,
    ) -> Dict[str, Any]:
        """
        Fetches official Option Chain data from Dhan HQ API v2.
        Endpoint: POST /v2/optionchain
        """
        if not self.is_authenticated:
            return {"status": "error", "error": "DHAN_CREDENTIALS_MISSING", "message": "Dhan credentials not configured"}

        scrip_map = {
            "NIFTY": {"scrip": 13, "seg": "IDX_I"},
            "BANKNIFTY": {"scrip": 25, "seg": "IDX_I"},
            "FINNIFTY": {"scrip": 27, "seg": "IDX_I"},
            "MIDCPNIFTY": {"scrip": 44, "seg": "IDX_I"},
            "SENSEX": {"scrip": 51, "seg": "IDX_I"},
            "BANKEX": {"scrip": 52, "seg": "IDX_I"},
            "RELIANCE": {"scrip": 2885, "seg": "NSE_EQ"},
            "TCS": {"scrip": 11536, "seg": "NSE_EQ"},
            "INFY": {"scrip": 1594, "seg": "NSE_EQ"},
            "HDFCBANK": {"scrip": 1333, "seg": "NSE_EQ"},
            "ICICIBANK": {"scrip": 4963, "seg": "NSE_EQ"},
            "SBIN": {"scrip": 3045, "seg": "NSE_EQ"},
            "BHARTIARTL": {"scrip": 10604, "seg": "NSE_EQ"},
            "ITC": {"scrip": 1660, "seg": "NSE_EQ"},
            "LT": {"scrip": 11483, "seg": "NSE_EQ"},
        }
        und_key = underlying.upper().replace(" ", "").replace(".NS", "")
        scrip_info = scrip_map.get(und_key, {"scrip": 13, "seg": "IDX_I"})

        # 1. Fetch available expiries from Dhan if not provided or to populate expiry list
        exp_list: List[str] = []
        try:
            exp_resp = self._make_request("POST", "optionchain/expirylist", data={
                "UnderlyingScrip": scrip_info["scrip"],
                "UnderlyingSeg": scrip_info["seg"],
            })
            if isinstance(exp_resp, dict) and "data" in exp_resp and isinstance(exp_resp["data"], list):
                exp_list = exp_resp["data"]
        except Exception as e:
            logger.warning(f"Dhan expirylist error: {e}")

        chosen_expiry = expiry or (exp_list[0] if exp_list else "")
        if not chosen_expiry:
            chosen_expiry = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        # 2. Query Dhan Option Chain
        payload = {
            "UnderlyingScrip": scrip_info["scrip"],
            "UnderlyingSeg": scrip_info["seg"],
            "Expiry": chosen_expiry,
        }

        resp = self._make_request("POST", "optionchain", data=payload)
        if not isinstance(resp, dict) or resp.get("status") == "failed" or "data" not in resp:
            return resp

        data = resp.get("data", {})
        spot_price = float(data.get("last_price", 0.0))
        raw_oc = data.get("oc", {})

        # 3. Transform raw Dhan OC map into structured strikes ladder
        strikes: List[Dict[str, Any]] = []
        for strike_str, strike_data in raw_oc.items():
            try:
                k = float(strike_str)
            except (ValueError, TypeError):
                continue

            ce_raw = strike_data.get("ce", {}) or {}
            pe_raw = strike_data.get("pe", {}) or {}

            is_atm = abs(k - spot_price) <= (spot_price * 0.005) if spot_price > 0 else False
            dist_pct = round(((k - spot_price) / spot_price) * 100.0, 2) if spot_price > 0 else 0.0

            ce_greeks = ce_raw.get("greeks", {}) or {}
            pe_greeks = pe_raw.get("greeks", {}) or {}

            strikes.append({
                "strike": k,
                "is_atm": is_atm,
                "distance_pct": dist_pct,
                "ce": {
                    "instrument_id": f"DHAN_{ce_raw.get('security_id', '')}",
                    "symbol": f"{und_key} {chosen_expiry} {int(k)} CE",
                    "ltp": float(ce_raw.get("last_price") or ce_raw.get("top_bid_price") or 0.0),
                    "bid": float(ce_raw.get("top_bid_price") or 0.0),
                    "ask": float(ce_raw.get("top_ask_price") or 0.0),
                    "volume": float(ce_raw.get("volume") or 0.0),
                    "open_interest": float(ce_raw.get("oi") or 0.0),
                    "oi_change": float(ce_raw.get("oi", 0) - ce_raw.get("previous_oi", 0)),
                    "iv": float(ce_raw.get("implied_volatility") or 0.0),
                    "delta": float(ce_greeks.get("delta") or 0.0),
                    "gamma": float(ce_greeks.get("gamma") or 0.0),
                    "theta": float(ce_greeks.get("theta") or 0.0),
                    "vega": float(ce_greeks.get("vega") or 0.0),
                    "security_id": str(ce_raw.get("security_id", "")),
                },
                "pe": {
                    "instrument_id": f"DHAN_{pe_raw.get('security_id', '')}",
                    "symbol": f"{und_key} {chosen_expiry} {int(k)} PE",
                    "ltp": float(pe_raw.get("last_price") or pe_raw.get("top_bid_price") or 0.0),
                    "bid": float(pe_raw.get("top_bid_price") or 0.0),
                    "ask": float(pe_raw.get("top_ask_price") or 0.0),
                    "volume": float(pe_raw.get("volume") or 0.0),
                    "open_interest": float(pe_raw.get("oi") or 0.0),
                    "oi_change": float(pe_raw.get("oi", 0) - pe_raw.get("previous_oi", 0)),
                    "iv": float(pe_raw.get("implied_volatility") or 0.0),
                    "delta": float(pe_greeks.get("delta") or 0.0),
                    "gamma": float(pe_greeks.get("gamma") or 0.0),
                    "theta": float(pe_greeks.get("theta") or 0.0),
                    "vega": float(pe_greeks.get("vega") or 0.0),
                    "security_id": str(pe_raw.get("security_id", "")),
                }
            })

        # Sort strikes ascending
        strikes.sort(key=lambda x: x["strike"])

        # Filter strike count around spot if requested
        if strike_count and strike_count > 0 and len(strikes) > strike_count:
            atm_idx = min(range(len(strikes)), key=lambda i: abs(strikes[i]["strike"] - spot_price))
            half = strike_count // 2
            start_idx = max(0, atm_idx - half)
            end_idx = min(len(strikes), start_idx + strike_count)
            if end_idx - start_idx < strike_count:
                start_idx = max(0, end_idx - strike_count)
            strikes = strikes[start_idx:end_idx]

        return {
            "status": "success",
            "provider": "DHAN",
            "underlying": und_key,
            "spot_price": spot_price,
            "selected_expiry": chosen_expiry,
            "expiry_dates": exp_list,
            "strikes": strikes,
            "strike_count": len(strikes),
        }


# Global singleton adapter
dhan_broker_adapter = DhanBrokerAdapter()

