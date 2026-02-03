import { config } from './config/index.js';
import { log } from './utils/logger.js';
import { initializeDatabase } from './database/schema.js';
import { Repository } from './database/repository.js';
import { PolymarketSDK } from './services/polymarket-sdk.js';
import { SlippageSimulator } from './services/slippage-simulator.js';
import { TradeExecutor } from './services/trade-executor.js';
import { DataFetcher } from './services/data-fetcher.js';
import { Reporter } from './analytics/reporter.js';
import { MarketResolver } from './services/market-resolver.js';
import { PriceUpdater } from './services/price-updater.js';
import { createPortfolio, updatePortfolioMetrics } from './models/portfolio.js';

class CopytradingSimulator {
  private db: any;
  private repository!: Repository;
  private api!: PolymarketSDK;
  private slippageSimulator!: SlippageSimulator;
  private tradeExecutor!: TradeExecutor;
  private dataFetcher!: DataFetcher;
  private reporter!: Reporter;
  private marketResolver!: MarketResolver;
  private priceUpdater!: PriceUpdater;
  private portfolio: any;
  private isRunning: boolean = false;
  private targetBalance!: number;

  async initialize(): Promise<void> {
    log.info('Initializing Polymarket Copytrading Simulator');
    log.info('Configuration:', {
      targetTrader: config.targetTraderAddress,
      initialCapital: `$${config.initialCapital}`,
      copyRatio: config.copyRatio,
      slippageEnabled: config.enableSlippageSimulation,
    });

    // Initialize database
    this.db = initializeDatabase(config.databasePath);
    this.repository = new Repository(this.db);

    // Initialize services
    this.api = new PolymarketSDK();
    this.slippageSimulator = new SlippageSimulator();
    this.tradeExecutor = new TradeExecutor(
      this.repository,
      this.slippageSimulator,
      this.api
    );
    this.dataFetcher = new DataFetcher(this.api, this.repository);
    this.reporter = new Reporter(this.repository);
    this.marketResolver = new MarketResolver(this.api['client'], this.repository);
    this.priceUpdater = new PriceUpdater(this.api['client'], this.repository);

    // Initialize or load portfolio
    const existingPortfolio = this.repository.getLatestPortfolioSnapshot();
    if (existingPortfolio) {
      this.portfolio = existingPortfolio;
      log.info('Loaded existing portfolio from database', {
        value: `$${this.portfolio.totalValue.toFixed(2)}`,
        pnl: `${this.portfolio.totalPnLPercent.toFixed(2)}%`,
      });
    } else {
      this.portfolio = createPortfolio(config.initialCapital);
      this.repository.savePortfolioSnapshot(this.portfolio);
      log.info('Created new portfolio', {
        initialCapital: `$${config.initialCapital}`,
      });
    }

    // Initialize blockchain monitoring
    await this.api.initialize();

    // Get initial target trader balance
    this.targetBalance = await this.dataFetcher.getCurrentTargetBalance(true);

    log.info('Initialization complete');
  }

  async start(): Promise<void> {
    this.isRunning = true;

    log.info('Starting simulation loop');
    log.info(`Monitoring trader: ${config.targetTraderAddress}`);
    log.info(`Polling interval: ${config.pollingIntervalMs / 1000}s`);

    // Show initial report
    this.reporter.generateReport(this.portfolio);

    // Set up periodic balance updates
    const balanceUpdateInterval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(balanceUpdateInterval);
        return;
      }
      
      try {
        this.targetBalance = await this.dataFetcher.updateTargetTraderBalance();
      } catch (error: any) {
        log.error('Failed to update target balance', { error: error.message });
      }
    }, config.updateBalanceIntervalMs);

    // Set up periodic market resolution checks (every 5 minutes)
    const resolutionCheckInterval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(resolutionCheckInterval);
        return;
      }
      
      try {
        await this.marketResolver.checkAndResolveMarkets();
        
        // Update portfolio after any resolutions
        const allPositions = this.repository.getAllPositions();
        updatePortfolioMetrics(this.portfolio, allPositions, config.initialCapital);
      } catch (error: any) {
        log.error('Failed to check market resolutions', { error: error.message });
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    // Main polling loop
    while (this.isRunning) {
      try {
        await this.processTradingCycle();
        
        // Wait before next check
        await this.sleep(config.pollingIntervalMs);
      } catch (error: any) {
        log.error('Error in trading cycle', {
          error: error.message,
          stack: error.stack,
        });
        
        // Wait a bit before retrying on error
        await this.sleep(5000);
      }
    }

    clearInterval(balanceUpdateInterval);
    clearInterval(resolutionCheckInterval);
    log.info('Simulation stopped');
  }

  private async processTradingCycle(): Promise<void> {
    const cycleStart = new Date();

    // Fetch new trades
    const newTrades = await this.dataFetcher.fetchNewTrades();

    if (newTrades.length > 0) {
      log.info(`📥 Processing ${newTrades.length} new trades`);

      // Execute each trade in chronological order
      for (const trade of newTrades) {
        try {
          // Update target balance before each trade for accuracy
          this.targetBalance = await this.dataFetcher.getCurrentTargetBalance();

          // Execute the trade
          await this.tradeExecutor.executeTrade(
            trade,
            this.portfolio,
            this.targetBalance
          );

          // Update all position prices from market data
          await this.priceUpdater.updatePositionPrices();

          // Update portfolio metrics after each trade
          const allPositions = this.repository.getAllPositions();
          updatePortfolioMetrics(
            this.portfolio,
            allPositions,
            config.initialCapital
          );
        } catch (error: any) {
          log.error('Failed to execute trade', {
            tradeId: trade.id,
            market: trade.marketQuestion,
            error: error.message,
          });
          // Continue with other trades
        }
      }

      // Show updated report after trades
      this.reporter.generateReport(this.portfolio);
    } else {
      // Log periodic status even when no new trades
      // this.reporter.logStatus(this.portfolio, cycleStart);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async stop(): Promise<void> {
    log.info('Stopping simulator...');
    this.isRunning = false;

    // Final report
    this.reporter.generateReport(this.portfolio);

    // Close database
    if (this.db) {
      this.db.close();
      log.info('Database closed');
    }
  }
}

// Main entry point
async function main() {
  const simulator = new CopytradingSimulator();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Received SIGINT, shutting down gracefully...');
    await simulator.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n\n🛑 Received SIGTERM, shutting down gracefully...');
    await simulator.stop();
    process.exit(0);
  });

  try {
    await simulator.initialize();
    await simulator.start();
  } catch (error: any) {
    log.error('Fatal error', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Run the application
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
