import Database from 'better-sqlite3';
import { log } from '../utils/logger.js';

export function initializeDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath);
  
  log.info(`Initializing database at: ${dbPath}`);
  
  // Enable foreign keys and WAL mode for better performance
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  
  createTables(db);
  
  log.info('Database initialized successfully');
  
  return db;
}

function createTables(db: Database.Database): void {
  // Trades table
  db.exec(`
    CREATE TABLE IF NOT EXISTS trades (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      trader_address TEXT NOT NULL,
      market_id TEXT NOT NULL,
      market_question TEXT NOT NULL,
      outcome_id TEXT NOT NULL,
      side TEXT NOT NULL CHECK(side IN ('BUY', 'SELL')),
      shares REAL NOT NULL,
      price REAL NOT NULL,
      total_cost REAL NOT NULL,
      fee REAL NOT NULL,
      transaction_hash TEXT,
      source TEXT NOT NULL CHECK(source IN ('api', 'blockchain')),
      -- Scaling metadata
      original_trade_id TEXT,
      target_trade_percent REAL,
      target_trader_balance REAL,
      our_portfolio_value REAL,
      scaling_ratio REAL,
      -- Slippage metadata
      target_price REAL,
      our_average_price REAL,
      price_impact REAL,
      slippage_cost REAL,
      fills_json TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(timestamp);
    CREATE INDEX IF NOT EXISTS idx_trades_market ON trades(market_id);
    CREATE INDEX IF NOT EXISTS idx_trades_trader ON trades(trader_address);
  `);

  // Positions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS positions (
      id TEXT PRIMARY KEY,
      market_id TEXT NOT NULL,
      market_question TEXT NOT NULL,
      outcome_id TEXT NOT NULL,
      shares REAL NOT NULL,
      average_entry_price REAL NOT NULL,
      average_exit_price REAL,
      total_invested REAL NOT NULL,
      current_price REAL NOT NULL,
      unrealized_pnl REAL NOT NULL,
      realized_pnl REAL DEFAULT 0,
      is_open INTEGER NOT NULL DEFAULT 1,
      opened_at INTEGER NOT NULL,
      closed_at INTEGER,
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_positions_market ON positions(market_id);
    CREATE INDEX IF NOT EXISTS idx_positions_open ON positions(is_open);
  `);

  // Portfolio snapshots table
  db.exec(`
    CREATE TABLE IF NOT EXISTS portfolio_snapshots (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      total_invested REAL NOT NULL,
      total_value REAL NOT NULL,
      available_cash REAL NOT NULL,
      total_pnl REAL NOT NULL,
      total_pnl_percent REAL NOT NULL,
      closed_positions_count INTEGER NOT NULL,
      win_rate REAL NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_portfolio_timestamp ON portfolio_snapshots(timestamp);
  `);

  // Trader balance snapshots table
  db.exec(`
    CREATE TABLE IF NOT EXISTS trader_balance_snapshots (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      address TEXT NOT NULL,
      total_balance REAL NOT NULL,
      available_cash REAL NOT NULL,
      positions_value REAL NOT NULL,
      source TEXT NOT NULL CHECK(source IN ('api', 'calculated'))
    );

    CREATE INDEX IF NOT EXISTS idx_balance_timestamp ON trader_balance_snapshots(timestamp);
    CREATE INDEX IF NOT EXISTS idx_balance_address ON trader_balance_snapshots(address);
  `);

  // Order book snapshots table (optional)
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_book_snapshots (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      market_id TEXT NOT NULL,
      outcome_id TEXT NOT NULL,
      best_bid REAL NOT NULL,
      best_ask REAL NOT NULL,
      spread REAL NOT NULL,
      bid_depth_10 REAL,
      ask_depth_10 REAL,
      book_data_json TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_orderbook_market ON order_book_snapshots(market_id, outcome_id);
    CREATE INDEX IF NOT EXISTS idx_orderbook_timestamp ON order_book_snapshots(timestamp);
  `);

  log.info('Database tables created');
}
