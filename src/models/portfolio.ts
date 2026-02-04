import { Position, calculateUnrealizedPnL, calculatePositionValue } from './position.js';

export interface Portfolio {
  id: string;
  timestamp: Date;
  totalInvested: number;
  totalValue: number;
  availableCash: number;
  totalPnL: number;
  totalPnLPercent: number;
  positions: Position[];
  closedPositionsCount: number;
  winRate: number;
}

export function createPortfolio(initialCapital: number): Portfolio {
  return {
    id: generatePortfolioSnapshotId(),
    timestamp: new Date(),
    totalInvested: initialCapital,
    totalValue: initialCapital,
    availableCash: initialCapital,
    totalPnL: 0,
    totalPnLPercent: 0,
    positions: [],
    closedPositionsCount: 0,
    winRate: 0,
  };
}

function generatePortfolioSnapshotId(): string {
  return `portfolio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function updatePortfolioMetrics(
  portfolio: Portfolio,
  allPositions: Position[],
  initialCapital: number
): void {
  // Calculate open positions value
  const openPositions = allPositions.filter((p) => p.isOpen);
  const positionsValue = openPositions.reduce((sum, pos) => {
    return sum + calculatePositionValue(pos);
  }, 0);

  // Update portfolio totals
  portfolio.positions = openPositions;
  portfolio.totalValue = portfolio.availableCash + positionsValue;

  // Calculate P&L - Simple and accurate method
  // P&L = Current Total Value - Initial Capital
  portfolio.totalPnL = portfolio.totalValue - initialCapital;
  portfolio.totalPnLPercent = (portfolio.totalPnL / initialCapital) * 100;

  // Debug logging for P&L calculation
  const unrealizedPnL = openPositions.reduce((sum, pos) => {
    return sum + calculateUnrealizedPnL(pos);
  }, 0);
  const realizedPnL = allPositions.reduce((sum, pos) => {
    return sum + pos.realizedPnL;
  }, 0);
  
  if (Math.abs(portfolio.totalPnL) > 0.01) {
    console.log(`[DEBUG] P&L: Total Value=$${portfolio.totalValue.toFixed(2)}, Initial=$${initialCapital.toFixed(2)}, P&L=$${portfolio.totalPnL.toFixed(2)} (${portfolio.totalPnLPercent.toFixed(2)}%)`);
    console.log(`[DEBUG] Position-level: Realized=$${realizedPnL.toFixed(2)}, Unrealized=$${unrealizedPnL.toFixed(2)}, Sum=$${(realizedPnL + unrealizedPnL).toFixed(2)}`);
  }

  // Calculate win rate (from closed positions only)
  const closedPositions = allPositions.filter((p) => !p.isOpen);
  portfolio.closedPositionsCount = closedPositions.length;
  if (closedPositions.length > 0) {
    const winningTrades = closedPositions.filter((p) => p.realizedPnL > 0).length;
    portfolio.winRate = (winningTrades / closedPositions.length) * 100;
  }

  portfolio.timestamp = new Date();
  portfolio.id = generatePortfolioSnapshotId(); // Generate new ID for each snapshot
}
