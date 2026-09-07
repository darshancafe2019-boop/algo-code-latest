/**
 * Normalized Cross-Broker Instrument Registry
 */
import { BrokerName, Instrument } from "../brokers/types";
import { DHAN_OFFICIAL_SCRIP_MAP } from "../brokers/dhan/instruments";
import { UPSTOX_OFFICIAL_KEYS } from "../brokers/upstox/instruments";

export class InstrumentRegistry {
  private static instance: InstrumentRegistry | null = null;

  public static getInstance(): InstrumentRegistry {
    if (!InstrumentRegistry.instance) {
      InstrumentRegistry.instance = new InstrumentRegistry();
    }
    return InstrumentRegistry.instance;
  }

  public resolve(symbol: string, broker: BrokerName = "dhan"): Instrument {
    const cleanSym = symbol.toUpperCase().replace(/^NSE:/, "").replace(/\//g, "").trim();

    if (broker === "dhan") {
      const dhanMap = DHAN_OFFICIAL_SCRIP_MAP[cleanSym];
      return {
        broker: "dhan",
        symbol: cleanSym,
        instrumentId: dhanMap?.securityId || cleanSym,
        securityId: dhanMap?.securityId || cleanSym,
        segment: dhanMap?.segment || (cleanSym.includes("OPT") || cleanSym.includes("FUT") ? "NSE_FNO" : "NSE_EQ"),
        exchange: dhanMap?.exchange || "NSE",
        lotSize: cleanSym === "NIFTY" ? 25 : cleanSym === "BANKNIFTY" ? 15 : 1,
        tickSize: 0.05,
      };
    }

    if (broker === "upstox") {
      const upstoxMap = UPSTOX_OFFICIAL_KEYS[cleanSym];
      return {
        broker: "upstox",
        symbol: cleanSym,
        instrumentId: upstoxMap?.instrumentKey || `NSE_EQ|${cleanSym}`,
        instrumentKey: upstoxMap?.instrumentKey || `NSE_EQ|${cleanSym}`,
        segment: upstoxMap?.segment || "NSE_EQ",
        exchange: upstoxMap?.exchange || "NSE",
        lotSize: cleanSym === "NIFTY" ? 25 : cleanSym === "BANKNIFTY" ? 15 : 1,
        tickSize: 0.05,
      };
    }

    if (broker === "delta") {
      const sym = cleanSym.includes("USDT") ? cleanSym : `${cleanSym}USDT`;
      return {
        broker: "delta",
        symbol: sym,
        instrumentId: sym,
        segment: "CRYPTO_DERIVATIVES",
        exchange: "DELTA_INDIA",
        lotSize: 1,
        tickSize: 0.1,
      };
    }

    return {
      broker: "paper",
      symbol: cleanSym,
      instrumentId: cleanSym,
      segment: "NSE_EQ",
      exchange: "NSE",
      lotSize: 1,
      tickSize: 0.05,
    };
  }
}

export const instrumentRegistry = InstrumentRegistry.getInstance();
