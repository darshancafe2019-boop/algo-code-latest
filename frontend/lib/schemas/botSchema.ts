import { z } from "zod";

export const CreateBotSchema = z.object({
  name: z.string().min(2, "Bot name must have at least 2 characters").max(50),
  symbol: z.string().min(3, "Symbol is required").toUpperCase(),
  timeframe: z.enum(["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"]),
  strategy_name: z.string().min(1, "Strategy is required"),
  trading_mode: z.enum(["PAPER", "LIVE"]),
  allocated_capital: z.number().positive("Capital must be greater than 0").max(10000000),
  max_position_size: z.number().positive("Max position size must be > 0"),
  max_daily_loss: z.number().positive("Daily loss limit must be > 0"),
  stop_loss_pct: z.number().min(0.1).max(50),
  take_profit_pct: z.number().min(0.1).max(200),
  allow_shorts: z.boolean(),
  confluence_threshold: z.number().min(50).max(100),
});

export type CreateBotInput = z.infer<typeof CreateBotSchema>;

export const QuickOrderSchema = z.object({
  symbol: z.string().min(3).toUpperCase(),
  side: z.enum(["BUY", "SELL"]),
  order_type: z.enum(["MARKET", "LIMIT", "STOP_LIMIT"]),
  quantity: z.number().positive("Quantity must be greater than 0"),
  trading_mode: z.enum(["PAPER", "LIVE"]),
  price: z.number().positive().optional(),
  stop_loss: z.number().positive().optional(),
  take_profit: z.number().positive().optional(),
  notes: z.string().max(200).optional(),
});

export type QuickOrderInput = z.infer<typeof QuickOrderSchema>;

export const RiskLimitsSchema = z.object({
  max_daily_loss: z.number().positive(),
  max_portfolio_risk_pct: z.number().min(0.5).max(100),
  max_open_positions: z.number().int().min(1).max(50),
  confluence_gate_pct: z.number().min(50).max(100),
  drawdown_lock_pct: z.number().min(1).max(50),
  require_2fa_live_orders: z.boolean(),
});

export type RiskLimitsInput = z.infer<typeof RiskLimitsSchema>;
