/**
 * Quant.OS Central Order & Financial Calculations Engine
 * Single authoritative source for:
 * - Notional Value
 * - Required Margin
 * - Stop Loss & Take Profit Target Prices
 * - Risk / Reward Matrix
 * - Projected Position Netting Logic
 */

export interface ProjectedPositionResult {
  currentQty: number;
  currentDirection: "LONG" | "SHORT" | "FLAT";
  projectedQty: number;
  projectedDirection: "LONG" | "SHORT" | "FLAT";
  actionType: "NEW" | "INCREASE" | "REDUCE" | "CLOSE" | "REVERSE";
  summary: string;
}

/**
 * Calculates authoritative notional value: quantity * price
 */
export function calculateNotional(quantity: number, price: number): number {
  if (!quantity || !price || isNaN(quantity) || isNaN(price)) return 0;
  return Number((Math.abs(quantity) * Math.abs(price)).toFixed(2));
}

/**
 * Calculates required margin based on notional and leverage multiplier
 */
export function calculateRequiredMargin(notional: number, leverage: number = 1): number {
  if (!notional || isNaN(notional)) return 0;
  const lev = Math.max(1, leverage || 1);
  return Number((notional / lev).toFixed(2));
}

/**
 * Calculates stop loss trigger price given entry price, direction, and SL value/mode
 */
export function calculateStopLossPrice(
  entryPrice: number,
  side: "BUY" | "SELL" | "LONG" | "SHORT",
  slValue: number,
  mode: "PERCENTAGE" | "PRICE" = "PERCENTAGE"
): number {
  if (!entryPrice || entryPrice <= 0 || isNaN(entryPrice)) return 0;
  const isBuy = side.toUpperCase() === "BUY" || side.toUpperCase() === "LONG";

  if (mode === "PRICE") {
    return Number(slValue.toFixed(2));
  }

  const pct = Math.abs(slValue || 0) / 100;
  if (isBuy) {
    return Math.max(0.01, Number((entryPrice * (1 - pct)).toFixed(2)));
  } else {
    return Number((entryPrice * (1 + pct)).toFixed(2));
  }
}

/**
 * Calculates take profit target price given entry price, direction, and TP value/mode
 */
export function calculateTakeProfitPrice(
  entryPrice: number,
  side: "BUY" | "SELL" | "LONG" | "SHORT",
  tpValue: number,
  mode: "PERCENTAGE" | "PRICE" = "PERCENTAGE"
): number {
  if (!entryPrice || entryPrice <= 0 || isNaN(entryPrice)) return 0;
  const isBuy = side.toUpperCase() === "BUY" || side.toUpperCase() === "LONG";

  if (mode === "PRICE") {
    return Number(tpValue.toFixed(2));
  }

  const pct = Math.abs(tpValue || 0) / 100;
  if (isBuy) {
    return Number((entryPrice * (1 + pct)).toFixed(2));
  } else {
    return Math.max(0.01, Number((entryPrice * (1 - pct)).toFixed(2)));
  }
}

/**
 * Calculates absolute dollar risk, dollar reward, and R:R ratio
 */
export function calculateRiskReward(
  entryPrice: number,
  slPrice: number,
  tpPrice: number,
  quantity: number
): { riskUsd: number; rewardUsd: number; rrRatio: string } {
  if (!entryPrice || !quantity || quantity <= 0) {
    return { riskUsd: 0, rewardUsd: 0, rrRatio: "—" };
  }

  const riskUsd = Number((Math.abs(entryPrice - (slPrice || entryPrice)) * quantity).toFixed(2));
  const rewardUsd = Number((Math.abs((tpPrice || entryPrice) - entryPrice) * quantity).toFixed(2));
  const rrRatio = riskUsd > 0 ? (rewardUsd / riskUsd).toFixed(1) : "—";

  return { riskUsd, rewardUsd, rrRatio };
}

/**
 * Pure mathematical position netting calculation.
 * Resolves current position + new order side and quantity into the projected after-fill position.
 */
