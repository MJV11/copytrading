/**
 * Integration test using actual code
 */
import { createPortfolio, updatePortfolioMetrics } from './src/models/portfolio.js';
import { Position, createPositionId } from './src/models/position.js';

console.log('Integration Test: Simulating Real Trade Flow\n');

const initialCapital = 1000;
const portfolio = createPortfolio(initialCapital);
const positions: Position[] = [];

console.log('Initial State:');
console.log(`  Cash: $${portfolio.availableCash.toFixed(2)}`);
console.log(`  Value: $${portfolio.totalValue.toFixed(2)}`);
console.log(`  P&L: $${portfolio.totalPnL.toFixed(2)}\n`);

// Simulate BUY trade
console.log('=== Trade 1: BUY 100 shares @ $1.00 ===');
const trade1Cost = 100;
const trade1Fee = 1;
const trade1Shares = 100;
const trade1Price = 1.00;

portfolio.availableCash -= (trade1Cost + trade1Fee);

const position1: Position = {
  id: createPositionId('market1', 'outcome1'),
  marketId: 'market1',
  marketQuestion: 'Test Market 1',
  outcomeId: 'outcome1',
  shares: trade1Shares,
  averageEntryPrice: (trade1Cost + trade1Fee) / trade1Shares,
  totalInvested: trade1Cost + trade1Fee,
  currentPrice: trade1Price,
  unrealizedPnL: 0,
  realizedPnL: 0,
  isOpen: true,
  openedAt: new Date(),
  updatedAt: new Date(),
};

positions.push(position1);

updatePortfolioMetrics(portfolio, positions, initialCapital);

console.log(`  Cash: $${portfolio.availableCash.toFixed(2)} (spent $${(trade1Cost + trade1Fee).toFixed(2)})`);
console.log(`  Position Value: $${(position1.shares * position1.currentPrice).toFixed(2)}`);
console.log(`  Total Value: $${portfolio.totalValue.toFixed(2)}`);
console.log(`  Total P&L: $${portfolio.totalPnL.toFixed(2)}`);
console.log(`  Expected Value: $${(initialCapital + portfolio.totalPnL).toFixed(2)}`);
console.log(`  Discrepancy: $${(portfolio.totalValue - (initialCapital + portfolio.totalPnL)).toFixed(2)}\n`);

// Price increases
console.log('=== Market moves: Price goes to $1.10 ===');
position1.currentPrice = 1.10;
position1.unrealizedPnL = (position1.shares * position1.currentPrice) - position1.totalInvested;

updatePortfolioMetrics(portfolio, positions, initialCapital);

console.log(`  Cash: $${portfolio.availableCash.toFixed(2)}`);
console.log(`  Position Value: $${(position1.shares * position1.currentPrice).toFixed(2)}`);
console.log(`  Unrealized P&L: $${position1.unrealizedPnL.toFixed(2)}`);
console.log(`  Total Value: $${portfolio.totalValue.toFixed(2)}`);
console.log(`  Total P&L: $${portfolio.totalPnL.toFixed(2)}`);
console.log(`  Expected Value: $${(initialCapital + portfolio.totalPnL).toFixed(2)}`);
console.log(`  Discrepancy: $${(portfolio.totalValue - (initialCapital + portfolio.totalPnL)).toFixed(2)}\n`);

// Partial SELL
console.log('=== Trade 2: SELL 50 shares @ $1.10 ===');
const trade2Shares = 50;
const trade2Price = 1.10;
const trade2Revenue = trade2Shares * trade2Price; // 55
const trade2Fee = trade2Revenue * 0.01; // 0.55
const trade2Proceeds = trade2Revenue - trade2Fee; // 54.45

portfolio.availableCash += trade2Proceeds;

const costBasis = position1.averageEntryPrice * trade2Shares;
position1.realizedPnL += (trade2Proceeds - costBasis);
position1.shares -= trade2Shares;
position1.totalInvested -= costBasis;
position1.currentPrice = trade2Price;
position1.unrealizedPnL = (position1.shares * position1.currentPrice) - position1.totalInvested;

updatePortfolioMetrics(portfolio, positions, initialCapital);

console.log(`  Cash: $${portfolio.availableCash.toFixed(2)} (received $${trade2Proceeds.toFixed(2)})`);
console.log(`  Position Shares: ${position1.shares}`);
console.log(`  Position Invested: $${position1.totalInvested.toFixed(2)}`);
console.log(`  Position Value: $${(position1.shares * position1.currentPrice).toFixed(2)}`);
console.log(`  Realized P&L: $${position1.realizedPnL.toFixed(2)}`);
console.log(`  Unrealized P&L: $${position1.unrealizedPnL.toFixed(2)}`);
console.log(`  Total Value: $${portfolio.totalValue.toFixed(2)}`);
console.log(`  Total P&L: $${portfolio.totalPnL.toFixed(2)}`);
console.log(`  Expected Value: $${(initialCapital + portfolio.totalPnL).toFixed(2)}`);
console.log(`  Discrepancy: $${(portfolio.totalValue - (initialCapital + portfolio.totalPnL)).toFixed(2)}\n`);

const discrepancy = Math.abs(portfolio.totalValue - (initialCapital + portfolio.totalPnL));
if (discrepancy < 0.01) {
  console.log('SUCCESS: Accounting is correct!');
  process.exit(0);
} else {
  console.log(`FAIL: Accounting discrepancy of $${discrepancy.toFixed(2)}`);
  process.exit(1);
}
