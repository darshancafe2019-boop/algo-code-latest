/**
 * Broker Adapter Layer & Paper Broker Simulation
 * ===============================================
 * Abstract interface for broker order execution, multi-leg fills,
 * account margin queries, and paper trading execution.
 */

import {
  TradeProposal,
  ActiveOptionPosition,
  ExecutionMode,
} from "../strategies/base/StrategyTypes";

export interface BrokerAccount {
  balance: number;
  availableMargin: number;
  currency: string;
  equity: number;
  unrealizedPnl: number;
}

export interface MultiLegOrderResult {
  orderId: string;
  proposalId: string;
  status: "FILLED" | "REJECTED" | "PARTIAL";
  executionMode: ExecutionMode;
  filledNetPrice: number;
  slippage: number;
  feeAmount: number;
  filledAt: string;
  legsFilled: Array<{
    symbol: string;
    action: "BUY" | "SELL";
    strike: number;
    fillPrice: number;
    quantity: number;
  }>;
}

export interface BrokerAdapter {
  connect(): Promise<void>;
  getAccount(): Promise<BrokerAccount>;
  placeMultiLegOrder(proposal: TradeProposal): Promise<MultiLegOrderResult>;
  cancelOrder(orderId: string): Promise<boolean>;
  closeMultiLegPosition(position: ActiveOptionPosition): Promise<{ status: "CLOSED"; realizedPnl: number }>;
}

export class PaperBrokerAdapter implements BrokerAdapter {
  private balance: number = 100000.0;
  private usedMargin: number = 0.0;
  private currency: string = "USD";

  constructor(initialBalance: number = 100000.0) {
    this.balance = initialBalance;
  }

  public async connect(): Promise<void> {
    // Simulated paper connection
    return Promise.resolve();
  }

  public async getAccount(): Promise<BrokerAccount> {
    return {
      balance: this.balance,
      availableMargin: Math.max(0, this.balance - this.usedMargin),
      currency: this.currency,
      equity: this.balance,
      unrealizedPnl: 0,
    };
  }

  public async placeMultiLegOrder(proposal: TradeProposal): Promise<MultiLegOrderResult> {
    // Simulate atomic multi-leg fill with realistic 0.15% slippage and $1/contract fee
    const slippagePct = 0.0015;
    const slippageMultiplier = proposal.isCredit ? 1 - slippagePct : 1 + slippagePct;
    const filledNetPrice = Math.round(proposal.netDebitOrCredit * slippageMultiplier * 100) / 100;
    const feeAmount = proposal.legs.length * 1.0; // $1 per leg fee

    // Update internal paper margin
    this.usedMargin += proposal.requiredMargin;

    const legsFilled = proposal.legs.map((l) => ({
      symbol: l.symbol,
      action: l.side,
      strike: l.strike,
      fillPrice: l.premium,
      quantity: l.quantity,
    }));

    return {
      orderId: `paper-ord-${Date.now()}`,
      proposalId: proposal.proposalId,
      status: "FILLED",
      executionMode: "PAPER",
      filledNetPrice,
      slippage: Math.round(Math.abs(filledNetPrice - proposal.netDebitOrCredit) * 100) / 100,
      feeAmount,
      filledAt: new Date().toISOString(),
      legsFilled,
    };
  }

  public async cancelOrder(orderId: string): Promise<boolean> {
    return true;
  }

  public async closeMultiLegPosition(
    position: ActiveOptionPosition
  ): Promise<{ status: "CLOSED"; realizedPnl: number }> {
    const realized = position.unrealizedPnl;
    this.balance += realized;
    this.usedMargin = Math.max(0, this.usedMargin - Math.abs(position.entryNetCost));

    return {
      status: "CLOSED",
      realizedPnl: realized,
    };
  }
}

export const defaultPaperBroker = new PaperBrokerAdapter(100000.0);
