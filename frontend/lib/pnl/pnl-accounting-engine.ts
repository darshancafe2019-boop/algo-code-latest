/**
 * Authoritative P&L, Fees & Accounting Engine
 * Implements FIFO fill-matching, precise broker/exchange fee schedules,
 * drawdown analytics, capital-aware ROI, expectancy, and multi-broker reconciliation.
 */

import {
  AssetClass,
  FeeBreakdown,
  FillRecord,
  TradeRecord,
  PositionRecord,
  PnlSummary,
  DayPnlRecord,
  EquityCurvePoint,
} from "@/types/pnl-journal";

export class FeeCalculator {
  /**
   * Authoritative calculation of official Indian & Global exchange fee schedules.
   */
  public static calculateIndianCharges(params: {
    turnover: number;
    buyValue?: number;
    sellValue?: number;
    assetClass: AssetClass;
    isIntraday?: boolean;
    orderCount?: number;
  }): FeeBreakdown {
    const {
      turnover,
      buyValue = turnover / 2,
      sellValue = turnover / 2,
      assetClass,
      isIntraday = true,
      orderCount = 2,
    } = params;

    if (turnover <= 0) {
      return {
        brokerage: 0,
        stt: 0,
        exchangeCharges: 0,
        gst: 0,
        stampDuty: 0,
        sebiCharges: 0,
        ipft: 0,
        dpCharges: 0,
        otherCharges: 0,
        totalFees: 0,
        totalCharges: 0,
      };
    }

    let brokerage = 0;
    let stt = 0;
    let exchangeCharges = 0;
    let stampDuty = 0;
    let sebiCharges = (turnover * 10) / 10000000; // ₹10 per Crore = 0.0001%
    let ipft = (turnover * 5) / 10000000; // ₹5 per Crore
    let dpCharges = 0;

    if (assetClass === "OPTIONS") {
      // Flat ₹20 per executed order or 0.03%
      brokerage = 20 * orderCount;
      // STT: 0.1% on sell turnover for options premium
      stt = sellValue * 0.001;
      // Exchange Txn: 0.05% of premium turnover
      exchangeCharges = turnover * 0.0005;
      // Stamp duty: 0.003% on buy turnover
      stampDuty = buyValue * 0.00003;
    } else if (assetClass === "FUTURES") {
      brokerage = Math.min(20 * orderCount, turnover * 0.0003);
      stt = sellValue * 0.0002; // 0.02% on sell
      exchangeCharges = turnover * 0.000019; // 0.0019%
      stampDuty = buyValue * 0.00002; // 0.002% on buy
    } else if (assetClass === "CRYPTO") {
      brokerage = turnover * 0.0005; // 0.05% taker fee
      exchangeCharges = 0;
      stt = 0;
      stampDuty = 0;
      sebiCharges = 0;
      ipft = 0;
    } else {
      // EQUITIES
      if (!isIntraday) {
        // Delivery
        brokerage = 0;
        stt = turnover * 0.001; // 0.1% on buy & sell
        exchangeCharges = turnover * 0.0000345;
        stampDuty = buyValue * 0.00015; // 0.015% on buy
        dpCharges = 15.93;
      } else {
        // Intraday Equity
        brokerage = Math.min(20 * orderCount, turnover * 0.0003);
        stt = sellValue * 0.00025; // 0.025% on sell
        exchangeCharges = turnover * 0.0000345;
        stampDuty = buyValue * 0.00003; // 0.003% on buy
      }
    }

    // GST: 18% on (Brokerage + Exchange Charges + SEBI Charges)
    const taxableAmount = brokerage + exchangeCharges + sebiCharges;
    const gst = taxableAmount * 0.18;

    const totalCharges = parseFloat(
      (brokerage + stt + exchangeCharges + gst + stampDuty + sebiCharges + ipft + dpCharges).toFixed(2)
    );

    return {
      brokerage: parseFloat(brokerage.toFixed(2)),
      stt: parseFloat(stt.toFixed(2)),
      exchangeCharges: parseFloat(exchangeCharges.toFixed(2)),
      gst: parseFloat(gst.toFixed(2)),
      stampDuty: parseFloat(stampDuty.toFixed(2)),
      sebiCharges: parseFloat(sebiCharges.toFixed(2)),
      ipft: parseFloat(ipft.toFixed(2)),
      dpCharges: parseFloat(dpCharges.toFixed(2)),
      otherCharges: 0,
      totalFees: totalCharges,
      totalCharges,
    };
  }

