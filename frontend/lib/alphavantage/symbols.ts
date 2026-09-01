/**
 * Alpha Vantage Symbol Mapping Layer
 * =================================
 * Maps between Broker / Platform symbols and Alpha Vantage native symbols.
 * Prevents silent substitutions and formats exact exchange parameters.
 */

export interface MappedSymbol {
  originalSymbol: string;
  avSymbol: string;
  assetClass: "EQUITY" | "INDIAN_EQUITY" | "CRYPTO" | "FOREX" | "INDEX" | "COMMODITY";
  market?: string;
  fromCurrency?: string;
  toCurrency?: string;
}

// Explicit Indian Equities BSE/NSE mappings
const INDIAN_SYMBOLS_MAP: Record<string, string> = {
  "RELIANCE": "RELIANCE.BSE",
  "TCS": "TCS.BSE",
  "INFY": "INFY.BSE",
  "HDFCBANK": "HDFCBANK.BSE",
  "ICICIBANK": "ICICIBANK.BSE",
  "SBIN": "SBIN.BSE",
  "BHARTIARTL": "BHARTIARTL.BSE",
  "ITC": "ITC.BSE",
  "KOTAKBANK": "KOTAKBANK.BSE",
  "LT": "LT.BSE",
  "AXISBANK": "AXISBANK.BSE",
  "HCLTECH": "HCLTECH.BSE",
  "ASIANPAINT": "ASIANPAINT.BSE",
  "MARUTI": "MARUTI.BSE",
  "SUNPHARMA": "SUNPHARMA.BSE",
  "TATAMOTORS": "TATAMOTORS.BSE",
  "TATASTEEL": "TATASTEEL.BSE",
  "WIPRO": "WIPRO.BSE",
  "ADANIENT": "ADANIENT.BSE",
  "ADANIPORTS": "ADANIPORTS.BSE",
  "BAJFINANCE": "BAJFINANCE.BSE",
  "NTPC": "NTPC.BSE",
  "POWERGRID": "POWERGRID.BSE",
  "TITAN": "TITAN.BSE",
  "ULTRACEMCO": "ULTRACEMCO.BSE",
  "COALINDIA": "COALINDIA.BSE",
  "ONGC": "ONGC.BSE",
  "ZOMATO": "ZOMATO.BSE",
};

export function resolveAlphaVantageSymbol(rawSymbol: string): MappedSymbol {
  const clean = (rawSymbol || "").trim().toUpperCase();

  // 1. Check Indian Stock Map
  if (INDIAN_SYMBOLS_MAP[clean]) {
    return {
      originalSymbol: clean,
      avSymbol: INDIAN_SYMBOLS_MAP[clean],
      assetClass: "INDIAN_EQUITY",
    };
  }

  if (clean.endsWith(".BSE") || clean.endsWith(".NSE")) {
    return {
      originalSymbol: clean,
      avSymbol: clean,
      assetClass: "INDIAN_EQUITY",
    };
  }

  // 2. Check Crypto Pairs (e.g. BTC/USDT, BTCUSDT, ETH/USD, SOL-USDT)
  const cryptoDelimiters = ["/", "-", "_"];
  for (const delim of cryptoDelimiters) {
    if (clean.includes(delim)) {
      const [base, quote] = clean.split(delim);
      const cryptoBaseSymbols = ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX", "LINK", "DOT", "MATIC", "LTC", "NEAR", "APT", "SUI"];
      if (cryptoBaseSymbols.includes(base)) {
        return {
          originalSymbol: clean,
          avSymbol: base,
          assetClass: "CRYPTO",
          market: quote === "USDT" ? "USD" : quote,
        };
      }
    }
  }

  // Check joint crypto (e.g. BTCUSDT -> symbol BTC, market USD)
  for (const quote of ["USDT", "USDC", "USD"]) {
    if (clean.endsWith(quote) && clean.length > quote.length) {
      const base = clean.slice(0, -quote.length);
      const cryptoBaseSymbols = ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX", "LINK", "DOT", "MATIC", "LTC", "NEAR", "APT", "SUI"];
      if (cryptoBaseSymbols.includes(base)) {
        return {
          originalSymbol: clean,
          avSymbol: base,
          assetClass: "CRYPTO",
          market: "USD",
        };
      }
    }
  }

  // 3. Check Forex Pairs (e.g. EUR/USD, EURUSD, GBPUSD, USDJPY)
  if (clean.includes("/") && clean.length === 7) {
    const [fromCur, toCur] = clean.split("/");
    return {
      originalSymbol: clean,
      avSymbol: `${fromCur}${toCur}`,
      assetClass: "FOREX",
      fromCurrency: fromCur,
      toCurrency: toCur,
    };
  }

  const forexPairs = ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD", "USDINR", "EURGBP", "EURJPY", "GBPJPY"];
  if (forexPairs.includes(clean)) {
    return {
      originalSymbol: clean,
      avSymbol: clean,
      assetClass: "FOREX",
      fromCurrency: clean.substring(0, 3),
      toCurrency: clean.substring(3, 6),
    };
  }

  // 4. Check Indices
  if (clean === "SPX" || clean === "S&P500" || clean === "^GSPC") {
    return { originalSymbol: clean, avSymbol: "SPY", assetClass: "INDEX" };
  }
  if (clean === "NDX" || clean === "NASDAQ" || clean === "^IXIC") {
    return { originalSymbol: clean, avSymbol: "QQQ", assetClass: "INDEX" };
  }

  // 5. Default US Equity
  return {
    originalSymbol: clean,
    avSymbol: clean,
    assetClass: "EQUITY",
  };
}
