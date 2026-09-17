/**
 * Canonical Market Symbol & Alias Normalizer
 * ==========================================
 * Provides consistent alias generation and canonical resolution matching
 * the central Market Data Gateway (:5051).
 *
 * Supported formats:
 * - BINANCE:BTC/USDT <-> BTC/USDT <-> BTCUSDT <-> BINANCE:BTC/USDT:SPOT
 * - DELTA:BTC/USD <-> BTC/USD <-> BTCUSD <-> DELTA:BTC/USD:PERP
 * - NSE:RELIANCE <-> RELIANCE <-> DHAN:RELIANCE <-> NSE:RELIANCE:EQ
 * - NIFTY 50 <-> NIFTY <-> NSE:NIFTY <-> NSE:NIFTY 50
 * - OANDA:EUR/USD <-> EUR/USD <-> EURUSD
 */

export function canonicalizeMarketSymbol(
  symbol?: string | null,
  exchange?: string | null,
  provider?: string | null
): string {
  if (!symbol) return "";
  const s = symbol.trim().toUpperCase();
  const ex = (exchange || "").trim().toUpperCase();
  const prov = (provider || "").trim().toUpperCase();

  // If already prefixed
  if (s.includes(":")) {
    return s;
  }

  if (ex === "BINANCE" || prov.includes("BINANCE")) {
    return `BINANCE:${s}`;
  }
  if (ex === "DELTA" || prov.includes("DELTA")) {
    return `DELTA:${s}`;
  }
  if (ex === "NSE" || ex === "BSE" || prov.includes("DHAN") || prov.includes("UPSTOX") || prov.includes("FYERS")) {
    return `NSE:${s.replace(" 50", "")}`;
  }
  if (ex === "OANDA" || prov.includes("OANDA")) {
    return `OANDA:${s}`;
  }

  return s;
}

export function getQuoteAliases(
  symbol?: string | null,
  exchange?: string | null,
  provider?: string | null
): Set<string> {
  const aliases = new Set<string>();
  const s = (symbol || "").trim().toUpperCase();
  if (!s) return aliases;

  aliases.add(s);

  let cleanSym = s;
  let prefix = "";

  if (s.includes(":")) {
    const parts = s.split(":");
    prefix = parts[0];
    cleanSym = parts[1];
    if (cleanSym.includes(":")) {
      cleanSym = cleanSym.split(":")[0];
    }
    aliases.add(cleanSym);
  }

  // Index aliases
  if (cleanSym === "NIFTY 50" || cleanSym === "NIFTY50") {
    aliases.add("NIFTY");
    aliases.add("NIFTY 50");
    aliases.add("NSE:NIFTY");
    aliases.add("NSE:NIFTY 50");
  } else if (cleanSym === "NIFTY") {
    aliases.add("NIFTY 50");
    aliases.add("NSE:NIFTY");
    aliases.add("NSE:NIFTY 50");
  } else if (cleanSym === "BANKNIFTY") {
    aliases.add("NSE:BANKNIFTY");
    aliases.add("BANK NIFTY");
  } else if (cleanSym === "FINNIFTY") {
    aliases.add("NSE:FINNIFTY");
  } else if (cleanSym === "MIDCPNIFTY") {
    aliases.add("NSE:MIDCPNIFTY");
  } else if (cleanSym === "SENSEX") {
    aliases.add("BSE:SENSEX");
  }

  // Slash variations for crypto / forex
  if (cleanSym.includes("/")) {
    const noSlash = cleanSym.replace(/\//g, "");
    aliases.add(noSlash);
  } else if (cleanSym.endsWith("USDT") && cleanSym.length > 4) {
    const slashV = `${cleanSym.slice(0, -4)}/USDT`;
    aliases.add(slashV);
  } else if (cleanSym.endsWith("USD") && cleanSym.length > 3) {
    const slashV = `${cleanSym.slice(0, -3)}/USD`;
    aliases.add(slashV);
  }

  // Provider / Exchange prefixes
  const exU = (exchange || "").toUpperCase();
  const provU = (provider || "").toUpperCase();

  Array.from(aliases).forEach((base) => {
    if (exU.includes("BINANCE") || provU.includes("BINANCE") || prefix === "BINANCE") {
      aliases.add(`BINANCE:${base}`);
      aliases.add(`BINANCE:${base}:SPOT`);
      aliases.add(`BINANCE:${base}:PERP`);
    }
    if (exU.includes("DELTA") || provU.includes("DELTA") || prefix === "DELTA") {
      aliases.add(`DELTA:${base}`);
      aliases.add(`DELTA:${base}:PERP`);
    }
    if (exU.includes("NSE") || provU.includes("DHAN") || prefix === "NSE" || prefix === "DHAN") {
      aliases.add(`NSE:${base}`);
      aliases.add(`NSE:${base}:EQ`);
      aliases.add(`DHAN:${base}`);
    }
    if (exU.includes("OANDA") || prefix === "OANDA") {
      aliases.add(`OANDA:${base}`);
      aliases.add(`OANDA:${base}:FX`);
    }
  });

  return aliases;
}
