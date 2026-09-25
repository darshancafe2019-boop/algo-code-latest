/**
 * QUANT.OS PAPER TRADING & IMMUTABLE TRADE JOURNAL ENGINE
 * ========================================================
 * Simulates realistic forward paper execution and logs complete audit records.
 *
 * Audit Fields Recorded:
 * - Strategy ID, Strategy Name, Instrument, Direction
 * - Signal Time, Entry Time, Entry Price, Stop Price, Target Price
 * - Exit Time, Exit Price, Position Size, Risk %, P&L, R Multiple
 * - Fees, Funding, Slippage, Exit Reason, Market Regime
 * - Signal Conditions Snapshot, Strategy Version
 */

import { CryptoStrategyDefinition } from "./crypto30Strategies";
import { ProposedTradeOrder, strategyRiskEngine } from "./strategyRiskEngine";

export interface JournalTradeRecord {
  journalId: string;
  executionEnvironment: "BACKTEST" | "PAPER" | "LIVE";
  strategyId: string;
  strategyNumber: string;
  strategyName: string;
  strategyVersion: string;
  instrument: string;
  direction: "LONG" | "SHORT";
  status: "PENDING" | "OPEN" | "CLOSED" | "CANCELLED";
  signalTime: string;
  entryTime: string;
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  exitTime?: string;
  exitPrice?: number;
  positionSizeUnits: number;
  notionalValue: number;
  leverage: number;
  riskPct: number;
  maxLossAmount: number;
  grossPnl: number;
  fees: number;
  funding: number;
  slippage: number;
  netPnl: number;
  rMultiple: number;
  exitReason?: "TAKE_PROFIT" | "STOP_LOSS" | "TRAILING_STOP" | "MANUAL_EXIT" | "REGIME_EXIT";
  marketRegime: string;
  signalConditionsSnapshot: Record<string, boolean | string>;
  createdAt: string;
  updatedAt: string;
}

export interface PaperStrategyInstance {
  instanceId: string;
  strategyNumber: string;
  strategyId: string;
  strategyName: string;
  strategyVersion: string;
  instrument: string;
  timeframe: string;
  status: "ACTIVE" | "PAUSED" | "STOPPED";
  riskPct: number;
  allocatedCapital: number;
  activePositionsCount: number;
  totalPaperTrades: number;
  winRatePct: number;
  totalPaperPnl: number;
  createdAt: string;
  lastSignalAt?: string;
}

export class PaperTradingEngine {
  private activeInstances: Map<string, PaperStrategyInstance> = new Map();
  private journalRecords: JournalTradeRecord[] = [];

  constructor() {
    this._seedInitialPaperJournal();
  }

  public getActiveInstances(): PaperStrategyInstance[] {
    return Array.from(this.activeInstances.values());
  }

  public getJournalRecords(environment?: "BACKTEST" | "PAPER" | "LIVE"): JournalTradeRecord[] {
    if (!environment) return [...this.journalRecords];
    return this.journalRecords.filter((r) => r.executionEnvironment === environment);
  }

  public activatePaperStrategy(
    strategy: CryptoStrategyDefinition,
    instrument: string,
    timeframe: string,
    riskPct: number = 0.5,
    allocatedCapital: number = 25000
  ): PaperStrategyInstance {
    const instanceId = `PAPER-INST-${strategy.number}-${instrument}-${Date.now().toString(36)}`;
    const instance: PaperStrategyInstance = {
      instanceId,
      strategyNumber: strategy.number,
      strategyId: strategy.id,
      strategyName: strategy.name,
      strategyVersion: strategy.version,
      instrument,
      timeframe,
      status: "ACTIVE",
      riskPct,
      allocatedCapital,
      activePositionsCount: 0,
      totalPaperTrades: 0,
      winRatePct: 0,
      totalPaperPnl: 0,
      createdAt: new Date().toISOString(),
      lastSignalAt: new Date().toISOString(),
    };

    this.activeInstances.set(instanceId, instance);
    return instance;
  }

  public pausePaperStrategy(instanceId: string): boolean {
    const inst = this.activeInstances.get(instanceId);
    if (inst) {
      inst.status = inst.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
      return true;
    }
    return false;
  }

