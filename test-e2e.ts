/**
 * End-to-End Test
 * Simulates exactly what the live app does
 */

import Database from 'better-sqlite3';
import { initializeDatabase } from './src/database/schema.js';
import { Repository } from './src/database/repository.js';
import { createPortfolio, updatePortfolioMetrics } from './src/models/portfolio.js';
import { Position, createPositionId, calculateUnrealizedPnL } from './src/models/position.js';
import { Trade, createTradeId } from './src/models/trade.js';

console.log('End-to-End Test: Simulating Complete App Flow\n');

// Create test database
const dbPath = './data/test-e2e.db';
const db = initializeDatabase(dbPath);
const repo = new Repository(db);

const initialCapital = 1000;
let portfolio = createPortfolio(initialCapital);

console.log('=== Initial State ===');
console.log(`Cash: $${portfolio.availableCash.toFixed(2)}`);
console.log(`Value: $${portfolio.totalValue.toFixed(2)}`);
console.log(`P&L: $${portfolio.totalPnL.toFixed(2)}\n`);

// Simulate Trade 1: BUY
console.log('=== Trade 1: BUY 100 shares @ $1.00 ===');
const trade1: Trade = {
  id: createTradeId(),
  timestamp: new Date(),
  traderAddress: 'test',
  marketId: 'market1',
  marketQuestion: 'Test Market 1',
  outcomeId: 'outcome1',
  side: 'BUY',
  shares: 100,
  price: 1.00,
  totalCost: 100,
  fee: 1,
  source: 'api',
};

// Deduct cash
portfolio.availableCash -= (trade1.totalCost + trade1.fee);

// Create/update position
let pos1 = repo.getPosition(createPositionId(trade1.marketId, trade1.outcomeId));
if (!pos1) {
  pos1 = {
    id: createPositionId(trade1.marketId, trade1.outcomeId),
    marketId: trade1.marketId,
    marketQuestion: trade1.marketQuestion,
    outcomeId: trade1.outcomeId,
    shares: 0,
    averageEntryPrice: 0,
    totalInvested: 0,
    currentPrice: trade1.price,
    unrealizedPnL: 0,
    realizedPnL: 0,
    isOpen: true,
    openedAt: new Date(),
    updatedAt: new Date(),
  };
}

pos1.shares += trade1.shares;
pos1.totalInvested += trade1.totalCost + trade1.fee;
pos1.averageEntryPrice = pos1.totalInvested / pos1.shares;
pos1.currentPrice = trade1.price;
pos1.unrealizedPnL = calculateUnrealizedPnL(pos1);

repo.saveTrade(trade1);
repo.savePosition(pos1);

// Update portfolio
let allPositions = repo.getAllPositions();
updatePortfolioMetrics(portfolio, allPositions, initialCapital);
repo.savePortfolioSnapshot(portfolio);

console.log(`Cash: $${portfolio.availableCash.toFixed(2)}`);
console.log(`Position Value: $${(pos1.shares * pos1.currentPrice).toFixed(2)}`);
console.log(`Total Value: $${portfolio.totalValue.toFixed(2)}`);
console.log(`Total P&L: $${portfolio.totalPnL.toFixed(2)}`);
console.log(`Expected: $${(initialCapital + portfolio.totalPnL).toFixed(2)}`);
console.log(`Discrepancy: $${(portfolio.totalValue - (initialCapital + portfolio.totalPnL)).toFixed(2)}\n`);

// Simulate price update (like PriceUpdater does)
console.log('=== Price Update: Market moves to $1.10 ===');
pos1.currentPrice = 1.10;
pos1.unrealizedPnL = calculateUnrealizedPnL(pos1);
repo.savePosition(pos1);

allPositions = repo.getAllPositions();
updatePortfolioMetrics(portfolio, allPositions, initialCapital);
repo.savePortfolioSnapshot(portfolio);

console.log(`Total Value: $${portfolio.totalValue.toFixed(2)}`);
console.log(`Total P&L: $${portfolio.totalPnL.toFixed(2)}`);
console.log(`Expected: $${(initialCapital + portfolio.totalPnL).toFixed(2)}`);
console.log(`Discrepancy: $${(portfolio.totalValue - (initialCapital + portfolio.totalPnL)).toFixed(2)}\n`);

// Simulate Trade 2: SELL 50 shares @ $1.10
console.log('=== Trade 2: SELL 50 shares @ $1.10 ===');
const trade2: Trade = {
  id: createTradeId(),
  timestamp: new Date(),
  traderAddress: 'test',
  marketId: 'market1',
  marketQuestion: 'Test Market 1',
  outcomeId: 'outcome1',
  side: 'SELL',
  shares: 50,
  price: 1.10,
  totalCost: 55, // 50 * 1.10
  fee: 0.55,
  source: 'api',
};

// Add cash
const saleProceeds = trade2.totalCost - trade2.fee;
portfolio.availableCash += saleProceeds;

// Update position
const costBasis = pos1.averageEntryPrice * trade2.shares;
pos1.realizedPnL += (saleProceeds - costBasis);
pos1.shares -= trade2.shares;
pos1.totalInvested -= costBasis;
pos1.currentPrice = trade2.price;
pos1.unrealizedPnL = calculateUnrealizedPnL(pos1);

repo.saveTrade(trade2);
repo.savePosition(pos1);

allPositions = repo.getAllPositions();
updatePortfolioMetrics(portfolio, allPositions, initialCapital);
repo.savePortfolioSnapshot(portfolio);

console.log(`Cash: $${portfolio.availableCash.toFixed(2)}`);
console.log(`Position Shares: ${pos1.shares}`);
console.log(`Position Invested: $${pos1.totalInvested.toFixed(2)}`);
console.log(`Position Value: $${(pos1.shares * pos1.currentPrice).toFixed(2)}`);
console.log(`Realized P&L: $${pos1.realizedPnL.toFixed(2)}`);
console.log(`Unrealized P&L: $${pos1.unrealizedPnL.toFixed(2)}`);
console.log(`Total Value: $${portfolio.totalValue.toFixed(2)}`);
console.log(`Total P&L: $${portfolio.totalPnL.toFixed(2)}`);
console.log(`Expected: $${(initialCapital + portfolio.totalPnL).toFixed(2)}`);
console.log(`Discrepancy: $${(portfolio.totalValue - (initialCapital + portfolio.totalPnL)).toFixed(2)}\n`);

// Final validation
const finalDiscrepancy = Math.abs(portfolio.totalValue - (initialCapital + portfolio.totalPnL));

db.close();

// Clean up test database
const fs = await import('fs');
fs.unlinkSync(dbPath);
console.log('Test database cleaned up');

console.log(`\n${'='.repeat(50)}`);
if (finalDiscrepancy < 0.01) {
  console.log('SUCCESS: End-to-end test passed with correct accounting!');
  process.exit(0);
} else {
  console.log(`FAIL: Discrepancy of $${finalDiscrepancy.toFixed(2)} detected`);
  process.exit(1);
}
