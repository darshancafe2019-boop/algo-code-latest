import { CandleData, IndicatorDefinition, IndicatorResult, IndicatorSignal } from "../types";

export interface VolumeStarResultValue {
  trend: "BULLISH" | "BEARISH" | "SIDEWAYS";
  poc: number | null;
  vah: number | null;
  val: number | null;
  lvn: number | null;
  swingHighCount: number;
  swingLowCount: number;
  rejectionWickRatio: number;
  isRejectionTrigger: boolean;
}

export const VolumeStarIndicator: IndicatorDefinition<VolumeStarResultValue> = {
  id: "volume_star",
  name: "Volume Star (FRVP + Market Structure + LVN)",
  shortName: "VOL_STAR",
  category: "VOLUME",
  description:
    "Market structure trend engine combined with Fixed Range Volume Profile (FRVP) and Low Volume Node (LVN) wick rejection confirmation.",
  version: "1.0.0",
  overlay: true,
  requiredCandles: 30,
  supportedTimeframes: ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"],
  parameters: {
    frvpRowSize: {
      name: "frvpRowSize",
      label: "FRVP Row Size (Bins)",
      type: "number",
      default: 50,
      min: 10,
      max: 200,
    },
    valueAreaPct: {
      name: "valueAreaPct",
      label: "Value Area Volume (%)",
      type: "number",
      default: 70,
      min: 50,
      max: 95,
    },
    lookbackBars: {
      name: "lookbackBars",
      label: "Profile Lookback (Bars)",
      type: "number",
      default: 50,
      min: 15,
      max: 300,
    },
    rejectionWickPct: {
      name: "rejectionWickPct",
      label: "Min Rejection Wick Ratio",
      type: "number",
      default: 0.25,
      min: 0.05,
      max: 0.8,
      step: 0.05,
    },
    trendConfirmBars: {
      name: "trendConfirmBars",
      label: "Trend Confirmations",
      type: "number",
      default: 2,
      min: 1,
      max: 5,
    },
  },
  calculate: (candles: CandleData[], params?: Record<string, any>) => {
    const start = performance.now();
    const rowSize = Math.max(10, Math.min(200, Number(params?.frvpRowSize) || 50));
    const valueAreaPct = Math.max(50, Math.min(95, Number(params?.valueAreaPct) || 70));
    const lookback = Math.max(15, Number(params?.lookbackBars) || 50);
    const minWickRatio = Math.max(0.05, Math.min(0.8, Number(params?.rejectionWickPct) || 0.25));
    const minConfirmations = Math.max(1, Number(params?.trendConfirmBars) || 2);

    if (!candles || candles.length < 20) {
      return {
        indicatorId: "volume_star",
        symbol: "",
        timeframe: "",
        series: [],
        latest: {
          trend: "SIDEWAYS",
          poc: null,
          vah: null,
          val: null,
          lvn: null,
          swingHighCount: 0,
          swingLowCount: 0,
          rejectionWickRatio: 0,
          isRejectionTrigger: false,
        },
        status: "INSUFFICIENT_DATA",
        timestamp: Date.now(),
        parameters: { frvpRowSize: rowSize, valueAreaPct, lookbackBars: lookback },
        isValid: false,
      };
    }

    const n = candles.length;
    const windowStart = Math.max(0, n - lookback);
    const windowCandles = candles.slice(windowStart);

    // 1. Market Structure Detection (Pivots over lookback)
    const pivotSpan = 3;
    const swingHighs: number[] = [];
    const swingLows: number[] = [];

    for (let i = pivotSpan; i < windowCandles.length - pivotSpan; i++) {
      const curH = windowCandles[i].high;
      const curL = windowCandles[i].low;
      let isH = true;
      let isL = true;

      for (let j = i - pivotSpan; j <= i + pivotSpan; j++) {
        if (j === i) continue;
        if (windowCandles[j].high >= curH) isH = false;
        if (windowCandles[j].low <= curL) isL = false;
      }

      if (isH) swingHighs.push(curH);
      if (isL) swingLows.push(curL);
    }

    // Check HH/HL vs LH/LL
    let hhCount = 0;
    let hlCount = 0;
    let lhCount = 0;
    let llCount = 0;

    for (let i = 1; i < swingHighs.length; i++) {
      if (swingHighs[i] > swingHighs[i - 1]) hhCount++;
      else if (swingHighs[i] < swingHighs[i - 1]) lhCount++;
    }

    for (let i = 1; i < swingLows.length; i++) {
      if (swingLows[i] > swingLows[i - 1]) hlCount++;
      else if (swingLows[i] < swingLows[i - 1]) llCount++;
    }

    let trend: "BULLISH" | "BEARISH" | "SIDEWAYS" = "SIDEWAYS";
    if (hhCount >= minConfirmations && hlCount >= minConfirmations) {
      trend = "BULLISH";
    } else if (lhCount >= minConfirmations && llCount >= minConfirmations) {
      trend = "BEARISH";
    }

    // 2. Fixed Range Volume Profile (FRVP) Computation
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let totalVolume = 0;

    for (const c of windowCandles) {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      totalVolume += c.volume || 0;
    }

    const priceRange = maxPrice - minPrice;
    const binHeight = priceRange > 0 ? priceRange / rowSize : 1.0;
    const bins = new Float64Array(rowSize);
    const binPrices = new Float64Array(rowSize);

    for (let i = 0; i < rowSize; i++) {
      binPrices[i] = minPrice + (i + 0.5) * binHeight;
    }

    // Distribute volume into bins
    for (const c of windowCandles) {
      const vol = c.volume || 0;
      const cLow = c.low;
      const cHigh = c.high;
      const lowBin = Math.max(0, Math.min(rowSize - 1, Math.floor((cLow - minPrice) / binHeight)));
      const highBin = Math.max(0, Math.min(rowSize - 1, Math.floor((cHigh - minPrice) / binHeight)));
      const covered = highBin - lowBin + 1;
      const volPerBin = vol / covered;

      for (let b = lowBin; b <= highBin; b++) {
        bins[b] += volPerBin;
      }
    }

    // Find POC (Point of Control)
    let pocIdx = 0;
    let maxBinVol = -1;
    for (let i = 0; i < rowSize; i++) {
      if (bins[i] > maxBinVol) {
        maxBinVol = bins[i];
        pocIdx = i;
      }
    }
    const poc = binPrices[pocIdx];

    // Compute Value Area (VAH / VAL) around POC
    const targetVAVol = totalVolume * (valueAreaPct / 100);
    let currentVAVol = bins[pocIdx];
    let upperIdx = pocIdx;
    let lowerIdx = pocIdx;

    while (currentVAVol < targetVAVol && (upperIdx < rowSize - 1 || lowerIdx > 0)) {
      const nextUpperVol = upperIdx < rowSize - 1 ? bins[upperIdx + 1] : 0;
      const nextLowerVol = lowerIdx > 0 ? bins[lowerIdx - 1] : 0;

      if (nextUpperVol >= nextLowerVol && upperIdx < rowSize - 1) {
        upperIdx++;
        currentVAVol += bins[upperIdx];
      } else if (lowerIdx > 0) {
        lowerIdx--;
        currentVAVol += bins[lowerIdx];
      } else if (upperIdx < rowSize - 1) {
        upperIdx++;
        currentVAVol += bins[upperIdx];
      } else {
        break;
      }
    }

    const vah = binPrices[upperIdx];
    const val = binPrices[lowerIdx];

    // Find Low Volume Nodes (LVN) inside Value Area
    const lastClose = windowCandles[windowCandles.length - 1].close;
    let bestLvn: number | null = null;
    let minLvnDist = Infinity;

    for (let i = lowerIdx + 1; i < upperIdx; i++) {
      if (bins[i] < bins[i - 1] && bins[i] < bins[i + 1] && bins[i] < maxBinVol * 0.45) {
        const p = binPrices[i];
        const dist = Math.abs(p - lastClose);
        if (dist < minLvnDist) {
          minLvnDist = dist;
          bestLvn = p;
        }
      }
    }

    // Fallback LVN if no local minimum was strict: min volume bin in Value Area
    if (bestLvn === null && upperIdx > lowerIdx) {
      let minInVA = Infinity;
      let minIdxInVA = -1;
      for (let i = lowerIdx; i <= upperIdx; i++) {
        if (bins[i] < minInVA) {
          minInVA = bins[i];
          minIdxInVA = i;
        }
      }
      if (minIdxInVA >= 0) {
        bestLvn = binPrices[minIdxInVA];
      }
    }

    // 3. LVN Rejection & Trigger Check
    const latestCandle = windowCandles[windowCandles.length - 1];
    const totalCandleRange = latestCandle.high - latestCandle.low;
    const bodyBottom = Math.min(latestCandle.open, latestCandle.close);
    const bodyTop = Math.max(latestCandle.open, latestCandle.close);
    const lowerWick = bodyBottom - latestCandle.low;
    const upperWick = latestCandle.high - bodyTop;

    const lowerWickRatio = totalCandleRange > 0 ? lowerWick / totalCandleRange : 0;
    const upperWickRatio = totalCandleRange > 0 ? upperWick / totalCandleRange : 0;

    let signal: IndicatorSignal | undefined;
    let isRejectionTrigger = false;
    let activeWickRatio = 0;

    const lvnVal = bestLvn || poc;
    const lvnZone = binHeight * 1.5;

    if (trend === "BULLISH" && lvnVal !== null) {
      const touchedLvn = latestCandle.low <= lvnVal + lvnZone && latestCandle.high >= lvnVal - lvnZone;
      const closedAboveLvn = latestCandle.close >= lvnVal && lowerWickRatio >= minWickRatio;

      if (touchedLvn && closedAboveLvn) {
        isRejectionTrigger = true;
        activeWickRatio = lowerWickRatio;
        signal = {
          type: "BULLISH",
          score: 0.9,
          reason: `Volume Star Bullish Rejection @ LVN (${lvnVal.toFixed(2)}) with ${(lowerWickRatio * 100).toFixed(0)}% lower wick`,
          timestamp: Date.now(),
        };
      } else {
        signal = {
          type: "BULLISH",
          score: 0.45,
          reason: `Volume Star Bullish Trend (HH: ${hhCount}, HL: ${hlCount}) | POC: ${poc.toFixed(2)}`,
          timestamp: Date.now(),
        };
      }
    } else if (trend === "BEARISH" && lvnVal !== null) {
      const touchedLvn = latestCandle.high >= lvnVal - lvnZone && latestCandle.low <= lvnVal + lvnZone;
      const closedBelowLvn = latestCandle.close <= lvnVal && upperWickRatio >= minWickRatio;

      if (touchedLvn && closedBelowLvn) {
        isRejectionTrigger = true;
        activeWickRatio = upperWickRatio;
        signal = {
          type: "BEARISH",
          score: -0.9,
          reason: `Volume Star Bearish Rejection @ LVN (${lvnVal.toFixed(2)}) with ${(upperWickRatio * 100).toFixed(0)}% upper wick`,
          timestamp: Date.now(),
        };
      } else {
        signal = {
          type: "BEARISH",
          score: -0.45,
          reason: `Volume Star Bearish Trend (LH: ${lhCount}, LL: ${llCount}) | POC: ${poc.toFixed(2)}`,
          timestamp: Date.now(),
        };
      }
    } else {
      signal = {
        type: "NEUTRAL",
        score: 0.0,
        reason: `Volume Star Sideways Structure | Range [${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}]`,
        timestamp: Date.now(),
      };
    }

    const latestVal: VolumeStarResultValue = {
      trend,
      poc,
      vah,
      val,
      lvn: bestLvn,
      swingHighCount: swingHighs.length,
      swingLowCount: swingLows.length,
      rejectionWickRatio: activeWickRatio,
      isRejectionTrigger,
    };

    const series: VolumeStarResultValue[] = candles.map((_, idx) => {
      if (idx === candles.length - 1) return latestVal;
      return {
        trend,
        poc,
        vah,
        val,
        lvn: bestLvn,
        swingHighCount: swingHighs.length,
        swingLowCount: swingLows.length,
        rejectionWickRatio: 0,
        isRejectionTrigger: false,
      };
    });

    return {
      indicatorId: "volume_star",
      symbol: "",
      timeframe: "",
      series,
      latest: latestVal,
      signal,
      status: "LIVE",
      timestamp: Date.now(),
      executionLatencyMs: performance.now() - start,
      parameters: {
        frvpRowSize: rowSize,
        valueAreaPct,
        lookbackBars: lookback,
        rejectionWickPct: minWickRatio,
        trendConfirmBars: minConfirmations,
      },
      isValid: true,
    };
  },
};
