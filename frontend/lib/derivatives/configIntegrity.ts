/**
 * Quant.OS Bot Configuration Integrity & State Governance (Frontend)
 * ===================================================================
 * Generates deterministic hashes of bot draft configurations and tracks
 * approval validity so any edits force explicit user re-approval.
 */

export function generateSimpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

export function generateDeterministicBotHash(botConfig: Record<string, any>): string {
  const canonicalObj = {
    botId: botConfig.botId || botConfig.bot_id || "",
    strategyType: botConfig.strategyType || botConfig.strategy_type || botConfig.selectedStrategyId || "",
    underlying: botConfig.underlying || botConfig.underlyingSymbol || "",
    expiry: botConfig.expiry || botConfig.selectedExpiry || "",
    environment: (botConfig.environment || botConfig.executionMode || "PAPER").toUpperCase(),
    marketDataProvider: (botConfig.marketDataProvider || botConfig.dataProvider || "UPSTOX").toUpperCase(),
    executionBroker: (botConfig.executionBroker || botConfig.broker || "PAPER").toUpperCase(),
    capitalAllocation: Number(botConfig.capitalAllocation || botConfig.capital || 0),
    stopLossPct: Number(botConfig.stopLossPct || botConfig.stopLossValue || 0),
    takeProfitPct: Number(botConfig.takeProfitPct || botConfig.takeProfitValue || 0),
    maxSlippagePct: Number(botConfig.maxSlippagePct || 0.2),
    legs: (botConfig.legs || botConfig.strategyLegs || []).map((l: any) => ({
      strike: Number(l.strike || 0),
      optionType: (l.optionType || l.option_type || "").toUpperCase(),
      side: (l.side || l.action || "").toUpperCase(),
      quantity: Number(l.quantity || 0),
      lots: Number(l.lots || 1),
      premium: Number(l.premium || l.limitPrice || 0),
    })),
  };

  const jsonString = JSON.stringify(canonicalObj);
  return generateSimpleHash(jsonString);
}

export interface BotApprovalState {
  botId: string;
  configHash: string;
  approvedAt: string;
  isLiveConfirmed: boolean;
  approvalToken: string;
}
