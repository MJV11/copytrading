'use client';

import { useEffect, useState } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { PortfolioOverview } from './components/PortfolioOverview';
import { PerformanceChart } from './components/PerformanceChart';
import { PositionsTable } from './components/PositionsTable';
import { TradesTable } from './components/TradesTable';
import { StatsCards } from './components/StatsCards';
import { LogsPanel } from './components/LogsPanel';
import { RefreshCw } from 'lucide-react';

export default function Dashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setRefreshKey((prev) => prev + 1);
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleManualRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">
              Polymarket Copytrading
            </h1>
            <p className="mt-2 text-slate-600">
              Configure, control, and monitor your copytrading bot
            </p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-slate-300"
              />
              Auto-refresh (10s)
            </label>
            <button
              onClick={handleManualRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-slate-200"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Control Panel */}
        <ControlPanel />

        {/* Portfolio Overview */}
        <PortfolioOverview refreshTrigger={refreshKey} />

        {/* Stats Cards */}
        <StatsCards refreshTrigger={refreshKey} />

        {/* Performance Chart */}
        <PerformanceChart refreshTrigger={refreshKey} />

        {/* Positions Table */}
        <PositionsTable refreshTrigger={refreshKey} />

        {/* Recent Trades */}
        <TradesTable refreshTrigger={refreshKey} />

        {/* Live Logs */}
        <LogsPanel refreshTrigger={refreshKey} />
      </div>
    </div>
  );
}
