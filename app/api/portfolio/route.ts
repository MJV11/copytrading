import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import { existsSync } from 'fs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const dbPath = process.env.DATABASE_PATH || './data/trades.db';
    
    // Check if database exists
    if (!existsSync(dbPath)) {
      return NextResponse.json({
        totalValue: 0,
        availableCash: 0,
        totalPnL: 0,
        totalPnLPercent: 0,
        totalInvested: 0,
        closedPositionsCount: 0,
        winRate: 0,
        timestamp: new Date().toISOString(),
      });
    }
    
    const db = new Database(dbPath, { readonly: true });

    // Get latest portfolio snapshot
    const portfolioStmt = db.prepare(`
      SELECT * FROM portfolio_snapshots 
      ORDER BY timestamp DESC 
      LIMIT 1
    `);
    const portfolio = portfolioStmt.get() as any;

    if (!portfolio) {
      db.close();
      return NextResponse.json({
        totalValue: 0,
        availableCash: 0,
        totalPnL: 0,
        totalPnLPercent: 0,
        totalInvested: 0,
        closedPositionsCount: 0,
        winRate: 0,
        timestamp: new Date().toISOString(),
      });
    }

    db.close();

    return NextResponse.json({
      totalValue: portfolio.total_value,
      availableCash: portfolio.available_cash,
      totalPnL: portfolio.total_pnl,
      totalPnLPercent: portfolio.total_pnl_percent,
      totalInvested: portfolio.total_invested,
      closedPositionsCount: portfolio.closed_positions_count,
      winRate: portfolio.win_rate,
      timestamp: new Date(portfolio.timestamp).toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching portfolio:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
