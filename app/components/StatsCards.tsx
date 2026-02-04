'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Stats {
  trades: {
    total: number;
    buys: number;
    sells: number;
  };
  slippage: {
    avgSlippage: number;
    totalSlippage: number;
    avgPriceImpact: number;
  };
}

interface StatsCardsProps {
  refreshTrigger?: number;
}

export function StatsCards({ refreshTrigger }: StatsCardsProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching stats:', err);
        setLoading(false);
      });
  }, [refreshTrigger]);

  if (loading || !stats) return null;

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-4">Statistics</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Trade Count */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-600">
              Total Trades
            </span>
          </div>
          <div className="text-3xl font-bold text-slate-900 mb-4">
            {stats.trades.total}
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-green-500" />
              <span className="text-sm text-slate-600">
                {stats.trades.buys} Buys
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowDownRight className="w-4 h-4 text-red-500" />
              <span className="text-sm text-slate-600">
                {stats.trades.sells} Sells
              </span>
            </div>
          </div>
        </div>

        {/* Slippage */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="mb-2">
            <span className="text-sm font-medium text-slate-600">
              Avg Slippage
            </span>
          </div>
          <div className="text-3xl font-bold text-slate-900">
            ${(stats.slippage.avgSlippage || 0).toFixed(2)}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Total: ${(stats.slippage.totalSlippage || 0).toFixed(2)}
          </div>
        </div>

        {/* Price Impact */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="mb-2">
            <span className="text-sm font-medium text-slate-600">
              Avg Price Impact
            </span>
          </div>
          <div className="text-3xl font-bold text-slate-900">
            {(stats.slippage.avgPriceImpact || 0).toFixed(2)}%
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Per trade executed
          </div>
        </div>
      </div>
    </div>
  );
}
