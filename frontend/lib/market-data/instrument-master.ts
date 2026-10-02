/**
 * Centralized Live Market Data Engine - Authoritative Instrument Master & Resolver
 * Provides comprehensive resolution across Indian Indices, Equities, Futures, and Option strikes.
 */

import { InstrumentMasterRecord, ExchangeSegment, BrokerProvider } from "./types";

export type CanonicalInstrumentRecord = InstrumentMasterRecord;
export type { InstrumentMasterRecord };

export interface ResolvedInstrument {
  symbol: string;
  tradingSymbol: string;
  securityId: string;
  exchangeSegment: ExchangeSegment;
  instrumentType: "INDEX" | "EQUITY" | "FUTURES" | "OPTION_CE" | "OPTION_PE" | "CRYPTO_PERP";
  lotSize: number;
  tickSize: number;
  underlying?: string;
  strike?: number;
  expiry?: string;
  optionType?: "CE" | "PE";
  provider: BrokerProvider;
  status: "RESOLVED" | "INSTRUMENT_NOT_FOUND";
}

class InstrumentMaster {
  private static instance: InstrumentMaster | null = null;
  private bySymbol: Map<string, InstrumentMasterRecord> = new Map();
  private bySecurityId: Map<string, InstrumentMasterRecord> = new Map();

  private constructor() {
    this.seedCanonicalInstruments();
  }

  public static getInstance(): InstrumentMaster {
    if (!InstrumentMaster.instance) {
      InstrumentMaster.instance = new InstrumentMaster();
    }
    return InstrumentMaster.instance;
  }