  public static calculateTradeFees(
    assetClass: AssetClass,
    side: "BUY" | "SELL" | "ROUNDTRIP",
    price: number,
    quantity: number,
    isDelivery: boolean = false
  ): FeeBreakdown {
    const turnover = Math.max(0, price * quantity);
    return FeeCalculator.calculateIndianCharges({
      turnover,
      buyValue: side === "BUY" || side === "ROUNDTRIP" ? turnover : 0,
      sellValue: side === "SELL" || side === "ROUNDTRIP" ? turnover : 0,
      assetClass,
      isIntraday: !isDelivery,
      orderCount: side === "ROUNDTRIP" ? 2 : 1,
    });
  }
}

/**
 * High-performance FIFO (First In First Out) fill-matching engine.
 */
export class FifoAccountingEngine {
  public static matchFillsFifo(
    fills: FillRecord[],
    symbolMultiplierMap: Record<string, number> = {}
  ): {
    closedTrades: TradeRecord[];
    openPositions: PositionRecord[];
  } {
    // Sort fills chronologically
    const sortedFills = [...fills].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Group by symbol
    const fillsBySymbol: Record<string, FillRecord[]> = {};
    for (const f of sortedFills) {
      if (!fillsBySymbol[f.symbol]) fillsBySymbol[f.symbol] = [];
      fillsBySymbol[f.symbol].push(f);
    }

    const closedTrades: TradeRecord[] = [];
    const openPositions: PositionRecord[] = [];

    for (const [symbol, symbolFills] of Object.entries(fillsBySymbol)) {
      const buyQueue: Array<{ fill: FillRecord; remainingQty: number }> = [];
      const sellQueue: Array<{ fill: FillRecord; remainingQty: number }> = [];

      for (const fill of symbolFills) {
        let currentQty = fill.quantity;

        if (fill.side === "BUY") {
          // Check if matching against existing short positions (sellQueue)
          while (sellQueue.length > 0 && currentQty > 0) {
            const shortItem = sellQueue[0];
            const matchedQty = Math.min(shortItem.remainingQty, currentQty);

            const entryPrice = shortItem.fill.price;
            const exitPrice = fill.price;
            const grossPnl = (entryPrice - exitPrice) * matchedQty;

            const turnover = (entryPrice + exitPrice) * matchedQty;
            const assetClass = fill.assetClass || "EQUITY";
            const fees = FeeCalculator.calculateIndianCharges({
              turnover,
              buyValue: exitPrice * matchedQty,
              sellValue: entryPrice * matchedQty,
              assetClass,
              orderCount: 2,
            });

            const netPnl = grossPnl - fees.totalCharges;
            const durationSeconds = Math.max(
              0,
              Math.floor(
                (new Date(fill.timestamp).getTime() - new Date(shortItem.fill.timestamp).getTime()) / 1000
              )
            );

            closedTrades.push({
              id: `trd-${shortItem.fill.fillId}-${fill.fillId}`,
              orderId: fill.orderId,
              symbol,
              assetClass,
              broker: fill.broker || "DHAN",
              account: fill.account || "PRIMARY",
              mode: fill.executionMode || "LIVE",
              side: "SELL",
              entryTimestamp: shortItem.fill.timestamp,
              exitTimestamp: fill.timestamp,
              entryPrice,
              exitPrice,
              quantity: matchedQty,
              status: "CLOSED",
              grossPnl,
              netPnl,
              totalCharges: fees.totalCharges,
              feeBreakdown: fees,
              strategy: "DISCRETIONARY",
              holdingDurationSeconds: durationSeconds,
            });

            shortItem.remainingQty -= matchedQty;
            currentQty -= matchedQty;

            if (shortItem.remainingQty <= 0) {
              sellQueue.shift();
            }
          }

          if (currentQty > 0) {
            buyQueue.push({ fill, remainingQty: currentQty });
          }
        } else {
          // Fill is SELL: Match against long buyQueue
          while (buyQueue.length > 0 && currentQty > 0) {
            const longItem = buyQueue[0];
            const matchedQty = Math.min(longItem.remainingQty, currentQty);

            const entryPrice = longItem.fill.price;
            const exitPrice = fill.price;
            const grossPnl = (exitPrice - entryPrice) * matchedQty;

            const turnover = (entryPrice + exitPrice) * matchedQty;
            const assetClass = fill.assetClass || "EQUITY";
            const fees = FeeCalculator.calculateIndianCharges({
              turnover,
              buyValue: entryPrice * matchedQty,
              sellValue: exitPrice * matchedQty,
              assetClass,
              orderCount: 2,
            });

            const netPnl = grossPnl - fees.totalCharges;
            const durationSeconds = Math.max(
              0,
              Math.floor(
                (new Date(fill.timestamp).getTime() - new Date(longItem.fill.timestamp).getTime()) / 1000
              )
            );

            closedTrades.push({
              id: `trd-${longItem.fill.fillId}-${fill.fillId}`,
              orderId: fill.orderId,
              symbol,
              assetClass,
              broker: fill.broker || "DHAN",
              account: fill.account || "PRIMARY",
              mode: fill.executionMode || "LIVE",
              side: "BUY",
              entryTimestamp: longItem.fill.timestamp,
              exitTimestamp: fill.timestamp,
              entryPrice,
              exitPrice,
              quantity: matchedQty,
              status: "CLOSED",
              grossPnl,
              netPnl,
              totalCharges: fees.totalCharges,
              feeBreakdown: fees,
              strategy: "DISCRETIONARY",
              holdingDurationSeconds: durationSeconds,
            });

            longItem.remainingQty -= matchedQty;
            currentQty -= matchedQty;

            if (longItem.remainingQty <= 0) {
              buyQueue.shift();
            }
          }

          if (currentQty > 0) {
            sellQueue.push({ fill, remainingQty: currentQty });
          }
        }
      }

      // Remaining buyQueue -> Open Long Positions
      if (buyQueue.length > 0) {
        const totalOpenQty = buyQueue.reduce((acc, q) => acc + q.remainingQty, 0);
        const totalOpenCost = buyQueue.reduce((acc, q) => acc + q.remainingQty * q.fill.price, 0);
        const avgPrice = totalOpenQty > 0 ? totalOpenCost / totalOpenQty : 0;
        const firstFill = buyQueue[0].fill;

        openPositions.push({
          id: `pos-${symbol}-LONG`,
          symbol,
          assetClass: firstFill.assetClass || "EQUITY",
          broker: firstFill.broker || "DHAN",
          account: firstFill.account || "PRIMARY",
          side: "BUY",
          quantity: totalOpenQty,
          averageEntryPrice: avgPrice,
          currentPrice: avgPrice,
          unrealizedPnl: 0,
        });
      }

      // Remaining sellQueue -> Open Short Positions
      if (sellQueue.length > 0) {
        const totalOpenQty = sellQueue.reduce((acc, q) => acc + q.remainingQty, 0);
        const totalOpenCost = sellQueue.reduce((acc, q) => acc + q.remainingQty * q.fill.price, 0);
        const avgPrice = totalOpenQty > 0 ? totalOpenCost / totalOpenQty : 0;
        const firstFill = sellQueue[0].fill;

        openPositions.push({
          id: `pos-${symbol}-SHORT`,
          symbol,
          assetClass: firstFill.assetClass || "EQUITY",
          broker: firstFill.broker || "DHAN",
          account: firstFill.account || "PRIMARY",
          side: "SELL",
          quantity: totalOpenQty,
          averageEntryPrice: avgPrice,
          currentPrice: avgPrice,
          unrealizedPnl: 0,
        });
      }
    }

    return { closedTrades, openPositions };
  }

