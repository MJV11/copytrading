'use client';

import { useEffect, useState } from 'react';
import { clsx } from 'clsx';

interface Portfolio {
  totalValue: number;
  availableCash: number;
  totalPnL: number;
  totalPnLPercent: number;
  totalInvested: number;
  closedPositionsCount: number;
  winRate: number;
}

interface PortfolioOverviewProps {
  refreshTrigger?: number;
}

export function PortfolioOverview({ refreshTrigger }: PortfolioOverviewProps) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/portfolio')
      .then((res) => res.json())
      .then((data) => {
        setPortfolio(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching portfolio:', err);
        setLoading(false);
      });
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="mb-8 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!portfolio) return null;

  const isProfitable = portfolio.totalPnL >= 0;

  return (
    <div className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Value */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="mb-2">
            <span className="text-sm font-medium text-slate-600">
              Total Value
            </span>
          </div>
          <div className="text-3xl font-bold text-slate-900">
            ${portfolio.totalValue.toFixed(2)}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Initial: ${portfolio.totalInvested.toFixed(2)}
          </div>
        </div>

        {/* P&L */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="mb-2">
            <span className="text-sm font-medium text-slate-600">
              Total P&L
            </span>
          </div>
          <div
            className={clsx(
              'text-3xl font-bold',
              isProfitable ? 'text-green-600' : 'text-red-600'
            )}
          >
            {isProfitable ? '+' : ''}${portfolio.totalPnL.toFixed(2)}
          </div>
          <div
            className={clsx(
              'mt-2 text-sm font-medium',
              isProfitable ? 'text-green-600' : 'text-red-600'
            )}
          >
            {isProfitable ? '+' : ''}
            {portfolio.totalPnLPercent.toFixed(2)}%
          </div>
        </div>

        {/* Available Cash */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="mb-2">
            <span className="text-sm font-medium text-slate-600">
              Available Cash
            </span>
          </div>
          <div className="text-3xl font-bold text-slate-900">
            ${portfolio.availableCash.toFixed(2)}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {portfolio.totalValue > 0
              ? ((portfolio.availableCash / portfolio.totalValue) * 100).toFixed(1)
              : '0.0'}
            % of portfolio
          </div>
        </div>

        {/* Win Rate */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="mb-2">
            <span className="text-sm font-medium text-slate-600">
              Win Rate
            </span>
          </div>
          <div className="text-3xl font-bold text-slate-900">
            {portfolio.winRate.toFixed(1)}%
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {portfolio.closedPositionsCount} closed positions
          </div>
        </div>
      </div>
    </div>
  );
}
