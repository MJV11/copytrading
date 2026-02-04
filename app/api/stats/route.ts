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
        trades: { total: 0, buys: 0, sells: 0 },
        slippage: { avgSlippage: 0, totalSlippage: 0, avgPriceImpact: 0 },
        history: [],
      });
    }
    
    const db = new Database(dbPath, { readonly: true });

    // Get trade statistics
    const tradesStmt = db.prepare('SELECT COUNT(*) as count, side FROM trades GROUP BY side');
    const tradeCounts = tradesStmt.all() as any[];

    const buyCount = tradeCounts.find(t => t.side === 'BUY')?.count || 0;
    const sellCount = tradeCounts.find(t => t.side === 'SELL')?.count || 0;

    // Get slippage statistics (using absolute values)
    const slippageStmt = db.prepare(`
      SELECT 
        AVG(ABS(slippage_cost)) as avgSlippage,
        SUM(ABS(slippage_cost)) as totalSlippage,
        AVG(ABS(price_impact)) as avgPriceImpact
      FROM trades 
      WHERE slippage_cost IS NOT NULL
    `);
    const slippage = slippageStmt.get() as any;

    // Get portfolio history for chart
    const historyStmt = db.prepare(`
      SELECT 
        timestamp,
        total_value,
        total_pnl,
        total_pnl_percent
      FROM portfolio_snapshots 
      ORDER BY timestamp ASC
      LIMIT 100
    `);
    const history = historyStmt.all() as any[];

    db.close();

    return NextResponse.json({
      trades: {
        total: buyCount + sellCount,
        buys: buyCount,
        sells: sellCount,
      },
      slippage: {
        avgSlippage: slippage?.avgSlippage || 0,
        totalSlippage: slippage?.totalSlippage || 0,
        avgPriceImpact: slippage?.avgPriceImpact || 0,
      },
      history: history.map(h => ({
        timestamp: new Date(h.timestamp).toISOString(),
        totalValue: h.total_value,
        totalPnL: h.total_pnl,
        totalPnLPercent: h.total_pnl_percent,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
