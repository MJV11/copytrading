import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { writeFileSync, existsSync, mkdirSync, createWriteStream } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

const PID_FILE = join(process.cwd(), '.trading.pid');
const CONFIG_FILE = join(process.cwd(), 'trading-config.json');
const ENV_FILE = join(process.cwd(), '.env');

let tradingProcess: any = null;

export async function POST(request: Request) {
  try {
    const config = await request.json();
    
    // Check if already running
    if (existsSync(PID_FILE)) {
      return NextResponse.json(
        { error: 'Trading is already running. Stop it first.' },
        { status: 400 }
      );
    }
    
    // Save config
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    
    // Update .env file with new settings
    const envContent = `
TARGET_TRADER_ADDRESS=${config.targetTraderAddress}
INITIAL_CAPITAL=${config.initialCapital}
COPY_RATIO=${config.copyRatio}
POLLING_INTERVAL_MS=${config.pollingIntervalMs}
MAX_SLIPPAGE_PERCENT=${config.maxSlippagePercent}
ENABLE_SLIPPAGE_SIMULATION=true
SKIP_TRADE_IF_INSUFFICIENT_LIQUIDITY=true
ORDER_BOOK_STALENESS_WARNING_MS=5000
POLYMARKET_API_URL=https://clob.polymarket.com
LOG_LEVEL=info
DATABASE_PATH=./data/trades.db
STORE_ORDER_BOOK_SNAPSHOTS=true
POLYGON_RPC_URL=https://polygon-rpc.com
UPDATE_BALANCE_INTERVAL_MS=300000
`.trim();
    
    writeFileSync(ENV_FILE, envContent);
    
    // Ensure data and logs directories exist
    const dataDir = join(process.cwd(), 'data');
    const logsDir = join(process.cwd(), 'logs');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }
    
    // Start trading process with piped output
    tradingProcess = spawn('npm', ['run', 'dev'], {
      cwd: process.cwd(),
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    
    // Create write streams for logs
    const outLogStream = createWriteStream(join(logsDir, 'simulator-out.log'), { flags: 'a' });
    const errLogStream = createWriteStream(join(logsDir, 'simulator-err.log'), { flags: 'a' });
    
    // Pipe output to log files
    if (tradingProcess.stdout) {
      tradingProcess.stdout.pipe(outLogStream);
    }
    if (tradingProcess.stderr) {
      tradingProcess.stderr.pipe(errLogStream);
    }
    
    // Handle process errors
    tradingProcess.on('error', (error) => {
      console.error('Trading process error:', error);
    });
    
    // Save PID
    writeFileSync(PID_FILE, tradingProcess.pid.toString());
    
    // Update config to mark as running
    config.isRunning = true;
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    
    tradingProcess.unref();
    
    return NextResponse.json({
      success: true,
      message: 'Trading started successfully',
      pid: tradingProcess.pid,
    });
  } catch (error: any) {
    console.error('Error starting trading:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
