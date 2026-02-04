'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Trash2 } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: any;
}

interface LogsPanelProps {
  refreshTrigger?: number;
}

export function LogsPanel({ refreshTrigger }: LogsPanelProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchLogs();
  }, [refreshTrigger]);

  useEffect(() => {
    if (autoScroll && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs?limit=100');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const handleClearLogs = async () => {
    try {
      await fetch('/api/logs', { method: 'DELETE' });
      setLogs([]);
    } catch (error) {
      console.error('Error clearing logs:', error);
    }
  };

  const handleScroll = () => {
    if (!logsContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    if (!isAtBottom && autoScroll) {
      setAutoScroll(false);
    } else if (isAtBottom && !autoScroll) {
      setAutoScroll(true);
    }
  };

  // Strip ANSI color codes and normalize level
  const stripAnsi = (str: string) => {
    return str.replace(/\x1b\[[0-9;]*m/g, '').replace(/\[[\d]+m/g, '');
  };

  const normalizeLevel = (level: string): string => {
    const clean = stripAnsi(level).toLowerCase().trim();
    if (clean.includes('error')) return 'error';
    if (clean.includes('warn')) return 'warn';
    if (clean.includes('info')) return 'info';
    if (clean.includes('debug')) return 'debug';
    return 'info';
  };

  const getLevelColor = (level: string): string => {
    switch (level) {
      case 'error': return '#ef4444';
      case 'warn': return '#eab308';
      case 'info': return '#22c55e';
      case 'debug': return '#3b82f6';
      default: return '#94a3b8';
    }
  };

  const getMessageColor = (level: string): string => {
    switch (level) {
      case 'error': return '#fca5a5';
      case 'warn': return '#fde047';
      default: return '#cbd5e1';
    }
  };

  return (
    <div className="mb-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-slate-600" />
          <h2 className="text-xl font-bold text-slate-900">Live Logs</h2>
          <span className="text-xs text-slate-500">
            {logs.length} entries
          </span>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded border-slate-300"
            />
            Auto-scroll
          </label>
          <button
            onClick={handleClearLogs}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        </div>
      </div>

      {/* Logs Container */}
      <div
        ref={logsContainerRef}
        onScroll={handleScroll}
        className="h-96 overflow-y-auto bg-slate-950 font-mono text-sm p-4"
      >
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            No logs yet. Start trading to see activity...
          </div>
        ) : (
          <div>
            {logs.map((log, index) => {
              const cleanMessage = stripAnsi(log.message);
              const normalizedLevel = normalizeLevel(log.level);
              const levelColor = getLevelColor(normalizedLevel);
              const messageColor = getMessageColor(normalizedLevel);
              
              return (
                <div key={index} className="flex gap-2 leading-tight">
                  <span 
                    className="text-xs whitespace-nowrap font-mono"
                    style={{ color: '#6b7280' }}
                  >
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span 
                    className="text-xs font-bold whitespace-nowrap font-mono"
                    style={{ color: levelColor }}
                  >
                    {normalizedLevel}:
                  </span>
                  <pre 
                    className="flex-1 whitespace-pre-wrap break-words font-mono text-xs leading-tight"
                    style={{ color: messageColor }}
                  >
{cleanMessage}{log.data && '\n' + JSON.stringify(log.data, null, 2)}</pre>
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
