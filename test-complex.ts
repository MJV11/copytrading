/**
 * Complex Integration Tests
 * Tests realistic trading scenarios with multiple positions and trades
 */

import { createPortfolio, updatePortfolioMetrics } from './src/models/portfolio.js';
import { Position, createPositionId } from './src/models/position.js';

function almostEqual(a: number, b: number, tolerance = 0.01): boolean {
  return Math.abs(a - b) < tolerance;
}

function validateAccounting(
  portfolio: any,
  initialCapital: number,
  testName: string
): boolean {
  const expectedValue = initialCapital + portfolio.totalPnL;
  const actualValue = portfolio.totalValue;
  const discrepancy = Math.abs(actualValue - expectedValue);

  if (discrepancy > 0.01) {
    console.log(`FAIL - ${testName}`);
    console.log(`  Expected: $${expectedValue.toFixed(2)}`);
    console.log(`  Actual: $${actualValue.toFixed(2)}`);
    console.log(`  Discrepancy: $${discrepancy.toFixed(2)}`);
    return false;
  }

  console.log(`PASS - ${testName}`);
  return true;
}

console.log('Running Complex Integration Tests...\n');

let allPassed = true;

// Test 1: Multiple Buys, Averaging Up
(() => {
  const initialCapital = 1000;
  const portfolio = createPortfolio(initialCapital);
  const positions: Position[] = [];

  // Buy 1: 100 shares @ $1.00
  portfolio.availableCash -= 101; // cost + fee
  const pos1: Position = {
    id: createPositionId('market1', 'outcome1'),
    marketId: 'market1',
    marketQuestion: 'Test',
    outcomeId: 'outcome1',
    shares: 100,
    averageEntryPrice: 1.01,
    totalInvested: 101,
    currentPrice: 1.00,
    unrealizedPnL: (100 * 1.00) - 101,
    realizedPnL: 0,
    isOpen: true,
    openedAt: new Date(),
    updatedAt: new Date(),
  };
  positions.push(pos1);

  updatePortfolioMetrics(portfolio, positions, initialCapital);
  if (!validateAccounting(portfolio, initialCapital, 'Multiple Buys - After Buy 1')) {
    allPassed = false;
  }

  // Buy 2: 100 shares @ $1.20 (averaging up)
  portfolio.availableCash -= 121.20; // cost + fee
  pos1.shares += 100;
  pos1.totalInvested += 121.20;
  pos1.averageEntryPrice = pos1.totalInvested / pos1.shares; // (101 + 121.20) / 200 = 1.111
  pos1.currentPrice = 1.20;
  pos1.unrealizedPnL = (pos1.shares * pos1.currentPrice) - pos1.totalInvested;

  updatePortfolioMetrics(portfolio, positions, initialCapital);
  if (!validateAccounting(portfolio, initialCapital, 'Multiple Buys - After Buy 2 (averaging up)')) {
    allPassed = false;
  }
})();

