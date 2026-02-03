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

  // Calculate P&L
  const unrealizedPnL = openPositions.reduce((sum, pos) => {
    return sum + calculateUnrealizedPnL(pos);
  }, 0);

  // Get realized P&L from ALL positions (both open and closed)
  // Open positions can have realized P&L from partial sells
  const realizedPnL = allPositions.reduce((sum, pos) => {
    return sum + pos.realizedPnL;
  }, 0);

  portfolio.totalPnL = realizedPnL + unrealizedPnL;
  portfolio.totalPnLPercent = (portfolio.totalPnL / initialCapital) * 100;

  // Debug logging for P&L calculation
  if (Math.abs(unrealizedPnL) > 0.01 || Math.abs(realizedPnL) > 0.01) {
    console.log(`[DEBUG] P&L Calculation: Realized=$${realizedPnL.toFixed(4)}, Unrealized=$${unrealizedPnL.toFixed(4)}, Total=$${portfolio.totalPnL.toFixed(4)} from ${allPositions.length} positions (${openPositions.length} open, ${allPositions.length - openPositions.length} closed)`);
  }

  // Validate accounting (Current Value should = Initial + P&L)
  const expectedValue = initialCapital + portfolio.totalPnL;
  const actualValue = portfolio.totalValue;
  const discrepancy = actualValue - expectedValue;

  if (Math.abs(discrepancy) > 0.01) {
    console.warn(`ACCOUNTING DISCREPANCY: Current Value ($${actualValue.toFixed(2)}) does not equal Initial ($${initialCapital.toFixed(2)}) + P&L ($${portfolio.totalPnL.toFixed(2)}) = $${expectedValue.toFixed(2)}. Difference: $${discrepancy.toFixed(2)}`);
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
