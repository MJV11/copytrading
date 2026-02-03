export interface Position {
  id: string;
  marketId: string;
  marketQuestion: string;
  outcomeId: string;
  shares: number;
  averageEntryPrice: number;
  totalInvested: number;
  currentPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
  isOpen: boolean;
  openedAt: Date;
  closedAt?: Date;
  updatedAt: Date;
}

export function createPositionId(marketId: string, outcomeId: string): string {
  return `pos_${marketId}_${outcomeId}`;
}

export function calculateUnrealizedPnL(position: Position): number {
  if (!position.isOpen || position.shares === 0) {
    return 0;
  }
  
  const currentValue = position.shares * position.currentPrice;
  const unrealizedPnL = currentValue - position.totalInvested;
  
  return unrealizedPnL;
}

export function calculatePositionValue(position: Position): number {
  return position.shares * position.currentPrice;
}
