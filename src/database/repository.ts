import Database from 'better-sqlite3';
import { Trade } from '../models/trade.js';
import { Position } from '../models/position.js';
import { Portfolio } from '../models/portfolio.js';
import { OrderBook, TraderBalanceSnapshot } from '../models/orderbook.js';
import { log } from '../utils/logger.js';

export class Repository {
  constructor(private db: Database.Database) {}

  // ==================== TRADES ====================

  saveTrade(trade: Trade): void {
    const stmt = this.db.prepare(`
      INSERT INTO trades (
        id, timestamp, trader_address, market_id, market_question, outcome_id,
        side, shares, price, total_cost, fee, transaction_hash, source,
        original_trade_id, target_trade_percent, target_trader_balance,
        our_portfolio_value, scaling_ratio, target_price, our_average_price,
        price_impact, slippage_cost, fills_json
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    stmt.run(
      trade.id,
      trade.timestamp.getTime(),
      trade.traderAddress,
      trade.marketId,
      trade.marketQuestion,
      trade.outcomeId,
      trade.side,
      trade.shares,
      trade.price,
      trade.totalCost,
      trade.fee,
      trade.transactionHash || null,
      trade.source,
      trade.metadata?.originalTradeId || null,
      trade.metadata?.targetTradePercent || null,
      trade.metadata?.targetTraderBalance || null,
      trade.metadata?.ourPortfolioValue || null,
      trade.metadata?.scalingRatio || null,
      trade.metadata?.targetPrice || null,
      trade.metadata?.ourAveragePrice || null,
      trade.metadata?.priceImpact || null,
      trade.metadata?.slippageCost || null,
      trade.metadata?.fills ? JSON.stringify(trade.metadata.fills) : null
    );
  }

  getTrade(id: string): Trade | undefined {
    const stmt = this.db.prepare('SELECT * FROM trades WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.rowToTrade(row) : undefined;
  }

  getAllTrades(): Trade[] {
    const stmt = this.db.prepare('SELECT * FROM trades ORDER BY timestamp DESC');
    const rows = stmt.all() as any[];
    return rows.map(this.rowToTrade);
  }

  getTradesByMarket(marketId: string): Trade[] {
    const stmt = this.db.prepare('SELECT * FROM trades WHERE market_id = ? ORDER BY timestamp DESC');
    const rows = stmt.all(marketId) as any[];
    return rows.map(this.rowToTrade);
  }

  private rowToTrade(row: any): Trade {
    return {
      id: row.id,
      timestamp: new Date(row.timestamp),
      traderAddress: row.trader_address,
      marketId: row.market_id,
      marketQuestion: row.market_question,
      outcomeId: row.outcome_id,
      side: row.side,
      shares: row.shares,
      price: row.price,
      totalCost: row.total_cost,
      fee: row.fee,
      transactionHash: row.transaction_hash,
      source: row.source,
      metadata: {
        originalTradeId: row.original_trade_id,
        targetTradePercent: row.target_trade_percent,
        targetTraderBalance: row.target_trader_balance,
        ourPortfolioValue: row.our_portfolio_value,
        scalingRatio: row.scaling_ratio,
        targetPrice: row.target_price,
        ourAveragePrice: row.our_average_price,
        priceImpact: row.price_impact,
        slippageCost: row.slippage_cost,
        fills: row.fills_json ? JSON.parse(row.fills_json) : undefined,
      },
    };
  }

  // ==================== POSITIONS ====================

  savePosition(position: Position): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO positions (
        id, market_id, market_question, outcome_id, shares, average_entry_price,
        total_invested, current_price, unrealized_pnl, realized_pnl, is_open,
        opened_at, closed_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      position.id,
      position.marketId,
      position.marketQuestion,
      position.outcomeId,
      position.shares,
      position.averageEntryPrice,
      position.totalInvested,
      position.currentPrice,
      position.unrealizedPnL,
      position.realizedPnL,
      position.isOpen ? 1 : 0,
      position.openedAt.getTime(),
      position.closedAt?.getTime() || null,
      position.updatedAt.getTime()
    );
  }

  getPosition(id: string): Position | undefined {
    const stmt = this.db.prepare('SELECT * FROM positions WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.rowToPosition(row) : undefined;
  }

  getAllPositions(): Position[] {
    const stmt = this.db.prepare('SELECT * FROM positions ORDER BY opened_at DESC');
    const rows = stmt.all() as any[];
    return rows.map(this.rowToPosition);
  }

  getOpenPositions(): Position[] {
    const stmt = this.db.prepare('SELECT * FROM positions WHERE is_open = 1 ORDER BY opened_at DESC');
    const rows = stmt.all() as any[];
    return rows.map(this.rowToPosition);
  }

  private rowToPosition(row: any): Position {
    return {
      id: row.id,
      marketId: row.market_id,
      marketQuestion: row.market_question,
      outcomeId: row.outcome_id,
      shares: row.shares,
      averageEntryPrice: row.average_entry_price,
      totalInvested: row.total_invested,
      currentPrice: row.current_price,
      unrealizedPnL: row.unrealized_pnl,
      realizedPnL: row.realized_pnl,
      isOpen: row.is_open === 1,
      openedAt: new Date(row.opened_at),
      closedAt: row.closed_at ? new Date(row.closed_at) : undefined,
      updatedAt: new Date(row.updated_at),
    };
  }

  // ==================== PORTFOLIO ====================

  savePortfolioSnapshot(portfolio: Portfolio): void {
    const stmt = this.db.prepare(`
      INSERT INTO portfolio_snapshots (
        id, timestamp, total_invested, total_value, available_cash,
        total_pnl, total_pnl_percent, closed_positions_count, win_rate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      portfolio.id,
      portfolio.timestamp.getTime(),
      portfolio.totalInvested,
      portfolio.totalValue,
      portfolio.availableCash,
      portfolio.totalPnL,
      portfolio.totalPnLPercent,
      portfolio.closedPositionsCount,
      portfolio.winRate
    );
  }

  getLatestPortfolioSnapshot(): Portfolio | undefined {
    const stmt = this.db.prepare('SELECT * FROM portfolio_snapshots ORDER BY timestamp DESC LIMIT 1');
    const row = stmt.get() as any;
    if (!row) return undefined;

    return {
      id: row.id,
      timestamp: new Date(row.timestamp),
      totalInvested: row.total_invested,
      totalValue: row.total_value,
      availableCash: row.available_cash,
      totalPnL: row.total_pnl,
      totalPnLPercent: row.total_pnl_percent,
      positions: this.getOpenPositions(),
      closedPositionsCount: row.closed_positions_count,
      winRate: row.win_rate,
    };
  }

  // ==================== TRADER BALANCE ====================

  saveBalanceSnapshot(snapshot: TraderBalanceSnapshot): void {
    const id = `balance_${snapshot.address}_${snapshot.timestamp.getTime()}`;
    const stmt = this.db.prepare(`
      INSERT INTO trader_balance_snapshots (
        id, timestamp, address, total_balance, available_cash, positions_value, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      snapshot.timestamp.getTime(),
      snapshot.address,
      snapshot.totalBalance,
      snapshot.availableCash,
      snapshot.positionsValue,
      snapshot.source
    );
  }

  getLatestBalanceSnapshot(address: string): TraderBalanceSnapshot | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM trader_balance_snapshots 
      WHERE address = ? 
      ORDER BY timestamp DESC 
      LIMIT 1
    `);
    const row = stmt.get(address) as any;
    if (!row) return undefined;

    return {
      timestamp: new Date(row.timestamp),
      address: row.address,
      totalBalance: row.total_balance,
      availableCash: row.available_cash,
      positionsValue: row.positions_value,
      source: row.source,
    };
  }

  // ==================== ORDER BOOK ====================

  saveOrderBookSnapshot(orderBook: OrderBook): void {
    const id = `book_${orderBook.marketId}_${orderBook.outcomeId}_${orderBook.timestamp.getTime()}`;
    const stmt = this.db.prepare(`
      INSERT INTO order_book_snapshots (
        id, timestamp, market_id, outcome_id, best_bid, best_ask, spread,
        bid_depth_10, ask_depth_10, book_data_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const bidDepth = orderBook.bids.slice(0, 10).reduce((sum, level) => sum + level.size, 0);
    const askDepth = orderBook.asks.slice(0, 10).reduce((sum, level) => sum + level.size, 0);

    stmt.run(
      id,
      orderBook.timestamp.getTime(),
      orderBook.marketId,
      orderBook.outcomeId,
      orderBook.bids[0]?.price || 0,
      orderBook.asks[0]?.price || 0,
      orderBook.spread,
      bidDepth,
      askDepth,
      JSON.stringify({ bids: orderBook.bids, asks: orderBook.asks })
    );
  }
}