// Test 2: Buy, Partial Sell, Buy Again
(() => {
  const initialCapital = 1000;
  const portfolio = createPortfolio(initialCapital);
  const positions: Position[] = [];

  // Buy 100 @ $1.00
  portfolio.availableCash -= 101;
  const pos: Position = {
    id: createPositionId('market1', 'outcome1'),
    marketId: 'market1',
    marketQuestion: 'Test',
    outcomeId: 'outcome1',
    shares: 100,
    averageEntryPrice: 1.01,
    totalInvested: 101,
    currentPrice: 1.00,
    unrealizedPnL: -1,
    realizedPnL: 0,
    isOpen: true,
    openedAt: new Date(),
    updatedAt: new Date(),
  };
  positions.push(pos);

  updatePortfolioMetrics(portfolio, positions, initialCapital);
  if (!validateAccounting(portfolio, initialCapital, 'Partial Sell - After initial buy')) {
    allPassed = false;
  }

  // Price goes to $1.50
  pos.currentPrice = 1.50;
  pos.unrealizedPnL = (pos.shares * pos.currentPrice) - pos.totalInvested;

  updatePortfolioMetrics(portfolio, positions, initialCapital);
  if (!validateAccounting(portfolio, initialCapital, 'Partial Sell - After price increase')) {
    allPassed = false;
  }

  // Sell 50 @ $1.50
  const sharesSold = 50;
  const saleRevenue = sharesSold * 1.50; // 75
  const saleFee = saleRevenue * 0.01; // 0.75
  const saleProceeds = saleRevenue - saleFee; // 74.25
  portfolio.availableCash += saleProceeds;

  const costBasis = pos.averageEntryPrice * sharesSold; // 50.5
  pos.realizedPnL += (saleProceeds - costBasis); // 23.75
  pos.shares -= sharesSold;
  pos.totalInvested -= costBasis;
  pos.unrealizedPnL = (pos.shares * pos.currentPrice) - pos.totalInvested;

  updatePortfolioMetrics(portfolio, positions, initialCapital);
  if (!validateAccounting(portfolio, initialCapital, 'Partial Sell - After selling 50%')) {
    allPassed = false;
  }

  // Buy more 50 @ $1.60 (averaging up)
  portfolio.availableCash -= 80.80; // 80 + 0.80 fee
  pos.shares += 50;
  pos.totalInvested += 80.80;
  pos.averageEntryPrice = pos.totalInvested / pos.shares;
  pos.currentPrice = 1.60;
  pos.unrealizedPnL = (pos.shares * pos.currentPrice) - pos.totalInvested;

  updatePortfolioMetrics(portfolio, positions, initialCapital);
  if (!validateAccounting(portfolio, initialCapital, 'Partial Sell - After buying more')) {
    allPassed = false;
  }
})();

// Test 3: Multiple Positions Simultaneously
(() => {
  const initialCapital = 1000;
  const portfolio = createPortfolio(initialCapital);
  const positions: Position[] = [];

  // Position 1: BUY 100 @ $1.00
  portfolio.availableCash -= 101;
  positions.push({
    id: createPositionId('market1', 'outcome1'),
    marketId: 'market1',
    marketQuestion: 'Test 1',
    outcomeId: 'outcome1',
    shares: 100,
    averageEntryPrice: 1.01,
    totalInvested: 101,
    currentPrice: 1.10,
    unrealizedPnL: (100 * 1.10) - 101,
    realizedPnL: 0,
    isOpen: true,
    openedAt: new Date(),
    updatedAt: new Date(),
  });

  // Position 2: BUY 200 @ $0.50
  portfolio.availableCash -= 101; // 100 + 1 fee
  positions.push({
    id: createPositionId('market2', 'outcome1'),
    marketId: 'market2',
    marketQuestion: 'Test 2',
    outcomeId: 'outcome1',
    shares: 200,
    averageEntryPrice: 0.505,
    totalInvested: 101,
    currentPrice: 0.60,
    unrealizedPnL: (200 * 0.60) - 101,
    realizedPnL: 0,
    isOpen: true,
    openedAt: new Date(),
    updatedAt: new Date(),
  });

  // Position 3: BUY 50 @ $2.00
  portfolio.availableCash -= 101; // 100 + 1 fee
  positions.push({
    id: createPositionId('market3', 'outcome1'),
    marketId: 'market3',
    marketQuestion: 'Test 3',
    outcomeId: 'outcome1',
    shares: 50,
    averageEntryPrice: 2.02,
    totalInvested: 101,
    currentPrice: 1.80,
    unrealizedPnL: (50 * 1.80) - 101,
    realizedPnL: 0,
    isOpen: true,
    openedAt: new Date(),
    updatedAt: new Date(),
  });

  updatePortfolioMetrics(portfolio, positions, initialCapital);
  if (!validateAccounting(portfolio, initialCapital, 'Multiple Positions - 3 open positions')) {
    allPassed = false;
  }

  // Close position 2 with profit
  const pos2 = positions[1];
  const sellRevenue = pos2.shares * 0.70; // 140
  const sellFee = sellRevenue * 0.01; // 1.40
  const sellProceeds = sellRevenue - sellFee; // 138.60
  portfolio.availableCash += sellProceeds;

  pos2.realizedPnL = sellProceeds - pos2.totalInvested; // 138.60 - 101 = 37.60
  pos2.shares = 0;
  pos2.totalInvested = 0;
  pos2.isOpen = false;
  pos2.unrealizedPnL = 0;

  updatePortfolioMetrics(portfolio, positions, initialCapital);
  if (!validateAccounting(portfolio, initialCapital, 'Multiple Positions - After closing one with profit')) {
    allPassed = false;
  }
})();

