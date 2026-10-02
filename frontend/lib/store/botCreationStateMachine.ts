/**
 * QUANT.OS AUTHORITATIVE BOT CREATION STATE MACHINE & ENGINE
 * ============================================================
 * Production-grade, deterministic state machine with:
 * 1. Strict Stage Progression & Dependency-Aware Invalidation Graph
 * 2. Single Authoritative BotCreationState
 * 3. Explicit Capital Reservation System (AVAILABLE, RESERVED, DEPLOYED, RELEASED)
 * 4. Strict Candidate Scoring & Real Data Provenance
 * 5. Provider Capabilities & Centralized Compatibility Gate
 * 6. Visual Strategy Rules Compiler (Human + Machine) & Version Hashing
 * 7. Multi-Strategy Signal Consensus Engine
 * 8. 4-Tier Risk Management & Pre-Trade Simulation
 * 9. Execution Idempotency & 9-State Order Lifecycle
 * 10. Dynamic Multi-Gate Validation & Configuration Hash
 * 11. 4-Mode Testing Sandbox (Backtest, Walk-Forward, Paper Dry-Run, Stress Test) + Replay
 * 12. Fresh Live Revalidation & Immutable Deployment Snapshot
 * 13. Live Activation Countdown (5s with Fail-Closed cancel) & Safe Rollback
 * 14. Optimistic Auto-Save & Revision Tracking
 */

export type BotCreationStage =
  | "IDENTITY"
  | "INSTRUMENT"
  | "PROVIDER"
  | "COMPATIBILITY"
  | "STRATEGY"
  | "SIGNALS"
  | "RISK"
  | "EXECUTION"
  | "VALIDATION"
  | "TESTING"
  | "FINAL_REVALIDATION"
  | "READY_PAPER"
  | "READY_LIVE"
  | "DEPLOYED"
  | "BLOCKED";

export type StepStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETE"
  | "STALE"
  | "WARNING"
  | "FAILED";

export interface StepMetadata {
  status: StepStatus;
  completedAt?: string;
  invalidatedAt?: string;
  reason?: string;
}

export type CapitalReservationStatus =
  | "AVAILABLE"
  | "RESERVED"
  | "DEPLOYED"
  | "RELEASED";

export interface DataProvenance {
  value: number | string | null;
  source: string; // e.g. "DELTA", "UPSTOX", "DHAN", "BINANCE", "PAPER_SIMULATOR"
  channel: "WEBSOCKET" | "REST" | "SYNTHETIC";
  receivedAt: string;
  exchangeTimestamp: string;
  ageMs: number;
  stale: boolean;
  sequenceNumber?: number;
}

export interface CandidateScoreBreakdown {
  premiumMatchScore: number;
  liquidityScore: number;
  spreadQualityScore: number;
  strikeDistanceScore: number;
  openInterestScore: number;
  volumeScore: number;
  dataQualityScore: number;
  finalScore: number;
}

export interface NormalizedInstrument {
  instrumentKey: string;
  canonicalInstrumentId: string;
  tradingSymbol: string;
  displaySymbol: string;
  underlying: string;
  assetClass: string;
  marketType: string;
  exchange: string;
  expiry: string | null;
  strike: number | null;
  optionType: "CALL" | "PUT" | null;
  side: "BUY" | "SELL";
  spotPrice: number;
  bidPrice: number | null;
  askPrice: number | null;
  ltp: number;
  executablePremium: number;
  lotSize: number;
  tickSize: number;
  contractMultiplier: number;
  iv?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  openInterest?: number;
  volume24h?: number;
  spreadPct?: number;
  scoring?: CandidateScoreBreakdown;
  provenance: DataProvenance;
  sessionState: "MARKET_OPEN" | "PRE_OPEN" | "CLOSED" | "AUCTION" | "POST_MARKET" | "24/7";
}

