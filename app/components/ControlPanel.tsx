'use client';

import { useState, useEffect } from 'react';
import { Play, Square, Trash2, Settings as SettingsIcon } from 'lucide-react';
import { clsx } from 'clsx';

interface TradingConfig {
  targetTraderAddress: string;
  initialCapital: number;
  copyRatio: number;
  pollingIntervalMs: number;
  maxSlippagePercent: number;
  isRunning: boolean;
}

export function ControlPanel() {
  const [config, setConfig] = useState<TradingConfig>({
    targetTraderAddress: '',
    initialCapital: 1000,
    copyRatio: 1.0,
    pollingIntervalMs: 10000,
    maxSlippagePercent: 10,
    isRunning: false,
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Load current config
  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch((err) => console.error('Error loading config:', err));
  }, []);

  const handleStart = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const res = await fetch('/api/trading/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setConfig({ ...config, isRunning: true });
        setMessage('✓ Trading started successfully');
      } else {
        setMessage(`✗ Error: ${data.error}`);
      }
    } catch (error: any) {
      setMessage(`✗ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const res = await fetch('/api/trading/stop', { method: 'POST' });
      const data = await res.json();
      
      if (res.ok) {
        setConfig({ ...config, isRunning: false });
        setMessage('✓ Trading stopped');
      } else {
        setMessage(`✗ Error: ${data.error}`);
      }
    } catch (error: any) {
      setMessage(`✗ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetDatabase = async () => {
    if (!confirm('Are you sure? This will delete all trading history and positions.')) {
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    try {
      const res = await fetch('/api/trading/reset', { method: 'POST' });
      const data = await res.json();
      
      if (res.ok) {
        setMessage('✓ Database reset successfully');
        window.location.reload();
      } else {
        setMessage(`✗ Error: ${data.error}`);
      }
    } catch (error: any) {
      setMessage(`✗ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddressChange = (newAddress: string) => {
    setConfig({ ...config, targetTraderAddress: newAddress });
    
    // If changing address while running, prompt to reset
    if (config.isRunning && config.targetTraderAddress && newAddress !== config.targetTraderAddress) {
      if (confirm('Changing trader address. Reset database and restart?')) {
        handleStop().then(() => handleResetDatabase());
      }
    }
  };

  return (
    <div className="mb-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Trading Control</h2>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <SettingsIcon className="w-4 h-4" />
          {showSettings ? 'Hide' : 'Show'} Settings
        </button>
      </div>

      {/* Trader Address Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Target Trader Address
        </label>
        <input
          type="text"
          value={config.targetTraderAddress}
          onChange={(e) => handleAddressChange(e.target.value)}
          placeholder="0x..."
          disabled={config.isRunning}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
        />
      </div>

      {/* Settings Panel (Collapsible) */}
      {showSettings && (
        <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Initial Capital
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-500">$</span>
                <input
                  type="number"
                  value={config.initialCapital}
                  onChange={(e) => setConfig({ ...config, initialCapital: parseFloat(e.target.value) })}
                  disabled={config.isRunning}
                  className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  placeholder="1000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Copy Ratio
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                value={config.copyRatio}
                onChange={(e) => setConfig({ ...config, copyRatio: parseFloat(e.target.value) })}
                disabled={config.isRunning}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                placeholder="1.0"
              />
              <p className="mt-1 text-xs text-slate-500">0.1 - 10.0</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Polling Interval
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={config.pollingIntervalMs / 1000}
                  onChange={(e) => setConfig({ ...config, pollingIntervalMs: parseFloat(e.target.value) * 1000 })}
                  disabled={config.isRunning}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  placeholder="10"
                />
                <span className="absolute right-3 top-2 text-slate-500">seconds</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Max Slippage
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={config.maxSlippagePercent}
                  onChange={(e) => setConfig({ ...config, maxSlippagePercent: parseFloat(e.target.value) })}
                  disabled={config.isRunning}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  placeholder="10"
                />
                <span className="absolute right-3 top-2 text-slate-500">%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex items-center gap-4">
        {!config.isRunning ? (
          <button
            onClick={handleStart}
            disabled={loading || !config.targetTraderAddress}
            className={clsx(
              'flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors',
              loading || !config.targetTraderAddress
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600 text-white'
            )}
          >
            <Play className="w-5 h-5" />
            Start Trading
          </button>
        ) : (
          <button
            onClick={handleStop}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            <Square className="w-5 h-5" />
            Stop Trading
          </button>
        )}

        <button
          onClick={handleResetDatabase}
          disabled={loading || config.isRunning}
          className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-5 h-5" />
          Reset Database
        </button>

        {/* Status Indicator */}
        <div className="ml-auto flex items-center gap-2">
          <div
            className={clsx(
              'w-3 h-3 rounded-full',
              config.isRunning ? 'bg-green-500 animate-pulse' : 'bg-slate-300'
            )}
          />
          <span className="text-sm font-medium text-slate-700">
            {config.isRunning ? 'Running' : 'Stopped'}
          </span>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div
          className={clsx(
            'mt-4 p-4 rounded-lg text-sm',
            message.startsWith('✓')
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          )}
        >
          {message}
        </div>
      )}
    </div>
  );
}
