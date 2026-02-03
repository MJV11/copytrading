export interface Trade {
  id: string;
  timestamp: Date;
  traderAddress: string;
  marketId: string;
  marketQuestion: string;
  outcomeId: string;
  side: 'BUY' | 'SELL';
  shares: number;
  price: number;
  totalCost: number;
  fee: number;
  transactionHash?: string;
  source: 'api' | 'blockchain';
  metadata?: TradeMetadata;
}

export interface TradeMetadata {
  // Scaling metadata
  originalTradeId?: string;
  targetTradePercent?: number;
  targetTraderBalance?: number;
  ourPortfolioValue?: number;
  scalingRatio?: number;
  
  // Slippage metadata
  targetPrice?: number;
  ourAveragePrice?: number;
  priceImpact?: number;
  slippageCost?: number;
  fills?: Fill[];
}

export interface Fill {
  price: number;
  shares: number;
  cost: number;
}

export function createTradeId(): string {
  return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