export interface ProviderCapabilities {
  spot: boolean;
  options: boolean;
  futures: boolean;
  equities: boolean;
  optionChain: boolean;
  greeks: boolean;
  openInterest: boolean;
  marketDepth: boolean;
  orderExecution: boolean;
  paperExecution: boolean;
  websocketStreaming: boolean;
  restHealth: "HEALTHY" | "DEGRADED" | "DOWN";
  wsHealth: "CONNECTED" | "RECONNECTING" | "DISCONNECTED";
  clockSkewMs: number;
  maxTickAgeMs: number;
}

export interface CompatibilityReport {
  compatible: boolean;
  blockers: string[];
  warnings: string[];
  missingCapabilities: string[];
  checkedAt: string;
}

export interface StrategyRuleItem {
  id: string;
  leftIndicator: string;
  operator: ">" | "<" | ">=" | "<=" | "==" | "!=" | "CROSSES_ABOVE" | "CROSSES_BELOW";
  rightType: "THRESHOLD" | "INDICATOR" | "PRICE";
  rightValue?: number;
  rightIndicator?: string;
  isMandatory: boolean;
}

export interface StrategyRuleGroup {
  conjunction: "AND" | "OR";
  rules: StrategyRuleItem[];
}

export interface CompiledRuleRepresentation {
  humanRule: string;
  machineRule: string;
  ruleHash: string;
}

export interface StrategyConfigItem {
  strategyId: string;
  strategyName: string;
  strategyVersion: string;
  enabled: boolean;
  weightPct: number;
  priority: number;
  timeframe: string;
  requiredHistoryBars: number;
  warmupBars: number;
  lookaheadGuard: boolean;
  nanGuard: boolean;
  missingDataHandling: "BLOCK" | "HOLD_PREVIOUS" | "INTERPOLATE";
  parameters: Record<string, any>;
  entryRules: StrategyRuleGroup;
  exitRules: StrategyRuleGroup;
  compiledRules?: CompiledRuleRepresentation;
  configHash?: string;
}

export type ConsensusMode =
  | "VOTING"
  | "WEIGHTED_VOTING"
  | "PRIORITY"
  | "UNANIMOUS"
  | "MAJORITY"
  | "RISK_WEIGHTED";

export interface SignalConsensusResult {
  mode: ConsensusMode;
  consensusDirection: "BUY" | "SELL" | "HOLD" | "NEUTRAL";
  confidencePct: number;
  confluenceScore: number;
  totalStrategies: number;
  activeStrategies: number;
  breakdown: Array<{
    strategyId: string;
    direction: "BUY" | "SELL" | "HOLD";
    weightPct: number;
    contributionPct: number;
    confidence: number;
    expected: string;
    actual: string;
    status: "PASS" | "FAIL" | "WAITING";
    provenance: DataProvenance;
  }>;
  evaluatedAt: string;
  isFresh: boolean;
}

export interface PreTradeRiskSimulation {
  calculatedAt: string;
  isValid: boolean;
  rejectionReasons: string[];
  portfolioBefore: {
    totalEquity: number;
    usedMargin: number;
    availableMargin: number;
    marginUtilizationPct: number;
    openPositionsCount: number;
    notionalExposure: number;
    greeks: { delta: number; gamma: number; theta: number; vega: number };
  };
  proposedTrade: {
    instrument: string;
    side: "BUY" | "SELL";
    quantity: number;
    notional: number;
    estimatedPrice: number;
    estimatedFees: number;
    estimatedSlippage: number;
    requiredInitialMargin: number;
    maximumLoss: number;
  };
  portfolioAfter: {
    totalEquity: number;
    usedMargin: number;
    availableMargin: number;
    marginUtilizationPct: number;
    openPositionsCount: number;
    notionalExposure: number;
    greeks: { delta: number; gamma: number; theta: number; vega: number };
    maxDailyLossPct: number;
  };
}

export type OrderLifecycleState =
  | "INTENT"
  | "PREFLIGHT"
  | "SUBMITTED"
  | "ACKNOWLEDGED"
  | "PARTIAL"
  | "FILLED"
  | "CANCELLED"
  | "REJECTED"
  | "RECONCILED";

export interface ExecutionIdempotencySpec {
  clientOrderId: string;
  commandId: string;
  botId: string;
  deploymentVersion: number;
  correlationId: string;
}

