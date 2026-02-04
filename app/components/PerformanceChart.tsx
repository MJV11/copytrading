'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';

interface ChartData {
  timestamp: string;
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
}

interface PerformanceChartProps {
  refreshTrigger?: number;
}

export function PerformanceChart({ refreshTrigger }: PerformanceChartProps) {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then((res) => res.json())
      .then((statsData) => {
        setData(statsData.history || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching chart data:', err);
        setLoading(false);
      });
  }, [refreshTrigger]);

  // Calculate domain with 5% margin
  const calculateDomain = (dataKey: keyof ChartData): [number, number] => {
    if (data.length === 0) return [0, 100];
    
    const values = data.map(d => d[dataKey] as number);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const margin = range * 0.05 || 5; // 5% margin, or $5 if range is 0
    
    return [min - margin, max + margin];
  };

  const portfolioDomain = calculateDomain('totalValue');

  if (loading) {
    return (
      <div className="mb-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          Performance History
        </h2>
        <div className="h-64 animate-pulse bg-slate-100 rounded" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="mb-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          Performance History
        </h2>
        <div className="h-64 flex items-center justify-center text-slate-500">
          No performance data available yet
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-4">
        Performance History
      </h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(timestamp) => {
              const date = new Date(timestamp);
              const now = new Date();
              const isToday = date.toDateString() === now.toDateString();
              
              // Show time if today, otherwise show date + time
              return isToday 
                ? format(date, 'HH:mm')
                : format(date, 'MMM d HH:mm');
            }}
            stroke="#64748b"
            style={{ fontSize: '11px' }}
            height={60}
            angle={-15}
            textAnchor="end"
          />
          <YAxis 
            stroke="#3b82f6"
            domain={portfolioDomain}
            tickFormatter={(value) => `$${value.toFixed(2)}`}
            width={80}
          />
          <Tooltip
            labelFormatter={(timestamp) =>
              format(new Date(timestamp), 'MMM d, yyyy HH:mm:ss')
            }
            formatter={(value: number) => `$${value.toFixed(2)}`}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
            }}
          />
          <Line
            type="monotone"
            dataKey="totalValue"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="Portfolio Value"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
