export type TradeType = 'BUY' | 'SELL';
export type AccountType = 'GENERAL' | 'ISA' | 'PENSION' | 'IRP';

export interface HoldingItem {
  stockId: string;
  stockName: string;
  stockCode: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  evaluation: number;
  invested: number;
  unrealizedGain: number;
  unrealizedGainRate: number;
  weight: number;
}

export interface PortfolioSummary {
  totalEvaluation: number;
  totalInvested: number;
  totalUnrealizedGain: number;
  totalUnrealizedGainRate: number;
  totalRealizedGain: number;
}

export interface PerformanceItem {
  month: string;
  realizedGain: number;
  tradeCount: number;
}
