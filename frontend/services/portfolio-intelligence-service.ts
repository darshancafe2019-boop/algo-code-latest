import {
  BrokerPortfolio,
  BoardPortfolio,
  MultiDimAllocation,
  MarketTickerItem,
  PortfolioHeroData,
  BarChartItem,
  TimeframeFilter,
} from "@/types/portfolio-intelligence";

export const INITIAL_HERO_DATA: PortfolioHeroData = {
  totalValue: 824170,
  dayChangeAmount: 18450,
  dayChangePercent: 2.31,
  invested: 800000,
  available: 565000,
  usedMargin: 235000,
  realizedPnl: 14170,
  winRate: 68,
  unrealizedPnl: 4280,
  openPositionsCount: 3,
  dayPnl: 6520,
  dayPnlPercent: 2.31,
  maxDrawdown: -3250,
  maxDrawdownPercent: -0.71,
  marginUtilization: 29.4,
};

export const INITIAL_MARKET_TICKERS: MarketTickerItem[] = [
  { symbol: "NIFTY", price: "₹24,987.50", change: "+104.20", changePct: 0.42, isPositive: true, category: "India" },
  { symbol: "BANKNIFTY", price: "₹52,341.20", change: "+352.80", changePct: 0.68, isPositive: true, category: "India" },
  { symbol: "SENSEX", price: "₹81,234.17", change: "+308.12", changePct: 0.38, isPositive: true, category: "India" },
  { symbol: "INDIA VIX", price: "13.62", change: "-0.30", changePct: -2.15, isPositive: false, category: "India" },
  { symbol: "BTCUSDT", price: "115,430.20", change: "-242.80", changePct: -0.21, isPositive: false, category: "Crypto" },
  { symbol: "ETHUSDT", price: "4,238.50", change: "+46.90", changePct: 1.12, isPositive: true, category: "Crypto" },
  { symbol: "RELIANCE", price: "2,892.40", change: "+22.60", changePct: 0.79, isPositive: true, category: "India" },
  { symbol: "AAPL", price: "225.31", change: "+2.76", changePct: 1.24, isPositive: true, category: "US" },
  { symbol: "NVDA", price: "128.90", change: "+3.45", changePct: 2.75, isPositive: true, category: "US" },
  { symbol: "GOLD/MCX", price: "₹74,850.00", change: "+210.00", changePct: 0.28, isPositive: true, category: "Global" },
  { symbol: "CRUDEOIL", price: "₹6,140.00", change: "-34.00", changePct: -0.55, isPositive: false, category: "Global" },
];

export const INITIAL_BROKERS: BrokerPortfolio[] = [
  {
    id: "dhan",
    name: "DHAN",
    logo: "dhan",
    status: "Connected",
    allocatedValue: 235000,
    allocatedPercentage: 28.5,
    positionsCount: 12,
    openPositionsCount: 8,
    pnl: 7450,
    segments: [
      { name: "Options", value: 40, percentage: 40, color: "#16C6F4" },
      { name: "Equity", value: 35, percentage: 35, color: "#00E890" },
      { name: "Futures", value: 15, percentage: 15, color: "#8B5CF6" },
      { name: "Currency", value: 5, percentage: 5, color: "#F59E0B" },
      { name: "Commodities", value: 3, percentage: 3, color: "#EC4899" },
      { name: "Others", value: 2, percentage: 2, color: "#64748B" },
    ],
  },
  {
    id: "upstox",
    name: "UPSTOX",
    logo: "upstox",
    status: "Connected",
    allocatedValue: 185000,
    allocatedPercentage: 22.4,
    positionsCount: 9,
    openPositionsCount: 5,
    pnl: 5820,
    segments: [
      { name: "Equity", value: 40, percentage: 40, color: "#00E890" },
      { name: "Options", value: 30, percentage: 30, color: "#16C6F4" },
      { name: "Futures", value: 20, percentage: 20, color: "#8B5CF6" },
      { name: "Commodities", value: 10, percentage: 10, color: "#EC4899" },
    ],
  },
  {
    id: "angel_one",
    name: "ANGEL ONE",
    logo: "angel",
    status: "Connected",
    allocatedValue: 145000,
    allocatedPercentage: 17.6,
    positionsCount: 7,
    openPositionsCount: 4,
    pnl: 3650,
    segments: [
      { name: "Equity", value: 50, percentage: 50, color: "#00E890" },
      { name: "Options", value: 25, percentage: 25, color: "#16C6F4" },
      { name: "Futures", value: 15, percentage: 15, color: "#8B5CF6" },
      { name: "Currency", value: 10, percentage: 10, color: "#F59E0B" },
    ],
  },
  {
    id: "delta_exchange",
    name: "DELTA EXCHANGE",
    logo: "delta",
    status: "Connected",
    allocatedValue: 135000,
    allocatedPercentage: 16.4,
    positionsCount: 6,
    openPositionsCount: 4,
    pnl: 1980,
    segments: [
      { name: "BTC Futures", value: 50, percentage: 50, color: "#F59E0B" },
      { name: "ETH Options", value: 30, percentage: 30, color: "#16C6F4" },
      { name: "Altcoins", value: 20, percentage: 20, color: "#8B5CF6" },
    ],
  },
  {
    id: "binance",
    name: "BINANCE",
    logo: "binance",
    status: "Connected",
    allocatedValue: 124170,
    allocatedPercentage: 15.1,
    positionsCount: 8,
    openPositionsCount: 5,
    pnl: -1450,
    segments: [
      { name: "Spot", value: 45, percentage: 45, color: "#00E890" },
      { name: "USD-M Futures", value: 35, percentage: 35, color: "#F59E0B" },
      { name: "Coin-M", value: 20, percentage: 20, color: "#EC4899" },
    ],
  },
];

