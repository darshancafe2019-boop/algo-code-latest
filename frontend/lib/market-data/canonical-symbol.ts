/**
 * Canonical Market Symbol & Immutable Instrument Identity Normalizer
 * ==================================================================
 * Provides strict provider-scoped instrument identity and alias generation.
 * Guarantees zero cross-provider collision between Binance, Delta, Dhan, Upstox, etc.
 */

export function getInstrumentIdentity(
  symbol?: string | null,
  exchange?: string | null,
  provider?: string | null,
  segment?: string | null
): string {
  if (!symbol) return "";
  const s = symbol.trim().toUpperCase();
  const ex = (exchange || "").trim().toUpperCase();
  const prov = (provider || "").trim().toUpperCase();
  const seg = (segment || "").trim().toUpperCase();

  // If already provider-scoped (e.g., "BINANCE:BTC/USDT" or "DHAN:13")
  if (s.startsWith("BINANCE:") || s.startsWith("DELTA:") || s.startsWith("DHAN:") || s.startsWith("UPSTOX:") || s.startsWith("OANDA:")) {
    return s;
  }

  const resolvedProv = prov.includes("BINANCE") || ex === "BINANCE"
    ? "BINANCE"
    : prov.includes("DELTA") || ex === "DELTA"
    ? "DELTA"
    : prov.includes("UPSTOX")
    ? "UPSTOX"
    : prov.includes("DHAN") || ex === "NSE" || ex === "BSE" || ex === "NFO"
    ? "DHAN"
    : prov.includes("OANDA") || ex === "OANDA"
    ? "OANDA"
    : ex || "MARKET";

  const cleanSym = s
    .replace(/^BINANCE:/, "")
    .replace(/^DELTA:/, "")
    .replace(/^DHAN:/, "")
    .replace(/^UPSTOX:/, "")
    .replace(/^NSE:/, "")
    .replace(/^BSE:/, "")
    .replace(/^OANDA:/, "");

  return `${resolvedProv}:${cleanSym}${seg ? `:${seg}` : ""}`;
}

export function canonicalizeMarketSymbol(
  symbol?: string | null,
  exchange?: string | null,
  provider?: string | null
): string {
  return getInstrumentIdentity(symbol, exchange, provider);
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
    prefix = parts[0].toUpperCase();
    cleanSym = parts[1];
    if (cleanSym.includes(":")) {
      cleanSym = cleanSym.split(":")[0];
    }
    aliases.add(cleanSym);
  }

  // Index aliases (Indian markets)
  if (cleanSym === "NIFTY 50" || cleanSym === "NIFTY50" || cleanSym === "NIFTY") {
    aliases.add("NIFTY");
    aliases.add("NIFTY 50");
    aliases.add("NIFTY50");
    aliases.add("NSE:NIFTY");
    aliases.add("NSE:NIFTY 50");
    aliases.add("NSE_INDEX|NIFTY 50");
    aliases.add("NSE_INDEX:NIFTY 50");
    aliases.add("DHAN:13");
    aliases.add("UPSTOX:NSE_INDEX|Nifty 50");
  } else if (cleanSym === "BANKNIFTY" || cleanSym === "BANK NIFTY" || cleanSym === "NIFTY BANK") {
    aliases.add("BANKNIFTY");
    aliases.add("BANK NIFTY");
    aliases.add("NIFTY BANK");
    aliases.add("NSE:BANKNIFTY");
    aliases.add("NSE_INDEX|NIFTY BANK");
    aliases.add("NSE_INDEX:NIFTY BANK");
    aliases.add("DHAN:25");
    aliases.add("UPSTOX:NSE_INDEX|Nifty Bank");
  } else if (cleanSym === "FINNIFTY" || cleanSym === "NIFTY FIN SERVICE" || cleanSym === "NIFTY FINANCIAL SERVICES") {
    aliases.add("FINNIFTY");
    aliases.add("NIFTY FIN SERVICE");
    aliases.add("NIFTY FINANCIAL SERVICES");
    aliases.add("NSE:FINNIFTY");
    aliases.add("NSE_INDEX|NIFTY FIN SERVICE");
    aliases.add("NSE_INDEX:NIFTY FIN SERVICE");
    aliases.add("DHAN:27");
    aliases.add("UPSTOX:NSE_INDEX|Nifty Fin Service");
  } else if (cleanSym === "MIDCPNIFTY" || cleanSym === "NIFTY MID SELECT" || cleanSym === "NIFTY MIDCAP SELECT") {
    aliases.add("MIDCPNIFTY");
    aliases.add("NIFTY MID SELECT");
    aliases.add("NIFTY MIDCAP SELECT");
    aliases.add("NSE:MIDCPNIFTY");
    aliases.add("NSE_INDEX|NIFTY MID SELECT");
    aliases.add("NSE_INDEX:NIFTY MID SELECT");
    aliases.add("DHAN:447");
    aliases.add("UPSTOX:NSE_INDEX|NIFTY MID SELECT");
  } else if (cleanSym === "SENSEX" || cleanSym === "BSE SENSEX") {
    aliases.add("SENSEX");
    aliases.add("BSE SENSEX");
    aliases.add("BSE:SENSEX");
    aliases.add("BSE_INDEX|SENSEX");
    aliases.add("BSE_INDEX:SENSEX");
    aliases.add("DHAN:51");
    aliases.add("UPSTOX:BSE_INDEX|SENSEX");
  } else if (cleanSym === "INDIA VIX" || cleanSym === "INDIAVIX") {
    aliases.add("INDIA VIX");
    aliases.add("INDIAVIX");
    aliases.add("NSE:INDIA VIX");
    aliases.add("NSE_INDEX|INDIA VIX");
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

  const exU = (exchange || "").toUpperCase();
  const provU = (provider || "").toUpperCase();

  // STRICT PROVIDER SCOPING:
  // Only add provider-prefixed aliases if that specific provider or exchange is active!
  const isBinance = exU.includes("BINANCE") || provU.includes("BINANCE") || prefix === "BINANCE";
  const isDelta = exU.includes("DELTA") || provU.includes("DELTA") || prefix === "DELTA";
  const isIndian = exU.includes("NSE") || exU.includes("BSE") || provU.includes("DHAN") || provU.includes("UPSTOX") || prefix === "NSE" || prefix === "DHAN" || prefix === "UPSTOX" || prefix === "BSE";
  const isOanda = exU.includes("OANDA") || provU.includes("OANDA") || prefix === "OANDA";

  Array.from(aliases).forEach((base) => {
    if (isBinance) {
      aliases.add(`BINANCE:${base}`);
      aliases.add(`BINANCE:${base}:SPOT`);
      aliases.add(`BINANCE:${base}:PERP`);
    }
    if (isDelta) {
      aliases.add(`DELTA:${base}`);
      aliases.add(`DELTA:${base}:PERP`);
    }
    if (isIndian) {
      if (provU.includes("DHAN") || prefix === "DHAN") {
        aliases.add(`DHAN:${base}`);
      }
      if (provU.includes("UPSTOX") || prefix === "UPSTOX") {
        aliases.add(`UPSTOX:${base}`);
      }
      aliases.add(`NSE:${base}`);
      aliases.add(`NSE:${base}:EQ`);
    }
    if (isOanda) {
      aliases.add(`OANDA:${base}`);
      aliases.add(`OANDA:${base}:FX`);
    }
  });

  return aliases;
}
