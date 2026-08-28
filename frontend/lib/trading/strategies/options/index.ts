/**
 * Options Strategy Suite Registration
 * ====================================
 * Instantiates and registers all 24 standard option strategies
 * from the Complete Option Strategies Visual Learning Guide
 * with the central StrategyRegistry.
 */

import { StrategyRegistry } from "../base/StrategyRegistry";
import { LongCallStrategy } from "./LongCallStrategy";
import { LongPutStrategy } from "./LongPutStrategy";
import { ShortCallStrategy } from "./ShortCallStrategy";
import { ShortPutStrategy } from "./ShortPutStrategy";
import { CashSecuredPutStrategy } from "./CashSecuredPutStrategy";
import { BullCallSpreadStrategy } from "./BullCallSpreadStrategy";
import { BearPutSpreadStrategy } from "./BearPutSpreadStrategy";
import { BullPutSpreadStrategy } from "./BullPutSpreadStrategy";
import { BearCallSpreadStrategy } from "./BearCallSpreadStrategy";
import { IronCondorStrategy } from "./IronCondorStrategy";
import { RatioStrategy } from "./RatioStrategy";
import { BackspreadStrategy } from "./BackspreadStrategy";
import { LongStraddleStrategy } from "./LongStraddleStrategy";
import { LongStrangleStrategy } from "./LongStrangleStrategy";
import { ShortStraddleStrategy } from "./ShortStraddleStrategy";
import { ShortStrangleStrategy } from "./ShortStrangleStrategy";
import { ButterflyStrategy } from "./ButterflyStrategy";
import { CondorStrategy } from "./CondorStrategy";
import { CalendarStrategy } from "./CalendarStrategy";
import { DiagonalStrategy } from "./DiagonalStrategy";
import { CoveredCallStrategy } from "./CoveredCallStrategy";
import { LongCombinationStrategy } from "./LongCombinationStrategy";
import { CollarStrategy } from "./CollarStrategy";
import { CoveredCombinationStrategy } from "./CoveredCombinationStrategy";

export function initializeStrategySuite(): void {
  // 1. Single Leg (Directional & Income)
  StrategyRegistry.register(new LongCallStrategy());
  StrategyRegistry.register(new LongPutStrategy());
  StrategyRegistry.register(new ShortCallStrategy());
  StrategyRegistry.register(new ShortPutStrategy());
  StrategyRegistry.register(new CashSecuredPutStrategy());

  // 2. Vertical Spreads (Debit & Credit)
  StrategyRegistry.register(new BullCallSpreadStrategy());
  StrategyRegistry.register(new BearPutSpreadStrategy());
  StrategyRegistry.register(new BullPutSpreadStrategy());
  StrategyRegistry.register(new BearCallSpreadStrategy());

  // 3. Volatility & Breakouts
  StrategyRegistry.register(new LongStraddleStrategy());
  StrategyRegistry.register(new LongStrangleStrategy());
  StrategyRegistry.register(new ShortStraddleStrategy());
  StrategyRegistry.register(new ShortStrangleStrategy());

  // 4. Ratios & Backspreads
  StrategyRegistry.register(new RatioStrategy());
  StrategyRegistry.register(new BackspreadStrategy());

  // 5. Neutral & Range Pinning (Winged Spreads)
  StrategyRegistry.register(new IronCondorStrategy());
  StrategyRegistry.register(new ButterflyStrategy());
  StrategyRegistry.register(new CondorStrategy());

  // 6. Time Decay & Calendar Spreads
  StrategyRegistry.register(new CalendarStrategy());
  StrategyRegistry.register(new DiagonalStrategy());

  // 7. Covered & Combinations (Underlying Integrated)
  StrategyRegistry.register(new CoveredCallStrategy());
  StrategyRegistry.register(new LongCombinationStrategy());
  StrategyRegistry.register(new CollarStrategy());
  StrategyRegistry.register(new CoveredCombinationStrategy());
}

// Auto-initialize when module is loaded
initializeStrategySuite();

export {
  LongCallStrategy,
  LongPutStrategy,
  ShortCallStrategy,
  ShortPutStrategy,
  CashSecuredPutStrategy,
  BullCallSpreadStrategy,
  BearPutSpreadStrategy,
  BullPutSpreadStrategy,
  BearCallSpreadStrategy,
  IronCondorStrategy,
  RatioStrategy,
  BackspreadStrategy,
  LongStraddleStrategy,
  LongStrangleStrategy,
  ShortStraddleStrategy,
  ShortStrangleStrategy,
  ButterflyStrategy,
  CondorStrategy,
  CalendarStrategy,
  DiagonalStrategy,
  CoveredCallStrategy,
  LongCombinationStrategy,
  CollarStrategy,
  CoveredCombinationStrategy,
};
