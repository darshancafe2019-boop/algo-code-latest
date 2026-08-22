import logging
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Tuple, Optional
from src import db
from src.market_providers import get_provider_registry, BaseMarketProvider

logger = logging.getLogger("MarketUniverse")


def calculate_volatility_score(change_pct: float, high_price: float, low_price: float, close_price: float) -> Tuple[float, str]:
    """Calculates an explainable volatility score (0 - 100) and category."""
    abs_change = abs(change_pct)
    range_pct = ((high_price - low_price) / close_price * 100.0) if close_price > 0 else abs_change

    score = min(100.0, (abs_change * 4.0) + (range_pct * 3.0) + 20.0)

    if score >= 75.0:
        cat = "Extreme"
    elif score >= 55.0:
        cat = "High"
    elif score >= 35.0:
        cat = "Medium"
    else:
        cat = "Low"

    return round(score, 1), cat


def seed_static_universe() -> None:
    """Seeds the initial baseline market universe from internal metadata without waiting on network I/O."""
    now_utc = datetime.now(timezone.utc).isoformat()
    baseline = [
        {"instrument_id": "NSE:RELIANCE:EQ", "symbol": "RELIANCE", "canonical_symbol": "NSE:RELIANCE", "display_name": "Reliance Industries", "company_name": "Reliance Industries Limited", "asset_class": "Indian Equities", "exchange": "NSE", "provider": "NSE", "instrument_type": "EQUITY", "lot_size": 1, "tick_size": 0.05, "last_price": 2845.50, "change_24h": 1.25, "volume_24h": 4500000.0, "high_24h": 2865.0, "low_24h": 2820.0, "volatility_score": 52.0, "volatility_category": "Medium", "directional_bias": "BULLISH", "momentum_score": 68.0, "tradability": "TRADABLE", "execution_available": 1, "is_swing_candidate": 1, "is_scalping_candidate": 0, "is_hedge_candidate": 0, "last_synced_at": now_utc},
        {"instrument_id": "NSE:TCS:EQ", "symbol": "TCS", "canonical_symbol": "NSE:TCS", "display_name": "Tata Consultancy Services", "company_name": "Tata Consultancy Services Ltd", "asset_class": "Indian Equities", "exchange": "NSE", "provider": "NSE", "instrument_type": "EQUITY", "lot_size": 1, "tick_size": 0.05, "last_price": 3890.0, "change_24h": -0.45, "volume_24h": 2100000.0, "high_24h": 3920.0, "low_24h": 3870.0, "volatility_score": 42.0, "volatility_category": "Medium", "directional_bias": "NEUTRAL", "momentum_score": 50.0, "tradability": "TRADABLE", "execution_available": 1, "is_swing_candidate": 1, "is_scalping_candidate": 0, "is_hedge_candidate": 0, "last_synced_at": now_utc},
        {"instrument_id": "NSE:INFY:EQ", "symbol": "INFY", "canonical_symbol": "NSE:INFY", "display_name": "Infosys", "company_name": "Infosys Limited", "asset_class": "Indian Equities", "exchange": "NSE", "provider": "NSE", "instrument_type": "EQUITY", "lot_size": 1, "tick_size": 0.05, "last_price": 1780.0, "change_24h": 0.85, "volume_24h": 3800000.0, "high_24h": 1795.0, "low_24h": 1765.0, "volatility_score": 48.0, "volatility_category": "Medium", "directional_bias": "BULLISH", "momentum_score": 62.0, "tradability": "TRADABLE", "execution_available": 1, "is_swing_candidate": 1, "is_scalping_candidate": 0, "is_hedge_candidate": 0, "last_synced_at": now_utc},
        {"instrument_id": "NSE:HDFCBANK:EQ", "symbol": "HDFCBANK", "canonical_symbol": "NSE:HDFCBANK", "display_name": "HDFC Bank", "company_name": "HDFC Bank Limited", "asset_class": "Indian Equities", "exchange": "NSE", "provider": "NSE", "instrument_type": "EQUITY", "lot_size": 1, "tick_size": 0.05, "last_price": 1640.0, "change_24h": 0.30, "volume_24h": 6200000.0, "high_24h": 1655.0, "low_24h": 1630.0, "volatility_score": 38.0, "volatility_category": "Medium", "directional_bias": "BULLISH", "momentum_score": 55.0, "tradability": "TRADABLE", "execution_available": 1, "is_swing_candidate": 1, "is_scalping_candidate": 0, "is_hedge_candidate": 0, "last_synced_at": now_utc},
        {"instrument_id": "BINANCE:BTC/USDT:SPOT", "symbol": "BTC/USDT", "canonical_symbol": "BINANCE:BTC/USDT", "display_name": "Bitcoin / USDT", "company_name": "Bitcoin Network", "asset_class": "Crypto", "exchange": "Binance", "provider": "CCXT", "instrument_type": "SPOT", "lot_size": 0.0001, "tick_size": 0.01, "last_price": 64250.0, "change_24h": 2.45, "volume_24h": 3850000000.0, "high_24h": 65100.0, "low_24h": 63800.0, "volatility_score": 68.0, "volatility_category": "High", "directional_bias": "BULLISH", "momentum_score": 78.0, "tradability": "TRADABLE", "execution_available": 1, "is_swing_candidate": 1, "is_scalping_candidate": 1, "is_hedge_candidate": 0, "last_synced_at": now_utc},
        {"instrument_id": "BINANCE:ETH/USDT:SPOT", "symbol": "ETH/USDT", "canonical_symbol": "BINANCE:ETH/USDT", "display_name": "Ethereum / USDT", "company_name": "Ethereum Network", "asset_class": "Crypto", "exchange": "Binance", "provider": "CCXT", "instrument_type": "SPOT", "lot_size": 0.001, "tick_size": 0.01, "last_price": 3450.0, "change_24h": 1.80, "volume_24h": 1950000000.0, "high_24h": 3520.0, "low_24h": 3410.0, "volatility_score": 65.0, "volatility_category": "High", "directional_bias": "BULLISH", "momentum_score": 72.0, "tradability": "TRADABLE", "execution_available": 1, "is_swing_candidate": 1, "is_scalping_candidate": 1, "is_hedge_candidate": 0, "last_synced_at": now_utc},
        {"instrument_id": "BINANCE:SOL/USDT:SPOT", "symbol": "SOL/USDT", "canonical_symbol": "BINANCE:SOL/USDT", "display_name": "Solana / USDT", "company_name": "Solana Network", "asset_class": "Crypto", "exchange": "Binance", "provider": "CCXT", "instrument_type": "SPOT", "lot_size": 0.01, "tick_size": 0.01, "last_price": 145.0, "change_24h": 4.10, "volume_24h": 920000000.0, "high_24h": 148.5, "low_24h": 139.0, "volatility_score": 76.0, "volatility_category": "Extreme", "directional_bias": "BULLISH", "momentum_score": 84.0, "tradability": "TRADABLE", "execution_available": 1, "is_swing_candidate": 1, "is_scalping_candidate": 1, "is_hedge_candidate": 0, "last_synced_at": now_utc},
        {"instrument_id": "NASDAQ:AAPL:EQ", "symbol": "AAPL", "canonical_symbol": "NASDAQ:AAPL", "display_name": "Apple Inc.", "company_name": "Apple Inc.", "asset_class": "Global Equities", "exchange": "NASDAQ", "provider": "YahooFinance", "instrument_type": "EQUITY", "lot_size": 1, "tick_size": 0.01, "last_price": 224.50, "change_24h": 0.90, "volume_24h": 54000000.0, "high_24h": 226.0, "low_24h": 223.0, "volatility_score": 44.0, "volatility_category": "Medium", "directional_bias": "BULLISH", "momentum_score": 60.0, "tradability": "TRADABLE", "execution_available": 1, "is_swing_candidate": 1, "is_scalping_candidate": 0, "is_hedge_candidate": 0, "last_synced_at": now_utc},
        {"instrument_id": "NASDAQ:MSFT:EQ", "symbol": "MSFT", "canonical_symbol": "NASDAQ:MSFT", "display_name": "Microsoft Corp.", "company_name": "Microsoft Corporation", "asset_class": "Global Equities", "exchange": "NASDAQ", "provider": "YahooFinance", "instrument_type": "EQUITY", "lot_size": 1, "tick_size": 0.01, "last_price": 448.0, "change_24h": 0.65, "volume_24h": 22000000.0, "high_24h": 451.0, "low_24h": 445.0, "volatility_score": 40.0, "volatility_category": "Medium", "directional_bias": "BULLISH", "momentum_score": 58.0, "tradability": "TRADABLE", "execution_available": 1, "is_swing_candidate": 1, "is_scalping_candidate": 0, "is_hedge_candidate": 0, "last_synced_at": now_utc},
        {"instrument_id": "NASDAQ:NVDA:EQ", "symbol": "NVDA", "canonical_symbol": "NASDAQ:NVDA", "display_name": "NVIDIA Corp.", "company_name": "NVIDIA Corporation", "asset_class": "Global Equities", "exchange": "NASDAQ", "provider": "YahooFinance", "instrument_type": "EQUITY", "lot_size": 1, "tick_size": 0.01, "last_price": 128.0, "change_24h": 3.20, "volume_24h": 88000000.0, "high_24h": 131.0, "low_24h": 125.0, "volatility_score": 72.0, "volatility_category": "High", "directional_bias": "BULLISH", "momentum_score": 82.0, "tradability": "TRADABLE", "execution_available": 1, "is_swing_candidate": 1, "is_scalping_candidate": 1, "is_hedge_candidate": 0, "last_synced_at": now_utc},
        {"instrument_id": "OANDA:EURUSD:FX", "symbol": "EURUSD", "canonical_symbol": "OANDA:EURUSD", "display_name": "EUR / USD", "company_name": "Euro / US Dollar", "asset_class": "Forex", "exchange": "OANDA", "provider": "OANDA", "instrument_type": "FOREX", "lot_size": 1000, "tick_size": 0.00001, "last_price": 1.0875, "change_24h": -0.15, "volume_24h": 125000000.0, "high_24h": 1.0910, "low_24h": 1.0850, "volatility_score": 35.0, "volatility_category": "Medium", "directional_bias": "NEUTRAL", "momentum_score": 48.0, "tradability": "TRADABLE", "execution_available": 1, "is_swing_candidate": 1, "is_scalping_candidate": 0, "is_hedge_candidate": 0, "last_synced_at": now_utc},
        {"instrument_id": "COM:XAUUSD:COMM", "symbol": "XAUUSD", "canonical_symbol": "COM:XAUUSD", "display_name": "Gold / USD", "company_name": "Gold Spot Ounce", "asset_class": "Commodities", "exchange": "COMEX", "provider": "Commodities", "instrument_type": "COMMODITY", "lot_size": 1, "tick_size": 0.01, "last_price": 2420.0, "change_24h": 0.75, "volume_24h": 45000000.0, "high_24h": 2435.0, "low_24h": 2410.0, "volatility_score": 50.0, "volatility_category": "Medium", "directional_bias": "BULLISH", "momentum_score": 65.0, "tradability": "TRADABLE", "execution_available": 1, "is_swing_candidate": 1, "is_scalping_candidate": 0, "is_hedge_candidate": 1, "last_synced_at": now_utc}
    ]
    db.bulk_upsert_instruments(baseline)