  private seedCanonicalInstruments() {
    const seeds: InstrumentMasterRecord[] = [
      // ── 1. NSE / BSE Active Option Contracts (INDIAN_OPTIONS) ─────────────
      {
        symbol: "NIFTY 25000 CE",
        tradingSymbol: "NIFTY 26OCT 25000 CE",
        securityId: "NSE_FO|NIFTY26OCT25000CE",
        exchange: "NSE_FNO",
        provider: "upstox",
        instrumentType: "OPTION",
        lotSize: 25,
        tickSize: 0.05,
        underlying: "NIFTY",
      },
      {
        symbol: "NIFTY 25000 PE",
        tradingSymbol: "NIFTY 26OCT 25000 PE",
        securityId: "NSE_FO|NIFTY26OCT25000PE",
        exchange: "NSE_FNO",
        provider: "upstox",
        instrumentType: "OPTION",
        lotSize: 25,
        tickSize: 0.05,
        underlying: "NIFTY",
      },
      {
        symbol: "NIFTY 25100 CE",
        tradingSymbol: "NIFTY 26OCT 25100 CE",
        securityId: "NSE_FO|NIFTY26OCT25100CE",
        exchange: "NSE_FNO",
        provider: "upstox",
        instrumentType: "OPTION",
        lotSize: 25,
        tickSize: 0.05,
        underlying: "NIFTY",
      },
      {
        symbol: "NIFTY 25100 PE",
        tradingSymbol: "NIFTY 26OCT 25100 PE",
        securityId: "NSE_FO|NIFTY26OCT25100PE",
        exchange: "NSE_FNO",
        provider: "upstox",
        instrumentType: "OPTION",
        lotSize: 25,
        tickSize: 0.05,
        underlying: "NIFTY",
      },
      {
        symbol: "NIFTY 25200 CE",
        tradingSymbol: "NIFTY 26OCT 25200 CE",
        securityId: "NSE_FO|NIFTY26OCT25200CE",
        exchange: "NSE_FNO",
        provider: "upstox",
        instrumentType: "OPTION",
        lotSize: 25,
        tickSize: 0.05,
        underlying: "NIFTY",
      },
      {
        symbol: "NIFTY 25200 PE",
        tradingSymbol: "NIFTY 26OCT 25200 PE",
        securityId: "NSE_FO|NIFTY26OCT25200PE",
        exchange: "NSE_FNO",
        provider: "upstox",
        instrumentType: "OPTION",
        lotSize: 25,
        tickSize: 0.05,
        underlying: "NIFTY",
      },
      {
        symbol: "BANKNIFTY 54000 CE",
        tradingSymbol: "BANKNIFTY 26OCT 54000 CE",
        securityId: "NSE_FO|BANKNIFTY26OCT54000CE",
        exchange: "NSE_FNO",
        provider: "upstox",
        instrumentType: "OPTION",
        lotSize: 15,
        tickSize: 0.05,
        underlying: "BANKNIFTY",
      },
      {
        symbol: "BANKNIFTY 54000 PE",
        tradingSymbol: "BANKNIFTY 26OCT 54000 PE",
        securityId: "NSE_FO|BANKNIFTY26OCT54000PE",
        exchange: "NSE_FNO",
        provider: "upstox",
        instrumentType: "OPTION",
        lotSize: 15,
        tickSize: 0.05,
        underlying: "BANKNIFTY",
      },
      {
        symbol: "BANKNIFTY 54500 CE",
        tradingSymbol: "BANKNIFTY 26OCT 54500 CE",
        securityId: "NSE_FO|BANKNIFTY26OCT54500CE",
        exchange: "NSE_FNO",
        provider: "upstox",
        instrumentType: "OPTION",
        lotSize: 15,
        tickSize: 0.05,
        underlying: "BANKNIFTY",
      },
      {
        symbol: "BANKNIFTY 54500 PE",
        tradingSymbol: "BANKNIFTY 26OCT 54500 PE",
        securityId: "NSE_FO|BANKNIFTY26OCT54500PE",
        exchange: "NSE_FNO",
        provider: "upstox",
        instrumentType: "OPTION",
        lotSize: 15,
        tickSize: 0.05,
        underlying: "BANKNIFTY",
      },
      {
        symbol: "FINNIFTY 24000 CE",
        tradingSymbol: "FINNIFTY 26OCT 24000 CE",
        securityId: "NSE_FO|FINNIFTY26OCT24000CE",
        exchange: "NSE_FNO",
        provider: "upstox",
        instrumentType: "OPTION",
        lotSize: 25,
        tickSize: 0.05,
        underlying: "FINNIFTY",
      },
      {
        symbol: "FINNIFTY 24000 PE",
        tradingSymbol: "FINNIFTY 26OCT 24000 PE",
        securityId: "NSE_FO|FINNIFTY26OCT24000PE",
        exchange: "NSE_FNO",
        provider: "upstox",
        instrumentType: "OPTION",
        lotSize: 25,
        tickSize: 0.05,
        underlying: "FINNIFTY",
      },
      {
        symbol: "SENSEX 82000 CE",
        tradingSymbol: "SENSEX 26OCT 82000 CE",
        securityId: "BSE_FO|SENSEX26OCT82000CE",
        exchange: "BSE_FNO",
        provider: "upstox",
        instrumentType: "OPTION",
        lotSize: 10,
        tickSize: 0.05,
        underlying: "SENSEX",
      },
      {
        symbol: "SENSEX 82000 PE",
        tradingSymbol: "SENSEX 26OCT 82000 PE",
        securityId: "BSE_FO|SENSEX26OCT82000PE",
        exchange: "BSE_FNO",
        provider: "upstox",
        instrumentType: "OPTION",
        lotSize: 10,
        tickSize: 0.05,
        underlying: "SENSEX",
      },
      {
        symbol: "RELIANCE 3000 CE",
        tradingSymbol: "RELIANCE 26OCT 3000 CE",
        securityId: "NSE_FO|RELIANCE26OCT3000CE",
        exchange: "NSE_FNO",
        provider: "upstox",
        instrumentType: "OPTION",
        lotSize: 250,
        tickSize: 0.05,
        underlying: "RELIANCE",
      },
      {
        symbol: "RELIANCE 3000 PE",
        tradingSymbol: "RELIANCE 26OCT 3000 PE",
        securityId: "NSE_FO|RELIANCE26OCT3000PE",
        exchange: "NSE_FNO",
        provider: "upstox",
        instrumentType: "OPTION",
        lotSize: 250,
        tickSize: 0.05,
        underlying: "RELIANCE",
      },

      // ── 2. NSE / BSE Indices (INDIAN_INDICES) ─────────────────────────────
      {
        symbol: "NIFTY",
        tradingSymbol: "NIFTY 50",
        securityId: "NSE_INDEX|Nifty 50",
        exchange: "NSE_EQ",
        provider: "upstox",
        instrumentType: "INDEX",
        lotSize: 25,
        tickSize: 0.05,
      },
      {
        symbol: "NIFTY 50",
        tradingSymbol: "NIFTY 50",
        securityId: "NSE_INDEX|Nifty 50",
        exchange: "NSE_EQ",
        provider: "upstox",
        instrumentType: "INDEX",
        lotSize: 25,
        tickSize: 0.05,
      },
      {
        symbol: "BANKNIFTY",
        tradingSymbol: "NIFTY BANK",
        securityId: "NSE_INDEX|Nifty Bank",
        exchange: "NSE_EQ",
        provider: "upstox",
        instrumentType: "INDEX",
        lotSize: 15,
        tickSize: 0.05,
      },
      {
        symbol: "NIFTY BANK",
        tradingSymbol: "NIFTY BANK",
        securityId: "NSE_INDEX|Nifty Bank",
        exchange: "NSE_EQ",
        provider: "upstox",
        instrumentType: "INDEX",
        lotSize: 15,
        tickSize: 0.05,
      },
      {
        symbol: "FINNIFTY",
        tradingSymbol: "NIFTY FIN SERVICE",
        securityId: "NSE_INDEX|Nifty Fin Service",
        exchange: "NSE_EQ",
        provider: "upstox",
        instrumentType: "INDEX",
        lotSize: 25,
        tickSize: 0.05,
      },
      {
        symbol: "MIDCPNIFTY",
        tradingSymbol: "NIFTY MID SELECT",
        securityId: "NSE_INDEX|NIFTY MID SELECT",
        exchange: "NSE_EQ",
        provider: "upstox",
        instrumentType: "INDEX",
        lotSize: 50,
        tickSize: 0.05,
      },
      {
        symbol: "SENSEX",
        tradingSymbol: "BSE SENSEX",
        securityId: "BSE_INDEX|SENSEX",
        exchange: "BSE_EQ",
        provider: "upstox",
        instrumentType: "INDEX",
        lotSize: 10,
        tickSize: 0.05,
      },
      {
        symbol: "INDIA_VIX",
        tradingSymbol: "INDIA VIX",
        securityId: "NSE_INDEX|INDIA VIX",
        exchange: "NSE_EQ",
        provider: "upstox",
        instrumentType: "INDEX",
        lotSize: 1,
        tickSize: 0.01,
      },
      {
        symbol: "INDIAVIX",
        tradingSymbol: "INDIA VIX",
        securityId: "NSE_INDEX|INDIA VIX",
        exchange: "NSE_EQ",
        provider: "upstox",
        instrumentType: "INDEX",
        lotSize: 1,
        tickSize: 0.01,
      },
      {
        symbol: "NIFTY IT",
        tradingSymbol: "NIFTY IT",
        securityId: "NSE_INDEX|NIFTY IT",
        exchange: "NSE_EQ",
        provider: "upstox",
        instrumentType: "INDEX",
        lotSize: 25,
        tickSize: 0.05,
      },
      {
        symbol: "NIFTY AUTO",
        tradingSymbol: "NIFTY AUTO",
        securityId: "NSE_INDEX|NIFTY AUTO",
        exchange: "NSE_EQ",
        provider: "upstox",
        instrumentType: "INDEX",
        lotSize: 25,
        tickSize: 0.05,
      },
      {
        symbol: "NIFTY PHARMA",
        tradingSymbol: "NIFTY PHARMA",
        securityId: "NSE_INDEX|NIFTY PHARMA",
        exchange: "NSE_EQ",
        provider: "upstox",
        instrumentType: "INDEX",
        lotSize: 25,
        tickSize: 0.05,
      },
      {
        symbol: "NIFTY FMCG",
        tradingSymbol: "NIFTY FMCG",
        securityId: "NSE_INDEX|NIFTY FMCG",
        exchange: "NSE_EQ",
        provider: "upstox",
        instrumentType: "INDEX",
        lotSize: 25,
        tickSize: 0.05,
      },
      {
        symbol: "NIFTY METAL",
        tradingSymbol: "NIFTY METAL",
        securityId: "NSE_INDEX|NIFTY METAL",
        exchange: "NSE_EQ",
        provider: "upstox",
        instrumentType: "INDEX",
        lotSize: 25,
        tickSize: 0.05,
      },
      {
        symbol: "BANKEX",
        tradingSymbol: "BSE BANKEX",
        securityId: "BSE_INDEX|BANKEX",
        exchange: "BSE_EQ",
        provider: "upstox",
        instrumentType: "INDEX",
        lotSize: 15,
        tickSize: 0.05,
      },

      // ── 3. Indian Futures (INDIAN_FUTURES) ─────────────────────────────────
      {
        symbol: "NIFTY-FUT",
        tradingSymbol: "NIFTY 26OCT FUT",
        securityId: "NSE_FO|NIFTY26OCTFUT",
        exchange: "NSE_FNO",
        provider: "upstox",
        instrumentType: "FUTURES",
        lotSize: 25,
        tickSize: 0.05,
        underlying: "NIFTY",
      },
      {
        symbol: "BANKNIFTY-FUT",
        tradingSymbol: "BANKNIFTY 26OCT FUT",
        securityId: "NSE_FO|BANKNIFTY26OCTFUT",
        exchange: "NSE_FNO",
        provider: "upstox",
        instrumentType: "FUTURES",
        lotSize: 15,
        tickSize: 0.05,
        underlying: "BANKNIFTY",
      },
      {
        symbol: "FINNIFTY-FUT",
        tradingSymbol: "FINNIFTY 26OCT FUT",
        securityId: "NSE_FO|FINNIFTY26OCTFUT",
        exchange: "NSE_FNO",
        provider: "upstox",
        instrumentType: "FUTURES",
        lotSize: 25,
        tickSize: 0.05,
        underlying: "FINNIFTY",
      },
      {
        symbol: "MIDCPNIFTY-FUT",
        tradingSymbol: "MIDCPNIFTY 26OCT FUT",
        securityId: "NSE_FO|MIDCPNIFTY26OCTFUT",
        exchange: "NSE_FNO",
        provider: "upstox",
        instrumentType: "FUTURES",
        lotSize: 50,
        tickSize: 0.05,
        underlying: "MIDCPNIFTY",
      },
      {
        symbol: "RELIANCE-FUT",
        tradingSymbol: "RELIANCE 26OCT FUT",
        securityId: "NSE_FO|RELIANCE26OCTFUT",
        exchange: "NSE_FNO",
        provider: "upstox",
        instrumentType: "FUTURES",
        lotSize: 250,
        tickSize: 0.05,
        underlying: "RELIANCE",
      },
      {
        symbol: "TCS-FUT",
        tradingSymbol: "TCS 26OCT FUT",
        securityId: "NSE_FO|TCS26OCTFUT",
        exchange: "NSE_FNO",
        provider: "upstox",
        instrumentType: "FUTURES",
        lotSize: 175,
        tickSize: 0.05,
        underlying: "TCS",
      },
      {
        symbol: "HDFCBANK-FUT",
        tradingSymbol: "HDFCBANK 26OCT FUT",
        securityId: "NSE_FO|HDFCBANK26OCTFUT",
        exchange: "NSE_FNO",
        provider: "upstox",
        instrumentType: "FUTURES",
        lotSize: 550,
        tickSize: 0.05,
        underlying: "HDFCBANK",
      },
      {
        symbol: "INFY-FUT",
        tradingSymbol: "INFY 26OCT FUT",
        securityId: "NSE_FO|INFY26OCTFUT",
        exchange: "NSE_FNO",
        provider: "upstox",
        instrumentType: "FUTURES",
        lotSize: 400,
        tickSize: 0.05,
        underlying: "INFY",
      },
      {
        symbol: "SBIN-FUT",
        tradingSymbol: "SBIN 26OCT FUT",
        securityId: "NSE_FO|SBIN26OCTFUT",
        exchange: "NSE_FNO",
        provider: "upstox",
        instrumentType: "FUTURES",
        lotSize: 750,
        tickSize: 0.05,
        underlying: "SBIN",
      },

      // ── 4. NSE Heavyweight Equities (INDIAN_STOCKS) ────────────────────────
      {
        symbol: "RELIANCE",
        tradingSymbol: "RELIANCE-EQ",
        securityId: "NSE_EQ|INE002A01018",
        exchange: "NSE_EQ",
        provider: "upstox",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "HDFCBANK",
        tradingSymbol: "HDFCBANK-EQ",
        securityId: "NSE_EQ|INE040A01034",
        exchange: "NSE_EQ",
        provider: "upstox",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "ICICIBANK",
        tradingSymbol: "ICICIBANK-EQ",
        securityId: "NSE_EQ|INE090A01021",
        exchange: "NSE_EQ",
        provider: "upstox",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "TCS",
        tradingSymbol: "TCS-EQ",
        securityId: "NSE_EQ|INE467B01029",
        exchange: "NSE_EQ",
        provider: "upstox",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "INFY",
        tradingSymbol: "INFY-EQ",
        securityId: "NSE_EQ|INE009A01021",
        exchange: "NSE_EQ",
        provider: "upstox",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "SBIN",
        tradingSymbol: "SBIN-EQ",
        securityId: "NSE_EQ|INE062A01020",
        exchange: "NSE_EQ",
        provider: "upstox",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "BHARTIARTL",
        tradingSymbol: "BHARTIARTL-EQ",
        securityId: "NSE_EQ|INE397D01024",
        exchange: "NSE_EQ",
        provider: "upstox",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "KOTAKBANK",
        tradingSymbol: "KOTAKBANK-EQ",
        securityId: "NSE_EQ|INE237A01028",
        exchange: "NSE_EQ",
        provider: "upstox",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "LT",
        tradingSymbol: "LT-EQ",
        securityId: "NSE_EQ|INE018A01030",
        exchange: "NSE_EQ",
        provider: "upstox",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "AXISBANK",
        tradingSymbol: "AXISBANK-EQ",
        securityId: "NSE_EQ|INE238A01034",
        exchange: "NSE_EQ",
        provider: "upstox",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "TATAMOTORS",
        tradingSymbol: "TATAMOTORS-EQ",
        securityId: "NSE_EQ|INE155A01022",
        exchange: "NSE_EQ",
        provider: "upstox",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "ITC",
        tradingSymbol: "ITC-EQ",
        securityId: "NSE_EQ|INE154A01025",
        exchange: "NSE_EQ",
        provider: "upstox",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "HINDUNILVR",
        tradingSymbol: "HINDUNILVR-EQ",
        securityId: "NSE_EQ|INE030A01027",
        exchange: "NSE_EQ",
        provider: "upstox",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "BAJFINANCE",
        tradingSymbol: "BAJFINANCE-EQ",
        securityId: "NSE_EQ|INE296A01024",
        exchange: "NSE_EQ",
        provider: "upstox",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "MARUTI",
        tradingSymbol: "MARUTI-EQ",
        securityId: "NSE_EQ|INE585B01010",
        exchange: "NSE_EQ",
        provider: "upstox",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "SUNPHARMA",
        tradingSymbol: "SUNPHARMA-EQ",
        securityId: "NSE_EQ|INE044A01036",
        exchange: "NSE_EQ",
        provider: "upstox",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "TITAN",
        tradingSymbol: "TITAN-EQ",
        securityId: "NSE_EQ|INE280A01028",
        exchange: "NSE_EQ",
        provider: "upstox",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "TATASTEEL",
        tradingSymbol: "TATASTEEL-EQ",
        securityId: "NSE_EQ|INE081A01020",
        exchange: "NSE_EQ",
        provider: "upstox",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },
      {
        symbol: "WIPRO",
        tradingSymbol: "WIPRO-EQ",
        securityId: "NSE_EQ|INE075A01022",
        exchange: "NSE_EQ",
        provider: "upstox",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.05,
      },

      // ── 5. Delta Crypto Perps (CRYPTO_FUTURES) ─────────────────────────────
      {
        symbol: "BTC-PERP",
        tradingSymbol: "BTCUSD-PERP",
        securityId: "DELTA:BTCUSD:PERP",
        exchange: "DELTA_PERP",
        provider: "delta",
        instrumentType: "CRYPTO_PERP",
        lotSize: 1,
        tickSize: 0.1,
      },
      {
        symbol: "ETH-PERP",
        tradingSymbol: "ETHUSD-PERP",
        securityId: "DELTA:ETHUSD:PERP",
        exchange: "DELTA_PERP",
        provider: "delta",
        instrumentType: "CRYPTO_PERP",
        lotSize: 1,
        tickSize: 0.01,
      },
      {
        symbol: "SOL-PERP",
        tradingSymbol: "SOLUSD-PERP",
        securityId: "DELTA:SOLUSD:PERP",
        exchange: "DELTA_PERP",
        provider: "delta",
        instrumentType: "CRYPTO_PERP",
        lotSize: 1,
        tickSize: 0.01,
      },
      {
        symbol: "XRP-PERP",
        tradingSymbol: "XRPUSD-PERP",
        securityId: "DELTA:XRPUSD:PERP",
        exchange: "DELTA_PERP",
        provider: "delta",
        instrumentType: "CRYPTO_PERP",
        lotSize: 1,
        tickSize: 0.0001,
      },
      {
        symbol: "DOGE-PERP",
        tradingSymbol: "DOGEUSD-PERP",
        securityId: "DELTA:DOGEUSD:PERP",
        exchange: "DELTA_PERP",
        provider: "delta",
        instrumentType: "CRYPTO_PERP",
        lotSize: 10,
        tickSize: 0.00001,
      },

      // ── 6. Binance Spot Crypto (CRYPTO_SPOT) ───────────────────────────────
      {
        symbol: "BTC/USDT",
        tradingSymbol: "BTCUSDT",
        securityId: "BINANCE:BTC/USDT:SPOT",
        exchange: "BINANCE_SPOT",
        provider: "binance",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.01,
      },
      {
        symbol: "ETH/USDT",
        tradingSymbol: "ETHUSDT",
        securityId: "BINANCE:ETH/USDT:SPOT",
        exchange: "BINANCE_SPOT",
        provider: "binance",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.01,
      },
      {
        symbol: "SOL/USDT",
        tradingSymbol: "SOLUSDT",
        securityId: "BINANCE:SOL/USDT:SPOT",
        exchange: "BINANCE_SPOT",
        provider: "binance",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.01,
      },
      {
        symbol: "XRP/USDT",
        tradingSymbol: "XRPUSDT",
        securityId: "BINANCE:XRP/USDT:SPOT",
        exchange: "BINANCE_SPOT",
        provider: "binance",
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.0001,
      },
      {
        symbol: "DOGE/USDT",
        tradingSymbol: "DOGEUSDT",
        securityId: "BINANCE:DOGE/USDT:SPOT",
        exchange: "BINANCE_SPOT",
        provider: "binance",
        instrumentType: "EQUITY",
        lotSize: 10,
        tickSize: 0.00001,
      },

      // ── 7. MCX Commodities (MCX_COMMODITIES) ──────────────────────────────
      {
        symbol: "GOLD",
        tradingSymbol: "GOLD M",
        securityId: "MCX-GOLD",
        exchange: "MCX_COMM",
        provider: "dhan",
        instrumentType: "FUTURES",
        lotSize: 1,
        tickSize: 1.0,
      },
      {
        symbol: "SILVER",
        tradingSymbol: "SILVER M",
        securityId: "MCX-SILVER",
        exchange: "MCX_COMM",
        provider: "dhan",
        instrumentType: "FUTURES",
        lotSize: 5,
        tickSize: 1.0,
      },
      {
        symbol: "CRUDEOIL",
        tradingSymbol: "CRUDEOIL",
        securityId: "MCX-CRUDEOIL",
        exchange: "MCX_COMM",
        provider: "dhan",
        instrumentType: "FUTURES",
        lotSize: 100,
        tickSize: 1.0,
      },
      {
        symbol: "NATURALGAS",
        tradingSymbol: "NATURALGAS",
        securityId: "MCX-NATGAS",
        exchange: "MCX_COMM",
        provider: "dhan",
        instrumentType: "FUTURES",
        lotSize: 1250,
        tickSize: 0.1,
      },
      {
        symbol: "COPPER",
        tradingSymbol: "COPPER",
        securityId: "MCX-COPPER",
        exchange: "MCX_COMM",
        provider: "dhan",
        instrumentType: "FUTURES",
        lotSize: 2500,
        tickSize: 0.05,
      },

      // ── 8. Forex FX Pairs (FOREX) ──────────────────────────────────────────
      {
        symbol: "EUR/USD",
        tradingSymbol: "EUR / USD (Euro / US Dollar)",
        securityId: "OANDA:EUR_USD",
        exchange: "FX",
        provider: "oanda" as any,
        instrumentType: "FOREX",
        lotSize: 1000,
        tickSize: 0.0001,
      },
      {
        symbol: "GBP/USD",
        tradingSymbol: "GBP / USD (British Pound / US Dollar)",
        securityId: "OANDA:GBP_USD",
        exchange: "FX",
        provider: "oanda" as any,
        instrumentType: "FOREX",
        lotSize: 1000,
        tickSize: 0.0001,
      },
      {
        symbol: "USD/JPY",
        tradingSymbol: "USD / JPY (US Dollar / Japanese Yen)",
        securityId: "OANDA:USD_JPY",
        exchange: "FX",
        provider: "oanda" as any,
        instrumentType: "FOREX",
        lotSize: 1000,
        tickSize: 0.01,
      },
      {
        symbol: "USD/INR",
        tradingSymbol: "USD / INR (US Dollar / Indian Rupee)",
        securityId: "NSE_CURR|USDINR",
        exchange: "NSE_CURR",
        provider: "upstox",
        instrumentType: "FOREX",
        lotSize: 1000,
        tickSize: 0.0025,
      },
      {
        symbol: "GBP/INR",
        tradingSymbol: "GBP / INR (British Pound / Indian Rupee)",
        securityId: "NSE_CURR|GBPINR",
        exchange: "NSE_CURR",
        provider: "upstox",
        instrumentType: "FOREX",
        lotSize: 1000,
        tickSize: 0.0025,
      },
      {
        symbol: "EUR/INR",
        tradingSymbol: "EUR / INR (Euro / Indian Rupee)",
        securityId: "NSE_CURR|EURINR",
        exchange: "NSE_CURR",
        provider: "upstox",
        instrumentType: "FOREX",
        lotSize: 1000,
        tickSize: 0.0025,
      },
      {
        symbol: "JPY/INR",
        tradingSymbol: "JPY / INR (100 Yen / Indian Rupee)",
        securityId: "NSE_CURR|JPYINR",
        exchange: "NSE_CURR",
        provider: "upstox",
        instrumentType: "FOREX",
        lotSize: 1000,
        tickSize: 0.0025,
      },
      {
        symbol: "AUD/USD",
        tradingSymbol: "AUD / USD (Aussie Dollar / US Dollar)",
        securityId: "OANDA:AUD_USD",
        exchange: "FX",
        provider: "oanda" as any,
        instrumentType: "FOREX",
        lotSize: 1000,
        tickSize: 0.0001,
      },
      {
        symbol: "USD/CAD",
        tradingSymbol: "USD / CAD (US Dollar / Canadian Dollar)",
        securityId: "OANDA:USD_CAD",
        exchange: "FX",
        provider: "oanda" as any,
        instrumentType: "FOREX",
        lotSize: 1000,
        tickSize: 0.0001,
      },
      {
        symbol: "USD/CHF",
        tradingSymbol: "USD / CHF (US Dollar / Swiss Franc)",
        securityId: "OANDA:USD_CHF",
        exchange: "FX",
        provider: "oanda" as any,
        instrumentType: "FOREX",
        lotSize: 1000,
        tickSize: 0.0001,
      },
      {
        symbol: "NZD/USD",
        tradingSymbol: "NZD / USD (Kiwi Dollar / US Dollar)",
        securityId: "OANDA:NZD_USD",
        exchange: "FX",
        provider: "oanda" as any,
        instrumentType: "FOREX",
        lotSize: 1000,
        tickSize: 0.0001,
      },
      {
        symbol: "EUR/GBP",
        tradingSymbol: "EUR / GBP (Euro / British Pound)",
        securityId: "OANDA:EUR_GBP",
        exchange: "FX",
        provider: "oanda" as any,
        instrumentType: "FOREX",
        lotSize: 1000,
        tickSize: 0.0001,
      },
      {
        symbol: "EUR/JPY",
        tradingSymbol: "EUR / JPY (Euro / Japanese Yen)",
        securityId: "OANDA:EUR_JPY",
        exchange: "FX",
        provider: "oanda" as any,
        instrumentType: "FOREX",
        lotSize: 1000,
        tickSize: 0.01,
      },
      {
        symbol: "GBP/JPY",
        tradingSymbol: "GBP / JPY (British Pound / Japanese Yen)",
        securityId: "OANDA:GBP_JPY",
        exchange: "FX",
        provider: "oanda" as any,
        instrumentType: "FOREX",
        lotSize: 1000,
        tickSize: 0.01,
      },
      {
        symbol: "EUR/CHF",
        tradingSymbol: "EUR / CHF (Euro / Swiss Franc)",
        securityId: "OANDA:EUR_CHF",
        exchange: "FX",
        provider: "oanda" as any,
        instrumentType: "FOREX",
        lotSize: 1000,
        tickSize: 0.0001,
      },
      {
        symbol: "AUD/JPY",
        tradingSymbol: "AUD / JPY (Aussie Dollar / Japanese Yen)",
        securityId: "OANDA:AUD_JPY",
        exchange: "FX",
        provider: "oanda" as any,
        instrumentType: "FOREX",
        lotSize: 1000,
        tickSize: 0.01,
      },
      {
        symbol: "NZD/JPY",
        tradingSymbol: "NZD / JPY (Kiwi Dollar / Japanese Yen)",
        securityId: "OANDA:NZD_JPY",
        exchange: "FX",
        provider: "oanda" as any,
        instrumentType: "FOREX",
        lotSize: 1000,
        tickSize: 0.01,
      },
      {
        symbol: "USD/SGD",
        tradingSymbol: "USD / SGD (US Dollar / Singapore Dollar)",
        securityId: "OANDA:USD_SGD",
        exchange: "FX",
        provider: "oanda" as any,
        instrumentType: "FOREX",
        lotSize: 1000,
        tickSize: 0.0001,
      },
      {
        symbol: "EUR/AUD",
        tradingSymbol: "EUR / AUD (Euro / Aussie Dollar)",
        securityId: "OANDA:EUR_AUD",
        exchange: "FX",
        provider: "oanda" as any,
        instrumentType: "FOREX",
        lotSize: 1000,
        tickSize: 0.0001,
      },

      // ── 9. US Stocks & Indices (US_STOCKS & US_INDICES) ───────────────────
      {
        symbol: "AAPL",
        tradingSymbol: "AAPL",
        securityId: "ALPACA:AAPL",
        exchange: "NASDAQ",
        provider: "alpaca" as any,
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.01,
      },
      {
        symbol: "MSFT",
        tradingSymbol: "MSFT",
        securityId: "ALPACA:MSFT",
        exchange: "NASDAQ",
        provider: "alpaca" as any,
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.01,
      },
      {
        symbol: "NVDA",
        tradingSymbol: "NVDA",
        securityId: "ALPACA:NVDA",
        exchange: "NASDAQ",
        provider: "alpaca" as any,
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.01,
      },
      {
        symbol: "TSLA",
        tradingSymbol: "TSLA",
        securityId: "ALPACA:TSLA",
        exchange: "NASDAQ",
        provider: "alpaca" as any,
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.01,
      },
      {
        symbol: "AMZN",
        tradingSymbol: "AMZN",
        securityId: "ALPACA:AMZN",
        exchange: "NASDAQ",
        provider: "alpaca" as any,
        instrumentType: "EQUITY",
        lotSize: 1,
        tickSize: 0.01,
      },
      {
        symbol: "SPX",
        tradingSymbol: "S&P 500",
        securityId: "ALPACA:SPX",
        exchange: "NYSE",
        provider: "alpaca" as any,
        instrumentType: "INDEX",
        lotSize: 1,
        tickSize: 0.01,
      },
      {
        symbol: "NDX",
        tradingSymbol: "NASDAQ 100",
        securityId: "ALPACA:NDX",
        exchange: "NASDAQ",
        provider: "alpaca" as any,
        instrumentType: "INDEX",
        lotSize: 1,
        tickSize: 0.01,
      },

      // ── 10. Delta Crypto Options (CRYPTO_OPTIONS) ──────────────────────────
      {
        symbol: "BTC 65000 CALL",
        tradingSymbol: "BTC 65000 CE (26OCT)",
        securityId: "DELTA:BTC-65000-CALL",
        exchange: "DELTA_OPT",
        provider: "delta",
        instrumentType: "OPTION",
        lotSize: 1,
        tickSize: 1.0,
      },
      {
        symbol: "BTC 65000 PUT",
        tradingSymbol: "BTC 65000 PE (26OCT)",
        securityId: "DELTA:BTC-65000-PUT",
        exchange: "DELTA_OPT",
        provider: "delta",
        instrumentType: "OPTION",
        lotSize: 1,
        tickSize: 1.0,
      },
      {
        symbol: "ETH 2700 CALL",
        tradingSymbol: "ETH 2700 CE (26OCT)",
        securityId: "DELTA:ETH-2700-CALL",
        exchange: "DELTA_OPT",
        provider: "delta",
        instrumentType: "OPTION",
        lotSize: 1,
        tickSize: 0.1,
      },
      {
        symbol: "ETH 2700 PUT",
        tradingSymbol: "ETH 2700 PE (26OCT)",
        securityId: "DELTA:ETH-2700-PUT",
        exchange: "DELTA_OPT",
        provider: "delta",
        instrumentType: "OPTION",
        lotSize: 1,
        tickSize: 0.1,
      },
      {
        symbol: "DOGE-PERP",
        tradingSymbol: "DOGE/USDT Perpetual",
        securityId: "DOGE-USDT-PERP",
        exchange: "DELTA_PERP",
        provider: "delta",
        instrumentType: "CRYPTO_PERP",
        lotSize: 10,
        tickSize: 0.00001,
      },
      {
        symbol: "BTC-OPT",
        tradingSymbol: "BTC Options Hub",
        securityId: "BTC-OPTIONS-DELTA",
        exchange: "DELTA_OPT",
        provider: "delta",
        instrumentType: "OPTION",
        lotSize: 1,
        tickSize: 0.1,
      },
      {
        symbol: "ETH-OPT",
        tradingSymbol: "ETH Options Hub",
        securityId: "ETH-OPTIONS-DELTA",
        exchange: "DELTA_OPT",
        provider: "delta",
        instrumentType: "OPTION",
        lotSize: 1,
        tickSize: 0.01,
      },
    ];

    for (const record of seeds) {
      this.register(record);
    }
  }

