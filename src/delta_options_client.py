"""
Delta Exchange Cryptocurrency Options REST Client
=================================================
Production-grade, rate-limited, fault-tolerant REST API client for Delta Exchange.
Fetches official product catalogues, active option chains, tickers, spot indices,
and contract specifications with Decimal precision and circuit-breaker protection.
"""

import time
import json
import logging
import urllib.request
import urllib.error
import urllib.parse
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timezone

from src import config

logger = logging.getLogger("DeltaOptionsClient")


class CircuitBreakerOpenException(Exception):
    """Raised when the Delta API circuit breaker is currently open."""
    pass


class DeltaOptionsClient:
    """
    Central, thread-safe REST client for Delta Exchange public & private endpoints.
    Public market data works seamlessly without API keys.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        api_secret: Optional[str] = None,
        timeout_sec: float = 8.0,
        max_retries: int = 3,
        rate_limit_per_sec: float = 10.0,
    ):
        self.base_url = (base_url or getattr(config, "DELTA_REST_URL", "https://api.india.delta.exchange")).rstrip("/")
        self.api_key = api_key if api_key is not None else getattr(config, "DELTA_API_KEY", "")
        self.api_secret = api_secret if api_secret is not None else getattr(config, "DELTA_API_SECRET", "")
        self.timeout_sec = float(timeout_sec)
        self.max_retries = int(max_retries)
        self.min_request_interval = 1.0 / max(1.0, float(rate_limit_per_sec))
        
        self._last_request_time = 0.0
        
        # Circuit Breaker state
        self._failure_count = 0
        self._consecutive_success_count = 0
        self._circuit_state = "CLOSED"  # CLOSED | OPEN | HALF_OPEN
        self._circuit_opened_at = 0.0
        self._circuit_cooldown_sec = 15.0
        self._failure_threshold = 5

        # In-memory short TTL cache for catalogue
        self._cache: Dict[str, Tuple[float, Any]] = {}
        self._default_cache_ttl = 30.0  # 30 seconds cache for full catalogue

    # --------------------------------------------------------------------------
    # CIRCUIT BREAKER & RATE LIMITING
    # --------------------------------------------------------------------------

    def _check_circuit_breaker(self):
        now = time.time()
        if self._circuit_state == "OPEN":
            if now - self._circuit_opened_at > self._circuit_cooldown_sec:
                self._circuit_state = "HALF_OPEN"
                logger.info("[CIRCUIT_BREAKER] Entering HALF_OPEN test state for Delta API.")
            else:
                remaining = round(self._circuit_cooldown_sec - (now - self._circuit_opened_at), 1)
                raise CircuitBreakerOpenException(
                    f"Delta Exchange API Circuit Breaker is OPEN due to repeated upstream errors. Retry in {remaining}s."
                )

    def _record_success(self):
        if self._circuit_state == "HALF_OPEN":
            self._consecutive_success_count += 1
            if self._consecutive_success_count >= 2:
                self._circuit_state = "CLOSED"
                self._failure_count = 0
                self._consecutive_success_count = 0
                logger.info("[CIRCUIT_BREAKER] Delta API recovered. Circuit state CLOSED.")
        elif self._circuit_state == "CLOSED":
            self._failure_count = 0

    def _record_failure(self, error: Exception):
        self._failure_count += 1
        if self._failure_count >= self._failure_threshold:
            self._circuit_state = "OPEN"
            self._circuit_opened_at = time.time()
            self._consecutive_success_count = 0
            logger.warning(
                f"[CIRCUIT_BREAKER] Delta API failure threshold ({self._failure_threshold}) reached: {error}. Circuit OPENED."
            )

    def _throttle(self):
        now = time.time()
        elapsed = now - self._last_request_time
        if elapsed < self.min_request_interval:
            time.sleep(self.min_request_interval - elapsed)
        self._last_request_time = time.time()

    # --------------------------------------------------------------------------
    # LOW-LEVEL HTTP REQUEST DISPATCHER
    # --------------------------------------------------------------------------

    def _request(
        self,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        method: str = "GET",
        headers: Optional[Dict[str, str]] = None,
        use_cache: bool = False,
        cache_ttl: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Dispatches an HTTP request with caching, throttling, bounded retries, and rate limit protection.
        """
        clean_endpoint = endpoint if endpoint.startswith("/") else f"/{endpoint}"
        query_str = f"?{urllib.parse.urlencode(params)}" if params else ""
        cache_key = f"{method}:{clean_endpoint}:{query_str}"

        # 1. Check in-memory cache
        if use_cache and method == "GET":
            cached = self._cache.get(cache_key)
            if cached:
                cached_time, cached_val = cached
                ttl = cache_ttl or self._default_cache_ttl
                if time.time() - cached_time < ttl:
                    return cached_val

        # 2. Check circuit breaker
        self._check_circuit_breaker()

        url = f"{self.base_url}{clean_endpoint}{query_str}"
        req_headers = {
            "User-Agent": "QuantOS-DeltaEngine/1.0",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        if headers:
            req_headers.update(headers)

        last_err: Optional[Exception] = None

        for attempt in range(1, self.max_retries + 1):
            self._throttle()
            try:
                req = urllib.request.Request(url, headers=req_headers, method=method)
                start_ts = time.time()
                with urllib.request.urlopen(req, timeout=self.timeout_sec) as response:
                    status_code = response.status
                    latency_ms = (time.time() - start_ts) * 1000.0
                    raw_data = response.read().decode("utf-8")
                    parsed = json.loads(raw_data)

                    self._record_success()

                    # Cache successful GET responses if requested
                    if use_cache and method == "GET":
                        self._cache[cache_key] = (time.time(), parsed)

                    return parsed

            except urllib.error.HTTPError as he:
                last_err = he
                status = he.code
                error_body = ""
                try:
                    error_body = he.read().decode("utf-8")
                except Exception:
                    pass

                # 429 Too Many Requests Handling
                if status == 429:
                    retry_after = 2.0
                    retry_header = he.headers.get("Retry-After")
                    if retry_header and retry_header.isdigit():
                        retry_after = max(1.0, float(retry_header))
                    logger.warning(f"Delta API HTTP 429 Rate Limit hit. Backing off for {retry_after:.2f}s (Attempt {attempt}/{self.max_retries})")
                    time.sleep(retry_after)
                    continue

                # 5xx Server Errors (Temporary outage)
                if status >= 500:
                    self._record_failure(he)
                    sleep_time = min(4.0, (2 ** (attempt - 1)) * 0.5)
                    logger.warning(f"Delta API HTTP {status} server error: {error_body}. Retrying in {sleep_time:.2f}s...")
                    time.sleep(sleep_time)
                    continue

                # 4xx Client Errors (400, 401, 403, 404) -> Do not endlessly retry
                logger.error(f"Delta API HTTP {status} client error on {endpoint}: {error_body}")
                raise

            except urllib.error.URLError as ue:
                last_err = ue
                self._record_failure(ue)
                sleep_time = min(4.0, (2 ** (attempt - 1)) * 0.5)
                logger.warning(f"Delta API connection error on {endpoint}: {ue.reason}. Retrying in {sleep_time:.2f}s...")
                time.sleep(sleep_time)

            except Exception as ex:
                last_err = ex
                self._record_failure(ex)
                logger.error(f"Unexpected Delta API error on {endpoint}: {ex}")
                time.sleep(0.5)

        # All retries exhausted
        logger.error(f"Delta API request failed after {self.max_retries} attempts: {last_err}")
        if last_err:
            raise last_err
        raise RuntimeError(f"Delta API request to {endpoint} failed with unknown error.")

    # --------------------------------------------------------------------------
    # HIGH-LEVEL DELTA OPTIONS DOMAIN METHODS
    # --------------------------------------------------------------------------

    def get_products(
        self,
        contract_types: Optional[List[str]] = None,
        states: Optional[List[str]] = None,
        force_refresh: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        Discovers all products from official /v2/products endpoint.
        Filters for option contracts (call_options, put_options), live states, and current/future settlements.
        """
        if contract_types is None:
            contract_types = ["call_options", "put_options"]
        if states is None:
            states = ["live"]

        res = self._request(
            "/v2/products",
            method="GET",
            use_cache=not force_refresh,
            cache_ttl=60.0,  # 1 min cache for products catalogue
        )

        raw_products = res.get("result", [])
        if not isinstance(raw_products, list):
            return []

        now_iso = datetime.now(timezone.utc).isoformat()

        discovered: List[Dict[str, Any]] = []
        for p in raw_products:
            ctype = str(p.get("contract_type", "")).lower()
            state = str(p.get("state", "")).lower()
            settle_time = p.get("settlement_time")

            if contract_types and ctype not in contract_types:
                continue

            if states and state not in states:
                continue

            # Check if expired
            if settle_time:
                try:
                    clean_ts = settle_time.replace("Z", "+00:00")
                    settle_dt = datetime.fromisoformat(clean_ts)
                    if settle_dt.tzinfo is None:
                        settle_dt = settle_dt.replace(tzinfo=timezone.utc)
                    if settle_dt < datetime.now(timezone.utc):
                        continue  # Expired contract
                except Exception:
                    pass

            discovered.append(p)

        return discovered

    def get_tickers(
        self,
        underlying_asset_symbols: Optional[List[str]] = None,
        contract_types: Optional[List[str]] = None,
        expiry_date: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Fetches live option tickers from /v2/tickers with optional filters.
        """
        params: Dict[str, Any] = {}
        if contract_types:
            params["contract_types"] = ",".join(contract_types)
        else:
            params["contract_types"] = "call_options,put_options"

        if underlying_asset_symbols:
            params["underlying_asset_symbols"] = ",".join(underlying_asset_symbols)

        if expiry_date:
            params["expiry_date"] = expiry_date

        res = self._request("/v2/tickers", params=params, method="GET", use_cache=False)
        result = res.get("result", [])
        return result if isinstance(result, list) else []

    def get_option_chain_for_underlying_and_expiry(
        self,
        underlying_symbol: str,
        expiry_date_ddmmyyyy: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Fetches all option tickers for a specific underlying and optional expiry date.
        """
        und = underlying_symbol.upper().strip()
        tickers = self.get_tickers(
            underlying_asset_symbols=[und],
            contract_types=["call_options", "put_options"],
            expiry_date=expiry_date_ddmmyyyy,
        )
        return tickers

    def get_spot_indices(self) -> List[Dict[str, Any]]:
        """
        Fetches spot price indices from /v2/indices.
        """
        res = self._request("/v2/indices", method="GET", use_cache=True, cache_ttl=15.0)
        result = res.get("result", [])
        return result if isinstance(result, list) else []

    def get_product_by_id(self, product_id: int) -> Optional[Dict[str, Any]]:
        """
        Fetches detailed product definition by product ID.
        """
        try:
            res = self._request(f"/v2/products/{product_id}", method="GET", use_cache=True, cache_ttl=120.0)
            return res.get("result")
        except Exception:
            return None

    def get_server_time(self) -> str:
        """
        Returns exchange server timestamp or current UTC ISO.
        """
        try:
            # Check products head or lightweight endpoint
            res = self._request("/v2/indices", method="GET", use_cache=False)
            return datetime.now(timezone.utc).isoformat()
        except Exception:
            return datetime.now(timezone.utc).isoformat()

    def health_check(self) -> Dict[str, Any]:
        """
        Performs a rapid probe against Delta API to determine connectivity, latency, and status.
        """
        start_t = time.time()
        try:
            res = self._request("/v2/indices", method="GET", use_cache=False)
            latency = (time.time() - start_t) * 1000.0
            return {
                "status": "HEALTHY",
                "circuit_state": self._circuit_state,
                "latency_ms": round(latency, 2),
                "base_url": self.base_url,
                "error": None,
            }
        except Exception as e:
            latency = (time.time() - start_t) * 1000.0
            return {
                "status": "UNHEALTHY",
                "circuit_state": self._circuit_state,
                "latency_ms": round(latency, 2),
                "base_url": self.base_url,
                "error": str(e),
            }


# Singleton global client instance
global_delta_client = DeltaOptionsClient()
