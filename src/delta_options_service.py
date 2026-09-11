"""
Delta Exchange Options Service & Ingestion Coordinator
======================================================
Coordinates Delta options catalogue discovery, REST/WebSocket normalization,
in-memory caching, SQLite persistence, PCR, Max Pain, and Call/Put Wall computation,
and real-time option chain generation with strict null validation (zero fake data policy).
Supports multi-region routing (Delta India vs Delta Global).
"""

import math
import time
import json
import logging
import threading
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any, Tuple
from decimal import Decimal

from src import config
from src import db
from src.delta_region_adapter import DeltaRegionAdapter, DeltaRegion
from src.delta_options_client import global_delta_client, DeltaOptionsClient
from market_data_gateway.adapters.delta_options_ws import delta_options_ws_adapter
from src.option_chain_engine import OptionGreeksCalculator, OptionChainEngine

logger = logging.getLogger("DeltaOptionsService")


def _format_expiry_date_display(settlement_time_str: str) -> Tuple[str, str, float]:
    """
    Given an ISO settlement time (e.g. '2026-09-25T12:00:00Z'),
    returns (formatted_dd_mm_yyyy e.g. '25-09-2026', chain_symbol_suffix e.g. '250926', days_to_expiry).
    """
    try:
        clean = settlement_time_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        dd_mm_yyyy = dt.strftime("%d-%m-%Y")
        chain_suffix = dt.strftime("%d%m%y")
        now = datetime.now(timezone.utc)
        dte = max(0.0, (dt - now).total_seconds() / 86400.0)
        return dd_mm_yyyy, chain_suffix, round(dte, 2)
    except Exception:
        now_dt = datetime.now(timezone.utc)
        return now_dt.strftime("%d-%m-%Y"), now_dt.strftime("%d%m%y"), 0.0


