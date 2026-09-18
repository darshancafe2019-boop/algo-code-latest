import logging
from typing import Dict, Any, Tuple, Optional
from src import config, db

logger = logging.getLogger("OrderRouter")


class MultiAssetOrderRouter:
    """
    Asset-class specific Order Router with Live Trading Protection & Safety Flags.
    Routes signals to Crypto, Stock (Indian/Global), or Forex Execution Adapters.
    """

    @staticmethod
    def route_order(
        symbol: str,
        signal_type: str,
        position_size: float,
        price: float,
        asset_class: str = "Crypto",
        is_live: bool = False,
        exchange: Optional[str] = None
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Routes order to appropriate adapter while verifying safety controls.
        """
        # Safety Check 1: Instrument controls
        inst = db.get_market_instrument(symbol)
        if inst:
            if is_live and not inst.get("live_enabled", False):
                return False, f"Live trading disabled for instrument '{symbol}'. Must explicitly activate Live control.", {}
            if inst.get("tradability") == "DATA_ONLY":
                return False, f"Instrument '{symbol}' is DATA ONLY. Execution adapter unavailable.", {}


        # Safety Check 2: Global & Asset-Class Safety Flags
        master_live = getattr(config, "MASTER_LIVE_TRADING", False)
        if is_live and not master_live:
            return False, "MASTER_LIVE_TRADING is OFF. Live order rejected.", {}

        if is_live:
            if asset_class == "Crypto" and not getattr(config, "CRYPTO_LIVE_TRADING", True):
                return False, "CRYPTO_LIVE_TRADING flag is disabled.", {}
            elif asset_class == "Stock" and inst and inst.get("country") == "IN" and not getattr(config, "INDIAN_STOCK_LIVE_TRADING", False):
                return False, "INDIAN_STOCK_LIVE_TRADING flag is disabled.", {}
            elif asset_class == "Stock" and inst and inst.get("country") != "IN" and not getattr(config, "GLOBAL_STOCK_LIVE_TRADING", False):
                return False, "GLOBAL_STOCK_LIVE_TRADING flag is disabled.", {}
            elif asset_class == "Forex" and not getattr(config, "FOREX_LIVE_TRADING", False):
                return False, "FOREX_LIVE_TRADING flag is disabled.", {}

        # Route to Authoritative Execution Adapter without duplication
        ex_lower = (exchange or "").lower()
        if ex_lower in ["delta_exchange", "delta_india", "delta_global", "delta"] or asset_class in ["Crypto_Options", "Crypto_Futures"] or (inst and inst.get("exchange") in ["DELTA_EXCHANGE", "DELTA_INDIA"]):
            adapter_name = "Delta Exchange Adapter (Crypto Spot/Futures/Options)"
        elif ex_lower in ["binance", "binance_futures", "binance_spot"] or (asset_class == "Crypto" and "BTC" in symbol or "ETH" in symbol or "USDT" in symbol):
            adapter_name = "Binance Unified Adapter (Spot/Futures/Options)"
        elif ex_lower in ["fyers", "fyers_api"]:
            adapter_name = "Fyers API v3 Broker Adapter"
        elif ex_lower in ["angelone", "angel", "smartapi"]:
            adapter_name = "Angel One SmartAPI Broker Adapter"
        elif ex_lower in ["zerodha", "kite"]:
            adapter_name = "Zerodha Kite Connect v3 Broker Adapter"
        elif ex_lower in ["exness", "mt5", "exness_fx"]:
            adapter_name = "Exness MT5 Multi-Asset Broker Adapter"
        elif asset_class == "Stock" and inst and inst.get("country") == "IN":
            adapter_name = "Upstox Indian Stock Broker Adapter (NSE/BSE)"
        elif asset_class == "Forex" or ex_lower in ["forex", "oanda"]:
            adapter_name = "Exness / Forex Execution Adapter"
        elif asset_class == "Stock":
            adapter_name = "Global Stock Broker Adapter (Alpaca/Paper)"
        else:
            adapter_name = "Quant.OS Authoritative Paper Execution Engine"

        mode_str = "LIVE REAL-MONEY" if is_live else "PAPER SIMULATION"
        logger.info(f"Routed {signal_type} for {symbol} ({asset_class}) via {adapter_name} [{mode_str}] @ ${price:,.2f}")

        return True, f"Order routed successfully via {adapter_name} [{mode_str}]", {
            "adapter": adapter_name,
            "symbol": symbol,
            "signal_type": signal_type,
            "price": price,
            "size": position_size,
            "mode": mode_str
        }