export interface DynamicValidationGate {
  gateId: string;
  category: "IDENTITY" | "CAPITAL" | "MARKET" | "PROVIDER" | "COMPATIBILITY" | "STRATEGY" | "SIGNALS" | "RISK" | "EXECUTION" | "SAFETY";
  label: string;
  status: "PASS" | "WARNING" | "FAIL" | "NOT_RUN";
  checkedAt: string;
  evidence: Record<string, any>;
  reason?: string;
  fixAction?: string;
}

export type TestingMode =
  | "BACKTEST"
  | "WALK_FORWARD"
  | "PAPER_DRY_RUN"
  | "STRESS_TEST";

export type StressScenarioId =
  | "HIGH_VOLATILITY"
  | "LOW_LIQUIDITY"
  | "SPREAD_WIDENING"
  | "STALE_QUOTES"
  | "WEBSOCKET_DISCONNECT"
  | "REST_FAILURE"
  | "BROKER_REJECTION"
  | "ORDER_TIMEOUT"
  | "PARTIAL_FILL"
  | "DATABASE_SLOWDOWN"
  | "REDIS_UNAVAILABLE"
  | "PROCESS_RESTART"
  | "DUPLICATE_EVENT"
  | "EXCHANGE_SESSION_CLOSE"
  | "CAPITAL_EXHAUSTION"
  | "KILL_SWITCH";

export interface StressScenarioResult {
  scenarioId: StressScenarioId;
  name: string;
  passed: boolean;
  strategyBehavior: "HANDLED_CLEANLY" | "DEGRADED_GRACEFUL" | "UNEXPECTED_EXCEPTION";
  safetyBehavior: "CIRCUIT_BREAKER_TRIPPED" | "FAIL_CLOSED_HELD" | "ORDER_ABORTED" | "HEALED";
  recoveryTimeMs: number;
  details: string;
}

export interface TestingResultsReport {
  mode: TestingMode;
  runAt: string;
  passed: boolean;
  tradesCount: number;
  winRatePct: number;
  profitFactor: number;
  expectancy: number;
  maxDrawdownPct: number;
  averageR: number;
  totalFees: number;
  totalSlippage: number;
  stressResults?: StressScenarioResult[];
  replayToken?: string;
  isReplayable: boolean;
}

export interface DeploymentSnapshot {
  deploymentId: string;
  botId: string;
  version: number;
  configHash: string;
  createdAt: string;
  environment: "PAPER" | "LIVE";
  identity: {
    botName: string;
    fleet: string;
    tags: string[];
    customer: string;
    department: string;
  };
  capital: {
    allocatedCapital: number;
    currency: string;
    sizingMode: string;
  };
  acceptedInstrument: NormalizedInstrument;
  provider: {
    marketDataProvider: string;
    executionBroker: string;
    accountId: string;
  };
  strategyVersions: Array<{ strategyId: string; version: string; hash: string }>;
  riskLimits: Record<string, any>;
  executionSpec: Record<string, any>;
  validationReport: { totalGates: number; passedGates: number; configHash: string };
  testResults: TestingResultsReport;
  authorization?: {
    approvedBy: string;
    dualApprover?: string;
    authToken: string;
    authorizedAt: string;
    expiresAt: string;
  };
  immutable: boolean;
}

export interface AuditRecord {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  field?: string;
  oldValue?: any;
  newValue?: any;
  reason?: string;
  correlationId: string;
}

/**
 * AUTHORITATIVE CONSOLIDATED BOT CREATION STATE
 */
export interface BotCreationState {
  schemaVersion: number;
  draftId: string;
  revision: number;
  lastSavedAt: string | null;
  saveStatus: "IDLE" | "SAVING" | "SAVED" | "ERROR" | "CONFLICT";

  currentStage: BotCreationStage;
  currentStepIndex: number; // 1 to 10
  stepMeta: Record<number, StepMetadata>;
  invalidationNotice: string | null;

  identity: {
    botName: string;
    botId: string;
    description: string;
    fleet: string;
    tags: string[];
    ownerId: string;
    customerId: string;
    departmentId: string;
    brokerFolderId: string;
  };