export const INITIAL_BOARDS: BoardPortfolio[] = [
  {
    id: "nse_cash",
    name: "NSE Cash",
    code: "NSE-EQ",
    iconName: "TrendingUp",
    allocatedValue: 245000,
    allocatedPercentage: 29.7,
    itemCount: 28,
    itemLabel: "Symbols",
    pnl: 8120,
    segments: [
      { name: "Large Cap", value: 45, percentage: 45, color: "#16C6F4" },
      { name: "Mid Cap", value: 25, percentage: 25, color: "#00E890" },
      { name: "Small Cap", value: 20, percentage: 20, color: "#8B5CF6" },
      { name: "Sectoral", value: 8, percentage: 8, color: "#F59E0B" },
      { name: "Others", value: 2, percentage: 2, color: "#64748B" },
    ],
  },
  {
    id: "nse_fno",
    name: "NSE F&O",
    code: "NSE-DERIV",
    iconName: "Zap",
    allocatedValue: 285000,
    allocatedPercentage: 34.6,
    itemCount: 19,
    itemLabel: "Contracts",
    pnl: 12450,
    segments: [
      { name: "Index Futures", value: 38, percentage: 38, color: "#16C6F4" },
      { name: "Index Options", value: 32, percentage: 32, color: "#00E890" },
      { name: "Stock Futures", value: 18, percentage: 18, color: "#8B5CF6" },
      { name: "Stock Options", value: 10, percentage: 10, color: "#F59E0B" },
      { name: "Others", value: 2, percentage: 2, color: "#64748B" },
    ],
  },
  {
    id: "bse",
    name: "BSE",
    code: "BSE-MAIN",
    iconName: "Building2",
    allocatedValue: 95000,
    allocatedPercentage: 11.5,
    itemCount: 14,
    itemLabel: "Symbols",
    pnl: 1250,
    segments: [
      { name: "Equity", value: 65, percentage: 65, color: "#00E890" },
      { name: "F&O", value: 15, percentage: 15, color: "#16C6F4" },
      { name: "Currency", value: 12, percentage: 12, color: "#F59E0B" },
      { name: "Others", value: 8, percentage: 8, color: "#64748B" },
    ],
  },
  {
    id: "mcx",
    name: "MCX",
    code: "MCX-COMM",
    iconName: "Coins",
    allocatedValue: 64170,
    allocatedPercentage: 7.8,
    itemCount: 6,
    itemLabel: "Lots",
    pnl: -320,
    segments: [
      { name: "Crude Oil", value: 40, percentage: 40, color: "#F59E0B" },
      { name: "Gold", value: 30, percentage: 30, color: "#EAB308" },
      { name: "Silver", value: 20, percentage: 20, color: "#94A3B8" },
      { name: "Natural Gas", value: 10, percentage: 10, color: "#16C6F4" },
    ],
  },
  {
    id: "crypto_global",
    name: "Crypto (Global)",
    code: "CRYPTO-G",
    iconName: "Globe",
    allocatedValue: 135000,
    allocatedPercentage: 16.4,
    itemCount: 11,
    itemLabel: "Assets",
    pnl: 4950,
    segments: [
      { name: "BTC", value: 48, percentage: 48, color: "#F59E0B" },
      { name: "ETH", value: 32, percentage: 32, color: "#16C6F4" },
      { name: "Altcoins", value: 15, percentage: 15, color: "#8B5CF6" },
      { name: "Stablecoins", value: 5, percentage: 5, color: "#00E890" },
    ],
  },
];

