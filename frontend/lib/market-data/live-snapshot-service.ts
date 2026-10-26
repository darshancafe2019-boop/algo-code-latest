import { NormalizedMarketTick } from "@/lib/market-data/market-feed-store";
import { getBackendBaseUrl, CANONICAL_CLOUD_BACKEND_URL } from "@/lib/config/gatewayConfig";

// In-Memory Live Price Cache
export interface LiveMarketItem {
  ltp: number;
  prevClose: number;
  chg: number;
  chgPct: number;
  bid: number;
  ask: number;
  vol: number;
  oi: number;
  exchange: string;
  provider: string;
  name: string;
  lastUpdated: number;
}

export const liveCache: Record<string, LiveMarketItem> = {
  // Baseline Real-World Anchor Prices
  "NIFTY": { ltp: 22693.45, prevClose: 22888.95, chg: -195.50, chgPct: -0.85, bid: 22692.00, ask: 22695.00, vol: 8200000, oi: 14500000, exchange: "NSE", provider: "UPSTOX", name: "NIFTY 50 Index", lastUpdated: Date.now() },
  "NIFTY 50": { ltp: 22693.45, prevClose: 22888.95, chg: -195.50, chgPct: -0.85, bid: 22692.00, ask: 22695.00, vol: 8200000, oi: 14500000, exchange: "NSE", provider: "UPSTOX", name: "NIFTY 50 Index", lastUpdated: Date.now() },
  "NSE:NIFTY": { ltp: 22693.45, prevClose: 22888.95, chg: -195.50, chgPct: -0.85, bid: 22692.00, ask: 22695.00, vol: 8200000, oi: 14500000, exchange: "NSE", provider: "UPSTOX", name: "NIFTY 50 Index", lastUpdated: Date.now() },
  "BANKNIFTY": { ltp: 54450.75, prevClose: 54259.90, chg: 190.85, chgPct: 0.35, bid: 54448.00, ask: 54452.00, vol: 4100000, oi: 3800000, exchange: "NSE", provider: "UPSTOX", name: "NIFTY Bank Index", lastUpdated: Date.now() },
  "NIFTY BANK": { ltp: 54450.75, prevClose: 54259.90, chg: 190.85, chgPct: 0.35, bid: 54448.00, ask: 54452.00, vol: 4100000, oi: 3800000, exchange: "NSE", provider: "UPSTOX", name: "NIFTY Bank Index", lastUpdated: Date.now() },
  "NSE:BANKNIFTY": { ltp: 54450.75, prevClose: 54259.90, chg: 190.85, chgPct: 0.35, bid: 54448.00, ask: 54452.00, vol: 4100000, oi: 3800000, exchange: "NSE", provider: "UPSTOX", name: "NIFTY Bank Index", lastUpdated: Date.now() },
  "FINNIFTY": { ltp: 24650.40, prevClose: 24580.00, chg: 70.40, chgPct: 0.29, bid: 24648.00, ask: 24652.00, vol: 1500000, oi: 1200000, exchange: "NSE", provider: "UPSTOX", name: "NIFTY Financial Services", lastUpdated: Date.now() },
  "MIDCPNIFTY": { ltp: 13195.00, prevClose: 13100.50, chg: 94.50, chgPct: 0.72, bid: 13193.00, ask: 13197.00, vol: 1900000, oi: 2100000, exchange: "NSE", provider: "UPSTOX", name: "NIFTY Midcap Select", lastUpdated: Date.now() },
  "SENSEX": { ltp: 71909.70, prevClose: 72529.10, chg: -619.40, chgPct: -0.85, bid: 71905.00, ask: 71914.00, vol: 3200000, oi: 950000, exchange: "BSE", provider: "UPSTOX", name: "BSE SENSEX 30", lastUpdated: Date.now() },
  "BANKEX": { ltp: 61850.00, prevClose: 61570.00, chg: 280.00, chgPct: 0.45, bid: 61845.00, ask: 61855.00, vol: 1400000, oi: 450000, exchange: "BSE", provider: "UPSTOX", name: "BSE BANKEX", lastUpdated: Date.now() },
  "INDIA VIX": { ltp: 13.45, prevClose: 13.80, chg: -0.35, chgPct: -2.54, bid: 13.40, ask: 13.50, vol: 450000, oi: 0, exchange: "NSE", provider: "UPSTOX", name: "India Volatility Index", lastUpdated: Date.now() },
  "INDIAVIX": { ltp: 13.45, prevClose: 13.80, chg: -0.35, chgPct: -2.54, bid: 13.40, ask: 13.50, vol: 450000, oi: 0, exchange: "NSE", provider: "UPSTOX", name: "India Volatility Index", lastUpdated: Date.now() },
  "NIFTY-FUT": { ltp: 25184.50, prevClose: 25079.00, chg: 105.50, chgPct: 0.42, bid: 25182.00, ask: 25186.00, vol: 8200000, oi: 15400000, exchange: "NSE", provider: "UPSTOX", name: "Nifty Futures", lastUpdated: Date.now() },
  "NSE:NIFTY-FUT": { ltp: 25184.50, prevClose: 25079.00, chg: 105.50, chgPct: 0.42, bid: 25182.00, ask: 25186.00, vol: 8200000, oi: 15400000, exchange: "NSE", provider: "UPSTOX", name: "Nifty Futures", lastUpdated: Date.now() },

  // Equities
  "RELIANCE": { ltp: 1167.70, prevClose: 1187.00, chg: -19.30, chgPct: -1.63, bid: 1167.50, ask: 1168.00, vol: 6200000, oi: 28500000, exchange: "NSE", provider: "UPSTOX", name: "Reliance Industries Ltd", lastUpdated: Date.now() },
  "NSE:RELIANCE": { ltp: 1167.70, prevClose: 1187.00, chg: -19.30, chgPct: -1.63, bid: 1167.50, ask: 1168.00, vol: 6200000, oi: 28500000, exchange: "NSE", provider: "UPSTOX", name: "Reliance Industries Ltd", lastUpdated: Date.now() },
  "HDFCBANK": { ltp: 1640.00, prevClose: 1635.00, chg: 5.00, chgPct: 0.30, bid: 1639.50, ask: 1640.50, vol: 6200000, oi: 42000000, exchange: "NSE", provider: "UPSTOX", name: "HDFC Bank Ltd", lastUpdated: Date.now() },
  "NSE:HDFCBANK": { ltp: 1640.00, prevClose: 1635.00, chg: 5.00, chgPct: 0.30, bid: 1639.50, ask: 1640.50, vol: 6200000, oi: 42000000, exchange: "NSE", provider: "UPSTOX", name: "HDFC Bank Ltd", lastUpdated: Date.now() },
  "ICICIBANK": { ltp: 1290.00, prevClose: 1271.50, chg: 18.50, chgPct: 1.45, bid: 1289.50, ask: 1290.50, vol: 8700000, oi: 31000000, exchange: "NSE", provider: "UPSTOX", name: "ICICI Bank Ltd", lastUpdated: Date.now() },
  "NSE:ICICIBANK": { ltp: 1290.00, prevClose: 1271.50, chg: 18.50, chgPct: 1.45, bid: 1289.50, ask: 1290.50, vol: 8700000, oi: 31000000, exchange: "NSE", provider: "UPSTOX", name: "ICICI Bank Ltd", lastUpdated: Date.now() },
  "INFY": { ltp: 1920.00, prevClose: 1928.50, chg: -8.50, chgPct: -0.45, bid: 1919.50, ask: 1920.50, vol: 5400000, oi: 18000000, exchange: "NSE", provider: "UPSTOX", name: "Infosys Ltd", lastUpdated: Date.now() },
  "NSE:INFY": { ltp: 1920.00, prevClose: 1928.50, chg: -8.50, chgPct: -0.45, bid: 1919.50, ask: 1920.50, vol: 5400000, oi: 18000000, exchange: "NSE", provider: "UPSTOX", name: "Infosys Ltd", lastUpdated: Date.now() },
  "TCS": { ltp: 2075.00, prevClose: 2050.60, chg: 24.40, chgPct: 1.19, bid: 2074.00, ask: 2076.00, vol: 4200000, oi: 11500000, exchange: "NSE", provider: "UPSTOX", name: "Tata Consultancy Services", lastUpdated: Date.now() },
  "NSE:TCS": { ltp: 2075.00, prevClose: 2050.60, chg: 24.40, chgPct: 1.19, bid: 2074.00, ask: 2076.00, vol: 4200000, oi: 11500000, exchange: "NSE", provider: "UPSTOX", name: "Tata Consultancy Services", lastUpdated: Date.now() },
  "SBIN": { ltp: 790.00, prevClose: 782.60, chg: 7.40, chgPct: 0.95, bid: 789.80, ask: 790.20, vol: 14200000, oi: 48000000, exchange: "NSE", provider: "UPSTOX", name: "State Bank of India", lastUpdated: Date.now() },
  "NSE:SBIN": { ltp: 790.00, prevClose: 782.60, chg: 7.40, chgPct: 0.95, bid: 789.80, ask: 790.20, vol: 14200000, oi: 48000000, exchange: "NSE", provider: "UPSTOX", name: "State Bank of India", lastUpdated: Date.now() },
  "BHARTIARTL": { ltp: 1540.00, prevClose: 1518.00, chg: 22.00, chgPct: 1.45, bid: 1539.50, ask: 1540.50, vol: 4800000, oi: 16000000, exchange: "NSE", provider: "UPSTOX", name: "Bharti Airtel Ltd", lastUpdated: Date.now() },
  "KOTAKBANK": { ltp: 1795.00, prevClose: 1783.00, chg: 12.00, chgPct: 0.67, bid: 1794.50, ask: 1795.50, vol: 3200000, oi: 12000000, exchange: "NSE", provider: "UPSTOX", name: "Kotak Mahindra Bank", lastUpdated: Date.now() },
  "LT": { ltp: 3640.00, prevClose: 3595.00, chg: 45.00, chgPct: 1.25, bid: 3639.00, ask: 3641.00, vol: 2800000, oi: 9500000, exchange: "NSE", provider: "UPSTOX", name: "Larsen & Toubro Ltd", lastUpdated: Date.now() },
  "AXISBANK": { ltp: 1195.00, prevClose: 1180.50, chg: 14.50, chgPct: 1.23, bid: 1194.50, ask: 1195.50, vol: 5800000, oi: 19000000, exchange: "NSE", provider: "UPSTOX", name: "Axis Bank Ltd", lastUpdated: Date.now() },
  "TATAMOTORS": { ltp: 990.00, prevClose: 969.50, chg: 20.50, chgPct: 2.10, bid: 989.50, ask: 990.50, vol: 11200000, oi: 35000000, exchange: "NSE", provider: "UPSTOX", name: "Tata Motors Ltd", lastUpdated: Date.now() },
  "ITC": { ltp: 495.00, prevClose: 491.50, chg: 3.50, chgPct: 0.71, bid: 494.80, ask: 495.20, vol: 18500000, oi: 52000000, exchange: "NSE", provider: "UPSTOX", name: "ITC Ltd", lastUpdated: Date.now() },

  // Crypto Live (Binance & Delta)
  "BTC/USDT": { ltp: 83712.00, prevClose: 85260.00, chg: -1548.00, chgPct: -1.82, bid: 83710.00, ask: 83714.00, vol: 435000, oi: 64200, exchange: "BINANCE_SPOT", provider: "BINANCE", name: "Bitcoin Spot", lastUpdated: Date.now() },
  "BTC": { ltp: 83712.00, prevClose: 85260.00, chg: -1548.00, chgPct: -1.82, bid: 83710.00, ask: 83714.00, vol: 435000, oi: 64200, exchange: "BINANCE_SPOT", provider: "BINANCE", name: "Bitcoin Spot", lastUpdated: Date.now() },
  "BINANCE:BTC/USDT": { ltp: 83712.00, prevClose: 85260.00, chg: -1548.00, chgPct: -1.82, bid: 83710.00, ask: 83714.00, vol: 435000, oi: 64200, exchange: "BINANCE_SPOT", provider: "BINANCE", name: "Bitcoin Spot", lastUpdated: Date.now() },
  "BTC-PERP": { ltp: 83712.00, prevClose: 85260.00, chg: -1548.00, chgPct: -1.82, bid: 83710.00, ask: 83714.00, vol: 435000, oi: 64200, exchange: "DELTA_PERP", provider: "DELTA", name: "Bitcoin Perpetual Future", lastUpdated: Date.now() },
  "ETH/USDT": { ltp: 2654.80, prevClose: 2608.00, chg: 46.80, chgPct: 1.80, bid: 2654.70, ask: 2654.90, vol: 5350000, oi: 790000, exchange: "BINANCE_SPOT", provider: "BINANCE", name: "Ethereum Spot", lastUpdated: Date.now() },
  "ETH": { ltp: 2654.80, prevClose: 2608.00, chg: 46.80, chgPct: 1.80, bid: 2654.70, ask: 2654.90, vol: 5350000, oi: 790000, exchange: "BINANCE_SPOT", provider: "BINANCE", name: "Ethereum Spot", lastUpdated: Date.now() },
  "BINANCE:ETH/USDT": { ltp: 2654.80, prevClose: 2608.00, chg: 46.80, chgPct: 1.80, bid: 2654.70, ask: 2654.90, vol: 5350000, oi: 790000, exchange: "BINANCE_SPOT", provider: "BINANCE", name: "Ethereum Spot", lastUpdated: Date.now() },
  "ETH-PERP": { ltp: 2654.80, prevClose: 2608.00, chg: 46.80, chgPct: 1.80, bid: 2654.70, ask: 2654.90, vol: 5350000, oi: 790000, exchange: "DELTA_PERP", provider: "DELTA", name: "Ethereum Perpetual Future", lastUpdated: Date.now() },
  "SOL/USDT": { ltp: 154.35, prevClose: 146.75, chg: 7.60, chgPct: 5.20, bid: 154.30, ask: 154.40, vol: 31000000, oi: 5500000, exchange: "BINANCE_SPOT", provider: "BINANCE", name: "Solana Spot", lastUpdated: Date.now() },
  "SOL": { ltp: 154.35, prevClose: 146.75, chg: 7.60, chgPct: 5.20, bid: 154.30, ask: 154.40, vol: 31000000, oi: 5500000, exchange: "BINANCE_SPOT", provider: "BINANCE", name: "Solana Spot", lastUpdated: Date.now() },
  "BINANCE:SOL/USDT": { ltp: 154.35, prevClose: 146.75, chg: 7.60, chgPct: 5.20, bid: 154.30, ask: 154.40, vol: 31000000, oi: 5500000, exchange: "BINANCE_SPOT", provider: "BINANCE", name: "Solana Spot", lastUpdated: Date.now() },
  "SOL-PERP": { ltp: 154.35, prevClose: 146.75, chg: 7.60, chgPct: 5.20, bid: 154.30, ask: 154.40, vol: 31000000, oi: 5500000, exchange: "DELTA_PERP", provider: "DELTA", name: "Solana Perpetual Future", lastUpdated: Date.now() },
  "XRP/USDT": { ltp: 0.5985, prevClose: 0.6050, chg: -0.0065, chgPct: -1.10, bid: 0.5984, ask: 0.5986, vol: 2000000000, oi: 535000000, exchange: "BINANCE_SPOT", provider: "BINANCE", name: "Ripple Spot", lastUpdated: Date.now() },
  "DOGE/USDT": { ltp: 0.1245, prevClose: 0.1133, chg: 0.0112, chgPct: 9.80, bid: 0.12445, ask: 0.12455, vol: 8400000000, oi: 1250000000, exchange: "BINANCE_SPOT", provider: "BINANCE", name: "Dogecoin Spot", lastUpdated: Date.now() },

  // Global Forex FX
  "EUR/USD": { ltp: 1.1292, prevClose: 1.1334, chg: -0.0042, chgPct: -0.37, bid: 1.1291, ask: 1.1293, vol: 24500000, oi: 0, exchange: "FX", provider: "OANDA", name: "EUR / USD (Euro / US Dollar)", lastUpdated: Date.now() },
  "USD/INR": { ltp: 96.315, prevClose: 95.820, chg: 0.495, chgPct: 0.52, bid: 96.305, ask: 96.325, vol: 4500000, oi: 0, exchange: "NSE_CURR", provider: "UPSTOX", name: "USD / INR (US Dollar / Indian Rupee)", lastUpdated: Date.now() },
  "GBP/USD": { ltp: 1.2980, prevClose: 1.3004, chg: -0.0024, chgPct: -0.18, bid: 1.2979, ask: 1.2981, vol: 18500000, oi: 0, exchange: "FX", provider: "OANDA", name: "GBP / USD (British Pound / US Dollar)", lastUpdated: Date.now() },
  "USD/JPY": { ltp: 149.25, prevClose: 148.80, chg: 0.45, chgPct: 0.30, bid: 149.24, ask: 149.26, vol: 31000000, oi: 0, exchange: "FX", provider: "OANDA", name: "USD / JPY (US Dollar / Japanese Yen)", lastUpdated: Date.now() },
  "GBP/INR": { ltp: 124.50, prevClose: 124.20, chg: 0.30, chgPct: 0.24, bid: 124.48, ask: 124.52, vol: 1800000, oi: 0, exchange: "NSE_CURR", provider: "UPSTOX", name: "GBP / INR (British Pound / Indian Rupee)", lastUpdated: Date.now() },
  "EUR/INR": { ltp: 108.75, prevClose: 108.60, chg: 0.15, chgPct: 0.14, bid: 108.73, ask: 108.77, vol: 2200000, oi: 0, exchange: "NSE_CURR", provider: "UPSTOX", name: "EUR / INR (Euro / Indian Rupee)", lastUpdated: Date.now() },
  "JPY/INR": { ltp: 64.50, prevClose: 64.35, chg: 0.15, chgPct: 0.23, bid: 64.49, ask: 64.51, vol: 1100000, oi: 0, exchange: "NSE_CURR", provider: "UPSTOX", name: "JPY / INR (100 Yen / Indian Rupee)", lastUpdated: Date.now() },
  "AUD/USD": { ltp: 0.6720, prevClose: 0.6702, chg: 0.0018, chgPct: 0.27, bid: 0.6719, ask: 0.6721, vol: 12500000, oi: 0, exchange: "FX", provider: "OANDA", name: "AUD / USD (Aussie Dollar / US Dollar)", lastUpdated: Date.now() },
  "USD/CAD": { ltp: 1.3580, prevClose: 1.3595, chg: -0.0015, chgPct: -0.11, bid: 1.3579, ask: 1.3581, vol: 14200000, oi: 0, exchange: "FX", provider: "OANDA", name: "USD / CAD (US Dollar / Canadian Dollar)", lastUpdated: Date.now() },

  // Commodities
  "GOLD": { ltp: 2420.00, prevClose: 2412.00, chg: 8.00, chgPct: 0.33, bid: 2419.50, ask: 2420.50, vol: 45000000, oi: 18500, exchange: "COMEX", provider: "PAPER", name: "Gold / USD", lastUpdated: Date.now() },
  "XAUUSD": { ltp: 2420.00, prevClose: 2412.00, chg: 8.00, chgPct: 0.33, bid: 2419.50, ask: 2420.50, vol: 45000000, oi: 18500, exchange: "COMEX", provider: "PAPER", name: "Gold / USD", lastUpdated: Date.now() },
  "COM:XAUUSD": { ltp: 2420.00, prevClose: 2412.00, chg: 8.00, chgPct: 0.33, bid: 2419.50, ask: 2420.50, vol: 45000000, oi: 18500, exchange: "COMEX", provider: "PAPER", name: "Gold / USD", lastUpdated: Date.now() },
  "SILVER": { ltp: 32.40, prevClose: 32.15, chg: 0.25, chgPct: 0.78, bid: 32.38, ask: 32.42, vol: 124000, oi: 24500, exchange: "MCX_COMM", provider: "DHAN", name: "Silver Spot/Future ($/oz)", lastUpdated: Date.now() },
  "CRUDEOIL": { ltp: 72.40, prevClose: 73.10, chg: -0.70, chgPct: -0.96, bid: 72.38, ask: 72.42, vol: 480000, oi: 85000, exchange: "MCX_COMM", provider: "DHAN", name: "Crude Oil WTI ($/bbl)", lastUpdated: Date.now() },

  // US Equities
  "AAPL": { ltp: 224.50, prevClose: 223.60, chg: 0.90, chgPct: 0.40, bid: 224.45, ask: 224.55, vol: 54000000, oi: 0, exchange: "NASDAQ", provider: "ALPACA", name: "Apple Inc.", lastUpdated: Date.now() },
  "NASDAQ:AAPL": { ltp: 224.50, prevClose: 223.60, chg: 0.90, chgPct: 0.40, bid: 224.45, ask: 224.55, vol: 54000000, oi: 0, exchange: "NASDAQ", provider: "ALPACA", name: "Apple Inc.", lastUpdated: Date.now() },
  "MSFT": { ltp: 448.00, prevClose: 447.35, chg: 0.65, chgPct: 0.15, bid: 447.90, ask: 448.10, vol: 22000000, oi: 0, exchange: "NASDAQ", provider: "ALPACA", name: "Microsoft Corp.", lastUpdated: Date.now() },
  "NASDAQ:MSFT": { ltp: 448.00, prevClose: 447.35, chg: 0.65, chgPct: 0.15, bid: 447.90, ask: 448.10, vol: 22000000, oi: 0, exchange: "NASDAQ", provider: "ALPACA", name: "Microsoft Corp.", lastUpdated: Date.now() },
  "NVDA": { ltp: 128.00, prevClose: 125.60, chg: 2.40, chgPct: 1.91, bid: 127.95, ask: 128.05, vol: 88000000, oi: 0, exchange: "NASDAQ", provider: "ALPACA", name: "NVIDIA Corp.", lastUpdated: Date.now() },
  "NASDAQ:NVDA": { ltp: 128.00, prevClose: 125.60, chg: 2.40, chgPct: 1.91, bid: 127.95, ask: 128.05, vol: 88000000, oi: 0, exchange: "NASDAQ", provider: "ALPACA", name: "NVIDIA Corp.", lastUpdated: Date.now() },
  "TSLA": { ltp: 254.60, prevClose: 258.40, chg: -3.80, chgPct: -1.47, bid: 254.50, ask: 254.70, vol: 54000000, oi: 0, exchange: "NASDAQ", provider: "ALPACA", name: "Tesla Inc.", lastUpdated: Date.now() },
  "NASDAQ:TSLA": { ltp: 254.60, prevClose: 258.40, chg: -3.80, chgPct: -1.47, bid: 254.50, ask: 254.70, vol: 54000000, oi: 0, exchange: "NASDAQ", provider: "ALPACA", name: "Tesla Inc.", lastUpdated: Date.now() },
};

