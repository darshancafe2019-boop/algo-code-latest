/**
 * Read-Only Market Analysis Tools & Function Definitions
 * =======================================================
 * STRICT SAFETY INVARIANT: Exposes ONLY read-only data lookup functions.
 * NEVER contains order placement, cancellation, leverage, risk override, or bot start/stop tools.
 */

export const READONLY_MARKET_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "get_market_quote",
      description: "Retrieves the current verified bid, ask, last price, and 24h change for an instrument.",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string", description: "Trading pair or ticker, e.g. BTC/USDT, NIFTY, or RELIANCE" },
          exchange: { type: "string", description: "Exchange or data provider, e.g. binance, nse, ccxt" },
        },
        required: ["symbol"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_ohlcv",
      description: "Retrieves compact OHLCV summary statistics for requested timeframes.",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string", description: "Instrument symbol" },
          timeframe: { type: "string", description: "Interval: 1m, 5m, 15m, 1h, 4h, 1d" },
          limit: { type: "number", description: "Number of bars to evaluate locally" },
        },
        required: ["symbol", "timeframe"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_indicator_snapshot",
      description: "Retrieves calculated mathematical indicators (EMA 9/20/50/200, RSI, MACD, ATR, VWAP, ADX).",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string", description: "Instrument symbol" },
          timeframe: { type: "string", description: "Timeframe for indicator calculation" },
        },
        required: ["symbol", "timeframe"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_market_structure",
      description: "Retrieves swing highs/lows, BOS, CHoCH, and trend phase from the deterministic engine.",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string", description: "Instrument symbol" },
        },
        required: ["symbol"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_support_resistance",
      description: "Retrieves key pivot support and resistance price levels.",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string", description: "Instrument symbol" },
        },
        required: ["symbol"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_volume_metrics",
      description: "Retrieves volume profile (POC, VAH, VAL), relative volume, and volume moving averages.",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string", description: "Instrument symbol" },
        },
        required: ["symbol"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_futures_metrics",
      description: "Retrieves Open Interest, OI change, funding rate, and futures basis when available.",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string", description: "Futures symbol or underlying" },
        },
        required: ["symbol"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_options_chain",
      description: "Retrieves summarized option-chain metrics (PCR, ATM IV, Max Pain, Call/Put OI distribution).",
      parameters: {
        type: "object",
        properties: {
          underlying: { type: "string", description: "Underlying symbol, e.g. NIFTY, BTC, or AAPL" },
          expiry: { type: "string", description: "Optional specific expiry date" },
        },
        required: ["underlying"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_account_risk_snapshot",
      description: "Retrieves normalized pre-trade risk engine state and gate pass/fail counters (NO credentials).",
      parameters: {
        type: "object",
        properties: {
          botId: { type: "string", description: "Bot instance identifier" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_position_snapshot",
      description: "Retrieves read-only open position status, entry price, and unrealized P&L.",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string", description: "Symbol of the active position" },
        },
        required: ["symbol"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_macro_context",
      description: "Retrieves relevant macroeconomic benchmark states (DXY, VIX, US 10Y Yield, Major Indices).",
      parameters: {
        type: "object",
        properties: {
          assetClass: { type: "string", description: "Asset class context: crypto, equity, forex, commodity" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_why_no_trade_explanation",
      description: "Retrieves deterministic strategy evaluation status and exact failed conditions.",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string", description: "Symbol being evaluated by the strategy engine" },
        },
        required: ["symbol"],
      },
    },
  },
];