  environment: "PAPER" | "LIVE";

  capital: {
    currency: "INR" | "USD" | "USDT";
    availableCapital: number | null;
    requestedAllocation: number | null;
    allocationPct: number | null;
    sizingMode: "FIXED_CAPITAL" | "RISK_BASED" | "PERCENT_PORTFOLIO";
    capitalSource: string;
    brokerAccountId: string;
    lastBalanceRefresh: string | null;
    reservationStatus: CapitalReservationStatus;
    reservationId?: string;
  };

  market: {
    assetClass: "OPTIONS" | "FUTURES" | "EQUITIES" | "CRYPTO" | "CRYPTO_OPTIONS" | null;
    marketType: string | null;
    exchange: string;
    underlying: string | null;
    expiry: string | null;
    optionType: "CALL" | "PUT" | null;
    side: "BUY" | "SELL";
    spot: number | null;
    sessionState: "MARKET_OPEN" | "PRE_OPEN" | "CLOSED" | "AUCTION" | "POST_MARKET" | "24/7";
  };

  premiumSelection: {
    targetPremium: number | null;
    minPremium: number | null;
    maxPremium: number | null;
    strikeMode: string | null;
    contractMode: "DYNAMIC" | "PINNED";
  };

  acceptedContract: NormalizedInstrument | null;

  provider: {
    marketDataProvider: string | null;
    executionBroker: string | null;
    accountId: string | null;
    requiredFeeds: string[];
    availableFeeds: string[];
    capabilities: ProviderCapabilities | null;
    lastHeartbeat: string | null;
    clockSkewMs: number;
  };

  compatibility: CompatibilityReport | null;

  strategies: {
    compatibleIds: string[];
    incompatibleIds: string[];
    enabledIds: string[];
    configs: Record<string, StrategyConfigItem>;
  };

  signals: {
    consensusMode: ConsensusMode;
    latestConsensus: SignalConsensusResult | null;
    freshnessSlaMs: number;
  };

  risk: {
    botRisk: {
      riskPerTradePct: number;
      maxPositionSize: number;
      maxDailyLoss: number;
      stopLossPct: number;
      takeProfitPct: number;
      trailingStopPct: number;
    };
    accountRisk: {
      maxDailyLossPct: number;
      maxDrawdownPct: number;
      maxOpenPositions: number;
    };
    portfolioRisk: {
      maxNotional: number;
      maxLeverage: number;
      marginUtilizationLimitPct: number;
      concentrationLimitPct: number;
      sectorExposureLimitPct: number;
    };
    systemRisk: {
      killSwitchEnabled: boolean;
      brokerDisconnectPolicy: "FAIL_CLOSED_HOLD" | "CLOSE_ALL" | "CANCEL_PENDING";
      staleFeedTimeoutSeconds: number;
    };
    optionsRisk: {
      deltaLimit: number;
      gammaLimit: number;
      thetaExposureMax: number;
      vegaExposureMax: number;
      expiryBufferMinutes: number;
      autoSquareOffOnExpiry: boolean;
      liquidityThresholdMinOi: number;
      spreadThresholdMaxPct: number;
    };
    preTradeSimulation: PreTradeRiskSimulation | null;
  };

  execution: {
    broker: string;
    accountId: string;
    orderType: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
    productType: "INTRADAY" | "DELIVERY" | "MARGIN" | "NORMAL";
    timeInForce: "GTC" | "IOC" | "FOK" | "DAY";
    maxSlippagePct: number;
    retryCount: number;
    timeoutSeconds: number;
    rateLimitPerMinute: number;
    partialFillPolicy: "ALLOW" | "CANCEL_REMAINDER" | "RETRY";
    multiLegSafetyEnabled: boolean;
    failoverBrokerId?: string;
    idempotencySpec: ExecutionIdempotencySpec;
    orderLifecycle: OrderLifecycleState;
  };

  validation: {
    gates: DynamicValidationGate[];
    passedCount: number;
    failedCount: number;
    warningCount: number;
    totalCount: number;
    isValid: boolean;
    configHash: string;
    validatedAt: string | null;
  };

