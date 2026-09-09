import { CandleData, IndicatorDefinition, IndicatorResult, IndicatorSignal } from "../types";

export interface ADXResultValue {
  adx: number | null;
  plusDI: number | null;
  minusDI: number | null;
}

export const ADX: IndicatorDefinition<ADXResultValue> = {
  id: "adx",
  name: "Average Directional Index",
  shortName: "ADX",
  category: "STRENGTH",
  description: "Measures overall trend strength on a 0-100 scale regardless of trend direction.",
  version: "1.0.0",
  overlay: false,
  requiredCandles: 28,
  supportedTimeframes: ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"],
  parameters: {
    period: {
      name: "period",
      label: "Period",
      type: "number",
      default: 14,
      min: 2,
      max: 100,
    },
    threshold: {
      name: "threshold",
      label: "Strong Trend Threshold",
      type: "number",
      default: 25,
      min: 10,
      max: 50,
    },
  },
  calculate: (candles, params) => {
    const start = performance.now();
    const period = Number(params?.period) || 14;
    const threshold = Number(params?.threshold) || 25;

    if (!candles || candles.length < period * 2) {
      return {
        indicatorId: "adx",
        symbol: "",
        timeframe: "",
        series: [],
        latest: { adx: null, plusDI: null, minusDI: null },
        status: "INSUFFICIENT_DATA",
        timestamp: Date.now(),
        parameters: { period, threshold },
        isValid: false,
      };
    }

    const tr: number[] = [candles[0].high - candles[0].low];
    const plusDM: number[] = [0];
    const minusDM: number[] = [0];

    for (let i = 1; i < candles.length; i++) {
      const upMove = candles[i].high - candles[i - 1].high;
      const downMove = candles[i - 1].low - candles[i].low;

      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);

      const hl = candles[i].high - candles[i].low;
      const hc = Math.abs(candles[i].high - candles[i - 1].close);
      const lc = Math.abs(candles[i].low - candles[i - 1].close);
      tr.push(Math.max(hl, hc, lc));
    }

    // Wilder's smoothing
    let smoothTR = 0;
    let smoothPlusDM = 0;
    let smoothMinusDM = 0;

    for (let i = 0; i < period; i++) {
      smoothTR += tr[i];
      smoothPlusDM += plusDM[i];
      smoothMinusDM += minusDM[i];
    }

    const dxList: (number | null)[] = new Array(period - 1).fill(null);
    const plusDIList: (number | null)[] = new Array(period - 1).fill(null);
    const minusDIList: (number | null)[] = new Array(period - 1).fill(null);

    const calcDX = (pDM: number, mDM: number, sTR: number) => {
      const pDI = sTR === 0 ? 0 : (pDM / sTR) * 100;
      const mDI = sTR === 0 ? 0 : (mDM / sTR) * 100;
      const sumDI = pDI + mDI;
      const dx = sumDI === 0 ? 0 : (Math.abs(pDI - mDI) / sumDI) * 100;
      return { pDI, mDI, dx };
    };

    const first = calcDX(smoothPlusDM, smoothMinusDM, smoothTR);
    plusDIList.push(first.pDI);
    minusDIList.push(first.mDI);
    dxList.push(first.dx);

    for (let i = period; i < candles.length; i++) {
      smoothTR = smoothTR - smoothTR / period + tr[i];
      smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDM[i];
      smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDM[i];

      const res = calcDX(smoothPlusDM, smoothMinusDM, smoothTR);
      plusDIList.push(res.pDI);
      minusDIList.push(res.mDI);
      dxList.push(res.dx);
    }

    // Smoothed ADX
    const validDX = dxList.filter((v): v is number => v !== null);
    let adxSum = 0;
    for (let i = 0; i < period; i++) {
      adxSum += validDX[i];
    }
    let prevADX = adxSum / period;

    const series: ADXResultValue[] = [];
    const adxStartIndex = period * 2 - 2;

    for (let i = 0; i < candles.length; i++) {
      if (i < adxStartIndex) {
        series.push({ adx: null, plusDI: plusDIList[i], minusDI: minusDIList[i] });
      } else if (i === adxStartIndex) {
        series.push({ adx: prevADX, plusDI: plusDIList[i], minusDI: minusDIList[i] });
      } else {
        const curDX = dxList[i] || 0;
        const curADX = (prevADX * (period - 1) + curDX) / period;
        series.push({ adx: curADX, plusDI: plusDIList[i], minusDI: minusDIList[i] });
        prevADX = curADX;
      }
    }

    const latest = series[series.length - 1] || { adx: null, plusDI: null, minusDI: null };
    let signal: IndicatorSignal | undefined;

    if (latest.adx !== null && latest.plusDI !== null && latest.minusDI !== null) {
      const isStrong = latest.adx >= threshold;
      const isBull = latest.plusDI > latest.minusDI;

      signal = {
        type: isStrong ? "STRONG_TREND" : "WEAK_TREND",
        score: isStrong ? (isBull ? 0.8 : -0.8) : 0.0,
        reason: `ADX is ${latest.adx.toFixed(1)} (${isStrong ? "Strong Trend" : "Weak/Range"}) with +DI: ${latest.plusDI.toFixed(1)}, -DI: ${latest.minusDI.toFixed(1)}`,
        timestamp: Date.now(),
      };
    }

    return {
      indicatorId: "adx",
      symbol: "",
      timeframe: "",
      series,
      latest,
      signal,
      status: "LIVE",
      timestamp: Date.now(),
      executionLatencyMs: performance.now() - start,
      parameters: { period, threshold },
      isValid: latest.adx !== null,
    };
  },
};
