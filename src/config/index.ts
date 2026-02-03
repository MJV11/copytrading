import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Configuration schema with validation
const configSchema = z.object({
  // Target Trader
  targetTraderAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  targetTraderBalance: z.number().positive(),
  initialCapital: z.number().positive(),
  copyRatio: z.number().min(0).max(10),

  // Timing
  pollingIntervalMs: z.number().min(1000),
  updateBalanceIntervalMs: z.number().min(1000),

  // Risk Management
  maxPositionSizePercent: z.number().min(0).max(100).optional(),

  // Slippage Simulation
  enableSlippageSimulation: z.boolean(),
  maxSlippagePercent: z.number().min(0).max(100),
  skipTradeIfInsufficientLiquidity: z.boolean(),
  orderBookStalenessWarningMs: z.number().positive(),

  // API
  polymarketApiUrl: z.string().url(),
  polymarketApiKey: z.string().optional(),

  // Logging & Storage
  logLevel: z.enum(['error', 'warn', 'info', 'debug']),
  databasePath: z.string(),
  storeOrderBookSnapshots: z.boolean(),

  // Blockchain
  polygonRpcUrl: z.string().url(),

  // Optional
  startDate: z.date().optional(),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const raw = {
    targetTraderAddress: process.env.TARGET_TRADER_ADDRESS!,
    targetTraderBalance: parseFloat(process.env.TARGET_TRADER_BALANCE || '100000'),
    initialCapital: parseFloat(process.env.INITIAL_CAPITAL || '10000'),
    copyRatio: parseFloat(process.env.COPY_RATIO || '1.0'),
    pollingIntervalMs: parseInt(process.env.POLLING_INTERVAL_MS || '10000'),
    updateBalanceIntervalMs: parseInt(process.env.UPDATE_BALANCE_INTERVAL_MS || '300000'),
    maxPositionSizePercent: process.env.MAX_POSITION_SIZE_PERCENT
      ? parseFloat(process.env.MAX_POSITION_SIZE_PERCENT)
      : undefined,
    enableSlippageSimulation: process.env.ENABLE_SLIPPAGE_SIMULATION !== 'false',
    maxSlippagePercent: parseFloat(process.env.MAX_SLIPPAGE_PERCENT || '10'),
    skipTradeIfInsufficientLiquidity: process.env.SKIP_TRADE_IF_INSUFFICIENT_LIQUIDITY !== 'false',
    orderBookStalenessWarningMs: parseInt(process.env.ORDER_BOOK_STALENESS_WARNING_MS || '5000'),
    polymarketApiUrl: process.env.POLYMARKET_API_URL || 'https://clob.polymarket.com',
    polymarketApiKey: process.env.POLYMARKET_API_KEY || undefined,
    logLevel: (process.env.LOG_LEVEL || 'info') as 'error' | 'warn' | 'info' | 'debug',
    databasePath: process.env.DATABASE_PATH || './data/trades.db',
    storeOrderBookSnapshots: process.env.STORE_ORDER_BOOK_SNAPSHOTS !== 'false',
    polygonRpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    startDate: process.env.START_DATE ? new Date(process.env.START_DATE) : undefined,
  };

  try {
    return configSchema.parse(raw);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('ERROR: Configuration validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

export const config = loadConfig();