// Test 4: Rounding Edge Cases
(() => {
  const initialCapital = 1000;
  const portfolio = createPortfolio(initialCapital);
  const positions: Position[] = [];

  // Tiny trade with rounding
  portfolio.availableCash -= 0.010101; // 0.01 + 0.000101 fee
  positions.push({
    id: createPositionId('market1', 'outcome1'),
    marketId: 'market1',
    marketQuestion: 'Tiny Trade',
    outcomeId: 'outcome1',
    shares: 0.01,
    averageEntryPrice: 1.0101,
    totalInvested: 0.010101,
    currentPrice: 1.05,
    unrealizedPnL: (0.01 * 1.05) - 0.010101,
    realizedPnL: 0,
    isOpen: true,
    openedAt: new Date(),
    updatedAt: new Date(),
  });

  updatePortfolioMetrics(portfolio, positions, initialCapital);
  if (!validateAccounting(portfolio, initialCapital, 'Rounding - Tiny trade amounts')) {
    allPassed = false;
  }
})();

// Test 5: Sell All Shares Exactly
(() => {
  const initialCapital = 1000;
  const portfolio = createPortfolio(initialCapital);
  const positions: Position[] = [];

  // Buy
  portfolio.availableCash -= 101;
  const pos: Position = {
    id: createPositionId('market1', 'outcome1'),
    marketId: 'market1',
    marketQuestion: 'Full Close Test',
    outcomeId: 'outcome1',
    shares: 100,
    averageEntryPrice: 1.01,
    totalInvested: 101,
    currentPrice: 1.20,
    unrealizedPnL: 19,
    realizedPnL: 0,
    isOpen: true,
    openedAt: new Date(),
    updatedAt: new Date(),
  };
  positions.push(pos);

  updatePortfolioMetrics(portfolio, positions, initialCapital);
  if (!validateAccounting(portfolio, initialCapital, 'Full Close - Before selling')) {
    allPassed = false;
  }

  // Sell ALL shares
  const revenue = 100 * 1.20; // 120
  const fee = revenue * 0.01; // 1.20
  const proceeds = revenue - fee; // 118.80
  portfolio.availableCash += proceeds;

  pos.realizedPnL = proceeds - pos.totalInvested; // 118.80 - 101 = 17.80
  pos.shares = 0;
  pos.totalInvested = 0;
  pos.isOpen = false;
  pos.unrealizedPnL = 0;

  updatePortfolioMetrics(portfolio, positions, initialCapital);
  if (!validateAccounting(portfolio, initialCapital, 'Full Close - After selling all')) {
    allPassed = false;
  }
})();