export const INITIAL_MULTI_DIMENSIONAL: MultiDimAllocation[] = [
  {
    id: "asset_class",
    title: "Asset Class",
    centerValue: "₹ 8,24,170",
    centerSubtitle: "100%",
    segments: [
      { name: "Equity", value: 42, percentage: 42, color: "#00E890" },
      { name: "Options", value: 28, percentage: 28, color: "#16C6F4" },
      { name: "Futures", value: 18, percentage: 18, color: "#8B5CF6" },
      { name: "Crypto", value: 8, percentage: 8, color: "#F59E0B" },
      { name: "Currency", value: 3, percentage: 3, color: "#EC4899" },
      { name: "Commodities", value: 1, percentage: 1, color: "#06B6D4" },
    ],
  },
  {
    id: "strategy_wise",
    title: "Strategy Wise",
    centerValue: "₹ 8,24,170",
    centerSubtitle: "100%",
    segments: [
      { name: "Momentum", value: 32, percentage: 32, color: "#16C6F4" },
      { name: "Breakout", value: 24, percentage: 24, color: "#00E890" },
      { name: "Mean Reversion", value: 18, percentage: 18, color: "#8B5CF6" },
      { name: "Options Premium", value: 15, percentage: 15, color: "#F59E0B" },
      { name: "Swing", value: 7, percentage: 7, color: "#EC4899" },
      { name: "Scalping", value: 4, percentage: 4, color: "#06B6D4" },
    ],
  },
  {
    id: "sector_allocation",
    title: "Sector Allocation",
    centerValue: "₹ 8,24,170",
    centerSubtitle: "100%",
    segments: [
      { name: "IT", value: 28, percentage: 28, color: "#16C6F4" },
      { name: "Banking", value: 24, percentage: 24, color: "#00E890" },
      { name: "Finance", value: 16, percentage: 16, color: "#8B5CF6" },
      { name: "Energy", value: 12, percentage: 12, color: "#F59E0B" },
      { name: "Auto", value: 10, percentage: 10, color: "#EC4899" },
      { name: "FMCG", value: 8, percentage: 8, color: "#06B6D4" },
      { name: "Others", value: 12, percentage: 12, color: "#64748B" },
    ],
  },
  {
    id: "expiry_wise",
    title: "Expiry Wise (Options)",
    centerValue: "₹ 8,24,170",
    centerSubtitle: "100%",
    segments: [
      { name: "Current Week", value: 35, percentage: 35, color: "#16C6F4" },
      { name: "Next Week", value: 28, percentage: 28, color: "#00E890" },
      { name: "Monthly", value: 20, percentage: 20, color: "#8B5CF6" },
      { name: "Quarterly", value: 12, percentage: 12, color: "#F59E0B" },
      { name: "Others", value: 5, percentage: 5, color: "#64748B" },
    ],
  },
  {
    id: "risk_allocation",
    title: "Risk Allocation",
    centerValue: "₹ 2,35,000",
    centerSubtitle: "Used Margin",
    segments: [
      { name: "Low Risk", value: 40, percentage: 40, color: "#00E890" },
      { name: "Medium Risk", value: 35, percentage: 35, color: "#F59E0B" },
      { name: "High Risk", value: 20, percentage: 20, color: "#FF3B5C" },
      { name: "Hedged", value: 5, percentage: 5, color: "#16C6F4" },
    ],
  },
];