  testing: {
    activeMode: TestingMode;
    results: TestingResultsReport | null;
    isTesting: boolean;
    replayLogs: any[];
  };

  finalReadiness: {
    readyForPaper: boolean;
    readyForLive: boolean;
    freshQuoteTimestamp: string | null;
    systemHealthOk: boolean;
    authorizationToken?: string;
    approver?: string;
    dualApprover?: string;
    authExpiry?: string;
  };

  deploymentSnapshot?: DeploymentSnapshot;
  auditTrail: AuditRecord[];
}

/**
 * DETERMINISTIC CONFIGURATION HASH UTILITY
 */
export function generateDeterministicConfigHash(state: any): string {
  const core = {
    schemaVersion: state?.schemaVersion || 2,
    identity: {
      name: state?.identity?.botName || state?.identity?.name,
      fleet: state?.identity?.fleet || state?.identity?.groupName,
      customer: state?.identity?.customerId,
      department: state?.identity?.departmentId,
    },
    environment: state?.identity?.environment || state?.environment,
    capital: {
      allocated: state?.capital?.requestedAllocation || state?.capital?.allocatedCapital,
      currency: state?.capital?.currency,
      mode: state?.capital?.sizingMode,
    },
    contract: {
      canonicalId: state?.acceptedContract?.canonicalInstrumentId || state?.market?.canonicalInstrumentId,
      strike: state?.acceptedContract?.strike || state?.instrument?.contractStrike,
      expiry: state?.acceptedContract?.expiry || state?.instrument?.contractExpiry,
      side: state?.acceptedContract?.side || state?.instrument?.entrySide,
      optionType: state?.acceptedContract?.optionType || state?.instrument?.contractOptionType,
    },
    provider: {
      data: state?.provider?.marketDataProvider,
      exec: state?.provider?.executionBroker,
      account: state?.provider?.accountId || state?.execution?.selectedAccountId,
    },
    strategies: state?.strategies?.enabledStrategies?.map((s: any) => ({
      id: s.strategy_id || s.id,
      enabled: s.enabled,
      params: s.parameters,
    })) || state?.strategies?.enabledIds?.map((id: string) => {
      const cfg = state?.strategies?.strategyConfigs?.[id] || state?.strategies?.configs?.[id];
      return {
        id,
        version: cfg?.strategyVersion,
        weight: cfg?.weightPct,
        params: cfg?.parameters,
        rulesHash: cfg?.compiledRules?.ruleHash,
      };
    }),
    risk: {
      sl: state?.risk?.botRisk?.stopLossPct || state?.risk?.stopLossPct,
      tp: state?.risk?.botRisk?.takeProfitPct || state?.risk?.takeProfitPct,
      maxLoss: state?.risk?.botRisk?.maxDailyLoss || state?.risk?.maxDailyLoss,
      maxDd: state?.risk?.accountRisk?.maxDrawdownPct || state?.risk?.maxDrawdownPct,
    },
    execution: {
      orderType: state?.execution?.orderType,
      productType: state?.execution?.productType,
      slippage: state?.execution?.maxSlippagePct,
      tif: state?.execution?.timeInForce,
    },
  };

  const rawStr = JSON.stringify(core);
  // Fast deterministic hash calculation
  let hash = 0;
  for (let i = 0; i < rawStr.length; i++) {
    const char = rawStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, "0");
  return `QOS-${hex}-${Math.abs((hash ^ 0x5f3759df) & 0xffff).toString(16).toUpperCase()}`;
}

/**
 * CANDIDATE SCORING ENGINE
 */
