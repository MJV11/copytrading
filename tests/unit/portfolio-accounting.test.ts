import { describe, it, expect, beforeEach } from 'vitest';
import { createPortfolio, updatePortfolioMetrics } from '../../src/models/portfolio.js';
import { Position, calculateUnrealizedPnL, calculatePositionValue } from '../../src/models/position.js';

describe('Portfolio Accounting', () => {
  let portfolio: any;
  const initialCapital = 1000;

  beforeEach(() => {
    portfolio = createPortfolio(initialCapital);
  });

  it('should start with correct initial values', () => {
    expect(portfolio.totalInvested).toBe(1000);
    expect(portfolio.totalValue).toBe(1000);
    expect(portfolio.availableCash).toBe(1000);
    expect(portfolio.totalPnL).toBe(0);
    expect(portfolio.totalPnLPercent).toBe(0);
  });

  it('should maintain accounting equation: Value = Initial + P&L', () => {
    // Simulate a BUY
    portfolio.availableCash = 900; // Spent $100
    
    const position: Position = {
      id: 'pos_1',
      marketId: 'market_1',
      marketQuestion: 'Test Market',
      outcomeId: 'outcome_1',
      shares: 100,
      averageEntryPrice: 1.00,
      totalInvested: 100,
      currentPrice: 1.10, // Price went up
      unrealizedPnL: 10,
      realizedPnL: 0,
      isOpen: true,
      openedAt: new Date(),
      updatedAt: new Date(),
    };

    updatePortfolioMetrics(portfolio, [position], initialCapital);

    // Current Value should = Initial + P&L
    const expectedValue = initialCapital + portfolio.totalPnL;
    expect(portfolio.totalValue).toBeCloseTo(expectedValue, 2);
  });

  it('should correctly calculate portfolio value: Cash + Positions', () => {
    portfolio.availableCash = 700;

    const positions: Position[] = [
      {
        id: 'pos_1',
        marketId: 'market_1',
        marketQuestion: 'Test 1',
        outcomeId: 'outcome_1',
        shares: 100,
        averageEntryPrice: 1.00,
        totalInvested: 100,
        currentPrice: 1.50,
        unrealizedPnL: 50,
        realizedPnL: 0,
        isOpen: true,
        openedAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'pos_2',
        marketId: 'market_2',
        marketQuestion: 'Test 2',
        outcomeId: 'outcome_2',
        shares: 200,
        averageEntryPrice: 1.00,
        totalInvested: 200,
        currentPrice: 0.75,
        unrealizedPnL: -50,
        realizedPnL: 0,
        isOpen: true,
        openedAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    updatePortfolioMetrics(portfolio, positions, initialCapital);

    // Position 1 value: 100 * 1.50 = 150
    // Position 2 value: 200 * 0.75 = 150
    // Total positions: 300
    // Total value: 700 (cash) + 300 (positions) = 1000
    expect(portfolio.totalValue).toBeCloseTo(1000, 2);
    
    // P&L: +50 (pos1) + -50 (pos2) = 0
    expect(portfolio.totalPnL).toBeCloseTo(0, 2);
  });

  it('should correctly track realized P&L from closed positions', () => {
    const closedPosition: Position = {
      id: 'pos_1',
      marketId: 'market_1',
      marketQuestion: 'Closed Market',
      outcomeId: 'outcome_1',
      shares: 0,
      averageEntryPrice: 1.00,
      totalInvested: 0,
      currentPrice: 1.20,
      unrealizedPnL: 0,
      realizedPnL: 20, // Made $20 profit
      isOpen: false,
      openedAt: new Date(),
      closedAt: new Date(),
      updatedAt: new Date(),
    };

    portfolio.availableCash = 1020; // Got back $120 from $100 investment

    updatePortfolioMetrics(portfolio, [closedPosition], initialCapital);

    expect(portfolio.totalPnL).toBeCloseTo(20, 2);
    expect(portfolio.totalValue).toBeCloseTo(1020, 2);
    expect(portfolio.closedPositionsCount).toBe(1);
  });

  it('should handle partial position sell correctly', () => {
    // Start: 100 shares @ $1.00 = $100 invested
    // Sell: 50 shares @ $1.20
    // Expected: 50 shares remain with $50 invested

    const position: Position = {
      id: 'pos_1',
      marketId: 'market_1',
      marketQuestion: 'Test',
      outcomeId: 'outcome_1',
      shares: 50, // After selling 50
      averageEntryPrice: 1.00,
      totalInvested: 50, // Should be reduced from 100 to 50
      currentPrice: 1.20,
      unrealizedPnL: 10, // (50 * 1.20) - 50 = 10
      realizedPnL: 10, // Sold 50 @ 1.20, cost was 50, profit 10 (before fees)
      isOpen: true,
      openedAt: new Date(),
      updatedAt: new Date(),
    };

    portfolio.availableCash = 960; // 1000 - 100 (initial buy) + 60 (sell proceeds)

    updatePortfolioMetrics(portfolio, [position], initialCapital);

    // Value: 960 (cash) + 60 (50 shares @ 1.20) = 1020
    expect(portfolio.totalValue).toBeCloseTo(1020, 2);
    
    // P&L: 10 (realized) + 10 (unrealized) = 20
    expect(portfolio.totalPnL).toBeCloseTo(20, 2);
  });
});
