/**
 * Central Strategy Registry
 * =========================
 * Manages runtime registration, dynamic activation, execution,
 * parameter tuning, and market condition filtering for all options strategies.
 */

import {
  TradingStrategy,
  MarketContext,
  StrategyAnalysis,
  StrategySignal,
  TradeProposal,
  StrategyConfig,
} from "./StrategyTypes";

export interface StrategyRegistryEntry {
  strategy: TradingStrategy;
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  paused: boolean;
  lastAnalysis?: StrategyAnalysis;
  lastProposal?: TradeProposal;
  lastRunTime?: string;
  totalProposalsGenerated: number;
}

export class StrategyRegistryManager {
  private static instance: StrategyRegistryManager;
  private strategies: Map<string, StrategyRegistryEntry> = new Map();

  private constructor() {}

  public static getInstance(): StrategyRegistryManager {
    if (!StrategyRegistryManager.instance) {
      StrategyRegistryManager.instance = new StrategyRegistryManager();
    }
    return StrategyRegistryManager.instance;
  }

  /**
   * Register a new strategy into the central registry.
   */
  public register(strategy: TradingStrategy): void {
    if (this.strategies.has(strategy.id)) {
      // Preserve existing runtime state
      const existing = this.strategies.get(strategy.id)!;
      this.strategies.set(strategy.id, {
        ...existing,
        strategy,
        name: strategy.name,
        description: strategy.description,
      });
      return;
    }

    this.strategies.set(strategy.id, {
      strategy,
      id: strategy.id,
      name: strategy.name,
      description: strategy.description,
      enabled: strategy.config.enabled ?? true,
      paused: false,
      totalProposalsGenerated: 0,
    });
  }

  public getStrategy(id: string): TradingStrategy | undefined {
    return this.strategies.get(id)?.strategy;
  }

  public getEntry(id: string): StrategyRegistryEntry | undefined {
    return this.strategies.get(id);
  }

  public getAllStrategies(): StrategyRegistryEntry[] {
    return Array.from(this.strategies.values());
  }

  public getEnabledStrategies(): StrategyRegistryEntry[] {
    return Array.from(this.strategies.values()).filter((e) => e.enabled && !e.paused);
  }

  public enableStrategy(id: string): boolean {
    const entry = this.strategies.get(id);
    if (!entry) return false;
    entry.enabled = true;
    entry.paused = false;
    entry.strategy.updateConfig({ enabled: true });
    return true;
  }

  public disableStrategy(id: string): boolean {
    const entry = this.strategies.get(id);
    if (!entry) return false;
    entry.enabled = false;
    entry.strategy.updateConfig({ enabled: false });
    return true;
  }

  public pauseStrategy(id: string): boolean {
    const entry = this.strategies.get(id);
    if (!entry) return false;
    entry.paused = true;
    return true;
  }

  public resumeStrategy(id: string): boolean {
    const entry = this.strategies.get(id);
    if (!entry) return false;
    entry.paused = false;
    entry.enabled = true;
    entry.strategy.updateConfig({ enabled: true });
    return true;
  }

  public updateStrategyConfig(id: string, newConfig: Partial<StrategyConfig>): boolean {
    const entry = this.strategies.get(id);
    if (!entry) return false;
    entry.strategy.updateConfig(newConfig);
    if (newConfig.enabled !== undefined) {
      entry.enabled = newConfig.enabled;
    }
    return true;
  }

  /**
   * Run market analysis for a single strategy.
   */
  public async runStrategyAnalysis(
    id: string,
    context: MarketContext
  ): Promise<StrategyAnalysis | null> {
    const entry = this.strategies.get(id);
    if (!entry) return null;

    try {
      const analysis = await entry.strategy.analyze(context);
      entry.lastAnalysis = analysis;
      entry.lastRunTime = new Date().toISOString();
      if (analysis.proposal) {
        entry.lastProposal = analysis.proposal;
        entry.totalProposalsGenerated += 1;
      }
      return analysis;
    } catch (err: any) {
      console.error(`[StrategyRegistry] Error analyzing strategy ${id}:`, err);
      return {
        strategyId: id,
        strategyName: entry.name,
        marketMatch: false,
        suitabilityScore: 0,
        regime: "NEUTRAL",
        rationale: [`Analysis error: ${err.message}`],
      };
    }
  }

  /**
   * Run market analysis across all registered and enabled strategies.
   * Returns ranked strategy analyses by suitability score.
   */
  public async runAllEnabledStrategies(
    context: MarketContext
  ): Promise<StrategyAnalysis[]> {
    const enabled = this.getEnabledStrategies();
    const results: StrategyAnalysis[] = [];

    for (const entry of enabled) {
      try {
        const analysis = await entry.strategy.analyze(context);
        entry.lastAnalysis = analysis;
        entry.lastRunTime = new Date().toISOString();
        if (analysis.proposal) {
          entry.lastProposal = analysis.proposal;
          entry.totalProposalsGenerated += 1;
        }
        results.push(analysis);
      } catch (err) {
        console.error(`[StrategyRegistry] Failed analysis for ${entry.id}:`, err);
      }
    }

    // Sort descending by suitability score
    return results.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
  }

  /**
   * Filter strategies matching current market condition.
   */
  public getStrategiesForRegime(regime: string): StrategyRegistryEntry[] {
    return Array.from(this.strategies.values()).filter((e) => {
      const lastRegime = e.lastAnalysis?.regime;
      return lastRegime === regime || e.lastAnalysis?.marketMatch;
    });
  }
}

export const StrategyRegistry = StrategyRegistryManager.getInstance();
