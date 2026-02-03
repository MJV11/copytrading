export interface OrderBook {
  marketId: string;
  outcomeId: string;
  timestamp: Date;
  bids: OrderLevel[];
  asks: OrderLevel[];
  spread: number;
}

export interface OrderLevel {
  price: number;
  size: number;
  cumulativeSize: number;
}

export interface SlippageResult {
  requestedShares: number;
  executedShares: number;
  averagePrice: number;
  priceImpact: number;
  totalCost: number;
  fills: Fill[];
}

export interface Fill {
  price: number;
  shares: number;
  cost: number;
}

export interface TraderBalanceSnapshot {
  timestamp: Date;
  address: string;
  totalBalance: number;
  availableCash: number;
  positionsValue: number;
  source: 'api' | 'calculated';
}

export function getMidPrice(orderBook: OrderBook): number {
  if (orderBook.asks.length === 0 || orderBook.bids.length === 0) {
    throw new Error('Order book is empty');
  }
  
  const bestAsk = orderBook.asks[0].price;
  const bestBid = orderBook.bids[0].price;
  
  return (bestAsk + bestBid) / 2;
}

export function getSpread(orderBook: OrderBook): number {
  if (orderBook.asks.length === 0 || orderBook.bids.length === 0) {
    return 0;
  }
  
  return orderBook.asks[0].price - orderBook.bids[0].price;
}

export function getTotalDepth(levels: OrderLevel[], numLevels: number = 10): number {
  return levels
    .slice(0, numLevels)
    .reduce((sum, level) => sum + level.size, 0);
}
