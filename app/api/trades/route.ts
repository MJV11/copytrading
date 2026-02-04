import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import { existsSync } from 'fs';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const dbPath = process.env.DATABASE_PATH || './data/trades.db';
    
    // Check if database exists
    if (!existsSync(dbPath)) {
      return NextResponse.json([]);
    }
    
    const db = new Database(dbPath, { readonly: true });

    const stmt = db.prepare(`
      SELECT * FROM trades 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    const trades = stmt.all(limit) as any[];

    db.close();

    const formattedTrades = trades.map((trade) => ({
      id: trade.id,
      timestamp: new Date(trade.timestamp).toISOString(),
      traderAddress: trade.trader_address,
      marketId: trade.market_id,
      marketQuestion: trade.market_question,
      outcomeId: trade.outcome_id,
      side: trade.side,
      shares: trade.shares,
      price: trade.price,
      totalCost: trade.total_cost,
      fee: trade.fee,
      transactionHash: trade.transaction_hash,
      source: trade.source,
      metadata: {
        originalTradeId: trade.original_trade_id,
        targetTradePercent: trade.target_trade_percent,
        targetTraderBalance: trade.target_trader_balance,
        ourPortfolioValue: trade.our_portfolio_value,
        scalingRatio: trade.scaling_ratio,
        targetPrice: trade.target_price,
        ourAveragePrice: trade.our_average_price,
        priceImpact: trade.price_impact,
        slippageCost: trade.slippage_cost,
        fills: trade.fills_json ? JSON.parse(trade.fills_json) : undefined,
      },
    }));

    return NextResponse.json(formattedTrades);
  } catch (error: any) {
    console.error('Error fetching trades:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