  public executePaperOrder(
    strategy: CryptoStrategyDefinition,
    proposed: ProposedTradeOrder,
    marketRegime: string = "TRENDING",
    conditionsSnapshot: Record<string, any> = {}
  ): JournalTradeRecord {
    const riskResult = strategyRiskEngine.evaluateTradeRisk(proposed, 0);

    const journalId = `JOURNAL-PAPER-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const record: JournalTradeRecord = {
      journalId,
      executionEnvironment: "PAPER",
      strategyId: strategy.id,
      strategyNumber: strategy.number,
      strategyName: strategy.name,
      strategyVersion: strategy.version,
      instrument: proposed.instrument,
      direction: proposed.direction,
      status: "OPEN",
      signalTime: now,
      entryTime: now,
      entryPrice: riskResult.entryPrice,
      stopPrice: riskResult.stopPrice,
      targetPrice: riskResult.targetPrice,
      positionSizeUnits: riskResult.positionSizeUnits,
      notionalValue: riskResult.notionalValue,
      leverage: riskResult.leverage,
      riskPct: riskResult.riskPct,
      maxLossAmount: riskResult.maxLossAmount,
      grossPnl: 0,
      fees: riskResult.estimatedFeeAmount / 2, // Entry fee
      funding: 0,
      slippage: riskResult.estimatedSlippageAmount / 2,
      netPnl: 0 - (riskResult.estimatedFeeAmount / 2 + riskResult.estimatedSlippageAmount / 2),
      rMultiple: 0,
      marketRegime,
      signalConditionsSnapshot: conditionsSnapshot,
      createdAt: now,
      updatedAt: now,
    };

    this.journalRecords.unshift(record);
    return record;
  }

  public closePaperTrade(
    journalId: string,
    exitPrice: number,
    exitReason: "TAKE_PROFIT" | "STOP_LOSS" | "TRAILING_STOP" | "MANUAL_EXIT" = "TAKE_PROFIT"
  ): JournalTradeRecord | null {
    const record = this.journalRecords.find((r) => r.journalId === journalId);
    if (!record || record.status === "CLOSED") return null;

    const isLong = record.direction === "LONG";
    const grossPnl = isLong
      ? (exitPrice - record.entryPrice) * record.positionSizeUnits
      : (record.entryPrice - exitPrice) * record.positionSizeUnits;

    const stopDistance = Math.abs(record.entryPrice - record.stopPrice);
    const rMultiple = stopDistance > 0 ? Number((grossPnl / record.maxLossAmount).toFixed(2)) : 0;
    const exitFee = record.notionalValue * 0.0005;
    const exitSlippage = record.notionalValue * 0.0005;
    const totalFees = record.fees + exitFee;
    const totalSlippage = record.slippage + exitSlippage;
    const netPnl = Number((grossPnl - totalFees - totalSlippage).toFixed(2));

    record.status = "CLOSED";
    record.exitTime = new Date().toISOString();
    record.exitPrice = exitPrice;
    record.grossPnl = Number(grossPnl.toFixed(2));
    record.fees = Number(totalFees.toFixed(2));
    record.slippage = Number(totalSlippage.toFixed(2));
    record.netPnl = netPnl;
    record.rMultiple = rMultiple;
    record.exitReason = exitReason;
    record.updatedAt = new Date().toISOString();

    return record;
  }

  private _seedInitialPaperJournal() {
    // Seed initial realistic paper trade records for UI demonstration and historical audits
    const samplePaperTrades: Partial<JournalTradeRecord>[] = [
      {
        journalId: "JOURNAL-PAPER-demo-01",
        executionEnvironment: "PAPER",
        strategyId: "crypto-strat-01",
        strategyNumber: "01",
        strategyName: "Trend Pullback to EMA",
        strategyVersion: "1.0.0",
        instrument: "BTCUSDT",
        direction: "LONG",
        status: "CLOSED",
        signalTime: new Date(Date.now() - 86400000 * 3).toISOString(),
        entryTime: new Date(Date.now() - 86400000 * 3).toISOString(),
        entryPrice: 66200,
        stopPrice: 64800,
        targetPrice: 69000,
        exitTime: new Date(Date.now() - 86400000 * 1).toISOString(),
        exitPrice: 69000,
        positionSizeUnits: 0.3571,
        notionalValue: 23640,
        leverage: 1,
        riskPct: 0.5,
        maxLossAmount: 500,
        grossPnl: 1000,
        fees: 23.64,
        funding: 2.1,
        slippage: 11.82,
        netPnl: 962.44,
        rMultiple: 2.0,
        exitReason: "TAKE_PROFIT",
        marketRegime: "TRENDING",
        signalConditionsSnapshot: { trend: true, pullback: true, reclaim: true, risk: true },
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
      {
        journalId: "JOURNAL-PAPER-demo-02",
        executionEnvironment: "PAPER",
        strategyId: "crypto-strat-06",
        strategyNumber: "06",
        strategyName: "BandWidth Squeeze Breakout",
        strategyVersion: "1.0.0",
        instrument: "ETHUSDT",
        direction: "LONG",
        status: "CLOSED",
        signalTime: new Date(Date.now() - 86400000 * 2).toISOString(),
        entryTime: new Date(Date.now() - 86400000 * 2).toISOString(),
        entryPrice: 3380,
        stopPrice: 3290,
        targetPrice: 3560,
        exitTime: new Date(Date.now() - 86400000 * 0.5).toISOString(),
        exitPrice: 3290,
        positionSizeUnits: 5.5555,
        notionalValue: 18777,
        leverage: 1,
        riskPct: 0.5,
        maxLossAmount: 500,
        grossPnl: -500,
        fees: 18.78,
        funding: 1.5,
        slippage: 9.38,
        netPnl: -529.66,
        rMultiple: -1.0,
        exitReason: "STOP_LOSS",
        marketRegime: "BREAKOUT / EXPANSION",
        signalConditionsSnapshot: { bandwidth: true, breakout: true, volume: true },
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 0.5).toISOString(),
      },
      {
        journalId: "JOURNAL-PAPER-demo-03",
        executionEnvironment: "PAPER",
        strategyId: "crypto-strat-21",
        strategyNumber: "21",
        strategyName: "Relative Volume Breakout",
        strategyVersion: "1.0.0",
        instrument: "SOLUSDT",
        direction: "LONG",
        status: "OPEN",
        signalTime: new Date(Date.now() - 3600000 * 4).toISOString(),
        entryTime: new Date(Date.now() - 3600000 * 4).toISOString(),
        entryPrice: 152.0,
        stopPrice: 146.0,
        targetPrice: 164.0,
        positionSizeUnits: 83.3333,
        notionalValue: 12666,
        leverage: 1,
        riskPct: 0.5,
        maxLossAmount: 500,
        grossPnl: 185.0,
        fees: 12.66,
        funding: 0.5,
        slippage: 6.33,
        netPnl: 165.51,
        rMultiple: 0.37,
        marketRegime: "BREAKOUT / EXPANSION",
        signalConditionsSnapshot: { rvol: true, range_break: true, body_solid: true },
        createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const st of samplePaperTrades) {
      this.journalRecords.push(st as JournalTradeRecord);
    }
  }
}

export const paperTradingEngine = new PaperTradingEngine();
