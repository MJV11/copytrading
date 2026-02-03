import axios, { AxiosInstance } from 'axios';
import { log } from '../utils/logger.js';
import { Trade, createTradeId } from '../models/trade.js';

const DATA_API_BASE_URL = 'https://data-api.polymarket.com';

export class PolymarketDataAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: DATA_API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    log.info('Polymarket Data API client initialized', {
      baseURL: DATA_API_BASE_URL,
      authentication: 'None required (public endpoint)',
    });
  }

  /**
   * Fetch activity (trades) for a specific user
   */
  async getActivity(
    address: string,
    limit: number = 25,
    offset: number = 0
  ): Promise<Trade[]> {
    try {
      const response = await this.client.get('/activity', {
        params: {
          user: address,
          limit,
          offset,
        },
      });

      const activities = response.data || [];

      // Filter for trades only and parse
      const trades = activities
        .filter((activity: any) => activity.type === 'TRADE')
        .map((activity: any) => this.parseActivity(activity));

      return trades;
    } catch (error: any) {
      log.error('Failed to fetch activity from data API', {
        address,
        error: error.message,
        status: error.response?.status,
      });
      return [];
    }
  }

  /**
   * Parse activity response into Trade model
   */
  private parseActivity(activity: any): Trade {
    return {
      id: `${activity.transactionHash}_${activity.timestamp}`,
      timestamp: new Date(activity.timestamp * 1000),
      traderAddress: activity.proxyWallet || activity.user,
      marketId: activity.conditionId,
      marketQuestion: activity.title,
      outcomeId: activity.asset, // Token ID
      side: activity.side === 'BUY' ? 'BUY' : 'SELL',
      shares: parseFloat(activity.size || '0'),
      price: parseFloat(activity.price || '0'),
      totalCost: parseFloat(activity.usdcSize || '0'),
      fee: 0, // Not provided in activity endpoint
      transactionHash: activity.transactionHash,
      source: 'api',
    };
  }

  /**
   * Get recent trades (within specified time window)
   */
  async getRecentTrades(
    address: string,
    afterTimestamp: Date,
    limit: number = 25
  ): Promise<Trade[]> {
    try {
      // Fetch activity
      const allActivities = await this.getActivity(address, limit, 0);

      // Filter to trades after the specified timestamp
      const recentTrades = allActivities.filter(
        trade => trade.timestamp > afterTimestamp
      );

      if (recentTrades.length > 0) {
        log.info(`Found ${recentTrades.length} recent trades`, {
          address,
          afterTimestamp: afterTimestamp.toISOString(),
          oldestTrade: recentTrades[recentTrades.length - 1].timestamp.toISOString(),
          newestTrade: recentTrades[0].timestamp.toISOString(),
        });
      }

      return recentTrades;
    } catch (error: any) {
      log.error('Failed to fetch recent trades', {
        address,
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Test connection to data API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/activity?user=0x0000000000000000000000000000000000000000&limit=1');
      log.info('Data API connection test successful');
      return true;
    } catch (error: any) {
      log.error('Data API connection test failed', {
        error: error.message,
      });
      return false;
    }
  }
}