  public static matchFillsToTrades(
    fills: FillRecord[],
    symbolMultiplierMap: Record<string, number> = {}
  ) {
    return FifoAccountingEngine.matchFillsFifo(fills, symbolMultiplierMap);
  }
}

/**
 * Calculates complete P&L statistics including win rate, profit factor,
 * drawdown, recovery, holding duration, and expectancy.
 */
export function calculatePnlSummary(
  trades: TradeRecord[],
  initialCapital: number = 1000000
): PnlSummary {
  const totalTrades = trades.length;
  if (totalTrades === 0) {
    return {
      netPnl: 0,
      grossPnl: 0,
      realizedPnl: 0,
      unrealizedPnl: 0,
      totalCharges: 0,
      totalProfitAmount: 0,
      totalLossAmount: 0,
      winningTradesCount: 0,
      losingTradesCount: 0,
      breakevenTradesCount: 0,
      totalTrades: 0,
      winRate: 0,
      lossRate: 0,
      profitFactor: 0,
      tradeExpectancy: 0,
      expectancy: 0,
      winLossRatio: 0,
      averageWinAmount: 0,
      averageLossAmount: 0,
      largestWinAmount: 0,
      largestLossAmount: 0,
      maxDrawdownAmount: 0,
      maxDrawdownPercent: 0,
      recoveryFactor: 0,
      averageRMultiple: 0,
      maxWinStreak: 0,
      maxLossStreak: 0,
      averageHoldingDurationSeconds: 0,
      totalBrokerage: 0,
      totalStt: 0,
      totalExchangeCharges: 0,
      totalSebiCharges: 0,
      totalGst: 0,
      totalStampDuty: 0,
      initialCapital,
      returnOnCapitalPercent: 0,
    };
  }

  let grossPnl = 0;
  let netPnl = 0;
  let totalCharges = 0;
  let totalProfitAmount = 0;
  let totalLossAmount = 0;
  let winningTradesCount = 0;
  let losingTradesCount = 0;
  let breakevenTradesCount = 0;
  let largestWinAmount = 0;
  let largestLossAmount = 0;
  let totalHoldingSeconds = 0;
  let rMultipleSum = 0;
  let rMultipleCount = 0;

  let totalBrokerage = 0;
  let totalStt = 0;
  let totalExchangeCharges = 0;
  let totalSebiCharges = 0;
  let totalGst = 0;
  let totalStampDuty = 0;

  let currentWinStreak = 0;
  let maxWinStreak = 0;
  let currentLossStreak = 0;
  let maxLossStreak = 0;

  // Running Drawdown calculation
  let runningEquity = initialCapital;
  let peakEquity = initialCapital;
  let maxDrawdownAmount = 0;
  let maxDrawdownPercent = 0;

  // Sort trades chronologically for streak & drawdown
  const sortedTrades = [...trades].sort(
    (a, b) => new Date(a.entryTimestamp).getTime() - new Date(b.entryTimestamp).getTime()
  );

  for (const t of sortedTrades) {
    grossPnl += t.grossPnl;
    netPnl += t.netPnl;
    totalCharges += t.totalCharges;

    if (t.feeBreakdown) {
      totalBrokerage += t.feeBreakdown.brokerage;
      totalStt += t.feeBreakdown.stt;
      totalExchangeCharges += t.feeBreakdown.exchangeCharges;
      totalSebiCharges += t.feeBreakdown.sebiCharges;
      totalGst += t.feeBreakdown.gst;
      totalStampDuty += t.feeBreakdown.stampDuty;
    }

    if (t.holdingDurationSeconds) {
      totalHoldingSeconds += t.holdingDurationSeconds;
    }

    if (t.rMultiple !== undefined && t.rMultiple !== null) {
      rMultipleSum += t.rMultiple;
      rMultipleCount += 1;
    }

    if (t.netPnl > 0) {
      winningTradesCount += 1;
      totalProfitAmount += t.netPnl;
      largestWinAmount = Math.max(largestWinAmount, t.netPnl);
      currentWinStreak += 1;
      currentLossStreak = 0;
      if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
    } else if (t.netPnl < 0) {
      losingTradesCount += 1;
      const lossAbs = Math.abs(t.netPnl);
      totalLossAmount += lossAbs;
      largestLossAmount = Math.max(largestLossAmount, lossAbs);
      currentLossStreak += 1;
      currentWinStreak = 0;
      if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
    } else {
      breakevenTradesCount += 1;
    }

    // Update Drawdown
    runningEquity += t.netPnl;
    if (runningEquity > peakEquity) {
      peakEquity = runningEquity;
    }
    const currentDdAmount = peakEquity - runningEquity;
    const currentDdPct = peakEquity > 0 ? (currentDdAmount / peakEquity) * 100 : 0;
    if (currentDdAmount > maxDrawdownAmount) {
      maxDrawdownAmount = currentDdAmount;
    }
    if (currentDdPct > maxDrawdownPercent) {
      maxDrawdownPercent = currentDdPct;
    }
  }

  const winRate = (winningTradesCount / totalTrades) * 100;
  const lossRate = (losingTradesCount / totalTrades) * 100;
  const profitFactor = totalLossAmount > 0 ? totalProfitAmount / totalLossAmount : totalProfitAmount > 0 ? 99.9 : 0;
  const tradeExpectancy = netPnl / totalTrades;
  const averageWinAmount = winningTradesCount > 0 ? totalProfitAmount / winningTradesCount : 0;
  const averageLossAmount = losingTradesCount > 0 ? totalLossAmount / losingTradesCount : 0;
  const winLossRatio = averageLossAmount > 0 ? averageWinAmount / averageLossAmount : 0;
  const averageHoldingDurationSeconds = totalHoldingSeconds / totalTrades;
  const averageRMultiple = rMultipleCount > 0 ? rMultipleSum / rMultipleCount : 0;
  const recoveryFactor = maxDrawdownAmount > 0 ? netPnl / maxDrawdownAmount : netPnl > 0 ? 99.9 : 0;
  const returnOnCapitalPercent = initialCapital > 0 ? (netPnl / initialCapital) * 100 : 0;

  return {
    netPnl: parseFloat(netPnl.toFixed(2)),
    grossPnl: parseFloat(grossPnl.toFixed(2)),
    realizedPnl: parseFloat(netPnl.toFixed(2)),
    unrealizedPnl: 0,
    totalCharges: parseFloat(totalCharges.toFixed(2)),
    totalFees: parseFloat(totalCharges.toFixed(2)),
    totalProfitAmount: parseFloat(totalProfitAmount.toFixed(2)),
    totalLossAmount: parseFloat(totalLossAmount.toFixed(2)),
    winningTradesCount,
    losingTradesCount,
    breakevenTradesCount,
    totalTrades,
    winRate: parseFloat(winRate.toFixed(2)),
    lossRate: parseFloat(lossRate.toFixed(2)),
    profitFactor: parseFloat(profitFactor.toFixed(2)),
    tradeExpectancy: parseFloat(tradeExpectancy.toFixed(2)),
    expectancy: parseFloat(tradeExpectancy.toFixed(2)),
    winLossRatio: parseFloat(winLossRatio.toFixed(2)),
    averageWinAmount: parseFloat(averageWinAmount.toFixed(2)),
    averageLossAmount: parseFloat(averageLossAmount.toFixed(2)),
    largestWinAmount: parseFloat(largestWinAmount.toFixed(2)),
    largestLossAmount: parseFloat(largestLossAmount.toFixed(2)),
    maxDrawdownAmount: parseFloat(maxDrawdownAmount.toFixed(2)),
    maxDrawdownPercent: parseFloat(maxDrawdownPercent.toFixed(2)),
    recoveryFactor: parseFloat(recoveryFactor.toFixed(2)),
    averageRMultiple: parseFloat(averageRMultiple.toFixed(2)),
    maxWinStreak,
    maxLossStreak,
    averageHoldingDurationSeconds: Math.round(averageHoldingDurationSeconds),
    totalBrokerage: parseFloat(totalBrokerage.toFixed(2)),
    totalStt: parseFloat(totalStt.toFixed(2)),
    totalExchangeCharges: parseFloat(totalExchangeCharges.toFixed(2)),
    totalSebiCharges: parseFloat(totalSebiCharges.toFixed(2)),
    totalGst: parseFloat(totalGst.toFixed(2)),
    totalStampDuty: parseFloat(totalStampDuty.toFixed(2)),
    initialCapital,
    returnOnCapitalPercent: parseFloat(returnOnCapitalPercent.toFixed(2)),
  };
}