  public register(record: InstrumentMasterRecord): void {
    const symKey = record.symbol.toUpperCase();
    const secKey = `${record.exchange}:${record.securityId}`;

    this.bySymbol.set(symKey, record);
    if (!this.bySecurityId.has(secKey)) {
      this.bySecurityId.set(secKey, record);
    }
    if (!this.bySecurityId.has(record.securityId)) {
      this.bySecurityId.set(record.securityId, record);
    }
  }

  public resolve(symbol: string, exchange?: ExchangeSegment): InstrumentMasterRecord | undefined {
    const symKey = symbol.toUpperCase().trim();
    const found = this.bySymbol.get(symKey);
    if (found) return found;

    // Direct matches by tradingSymbol
    for (const rec of this.bySymbol.values()) {
      if (
        rec.tradingSymbol.toUpperCase() === symKey ||
        rec.symbol.toUpperCase() === symKey
      ) {
        if (!exchange || rec.exchange === exchange) {
          return rec;
        }
      }
    }
    return undefined;
  }

  public resolveBySecurityId(securityId: string, exchange?: ExchangeSegment): InstrumentMasterRecord | undefined {
    if (exchange) {
      const key = `${exchange}:${securityId}`;
      const found = this.bySecurityId.get(key);
      if (found) return found;
    }
    return this.bySecurityId.get(securityId);
  }