export const INITIAL_BOTTOM_ANALYTICS = {
  pnlBreakdown: {
    title: "P&L Breakdown",
    centerValue: "₹18,450",
    centerSubtitle: "Total P&L",
    segments: [
      { name: "Equity", value: 8120, percentage: 44, color: "#00E890", pnl: 8120 },
      { name: "Options", value: 6450, percentage: 35, color: "#16C6F4", pnl: 6450 },
      { name: "Futures", value: 3280, percentage: 18, color: "#8B5CF6", pnl: 3280 },
      { name: "Crypto", value: 1950, percentage: 11, color: "#F59E0B", pnl: 1950 },
      { name: "Currency", value: 450, percentage: 2, color: "#FF3B5C", pnl: -450 },
      { name: "Commodities", value: 320, percentage: 2, color: "#EC4899", pnl: -320 },
    ],
  },
  capitalDeployment: {
    title: "Capital Deployment",
    centerValue: "₹8,00,000",
    centerSubtitle: "Total Capital",
    segments: [
      { name: "Deployed", value: 70, percentage: 70, color: "#16C6F4" },
      { name: "Available", value: 30, percentage: 30, color: "#00E890" },
    ],
  },
  brokerWisePnl: [
    { label: "Dhan", value: 7450, formattedValue: "+₹7,450", isPositive: true, percentage: 80 },
    { label: "Upstox", value: 5820, formattedValue: "+₹5,820", isPositive: true, percentage: 62 },
    { label: "Angel One", value: 3650, formattedValue: "+₹3,650", isPositive: true, percentage: 39 },
    { label: "Delta Exchange", value: 1980, formattedValue: "+₹1,980", isPositive: true, percentage: 21 },
    { label: "Binance", value: -1450, formattedValue: "-₹1,450", isPositive: false, percentage: 15 },
  ] as BarChartItem[],
  boardWisePnl: [
    { label: "NSE F&O", value: 12450, formattedValue: "+₹12,450", isPositive: true, percentage: 95 },
    { label: "NSE Cash", value: 8120, formattedValue: "+₹8,120", isPositive: true, percentage: 62 },
    { label: "BSE", value: 1250, formattedValue: "+₹1,250", isPositive: true, percentage: 10 },
    { label: "MCX", value: -320, formattedValue: "-₹320", isPositive: false, percentage: 3 },
    { label: "Crypto", value: 4950, formattedValue: "+₹4,950", isPositive: true, percentage: 38 },
  ] as BarChartItem[],
  dailyPerformance: {
    title: "Daily Performance",
    centerValue: "₹6,520",
    centerSubtitle: "Day P&L",
    segments: [
      { name: "Winning", value: 68, percentage: 68, color: "#00E890" },
      { name: "Breakeven", value: 22, percentage: 22, color: "#16C6F4" },
      { name: "Losing", value: 10, percentage: 10, color: "#FF3B5C" },
    ],
  },
};

export function getScaledHeroData(filter: TimeframeFilter): PortfolioHeroData {
  switch (filter) {
    case "1W":
      return {
        ...INITIAL_HERO_DATA,
        dayChangeAmount: 42100,
        dayChangePercent: 5.4,
        dayPnl: 42100,
        dayPnlPercent: 5.4,
        winRate: 71,
      };
    case "1M":
      return {
        ...INITIAL_HERO_DATA,
        dayChangeAmount: 112400,
        dayChangePercent: 15.8,
        dayPnl: 112400,
        dayPnlPercent: 15.8,
        winRate: 74,
      };
    case "3M":
      return {
        ...INITIAL_HERO_DATA,
        dayChangeAmount: 248900,
        dayChangePercent: 43.2,
        dayPnl: 248900,
        dayPnlPercent: 43.2,
        winRate: 69,
      };
    case "1Y":
      return {
        ...INITIAL_HERO_DATA,
        dayChangeAmount: 512000,
        dayChangePercent: 164.5,
        dayPnl: 512000,
        dayPnlPercent: 164.5,
        winRate: 72,
      };
    case "ALL":
      return {
        ...INITIAL_HERO_DATA,
        dayChangeAmount: 624170,
        dayChangePercent: 312.1,
        dayPnl: 624170,
        dayPnlPercent: 312.1,
        winRate: 70,
      };
    case "1D":
    default:
      return INITIAL_HERO_DATA;
  }
}
