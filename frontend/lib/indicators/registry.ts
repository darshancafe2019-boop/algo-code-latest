/**
 * Central Indicator Registry
 * Single authoritative repository for all quantitative indicator definitions.
 * All indicators register themselves here and become automatically discoverable.
 */

import { IndicatorCategory, IndicatorDefinition } from "./types";

// Trend Indicators
import { EMA } from "./trend/ema";
import { SMA } from "./trend/sma";
import { WMA } from "./trend/wma";
import { VWAP } from "./trend/vwap";
import { Supertrend } from "./trend/supertrend";
import { Ichimoku } from "./trend/ichimoku";
import { ParabolicSAR } from "./trend/parabolic-sar";

// Momentum Indicators
import { RSI } from "./momentum/rsi";
import { MACD } from "./momentum/macd";
import { Stochastic } from "./momentum/stochastic";
import { CCI } from "./momentum/cci";
import { WilliamsR } from "./momentum/williams-r";
import { ROC } from "./momentum/roc";

// Strength Indicators
import { ADX } from "./strength/adx";

// Volatility Indicators
import { ATR } from "./volatility/atr";
import { BollingerBands } from "./volatility/bollinger";
import { KeltnerChannels } from "./volatility/keltner";
import { StandardDeviation } from "./volatility/standard-deviation";

// Volume Indicators
import { VolumeIndicator } from "./volume/volume";
import { OBV } from "./volume/obv";
import { MFI } from "./volume/mfi";
import { CVD } from "./volume/cvd";

// Structure Indicators
import { PivotPoints } from "./structure/pivots";
import { SupportResistance } from "./structure/support-resistance";

// Options Indicators
import { IVIndicator } from "./options/iv";
import { OptionGreeks } from "./options/greeks";
import { OpenInterest } from "./options/oi";
import { PCR } from "./options/pcr";

export class IndicatorRegistry {
  private static instance: IndicatorRegistry;
  private indicators: Map<string, IndicatorDefinition<any>> = new Map();

  private constructor() {
    // Self-register standard library on initialization
    this.register(EMA);
    this.register(SMA);
    this.register(WMA);
    this.register(VWAP);
    this.register(Supertrend);
    this.register(Ichimoku);
    this.register(ParabolicSAR);

    this.register(RSI);
    this.register(MACD);
    this.register(Stochastic);
    this.register(CCI);
    this.register(WilliamsR);
    this.register(ROC);

    this.register(ADX);

    this.register(ATR);
    this.register(BollingerBands);
    this.register(KeltnerChannels);
    this.register(StandardDeviation);

    this.register(VolumeIndicator);
    this.register(OBV);
    this.register(MFI);
    this.register(CVD);

    this.register(PivotPoints);
    this.register(SupportResistance);

    this.register(IVIndicator);
    this.register(OptionGreeks);
    this.register(OpenInterest);
    this.register(PCR);
  }

  public static getInstance(): IndicatorRegistry {
    if (!IndicatorRegistry.instance) {
      IndicatorRegistry.instance = new IndicatorRegistry();
    }
    return IndicatorRegistry.instance;
  }

  public register(indicator: IndicatorDefinition<any>): void {
    if (this.indicators.has(indicator.id)) {
      console.warn(`[IndicatorRegistry] Overwriting existing indicator: ${indicator.id}`);
    }
    this.indicators.set(indicator.id, indicator);
  }

  public get(id: string): IndicatorDefinition<any> | undefined {
    return this.indicators.get(id);
  }

  public getAll(): IndicatorDefinition<any>[] {
    return Array.from(this.indicators.values());
  }

  public getByCategory(category: IndicatorCategory): IndicatorDefinition<any>[] {
    if (category === "ALL") return this.getAll();
    return this.getAll().filter((ind) => ind.category === category);
  }

  public search(query: string, category: IndicatorCategory = "ALL"): IndicatorDefinition<any>[] {
    const q = query.trim().toLowerCase();
    const baseList = this.getByCategory(category);
    if (!q) return baseList;

    return baseList.filter((ind) => {
      return (
        ind.name.toLowerCase().includes(q) ||
        ind.shortName.toLowerCase().includes(q) ||
        ind.id.toLowerCase().includes(q) ||
        ind.description.toLowerCase().includes(q) ||
        ind.category.toLowerCase().includes(q)
      );
    });
  }

  public getCount(): number {
    return this.indicators.size;
  }
}

export const indicatorRegistry = IndicatorRegistry.getInstance();
