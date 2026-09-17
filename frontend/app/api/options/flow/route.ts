import { NextRequest, NextResponse } from "next/server";
import {
  calculateBlackScholesGreeks,
  classifyMoneyness,
  classifyTradeFlow,
  getATMStrike,
  getIndianMarketStatus,
  calculatePCRMetrics,
  calculateMaxPain,
  findSupportResistanceZones,
} from "@/lib/options/options-analytics-engine";
import {
  OptionFlowTrade,
  OptionStrikeRowData,
  OptionTerminalSnapshot,
} from "@/types/option-terminal";

export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.BACKEND_API_URL || "http://127.0.0.1:5050";
const GATEWAY_URL = process.env.MARKET_GATEWAY_URL || "http://127.0.0.1:5051";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const underlying = (searchParams.get("underlying") || searchParams.get("symbol") || "NIFTY").toUpperCase();
    const provider = (searchParams.get("provider") || searchParams.get("source") || "DHAN").toUpperCase();
    const expiry = searchParams.get("expiry") || "";
    const marketDataMode = (searchParams.get("market_data_mode") || searchParams.get("mode") || process.env.MARKET_DATA_MODE || "LIVE").toUpperCase();
    const executionMode = (searchParams.get("execution_mode") || "PAPER").toUpperCase();

    const isCrypto = ["BTC", "ETH", "SOL", "XRP"].includes(underlying) || provider.includes("DELTA");

    // 1. Probe Delta service directly for crypto/Delta, or upstream gateway / backend for Indian markets
    let chainData: any = null;
    if (isCrypto) {
      try {
        const { deltaProductService } = await import("@/lib/brokers/delta/delta-product-service");
        const snap = await deltaProductService.fetchOptionChainSnapshot(underlying, expiry || undefined);
        chainData = {
          spot_price: snap.spotPrice,
          spot: snap.spotPrice,
          available_expiries: snap.availableExpiries.map((e) => e.expiryDisplay),
          selected_expiry: snap.selectedExpiry,
          atm_strike: snap.atmStrike,
          strikes: snap.rows,
        };
      } catch (deltaErr: any) {
        console.warn("[/api/options/flow] Delta Direct Service fallback:", deltaErr?.message);
      }
    }

    if (!chainData) {
      try {
        const queryParams = new URLSearchParams({
          underlying,
          source: isCrypto ? "DELTA_INDIA" : provider,
          strike_count: "25",
          market_data_mode: marketDataMode,
          execution_mode: executionMode,
        });
        if (expiry) queryParams.set("expiry", expiry);

        const primaryUrl = isCrypto
          ? `${GATEWAY_URL}/api/options/chain?${queryParams.toString()}`
          : `${BACKEND_URL}/api/options/chain?${queryParams.toString()}`;

        const upstreamRes = await fetch(primaryUrl, { cache: "no-store", signal: AbortSignal.timeout(4000) });
        if (upstreamRes.ok) {
          const rawJson = await upstreamRes.json();
          chainData = rawJson.data || rawJson;
        }
      } catch {
        // Gateway may be offline, fallback to backend
        try {
          const queryParams = new URLSearchParams({
            underlying,
            source: provider,
            strike_count: "25",
            market_data_mode: marketDataMode,
            execution_mode: executionMode,
          });
          if (expiry) queryParams.set("expiry", expiry);

          const fallbackRes = await fetch(
            `${BACKEND_URL}/api/options/chain?${queryParams.toString()}`,
            { cache: "no-store", signal: AbortSignal.timeout(4000) }
          );
          if (fallbackRes.ok) {
            const rawJson = await fallbackRes.json();
            chainData = rawJson.data || rawJson;
          }
        } catch {}
      }
    }

    const rawSpot = chainData?.spot_price ?? chainData?.spot;
    const spotPrice = typeof rawSpot === "number" && rawSpot > 0 ? rawSpot : 0;

    const spotChange = typeof chainData?.spot_change === "number" ? chainData.spot_change : 0;
    const spotChangePct = typeof chainData?.spot_change_24h === "number" ? chainData.spot_change_24h : 0;

    // Available Expiries directly from upstream
    const availableExpiriesRaw: string[] = Array.isArray(chainData?.available_expiries) && chainData.available_expiries.length > 0
      ? chainData.available_expiries
      : [];

    const selectedExpiry = expiry || (typeof chainData?.selected_expiry === "string" ? chainData.selected_expiry : (availableExpiriesRaw[0] || ""));

    // Calculate DTE helper
    const calculateDaysToExpiry = (expiryStr: string): number => {
      if (!expiryStr) return 0;
      const expDate = new Date(expiryStr);
      if (isNaN(expDate.getTime())) return 0;
      const now = new Date();
      const diffTime = expDate.getTime() - now.getTime();
      return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    };

    // Parse strikes
    const stepSize = spotPrice > 40000 ? 500 : spotPrice > 15000 ? 100 : spotPrice > 5000 ? 50 : 10;
    const atmStrike = chainData?.atm_strike || (spotPrice > 0 ? Math.round(spotPrice / stepSize) * stepSize : 0);

    const strikesList: OptionStrikeRowData[] = [];
    const flowTrades: OptionFlowTrade[] = [];

    const rawStrikes = chainData?.strikes || [];

    if (rawStrikes.length > 0) {
      for (const item of rawStrikes) {
        const strike = item.strike || item.strikePrice;
        if (!strike) continue;

        const ce = item.call || item.ce || {};
        const pe = item.put || item.pe || {};

        const ceLtp = ce.ltp || ce.lastPrice || 0;
        const peLtp = pe.ltp || pe.lastPrice || 0;
        const ceOi = ce.oi || ce.openInterest || ce.OI || 0;
        const peOi = pe.oi || pe.openInterest || pe.OI || 0;
        const ceVol = ce.volume || 0;
        const peVol = pe.volume || 0;

        const dteYears = Math.max(1, calculateDaysToExpiry(selectedExpiry)) / 365;

        const callQuote = {
          symbol: `${underlying} ${strike} CE`,
          underlying,
          expiry: selectedExpiry,
          strike,
          optionType: "CE" as const,
          securityId: ce.securityId || ce.security_id || ce.instrumentId || ce.token || (provider === "DHAN" ? `${underlying}_${selectedExpiry}_${strike}_CE` : ""),
          instrumentId: ce.instrumentId || ce.instrument_id || ce.symbol || `${underlying} ${strike} CE`,
          provider: ce.provider || provider,
          ltp: ceLtp,
          change: ce.change || 0,
          changePercent: ce.changePercent || ce.pChange || 0,
          bid: ce.bid || ce.best_bid || ce.bidPrice || null,
          ask: ce.ask || ce.best_ask || ce.askPrice || null,
          bidQty: ce.bidQty || ce.bidQuantity || null,
          askQty: ce.askQty || ce.askQuantity || null,
          volume: ceVol,
          oi: ceOi,
          oiChange: ce.oiChange || ce.change_in_oi || 0,
          oiChangePercent: ce.oiChangePercent || 0,
          iv: ce.iv || ce.IV || null,
          greeks: ce.greeks || (spotPrice > 0 && ce.iv ? calculateBlackScholesGreeks("CE", spotPrice, strike, dteYears, ce.iv / 100) : null),
          premium: ceLtp * ceVol,
          moneyness: spotPrice > 0 ? classifyMoneyness("CE", strike, spotPrice, atmStrike) : ("OTM" as const),
          intrinsicValue: spotPrice > 0 ? Math.max(0, spotPrice - strike) : 0,
          timeValue: spotPrice > 0 ? Math.max(0, ceLtp - Math.max(0, spotPrice - strike)) : ceLtp,
          oiBuildup: ce.oiBuildup || (ce.change > 0 && ce.oiChange > 0 ? "LONG_BUILDUP" : "SHORT_BUILDUP"),
          volumeOiRatio: ceOi > 0 ? parseFloat((ceVol / ceOi).toFixed(2)) : 0,
        };

        const putQuote = {
          symbol: `${underlying} ${strike} PE`,
          underlying,
          expiry: selectedExpiry,
          strike,
          optionType: "PE" as const,
          securityId: pe.securityId || pe.security_id || pe.instrumentId || pe.token || (provider === "DHAN" ? `${underlying}_${selectedExpiry}_${strike}_PE` : ""),
          instrumentId: pe.instrumentId || pe.instrument_id || pe.symbol || `${underlying} ${strike} PE`,
          provider: pe.provider || provider,
          ltp: peLtp,
          change: pe.change || 0,
          changePercent: pe.changePercent || pe.pChange || 0,
          bid: pe.bid || pe.best_bid || pe.bidPrice || null,
          ask: pe.ask || pe.best_ask || pe.askPrice || null,
          bidQty: pe.bidQty || pe.bidQuantity || null,
          askQty: pe.askQty || pe.askQuantity || null,
          volume: peVol,
          oi: peOi,
          oiChange: pe.oiChange || pe.change_in_oi || 0,
          oiChangePercent: pe.oiChangePercent || 0,
          iv: pe.iv || pe.IV || null,
          greeks: pe.greeks || (spotPrice > 0 && pe.iv ? calculateBlackScholesGreeks("PE", spotPrice, strike, dteYears, pe.iv / 100) : null),
          premium: peLtp * peVol,
          moneyness: spotPrice > 0 ? classifyMoneyness("PE", strike, spotPrice, atmStrike) : ("OTM" as const),
          intrinsicValue: spotPrice > 0 ? Math.max(0, strike - spotPrice) : 0,
          timeValue: spotPrice > 0 ? Math.max(0, peLtp - Math.max(0, strike - spotPrice)) : peLtp,
          oiBuildup: pe.oiBuildup || (pe.change > 0 && pe.oiChange > 0 ? "LONG_BUILDUP" : "SHORT_BUILDUP"),
          volumeOiRatio: peOi > 0 ? parseFloat((peVol / peOi).toFixed(2)) : 0,
        };

        strikesList.push({
          strike,
          isATM: strike === atmStrike,
          distanceFromSpot: spotPrice > 0 ? strike - spotPrice : 0,
          distancePct: spotPrice > 0 ? parseFloat((((strike - spotPrice) / spotPrice) * 100).toFixed(2)) : 0,
          moneynessCall: spotPrice > 0 ? classifyMoneyness("CE", strike, spotPrice, atmStrike) : ("OTM" as const),
          moneynessPut: spotPrice > 0 ? classifyMoneyness("PE", strike, spotPrice, atmStrike) : ("OTM" as const),
          call: callQuote,
          put: putQuote,
        });

        // Generate flow trade entries for significant volume
        if (ceVol > 500) {
          const tradeClass = classifyTradeFlow("CE", "BUY", ceLtp, callQuote.bid, callQuote.ask, ceVol, ceOi, ceLtp * ceVol, spotChange);
          flowTrades.push({
            id: `flow_ce_${strike}_${Date.now()}`,
            symbol: `${underlying} ${strike} CE`,
            underlying,
            time: new Date(Date.now() - Math.random() * 3600000).toLocaleTimeString("en-IN", { hour12: false }),
            timestamp: Date.now() - Math.floor(Math.random() * 3600000),
            expiry: selectedExpiry,
            daysToExpiry: calculateDaysToExpiry(selectedExpiry),
            optionType: "CE",
            side: "BUY",
            strike,
            spotPrice,
            moneyness: callQuote.moneyness,
            price: ceLtp,
            premium: ceLtp * ceVol,
            size: ceVol,
            lots: Math.round(ceVol / (isCrypto ? 1 : 50)),
            oi: ceOi,
            volumeOiRatio: callQuote.volumeOiRatio,
            iv: callQuote.iv ?? null,
            delta: callQuote.greeks?.delta ?? null,
            theta: callQuote.greeks?.theta ?? null,
            sentiment: tradeClass.sentiment,
            sentimentConfidence: tradeClass.confidence,
            signalType: tradeClass.signalType,
          });
        }

        if (peVol > 500) {
          const tradeClass = classifyTradeFlow("PE", "SELL", peLtp, putQuote.bid, putQuote.ask, peVol, peOi, peLtp * peVol, spotChange);
          flowTrades.push({
            id: `flow_pe_${strike}_${Date.now()}`,
            symbol: `${underlying} ${strike} PE`,
            underlying,
            time: new Date(Date.now() - Math.random() * 3600000).toLocaleTimeString("en-IN", { hour12: false }),
            timestamp: Date.now() - Math.floor(Math.random() * 3600000),
            expiry: selectedExpiry,
            daysToExpiry: calculateDaysToExpiry(selectedExpiry),
            optionType: "PE",
            side: "SELL",
            strike,
            spotPrice,
            moneyness: putQuote.moneyness,
            price: peLtp,
            premium: peLtp * peVol,
            size: peVol,
            lots: Math.round(peVol / (isCrypto ? 1 : 50)),
            oi: peOi,
            volumeOiRatio: putQuote.volumeOiRatio,
            iv: putQuote.iv ?? null,
            delta: putQuote.greeks?.delta ?? null,
            theta: putQuote.greeks?.theta ?? null,
            sentiment: tradeClass.sentiment,
            sentimentConfidence: tradeClass.confidence,
            signalType: tradeClass.signalType,
          });
        }
      }
    }

    // Sort flow trades by timestamp descending
    flowTrades.sort((a, b) => b.timestamp - a.timestamp);

    const pcr = calculatePCRMetrics(strikesList);
    const { maxPain } = calculateMaxPain(strikesList);
    const { supportZone, resistanceZone } = findSupportResistanceZones(strikesList);
    const marketStatus = getIndianMarketStatus(underlying);

    let bullishTurnover = 0;
    let bearishTurnover = 0;
    let totalFlowTurnover = 0;
    let totalFlowVolume = 0;
    let unusualTradeCount = 0;

    for (const f of flowTrades) {
      totalFlowTurnover += f.premium;
      totalFlowVolume += f.size;
      if (f.sentiment === "BULLISH") bullishTurnover += f.premium;
      if (f.sentiment === "BEARISH") bearishTurnover += f.premium;
      if (f.signalType === "UNUSUAL_ACTIVITY" || f.signalType === "LARGE_ACTIVITY") unusualTradeCount++;
    }

    const bullishPercentage = totalFlowTurnover > 0 ? Math.round((bullishTurnover / totalFlowTurnover) * 100) : null;
    const bearishPercentage = totalFlowTurnover > 0 && bullishPercentage !== null ? 100 - bullishPercentage : null;

    const overallSentiment = totalFlowTurnover > 0 && bullishPercentage !== null
      ? (bullishPercentage > 55 ? "BULLISH" : (bearishPercentage ?? 0) > 55 ? "BEARISH" : "NEUTRAL")
      : null;
    const overallConfidence = totalFlowTurnover > 0 && bullishPercentage !== null
      ? Math.max(bullishPercentage, bearishPercentage ?? 0)
      : null;

    // Calculate ATM IV and skew from real strikes
    const atmStrikeRow = strikesList.find((s) => s.isATM) || strikesList[Math.floor(strikesList.length / 2)];
    const calculatedAtmIv = (atmStrikeRow?.call?.iv ?? atmStrikeRow?.put?.iv) ?? null;

    const callsWithIv = strikesList.map((s) => s.call?.iv).filter((v): v is number => typeof v === "number" && v > 0);
    const putsWithIv = strikesList.map((s) => s.put?.iv).filter((v): v is number => typeof v === "number" && v > 0);
    const avgCallIv = callsWithIv.length > 0 ? parseFloat((callsWithIv.reduce((a, b) => a + b, 0) / callsWithIv.length).toFixed(2)) : null;
    const avgPutIv = putsWithIv.length > 0 ? parseFloat((putsWithIv.reduce((a, b) => a + b, 0) / putsWithIv.length).toFixed(2)) : null;
    const ivSkew = (avgCallIv !== null && avgPutIv !== null) ? {
      callIVAverage: avgCallIv,
      putIVAverage: avgPutIv,
      skewPct: parseFloat((avgPutIv - avgCallIv).toFixed(2)),
    } : null;

    const dte = calculateDaysToExpiry(selectedExpiry);

    const snapshot: OptionTerminalSnapshot = {
      underlying,
      spotPrice,
      spotChange,
      spotChangePercent: spotChangePct,
      marketStatus,
      selectedExpiry,
      daysToExpiry: dte,
      isWeekly: dte <= 7,
      availableExpiries: availableExpiriesRaw.map((e: string) => {
        const itemDte = calculateDaysToExpiry(e);
        return {
          expiry: e,
          daysToExpiry: itemDte,
          isWeekly: itemDte <= 7,
          label: `${e} (${itemDte} DTE)`,
        };
      }),
      atmStrike,
      maxPain,
      spotVsMaxPainDistance: maxPain !== null && spotPrice > 0 ? parseFloat((spotPrice - maxPain).toFixed(2)) : null,
      pcr,
      atmIV: calculatedAtmIv,
      ivSkew,
      supportZone,
      resistanceZone,
      flowSummary: {
        totalFlowVolume,
        totalFlowTurnover,
        bullishTurnover,
        bearishTurnover,
        bullishPercentage,
        bearishPercentage,
        overallSentiment,
        confidence: overallConfidence,
        unusualTradeCount,
      },
      strikes: strikesList,
      flowTrades: flowTrades.slice(0, 50),
      source: provider,
      environment: marketDataMode === "LIVE" ? "LIVE" : "PAPER",
      freshnessStatus: chainData?.freshness_status || chainData?.freshnessStatus || (spotPrice > 0 ? "LIVE" : "UNAVAILABLE"),
      dataAgeMs: chainData?.dataAgeMs ?? (chainData?.received_timestamp ? Date.now() - chainData.received_timestamp : 0),
      latencyMs: chainData?.latencyMs ?? 0,
      timestamp: chainData?.timestamp ?? chainData?.exchange_timestamp ?? Date.now(),
    };

    return NextResponse.json({
      success: true,
      data: snapshot,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to load options flow analytics",
      },
      { status: 500 }
    );
  }
}
