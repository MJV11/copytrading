import { NextResponse } from 'next/server';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

const CONFIG_FILE = join(process.cwd(), 'trading-config.json');

interface TradingConfig {
  targetTraderAddress: string;
  initialCapital: number;
  copyRatio: number;
  pollingIntervalMs: number;
  maxSlippagePercent: number;
  isRunning: boolean;
}

function getDefaultConfig(): TradingConfig {
  return {
    targetTraderAddress: process.env.TARGET_TRADER_ADDRESS || '',
    initialCapital: parseFloat(process.env.INITIAL_CAPITAL || '1000'),
    copyRatio: parseFloat(process.env.COPY_RATIO || '1.0'),
    pollingIntervalMs: parseInt(process.env.POLLING_INTERVAL_MS || '10000'),
    maxSlippagePercent: parseFloat(process.env.MAX_SLIPPAGE_PERCENT || '10'),
    isRunning: false,
  };
}

function loadConfig(): TradingConfig {
  if (existsSync(CONFIG_FILE)) {
    try {
      const data = readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading config file:', error);
    }
  }
  return getDefaultConfig();
}

export async function GET() {
  try {
    const config = loadConfig();
    return NextResponse.json(config);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const config: TradingConfig = await request.json();
    
    // Validate config
    if (!config.targetTraderAddress || !config.targetTraderAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address' },
        { status: 400 }
      );
    }
    
    if (config.initialCapital <= 0) {
      return NextResponse.json(
        { error: 'Initial capital must be positive' },
        { status: 400 }
      );
    }
    
    // Save config
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