class MarketUniverseManager:
    """Central Engine for Market Universe discovery, multi-provider synchronization, derivatives lifecycle, and intelligence."""

    @staticmethod
    def sync_all_markets() -> Dict[str, Any]:
        """Runs full multi-market synchronization across NSE, BSE, Global Equities, Crypto, Forex, and Commodities."""
        start_t = time.time()
        now_utc = datetime.now(timezone.utc).isoformat()
        logger.info("Starting Market Universe 2.0 full multi-provider synchronization...")

        registry = get_provider_registry()
        providers = registry.get_all_providers()
        all_instruments: List[Dict[str, Any]] = []
        errors: List[str] = []

        per_provider_report: Dict[str, Dict[str, Any]] = {}

        for p in providers:
            p_id = p.get_provider_id()
            p_name = p.get_provider_name()
            try:
                logger.info(f"Syncing market data from provider: {p_name} ({p_id})...")
                p_insts = p.get_instruments()
                all_instruments.extend(p_insts)
                per_provider_report[p_id] = {
                    "provider_name": p_name,
                    "count": len(p_insts),
                    "status": "SUCCESS"
                }
            except Exception as e:
                err_msg = f"Error syncing provider {p_name}: {e}"
                logger.error(err_msg)
                errors.append(err_msg)
                per_provider_report[p_id] = {
                    "provider_name": p_name,
                    "count": 0,
                    "status": "ERROR",
                    "error": str(e)
                }

        # Deduplicate instruments by instrument_id
        deduped = {}
        for inst in all_instruments:
            iid = inst.get("instrument_id")
            if iid and iid not in deduped:
                deduped[iid] = inst

        unique_instruments = list(deduped.values())

        # Step 2: Handle Expired Derivative Contracts
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        expired_count = 0
        for inst in unique_instruments:
            exp = inst.get("expiry")
            if exp and exp != "PERPETUAL" and exp < today_str:
                inst["contract_status"] = "EXPIRED"
                inst["tradability"] = "DATA_ONLY"
                expired_count += 1

        # Step 3: Bulk Upsert into SQLite
        inserted, updated = db.bulk_upsert_instruments(unique_instruments)
        duration_s = round(time.time() - start_t, 2)
        summary = db.get_universe_summary_stats()

        # Step 4: Log Sync Run History
        sync_id = db.log_sync_run(
            job_name="SYNC_ALL_MARKETS",
            provider_id="MULTI_PROVIDER",
            started_at=now_utc,
            finished_at=datetime.now(timezone.utc).isoformat(),
            status="SUCCESS" if not errors else "PARTIAL_SUCCESS",
            records_seen=len(unique_instruments),
            records_added=inserted,
            records_updated=updated,
            records_expired=expired_count,
            errors=errors
        )

        logger.info(
            f"Market Universe 2.0 Sync Completed in {duration_s}s: "
            f"Seen={len(unique_instruments)}, Added={inserted}, Updated={updated}, Expired={expired_count}. "
            f"Total Universe={summary.get('total_instruments', 0)}"
        )

        return {
            "status": "SUCCESS" if not errors else "PARTIAL_SUCCESS",
            "sync_id": sync_id,
            "duration_seconds": duration_s,
            "discovered": len(unique_instruments),
            "inserted": inserted,
            "updated": updated,
            "expired": expired_count,
            "total_instruments": summary.get("total_instruments", 0),
            "stats": summary,
            "per_provider": per_provider_report,
            "providers": registry.get_provider_statuses(),
            "provider_health": registry.get_provider_statuses(),
            "errors": errors
        }

    @staticmethod
    def sync_provider(provider_id: str) -> Dict[str, Any]:
        """Runs on-demand sync for a specific target provider."""
        start_t = time.time()
        now_utc = datetime.now(timezone.utc).isoformat()
        registry = get_provider_registry()
        provider = registry.get_provider(provider_id)

        if not provider:
            return {"status": "ERROR", "error": f"Provider '{provider_id}' not found in registry."}

        try:
            insts = provider.get_instruments()
            inserted, updated = db.bulk_upsert_instruments(insts)
            duration_s = round(time.time() - start_t, 2)

            db.log_sync_run(
                job_name=f"SYNC_{provider_id.upper()}",
                provider_id=provider_id,
                started_at=now_utc,
                finished_at=datetime.now(timezone.utc).isoformat(),
                status="SUCCESS",
                records_seen=len(insts),
                records_added=inserted,
                records_updated=updated,
                records_expired=0
            )

            return {
                "status": "SUCCESS",
                "provider_id": provider_id,
                "provider_name": provider.get_provider_name(),
                "duration_seconds": duration_s,
                "discovered": len(insts),
                "inserted": inserted,
                "updated": updated
            }
        except Exception as exc:
            logger.error(f"Error syncing single provider {provider_id}: {exc}")
            return {"status": "ERROR", "error": str(exc)}

    @staticmethod
    def get_option_chain(underlying: str, expiry: Optional[str] = None) -> Dict[str, Any]:
        """Fetches authoritative option chain for an underlying."""
        chain_data = db.get_option_chain_from_db(underlying, expiry)
        if not chain_data.get("strikes"):
            # Fallback: Trigger sync and query again
            MarketUniverseManager.sync_all_markets()
            chain_data = db.get_option_chain_from_db(underlying, expiry)
        return chain_data

    @staticmethod
    def get_futures_chain(underlying: str) -> List[Dict[str, Any]]:
        """Fetches Near, Next, Far futures contracts for an underlying."""
        fut_chain = db.get_futures_chain_from_db(underlying)
        if not fut_chain:
            MarketUniverseManager.sync_all_markets()
            fut_chain = db.get_futures_chain_from_db(underlying)
        return fut_chain

    @staticmethod
    def calculate_market_intelligence() -> Dict[str, Any]:
        """Computes and returns explainable real-time market intelligence candidate rankings."""
        all_insts = db.get_instruments_master(limit=1000).get("instruments", [])

        # 1. Top High Volatility
        vol_ranked = sorted(
            [i for i in all_insts if i.get("volatility_category") in ["High", "Extreme"]],
            key=lambda x: x.get("volatility_score", 0.0),
            reverse=True
        )[:20]

        # 2. Top Momentum
        momentum_ranked = sorted(
            all_insts,
            key=lambda x: x.get("momentum_score", 0.0),
            reverse=True
        )[:20]

        # 3. Top Bullish & Bearish
        bullish = sorted(
            [i for i in all_insts if i.get("directional_bias") == "BULLISH"],
            key=lambda x: x.get("change_24h", 0.0),
            reverse=True
        )[:20]

        bearish = sorted(
            [i for i in all_insts if i.get("directional_bias") == "BEARISH"],
            key=lambda x: x.get("change_24h", 0.0)
        )[:20]

        # 4. Swing Candidates (High Range + Medium-to-High Volatility)
        swing_candidates = [i for i in all_insts if i.get("is_swing_candidate") == 1][:20]

        # 5. Scalping Candidates (High volume + Tight spread + High Liquidity)
        scalping_candidates = [i for i in all_insts if i.get("is_scalping_candidate") == 1][:20]

        # 6. Hedging Candidates (Indices, Futures & Put Options)
        hedging_candidates = [i for i in all_insts if i.get("is_hedge_candidate") == 1][:20]

        return {
            "top_volatility": vol_ranked,
            "top_momentum": momentum_ranked,
            "top_bullish": bullish,
            "top_bearish": bearish,
            "top_swing": swing_candidates,
            "top_scalping": scalping_candidates,
            "top_hedging": hedging_candidates,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }

    @staticmethod
    def get_provider_health_dashboard() -> List[Dict[str, Any]]:
        """Returns live provider health status with latencies and error logs."""
        registry = get_provider_registry()
        return registry.get_provider_statuses()

    @staticmethod
    def get_global_market_sessions() -> List[Dict[str, Any]]:
        """
        Evaluates real-time global exchange market session statuses and trading calendars.
        Determines whether exchanges are OPEN, PRE-MARKET, POST-MARKET, or CLOSED.
        """
        now_utc = datetime.now(timezone.utc)
        weekday = now_utc.weekday() # 0 = Monday, 6 = Sunday

        sessions = []

        # 1. Crypto Market (24/7)
        sessions.append({
            "market_id": "crypto_247",
            "name": "Global Crypto",
            "country": "Global",
            "timezone": "UTC",
            "local_time": now_utc.strftime("%H:%M:%S UTC"),
            "status": "OPEN",
            "status_label": "24/7 Trading",
            "hours": "24 Hours / 7 Days",
            "badge_color": "emerald"
        })

        # 2. Indian Markets (NSE / BSE) - UTC+5:30
        ist_now = now_utc + timedelta(hours=5, minutes=30)
        ist_hour = ist_now.hour
        ist_minute = ist_now.minute
        ist_time_dec = ist_hour + (ist_minute / 60.0)

        if weekday >= 5: # Saturday or Sunday
            nse_status = "CLOSED"
            nse_label = "Weekend Closed"
        elif 9.0 <= ist_time_dec < 9.25:
            nse_status = "PRE_MARKET"
            nse_label = "Pre-Market Auction"
        elif 9.25 <= ist_time_dec <= 15.5:
            nse_status = "OPEN"
            nse_label = "Regular Trading"
        elif 15.5 < ist_time_dec <= 16.0:
            nse_status = "POST_MARKET"
            nse_label = "Post-Market Closing"
        else:
            nse_status = "CLOSED"
            nse_label = "Market Closed"

        sessions.append({
            "market_id": "nse_india",
            "name": "NSE / BSE India",
            "country": "India",
            "timezone": "Asia/Kolkata (IST)",
            "local_time": ist_now.strftime("%H:%M:%S IST"),
            "status": nse_status,
            "status_label": nse_label,
            "hours": "09:15 - 15:30 IST",
            "badge_color": "emerald" if nse_status == "OPEN" else "amber" if "PRE" in nse_status or "POST" in nse_status else "slate"
        })

        # 3. US Markets (NYSE / NASDAQ) - UTC-4 (EDT)
        ny_now = now_utc - timedelta(hours=4)
        ny_time_dec = ny_now.hour + (ny_now.minute / 60.0)

        if weekday >= 5:
            ny_status = "CLOSED"
            ny_label = "Weekend Closed"
        elif 4.0 <= ny_time_dec < 9.5:
            ny_status = "PRE_MARKET"
            ny_label = "Pre-Market Session"
        elif 9.5 <= ny_time_dec <= 16.0:
            ny_status = "OPEN"
            ny_label = "Regular Trading"
        elif 16.0 < ny_time_dec <= 20.0:
            ny_status = "POST_MARKET"
            ny_label = "After-Hours Session"
        else:
            ny_status = "CLOSED"
            ny_label = "Market Closed"

        sessions.append({
            "market_id": "us_nyse_nasdaq",
            "name": "NYSE / NASDAQ",
            "country": "United States",
            "timezone": "America/New_York (EDT)",
            "local_time": ny_now.strftime("%H:%M:%S EDT"),
            "status": ny_status,
            "status_label": ny_label,
            "hours": "09:30 - 16:00 EDT",
            "badge_color": "emerald" if ny_status == "OPEN" else "amber" if "PRE" in ny_status or "POST" in ny_status else "slate"
        })

        # 4. London Stock Exchange (LSE) - UTC+1 (BST)
        lon_now = now_utc + timedelta(hours=1)
        lon_time_dec = lon_now.hour + (lon_now.minute / 60.0)

        if weekday >= 5:
            lon_status = "CLOSED"
            lon_label = "Weekend Closed"
        elif 8.0 <= lon_time_dec <= 16.5:
            lon_status = "OPEN"
            lon_label = "Regular Trading"
        else:
            lon_status = "CLOSED"
            lon_label = "Market Closed"

        sessions.append({
            "market_id": "lse_london",
            "name": "London (LSE)",
            "country": "United Kingdom",
            "timezone": "Europe/London (BST)",
            "local_time": lon_now.strftime("%H:%M:%S BST"),
            "status": lon_status,
            "status_label": lon_label,
            "hours": "08:00 - 16:30 BST",
            "badge_color": "emerald" if lon_status == "OPEN" else "slate"
        })

        # 5. Tokyo Stock Exchange (TSE) - UTC+9 (JST)
        tky_now = now_utc + timedelta(hours=9)
        tky_time_dec = tky_now.hour + (tky_now.minute / 60.0)

        if weekday >= 5:
            tky_status = "CLOSED"
            tky_label = "Weekend Closed"
        elif (9.0 <= tky_time_dec <= 11.5) or (12.5 <= tky_time_dec <= 15.5):
            tky_status = "OPEN"
            tky_label = "Regular Trading"
        elif 11.5 < tky_time_dec < 12.5:
            tky_status = "PRE_MARKET"
            tky_label = "Lunch Intermission"
        else:
            tky_status = "CLOSED"
            tky_label = "Market Closed"

        sessions.append({
            "market_id": "tse_tokyo",
            "name": "Tokyo (TSE)",
            "country": "Japan",
            "timezone": "Asia/Tokyo (JST)",
            "local_time": tky_now.strftime("%H:%M:%S JST"),
            "status": tky_status,
            "status_label": tky_label,
            "hours": "09:00 - 15:30 JST",
            "badge_color": "emerald" if tky_status == "OPEN" else "slate"
        })

        return sessions

    @staticmethod
    def get_global_heatmaps() -> Dict[str, Any]:
        """
        Groups universe instruments by Asset Class & Sector for performance heatmaps.
        """
        all_insts = db.get_instruments_master(limit=500).get("instruments", [])

        asset_classes: Dict[str, List[Dict[str, Any]]] = {}
        for inst in all_insts:
            ac = inst.get("asset_class", "Other")
            if ac not in asset_classes:
                asset_classes[ac] = []
            asset_classes[ac].append({
                "instrument_id": inst.get("instrument_id"),
                "symbol": inst.get("symbol"),
                "canonical_symbol": inst.get("canonical_symbol"),
                "name": inst.get("display_symbol") or inst.get("symbol"),
                "exchange": inst.get("exchange"),
                "last_price": inst.get("last_price", 0.0),
                "change_24h": inst.get("change_24h", 0.0),
                "volume_24h": inst.get("volume_24h", 0.0),
                "volatility_score": inst.get("volatility_score", 50.0),
                "directional_bias": inst.get("directional_bias", "NEUTRAL"),
                "currency": inst.get("currency", "USD")
            })

        return {
            "heatmaps": asset_classes,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    @staticmethod
    def run_server_side_scanner(rules: Dict[str, Any], asset_class: str = "ALL", limit: int = 50) -> List[Dict[str, Any]]:
        """
        Evaluates structured scanner rules (ALL, ANY, NOT) server-side against the instrument master.
        """
        all_insts = db.get_instruments_master(limit=1000, asset_class=asset_class).get("instruments", [])
        matched = []

        all_rules = rules.get("all", [])
        any_rules = rules.get("any", [])
        not_rules = rules.get("not", [])

        for inst in all_insts:
            # Check 'ALL' conditions
            passed_all = True
            for r in all_rules:
                field = r.get("field")
                op = r.get("op")
                val = r.get("value")
                inst_val = inst.get(field)

                if inst_val is None:
                    passed_all = False
                    break
                if op == ">=" and not (inst_val >= val):
                    passed_all = False; break
                elif op == "<=" and not (inst_val <= val):
                    passed_all = False; break
                elif op == ">" and not (inst_val > val):
                    passed_all = False; break
                elif op == "<" and not (inst_val < val):
                    passed_all = False; break
                elif op == "==" and not (str(inst_val).upper() == str(val).upper()):
                    passed_all = False; break
                elif op == "in" and inst_val not in val:
                    passed_all = False; break

            if not passed_all:
                continue

            # Check 'ANY' conditions (if any present, at least one must pass)
            if any_rules:
                passed_any = False
                for r in any_rules:
                    field = r.get("field")
                    op = r.get("op")
                    val = r.get("value")
                    inst_val = inst.get(field)
                    if inst_val is not None:
                        if op == ">=" and (inst_val >= val): passed_any = True; break
                        elif op == "<=" and (inst_val <= val): passed_any = True; break
                        elif op == ">" and (inst_val > val): passed_any = True; break
                        elif op == "<" and (inst_val < val): passed_any = True; break
                        elif op == "==" and (str(inst_val).upper() == str(val).upper()): passed_any = True; break
                if not passed_any:
                    continue

            # Check 'NOT' conditions (none must match)
            if not_rules:
                failed_not = False
                for r in not_rules:
                    field = r.get("field")
                    op = r.get("op")
                    val = r.get("value")
                    inst_val = inst.get(field)
                    if inst_val is not None and op == "==" and str(inst_val).upper() == str(val).upper():
                        failed_not = True; break
                if failed_not:
                    continue

            matched.append(inst)
            if len(matched) >= limit:
                break

        return matched