export function calculateProjectedPosition(
  currentPosition: { quantity?: number; direction?: string } | null | undefined,
  orderSide: "BUY" | "SELL" | "LONG" | "SHORT",
  orderQty: number
): ProjectedPositionResult {
  const currentQty = Math.abs(Number(currentPosition?.quantity || 0));
  const rawDir = (currentPosition?.direction || "FLAT").toUpperCase();
  const currentDirection: "LONG" | "SHORT" | "FLAT" =
    currentQty === 0 || rawDir === "FLAT"
      ? "FLAT"
      : rawDir.includes("SHORT") || rawDir === "SELL"
      ? "SHORT"
      : "LONG";

  const isBuy = orderSide.toUpperCase() === "BUY" || orderSide.toUpperCase() === "LONG";
  const qty = Math.abs(Number(orderQty || 0));

  // 1. If currently flat, the order opens a new position
  if (currentDirection === "FLAT" || currentQty === 0) {
    const dir = isBuy ? "LONG" : "SHORT";
    return {
      currentQty: 0,
      currentDirection: "FLAT",
      projectedQty: qty,
      projectedDirection: dir,
      actionType: "NEW",
      summary: `New ${dir} ${qty}`,
    };
  }

  // 2. If currently LONG
  if (currentDirection === "LONG") {
    if (isBuy) {
      const proj = Number((currentQty + qty).toFixed(6));
      return {
        currentQty,
        currentDirection: "LONG",
        projectedQty: proj,
        projectedDirection: "LONG",
        actionType: "INCREASE",
        summary: `LONG ${proj} (+${qty})`,
      };
    } else {
      // Selling against LONG
      if (Math.abs(currentQty - qty) < 1e-7) {
        return {
          currentQty,
          currentDirection: "LONG",
          projectedQty: 0,
          projectedDirection: "FLAT",
          actionType: "CLOSE",
          summary: "FLAT (Closed)",
        };
      } else if (qty < currentQty) {
        const proj = Number((currentQty - qty).toFixed(6));
        return {
          currentQty,
          currentDirection: "LONG",
          projectedQty: proj,
          projectedDirection: "LONG",
          actionType: "REDUCE",
          summary: `LONG ${proj} (-${qty})`,
        };
      } else {
        const proj = Number((qty - currentQty).toFixed(6));
        return {
          currentQty,
          currentDirection: "LONG",
          projectedQty: proj,
          projectedDirection: "SHORT",
          actionType: "REVERSE",
          summary: `SHORT ${proj} (Reversed)`,
        };
      }
    }
  }

  // 3. If currently SHORT
  if (currentDirection === "SHORT") {
    if (!isBuy) {
      const proj = Number((currentQty + qty).toFixed(6));
      return {
        currentQty,
        currentDirection: "SHORT",
        projectedQty: proj,
        projectedDirection: "SHORT",
        actionType: "INCREASE",
        summary: `SHORT ${proj} (+${qty})`,
      };
    } else {
      // Buying against SHORT
      if (Math.abs(currentQty - qty) < 1e-7) {
        return {
          currentQty,
          currentDirection: "SHORT",
          projectedQty: 0,
          projectedDirection: "FLAT",
          actionType: "CLOSE",
          summary: "FLAT (Closed)",
        };
      } else if (qty < currentQty) {
        const proj = Number((currentQty - qty).toFixed(6));
        return {
          currentQty,
          currentDirection: "SHORT",
          projectedQty: proj,
          projectedDirection: "SHORT",
          actionType: "REDUCE",
          summary: `SHORT ${proj} (-${qty})`,
        };
      } else {
        const proj = Number((qty - currentQty).toFixed(6));
        return {
          currentQty,
          currentDirection: "SHORT",
          projectedQty: proj,
          projectedDirection: "LONG",
          actionType: "REVERSE",
          summary: `LONG ${proj} (Reversed)`,
        };
      }
    }
  }

  return {
    currentQty,
    currentDirection,
    projectedQty: qty,
    projectedDirection: isBuy ? "LONG" : "SHORT",
    actionType: "NEW",
    summary: `${isBuy ? "LONG" : "SHORT"} ${qty}`,
  };
}
