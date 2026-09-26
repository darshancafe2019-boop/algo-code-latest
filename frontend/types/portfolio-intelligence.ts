export interface ChartSegment {
  name: string;
  value: number;
  percentage: number;
  color: string;
  pnl?: number;
  amount?: number;
}

export type ConnectionStatus = "Connected" | "Connecting" | "Disconnected" | "Error" | "Data Delayed" | "Not Configured";

export interface BrokerPortfolio {
  id: string;
  name: string;
  logo: string;
  status: ConnectionStatus;
  allocatedValue: number;
  allocatedPercentage: number;
  positionsCount: number;
  openPositionsCount: number;
  pnl: number;
  currency?: string;
  providerId?: string;
  statusMessage?: string;
  isConfigured?: boolean;
  segments: ChartSegment[];
}

export interface BoardPortfolio {
  id: string;
  name: string;
  code: string;
  iconName: string;
  allocatedValue: number;
  allocatedPercentage: number;
  itemCount: number;
  itemLabel: string;
  pnl: number;
  segments: ChartSegment[];
}

export interface MultiDimAllocation {
  id: string;
  title: string;
  centerValue: string;
  centerSubtitle: string;
  segments: ChartSegment[];
}

export interface PnLBreakdownItem {
  segment: string;
  pnl: number;
  color: string;
}

export interface BarChartItem {
  label: string;
  value: number;
  formattedValue: string;
  percentage?: number;
  isPositive: boolean;
}

export interface MarketTickerItem {
  symbol: string;
  price: string;
  change: string;
  changePct: number;
  isPositive: boolean;
  category: "India" | "US" | "Global" | "Crypto";
}

export interface PortfolioHeroData {
  totalValue: number;
  dayChangeAmount: number;
  dayChangePercent: number;
  invested: number;
  available: number;
  usedMargin: number;
  realizedPnl: number;
  winRate: number;
  unrealizedPnl: number;
  openPositionsCount: number;
  dayPnl: number;
  dayPnlPercent: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  marginUtilization: number;
}

export type TimeframeFilter = "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL";
export type MarketCategoryFilter = "India" | "US" | "Global" | "Crypto";
