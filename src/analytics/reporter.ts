import { Portfolio } from '../models/portfolio.js';
import { Position } from '../models/position.js';
import { Trade } from '../models/trade.js';
import { Repository } from '../database/repository.js';
import { log } from '../utils/logger.js';

export class Reporter {
  constructor(private repository: Repository) { }

  /**
   * Generate a comprehensive performance report
   */
  generateReport(portfolio: Portfolio): void {
    console.log('\n' + '═'.repeat(60));
    console.log('  COPYTRADING PERFORMANCE SUMMARY');
    console.log('═'.repeat(60));
    console.log('');

    this.printPortfolioOverview(portfolio);
    this.printTradeStatistics();
    this.printSlippageAnalysis();
    this.printCurrentPositions(portfolio.positions);

    console.log('═'.repeat(60) + '\n');
  }

  private printPortfolioOverview(portfolio: Portfolio): void {
    const pnlSign = portfolio.totalPnL >= 0 ? '+' : '';

    console.log('\nPORTFOLIO OVERVIEW:');
    console.table({
      'Initial Capital': `$${portfolio.totalInvested.toFixed(2)}`,
      'Current Value': `$${portfolio.totalValue.toFixed(2)}`,
      'Available Cash': `$${portfolio.availableCash.toFixed(2)}`,
      'Total P&L': `${pnlSign}$${portfolio.totalPnL.toFixed(2)}`,
      'ROI': `${pnlSign}${portfolio.totalPnLPercent.toFixed(2)}%`,
    });
  }

  private printTradeStatistics(): void {
    const trades = this.repository.getAllTrades();

    if (trades.length === 0) {
      console.log('No trades executed yet.\n');
      return;
    }

    const buyTrades = trades.filter(t => t.side === 'BUY');
    const sellTrades = trades.filter(t => t.side === 'SELL');
    const avgTradeSize = trades.reduce((sum, t) => sum + t.totalCost, 0) / trades.length;

    console.log('\nTRADE STATISTICS:');
    console.table({
      'Total Trades': trades.length,
      'Buy Trades': buyTrades.length,
      'Sell Trades': sellTrades.length,
      'Avg Trade Size': `$${avgTradeSize.toFixed(2)}`,
    });
  }

  private printSlippageAnalysis(): void {
    const trades = this.repository.getAllTrades();
    const tradesWithSlippage = trades.filter(t => t.metadata?.slippageCost !== undefined);

    if (tradesWithSlippage.length === 0) {
      return;
    }

    const totalSlippageCost = tradesWithSlippage.reduce((sum, t) => {
      return sum + (t.metadata?.slippageCost || 0);
    }, 0);

    const avgSlippage = totalSlippageCost / tradesWithSlippage.length;
    const avgPriceImpact = tradesWithSlippage.reduce((sum, t) => {
      return sum + Math.abs(t.metadata?.priceImpact || 0);
    }, 0) / tradesWithSlippage.length;

    const highSlippageTrades = tradesWithSlippage.filter(t => {
      return Math.abs(t.metadata?.priceImpact || 0) > 1;
    });

    console.log('\nSLIPPAGE ANALYSIS:');
    console.table({
      'Avg Slippage/Trade': `$${avgSlippage.toFixed(2)}`,
      'Total Slippage Cost': `$${totalSlippageCost.toFixed(2)}`,
      'Avg Price Impact': `${avgPriceImpact.toFixed(2)}%`,
      'High Slippage (>1%)': highSlippageTrades.length,
    });
  }

  private printCurrentPositions(positions: Position[]): void {
    if (positions.length === 0) {
      console.log('\nNo open positions.\n');
      return;
    }

    console.log('\nCURRENT POSITIONS:');

    const positionsData = positions.map(pos => ({
      Market: pos.marketQuestion.length > 40
        ? pos.marketQuestion.substring(0, 37) + '...'
        : pos.marketQuestion,
      Shares: pos.shares.toFixed(2),
      'Entry Price': `$${pos.averageEntryPrice.toFixed(3)}`,
      'Current Price': `$${pos.currentPrice.toFixed(3)}`,
      'P&L': `${pos.unrealizedPnL >= 0 ? '+' : ''}$${pos.unrealizedPnL.toFixed(2)}`,
    }));

    console.table(positionsData);
  }

  /**
   * Log periodic status update
   */
  logStatus(portfolio: Portfolio, lastCheckTime: Date): void {
    log.info('Status Update', {
      portfolioValue: `$${portfolio.totalValue.toFixed(2)}`,
      cash: `$${portfolio.availableCash.toFixed(2)}`,
      pnl: `${portfolio.totalPnL >= 0 ? '+' : ''}$${portfolio.totalPnL.toFixed(2)} (${portfolio.totalPnLPercent.toFixed(2)}%)`,
      openPositions: portfolio.positions.length,
      lastCheck: lastCheckTime.toISOString(),
    });
  }
}
