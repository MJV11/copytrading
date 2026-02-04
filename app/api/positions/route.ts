import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import { existsSync } from 'fs';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'open';

    const dbPath = process.env.DATABASE_PATH || './data/trades.db';
    
    // Check if database exists
    if (!existsSync(dbPath)) {
      return NextResponse.json([]);
    }
    
    const db = new Database(dbPath, { readonly: true });

    let query = 'SELECT * FROM positions';
    if (status === 'open') {
      query += ' WHERE is_open = 1';
    } else if (status === 'closed') {
      query += ' WHERE is_open = 0';
    }
    query += ' ORDER BY opened_at DESC';

    const stmt = db.prepare(query);
    const positions = stmt.all() as any[];

    db.close();

    const formattedPositions = positions.map((pos) => ({
      id: pos.id,
      marketId: pos.market_id,
      marketQuestion: pos.market_question,
      outcomeId: pos.outcome_id,
      shares: pos.shares,
      averageEntryPrice: pos.average_entry_price,
      averageExitPrice: pos.average_exit_price || null,
      totalInvested: pos.total_invested,
      currentPrice: pos.current_price,
      unrealizedPnL: pos.unrealized_pnl,
      realizedPnL: pos.realized_pnl,
      isOpen: pos.is_open === 1,
      openedAt: new Date(pos.opened_at).toISOString(),
      closedAt: pos.closed_at ? new Date(pos.closed_at).toISOString() : null,
      updatedAt: new Date(pos.updated_at).toISOString(),
    }));

    return NextResponse.json(formattedPositions);
  } catch (error: any) {
    console.error('Error fetching positions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
