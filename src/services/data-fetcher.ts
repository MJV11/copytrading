import { PolymarketSDK } from './polymarket-sdk.js';
import { Trade } from '../models/trade.js';
import { TraderBalanceSnapshot } from '../models/orderbook.js';
import { Repository } from '../database/repository.js';
import { config } from '../config/index.js';
import { log } from '../utils/logger.js';

export class DataFetcher {
  private lastFetchedTradeTime: Date | null = null;
  private processedTradeIds: Set<string> = new Set();

  constructor(
    private api: PolymarketSDK,
    private repository: Repository
  ) {
    // Load existing trades and register their token IDs
    this.loadExistingTokenIds();
  }

  /**
   * Load existing trades from database
   */
  private loadExistingTokenIds(): void {
    const trades = this.repository.getAllTrades();
    if (trades.length > 0) {
      this.lastFetchedTradeTime = trades[0].timestamp;
      trades.forEach(trade => {
        this.processedTradeIds.add(trade.id);
      });
      
      log.info('Loaded existing trade history', {
        lastTradeTime: this.lastFetchedTradeTime.toISOString(),
        processedTrades: this.processedTradeIds.size,
      });
    }
  }

  /**
   * Fetch new trades from target trader
   */
  async fetchNewTrades(): Promise<Trade[]> {
    try {
      log.debug('Fetching new trades from target trader');

      const trades = await this.api.getTradesByTrader(
        config.targetTraderAddress,
        this.lastFetchedTradeTime || config.startDate,
        100
      );

      // Filter out already processed trades
      const newTrades = trades.filter(trade => !this.processedTradeIds.has(trade.id));

      if (newTrades.length > 0) {
        log.info(`Found ${newTrades.length} new trades`, {
          oldestNew: newTrades[newTrades.length - 1].timestamp.toISOString(),
          newestNew: newTrades[0].timestamp.toISOString(),
        });

        // Update tracking
        newTrades.forEach(trade => {
          this.processedTradeIds.add(trade.id);
        });

        if (newTrades.length > 0) {
          this.lastFetchedTradeTime = newTrades[0].timestamp;
        }
      }

      return newTrades.reverse(); // Return in chronological order (oldest first)
    } catch (error: any) {
      log.error('Failed to fetch new trades', {
        error: error.message,
        stack: error.stack,
      });
      return [];
    }
  }

  /**
   * Get target trader balance - uses configured value
   */
  async updateTargetTraderBalance(): Promise<number> {
    const balance = config.targetTraderBalance;

    // Save snapshot for tracking
    const snapshot: TraderBalanceSnapshot = {
      timestamp: new Date(),
      address: config.targetTraderAddress,
      totalBalance: balance,
      availableCash: 0,
      positionsValue: balance,
      source: 'calculated',
    };

    this.repository.saveBalanceSnapshot(snapshot);

    log.info('Target trader balance (configured)', {
      balance: `$${balance.toFixed(2)}`,
    });

    return balance;
  }

  /**
   * Get current target trader balance - always returns configured value
   */
  async getCurrentTargetBalance(forceRefresh: boolean = false): Promise<number> {
    return config.targetTraderBalance;
  }
}