// Test 6: Complex Multi-Position With Partial Sells
(() => {
  const initialCapital = 1000;
  const portfolio = createPortfolio(initialCapital);
  const positions: Position[] = [];

  // Position 1: Buy 100 @ $0.50
  portfolio.availableCash -= 50.50;
  positions.push({
    id: createPositionId('market1', 'outcome1'),
    marketId: 'market1',
    marketQuestion: 'Market 1',
    outcomeId: 'outcome1',
    shares: 100,
    averageEntryPrice: 0.505,
    totalInvested: 50.50,
    currentPrice: 0.50,
    unrealizedPnL: -0.50,
    realizedPnL: 0,
    isOpen: true,
    openedAt: new Date(),
    updatedAt: new Date(),
  });

  // Position 2: Buy 50 @ $3.00
  portfolio.availableCash -= 151.50;
  positions.push({
    id: createPositionId('market2', 'outcome1'),
    marketId: 'market2',
    marketQuestion: 'Market 2',
    outcomeId: 'outcome1',
    shares: 50,
    averageEntryPrice: 3.03,
    totalInvested: 151.50,
    currentPrice: 3.00,
    unrealizedPnL: -1.50,
    realizedPnL: 0,
    isOpen: true,
    openedAt: new Date(),
    updatedAt: new Date(),
  });

  updatePortfolioMetrics(portfolio, positions, initialCapital);
  if (!validateAccounting(portfolio, initialCapital, 'Multi-Position - Two positions opened')) {
    allPassed = false;
  }

  // Price movements
  positions[0].currentPrice = 0.70; // Up 40%
  positions[0].unrealizedPnL = (positions[0].shares * 0.70) - positions[0].totalInvested;
  
  positions[1].currentPrice = 2.50; // Down 16.7%
  positions[1].unrealizedPnL = (positions[1].shares * 2.50) - positions[1].totalInvested;

  updatePortfolioMetrics(portfolio, positions, initialCapital);
  if (!validateAccounting(portfolio, initialCapital, 'Multi-Position - After price movements')) {
    allPassed = false;
  }

  // Partial sell position 1: 60 shares @ $0.70
  const p1 = positions[0];
  const sellRevenue1 = 60 * 0.70; // 42
  const sellFee1 = sellRevenue1 * 0.01; // 0.42
  const sellProceeds1 = sellRevenue1 - sellFee1; // 41.58
  portfolio.availableCash += sellProceeds1;

  const costBasis1 = p1.averageEntryPrice * 60; // 30.30
  p1.realizedPnL += (sellProceeds1 - costBasis1); // 11.28
  p1.shares -= 60;
  p1.totalInvested -= costBasis1;
  p1.unrealizedPnL = (p1.shares * p1.currentPrice) - p1.totalInvested;

  updatePortfolioMetrics(portfolio, positions, initialCapital);
  if (!validateAccounting(portfolio, initialCapital, 'Multi-Position - After partial sell')) {
    allPassed = false;
  }

  // Full close position 2: sell all 50 @ $2.50
  const p2 = positions[1];
  const sellRevenue2 = 50 * 2.50; // 125
  const sellFee2 = sellRevenue2 * 0.01; // 1.25
  const sellProceeds2 = sellRevenue2 - sellFee2; // 123.75
  portfolio.availableCash += sellProceeds2;

  p2.realizedPnL = sellProceeds2 - p2.totalInvested; // 123.75 - 151.50 = -27.75
  p2.shares = 0;
  p2.totalInvested = 0;
  p2.isOpen = false;
  p2.unrealizedPnL = 0;

  updatePortfolioMetrics(portfolio, positions, initialCapital);
  if (!validateAccounting(portfolio, initialCapital, 'Multi-Position - After full close of position 2')) {
    allPassed = false;
  }
})();

// Test 7: Extreme Price Movements
(() => {
  const initialCapital = 1000;
  const portfolio = createPortfolio(initialCapital);
  const positions: Position[] = [];

  // Buy @ $0.50
  portfolio.availableCash -= 50.50;
  const pos: Position = {
    id: createPositionId('market1', 'outcome1'),
    marketId: 'market1',
    marketQuestion: 'Volatile Market',
    outcomeId: 'outcome1',
    shares: 100,
    averageEntryPrice: 0.505,
    totalInvested: 50.50,
    currentPrice: 0.50,
    unrealizedPnL: -0.50,
    realizedPnL: 0,
    isOpen: true,
    openedAt: new Date(),
    updatedAt: new Date(),
  };
  positions.push(pos);

  updatePortfolioMetrics(portfolio, positions, initialCapital);
  if (!validateAccounting(portfolio, initialCapital, 'Extreme Moves - Initial buy')) {
    allPassed = false;
  }

  // Price crashes to $0.01
  pos.currentPrice = 0.01;
  pos.unrealizedPnL = (pos.shares * pos.currentPrice) - pos.totalInvested; // 1 - 50.50 = -49.50

  updatePortfolioMetrics(portfolio, positions, initialCapital);
  if (!validateAccounting(portfolio, initialCapital, 'Extreme Moves - 98% loss')) {
    allPassed = false;
  }

  // Sell at loss
  const revenue = 100 * 0.01; // 1
  const fee = revenue * 0.01; // 0.01
  const proceeds = revenue - fee; // 0.99
  portfolio.availableCash += proceeds;

  pos.realizedPnL = proceeds - pos.totalInvested; // 0.99 - 50.50 = -49.51
  pos.shares = 0;
  pos.totalInvested = 0;
  pos.isOpen = false;
  pos.unrealizedPnL = 0;

  updatePortfolioMetrics(portfolio, positions, initialCapital);
  if (!validateAccounting(portfolio, initialCapital, 'Extreme Moves - After realizing loss')) {
    allPassed = false;
  }
})();