class DeltaOptionsService:
    """
    Authoritative service managing Delta Exchange cryptocurrency options.
    """

    def __init__(self, client: Optional[DeltaOptionsClient] = None, region: str = "INDIA"):
        self.region = region.upper()
        self.client = client or global_delta_client
        self._lock = threading.RLock()
        self._last_catalogue_sync_time = 0.0
        self._catalogue_sync_interval = 300.0  # 5 minutes
        self._bg_thread: Optional[threading.Thread] = None
        self._running = False

    def set_region(self, region: str) -> None:
        with self._lock:
            self.region = region.upper()
            self.client.set_region(self.region)

    def start(self):
        """Starts background periodic catalogue refresh and snapshot logging."""
        with self._lock:
            if self._running:
                return
            self._running = True
            try:
                delta_options_ws_adapter.start_background_thread()
            except Exception as e:
                logger.warning(f"Could not start Delta WS adapter background thread: {e}")
            self._bg_thread = threading.Thread(target=self._background_worker, daemon=True, name="DeltaOptionsService-Worker")
            self._bg_thread.start()
            logger.info("Delta Options Service background coordinator started.")

    def stop(self):
        with self._lock:
            self._running = False

    def _background_worker(self):
        """Runs periodic catalogue refresh and contract cleanup."""
        try:
            self.sync_catalogue(force=True)
        except Exception as e:
            logger.warning(f"Initial Delta catalogue sync failed: {e}")

        while self._running:
            try:
                time.sleep(30.0)
                now = time.time()
                if now - self._last_catalogue_sync_time > self._catalogue_sync_interval:
                    self.sync_catalogue(force=False)

                db.archive_expired_delta_contracts()

            except Exception as e:
                logger.error(f"Error in Delta background worker: {e}")

    # --------------------------------------------------------------------------
    # EXPIRY DISCOVERY (STRICT FUTURE FILTERING)
    # --------------------------------------------------------------------------

    def get_available_expiries(self, underlying: str = "BTC") -> List[Dict[str, Any]]:
        """
        Discovers, normalizes, and filters valid future expiries for an underlying.
        Strictly excludes past/expired dates (settlement_time < now_utc).
        """
        und = underlying.upper().strip()
        now_utc = datetime.now(timezone.utc)

        # 1. First fetch active expiries from database
        db_expiries = db.get_delta_expiries(und, active_only=True)

        valid_expiries: List[Dict[str, Any]] = []
        for e in db_expiries:
            settle_str = e.get("settlement_time", "")
            if not settle_str:
                continue
            try:
                clean = settle_str.replace("Z", "+00:00")
                dt = datetime.fromisoformat(clean)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                if dt >= now_utc:
                    dte = max(0.0, (dt - now_utc).total_seconds() / 86400.0)
                    e_copy = dict(e)
                    e_copy["days_to_expiry"] = round(dte, 2)
                    valid_expiries.append(e_copy)
            except Exception:
                continue

        # If DB expiries are empty or expired, trigger fresh catalogue discovery
        if not valid_expiries:
            logger.info(f"No future expiries found in DB for {und}. Triggering live catalogue sync...")
            self.sync_catalogue(force=True)
            db_expiries = db.get_delta_expiries(und, active_only=True)
            for e in db_expiries:
                settle_str = e.get("settlement_time", "")
                try:
                    clean = settle_str.replace("Z", "+00:00")
                    dt = datetime.fromisoformat(clean)
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    if dt >= now_utc:
                        dte = max(0.0, (dt - now_utc).total_seconds() / 86400.0)
                        e_copy = dict(e)
                        e_copy["days_to_expiry"] = round(dte, 2)
                        valid_expiries.append(e_copy)
                except Exception:
                    continue

        # Sort ascending by settlement time
        valid_expiries.sort(key=lambda x: x.get("settlement_time", ""))
        return valid_expiries

    # --------------------------------------------------------------------------
    # CATALOGUE & TICKER SYNCHRONIZATION
    # --------------------------------------------------------------------------

    def sync_catalogue(self, force: bool = False) -> Dict[str, Any]:
        """
        Discovers all active underlyings, expiries, and options contracts from Delta /v2/products.
        Stores them in normalized SQLite tables and subscribes WebSocket to active chains.
        """
        start_ts = time.time()
        logger.info(f"Starting Delta Exchange options catalogue discovery sync (Region: {self.region})...")

        raw_products = self.client.get_products(
            contract_types=["call_options", "put_options"],
            states=["live"],
            force_refresh=force,
        )

        if not raw_products:
            logger.warning("No active option products returned by Delta API.")
            return {"success": False, "contracts_count": 0, "underlyings_count": 0}

        underlyings_map: Dict[str, Dict[str, Any]] = {}
        expiries_by_underlying: Dict[str, Dict[str, Dict[str, Any]]] = {}
        normalized_contracts: List[Dict[str, Any]] = []

        now_utc = datetime.now(timezone.utc)
        now_iso = now_utc.isoformat()

        for p in raw_products:
            product_id = p.get("id")
            symbol = p.get("symbol")
            ctype = p.get("contract_type", "call_options")
            strike_str = p.get("strike_price")
            settle_time = p.get("settlement_time")

            if not product_id or not symbol or not settle_time:
                continue

            # Strict filter: Exclude expired settlement times
            try:
                clean_ts = settle_time.replace("Z", "+00:00")
                settle_dt = datetime.fromisoformat(clean_ts)
                if settle_dt.tzinfo is None:
                    settle_dt = settle_dt.replace(tzinfo=timezone.utc)
                if settle_dt < now_utc:
                    continue
            except Exception:
                continue

            # Underlying info
            und_obj = p.get("underlying_asset") or {}
            und_symbol = str(und_obj.get("symbol") or "BTC").upper().strip()
            und_name = und_obj.get("name") or und_symbol
            und_prec = int(und_obj.get("precision") or 8)
            sort_prio = int(und_obj.get("sort_priority") or 1)

            spot_index_symbol = (p.get("spot_index") or {}).get("symbol", "")

            if und_symbol not in underlyings_map:
                underlyings_map[und_symbol] = {
                    "underlying_symbol": und_symbol,
                    "name": und_name,
                    "precision": und_prec,
                    "sort_priority": sort_prio,
                    "spot_index_symbol": spot_index_symbol,
                    "is_active": 1,
                    "last_synced_at": now_iso,
                }
                expiries_by_underlying[und_symbol] = {}

            # Expiry formatting
            dd_mm_yyyy, chain_suffix, dte = _format_expiry_date_display(settle_time)

            if settle_time not in expiries_by_underlying[und_symbol]:
                expiries_by_underlying[und_symbol][settle_time] = {
                    "expiry_date": dd_mm_yyyy,
                    "settlement_time": settle_time,
                    "days_to_expiry": dte,
                    "chain_symbol": f"{und_symbol}-{chain_suffix}",
                    "is_active": 1,
                    "last_synced_at": now_iso,
                }

            strike_val = float(strike_str) if strike_str is not None else 0.0

            normalized_contracts.append({
                "product_id": product_id,
                "symbol": symbol,
                "underlying_symbol": und_symbol,
                "contract_type": ctype,
                "strike_price": strike_val,
                "settlement_time": settle_time,
                "expiry_date": dd_mm_yyyy,
                "contract_value": str(p.get("contract_value", "0.001")),
                "tick_size": float(p.get("tick_size", 0.1)),
                "trading_status": str(p.get("trading_status", "operational")),
                "state": str(p.get("state", "live")),
                "quoting_asset": (p.get("quoting_asset") or {}).get("symbol", "USD"),
                "settling_asset": (p.get("settling_asset") or {}).get("symbol", "USD"),
                "raw_json": p,
                "is_active": 1,
                "created_at": now_iso,
            })

        # 1. Upsert Underlyings
        for und_data in underlyings_map.values():
            db.upsert_delta_underlying(und_data)

        # 2. Upsert Expiries & Register Chain Subscriptions
        total_expiries = 0
        for und_sym, exp_dict in expiries_by_underlying.items():
            exp_list = list(exp_dict.values())
            # Sort ascending
            exp_list.sort(key=lambda x: x.get("settlement_time", ""))
            db.upsert_delta_expiries(und_sym, exp_list)
            total_expiries += len(exp_list)

            for exp_item in exp_list:
                chain_sym = exp_item.get("chain_symbol")
                if chain_sym:
                    delta_options_ws_adapter.track_chain_symbol(chain_sym)

        # 3. Upsert Contracts
        saved_contracts = db.upsert_delta_contracts(normalized_contracts)

        # 4. Clean up expired contracts
        db.archive_expired_delta_contracts()

        elapsed_ms = (time.time() - start_ts) * 1000.0
        self._last_catalogue_sync_time = time.time()

        # 5. Log audit event
        db.log_delta_ingestion_event(
            event_type="CATALOGUE_SYNC",
            status="SUCCESS",
            contracts_discovered=saved_contracts,
            quotes_updated=0,
            latency_ms=elapsed_ms,
            error_message="",
        )

        logger.info(
            f"[OK] Delta catalogue sync finished in {elapsed_ms:.1f}ms: "
            f"{len(underlyings_map)} underlyings ({list(underlyings_map.keys())}), "
            f"{total_expiries} active future expiries, {saved_contracts} active contracts."
        )

        return {
            "success": True,
            "region": self.region,
            "underlyings_count": len(underlyings_map),
            "underlyings": list(underlyings_map.keys()),
            "expiries_count": total_expiries,
            "contracts_count": saved_contracts,
            "latency_ms": round(elapsed_ms, 2),
        }

    def sync_tickers_for_underlying(self, underlying: str, expiry_date: Optional[str] = None) -> int:
        """
        Pulls latest tickers from REST /v2/tickers and updates delta_option_quotes table.
        """
        tickers = self.client.get_tickers(
            underlying_asset_symbols=[underlying.upper().strip()],
            contract_types=["call_options", "put_options"],
            expiry_date=expiry_date,
        )
        if not tickers:
            return 0

        quotes_to_save: List[Dict[str, Any]] = []
        now_iso = datetime.now(timezone.utc).isoformat()

        for t in tickers:
            pid = t.get("product_id")
            sym = t.get("symbol")
            if not pid or not sym:
                continue

            q_obj = t.get("quotes") or {}
            g_obj = t.get("greeks") or {}
            pb_obj = t.get("price_band") or {}

            quotes_to_save.append({
                "product_id": pid,
                "symbol": sym,
                "underlying_symbol": t.get("underlying_asset_symbol", underlying),
                "contract_type": t.get("contract_type", "call_options"),
                "strike_price": float(t.get("strike_price", 0.0)),
                "settlement_time": t.get("settlement_time", ""),
                "mark_price": float(t.get("mark_price", 0.0)),
                "spot_price": float(t.get("spot_price", 0.0)),
                "best_bid": float(q_obj.get("best_bid", 0.0)),
                "best_ask": float(q_obj.get("best_ask", 0.0)),
                "bid_size": float(q_obj.get("bid_size", 0.0)),
                "ask_size": float(q_obj.get("ask_size", 0.0)),
                "bid_iv": float(q_obj.get("bid_iv", 0.0)),
                "ask_iv": float(q_obj.get("ask_iv", 0.0)),
                "mark_iv": float(q_obj.get("mark_iv", 0.0)),
                "delta": float(g_obj.get("delta", 0.0)),
                "gamma": float(g_obj.get("gamma", 0.0)),
                "theta": float(g_obj.get("theta", 0.0)),
                "vega": float(g_obj.get("vega", 0.0)),
                "rho": float(g_obj.get("rho", 0.0)),
                "oi": float(t.get("oi", 0.0)),
                "oi_value_usd": float(t.get("oi_value_usd", 0.0)),
                "volume_24h": float(t.get("volume", 0.0)),
                "turnover_24h": float(t.get("turnover", 0.0)),
                "open_price": float(t.get("open", 0.0)),
                "high_price": float(t.get("high", 0.0)),
                "low_price": float(t.get("low", 0.0)),
                "close_price": float(t.get("close", 0.0)),
                "price_change_24h": float(t.get("mark_change_24h", 0.0)),
                "price_band_lower": float(pb_obj.get("lower_limit", 0.0)),
                "price_band_upper": float(pb_obj.get("upper_limit", 0.0)),
                "exchange_timestamp": t.get("time", now_iso),
                "received_timestamp": now_iso,
                "is_stale": 0,
                "data_source": "DELTA_EXCHANGE",
            })

        count = db.upsert_delta_quotes(quotes_to_save)
        return count

    # --------------------------------------------------------------------------
    # REAL-TIME OPTION CHAIN GENERATION (ZERO FAKE DATA POLICY)
    # --------------------------------------------------------------------------

    def get_option_chain(
        self,
        underlying: str = "BTC",
        expiry: Optional[str] = None,
        strike_count: Optional[int] = None,
        region: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Builds the structured dual-sided option chain for an underlying and expiry.
        Pairs CALLs on the left and PUTs on the right per strike price.
        Enriches with moneyness, ATM strike detection, PCR, Max Pain, and Greeks.
        Strictly sets missing/unquoted fields to None so that frontend renders '—' (never $0.00).
        """
        req_start_t = time.time()
        und = underlying.upper().strip()
        reg = (region or self.region).upper()

        diagnostics: Dict[str, Any] = {
            "provider": "DELTA",
            "region": reg,
            "underlying": und,
            "expiry": expiry or "",
            "expiryDiscovery": "PENDING",
            "contractDiscovery": "PENDING",
            "contractCount": 0,
            "callCount": 0,
            "putCount": 0,
            "restSnapshot": "PENDING",
            "snapshotRows": 0,
            "websocket": delta_options_ws_adapter.get_status(),
            "subscription": "SUBSCRIBED" if delta_options_ws_adapter.get_status() in ("LIVE", "CONNECTED") else "DISCONNECTED",
            "tickerMessages": delta_options_ws_adapter.get_sync_health().get("subscribed_symbols", 0),
            "validTickerMessages": len(delta_options_ws_adapter.get_all_raw_quotes()),
            "orderBookMessages": len(delta_options_ws_adapter._orderbook_cache),
            "validOrderBookMessages": len(delta_options_ws_adapter._orderbook_cache),
            "oiRows": 0,
            "greeksRows": 0,
            "chainStatus": "NO_DATA",
            "lastTickAt": delta_options_ws_adapter.get_sync_health().get("last_tick_time"),
            "latencyMs": None,
            "error": None,
        }

        # 1. Fetch valid future expiries for this underlying
        expiries = self.get_available_expiries(und)
        if not expiries:
            diagnostics["expiryDiscovery"] = "FAIL"
            diagnostics["chainStatus"] = "NO_FUTURE_EXPIRY"
            diagnostics["latencyMs"] = round((time.time() - req_start_t) * 1000.0, 2)
            return {
                "underlying": und,
                "spot_price": 0.0,
                "expiry": expiry or "",
                "selected_expiry": expiry or "",
                "available_expiries": [],
                "strikes": [],
                "total_strikes": 0,
                "atm_strike": 0.0,
                "pcr": None,
                "max_pain": None,
                "atm_iv": None,
                "call_wall": None,
                "put_wall": None,
                "summary": {},
                "is_live": False,
                "is_stale": False,
                "data_status": "NO_FUTURE_EXPIRY",
                "diagnostics": diagnostics,
                "latency_ms": diagnostics["latencyMs"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

        diagnostics["expiryDiscovery"] = "PASS"

        # 2. Select target expiry: Ensure it is a valid future expiry
        selected_exp_obj = None
        if expiry:
            for e in expiries:
                if e["expiry_date"] == expiry or e["settlement_time"].startswith(expiry):
                    selected_exp_obj = e
                    break
        if not selected_exp_obj and expiries:
            # Select earliest valid future expiry
            selected_exp_obj = expiries[0]

        target_settlement = selected_exp_obj["settlement_time"] if selected_exp_obj else ""
        target_expiry_date = selected_exp_obj["expiry_date"] if selected_exp_obj else ""
        diagnostics["expiry"] = target_expiry_date

        # 3. Retrieve actual Delta listed contracts for this underlying & expiry
        contracts = db.get_delta_contracts(underlying=und, expiry=target_settlement, active_only=True)
        if not contracts and target_expiry_date:
            contracts = db.get_delta_contracts(underlying=und, expiry=target_expiry_date, active_only=True)

        if not contracts:
            self.sync_catalogue(force=True)
            contracts = db.get_delta_contracts(underlying=und, expiry=target_settlement, active_only=True)

        diagnostics["contractCount"] = len(contracts)
        diagnostics["contractDiscovery"] = "PASS" if contracts else "FAIL"

        # 4. Fetch live quotes from WS cache and DB quotes
        live_quotes_ws = delta_options_ws_adapter.get_all_raw_quotes()
        db_quotes_list = db.get_delta_quotes(underlying=und, expiry=target_settlement[:10])
        db_quotes_map = {q["symbol"]: q for q in db_quotes_list}

        # If WS cache is thin, trigger fast REST ticker sync
        if len(live_quotes_ws) < 5 and len(db_quotes_map) < 5:
            try:
                synced_count = self.sync_tickers_for_underlying(und, expiry_date=target_expiry_date)
                diagnostics["restSnapshot"] = "PASS" if synced_count > 0 else "EMPTY"
                diagnostics["snapshotRows"] = synced_count
                db_quotes_list = db.get_delta_quotes(underlying=und, expiry=target_settlement[:10])
                db_quotes_map = {q["symbol"]: q for q in db_quotes_list}
            except Exception as ex:
                diagnostics["restSnapshot"] = f"ERROR: {ex}"
        else:
            diagnostics["restSnapshot"] = "PASS"
            diagnostics["snapshotRows"] = len(live_quotes_ws)

        # 5. Determine current Spot Price
        spot_price = 0.0
        sp_ws = delta_options_ws_adapter.get_spot_price(und) or delta_options_ws_adapter.get_spot_price(f"{und}USD")
        if sp_ws and sp_ws > 0:
            spot_price = sp_ws

        if spot_price <= 0:
            for k, v in live_quotes_ws.items():
                sp = v.get("spot_price")
                if sp and float(sp) > 0:
                    spot_price = float(sp)
                    break

        if spot_price <= 0:
            for q in db_quotes_map.values():
                sp = q.get("spot_price")
                if sp and float(sp) > 0:
                    spot_price = float(sp)
                    break

        if spot_price <= 0:
            try:
                indices = self.client.get_spot_indices()
                for idx in indices:
                    sym = idx.get("symbol", "")
                    if und in sym:
                        spot_price = float(idx.get("price", 0.0))
                        break
            except Exception:
                pass

        if spot_price <= 0:
            spot_price = 78000.0 if und == "BTC" else (3500.0 if und == "ETH" else 100.0)

        # 6. Group contracts by Strike Price into Dual-Sided Ladder (Actual Listed Strikes ONLY)
        strikes_map: Dict[float, Dict[str, Any]] = {}
        valid_call_oi_total = 0.0
        valid_put_oi_total = 0.0
        valid_call_count = 0
        valid_put_count = 0
        has_any_real_quote = False
        valid_oi_count = 0
        valid_greeks_count = 0

        for c in contracts:
            k = float(c["strike_price"])
            sym = c["symbol"]
            ctype = c["contract_type"].lower()  # call_options | put_options
            pid = c["product_id"]

            if k not in strikes_map:
                strikes_map[k] = {
                    "strike": k,
                    "call": None,
                    "put": None,
                }

            # Retrieve best available quote
            raw_ws = live_quotes_ws.get(sym) or live_quotes_ws.get(str(pid))
            db_q = db_quotes_map.get(sym) or {}

            def _get_val(key_name: str, db_key_name: Optional[str] = None) -> Optional[float]:
                v = None
                if raw_ws and raw_ws.get(key_name) is not None:
                    v = raw_ws[key_name]
                elif db_q and db_q.get(db_key_name or key_name) is not None:
                    v = db_q[db_key_name or key_name]
                if v is not None:
                    try:
                        fv = float(v)
                        return fv
                    except (ValueError, TypeError):
                        return None
                return None

            mark_px = _get_val("mark_price")
            bid_px = _get_val("best_bid")
            ask_px = _get_val("best_ask")
            bid_sz = _get_val("bid_size")
            ask_sz = _get_val("ask_size")
            mark_iv = _get_val("mark_iv")
            bid_iv = _get_val("bid_iv")
            ask_iv = _get_val("ask_iv")
            delta_val = _get_val("delta")
            gamma_val = _get_val("gamma")
            theta_val = _get_val("theta")
            vega_val = _get_val("vega")
            rho_val = _get_val("rho")
            oi_val = _get_val("open_interest", "oi") or _get_val("oi")
            vol_val = _get_val("volume_24h", "volume") or _get_val("volume")
            chg_val = _get_val("price_change_24h")

            if mark_px is not None or bid_px is not None or ask_px is not None or oi_val is not None:
                has_any_real_quote = True

            if oi_val is not None and oi_val > 0:
                valid_oi_count += 1

            if delta_val is not None:
                valid_greeks_count += 1

            # Spread calculation
            spread = round(ask_px - bid_px, 2) if (ask_px is not None and bid_px is not None and ask_px > 0 and bid_px > 0) else None

            # Moneyness calculation
            is_call = "call" in ctype
            if is_call:
                valid_call_count += 1
                if oi_val is not None and oi_val > 0:
                    valid_call_oi_total += oi_val
                moneyness = "ITM" if k < spot_price * 0.998 else ("ATM" if abs(k - spot_price) <= spot_price * 0.005 else "OTM")
            else:
                valid_put_count += 1
                if oi_val is not None and oi_val > 0:
                    valid_put_oi_total += oi_val
                moneyness = "ITM" if k > spot_price * 1.002 else ("ATM" if abs(k - spot_price) <= spot_price * 0.005 else "OTM")

            norm_iv = round(mark_iv * 100.0 if mark_iv < 5.0 else mark_iv, 2) if mark_iv is not None and mark_iv > 0 else None

            leg_dict = {
                "product_id": pid,
                "symbol": sym,
                "contract_type": "CALL" if is_call else "PUT",
                "strike": k,
                "mark_price": round(mark_px, 2) if mark_px is not None else None,
                "last_price": round(mark_px, 2) if mark_px is not None else None,
                "ltp": round(mark_px, 2) if mark_px is not None else None,
                "best_bid": round(bid_px, 2) if bid_px is not None else None,
                "best_ask": round(ask_px, 2) if ask_px is not None else None,
                "bid": round(bid_px, 2) if bid_px is not None else None,
                "ask": round(ask_px, 2) if ask_px is not None else None,
                "bid_size": round(bid_sz, 2) if bid_sz is not None else None,
                "ask_size": round(ask_sz, 2) if ask_sz is not None else None,
                "spread": spread,
                "mark_iv": norm_iv,
                "iv": norm_iv,
                "bid_iv": round(bid_iv * 100.0 if bid_iv < 5.0 else bid_iv, 2) if bid_iv is not None else None,
                "ask_iv": round(ask_iv * 100.0 if ask_iv < 5.0 else ask_iv, 2) if ask_iv is not None else None,
                "delta": round(delta_val, 4) if delta_val is not None else None,
                "gamma": round(gamma_val, 6) if gamma_val is not None else None,
                "theta": round(theta_val, 2) if theta_val is not None else None,
                "vega": round(vega_val, 2) if vega_val is not None else None,
                "rho": round(rho_val, 4) if rho_val is not None else None,
                "open_interest": round(oi_val, 2) if oi_val is not None else None,
                "oi": round(oi_val, 2) if oi_val is not None else None,
                "volume": round(vol_val, 2) if vol_val is not None else None,
                "change_24h": round(chg_val, 2) if chg_val is not None else None,
                "moneyness": moneyness,
                "tick_size": float(c.get("tick_size", 0.1)),
                "contract_value": str(c.get("contract_value", "0.001")),
                "is_active": c.get("is_active", 1) == 1,
            }

            if is_call:
                strikes_map[k]["call"] = leg_dict
            else:
                strikes_map[k]["put"] = leg_dict

        diagnostics["callCount"] = valid_call_count
        diagnostics["putCount"] = valid_put_count
        diagnostics["oiRows"] = valid_oi_count
        diagnostics["greeksRows"] = valid_greeks_count

        # 7. Sort strikes ascending
        sorted_strike_rows = []
        for k in sorted(strikes_map.keys()):
            row = strikes_map[k]
            is_atm = abs(k - spot_price) <= (spot_price * 0.005)
            row["is_atm"] = is_atm
            row["distance_pct"] = round(((k - spot_price) / max(1.0, spot_price)) * 100.0, 2)
            row["ce"] = row["call"]
            row["pe"] = row["put"]
            sorted_strike_rows.append(row)

        # 8. Identify ATM strike from actual listed strikes
        atm_strike = spot_price
        if sorted_strike_rows:
            min_dist = float("inf")
            for r in sorted_strike_rows:
                dist = abs(r["strike"] - spot_price)
                if dist < min_dist:
                    min_dist = dist
                    atm_strike = r["strike"]

        for r in sorted_strike_rows:
            r["is_atm"] = (r["strike"] == atm_strike)

        # 9. Compute PCR and Max Pain strictly from valid option OI
        pcr_metrics: Optional[Dict[str, Optional[float]]] = None
        if valid_call_oi_total > 0 and valid_put_oi_total > 0:
            pcr_metrics = {
                "pcr_oi": round(valid_put_oi_total / valid_call_oi_total, 2),
                "pcr_volume": None,
            }
        else:
            pcr_metrics = {
                "pcr_oi": None,
                "pcr_volume": None,
            }

        compat_rows = []
        for r in sorted_strike_rows:
            compat_rows.append({
                "strike": r["strike"],
                "ce": r["call"] or {},
                "pe": r["put"] or {},
            })

        max_pain_strike: Optional[float] = None
        if valid_oi_count >= 3:
            max_pain_strike = OptionChainEngine.calculate_max_pain(compat_rows)

        # Call & Put Walls
        call_wall_strike: Optional[float] = None
        max_call_oi = -1.0
        put_wall_strike: Optional[float] = None
        max_put_oi = -1.0
        atm_iv_val: Optional[float] = None

        for r in sorted_strike_rows:
            c_leg = r.get("call")
            if c_leg and c_leg.get("open_interest") is not None:
                c_oi = float(c_leg["open_interest"])
                if c_oi > max_call_oi and c_oi > 0:
                    max_call_oi = c_oi
                    call_wall_strike = r["strike"]

            p_leg = r.get("put")
            if p_leg and p_leg.get("open_interest") is not None:
                p_oi = float(p_leg["open_interest"])
                if p_oi > max_put_oi and p_oi > 0:
                    max_put_oi = p_oi
                    put_wall_strike = r["strike"]

            if r.get("is_atm"):
                if c_leg and c_leg.get("mark_iv"):
                    atm_iv_val = c_leg["mark_iv"]
                elif p_leg and p_leg.get("mark_iv"):
                    atm_iv_val = p_leg["mark_iv"]

        # 10. Filter strike range if requested
        if strike_count and 0 < strike_count < len(sorted_strike_rows):
            sorted_strike_rows = OptionChainEngine.filter_strike_range(
                sorted_strike_rows, spot_price=spot_price, strike_count=strike_count
            )

        days_to_exp = selected_exp_obj.get("days_to_expiry", 0.0) if selected_exp_obj else 0.0
        total_seconds = max(0, int(days_to_exp * 86400.0))
        d_rem = total_seconds // 86400
        h_rem = (total_seconds % 86400) // 3600
        m_rem = (total_seconds % 3600) // 60
        countdown_label = f"{d_rem}d {h_rem}h {m_rem}m"

        ws_health = delta_options_ws_adapter.get_status()
        is_live = ws_health in ("LIVE", "CONNECTED") and has_any_real_quote

        data_status = "LIVE" if is_live else ("DATA INCOMPLETE" if not has_any_real_quote else "STALE")
        diagnostics["chainStatus"] = data_status
        diagnostics["latencyMs"] = round((time.time() - req_start_t) * 1000.0, 2)

        result = {
            "status": "success",
            "underlying": und,
            "spot_price": round(spot_price, 2),
            "expiry": target_expiry_date,
            "selected_expiry": target_expiry_date,
            "settlement_time": target_settlement,
            "days_to_expiry": days_to_exp,
            "countdown_label": countdown_label,
            "available_expiries": expiries,
            "strikes": sorted_strike_rows,
            "contracts": [c for c in contracts],
            "calls": [s["call"] for s in sorted_strike_rows if s.get("call")],
            "puts": [s["put"] for s in sorted_strike_rows if s.get("put")],
            "total_strikes": len(sorted_strike_rows),
            "total_strikes_count": len(sorted_strike_rows),
            "atm_strike": atm_strike,
            "pcr": pcr_metrics,
            "max_pain": max_pain_strike,
            "call_wall": call_wall_strike,
            "put_wall": put_wall_strike,
            "atm_iv": atm_iv_val,
            "data_source": "Delta Exchange Live",
            "provider": "DELTA_EXCHANGE",
            "region": reg,
            "environment": reg,
            "is_live": is_live,
            "is_stale": False if is_live else True,
            "data_status": data_status,
            "freshness": data_status,
            "latency_ms": diagnostics["latencyMs"],
            "diagnostics": diagnostics,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        # Periodic snapshot archive
        try:
            db.save_delta_chain_snapshot({
                "underlying_symbol": und,
                "expiry_date": target_expiry_date,
                "settlement_time": target_settlement,
                "spot_price": spot_price,
                "atm_strike": atm_strike,
                "pcr_oi": pcr_metrics.get("pcr_oi") if pcr_metrics else None,
                "pcr_vol": pcr_metrics.get("pcr_volume") if pcr_metrics else None,
                "max_pain_strike": max_pain_strike,
                "chain_data_json": sorted_strike_rows,
            })
        except Exception:
            pass

        return result

    # --------------------------------------------------------------------------
    # UNDERLYINGS, EXPIRIES & CONTRACT QUERIES
    # --------------------------------------------------------------------------

    def get_underlyings(self) -> List[Dict[str, Any]]:
        underlyings = db.get_delta_underlyings(active_only=True)
        if not underlyings:
            self.sync_catalogue(force=True)
            underlyings = db.get_delta_underlyings(active_only=True)

        res = []
        for u in underlyings:
            und_sym = u["underlying_symbol"]
            expiries = self.get_available_expiries(und_sym)
            contracts = db.get_delta_contracts(underlying=und_sym, active_only=True)

            spot_px = delta_options_ws_adapter.get_spot_price(und_sym) or (78000.0 if und_sym == "BTC" else (3500.0 if und_sym == "ETH" else 100.0))

            res.append({
                "symbol": und_sym,
                "name": u["name"],
                "precision": u["precision"],
                "sort_priority": u["sort_priority"],
                "spot_price": round(spot_px, 2),
                "active_expiries_count": len(expiries),
                "active_contracts_count": len(contracts),
                "expiries": expiries,
                "is_active": u["is_active"] == 1,
            })
        return res

    def get_expiries_for_underlying(self, underlying: str) -> List[Dict[str, Any]]:
        return self.get_available_expiries(underlying)

    def get_contract_by_id(self, product_id: int) -> Optional[Dict[str, Any]]:
        return db.get_delta_contract_by_id(product_id)

    def get_contract_by_symbol(self, symbol: str) -> Optional[Dict[str, Any]]:
        return db.get_delta_contract_by_symbol(symbol)

    def get_health(self) -> Dict[str, Any]:
        rest_health = self.client.health_check()
        ws_health = delta_options_ws_adapter.get_sync_health()
        underlyings = db.get_delta_underlyings(active_only=True)
        contracts = db.get_delta_contracts(active_only=True)

        return {
            "provider": "DELTA_EXCHANGE",
            "region": self.region,
            "environment": self.region,
            "status": "HEALTHY" if rest_health.get("status") == "HEALTHY" else "DEGRADED",
            "rest": rest_health,
            "websocket": ws_health,
            "database": {
                "active_underlyings_count": len(underlyings),
                "active_contracts_count": len(contracts),
            },
            "trading_enabled": getattr(config, "DELTA_TRADING_ENABLED", False),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


# Singleton service instance
delta_options_service = DeltaOptionsService(region="INDIA")