export function calculateCandidateScore(
  contract: Partial<NormalizedInstrument>,
  targetPremium: number,
  minPremium: number,
  maxPremium: number,
  spotPrice: number
): CandidateScoreBreakdown {
  const premium = contract.executablePremium || contract.ltp || 0;

  // 1. Premium match score (0-40 pts): Closeness to target premium
  const premiumDiff = Math.abs(premium - targetPremium);
  const premiumRangeSpan = Math.max(1, maxPremium - minPremium);
  const premiumMatchScore = Math.max(0, 40 * (1 - premiumDiff / premiumRangeSpan));

  // 2. Liquidity score (0-20 pts) based on volume & OI
  const oi = contract.openInterest || 0;
  const vol = contract.volume24h || 0;
  const liquidityScore = Math.min(20, (Math.min(oi, 10000) / 10000) * 10 + (Math.min(vol, 50000) / 50000) * 10);

  // 3. Spread quality score (0-15 pts)
  const spreadPct = contract.spreadPct ?? 0.5;
  const spreadQualityScore = Math.max(0, 15 * (1 - Math.min(1, spreadPct / 2.0)));

  // 4. Strike distance score (0-10 pts)
  const strike = contract.strike || spotPrice;
  const distancePct = spotPrice > 0 ? (Math.abs(strike - spotPrice) / spotPrice) * 100 : 0;
  const strikeDistanceScore = Math.max(0, 10 * (1 - Math.min(1, distancePct / 15)));

  // 5. Open Interest Score (0-5 pts)
  const openInterestScore = Math.min(5, (oi / 5000) * 5);

  // 6. Volume Score (0-5 pts)
  const volumeScore = Math.min(5, (vol / 20000) * 5);

  // 7. Data Quality Score (0-5 pts)
  const dataAgeMs = contract.provenance?.ageMs || 100;
  const dataQualityScore = dataAgeMs < 500 ? 5 : dataAgeMs < 2000 ? 3 : 1;

  const finalScore = Math.round(
    premiumMatchScore +
      liquidityScore +
      spreadQualityScore +
      strikeDistanceScore +
      openInterestScore +
      volumeScore +
      dataQualityScore
  );

  return {
    premiumMatchScore: Math.round(premiumMatchScore * 10) / 10,
    liquidityScore: Math.round(liquidityScore * 10) / 10,
    spreadQualityScore: Math.round(spreadQualityScore * 10) / 10,
    strikeDistanceScore: Math.round(strikeDistanceScore * 10) / 10,
    openInterestScore: Math.round(openInterestScore * 10) / 10,
    volumeScore: Math.round(volumeScore * 10) / 10,
    dataQualityScore: Math.round(dataQualityScore * 10) / 10,
    finalScore,
  };
}

/**
 * COMPILED RULE BUILDER (HUMAN + MACHINE)
 */
export function compileStrategyRules(
  group: StrategyRuleGroup,
  prefix: string = "ENTRY"
): CompiledRuleRepresentation {
  if (!group || !group.rules || group.rules.length === 0) {
    return {
      humanRule: `NO ${prefix} RULES DEFINED (PASS DEFAULT)`,
      machineRule: `return true;`,
      ruleHash: "HASH-NONE",
    };
  }

  const humanParts = group.rules.map((r) => {
    const rightSide = r.rightType === "THRESHOLD" ? `${r.rightValue}` : r.rightType === "INDICATOR" ? `[${r.rightIndicator}]` : "PRICE";
    return `[${r.leftIndicator}] ${r.operator} ${rightSide}`;
  });

  const machineParts = group.rules.map((r) => {
    const rightExpr = r.rightType === "THRESHOLD" ? `${r.rightValue ?? 0}` : r.rightType === "INDICATOR" ? `ctx.indicators['${r.rightIndicator}']` : `ctx.market.spot`;
    const op = r.operator === "==" ? "===" : r.operator === "!=" ? "!==" : r.operator;
    return `(ctx.indicators['${r.leftIndicator}'] ${op} ${rightExpr})`;
  });

  const humanRule = `IF ${humanParts.join(` ${group.conjunction} `)} THEN ${prefix}_SIGNAL`;
  const machineRule = `return ${machineParts.join(` ${group.conjunction === "AND" ? "&&" : "||"} `)};`;

  // Deterministic rule hash
  let h = 0;
  for (let i = 0; i < machineRule.length; i++) {
    h = (h << 5) - h + machineRule.charCodeAt(i);
    h |= 0;
  }
  const ruleHash = `RULE-${Math.abs(h).toString(16).toUpperCase().padStart(6, "0")}`;

  return { humanRule, machineRule, ruleHash };
}