// Test 8: Many Small Trades (Accumulation Strategy)
(() => {
  const initialCapital = 1000;
  const portfolio = createPortfolio(initialCapital);
  const positions: Position[] = [];

  const pos: Position = {
    id: createPositionId('market1', 'outcome1'),
    marketId: 'market1',
    marketQuestion: 'DCA Test',
    outcomeId: 'outcome1',
    shares: 0,
    averageEntryPrice: 0,
    totalInvested: 0,
    currentPrice: 1.00,
    unrealizedPnL: 0,
    realizedPnL: 0,
    isOpen: true,
    openedAt: new Date(),
    updatedAt: new Date(),
  };
  positions.push(pos);

  // Buy 10 shares at different prices (DCA)
  const prices = [1.00, 0.95, 0.90, 1.05, 0.85, 0.95, 1.10, 0.80, 0.90, 1.00];
  
  for (const price of prices) {
    const shares = 10;
    const cost = shares * price;
    const fee = cost * 0.01;
    portfolio.availableCash -= (cost + fee);
    
    pos.shares += shares;
    pos.totalInvested += (cost + fee);
    pos.averageEntryPrice = pos.totalInvested / pos.shares;
    pos.currentPrice = price;
    pos.unrealizedPnL = (pos.shares * pos.currentPrice) - pos.totalInvested;
  }

  updatePortfolioMetrics(portfolio, positions, initialCapital);
  if (!validateAccounting(portfolio, initialCapital, 'DCA Strategy - After 10 buys at varying prices')) {
    allPassed = false;
  }
})();

// Test 9: Win/Loss Tracking
(() => {
  const initialCapital = 1000;
  const portfolio = createPortfolio(initialCapital);
  const positions: Position[] = [];

  // Closed position 1: Winner
  positions.push({
    id: 'closed1',
    marketId: 'market1',
    marketQuestion: 'Winner',
    outcomeId: 'outcome1',
    shares: 0,
    averageEntryPrice: 1.00,
    totalInvested: 0,
    currentPrice: 1.50,
    unrealizedPnL: 0,
    realizedPnL: 20,
    isOpen: false,
    openedAt: new Date(),
    closedAt: new Date(),
    updatedAt: new Date(),
  });

  // Closed position 2: Loser
  positions.push({
    id: 'closed2',
    marketId: 'market2',
    marketQuestion: 'Loser',
    outcomeId: 'outcome1',
    shares: 0,
    averageEntryPrice: 1.00,
    totalInvested: 0,
    currentPrice: 0.50,
    unrealizedPnL: 0,
    realizedPnL: -15,
    isOpen: false,
    openedAt: new Date(),
    closedAt: new Date(),
    updatedAt: new Date(),
  });

  // Open position with unrealized loss
  positions.push({
    id: 'open1',
    marketId: 'market3',
    marketQuestion: 'Open',
    outcomeId: 'outcome1',
    shares: 100,
    averageEntryPrice: 1.01,
    totalInvested: 101,
    currentPrice: 0.95,
    unrealizedPnL: -6,
    realizedPnL: 0,
    isOpen: true,
    openedAt: new Date(),
    updatedAt: new Date(),
  });

  portfolio.availableCash = 1000 - 101 + 20 - 15; // Initial - open_invested + win - loss

  updatePortfolioMetrics(portfolio, positions, initialCapital);
  if (!validateAccounting(portfolio, initialCapital, 'Win/Loss - Mixed results')) {
    allPassed = false;
  }

  // Check win rate
  const expectedWinRate = (1 / 2) * 100; // 1 winner out of 2 closed = 50%
  if (!almostEqual(portfolio.winRate, expectedWinRate)) {
    console.log(`FAIL - Win rate calculation (expected ${expectedWinRate}%, got ${portfolio.winRate}%)`);
    allPassed = false;
  } else {
    console.log(`PASS - Win rate calculation (${portfolio.winRate}%)`);
  }
})();

console.log(`\n${'='.repeat(50)}`);
if (allPassed) {
  console.log('ALL TESTS PASSED! No accounting bugs detected.');
  process.exit(0);
} else {
  console.log('SOME TESTS FAILED! There are accounting bugs.');
  process.exit(1);
}