  public getAll(): InstrumentMasterRecord[] {
    return Array.from(this.bySymbol.values());
  }

  public getByProvider(provider: BrokerProvider): InstrumentMasterRecord[] {
    return Array.from(this.bySymbol.values()).filter((r) => r.provider === provider);
  }

  public getExpiriesForUnderlying(underlying: string): string[] {
    const u = underlying?.toUpperCase() || "NIFTY";
    if (u === "NIFTY" || u === "BANKNIFTY" || u === "FINNIFTY") {
      return ["2026-10-09", "2026-10-16", "2026-10-23", "2026-10-30", "2026-11-27"];
    }
    if (u.includes("BTC") || u.includes("ETH") || u.includes("SOL")) {
      return ["2026-10-09", "2026-10-16", "2026-10-23", "2026-10-30", "2026-12-25"];
    }
    return ["2026-10-09", "2026-10-30", "2026-11-27"];
  }

  /**
   * Fast indexed search supporting tokenized queries, options (e.g. "NIFTY 25000 CE"),
   * futures, stocks, indices, crypto, forex, and commodities.
   */
  public search(query: string, category: string = "ALL", limit: number = 60): InstrumentMasterRecord[] {
    const q = query.trim().toUpperCase();
    const cat = category.toUpperCase();

    // If query is an option expression like "NIFTY 25000 CE", dynamically resolve and return it
    if (q) {
      const optionMatch = q.match(/^([A-Z]+)\s+(\d+)\s+(CE|PE)$/);
      if (optionMatch) {
        const underlying = optionMatch[1];
        const strike = parseInt(optionMatch[2], 10);
        const optType = optionMatch[3] as "CE" | "PE";
        const symbol = `${underlying} ${strike} ${optType}`;
        const secId = `OPT-${underlying}-${strike}-${optType}`;
        const dynRecord: InstrumentMasterRecord = {
          symbol,
          tradingSymbol: symbol,
          securityId: secId,
          exchange: "NSE_FNO",
          provider: "dhan",
          instrumentType: "OPTION",
          lotSize: underlying === "BANKNIFTY" ? 15 : underlying === "FINNIFTY" ? 25 : 25,
          tickSize: 0.05,
          underlying,
          strikePrice: strike,
          optionType: optType,
        };
        return [dynRecord];
      }
    }

    const allRecords = Array.from(this.bySymbol.values());

    // Filter by category
    const categoryFiltered = allRecords.filter((rec) => {
      if (cat === "ALL") return true;
      if (cat === "INDIAN_OPTIONS" || cat === "OPTIONS") {
        return (
          rec.instrumentType === "OPTION" &&
          (rec.exchange === "NSE_FNO" || rec.exchange === "BSE_FNO" || rec.exchange === "NSE_FO" || rec.symbol.includes("CE") || rec.symbol.includes("PE")) &&
          !rec.exchange?.includes("DELTA")
        );
      }
      if (cat === "INDIAN_INDICES" || cat === "INDICES") {
        return (
          rec.instrumentType === "INDEX" &&
          !["SPX", "NDX", "DJI", "VIX"].includes(rec.symbol) &&
          !rec.exchange?.includes("NASDAQ") &&
          !rec.exchange?.includes("NYSE")
        );
      }
      if (cat === "INDIAN_FUTURES" || cat === "FUTURES") {
        return (
          rec.instrumentType === "FUTURES" &&
          (rec.exchange === "NSE_FNO" || rec.exchange === "BSE_FNO" || rec.exchange === "NSE_FO" || rec.symbol.endsWith("-FUT")) &&
          !rec.exchange?.includes("MCX")
        );
      }
      if (cat === "INDIAN_STOCKS" || cat === "STOCKS" || cat === "EQUITIES") {
        return (
          rec.instrumentType === "EQUITY" &&
          (rec.exchange === "NSE_EQ" || rec.exchange === "BSE_EQ" || rec.exchange === "NSE" || rec.exchange === "BSE") &&
          !rec.symbol.includes("/") &&
          !rec.exchange?.includes("NASDAQ") &&
          !rec.exchange?.includes("NYSE")
        );
      }
      if (cat === "MCX_COMMODITIES" || cat === "COMMODITIES") {
        return (
          rec.exchange === "MCX_COMM" ||
          rec.exchange === "MCX" ||
          ["GOLD", "SILVER", "CRUDEOIL", "NATURALGAS", "COPPER"].includes(rec.symbol)
        );
      }
      if (cat === "US_STOCKS") {
        return (
          (rec.exchange === "NASDAQ" || rec.exchange === "NYSE") &&
          rec.instrumentType === "EQUITY" &&
          !["SPX", "NDX", "DJI"].includes(rec.symbol)
        );
      }
      if (cat === "US_INDICES") {
        return ["SPX", "NDX", "DJI"].includes(rec.symbol) || (rec.exchange === "NYSE" && rec.instrumentType === "INDEX");
      }
      if (cat === "FOREX") {
        return (
          rec.instrumentType === "FOREX" ||
          rec.exchange === "FX" ||
          (rec.exchange === "NSE_CURR" && !rec.symbol.includes("USDT")) ||
          rec.symbol.includes("/USD") ||
          rec.symbol.includes("/INR") ||
          rec.symbol.includes("/JPY") ||
          rec.symbol.includes("/EUR") ||
          rec.symbol.includes("/GBP") ||
          rec.symbol.includes("/CHF") ||
          rec.symbol.includes("/CAD") ||
          rec.symbol.includes("/AUD") ||
          rec.symbol.includes("/NZD") ||
          rec.symbol.includes("/SGD")
        ) && !rec.exchange?.includes("BINANCE") && !rec.exchange?.includes("DELTA") && !rec.symbol.includes("USDT");
      }
      if (cat === "CRYPTO_SPOT") {
        return (
          (rec.exchange === "BINANCE_SPOT" ||
            rec.exchange === "BINANCE" ||
            (rec.symbol.includes("/USDT") && rec.instrumentType !== "CRYPTO_PERP" && rec.instrumentType !== "OPTION")) &&
          rec.exchange !== "NSE_CURR"
        );
      }
      if (cat === "CRYPTO_FUTURES" || cat === "CRYPTO_PERP") {
        return (
          rec.instrumentType === "CRYPTO_PERP" ||
          rec.exchange === "DELTA_PERP" ||
          rec.exchange === "BINANCE_FUTURES" ||
          rec.symbol.endsWith("-PERP")
        );
      }
      if (cat === "CRYPTO_OPTIONS") {
        return (
          rec.exchange === "DELTA_OPT" ||
          rec.exchange === "DELTA_INDIA" ||
          rec.symbol.includes("CALL") ||
          rec.symbol.includes("PUT") ||
          rec.symbol.includes("-OPT")
        );
      }
      return true;
    });

    if (!q) {
      return categoryFiltered.slice(0, limit);
    }

    const queryTokens = q.split(/[\s\-_/]+/).filter(Boolean);
    const cleanQ = q.replace(/[/_\-\s]/g, "");

    // Score matches
    const scored = categoryFiltered.map((rec) => {
      const sym = rec.symbol.toUpperCase();
      const ts = rec.tradingSymbol.toUpperCase();
      const name = (rec.underlying || "").toUpperCase();
      const cleanSym = sym.replace(/[/_\-\s]/g, "");
      const cleanTs = ts.replace(/[/_\-\s]/g, "");

      let score = 0;
      if (sym === q || ts === q || cleanSym === cleanQ || cleanTs === cleanQ) score += 100;
      else if (sym.startsWith(q) || ts.startsWith(q) || cleanSym.startsWith(cleanQ)) score += 60;
      else if (sym.includes(q) || ts.includes(q) || cleanSym.includes(cleanQ)) score += 35;

      for (const token of queryTokens) {
        if (sym.includes(token)) score += 15;
        if (ts.includes(token)) score += 15;
        if (name.includes(token)) score += 10;
      }

      return { rec, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.rec);
  }
}

export const instrumentMaster = InstrumentMaster.getInstance();

/**
 * Authoritative InstrumentResolver for Phase 6
 * Dynamically resolves Indices, Equities, Futures, and Options contracts.
 */
export class InstrumentResolver {
  public static resolve(rawInput: string): ResolvedInstrument {
    if (!rawInput || typeof rawInput !== "string") {
      return {
        symbol: "",
        tradingSymbol: "",
        securityId: "",
        exchangeSegment: "NSE_EQ",
        instrumentType: "INDEX",
        lotSize: 1,
        tickSize: 0.05,
        provider: "dhan",
        status: "INSTRUMENT_NOT_FOUND",
      };
    }

    const input = rawInput.trim().toUpperCase();

    // 1. Direct match in canonical registry
    const registered = instrumentMaster.resolve(input);
    if (registered) {
      return {
        symbol: registered.symbol,
        tradingSymbol: registered.tradingSymbol,
        securityId: registered.securityId,
        exchangeSegment: registered.exchange,
        instrumentType: registered.instrumentType as any,
        lotSize: registered.lotSize,
        tickSize: registered.tickSize,
        underlying: registered.symbol,
        provider: registered.provider,
        status: "RESOLVED",
      };
    }

    // 2. Parse Options (e.g., "NIFTY 24500 CE", "NIFTY24SEP24500CE", "BANKNIFTY 52000 PE")
    const optionMatch = input.match(/^([A-Z]+)\s*(\d{1,2}[A-Z]{3}\d{2}|\d{2}[A-Z]{3})?\s*(\d+)\s*(CE|PE)$/i) ||
                        input.match(/^([A-Z]+)\s*(\d+)\s*(CE|PE)$/i);

    if (optionMatch) {
      const underlying = optionMatch[1];
      let expiry: string | undefined;
      let strike: number;
      let optionType: "CE" | "PE";

      if (optionMatch.length === 5) {
        expiry = optionMatch[2];
        strike = parseInt(optionMatch[3], 10);
        optionType = optionMatch[4] as "CE" | "PE";
      } else {
        strike = parseInt(optionMatch[2], 10);
        optionType = optionMatch[3] as "CE" | "PE";
      }

      const canonicalUnd = instrumentMaster.resolve(underlying);
      const lotSize = canonicalUnd ? canonicalUnd.lotSize : (underlying === "BANKNIFTY" ? 15 : 25);
      const formattedSymbol = `${underlying} ${strike} ${optionType}`;

      return {
        symbol: formattedSymbol,
        tradingSymbol: `${underlying}${expiry || ""}${strike}${optionType}`,
        securityId: `OPT_${underlying}_${strike}_${optionType}`,
        exchangeSegment: "NSE_FNO",
        instrumentType: optionType === "CE" ? "OPTION_CE" : "OPTION_PE",
        lotSize,
        tickSize: 0.05,
        underlying,
        strike,
        expiry,
        optionType,
        provider: "dhan",
        status: "RESOLVED",
      };
    }

    // 3. Parse Futures (e.g., "NIFTY-FUT", "NIFTY FUT", "BANKNIFTY-FUT")
    const futMatch = input.match(/^([A-Z]+)[-\s]*(FUT|FUTURES)$/i);
    if (futMatch) {
      const underlying = futMatch[1];
      const canonicalUnd = instrumentMaster.resolve(underlying);
      const lotSize = canonicalUnd ? canonicalUnd.lotSize : (underlying === "BANKNIFTY" ? 15 : 25);

      return {
        symbol: `${underlying}-FUT`,
        tradingSymbol: `${underlying} FUT`,
        securityId: `FUT_${underlying}`,
        exchangeSegment: "NSE_FNO",
        instrumentType: "FUTURES",
        lotSize,
        tickSize: 0.05,
        underlying,
        provider: "dhan",
        status: "RESOLVED",
      };
    }

    return {
      symbol: input,
      tradingSymbol: input,
      securityId: "",
      exchangeSegment: "NSE_EQ",
      instrumentType: "INDEX",
      lotSize: 1,
      tickSize: 0.05,
      provider: "dhan",
      status: "INSTRUMENT_NOT_FOUND",
    };
  }

  public static resolveOrThrow(rawInput: string): ResolvedInstrument {
    const resolved = InstrumentResolver.resolve(rawInput);
    if (resolved.status === "INSTRUMENT_NOT_FOUND" || !resolved.securityId) {
      throw new Error(`INSTRUMENT_NOT_FOUND: Unable to resolve security ID for "${rawInput}"`);
    }
    return resolved;
  }
}

/**
 * DhanInstrumentResolver
 * Authoritative resolver for DhanHQ V2 official instrument and security ID master.
 */
export class DhanInstrumentResolver {
  private static cache: Map<string, ResolvedInstrument> = new Map();
  private static lastSyncTimestamp: number = 0;
  private static syncIntervalMs: number = 24 * 60 * 60 * 1000; // Daily cache refresh

  /**
   * Resolves an instrument symbol, tradingSymbol, or query to a fully qualified ResolvedInstrument.
   * Throws INSTRUMENT_NOT_FOUND if the instrument cannot be authoritatively resolved.
   */
  public static resolve(symbolOrQuery: string, exchange?: ExchangeSegment): ResolvedInstrument {
    if (!symbolOrQuery || typeof symbolOrQuery !== "string") {
      throw new Error(`INSTRUMENT_NOT_FOUND: Invalid instrument query "${symbolOrQuery}"`);
    }

    const key = `${exchange || ""}:${symbolOrQuery.trim().toUpperCase()}`;
    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }

    // Attempt resolution via InstrumentMaster
    const registered = instrumentMaster.resolve(symbolOrQuery, exchange);
    if (registered) {
      const resolved: ResolvedInstrument = {
        symbol: registered.symbol,
        tradingSymbol: registered.tradingSymbol,
        securityId: registered.securityId,
        exchangeSegment: registered.exchange,
        instrumentType: registered.instrumentType as any,
        lotSize: registered.lotSize,
        tickSize: registered.tickSize,
        underlying: registered.symbol,
        provider: "dhan",
        status: "RESOLVED",
      };
      this.cache.set(key, resolved);
      return resolved;
    }

    // Dynamic resolution (options, futures)
    const dynamicRes = InstrumentResolver.resolve(symbolOrQuery);
    if (dynamicRes.status === "RESOLVED" && dynamicRes.securityId) {
      if (exchange) dynamicRes.exchangeSegment = exchange;
      this.cache.set(key, dynamicRes);
      return dynamicRes;
    }

    throw new Error(`INSTRUMENT_NOT_FOUND: Symbol "${symbolOrQuery}" cannot be resolved to a Dhan Security ID`);
  }

  /**
   * Safe resolution without throwing.
   */
  public static safeResolve(symbolOrQuery: string, exchange?: ExchangeSegment): ResolvedInstrument | null {
    try {
      return this.resolve(symbolOrQuery, exchange);
    } catch {
      return null;
    }
  }

  /**
   * Registers a batch of Dhan master instruments into memory.
   */
  public static registerBatch(records: InstrumentMasterRecord[]): void {
    for (const rec of records) {
      instrumentMaster.register(rec);
    }
    this.cache.clear();
    this.lastSyncTimestamp = Date.now();
  }

  /**
   * Clears internal resolver cache.
   */
  public static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Returns cache stats.
   */
  public static getStats() {
    return {
      cachedCount: this.cache.size,
      totalRegistered: instrumentMaster.getAll().length,
      lastSyncTimestamp: this.lastSyncTimestamp,
    };
  }
}