// Map of Yahoo symbols for live polling
const YAHOO_SYMBOLS_MAP: Record<string, string> = {
  "^NSEI": "NIFTY",
  "^NSEBANK": "BANKNIFTY",
  "^BSESN": "SENSEX",
  "RELIANCE.NS": "RELIANCE",
  "TCS.NS": "TCS",
  "EURUSD=X": "EUR/USD",
  "USDINR=X": "USD/INR",
  "GBPUSD=X": "GBP/USD",
  "JPY=X": "USD/JPY",
  "GC=F": "GOLD",
  "AAPL": "AAPL",
  "NVDA": "NVDA",
};

// Background real market refresher
let lastFetchTime = 0;
export async function refreshRealMarketData(): Promise<void> {
  const now = Date.now();
  if (now - lastFetchTime < 3000) return; // cache for 3s
  lastFetchTime = now;

  // 1. Fetch Binance Crypto
  try {
    const binanceRes = await fetch("https://api.binance.com/api/v3/ticker/24hr", {
      signal: AbortSignal.timeout(2000),
      cache: "no-store",
    });
    if (binanceRes.ok) {
      const data = await binanceRes.json();
      const cryptoMap: Record<string, string> = {
        BTCUSDT: "BTC/USDT",
        ETHUSDT: "ETH/USDT",
        SOLUSDT: "SOL/USDT",
        XRPUSDT: "XRP/USDT",
        DOGEUSDT: "DOGE/USDT",
      };
      for (const item of data) {
        const canonical = cryptoMap[item.symbol];
        if (canonical && liveCache[canonical]) {
          const ltp = parseFloat(item.lastPrice);
          const chgPct = parseFloat(item.priceChangePercent);
          const chg = parseFloat(item.priceChange);
          const bid = parseFloat(item.bidPrice) || ltp * 0.9999;
          const ask = parseFloat(item.askPrice) || ltp * 1.0001;
          liveCache[canonical] = {
            ...liveCache[canonical],
            ltp,
            chg,
            chgPct,
            bid,
            ask,
            vol: parseFloat(item.volume) || liveCache[canonical].vol,
            lastUpdated: now,
          };
          if (canonical === "BTC/USDT") {
            liveCache["BTC"] = { ...liveCache[canonical], exchange: "DELTA" };
            liveCache["BTC-PERP"] = { ...liveCache[canonical], exchange: "DELTA_PERP", provider: "DELTA" };
          } else if (canonical === "ETH/USDT") {
            liveCache["ETH"] = { ...liveCache[canonical], exchange: "DELTA" };
            liveCache["ETH-PERP"] = { ...liveCache[canonical], exchange: "DELTA_PERP", provider: "DELTA" };
          } else if (canonical === "SOL/USDT") {
            liveCache["SOL"] = { ...liveCache[canonical], exchange: "DELTA" };
            liveCache["SOL-PERP"] = { ...liveCache[canonical], exchange: "DELTA_PERP", provider: "DELTA" };
          }
        }
      }
    }
  } catch {
    // Ignore Binance timeout
  }

  // 2. Fetch Yahoo Real-Time Quotes (Parallel Fetch)
  const yahooKeys = Object.keys(YAHOO_SYMBOLS_MAP);
  await Promise.allSettled(
    yahooKeys.map(async (ySym) => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?interval=1d&range=1d`;
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(2000),
          cache: "no-store",
        });
        if (res.ok) {
          const json = await res.json();
          const meta = json?.chart?.result?.[0]?.meta;
          if (meta && typeof meta.regularMarketPrice === "number") {
            const ltp = meta.regularMarketPrice;
            const prev = meta.chartPreviousClose || meta.previousClose || ltp;
            const chg = ltp - prev;
            const chgPct = prev ? (chg / prev) * 100 : 0;
            const canonical = YAHOO_SYMBOLS_MAP[ySym];

            if (canonical && liveCache[canonical]) {
              const spread = canonical.includes("/") ? 0.0002 : ltp * 0.0002;
              liveCache[canonical] = {
                ...liveCache[canonical],
                ltp: Math.round(ltp * 100) / 100,
                prevClose: Math.round(prev * 100) / 100,
                chg: Math.round(chg * 100) / 100,
                chgPct: Math.round(chgPct * 100) / 100,
                bid: Math.round((ltp - spread) * 100) / 100,
                ask: Math.round((ltp + spread) * 100) / 100,
                lastUpdated: now,
              };
              if (canonical === "NIFTY") {
                liveCache["NIFTY 50"] = liveCache["NIFTY"];
              } else if (canonical === "BANKNIFTY") {
                liveCache["NIFTY BANK"] = liveCache["BANKNIFTY"];
              }
            }
          }
        }
      } catch {
        // Ignore single Yahoo ticker error
      }
    })
  );
  // 3. Fetch authoritative backend quotes from Python engine
  try {
    const backendBase = getBackendBaseUrl() || CANONICAL_CLOUD_BACKEND_URL;
    if (backendBase) {
      const snapUrl = `${backendBase.replace(/\/+$/, "")}/api/market/snapshot?symbols=NIFTY,BANKNIFTY,BTCUSDT,ETHUSDT`;
      const snapRes = await fetch(snapUrl, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(3000),
        cache: "no-store",
      });
      if (snapRes.ok) {
        const snapJson = await snapRes.json();
        const incomingQuotes = snapJson.quotes || snapJson.data || {};
        for (const [rawSym, q] of Object.entries(incomingQuotes)) {
          const ltp = Number((q as any).lastPrice || (q as any).last_price || (q as any).ltp || 0);
          if (ltp > 0) {
            const sym = rawSym.toUpperCase();
            const prev = Number((q as any).previous_close || (q as any).previousClose || ltp);
            const chg = Number((q as any).change ?? (ltp - prev));
            const chgPct = Number((q as any).changePercent ?? (q as any).change_pct ?? (prev ? (chg / prev) * 100 : 0));
            const ex = (q as any).exchange || "NSE";
            const prov = (q as any).provider || "UPSTOX";

            const item: LiveMarketItem = {
              ltp,
              prevClose: prev,
              chg,
              chgPct,
              bid: Number((q as any).bid || ltp * 0.9995),
              ask: Number((q as any).ask || ltp * 1.0005),
              vol: Number((q as any).volume || 100000),
              oi: Number((q as any).oi || 0),
              exchange: ex,
              provider: prov,
              name: (q as any).display_name || sym,
              lastUpdated: now,
            };

            liveCache[sym] = item;
            if (sym.includes(":")) {
              const clean = sym.split(":").pop()!;
              liveCache[clean] = item;
            }
          }
        }
      }
    }
  } catch {
    // Non-blocking fallback
  }
}

export function lookupLiveCache(rawSym: string): LiveMarketItem | undefined {
  if (!rawSym) return undefined;
  const sym = rawSym.toUpperCase().trim();
  if (liveCache[sym]) return liveCache[sym];

  // Try without exchange prefix e.g. "NSE:NIFTY" -> "NIFTY" or "NASDAQ:AAPL" -> "AAPL"
  const clean = sym.includes(":") ? sym.split(":").pop()! : sym;
  if (liveCache[clean]) return liveCache[clean];

  // Try stripping spaces or aliases e.g. "NIFTY 50" -> "NIFTY"
  const stripped = clean.replace(" 50", "").replace(" BANK", "").trim();
  if (liveCache[stripped]) return liveCache[stripped];

  // Commodity prefix e.g. "COM:XAUUSD" -> "XAUUSD"
  if (clean.startsWith("COM:")) {
    const com = clean.slice(4);
    if (liveCache[com]) return liveCache[com];
  }

  // Try slash variation e.g. "BTCUSDT" -> "BTC/USDT" or "BTC/USDT" -> "BTCUSDT"
  const noSlash = clean.replace("/", "");
  if (liveCache[noSlash]) return liveCache[noSlash];
  if (clean.includes("/")) {
    const parts = clean.split("/");
    if (liveCache[parts[0]]) return liveCache[parts[0]];
  } else if (clean.endsWith("USDT") && clean.length > 4) {
    const base = clean.slice(0, -4);
    if (liveCache[`${base}/USDT`]) return liveCache[`${base}/USDT`];
    if (liveCache[base]) return liveCache[base];
  }

  // Futures suffix: e.g. "NSE:NIFTY-FUT" -> "NIFTY-FUT" or "NIFTY"
  if (clean.endsWith("-FUT") || clean.endsWith("FUT")) {
    if (liveCache[clean]) return liveCache[clean];
    const base = clean.replace("-FUT", "").replace("FUT", "");
    if (liveCache[base]) return liveCache[base];
  }

  return undefined;
}

export function generateDynamicOptionChainQuotes(underlying: string, spotPrice: number): Record<string, NormalizedMarketTick> {
  const quotes: Record<string, NormalizedMarketTick> = {};
  const now = new Date().toISOString();
  const strikeStep = underlying === "BANKNIFTY" ? 100 : underlying === "BTC" ? 500 : 50;
  const atmStrike = Math.round(spotPrice / strikeStep) * strikeStep;

  for (let offset = -4; offset <= 4; offset++) {
    const strike = atmStrike + offset * strikeStep;

    // Call
    const callLtp = Math.max(2, Math.round((75 - offset * 14) * 10) / 10);
    const callSym = `${underlying} ${strike} CE`;
    quotes[callSym] = {
      symbol: callSym,
      exchange: "NSE_FNO",
      provider: "UPSTOX",
      lastPrice: callLtp,
      bid: Math.round((callLtp - 0.5) * 10) / 10,
      ask: Math.round((callLtp + 0.5) * 10) / 10,
      volume: 4500000,
      open: callLtp * 0.95,
      high: callLtp * 1.15,
      low: callLtp * 0.85,
      close: callLtp * 0.9,
      previousClose: callLtp * 0.9,
      change: Math.round((callLtp * 0.12) * 10) / 10,
      changePercent: 12.5,
      averagePrice: callLtp,
      oi: 8500000,
      eventTimestamp: now,
      receivedTimestamp: now,
      feedLatencyMs: 14,
      dataMode: "SIMULATED",
      status: "DELAYED",
      isStale: false,
      ageMs: 14,
      flashDirection: "up",
    };

    // Put
    const putLtp = Math.max(2, Math.round((75 + offset * 14) * 10) / 10);
    const putSym = `${underlying} ${strike} PE`;
    quotes[putSym] = {
      symbol: putSym,
      exchange: "NSE_FNO",
      provider: "UPSTOX",
      lastPrice: putLtp,
      bid: Math.round((putLtp - 0.5) * 10) / 10,
      ask: Math.round((putLtp + 0.5) * 10) / 10,
      volume: 3800000,
      open: putLtp * 0.95,
      high: putLtp * 1.15,
      low: putLtp * 0.85,
      close: putLtp * 0.9,
      previousClose: putLtp * 0.9,
      change: Math.round((-putLtp * 0.1) * 10) / 10,
      changePercent: -10.0,
      averagePrice: putLtp,
      oi: 9200000,
      eventTimestamp: now,
      receivedTimestamp: now,
      feedLatencyMs: 16,
      dataMode: "SIMULATED",
      status: "DELAYED",
      isStale: false,
      ageMs: 16,
      flashDirection: "down",
    };
  }

  return quotes;
}

export async function getLiveSnapshotQuotes(
  requestedSymbols: string[] = [],
  providerParam: string = "UPSTOX"
): Promise<Record<string, NormalizedMarketTick>> {
  await refreshRealMarketData();

  const quotes: Record<string, NormalizedMarketTick> = {};
  const requested = requestedSymbols.length > 0 ? requestedSymbols : Object.keys(liveCache);
  const now = new Date().toISOString();
  const nowMs = Date.now();

  for (const sym of requested) {
    const cachedItem = lookupLiveCache(sym);
    const isRecentlyUpdated = Boolean(cachedItem && (nowMs - (cachedItem.lastUpdated || 0) < 45000));
    const item = cachedItem || {
      ltp: 0,
      prevClose: 0,
      chg: 0,
      chgPct: 0,
      bid: 0,
      ask: 0,
      vol: 0,
      oi: 0,
      exchange: sym.includes(":") ? sym.split(":")[0] : "NSE",
      provider: providerParam,
      name: sym,
      lastUpdated: 0,
    };

    const isRealLive = isRecentlyUpdated && item.lastUpdated > 0;
    const ageMs = item.lastUpdated ? Math.max(0, nowMs - item.lastUpdated) : 60000;

    quotes[sym] = {
      symbol: sym,
      exchange: item.exchange,
      provider: item.provider || providerParam,
      lastPrice: item.ltp,
      bid: item.bid,
      ask: item.ask,
      volume: item.vol,
      open: item.prevClose,
      high: item.ltp * 1.015,
      low: item.ltp * 0.985,
      close: item.prevClose,
      previousClose: item.prevClose,
      change: item.chg,
      changePercent: item.chgPct,
      averagePrice: item.ltp,
      oi: item.oi,
      eventTimestamp: item.lastUpdated ? new Date(item.lastUpdated).toISOString() : now,
      receivedTimestamp: now,
      feedLatencyMs: isRealLive ? 14 : 250,
      dataMode: isRealLive ? "REAL_TIME" : "CACHED",
      status: isRealLive ? "LIVE" : "DELAYED",
      isStale: !isRealLive,
      ageMs,
      flashDirection: item.chg >= 0 ? "up" : "down",
    };
  }

  // If underlying is requested (e.g. NIFTY), also attach dynamic live ATM option chain quotes!
  const spotPrice = liveCache["NIFTY"]?.ltp || 22421.95;
  const optionChainQuotes = generateDynamicOptionChainQuotes("NIFTY", spotPrice);
  Object.assign(quotes, optionChainQuotes);

  return quotes;
}
