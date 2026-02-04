'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Trade {
  id: string;
  timestamp: string;
  marketQuestion: string;
  side: 'BUY' | 'SELL';
  shares: number;
  price: number;
  totalCost: number;
  metadata?: {
    priceImpact?: number;
    slippageCost?: number;
  };
}

interface TradesTableProps {
  refreshTrigger?: number;
}

export function TradesTable({ refreshTrigger }: TradesTableProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/trades?limit=20')
      .then((res) => res.json())
      .then((data) => {
        setTrades(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching trades:', err);
        setLoading(false);
      });
  }, [refreshTrigger]);

  return (
    <div className="mb-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-4">
        Recent Trades
      </h2>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded" />
          ))}
        </div>
      ) : trades.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          No trades executed yet
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-semibold text-slate-700">
                  Time
                </th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">
                  Side
                </th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">
                  Market
                </th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">
                  Shares
                </th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">
                  Price
                </th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">
                  Total Cost
                </th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">
                  Slippage
                </th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr
                  key={trade.id}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {format(new Date(trade.timestamp), 'MMM d, HH:mm:ss')}
                  </td>
                  <td className="py-3 px-4">
                    <div
                      className={clsx(
                        'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium',
                        trade.side === 'BUY'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      )}
                    >
                      {trade.side === 'BUY' ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      {trade.side}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-900">
                    {trade.marketQuestion.length > 50
                      ? trade.marketQuestion.substring(0, 47) + '...'
                      : trade.marketQuestion}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-900 text-right">
                    {trade.shares.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-900 text-right">
                    ${trade.price.toFixed(3)}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-900 text-right font-medium">
                    ${trade.totalCost.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600 text-right">
                    {trade.metadata?.slippageCost != null
                      ? `$${trade.metadata.slippageCost.toFixed(2)}`
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
