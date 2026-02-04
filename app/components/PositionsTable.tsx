'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { clsx } from 'clsx';

interface Position {
  id: string;
  marketQuestion: string;
  shares: number;
  averageEntryPrice: number;
  averageExitPrice?: number | null;
  totalInvested: number;
  currentPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
  isOpen: boolean;
  openedAt: string;
  closedAt: string | null;
}

interface PositionsTableProps {
  refreshTrigger?: number;
}

export function PositionsTable({ refreshTrigger }: PositionsTableProps) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'open' | 'closed'>('open');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/positions?status=${tab}`)
      .then((res) => res.json())
      .then((data) => {
        setPositions(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching positions:', err);
        setLoading(false);
      });
  }, [tab, refreshTrigger]);

  return (
    <div className="mb-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-900">Positions</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('open')}
            className={clsx(
              'px-4 py-2 rounded-lg font-medium transition-colors',
              tab === 'open'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            Open
          </button>
          <button
            onClick={() => setTab('closed')}
            className={clsx(
              'px-4 py-2 rounded-lg font-medium transition-colors',
              tab === 'closed'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            Closed
          </button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded" />
          ))}
        </div>
      ) : positions.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          No {tab} positions
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-semibold text-slate-700">
                  Market
                </th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">
                  Shares
                </th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">
                  Entry Price
                </th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">
                  {tab === 'open' ? 'Current Price' : 'Exit Price'}
                </th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">
                  {tab === 'open' ? 'Unrealized P&L' : 'Realized P&L'}
                </th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">
                  Opened
                </th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => {
                const pnl =
                  tab === 'open'
                    ? position.unrealizedPnL
                    : position.realizedPnL;
                const isProfitable = pnl >= 0;
                
                // For closed positions, calculate original shares from total invested
                const displayShares = tab === 'open' 
                  ? position.shares 
                  : position.totalInvested / position.averageEntryPrice;
                
                // For closed positions, show exit price instead of current price
                const displayPrice = tab === 'open'
                  ? position.currentPrice
                  : (position.averageExitPrice || position.currentPrice);

                return (
                  <tr
                    key={position.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="py-3 px-4 text-sm text-slate-900">
                      {position.marketQuestion.length > 60
                        ? position.marketQuestion.substring(0, 57) + '...'
                        : position.marketQuestion}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-900 text-right">
                      {displayShares.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-900 text-right">
                      ${position.averageEntryPrice.toFixed(3)}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-900 text-right">
                      ${displayPrice.toFixed(3)}
                    </td>
                    <td
                      className={clsx(
                        'py-3 px-4 text-sm font-medium text-right',
                        isProfitable ? 'text-green-600' : 'text-red-600'
                      )}
                    >
                      {isProfitable ? '+' : ''}${pnl.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 text-right">
                      {format(new Date(position.openedAt), 'MMM d, HH:mm')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
